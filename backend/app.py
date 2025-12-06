"""
Camp Snack Bar POS System - Main Flask Application
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
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

app = Flask(__name__, static_folder='../static', static_url_path='/static')
app.config['SECRET_KEY'] = secrets.token_hex(32)
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration - Simple local paths for Debian/Raspberry Pi deployment
DB_PATH = os.getenv('DB_PATH', 'camp_snackbar.db')
BACKUP_DIR = os.getenv('BACKUP_DIR', 'backups')
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')

# Create backup directory if it doesn't exist
os.makedirs(BACKUP_DIR, exist_ok=True)

# Session storage - using database for persistence across restarts
def get_active_sessions():
    """Get active sessions from database"""
    conn = get_db()
    cursor = conn.execute(
        "SELECT token, expires_at FROM admin_sessions WHERE expires_at > datetime('now')"
    )
    sessions = {row['token']: datetime.fromisoformat(row['expires_at']) for row in cursor.fetchall()}
    conn.close()
    return sessions

def save_session(token, expires_at):
    """Save session to database"""
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO admin_sessions (token, expires_at) VALUES (?, ?)",
        (token, expires_at.isoformat())
    )
    conn.commit()
    conn.close()

def delete_session(token):
    """Delete session from database"""
    conn = get_db()
    conn.execute("DELETE FROM admin_sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

# ============================================================================
# Database Helper Functions
# ============================================================================

def get_db():
    """Get database connection with timeout for better concurrency"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema"""
    with open('schema.sql', 'r') as f:
        schema = f.read()
    
    conn = get_db()
    conn.executescript(schema)
    conn.commit()
    conn.close()

# ============================================================================
# Authentication Decorator
# ============================================================================

