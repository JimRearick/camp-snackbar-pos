// Advanced Admin JavaScript
import { escapeHtml } from './utils/escape.js';
import { fetchPost, fetchPut, fetchDelete } from './utils/csrf.js';

const API_URL = '/api';

// ============================================================================
// Initialization
// ============================================================================

function initAdvAdmin() {
    loadSettings();
    updateHeaderCampName();
}

// Update header with camp name from settings
async function updateHeaderCampName() {
    try {
        const response = await fetch(`${API_URL}/settings`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return;
        }

        const settings = await response.json();

        // Update camp name in header if provided
        if (settings.camp_name) {
            const headerTitle = document.querySelector('.header h1');
            if (headerTitle) {
                // Keep the logo, just update the text
                const logo = headerTitle.querySelector('img');
                headerTitle.textContent = settings.camp_name;
                if (logo) {
                    headerTitle.insertBefore(logo, headerTitle.firstChild);
                }
            }
        }
    } catch (error) {
        console.error('Error loading camp name:', error);
    }
}

// ============================================================================
// Tab Management
// ============================================================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    // Activate corresponding button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// ============================================================================
// Test Data Management
// ============================================================================

async function loadTestData() {
    if (!confirm('Load test data? This will create 30 sample accounts and 14 days of transaction history. Any existing test data will be replaced.')) {
        return;
    }

    const statusDiv = document.getElementById('testDataStatus');
    const spinner = document.getElementById('testDataSpinner');
    const message = document.getElementById('testDataMessage');
    const output = document.getElementById('testDataOutput');

    // Show status and spinner
    statusDiv.style.display = 'block';
    spinner.style.display = 'block';
    message.textContent = 'Loading test data...';
    output.style.display = 'none';
    output.textContent = '';

    try {
        const response = await fetchPost(`${API_URL}/admin/load-test-data`, {});

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load test data');
        }

        const result = await response.json();

        // Hide spinner
        spinner.style.display = 'none';

        // Show success message
        message.innerHTML = `<span style="color: #28a745;">✓ ${result.message}</span>`;

        // Show output if available
        if (result.output) {
            output.textContent = result.output;
            output.style.display = 'block';
        }

        showSuccess('Test data loaded successfully!');
    } catch (error) {
        console.error('Error loading test data:', error);
        spinner.style.display = 'none';
        message.innerHTML = `<span style="color: #dc3545;">✗ Error: ${escapeHtml(error.message)}</span>`;
        showError('Failed to load test data: ' + error.message);
    }
}

async function deleteTestData() {
    if (!confirm('Delete all test data? This will remove all accounts with FAM*, IND*, or CAB* account numbers and their associated transactions. This cannot be undone.')) {
        return;
    }

    const statusDiv = document.getElementById('testDataStatus');
    const spinner = document.getElementById('testDataSpinner');
    const message = document.getElementById('testDataMessage');
    const output = document.getElementById('testDataOutput');

    // Show status and spinner
    statusDiv.style.display = 'block';
    spinner.style.display = 'block';
    message.textContent = 'Deleting test data...';
    output.style.display = 'none';
    output.textContent = '';

    try {
        const response = await fetchDelete(`${API_URL}/admin/test-data`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete test data');
        }

        const result = await response.json();

        // Hide spinner
        spinner.style.display = 'none';

        // Show success message
        message.innerHTML = `<span style="color: #28a745;">✓ ${result.message}</span>`;

        showSuccess('Test data deleted successfully!');
    } catch (error) {
        console.error('Error deleting test data:', error);
        spinner.style.display = 'none';
        message.innerHTML = `<span style="color: #dc3545;">✗ Error: ${escapeHtml(error.message)}</span>`;
        showError('Failed to delete test data: ' + error.message);
    }
}

// ============================================================================
// Settings Management
// ============================================================================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load settings');
        }

        const settings = await response.json();

        // Populate form fields
        document.getElementById('campName').value = settings.camp_name || '';
        document.getElementById('currencySymbol').value = settings.currency_symbol || '$';
        document.getElementById('backupEnabled').checked = settings.backup_enabled === 'true';
        document.getElementById('backupTime').value = settings.backup_time || '00:00';
        document.getElementById('internetBackupUrl').value = settings.internet_backup_url || '';
        document.getElementById('prepQueueWarningTime').value = settings.prep_queue_warning_time || '2';
        document.getElementById('prepQueueUrgentTime').value = settings.prep_queue_urgent_time || '5';

        // Show/hide backup time based on enabled status
        updateBackupTimeVisibility();
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings: ' + error.message);
    }
}

async function saveSettings() {
    const settings = {
        camp_name: document.getElementById('campName').value.trim(),
        currency_symbol: document.getElementById('currencySymbol').value.trim(),
        backup_enabled: document.getElementById('backupEnabled').checked ? 'true' : 'false',
        backup_time: document.getElementById('backupTime').value,
        internet_backup_url: document.getElementById('internetBackupUrl').value.trim(),
        prep_queue_warning_time: document.getElementById('prepQueueWarningTime').value || '2',
        prep_queue_urgent_time: document.getElementById('prepQueueUrgentTime').value || '5'
    };

    // Validation
    if (!settings.camp_name) {
        showError('Camp name is required');
        return;
    }

    if (!settings.currency_symbol) {
        showError('Currency symbol is required');
        return;
    }

    const warningTime = parseInt(settings.prep_queue_warning_time);
    if (isNaN(warningTime) || warningTime < 1 || warningTime > 60) {
        showError('Prep queue warning time must be between 1 and 60 minutes');
        return;
    }

    const urgentTime = parseInt(settings.prep_queue_urgent_time);
    if (isNaN(urgentTime) || urgentTime < 1 || urgentTime > 60) {
        showError('Prep queue urgent time must be between 1 and 60 minutes');
        return;
    }

    if (warningTime >= urgentTime) {
        showError('Warning time must be less than urgent time');
        return;
    }

    try {
        const response = await fetchPut(`${API_URL}/settings`, settings);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }

        showSuccess('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings: ' + error.message);
    }
}

function updateBackupTimeVisibility() {
    const backupEnabled = document.getElementById('backupEnabled');
    const backupTimeGroup = document.getElementById('backupTimeGroup');

    if (backupEnabled && backupTimeGroup) {
        if (backupEnabled.checked) {
            backupTimeGroup.style.display = 'block';
        } else {
            backupTimeGroup.style.display = 'none';
        }
    }
}

// ============================================================================
// Toast Messages
// ============================================================================

function showSuccess(message) {
    const toast = document.getElementById('successMessage');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showError(message) {
    const toast = document.getElementById('errorMessage');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ============================================================================
// Expose functions to window
// ============================================================================

window.initAdvAdmin = initAdvAdmin;
window.switchTab = switchTab;
window.loadTestData = loadTestData;
window.deleteTestData = deleteTestData;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.updateBackupTimeVisibility = updateBackupTimeVisibility;
