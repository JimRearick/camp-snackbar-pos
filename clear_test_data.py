#!/usr/bin/env python3
"""
Clear Test Data Script
Removes all test data from the database while preserving essential system data.

Usage:
    python3 clear_test_data.py [database_path]
    python3 clear_test_data.py --help

Options:
    --transactions-only Clear only transactions and prep queue (keep everything else)
    --keep-accounts     Keep all accounts (only clear transactions)
    --keep-products     Keep all products and categories
    --keep-users        Keep all users except admin
    --dry-run          Show what would be deleted without actually deleting
"""

import sqlite3
import sys
import os
import shutil
from datetime import datetime
import argparse

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;36m'
    NC = '\033[0m'  # No Color

def print_success(msg):
    print(f"{Colors.GREEN}✓{Colors.NC} {msg}")

def print_error(msg):
    print(f"{Colors.RED}✗{Colors.NC} {msg}")

def print_warning(msg):
    print(f"{Colors.YELLOW}!{Colors.NC} {msg}")

def print_info(msg):
    print(f"{Colors.BLUE}→{Colors.NC} {msg}")

def create_backup(db_path):
    """Create a backup of the database before clearing data"""
    backup_dir = "backups" if os.path.exists("backups") else "."
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_before_clear_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_name)

    try:
        shutil.copy2(db_path, backup_path)
        return backup_path
    except Exception as e:
        print_error(f"Failed to create backup: {e}")
        return None

def get_counts(conn):
    """Get current counts of all data"""
    cursor = conn.cursor()
    counts = {}

    tables = [
        ('accounts', 'SELECT COUNT(*) FROM accounts'),
        ('transactions', 'SELECT COUNT(*) FROM transactions'),
        ('prep_queue', 'SELECT COUNT(*) FROM prep_queue'),
        ('products', 'SELECT COUNT(*) FROM products'),
        ('categories', 'SELECT COUNT(*) FROM categories'),
        ('users_non_admin', "SELECT COUNT(*) FROM users WHERE username != 'admin'"),
        ('transaction_items', 'SELECT COUNT(*) FROM transaction_items'),
    ]

    for name, query in tables:
        cursor.execute(query)
        counts[name] = cursor.fetchone()[0]

    return counts

