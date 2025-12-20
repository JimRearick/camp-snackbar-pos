#!/bin/bash
# Camp Snackbar POS - Deployment Script
# Quick deployment and management script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
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
    echo -e "${NC}→${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo ""
        echo "Install Docker with:"
        echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "  sudo sh get-docker.sh"
        echo "  sudo usermod -aG docker \$USER"
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
}

# Initialize environment
init_env() {
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env

        # Generate secret key
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
        sed -i "s/please-change-this-to-a-random-secret-key/$SECRET_KEY/" .env

        print_success "Created .env with generated SECRET_KEY"
    else
        print_warning ".env file already exists, skipping"
    fi
}

# Create data directories
create_dirs() {
    mkdir -p data backups
    chmod 755 data backups
    print_success "Created data and backups directories"
}

# Initialize database
init_db() {
    if [ ! -f data/camp_snackbar.db ]; then
        print_info "Initializing database..."

        # Start just the app to initialize DB
        docker compose up -d app
        sleep 10

        # Run init script
        docker compose exec app python /app/backend/init_db.py

        # Stop app
        docker compose down

        print_success "Database initialized"
    else
        print_warning "Database already exists, skipping initialization"
    fi
}

# Start services
start() {
    print_info "Starting Camp Snackbar POS..."
    docker compose up -d

    # Wait a moment for health checks
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
}

# Stop services
stop() {
    print_info "Stopping Camp Snackbar POS..."
    docker compose down
    print_success "Stopped"
}

# Restart services
restart() {
    print_info "Restarting Camp Snackbar POS..."
    docker compose restart
    print_success "Restarted"
}

# View logs
logs() {
    docker compose logs -f "$@"
}

# Update application
update() {
    print_info "Updating Camp Snackbar POS..."

    stop
    
    # Pull latest Container
    docker compose pull

    #Backup DB
    backup

    #Start new container
    docker compose up -d

    print_success "Updated successfully"

    echo ""
    echo "To view the logs"
    echo "./deploy.sh logs app"
}

# Backup database
backup() {
    print_info "Creating backup..."

    BACKUP_NAME="camp_snackbar_$(date +%Y-%m-%d_%H-%M-%S).db"

    # Copy database
    cp data/camp_snackbar.db "backups/$BACKUP_NAME"

    print_success "Backup created: backups/$BACKUP_NAME"
}

# Status check
status() {
    echo "=== Container Status ==="
    docker compose ps
    echo ""

    echo "=== Resource Usage ==="
    docker stats --no-stream camp-snackbar-app camp-snackbar-caddy 2>/dev/null || echo "Containers not running"
    echo ""

    echo "=== Recent Logs (last 20 lines) ==="
    docker compose logs --tail=20
}

# Full installation
install() {
    echo "========================================"
    echo "Camp Snackbar POS - Installation"
    echo "========================================"
    echo ""

    check_docker
    init_env
    create_dirs
    init_db
    start

    echo ""
    echo "========================================"
    print_success "Installation Complete!"
    echo "========================================"
}

# Show help
show_help() {
    cat << EOF
Camp Snackbar POS - Deployment Script

Usage: ./deploy.sh [command]

Commands:
  install     - Full installation (first time setup)
  start       - Start all services
  stop        - Stop all services
  restart     - Restart all services
  status      - Show container status and resource usage
  logs        - View logs (optional: logs app, logs caddy)
  update      - Pull latest code and rebuild containers
  backup      - Create database backup
  help        - Show this help message

Examples:
  ./deploy.sh install          # First time installation
  ./deploy.sh start            # Start services
  ./deploy.sh logs app         # View app logs
  ./deploy.sh backup           # Create backup
EOF
}

# Main script
case "${1:-}" in
    install)
        install
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    update)
        update
        ;;
    backup)
        backup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        show_help
        exit 1
        ;;
esac
