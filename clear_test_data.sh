#!/bin/bash
# Clear Test Data Script
# Removes all test data from the database while preserving system essentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

# Database path
DB_PATH="${1:-backend/camp_snackbar.db}"

if [ ! -f "$DB_PATH" ]; then
    print_error "Database not found at: $DB_PATH"
    echo ""
    echo "Usage: ./clear_test_data.sh [path/to/database.db]"
    echo "Default: backend/camp_snackbar.db"
    exit 1
fi

echo "========================================"
echo "Clear Test Data"
echo "========================================"
echo ""
print_info "Database: $DB_PATH"
echo ""

# Confirmation prompt
print_warning "This will DELETE all test data including:"
echo "  - All accounts (except those you want to keep)"
echo "  - All transactions"
echo "  - All prep queue items"
echo "  - Test products and categories"
echo "  - All users except 'admin'"
echo ""
print_info "System data that will be PRESERVED:"
echo "  - Admin user account"
echo "  - Settings"
echo "  - Database structure"
echo ""

read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Operation cancelled"
    exit 0
fi

echo ""
print_info "Creating backup before clearing data..."

# Create backup
BACKUP_NAME="backup_before_clear_$(date +%Y%m%d_%H%M%S).db"
cp "$DB_PATH" "backups/$BACKUP_NAME" 2>/dev/null || cp "$DB_PATH" "$BACKUP_NAME"

print_success "Backup created: $BACKUP_NAME"
echo ""

# Run the Python script to clear data
print_info "Clearing test data..."

python3 << PYEOF
import sqlite3
import sys

DB_PATH = "$DB_PATH"

try:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get counts before clearing
    print("${BLUE}→${NC} Counting current data...")

    cursor.execute("SELECT COUNT(*) as count FROM accounts")
    accounts_before = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    transactions_before = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM prep_queue")
    prep_before = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM products")
    products_before = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM categories")
    categories_before = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE username != 'admin'")
    users_before = cursor.fetchone()['count']

    print(f"  Accounts: {accounts_before}")
    print(f"  Transactions: {transactions_before}")
    print(f"  Prep Queue Items: {prep_before}")
    print(f"  Products: {products_before}")
    print(f"  Categories: {categories_before}")
    print(f"  Users (non-admin): {users_before}")
    print()

    # Clear data
    print("${BLUE}→${NC} Clearing data...")

    # 1. Clear prep queue (references transactions)
    cursor.execute("DELETE FROM prep_queue")
    prep_deleted = cursor.rowcount

    # 2. Clear transaction items (references transactions)
    cursor.execute("DELETE FROM transaction_items")

    # 3. Clear transactions (references accounts)
    cursor.execute("DELETE FROM transactions")
    transactions_deleted = cursor.rowcount

    # 4. Clear accounts
    cursor.execute("DELETE FROM accounts")
    accounts_deleted = cursor.rowcount

    # 5. Clear products (references categories)
    cursor.execute("DELETE FROM products")
    products_deleted = cursor.rowcount

    # 6. Clear categories
    cursor.execute("DELETE FROM categories")
    categories_deleted = cursor.rowcount

    # 7. Clear non-admin users and their sessions
    cursor.execute("DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE username != 'admin')")
    cursor.execute("DELETE FROM users WHERE username != 'admin'")
    users_deleted = cursor.rowcount

    # 8. Clear backup log
    cursor.execute("DELETE FROM backup_log")

    # Commit changes
    conn.commit()

    print("${GREEN}✓${NC} Data cleared successfully!")
    print()
    print("Deleted:")
    print(f"  ${GREEN}✓${NC} Accounts: {accounts_deleted}")
    print(f"  ${GREEN}✓${NC} Transactions: {transactions_deleted}")
    print(f"  ${GREEN}✓${NC} Prep Queue Items: {prep_deleted}")
    print(f"  ${GREEN}✓${NC} Products: {products_deleted}")
    print(f"  ${GREEN}✓${NC} Categories: {categories_deleted}")
    print(f"  ${GREEN}✓${NC} Users (non-admin): {users_deleted}")
    print()

    # Verify admin user still exists
    cursor.execute("SELECT id, username, role FROM users WHERE username = 'admin'")
    admin = cursor.fetchone()

    if admin:
        print("${GREEN}✓${NC} Admin user preserved:")
        print(f"  ID: {admin['id']}")
        print(f"  Username: {admin['username']}")
        print(f"  Role: {admin['role']}")
    else:
        print("${RED}✗${NC} WARNING: Admin user not found!")
        sys.exit(1)

    conn.close()

except Exception as e:
    print(f"${RED}✗${NC} Error: {e}")
    sys.exit(1)

PYEOF

if [ $? -eq 0 ]; then
    echo ""
    print_success "Test data cleared successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Initialize fresh data: cd backend && python3 init_db.py"
    echo "  2. Or start with empty database and add data via admin interface"
    echo ""
    print_info "Backup location: $BACKUP_NAME"
    echo "  To restore: cp $BACKUP_NAME $DB_PATH"
else
    print_error "Failed to clear test data"
    echo ""
    print_info "Database backup available: $BACKUP_NAME"
    exit 1
fi
