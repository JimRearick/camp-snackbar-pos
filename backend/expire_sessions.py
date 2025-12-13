#!/usr/bin/env python3
"""
Expire user sessions utility for testing session expiration handling

NOTE: Flask-Login stores sessions in encrypted client-side cookies, not in the
user_sessions database table. The user_sessions table exists for future use
(e.g., for session management UI, device tracking, or forced logouts).

To test session expiration with Flask-Login, use one of these methods:
1. Change SECRET_KEY in app.py (invalidates all session cookies)
2. Delete browser cookies manually
3. Use this script to track/manage the user_sessions table (if implemented)

This script works with the user_sessions table structure:
    python3 expire_sessions.py              # Show all sessions
    python3 expire_sessions.py --user admin # Filter by username
    python3 expire_sessions.py --role pos   # Filter by role
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), 'camp_snackbar.db')

def expire_all_sessions(username=None, role=None):
    print("=" * 60)
    print("EXPIRE USER SESSIONS")
    print("=" * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Build query based on filters
        query = """
            SELECT
                s.session_token,
                s.user_id,
                s.created_at,
                s.expires_at,
                u.username,
                u.role,
                u.full_name
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
        """
        params = []

        if username:
            query += " WHERE u.username = ?"
            params.append(username)
        elif role:
            query += " WHERE u.role = ?"
            params.append(role)

        cursor.execute(query, params)
        sessions = cursor.fetchall()

        if len(sessions) == 0:
            filter_msg = ""
            if username:
                filter_msg = f" for user '{username}'"
            elif role:
                filter_msg = f" for role '{role}'"
            print(f"✓ No active sessions found{filter_msg}.")
            return

        # Display filter info
        if username:
            print(f"Filter: User = '{username}'")
        elif role:
            print(f"Filter: Role = '{role}'")
        else:
            print("Filter: All users")
        print()

        print(f"Found {len(sessions)} active session(s):")
        print()

        # Display session details
        for i, session in enumerate(sessions, 1):
            token_preview = session['session_token'][:16] + '...' if len(session['session_token']) > 16 else session['session_token']
            print(f"  {i}. User: {session['username']} ({session['role']}) - {session['full_name']}")
            print(f"     Session Token: {token_preview}")
            print(f"     Created: {session['created_at']}")
            print(f"     Expires: {session['expires_at']}")
            print()

        # Delete sessions
        if username:
            cursor.execute("""
                DELETE FROM user_sessions
                WHERE user_id IN (SELECT id FROM users WHERE username = ?)
            """, (username,))
        elif role:
            cursor.execute("""
                DELETE FROM user_sessions
                WHERE user_id IN (SELECT id FROM users WHERE role = ?)
            """, (role,))
        else:
            cursor.execute("DELETE FROM user_sessions")

        conn.commit()

        print(f"✅ Successfully deleted {len(sessions)} session(s)!")
        print()
        print("Affected users will need to re-authenticate on their next request.")

    except sqlite3.Error as e:
        conn.rollback()
        print(f"\n❌ Database Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    username = None
    role = None

    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--user' and len(sys.argv) > 2:
            username = sys.argv[2]
        elif sys.argv[1] == '--role' and len(sys.argv) > 2:
            role = sys.argv[2]
        elif sys.argv[1] in ['--help', '-h']:
            print("Usage:")
            print("  python3 expire_sessions.py              # Show/expire all sessions")
            print("  python3 expire_sessions.py --user admin # Show/expire specific user's sessions")
            print("  python3 expire_sessions.py --role pos   # Show/expire sessions by role")
            print()
            print("NOTE: Flask-Login uses client-side session cookies, not the user_sessions table.")
            print("To test session expiration:")
            print("  1. Change SECRET_KEY in app.py (invalidates all cookies)")
            print("  2. Clear browser cookies manually")
            print("  3. Implement server-side session storage to use this table")
            sys.exit(0)
        else:
            print("Invalid arguments. Use --help for usage information.")
            sys.exit(1)

    expire_all_sessions(username, role)
