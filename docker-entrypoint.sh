#!/bin/bash
set -e

# Initialize database if it doesn't exist
if [ ! -f /app/data/camp_snackbar.db ]; then
    echo "Database not found, initializing..."
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
