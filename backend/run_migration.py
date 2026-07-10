#!/usr/bin/env python3
"""Run database migration to add payment_method field"""

import sqlite3
import os
import sys

def run_migration():
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'camp_snackbar.db')

    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        sys.exit(1)

    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if payment_method column already exists
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'payment_method' in columns:
            print("✓ payment_method column already exists")
        else:
            print("Adding payment_method column to transactions table...")
            cursor.execute("""
                ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'account'
                CHECK(payment_method IN ('account', 'cash', 'card'))
            """)
            print("✓ payment_method column added")

        # Check if Cash Sales account exists
        cursor.execute("SELECT id FROM accounts WHERE account_number = 'CASH001'")
        if cursor.fetchone():
            print("✓ Cash Sales account already exists")
        else:
            print("Creating Cash Sales account...")
            cursor.execute("""
                INSERT INTO accounts (account_number, account_name, account_type, notes, active)
                VALUES ('CASH001', 'Cash Sales', 'individual',
                        'Special account for walk-up cash customers. Balance represents total cash collected.', 1)
            """)
            print("✓ Cash Sales account created")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
