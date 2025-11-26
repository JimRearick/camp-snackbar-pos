# Camp Snack Bar POS - Project Structure

This document describes the complete file and directory structure of the Camp Snack Bar POS System.

---

## 📁 Directory Tree

```
camp-snackbar/
├── README.md                          # Project overview and quick start
├── SETUP_GUIDE.md                     # Detailed installation instructions
├── DEPLOYMENT_CHECKLIST.md            # Pre-deployment verification guide
├── PROJECT_STRUCTURE.md               # This file
├── docker-compose.yml                 # Docker Compose configuration
├── Dockerfile                         # Docker image definition
│
├── backend/                           # Python Flask backend
│   ├── app.py                         # Main Flask application
│   ├── schema.sql                     # Database schema definition
│   └── requirements.txt               # Python dependencies
│
├── frontend/                          # React frontend application
│   ├── package.json                   # Node.js dependencies and scripts
│   ├── package-lock.json             # Locked dependency versions
│   ├── .gitignore                    # Git ignore rules for node_modules
│   │
│   ├── public/                       # Static assets
│   │   ├── index.html                # HTML entry point
│   │   ├── favicon.ico               # Browser tab icon
│   │   ├── manifest.json             # PWA manifest
│   │   └── robots.txt                # Search engine rules
│   │
│   └── src/                          # React source code
│       ├── index.js                  # React entry point
│       ├── App.js                    # Main application component
│       ├── App.css                   # Global application styles
│       │
│       └── components/               # React components
│           ├── POSScreen.js          # Point of Sale interface
│           ├── POSScreen.css         # POS styling
│           ├── AccountList.js        # Account selection screen
│           ├── AccountList.css       # Account list styling
│           ├── AccountDetail.js      # Account detail view
│           ├── AccountDetail.css     # Account detail styling
│           ├── AdminLogin.js         # Admin authentication
│           ├── AdminLogin.css        # Login screen styling
│           ├── AdminPanel.js         # Admin management interface
│           ├── AdminPanel.css        # Admin panel styling
│           ├── Reports.js            # Reports and analytics
│           └── Reports.css           # Reports styling
│
├── data/                             # SQLite database storage (created at runtime)
│   ├── .gitkeep                      # Keep directory in git
│   └── camp_snackbar.db              # SQLite database (created automatically)
│
└── backups/                          # Automated backup storage (created at runtime)
    ├── .gitkeep                      # Keep directory in git
    └── backup_YYYYMMDD_HHMMSS.db     # Timestamped backup files
```

---

## 📄 File Descriptions

### Root Level Files

#### `README.md`
- Project overview
- Quick start instructions
- Feature highlights
- Technology stack information

#### `SETUP_GUIDE.md`
- Detailed installation steps
- Debian/Linux setup instructions
- Raspberry Pi deployment guide
- Tablet configuration
- Network setup
- Troubleshooting guide

#### `DEPLOYMENT_CHECKLIST.md`
- Pre-deployment tasks
- Day-of-camp procedures
- Daily operations checklist
- End-of-camp procedures
- Security considerations

#### `PROJECT_STRUCTURE.md`
- This file
- Complete directory layout
- File-by-file descriptions
- Architecture overview

#### `docker-compose.yml`
- Docker container orchestration
- Service definitions
- Port mappings
- Volume mounts
- Environment variables

#### `Dockerfile`
- Multi-stage Docker build
- Frontend build stage (Node.js)
- Backend runtime stage (Python)
- Dependency installation
- Container configuration

---

## 🐍 Backend Files (`backend/`)

### `app.py` (Main Application)
**Size**: ~500-800 lines  
**Purpose**: Flask REST API server

**Key Components**:
- Flask application initialization
- SQLite database connection handling
- CORS configuration for frontend
- API endpoint definitions:
  - `/api/accounts` - Account CRUD operations
  - `/api/accounts/<id>/transactions` - Transaction history
  - `/api/products` - Product management
  - `/api/transactions` - Create new transactions
  - `/api/reports/summary` - Analytics and reporting
  - `/api/reports/export` - CSV export
  - `/api/admin/login` - Admin authentication
  - `/api/backup` - Database backup creation
- Database initialization on first run
- Automatic backup scheduling
- Error handling and logging

### `schema.sql`
**Size**: ~100 lines  
**Purpose**: Database structure definition

**Tables Defined**:
- `accounts` - Customer account information
  - id, name, account_type, prepaid_amount, balance, etc.
