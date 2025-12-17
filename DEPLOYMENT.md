# Camp Snackbar POS - Deployment Guide

## Quick Deployment (New Server)

### Minimum Files Required

For a fresh deployment, you only need **2 files**:

1. `docker-compose.yml` - Container configuration
2. `.env` (optional) - Environment variables

### Step-by-Step Deployment

#### 1. Prepare the Server

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect

# Install Docker Compose (if not included)
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### 2. Create Deployment Directory

```bash
mkdir -p ~/camp-snackbar-pos
cd ~/camp-snackbar-pos
```

#### 3. Create docker-compose.yml

Create a file named `docker-compose.yml` with the following content:

```yaml
services:
  app:
    image: ghcr.io/jimrearick/camp-snackbar-pos:latest
    container_name: camp-snackbar-app
    restart: unless-stopped
    ports:
      - "80:8000"
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY:-please-change-this-secret-key-in-production}
      - TZ=${TZ:-America/New_York}
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro

networks:
  camp-network:
    driver: bridge
```

#### 4. Create .env File (Optional but Recommended)

Create a file named `.env`:

```bash
# Security - CHANGE THIS!
SECRET_KEY=your-random-secret-key-here-change-me

# Timezone (optional)
TZ=America/New_York

# Docker Image (optional - defaults to latest)
DOCKER_IMAGE=ghcr.io/jimrearick/camp-snackbar-pos:latest
```

**Generate a secure SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 5. Deploy the Application

```bash
# Pull the latest image
docker compose pull

# Start the application
docker compose up -d

# Check logs
docker compose logs -f
```

#### 6. Access the Application

Open your browser and navigate to:
- **POS Terminal**: http://your-server-ip/
- **Admin Dashboard**: http://your-server-ip/admin.html
- **Reports**: http://your-server-ip/reports.html

**Default Login Credentials:**
- Username: `admin`
- Password: `admin`

**⚠️ IMPORTANT: Change the default password immediately after first login!**

---

## Data Persistence

The application stores data in the following locations:

- `./data/camp_snackbar.db` - Main SQLite database
- `./backups/` - Automated database backups

These directories are automatically created on first run.

---

## Upgrading to a New Version

```bash
cd ~/camp-snackbar-pos

# Pull the latest image
docker compose pull

# Restart with new image
docker compose down
docker compose up -d

# Verify the upgrade
docker compose logs -f
```

---

## Migrating from Another Server

If you're migrating from an existing installation:

1. **On the old server**, backup your data:
```bash
cd ~/camp-snackbar-pos
tar -czf camp-snackbar-backup.tar.gz data/ backups/
```

2. **Transfer to the new server:**
```bash
scp camp-snackbar-backup.tar.gz user@new-server:~/
```

3. **On the new server**, restore data:
```bash
cd ~/camp-snackbar-pos
tar -xzf ~/camp-snackbar-backup.tar.gz
docker compose up -d
```

---

## Troubleshooting

### View Logs
```bash
docker compose logs -f
```

### Restart Application
```bash
docker compose restart
```

### Stop Application
```bash
docker compose down
```

### Reset Database (Fresh Start)
```bash
docker compose down
rm -rf data/
docker compose up -d
```

### Check Container Status
```bash
docker compose ps
```

---

## Firewall Configuration

If using a firewall, ensure port 80 is open:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

---

## SSL/HTTPS Setup (Optional)

For production use, consider adding a reverse proxy with SSL:

### Option 1: Nginx + Let's Encrypt

1. Install Nginx and Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

2. Configure Nginx as reverse proxy (create `/etc/nginx/sites-available/camp-snackbar`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable and get SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/camp-snackbar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

4. Update docker-compose.yml to only expose internally:
```yaml
    ports:
      - "127.0.0.1:8000:8000"  # Only accessible from localhost
```

---

## Backup Strategy

### Manual Backup
```bash
cd ~/camp-snackbar-pos
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/ backups/
```

### Automated Daily Backup (using cron)
```bash
# Edit crontab
crontab -e

# Add this line for daily 2 AM backup
0 2 * * * cd ~/camp-snackbar-pos && tar -czf ~/backups/camp-snackbar-$(date +\%Y\%m\%d).tar.gz data/ backups/ && find ~/backups -name "camp-snackbar-*.tar.gz" -mtime +30 -delete
```

---

## System Requirements

**Minimum:**
- 1 CPU core
- 512 MB RAM
- 1 GB disk space
- Docker 20.10+
- Docker Compose 2.0+

**Recommended:**
- 2 CPU cores
- 1 GB RAM
- 5 GB disk space (for backups)
- Ubuntu 20.04+ or Debian 11+

---

## Security Recommendations

1. **Change default credentials** immediately
2. **Set a strong SECRET_KEY** in .env file
3. **Enable firewall** and only allow necessary ports
4. **Use HTTPS** in production (with reverse proxy)
5. **Regular backups** of the data directory
6. **Keep Docker updated**: `sudo apt update && sudo apt upgrade`
7. **Monitor logs** regularly for suspicious activity

---

## Support & Updates

- **Repository**: https://github.com/JimRearick/camp-snackbar-pos
- **Container Registry**: https://github.com/JimRearick/camp-snackbar-pos/pkgs/container/camp-snackbar-pos
- **Latest Version**: Check GitHub releases or container tags

---

## Quick Reference Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f

# Update to latest
docker compose pull && docker compose up -d

# Backup
tar -czf backup.tar.gz data/ backups/

# Check status
docker compose ps
```
