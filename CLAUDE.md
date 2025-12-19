# Camp Snackbar POS - AI Assistant Guidelines

## Project Overview
A Point of Sale system for summer camps to manage snack bar purchases, account balances, and prep queue for kitchen staff. Built with Python/Flask backend, vanilla JavaScript frontend, SQLite database, and deployed via Docker.

## UI/UX Principles

### Touch-First, Tablet-First Design
- **Target Devices**: 7-11" tablets (primary use case)
- **Touch Targets**: Large, easily tappable buttons and controls
- **No Keyboard Required**: Daily operations should work entirely without keyboard input
- **Simple, Focused Screens**: Minimize scrolling where possible
- **Fullscreen App-Like Experience**: Optimized for tablet viewport

### Design Philosophy
- Prioritize speed and efficiency for high-volume transaction environments
- Clear visual hierarchy with large text and spacing
- Immediate visual feedback for all user actions
- Minimal complexity - staff should learn the system in minutes

## Architecture & Technology

### Backend
- **Framework**: Python Flask with Flask-SocketIO for real-time updates
- **Database**: SQLite (single-file, no separate database server needed)
- **Authentication**: Session-based with role-based access control (admin, pos, prep)
- **API Style**: RESTful endpoints under `/api/`

### Frontend
- **JavaScript**: ES6 modules (no framework - vanilla JS)
- **CSS**: Custom CSS with mobile-first responsive design
- **Real-time**: Socket.IO for live prep queue updates
- **Security**: CSRF protection via token-based requests

### Deployment
- **Container**: Docker with docker-compose
- **Data Persistence**: Volume-mounted SQLite database
- **Build**: GitHub Actions workflow triggered by git tags
- **Registry**: GitHub Container Registry (ghcr.io)

## Code Organization

### Project Structure
```
/backend
  - app.py (main Flask application)
  - init_db.py (database initialization)
  - load_test_data.py (test data generator)
/static
  /css (stylesheets)
  /js (JavaScript modules)
    /utils (shared utilities: auth, csrf, escape, socket, etc.)
  /images (logos, icons)
  - *.html (page templates)
/data (SQLite database - Docker volume)
```

### File Naming Conventions
- Backend: `snake_case.py`
- Frontend: `kebab-case.html`, `kebab-case.css`, `camelCase.js`
- Keep filenames descriptive and consistent

## Security Guidelines

### Always Follow These Security Practices
1. **Input Validation**: Validate and sanitize ALL user inputs on the backend
2. **XSS Prevention**: Use `escapeHtml()` for all dynamic content in HTML
3. **CSRF Protection**: Use `fetchPost()`, `fetchPut()`, `fetchDelete()` utilities for mutations
4. **SQL Injection**: Use parameterized queries (never string concatenation)
5. **Authentication**: Verify user permissions on EVERY backend endpoint
6. **Password Handling**: Always use bcrypt for password hashing

### Security Implementations
- CSRF tokens required for all POST/PUT/DELETE requests
- HTML escaping utility for frontend rendering
- Input validation on both client and server side
- Rate limiting on authentication endpoints
- Secure session management

## Development Workflow

### Making Changes
1. **Read Before Writing**: Always read existing files before modifying
2. **Test Locally**: Use `docker compose up` to test changes
3. **Commit Messages**: Use clear, descriptive commit messages with Claude Code attribution
4. **Version Tagging**: Create git tags (v1.0.x) to trigger container builds
5. **No Over-Engineering**: Keep solutions simple and focused on the actual requirement

### Git Commit Pattern
```bash
git commit -m "$(cat <<'EOF'
Brief summary of changes

Detailed explanation of what changed and why.
Any breaking changes or migration notes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Release Pattern
1. Make and test changes
2. Commit changes with descriptive message
3. Create annotated tag: `git tag -a v1.0.x -m "Release notes"`
4. Push: `git push origin main && git push origin v1.0.x`
5. GitHub Actions builds and publishes container automatically

## Database Schema

### Key Tables
- **accounts**: Customer accounts (family, individual, cabin types)
- **products**: Snack bar inventory organized by categories
- **transactions**: Purchases and payments
- **transaction_items**: Line items for each transaction
- **prep_queue**: Kitchen prep queue with product/quantity/account
- **users**: Staff authentication and roles
- **settings**: System configuration (key-value pairs)

### Transaction Pattern
Always use transactions for multi-table operations:
```python
conn = get_db()
cursor = conn.cursor()
try:
    # Multiple database operations
    conn.commit()
except Exception as e:
    conn.rollback()
    raise
finally:
    conn.close()
```

## API Design Patterns

### Endpoint Structure
- `/api/products` - Product catalog (GET)
- `/api/accounts` - Account management (GET, POST, PUT)
- `/api/transactions` - Transaction history (GET, POST)
- `/api/prep-queue` - Kitchen prep queue (GET)
- `/api/prep-queue/:id/complete` - Complete prep item (POST)
- `/api/settings` - System settings (GET for all users, PUT for admin only)

### Authorization Levels
- **@login_required**: Any authenticated user (read operations, settings read)
- **@admin_required**: Admin users only (write operations, user management)
- **@pos_required**: POS users and above
- **@prep_required**: Prep users and above

### Response Format
```python
# Success
return jsonify({"message": "Success", "data": {...}}), 200

