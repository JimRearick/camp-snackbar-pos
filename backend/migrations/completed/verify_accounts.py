#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('/home/jim/camp-snackbar-pos/backend/camp_snackbar.db')
cursor = conn.cursor()

cursor.execute('SELECT COUNT(*) FROM accounts')
print('Total accounts:', cursor.fetchone()[0])

cursor.execute('SELECT account_number, account_name, account_type, current_balance FROM accounts ORDER BY account_number')
print('\nAll accounts:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]} ({row[2]}) - ${row[3]:.2f}')

conn.close()
