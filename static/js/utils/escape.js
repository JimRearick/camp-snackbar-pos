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
 * Parses a local timestamp string into a Date object
 * The backend returns timestamps already in local time via SQLite's localtime function
 *
 * @param {string} localTimestamp - Local timestamp from database (e.g., "2025-12-17 15:30:00")
 * @returns {Date} - Date object in local timezone
 *
 * @example
 * const date = parseLocalDateTime("2025-12-17 15:30:00");
 */
export function parseLocalDateTime(localTimestamp) {
    if (!localTimestamp) return null;

    // Backend returns local time strings like "2025-12-20 17:37:21"
    // Parse as local time by constructing Date from components (avoids timezone conversion)
    const [datePart, timePart] = localTimestamp.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);

    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Formats a local timestamp string to formatted date and time
 * The backend now returns timestamps already converted to local time via SQLite's localtime function
 *
 * @param {string} localTimestamp - Local timestamp from database (e.g., "2025-12-17 15:30:00")
 * @returns {string} - Formatted local date and time (e.g., "12/17/2025 3:30:00 PM")
 *
 * @example
 * const formatted = formatLocalDateTime("2025-12-17 15:30:00");
 * // Returns: "12/17/2025 3:30:00 PM"
 */
export function formatLocalDateTime(localTimestamp) {
    if (!localTimestamp) return '';

    const date = parseLocalDateTime(localTimestamp);
    if (!date) return '';

    // Format to local date and time
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Formats a local timestamp string to date only
 *
 * @param {string} localTimestamp - Local timestamp from database
 * @returns {string} - Formatted local date (e.g., "12/17/2025")
 */
export function formatLocalDate(localTimestamp) {
    if (!localTimestamp) return '';

    // Backend returns local time strings like "2025-12-20 17:37:21"
    // Parse as local time by constructing Date from components
    const [datePart] = localTimestamp.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);

    // Create date in local timezone (month is 0-indexed)
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString();
}

// Make functions available globally for non-module scripts
window.escapeHtml = escapeHtml;
window.escapeAttribute = escapeAttribute;
window.createSafeElement = createSafeElement;
window.sanitizeUrl = sanitizeUrl;
window.parseLocalDateTime = parseLocalDateTime;
window.formatLocalDateTime = formatLocalDateTime;
window.formatLocalDate = formatLocalDate;
