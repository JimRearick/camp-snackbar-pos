/**
 * Centralized API communication utilities
 */

import { API_URL } from './constants.js';

/**
 * Custom error for unauthorized responses
 */
export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

/**
 * Make an API request with standardized error handling
 * @param {string} endpoint - API endpoint (e.g., '/accounts')
 * @param {Object} options - Fetch options
 * @param {string} options.method - HTTP method
 * @param {Object} options.headers - Additional headers
 * @param {any} options.body - Request body (will be JSON stringified if object)
 * @param {string} options.authToken - Optional auth token
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
    const { authToken, ...fetchOptions } = options;

    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include',  // IMPORTANT: Include cookies for session auth
        ...fetchOptions
    };

    // Add auth token if provided (legacy support)
    if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Stringify body if it's an object
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            console.log('401 Unauthorized - redirecting to login');
            window.location.href = '/login';
            throw new UnauthorizedError('Session expired or invalid');
        }

        // Handle other error responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Return JSON response
        return await response.json();
    } catch (error) {
        // Re-throw UnauthorizedError as-is
        if (error instanceof UnauthorizedError) {
            throw error;
        }

        // Wrap other errors
        throw new Error(error.message || 'Network request failed');
    }
}

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export async function apiGet(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {any} body - Request body
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export async function apiPost(endpoint, body, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'POST', body });
}

/**
 * PUT request helper
 * @param {string} endpoint - API endpoint
 * @param {any} body - Request body
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export async function apiPut(endpoint, body, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'PUT', body });
}

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export async function apiDelete(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'DELETE' });
}
