#!/usr/bin/env python3
"""
Load test data into Camp Snackbar POS database
Creates sample accounts and transactions for testing/demo purposes
"""
import sqlite3
import random
import os
from datetime import datetime, timedelta

# Try to find the database in common locations
# Priority: data/camp_snackbar.db (Docker) > camp_snackbar.db (local)
if os.path.exists('/app/data/camp_snackbar.db'):
    DB_PATH = '/app/data/camp_snackbar.db'
elif os.path.exists('data/camp_snackbar.db'):
    DB_PATH = 'data/camp_snackbar.db'
else:
    DB_PATH = 'camp_snackbar.db'

# Sample data
FIRST_NAMES = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
    'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
    'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael',
    'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery',
    'Sebastian', 'Ella', 'Jack', 'Scarlett', 'Aiden', 'Grace', 'Owen', 'Chloe'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson'
]

CABIN_NAMES = [
    'Eagle', 'Bear', 'Wolf', 'Hawk', 'Deer', 'Fox', 'Otter', 'Beaver',
    'Moose', 'Elk', 'Cougar', 'Lynx', 'Raccoon', 'Badger', 'Porcupine'
]

def get_family_name():
    """Generate a family account name"""
    return f"{random.choice(LAST_NAMES)} Family"

def get_cabin_name():
    """Generate a cabin name"""
    return f"Cabin {random.choice(CABIN_NAMES)}"

def get_individual_name():
    """Generate an individual name"""
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_family_members():
    """Generate 2-5 family member names"""
    num_members = random.randint(2, 5)
    members = []
    last_name = random.choice(LAST_NAMES)

    # Parents
    if random.random() > 0.3:  # 70% chance of having parents listed
        members.append(f"Mr. {last_name}")
        if random.random() > 0.5:
            members.append(f"Mrs. {last_name}")

    # Kids
    num_kids = random.randint(1, 3)
    for _ in range(num_kids):
        members.append(f"{random.choice(FIRST_NAMES)} {last_name}")

    return members[:num_members]

def create_test_accounts(conn, num_family=15, num_individual=10, num_cabin=5):
    """Create test accounts"""
    cursor = conn.cursor()
    accounts_created = []

    print(f"Creating {num_family} family accounts...")
    for i in range(num_family):
        account_number = f"FAM{1000 + i}"
        account_name = get_family_name()
        family_members = generate_family_members()

        cursor.execute('''
            INSERT INTO accounts (account_number, account_name, account_type, family_members, active)
            VALUES (?, ?, 'family', ?, 1)
        ''', (account_number, account_name, '\n'.join(family_members)))

        accounts_created.append({
            'id': cursor.lastrowid,
            'type': 'family',
            'name': account_name
        })

    print(f"Creating {num_individual} individual accounts...")
    for i in range(num_individual):
        account_number = f"IND{2000 + i}"
        account_name = get_individual_name()

        cursor.execute('''
            INSERT INTO accounts (account_number, account_name, account_type, active)
            VALUES (?, ?, 'individual', 1)
        ''', (account_number, account_name))

        accounts_created.append({
            'id': cursor.lastrowid,
            'type': 'individual',
            'name': account_name
        })

    print(f"Creating {num_cabin} cabin/group accounts...")
    for i in range(num_cabin):
        account_number = f"CAB{3000 + i}"
        account_name = get_cabin_name()
        members = [get_individual_name() for _ in range(random.randint(4, 8))]

        cursor.execute('''
            INSERT INTO accounts (account_number, account_name, account_type, family_members, active)
            VALUES (?, ?, 'family', ?, 1)
        ''', (account_number, account_name, '\n'.join(members)))

        accounts_created.append({
            'id': cursor.lastrowid,
            'type': 'family',
            'name': account_name
        })

    conn.commit()
    print(f"✓ Created {len(accounts_created)} accounts")
    return accounts_created

