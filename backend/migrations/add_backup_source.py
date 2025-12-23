#!/usr/bin/env python3
"""
Migration: Add backup_source column to backup_log table

This migration adds:
1. backup_source column to differentiate between manual and automatic backups
2. Updates existing records to infer source from backup filename
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'camp_snackbar.db')

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def migrate():
    print("=" * 70)
    print("BACKUP SOURCE MIGRATION - Adding backup_source column")
    print("=" * 70)
    print()

    # Backup database first
    backup_path = DB_PATH + '.pre_backup_source_migration'
    if os.path.exists(DB_PATH):
        import shutil
        shutil.copy2(DB_PATH, backup_path)
        print(f"✓ Database backed up to: {backup_path}")
        print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # ====================================================================
        # 1. Add backup_source column to backup_log
        # ====================================================================
        print("Step 1: Adding backup_source column to backup_log...")

        if column_exists(cursor, 'backup_log', 'backup_source'):
            print("  ⚠ backup_source column already exists, skipping")
        else:
            cursor.execute(
                "ALTER TABLE backup_log ADD COLUMN backup_source TEXT NOT NULL DEFAULT 'manual' CHECK(backup_source IN ('manual', 'auto'))"
            )
            print("  ✓ Added backup_source column")

        # ====================================================================
        # 2. Update existing records based on filename pattern
        # ====================================================================
        print("\nStep 2: Updating existing backup_log records...")

        # Update records where backup_path contains 'backup_auto_' to 'auto'
        cursor.execute("""
            UPDATE backup_log
            SET backup_source = 'auto'
            WHERE backup_path LIKE '%backup_auto_%'
        """)
        auto_updated = cursor.rowcount

        # All others should be 'manual' (already default, but make it explicit)
        cursor.execute("""
            UPDATE backup_log
            SET backup_source = 'manual'
            WHERE backup_path NOT LIKE '%backup_auto_%'
        """)
        manual_updated = cursor.rowcount

        print(f"  ✓ Updated {auto_updated} automatic backup record(s)")
        print(f"  ✓ Updated {manual_updated} manual backup record(s)")

        # ====================================================================
        # Commit all changes
        # ====================================================================
        conn.commit()

        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print()
        print("Summary:")
        print("  - backup_source column added to backup_log table")
        print("  - Existing records updated based on filename patterns")
        print("  - Automatic backups: contain 'backup_auto_' in path")
        print("  - Manual backups: all other backup files")
        print()
        print(f"Backup saved to: {backup_path}")
        print()

        return True

    except Exception as e:
        conn.rollback()
        print("\n" + "=" * 70)
        print("❌ MIGRATION FAILED")
        print("=" * 70)
        print(f"\nError: {e}")
        print(f"\nDatabase has been rolled back.")
        print(f"Original database backup: {backup_path}")
        print()
        import traceback
        traceback.print_exc()
        return False

    finally:
        conn.close()

def verify_migration():
    """Verify that migration was successful"""
    print("Verifying migration...")
    print()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check backup_source column exists
        cursor.execute("PRAGMA table_info(backup_log)")
        columns = [row[1] for row in cursor.fetchall()]
        has_source = 'backup_source' in columns
        print(f"✓ backup_log.backup_source: {'exists' if has_source else 'MISSING'}")

        # Show backup statistics by source
        cursor.execute("""
            SELECT backup_source, backup_type, COUNT(*) as count
            FROM backup_log
            GROUP BY backup_source, backup_type
            ORDER BY backup_source, backup_type
        """)
        stats = cursor.fetchall()

        if stats:
            print("\nBackup statistics:")
            for row in stats:
                print(f"  - {row[0]} {row[1]}: {row[2]} backup(s)")
        else:
            print("\nNo backup records found (empty database)")

        print("\n✅ Migration verification complete")
        return True

    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        return False

    finally:
        conn.close()

if __name__ == '__main__':
    # Run migration
    success = migrate()

    if success:
        # Verify migration
        verify_migration()
        sys.exit(0)
    else:
        sys.exit(1)
