# Backup System Implementation Summary

## What Was Implemented

A comprehensive backup system with both local and internet (remote) backup capabilities using rsync over SSH.

### Key Features

1. **Local Backups**
   - Automatic daily backups at midnight
   - Stored in `backend/backups/`
   - Logged to database `backup_log` table
   - Manual backup via admin API

2. **Remote Backups (rsync)**
   - Automatic upload after local backup completes
   - Connectivity checking before upload
   - Retry logic (3 attempts with exponential backoff)
   - Works with any SSH-accessible server
   - No cloud accounts or external services needed

3. **Error Handling**
   - Internet down: Skips remote backup, logs failure
   - SSH connection failed: Retries 3 times, logs error
   - Timeout: 30s network timeout, 60s total timeout
   - All failures logged with error messages

4. **Security**
   - SSH keys mounted read-only in Docker
   - Passwordless authentication via SSH keys
   - Encrypted transfer via SSH tunnel

## Files Modified

### backend/app.py

**New Functions:**

1. `check_internet_connectivity(host='8.8.8.8', timeout=3)`
   - Pings reliable host to verify internet connection
   - Returns True/False
   - Used before attempting remote upload

2. `rsync_backup_to_remote(local_path, remote_config, max_retries=3)`
   - Uploads file to remote server via rsync
   - Parameters: local file path, remote config (user@host:/path/)
   - Retries with exponential backoff (1s, 2s, 4s delays)
   - Returns (success: bool, message: str)

3. `scheduled_backup()` - **Enhanced**
   - Original: Created local backup only
   - New: Creates local backup + optional remote upload
   - Steps:
     1. Create local backup
     2. Check `internet_backup_url` setting
     3. If configured, check internet connectivity
     4. Upload via rsync if online
     5. Log all operations to `backup_log`

**Modified Endpoints:**

1. `POST /api/backup/create` - **Enhanced**
   - Added `include_internet` parameter
   - Returns `internet_backup` status in response
   - Allows manual triggering of remote backup

### docker-compose.yml

**Added Volumes:**
```yaml
- ./backups:/app/backend/backups      # Persist backups on host
- ${HOME}/.ssh:/root/.ssh:ro          # Mount SSH keys (read-only)
```

### Dockerfile

**Added Packages:**
```dockerfile
rsync           # File transfer tool
openssh-client  # SSH client for authentication
```

## New Files Created

### 1. BACKUP_SETUP.md (Comprehensive Guide)
- Complete setup instructions
- SSH key generation and configuration
- Security best practices
- Troubleshooting guide
- Advanced configuration options

### 2. BACKUP_QUICKSTART.md (Quick Reference)
- 5-minute setup with script
- Manual setup steps
- Configuration examples
- Verification commands
- Common issues and fixes

### 3. setup-remote-backup.sh (Automated Setup)
- Interactive setup script
- Generates SSH keys
- Copies keys to remote server
- Tests connection
- Updates database configuration
- Runs test backup

Permissions: `chmod +x setup-remote-backup.sh`

### 4. BACKUP_IMPLEMENTATION.md (This File)
- Technical summary
- Implementation details
- For developers/maintainers

## Database Configuration

### Settings Table

> **⚠️ RESTART REQUIRED:** After changing `backup_enabled` or `backup_time`, you MUST restart the app with `docker compose restart` for changes to take effect. The scheduler only reads these settings on startup.

Backup behavior is controlled by three settings:

```sql
-- View all backup settings
SELECT * FROM settings WHERE key IN ('backup_enabled', 'backup_time', 'internet_backup_url');

-- Enable/disable automatic backups
UPDATE settings SET value = 'true' WHERE key = 'backup_enabled';   -- Enable
UPDATE settings SET value = 'false' WHERE key = 'backup_enabled';  -- Disable

-- Set backup time (24-hour format, LOCAL TIMEZONE)
UPDATE settings SET value = '00:00' WHERE key = 'backup_time';  -- Midnight
UPDATE settings SET value = '02:30' WHERE key = 'backup_time';  -- 2:30 AM
UPDATE settings SET value = '14:00' WHERE key = 'backup_time';  -- 2:00 PM

-- Set remote server (format: user@host:/path/)
UPDATE settings
SET value = 'backupuser@backup.example.com:/var/backups/camp-snackbar/'
WHERE key = 'internet_backup_url';

-- Disable remote backup (set to empty string)
UPDATE settings
SET value = ''
WHERE key = 'internet_backup_url';
```

