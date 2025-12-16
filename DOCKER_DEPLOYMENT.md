# Docker Deployment Guide
**Camp Snackbar POS System**

Production-ready containerized deployment optimized for Intel x86_64 mini PC.

---

## System Requirements

### Hardware
- **CPU:** Intel 5205U (or any modern Intel/AMD x86_64)
- **RAM:** 8GB DDR4 (2GB minimum for container)
- **Storage:** 256GB SSD (10GB minimum for application)
- **Network:** Ethernet or WiFi with static IP recommended

### Software
- **OS:** Ubuntu 22.04 LTS, Debian 12, or similar Linux distribution
- **Docker:** Version 20.10 or higher
- **Docker Compose:** Version 2.0 or higher

---

## Quick Start (5 Minutes)

### 1. Install Docker

```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid needing sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**Log out and back in** for group changes to take effect.

### 2. Clone and Configure

```bash
# Navigate to application directory
cd /path/to/camp-snackbar-pos

# Create environment file
cp .env.example .env

# Generate a secure secret key
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))" >> .env

# Create data directories
mkdir -p data backups
chmod 755 data backups
```

### 3. Initialize Database

**First time only:**

```bash
# Start just the app container to initialize database
docker compose up -d app

# Wait for it to start
sleep 10

# Initialize the database
docker compose exec app python /app/backend/init_db.py

# Stop the app
docker compose down
```

### 4. Start All Services

```bash
# Start app + Caddy reverse proxy
docker compose up -d

# Verify containers are running
docker compose ps

# Check logs
docker compose logs -f
```

### 5. Access the Application

- **Local:** http://localhost
- **Network:** http://YOUR-MINI-PC-IP
- **Default Login:** admin / admin

⚠️ **Change the admin password immediately after first login!**

---

## Configuration

### Environment Variables

Edit `.env` file to customize:

```bash
# Required: Change this to a random secret key
SECRET_KEY=your-random-secret-key-here

# Optional: Database and backup paths
DB_PATH=/app/data/camp_snackbar.db
BACKUP_DIR=/app/backups

# Optional: Production settings
FLASK_ENV=production
```

### Static IP Configuration (Recommended)

For tablets to reliably connect, set a static IP on your mini PC:

**Ubuntu/Debian with NetworkManager:**
```bash
# Edit connection (replace CONNECTION_NAME with your network name)
nmcli connection modify CONNECTION_NAME \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8,8.8.4.4" \
  ipv4.method manual

# Restart network
sudo nmcli connection down CONNECTION_NAME
sudo nmcli connection up CONNECTION_NAME
```

Tablets can then access: `http://192.168.1.100`

### Domain Name + HTTPS (Optional)

If you have a domain name, edit `Caddyfile`:

```caddyfile
# Replace the :80 block with your domain
snackbar.example.com {
    reverse_proxy app:8000
    encode gzip
    # ... (security headers already configured)
}
```

Caddy will automatically:
- Get Let's Encrypt SSL certificate
- Renew certificates before expiration
- Redirect HTTP to HTTPS
- Enable HTTP/2 and HTTP/3

---

## Management Commands

### Start/Stop/Restart

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# Restart just the app
docker compose restart app
```

### View Logs

```bash
# All services
docker compose logs -f

# Just the app
docker compose logs -f app

# Just Caddy
docker compose logs -f caddy

# Last 100 lines
docker compose logs --tail=100
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify
docker compose ps
```

### Database Backup

**Automatic backups** are configured in the application.

**Manual backup:**
```bash
# Backup database
docker compose exec app python -c "from app import create_backup; create_backup('local')"

# Copy backup to host
docker cp camp-snackbar-app:/app/backups ./backups-host/

# List backups
ls -lh backups/
```

### Database Restore

```bash
# Stop the application
docker compose down

# Replace database with backup
cp backups/camp_snackbar_YYYY-MM-DD_HH-MM-SS.db data/camp_snackbar.db

# Start application
docker compose up -d
```

---

## Resource Usage

On Intel 5205U with 8GB RAM:

| Container | CPU Usage | RAM Usage | Purpose |
|-----------|-----------|-----------|---------|
| app | ~5-10% | ~150-200MB | Flask + Gunicorn |
| caddy | ~1-2% | ~20-30MB | Reverse proxy |
| **Total** | **~10-15%** | **~200MB** | Very lightweight |

You'll have plenty of resources left for:
- OS operations
- Other services
- Future scaling

---

## Monitoring

### Health Checks

The app container has built-in health checks:

```bash
# Check container health
docker compose ps

