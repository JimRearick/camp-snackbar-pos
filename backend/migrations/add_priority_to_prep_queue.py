#!/usr/bin/env python3
"""
Migration: Add priority column to prep_queue table
Date: 2025-12-22
Description: Adds priority field to prep_queue for rush order functionality
"""

import sqlite3
import sys
import os

def migrate(db_path):
    """Add priority column to prep_queue table"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if priority column already exists
        cursor.execute("PRAGMA table_info(prep_queue)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'priority' in columns:
            print("✓ Priority column already exists, skipping migration")
            return True

        print("Adding priority column to prep_queue table...")

        # Add priority column with default value of 2 (normal priority)
        cursor.execute("""
            ALTER TABLE prep_queue
            ADD COLUMN priority INTEGER DEFAULT 2 CHECK(priority IN (1, 2))
        """)

        # Drop old index and create new one with priority
        cursor.execute("DROP INDEX IF EXISTS idx_prep_queue_status")
        cursor.execute("""
            CREATE INDEX idx_prep_queue_status
            ON prep_queue(status, priority, ordered_at)
        """)

        conn.commit()
        print("✓ Migration completed successfully")
        print("  - Added priority column (default: 2)")
        print("  - Updated index to include priority")
        return True

    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}", file=sys.stderr)
        return False

    finally:
        conn.close()

if __name__ == '__main__':
    # Default database path
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'camp_snackbar.db'
    )

    # Allow custom path as argument
    if len(sys.argv) > 1:
        db_path = sys.argv[1]

    if not os.path.exists(db_path):
        print(f"✗ Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Running migration on: {db_path}")
    success = migrate(db_path)
    sys.exit(0 if success else 1)
