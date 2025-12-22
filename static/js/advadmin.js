// Advanced Admin JavaScript
import { escapeHtml, formatLocalDateTime } from './utils/escape.js';
import { fetchPost, fetchPut, fetchDelete } from './utils/csrf.js';
import { updatePageHeader } from './utils/settings.js';

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

        // Update page header with POS name
        updatePageHeader(settings, 'Settings');
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

    // Load backup log when switching to backups tab
    if (tabName === 'backups' && typeof refreshBackupLog === 'function') {
        refreshBackupLog();
        // Start auto-refresh if enabled
        const autoRefreshCheckbox = document.getElementById('autoRefreshLog');
        if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
            toggleAutoRefresh();
        }
    }
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

// Show the delete all data confirmation modal
function deleteAllData() {
    const modal = document.getElementById('deleteConfirmModal');
    const input = document.getElementById('deleteConfirmInput');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    // Reset modal state
    input.value = '';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';

    // Show modal
    modal.style.display = 'flex';

    // Focus the input
    setTimeout(() => input.focus(), 100);

    // Enable confirm button when "DELETE" is typed
    input.oninput = function() {
        if (input.value.trim().toUpperCase() === 'DELETE') {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        }
    };

    // Allow Enter key to confirm if button is enabled
    input.onkeypress = function(e) {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
            confirmDeleteAll();
        }
    };
}

// Cancel the delete operation
function cancelDeleteAll() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'none';
}

