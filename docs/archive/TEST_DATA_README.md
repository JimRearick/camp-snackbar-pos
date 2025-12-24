# Test Data Loader

This script generates realistic test data for the Camp Snackbar POS system, including accounts and transactions.

## What It Creates

### Accounts (30 total by default)
- **15 Family Accounts** - Named like "Smith Family" with 2-5 family members
- **10 Individual Accounts** - Named like "Emma Johnson"
- **5 Cabin/Group Accounts** - Named like "Cabin Eagle" with 4-8 members

### Transactions
- **14 days of transaction history** (configurable)
- **8-25 transactions per day** (random within range)
- **Random items per transaction** (1-7 products)
- **Realistic timing** (transactions between 10 AM - 8 PM)
- **Some payment transactions** to create varied balances

## Usage

### Local Development

```bash
cd backend
python3 load_test_data.py
```

### Docker Container

**Recommended method** (runs from host directory):

```bash
# Copy script into running container and execute
docker cp backend/load_test_data.py camp-snackbar-app:/tmp/load_test_data.py
docker exec -it camp-snackbar-app python3 /tmp/load_test_data.py
```

**Alternative** (if script is already in the image):

```bash
# Execute inside container (if script exists in image)
docker exec -it camp-snackbar-app python3 /app/backend/load_test_data.py
```

## What You'll See

The script provides detailed output:

```
============================================================
Camp Snackbar POS - Test Data Loader
============================================================
✓ Connected to database: camp_snackbar.db

✓ Found 17 products

Creating 15 family accounts...
Creating 10 individual accounts...
Creating 5 cabin/group accounts...
✓ Created 30 accounts

Generating transactions for the past 14 days...
  Day -14: 18 transactions, $1,245.50
  Day -13: 22 transactions, $1,567.25
  ...
  Day  -0: 15 transactions, $  987.00

✓ Created 245 transactions
✓ Total revenue: $18,456.75

Adding 12 payment transactions...
✓ Added 12 payments

============================================================
Summary:
============================================================
Accounts created:        30
Transactions created:    245
Total revenue generated: $18,456.75
Average per transaction: $75.33
============================================================
✓ Test data loaded successfully!
============================================================
```

## Customization

You can modify the script to adjust:

- **Number of accounts**: Edit the `create_test_accounts()` parameters
  ```python
  accounts = create_test_accounts(
      conn,
      num_family=15,      # Change this
      num_individual=10,   # Change this
      num_cabin=5          # Change this
  )
  ```

- **Transaction history**: Edit the `create_test_transactions()` parameters
  ```python
  create_test_transactions(
      conn,
      accounts,
      products,
      days_back=14,                    # Change this (number of days)
      transactions_per_day_range=(8, 25)  # Change this (min, max per day)
  )
  ```

- **Number of payments**: Edit the `add_some_payments()` parameter
  ```python
  add_some_payments(conn, accounts, num_payments=12)  # Change this
  ```

## Data Generated

### Account Types
- **Family accounts** include family member names
- **Individual accounts** are single person accounts
- **Cabin accounts** are group accounts (like bunk/cabin groups)

### Transaction Patterns
- Realistic purchase patterns (1-7 items per transaction)
- Mix of products from all categories (Candy, Soda, Drinks, Grill)
- Some items appear multiple times in same transaction (quantity > 1)
- Prep queue items automatically created for grill items
- Varied transaction times throughout each day

### Balances
- Most accounts will have negative balances (owe money)
- Some accounts will have received partial payments
- A few accounts might be fully paid up

## Use Cases

1. **Demo/Presentation** - Show off the system with realistic data
2. **Testing** - Test reports, charts, and filtering features
3. **Development** - Develop new features with representative data
4. **Training** - Train users on a system with sample data

## Resetting Data

To clear test data and start fresh:

### Option 1: Full Database Reset
```bash
# Local
cd backend
python3 init_db.py

# Docker
docker exec -it camp-snackbar-app python3 /app/backend/init_db.py
```

### Option 2: Delete Only Test Data
```bash
# Run in container or local SQLite
sqlite3 camp_snackbar.db "DELETE FROM transactions WHERE created_by_username = 'admin';"
sqlite3 camp_snackbar.db "DELETE FROM accounts WHERE account_number LIKE 'FAM%' OR account_number LIKE 'IND%' OR account_number LIKE 'CAB%';"
```

## Notes

- The script is **idempotent** - you can run it multiple times to add more test data
- All transactions are timestamped realistically across the date range
- The `admin` user (created_by_username = 'admin') is used for all test transactions
- Prep queue items are automatically marked as 'completed' for historical transactions
- Account numbers follow a pattern:
  - `FAM1000`-`FAM1999`: Family accounts
  - `IND2000`-`IND2999`: Individual accounts
  - `CAB3000`-`CAB3999`: Cabin/group accounts

## Troubleshooting

**Error: "No products found in database"**
- Run `init_db.py` first to create the schema and default products

**Error: "Database is locked"**
- Stop the running application before loading test data
- Or use the Docker exec method which works with running containers

**Want different data?**
- Edit the lists at the top of the script:
  - `FIRST_NAMES` - First names for individuals
  - `LAST_NAMES` - Last names for families
  - `CABIN_NAMES` - Cabin/group names
