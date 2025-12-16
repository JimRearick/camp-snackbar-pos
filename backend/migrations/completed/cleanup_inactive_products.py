#!/usr/bin/env python3
"""
Cleanup script to delete inactive products and their transaction history
"""
import sqlite3
import sys

DB_PATH = 'backend/camp_snackbar.db'

def cleanup_inactive_products():
    """Delete all inactive products and their associated transaction items"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Start transaction
        conn.execute("BEGIN")

        # Find all inactive products
        cursor.execute("SELECT id, name FROM products WHERE active = 0")
        inactive_products = cursor.fetchall()

        if not inactive_products:
            print("No inactive products found. Nothing to delete.")
            conn.close()
            return

        print(f"Found {len(inactive_products)} inactive product(s):")
        for product in inactive_products:
            print(f"  - ID: {product['id']}, Name: {product['name']}")

        # Count transaction items that will be deleted
        inactive_product_ids = [p['id'] for p in inactive_products]
        placeholders = ','.join(['?' for _ in inactive_product_ids])

        cursor.execute(
            f"SELECT COUNT(*) as count FROM transaction_items WHERE product_id IN ({placeholders})",
            inactive_product_ids
        )
        item_count = cursor.fetchone()['count']
        print(f"\nThis will delete {item_count} transaction item(s) associated with these products.")

        # Confirm deletion
        print("\n" + "="*60)
        response = input("Are you sure you want to delete these products and their transaction history? (yes/no): ").strip().lower()

        if response != 'yes':
            print("Cleanup cancelled.")
            conn.rollback()
            conn.close()
            return

        # Delete transaction items first (foreign key constraint)
        cursor.execute(
            f"DELETE FROM transaction_items WHERE product_id IN ({placeholders})",
            inactive_product_ids
        )
        deleted_items = cursor.rowcount
        print(f"\nDeleted {deleted_items} transaction item(s)")

        # Delete inactive products
        cursor.execute("DELETE FROM products WHERE active = 0")
        deleted_products = cursor.rowcount
        print(f"Deleted {deleted_products} inactive product(s)")

        # Commit transaction
        conn.commit()
        print("\n✓ Cleanup completed successfully!")

    except Exception as e:
        print(f"\n✗ Error during cleanup: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    print("="*60)
    print("INACTIVE PRODUCTS CLEANUP SCRIPT")
    print("="*60)
    print("\nThis script will:")
    print("1. Find all products marked as inactive (active = 0)")
    print("2. Delete all transaction items referencing these products")
    print("3. Delete the inactive products")
    print("\nWARNING: This action cannot be undone!")
    print("="*60)
    print()

    cleanup_inactive_products()
