/**
 * Shared Navigation Header Component
 *
 * Provides a unified navigation header across all pages with:
 * - POS name display (from settings)
 * - User info and version display
 * - Role-based navigation buttons
 * - Logout functionality
 */

import { updatePageHeader } from './settings.js';

const API_URL = window.location.origin + '/api';

/**
 * Navigation button configuration
 * Each button has visibility rules based on user role and current page
 */
const NAV_BUTTONS = [
    {
        id: 'posNavBtn',
        href: '/index.html',
        icon: '🛒',
        label: 'POS',
        showForRoles: ['admin'],  // Only admins see POS link from other pages
        hideOnPages: ['index.html'] // Hide on POS page itself
    },
    {
        id: 'prepNavBtn',
        href: '/prep.html',
        icon: '🍔',
        label: 'Prep',
        showForRoles: ['admin'],  // Only admins see Prep link from other pages
        hideOnPages: ['prep.html'] // Hide on Prep page itself
    },
    {
        id: 'adminNavBtn',
        href: '/admin.html',
        icon: '⚙️',
        label: 'Admin',
        showForRoles: ['admin'],
        hideOnPages: ['admin.html']
    },
    {
        id: 'reportsNavBtn',
        href: '/reports.html',
        icon: '📈',
        label: 'Reports',
        showForRoles: ['admin'],
        hideOnPages: ['reports.html']
    },
    {
        id: 'advAdminNavBtn',
        href: '/advadmin.html',
        icon: '⚙️',
        label: 'Adv',
        showForRoles: ['admin'],
        hideOnPages: ['advadmin.html'],
        requiresQueryParam: 'adv'  // Only show if ?adv is in URL
    }
];

/**
 * Special buttons that are page-specific
 */
const SPECIAL_BUTTONS = {
    prepQueue: {
        id: 'prepQueueBtn',
        onclick: 'showPrepQueueModal()',
        icon: '🍔',
        label: 'Prep Queue',
        showOnPages: ['index.html'], // Only show on POS page
        hasCount: true
    }
};

/**
 * Renders the complete navigation header
 *
 * @param {Object} options - Configuration options
 * @param {string} options.containerSelector - CSS selector for the nav container
 * @param {Object} options.user - User object with role, username, full_name
 * @param {string} options.pageName - Current page name for title (e.g., 'POS', 'Admin')
 * @param {string} options.navClass - CSS class for nav container (default: 'header-nav' or 'cross-page-nav')
 *
 * @example
 * renderNavigationHeader({
 *   containerSelector: '.header-nav',
 *   user: { role: 'admin', username: 'john', full_name: 'John Doe' },
 *   pageName: 'POS',
 *   navClass: 'header-nav'
 * });
 */
export async function renderNavigationHeader({ containerSelector, user, pageName, navClass = 'header-nav' }) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Navigation container not found: ${containerSelector}`);
        return;
    }

    // Get current page for button visibility logic
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Build navigation buttons based on role and page
    const navButtons = [];

    // Add special buttons first (like Prep Queue on POS page)
    Object.values(SPECIAL_BUTTONS).forEach(button => {
        if (button.showOnPages && button.showOnPages.includes(currentPage)) {
            const countBadge = button.hasCount ? '<span id="prepQueueCount" style="display: none;"></span>' : '';
            navButtons.push(`
                <button onclick="${button.onclick}" title="${button.label}">
                    <span class="icon">${button.icon}</span> ${button.label} ${countBadge}
                </button>
            `);
        }
    });

    // Add regular navigation buttons
    NAV_BUTTONS.forEach(button => {
        // Check if button should be shown for this role
        if (!button.showForRoles.includes(user.role)) {
            return;
        }

        // Check if button should be hidden on current page
        if (button.hideOnPages && button.hideOnPages.includes(currentPage)) {
            return;
        }

        // Check if button requires a query parameter
        if (button.requiresQueryParam) {
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.has(button.requiresQueryParam)) {
                return;
            }
        }

        navButtons.push(`
            <a href="${button.href}" id="${button.id}">
                <span class="icon">${button.icon}</span> ${button.label}
            </a>
        `);
    });

    // Always add logout button
    navButtons.push(`
        <button onclick="window.authLogout()">
            <span class="icon">🚪</span> Logout
        </button>
    `);

    // Render the navigation
    container.className = navClass;
    container.innerHTML = `
        <div id="userInfo" class="user-info-container" style="display: none;"></div>
        ${navButtons.join('\n        ')}
    `;

    // Load and display user info with version
    await displayUserInfo(user);

    // Load settings and update page header with POS name
    try {
        const settings = await fetch(`${API_URL}/settings`).then(r => r.json());
        updatePageHeader(settings, pageName);
    } catch (error) {
        console.error('Error loading settings for navigation:', error);
    }
}

/**
 * Displays user information and app version in the navigation
 *
 * @param {Object} user - User object with role, username, full_name
 */
async function displayUserInfo(user) {
    const userInfoEl = document.getElementById('userInfo');
    if (!userInfoEl) return;

    try {
        // Fetch version info
        const versionResp = await fetch(`${API_URL}/version`);
        const versionData = await versionResp.json();

        const displayName = user.full_name
            ? `${user.full_name} (${user.username})`
            : user.username;

        userInfoEl.innerHTML = `
            <div class="user-info-name">${displayName}</div>
            <div class="app-version">v${versionData.version}</div>
        `;
        userInfoEl.style.display = 'flex';
    } catch (err) {
        console.error('Failed to load version info:', err);

        // Show user info without version
        const displayName = user.full_name
            ? `${user.full_name} (${user.username})`
            : user.username;

        userInfoEl.innerHTML = `<div class="user-info-name">${displayName}</div>`;
        userInfoEl.style.display = 'flex';
    }
}

/**
 * Initializes navigation for a page after authentication
 *
 * @param {Object} user - Authenticated user object
 * @param {string} pageName - Current page name (e.g., 'POS', 'Admin', 'Reports')
 * @param {Object} options - Additional options
 * @param {string} options.containerSelector - Nav container selector (default varies by page)
 * @param {string} options.navClass - CSS class for nav container (default varies by page)
 *
 * @example
 * // In POS page after authentication
 * await initNavigation(user, 'POS');
 *
 * @example
 * // In Admin page with custom container
 * await initNavigation(user, 'Admin', {
 *   containerSelector: '.cross-page-nav',
 *   navClass: 'cross-page-nav'
 * });
 */
export async function initNavigation(user, pageName, options = {}) {
    // Get current page to determine defaults
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Set defaults based on page type
    let defaults = {
        containerSelector: '.header-nav',
        navClass: 'header-nav'
    };

    // Admin-style pages use different class names
    if (['admin.html', 'reports.html', 'advadmin.html'].includes(currentPage)) {
        defaults = {
            containerSelector: '.cross-page-nav',
            navClass: 'cross-page-nav'
        };
    } else if (currentPage === 'prep.html') {
        defaults = {
            containerSelector: '.prep-nav',
            navClass: 'prep-nav'
        };
    }

    await renderNavigationHeader({
        ...defaults,
        ...options,
        user,
        pageName
    });
}
