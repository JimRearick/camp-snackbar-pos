/**
 * Custom confirm dialog system
 */

/**
 * Show a custom confirm dialog
 * @param {string} message - Message to display
 * @param {string} title - Optional dialog title (default: "Confirm")
 * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if cancelled
 */
export function confirmDialog(message, title = 'Confirm') {
    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '500px';

        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const headerTitle = document.createElement('h2');
        headerTitle.textContent = title;
        modalHeader.appendChild(headerTitle);

        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.padding = '2rem';
        modalBody.style.fontSize = '1.1rem';
        modalBody.style.lineHeight = '1.6';
        modalBody.textContent = message;

        // Create modal actions
        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = () => {
            document.body.removeChild(backdrop);
            resolve(false);
        };

        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn-danger';
        confirmButton.textContent = 'Confirm';
        confirmButton.onclick = () => {
            document.body.removeChild(backdrop);
            resolve(true);
        };

        modalActions.appendChild(cancelButton);
        modalActions.appendChild(confirmButton);

        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalActions);
        backdrop.appendChild(modalContent);

        // Add to body
        document.body.appendChild(backdrop);

        // Focus confirm button
        confirmButton.focus();

        // Handle backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                resolve(false);
            }
        });

        // Handle Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(backdrop);
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}
