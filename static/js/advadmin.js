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
window.showAddUserModal = showAddUserModal;
window.editUser = editUser;
window.hideUserModal = hideUserModal;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
