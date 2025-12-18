// Advanced Admin JavaScript
import { escapeHtml } from './utils/escape.js';
import { fetchPost, fetchPut, fetchDelete } from './utils/csrf.js';

const API_URL = '/api';

let users = [];
let currentEditingUser = null;

// ============================================================================
// Initialization
// ============================================================================

function initAdvAdmin() {
    loadUsers();
    loadSettings();
}

// ============================================================================
// Tab Management
// ============================================================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    // Activate corresponding button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// ============================================================================
// User Management
// ============================================================================

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        users = await response.json();
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const isActive = user.is_active !== 0;
        const statusBadge = isActive
            ? '<span class="type-badge" style="background: #4CAF50;">Active</span>'
            : '<span class="type-badge" style="background: #999;">Inactive</span>';

        return `
        <tr style="${!isActive ? 'opacity: 0.6;' : ''}">
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.full_name || '-')}</td>
            <td><span class="type-badge">${escapeHtml(user.role)}</span></td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(new Date(user.created_at).toLocaleDateString())}</td>
            <td style="text-align: right;">
                <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
                ${user.username !== 'admin' ? `<button class="btn-danger" onclick="deleteUser(${user.id}, '${escapeHtml(user.username).replace(/'/g, "\\'")}')">Delete</button>` : ''}
            </td>
        </tr>
        `;
    }).join('');
}

function showAddUserModal() {
    currentEditingUser = null;
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userId').value = '';
    document.getElementById('username').value = '';
    document.getElementById('fullName').value = '';
    document.getElementById('userRole').value = 'pos';
    document.getElementById('password').value = '';
    document.getElementById('password').required = true;
    document.getElementById('activeGroup').style.display = 'none'; // Hide active checkbox for new users
    document.getElementById('userModal').classList.remove('hidden');
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    currentEditingUser = user;
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('fullName').value = user.full_name || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('password').value = '';
    document.getElementById('password').required = false;

    // Show active checkbox for editing (but not for admin user)
    if (user.username !== 'admin') {
        document.getElementById('activeGroup').style.display = 'block';
        document.getElementById('userActive').checked = user.is_active !== 0;
    } else {
        document.getElementById('activeGroup').style.display = 'none';
    }

    document.getElementById('userModal').classList.remove('hidden');
}

function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    currentEditingUser = null;
}

async function saveUser() {
    const userId = document.getElementById('userId').value;
    const username = document.getElementById('username').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    if (!username || !fullName || !role) {
        showError('Please fill in all required fields');
        return;
    }

    if (!userId && !password) {
        showError('Password is required for new users');
        return;
    }

    const userData = {
        username,
        full_name: fullName,
        role
    };

    if (password) {
        userData.password = password;
    }

    // Include is_active only when editing (not when creating new users)
    if (userId && document.getElementById('activeGroup').style.display !== 'none') {
        userData.is_active = document.getElementById('userActive').checked;
    }

    try {
        const url = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users`;
        const method = userId ? 'PUT' : 'POST';

        const response = method === 'PUT'
            ? await fetchPut(url, userData)
            : await fetchPost(url, userData);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save user');
        }

        showSuccess(userId ? 'User updated successfully' : 'User created successfully');
        hideUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showError('Failed to save user: ' + error.message);
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
        return;
    }

    try {
        const response = await fetchDelete(`${API_URL}/users/${userId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }

        showSuccess('User deleted successfully');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user: ' + error.message);
    }
}

// ============================================================================
// Test Data Management
// ============================================================================

async function loadTestData() {
    if (!confirm('Load test data? This will create 30 sample accounts and 14 days of transaction history. Any existing test data will be replaced.')) {
        return;
    }

    const statusDiv = document.getElementById('testDataStatus');
    const spinner = document.getElementById('testDataSpinner');
    const message = document.getElementById('testDataMessage');
    const output = document.getElementById('testDataOutput');

    // Show status and spinner
    statusDiv.style.display = 'block';
    spinner.style.display = 'block';
    message.textContent = 'Loading test data...';
    output.style.display = 'none';
    output.textContent = '';

    try {
        const response = await fetchPost(`${API_URL}/admin/load-test-data`, {});

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load test data');
        }

        const result = await response.json();

        // Hide spinner
        spinner.style.display = 'none';

        // Show success message
        message.innerHTML = `<span style="color: #28a745;">✓ ${result.message}</span>`;

        // Show output if available
        if (result.output) {
            output.textContent = result.output;
            output.style.display = 'block';
        }

        showSuccess('Test data loaded successfully! Refresh the Admin or POS page to see new accounts.');

        // Suggest page reload
        setTimeout(() => {
            if (confirm('Test data loaded! Would you like to refresh this page to see changes in other tabs?')) {
                window.location.reload();
            }
        }, 2000);
    } catch (error) {
        console.error('Error loading test data:', error);
        spinner.style.display = 'none';
        message.innerHTML = `<span style="color: #dc3545;">✗ Error: ${escapeHtml(error.message)}</span>`;
        showError('Failed to load test data: ' + error.message);
    }
}

async function deleteTestData() {
    if (!confirm('Delete all test data? This will remove all accounts with FAM*, IND*, or CAB* account numbers and their associated transactions. This cannot be undone.')) {
        return;
    }

    const statusDiv = document.getElementById('testDataStatus');
    const spinner = document.getElementById('testDataSpinner');
    const message = document.getElementById('testDataMessage');
    const output = document.getElementById('testDataOutput');

    // Show status and spinner
    statusDiv.style.display = 'block';
    spinner.style.display = 'block';
    message.textContent = 'Deleting test data...';
    output.style.display = 'none';
    output.textContent = '';

    try {
        const response = await fetchDelete(`${API_URL}/admin/test-data`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete test data');
        }

        const result = await response.json();

        // Hide spinner
        spinner.style.display = 'none';

        // Show success message
        message.innerHTML = `<span style="color: #28a745;">✓ ${result.message}</span>`;

        showSuccess('Test data deleted successfully! Refresh the Admin or POS page to see changes.');

        // Suggest page reload
        setTimeout(() => {
            if (confirm('Test data deleted! Would you like to refresh this page to see changes in other tabs?')) {
                window.location.reload();
            }
        }, 2000);
    } catch (error) {
        console.error('Error deleting test data:', error);
        spinner.style.display = 'none';
        message.innerHTML = `<span style="color: #dc3545;">✗ Error: ${escapeHtml(error.message)}</span>`;
        showError('Failed to delete test data: ' + error.message);
    }
}

// ============================================================================
// Settings Management
// ============================================================================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load settings');
        }

        const settings = await response.json();

        // Populate form fields
        document.getElementById('campName').value = settings.camp_name || '';
        document.getElementById('currencySymbol').value = settings.currency_symbol || '$';
        document.getElementById('backupEnabled').checked = settings.backup_enabled === 'true';
        document.getElementById('backupTime').value = settings.backup_time || '00:00';
        document.getElementById('internetBackupUrl').value = settings.internet_backup_url || '';
        document.getElementById('prepQueueColorTime').value = settings.prep_queue_color_time || '5';

        // Show/hide backup time based on enabled status
        updateBackupTimeVisibility();
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings: ' + error.message);
    }
}

async function saveSettings() {
    const settings = {
        camp_name: document.getElementById('campName').value.trim(),
        currency_symbol: document.getElementById('currencySymbol').value.trim(),
        backup_enabled: document.getElementById('backupEnabled').checked ? 'true' : 'false',
        backup_time: document.getElementById('backupTime').value,
        internet_backup_url: document.getElementById('internetBackupUrl').value.trim(),
        prep_queue_color_time: document.getElementById('prepQueueColorTime').value || '5'
    };

    // Validation
    if (!settings.camp_name) {
        showError('Camp name is required');
        return;
    }

    if (!settings.currency_symbol) {
        showError('Currency symbol is required');
        return;
    }

    const colorTime = parseInt(settings.prep_queue_color_time);
    if (isNaN(colorTime) || colorTime < 1 || colorTime > 60) {
        showError('Prep queue color time must be between 1 and 60 minutes');
        return;
    }

    try {
        const response = await fetchPut(`${API_URL}/settings`, settings);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }

        showSuccess('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings: ' + error.message);
    }
}

function updateBackupTimeVisibility() {
    const backupEnabled = document.getElementById('backupEnabled').checked;
    const backupTimeGroup = document.getElementById('backupTimeGroup');

    if (backupEnabled) {
        backupTimeGroup.style.display = 'block';
    } else {
        backupTimeGroup.style.display = 'none';
    }
}

// Add event listener for backup enabled checkbox
document.addEventListener('DOMContentLoaded', () => {
    const backupCheckbox = document.getElementById('backupEnabled');
    if (backupCheckbox) {
        backupCheckbox.addEventListener('change', updateBackupTimeVisibility);
    }
});

// ============================================================================
// Toast Messages
// ============================================================================

function showSuccess(message) {
    const toast = document.getElementById('successMessage');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showError(message) {
    const toast = document.getElementById('errorMessage');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ============================================================================
// Expose functions to window
// ============================================================================

window.initAdvAdmin = initAdvAdmin;
window.switchTab = switchTab;
window.showAddUserModal = showAddUserModal;
window.editUser = editUser;
window.hideUserModal = hideUserModal;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.loadTestData = loadTestData;
window.deleteTestData = deleteTestData;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
