# POS Interface Testing Guide

## Quick Start

The POS (Point-of-Sale) interface is now running and ready for testing!

### Access the POS Interface

1. **Local Access:**
   ```
   http://localhost:5000
   ```

2. **Network Access (from tablets/other devices):**
   ```
   http://<your-ip-address>:5000
   ```
   
   To find your IP address:
   ```bash
   hostname -I
   ```

## Test Accounts

The following test accounts have been created:

| Account Name    | Type       | Initial Balance | Account Number |
|----------------|------------|-----------------|----------------|
| Smith Family   | Family     | $0.00          | A001           |
| Jones Family   | Family     | $0.00          | A002           |
| Alice Johnson  | Individual | $0.00          | A003           |

## Available Products

The system includes these sample products:

### Candy
- Chocolate Bar - $1.50
- Gummy Bears - $1.25
- Skittles - $1.25

### Soda
- Coca-Cola - $2.00
- Sprite - $2.00
- Root Beer - $2.00

### Drinks
- Bottled Water - $1.50
- Gatorade - $2.50
- Juice Box - $1.75

### Hot Food
- Hamburger - $5.00
- Hot Dog - $3.50

## Testing the POS Flow

### 1. Select an Account
- Click "Select Account" button in the header
- Search or browse for an account
- Click on an account to select it
- Account name and balance will appear in the header

### 2. Add Items to Cart
- Tap any product button to add it to the cart
- Products are disabled until an account is selected
- Items appear in the right panel
- Use +/- buttons to adjust quantities

### 3. Review Cart
- View all items in the cart
- See individual item totals
- View grand total at the bottom

### 4. Checkout
- Click the green "Checkout" button
- Transaction is immediately processed
- Account balance is updated
- Cart is cleared
- Success message appears

### 5. Clear Cart (Optional)
- Click "Clear" button to empty the cart without checking out

## Features Demonstrated

✅ **Touch-First Design**
- Large tap targets (minimum 44x44px)
- No scrolling required on tablet screens
- Finger-friendly spacing

✅ **No Keyboard Required**
- Number pad for quantities (tap +/-)
- Account selection via tapping
- No text input needed for daily operations

✅ **Simple, Focused Interface**
- One primary task: make sales
- Clear visual hierarchy
- Products grouped by category

✅ **Immediate Account Updates**
- Balance updated in real-time
- Transaction stored on server
- Full transaction history maintained

## Testing Checklist

- [ ] Open POS interface on desktop browser
- [ ] Open POS interface on tablet/iPad
- [ ] Select an account
- [ ] Add multiple products to cart
- [ ] Adjust quantities using +/- buttons
- [ ] Verify total calculation
- [ ] Complete a checkout
- [ ] Verify success message appears
- [ ] Verify account balance updates
- [ ] Verify cart clears after checkout
- [ ] Clear cart manually
- [ ] Switch between different accounts
- [ ] Test with no account selected (products should be disabled)

## API Endpoints Used

The POS interface uses these API endpoints:

- `GET /api/products` - Load product catalog
- `GET /api/accounts` - Load account list
- `POST /api/transactions` - Process checkout

## Transaction Storage

All transactions are automatically stored in the database with:
- Transaction ID
- Account ID
- List of items purchased
- Quantities and prices
- Total amount
- Balance after transaction
- Timestamp

## Next Steps

1. **Test on actual tablets** - iPad, Android tablets
2. **Add more accounts** via Admin Panel (not yet built)
3. **Add more products** via Admin Panel (not yet built)
4. **View transaction history** (Reports page not yet built)

## Troubleshooting

### Products not loading
- Check server is running: `ps aux | grep app.py`
- Check API endpoint: `curl http://localhost:5000/api/products`

### Can't select account
- Verify accounts exist: `curl http://localhost:5000/api/accounts`
- Check browser console for errors

### Checkout fails
- Check server logs in terminal
- Verify account is selected
- Verify cart is not empty

## Server Control

**Check if running:**
```bash
ps aux | grep app.py
```

**Restart server:**
```bash
cd /home/jim/camp-snackbar-pos/backend
source venv/bin/activate
python app.py
```

**View server logs:**
Check the terminal where the server is running

## Database Location

All data is stored in:
```
/home/jim/camp-snackbar-pos/backend/camp_snackbar.db
```

View transactions directly:
```bash
sqlite3 /home/jim/camp-snackbar-pos/backend/camp_snackbar.db "SELECT * FROM transactions;"
```