- `products` - Snack bar inventory
  - id, name, category, price, inventory
- `transactions` - Purchase records
  - id, account_id, total_amount, created_at
- `transaction_items` - Line items per transaction
  - id, transaction_id, product_id, quantity, price
- `settings` - System configuration
  - key, value (stores admin password, etc.)

**Indexes**:
- Performance optimization for common queries
- Foreign key relationships

### `requirements.txt`
**Purpose**: Python package dependencies

**Key Dependencies**:
- `Flask` - Web framework
- `Flask-CORS` - Cross-origin resource sharing
- `gunicorn` - Production WSGI server
- Standard library: `sqlite3`, `datetime`, `json`

---

## ⚛️ Frontend Files (`frontend/`)

### Root Frontend Files

#### `package.json`
**Purpose**: Node.js project configuration

**Key Scripts**:
- `start` - Development server
- `build` - Production build
- `test` - Run tests
- `eject` - Eject from Create React App

**Dependencies**:
- `react` - UI framework
- `react-dom` - React DOM rendering
- `react-scripts` - Build tooling

#### `public/index.html`
**Purpose**: HTML entry point

**Features**:
- Meta tags for responsive design
- App title and description
- Root div for React mounting
- Manifest link for PWA support

#### `public/manifest.json`
**Purpose**: Progressive Web App configuration

**Defines**:
- App name and short name
- Icon configuration
- Display mode (standalone for app-like experience)
- Theme colors

### Source Files (`frontend/src/`)

#### `index.js`
**Size**: ~10 lines  
**Purpose**: React application entry point

**Functions**:
- Import React and ReactDOM
- Mount App component to root div
- Strict mode wrapping

#### `App.js`
**Size**: ~150 lines  
**Purpose**: Main application controller

**Responsibilities**:
- Route management between screens
- Global state management (selected account, cart, admin status)
- Navigation logic
- Header and footer rendering
- Screen component orchestration

#### `App.css`
**Size**: ~300-400 lines  
**Purpose**: Global application styles

**Includes**:
- CSS reset and base styles
- App layout (header, main, footer)
- Global button styles
- Card components
- Form elements
- Utility classes
- Responsive breakpoints
- Loading spinner animation

### Component Files (`frontend/src/components/`)

#### `POSScreen.js` + `POSScreen.css`
**Component Size**: ~250 lines  
**Style Size**: ~400 lines  
**Purpose**: Point of Sale transaction interface

**Features**:
- Product grid organized by category
- Shopping cart with add/remove items
- Account selection
- Checkout functionality
- Real-time total calculation
- Transaction submission

#### `AccountList.js` + `AccountList.css`
**Component Size**: ~150 lines  
**Style Size**: ~350 lines  
**Purpose**: Account selection and search

**Features**:
- Account search functionality
- Sort by name or balance
- Account cards with key info
- Select for POS or view details
- Responsive grid layout

#### `AccountDetail.js` + `AccountDetail.css`
**Component Size**: ~180 lines  
**Style Size**: ~400 lines  
**Purpose**: Detailed account view

**Features**:
- Account summary statistics
- Complete transaction history
- Itemized transaction details
- Balance tracking
- Notes display

#### `AdminLogin.js` + `AdminLogin.css`
**Component Size**: ~120 lines  
**Style Size**: ~250 lines  
**Purpose**: Admin authentication

**Features**:
- Virtual numeric keypad
- Password masking
- No keyboard required
- Touch-optimized
- Clear and backspace buttons

#### `AdminPanel.js` + `AdminPanel.css`
**Component Size**: ~350 lines  
**Style Size**: ~400 lines  
**Purpose**: System administration

**Features**:
- Tabbed interface (Accounts/Products)
- Create/Edit/Delete accounts
- Create/Edit/Delete products
- Form validation
- Inline editing
- Backup creation

#### `Reports.js` + `Reports.css`
**Component Size**: ~300 lines  
**Style Size**: ~450 lines  
**Purpose**: Analytics and reporting

**Features**:
- Date range filtering
- Summary statistics cards
- Top products table
- Account balance summaries
- Revenue by category chart
- Top accounts by spending
- CSV export functionality

---

## 💾 Data Files (`data/`)

### `camp_snackbar.db`
**Type**: SQLite database  
**Created**: Automatically on first run  
**Size**: Varies (typically 1-50 MB)

