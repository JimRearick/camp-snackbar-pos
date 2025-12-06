// Global state
let authToken = localStorage.getItem('adminToken');
let allAccounts = [];
let allTransactions = [];
let showInactiveProducts = false; // Filter state for inventory display
let allProductsData = null; // Cache all products data for filtering

// API Base URL
const API_URL = window.location.origin + '/api';

// ============================================================================
// Authentication
// ============================================================================

async function login(event) {
    event.preventDefault();

    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');

            // Load initial data
            loadProducts();
            loadCategories();
            loadAccounts();
            loadTransactions();
        } else {
            showLoginError('Invalid password');
        }
    } catch (error) {
        showLoginError('Login failed: ' + error.message);
        console.error('Login error:', error);
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
}

function handleUnauthorized() {
    showError('Session expired. Please log in again.');
    setTimeout(() => {
        logout();
    }, 2000);
}

function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');

    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 3000);
}

// ============================================================================
// Tab Navigation
// ============================================================================

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Mark button as active
    event.target.classList.add('active');
}

// ============================================================================
// Inventory Management
// ============================================================================

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        // Cache the data for filtering
        allProductsData = data;

        // Display products with current filter
        displayProductsTable();

    } catch (error) {
        showError('Failed to load products');
        console.error('Error loading products:', error);
    }
}

function displayProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (allProductsData && allProductsData.categories && Array.isArray(allProductsData.categories)) {
        allProductsData.categories.forEach(category => {
            category.products.forEach(product => {
                // Filter based on showInactiveProducts state
                if (!showInactiveProducts && !product.active) {
                    return; // Skip inactive products when filter is off
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${category.name}</td>
                    <td>${product.name}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td><span class="status-badge ${product.active ? 'status-active' : 'status-inactive'}">
                        ${product.active ? 'Active' : 'Inactive'}
                    </span></td>
                    <td style="text-align: right;">
                        <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }
}

function toggleInactiveProducts() {
    showInactiveProducts = !showInactiveProducts;

    // Update button text
    const btn = document.getElementById('toggleInactiveBtn');
    btn.textContent = showInactiveProducts ? 'Hide Inactive' : 'Show Inactive';

    // Refresh display
    displayProductsTable();
}

function loadCategoriesDropdown(categories) {
    console.log('Loading categories into dropdown:', categories);

    const select = document.getElementById('productCategory');
    if (!select) {
        console.error('productCategory select element not found');
        return;
    }

    select.innerHTML = '';

    if (!categories || categories.length === 0) {
        console.warn('No categories to load');
        return;
    }

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });

    console.log(`Loaded ${categories.length} categories into dropdown`);
}

async function showAddProductForm() {
    document.getElementById('productModalTitle').textContent = 'Add Product';

    // Clear form fields
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productActive').checked = true;

    // Show modal FIRST so DOM elements are accessible
    document.getElementById('productModal').classList.remove('hidden');

    // Now load categories after modal is visible
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        if (data.categories && Array.isArray(data.categories)) {
            loadCategoriesDropdown(data.categories);
        }
    } catch (error) {
        showError('Failed to load categories');
        console.error('Error loading categories:', error);
    }
}

async function editProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        console.log('Edit Product - Fetched data:', data);
 
        let product = null;
        data.categories.forEach(cat => {
            const found = cat.products.find(p => p.id === productId);
            if (found) {
                product = found;
                product.category_id = cat.id;
            }
        });

        if (product) {
            console.log('Editing product:', product);

            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productActive').checked = product.active;

            // Show modal FIRST so DOM elements are accessible
            document.getElementById('productModal').classList.remove('hidden');

            // Now load categories after modal is visible
            console.log('Modal is now visible, loading categories...');
            if (data.categories && Array.isArray(data.categories)) {
                loadCategoriesDropdown(data.categories);
            }

            // Set category value after a brief delay to ensure dropdown is populated
            setTimeout(() => {
                const categorySelect = document.getElementById('productCategory');
                console.log('Setting category to:', product.category_id);
                console.log('Available options:', Array.from(categorySelect.options).map(o => `${o.value}: ${o.text}`));
                categorySelect.value = product.category_id;
                console.log('Category select value after setting:', categorySelect.value);
            }, 100);
        }
    } catch (error) {
        showError('Failed to load product');
        console.error('Error:', error);
    }
}

