#!/usr/bin/env python3
import sqlite3
import json

DB_PATH = 'camp_snackbar.db'

# Fix family_members to be JSON format
fixes = [
    (4, ['Tom Wilson', 'Sarah Wilson', 'Emily Wilson']),
    (5, ['Carlos Rodriguez', 'Maria Rodriguez', 'Lucas Rodriguez']),
    (6, ['Wei Chen', 'Lily Chen', 'Alex Chen']),
    (7, []),  # Individual account
    (8, ['Mike Anderson', 'Jessica Anderson', 'Noah Anderson']),
    (9, []),  # Individual account
    (10, ['Juan Martinez', 'Sofia Martinez', 'Diego Martinez']),
    (11, []),  # Individual account
    (12, ['David Lee', 'Amy Lee', 'Grace Lee']),
    (13, []),  # Individual account
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

for account_id, members in fixes:
    members_json = json.dumps(members)
    cursor.execute('UPDATE accounts SET family_members = ? WHERE id = ?', (members_json, account_id))
    print(f"Updated account {account_id}: {members_json}")

conn.commit()
conn.close()

print("\nFamily members fixed successfully!")
