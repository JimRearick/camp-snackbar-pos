/**
 * CSRF Protection Utilities
 *
 * Provides functions to include CSRF tokens in API requests
 * to prevent Cross-Site Request Forgery attacks.
 */

let csrfToken = null;
let tokenPromise = null;

/**
 * Fetches a CSRF token from the server
 *
 * @returns {Promise<string>} - The CSRF token
 */
export async function getCsrfToken() {
    // If we already have a token, return it
    if (csrfToken) {
        return csrfToken;
    }

    // If a fetch is already in progress, wait for it
    if (tokenPromise) {
        return tokenPromise;
    }

    // Fetch new token
    tokenPromise = fetch('/api/csrf-token', {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            return response.json();
        })
        .then(data => {
            csrfToken = data.csrf_token;
            tokenPromise = null;
            return csrfToken;
        })
        .catch(error => {
            tokenPromise = null;
            console.error('Error fetching CSRF token:', error);
            throw error;
        });

    return tokenPromise;
}

/**
 * Clears the cached CSRF token (use when token expires)
 */
export function clearCsrfToken() {
    csrfToken = null;
    tokenPromise = null;
}

/**
 * Enhanced fetch function that automatically includes CSRF token
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 *
 * @example
 * const response = await fetchWithCsrf('/api/accounts', {
 *     method: 'POST',
 *     headers: {'Content-Type': 'application/json'},
 *     body: JSON.stringify(data)
 * });
 */
export async function fetchWithCsrf(url, options = {}) {
    const token = await getCsrfToken();

    const headers = {
        ...options.headers,
        'X-CSRF-Token': token
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials || 'include'
    });

    // If we get a 400/403 with CSRF error, clear token and retry once
    if ((response.status === 400 || response.status === 403) && !options._retried) {
        try {
            const errorData = await response.clone().json();
            if (errorData.error && errorData.error.toLowerCase().includes('csrf')) {
                console.log('CSRF token expired, refreshing...');
                clearCsrfToken();

                // Retry request with new token
                return fetchWithCsrf(url, { ...options, _retried: true });
            }
        } catch (e) {
            // If we can't parse error, just return original response
        }
    }

    return response;
}

/**
 * Convenience method for GET requests (no CSRF needed, but included for consistency)
 */
export async function fetchGet(url, options = {}) {
    return fetch(url, {
        ...options,
        method: 'GET',
        credentials: options.credentials || 'include'
    });
}

/**
 * Convenience method for POST requests with CSRF
 */
export async function fetchPost(url, data, options = {}) {
    return fetchWithCsrf(url, {
        ...options,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: JSON.stringify(data)
    });
}

/**
 * Convenience method for PUT requests with CSRF
 */
export async function fetchPut(url, data, options = {}) {
    return fetchWithCsrf(url, {
        ...options,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: JSON.stringify(data)
    });
}

/**
 * Convenience method for DELETE requests with CSRF
 */
export async function fetchDelete(url, options = {}) {
    return fetchWithCsrf(url, {
        ...options,
        method: 'DELETE'
    });
}

// Make functions available globally for non-module scripts
window.getCsrfToken = getCsrfToken;
window.clearCsrfToken = clearCsrfToken;
window.fetchWithCsrf = fetchWithCsrf;
window.fetchGet = fetchGet;
window.fetchPost = fetchPost;
window.fetchPut = fetchPut;
window.fetchDelete = fetchDelete;
