// Global state
let authToken = null;
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
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
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
                    <td>
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
                    <td>
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
            <td>
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
        document.getElementById('initialBalance').value = account.initial_balance || 0;
        document.getElementById('accountNotes').value = account.notes || '';

        // Load family members (one per line)
        const familyMembers = account.family_members || [];
        document.getElementById('familyMembers').value = familyMembers.join('\n');

        document.getElementById('accountModal').classList.remove('hidden');

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
            <td>${dateStr}</td>
            <td>${transaction.account_name || 'N/A'}</td>
            <td><span class="type-badge">${transaction.transaction_type}</span></td>
            <td style="color: ${transaction.transaction_type === 'purchase' ? '#dc3545' : '#28a745'}; font-weight: 600;">
                $${Math.abs(transaction.total_amount).toFixed(2)}
            </td>
            <td>$${transaction.balance_after.toFixed(2)}</td>
            <td>
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

        // Store transaction data globally for refund operations
        window.currentTransaction = data;

        const detailsDiv = document.getElementById('transactionDetails');
        const date = new Date(data.created_at);

        let itemsHTML = '';
        if (data.items && data.items.length > 0) {
            itemsHTML = `
                <div class="items-list">
                    <h3>Items:</h3>
                    ${data.items.map((item, index) => `
                        <div class="item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 6px;">
                            <div>
                                <span style="font-weight: 600;">${item.product_name}</span>
                                <span style="color: #666;"> x ${item.quantity}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-weight: 600;">$${item.line_total.toFixed(2)}</span>
                                ${data.transaction_type === 'purchase' ? `
                                    <button class="btn-edit" style="min-height: 40px; padding: 0.5rem 1rem; font-size: 0.9rem;"
                                            onclick="refundItem(${index})">Refund</button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Add refund button for full transaction (only for purchases)
        let refundButtonHTML = '';
        if (data.transaction_type === 'purchase') {
            refundButtonHTML = `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button class="btn-danger" onclick="refundFullTransaction()" style="width: 100%;">
                        Refund Full Transaction ($${Math.abs(data.total_amount).toFixed(2)})
                    </button>
                </div>
            `;
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
            ${refundButtonHTML}
        `;

        document.getElementById('transactionModal').classList.remove('hidden');
    } catch (error) {
        showError('Failed to load transaction details');
        console.error('Error:', error);
    }
}

function hideTransactionModal() {
    document.getElementById('transactionModal').classList.add('hidden');
}

// Refund full transaction
async function refundFullTransaction() {
    const transaction = window.currentTransaction;
    if (!transaction) {
        showError('Transaction data not available');
        return;
    }

    const refundAmount = Math.abs(transaction.total_amount);
    const confirmMsg = `Refund full transaction of $${refundAmount.toFixed(2)} to ${transaction.account_name}?`;

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const adjustmentData = {
            account_id: transaction.account_id,
            transaction_type: 'adjustment',
            total_amount: refundAmount, // Positive to add back to account
            notes: `Refund for transaction #${transaction.id} - Full refund`
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
            showSuccess('Full refund processed successfully');
            hideTransactionModal();
            loadTransactions();
            loadAccounts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to process refund');
        }
    } catch (error) {
        showError('Failed to process refund: ' + error.message);
        console.error('Error:', error);
    }
}

// Refund single item
async function refundItem(itemIndex) {
    const transaction = window.currentTransaction;
    if (!transaction || !transaction.items || !transaction.items[itemIndex]) {
        showError('Item data not available');
        return;
    }

    const item = transaction.items[itemIndex];
    const refundAmount = item.line_total;
    const confirmMsg = `Refund ${item.product_name} (x${item.quantity}) for $${refundAmount.toFixed(2)}?`;

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const adjustmentData = {
            account_id: transaction.account_id,
            transaction_type: 'adjustment',
            total_amount: refundAmount, // Positive to add back to account
            notes: `Refund for transaction #${transaction.id} - ${item.product_name} (x${item.quantity})`
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
            showSuccess('Item refund processed successfully');

            // Reload transaction details to show updated info
            await viewTransactionDetails(transaction.id);

            // Reload transactions and accounts tables
            loadTransactions();
            loadAccounts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to process refund');
        }
    } catch (error) {
        showError('Failed to process refund: ' + error.message);
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
