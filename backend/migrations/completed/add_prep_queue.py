#!/usr/bin/env python3
"""
Migration script to add prep queue system:
1. Add requires_prep field to products table
2. Create prep_queue table
3. Mark all 'Grill' category items as requires_prep=true
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def migrate():
    print("Starting prep queue migration...")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 1. Add requires_prep column to products table
        print("Adding requires_prep field to products table...")
        cursor.execute("""
            ALTER TABLE products ADD COLUMN requires_prep BOOLEAN DEFAULT 0
        """)
        print("✓ requires_prep field added")

        # 2. Create prep_queue table
        print("Creating prep_queue table...")
        cursor.execute("""
            CREATE TABLE prep_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                transaction_item_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                account_name TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
                ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                completed_by TEXT,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id),
                FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
            )
        """)
        print("✓ prep_queue table created")

        # 3. Create index for faster queries
        cursor.execute("""
            CREATE INDEX idx_prep_queue_status ON prep_queue(status, ordered_at)
        """)
        print("✓ Index created on prep_queue")

        # 4. Find 'Grill' category and mark all its items as requires_prep
        print("Marking 'Grill' category items as requires_prep...")
        cursor.execute("SELECT id FROM categories WHERE name = 'Grill'")
        grill_category = cursor.fetchone()

        if grill_category:
            grill_id = grill_category['id']
            cursor.execute("""
                UPDATE products
                SET requires_prep = 1
                WHERE category_id = ?
            """, (grill_id,))
            updated_count = cursor.rowcount
            print(f"✓ Marked {updated_count} items in 'Grill' category as requires_prep")
        else:
            print("! 'Grill' category not found, skipping...")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except sqlite3.Error as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
