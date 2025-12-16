# Documentation

Organized documentation for Camp Snackbar POS System.

## Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Admin Guide](../ADMIN_GUIDE.md) - System administration guide
- [Changelog](../CHANGELOG.md) - Version history and changes

### Deployment
- [Docker Deployment Guide](deployment/DOCKER_DEPLOYMENT.md) - Production containerized deployment
- [Setup Guide](deployment/SETUP_GUIDE.md) - Manual installation guide
- [Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification

### Security
- [Security Test Report](security/SECURITY_TEST_REPORT.md) - Comprehensive security test results
- [Security Review](security/SECURITY_REVIEW.md) - Security analysis and recommendations
- [Security Fixes Status](security/SECURITY_FIXES_STATUS.md) - Implementation status of security fixes

### Archive
Historical documentation from development phases:
- [Phase 1 Complete](archive/PHASE1_COMPLETE.md) - RBAC implementation
- [Phase 2 Complete](archive/PHASE2_COMPLETE.md) - Security fixes (CSRF, XSS, validation)
- [Phase 3 Complete](archive/PHASE3_COMPLETE.md) - Advanced features
- [RBAC Implementation Plan](archive/RBAC_IMPLEMENTATION_PLAN.md) - Original RBAC design
- [Project Structure](archive/PROJECT_STRUCTURE.md) - Original project layout
- [Layout Fixes](archive/LAYOUT_FIXES.md) - UI/UX improvements
- [Test Results](archive/TEST_RESULTS.md) - Historical test results
- [Testing Guide](archive/TESTING.md) - Testing procedures

## Documentation Structure

```
docs/
├── README.md                    # This file
├── deployment/                  # Deployment guides
│   ├── DOCKER_DEPLOYMENT.md    # Docker/container deployment
│   ├── SETUP_GUIDE.md          # Manual setup
│   └── DEPLOYMENT_CHECKLIST.md # Pre-deployment checklist
├── security/                    # Security documentation
│   ├── SECURITY_TEST_REPORT.md # Test results
│   ├── SECURITY_REVIEW.md      # Security analysis
│   └── SECURITY_FIXES_STATUS.md # Implementation status
└── archive/                     # Historical documentation
    └── PHASE*.md               # Development phase records
```

## Contributing

When adding new documentation:
1. Place in appropriate subdirectory (deployment/security/archive)
2. Update this README with links
3. Use clear, descriptive filenames
4. Include table of contents for long documents