def clear_data(db_path, transactions_only=False, keep_accounts=False, keep_products=False, keep_users=False, dry_run=False):
    """Clear test data from the database"""

    if not os.path.exists(db_path):
        print_error(f"Database not found: {db_path}")
        return False

    print("=" * 70)
    print("Clear Test Data")
    print("=" * 70)
    print()
    print_info(f"Database: {db_path}")
    print()

    # Create backup
    if not dry_run:
        print_info("Creating backup...")
        backup_path = create_backup(db_path)
        if backup_path:
            print_success(f"Backup created: {backup_path}")
        else:
            print_error("Failed to create backup. Aborting.")
            return False
        print()

    # Connect to database
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
    except Exception as e:
        print_error(f"Failed to connect to database: {e}")
        return False

    # Get counts before
    print_info("Current data counts:")
    counts_before = get_counts(conn)
    for name, count in counts_before.items():
        label = name.replace('_', ' ').title()
        print(f"  {label}: {count}")
    print()

    if dry_run:
        print_warning("DRY RUN MODE - No data will be deleted")
        print()

    # What will be cleared
    print_info("Will clear:")
    operations = []

    if transactions_only:
        # Only clear transactions and prep queue, keep everything else
        operations.append(("Prep Queue Items", "DELETE FROM prep_queue"))
        operations.append(("Transaction Items", "DELETE FROM transaction_items"))
        operations.append(("Transactions", "DELETE FROM transactions"))
    else:
        # Full clear or selective clear
        if not keep_accounts:
            operations.append(("Prep Queue Items", "DELETE FROM prep_queue"))
            operations.append(("Transaction Items", "DELETE FROM transaction_items"))
            operations.append(("Transactions", "DELETE FROM transactions"))
            operations.append(("Accounts", "DELETE FROM accounts"))
        else:
            operations.append(("Prep Queue Items", "DELETE FROM prep_queue"))
            operations.append(("Transaction Items", "DELETE FROM transaction_items"))
            operations.append(("Transactions", "DELETE FROM transactions"))

        if not keep_products:
            operations.append(("Products", "DELETE FROM products"))
            operations.append(("Categories", "DELETE FROM categories"))

        if not keep_users:
            operations.append(("User Sessions (non-admin)", "DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE username != 'admin')"))
            operations.append(("Users (non-admin)", "DELETE FROM users WHERE username != 'admin'"))

        operations.append(("Backup Log", "DELETE FROM backup_log"))

    for name, _ in operations:
        print(f"  • {name}")
    print()

    # Confirm
    if not dry_run:
        print_warning("This will permanently delete the data listed above!")
        print_info("Admin user and settings will be preserved.")
        print()
        response = input("Are you sure you want to continue? (yes/no): ")
        if response.lower() != 'yes':
            print_info("Operation cancelled")
            conn.close()
            return False
        print()

    # Execute deletions
    print_info("Clearing data...")
    deleted_counts = {}

    try:
        for name, query in operations:
            if not dry_run:
                cursor.execute(query)
                deleted_counts[name] = cursor.rowcount
            else:
                # For dry run, just show what would be deleted
                deleted_counts[name] = counts_before.get(name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('-', '_'), 0)

        if not dry_run:
            conn.commit()

        print_success("Data cleared successfully!" if not dry_run else "Dry run completed!")
        print()

        print("Deleted:" if not dry_run else "Would delete:")
        for name, count in deleted_counts.items():
            print(f"  {Colors.GREEN}✓{Colors.NC} {name}: {count}")
        print()

        # Verify admin user still exists
        if not dry_run:
            cursor.execute("SELECT id, username, role FROM users WHERE username = 'admin'")
            admin = cursor.fetchone()

            if admin:
                print_success("Admin user preserved:")
                print(f"  ID: {admin['id']}")
                print(f"  Username: {admin['username']}")
                print(f"  Role: {admin['role']}")
            else:
                print_error("WARNING: Admin user not found!")
                conn.close()
                return False

        conn.close()

        if not dry_run:
            print()
            print_info("Next steps:")
            print("  1. Initialize fresh data: cd backend && python3 init_db.py")
            print("  2. Or add data via the admin web interface")
            print()
            print_info(f"Backup available: {backup_path}")
            print(f"  To restore: cp {backup_path} {db_path}")

        return True

    except Exception as e:
        print_error(f"Error clearing data: {e}")
        if not dry_run:
            conn.rollback()
        conn.close()
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Clear test data from Camp Snackbar POS database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 clear_test_data.py                      # Clear all test data
  python3 clear_test_data.py --transactions-only  # Only clear transactions & prep queue
  python3 clear_test_data.py --keep-accounts      # Keep accounts, clear transactions
  python3 clear_test_data.py --dry-run            # Show what would be deleted
  python3 clear_test_data.py backend/test.db      # Use specific database
        """
    )

    parser.add_argument('database', nargs='?', default='backend/camp_snackbar.db',
                        help='Path to database file (default: backend/camp_snackbar.db)')
    parser.add_argument('--transactions-only', action='store_true',
                        help='Clear only transactions and prep queue (keeps accounts, products, users)')
    parser.add_argument('--keep-accounts', action='store_true',
                        help='Keep all accounts (only clear transactions)')
    parser.add_argument('--keep-products', action='store_true',
                        help='Keep all products and categories')
    parser.add_argument('--keep-users', action='store_true',
                        help='Keep all non-admin users')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be deleted without deleting')

    args = parser.parse_args()

    success = clear_data(
        args.database,
        transactions_only=args.transactions_only,
        keep_accounts=args.keep_accounts,
        keep_products=args.keep_products,
        keep_users=args.keep_users,
        dry_run=args.dry_run
    )

    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
