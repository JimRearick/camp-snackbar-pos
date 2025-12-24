# Camp Snackbar POS - Backup System Setup Guide

## Overview

The backup system provides both **local** and **remote (internet)** backup capabilities:

- **Local Backups**: Automatically created daily at midnight, stored in `backend/backups/`
- **Remote Backups**: Automatically uploaded to your remote server via rsync over SSH

## Local Backup

### Configuration
Local backups are **enabled by default** and run automatically every day at midnight.

### Location
- Inside Docker: `/app/backend/backups/`
- On Host: `./backend/backups/` (if volume is mounted in docker-compose.yml)

### Retention
Currently, all backups are kept indefinitely. You can manually delete old backups from the `backend/backups/` directory.

---

## Remote Backup Setup (rsync)

### Prerequisites

1. **A remote server** with SSH access (Linux VPS, home server, etc.)
2. **rsync installed** on both the POS server and remote server
3. **SSH key authentication** set up (passwordless login)

### Step 1: Prepare Remote Server

On your **remote backup server**, create a backup directory:

```bash
ssh user@backup-server.com
mkdir -p /var/backups/camp-snackbar
chmod 700 /var/backups/camp-snackbar
```

### Step 2: Set Up SSH Key Authentication

On the **POS server** (where Docker is running):

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "camp-snackbar-backup"

# Copy public key to remote server
ssh-copy-id user@backup-server.com

