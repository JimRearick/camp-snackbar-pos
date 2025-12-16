#!/usr/bin/env python3
"""
Delete inactive accounts from the database.

This script removes accounts where active = 0 (inactive).
It will NOT delete accounts that have transaction history.

Usage:
    python3 delete_inactive_accounts.py          # Interactive mode
    python3 delete_inactive_accounts.py --yes    # Auto-confirm deletion
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def delete_inactive_accounts(auto_confirm=False):
    print("=" * 60)
    print("DELETE INACTIVE ACCOUNTS")
    print("=" * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Find inactive accounts
        cursor.execute("""
            SELECT id, account_number, account_name, account_type
            FROM accounts
            WHERE active = 0
        """)

        inactive_accounts = cursor.fetchall()

        if len(inactive_accounts) == 0:
            print("✓ No inactive accounts found!")
            return

        print(f"Found {len(inactive_accounts)} inactive account(s):")
        print()

        # Check which have transactions
        accounts_with_transactions = []
        accounts_without_transactions = []

        for account in inactive_accounts:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM transactions
                WHERE account_id = ?
            """, (account['id'],))

            transaction_count = cursor.fetchone()['count']

            if transaction_count > 0:
                accounts_with_transactions.append((account, transaction_count))
            else:
                accounts_without_transactions.append(account)

        # Display accounts with transactions (will NOT be deleted)
        if accounts_with_transactions:
            print("⚠️  Accounts with transaction history (will NOT be deleted):")
            for account, count in accounts_with_transactions:
                print(f"  - {account['account_number']}: {account['account_name']} ({count} transactions)")
            print()

        # Display accounts without transactions (can be deleted)
        if accounts_without_transactions:
            print("✓ Accounts without transactions (can be deleted):")
            for account in accounts_without_transactions:
                print(f"  - {account['account_number']}: {account['account_name']}")
            print()

            # Confirm deletion
            if not auto_confirm:
                response = input(f"Delete {len(accounts_without_transactions)} inactive account(s)? (yes/no): ").strip().lower()
                if response != 'yes':
                    print("Cancelled.")
                    return
            else:
                print(f"Auto-confirming deletion of {len(accounts_without_transactions)} account(s)...")

            print()
            print("Deleting accounts...")

            # Delete accounts
            deleted_count = 0
            for account in accounts_without_transactions:
                cursor.execute("DELETE FROM accounts WHERE id = ?", (account['id'],))
                deleted_count += 1
                print(f"  ✓ Deleted: {account['account_name']}")

            conn.commit()
            print()
            print(f"✅ Successfully deleted {deleted_count} inactive account(s)!")
        else:
            print("✓ All inactive accounts have transaction history and cannot be deleted.")

        if accounts_with_transactions:
            print()
            print("Note: To delete accounts with transactions, you must first:")
            print("  1. Delete their transactions using clear_test_data.py")
            print("  2. Then run this script again")

    except sqlite3.Error as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    auto_confirm = '--yes' in sys.argv or '-y' in sys.argv
    delete_inactive_accounts(auto_confirm)