**Important Notes:**
- `backup_time` uses **server's local timezone** (not UTC)
- Time format is 24-hour: "HH:MM" (e.g., "00:00", "14:30")
- ⚠️ **CRITICAL:** Changes to `backup_time` or `backup_enabled` **REQUIRE APP RESTART** to take effect
  - Run: `docker compose restart` after changing these settings
  - The scheduler only reads these settings on startup
- `internet_backup_url` is read on each backup (no restart needed)

### Backup Log Table

Schema:
```sql
CREATE TABLE backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type TEXT NOT NULL CHECK(backup_type IN ('local', 'internet')),
    backup_source TEXT NOT NULL DEFAULT 'manual' CHECK(backup_source IN ('manual', 'auto')),
    backup_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
    file_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `backup_type`: 'local' or 'internet' - where the backup is stored
- `backup_source`: 'manual' or 'auto' - how the backup was triggered
- `status`: 'success' or 'failed' - outcome of the backup operation

**Query Examples:**

```sql
-- Recent backups with source information
SELECT backup_type, backup_source, status, datetime(created_at, 'localtime') as created
FROM backup_log
ORDER BY created_at DESC
LIMIT 10;

-- Failed backups
SELECT created_at, backup_type, backup_source, error_message
FROM backup_log
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Backup statistics by type and source
SELECT
    backup_type,
    backup_source,
    status,
    COUNT(*) as count,
    SUM(file_size) as total_bytes
FROM backup_log
GROUP BY backup_type, backup_source, status
ORDER BY backup_source, backup_type;

-- Manual vs automatic backup success rate
SELECT
    backup_source,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*), 2) as success_rate
FROM backup_log
GROUP BY backup_source;
```

## How It Works

### Daily Automated Backup Flow

```
00:00 (midnight)
    ↓
[scheduled_backup() called]
    ↓
[1] Copy database to backend/backups/backup_auto_TIMESTAMP.db
    ↓
[2] Log local backup to backup_log (type='local')
    ↓
[3] Query settings for internet_backup_url
    ↓
[4] If configured and not empty:
    ↓
    [4a] check_internet_connectivity()
        ↓
        Ping 8.8.8.8 with 3s timeout
        ↓
    [4b] If online: rsync_backup_to_remote()
        ↓
        Attempt 1: rsync -azv --timeout=30 file user@host:/path/
        ↓
        If fails: wait 1s, try again
        ↓
        If fails: wait 2s, try again
        ↓
        If fails: wait 4s, try again
        ↓
        Return (success/failure, message)
        ↓
    [4c] Log internet backup to backup_log (type='internet')
    ↓
[Done]
```

### rsync Command Details

```bash
rsync -azv --timeout=30 \
  /app/backend/backups/backup_auto_20251220_000025.db \
  user@backup.example.com:/var/backups/camp-snackbar/
```

**Options:**
- `-a`: Archive mode (preserve permissions, timestamps, etc.)
- `-z`: Compress during transfer (saves bandwidth)
- `-v`: Verbose output
- `--timeout=30`: Network timeout (30 seconds)

**SSH Authentication:**
- Uses keys from `/root/.ssh/` (mounted from host's `~/.ssh/`)
- No password required
- SSH config in `~/.ssh/config` is respected

## Testing

### Test Connectivity

```bash
docker exec camp-snackbar-app ping -c 1 8.8.8.8
```

### Test SSH Connection

```bash
docker exec camp-snackbar-app ssh user@backup-server.com "echo Test"
```

### Test rsync

```bash
docker exec camp-snackbar-app rsync -azv --timeout=30 \
  /app/backend/backups/backup_auto_20251218_000025.db \
  user@backup-server.com:/var/backups/camp-snackbar/