# Test passwordless login
ssh user@backup-server.com "echo Connection successful"
```

### Step 3: Configure Remote Backup in POS System

1. Log in to the admin interface
2. Go to **Settings** (future feature - for now, use database)
3. Set the `internet_backup_url` to your remote server path

**Using SQLite command line:**

```bash
sqlite3 backend/camp_snackbar.db "UPDATE settings SET value='user@backup-server.com:/var/backups/camp-snackbar/' WHERE key='internet_backup_url'"
```

**Format:** `user@host:/path/to/backup/directory/`

**Examples:**
- `backupuser@192.168.1.100:/backups/camp-snackbar/`
- `admin@backup.mycamp.org:/home/admin/backups/`
- `root@10.0.0.5:/var/backups/snackbar/`

**Important:** The path must end with a `/` (trailing slash)

### Step 4: Test the Backup

Trigger a manual backup to test:

```bash
# From the POS admin interface, click "Create Backup"
# Or test from command line:
docker exec camp-snackbar-pos python3 -c "from backend.app import scheduled_backup; scheduled_backup()"
```

Check the output for:
- ✓ Local backup created
- ✓ Internet connection available
- ✓ Successfully uploaded to remote server

### Step 5: Verify Remote Backup

On your remote server:

```bash
ssh user@backup-server.com
ls -lh /var/backups/camp-snackbar/
```

You should see the backup files with timestamps like `backup_auto_20251220_000025.db`

---

## How It Works

### Automated Daily Backups

1. **Midnight (00:00)**: Backup process starts
2. **Local Backup**: Database copied to `backend/backups/backup_auto_TIMESTAMP.db`
3. **Connectivity Check**: System pings `8.8.8.8` to verify internet
4. **Remote Upload**: If configured and online, rsync uploads to remote server
5. **Retry Logic**: Up to 3 attempts with exponential backoff (1s, 2s, 4s)
6. **Logging**: All backup attempts logged to `backup_log` table

### Manual Backups

Admins can trigger backups anytime from the admin interface. Manual backups:
- Create local backup immediately
- Optionally upload to remote server (if checkbox is selected)
- Provide instant feedback on success/failure

### Error Handling

The system handles various failure scenarios:
- **No Internet**: Skips remote backup, logs failure, continues normally
- **SSH Connection Failed**: Retries 3 times, logs error message
- **rsync Timeout**: 30-second network timeout, 60-second total timeout
- **Remote Server Full**: Logs error, local backup still succeeds

---

## Backup Log

All backup operations are logged in the database table `backup_log`:

```sql
SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 10;
```

Columns:
- `backup_type`: 'local' or 'internet'
- `backup_path`: Full path where backup is stored
- `status`: 'success' or 'failed'
- `file_size`: Size in bytes
- `error_message`: If failed, the error details
- `created_at`: Timestamp

---

## Security Considerations

### SSH Key Protection

**IMPORTANT:** The POS server needs passwordless SSH access to your backup server. This is a security risk if the POS server is compromised.

**Mitigation strategies:**

1. **Dedicated Backup User**: Create a user on the remote server ONLY for backups
   ```bash
   sudo useradd -m -s /bin/bash backupuser
   sudo mkdir -p /var/backups/camp-snackbar
   sudo chown backupuser:backupuser /var/backups/camp-snackbar
   ```

2. **Restrict SSH Commands**: In remote server's `~/.ssh/authorized_keys`, prepend:
   ```
   command="rsync --server -logDtprze.iLsfxC . /var/backups/camp-snackbar/",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
   ```

3. **Firewall Rules**: Only allow SSH from POS server IP address

4. **Read-Only After Upload**: Set backups to read-only on remote
   ```bash
   chmod 400 /var/backups/camp-snackbar/*.db
   ```

### Docker Volume Mounting

Ensure backups persist even if container is deleted:

**docker-compose.yml:**
```yaml
services:
  app:
    volumes:
      - ./data:/app/data
      - ./backups:/app/backend/backups  # Add this line
```

---

## Troubleshooting

### "rsync command not found"

Install rsync on the POS server:
```bash
# If running in Docker, add to Dockerfile:
RUN apt-get update && apt-get install -y rsync
```

### "Permission denied (publickey)"

SSH keys not set up correctly:
```bash
# Test SSH connection
ssh -v user@backup-server.com

# Check if key is loaded
ssh-add -l

# Re-copy public key
ssh-copy-id user@backup-server.com
```

### "No internet connection"

Backup system checks connectivity by pinging `8.8.8.8`. If your network blocks ICMP:
- Modify `check_internet_connectivity()` in `backend/app.py`
- Change host to your gateway or DNS server

### Backups Not Running

Check if scheduler is active:
```bash
docker logs camp-snackbar-pos | grep -i backup
```

Manually trigger a backup to test:
```bash
docker exec camp-snackbar-pos python3 -c "from backend.app import scheduled_backup; scheduled_backup()"
```

---

## Best Practices

1. **Monitor Backup Logs**: Regularly check that backups are succeeding
2. **Test Restores**: Periodically restore from backup to verify integrity
3. **Off-Site Storage**: Store remote backups on a different physical location
4. **Retention Policy**: Implement automated cleanup of old backups
5. **Multiple Destinations**: Consider backing up to multiple remote servers
6. **Encrypted Backups**: For sensitive data, encrypt backups before upload

---

## Advanced Configuration

### Multiple Backup Times

Edit `backend/app.py` to add additional backup schedules:

```python
def run_scheduler():
    """Run scheduled tasks"""
    schedule.every().day.at("00:00").do(scheduled_backup)
    schedule.every().day.at("14:00").do(scheduled_backup)  # Add 2 PM backup

    while True:
        schedule.run_pending()
        time.sleep(60)
```

### Custom Backup Retention

Create a cleanup script to keep only recent backups:

```bash
#!/bin/bash
# Keep only last 30 days of local backups
find /app/backend/backups/ -name "backup_auto_*.db" -mtime +30 -delete
```

### Email Notifications on Failure

Add email alerts when backups fail (requires SMTP configuration):

```python
# In scheduled_backup() function, after failed backup:
if not success:
    send_email_alert("Backup Failed", message)
```

---

## Support

For issues or questions:
- Check Docker logs: `docker logs camp-snackbar-pos`
- Review backup logs in database
- Check remote server logs: `/var/log/auth.log` (SSH) and rsync output
