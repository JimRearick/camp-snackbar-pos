# Remote Backup - Quick Start Guide

## TL;DR - Fast Setup (5 minutes)

If you have a remote server with SSH access, run this one command:

```bash
./setup-remote-backup.sh
```

It will:
1. Generate SSH keys (if needed)
2. Copy keys to your remote server
3. Test the connection
4. Update the database configuration
5. Test a backup upload

That's it! Backups will now automatically upload to your remote server every night at midnight.

---

## Manual Setup (if you prefer)

### 1. Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "camp-snackbar-backup"
```

Press Enter for all prompts (no passphrase).

### 2. Copy Key to Remote Server

```bash
ssh-copy-id user@your-backup-server.com
```

### 3. Test Connection

```bash
ssh user@your-backup-server.com "echo Success"
```

Should print "Success" without asking for a password.

### 4. Configure Remote Path

```bash
sqlite3 backend/camp_snackbar.db "UPDATE settings SET value='user@your-server.com:/path/to/backups/' WHERE key='internet_backup_url'"
```

**Important:** The path must end with `/`

### 5. Rebuild Docker Container

```bash
docker compose down
docker compose up -d --build
```

This installs rsync and mounts your SSH keys into the container.

### 6. Test Backup

From the admin interface, click "Create Backup" or run:

```bash
docker exec camp-snackbar-app python3 -c "from app import scheduled_backup; scheduled_backup()"
```

---

## Configuration Examples

### Local Network Backup

```bash
# Backup to NAS or home server
backupuser@192.168.1.100:/volume1/backups/camp-snackbar/
```

### Cloud VPS Backup

```bash
# Backup to DigitalOcean, Linode, etc.
root@backup.mycamp.org:/var/backups/snackbar/
```

### SSH on Custom Port

If your remote server uses a non-standard SSH port, create `~/.ssh/config`:

```
Host backup-server
    HostName backup.example.com
    Port 2222
    User backupuser
```

Then use: `backup-server:/path/to/backups/`

---

## How to Verify It's Working

### Check Local Backups

```bash
ls -lh backend/backups/
```

You should see files like `backup_auto_20251220_000025.db`

### Check Remote Backups

```bash
ssh user@your-server.com "ls -lh /path/to/backups/"
```

Should show the same files.

### Check Backup Logs

```bash
sqlite3 backend/camp_snackbar.db "SELECT backup_type, status, created_at FROM backup_log ORDER BY created_at DESC LIMIT 10"
```

Look for:
- `local | success` - Local backup worked
- `internet | success` - Remote backup worked

If you see `internet | failed`, check the `error_message` column:

```bash
sqlite3 backend/camp_snackbar.db "SELECT created_at, error_message FROM backup_log WHERE status='failed' ORDER BY created_at DESC LIMIT 5"
```

---

## Troubleshooting

### "rsync command not found"

Rebuild the Docker container:
```bash
docker compose down
docker compose up -d --build
```

### "Permission denied (publickey)"

Your SSH keys aren't set up. Run:
```bash
ssh-copy-id user@your-server.com
```

### "No internet connection"

The system checks connectivity by pinging `8.8.8.8`. Verify:
```bash
docker exec camp-snackbar-app ping -c 1 8.8.8.8
```

### Backups Work But Remote Upload Fails

Test rsync manually:
```bash
docker exec camp-snackbar-app rsync -azv /app/backend/backups/latest.db user@server.com:/path/
```

---

## What Happens Automatically

- **Every night at midnight (00:00)**:
  1. System creates local backup: `backup_auto_TIMESTAMP.db`
  2. Checks for internet connection
  3. If online and configured, uploads to remote server via rsync
  4. Retries up to 3 times if upload fails
  5. Logs everything to database

- **If internet is down**: Local backup succeeds, remote upload is skipped (no errors)
- **If remote server is down**: Retries 3 times, then gives up (local backup still exists)

---

## Security Notes

The Docker container has **read-only** access to your SSH keys, meaning it can connect to your backup server but cannot modify the keys themselves.

**Best practice:** Create a dedicated user on your backup server just for receiving backups, not your admin account.

---

## Need Help?

- **Full documentation**: See [BACKUP_SETUP.md](BACKUP_SETUP.md)
- **Check Docker logs**: `docker logs camp-snackbar-app | grep -i backup`
- **Test manually**: `docker exec camp-snackbar-app python3 -c "from app import scheduled_backup; scheduled_backup()"`