def get_products(conn):
    """Get all active products"""
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, price, requires_prep, category_id
        FROM products
        WHERE active = 1
    ''')
    products = []
    for row in cursor.fetchall():
        products.append({
            'id': row[0],
            'name': row[1],
            'price': row[2],
            'requires_prep': row[3],
            'category_id': row[4]
        })
    return products

def create_transaction(conn, account_id, products, date):
    """Create a single transaction with random items"""
    cursor = conn.cursor()

    # Random number of items (1-7 items per transaction)
    num_items = random.randint(1, 7)

    # Select random products (can have duplicates for quantity)
    selected_products = []
    total_amount = 0

    for _ in range(num_items):
        product = random.choice(products)
        quantity = random.randint(1, 3) if random.random() > 0.7 else 1

        selected_products.append({
            'product': product,
            'quantity': quantity
        })
        total_amount += product['price'] * quantity

    # Create transaction (handle both old and new schema)
    try:
        cursor.execute('''
            INSERT INTO transactions (
                account_id, transaction_type, total_amount,
                created_at, created_by, created_by_username
            )
            VALUES (?, 'purchase', ?, ?, 1, 'admin')
        ''', (account_id, -total_amount, date))
    except sqlite3.OperationalError:
        # Fallback for older schema without created_by_username
        cursor.execute('''
            INSERT INTO transactions (
                account_id, transaction_type, total_amount,
                created_at, created_by
            )
            VALUES (?, 'purchase', ?, ?, 1)
        ''', (account_id, -total_amount, date))

    transaction_id = cursor.lastrowid

    # Create transaction items
    for item in selected_products:
        product = item['product']
        quantity = item['quantity']
        line_total = product['price'] * quantity

        cursor.execute('''
            INSERT INTO transaction_items (
                transaction_id, product_id, product_name,
                quantity, unit_price, line_total
            )
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (transaction_id, product['id'], product['name'],
              quantity, product['price'], line_total))

        # Add to prep queue if product requires prep
        if product['requires_prep']:
            cursor.execute('''
                INSERT INTO prep_queue (
                    transaction_id, transaction_item_id, product_name,
                    quantity, account_name, status, ordered_at
                )
                SELECT ?, ?, ?, ?, a.account_name, 'completed', ?
                FROM accounts a WHERE a.id = ?
            ''', (transaction_id, cursor.lastrowid, product['name'],
                  quantity, date, account_id))

    return transaction_id, total_amount

def create_test_transactions(conn, accounts, products, days_back=14, transactions_per_day_range=(5, 20)):
    """Create test transactions over a date range"""
    print(f"\nGenerating transactions for the past {days_back} days...")

    total_transactions = 0
    total_revenue = 0

    # Generate transactions for each day
    for day in range(days_back, -1, -1):
        date = datetime.now() - timedelta(days=day)
        num_transactions = random.randint(*transactions_per_day_range)

        day_revenue = 0
        for _ in range(num_transactions):
            # Pick a random account
            account = random.choice(accounts)

            # Random time during the day (between 10 AM and 8 PM)
            hour = random.randint(10, 20)
            minute = random.randint(0, 59)
            transaction_date = date.replace(hour=hour, minute=minute, second=0, microsecond=0)

            # Create transaction
            trans_id, amount = create_transaction(
                conn,
                account['id'],
                products,
                transaction_date.strftime('%Y-%m-%d %H:%M:%S')
            )

            day_revenue += abs(amount)
            total_transactions += 1

        total_revenue += day_revenue
        print(f"  Day -{day:2d}: {num_transactions:2d} transactions, ${day_revenue:7.2f}")

    conn.commit()
    print(f"\n✓ Created {total_transactions} transactions")
    print(f"✓ Total revenue: ${total_revenue:,.2f}")
    return total_transactions, total_revenue

