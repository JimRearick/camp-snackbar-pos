/**
 * XSS Protection Utilities
 *
 * Provides functions to safely escape user-generated content before
 * inserting into HTML to prevent Cross-Site Scripting (XSS) attacks.
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * @param {string} text - The text to escape
 * @returns {string} - HTML-safe escaped text
 *
 * @example
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHtml(userInput);
 * element.innerHTML = `<div>${safe}</div>`;  // Safe to use
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }

    // Convert to string if not already
    text = String(text);

    // Use browser's built-in escaping via textContent
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escapes HTML attribute values
 *
 * @param {string} text - The text to escape for use in HTML attributes
 * @returns {string} - Attribute-safe escaped text
 *
 * @example
 * const userName = 'John"Doe';
 * element.innerHTML = `<div title="${escapeAttribute(userName)}">...</div>`;
 */
export function escapeAttribute(text) {
    if (text === null || text === undefined) {
        return '';
    }

    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Safely creates an HTML element with escaped text content
 *
 * @param {string} tagName - The HTML tag name (e.g., 'div', 'span')
 * @param {string} text - The text content (will be escaped)
 * @param {Object} attributes - Optional attributes to set
 * @returns {HTMLElement} - The created element
 *
 * @example
 * const el = createSafeElement('div', userInput, {
 *     class: 'product-name',
 *     'data-id': productId
 * });
 * container.appendChild(el);
 */
export function createSafeElement(tagName, text, attributes = {}) {
    const element = document.createElement(tagName);
    element.textContent = text; // Automatically escapes

    // Set attributes safely
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }

    return element;
}

/**
 * Sanitizes a URL to prevent javascript: protocol attacks
 *
 * @param {string} url - The URL to sanitize
 * @returns {string} - Safe URL or empty string if dangerous
 *
 * @example
 * const link = sanitizeUrl(userProvidedUrl);
 * element.href = link;
 */
export function sanitizeUrl(url) {
    if (!url) return '';

    const str = String(url).trim().toLowerCase();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
        if (str.startsWith(protocol)) {
            return '';
        }
    }

    return url;
}

/**
 * Escapes text for use in regular expressions
 *
 * @param {string} text - The text to escape
 * @returns {string} - Regex-safe escaped text
 */
export function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats a UTC timestamp string to local date and time
 * SQLite CURRENT_TIMESTAMP returns UTC, this converts to local timezone
 *
 * @param {string} utcTimestamp - UTC timestamp from database (e.g., "2025-12-17 15:30:00")
 * @returns {string} - Formatted local date and time (e.g., "12/17/2025 10:30:00 AM")
 *
 * @example
 * const localTime = formatLocalDateTime("2025-12-17 15:30:00");
 * // Returns: "12/17/2025 10:30:00 AM" (if timezone is EST)
 */
export function formatLocalDateTime(utcTimestamp) {
    if (!utcTimestamp) return '';

    // SQLite timestamps are in UTC but don't have 'Z' suffix
    // Add 'Z' to indicate UTC timezone
    const utcString = utcTimestamp.includes('Z') ? utcTimestamp : utcTimestamp + 'Z';
    const date = new Date(utcString);

    // Format to local date and time
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Formats a UTC timestamp string to local date only
 *
 * @param {string} utcTimestamp - UTC timestamp from database
 * @returns {string} - Formatted local date (e.g., "12/17/2025")
 */
export function formatLocalDate(utcTimestamp) {
    if (!utcTimestamp) return '';

    const utcString = utcTimestamp.includes('Z') ? utcTimestamp : utcTimestamp + 'Z';
    const date = new Date(utcString);

    return date.toLocaleDateString();
}

// Make functions available globally for non-module scripts
window.escapeHtml = escapeHtml;
window.escapeAttribute = escapeAttribute;
window.createSafeElement = createSafeElement;
window.sanitizeUrl = sanitizeUrl;
window.formatLocalDateTime = formatLocalDateTime;
window.formatLocalDate = formatLocalDate;
