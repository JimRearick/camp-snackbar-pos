-- Camp Snack Bar Database Schema
-- Complete schema with all tables including RBAC and prep queue

-- Users table (RBAC - Role-Based Access Control)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'pos', 'prep')),
    full_name TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Accounts table (families or individuals)
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('family', 'individual')),
    family_members TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    inventory_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT 0,
    requires_prep BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase', 'payment', 'adjustment')),
    total_amount REAL NOT NULL,
    operator_name TEXT,
    notes TEXT,
    has_been_adjusted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Transaction items table
CREATE TABLE transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Prep queue table (kitchen display system)
CREATE TABLE prep_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    transaction_item_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup log table
CREATE TABLE backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type TEXT NOT NULL CHECK(backup_type IN ('local', 'internet')),
    backup_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
    file_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_name ON accounts(account_name);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_prep_queue_status ON prep_queue(status, ordered_at);

-- Default data: Users (password: admin)
INSERT INTO users (username, password_hash, role, full_name, is_active) VALUES
    ('admin', 'scrypt:32768:8:1$9yT7OfmFVK2Eb6QE$f475495ca5a95d1fb8406422998848ecec0737a3dbf7df07cb6b4d68eb192b84d7760db0c326bef1b0da9b49b2d23fccf5fff4d667e9126998300419f21dedb0', 'admin', 'Administrator', 1);

-- Default data: Categories
INSERT INTO categories (name, display_order) VALUES
    ('Candy', 1),
    ('Soda', 2),
    ('Drinks', 3),
    ('Grill', 4);

-- Default data: Products
INSERT INTO products (category_id, name, price, display_order, requires_prep) VALUES
    (1, 'Chocolate Bar', 1.50, 1, 0),
    (1, 'Gummy Bears', 1.25, 2, 0),
    (1, 'Skittles', 1.25, 3, 0),
    (2, 'Coca-Cola', 2.00, 1, 0),
    (2, 'Sprite', 2.00, 2, 0),
    (2, 'Root Beer', 2.00, 3, 0),
    (3, 'Bottled Water', 1.50, 1, 0),
    (3, 'Gatorade', 2.50, 2, 0),
    (3, 'Juice Box', 1.75, 3, 0),
    (4, 'Hamburger', 5.00, 1, 1),
    (4, 'Hot Dog', 3.50, 2, 1);

-- Default data: Settings
INSERT INTO settings (key, value) VALUES
    ('currency_symbol', '$'),
    ('camp_name', 'Summer Camp Snack Bar'),
    ('backup_enabled', 'true'),
    ('backup_time', '00:00'),
    ('internet_backup_url', '');
