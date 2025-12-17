/**
 * Authentication utility functions for Camp Snackbar POS
 * Session-based authentication with role checking (RBAC)
 */

import { escapeHtml } from './escape.js';
import { fetchPost } from './csrf.js';

const API_URL = window.location.origin + '/api';

/**
 * Check if user is currently authenticated
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
export async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'  // Include session cookie
        });

        if (response.ok) {
            return await response.json();
        }

        return null;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

/**
 * Require authentication and optionally check role
 * Redirects to login if not authenticated or insufficient permissions
 *
 * @param {Array|string|null} allowedRoles - Role(s) allowed to access (e.g., 'admin', ['admin', 'pos'])
 * @returns {Promise<Object>} Current user if authorized
 */
export async function requireAuth(allowedRoles = null) {
    const user = await checkAuth();

    if (!user) {
        // Not authenticated - redirect to login
        console.log('Not authenticated, redirecting to login');
        window.location.href = '/login';
        // Throw error to stop execution
        throw new Error('Not authenticated');
    }

    if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(user.role)) {
            // Insufficient permissions
            console.error(`Access denied. Required: ${roles.join(' or ')}, Got: ${user.role}`);
            alert(`Access denied. This page requires ${roles.join(' or ')} role.`);
            window.location.href = getDefaultPageForRole(user.role);
            throw new Error('Insufficient permissions');
        }
    }

    return user;
}

/**
 * Log out current user
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        await fetchPost(`${API_URL}/auth/logout`, {});
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Always redirect to login, even if API call failed
    window.location.href = '/login';
}

/**
 * Get default page for a given role
 * @param {string} role - User role (admin, pos, prep)
 * @returns {string} Default page URL
 */
function getDefaultPageForRole(role) {
    switch (role) {
        case 'admin':
            return '/admin.html';
        case 'pos':
            return '/index.html';
        case 'prep':
            return '/prep.html';
        default:
            return '/login';
    }
}

/**
 * Display user info in the UI
 * @param {Object} user - User object
 * @param {HTMLElement} container - Container element to display user info
 */
export function displayUserInfo(user, container) {
    if (!container) return;

    const roleColors = {
        admin: '#f44336',
        pos: '#2196F3',
        prep: '#4CAF50'
    };

    const roleColor = roleColors[user.role] || '#666';

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-weight: 600;">${escapeHtml(user.full_name || user.username)}</span>
            <span style="
                background: ${roleColor};
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
            ">${escapeHtml(user.role)}</span>
            <button
                onclick="window.authLogout()"
                style="
                    padding: 0.5rem 1rem;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                "
            >
                Logout
            </button>
        </div>
    `;
}

/**
 * Initialize auth for a page
 * This function should be called at the top of each protected page
 *
 * @param {string|Array} requiredRoles - Required role(s) to access the page
 * @param {Function} onAuthSuccess - Callback function to execute after successful auth
 */
export async function initAuth(requiredRoles, onAuthSuccess) {
    try {
        const user = await requireAuth(requiredRoles);

        // Make logout function globally available
        window.authLogout = logout;

        // Store current user globally for convenience
        window.currentUser = user;

        // Execute success callback
        if (onAuthSuccess) {
            await onAuthSuccess(user);
        }

        return user;
    } catch (error) {
        // Error already handled by requireAuth (redirect)
        throw error;
    }
}

/**
 * Safe wrapper for initAuth that prevents errors from bubbling
 * Use this in HTML script tags to avoid console errors during redirect
 */
export function safeInitAuth(requiredRoles, onAuthSuccess) {
    initAuth(requiredRoles, onAuthSuccess).catch(() => {
        // Silently handle - redirect is already happening
    });
}

// Legacy compatibility (deprecated - will be removed in Phase 4)
export function isAuthenticated() {
    console.warn('isAuthenticated() is deprecated. Use checkAuth() instead.');
    return checkAuth().then(user => !!user);
}

export function getAuthToken() {
    console.warn('getAuthToken() is deprecated. Session-based auth uses cookies.');
    return null;
}

export function clearAuthToken() {
    console.warn('clearAuthToken() is deprecated. Use logout() instead.');
    localStorage.removeItem('adminToken');
}
