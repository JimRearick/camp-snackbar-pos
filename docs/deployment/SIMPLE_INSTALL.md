# Simple Installation Guide

This guide shows how to install Camp Snackbar POS using pre-built Docker containers (recommended for most users).

## Prerequisites

- Fresh Ubuntu 24.04 LTS server
- Internet connection
- 8GB RAM, 256GB storage minimum

## Installation Steps

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin git

# Log out and back in for group changes to take effect
# Or run: newgrp docker
```

### 2. Download and Install

```bash
# Clone repository (or download release files)
git clone https://github.com/YOUR_USERNAME/camp-snackbar-pos.git
cd camp-snackbar-pos

# Run installer
chmod +x install.sh
./install.sh
```

That's it! The installer will:
- Download the pre-built Docker image
- Generate security keys
- Create data directories
- Start the application

### 3. Access the System

Open a browser to:
- `http://localhost` (from the server)
- `http://YOUR_SERVER_IP` (from tablets)

**Default login:**
- Username: `admin`
- Password: `admin`

**⚠️ IMPORTANT: Change the admin password immediately!**

## Configuration

The `.env` file is auto-created. You can customize:

```bash
nano .env
```

```env
# Docker image (leave as-is unless hosting your own)
DOCKER_IMAGE=yourname/camp-snackbar-pos:latest

# Security key (auto-generated, don't change unless needed)
SECRET_KEY=auto-generated-random-key

# Environment
FLASK_ENV=production
```

## Management

### View Status
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs -f
```

### Restart
```bash
docker compose restart
```

### Stop
```bash
docker compose down
```

### Start
```bash
docker compose up -d
```

### Update to Latest Version
```bash
docker compose pull
docker compose up -d
```

### Create Backup
```bash
cp data/camp_snackbar.db backups/manual_backup_$(date +%Y%m%d_%H%M%S).db
```

## Set Static IP (Recommended)

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:  # Your interface name (check with 'ip a')
      dhcp4: no
      addresses:
        - 192.168.1.100/24  # Your desired static IP
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Apply:
```bash
sudo netplan apply
```

## Auto-Start on Boot

Already configured! Docker containers will automatically start when the server boots.

To verify:
```bash
sudo systemctl status docker
```

## Troubleshooting

### Permission Denied Error
```bash
# Make sure you're in the docker group
newgrp docker
# Or log out and back in
```

### Can't Access from Tablets
```bash
# Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check if service is running
docker compose ps
```

### Reset to Defaults
```bash
# Stop service
docker compose down

# Remove data (WARNING: deletes all data!)
rm -rf data/camp_snackbar.db

# Restore from repo
cp backend/camp_snackbar.db data/

# Restart
docker compose up -d
```

## Next Steps

1. ✅ Change admin password
2. ✅ Set static IP address
3. ✅ Add your accounts
4. ✅ Add your products and categories
5. ✅ Create additional users (POS, Prep roles)
6. ✅ Connect tablets to `http://YOUR_SERVER_IP`
7. ✅ Test a transaction
8. ✅ Train staff

## Advanced Options

For advanced deployment options including:
- Building from source
- Custom Docker images
- Development setup
- SSL/HTTPS configuration

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