# Should show "healthy" status for app
# CONTAINER          STATUS
# camp-snackbar-app  Up 5 minutes (healthy)
```

### System Resources

```bash
# View resource usage
docker stats

# Or specific container
docker stats camp-snackbar-app
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose logs app

# Common issues:
# 1. Port 80 already in use
#    Solution: Stop other web servers or change Caddy port in docker-compose.yml

# 2. Permission errors
#    Solution: Check data/ and backups/ directories are writable
chmod 755 data backups
```

### Can't access from tablets

```bash
# Verify container is running
docker compose ps

# Check if port is accessible
curl http://localhost

# From another device on same network
curl http://YOUR-MINI-PC-IP

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Database locked errors

```bash
# SQLite can have lock issues with multiple connections
# The app is configured with timeout=30s to handle this

# If persistent, restart the app
docker compose restart app
```

### High memory usage

```bash
# Check current usage
docker stats --no-stream

# If app uses too much RAM, reduce Gunicorn workers
# Edit Dockerfile, line with --workers:
# Change from --workers 4 to --workers 2

# Rebuild
docker compose build --no-cache app
docker compose up -d
```

---

## Security Checklist

Before going to production:

- [ ] Changed admin password from default
- [ ] Generated unique SECRET_KEY in .env
- [ ] Set static IP on mini PC
- [ ] Disabled unnecessary services on mini PC
- [ ] Configured firewall (ufw) to allow only ports 80/443
- [ ] Set up automatic backups (already configured in app)
- [ ] Tested from all tablets
- [ ] Verified CSRF protection works
- [ ] Verified XSS escaping works
- [ ] Ran security test suite: `python3 security_tests.py`

---

## Automatic Startup

### Enable on Boot

Docker Compose containers with `restart: unless-stopped` will automatically start on boot.

To ensure Docker starts on boot:

```bash
sudo systemctl enable docker
sudo systemctl enable containerd
```

### Test Reboot

```bash
# Reboot the mini PC
sudo reboot

# After reboot, verify containers started
docker compose ps

# Should show both containers running
```

---

## Performance Tuning

### For Intel 5205U (2 cores, 4 threads)

The default configuration uses:
- **4 Gunicorn workers** (good for 4 threads)
- **2 threads per worker** (handles concurrent requests)
- **Eventlet worker class** (async for SocketIO)

This should handle **50+ concurrent tablet connections** easily.

### If you need more performance:

Edit `Dockerfile` line 76:
```dockerfile
# Increase workers (1 per CPU thread)
"--workers", "4",  # Change to 6 or 8 if needed

# Increase threads
"--threads", "2",  # Change to 4 if needed
```

---

## Backup Strategy

### Automatic Backups

The application creates daily backups automatically (configured in app.py).

Backups are stored in: `./backups/`

### Offsite Backup

Copy backups to another location:

```bash
# Copy to USB drive
cp -r backups/ /media/usb-drive/camp-snackbar-backups/

# Or rsync to another server
rsync -avz backups/ user@backup-server:/backups/camp-snackbar/

# Or to cloud storage (example with rclone)
rclone sync backups/ remote:camp-snackbar-backups/
```

### Backup Retention

Configure in `app.py` or create a cron job:

```bash
# Keep only last 30 days of backups
find backups/ -name "*.db" -mtime +30 -delete
```

---

## Scaling for Multiple Locations

If you need to run multiple snackbar locations:

### Option 1: Multiple Containers on Same Server

```bash
# Copy to snackbar2 directory
cp -r camp-snackbar-pos camp-snackbar-pos-location2

cd camp-snackbar-pos-location2

# Edit docker-compose.yml to use different ports
# Change "80:80" to "8080:80"
# Change container names to avoid conflicts

docker compose up -d
```

### Option 2: Separate Mini PCs

Deploy to multiple mini PCs (recommended for reliability)

---

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Review this guide
3. Run security tests: `python3 security_tests.py`
4. Check GitHub issues: [repository URL]

---

**Last Updated:** December 15, 2025
**Version:** 1.0.0
**Optimized For:** Intel x86_64 architecture
