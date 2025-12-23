# Backup Source Differentiation Update

## Summary

Enhanced the backup logging system to differentiate between **manual** and **automatic** backups in the database.

## Changes Made

### 1. Database Schema Update

Added `backup_source` column to the `backup_log` table:

```sql
backup_source TEXT NOT NULL DEFAULT 'manual' CHECK(backup_source IN ('manual', 'auto'))
```

**Values:**
- `'manual'` - Backups triggered by admin via the "Create Backup" button
- `'auto'` - Backups triggered automatically by the scheduler (midnight)

### 2. Migration Script

Created [backend/migrations/add_backup_source.py](backend/migrations/add_backup_source.py) to:
- Add the `backup_source` column to existing databases
- Automatically update existing records based on filename patterns:
  - Files matching `backup_auto_*` → `source = 'auto'`
  - All other files → `source = 'manual'`
- Create database backup before migration

**Run migration:**
```bash
cd backend
python3 migrations/add_backup_source.py
```

### 3. Application Code Updates

Updated all backup logging in [backend/app.py](backend/app.py):

**Manual Backup Function** (`create_backup()` at line 1638):
- Local backups: Log with `backup_source='manual'`
- Internet backups: Log with `backup_source='manual'`

**Automatic Backup Function** (`scheduled_backup()` at line 1879):
- Local backups: Log with `backup_source='auto'`
- Internet backups: Log with `backup_source='auto'`
- Error cases: Log with `backup_source='auto'`

**Backup List API** (`list_backups()` at line 1704):
- Now includes `backup_source` in the JSON response
- Backward compatible (defaults to 'manual' if column missing)

### 4. Documentation Updates

Updated [BACKUP_IMPLEMENTATION.md](BACKUP_IMPLEMENTATION.md):
- Updated schema documentation
- Added field descriptions
- Added new query examples for filtering by source
- Added success rate analysis queries

## Usage Examples

### Query Recent Backups by Source

```sql
-- Show all automatic backups
SELECT backup_type, status, datetime(created_at, 'localtime') as created
FROM backup_log
WHERE backup_source = 'auto'
ORDER BY created_at DESC
LIMIT 10;

-- Show all manual backups
SELECT backup_type, status, datetime(created_at, 'localtime') as created
FROM backup_log
WHERE backup_source = 'manual'
ORDER BY created_at DESC
LIMIT 10;
```

### Backup Statistics

```sql
-- Count by source
SELECT backup_source, COUNT(*) as total
FROM backup_log
GROUP BY backup_source;

-- Success rates by source
SELECT
    backup_source,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*), 2) as success_rate
FROM backup_log
GROUP BY backup_source;

-- Detailed breakdown
SELECT
    backup_source,
    backup_type,
    status,
    COUNT(*) as count
FROM backup_log
GROUP BY backup_source, backup_type, status
ORDER BY backup_source, backup_type, status;
```

### API Response

The `/api/backup/list` endpoint now returns:

```json
{
  "backups": [
    {
      "id": 24,
      "backup_type": "local",
      "backup_source": "auto",
      "backup_path": "backups/backup_auto_20251218_000025.db",
      "status": "success",
      "file_size": 262144,
      "created_at": "2025-12-18 00:00:25"
    },
    {
      "id": 23,
      "backup_type": "local",
      "backup_source": "manual",
      "backup_path": "backups/backup_20251217_143022.db",
      "status": "success",
      "file_size": 262144,
      "created_at": "2025-12-17 14:30:22"
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

## Backward Compatibility

- Existing databases will work without migration (defaults to 'manual')
- Migration script is idempotent (safe to run multiple times)
- API gracefully handles missing column (defaults to 'manual')

## Files Changed

1. [backend/schema.sql](backend/schema.sql) - Updated table definition
2. [backend/app.py](backend/app.py) - Updated all backup logging calls
3. [backend/migrations/add_backup_source.py](backend/migrations/add_backup_source.py) - New migration script
4. [BACKUP_IMPLEMENTATION.md](BACKUP_IMPLEMENTATION.md) - Updated documentation

## Testing

Migration was successfully tested on the development database:
- ✅ Column added successfully
- ✅ 24 existing automatic backup records updated
- ✅ Schema verification passed
- ✅ Query examples tested and working

## Next Steps

When deploying to production:

1. **Backup the database first** (migration does this automatically, but good practice)
2. Run the migration script:
   ```bash
   cd backend
   python3 migrations/add_backup_source.py
   ```
3. Verify with:
   ```bash
   sqlite3 camp_snackbar.db "SELECT backup_source, COUNT(*) FROM backup_log GROUP BY backup_source;"
   ```
4. Restart the application to use updated code

## Benefits

- **Better Monitoring**: Easily track success/failure rates for automatic vs manual backups
- **Troubleshooting**: Quickly identify if automatic backups are working
- **Reporting**: Generate statistics on backup patterns
- **Audit Trail**: Clear record of when admins manually triggered backups vs scheduled runs