async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const categoryId = document.getElementById('productCategory').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const active = document.getElementById('productActive').checked;

    // Validate all required fields
    if (!categoryId || categoryId === '') {
        showError('Please select a category');
        return;
    }

    if (!name || !price) {
        showError('Please fill in all required fields');
        return;
    }

    const parsedCategoryId = parseInt(categoryId);
    if (isNaN(parsedCategoryId)) {
        showError('Invalid category selected');
        return;
    }

    // Check for duplicate product names when adding new product
    if (!productId && allProductsData) {
        let duplicateFound = false;
        allProductsData.categories.forEach(category => {
            category.products.forEach(product => {
                if (product.name.toLowerCase() === name.toLowerCase()) {
                    duplicateFound = true;
                }
            });
        });

        if (duplicateFound) {
            showError('A product with this name already exists');
            return;
        }
    }

    const productData = {
        category_id: parsedCategoryId,
        name,
        price,
        active: active ? 1 : 0
    };

    try {
        const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            showSuccess(productId ? 'Product updated' : 'Product added');
            hideProductModal();
            loadProducts();
        } else if (response.status === 401) {
            handleUnauthorized();
            return;
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to save product (HTTP ${response.status})`;
            throw new Error(errorMsg);
        }
    } catch (error) {
        showError('Failed to save product: ' + error.message);
        console.error('Error:', error);
        console.error('Product data:', productData);
    }
}

function hideProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// ============================================================================
// Category Management
// ============================================================================

async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        const tbody = document.getElementById('categoriesTableBody');
        tbody.innerHTML = '';

        if (data.categories && Array.isArray(data.categories)) {
            data.categories.forEach(category => {
                const row = document.createElement('tr');
                const productCount = category.products ? category.products.length : 0;

                row.innerHTML = `
                    <td>${category.name}</td>
                    <td>${productCount}</td>
                    <td style="text-align: right;">
                        <button class="btn-edit" onclick="editCategory(${category.id})">Edit</button>
                        <button class="btn-danger" onclick="deleteCategory(${category.id}, '${category.name}', ${productCount})">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        showError('Failed to load categories');
        console.error('Error loading categories:', error);
    }
}

function showAddCategoryForm() {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModal').classList.remove('hidden');
}

async function editCategory(categoryId) {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        const category = data.categories.find(c => c.id === categoryId);

        if (category) {
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryModal').classList.remove('hidden');
        }
    } catch (error) {
        showError('Failed to load category');
        console.error('Error:', error);
    }
}

async function saveCategory() {
    const categoryId = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();

    if (!name) {
        showError('Please enter a category name');
        return;
    }

    const categoryData = { name };

    try {
        const url = categoryId ? `${API_URL}/categories/${categoryId}` : `${API_URL}/categories`;
        const method = categoryId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(categoryData)
        });

        if (response.ok) {
            showSuccess(categoryId ? 'Category updated' : 'Category added');
            hideCategoryModal();
            loadCategories();
            loadProducts(); // Reload products to update category dropdown
        } else {
            throw new Error('Failed to save category');
        }
    } catch (error) {
        showError('Failed to save category: ' + error.message);
        console.error('Error:', error);
    }
}

async function deleteCategory(categoryId, categoryName, productCount) {
    if (productCount > 0) {
        showError(`Cannot delete category "${categoryName}" - it contains ${productCount} product(s)`);
        return;
    }

    if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            showSuccess('Category deleted');
            loadCategories();
        } else {
            throw new Error('Failed to delete category');
        }
    } catch (error) {
        showError('Failed to delete category: ' + error.message);
        console.error('Error:', error);
    }
}

function hideCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

// ============================================================================
// Account Management
// ============================================================================

async function loadAccounts() {
    try {
        const response = await fetch(`${API_URL}/accounts`);
        const data = await response.json();

        allAccounts = data.accounts || [];
        displayAccountsTable(allAccounts);
    } catch (error) {
        showError('Failed to load accounts');
        console.error('Error loading accounts:', error);
    }
}