def add_some_payments(conn, accounts, num_payments=10):
    """Add some payment transactions to test balances"""
    cursor = conn.cursor()
    print(f"\nAdding {num_payments} payment transactions...")

    for _ in range(num_payments):
        account = random.choice(accounts)

        # Get current balance
        cursor.execute('''
            SELECT COALESCE(SUM(total_amount), 0)
            FROM transactions
            WHERE account_id = ?
        ''', (account['id'],))
        balance = cursor.fetchone()[0]

        if balance < 0:  # Only add payment if they owe money
            # Pay 50-100% of balance
            payment_amount = abs(balance) * random.uniform(0.5, 1.0)
            payment_amount = round(payment_amount, 2)

            # Handle both old and new schema
            try:
                cursor.execute('''
                    INSERT INTO transactions (
                        account_id, transaction_type, total_amount, notes,
                        created_at, created_by, created_by_username
                    )
                    VALUES (?, 'payment', ?, 'Test payment', ?, 1, 'admin')
                ''', (account['id'], payment_amount, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            except sqlite3.OperationalError:
                # Fallback for older schema
                cursor.execute('''
                    INSERT INTO transactions (
                        account_id, transaction_type, total_amount, notes,
                        created_at, created_by
                    )
                    VALUES (?, 'payment', ?, 'Test payment', ?, 1)
                ''', (account['id'], payment_amount, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))

    conn.commit()
    print(f"✓ Added {num_payments} payments")

def clear_existing_test_data(conn):
    """Remove any existing test data"""
    cursor = conn.cursor()

    # Check if test data exists
    cursor.execute("SELECT COUNT(*) FROM accounts WHERE account_number LIKE 'FAM%' OR account_number LIKE 'IND%' OR account_number LIKE 'CAB%'")
    count = cursor.fetchone()[0]

    if count > 0:
        print(f"\nFound {count} existing test accounts. Removing old test data...")

        # Get IDs of test accounts
        cursor.execute("SELECT id FROM accounts WHERE account_number LIKE 'FAM%' OR account_number LIKE 'IND%' OR account_number LIKE 'CAB%'")
        test_account_ids = [row[0] for row in cursor.fetchall()]

        if test_account_ids:
            placeholders = ','.join('?' * len(test_account_ids))

            # Delete prep queue items
            cursor.execute(f"DELETE FROM prep_queue WHERE transaction_id IN (SELECT id FROM transactions WHERE account_id IN ({placeholders}))", test_account_ids)

            # Delete transaction items
            cursor.execute(f"DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE account_id IN ({placeholders}))", test_account_ids)

            # Delete transactions
            cursor.execute(f"DELETE FROM transactions WHERE account_id IN ({placeholders})", test_account_ids)

            # Delete accounts
            cursor.execute(f"DELETE FROM accounts WHERE id IN ({placeholders})", test_account_ids)

            conn.commit()
            print(f"✓ Removed old test data\n")

def main():
    """Main function to load test data"""
    print("=" * 60)
    print("Camp Snackbar POS - Test Data Loader")
    print("=" * 60)

    # Connect to database
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"✓ Connected to database: {DB_PATH}\n")
    except Exception as e:
        print(f"✗ Error connecting to database: {e}")
        return

    try:
        # Clear any existing test data
        clear_existing_test_data(conn)
        # Get existing products
        products = get_products(conn)
        if not products:
            print("✗ No products found in database. Run init_db.py first.")
            return
        print(f"✓ Found {len(products)} products\n")

        # Create accounts
        accounts = create_test_accounts(
            conn,
            num_family=15,      # Family accounts
            num_individual=10,   # Individual accounts
            num_cabin=5          # Cabin/group accounts
        )

        # Create transactions
        num_trans, revenue = create_test_transactions(
            conn,
            accounts,
            products,
            days_back=14,                    # Generate 14 days of history
            transactions_per_day_range=(8, 25)  # 8-25 transactions per day
        )

        # Add some payments
        add_some_payments(conn, accounts, num_payments=12)

        # Summary
        print("\n" + "=" * 60)
        print("Summary:")
        print("=" * 60)
        print(f"Accounts created:        {len(accounts)}")
        print(f"Transactions created:    {num_trans}")
        print(f"Total revenue generated: ${revenue:,.2f}")
        print(f"Average per transaction: ${revenue/num_trans:.2f}" if num_trans > 0 else "N/A")
        print("=" * 60)
        print("✓ Test data loaded successfully!")
        print("\nDefault login credentials:")
        print("  Username: admin")
        print("  Password: admin")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error loading test data: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
