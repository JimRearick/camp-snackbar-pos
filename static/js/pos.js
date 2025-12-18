// Import security utilities
import { escapeHtml } from './utils/escape.js';
import { fetchPost } from './utils/csrf.js';

// Global state
let cart = [];
let selectedAccount = null;
let products = [];
let accounts = [];
let prepQueueViewMode = 'product'; // 'product' or 'order'
let urgentThresholdMinutes = 5; // Default: red after 5 minutes
let warningThresholdMinutes = 2; // Default: yellow after 2 minutes

// API Base URL
const API_URL = window.location.origin + '/api';

// Load settings (prep queue thresholds)
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        if (response.ok) {
            const settings = await response.json();

            // Load both warning and urgent thresholds from settings
            warningThresholdMinutes = parseInt(settings.prep_queue_warning_time || '2');
            urgentThresholdMinutes = parseInt(settings.prep_queue_urgent_time || '5');

            console.log(`POS prep queue thresholds: yellow=${warningThresholdMinutes}min, red=${urgentThresholdMinutes}min`);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Keep using defaults if settings fail to load
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadSettings(); // Load settings first
    loadProducts();
    loadAccounts();

    // Load prep queue count for all authenticated users
    loadPrepQueueCount();
    // Refresh prep queue count every 30 seconds
    setInterval(loadPrepQueueCount, 30000);
});

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();
        
        if (data.categories && Array.isArray(data.categories)) {
            displayProducts(data.categories);
        }
    } catch (error) {
        showError('Failed to load products');
        console.error('Error loading products:', error);
    }
}

// Display products grouped by category
function displayProducts(categories) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    categories.forEach(category => {
        // Filter only active products
        const activeProducts = category.products.filter(product => product.active === 1 || product.active === true);

        // Only show category if it has active products
        if (activeProducts.length > 0) {
            // Sort products alphabetically by name
            activeProducts.sort((a, b) => a.name.localeCompare(b.name));

            // Add category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.textContent = category.name;
            grid.appendChild(categoryHeader);

            // Add only active products
            activeProducts.forEach(product => {
                const card = document.createElement('button');
                card.className = 'product-card';
                card.onclick = () => addToCart(product);
                card.disabled = !selectedAccount;

                card.innerHTML = `
                    <div class="product-name">${escapeHtml(product.name)}</div>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                `;

                grid.appendChild(card);
            });
        }
    });
}

