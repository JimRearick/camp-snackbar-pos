/**
 * Unified toast notification system
 */

import { TOAST_DURATION } from './constants.js';

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success', 'error', 'info')
 * @param {number} duration - Optional custom duration in milliseconds
 */
export function showToast(message, type = 'info', duration = null) {
    // Determine toast element ID based on type
    const toastId = type === 'success' ? 'successToast' : 'errorToast';
    const toast = document.getElementById(toastId);

    if (!toast) {
        console.error(`Toast element #${toastId} not found`);
        // Fallback to console
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    // Set message
    toast.textContent = message;

    // Show toast
    toast.classList.remove('hidden');

    // Auto-hide after duration
    const hideAfter = duration || TOAST_DURATION[type.toUpperCase()] || TOAST_DURATION.INFO;
    setTimeout(() => {
        toast.classList.add('hidden');
    }, hideAfter);
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
export function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message - Error message
 */
export function showError(message) {
    showToast(message, 'error');
}

/**
 * Show info toast
 * @param {string} message - Info message
 */
export function showInfo(message) {
    showToast(message, 'info');
}
