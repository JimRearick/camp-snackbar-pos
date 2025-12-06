-- Camp Snack Bar Database Schema

-- Accounts table (families or individuals)
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('family', 'individual')),
    family_members TEXT,
    current_balance REAL DEFAULT 0.0,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    inventory_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase', 'payment', 'adjustment')),
    total_amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    operator_name TEXT,
    notes TEXT,
    has_been_adjusted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

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

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_sessions (
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type TEXT NOT NULL CHECK(backup_type IN ('local', 'internet')),
    backup_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
    file_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_name ON accounts(account_name);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);

INSERT INTO categories (name, display_order) VALUES 
    ('Candy', 1),
    ('Soda', 2),
    ('Drinks', 3),
    ('Hot Food', 4);

INSERT INTO products (category_id, name, price, display_order) VALUES 
    (1, 'Chocolate Bar', 1.50, 1),
    (1, 'Gummy Bears', 1.25, 2),
    (1, 'Skittles', 1.25, 3),
    (2, 'Coca-Cola', 2.00, 1),
    (2, 'Sprite', 2.00, 2),
    (2, 'Root Beer', 2.00, 3),
    (3, 'Bottled Water', 1.50, 1),
    (3, 'Gatorade', 2.50, 2),
    (3, 'Juice Box', 1.75, 3),
    (4, 'Hamburger', 5.00, 1),
    (4, 'Hot Dog', 3.50, 2);

INSERT INTO settings (key, value) VALUES 
    ('admin_password', 'camp2024'),
    ('currency_symbol', '$'),
    ('camp_name', 'Summer Camp Snack Bar'),
    ('backup_enabled', 'true'),
    ('backup_time', '00:00'),
    ('internet_backup_url', '');