// Load accounts from API
async function loadAccounts() {
    try {
        const response = await fetch(`${API_URL}/accounts`);
        const data = await response.json();

        if (data.accounts && Array.isArray(data.accounts)) {
            // Filter to only show active accounts in POS
            accounts = data.accounts.filter(acc => acc.active !== false);
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// Show account selector modal
function showAccountSelector() {
    loadAccounts().then(() => {
        displayAccounts(accounts);
        document.getElementById('accountModal').classList.remove('hidden');
        document.getElementById('accountSearch').focus();
    });
}

// Hide account selector modal
function hideAccountSelector() {
    document.getElementById('accountModal').classList.add('hidden');
    document.getElementById('accountSearch').value = '';
}

// Display accounts in modal
function displayAccounts(accountsList) {
    const container = document.getElementById('accountsList');
    container.innerHTML = '';
    
    if (accountsList.length === 0) {
        container.innerHTML = '<div class="empty-cart"><p>No accounts found</p></div>';
        return;
    }
    
    accountsList.forEach(account => {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.onclick = () => selectAccount(account);

        let membersPreview = '';
        if (account.account_type === 'family' && account.family_members) {
            let members = [];
            if (Array.isArray(account.family_members)) {
                members = account.family_members.filter(m => m && m.trim());
            } else if (typeof account.family_members === 'string') {
                members = account.family_members.split('\n').filter(m => m.trim());
            }
            if (members.length > 0) {
                const escapedMembers = members.map(m => escapeHtml(m)).join(' • ');
                membersPreview = `<span class="account-members-preview">${escapedMembers}</span>`;
            }
        }

        card.innerHTML = `
            <div class="account-card-name">${escapeHtml(account.account_name)}</div>
            <div class="account-card-details">
                <span class="account-type">${escapeHtml(account.account_type)}</span>
                ${membersPreview}
            </div>
        `;

        container.appendChild(card);
    });
}

// Filter accounts by search term
function filterAccounts() {
    const searchTerm = document.getElementById('accountSearch').value.toLowerCase();
    const filtered = accounts.filter(account => 
        account.account_name.toLowerCase().includes(searchTerm)
    );
    displayAccounts(filtered);
}

// Select an account
function selectAccount(account) {
    selectedAccount = account;
    updateAccountDisplay();
    hideAccountSelector();
    enableProducts();
}

// Update account display in header
function updateAccountDisplay() {
    const display = document.getElementById('selectedAccount');

    if (selectedAccount) {
        let membersDisplay = '';
        if (selectedAccount.account_type === 'family' && selectedAccount.family_members) {
            let members = [];
            if (Array.isArray(selectedAccount.family_members)) {
                members = selectedAccount.family_members.filter(m => m && m.trim());
            } else if (typeof selectedAccount.family_members === 'string') {
                members = selectedAccount.family_members.split('\n').filter(m => m.trim());
            }
            if (members.length > 0) {
                const escapedMembers = members.map(m => escapeHtml(m)).join(' • ');
                membersDisplay = `<div class="account-members">${escapedMembers}</div>`;
            }
        }

        display.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="account-info">
                    <div class="account-name">${escapeHtml(selectedAccount.account_name)}</div>
                    ${membersDisplay}
                </div>
                <button class="btn-change-account" onclick="showAccountSelector()">
                    Change Account
                </button>
            </div>
        `;
    } else {
        display.innerHTML = `
            <button class="btn-select-account" onclick="showAccountSelector()">
                Select Account
            </button>
        `;
    }
}

// Enable product buttons when account is selected
function enableProducts() {
    const productButtons = document.querySelectorAll('.product-card');
    productButtons.forEach(btn => {
        btn.disabled = !selectedAccount;
    });
}

// Add product to cart
function addToCart(product) {
    if (!selectedAccount) {
        showError('Please select an account first');
        return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCartDisplay();
}

// Remove one quantity from cart
function removeFromCart(productId) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        }
    }
    
    updateCartDisplay();
}

// Update cart display
function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <p>Cart is empty</p>
                <p class="hint">Tap items to add</p>
            </div>
        `;
        totalElement.textContent = '$0.00';
        return;
    }
    
    container.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(trimProductName(item.name))}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-item-controls">
                <button class="btn-quantity" onclick="removeFromCart(${item.id})">−</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="btn-quantity" onclick="addToCart({id: ${item.id}, name: '${escapeHtml(item.name).replace(/'/g, "\\'")}', price: ${item.price}})">+</button>
            </div>
            <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
        `;
        
        container.appendChild(cartItem);
    });
    
    totalElement.textContent = `$${total.toFixed(2)}`;
}

// Trim long words in product name
function trimProductName(name) {
    return name.split(' ').map(word => {
        if (word.length > 8) {
            return word.substring(0, 5) + '...';
        }
        return word;
    }).join(' ');
}

// Clear cart - show confirmation modal
function clearCart() {
    if (cart.length === 0 && !selectedAccount) return;

    // Show confirmation modal
    document.getElementById('confirmModal').classList.remove('hidden');
}

// Hide confirmation modal
function hideConfirmClear() {
    document.getElementById('confirmModal').classList.add('hidden');
}

// Confirm and execute clear
function confirmClear() {
    // Clear cart
    cart = [];
    updateCartDisplay();

    // Clear selected account
    selectedAccount = null;
    updateAccountDisplay();
    enableProducts();

    // Hide modal
    hideConfirmClear();
}

// Checkout
function checkout() {
    if (!selectedAccount) {
        showError('Please select an account first');
        return;
    }

    if (cart.length === 0) {
        showError('Cart is empty');
        return;
    }

    // Show confirmation modal with order details
    showCheckoutConfirm();
}

function showCheckoutConfirm() {
    const modal = document.getElementById('checkoutConfirmModal');
    const detailsContainer = document.getElementById('checkoutOrderDetails');

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Build order details HTML
    let html = `
        <div class="checkout-account">
            <strong>Account:</strong> ${escapeHtml(selectedAccount.account_name)}
        </div>
        <div class="checkout-items-list">
    `;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        html += `
            <div class="checkout-item">
                <div class="checkout-item-main">
                    <span class="checkout-item-qty">${item.quantity}x</span>
                    <span class="checkout-item-name">${escapeHtml(item.name)}</span>
                </div>
                <div class="checkout-item-total">$${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });

    html += `
        </div>
        <div class="checkout-total">
            <strong>Total:</strong> <span class="checkout-total-amount">$${total.toFixed(2)}</span>
        </div>
    `;

    detailsContainer.innerHTML = html;
    modal.classList.remove('hidden');
}

