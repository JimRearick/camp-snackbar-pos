/**
 * Prep Station JavaScript
 * Touch-first interface for kitchen/prep staff
 */

import { API_URL } from './utils/constants.js';
import { socket } from './utils/socket.js';
import { escapeHtml } from './utils/escape.js';
import { fetchPost } from './utils/csrf.js';

// State
let prepQueue = [];
let previousQueueLength = 0;
let currentFilter = null; // null means show all, otherwise filter by product name
let viewMode = 'product'; // 'product' or 'order'
let urgentThresholdMinutes = 5; // Default: red after 5 minutes
let warningThresholdMinutes = 2; // Default: yellow after 2 minutes

// ============================================================================
// Settings Management
// ============================================================================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        if (response.ok) {
            const settings = await response.json();

            // Load both warning and urgent thresholds from settings
            warningThresholdMinutes = parseInt(settings.prep_queue_warning_time || '2');
            urgentThresholdMinutes = parseInt(settings.prep_queue_urgent_time || '5');

            console.log(`Prep queue thresholds: yellow=${warningThresholdMinutes}min, red=${urgentThresholdMinutes}min`);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Keep using defaults if settings fail to load
    }
}

// ============================================================================
// Queue Management
// ============================================================================

async function loadPrepQueue() {
    try {
        const response = await fetch(`${API_URL}/prep-queue`);
        const data = await response.json();

        // Check if new items were added
        if (data.items.length > previousQueueLength) {
            playNotification();
        }

        previousQueueLength = data.items.length;
        prepQueue = data.items;

        renderPrepQueue();
    } catch (error) {
        console.error('Error loading prep queue:', error);
        showError();
    }
}

