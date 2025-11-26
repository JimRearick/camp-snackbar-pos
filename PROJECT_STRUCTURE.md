# Camp Snackbar POS - Project Structure

## Overview
This is a simplified, backend-only deployment suitable for Debian and Raspberry Pi systems.

## Directory Structure

```
camp-snackbar-pos/
├── backend/                    # Flask API backend
│   ├── app.py                 # Main Flask application
│   ├── schema.sql             # Database schema
│   ├── init_db.py             # Database initialization script
│   ├── requirements.txt       # Python dependencies
│   ├── camp_snackbar.db      # SQLite database (created on init)
│   ├── backups/              # Database backups directory
│   └── venv/                 # Python virtual environment
├── README.md                  # Installation and deployment guide
└── .gitignore                # Git ignore rules
```

## Key Files

### backend/app.py
- Main Flask application with all API endpoints
- WebSocket support via Flask-SocketIO
- JWT authentication
- Automated backup scheduling

### backend/schema.sql
- Complete database schema
- Initial data (categories, products, default password)

### backend/init_db.py
- Simple script to initialize the database
- Run once during setup

### backend/requirements.txt
Python dependencies:
- Flask - Web framework
- flask-cors - Cross-Origin Resource Sharing
- flask-socketio - WebSocket support
- python-socketio - Socket.IO client/server
- schedule - Task scheduling

## Configuration

All configuration is done via environment variables or uses sensible defaults:

- `DB_PATH` - Database file location (default: `camp_snackbar.db`)
- `BACKUP_DIR` - Backup directory (default: `backups/`)

## Database Schema

Tables:
- **accounts** - Family and individual accounts
- **categories** - Product categories
- **products** - Snackbar inventory items
- **transactions** - Purchase transactions
- **transaction_items** - Line items for each transaction
- **settings** - System settings (admin password, etc.)
- **backup_log** - Backup history

## API Endpoints

All endpoints are under `/api/` prefix:

- Authentication: `/api/auth/login`
- Accounts: `/api/accounts`, `/api/accounts/<id>`
- Products: `/api/products`, `/api/products/<id>`
- Transactions: `/api/transactions`
- Reports: `/api/reports/summary`, `/api/reports/sales`
- Settings: `/api/settings`
- Backup: `/api/backup/create`, `/api/backup/list`

## Running the System

### Development/Testing
```bash
cd backend
source venv/bin/activate
python app.py
```

### Production (systemd service)
See README.md for systemd service configuration

## Security

- JWT token-based authentication
- 4-hour token expiration
- Admin password stored in settings table
- Default password: `camp2024` (CHANGE IMMEDIATELY)

## Backups

- Automatic daily backups at midnight
- Manual backup via API
- Stored in `backend/backups/` directory
- SQLite file format

## WebSocket Events

Real-time updates for:
- `transaction_created` - New transaction
- `account_updated` - Account balance changed
- `product_updated` - Product inventory changed

## Notes

- This is a Docker-free deployment
- Suitable for Raspberry Pi 3/4
- No frontend included (API only)
- CORS enabled for all origins (configure for production)
- Uses Werkzeug development server (consider gunicorn for production)
