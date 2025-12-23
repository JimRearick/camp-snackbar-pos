# Backup Time Configuration Fix

## Issue

The `backup_time` setting in the database was **not being used**. Backups were hardcoded to run at midnight (00:00) regardless of the setting in the UI.

## Solution

Updated the scheduler to read `backup_time` and `backup_enabled` settings from the database on startup.

## Changes Made

### 1. Backend - Scheduler ([backend/app.py](backend/app.py#L1957-L1982))

**Before:**
```python
def run_scheduler():
    """Run scheduled tasks"""
    schedule.every().day.at("00:00").do(scheduled_backup)

    while True:
        schedule.run_pending()
        time.sleep(60)
```

**After:**
```python
def run_scheduler():
    """Run scheduled tasks with configurable backup time"""
    # Get backup settings from database
    conn = get_db()
    cursor = conn.execute("""
        SELECT key, value FROM settings
        WHERE key IN ('backup_enabled', 'backup_time')
    """)
    settings = {row['key']: row['value'] for row in cursor.fetchall()}
    conn.close()

    # Check if backups are enabled
    backup_enabled = settings.get('backup_enabled', 'true').lower() == 'true'
    backup_time = settings.get('backup_time', '00:00')

    if backup_enabled:
        # Schedule daily backup at configured time
        schedule.every().day.at(backup_time).do(scheduled_backup)
        print(f"✓ Automatic backups enabled: Daily at {backup_time} (local time)")
    else:
        print("ℹ Automatic backups disabled")

    # Run scheduler loop
    while True:
        schedule.run_pending()
        time.sleep(60)
```

### 2. UI - Clarified Timezone ([static/advadmin.html](static/advadmin.html#L88-L90))

**Before:**
```html
<label for="backupTime">Backup Time</label>
<input type="time" id="backupTime" class="form-input" value="00:00">
<small style="color: #666;">Daily backup time (24-hour format)</small>
```

**After:**
```html
<label for="backupTime">Backup Time (Local)</label>
<input type="time" id="backupTime" class="form-input" value="00:00">
<small style="color: #666;">Daily backup time in server's local timezone (24-hour format). <strong>Requires app restart to take effect.</strong></small>
```

### 3. Documentation - Updated ([BACKUP_IMPLEMENTATION.md](BACKUP_IMPLEMENTATION.md#L114-L148))

Added comprehensive documentation about all three backup settings:
- `backup_enabled` - Enable/disable automatic backups
- `backup_time` - Time of day to run backups (LOCAL timezone)
- `internet_backup_url` - Remote backup destination

## Behavior

### Timezone

**Backup time uses the server's LOCAL timezone, NOT UTC.**

The Python `schedule` library uses the system's local time. When you configure:
- `backup_time = '00:00'` → Midnight in server's local timezone
- `backup_time = '14:30'` → 2:30 PM in server's local timezone

### Settings Loading

- Settings are read **once on app startup**
- Changes to `backup_enabled` or `backup_time` **require app restart**
- Changes to `internet_backup_url` take effect immediately (read on each backup)

### Enable/Disable Backups

You can now disable automatic backups entirely:

```sql
-- Disable automatic backups
UPDATE settings SET value = 'false' WHERE key = 'backup_enabled';
```

When disabled, the app will print:
```
ℹ Automatic backups disabled
```

When enabled with custom time:
```
✓ Automatic backups enabled: Daily at 02:30 (local time)
```

## Configuration Examples

### Via Database

```sql
-- Set backups to run at 2:30 AM (local time)
UPDATE settings SET value = '02:30' WHERE key = 'backup_time';

-- Enable automatic backups
UPDATE settings SET value = 'true' WHERE key = 'backup_enabled';

-- Then restart the app
docker compose restart
```

### Via Admin UI

1. Navigate to **Settings → Backups** tab
2. Check/uncheck "Enable scheduled backups"
3. Set time using the time picker (24-hour format)
4. Click **Save Settings**
5. **Restart the application** for changes to take effect

## Verification

After restarting the app, check the Docker logs:

```bash
docker logs camp-snackbar-app | grep -i backup
```

You should see:
```
✓ Automatic backups enabled: Daily at 02:30 (local time)
```

Or if disabled:
```
ℹ Automatic backups disabled
```

## Important Notes

1. **Restart Required**: Changes to backup time or enable/disable require app restart
2. **Local Timezone**: Time is in server's local timezone, NOT UTC
3. **24-Hour Format**: Use "HH:MM" format (e.g., "00:00", "14:30", "23:59")
4. **Valid Format**: Invalid time formats will cause scheduler errors
5. **Remote Backup Setting**: `internet_backup_url` does NOT require restart

## Time Format Validation

The time must be in valid 24-hour format:

**Valid:**
- `00:00` (midnight)
- `02:30` (2:30 AM)
- `14:00` (2:00 PM)
- `23:59` (11:59 PM)

**Invalid:**
- `24:00` (hour must be 0-23)
- `2:30` (must be zero-padded)
- `14:00:00` (no seconds)
- `2:30 PM` (not 12-hour format)

## Default Values

If settings are missing from the database:
- `backup_enabled`: Defaults to `'true'`
- `backup_time`: Defaults to `'00:00'` (midnight)

## Files Modified

1. [backend/app.py](backend/app.py#L1957-L1982) - Updated `run_scheduler()` function
2. [static/advadmin.html](static/advadmin.html#L88-L90) - Updated UI label and help text
3. [BACKUP_IMPLEMENTATION.md](BACKUP_IMPLEMENTATION.md#L114-L148) - Updated documentation

## Testing

To test the new functionality:

1. **Set custom backup time:**
   ```sql
   UPDATE settings SET value = '14:30' WHERE key = 'backup_time';
   ```

2. **Restart app:**
   ```bash
   docker compose restart
   ```

3. **Check logs:**
   ```bash
   docker logs camp-snackbar-app | grep backup
   ```

4. **Verify output:**
   ```
   ✓ Automatic backups enabled: Daily at 14:30 (local time)
   ```

5. **Wait for scheduled time** and check backup log:
   ```sql
   SELECT * FROM backup_log
   WHERE backup_source = 'auto'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

## Backward Compatibility

- ✅ Existing databases work without changes
- ✅ Default values match previous hardcoded behavior (midnight backups)
- ✅ No database migration required
- ✅ Settings already exist in schema from initial setup

## Future Enhancements

Potential improvements:

1. **Dynamic Schedule Updates**: Allow changing time without restart
2. **Multiple Backup Times**: Support multiple daily backups
3. **Weekly/Monthly Schedules**: More flexible scheduling options
4. **UI Validation**: Validate time format in frontend before saving
5. **Timezone Display**: Show server's current timezone in UI
6. **Next Backup Time**: Display when next backup will run
