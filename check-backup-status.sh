#!/bin/bash
# Backup Status Diagnostic Script
# Run this to diagnose backup scheduling issues

echo "=========================================="
echo "Camp Snackbar - Backup Diagnostic"
echo "=========================================="
echo ""

echo "1. SERVER TIME"
echo "----------------------------------------"
docker exec camp-snackbar-app date
echo ""

echo "2. BACKUP SETTINGS (from database)"
echo "----------------------------------------"
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT key, value FROM settings WHERE key LIKE 'backup%' ORDER BY key"
echo ""

echo "3. STARTUP MESSAGE (from logs)"
echo "----------------------------------------"
docker logs camp-snackbar-app 2>&1 | grep -i "automatic backup" | tail -5
echo ""

echo "4. SCHEDULER STATUS (from logs)"
echo "----------------------------------------"
docker logs camp-snackbar-app 2>&1 | grep -i "scheduler\|schedule" | tail -5
echo ""

echo "5. RECENT AUTO BACKUPS (last 5)"
echo "----------------------------------------"
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT backup_source, backup_type, status, datetime(created_at, 'localtime') as created
   FROM backup_log
   WHERE backup_source = 'auto'
   ORDER BY created_at DESC
   LIMIT 5" 2>/dev/null || echo "No auto backups found or database error"
echo ""

echo "6. ALL RECENT BACKUPS (last 5)"
echo "----------------------------------------"
docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT backup_source, backup_type, status, datetime(created_at, 'localtime') as created
   FROM backup_log
   ORDER BY created_at DESC
   LIMIT 5" 2>/dev/null || echo "No backups found or database error"
echo ""

echo "7. ERRORS IN LOGS (last 10)"
echo "----------------------------------------"
docker logs camp-snackbar-app 2>&1 | grep -i "error\|exception\|traceback" | tail -10 || echo "No errors found"
echo ""

echo "=========================================="
echo "DIAGNOSIS"
echo "=========================================="

# Check if backups are enabled
ENABLED=$(docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT value FROM settings WHERE key = 'backup_enabled'" 2>/dev/null)

BACKUP_TIME=$(docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT value FROM settings WHERE key = 'backup_time'" 2>/dev/null)

if [ "$ENABLED" = "false" ]; then
    echo "❌ PROBLEM: Backups are DISABLED"
    echo "   Solution: Enable backups in Settings → Backups tab"
    echo "   Or run: docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \"UPDATE settings SET value = 'true' WHERE key = 'backup_enabled'\""
elif [ "$ENABLED" = "true" ]; then
    echo "✓ Backups are enabled"
    echo "✓ Scheduled time: $BACKUP_TIME (server local time)"

    # Check if time is valid
    if [[ ! "$BACKUP_TIME" =~ ^[0-2][0-9]:[0-5][0-9]$ ]]; then
        echo "⚠ WARNING: Backup time format looks invalid: '$BACKUP_TIME'"
        echo "   Should be HH:MM format (e.g., 14:30)"
    fi

    # Check server time
    CURRENT_TIME=$(docker exec camp-snackbar-app date +"%H:%M")
    echo "  Current server time: $CURRENT_TIME"

    # Check if we've passed today's backup time
    if [[ "$CURRENT_TIME" > "$BACKUP_TIME" ]]; then
        echo "  ℹ Note: Today's backup time ($BACKUP_TIME) has already passed"
        echo "     Next backup will run tomorrow at $BACKUP_TIME"
    else
        MINUTES_UNTIL=$(($(date -d "$BACKUP_TIME" +%s) - $(date -d "$CURRENT_TIME" +%s)))
        MINUTES_UNTIL=$((MINUTES_UNTIL / 60))
        echo "  ℹ Next backup in approximately $MINUTES_UNTIL minutes"
    fi
else
    echo "⚠ WARNING: backup_enabled setting not found in database"
    echo "   This may indicate a database issue"
fi

echo ""
echo "=========================================="
echo "RECOMMENDATIONS"
echo "=========================================="

# Check for startup message
if docker logs camp-snackbar-app 2>&1 | grep -q "Automatic backups enabled"; then
    echo "✓ Scheduler started successfully"
elif docker logs camp-snackbar-app 2>&1 | grep -q "Automatic backups disabled"; then
    echo "ℹ Scheduler says backups are disabled"
else
    echo "⚠ No scheduler startup message found"
    echo "  The scheduler may not be starting properly"
    echo "  Check for errors in the logs above"
fi

# Check for recent auto backups
AUTO_COUNT=$(docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \
  "SELECT COUNT(*) FROM backup_log WHERE backup_source = 'auto'" 2>/dev/null)

if [ "$AUTO_COUNT" = "0" ]; then
    echo ""
    echo "ℹ No automatic backups found in history"
    echo "  This is normal if:"
    echo "  - You just enabled backups"
    echo "  - The scheduled time hasn't occurred yet"
    echo "  - This is a fresh installation"
else
    echo ""
    echo "✓ Found $AUTO_COUNT automatic backup(s) in history"
fi

echo ""
echo "=========================================="
echo "QUICK TESTS"
echo "=========================================="
echo ""
echo "To test backup manually right now:"
echo "  docker exec camp-snackbar-app python3 -c \"import sys; sys.path.insert(0, '/app/backend'); from app import scheduled_backup; scheduled_backup()\""
echo ""
echo "To set backup for 2 minutes from now (for testing):"
echo "  FUTURE=\$(date -d '+2 minutes' +'%H:%M')"
echo "  docker exec camp-snackbar-app sqlite3 /app/data/camp_snackbar.db \"UPDATE settings SET value = '\$FUTURE' WHERE key = 'backup_time'\""
echo "  docker compose restart"
echo "  # Then watch: docker logs -f camp-snackbar-app"
echo ""
echo "To view full logs:"
echo "  docker logs camp-snackbar-app | less"
echo ""
