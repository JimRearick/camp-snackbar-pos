#!/usr/bin/env python3
"""
Migration: Add RBAC (users, sessions, audit columns)

This migration adds:
1. users table with roles (admin, pos, prep)
2. user_sessions table to replace admin_sessions
3. Audit columns to transactions table
4. Default admin and pos users
"""

import sqlite3
import bcrypt
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'camp_snackbar.db')

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def table_exists(cursor, table_name):
    """Check if a table exists"""
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,)
    )
    return cursor.fetchone() is not None

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def migrate():
    print("=" * 70)
    print("RBAC MIGRATION - Phase 1: Database Schema Changes")
    print("=" * 70)
    print()

    # Backup database first
    backup_path = DB_PATH + '.pre_rbac_backup'
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
        # 1. Create users table
        # ====================================================================
        print("Step 1: Creating users table...")

        if table_exists(cursor, 'users'):
            print("  ⚠ users table already exists, skipping creation")
        else:
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('admin', 'pos', 'prep')),
                    full_name TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            print("  ✓ users table created")

        # ====================================================================
        # 2. Create default users
        # ====================================================================
        print("\nStep 2: Creating default users...")

        # Check if users exist
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]

        if user_count > 0:
            print(f"  ⚠ Found {user_count} existing user(s), skipping default user creation")
        else:
            # Create admin user
            admin_hash = hash_password('camp2024')
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, full_name)
                VALUES (?, ?, 'admin', 'Administrator')
            """, ('admin', admin_hash))
            print("  ✓ Created admin user (username: admin, password: camp2024)")

            # Create pos user
            pos_hash = hash_password('pos2024')
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, full_name)
                VALUES (?, ?, 'pos', 'POS Terminal')
            """, ('pos', pos_hash))
            print("  ✓ Created POS user (username: pos, password: pos2024)")

        # ====================================================================
        # 3. Create user_sessions table
        # ====================================================================
        print("\nStep 3: Creating user_sessions table...")

        if table_exists(cursor, 'user_sessions'):
            print("  ⚠ user_sessions table already exists, skipping creation")
        else:
            cursor.execute("""
                CREATE TABLE user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            print("  ✓ user_sessions table created")

            # Create indexes
            cursor.execute(
                "CREATE INDEX idx_sessions_token ON user_sessions(session_token)"
            )
            cursor.execute(
                "CREATE INDEX idx_sessions_user ON user_sessions(user_id)"
            )
            print("  ✓ Created indexes on user_sessions")

        # ====================================================================
        # 4. Add audit columns to transactions
        # ====================================================================
        print("\nStep 4: Adding audit columns to transactions...")

        if not table_exists(cursor, 'transactions'):
            print("  ⚠ transactions table doesn't exist, skipping audit columns")
        else:
            # Add created_by column
            if column_exists(cursor, 'transactions', 'created_by'):
                print("  ⚠ created_by column already exists")
            else:
                cursor.execute(
                    "ALTER TABLE transactions ADD COLUMN created_by INTEGER REFERENCES users(id)"
                )
                print("  ✓ Added created_by column")

            # Add created_by_username column
            if column_exists(cursor, 'transactions', 'created_by_username'):
                print("  ⚠ created_by_username column already exists")
            else:
                cursor.execute(
                    "ALTER TABLE transactions ADD COLUMN created_by_username TEXT"
                )
                print("  ✓ Added created_by_username column")

            # Backfill existing transactions
            cursor.execute(
                "UPDATE transactions SET created_by_username = 'legacy_admin' "
                "WHERE created_by_username IS NULL"
            )
            backfilled = cursor.rowcount
            if backfilled > 0:
                print(f"  ✓ Backfilled {backfilled} existing transaction(s) with 'legacy_admin'")

        # ====================================================================
        # 5. Enable foreign key constraints
        # ====================================================================
        print("\nStep 5: Enabling foreign key constraints...")
        cursor.execute("PRAGMA foreign_keys = ON")
        print("  ✓ Foreign key constraints enabled")

        # ====================================================================
        # Commit all changes
        # ====================================================================
        conn.commit()

        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print()
        print("Summary:")
        print("  - users table created with default admin and pos users")
        print("  - user_sessions table created with indexes")
        print("  - Audit columns added to transactions table")
        print("  - Foreign key constraints enabled")
        print()
        print("Default credentials:")
        print("  Admin: username='admin', password='camp2024'")
        print("  POS:   username='pos', password='pos2024'")
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
        # Check users table
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"✓ users table: {user_count} user(s)")

        # Check user_sessions table
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        session_count = cursor.fetchone()[0]
        print(f"✓ user_sessions table: {session_count} session(s)")

        # Check transactions audit columns
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [row[1] for row in cursor.fetchall()]
        has_created_by = 'created_by' in columns
        has_username = 'created_by_username' in columns
        print(f"✓ transactions.created_by: {'exists' if has_created_by else 'MISSING'}")
        print(f"✓ transactions.created_by_username: {'exists' if has_username else 'MISSING'}")

        # List users
        cursor.execute("SELECT username, role, is_active FROM users")
        users = cursor.fetchall()
        print("\nUsers:")
        for user in users:
            status = "active" if user[2] else "inactive"
            print(f"  - {user[0]} ({user[1]}) - {status}")

        print("\n✅ Migration verification complete")
        return True

    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        return False

    finally:
        conn.close()

if __name__ == '__main__':
    # Check if bcrypt is installed
    try:
        import bcrypt
    except ImportError:
        print("ERROR: bcrypt is not installed")
        print("Please run: pip install bcrypt")
        sys.exit(1)

    # Run migration
    success = migrate()

    if success:
        # Verify migration
        verify_migration()
        sys.exit(0)
    else:
        sys.exit(1)
