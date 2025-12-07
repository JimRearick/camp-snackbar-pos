/**
 * Prep Station JavaScript
 * Touch-first interface for kitchen/prep staff
 */

import { API_URL } from './utils/constants.js';
import { socket } from './utils/socket.js';

// State
let prepQueue = [];
let previousQueueLength = 0;

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
    const countDisplay = document.getElementById('queueCount');
    const summaryContainer = document.getElementById('prepSummary');
    const summaryGrid = document.getElementById('summaryGrid');

    // Update count
    countDisplay.textContent = prepQueue.length;

    // Clear container
    container.innerHTML = '';

    if (prepQueue.length === 0) {
        // Hide summary when queue is empty
        summaryContainer.style.display = 'none';

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">All caught up! No items in queue.</div>
            </div>
        `;
        return;
    }

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
    summaryGrid.innerHTML = Object.entries(productTotals)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([product, total]) => `
            <div class="summary-item">
                <span class="summary-product">${product}</span>
                <span class="summary-count">${total}</span>
            </div>
        `).join('');

    // Render each prep item
    prepQueue.forEach(item => {
        const card = createPrepCard(item);
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

    // Debug logging
    console.log('Item:', item.product_name, 'Now:', now, 'Ordered at:', item.ordered_at, 'Parsed:', orderedAt, 'Minutes waiting:', minutesWaiting);

    // Apply urgency styling
    let urgencyClass = '';
    let timeText = `${minutesWaiting} minute${minutesWaiting !== 1 ? 's' : ''} ago`;

    if (minutesWaiting >= 5) {
        urgencyClass = 'urgent';
        timeText = `⚠️ ${timeText}`;
    } else if (minutesWaiting >= 2) {
        urgencyClass = 'warning';
    }

    if (urgencyClass) {
        card.classList.add(urgencyClass);
    }

    card.innerHTML = `
        <div class="prep-card-header">
            <div class="product-name">${item.product_name}</div>
            <div class="quantity-badge">${item.quantity}</div>
        </div>
        <div class="account-info">
            <strong>For:</strong> ${item.account_name}
        </div>
        <div class="time-info ${urgencyClass}">
            ${timeText}
        </div>
        <button class="complete-btn" onclick="window.completeItem(${item.id})">
            ✓ Complete
        </button>
    `;

    return card;
}

async function completeItem(itemId) {
    try {
        const response = await fetch(`${API_URL}/prep-queue/${itemId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed_by: 'Prep Staff'
            })
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
loadPrepQueue();

// Auto-refresh every 10 seconds to update time displays
setInterval(() => {
    renderPrepQueue();
}, 10000);

// Reload queue every 30 seconds as backup
setInterval(() => {
    loadPrepQueue();
}, 30000);

// ============================================================================
// Expose functions to window
// ============================================================================

window.completeItem = completeItem;
