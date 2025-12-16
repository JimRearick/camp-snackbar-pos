#!/usr/bin/env python3
"""
Test RBAC implementation
"""

import sys
import os

# Add parent directory to path to import models
sys.path.insert(0, os.path.dirname(__file__))

from models.user import User
import sqlite3

DB_PATH = 'camp_snackbar.db'

def test_user_model():
    print("=" * 60)
    print("Testing User Model")
    print("=" * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Test 1: Load admin user
    print("Test 1: Load admin user by ID...")
    admin = User.get_by_id(conn, 1)
    if admin:
        print(f"✓ Admin user loaded: {admin}")
        print(f"  Username: {admin.username}")
        print(f"  Role: {admin.role}")
        print(f"  Is Admin: {admin.is_admin}")
        print(f"  Is Active: {admin.is_active}")
    else:
        print("✗ Failed to load admin user")

    print()

    # Test 2: Load user by username
    print("Test 2: Load POS user by username...")
    pos_user = User.get_by_username(conn, 'pos')
    if pos_user:
        print(f"✓ POS user loaded: {pos_user}")
        print(f"  Username: {pos_user.username}")
        print(f"  Role: {pos_user.role}")
        print(f"  Is POS: {pos_user.is_pos}")
    else:
        print("✗ Failed to load POS user")

    print()

    # Test 3: Password verification
    print("Test 3: Password verification...")
    if admin:
        # Test correct password
        if admin.check_password('camp2024'):
            print("✓ Admin password verified correctly")
        else:
            print("✗ Admin password verification failed")

        # Test incorrect password
        if not admin.check_password('wrongpassword'):
            print("✓ Incorrect password rejected correctly")
        else:
            print("✗ Incorrect password was accepted!")

    print()

    # Test 4: Authentication
    print("Test 4: Full authentication...")
    auth_user = User.authenticate(conn, 'admin', 'camp2024')
    if auth_user:
        print(f"✓ Authentication successful: {auth_user.username}")
    else:
        print("✗ Authentication failed")

    # Test wrong password
    wrong_auth = User.authenticate(conn, 'admin', 'wrongpassword')
    if not wrong_auth:
        print("✓ Wrong password rejected correctly")
    else:
        print("✗ Wrong password was accepted!")

    print()

    # Test 5: Role checks
    print("Test 5: Role checks...")
    if admin:
        print(f"  has_role('admin'): {admin.has_role('admin')}")
        print(f"  has_role('pos'): {admin.has_role('pos')}")
        print(f"  has_any_role('admin', 'pos'): {admin.has_any_role('admin', 'pos')}")
        print(f"  has_any_role('prep'): {admin.has_any_role('prep')}")

    print()

    # Test 6: to_dict()
    print("Test 6: User to dict...")
    if admin:
        user_dict = admin.to_dict()
        print(f"✓ User dict: {user_dict}")
        if 'password_hash' not in user_dict:
            print("✓ Password hash NOT included in dict (secure!)")
        else:
            print("✗ WARNING: Password hash included in dict!")

    conn.close()

    print()
    print("=" * 60)
    print("✅ All tests completed")
    print("=" * 60)

if __name__ == '__main__':
    test_user_model()