// Confirm and execute the delete all data operation
async function confirmDeleteAll() {
    const modal = document.getElementById('deleteConfirmModal');
    const statusDiv = document.getElementById('deleteDataStatus');
    const spinner = document.getElementById('deleteDataSpinner');
    const message = document.getElementById('deleteDataMessage');

    // Close modal
    modal.style.display = 'none';

    // Show status and spinner
    statusDiv.style.display = 'block';
    spinner.style.display = 'block';
    message.textContent = 'Deleting all data...';

    try {
        const response = await fetchDelete(`${API_URL}/admin/all-data`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete all data');
        }

        const result = await response.json();

        // Hide spinner
        spinner.style.display = 'none';

        // Show success message
        message.innerHTML = `<span style="color: #28a745;">✓ ${escapeHtml(result.message || 'All accounts and transactions have been deleted')}</span>`;

        showSuccess(result.message || 'All accounts and transactions have been deleted');

    } catch (error) {
        console.error('Error deleting all data:', error);

        // Hide spinner
        spinner.style.display = 'none';

        // Show error message
        message.innerHTML = `<span style="color: #dc3545;">✗ Error: ${escapeHtml(error.message)}</span>`;

        showError('Failed to delete all data: ' + error.message);
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
// Backup Management
// ============================================================================

async function createManualBackup(includeInternet) {
    const buttonText = includeInternet ? '☁️ Backup to Remote Server' : '💾 Create Local Backup';

    if (!confirm(`Create a ${includeInternet ? 'local and remote' : 'local'} backup now?`)) {
        return;
    }

    try {
        const response = await fetchPost(`${API_URL}/backup/create`, {
            include_internet: includeInternet
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Backup failed');
        }

        const result = await response.json();

        let message = `Local backup created: ${result.backup_file} (${(result.file_size / 1024).toFixed(1)} KB)`;

        if (includeInternet && result.internet_backup) {
            if (result.internet_backup.success) {
                message += `\n\nRemote backup: ${result.internet_backup.message}`;
                showSuccess(message);
            } else {
                message += `\n\nRemote backup failed: ${result.internet_backup.error}`;
                showError(message);
            }
        } else {
            showSuccess(message);
        }

        // Refresh the backup log to show the new backup
        if (typeof refreshBackupLog === 'function') {
            setTimeout(refreshBackupLog, 1000);
        }

    } catch (error) {
        console.error('Backup error:', error);
        showError('Backup failed: ' + error.message);
    }
}

// Backup log auto-refresh interval
let backupLogRefreshInterval = null;

async function refreshBackupLog() {
    try {
        const response = await fetch(`${API_URL}/backup/list?limit=100`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load backup log');
        }

        const data = await response.json();
        const backups = data.backups || [];

        // Apply filter
        const filter = document.getElementById('logFilter').value;
        const filteredBackups = backups.filter(backup => {
            if (filter === 'all') return true;
            if (filter === 'auto') return backup.backup_source === 'auto';
            if (filter === 'manual') return backup.backup_source === 'manual';
            if (filter === 'failed') return backup.status === 'failed';
            return true;
        });

        // Update table
        const tbody = document.getElementById('backupLogBody');

        if (filteredBackups.length === 0) {
            tbody.innerHTML = `
                <tr style="display: table; width: 100%; table-layout: fixed;">
                    <td colspan="6" style="padding: 2rem; text-align: center; color: #a0aec0;">
                        No backup records found.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filteredBackups.map(backup => {
                const date = formatLocalDateTime(backup.created_at);
                const size = backup.file_size ? `${(backup.file_size / 1024).toFixed(0)} KB` : '-';
                const filename = backup.backup_path.split('/').pop() || '-';

                // Status badge styling
                const statusColor = backup.status === 'success' ? '#48bb78' : '#f56565';
                const statusBg = backup.status === 'success' ? '#f0fff4' : '#fff5f5';

                // Source badge
                const sourceIcon = backup.backup_source === 'auto' ? '🤖' : '👤';
                const sourceLabel = backup.backup_source === 'auto' ? 'Auto' : 'Manual';

                // Type badge
                const typeIcon = backup.backup_type === 'local' ? '💾' : '☁️';

                return `
                    <tr style="display: table; width: 100%; table-layout: fixed; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; width: 12%;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                ${typeIcon} ${backup.backup_type}
                            </span>
                        </td>
                        <td style="padding: 0.75rem; width: 12%;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem;">
                                ${sourceIcon} ${sourceLabel}
                            </span>
                        </td>
                        <td style="padding: 0.75rem; width: 12%;">
                            <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; background: ${statusBg}; color: ${statusColor};">
                                ${backup.status}
                            </span>
                        </td>
                        <td style="padding: 0.75rem; width: 10%; color: #4a5568;">${size}</td>
                        <td style="padding: 0.75rem; width: 18%; color: #4a5568; font-size: 0.85rem;">${date}</td>
                        <td style="padding: 0.75rem; width: 36%; color: #718096; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${backup.error_message || filename}">
                            ${backup.error_message || filename}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Update statistics
        updateBackupStats(backups);

    } catch (error) {
        console.error('Error loading backup log:', error);
        const tbody = document.getElementById('backupLogBody');
        tbody.innerHTML = `
            <tr style="display: table; width: 100%; table-layout: fixed;">
                <td colspan="6" style="padding: 2rem; text-align: center; color: #f56565;">
                    Error loading backup log: ${error.message}
                </td>
            </tr>
        `;
    }
}

function updateBackupStats(backups) {
    const total = backups.length;
    const autoCount = backups.filter(b => b.backup_source === 'auto').length;
    const manualCount = backups.filter(b => b.backup_source === 'manual').length;
    const successCount = backups.filter(b => b.status === 'success').length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0';

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAuto').textContent = autoCount;
    document.getElementById('statManual').textContent = manualCount;
    document.getElementById('statSuccessRate').textContent = `${successRate}%`;
}

function toggleAutoRefresh() {
    const checkbox = document.getElementById('autoRefreshLog');

    if (checkbox.checked) {
        // Start auto-refresh every 30 seconds
        backupLogRefreshInterval = setInterval(refreshBackupLog, 30000);
    } else {
        // Stop auto-refresh
        if (backupLogRefreshInterval) {
            clearInterval(backupLogRefreshInterval);
            backupLogRefreshInterval = null;
        }
    }
}

// Legacy function - kept for compatibility
async function viewBackupLog() {
    // Just refresh the inline log
    await refreshBackupLog();
}

// ============================================================================
// Expose functions to window
// ============================================================================

window.initAdvAdmin = initAdvAdmin;
window.switchTab = switchTab;
window.loadTestData = loadTestData;
window.deleteAllData = deleteAllData;
window.cancelDeleteAll = cancelDeleteAll;
window.confirmDeleteAll = confirmDeleteAll;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.updateBackupTimeVisibility = updateBackupTimeVisibility;
window.createManualBackup = createManualBackup;
window.viewBackupLog = viewBackupLog;
window.refreshBackupLog = refreshBackupLog;
window.toggleAutoRefresh = toggleAutoRefresh;
