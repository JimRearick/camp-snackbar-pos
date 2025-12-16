#!/usr/bin/env python3
"""
Clear test transaction data from the database.

This script removes:
- All transactions
- All transaction items
- All prep queue items
- All completed prep queue items

This script preserves:
- Accounts
- Products
- Categories
- Settings
- Admin sessions
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def clear_test_data():
    print("=" * 60)
    print("CLEAR TEST DATA")
    print("=" * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Get counts before deletion
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        transaction_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM transaction_items")
        item_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM prep_queue")
        prep_count = cursor.fetchone()['count']

        print(f"Found:")
        print(f"  - {transaction_count} transactions")
        print(f"  - {item_count} transaction items")
        print(f"  - {prep_count} prep queue items")
        print()

        if transaction_count == 0 and item_count == 0 and prep_count == 0:
            print("✓ No test data to clear!")
            return

        # Confirm deletion
        response = input("Delete all transaction data? (yes/no): ").strip().lower()
        if response != 'yes':
            print("Cancelled.")
            return

        print()
        print("Deleting data...")

        # Delete in correct order (respect foreign keys)
        cursor.execute("DELETE FROM prep_queue")
        print(f"✓ Deleted {cursor.rowcount} prep queue items")

        cursor.execute("DELETE FROM transaction_items")
        print(f"✓ Deleted {cursor.rowcount} transaction items")

        cursor.execute("DELETE FROM transactions")
        print(f"✓ Deleted {cursor.rowcount} transactions")

        # Reset has_been_adjusted flags (no longer needed since all transactions are gone)
        # But if you want to keep this for safety:
        cursor.execute("UPDATE accounts SET notes = NULL WHERE notes LIKE '%adjustment%'")

        conn.commit()
        print()
        print("✅ All test data cleared successfully!")
        print()
        print("Preserved:")
        cursor.execute("SELECT COUNT(*) as count FROM accounts")
        print(f"  - {cursor.fetchone()['count']} accounts")

        cursor.execute("SELECT COUNT(*) as count FROM products")
        print(f"  - {cursor.fetchone()['count']} products")

        cursor.execute("SELECT COUNT(*) as count FROM categories")
        print(f"  - {cursor.fetchone()['count']} categories")

    except sqlite3.Error as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    clear_test_data()
