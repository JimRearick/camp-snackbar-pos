#!/bin/bash
set -e

# Initialize database if it doesn't exist or is invalid
DB_VALID=false
if [ -f /app/data/camp_snackbar.db ]; then
    # Check if database has the required tables
    if python3 -c "import sqlite3; conn = sqlite3.connect('/app/data/camp_snackbar.db'); cursor = conn.cursor(); cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='users'\"); result = cursor.fetchone(); conn.close(); exit(0 if result else 1)" 2>/dev/null; then
        DB_VALID=true
        echo "Valid database found at /app/data/camp_snackbar.db"
    else
        echo "Database exists but is invalid or missing tables, reinitializing..."
        rm -f /app/data/camp_snackbar.db
    fi
fi

if [ "$DB_VALID" = false ]; then
    echo "Initializing new database..."
    cd /app/backend
    python init_db.py
    # Move database to persistent data directory
    mv /app/backend/camp_snackbar.db /app/data/camp_snackbar.db
    echo "Database initialized and moved to /app/data/"
fi

# Ensure app.py can find the database at /app/backend/camp_snackbar.db
# Create symlink if it doesn't exist
if [ ! -L /app/backend/camp_snackbar.db ] && [ ! -f /app/backend/camp_snackbar.db ]; then
    ln -s /app/data/camp_snackbar.db /app/backend/camp_snackbar.db
fi

# Execute the main command
exec "$@"
