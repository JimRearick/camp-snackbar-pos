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
