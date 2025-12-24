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
- **Update Version**: Update /api/get_version function to match the git version tag when updated.  

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

## Date and Time Handling

### Critical Principle: Local Time Throughout
The application **ALWAYS** works in local time. SQLite stores timestamps in UTC, but we convert to/from local time at the database boundary to avoid timezone confusion in the application layer.

### Common Mistakes to Avoid

1. **Never** return raw UTC timestamps from the backend
2. **Never** use `new Date(dbTimestamp)` on database strings
3. **Never** filter dates without `'localtime'` modifier
4. **Never** forget both SELECT and WHERE need `'localtime'`
5. **Never** assume JavaScript will parse SQLite timestamps correctly
