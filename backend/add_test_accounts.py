#!/usr/bin/env python3
import sqlite3

DB_PATH = 'camp_snackbar.db'

# Test accounts to add
test_accounts = [
    ('ACC004', 'Wilson Family', 'family', 'Tom, Sarah, Emily Wilson', 50.00),
    ('ACC005', 'Rodriguez Family', 'family', 'Carlos, Maria, Lucas Rodriguez', 75.00),
    ('ACC006', 'Chen Family', 'family', 'Wei, Lily, Alex Chen', 60.00),
    ('ACC007', 'Taylor, Emma', 'individual', None, 25.00),
    ('ACC008', 'Anderson Family', 'family', 'Mike, Jessica, Noah Anderson', 80.00),
    ('ACC009', 'Brown, Michael', 'individual', None, 30.00),
    ('ACC010', 'Martinez Family', 'family', 'Juan, Sofia, Diego Martinez', 65.00),
    ('ACC011', 'Johnson, Olivia', 'individual', None, 35.00),
    ('ACC012', 'Lee Family', 'family', 'David, Amy, Grace Lee', 70.00),
    ('ACC013', 'Davis, Ethan', 'individual', None, 40.00),
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

for account_number, account_name, account_type, family_members, initial_balance in test_accounts:
    try:
        cursor.execute('''
            INSERT INTO accounts (account_number, account_name, account_type, family_members, initial_balance, current_balance)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (account_number, account_name, account_type, family_members, initial_balance, initial_balance))
        print(f"Added: {account_name} ({account_number})")
    except sqlite3.IntegrityError as e:
        print(f"Skipped {account_number} - already exists")

conn.commit()
conn.close()

print("\nTest accounts added successfully!")
