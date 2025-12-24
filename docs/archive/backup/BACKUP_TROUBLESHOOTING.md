# Backup Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Scheduler Startup Message

When the app starts, it should print a message about the backup schedule:

```bash
docker logs camp-snackbar-app | grep -i "automatic backup"
```

**Expected Output:**
```
✓ Automatic backups enabled: Daily at 14:30 (local time)
```

**If you see:**
- `ℹ Automatic backups disabled` - Backups are turned off in settings
- No message at all - Scheduler may not be starting properly

### 2. Check Database Settings

Verify the settings are actually saved:

```bash
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT key, value FROM settings WHERE key IN ('backup_enabled', 'backup_time')"
```

**Expected Output:**
```
backup_enabled|true
backup_time|14:30
```

**Issues:**
- If `backup_enabled` is `false` - Enable it in the UI
- If `backup_time` is wrong - Update it in the UI and restart
- If settings are missing - They may not exist in your database

### 3. Check Server Time

The backup runs in the server's LOCAL timezone:

```bash
# Check current server time
docker exec camp-snackbar-app date

# Check timezone
docker exec camp-snackbar-app date +"%Z %z"
```

**Important:** The backup time must match the server's timezone!

**Example Problem:**
- You set backup time: `14:30`
- Server time is: `14:25 UTC`
- Your local time is: `09:25 EST` (UTC-5)
- Backup won't run until server reaches `14:30 UTC`

### 4. Check if Scheduler Thread is Running

```bash
# Check app logs for any scheduler errors
docker logs camp-snackbar-app 2>&1 | grep -i "scheduler\|schedule\|error"
```

Look for errors like:
- `ValueError: Invalid time format`
- `schedule` module import errors
- Thread crashes

### 5. Manually Trigger Backup

Test if the backup function works at all:

```bash
docker exec camp-snackbar-app python3 -c "
import sys
sys.path.insert(0, '/app/backend')
from app import scheduled_backup
scheduled_backup()
"
```

**If this fails:** The backup function itself has an issue
**If this works:** The scheduler timing/settings are the problem

### 6. Check Recent Backup Log

```bash
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT backup_source, status, datetime(created_at, 'localtime') as created
   FROM backup_log
   WHERE backup_source = 'auto'
   ORDER BY created_at DESC
   LIMIT 5"
```

**If you see recent auto backups:** It IS working!
**If no auto backups:** Scheduler isn't running them

## Common Issues & Solutions

### Issue 1: Settings Not Being Read

**Symptom:** App shows default time even after changing settings

**Solution:**
```bash
# 1. Verify settings in database
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT * FROM settings WHERE key IN ('backup_enabled', 'backup_time')"

# 2. Restart container
docker compose restart

# 3. Check startup logs
docker logs camp-snackbar-app | tail -20
```

### Issue 2: Invalid Time Format

**Symptom:** Scheduler crashes or errors in logs

**Check:**
```bash
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT value FROM settings WHERE key = 'backup_time'"
```

**Valid formats:**
- `00:00` ✅
- `14:30` ✅
- `09:15` ✅

**Invalid formats:**
- `2:30` ❌ (not zero-padded)
- `14:30:00` ❌ (has seconds)
- `24:00` ❌ (hour must be 0-23)
- `2:30 PM` ❌ (not 24-hour format)

**Fix:**
```bash
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "UPDATE settings SET value = '14:30' WHERE key = 'backup_time'"
docker compose restart
```

### Issue 3: Timezone Confusion

**Symptom:** Backup runs at wrong time

**Diagnose:**
```bash
# Check what timezone server thinks it is
docker exec camp-snackbar-app date

# Check if it matches your expected timezone
# If server shows UTC but you want EST, backups will be 5 hours off!
```

**Solution:** Either:
1. Convert your desired time to server's timezone
2. Or change server timezone (requires container rebuild)

### Issue 4: Backups Disabled

**Symptom:** Logs show "Automatic backups disabled"

**Fix:**
```bash
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "UPDATE settings SET value = 'true' WHERE key = 'backup_enabled'"
docker compose restart
```