```

### Trigger Manual Backup

```bash
docker exec camp-snackbar-app python3 -c "
import sys
sys.path.insert(0, '/app/backend')
from app import scheduled_backup
scheduled_backup()
"
```

Or from admin interface: "Create Backup" button

### Check Logs

```bash
# Docker logs
docker logs camp-snackbar-app | grep -i backup

# Database logs
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 5"
```

## Deployment

### Rebuild Container

After pulling changes:

```bash
git pull origin main
docker compose down
docker compose up -d --build
```

### First-Time Setup

```bash
# Run setup script
./setup-remote-backup.sh

# Or manually configure
sqlite3 backend/camp_snackbar.db \
  "UPDATE settings SET value='user@host:/path/' WHERE key='internet_backup_url'"

# Restart
docker compose restart
```

## Monitoring

### Check Backup Status

Create a cron job to check for failed backups:

```bash
#!/bin/bash
# check-backups.sh - Run daily at 1 AM

FAILED_COUNT=$(docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT COUNT(*) FROM backup_log WHERE created_at > datetime('now', '-1 day') AND status='failed'")

if [ "$FAILED_COUNT" -gt 0 ]; then
  echo "Warning: $FAILED_COUNT failed backups in last 24 hours"
  # Send email alert, etc.
fi
```

### Backup Size Monitoring

```bash
# Check local backup directory size
du -sh ./backups/

# Check remote backup size
ssh user@backup-server.com "du -sh /var/backups/camp-snackbar/"
```

## Future Enhancements

Possible improvements:

1. **Backup Retention Policy**
   - Auto-delete backups older than 30 days
   - Keep weekly/monthly archives

2. **Multiple Remote Destinations**
   - Support array of remote servers
   - Upload to all configured destinations

3. **Compression Before Upload**
   - gzip backups before rsync
   - Saves bandwidth and storage

4. **Email Notifications**
   - Alert on backup failures
   - Daily summary emails

5. **Web UI for Backup Settings**
   - Configure remote server in admin interface
   - Test connection button
   - View backup history

6. **Backup Encryption**
   - Encrypt backups before upload
   - Store encryption key separately

7. **Cloud Provider Support**
   - S3, Google Cloud Storage, Azure Blob
   - Alternative to rsync

## Code Snippets

### Add Email Alerts (Example)

```python
def send_backup_alert(subject, message):
    """Send email alert about backup status"""
    import smtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = 'noreply@campsnackbar.com'
    msg['To'] = 'admin@campsnackbar.com'
    msg.set_content(message)

    with smtplib.SMTP('localhost') as s:
        s.send_message(msg)

# In scheduled_backup(), after failed backup:
if not success:
    send_backup_alert(
        'Backup Failed',
        f'Remote backup failed: {message}\n\nCheck logs for details.'
    )
```

### Add Backup Retention (Example)

```python
def cleanup_old_backups(days_to_keep=30):
    """Delete backups older than specified days"""
    import glob
    from datetime import datetime, timedelta

    cutoff_date = datetime.now() - timedelta(days=days_to_keep)

    for backup_file in glob.glob(os.path.join(BACKUP_DIR, 'backup_auto_*.db')):
        file_mtime = datetime.fromtimestamp(os.path.getmtime(backup_file))

        if file_mtime < cutoff_date:
            os.remove(backup_file)
            print(f"Deleted old backup: {backup_file}")

# In run_scheduler(), add:
schedule.every().day.at("01:00").do(cleanup_old_backups)
```

## Support

For issues or questions:
- Check logs: `docker logs camp-snackbar-app | grep backup`
- Review database: `SELECT * FROM backup_log WHERE status='failed'`
- Test connectivity: `docker exec camp-snackbar-app ping 8.8.8.8`
- Test SSH: `docker exec camp-snackbar-app ssh user@server "echo test"`
