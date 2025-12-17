# Camp Snackbar POS - Docker Image

Touch-first, tablet-optimized Point of Sale system for summer camps and concession stands.

Hosted on **GitHub Container Registry (GHCR)** - no Docker Hub account needed!

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Linux server (Ubuntu 24.04 LTS recommended)
- 8GB RAM minimum
- Network access for tablets

### Installation (2 Steps)

**1. Clone the repository:**
```bash
git clone https://github.com/JimRearick/camp-snackbar-pos.git
cd camp-snackbar-pos
```

**2. Run the installer:**
```bash
chmod +x install.sh
./install.sh
```

**3. Access the app:**
- Open browser to `http://YOUR_SERVER_IP`
- Login: `admin` / `admin`
- **IMMEDIATELY change the password!**

## Configuration

Edit `.env` file (auto-created by install.sh):

```env
# Docker image from GitHub Container Registry
DOCKER_IMAGE=ghcr.io/jimrearick/camp-snackbar-pos:latest

# Generate new secret key with:
# python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-random-secret-key-here

FLASK_ENV=production
```

## Data Persistence

Data is stored in local directories (auto-created):
- `./data/` - Database file
- `./backups/` - Automatic backups

## Management Commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Start
docker compose up -d

# Update to latest version
docker compose pull
docker compose up -d

# Create manual backup
docker compose exec app cp /app/data/camp_snackbar.db /app/backups/manual_backup_$(date +%Y%m%d_%H%M%S).db
```

## Features

- **Touch-First Interface** - Optimized for 7-11" tablets
- **Role-Based Access** - Admin, POS, and Prep user roles
- **Real-Time Updates** - WebSocket sync across all devices
- **Prep Queue** - Kitchen display system
- **Account Management** - Family and individual accounts
- **Security Hardened** - CSRF, XSS protection, input validation
- **Auto HTTPS** - Caddy reverse proxy with automatic SSL

## Default Ports

- HTTP: 80
- HTTPS: 443 (auto-configured by Caddy)

## Support

- Documentation: [GitHub Repository](https://github.com/YOUR_USERNAME/camp-snackbar-pos)
- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/camp-snackbar-pos/issues)

## License

[Your License Here]