function hideCheckoutConfirm() {
    const modal = document.getElementById('checkoutConfirmModal');
    modal.classList.add('hidden');
}

async function confirmCheckout() {
    // Hide confirmation modal
    hideCheckoutConfirm();

    // Prepare transaction data
    const transactionData = {
        account_id: selectedAccount.id,
        transaction_type: 'purchase',
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        }))
    };

    try {
        const response = await fetchPost(`${API_URL}/transactions`, transactionData);

        if (!response.ok) {
            throw new Error('Transaction failed');
        }

        const result = await response.json();

        // Clear cart
        cart = [];
        updateCartDisplay();

        // Clear selected account
        selectedAccount = null;
        updateAccountDisplay();
        enableProducts();

        // Show success message
        showSuccess();

    } catch (error) {
        showError('Failed to complete transaction: ' + error.message);
        console.error('Checkout error:', error);
    }
}

// Show success message
function showSuccess(message = 'Transaction completed successfully!') {
    const toast = document.getElementById('successMessage');
    const text = document.getElementById('successText');

    text.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}

// Show error message
function showError(message) {
    const toast = document.getElementById('errorMessage');
    const text = document.getElementById('errorText');

    text.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Toggle family members field visibility
function toggleFamilyMembersField() {
    const accountType = document.getElementById('accountType').value;
    const familyMembersGroup = document.getElementById('familyMembersGroup');

    if (accountType === 'family') {
        familyMembersGroup.style.display = 'flex';
    } else {
        familyMembersGroup.style.display = 'none';
    }
}

// Show new account form
function showNewAccountForm() {
    // Hide account selector
    hideAccountSelector();

    // Reset form
    document.getElementById('newAccountForm').reset();

    // Show new account modal
    document.getElementById('newAccountModal').classList.remove('hidden');
    document.getElementById('accountName').focus();

    // Set initial visibility of family members field (default is family)
    toggleFamilyMembersField();
}

// Hide new account form
function hideNewAccountForm() {
    document.getElementById('newAccountModal').classList.add('hidden');

    // Show account selector again
    showAccountSelector();
}

// Create new account
async function createNewAccount() {
    const accountName = document.getElementById('accountName').value.trim();
    const accountType = document.getElementById('accountType').value;
    const notes = document.getElementById('notes').value.trim();
    const familyMembersText = document.getElementById('familyMembers').value.trim();

    // Validate
    if (!accountName) {
        showError('Please enter an account name');
        return;
    }

    // Parse family members (one per line)
    const familyMembers = familyMembersText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Prepare data
    const accountData = {
        account_name: accountName,
        account_type: accountType,
        notes: notes,
        family_members: familyMembers
    };

    try {
        const response = await fetchPost(`${API_URL}/pos/accounts`, accountData);

        if (!response.ok) {
            throw new Error('Failed to create account');
        }

        const result = await response.json();

        // Reload accounts
        await loadAccounts();

        // Hide form and show success
        hideNewAccountForm();
        showSuccess('Account created successfully!');

        // Auto-select the new account if we can find it
        const newAccount = accounts.find(acc => acc.account_number === result.account_number);
        if (newAccount) {
            selectAccount(newAccount);
        }

    } catch (error) {
        showError('Failed to create account: ' + error.message);
        console.error('Create account error:', error);
    }
}

// ============================================================================
// Prep Queue Functions
// ============================================================================

async function showPrepQueueModal() {
    document.getElementById('prepQueueModal').classList.remove('hidden');
    await loadPrepQueueList();
}

function hidePrepQueueModal() {
    document.getElementById('prepQueueModal').classList.add('hidden');
}

async function loadPrepQueueList() {
    const container = document.getElementById('prepQueueList');

    try {
        const response = await fetch(`${API_URL}/prep-queue`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.items.length === 0) {
            container.innerHTML = `
                <div class="prep-empty">
                    <div class="prep-empty-icon">✅</div>
                    <div style="font-size: 1.2rem; font-weight: 600;">All caught up!</div>
                    <div>No items in prep queue</div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        if (prepQueueViewMode === 'product') {
            // Show one line per product per account
            // Sort by ordered_at timestamp (FIFO - oldest first)
            const sortedItems = [...data.items].sort((a, b) => {
                const dateA = new Date(a.ordered_at);
                const dateB = new Date(b.ordered_at);
                return dateA - dateB; // Oldest first (FIFO)
            });

            sortedItems.forEach(item => {
                const orderedAt = new Date(item.ordered_at);
                const now = new Date();
                const minutesWaiting = Math.floor((now - orderedAt) / 1000 / 60);

                let urgencyClass = '';
                let timeText = `${minutesWaiting} min ago`;

                if (minutesWaiting >= urgentThresholdMinutes) {
                    urgencyClass = 'urgent';
                    timeText = `⚠️ ${timeText}`;
                } else if (minutesWaiting >= warningThresholdMinutes) {
                    urgencyClass = 'warning';
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = `prep-item ${urgencyClass}`;
                itemDiv.innerHTML = `
                    <div class="prep-item-info">
                        <div class="prep-item-product">${escapeHtml(item.product_name)}</div>
                        <div class="prep-item-details">
                            For: ${escapeHtml(item.account_name)} • ${escapeHtml(timeText)}
                        </div>
                    </div>
                    <div class="prep-item-quantity">${item.quantity}</div>
                `;
                container.appendChild(itemDiv);
            });
        } else {
            // Group by transaction (order)
            const grouped = {};
            data.items.forEach(item => {
                if (!grouped[item.transaction_id]) {
                    grouped[item.transaction_id] = {
                        account_name: item.account_name,
                        ordered_at: item.ordered_at,
                        items: []
                    };
                }
                grouped[item.transaction_id].items.push(item);
            });

            // Render grouped by order
            Object.values(grouped).forEach(order => {
                const orderedAt = new Date(order.ordered_at);
                const now = new Date();
                const minutesWaiting = Math.floor((now - orderedAt) / 1000 / 60);

                let urgencyClass = '';
                let timeText = `${minutesWaiting} min ago`;

                if (minutesWaiting >= urgentThresholdMinutes) {
                    urgencyClass = 'urgent';
                    timeText = `⚠️ ${timeText}`;
                } else if (minutesWaiting >= warningThresholdMinutes) {
                    urgencyClass = 'warning';
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = `prep-item ${urgencyClass}`;

                const itemsList = order.items.map(item =>
                    `<div style="margin-left: 1rem; color: #666;">• ${item.quantity}x ${escapeHtml(item.product_name)}</div>`
                ).join('');

                itemDiv.innerHTML = `
                    <div class="prep-item-info" style="flex: 1;">
                        <div class="prep-item-product">${escapeHtml(order.account_name)}</div>
                        <div class="prep-item-details">${escapeHtml(timeText)}</div>
                        ${itemsList}
                    </div>
                `;
                container.appendChild(itemDiv);
            });
        }

        // Update header count badge
        updatePrepQueueCount(data.items.length);

    } catch (error) {
        console.error('Error loading prep queue:', error);
        container.innerHTML = `
            <div class="prep-empty">
                <div class="prep-empty-icon">❌</div>
                <div>Error loading prep queue</div>
            </div>
        `;
    }
}

function updatePrepQueueCount(count) {
    const badge = document.getElementById('prepQueueCount');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Load prep queue count on page load
async function loadPrepQueueCount() {
    try {
        const response = await fetch(`${API_URL}/prep-queue`, {
            credentials: 'include'
        });

        // If user is not authenticated or doesn't have permission, silently skip
        if (response.status === 401 || response.status === 403 || response.status === 404) {
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        updatePrepQueueCount(data.items.length);
    } catch (error) {
        console.error('Error loading prep queue count:', error);
    }
}


function setPrepQueueViewMode(mode) {
    prepQueueViewMode = mode;
    
    // Update button states
    document.getElementById("viewByProductBtn").classList.toggle("active", mode === "product");
    document.getElementById("viewByOrderBtn").classList.toggle("active", mode === "order");
    
    // Reload the list with new view mode
    loadPrepQueueList();
}

// Expose functions to window for onclick handlers
window.showAccountSelector = showAccountSelector;
window.hideAccountSelector = hideAccountSelector;
window.selectAccount = selectAccount;
window.filterAccounts = filterAccounts;
window.showNewAccountForm = showNewAccountForm;
window.hideNewAccountForm = hideNewAccountForm;
window.createNewAccount = createNewAccount;
window.toggleFamilyMembersField = toggleFamilyMembersField;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.hideConfirmClear = hideConfirmClear;
window.confirmClear = confirmClear;
window.checkout = checkout;
window.hideCheckoutConfirm = hideCheckoutConfirm;
window.confirmCheckout = confirmCheckout;
window.showPrepQueueModal = showPrepQueueModal;
window.hidePrepQueueModal = hidePrepQueueModal;
window.setPrepQueueViewMode = setPrepQueueViewMode;
