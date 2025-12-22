/**
 * Settings Utilities
 *
 * Provides reusable functions for loading and applying application settings
 */

const API_URL = window.location.origin + '/api';

/**
 * Updates the page header with POS name from settings
 *
 * @param {Object} settings - Settings object from API
 * @param {string} pageName - The name of the current page (e.g., 'POS', 'Admin', 'Reports')
 * @param {string} headerSelector - CSS selector for the header h1 element (default: '.page-header h1')
 *
 * @example
 * const settings = await fetch('/api/settings').then(r => r.json());
 * updatePageHeader(settings, 'POS');
 */
export function updatePageHeader(settings, pageName, headerSelector = '.page-header h1') {
    if (!settings || !settings.camp_name) {
        return;
    }

    const headerTitle = document.querySelector(headerSelector);
    if (!headerTitle) {
        console.warn(`Header element not found with selector: ${headerSelector}`);
        return;
    }

    // Keep the logo, update the text to include page name
    const logo = headerTitle.querySelector('img');
    headerTitle.textContent = `${settings.camp_name} - ${pageName}`;

    // Re-insert logo if it exists
    if (logo) {
        headerTitle.insertBefore(logo, headerTitle.firstChild);
    }
}

/**
 * Loads settings from the API
 *
 * @returns {Promise<Object>} - Settings object from the API
 * @throws {Error} - If the API request fails
 *
 * @example
 * const settings = await loadSettings();
 * console.log(settings.camp_name);
 */
export async function loadSettingsFromAPI() {
    const response = await fetch(`${API_URL}/settings`);
    if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Convenience function to load settings and update page header in one call
 *
 * @param {string} pageName - The name of the current page (e.g., 'POS', 'Admin')
 * @param {string} headerSelector - CSS selector for the header h1 element
 * @returns {Promise<Object>} - Settings object from the API
 *
 * @example
 * // In pos.js
 * await loadAndApplySettings('POS');
 *
 * @example
 * // In prep.js with custom header selector
 * await loadAndApplySettings('Prep Station', '.prep-header h1');
 */
export async function loadAndApplySettings(pageName, headerSelector = '.page-header h1') {
    try {
        const settings = await loadSettingsFromAPI();
        updatePageHeader(settings, pageName, headerSelector);
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
}