**Contents**:
- All account information
- All product data
- Complete transaction history
- Transaction line items
- System settings

**Backup**: 
- Automated daily at midnight
- Manual backup available in admin panel

### `.gitkeep`
**Purpose**: Preserve empty directory in Git
**Size**: 0 bytes

---

## 💾 Backup Files (`backups/`)

### Backup Naming Convention
`backup_YYYYMMDD_HHMMSS.db`

Example: `backup_20240615_000001.db`

**Creation**:
- Automatically at midnight daily
- Manually via admin panel
- Before major operations (end of camp)

**Retention**:
- Keep all backups during camp session
- Archive after camp ends
- Store on external media

### `.gitkeep`
**Purpose**: Preserve empty directory in Git
**Size**: 0 bytes

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend**:
- Python 3.9+
- Flask (Web framework)
- SQLite (Database)
- Gunicorn (WSGI server)

**Frontend**:
- React 18+
- JavaScript (ES6+)
- CSS3 (Flexbox, Grid)
- Fetch API (HTTP requests)

**Infrastructure**:
- Docker (Containerization)
- Docker Compose (Orchestration)
- Nginx (Static file serving, built into container)

### Data Flow

```
Tablet Browser
      ↓
  React Frontend (Port 5000)
      ↓
  Flask REST API
      ↓
  SQLite Database
      ↓
  Backup System
```

### Request Flow Example

1. **User Action**: Staff taps "Checkout" button
2. **Frontend**: React sends POST to `/api/transactions`
3. **Backend**: Flask validates and processes request
4. **Database**: SQLite inserts transaction records
5. **Response**: Success/failure returned to frontend
6. **UI Update**: React updates cart and balance display

---

## 📦 Docker Architecture

### Multi-Stage Build

**Stage 1: Frontend Build**
- Uses `node:16-alpine`
- Installs npm dependencies
- Builds React production bundle
- Outputs to `/app/frontend/build`

**Stage 2: Backend Runtime**
- Uses `python:3.9-slim`
- Copies frontend build from Stage 1
- Installs Python dependencies
- Configures Flask application
- Exposes port 5000

### Container Volumes

**Data Volume**: `./data:/app/data`
- Persists database across container restarts
- Survives container recreation

**Backup Volume**: `./backups:/app/backups`
- Stores automated backups
- Easy access from host system

---

## 🔧 Configuration Files

### Environment Variables (in docker-compose.yml)
- `FLASK_APP=backend/app.py`
- `FLASK_ENV=production`
- Port mapping: `5000:5000`

### Runtime Configuration
- Admin password stored in database
- No hardcoded credentials in code
- All config via database or environment

---

## 📊 File Size Summary

| Component | Approx Size |
|-----------|-------------|
| Backend Code | ~50 KB |
| Frontend Source | ~150 KB |
| Frontend Build | ~500 KB |
| Database (empty) | ~50 KB |
| Database (full camp) | 1-50 MB |
| Docker Image | ~500 MB |
| Total Project | ~600 MB |

---

## 🔐 Security Considerations

### File Permissions
- Database file: Read/write for app user only
- Backup files: Read/write for app user only
- Application code: Read-only in container

### Sensitive Data
- Admin password hashed in database
- No credentials in source code
- No API keys required (local-only system)
- Database not exposed outside container

---

## 🚀 Deployment Files

The application is deployed as a single Docker container containing:
1. Flask backend server
2. React frontend (built static files)
3. Gunicorn WSGI server
4. All dependencies

**Single Command Deployment**:
```bash
docker-compose up -d
```

This starts the entire application stack with proper networking, volumes, and configuration.

---

## 📝 Notes for Developers

### Adding New Features

**Backend**:
1. Add endpoint to `backend/app.py`
2. Update database schema in `schema.sql` if needed
3. Test with curl or Postman
4. Document in API section

**Frontend**:
1. Create new component in `frontend/src/components/`
2. Add corresponding CSS file
3. Import in `App.js`
4. Add to routing logic
5. Test on tablet-sized viewport

### Modifying Database

1. Update `schema.sql`
2. Create migration script if needed
3. Test with sample data
4. Document changes
5. Backup existing data before deploying

### Styling Changes

- Global styles: Edit `App.css`
- Component styles: Edit component-specific CSS
- Maintain mobile-first responsive design
- Test on actual tablet devices

---

This structure is designed for simplicity, maintainability, and ease of deployment on resource-constrained hardware like Raspberry Pi.