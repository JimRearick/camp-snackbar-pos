#!/usr/bin/env python3
"""
Migration script to add active column to accounts table.
This script will:
1. Create a backup of the database
2. Add the active column (defaults to 1/true for all existing accounts)
"""

import sqlite3
import shutil
from datetime import datetime
import os

DB_PATH = 'camp_snackbar.db'
BACKUP_DIR = 'backups'

def main():
    # Create backup
    os.makedirs(BACKUP_DIR, exist_ok=True)
    backup_path = os.path.join(BACKUP_DIR, f'backup_add_active_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
    shutil.copy2(DB_PATH, backup_path)
    print(f"✓ Created backup: {backup_path}")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if active column already exists
        cursor.execute("PRAGMA table_info(accounts)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'active' in columns:
            print("✓ active column already exists")
            conn.close()
            return

        print("Adding active column to accounts table...")

        # Add active column (default to 1 for all existing accounts)
        cursor.execute("""
            ALTER TABLE accounts ADD COLUMN active BOOLEAN DEFAULT 1
        """)

        # Commit changes
        conn.commit()
        print("✓ Successfully added active column")

    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
