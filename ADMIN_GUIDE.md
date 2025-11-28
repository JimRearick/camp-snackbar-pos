# Admin Page Guide

## Accessing the Admin Page

The admin page is accessible at: `http://localhost:5000/static/admin.html`

Or on your network: `http://<your-server-ip>:5000/static/admin.html`

## Login

**Default Password:** `camp2024`

## Features

### 1. Inventory Management
- View all products organized by category
- Add new products
- Edit existing products (name, price, category)
- Activate/deactivate products
- Products marked as inactive won't appear in the POS

### 2. Account Management
- View all accounts with balances
- Search accounts by name or account number
- View account details including:
  - Current balance
  - Total spent
  - Transaction count
  - Account type (family/individual)
- Color-coded balances (red for negative, green for positive)

### 3. Transaction History
- View all transactions across all accounts
- Filter by transaction type:
  - Purchase - items bought from snackbar
  - Payment - money added to account
  - Adjustment - manual balance corrections
- View detailed receipt/transaction information:
  - Date and time
  - Account name
  - Items purchased (with quantities and prices)
  - Total amount
  - Balance after transaction
  - Notes (if any)

## Important Notes

1. **Authentication Required**: Most admin features require you to be logged in
2. **Product Changes**: Changes to products are immediately reflected in the POS system
3. **Account Balances**: Balances are calculated automatically from transactions
4. **Transaction Records**: All transactions are permanent and cannot be deleted (for audit purposes)

## Security

- Change the default admin password via the settings API:
  ```bash
  curl -X PUT http://localhost:5000/api/settings \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"admin_password": "your-new-password"}'
  ```

## Tips

- Use the search function in the Accounts tab to quickly find specific accounts
- The Inventory tab is useful for updating prices or temporarily disabling seasonal items
- The Transactions tab provides a complete audit trail of all snackbar activity
