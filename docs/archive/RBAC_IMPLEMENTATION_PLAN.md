# RBAC Implementation Plan - Camp Snackbar POS

## Overview
Implement Role-Based Access Control (RBAC) using Flask-Login with two roles: **POS** and **Admin**. Unify authentication across all pages and secure all API endpoints.

---

## Current State Analysis

### Current Authentication:
- ✅ **Admin**: Token-based (localStorage), 8-hour sessions
- ❌ **POS**: No authentication (open access)
- ❌ **Prep Station**: No authentication (open access)
- ❌ **Reports**: No authentication (open access)

### Current Issues:
1. POS station is completely open - anyone can make purchases
2. Different auth systems (admin uses tokens, others have nothing)
3. No user accounts - only single admin password
4. No audit trail of who performed actions
5. Mixed API security - some endpoints require auth, some don't

---

## Target Architecture

### User Roles:
```
┌─────────────┐
│   ADMIN     │ - Full access to everything
│             │ - Manage users, products, categories, accounts
│             │ - View reports, transactions
│             │ - Manage prep queue
└─────────────┘

┌─────────────┐
│     POS     │ - Access POS interface only
│             │ - Create purchases
│             │ - View/create accounts
│             │ - Cannot access admin, reports, or prep
└─────────────┘

┌─────────────┐
│    PREP     │ - Access prep station only
│  (Optional) │ - View and manage prep queue
│             │ - Mark items as completed
└─────────────┘
```

### Authentication Flow:
```
1. User visits any page (/, /admin.html, /prep.html, /reports.html)
   ↓
2. Check if authenticated (session cookie exists)
   ↓
   NO → Redirect to /login
   ↓
   YES → Check role permissions for requested page
   ↓
   ALLOWED → Show page
   ↓
   DENIED → Show "Access Denied" or redirect to allowed page
```

---

## Implementation Plan

### Phase 1: Database Schema Changes (2-3 hours)

#### 1.1 Create Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt hash
    role TEXT NOT NULL CHECK(role IN ('admin', 'pos', 'prep')),
    full_name TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create default admin user
INSERT INTO users (username, password_hash, role, full_name)
VALUES ('admin', '$2b$12$...bcrypt_hash_of_camp2024...', 'admin', 'Administrator');

-- Create default POS user
INSERT INTO users (username, password_hash, role, full_name)
VALUES ('pos', '$2b$12$...bcrypt_hash_of_pos2024...', 'pos', 'POS Terminal');
```

#### 1.2 Create Sessions Table (Replace admin_sessions)
```sql
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

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
```

#### 1.3 Add Audit Columns to Transactions
```sql
ALTER TABLE transactions ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN created_by_username TEXT;  -- Denormalized for historical data

