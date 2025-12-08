#!/usr/bin/env python3
"""
Expire all admin sessions (for testing session expiration handling)

This script immediately deletes all admin sessions from the database,
forcing all logged-in admins to re-authenticate on their next request.

Usage:
    python3 expire_sessions.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def expire_all_sessions():
    print("=" * 60)
    print("EXPIRE ALL ADMIN SESSIONS")
    print("=" * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Get session details before deletion
        cursor.execute("SELECT token, created_at, expires_at FROM admin_sessions")
        sessions = cursor.fetchall()

        if len(sessions) == 0:
            print("✓ No active sessions found.")
            return

        print(f"Found {len(sessions)} active session(s):")
        print()

        # Display session details
        for i, session in enumerate(sessions, 1):
            token_preview = session['token'][:16] + '...' if len(session['token']) > 16 else session['token']
            print(f"  {i}. Token: {token_preview}")
            print(f"     Created: {session['created_at']}")
            print(f"     Expires: {session['expires_at']}")
            print()

        # Delete all sessions
        cursor.execute("DELETE FROM admin_sessions")
        conn.commit()

        print(f"✅ Successfully deleted {len(sessions)} session(s)!")
        print()
        print("All admins will need to re-authenticate on their next request.")

    except sqlite3.Error as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    expire_all_sessions()