function renderPrepQueue() {
    const container = document.getElementById('prepContainer');
    const summaryContainer = document.getElementById('prepSummary');
    const summaryGrid = document.getElementById('summaryGrid');

    // Clear container
    container.innerHTML = '';

    if (prepQueue.length === 0) {
        // Hide summary when queue is empty
        summaryContainer.style.display = 'none';
        currentFilter = null;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">All caught up! No items in queue.</div>
            </div>
        `;
        return;
    }

    if (viewMode === 'product') {
        renderByProduct(container, summaryContainer, summaryGrid);
    } else {
        renderByOrder(container, summaryContainer, summaryGrid);
    }
}

function renderByProduct(container, summaryContainer, summaryGrid) {
    // Calculate totals for each product
    const productTotals = {};
    prepQueue.forEach(item => {
        if (!productTotals[item.product_name]) {
            productTotals[item.product_name] = 0;
        }
        productTotals[item.product_name] += item.quantity;
    });

    // Update summary section
    summaryContainer.style.display = 'block';

    // Build summary HTML with view mode buttons first
    const viewModeHTML = `
        <div class="summary-item active" id="viewByProductChip" onclick="window.setViewMode('product')" style="cursor: pointer;">
            <span class="summary-product">By Product</span>
        </div>
        <div class="summary-item" id="viewByOrderChip" onclick="window.setViewMode('order')" style="cursor: pointer;">
            <span class="summary-product">By Order</span>
        </div>
        <div class="summary-item" onclick="window.clearFilter()" style="cursor: pointer;" title="Click to show all items">
            <span class="summary-product">Total Items</span>
            <span class="summary-count">${prepQueue.length}</span>
        </div>
    `;

    const productsHTML = Object.entries(productTotals)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([product, total]) => {
            const isActive = currentFilter === product;
            return `
                <div class="summary-item ${isActive ? 'active' : ''}" onclick="window.filterByProduct('${escapeHtml(product).replace(/'/g, "\\'")}\')" style="cursor: pointer;">
                    <span class="summary-product">${escapeHtml(product)}</span>
                    <span class="summary-count">${total}</span>
                </div>
            `;
        }).join('');

    summaryGrid.innerHTML = viewModeHTML + productsHTML;

    // Filter items if needed
    const itemsToDisplay = currentFilter
        ? prepQueue.filter(item => item.product_name === currentFilter)
        : prepQueue;

    // Render each prep item
    itemsToDisplay.forEach(item => {
        const card = createPrepCard(item);
        container.appendChild(card);
    });
}

function renderByOrder(container, summaryContainer, summaryGrid) {
    // Group items by transaction_id
    const orderGroups = {};
    prepQueue.forEach(item => {
        if (!orderGroups[item.transaction_id]) {
            orderGroups[item.transaction_id] = {
                transaction_id: item.transaction_id,
                account_name: item.account_name,
                ordered_at: item.ordered_at,
                items: []
            };
        }
        orderGroups[item.transaction_id].items.push(item);
    });

    // Calculate totals for each account (for summary)
    const accountTotals = {};
    Object.values(orderGroups).forEach(order => {
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        if (!accountTotals[order.account_name]) {
            accountTotals[order.account_name] = 0;
        }
        accountTotals[order.account_name] += totalItems;
    });

    // Update summary section
    summaryContainer.style.display = 'block';

    // Build summary HTML with view mode buttons first
    const viewModeHTML = `
        <div class="summary-item" id="viewByProductChip" onclick="window.setViewMode('product')" style="cursor: pointer;">
            <span class="summary-product">By Product</span>
        </div>
        <div class="summary-item active" id="viewByOrderChip" onclick="window.setViewMode('order')" style="cursor: pointer;">
            <span class="summary-product">By Order</span>
        </div>
        <div class="summary-item" onclick="window.clearFilter()" style="cursor: pointer;" title="Click to show all items">
            <span class="summary-product">Total Items</span>
            <span class="summary-count">${prepQueue.length}</span>
        </div>
    `;

    const accountsHTML = Object.entries(accountTotals)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([account, total]) => {
            const isActive = currentFilter === account;
            return `
                <div class="summary-item ${isActive ? 'active' : ''}" onclick="window.filterByAccount('${escapeHtml(account).replace(/'/g, "\\'")}\')" style="cursor: pointer;">
                    <span class="summary-product">${escapeHtml(account)}</span>
                    <span class="summary-count">${total}</span>
                </div>
            `;
        }).join('');

    summaryGrid.innerHTML = viewModeHTML + accountsHTML;

    // Filter orders if needed
    let ordersToDisplay = Object.values(orderGroups);
    if (currentFilter) {
        ordersToDisplay = ordersToDisplay.filter(order => order.account_name === currentFilter);
    }

    // Sort by oldest first
    ordersToDisplay.sort((a, b) => new Date(a.ordered_at) - new Date(b.ordered_at));

    // Render each order
    ordersToDisplay.forEach(order => {
        const card = createOrderCard(order);
        container.appendChild(card);
    });
}

function createPrepCard(item) {
    const card = document.createElement('div');
    card.className = 'prep-card';
    card.id = `prep-item-${item.id}`;

    // Calculate time waiting
    const orderedAt = new Date(item.ordered_at);
    const now = new Date();
    const minutesWaiting = Math.floor((now - orderedAt) / 1000 / 60);

    // Apply urgency styling
    let urgencyClass = '';
    let timeText = `${minutesWaiting} minute${minutesWaiting !== 1 ? 's' : ''} ago`;

    if (minutesWaiting >= urgentThresholdMinutes) {
        urgencyClass = 'urgent';
        timeText = `⚠️ ${timeText}`;
    } else if (minutesWaiting >= warningThresholdMinutes) {
        urgencyClass = 'warning';
    }

    if (urgencyClass) {
        card.classList.add(urgencyClass);
    }

    card.innerHTML = `
        <div class="prep-card-header">
            <div class="product-name">${escapeHtml(item.product_name)}</div>
            <div class="quantity-badge">${item.quantity}</div>
        </div>
        <div class="account-info">
            <strong>For:</strong> ${escapeHtml(item.account_name)}
        </div>
        <div class="time-info ${urgencyClass}">
            ${escapeHtml(timeText)}
        </div>
        <button class="complete-btn" onclick="window.completeItem(${item.id})">
            ✓ Complete
        </button>
    `;

    return card;
}

async function completeItem(itemId) {
    try {
        const response = await fetchPost(`${API_URL}/prep-queue/${itemId}/complete`, {
            completed_by: 'Prep Staff'
        });

        if (response.ok) {
            // Animate card removal
            const card = document.getElementById(`prep-item-${itemId}`);
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';

                setTimeout(() => {
                    loadPrepQueue();
                }, 300);
            } else {
                loadPrepQueue();
            }
        } else {
            alert('Failed to complete item. Please try again.');
        }
    } catch (error) {
        console.error('Error completing item:', error);
        alert('Error completing item. Please try again.');
    }
}

// ============================================================================
// Notifications
// ============================================================================

function playNotification() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.play().catch(e => {
            // Ignore autoplay errors (browser might block autoplay)
            console.log('Could not play notification sound:', e);
        });
    }
}

function showError() {
    const container = document.getElementById('prepContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div class="empty-state-text">Error loading prep queue</div>
        </div>
    `;
}

// ============================================================================
// Real-time Updates
// ============================================================================

// Listen for transaction events (new orders)
socket.on('transaction_created', () => {
    loadPrepQueue();
});

// Listen for prep queue updates
socket.on('prep_queue_updated', () => {
    loadPrepQueue();
});

// ============================================================================
// Auto-refresh & Initialization
// ============================================================================

// Initial load
loadSettings().then(() => loadPrepQueue());

// Auto-refresh every 10 seconds to update time displays
setInterval(() => {
    renderPrepQueue();
}, 10000);

// Reload queue every 30 seconds as backup
setInterval(() => {
    loadPrepQueue();
}, 30000);

// ============================================================================
// Order Card Creation
// ============================================================================

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'prep-card';
    card.id = `prep-order-${order.transaction_id}`;

    // Calculate time waiting
    const orderedAt = new Date(order.ordered_at);
    const now = new Date();
    const minutesWaiting = Math.floor((now - orderedAt) / 1000 / 60);

    // Apply urgency styling
    let urgencyClass = '';
    let timeText = `${minutesWaiting} minute${minutesWaiting !== 1 ? 's' : ''} ago`;

    if (minutesWaiting >= urgentThresholdMinutes) {
        urgencyClass = 'urgent';
        timeText = `⚠️ ${timeText}`;
    } else if (minutesWaiting >= warningThresholdMinutes) {
        urgencyClass = 'warning';
    }

    if (urgencyClass) {
        card.classList.add(urgencyClass);
    }

    // Calculate total items
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    // Create items list HTML
    const itemsListHTML = order.items.map(item => `
        <div class="order-item">
            <span class="order-item-qty">${item.quantity}x</span>
            <span>${escapeHtml(item.product_name)}</span>
        </div>
    `).join('');

    card.innerHTML = `
        <div class="prep-card-header">
            <div class="product-name">${escapeHtml(order.account_name)}</div>
            <div class="quantity-badge">${totalItems}</div>
        </div>
        <div class="order-items-list">
            ${itemsListHTML}
        </div>
        <div class="time-info ${urgencyClass}">
            ${escapeHtml(timeText)}
        </div>
        <button class="complete-btn" onclick="window.completeOrder(${order.transaction_id})">
            ✓ Complete Order
        </button>
    `;

    return card;
}

