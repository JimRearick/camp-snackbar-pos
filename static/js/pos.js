// Global state
let cart = [];
let selectedAccount = null;
let products = [];
let accounts = [];

// API Base URL
const API_URL = window.location.origin + '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadAccounts();

    // Only load prep queue if user has admin role
    // (POS users don't have access to prep queue)
    if (window.currentUser && window.currentUser.role === 'admin') {
        loadPrepQueueCount();
        // Refresh prep queue count every 30 seconds
        setInterval(loadPrepQueueCount, 30000);
    }
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
                    <div class="product-name">${product.name}</div>
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
                membersPreview = `<span class="account-members-preview">${members.join(' • ')}</span>`;
            }
        }

        card.innerHTML = `
            <div class="account-card-name">${account.account_name}</div>
            <div class="account-card-details">
                <span class="account-type">${account.account_type}</span>
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
                membersDisplay = `<div class="account-members">${members.join(' • ')}</div>`;
            }
        }

        display.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="account-info">
                    <div class="account-name">${selectedAccount.account_name}</div>
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
                <div class="cart-item-name">${trimProductName(item.name)}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-item-controls">
                <button class="btn-quantity" onclick="removeFromCart(${item.id})">−</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="btn-quantity" onclick="addToCart({id: ${item.id}, name: '${item.name}', price: ${item.price}})">+</button>
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
async function checkout() {
    if (!selectedAccount) {
        showError('Please select an account first');
        return;
    }
    
    if (cart.length === 0) {
        showError('Cart is empty');
        return;
    }
    
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
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });
        
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
function showSuccess() {
    const toast = document.getElementById('successMessage');
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
        const response = await fetch(`${API_URL}/pos/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(accountData)
        });

        if (!response.ok) {
            throw new Error('Failed to create account');
        }

        const result = await response.json();

        // Reload accounts
        await loadAccounts();

        // Hide form and show success
        hideNewAccountForm();
        showSuccess();

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
        const response = await fetch(`${API_URL}/prep-queue`);
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

        data.items.forEach(item => {
            const orderedAt = new Date(item.ordered_at);
            const now = new Date();
            const minutesWaiting = Math.floor((now - orderedAt) / 1000 / 60);

            let urgencyClass = '';
            let timeText = `${minutesWaiting} min ago`;

            if (minutesWaiting >= 5) {
                urgencyClass = 'urgent';
                timeText = `⚠️ ${timeText}`;
            } else if (minutesWaiting >= 2) {
                urgencyClass = 'warning';
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `prep-item ${urgencyClass}`;
            itemDiv.innerHTML = `
                <div class="prep-item-info">
                    <div class="prep-item-product">${item.product_name}</div>
                    <div class="prep-item-details">
                        For: ${item.account_name} • ${timeText}
                    </div>
                </div>
                <div class="prep-item-quantity">${item.quantity}</div>
            `;
            container.appendChild(itemDiv);
        });

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

        // If user doesn't have permission, silently skip
        if (response.status === 403) {
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
