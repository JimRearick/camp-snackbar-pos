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
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category.name;
        grid.appendChild(categoryHeader);
        
        // Add products
        category.products.forEach(product => {
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
    });
}

// Load accounts from API
async function loadAccounts() {
    try {
        const response = await fetch(`${API_URL}/accounts`);
        const data = await response.json();
        
        if (data.accounts && Array.isArray(data.accounts)) {
            accounts = data.accounts;
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
        
        card.innerHTML = `
            <div class="account-card-name">${account.account_name}</div>
            <div class="account-card-details">
                <span class="account-type">${account.account_type}</span>
                <span class="account-card-balance">Balance: $${account.current_balance.toFixed(2)}</span>
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
        display.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="account-info">
                    <div class="account-name">${selectedAccount.account_name}</div>
                    <div class="account-balance">Balance: $${selectedAccount.current_balance.toFixed(2)}</div>
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
                <div class="cart-item-name">${item.name}</div>
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
