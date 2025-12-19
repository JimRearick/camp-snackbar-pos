#!/bin/bash
#
# Local Deployment Script for Camp Snackbar POS
# Rebuilds and restarts the Docker container
#

set -e  # Exit on error

echo "=================================================="
echo "Camp Snackbar POS - Local Deployment"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop existing containers
echo -e "${BLUE}[1/4]${NC} Stopping existing containers..."
docker compose down
echo -e "${GREEN}✓${NC} Containers stopped"
echo ""

# Step 2: Build new image
echo -e "${BLUE}[2/4]${NC} Building new Docker image..."
docker compose build
echo -e "${GREEN}✓${NC} Image built successfully"
echo ""

# Step 3: Start containers
echo -e "${BLUE}[3/4]${NC} Starting containers..."
docker compose up -d
echo -e "${GREEN}✓${NC} Containers started"
echo ""

# Step 4: Wait for health check
echo -e "${BLUE}[4/4]${NC} Waiting for application to be ready..."
sleep 3

# Check if container is running
if docker compose ps | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Application is healthy and ready!"
else
    echo -e "${YELLOW}⚠${NC} Container is starting (may take a few more seconds)..."
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "Application URLs:"
echo "  • Login:  http://localhost/login.html"
echo "  • POS:    http://localhost/index.html"
echo "  • Admin:  http://localhost/admin.html"
echo "  • Prep:   http://localhost/prep.html"
echo ""
echo "Default Credentials:"
echo "  • Username: admin | pos | prep"
echo "  • Password: camp2026"
echo ""
echo "Useful Commands:"
echo "  • View logs:     docker compose logs -f"
echo "  • Stop:          docker compose down"
echo "  • Restart:       docker compose restart"
echo "  • Shell access:  docker compose exec app bash"
echo ""
