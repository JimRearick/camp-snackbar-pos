#!/bin/bash
set -e

# Initialize database if it doesn't exist
if [ ! -f /app/data/camp_snackbar.db ]; then
    echo "Database not found, initializing..."
    cd /app/backend
    python init_db.py
    echo "Database initialized successfully"
fi

# Execute the main command
exec "$@"
