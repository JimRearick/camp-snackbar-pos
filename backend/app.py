"""
Camp Snack Bar POS System - Main Flask Application
"""

from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect, generate_csrf
import sqlite3
import json
import os
from datetime import datetime, timedelta
from functools import wraps
import secrets
import shutil
import schedule
import threading
import time
import bcrypt

# Import User model
from models.user import User

# Import validation
from validation import (
    validate_json, AccountSchema, ProductSchema, CategorySchema,
    TransactionSchema, UserSchema, LoginSchema, PaymentSchema,
    PrepItemUpdateSchema
)

app = Flask(__name__, static_folder='../static', static_url_path='/static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize CSRF Protection
csrf = CSRFProtect(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    """Required by Flask-Login to load user from session"""
    conn = get_db()
    user = User.get_by_id(conn, user_id)
    conn.close()
    return user

# Configuration - Simple local paths for Debian/Raspberry Pi deployment
DB_PATH = os.getenv('DB_PATH', 'camp_snackbar.db')
BACKUP_DIR = os.getenv('BACKUP_DIR', 'backups')
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')

# Create backup directory if it doesn't exist
os.makedirs(BACKUP_DIR, exist_ok=True)

# ============================================================================
# Database Helper Functions
# ============================================================================

def get_db():
    """Get database connection with timeout for better concurrency"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initialize database with schema"""
    with open('schema.sql', 'r') as f:
        schema = f.read()

    conn = get_db()
    conn.executescript(schema)
    conn.commit()
    conn.close()

def calculate_account_balance(conn, account_id):
    """Calculate account balance from transaction history"""
    cursor = conn.execute("""
        SELECT SUM(total_amount) as balance
        FROM transactions
        WHERE account_id = ?
    """, (account_id,))

    result = cursor.fetchone()
    return result['balance'] if result['balance'] is not None else 0.0

# ============================================================================
# Role-Based Access Control Decorators
# ============================================================================

def role_required(*roles):
    """Decorator to require specific role(s)"""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if not current_user.has_any_role(*roles):
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin role"""
    return role_required('admin')(f)

def pos_or_admin_required(f):
    """Decorator to require POS or admin role"""
    return role_required('pos', 'admin')(f)

def prep_or_admin_required(f):
    """Decorator to require Prep or admin role"""
    return role_required('prep', 'admin')(f)

# ============================================================================
# Authentication Routes
# ============================================================================

@app.route('/login')
def login_page():
    """Serve login page"""
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/api/csrf-token')
def get_csrf_token():
    """Get CSRF token for client-side requests"""
    return jsonify({'csrf_token': generate_csrf()})

@app.route('/api/auth/login', methods=['POST'])
@csrf.exempt  # Login doesn't require CSRF token (not authenticated yet)
@validate_json(LoginSchema)
def login():
    """Unified login for all users"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    user = User.authenticate(conn, username, password)
    conn.close()

    if user:
        login_user(user, remember=True)
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'redirect': get_redirect_for_role(user.role)
        })

    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user"""
    logout_user()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user_info():
    """Get current logged-in user info"""
    return jsonify(current_user.to_dict())

@app.route('/api/auth/validate', methods=['GET'])
@login_required
def validate_session():
    """Validate the current session"""
    return jsonify({'valid': True, 'user': current_user.to_dict()})

def get_redirect_for_role(role):
    """Determine where to redirect user based on role"""
    if role == 'admin':
        return '/admin.html'
    elif role == 'pos':
        return '/index.html'  # POS page
    elif role == 'prep':
        return '/prep.html'
    return '/'

# ============================================================================
# Account Routes
# ============================================================================

@app.route('/api/accounts', methods=['GET'])
@login_required
def get_accounts():
    """Get all accounts with optional search/filter (All authenticated users)"""
    search = request.args.get('search', '')
    account_type = request.args.get('type', '')

    conn = get_db()
    query = "SELECT * FROM accounts WHERE 1=1"
    params = []

    if search:
        query += " AND (account_name LIKE ? OR account_number LIKE ?)"
        params.extend([f'%{search}%', f'%{search}%'])

    if account_type:
        query += " AND account_type = ?"
        params.append(account_type)

    query += " ORDER BY account_name"

    cursor = conn.execute(query, params)
    accounts = []

    for row in cursor.fetchall():
        # Calculate current balance from transactions
        current_balance = calculate_account_balance(conn, row['id'])

        accounts.append({
            'id': row['id'],
            'account_number': row['account_number'],
            'account_name': row['account_name'],
            'account_type': row['account_type'],
            'family_members': json.loads(row['family_members']) if row['family_members'] else [],
            'current_balance': current_balance,
            'active': bool(row['active']),
            'created_at': row['created_at'],
            'notes': row['notes']
        })

    conn.close()
    return jsonify({'accounts': accounts})

@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def get_account(account_id):
    """Get single account details"""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Account not found'}), 404

    # Calculate current balance from transactions
    current_balance = calculate_account_balance(conn, account_id)

    # Calculate total spent
    cursor = conn.execute(
        "SELECT COUNT(*) as count, SUM(total_amount) as total FROM transactions WHERE account_id = ? AND transaction_type = 'purchase'",
        (account_id,)
    )
    stats = cursor.fetchone()

    account = {
        'id': row['id'],
        'account_number': row['account_number'],
        'account_name': row['account_name'],
        'account_type': row['account_type'],
        'family_members': json.loads(row['family_members']) if row['family_members'] else [],
        'current_balance': current_balance,
        'active': bool(row['active']),
        'total_spent': abs(stats['total']) if stats['total'] else 0,
        'transaction_count': stats['count'],
        'created_at': row['created_at'],
        'notes': row['notes']
    }

    conn.close()
    return jsonify(account)

@app.route('/api/accounts', methods=['POST'])
@admin_required
@validate_json(AccountSchema)
def create_account():
    """Create new account"""
    data = request.get_json()

    conn = get_db()

    try:
        # Generate unique account number
        cursor = conn.execute("SELECT MAX(CAST(SUBSTR(account_number, 2) AS INTEGER)) as max_num FROM accounts WHERE account_number LIKE 'A%'")
        row = cursor.fetchone()
        next_num = (row['max_num'] or 0) + 1
        account_number = f"A{next_num:03d}"

        family_members_json = json.dumps(data.get('family_members', []))

        # Create account with active status
        cursor = conn.execute(
            """INSERT INTO accounts (account_number, account_name, account_type, family_members, active, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (account_number, data['account_name'], data['account_type'], family_members_json,
             1, data.get('notes', ''))
        )

        account_id = cursor.lastrowid

        conn.commit()

        # Notify all clients
        socketio.emit('account_created', {'account_id': account_id, 'account_number': account_number})

        return jsonify({
            'success': True,
            'account': {
                'id': account_id,
                'account_number': account_number,
                'account_name': data['account_name'],
                'current_balance': 0
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/pos/accounts', methods=['POST'])
@pos_or_admin_required
@validate_json(AccountSchema)
def create_account_pos():
    """Create new account from POS (POS and Admin only)"""
    data = request.get_json()

    conn = get_db()

    try:
        # Generate unique account number
        cursor = conn.execute("SELECT MAX(CAST(SUBSTR(account_number, 2) AS INTEGER)) as max_num FROM accounts WHERE account_number LIKE 'A%'")
        row = cursor.fetchone()
        next_num = (row['max_num'] or 0) + 1
        account_number = f"A{next_num:03d}"

        family_members_json = json.dumps(data.get('family_members', []))

        # Create account with active status
        cursor = conn.execute(
            """INSERT INTO accounts (account_number, account_name, account_type, family_members, active, notes)
               VALUES (?, ?, ?, ?, 1, ?)""",
            (account_number, data['account_name'], data['account_type'], family_members_json, data.get('notes', ''))
        )

        account_id = cursor.lastrowid
        conn.commit()

        # Notify all clients
        socketio.emit('account_created', {'account_id': account_id, 'account_number': account_number})

        return jsonify({
            'success': True,
            'account': {
                'id': account_id,
                'account_number': account_number,
                'account_name': data['account_name'],
                'current_balance': 0
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
@admin_required
@validate_json(AccountSchema)
def update_account(account_id):
    """Update account"""
    data = request.get_json()
    
    conn = get_db()
    
    family_members_json = json.dumps(data.get('family_members', []))
    
    conn.execute(
        """UPDATE accounts
           SET account_name = ?, account_type = ?, family_members = ?, active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (data['account_name'], data['account_type'], family_members_json, data.get('active', True), data.get('notes', ''), account_id)
    )
    
    conn.commit()
    conn.close()
    
    socketio.emit('account_updated', {'account_id': account_id})
    
    return jsonify({'success': True})

@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
@admin_required
def delete_account(account_id):
    """Delete account"""
    conn = get_db()
    conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()
    
    socketio.emit('account_deleted', {'account_id': account_id})
    
    return jsonify({'success': True})

# ============================================================================
# Product & Category Routes
# ============================================================================

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    """Get all products grouped by category (All authenticated users)"""
    conn = get_db()
    
    cursor = conn.execute("SELECT * FROM categories WHERE active = 1 ORDER BY name")
    categories = []
    
    for cat_row in cursor.fetchall():
        products_cursor = conn.execute(
            "SELECT * FROM products WHERE category_id = ? ORDER BY display_order",
            (cat_row['id'],)
        )
        
        products = []
        for prod_row in products_cursor.fetchall():
            products.append({
                'id': prod_row['id'],
                'name': prod_row['name'],
                'price': prod_row['price'],
                'inventory_quantity': prod_row['inventory_quantity'],
                'track_inventory': bool(prod_row['track_inventory']),
                'requires_prep': bool(prod_row['requires_prep']),
                'active': bool(prod_row['active'])
            })
        
        categories.append({
            'id': cat_row['id'],
            'name': cat_row['name'],
            'button_color': cat_row['button_color'],
            'products': products
        })
    
    conn.close()
    return jsonify({'categories': categories})

@app.route('/api/products', methods=['POST'])
@admin_required
@validate_json(ProductSchema)
def create_product():
    """Create new product"""
    data = request.get_json()

    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO products (category_id, name, price, inventory_quantity, track_inventory, display_order, requires_prep)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (data['category_id'], data['name'], data['price'], data.get('inventory_quantity', 0),
         data.get('track_inventory', False), data.get('display_order', 0), data.get('requires_prep', 0))
    )

    product_id = cursor.lastrowid
    conn.commit()
    conn.close()

    socketio.emit('product_created', {'product_id': product_id})

    return jsonify({'success': True, 'product_id': product_id}), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@admin_required
@validate_json(ProductSchema)
def update_product(product_id):
    """Update product"""
    data = request.get_json()

    conn = get_db()
    conn.execute(
        """UPDATE products
           SET name = ?, price = ?, category_id = ?, active = ?, inventory_quantity = ?, track_inventory = ?, requires_prep = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (data['name'], data['price'], data.get('category_id'), data.get('active', 1), data.get('inventory_quantity', 0), data.get('track_inventory', False), data.get('requires_prep', 0), product_id)
    )

    conn.commit()
    conn.close()

    socketio.emit('product_updated', {'product_id': product_id})

    return jsonify({'success': True})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    """Delete product if it has no associated transactions"""
    conn = get_db()

    # Check if product exists
    cursor = conn.execute("SELECT id, name FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()

    if not product:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404

    # Check if product has any transaction items
    cursor = conn.execute(
        "SELECT COUNT(*) as count FROM transaction_items WHERE product_id = ?",
        (product_id,)
    )
    result = cursor.fetchone()
    transaction_count = result['count']

    if transaction_count > 0:
        conn.close()
        return jsonify({
            'error': f'Cannot delete product: it appears in {transaction_count} transaction(s). To preserve transaction history, products that have been sold cannot be deleted. You can mark it as inactive instead.'
        }), 400

    # Safe to delete - no transaction history
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

    socketio.emit('product_deleted', {'product_id': product_id})

    return jsonify({'success': True})

# ============================================================================
# Category Routes
# ============================================================================

@app.route('/api/categories', methods=['POST'])
@admin_required
@validate_json(CategorySchema)
def create_category():
    """Create new category"""
    data = request.get_json()

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO categories (name, button_color) VALUES (?, ?)",
        (data['name'], data.get('button_color', '#667eea'))
    )
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()

    socketio.emit('category_created', {'category_id': category_id})

    return jsonify({'success': True, 'category_id': category_id}), 201

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@admin_required
@validate_json(CategorySchema)
def update_category(category_id):
    """Update category"""
    data = request.get_json()

    conn = get_db()
    conn.execute(
        "UPDATE categories SET name = ?, button_color = ? WHERE id = ?",
        (data['name'], data.get('button_color', '#667eea'), category_id)
    )
    conn.commit()
    conn.close()

    socketio.emit('category_updated', {'category_id': category_id})

    return jsonify({'success': True})

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    """Delete category (only if it has no products)"""
    conn = get_db()

    # Check if category has products
    cursor = conn.execute(
        "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
        (category_id,)
    )
    count = cursor.fetchone()['count']

    if count > 0:
        conn.close()
        return jsonify({'error': 'Cannot delete category with products'}), 400

    # Delete category
    conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()

    socketio.emit('category_deleted', {'category_id': category_id})

    return jsonify({'success': True})

# ============================================================================
# Transaction Routes
# ============================================================================

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get transactions with optional filters"""
    account_id = request.args.get('account_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', 100)
    
    conn = get_db()
    query = """
        SELECT t.*, a.account_name 
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE 1=1
    """
    params = []
    
    if account_id:
        query += " AND t.account_id = ?"
        params.append(account_id)
    
    if start_date:
        query += " AND DATE(t.created_at) >= ?"
        params.append(start_date)
    
    if end_date:
        query += " AND DATE(t.created_at) <= ?"
        params.append(end_date)
    
    query += " ORDER BY t.created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor = conn.execute(query, params)
    transactions = []
    
    for row in cursor.fetchall():
        # Get line items
        items_cursor = conn.execute(
            "SELECT * FROM transaction_items WHERE transaction_id = ?",
            (row['id'],)
        )
        
        items = []
        for item_row in items_cursor.fetchall():
            items.append({
                'product_name': item_row['product_name'],
                'quantity': item_row['quantity'],
                'unit_price': item_row['unit_price'],
                'line_total': item_row['line_total']
            })
        
        transactions.append({
            'id': row['id'],
            'account_id': row['account_id'],
            'account_name': row['account_name'],
            'transaction_type': row['transaction_type'],
            'total_amount': row['total_amount'],
            'operator_name': row['operator_name'],
            'notes': row['notes'],
            'created_at': row['created_at'],
            'items': items
        })
    
    conn.close()
    return jsonify({'transactions': transactions})

@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
@admin_required
def get_transaction(transaction_id):
    """Get single transaction details"""
    conn = get_db()

    cursor = conn.execute("""
        SELECT t.*, a.account_name
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE t.id = ?
    """, (transaction_id,))

    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Transaction not found'}), 404

    # Get line items
    items_cursor = conn.execute(
        "SELECT * FROM transaction_items WHERE transaction_id = ?",
        (transaction_id,)
    )

    items = []
    for item_row in items_cursor.fetchall():
        items.append({
            'product_name': item_row['product_name'],
            'quantity': item_row['quantity'],
            'unit_price': item_row['unit_price'],
            'line_total': item_row['line_total']
        })

    transaction = {
        'id': row['id'],
        'account_id': row['account_id'],
        'account_name': row['account_name'],
        'transaction_type': row['transaction_type'],
        'total_amount': row['total_amount'],
        'operator_name': row['operator_name'],
        'notes': row['notes'],
        'created_at': row['created_at'],
        'has_been_adjusted': bool(row['has_been_adjusted']) if 'has_been_adjusted' in row.keys() else False,
        'items': items
    }

    conn.close()
    return jsonify(transaction)

@app.route('/api/transactions', methods=['POST'])
@pos_or_admin_required
@validate_json(TransactionSchema)
def create_transaction():
    """Create new transaction (POS and Admin only)"""
    data = request.get_json()

    conn = get_db()
    conn.execute("BEGIN")

    try:
        account_id = data['account_id']
        transaction_type = data['transaction_type']

        # Add audit trail
        created_by = current_user.id
        created_by_username = current_user.username

        total_amount = 0

        if transaction_type == 'purchase':
            # Calculate total from items
            for item in data['items']:
                cursor = conn.execute("SELECT name, price FROM products WHERE id = ?", (item['product_id'],))
                product = cursor.fetchone()

                line_total = product['price'] * item['quantity']
                total_amount += line_total

            total_amount = -total_amount  # Negative for purchases

        elif transaction_type == 'payment':
            total_amount = abs(data['total_amount'])  # Positive for payments

        elif transaction_type == 'adjustment':
            total_amount = data['total_amount']

            # If this is a refund adjustment, mark the original transaction as adjusted
            if 'original_transaction_id' in data:
                original_id = data['original_transaction_id']
                # Check if original transaction has already been adjusted
                cursor = conn.execute(
                    "SELECT has_been_adjusted FROM transactions WHERE id = ?",
                    (original_id,)
                )
                orig_row = cursor.fetchone()
                if orig_row and orig_row['has_been_adjusted']:
                    raise Exception('This transaction has already been adjusted and cannot be refunded again')

        # Create transaction with audit trail
        cursor = conn.execute(
            """INSERT INTO transactions (account_id, transaction_type, total_amount, operator_name, notes, created_by, created_by_username)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (account_id, transaction_type, total_amount, data.get('operator_name', ''), data.get('notes', ''), created_by, created_by_username)
        )

        transaction_id = cursor.lastrowid

        # If this is a refund adjustment, mark the original transaction as adjusted
        if transaction_type == 'adjustment' and 'original_transaction_id' in data:
            original_id = data['original_transaction_id']

            # Get current notes from original transaction
            cursor = conn.execute(
                "SELECT notes FROM transactions WHERE id = ?",
                (original_id,)
            )
            orig_row = cursor.fetchone()
            current_notes = orig_row['notes'] if orig_row and orig_row['notes'] else ''

            # Append adjustment reference
            adjustment_ref = f"Adjusted by transaction #{transaction_id} on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            updated_notes = f"{current_notes}\n{adjustment_ref}" if current_notes else adjustment_ref

            # Update original transaction with adjusted flag and reference note
            conn.execute(
                "UPDATE transactions SET has_been_adjusted = 1, notes = ? WHERE id = ?",
                (updated_notes, original_id)
            )

        # Add line items for purchases
        if transaction_type == 'purchase':
            # Get account name for prep queue
            account_cursor = conn.execute("SELECT account_name FROM accounts WHERE id = ?", (account_id,))
            account_row = account_cursor.fetchone()
            account_name = account_row['account_name'] if account_row else 'Unknown'

            for item in data['items']:
                cursor = conn.execute("SELECT name, price, requires_prep FROM products WHERE id = ?", (item['product_id'],))
                product = cursor.fetchone()

                line_total = product['price'] * item['quantity']

                item_cursor = conn.execute(
                    """INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, line_total)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (transaction_id, item['product_id'], product['name'], item['quantity'], product['price'], line_total)
                )
                transaction_item_id = item_cursor.lastrowid

                # Add to prep queue if product requires preparation
                if product['requires_prep']:
                    conn.execute(
                        """INSERT INTO prep_queue (transaction_id, transaction_item_id, product_name, quantity, account_name, status, ordered_at)
                           VALUES (?, ?, ?, ?, ?, 'pending', datetime('now', 'localtime'))""",
                        (transaction_id, transaction_item_id, product['name'], item['quantity'], account_name)
                    )

                # Update inventory if tracked
                conn.execute(
                    """UPDATE products
                       SET inventory_quantity = inventory_quantity - ?
                       WHERE id = ? AND track_inventory = 1""",
                    (item['quantity'], item['product_id'])
                )

        conn.commit()

        # Calculate new balance after transaction for notification
        new_balance = calculate_account_balance(conn, account_id)

        # Notify all clients
        socketio.emit('transaction_created', {
            'transaction_id': transaction_id,
            'account_id': account_id,
            'total_amount': total_amount,
            'balance_after': new_balance
        })

        return jsonify({
            'success': True,
            'transaction': {
                'id': transaction_id,
                'total_amount': total_amount,
                'balance_after': new_balance,
                'created_at': datetime.now().isoformat()
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

# ============================================================================
# Prep Queue Routes
# ============================================================================

@app.route('/api/prep-queue', methods=['GET'])
@login_required
def get_prep_queue():
    """Get all pending prep queue items (All authenticated users can view)"""
    conn = get_db()

    cursor = conn.execute("""
        SELECT id, transaction_id, transaction_item_id, product_name, quantity,
               account_name, status, ordered_at, completed_at, completed_by
        FROM prep_queue
        WHERE status = 'pending'
        ORDER BY ordered_at ASC
    """)

    items = []
    for row in cursor.fetchall():
        # Convert SQLite timestamp to ISO format for proper JS parsing
        ordered_at = row['ordered_at']
        if ordered_at:
            try:
                ordered_dt = datetime.strptime(ordered_at, '%Y-%m-%d %H:%M:%S')
                ordered_at = ordered_dt.isoformat()
            except:
                pass  # Keep original if parsing fails

        completed_at = row['completed_at']
        if completed_at:
            try:
                completed_dt = datetime.strptime(completed_at, '%Y-%m-%d %H:%M:%S')
                completed_at = completed_dt.isoformat()
            except:
                pass

        items.append({
            'id': row['id'],
            'transaction_id': row['transaction_id'],
            'transaction_item_id': row['transaction_item_id'],
            'product_name': row['product_name'],
            'quantity': row['quantity'],
            'account_name': row['account_name'],
            'status': row['status'],
            'ordered_at': ordered_at,
            'completed_at': completed_at,
            'completed_by': row['completed_by']
        })

    conn.close()
    return jsonify({'items': items})

@app.route('/api/prep-queue/<int:item_id>/complete', methods=['POST'])
@prep_or_admin_required
def complete_prep_item(item_id):
    """Mark a prep queue item as completed (Prep and Admin only)"""
    data = request.get_json() or {}
    completed_by = data.get('completed_by', 'Staff')

    conn = get_db()
    conn.execute("""
        UPDATE prep_queue
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            completed_by = ?
        WHERE id = ?
    """, (completed_by, item_id))

    conn.commit()

    # Notify all clients about queue update
    socketio.emit('prep_queue_updated', {'item_id': item_id, 'status': 'completed'})

    conn.close()
    return jsonify({'success': True})

@app.route('/api/prep-queue/history', methods=['GET'])
def get_prep_queue_history():
    """Get completed prep queue items for history/reports"""
    limit = request.args.get('limit', 100, type=int)

    conn = get_db()

    cursor = conn.execute("""
        SELECT id, transaction_id, transaction_item_id, product_name, quantity,
               account_name, status, ordered_at, completed_at, completed_by
        FROM prep_queue
        WHERE status = 'completed'
        ORDER BY completed_at DESC
        LIMIT ?
    """, (limit,))

    items = []
    for row in cursor.fetchall():
        # Convert SQLite timestamp to ISO format for proper JS parsing
        ordered_at = row['ordered_at']
        if ordered_at:
            try:
                ordered_dt = datetime.strptime(ordered_at, '%Y-%m-%d %H:%M:%S')
                ordered_at = ordered_dt.isoformat()
            except:
                pass

        completed_at = row['completed_at']
        if completed_at:
            try:
                completed_dt = datetime.strptime(completed_at, '%Y-%m-%d %H:%M:%S')
                completed_at = completed_dt.isoformat()
            except:
                pass

        items.append({
            'id': row['id'],
            'transaction_id': row['transaction_id'],
            'transaction_item_id': row['transaction_item_id'],
            'product_name': row['product_name'],
            'quantity': row['quantity'],
            'account_name': row['account_name'],
            'status': row['status'],
            'ordered_at': ordered_at,
            'completed_at': completed_at,
            'completed_by': row['completed_by']
        })

    conn.close()
    return jsonify({'items': items})

# ============================================================================
# User Management Routes (Advanced Admin)
# ============================================================================

@app.route('/api/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    """Get all users (Admin only)"""
    conn = get_db()
    cursor = conn.execute("""
        SELECT id, username, full_name, role, is_active, created_at
        FROM users
        ORDER BY username
    """)

    users = []
    for row in cursor.fetchall():
        users.append({
            'id': row['id'],
            'username': row['username'],
            'full_name': row['full_name'],
            'role': row['role'],
            'is_active': row['is_active'],
            'created_at': row['created_at']
        })

    conn.close()
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
@login_required
@admin_required
@validate_json(UserSchema)
def create_user():
    """Create a new user (Admin only)"""
    data = request.json

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'pos').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    if role not in ['admin', 'pos', 'prep']:
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db()

    # Check if username already exists
    cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username already exists'}), 400

    # Hash password using bcrypt
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create user
    try:
        conn.execute("""
            INSERT INTO users (username, password_hash, full_name, role)
            VALUES (?, ?, ?, ?)
        """, (username, password_hash, full_name, role))
        conn.commit()

        user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.close()

        return jsonify({'id': user_id, 'username': username, 'full_name': full_name, 'role': role}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
@validate_json(UserSchema)
def update_user(user_id):
    """Update a user (Admin only)"""
    data = request.json

    username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', '').strip()
    password = data.get('password', '').strip()
    is_active = data.get('is_active')  # Can be True, False, or None (not provided)

    if not username:
        return jsonify({'error': 'Username is required'}), 400

    if role and role not in ['admin', 'pos', 'prep']:
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db()

    # Check if user exists
    cursor = conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    # Prevent deactivating admin user
    if user['username'] == 'admin' and is_active is False:
        conn.close()
        return jsonify({'error': 'Cannot deactivate admin user'}), 400

    # Check if new username conflicts with existing user (if username changed)
    if username != user['username']:
        cursor = conn.execute("SELECT id FROM users WHERE username = ? AND id != ?", (username, user_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username already exists'}), 400

    # Update user
    try:
        # Build the UPDATE query dynamically based on what fields are provided
        update_fields = ['username = ?', 'full_name = ?', 'role = ?']
        update_values = [username, full_name, role]

        if password:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            update_fields.append('password_hash = ?')
            update_values.append(password_hash)

        if is_active is not None:
            update_fields.append('is_active = ?')
            update_values.append(1 if is_active else 0)

        update_values.append(user_id)

        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        conn.execute(query, tuple(update_values))

        conn.commit()
        conn.close()

        return jsonify({'id': user_id, 'username': username, 'full_name': full_name, 'role': role})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user (Admin only)"""
    conn = get_db()

    # Prevent deleting admin user
    cursor = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    if user['username'] == 'admin':
        conn.close()
        return jsonify({'error': 'Cannot delete admin user'}), 400

    # Check if user has created any transactions
    cursor = conn.execute("SELECT COUNT(*) as count FROM transactions WHERE created_by = ?", (user_id,))
    result = cursor.fetchone()
    transaction_count = result['count']

    if transaction_count > 0:
        conn.close()
        return jsonify({'error': f'Cannot delete user: they have created {transaction_count} transaction(s). To preserve transaction history, users who have created transactions cannot be deleted.'}), 400

    try:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/load-test-data', methods=['POST'])
@admin_required
def load_test_data():
    """Load test data (Admin only)"""
    import subprocess
    import os

    # Path to the test data script
    script_path = os.path.join(os.path.dirname(__file__), 'load_test_data.py')

    if not os.path.exists(script_path):
        return jsonify({'error': 'Test data script not found'}), 404

    try:
        # Run the test data script
        result = subprocess.run(
            ['python3', script_path],
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )

        if result.returncode != 0:
            return jsonify({
                'error': 'Failed to load test data',
                'output': result.stderr
            }), 500

        return jsonify({
            'success': True,
            'message': 'Test data loaded successfully!',
            'output': result.stdout
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Test data loading timed out'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/test-data', methods=['DELETE'])
@admin_required
def delete_test_data():
    """Delete test data (Admin only)"""
    conn = get_db()

    try:
        # Get IDs of test accounts
        cursor = conn.execute("""
            SELECT id FROM accounts
            WHERE account_number LIKE 'FAM%'
               OR account_number LIKE 'IND%'
               OR account_number LIKE 'CAB%'
        """)
        test_account_ids = [row['id'] for row in cursor.fetchall()]

        if not test_account_ids:
            conn.close()
            return jsonify({'message': 'No test data found to delete'})

        placeholders = ','.join('?' * len(test_account_ids))

        # Delete prep queue items
        conn.execute(f"""
            DELETE FROM prep_queue
            WHERE transaction_id IN (
                SELECT id FROM transactions WHERE account_id IN ({placeholders})
            )
        """, test_account_ids)

        # Delete transaction items
        conn.execute(f"""
            DELETE FROM transaction_items
            WHERE transaction_id IN (
                SELECT id FROM transactions WHERE account_id IN ({placeholders})
            )
        """, test_account_ids)

        # Delete transactions
        conn.execute(f"""
            DELETE FROM transactions WHERE account_id IN ({placeholders})
        """, test_account_ids)

        # Delete accounts
        conn.execute(f"""
            DELETE FROM accounts WHERE id IN ({placeholders})
        """, test_account_ids)

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Deleted {len(test_account_ids)} test accounts and their associated data'
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# Report Routes
# ============================================================================

@app.route('/api/reports/summary', methods=['GET'])
def get_summary_report():
    """Get camp-wide summary"""
    conn = get_db()

    # Get total accounts
    cursor = conn.execute("SELECT COUNT(*) as total_accounts FROM accounts")
    stats = cursor.fetchone()
    total_accounts = stats['total_accounts']

    # Get total payments (funds added)
    cursor = conn.execute("""
        SELECT SUM(total_amount) as total_payments
        FROM transactions
        WHERE transaction_type = 'payment'
    """)

    payment_stats = cursor.fetchone()
    total_prepaid = payment_stats['total_payments'] or 0

    # Get total spent (purchases)
    cursor = conn.execute("""
        SELECT SUM(ABS(total_amount)) as total_purchases
        FROM transactions
        WHERE transaction_type = 'purchase'
    """)

    purchase_stats = cursor.fetchone()
    total_spent = purchase_stats['total_purchases'] or 0

    # Calculate total remaining by summing all transactions
    cursor = conn.execute("""
        SELECT SUM(total_amount) as total_remaining
        FROM transactions
    """)
    remaining_stats = cursor.fetchone()
    total_remaining = remaining_stats['total_remaining'] or 0

    # Calculate accounts with negative balances
    cursor = conn.execute("SELECT id FROM accounts")
    all_accounts = cursor.fetchall()

    negative_count = 0
    total_negative_amount = 0.0

    for account in all_accounts:
        balance = calculate_account_balance(conn, account['id'])
        if balance < 0:
            negative_count += 1
            total_negative_amount += balance

    # Transaction stats
    cursor = conn.execute("""
        SELECT COUNT(*) as count, MIN(created_at) as first, MAX(created_at) as last
        FROM transactions
    """)

    trans_stats = cursor.fetchone()

    summary = {
        'total_accounts': total_accounts,
        'total_prepaid': total_prepaid,
        'total_spent': total_spent,
        'total_remaining': total_remaining,
        'accounts_with_negative_balance': negative_count,
        'total_negative_amount': total_negative_amount,
        'transaction_count': trans_stats['count'],
        'date_range': {
            'start': trans_stats['first'],
            'end': trans_stats['last']
        }
    }

    conn.close()
    return jsonify(summary)

@app.route('/api/reports/sales', methods=['GET'])
def get_sales_report():
    """Get product sales report"""
    conn = get_db()
    
    cursor = conn.execute("""
        SELECT 
            ti.product_name,
            SUM(ti.quantity) as total_quantity,
            SUM(ti.line_total) as total_revenue,
            COUNT(DISTINCT ti.transaction_id) as transaction_count
        FROM transaction_items ti
        GROUP BY ti.product_name
        ORDER BY total_revenue DESC
    """)
    
    sales = []
    for row in cursor.fetchall():
        sales.append({
            'product_name': row['product_name'],
            'total_quantity': row['total_quantity'],
            'total_revenue': row['total_revenue'],
            'transaction_count': row['transaction_count']
        })
    
    conn.close()
    return jsonify({'sales': sales})

@app.route('/api/reports/daily-sales', methods=['GET'])
def get_daily_sales_report():
    """Get daily sales breakdown by category for the last 14 days"""
    from datetime import datetime, timedelta

    conn = get_db()

    # Calculate date range using local time (14 days including today)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=13)

    # Get sales by day and category for the last 14 days (including today)
    cursor = conn.execute("""
        SELECT
            DATE(t.created_at) as sale_date,
            c.name as category_name,
            SUM(ti.line_total) as category_total
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE t.transaction_type = 'purchase'
          AND DATE(t.created_at) >= ?
        GROUP BY DATE(t.created_at), c.name
        ORDER BY sale_date DESC, c.name
    """, (start_date.strftime('%Y-%m-%d'),))

    daily_sales = {}
    categories_set = set()

    for row in cursor.fetchall():
        date = row['sale_date']
        category = row['category_name']
        total = row['category_total']

        if date not in daily_sales:
            daily_sales[date] = {}

        daily_sales[date][category] = total
        categories_set.add(category)

    conn.close()

    # Convert to sorted list of categories
    categories = sorted(list(categories_set))

    # Format the data for the chart
    result = {
        'categories': categories,
        'daily_data': []
    }

    # Determine the actual date range to display
    # Use the max date from actual sales data, or end_date if no sales yet
    actual_dates = list(daily_sales.keys())
    if actual_dates:
        max_sale_date = max(actual_dates)
        # Use the later of end_date or max sale date (in case DB is in GMT and ahead)
        display_end_date = max(end_date, datetime.strptime(max_sale_date, '%Y-%m-%d').date())
    else:
        display_end_date = end_date

    # Get all dates for the last 14 days (even if no sales)
    current_date = start_date
    while current_date <= display_end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        day_data = {
            'date': date_str,
            'totals': {}
        }

        # Add category totals for this day (0 if no sales)
        for category in categories:
            day_data['totals'][category] = daily_sales.get(date_str, {}).get(category, 0)

        result['daily_data'].append(day_data)
        current_date += timedelta(days=1)

    return jsonify(result)

# ============================================================================
# Backup Routes
# ============================================================================

@app.route('/api/backup/create', methods=['POST'])
@admin_required
def create_backup():
    """Create manual backup"""
    data = request.get_json()
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'backup_{timestamp}.db'
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    try:
        shutil.copy2(DB_PATH, backup_path)
        file_size = os.path.getsize(backup_path)
        
        # Log backup
        conn = get_db()
        conn.execute(
            """INSERT INTO backup_log (backup_type, backup_path, status, file_size)
               VALUES (?, ?, ?, ?)""",
            ('local', backup_path, 'success', file_size)
        )
        conn.commit()
        conn.close()
        
        # Internet backup if requested
        if data.get('include_internet'):
            # TODO: Implement cloud backup (S3, SFTP, etc.)
            pass
        
        return jsonify({
            'success': True,
            'backup_file': backup_filename,
            'file_size': file_size,
            'backup_path': BACKUP_DIR
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backup/list', methods=['GET'])
@admin_required
def list_backups():
    """List all backups"""
    conn = get_db()
    cursor = conn.execute(
        "SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 50"
    )
    
    backups = []
    for row in cursor.fetchall():
        backups.append({
            'id': row['id'],
            'backup_type': row['backup_type'],
            'backup_path': row['backup_path'],
            'status': row['status'],
            'file_size': row['file_size'],
            'created_at': row['created_at']
        })
    
    conn.close()
    return jsonify({'backups': backups})

# ============================================================================
# Settings Routes
# ============================================================================

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    """Get all settings (all authenticated users can read)"""
    conn = get_db()
    cursor = conn.execute("SELECT key, value FROM settings")
    
    settings = {}
    for row in cursor.fetchall():
        if row['key'] != 'admin_password':  # Don't expose password
            settings[row['key']] = row['value']
    
    conn.close()
    return jsonify(settings)

@app.route('/api/settings', methods=['PUT'])
@admin_required
def update_settings():
    """Update settings"""
    data = request.get_json()
    
    conn = get_db()
    for key, value in data.items():
        conn.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP""",
            (key, value, value)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================================================
# Serve POS Interface
# ============================================================================

@app.route('/')
def serve_pos():
    """Serve the POS interface"""
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory(STATIC_DIR, path)

# ============================================================================
# Scheduled Tasks
# ============================================================================

def scheduled_backup():
    """Perform automated daily backup"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'backup_auto_{timestamp}.db'
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    try:
        shutil.copy2(DB_PATH, backup_path)
        file_size = os.path.getsize(backup_path)
        
        conn = get_db()
        conn.execute(
            """INSERT INTO backup_log (backup_type, backup_path, status, file_size)
               VALUES (?, ?, ?, ?)""",
            ('local', backup_path, 'success', file_size)
        )
        conn.commit()
        conn.close()
        
        print(f"Automated backup created: {backup_filename}")
    except Exception as e:
        print(f"Backup failed: {e}")

def run_scheduler():
    """Run scheduled tasks"""
    schedule.every().day.at("00:00").do(scheduled_backup)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

# ============================================================================
# Application Entry Point
# ============================================================================

if __name__ == '__main__':
    # Initialize database if it doesn't exist
    if not os.path.exists(DB_PATH):
        init_db()
    
    # Start scheduler in background thread
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # Run server (allow_unsafe_werkzeug for development/testing)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