function displayAccountsTable(accountsList) {
    const tbody = document.getElementById('accountsTableBody');
    tbody.innerHTML = '';

    accountsList.forEach(account => {
        const row = document.createElement('tr');
        const createdDate = new Date(account.created_at).toLocaleDateString();

        row.innerHTML = `
            <td>${account.account_number}</td>
            <td>${account.account_name}</td>
            <td><span class="type-badge">${account.account_type}</span></td>
            <td style="color: ${account.current_balance < 0 ? '#dc3545' : '#28a745'}; font-weight: 600;">
                $${account.current_balance.toFixed(2)}
            </td>
            <td>${createdDate}</td>
            <td style="text-align: right;">
                <button class="btn-edit" onclick="editAccount(${account.id})">Edit</button>
                <button class="btn-view" onclick="viewAccountDetailsModal(${account.id})">View Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterAccountsTable() {
    const searchTerm = document.getElementById('accountSearchInput').value.toLowerCase();
    const filtered = allAccounts.filter(account =>
        account.account_name.toLowerCase().includes(searchTerm) ||
        account.account_number.toLowerCase().includes(searchTerm)
    );
    displayAccountsTable(filtered);
}

function toggleFamilyMembersField() {
    const accountType = document.getElementById('accountType').value;
    const familyMembersGroup = document.getElementById('familyMembersGroup');

    if (accountType === 'family') {
        familyMembersGroup.style.display = 'flex';
    } else {
        familyMembersGroup.style.display = 'none';
    }
}

function showAddAccountForm() {
    document.getElementById('accountModalTitle').textContent = 'Add Account';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('initialBalance').value = '0';
    document.getElementById('accountModal').classList.remove('hidden');

    // Show initial balance field for new accounts
    document.getElementById('initialBalanceGroup').style.display = 'flex';

    // Set initial visibility of family members field
    toggleFamilyMembersField();
}

async function editAccount(accountId) {
    try {
        const response = await fetch(`${API_URL}/accounts/${accountId}`);
        const account = await response.json();

        document.getElementById('accountModalTitle').textContent = 'Edit Account';
        document.getElementById('accountId').value = account.id;
        document.getElementById('accountName').value = account.account_name;
        document.getElementById('accountType').value = account.account_type;
        document.getElementById('accountNotes').value = account.notes || '';

        // Load family members (one per line)
        const familyMembers = account.family_members || [];
        document.getElementById('familyMembers').value = familyMembers.join('\n');

        document.getElementById('accountModal').classList.remove('hidden');

        // Hide initial balance field when editing
        document.getElementById('initialBalanceGroup').style.display = 'none';

        // Toggle family members field based on account type
        toggleFamilyMembersField();
    } catch (error) {
        showError('Failed to load account');
        console.error('Error:', error);
    }
}

async function saveAccount() {
    const accountId = document.getElementById('accountId').value;
    const accountName = document.getElementById('accountName').value.trim();
    const accountType = document.getElementById('accountType').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
    const notes = document.getElementById('accountNotes').value.trim();
    const familyMembersText = document.getElementById('familyMembers').value.trim();

    if (!accountName) {
        showError('Please enter an account name');
        return;
    }

    // Parse family members (one per line)
    const familyMembers = familyMembersText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const accountData = {
        account_name: accountName,
        account_type: accountType,
        family_members: familyMembers,
        notes: notes
    };

    // Only include initial_balance for new accounts
    if (!accountId) {
        accountData.initial_balance = initialBalance;
    }

    try {
        const url = accountId ? `${API_URL}/accounts/${accountId}` : `${API_URL}/accounts`;
        const method = accountId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(accountData)
        });

        if (response.ok) {
            showSuccess(accountId ? 'Account updated' : 'Account created');
            hideAccountModal();
            loadAccounts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save account');
        }
    } catch (error) {
        showError('Failed to save account: ' + error.message);
        console.error('Error:', error);
    }
}

function hideAccountModal() {
    document.getElementById('accountModal').classList.add('hidden');
}

async function viewAccountDetailsModal(accountId) {
    try {
        // Fetch account details
        const accountResponse = await fetch(`${API_URL}/accounts/${accountId}`);
        const account = await accountResponse.json();

        // Store account for Add Funds feature
        currentAccountForFunds = account;

        // Fetch transactions for this account
        const transactionsResponse = await fetch(`${API_URL}/transactions?account_id=${accountId}`);
        const transactionsData = await transactionsResponse.json();
        const transactions = transactionsData.transactions || [];

        // Build the details HTML
        const detailsDiv = document.getElementById('accountDetailsContent');

        let familyMembersHTML = '';
        if (account.family_members && account.family_members.length > 0) {
            familyMembersHTML = `
                <div class="detail-row">
                    <span class="detail-label">Family Members:</span>
                    <span class="detail-value">${account.family_members.join(', ')}</span>
                </div>
            `;
        }

        let notesHTML = '';
        if (account.notes) {
            notesHTML = `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${account.notes}</span>
                </div>
            `;
        }

        // Build transactions table
        let transactionsHTML = '';
        if (transactions.length > 0) {
            transactionsHTML = `
                <div style="margin-top: 2rem;">
                    <h3 style="color: #2c3e50; margin-bottom: 1rem;">Transaction History</h3>
                    <div style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Date/Time</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Balance After</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.map(t => {
                                    const date = new Date(t.created_at);
                                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                                    return `
                                        <tr>
                                            <td>${dateStr}</td>
                                            <td><span class="type-badge">${t.transaction_type}</span></td>
                                            <td style="color: ${t.transaction_type === 'purchase' ? '#dc3545' : '#28a745'}; font-weight: 600;">
                                                $${Math.abs(t.total_amount).toFixed(2)}
                                            </td>
                                            <td>$${t.balance_after.toFixed(2)}</td>
                                            <td>
                                                <button class="btn-view" onclick="viewTransactionDetails(${t.id})">Details</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            transactionsHTML = `
                <div style="margin-top: 2rem;">
                    <h3 style="color: #2c3e50; margin-bottom: 1rem;">Transaction History</h3>
                    <p style="color: #666; text-align: center; padding: 2rem;">No transactions yet</p>
                </div>
            `;
        }

        detailsDiv.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Account Name:</span>
                <span class="detail-value">${account.account_name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Account Type:</span>
                <span class="detail-value"><span class="type-badge">${account.account_type}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Current Balance:</span>
                <span class="detail-value" style="color: ${account.current_balance < 0 ? '#dc3545' : '#28a745'}; font-weight: 600; font-size: 1.2rem;">
                    $${account.current_balance.toFixed(2)}
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Initial Balance:</span>
                <span class="detail-value">$${account.initial_balance.toFixed(2)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Spent:</span>
                <span class="detail-value">$${account.total_spent.toFixed(2)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Transaction Count:</span>
                <span class="detail-value">${account.transaction_count}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${new Date(account.created_at).toLocaleString()}</span>
            </div>
            ${familyMembersHTML}
            ${notesHTML}
            ${transactionsHTML}
        `;

        document.getElementById('accountDetailsModal').classList.remove('hidden');
    } catch (error) {
        showError('Failed to load account details');
        console.error('Error:', error);
    }
}

function hideAccountDetailsModal() {
    document.getElementById('accountDetailsModal').classList.add('hidden');
}

// ============================================================================
// Add Funds to Account
// ============================================================================

let currentAccountForFunds = null;

function showAddFundsModal() {
    // Get the current account ID
    const accountId = currentAccountForFunds?.id;

    if (!accountId) {
        showError('Please select an account first');
        return;
    }

    // Reset form
    document.getElementById('addFundsForm').reset();
    document.getElementById('fundsAccountId').value = accountId;
    document.getElementById('fundsAccountName').value = currentAccountForFunds.account_name;
    document.getElementById('fundsAmount').value = '';
    document.getElementById('fundsNotes').value = '';

    // Show modal
    document.getElementById('addFundsModal').classList.remove('hidden');
    document.getElementById('fundsAmount').focus();
}

function hideAddFundsModal() {
    document.getElementById('addFundsModal').classList.add('hidden');
}

async function addFundsToAccount() {
    const accountId = document.getElementById('fundsAccountId').value;
    const amount = parseFloat(document.getElementById('fundsAmount').value);
    const notes = document.getElementById('fundsNotes').value.trim();

    // Validate
    if (!amount || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }

    try {
        const paymentData = {
            account_id: parseInt(accountId),
            transaction_type: 'payment',
            total_amount: amount,
            notes: notes || 'Funds added to account'
        };

        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(paymentData)
        });

        if (response.ok) {
            showSuccess(`$${amount.toFixed(2)} added successfully`);
            hideAddFundsModal();

            // Reload account details and accounts list
            await viewAccountDetailsModal(accountId);
            loadAccounts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to add funds');
        }
    } catch (error) {
        showError('Failed to add funds: ' + error.message);
        console.error('Error:', error);
    }
}

// ============================================================================
// Transaction Management
// ============================================================================

async function loadTransactions() {
    const typeFilter = document.getElementById('transactionTypeFilter')?.value || '';

    try {
        const response = await fetch(`${API_URL}/transactions`);
        const data = await response.json();

        allTransactions = data.transactions || [];

        // Filter by type if selected
        let filtered = allTransactions;
        if (typeFilter) {
            filtered = allTransactions.filter(t => t.transaction_type === typeFilter);
        }

        displayTransactionsTable(filtered);
    } catch (error) {
        showError('Failed to load transactions');
        console.error('Error loading transactions:', error);
    }
}

function displayTransactionsTable(transactionsList) {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    transactionsList.forEach(transaction => {
        const row = document.createElement('tr');
        const date = new Date(transaction.created_at);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        row.innerHTML = `
            <td>#${transaction.id}</td>
            <td>${dateStr}</td>
            <td>${transaction.account_name || 'N/A'}</td>
            <td><span class="type-badge">${transaction.transaction_type}</span></td>
            <td style="color: ${transaction.transaction_type === 'purchase' ? '#dc3545' : '#28a745'}; font-weight: 600;">
                $${Math.abs(transaction.total_amount).toFixed(2)}
            </td>
            <td style="text-align: right;">
                <button class="btn-view" onclick="viewTransactionDetails(${transaction.id})">Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function viewTransactionDetails(transactionId) {
    try {
        const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();

        // Store transaction data globally for adjust operations
        window.currentTransaction = data;
        window.adjustModeEnabled = false;

        const detailsDiv = document.getElementById('transactionDetails');
        const date = new Date(data.created_at);

        // Check if transaction has already been adjusted
        const hasBeenAdjusted = data.has_been_adjusted || false;

        let itemsHTML = '';
        if (data.items && data.items.length > 0) {
            itemsHTML = `
                <div class="items-list">
                    <h3>Items:</h3>
                    <div id="itemsList">
                        ${data.items.map((item, index) => `
                            <div class="item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 6px;">
                                <div style="flex: 1;">
                                    <span style="font-weight: 600;">${item.product_name}</span>
                                    <span style="color: #666;"> x ${item.quantity}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span style="font-weight: 600;">$${item.line_total.toFixed(2)}</span>
                                    <span class="adjust-controls" style="display: none; align-items: center; gap: 0.5rem;">
                                        <button class="btn-quantity" onclick="decrementAdjustQty(${index})" style="width: 40px; height: 40px; font-size: 1.5rem; padding: 0; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">−</button>
                                        <span id="adjustQty_${index}" data-max="${item.quantity}" style="min-width: 30px; text-align: center; font-size: 1.2rem; font-weight: 600;">0</span>
                                        <button class="btn-quantity" onclick="incrementAdjustQty(${index}, ${item.quantity})" style="width: 40px; height: 40px; font-size: 1.5rem; padding: 0; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">+</button>
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Add toggle button and adjust button for full transaction (only for purchases that haven't been adjusted)
        let adjustButtonHTML = '';
        if (data.transaction_type === 'purchase') {
            if (hasBeenAdjusted) {
                adjustButtonHTML = `
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                        <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 1rem; border-radius: 8px; text-align: center;">
                            <strong>⚠️ This transaction has already been adjusted and cannot be adjusted again.</strong>
                        </div>
                    </div>
                `;
            } else {
                adjustButtonHTML = `
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                        <button class="btn-secondary" onclick="toggleAdjustMode()" style="width: 100%; margin-bottom: 1rem;">
                            Adjust Transaction
                        </button>
                        <div id="adjustSection" style="display: none;">
                            <button class="btn-danger" onclick="processAdjustment()" style="width: 100%;">
                                Process Adjustment
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        detailsDiv.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Transaction ID:</span>
                <span class="detail-value">#${data.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date/Time:</span>
                <span class="detail-value">${date.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Account:</span>
                <span class="detail-value">${data.account_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${data.transaction_type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value" style="color: ${data.transaction_type === 'purchase' ? '#dc3545' : '#28a745'}; font-weight: 600;">
                    $${Math.abs(data.total_amount).toFixed(2)}
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Balance After:</span>
                <span class="detail-value">$${data.balance_after.toFixed(2)}</span>
            </div>
            ${data.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${data.notes}</span>
                </div>
            ` : ''}
            ${itemsHTML}
            ${adjustButtonHTML}
        `;

        document.getElementById('transactionModal').classList.remove('hidden');
    } catch (error) {
        showError('Failed to load transaction details');
        console.error('Error:', error);
    }
}

function toggleAdjustMode() {
    window.adjustModeEnabled = !window.adjustModeEnabled;

    const adjustControls = document.querySelectorAll('.adjust-controls');
    const adjustSection = document.getElementById('adjustSection');
    const toggleBtn = event.target;

    if (window.adjustModeEnabled) {
        adjustControls.forEach(control => control.style.display = 'flex');
        if (adjustSection) adjustSection.style.display = 'block';
        toggleBtn.textContent = 'Cancel Adjust';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-warning');
    } else {
        adjustControls.forEach(control => control.style.display = 'none');
        if (adjustSection) adjustSection.style.display = 'none';
        toggleBtn.textContent = 'Adjust Transaction';
        toggleBtn.classList.remove('btn-warning');
        toggleBtn.classList.add('btn-secondary');

        // Reset all quantities to 0
        document.querySelectorAll('[id^="adjustQty_"]').forEach(qtySpan => {
            qtySpan.textContent = '0';
        });
    }
}

function decrementAdjustQty(itemIndex) {
    const qtySpan = document.getElementById(`adjustQty_${itemIndex}`);
    let currentQty = parseInt(qtySpan.textContent);
    if (currentQty > 0) {
        qtySpan.textContent = currentQty - 1;
    }
}

function incrementAdjustQty(itemIndex, maxQty) {
    const qtySpan = document.getElementById(`adjustQty_${itemIndex}`);
    let currentQty = parseInt(qtySpan.textContent);
    if (currentQty < maxQty) {
        qtySpan.textContent = currentQty + 1;
    }
}

function hideTransactionModal() {
    document.getElementById('transactionModal').classList.add('hidden');
}

// Process adjustment for selected items
async function processAdjustment() {
    const transaction = window.currentTransaction;
    if (!transaction) {
        showError('Transaction data not available');
        return;
    }

    // Collect all items with quantities > 0
    const adjustedItems = [];
    let totalAdjustAmount = 0;

    transaction.items.forEach((item, index) => {
        const qtySpan = document.getElementById(`adjustQty_${index}`);
        const adjustQty = qtySpan ? parseInt(qtySpan.textContent) : 0;

        if (adjustQty > 0) {
            const unitPrice = item.line_total / item.quantity;
            const itemAdjustAmount = unitPrice * adjustQty;
            totalAdjustAmount += itemAdjustAmount;

            adjustedItems.push({
                name: item.product_name,
                quantity: adjustQty,
                originalQuantity: item.quantity,
                amount: itemAdjustAmount
            });
        }
    });

    // Validate that at least one item is being adjusted
    if (adjustedItems.length === 0) {
        showError('Please select at least one item to adjust (quantity must be greater than 0)');
        return;
    }

    // Build detailed note
    let detailedNote = `Adjustment for transaction #${transaction.id}:\n`;
    adjustedItems.forEach(item => {
        detailedNote += `- ${item.name} (x${item.quantity}): $${item.amount.toFixed(2)}\n`;
    });

    const confirmMsg = `Process adjustment of $${totalAdjustAmount.toFixed(2)} for ${adjustedItems.length} item(s) to ${transaction.account_name}?\n\nNote: This transaction will be marked as adjusted and cannot be adjusted again.`;

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const adjustmentData = {
            account_id: transaction.account_id,
            transaction_type: 'adjustment',
            total_amount: totalAdjustAmount, // Positive to add back to account
            notes: detailedNote,
            original_transaction_id: transaction.id
        };

        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(adjustmentData)
        });

        if (response.ok) {
            showSuccess('Adjustment processed successfully');
            hideTransactionModal();
            loadTransactions();
            loadAccounts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to process adjustment');
        }
    } catch (error) {
        showError('Failed to process adjustment: ' + error.message);
        console.error('Error:', error);
    }
}

// ============================================================================
// Toast Messages
// ============================================================================

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ============================================================================
// Auto-login on page load
// ============================================================================

// Check if user is already logged in
if (authToken) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');

    // Load initial data
    loadProducts();
    loadCategories();
    loadAccounts();
    loadTransactions();
}
