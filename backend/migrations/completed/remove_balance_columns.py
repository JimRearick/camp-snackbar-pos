#!/usr/bin/env python3
"""
Migration script to remove current_balance from accounts and balance_after from transactions.
Balances will now be calculated dynamically from transaction history.

This script will:
1. Create a backup of the database
2. Remove current_balance from accounts table
3. Remove balance_after from transactions table
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
    backup_path = os.path.join(BACKUP_DIR, f'backup_remove_balances_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
    shutil.copy2(DB_PATH, backup_path)
    print(f"✓ Created backup: {backup_path}")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Removing current_balance from accounts and balance_after from transactions...")

        # Recreate accounts table without current_balance
        cursor.execute("""
            CREATE TABLE accounts_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number TEXT UNIQUE NOT NULL,
                account_name TEXT NOT NULL,
                account_type TEXT NOT NULL CHECK(account_type IN ('family', 'individual')),
                family_members TEXT,
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        """)

        # Copy data from old accounts table
        cursor.execute("""
            INSERT INTO accounts_new (id, account_number, account_name, account_type, family_members,
                                      active, created_at, updated_at, notes)
            SELECT id, account_number, account_name, account_type, family_members,
                   active, created_at, updated_at, notes
            FROM accounts
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE accounts")
        cursor.execute("ALTER TABLE accounts_new RENAME TO accounts")

        # Recreate transactions table without balance_after
        cursor.execute("""
            CREATE TABLE transactions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase', 'payment', 'adjustment')),
                total_amount REAL NOT NULL,
                operator_name TEXT,
                notes TEXT,
                has_been_adjusted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id)
            )
        """)

        # Copy data from old transactions table
        cursor.execute("""
            INSERT INTO transactions_new (id, account_id, transaction_type, total_amount,
                                          operator_name, notes, has_been_adjusted, created_at)
            SELECT id, account_id, transaction_type, total_amount,
                   operator_name, notes, has_been_adjusted, created_at
            FROM transactions
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE transactions")
        cursor.execute("ALTER TABLE transactions_new RENAME TO transactions")

        # Recreate indexes
        cursor.execute("CREATE INDEX idx_transactions_account ON transactions(account_id)")
        cursor.execute("CREATE INDEX idx_transactions_date ON transactions(created_at)")

        # Commit changes
        conn.commit()
        print("✓ Successfully removed balance columns")
        print("  - Removed current_balance from accounts")
        print("  - Removed balance_after from transactions")
        print("  - Balances will now be calculated dynamically from transactions")

    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
