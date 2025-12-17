#!/bin/bash
# Camp Snackbar POS - Simple Installation Script
# Downloads and runs pre-built Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

echo "========================================"
echo "Camp Snackbar POS - Installation"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo ""
    echo "Install Docker with:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    echo "  sudo usermod -aG docker \$USER"
    echo "  # Log out and back in"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo ""
    echo "Install Docker Compose plugin with:"
    echo "  sudo apt install docker-compose-plugin"
    exit 1
fi

print_success "Docker and Docker Compose are installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_info "Creating .env configuration file..."

    # Generate secret key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)

    # Detect host timezone
    if [ -f /etc/timezone ]; then
        HOST_TZ=$(cat /etc/timezone)
    else
        HOST_TZ=$(timedatectl show -p Timezone --value 2>/dev/null || echo "America/New_York")
    fi

    cat > .env << EOF
# Camp Snackbar POS Configuration
# Generated on $(date)

# Docker image to use (GitHub Container Registry)
DOCKER_IMAGE=ghcr.io/jimrearick/camp-snackbar-pos:latest

# Security - CRITICAL: Change this in production!
SECRET_KEY=${SECRET_KEY}

# Flask Environment
FLASK_ENV=production

# Timezone (auto-detected from host: ${HOST_TZ})
TZ=${HOST_TZ}
EOF

    print_success "Created .env configuration file"
else
    print_warning ".env file already exists, skipping creation"
fi
echo ""

# Create data directories
print_info "Creating data directories..."
mkdir -p data backups
chmod 755 data backups
print_success "Created data and backups directories"
echo ""

# Copy database if it doesn't exist in data directory
if [ ! -f data/camp_snackbar.db ]; then
    if [ -f backend/camp_snackbar.db ]; then
        print_info "Copying initial database..."
        cp backend/camp_snackbar.db data/camp_snackbar.db
        print_success "Database initialized"
    else
        print_warning "No initial database found - will be created on first run"
    fi
fi
echo ""

# Pull the latest image
print_info "Downloading Camp Snackbar POS container..."
docker compose pull
print_success "Container downloaded"
echo ""

# Start the application
print_info "Starting Camp Snackbar POS..."
docker compose up -d

# Wait for health check
sleep 5

# Check status
docker compose ps

echo ""
print_success "Camp Snackbar POS is running!"
echo ""
echo "Access the application at:"
echo "  Local:   http://localhost"
echo "  Network: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Default login: admin / admin"
print_warning "CHANGE THE ADMIN PASSWORD IMMEDIATELY!"
echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f     # View logs"
echo "  docker compose restart     # Restart"
echo "  docker compose down        # Stop"
echo "  docker compose up -d       # Start"
echo ""
