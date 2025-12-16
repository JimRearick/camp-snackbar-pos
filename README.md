# Camp Snackbar POS System

A production-ready Point of Sale system for managing camp snackbar accounts and transactions with role-based access control, real-time prep queue, and comprehensive security.

## Features

✅ **Touch-First Tablet Interface** - Optimized for 7-11" tablets
✅ **Role-Based Access Control** - Admin, POS, and Prep user roles
✅ **Real-Time Prep Queue** - Live updates via WebSocket
✅ **Account Management** - Family and individual accounts
✅ **Security Hardened** - CSRF protection, XSS prevention, input validation
✅ **Production Ready** - Docker containerization with Caddy reverse proxy
✅ **Comprehensive Reports** - Sales, inventory, and transaction reports
✅ **Automated Backups** - Daily database backups

## Quick Start (Recommended: Docker)

**Fastest deployment for Intel/AMD x86_64 systems:**

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Deploy application
./deploy.sh install

# Access at http://localhost or http://YOUR-IP
```

See [Docker Deployment Guide](docs/deployment/DOCKER_DEPLOYMENT.md) for full instructions.

## System Requirements

### Hardware
- **CPU:** Intel/AMD x86_64 (2+ cores recommended)
- **RAM:** 2GB minimum, 8GB recommended
- **Storage:** 10GB minimum

### Software (Docker Deployment)
- Linux (Ubuntu 22.04 LTS, Debian 12, or similar)
- Docker 20.10+
- Docker Compose 2.0+

### Software (Manual Deployment)
- Python 3.7 or higher
- pip (Python package manager)

## Installation on Debian/Raspberry Pi

### 1. Install System Dependencies

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv
```

### 2. Clone or Copy the Project

```bash
cd /home/yourusername
# If you have git:
# git clone <repository-url> camp-snackbar-pos
# Otherwise, copy the files to camp-snackbar-pos directory
```

### 3. Set Up Python Virtual Environment

```bash
cd camp-snackbar-pos/backend
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 5. Initialize the Database

```bash
python3 init_db.py
```

This will create `camp_snackbar.db` with sample data including:
- Product categories (Candy, Soda, Drinks, Hot Food)
- Sample products
- Default admin password: `camp2024`

### 6. Run the Application

```bash
python3 app.py
```

The server will start on `http://0.0.0.0:5000`

## Running on System Startup (Raspberry Pi)

Create a systemd service to run the application automatically:

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/camp-snackbar.service
```

### 2. Add the Following Content

```ini
[Unit]
Description=Camp Snackbar POS System
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername/camp-snackbar-pos/backend
Environment="PATH=/home/yourusername/camp-snackbar-pos/backend/venv/bin"
ExecStart=/home/yourusername/camp-snackbar-pos/backend/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note:** Replace `yourusername` with your actual username.

### 3. Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable camp-snackbar.service
sudo systemctl start camp-snackbar.service
```

### 4. Check Service Status

```bash
sudo systemctl status camp-snackbar.service
```

### 5. View Logs

```bash
sudo journalctl -u camp-snackbar.service -f
```

## API Endpoints

The backend provides a RESTful API on port 5000:

### Authentication
- `POST /api/auth/login` - Admin login (password: camp2024)

### Accounts
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/<id>` - Get account details
- `POST /api/accounts` - Create account (requires auth)
- `PUT /api/accounts/<id>` - Update account (requires auth)
- `DELETE /api/accounts/<id>` - Delete account (requires auth)

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product (requires auth)
- `PUT /api/products/<id>` - Update product (requires auth)

### Transactions
- `GET /api/transactions` - List transactions (optional: ?account_id=X)
- `POST /api/transactions` - Create transaction

### Reports
- `GET /api/reports/summary` - Get summary report (requires auth)
- `GET /api/reports/sales` - Get sales report (requires auth)

### Settings
- `GET /api/settings` - Get settings (requires auth)
- `PUT /api/settings` - Update settings (requires auth)

### Backup
- `POST /api/backup/create` - Create database backup (requires auth)
- `GET /api/backup/list` - List backups (requires auth)

## Database

The system uses SQLite for data storage. The database file is located at:
```
backend/camp_snackbar.db
```

### Backups

Backups are automatically created daily and stored in:
```
backend/backups/
```

You can also manually trigger backups via the API.

## Configuration

Environment variables (optional):
- `DB_PATH` - Database file path (default: `camp_snackbar.db`)
- `BACKUP_DIR` - Backup directory path (default: `backups`)

## Accessing the System

Once running, you can access the API at:
- Local: `http://localhost:5000/api/`
- Network: `http://<raspberry-pi-ip>:5000/api/`

To find your Raspberry Pi's IP address:
```bash
hostname -I
```

## Default Admin Password

The default admin password is: **camp2024**

Change this via the settings API after first login:
```bash
PUT /api/settings
{
  "admin_password": "your-new-password"
}
```

## Troubleshooting

### Port Already in Use
If port 5000 is already in use, you can change it in `app.py` at the bottom:
```python
socketio.run(app, host='0.0.0.0', port=5000, debug=True)
```

### Permission Denied
Make sure the database file and backup directory are writable:
```bash
chmod 644 camp_snackbar.db
chmod 755 backups/
```

### Service Won't Start
Check logs:
```bash
sudo journalctl -u camp-snackbar.service -n 50
```

## Development

To run in development mode:
```bash
cd backend
source venv/bin/activate
python3 app.py
```

The server will run with debug mode enabled and auto-reload on code changes.

## Security

All critical security features are implemented and tested:
- ✅ **CSRF Protection** - Token-based request verification
- ✅ **XSS Prevention** - HTML escaping on all user input
- ✅ **Input Validation** - Marshmallow schemas on all endpoints
- ✅ **Authentication** - Session-based with Flask-Login
- ✅ **Authorization** - Role-based access control (RBAC)

See [Security Test Report](docs/security/SECURITY_TEST_REPORT.md) for comprehensive test results (20/20 tests passed).

**Important:** Change the default admin password immediately after installation!

## Documentation

- **[Admin Guide](ADMIN_GUIDE.md)** - System administration and management
- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[Deployment](docs/deployment/)** - Installation and deployment guides
- **[Security](docs/security/)** - Security documentation and test reports
- **[Archive](docs/archive/)** - Historical development documentation

## Project Structure

```
camp-snackbar-pos/
├── backend/           # Flask application
│   ├── app.py        # Main application
│   ├── models/       # Data models
│   ├── migrations/   # Database migrations
│   └── validation.py # Input validation schemas
├── static/           # Frontend assets
│   ├── js/          # JavaScript modules
│   ├── css/         # Stylesheets
│   └── images/      # Images and icons
├── docs/            # Documentation
│   ├── deployment/  # Deployment guides
│   ├── security/    # Security documentation
│   └── archive/     # Historical docs
├── Dockerfile       # Container image definition
├── docker-compose.yml # Container orchestration
├── deploy.sh        # Deployment automation script
└── README.md        # This file
```

## Support

For issues or questions:
1. Check the [Admin Guide](ADMIN_GUIDE.md)
2. Review [Docker Deployment Guide](docs/deployment/DOCKER_DEPLOYMENT.md)
3. Run security tests: `python3 security_tests.py`
4. Check application logs: `./deploy.sh logs`

## License

[Add your license here]
