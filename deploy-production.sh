#!/bin/bash
#
# Production Deployment Script for Camp Snackbar POS
# Creates a git tag which triggers GitHub Actions to build and publish
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Camp Snackbar POS - Production Deployment"
echo "=================================================="
echo ""

# Check if version is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error:${NC} Version number required"
    echo ""
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.0"
    echo ""
    exit 1
fi

VERSION=$1

# Validate version format (basic semver check)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error:${NC} Invalid version format"
    echo "Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.2.0)"
    exit 1
fi

# Check if tag already exists
if git tag -l | grep -q "^v${VERSION}$"; then
    echo -e "${RED}Error:${NC} Tag v${VERSION} already exists"
    echo ""
    echo "Existing tags:"
    git tag -l | tail -5
    echo ""
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning:${NC} You have uncommitted changes"
    echo ""
    git status --short
    echo ""
    read -p "Commit these changes first? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✓${NC} Changes committed"
    else
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Preparing deployment v${VERSION}${NC}"
echo ""

# Show what will be tagged
echo "Changes since last tag:"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
    echo "Previous version: $LAST_TAG"
    echo ""
    git log ${LAST_TAG}..HEAD --oneline | head -10
else
    echo "No previous tags found"
    git log --oneline | head -10
fi

echo ""
read -p "Create tag v${VERSION} and push? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Create annotated tag
echo ""
echo -e "${BLUE}[1/3]${NC} Creating git tag v${VERSION}..."
git tag -a "v${VERSION}" -m "Release v${VERSION}

🚀 Generated with deploy-production.sh
📅 $(date '+%Y-%m-%d %H:%M:%S')
"
echo -e "${GREEN}✓${NC} Tag created"

# Push tag to origin
echo ""
echo -e "${BLUE}[2/3]${NC} Pushing tag to GitHub..."
git push origin "v${VERSION}"
echo -e "${GREEN}✓${NC} Tag pushed"

# Push commits if needed
if git status | grep -q "Your branch is ahead"; then
    echo ""
    echo -e "${BLUE}[3/3]${NC} Pushing commits to GitHub..."
    git push origin main
    echo -e "${GREEN}✓${NC} Commits pushed"
else
    echo ""
    echo -e "${BLUE}[3/3]${NC} No new commits to push"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Production Deployment Initiated!${NC}"
echo "=================================================="
echo ""
echo "Version: v${VERSION}"
echo ""
echo "GitHub Actions will now:"
echo "  1. Build Docker image"
echo "  2. Push to GitHub Container Registry"
echo "  3. Tag as: v${VERSION} and latest"
echo ""
echo "Monitor the build:"
echo "  https://github.com/jimrearick/camp-snackbar-pos/actions"
echo ""
echo "After build completes, pull on production server:"
echo "  docker pull ghcr.io/jimrearick/camp-snackbar-pos:v${VERSION}"
echo "  docker compose down"
echo "  docker compose up -d"
echo ""
