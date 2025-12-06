#!/usr/bin/env python3
"""
Migration script to add has_been_adjusted column to transactions table
"""
import sqlite3
import os

# Get database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def add_adjusted_column():
    """Add has_been_adjusted column to transactions table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'has_been_adjusted' not in columns:
            print("Adding has_been_adjusted column to transactions table...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN has_been_adjusted INTEGER DEFAULT 0")
            conn.commit()
            print("✓ Column added successfully")
        else:
            print("✓ Column already exists")

    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    add_adjusted_column()
