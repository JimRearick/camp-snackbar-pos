/**
 * Authentication utilities
 */

import { apiPost } from './api.js';
import { STORAGE_KEYS, SESSION } from './constants.js';
import { showError } from './toast.js';

/**
 * Get authentication token from localStorage
 * @returns {string|null} Auth token or null
 */
export function getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
}

/**
 * Set authentication token in localStorage
 * @param {string} token - Auth token
 */
export function setAuthToken(token) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
}

/**
 * Clear authentication token from localStorage
 */
export function clearAuthToken() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
}

/**
 * Login with password
 * @param {string} password - Admin password
 * @returns {Promise<{success: boolean, token: string}>} Login response
 */
export async function login(password) {
    const data = await apiPost('/auth/login', { password });

    if (data.success && data.token) {
        setAuthToken(data.token);
        return data;
    } else {
        throw new Error(data.error || 'Invalid password');
    }
}

/**
 * Logout user
 */
export function logout() {
    clearAuthToken();
    window.location.reload();
}

/**
 * Handle unauthorized error (session expired)
 */
export function handleUnauthorized() {
    showError('Session expired. Please log in again.');
    setTimeout(() => {
        logout();
    }, SESSION.LOGOUT_DELAY);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
    return !!getAuthToken();
}