-- Backfill existing transactions
UPDATE transactions SET created_by_username = 'legacy_admin';
```

#### 1.4 Migration Script
**File:** `backend/migrations/add_rbac.py`

```python
#!/usr/bin/env python3
"""
Migration: Add RBAC (users, sessions, audit columns)
"""
import sqlite3
import bcrypt
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'camp_snackbar.db')

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'pos', 'prep')),
                full_name TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)

        # 2. Create default users
        admin_hash = hash_password('camp2024')
        pos_hash = hash_password('pos2024')

        cursor.execute("""
            INSERT OR IGNORE INTO users (username, password_hash, role, full_name)
            VALUES (?, ?, 'admin', 'Administrator')
        """, ('admin', admin_hash))

        cursor.execute("""
            INSERT OR IGNORE INTO users (username, password_hash, role, full_name)
            VALUES (?, ?, 'pos', 'POS Terminal')
        """, ('pos', pos_hash))

        # 3. Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)")

        # 4. Add audit columns to transactions
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN created_by INTEGER REFERENCES users(id)")
        except sqlite3.OperationalError:
            pass  # Column already exists

        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN created_by_username TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

        # 5. Backfill existing transactions
        cursor.execute("UPDATE transactions SET created_by_username = 'legacy_admin' WHERE created_by_username IS NULL")

        # 6. Drop old admin_sessions table (optional - keep for backup)
        # cursor.execute("DROP TABLE IF EXISTS admin_sessions")

        conn.commit()
        print("✅ RBAC migration completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
```

---

### Phase 2: Backend - Flask-Login Setup (3-4 hours)

#### 2.1 Install Dependencies
**Update:** `backend/requirements.txt`
```
Flask==3.0.0
flask-cors==4.0.0
flask-socketio==5.3.5
flask-login==0.6.3        # ADD THIS
bcrypt==4.1.2             # ADD THIS
python-socketio==5.10.0
schedule==1.2.0
gunicorn==21.2.0
eventlet==0.33.3
```

#### 2.2 Create User Model
**File:** `backend/models/user.py`

```python
from flask_login import UserMixin
from datetime import datetime, timedelta
import bcrypt
import secrets

class User(UserMixin):
    def __init__(self, id, username, password_hash, role, full_name, is_active, created_at, last_login):
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.is_active = is_active
        self.created_at = created_at
        self.last_login = last_login

    def check_password(self, password):
        """Verify password against hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )

    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role

    def has_any_role(self, *roles):
        """Check if user has any of the specified roles"""
        return self.role in roles

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_pos(self):
        return self.role == 'pos'

    @property
    def is_prep(self):
        return self.role == 'prep'

    def get_id(self):
        """Required by Flask-Login"""
        return str(self.id)

    @staticmethod
    def get_by_id(conn, user_id):
        """Load user by ID"""
        cursor = conn.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            return User(**dict(row))
        return None

    @staticmethod
    def get_by_username(conn, username):
        """Load user by username"""
        cursor = conn.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        )
        row = cursor.fetchone()
        if row:
            return User(**dict(row))
        return None

    @staticmethod
    def authenticate(conn, username, password):
        """Authenticate user and return User object if valid"""
        user = User.get_by_username(conn, username)
        if user and user.check_password(password):
            # Update last login
            conn.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                (user.id,)
            )
            conn.commit()
            return user
        return None
```

#### 2.3 Update app.py - Flask-Login Integration
**File:** `backend/app.py`

```python
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from functools import wraps
import bcrypt

# Import User model
from models.user import User

app = Flask(__name__, static_folder='../static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

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

# Role-based access decorators
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
```

#### 2.4 Update Authentication Routes
**File:** `backend/app.py` (auth routes section)

```python
# ============================================================================
# Authentication Routes
# ============================================================================

@app.route('/login')
def login_page():
    """Serve login page"""
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/api/auth/login', methods=['POST'])
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
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'full_name': user.full_name
            },
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
def get_current_user():
    """Get current logged-in user info"""
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'role': current_user.role,
        'full_name': current_user.full_name,
        'last_login': current_user.last_login
    })

def get_redirect_for_role(role):
    """Determine where to redirect user based on role"""
    if role == 'admin':
        return '/admin.html'
    elif role == 'pos':
        return '/index.html'  # POS page
    elif role == 'prep':
        return '/prep.html'
    return '/'
```

#### 2.5 Update API Endpoints with Role Checks
**File:** `backend/app.py`

```python
# Example: Products endpoint (admin only)
@app.route('/api/products', methods=['GET'])
@login_required  # All authenticated users can view products
def get_products():
    # ... existing code ...

@app.route('/api/products', methods=['POST'])
@admin_required  # Only admin can create products
def create_product():
    # ... existing code ...

# Example: Transactions endpoint (POS and admin)
@app.route('/api/transactions', methods=['POST'])
@pos_or_admin_required  # POS and admin can create transactions
def create_transaction():
    data = request.get_json()

    # Add audit trail
    data['created_by'] = current_user.id
    data['created_by_username'] = current_user.username

    # ... existing transaction creation code ...

# Example: Reports endpoint (admin only)
@app.route('/api/reports/daily', methods=['GET'])
@admin_required
def get_daily_report():
    # ... existing code ...

# Example: Accounts endpoint (different permissions for different methods)
@app.route('/api/accounts', methods=['GET'])
@login_required  # All authenticated users can view accounts
def get_accounts():
    # ... existing code ...

@app.route('/api/accounts', methods=['POST'])
@pos_or_admin_required  # POS and admin can create accounts
def create_account():
    # ... existing code ...

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
@admin_required  # Only admin can edit accounts
def update_account(account_id):
    # ... existing code ...
```

---

### Phase 3: Frontend - Unified Login Page (2-3 hours)

#### 3.1 Create Login Page
**File:** `static/login.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Camp Snackbar POS</title>
    <link rel="stylesheet" href="css/styles.css">
    <style>
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
        }
        .form-group label {
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        .form-group input {
            padding: 0.75rem;
            font-size: 1rem;
            border: 2px solid #ddd;
            border-radius: 6px;
        }
        .login-button {
            padding: 1rem;
            font-size: 1.1rem;
            font-weight: 600;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 1rem;
        }
        .login-button:hover {
            background: #1976D2;
        }
        .error-message {
            color: #f44336;
            text-align: center;
            padding: 0.75rem;
            background: #ffebee;
            border-radius: 6px;
            display: none;
        }
        .error-message.visible {
            display: block;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🏕️ Camp Snackbar POS</h1>
            <p>Please log in to continue</p>
        </div>

        <div id="errorMessage" class="error-message"></div>

        <form id="loginForm" class="login-form">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autofocus>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>

            <button type="submit" class="login-button">Log In</button>
        </form>
    </div>

    <script type="module">
        import { apiPost } from './js/utils/api.js';

        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await apiPost('/auth/login', { username, password });

                if (response.success) {
                    // Redirect to appropriate page based on role
                    window.location.href = response.redirect;
                } else {
                    showError(response.error || 'Login failed');
                }
            } catch (error) {
                showError('Login failed. Please try again.');
                console.error('Login error:', error);
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('visible');

            setTimeout(() => {
                errorMessage.classList.remove('visible');
            }, 5000);
        }
    </script>
</body>
</html>
```

#### 3.2 Create Auth Utility Module
**File:** `static/js/utils/auth.js`

```javascript
// Authentication utility functions

const API_URL = window.location.origin + '/api';

export async function checkAuth() {
    /**
     * Check if user is authenticated
     * Returns user object if authenticated, null otherwise
     */
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'  // Include session cookie
        });

        if (response.ok) {
            return await response.json();
        }

        return null;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

export async function requireAuth(allowedRoles = null) {
    /**
     * Require authentication and optionally check role
     * Redirects to login if not authenticated or insufficient permissions
     *
     * @param {Array|string|null} allowedRoles - Role(s) allowed to access
     * @returns {Object} Current user if authorized
     */
    const user = await checkAuth();

    if (!user) {
        // Not authenticated - redirect to login
        window.location.href = '/login';
        return null;
    }

    if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(user.role)) {
            // Insufficient permissions
            alert('You do not have permission to access this page');
            window.location.href = getDefaultPageForRole(user.role);
            return null;
        }
    }

    return user;
}

export async function logout() {
    /**
     * Log out current user
     */
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    window.location.href = '/login';
}

function getDefaultPageForRole(role) {
    switch (role) {
        case 'admin':
            return '/admin.html';
        case 'pos':
            return '/index.html';
        case 'prep':
            return '/prep.html';
        default:
            return '/login';
    }
}

export function displayUserInfo(user) {
    /**
     * Display current user info in UI (optional)
     */
    return `
        <div class="user-info">
            <span>${user.full_name || user.username}</span>
            <span class="role-badge">${user.role.toUpperCase()}</span>
            <button onclick="logout()">Logout</button>
        </div>
    `;
}
```

#### 3.3 Update API Utility to Include Credentials
**File:** `static/js/utils/api.js`

```javascript
const API_URL = window.location.origin + '/api';

export async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include'  // Include session cookie
    });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
}

export async function apiPost(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',  // Include session cookie
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return await response.json();
}

export async function apiPut(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return await response.json();
}

export async function apiDelete(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include'
    });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        throw new Error('Delete failed');
    }

    return await response.json();
}
```

#### 3.4 Update Each Page to Check Auth
**File:** `static/index.html` (POS page - top of file)

```html
<script type="module">
    import { requireAuth } from './js/utils/auth.js';

    // Require POS or Admin role
    const user = await requireAuth(['pos', 'admin']);

    if (user) {
        // Store current user globally
        window.currentUser = user;

        // Display user info in header (optional)
        document.getElementById('userInfo').innerHTML = `
            Logged in as: ${user.full_name} (${user.role})
            <button onclick="logout()">Logout</button>
        `;
    }
</script>
```

**File:** `static/admin.html` (Admin page - top of file)

```html
<script type="module">
    import { requireAuth } from './js/utils/auth.js';

    // Require Admin role only
    const user = await requireAuth('admin');

    if (user) {
        window.currentUser = user;
    }
</script>
```

**File:** `static/prep.html` (Prep page - top of file)

```html
<script type="module">
    import { requireAuth } from './js/utils/auth.js';

    // Require Prep or Admin role
    const user = await requireAuth(['prep', 'admin']);

    if (user) {
        window.currentUser = user;
    }
</script>
```

**File:** `static/reports.html` (Reports page - top of file)

```html
<script type="module">
    import { requireAuth } from './js/utils/auth.js';

    // Require Admin role only
    const user = await requireAuth('admin');

    if (user) {
        window.currentUser = user;
    }
</script>
```

---

### Phase 4: Remove Old Authentication System (1 hour)

#### 4.1 Remove Old Admin Auth Code
**File:** `static/js/admin.js`

```javascript
// REMOVE these lines:
// let authToken = localStorage.getItem('adminToken');
// async function login(event) { ... }
// localStorage.setItem('adminToken', authToken);

// REPLACE with:
import { requireAuth, logout } from './utils/auth.js';

// At top of file, check auth
const user = await requireAuth('admin');
if (!user) {
    // Will redirect to login
    throw new Error('Not authorized');
}

// Update logout function
window.logout = logout;

// Remove token from API calls - sessions handle this now
// BEFORE:
// headers: { 'Authorization': `Bearer ${authToken}` }

// AFTER:
// Just use credentials: 'include' (handled by api.js)
```

#### 4.2 Clean Up Database
```sql
-- Optional: Remove old admin_sessions table after testing
DROP TABLE IF EXISTS admin_sessions;

-- Optional: Remove settings-based password
DELETE FROM settings WHERE key = 'admin_password';
```

---

### Phase 5: Testing Plan (2-3 hours)

#### 5.1 Test Cases

**Authentication Tests:**
- [ ] Login with admin credentials redirects to /admin.html
- [ ] Login with pos credentials redirects to /index.html
- [ ] Invalid credentials show error message
- [ ] Session persists across page refreshes
- [ ] Logout clears session and redirects to login

**Authorization Tests:**
- [ ] Admin can access: /, /admin.html, /prep.html, /reports.html
- [ ] POS can access: /, cannot access /admin.html, /prep.html, /reports.html
- [ ] Unauthenticated user redirected to /login for all pages
- [ ] Direct API calls without auth return 401

**API Endpoint Tests:**
- [ ] POST /api/transactions requires pos or admin role
- [ ] POST /api/products requires admin role
- [ ] GET /api/reports/* requires admin role
- [ ] GET /api/accounts works for all authenticated users

**Audit Trail Tests:**
- [ ] Transactions show created_by_username
- [ ] Admin can see who performed actions
- [ ] Historical transactions show 'legacy_admin'

#### 5.2 Manual Testing Script
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"camp2024"}' \
  -c cookies.txt

# Test authenticated request
curl http://localhost:5000/api/auth/me \
  -b cookies.txt

# Test unauthorized access
curl http://localhost:5000/api/products \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  # Should return 401

# Test with session
curl http://localhost:5000/api/products \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -b cookies.txt
  # Should work if logged in as admin
```

---

## Implementation Timeline

### Estimated Time: 12-15 hours total

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 1 | Database schema changes | 2-3h | None |
| 2 | Flask-Login backend | 3-4h | Phase 1 |
| 3 | Unified login frontend | 2-3h | Phase 2 |
| 4 | Remove old auth system | 1h | Phase 3 |
| 5 | Testing | 2-3h | Phase 4 |
| 6 | Documentation | 1h | All |

### Suggested Schedule:
- **Day 1 (4-5h):** Phase 1 + start Phase 2
- **Day 2 (4-5h):** Complete Phase 2 + Phase 3
- **Day 3 (3-4h):** Phase 4 + Phase 5 + Documentation

---

## Rollback Plan

If issues arise during implementation:

1. **Keep backup of database before migration**
   ```bash
   cp backend/camp_snackbar.db backend/camp_snackbar.db.backup
   ```

2. **Git branch for RBAC work**
   ```bash
   git checkout -b feature/rbac
   ```

3. **Can revert to old system by:**
   - Restore database backup
   - Checkout main branch
   - Restart server

---

## Security Considerations

### ✅ Improvements This Adds:
- Password hashing with bcrypt
- Session-based auth (more secure than localStorage tokens)
- HttpOnly cookies (prevents XSS token theft)
- Role-based access control
- Audit trail of user actions
- Forced authentication for all pages

### ⚠️ Still Need to Address:
- CSRF protection (add Flask-WTF)
- Rate limiting on login endpoint
- Password complexity requirements
- Account lockout after failed attempts
- Password reset functionality
- Two-factor authentication (future)

---

## Post-Implementation Tasks

After RBAC is working:

1. **Create user management UI in admin panel**
   - Add/edit/disable users
   - Reset passwords
   - View login history

2. **Add audit logging**
   - Track all sensitive actions
   - View audit log in admin panel

3. **Implement password policies**
   - Minimum length, complexity
   - Password expiration
   - Password history

4. **Add session management**
   - View active sessions
   - Force logout all sessions
   - Session timeout warnings

---

## Questions to Answer Before Starting

1. **Do we want a PREP role, or should prep station be accessible by POS?**
   - Recommendation: Separate PREP role for better access control

2. **Should POS users be able to create new accounts, or just use existing?**
   - Current: POS can create accounts
   - Consider: Require admin approval for new accounts

3. **What should happen to existing admin_sessions?**
   - Option A: Migrate them to new user_sessions
   - Option B: Force all users to re-login (simpler, more secure)
   - Recommendation: Option B

4. **Default passwords acceptable, or generate unique on first run?**
   - Current plan: Default admin/pos passwords
   - Better: Force password change on first login

5. **Should we keep localStorage token system as fallback?**
   - Recommendation: No, fully commit to session-based auth

---

## Success Criteria

RBAC implementation is complete when:

- ✅ All pages require authentication
- ✅ Users can log in with username/password
- ✅ Admin can access all pages
- ✅ POS can only access POS page
- ✅ All API endpoints enforce role-based permissions
- ✅ Transactions record who created them
- ✅ Old authentication system removed
- ✅ All tests pass
- ✅ No security regressions

---

## Next Steps

1. Review this plan with stakeholders
2. Answer outstanding questions
3. Create git branch: `git checkout -b feature/rbac`
4. Run database backup
5. Begin Phase 1: Database migration

Ready to proceed? Let me know if you'd like me to start implementing!