### Issue 5: Scheduler Not Starting

**Symptom:** No scheduler message in logs at all

**Check:**
```bash
# Look for Python errors
docker logs camp-snackbar-app 2>&1 | grep -i "error\|traceback\|exception"

# Check if app is even running
docker ps | grep camp-snackbar-app
```

**Solution:** Check app.py for errors, especially around line 1957

### Issue 6: Time Already Passed Today

**Symptom:** Set backup for 14:30, current time is 15:00, no backup ran

**Explanation:** The scheduler schedules for NEXT occurrence of that time

**Solution:**
- Wait until tomorrow at 14:30
- Or manually trigger a backup to test
- Or temporarily set time to 5 minutes from now to test

## Step-by-Step Debug Session

Run these commands in order and share the output:

```bash
# 1. Check current server time
echo "=== Server Time ==="
docker exec camp-snackbar-app date

# 2. Check backup settings
echo "=== Backup Settings ==="
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT key, value FROM settings WHERE key LIKE 'backup%'"

# 3. Check startup logs
echo "=== Startup Logs ==="
docker logs camp-snackbar-app 2>&1 | grep -i "backup\|scheduler" | tail -10

# 4. Check recent auto backups
echo "=== Recent Auto Backups ==="
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT backup_source, status, datetime(created_at, 'localtime')
   FROM backup_log
   WHERE backup_source = 'auto'
   ORDER BY created_at DESC
   LIMIT 3"

# 5. Test manual backup
echo "=== Testing Manual Backup ==="
docker exec camp-snackbar-app python3 -c "
import sys
sys.path.insert(0, '/app/backend')
from app import scheduled_backup
print('Running backup...')
scheduled_backup()
print('Done!')
"
```

## Advanced Debugging

### Check Python Schedule Module

```bash
# Verify schedule module is installed
docker exec camp-snackbar-app python3 -c "import schedule; print(schedule.__version__)"

# Test schedule parsing
docker exec camp-snackbar-app python3 -c "
import schedule
schedule.every().day.at('14:30').do(lambda: print('test'))
print('Scheduled jobs:', schedule.jobs)
"
```

### Watch Scheduler in Real-Time

```bash
# Follow logs in real-time
docker logs -f camp-snackbar-app
```

Then wait and watch for scheduler activity.

### Check Scheduler Loop

Add temporary debug logging:

```python
# In app.py run_scheduler() function, add:
while True:
    print(f"Checking schedule at {datetime.now().strftime('%H:%M:%S')}")
    schedule.run_pending()
    time.sleep(60)
```

## Expected Behavior Timeline

If you set backup time to `14:30` and restart at `14:25`:

1. **14:25** - App starts
   - Logs: `✓ Automatic backups enabled: Daily at 14:30 (local time)`
   - Scheduler registers job for 14:30

2. **14:26-14:29** - Waiting
   - Scheduler checks every 60 seconds
   - No backup triggered yet

3. **14:30** - Backup Time!
   - Scheduler detects it's time
   - Runs `scheduled_backup()`
   - Creates `backup_auto_YYYYMMDD_HHMMSS.db`
   - Logs success to database

4. **14:31+** - Done
   - Backup complete
   - Waits for next day at 14:30

## Quick Test

Want to test RIGHT NOW without waiting?

```bash
# 1. Set backup time to 2 minutes from now
FUTURE_TIME=$(date -d "+2 minutes" +"%H:%M")
echo "Setting backup time to: $FUTURE_TIME"

docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "UPDATE settings SET value = '$FUTURE_TIME' WHERE key = 'backup_time'"

# 2. Restart container
docker compose restart

# 3. Watch logs
docker logs -f camp-snackbar-app
```

Wait 2-3 minutes and watch for the backup to run!

## Getting Help

If you're still stuck, provide this information:

1. **Output of diagnostic commands** (from Step-by-Step Debug Session above)
2. **Server timezone and current time**
3. **Desired backup time**
4. **When you restarted the container**
5. **Any error messages in logs**

This will help identify the exact issue!
