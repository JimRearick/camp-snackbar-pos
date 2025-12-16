# Camp Snack Bar POS System - Setup Guide

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Debian/Linux Testing Setup](#debianlinux-testing-setup)
3. [Raspberry Pi Production Setup](#raspberry-pi-production-setup)
4. [Tablet Client Configuration](#tablet-client-configuration)
5. [Network Configuration](#network-configuration)
6. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Server (Raspberry Pi / Debian)
- **Raspberry Pi 4** (4GB RAM minimum, 8GB recommended) OR Debian 11+ server
- **16GB+ microSD card** (for Pi) or equivalent storage
- **Ethernet or WiFi** network connection
- **Docker** and **Docker Compose** installed

### Tablets (Clients)
- **Android tablets** (7-11 inches, Android 8.0+) OR **iPads** (iOS 12+)
- Modern web browser (Chrome, Safari, Firefox)
- Connected to same WiFi network as server

---

## Debian/Linux Testing Setup

### Step 1: Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Git (if not present)
sudo apt install git -y

# Logout and login again for Docker permissions to take effect
```

### Step 2: Clone/Create Project Structure

```bash
# Create project directory
mkdir -p ~/camp-snackbar
cd ~/camp-snackbar

# Create directory structure
mkdir -p backend frontend data backups
```

### Step 3: Copy Application Files

Copy all the files from the artifacts into their respective directories:

```
camp-snackbar/
├── backend/
│   ├── app.py
│   ├── schema.sql
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── components/
├── Dockerfile
├── docker-compose.yml
└── data/
```

### Step 4: Build and Run

```bash
# Build the Docker image
docker-compose build

# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify it's running
curl http://localhost:5000/api/products
```

### Step 5: Access the Application

1. Find your server's IP address:
   ```bash
   ip addr show | grep inet
   ```

2. Open browser on any device on same network:
   ```
   http://[SERVER-IP]:5000
   ```

3. Default admin password: `camp2024`

---

## Raspberry Pi Production Setup

### Step 1: Prepare Raspberry Pi

1. **Flash Raspberry Pi OS** (64-bit recommended)
   - Use Raspberry Pi Imager
   - Select "Raspberry Pi OS (64-bit)"
   - Configure WiFi and enable SSH before writing

2. **Initial Setup**
   ```bash
   # SSH into Pi
   ssh pi@raspberrypi.local
   # Default password: raspberry

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Change default password
   passwd
   ```

### Step 2: Install Docker on Raspberry Pi

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# Install Docker Compose
sudo apt install docker-compose -y

# Reboot
sudo reboot
```

### Step 3: Deploy Application

```bash
# SSH back in
ssh pi@raspberrypi.local

# Create project directory
mkdir -p ~/camp-snackbar
cd ~/camp-snackbar

# Transfer files from your development machine
# Option 1: Use SCP from your computer
# scp -r camp-snackbar/* pi@raspberrypi.local:~/camp-snackbar/

# Option 2: Use Git (if you have a repository)
# git clone https://github.com/your-repo/camp-snackbar.git
# cd camp-snackbar

# Build and run
docker-compose build
docker-compose up -d
```

### Step 4: Configure Auto-Start

```bash
# Create systemd service
sudo nano /etc/systemd/system/camp-snackbar.service
```

Add this content:
```ini
[Unit]
Description=Camp Snack Bar POS System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/camp-snackbar
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=pi

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl enable camp-snackbar
sudo systemctl start camp-snackbar
sudo systemctl status camp-snackbar
```

### Step 5: Set Static IP (Recommended)

```bash
# Edit dhcpcd configuration
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Reboot:
```bash
sudo reboot
```

---

## Tablet Client Configuration

### For Android Tablets

1. **Connect to WiFi**
   - Connect to same network as server
   - Ensure no client isolation enabled on router

2. **Open Browser**
   - Use Chrome (recommended) or Firefox
   - Navigate to: `http://[RASPBERRY-PI-IP]:5000`

3. **Add to Home Screen** (Makes it feel like an app)
   - Chrome: Menu → "Add to Home screen"
   - Firefox: Menu → "Install"
   - Give it a name like "Camp POS"

4. **Enable Full Screen**
   - In Chrome settings: Enable "Desktop site" if layout looks wrong
   - Hide system bars for fullscreen experience

5. **Prevent Sleep** (Optional but recommended)
   - Install app like "Keep Screen On" or "Caffeine"
   - Or adjust Settings → Display → Sleep to maximum

### For iPads

1. **Connect to WiFi**
   - Settings → WiFi → Select network

2. **Open Safari**
   - Navigate to: `http://[RASPBERRY-PI-IP]:5000`

3. **Add to Home Screen**
   - Tap Share button (square with arrow)
   - Select "Add to Home Screen"
   - Name it "Camp POS"
   - This creates a web app that opens without Safari UI

4. **Enable Guided Access** (Optional - prevents leaving app)
   - Settings → Accessibility → Guided Access → Enable
   - Set a passcode
   - Triple-click home button to start Guided Access
   - Useful for staff tablets to prevent misuse

---

## Network Configuration

### Router Settings

1. **Reserve IP for Raspberry Pi**
   - Access router admin panel (usually 192.168.1.1)
   - Find DHCP settings
   - Add reservation for Pi's MAC address

2. **Disable Client Isolation** (Critical!)
   - Often under WiFi → Advanced Settings
   - Called "Client Isolation", "AP Isolation", or "Guest Mode"
   - Must be DISABLED for tablets to reach server

3. **Firewall Settings**
   - Ensure port 5000 is open on local network
   - No additional firewall rules needed for local-only setup

### Testing Connectivity

From a tablet browser, test these URLs:

```
http://[PI-IP]:5000              # Should show POS interface
http://[PI-IP]:5000/api/products # Should show JSON data
```

If unable to connect:
- Verify both devices on same network
- Check client isolation is disabled
- Verify Pi's IP address with `ip addr show`
- Check Pi firewall: `sudo ufw status` (should be inactive or allow 5000)

---

## Troubleshooting

### Server Not Starting

```bash
# Check Docker status
sudo systemctl status docker

# Check application logs
cd ~/camp-snackbar
docker-compose logs

# Rebuild if needed
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Errors

```bash
# Stop application
docker-compose down

# Backup existing database
cp data/camp_snackbar.db data/camp_snackbar.db.backup

# Reinitialize database
rm data/camp_snackbar.db
docker-compose up -d
```

### Tablets Can't Connect

1. Verify IP address:
   ```bash
   hostname -I
   ```

2. Test from server itself:
   ```bash
   curl http://localhost:5000/api/products
   ```

3. Check firewall:
   ```bash
   sudo ufw status
   # If active and blocking, allow port 5000:
   sudo ufw allow 5000
   ```

4. Verify network:
   ```bash
   # On tablet, open browser console and try:
   ping [PI-IP]
   ```

### Performance Issues

1. **Increase Raspberry Pi resources**:
   - Close unnecessary services
   - Consider upgrading to Pi 4 with 8GB RAM

2. **Optimize database**:
   ```bash
   # Connect to container
   docker exec -it camp-snackbar-pos bash
   
   # Optimize SQLite
   sqlite3 /app/data/camp_snackbar.db
   VACUUM;
   ANALYZE;
   .quit
   ```

3. **Clear old transactions**:
   - Use admin panel to archive old data
   - Export and remove transactions older than camp session

### Admin Password Reset

```bash
# Connect to running container
docker exec -it camp-snackbar-pos bash

# Open Python shell
python

# Update password
import sqlite3
conn = sqlite3.connect('/app/data/camp_snackbar.db')
conn.execute("UPDATE settings SET value = 'newpassword' WHERE key = 'admin_password'")
conn.commit()
conn.close()
exit()
```

---

## Maintenance

### Daily Operations

- System starts automatically
- Backups run at midnight
- Check backup logs in admin panel

### End of Camp

1. **Final Backup**:
   ```bash
   docker exec camp-snackbar-pos python -c "
   import shutil
   import datetime
   shutil.copy2('/app/data/camp_snackbar.db', 
                f'/app/backups/final_backup_{datetime.datetime.now():%Y%m%d}.db')
   "
   ```

2. **Export Reports**:
   - Login to admin panel
   - Go to Reports
   - Export to CSV

3. **Archive Data**:
   ```bash
   # Copy entire data directory
   cp -r ~/camp-snackbar/data ~/camp-snackbar/archive-$(date +%Y%m%d)
   ```

### Next Camp Session

1. **Option A: Fresh Start**:
   ```bash
   # Backup old data
   mv ~/camp-snackbar/data ~/camp-snackbar/data-backup-$(date +%Y%m%d)
   mkdir ~/camp-snackbar/data
   
   # Restart - will create fresh database
   docker-compose restart
   ```

2. **Option B: Continue with Existing**:
   - Clear old transactions in admin panel
   - Reset account balances
   - Keep account and product information

---

## Security Notes

- Default password is `camp2024` - **CHANGE THIS** in admin panel
- Application designed for local network only
- Do NOT expose port 5000 to internet without proper authentication
- Regular backups are essential
- Consider encrypting backup files if stored off-site

---

## Support & Updates

For issues or feature requests:
1. Check logs: `docker-compose logs`
2. Review this guide's troubleshooting section
3. Check Docker container status: `docker ps`

To update the application:
```bash
cd ~/camp-snackbar
docker-compose down
# Update source files
docker-compose build --no-cache
docker-compose up -d
```