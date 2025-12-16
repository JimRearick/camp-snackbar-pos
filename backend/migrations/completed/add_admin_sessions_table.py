#!/usr/bin/env python3
"""
Migration script to add admin_sessions table
"""
import sqlite3
import os

# Get database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def add_admin_sessions_table():
    """Add admin_sessions table to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_sessions'")
        if cursor.fetchone():
            print("✓ admin_sessions table already exists")
            return

        print("Adding admin_sessions table...")
        cursor.execute("""
            CREATE TABLE admin_sessions (
                token TEXT PRIMARY KEY,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✓ Table created successfully")

    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    add_admin_sessions_table()
