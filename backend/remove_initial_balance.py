#!/usr/bin/env python3
"""
Migration script to remove initial_balance column from accounts table.
This script will:
1. Create a backup of the database
2. Remove the initial_balance column
3. Update the schema
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
    backup_path = os.path.join(BACKUP_DIR, f'backup_before_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
    shutil.copy2(DB_PATH, backup_path)
    print(f"✓ Created backup: {backup_path}")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if initial_balance column exists
        cursor.execute("PRAGMA table_info(accounts)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'initial_balance' not in columns:
            print("✓ initial_balance column already removed")
            conn.close()
            return

        print("Removing initial_balance column...")

        # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        # 1. Create new table without initial_balance
        cursor.execute("""
            CREATE TABLE accounts_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number TEXT UNIQUE NOT NULL,
                account_name TEXT NOT NULL,
                account_type TEXT NOT NULL CHECK(account_type IN ('family', 'individual')),
                family_members TEXT,
                current_balance REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        """)

        # 2. Copy data from old table to new table
        cursor.execute("""
            INSERT INTO accounts_new (id, account_number, account_name, account_type, family_members,
                                      current_balance, created_at, updated_at, notes)
            SELECT id, account_number, account_name, account_type, family_members,
                   current_balance, created_at, updated_at, notes
            FROM accounts
        """)

        # 3. Drop old table
        cursor.execute("DROP TABLE accounts")

        # 4. Rename new table
        cursor.execute("ALTER TABLE accounts_new RENAME TO accounts")

        # Commit changes
        conn.commit()
        print("✓ Successfully removed initial_balance column")

    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