# Error
return jsonify({"error": "Error message"}), 400
```

## Frontend Patterns

### Module Structure
```javascript
// Import utilities
import { escapeHtml } from './utils/escape.js';
import { fetchPost } from './utils/csrf.js';

// State variables
let globalState = {};

// Functions
async function loadData() { ... }
function renderUI() { ... }

// Expose to window for HTML onclick handlers
window.functionName = functionName;
```

### Async/Await Pattern
```javascript
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/endpoint`);
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        showError('User-friendly error message');
    }
}
```

### Real-Time Updates
```javascript
// Listen for socket events
socket.on('event_name', () => {
    loadData(); // Refresh data when events occur
});
```

## Configuration & Settings

### Configurable Settings (in database)
- `camp_name`: Display name for the organization
- `currency_symbol`: Currency symbol ($, €, £, etc.)
- `backup_enabled`: Automatic backup flag (true/false)
- `backup_time`: Daily backup time (HH:MM format)
- `internet_backup_url`: Optional remote backup URL
- `prep_queue_warning_time`: Minutes before items turn yellow (default: 2)
- `prep_queue_urgent_time`: Minutes before items turn red (default: 5)

### Settings Access Pattern
- All authenticated users can READ settings (needed for display preferences)
- Only admins can WRITE settings (configuration changes)

## Testing & Quality

### Test Data
- Use Advanced Admin → Test Data tab to load sample data
- Creates 30 test accounts (FAM*, IND*, CAB* prefixes)
- Generates 14 days of transaction history
- Easily removable for production use

### Manual Testing Checklist
- [ ] POS workflow: Select account → Add products → Checkout
- [ ] Prep queue: Items appear and can be completed
- [ ] Real-time updates: Multiple devices see changes immediately
- [ ] Settings: Changes propagate to all pages
- [ ] Authentication: Role-based access works correctly
- [ ] Mobile/tablet: UI is touch-friendly and responsive

## Common Tasks

### Adding a New Setting
1. Add to Advanced Admin settings form (advadmin.html)
2. Load/save in advadmin.js
3. Add validation in saveSettings()
4. Use in relevant frontend pages (load from `/api/settings`)
5. Document default value

### Adding a New User Role
1. Add role to users table schema
2. Update authentication decorators in app.py
3. Add role option to user management UI
4. Update role-based navigation/features
5. Test access restrictions

### Adding a New Product Category
1. Use Admin → Products tab
2. Click "Add Category"
3. Add products within category
4. Products automatically appear in POS

### Debugging Tips
- Check browser console for JavaScript errors
- Check `docker compose logs` for backend errors
- Use browser Network tab to inspect API calls
- Settings not applying? Check that GET /api/settings returns expected values
- Real-time not working? Check Socket.IO connection in browser console

## Important Notes

### Do NOT
- ❌ Commit the database file (`data/camp_snackbar.db`)
- ❌ Add emojis unless explicitly requested
- ❌ Over-engineer simple features
- ❌ Create new files when editing existing ones works
- ❌ Make changes without reading the existing code first
- ❌ Skip input validation or security checks
- ❌ Use inline event handlers with unescaped user input

### DO
- ✅ Read files before editing them
- ✅ Use utility functions (escapeHtml, fetchPost, etc.)
- ✅ Test changes locally before committing
- ✅ Write clear commit messages
- ✅ Keep solutions simple and focused
- ✅ Follow existing code patterns and style
- ✅ Consider mobile/tablet UX in all decisions
- ✅ Validate inputs on both frontend and backend

## Troubleshooting Common Issues

### "403 Forbidden" on API calls
- Check if endpoint has correct authorization decorator
- Settings should be `@login_required` for GET, `@admin_required` for PUT
- Verify user session is valid

### Real-time updates not working
- Check Socket.IO connection in browser console
- Verify socket.emit() is called after database changes
- Ensure frontend has socket event listeners

### Docker container won't start
- Check `docker compose logs` for errors
- Verify database volume is mounted correctly
- Ensure no port conflicts (default: 8080)

### Settings not persisting
- Verify PUT /api/settings endpoint is being called
- Check browser Network tab for errors
- Ensure CSRF token is included in request

## Project History & Evolution

### Key Features Developed
1. **Touch-first POS interface** with large buttons and no-keyboard operation
2. **Real-time prep queue** for kitchen staff with color-coded urgency
3. **Account-based billing** for families, individuals, and cabins
4. **Comprehensive reporting** with sales analytics and account summaries
5. **Role-based access** (admin, pos, prep users)
6. **Configurable settings** including prep queue color thresholds
7. **Test data generator** for demos and development
8. **Docker deployment** with automated builds via GitHub Actions

### Recent Improvements
- Two-tier prep queue color coding (yellow/red thresholds)
- Settings accessible to all authenticated users
- Compact reports summary layout
- Advanced admin panel for user and system management
- Security hardening (CSRF, XSS protection, input validation)

---

**This document is a living guide. Update it as new patterns emerge or requirements change.**
