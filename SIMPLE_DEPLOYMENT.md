# Simple Deployment Guide

## Quick Start with Docker (Recommended)

This guide will get Camp Snackbar POS running in under 5 minutes using Docker.

### Prerequisites

- A Linux system (Raspberry Pi, Ubuntu, Debian, etc.)
- Internet connection
- SSH access (if deploying to a remote server)

### Step 1: Install Docker

If Docker is not already installed, run:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Log out and back in for group changes to take effect.

### Step 2: Download Deployment Files

Create a directory and download the necessary files:

```bash
mkdir -p ~/camp-snackbar
cd ~/camp-snackbar

# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/JimRearick/camp-snackbar-pos/main/docker-compose.yml

# Download deployment script
curl -O https://raw.githubusercontent.com/JimRearick/camp-snackbar-pos/main/deploy.sh
chmod +x deploy.sh

# Download environment template
curl -O https://raw.githubusercontent.com/JimRearick/camp-snackbar-pos/main/.env.example
```

### Step 3: Configure Environment

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `DOMAIN` - Your domain or IP address (e.g., `pos.yourcamp.com` or `192.168.1.100`)

**Minimal .env file:**
```env
SECRET_KEY=your-generated-secret-key-here
DOMAIN=192.168.1.100
```

### Step 4: Deploy

Run the automated deployment:

```bash
./deploy.sh install
```

This will:
- Create necessary directories
- Initialize the database with default data
- Start all services
- Display access information

### Step 5: Access the Application

Open your browser and navigate to:
- Local: `http://localhost`
- Network: `http://YOUR_SERVER_IP`

**Default Login Credentials:**
- Username: `admin`
- Password: `camp2026`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## Management Commands

Once deployed, use these commands to manage the application:

```bash
# Start the application
./deploy.sh start

# Stop the application
./deploy.sh stop

# Restart the application
./deploy.sh restart

# View logs
./deploy.sh logs
./deploy.sh logs app        # App logs only
./deploy.sh logs -f         # Follow logs

# Check status
./deploy.sh status

# Update to latest version
./deploy.sh update

# Create database backup
./deploy.sh backup
```

---

## Manual Docker Commands

If you prefer to run Docker commands directly:

### Pull and Start

```bash
# Pull the latest image
docker compose pull

# Start services
docker compose up -d

# Check status
docker compose ps
```

### View Logs

```bash
# All logs
docker compose logs -f

# App logs only
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100
```

### Update Application

```bash
# Stop services
docker compose down

# Pull latest image
docker compose pull

# Restart services
docker compose up -d
```

---

## Docker Image Information

The application uses pre-built Docker images from GitHub Container Registry:

```
ghcr.io/jimrearick/camp-snackbar-pos:latest
```

**Available Tags:**
- `latest` - Most recent stable release
- `v1.8.4` - Specific version (recommended for production)
- `main` - Latest development build

### Using a Specific Version

To use a specific version, edit `docker-compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/jimrearick/camp-snackbar-pos:v1.8.4
```

Then pull and restart:

```bash
docker compose pull
docker compose up -d
```

---

## File Structure

After deployment, your directory will look like:

```
~/camp-snackbar/
├── docker-compose.yml    # Docker configuration
├── .env                  # Environment variables (keep secure!)
├── deploy.sh            # Management script
├── data/                # Database and application data
│   └── camp_snackbar.db
└── backups/             # Database backups
    └── camp_snackbar_YYYY-MM-DD_HH-MM-SS.db
```

---

## Troubleshooting

### Container Won't Start

Check logs for errors:
```bash
docker compose logs app
```

Common issues:
- Port 80 already in use (change in docker-compose.yml)
- Insufficient permissions (ensure user is in docker group)
- Database corruption (restore from backup)

### Can't Access Application

1. Check container is running:
   ```bash
   docker compose ps
   ```

2. Verify firewall allows port 80:
   ```bash
   sudo ufw allow 80/tcp
   ```

3. Check if port is listening:
   ```bash
   sudo netstat -tulpn | grep :80
   ```

### Database Issues

Restore from backup:
```bash
# Stop services
./deploy.sh stop

# Restore backup
cp backups/camp_snackbar_YYYY-MM-DD_HH-MM-SS.db data/camp_snackbar.db

# Start services
./deploy.sh start
```

### Update Failed

Roll back to previous version:
```bash
# Edit docker-compose.yml and specify previous version tag
# For example: ghcr.io/jimrearick/camp-snackbar-pos:v1.8.3

docker compose pull
docker compose up -d
```

---

## Network Access

### Local Network Only

Default configuration - accessible on local network only.

### Internet Access (Advanced)

If you need internet access:

1. **Set up domain DNS** pointing to your public IP
2. **Configure .env** with your domain
3. **Port forward** 80/443 on your router to server
4. **SSL will be automatic** via Let's Encrypt

The Caddy server handles SSL certificates automatically when a domain is configured.

---

## Backup Strategy

### Automatic Backups

The deployment script includes a backup command:

```bash
# Create manual backup
./deploy.sh backup
```

### Scheduled Backups (Recommended)

Set up a daily cron job:

```bash
# Edit crontab
crontab -e

# Add this line for daily 2 AM backups
0 2 * * * cd ~/camp-snackbar && ./deploy.sh backup

# Keep only last 30 days
0 3 * * * find ~/camp-snackbar/backups -name "*.db" -mtime +30 -delete
```

### Off-site Backups

Copy backups to another location:

```bash
# Example: Copy to USB drive
cp backups/*.db /media/usb-backup/

# Example: Copy to another server via SCP
scp backups/*.db user@backup-server:/backups/camp-snackbar/
```

---

## Security Best Practices

1. **Change default password immediately**
2. **Keep SECRET_KEY secure** - never share .env file
3. **Regular backups** - test restore procedure
4. **Update regularly** - `./deploy.sh update`
5. **Restrict network access** - use firewall rules if needed
6. **Monitor logs** - check for unusual activity

---

## Getting Help

- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/JimRearick/camp-snackbar-pos/issues
- **Logs**: `./deploy.sh logs` for troubleshooting

---

## Default User Accounts

The system comes with three default accounts:

| Username | Password  | Role  | Purpose                    |
|----------|-----------|-------|----------------------------|
| admin    | camp2026  | admin | Full administrative access |
| pos      | camp2026  | pos   | Point of sale operations   |
| prep     | camp2026  | prep  | Kitchen prep queue access  |

**⚠️ Change all passwords after first login!**