// ============================================================================
// View Mode
// ============================================================================

function setViewMode(mode) {
    viewMode = mode;
    currentFilter = null; // Clear filter when switching views

    renderPrepQueue();
}

// ============================================================================
// Filtering
// ============================================================================

function filterByProduct(productName) {
    if (currentFilter === productName) {
        // Toggle off if clicking the same filter
        currentFilter = null;
    } else {
        currentFilter = productName;
    }
    renderPrepQueue();
}

function filterByAccount(accountName) {
    if (currentFilter === accountName) {
        // Toggle off if clicking the same filter
        currentFilter = null;
    } else {
        currentFilter = accountName;
    }
    renderPrepQueue();
}

function clearFilter() {
    currentFilter = null;
    renderPrepQueue();
}

// ============================================================================
// Complete Order (all items in a transaction)
// ============================================================================

async function completeOrder(transactionId) {
    try {
        // Find all items for this transaction
        const orderItems = prepQueue.filter(item => item.transaction_id === transactionId);

        if (orderItems.length === 0) {
            return;
        }

        // Complete each item in the order
        const completePromises = orderItems.map(item =>
            fetchPost(`${API_URL}/prep-queue/${item.id}/complete`, {
                completed_by: 'Prep Staff'
            })
        );

        const responses = await Promise.all(completePromises);
        const allSuccessful = responses.every(response => response.ok);

        if (allSuccessful) {
            // Animate card removal
            const card = document.getElementById(`prep-order-${transactionId}`);
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';

                setTimeout(() => {
                    loadPrepQueue();
                }, 300);
            } else {
                loadPrepQueue();
            }
        } else {
            alert('Failed to complete order. Please try again.');
        }
    } catch (error) {
        console.error('Error completing order:', error);
        alert('Error completing order. Please try again.');
    }
}

// ============================================================================
// Expose functions to window
// ============================================================================

window.completeItem = completeItem;
window.completeOrder = completeOrder;
window.filterByProduct = filterByProduct;
window.filterByAccount = filterByAccount;
window.clearFilter = clearFilter;
window.setViewMode = setViewMode;