def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({'error': 'Unauthorized - No token provided'}), 401

        # Check if session exists and is valid
        conn = get_db()
        cursor = conn.execute(
            "SELECT expires_at FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')",
            (token,)
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Unauthorized - Invalid or expired session'}), 401

        return f(*args, **kwargs)
    return decorated_function

# ============================================================================
# Authentication Routes
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Admin login"""
    data = request.get_json()
    password = data.get('password')
    
    conn = get_db()
    cursor = conn.execute("SELECT value FROM settings WHERE key = 'admin_password'")
    row = cursor.fetchone()
    conn.close()
    
    if row and row['value'] == password:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=8)
        save_session(token, expires_at)

        return jsonify({
            'success': True,
            'token': token,
            'expires_at': expires_at.isoformat()
        })
    
    return jsonify({'error': 'Invalid password'}), 401

# ============================================================================
# Account Routes
# ============================================================================

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """Get all accounts with optional search/filter"""
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
        accounts.append({
            'id': row['id'],
            'account_number': row['account_number'],
            'account_name': row['account_name'],
            'account_type': row['account_type'],
            'family_members': json.loads(row['family_members']) if row['family_members'] else [],
            'current_balance': row['current_balance'],
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
        'current_balance': row['current_balance'],
        'total_spent': abs(stats['total']) if stats['total'] else 0,
        'transaction_count': stats['count'],
        'created_at': row['created_at'],
        'notes': row['notes']
    }
    
    conn.close()
    return jsonify(account)

@app.route('/api/accounts', methods=['POST'])
@admin_required
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

        # Create account with 0 balance
        cursor = conn.execute(
            """INSERT INTO accounts (account_number, account_name, account_type, family_members, current_balance, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (account_number, data['account_name'], data['account_type'], family_members_json,
             0, data.get('notes', ''))
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
def create_account_pos():
    """Create new account from POS (no auth required)"""
    data = request.get_json()

    conn = get_db()

    try:
        # Generate unique account number
        cursor = conn.execute("SELECT MAX(CAST(SUBSTR(account_number, 2) AS INTEGER)) as max_num FROM accounts WHERE account_number LIKE 'A%'")
        row = cursor.fetchone()
        next_num = (row['max_num'] or 0) + 1
        account_number = f"A{next_num:03d}"

        family_members_json = json.dumps(data.get('family_members', []))

        # Create account with 0 balance
        cursor = conn.execute(
            """INSERT INTO accounts (account_number, account_name, account_type, family_members, current_balance, notes)
               VALUES (?, ?, ?, ?, 0, ?)""",
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
def update_account(account_id):
    """Update account"""
    data = request.get_json()
    
    conn = get_db()
    
    family_members_json = json.dumps(data.get('family_members', []))
    
    conn.execute(
        """UPDATE accounts 
           SET account_name = ?, account_type = ?, family_members = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (data['account_name'], data['account_type'], family_members_json, data.get('notes', ''), account_id)
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
def get_products():
    """Get all products grouped by category"""
    conn = get_db()
    
    cursor = conn.execute("SELECT * FROM categories WHERE active = 1 ORDER BY display_order")
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
                'active': bool(prod_row['active'])
            })
        
        categories.append({
            'id': cat_row['id'],
            'name': cat_row['name'],
            'products': products
        })
    
    conn.close()
    return jsonify({'categories': categories})

@app.route('/api/products', methods=['POST'])
@admin_required
def create_product():
    """Create new product"""
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO products (category_id, name, price, inventory_quantity, track_inventory, display_order)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (data['category_id'], data['name'], data['price'], data.get('inventory_quantity', 0),
         data.get('track_inventory', False), data.get('display_order', 0))
    )
    
    product_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    socketio.emit('product_created', {'product_id': product_id})
    
    return jsonify({'success': True, 'product_id': product_id}), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    """Update product"""
    data = request.get_json()

    conn = get_db()
    conn.execute(
        """UPDATE products
           SET name = ?, price = ?, category_id = ?, active = ?, inventory_quantity = ?, track_inventory = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (data['name'], data['price'], data.get('category_id'), data.get('active', 1), data.get('inventory_quantity', 0), data.get('track_inventory', False), product_id)
    )

    conn.commit()
    conn.close()

    socketio.emit('product_updated', {'product_id': product_id})

    return jsonify({'success': True})

# ============================================================================
# Category Routes
# ============================================================================

@app.route('/api/categories', methods=['POST'])
@admin_required
def create_category():
    """Create new category"""
    data = request.get_json()

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO categories (name) VALUES (?)",
        (data['name'],)
    )
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()

    socketio.emit('category_created', {'category_id': category_id})

    return jsonify({'success': True, 'category_id': category_id}), 201

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    """Update category"""
    data = request.get_json()

    conn = get_db()
    conn.execute(
        "UPDATE categories SET name = ? WHERE id = ?",
        (data['name'], category_id)
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
            'balance_after': row['balance_after'],
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
        'balance_after': row['balance_after'],
        'operator_name': row['operator_name'],
        'notes': row['notes'],
        'created_at': row['created_at'],
        'has_been_adjusted': bool(row['has_been_adjusted']) if 'has_been_adjusted' in row.keys() else False,
        'items': items
    }

    conn.close()
    return jsonify(transaction)

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    """Create new transaction"""
    data = request.get_json()
    
    conn = get_db()
    conn.execute("BEGIN")
    
    try:
        account_id = data['account_id']
        transaction_type = data['transaction_type']
        
        # Get current balance
        cursor = conn.execute("SELECT current_balance FROM accounts WHERE id = ?", (account_id,))
        row = cursor.fetchone()
        current_balance = row['current_balance']
        
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

        new_balance = current_balance + total_amount

        # Create transaction
        cursor = conn.execute(
            """INSERT INTO transactions (account_id, transaction_type, total_amount, balance_after, operator_name, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (account_id, transaction_type, total_amount, new_balance, data.get('operator_name', ''), data.get('notes', ''))
        )

        transaction_id = cursor.lastrowid

        # If this is a refund adjustment, mark the original transaction as adjusted
        if transaction_type == 'adjustment' and 'original_transaction_id' in data:
            conn.execute(
                "UPDATE transactions SET has_been_adjusted = 1 WHERE id = ?",
                (data['original_transaction_id'],)
            )
        
        # Add line items for purchases
        if transaction_type == 'purchase':
            for item in data['items']:
                cursor = conn.execute("SELECT name, price FROM products WHERE id = ?", (item['product_id'],))
                product = cursor.fetchone()
                
                line_total = product['price'] * item['quantity']
                
                conn.execute(
                    """INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, line_total)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (transaction_id, item['product_id'], product['name'], item['quantity'], product['price'], line_total)
                )
                
                # Update inventory if tracked
                conn.execute(
                    """UPDATE products 
                       SET inventory_quantity = inventory_quantity - ?
                       WHERE id = ? AND track_inventory = 1""",
                    (item['quantity'], item['product_id'])
                )
        
        # Update account balance
        conn.execute(
            "UPDATE accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_balance, account_id)
        )
        
        conn.commit()
        
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
# Report Routes
# ============================================================================

@app.route('/api/reports/summary', methods=['GET'])
def get_summary_report():
    """Get camp-wide summary"""
    conn = get_db()
    
    # Account stats
    cursor = conn.execute("""
        SELECT
            COUNT(*) as total_accounts,
            SUM(current_balance) as total_remaining,
            COUNT(CASE WHEN current_balance < 0 THEN 1 END) as negative_count,
            SUM(CASE WHEN current_balance < 0 THEN current_balance ELSE 0 END) as negative_total
        FROM accounts
    """)

    stats = cursor.fetchone()

    # Get total payments (funds added)
    cursor = conn.execute("""
        SELECT SUM(total_amount) as total_payments
        FROM transactions
        WHERE transaction_type = 'payment'
    """)

    payment_stats = cursor.fetchone()
    total_prepaid = payment_stats['total_payments'] or 0

    # Transaction stats
    cursor = conn.execute("""
        SELECT COUNT(*) as count, MIN(created_at) as first, MAX(created_at) as last
        FROM transactions
    """)

    trans_stats = cursor.fetchone()

    total_spent = total_prepaid - (stats['total_remaining'] or 0)
    
    summary = {
        'total_accounts': stats['total_accounts'],
        'total_prepaid': total_prepaid,
        'total_spent': total_spent,
        'total_remaining': stats['total_remaining'] or 0,
        'accounts_with_negative_balance': stats['negative_count'],
        'total_negative_amount': stats['negative_total'] or 0,
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
@admin_required
def get_settings():
    """Get all settings"""
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
