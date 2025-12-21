#!/bin/bash
#
# Remote Backup Setup Script for Camp Snackbar POS
# This script helps configure rsync-based remote backups
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Camp Snackbar POS - Remote Backup Setup"
echo "=================================================="
echo ""

# Step 1: Gather information
echo -e "${BLUE}Step 1: Remote Server Configuration${NC}"
echo ""
read -p "Remote server user (e.g., backupuser): " REMOTE_USER
read -p "Remote server hostname or IP (e.g., backup.example.com): " REMOTE_HOST
read -p "Remote backup directory path (e.g., /var/backups/camp-snackbar): " REMOTE_PATH

# Ensure path ends with /
if [[ ! $REMOTE_PATH == */ ]]; then
    REMOTE_PATH="${REMOTE_PATH}/"
fi

REMOTE_CONFIG="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"

echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Remote: ${REMOTE_CONFIG}"
echo ""

# Step 2: Check for SSH key
echo -e "${BLUE}Step 2: SSH Key Setup${NC}"
echo ""

SSH_KEY="$HOME/.ssh/id_ed25519"
if [ ! -f "$SSH_KEY" ]; then
    echo "No SSH key found. Generating new key..."
    ssh-keygen -t ed25519 -C "camp-snackbar-backup" -f "$SSH_KEY" -N ""
    echo -e "${GREEN}✓${NC} SSH key generated"
else
    echo -e "${GREEN}✓${NC} SSH key already exists: $SSH_KEY"
fi

# Step 3: Copy key to remote server
echo ""
echo -e "${BLUE}Step 3: Copy SSH Key to Remote Server${NC}"
echo ""
echo "This will prompt for your password on the remote server."
echo ""

if ssh-copy-id -i "${SSH_KEY}.pub" "${REMOTE_USER}@${REMOTE_HOST}"; then
    echo -e "${GREEN}✓${NC} SSH key copied successfully"
else
    echo -e "${RED}✗${NC} Failed to copy SSH key"
    exit 1
fi

# Step 4: Test SSH connection
echo ""
echo -e "${BLUE}Step 4: Test SSH Connection${NC}"
echo ""

if ssh -i "$SSH_KEY" -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" "echo Connection successful"; then
    echo -e "${GREEN}✓${NC} Passwordless SSH working"
else
    echo -e "${RED}✗${NC} SSH connection failed"
    exit 1
fi

# Step 5: Create remote directory
echo ""
echo -e "${BLUE}Step 5: Create Remote Backup Directory${NC}"
echo ""

if ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_PATH} && chmod 700 ${REMOTE_PATH}"; then
    echo -e "${GREEN}✓${NC} Remote directory created: ${REMOTE_PATH}"
else
    echo -e "${YELLOW}!${NC} Warning: Could not create remote directory (may already exist)"
fi

# Step 6: Update database configuration
echo ""
echo -e "${BLUE}Step 6: Update POS Configuration${NC}"
echo ""

DB_PATH="./backend/camp_snackbar.db"
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "UPDATE settings SET value='${REMOTE_CONFIG}' WHERE key='internet_backup_url'"
    echo -e "${GREEN}✓${NC} Database updated with remote backup configuration"
else
    echo -e "${YELLOW}!${NC} Database not found at $DB_PATH"
    echo "   Manually update the setting:"
    echo "   sqlite3 backend/camp_snackbar.db \"UPDATE settings SET value='${REMOTE_CONFIG}' WHERE key='internet_backup_url'\""
fi

# Step 7: Test backup
echo ""
echo -e "${BLUE}Step 7: Test Backup${NC}"
echo ""
read -p "Do you want to test a backup now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating test backup file..."
    TEST_FILE="/tmp/test_backup_$(date +%s).db"
    echo "Test backup data" > "$TEST_FILE"

    echo "Uploading to remote server..."
    if rsync -azv --timeout=30 "$TEST_FILE" "${REMOTE_CONFIG}"; then
        echo -e "${GREEN}✓${NC} Test backup successful!"
        echo "Cleaning up test file..."
        rm "$TEST_FILE"
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "rm ${REMOTE_PATH}$(basename $TEST_FILE)"
    else
        echo -e "${RED}✗${NC} Test backup failed"
        rm "$TEST_FILE"
        exit 1
    fi
fi

# Summary
echo ""
echo "=================================================="
echo -e "${GREEN}Remote Backup Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Configuration:"
echo "  Remote Server: ${REMOTE_USER}@${REMOTE_HOST}"
echo "  Backup Path:   ${REMOTE_PATH}"
echo "  Full Config:   ${REMOTE_CONFIG}"
echo ""
echo "Next Steps:"
echo "  1. Backups will run automatically every night at midnight"
echo "  2. Test manual backup from admin interface"
echo "  3. Monitor backup logs in database:"
echo "     sqlite3 backend/camp_snackbar.db \"SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 5\""
echo ""
echo "  4. Check remote server:"
echo "     ssh ${REMOTE_USER}@${REMOTE_HOST} \"ls -lh ${REMOTE_PATH}\""
echo ""
echo "Documentation: See BACKUP_SETUP.md for details"
echo "=================================================="
