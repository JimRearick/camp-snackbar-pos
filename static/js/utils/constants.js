/**
 * Shared constants for Camp Snackbar POS
 */

// API Configuration
export const API_URL = window.location.origin + '/api';

// Toast Durations (milliseconds)
export const TOAST_DURATION = {
    SUCCESS: 3000,
    ERROR: 3000,
    INFO: 2000
};

// Local Storage Keys
export const STORAGE_KEYS = {
    ADMIN_TOKEN: 'adminToken'
};

// Session Configuration
export const SESSION = {
    LOGOUT_DELAY: 2000  // Delay before logout on session expiration
};
