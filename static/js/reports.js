/**
 * Reports page JavaScript
 */

import { API_URL } from './utils/constants.js';
import { apiGet } from './utils/api.js';
import { escapeHtml, formatLocalDateTime } from './utils/escape.js';
import { updatePageHeader } from './utils/settings.js';

// ============================================================================
// Initialization
// ============================================================================

async function loadCampName() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        if (response.ok) {
            const settings = await response.json();
            // Update page header with POS name
            updatePageHeader(settings, 'Reports');
        }
    } catch (error) {
        console.error('Error loading camp name:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCampName();
    loadSummary(); // Load default tab
});

// ============================================================================
// Tab Management
// ============================================================================

window.showTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Load data for the tab if needed
    switch(tabName) {
        case 'summary':
            loadSummary();
            break;
        case 'dailySales':
            loadDailySalesReport();
            break;
        case 'sales':
            loadSalesReport();
            break;
        case 'category':
            loadCategoryReport();
            break;
        case 'balances':
            loadAccountBalances();
            break;
        case 'accountDetails':
            loadAccountDetailsTab();
            break;
    }
};

// ============================================================================
// Logout
// ============================================================================

window.logout = function() {
    // Use the global logout function provided by auth.js
    if (window.authLogout) {
        window.authLogout();
    }
};

// ============================================================================
// Load Summary
// ============================================================================

async function loadSummary() {
    try {
        const summaryResponse = await fetch(`${API_URL}/reports/summary`);
        const summaryData = await summaryResponse.json();

        const accountsResponse = await fetch(`${API_URL}/accounts`);
        const accountsData = await accountsResponse.json();

        const transactionsResponse = await fetch(`${API_URL}/transactions?limit=10000`);
        const transactionsData = await transactionsResponse.json();

        // Total Accounts
        document.getElementById('totalAccounts').textContent = summaryData.total_accounts;

        // Active Accounts (accounts that have transactions)
        const accountsWithTransactions = new Set(
            transactionsData.transactions.map(t => t.account_id)
        );
        const activeAccounts = accountsWithTransactions.size;
        document.getElementById('activeAccounts').textContent = activeAccounts;

        // Total Sales (total spent)
        document.getElementById('totalSales').textContent = `$${summaryData.total_spent.toFixed(2)}`;

        // Total Balance Due (negative balances - money owed to camp)
        const balanceDue = accountsData.accounts
            .filter(acc => acc.current_balance < 0)
            .reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
        document.getElementById('totalBalanceDue').textContent = `$${balanceDue.toFixed(2)}`;

        // Load pie chart and top products
        await loadCategoryPieChart();
        await loadTopProducts();
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// ============================================================================
// Category Pie Chart
// ============================================================================

async function loadCategoryPieChart() {
    try {
        const salesResponse = await fetch(`${API_URL}/reports/sales`);
        const salesData = await salesResponse.json();

        const productsResponse = await fetch(`${API_URL}/products`);
        const productsData = await productsResponse.json();

        // Create a map of product names to categories
        const productToCategory = {};
        productsData.categories.forEach(cat => {
            cat.products.forEach(prod => {
                productToCategory[prod.name] = cat.name;
            });
        });

        // Aggregate sales by category
        const categoryTotals = {};
        salesData.sales.forEach(sale => {
            const category = productToCategory[sale.product_name] || 'Unknown';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += sale.total_revenue;
        });

        // Sort by revenue
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        // Color palette
        const colors = [
            '#667eea', // Purple
            '#f5576c', // Red
            '#4facfe', // Blue
            '#38ef7d', // Green
            '#f093fb', // Pink
            '#feca57', // Yellow
            '#ff6348', // Orange
            '#48dbfb'  // Cyan
        ];

        // Draw pie chart
        const canvas = document.getElementById('categoryPieChart');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate total
        const total = sortedCategories.reduce((sum, [, value]) => sum + value, 0);

        if (total === 0) {
            // Draw "No Data" message
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No sales data', centerX, centerY);
            document.getElementById('categoryLegend').innerHTML = '<div style="color: #999;">No sales data available</div>';
            return;
        }

        // Draw pie slices
        let currentAngle = -Math.PI / 2; // Start at top
        sortedCategories.forEach(([category, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;

            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            // Draw border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            currentAngle += sliceAngle;
        });

        // Draw legend
        const legendDiv = document.getElementById('categoryLegend');
        legendDiv.innerHTML = sortedCategories.map(([category, value], index) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 20px; height: 20px; background: ${colors[index % colors.length]}; border-radius: 3px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333;">${escapeHtml(category)}</div>
                        <div style="font-size: 0.9rem; color: #666;">$${value.toFixed(2)} (${percentage}%)</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading category pie chart:', error);
        const canvas = document.getElementById('categoryPieChart');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#dc3545';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Error loading chart', canvas.width / 2, canvas.height / 2);
    }
}

// ============================================================================
// Top Products Widget
// ============================================================================

async function loadTopProducts() {
    try {
        const salesResponse = await fetch(`${API_URL}/reports/sales`);
        const salesData = await salesResponse.json();

        const productsResponse = await fetch(`${API_URL}/products`);
        const productsData = await productsResponse.json();

        // Create a map of product names to categories
        const productToCategory = {};
        productsData.categories.forEach(cat => {
            cat.products.forEach(prod => {
                productToCategory[prod.name] = cat.name;
            });
        });

        // Get top 10 products by revenue
        const topProducts = salesData.sales
            .slice(0, 10)
            .map(product => ({
                ...product,
                category: productToCategory[product.product_name] || 'Unknown'
            }));

        const container = document.getElementById('topProductsList');

        if (topProducts.length === 0) {
            container.innerHTML = '<div style="color: #999; text-align: center; padding: 2rem;">No sales data available</div>';
            return;
        }

        // Medal emojis for top 3
        const medals = ['🥇', '🥈', '🥉'];

        container.innerHTML = topProducts.map((product, index) => {
            const rank = index < 3 ? medals[index] : `${index + 1}.`;
            return `
                <div class="top-product-item">
                    <div class="top-product-rank">${rank}</div>
                    <div class="top-product-info">
                        <div class="top-product-name">${escapeHtml(product.product_name)}</div>
                        <div class="top-product-category">${escapeHtml(product.category)}</div>
                    </div>
                    <div class="top-product-stats">
                        <div class="top-product-revenue">$${product.total_revenue.toFixed(2)}</div>
                        <div class="top-product-quantity">${product.total_quantity} sold</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading top products:', error);
        document.getElementById('topProductsList').innerHTML =
            '<div style="color: #dc3545; text-align: center; padding: 2rem;">Error loading top products</div>';
    }
}

// ============================================================================
// Load Daily Sales Report
// ============================================================================

// Category colors (matching the pie chart colors)
const CATEGORY_COLORS = {
    'Candy': '#FF6384',
    'Chips': '#36A2EB',
    'Drinks': '#FFCE56',
    'Grill': '#4BC0C0',
    'Soda': '#9966FF'
};

// Patterns for better differentiation
const CATEGORY_PATTERNS = {};

function createPattern(ctx, color) {
    const patternCanvas = document.createElement('canvas');
    const patternContext = patternCanvas.getContext('2d');
    patternCanvas.width = 10;
    patternCanvas.height = 10;

    patternContext.fillStyle = color;
    patternContext.fillRect(0, 0, 10, 10);

    return ctx.createPattern(patternCanvas, 'repeat');
}

let dailySalesData = null;

async function loadDailySalesReport() {
    try {
        const response = await fetch(`${API_URL}/reports/daily-sales`);
        const data = await response.json();

        dailySalesData = data;

        // Draw the column chart
        drawDailySalesChart(data);

        // Create legend
        createDailySalesLegend(data.categories);

        // Create data table
        createDailySalesTable(data);

    } catch (error) {
        console.error('Error loading daily sales:', error);
        document.getElementById('dailySalesTableContainer').innerHTML =
            '<div class="no-data">Error loading daily sales data</div>';
    }
}

function drawDailySalesChart(data) {
    const canvas = document.getElementById('dailySalesChart');
    const ctx = canvas.getContext('2d');

    // Set canvas size based on container
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 64; // Account for padding
    canvas.height = 400;

    const padding = { top: 20, right: 20, bottom: 80, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.daily_data.length === 0 || data.categories.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No sales data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Calculate max value for Y-axis
    let maxValue = 0;
    data.daily_data.forEach(day => {
        let dayTotal = 0;
        data.categories.forEach(cat => {
            dayTotal += day.totals[cat] || 0;
        });
        maxValue = Math.max(maxValue, dayTotal);
    });

    // Round up to nearest nice number
    const scale = Math.pow(10, Math.floor(Math.log10(maxValue)));
    maxValue = Math.ceil(maxValue / scale) * scale;

    // Draw Y-axis
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // Draw Y-axis labels and grid lines
    const ySteps = 5;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= ySteps; i++) {
        const value = (maxValue / ySteps) * i;
        const y = padding.top + chartHeight - (chartHeight / ySteps) * i;

        // Grid line
        ctx.strokeStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Label
        ctx.fillText('$' + value.toFixed(0), padding.left - 10, y);
    }

    // Draw X-axis
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Calculate bar width and spacing
    const barGroupWidth = chartWidth / data.daily_data.length;
    const barWidth = Math.min(barGroupWidth * 0.7, 50);
    const barSpacing = (barGroupWidth - barWidth) / 2;

    // Draw bars for each day
    data.daily_data.forEach((day, dayIndex) => {
        const x = padding.left + dayIndex * barGroupWidth + barSpacing;
        let stackY = padding.top + chartHeight;

        // Draw stacked bars for each category
        data.categories.forEach((category, catIndex) => {
            const value = day.totals[category] || 0;
            if (value > 0) {
                const barHeight = (value / maxValue) * chartHeight;
                const barY = stackY - barHeight;

                // Use color for category
                const color = CATEGORY_COLORS[category] || '#' + Math.floor(Math.random()*16777215).toString(16);
                ctx.fillStyle = color;
                ctx.fillRect(x, barY, barWidth, barHeight);

                // Add border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, barY, barWidth, barHeight);

                stackY = barY;
            }
        });

        // Draw date label with day of week
        // Parse date string as local date (avoid timezone conversion)
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum); // month is 0-indexed
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = dayNames[date.getDay()];
        const dateLabel = month + '/' + dayNum;

        ctx.save();
        ctx.translate(x + barWidth / 2, padding.top + chartHeight + 15);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#666';

        // Draw day of week in bold
        ctx.font = 'bold 11px Arial';
        ctx.fillText(dayOfWeek, 0, 0);

        // Draw date below
        ctx.font = '10px Arial';
        ctx.fillText(dateLabel, 0, 12);
        ctx.restore();
    });

    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sales ($)', padding.left - 35, padding.top + chartHeight / 2);
    ctx.fillText('Date', padding.left + chartWidth / 2, canvas.height - 10);
}

function createDailySalesLegend(categories) {
    const legendDiv = document.getElementById('dailySalesLegend');

    const html = categories.map(category => {
        const color = CATEGORY_COLORS[category] || '#' + Math.floor(Math.random()*16777215).toString(16);
        return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 24px; height: 24px; background: ${color}; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border-radius: 4px;"></div>
                <span style="font-weight: 600; color: #333;">${escapeHtml(category)}</span>
            </div>
        `;
    }).join('');

    legendDiv.innerHTML = html;
}

function createDailySalesTable(data) {
    const container = document.getElementById('dailySalesTableContainer');

    let html = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>Date</th>
    `;

    // Add category columns
    data.categories.forEach(cat => {
        html += `<th style="text-align: right;">${escapeHtml(cat)}</th>`;
    });

    html += `
                    <th style="text-align: right; font-weight: 700;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each day (reverse to show most recent first)
    const reversedData = [...data.daily_data].reverse();
    reversedData.forEach(day => {
        // Parse date string as local date (avoid timezone conversion)
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum); // month is 0-indexed
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        html += `<tr><td><strong>${escapeHtml(dayOfWeek)}</strong> ${escapeHtml(dateStr)}</td>`;

        let dayTotal = 0;
        data.categories.forEach(cat => {
            const value = day.totals[cat] || 0;
            dayTotal += value;
            html += `<td class="currency">$${value.toFixed(2)}</td>`;
        });

        html += `<td class="currency" style="font-weight: 700;">$${dayTotal.toFixed(2)}</td></tr>`;
    });

    // Add totals row
    html += `<tr style="border-top: 3px solid #333; background: #f8f9fa; font-weight: 700;">
                <td>Total</td>`;

    let grandTotal = 0;
    data.categories.forEach(cat => {
        let catTotal = 0;
        data.daily_data.forEach(day => {
            catTotal += day.totals[cat] || 0;
        });
        grandTotal += catTotal;
        html += `<td class="currency">$${catTotal.toFixed(2)}</td>`;
    });

    html += `<td class="currency" style="font-size: 1.1rem;">$${grandTotal.toFixed(2)}</td></tr>`;
    html += `</tbody></table>`;

    container.innerHTML = html;
}

window.exportDailySalesToCSV = function() {
    if (!dailySalesData) {
        alert('No data to export');
        return;
    }

    const headers = ['Date', ...dailySalesData.categories, 'Total'];

    const rows = [...dailySalesData.daily_data].reverse().map(day => {
        // Parse date string as local date (avoid timezone conversion)
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum); // month is 0-indexed
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const row = [`${dayOfWeek} ${dateStr}`];
        let dayTotal = 0;

        dailySalesData.categories.forEach(cat => {
            const value = day.totals[cat] || 0;
            dayTotal += value;
            row.push(value.toFixed(2));
        });

        row.push(dayTotal.toFixed(2));
        return row;
    });

    // Add totals row
    const totalsRow = ['Total'];
    let grandTotal = 0;
    dailySalesData.categories.forEach(cat => {
        let catTotal = 0;
        dailySalesData.daily_data.forEach(day => {
            catTotal += day.totals[cat] || 0;
        });
        grandTotal += catTotal;
        totalsRow.push(catTotal.toFixed(2));
    });
    totalsRow.push(grandTotal.toFixed(2));
    rows.push(totalsRow);

    const filename = `daily-sales-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filename, headers, rows);
};

// ============================================================================
// Load Sales Report
// ============================================================================

async function loadSalesReport() {
    try {
        const response = await fetch(`${API_URL}/reports/sales`);
        const data = await response.json();

        const container = document.getElementById('salesTableContainer');

        if (data.sales.length === 0) {
            container.innerHTML = '<div class="no-data">No sales data available</div>';
            return;
        }

        let html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Quantity Sold</th>
                        <th>Transactions</th>
                        <th style="text-align: right;">Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.sales.forEach(item => {
            html += `
                <tr>
                    <td>${escapeHtml(item.product_name)}</td>
                    <td>${item.total_quantity}</td>
                    <td>${item.transaction_count}</td>
                    <td class="currency positive">$${item.total_revenue.toFixed(2)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading sales report:', error);
        document.getElementById('salesTableContainer').innerHTML =
            '<div class="no-data">Error loading sales data</div>';
    }
}

// ============================================================================
// Load Account Balances
// ============================================================================

window.loadAccountBalances = async function() {
    try {
        const typeFilter = document.getElementById('accountTypeFilter').value;
        const url = typeFilter ?
            `${API_URL}/accounts?type=${typeFilter}` :
            `${API_URL}/accounts`;

        const response = await fetch(url);
        const data = await response.json();

        const container = document.getElementById('accountsTableContainer');

        if (data.accounts.length === 0) {
            container.innerHTML = '<div class="no-data">No accounts found</div>';
            return;
        }

        // Get transaction counts and totals for each account
        const transactionsResponse = await fetch(`${API_URL}/transactions?limit=10000`);
        const transactionsData = await transactionsResponse.json();

        const purchaseCounts = {};
        const purchaseTotals = {};
        transactionsData.transactions.forEach(transaction => {
            if (transaction.transaction_type === 'purchase') {
                purchaseCounts[transaction.account_id] = (purchaseCounts[transaction.account_id] || 0) + 1;
                purchaseTotals[transaction.account_id] = (purchaseTotals[transaction.account_id] || 0) + Math.abs(transaction.total_amount);
            }
        });

        let html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Purchase Count</th>
                        <th style="text-align: right;">Total Spent</th>
                        <th style="text-align: right;">Current Balance</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.accounts.forEach(account => {
            const spent = purchaseTotals[account.id] || 0;
            const balanceClass = account.current_balance < 0 ? 'negative' : 'positive';
            const purchaseCount = purchaseCounts[account.id] || 0;

            html += `
                <tr>
                    <td>${escapeHtml(account.account_name)}</td>
                    <td>${escapeHtml(account.account_type)}</td>
                    <td>${purchaseCount}</td>
                    <td class="currency">$${spent.toFixed(2)}</td>
                    <td class="currency ${balanceClass}">$${account.current_balance.toFixed(2)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading account balances:', error);
        document.getElementById('accountsTableContainer').innerHTML =
            '<div class="no-data">Error loading account data</div>';
    }
};

// ============================================================================
// Load Sales by Category Report
// ============================================================================

async function loadCategoryReport() {
    try {
        const salesResponse = await fetch(`${API_URL}/reports/sales`);
        const salesData = await salesResponse.json();

        const productsResponse = await fetch(`${API_URL}/products`);
        const productsData = await productsResponse.json();

        const container = document.getElementById('categoryTableContainer');

        if (productsData.categories.length === 0) {
            container.innerHTML = '<div class="no-data">No category data available</div>';
            return;
        }

        // Create a map of product names to categories
        const productToCategory = {};
        productsData.categories.forEach(cat => {
            cat.products.forEach(prod => {
                productToCategory[prod.name] = cat.name;
            });
        });

        // Aggregate sales by category
        const categoryTotals = {};
        salesData.sales.forEach(sale => {
            const category = productToCategory[sale.product_name] || 'Unknown';
            if (!categoryTotals[category]) {
                categoryTotals[category] = {
                    revenue: 0,
                    quantity: 0,
                    transactions: 0
                };
            }
            categoryTotals[category].revenue += sale.total_revenue;
            categoryTotals[category].quantity += sale.total_quantity;
            categoryTotals[category].transactions += sale.transaction_count;
        });

        // Sort by revenue
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1].revenue - a[1].revenue);

        let html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Items Sold</th>
                        <th>Transactions</th>
                        <th style="text-align: right;">Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedCategories.forEach(([category, data]) => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(category)}</strong></td>
                    <td>${data.quantity}</td>
                    <td>${data.transactions}</td>
                    <td class="currency positive">$${data.revenue.toFixed(2)}</td>
                </tr>
            `;
        });

        // Add total row
        const totalRevenue = sortedCategories.reduce((sum, [, data]) => sum + data.revenue, 0);
        const totalQuantity = sortedCategories.reduce((sum, [, data]) => sum + data.quantity, 0);
        const totalTransactions = sortedCategories.reduce((sum, [, data]) => sum + data.transactions, 0);

        html += `
                <tr style="background: #f0f0f0; font-weight: bold;">
                    <td>TOTAL</td>
                    <td>${totalQuantity}</td>
                    <td>${totalTransactions}</td>
                    <td class="currency">$${totalRevenue.toFixed(2)}</td>
                </tr>
        `;

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading category report:', error);
        document.getElementById('categoryTableContainer').innerHTML =
            '<div class="no-data">Error loading category data</div>';
    }
}

// ============================================================================
// CSV Export Functions
// ============================================================================

function exportToCSV(filename, headers, rows) {
    // Properly escape CSV fields
    const escapeCSVField = (field) => {
        const str = String(field);
        // If field contains comma, newline, carriage return, or double quote, wrap in quotes
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            // Escape double quotes by doubling them
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    let csv = headers.map(h => escapeCSVField(h)).join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => escapeCSVField(cell)).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

window.exportSummaryToCSV = async function() {
    const summaryResponse = await fetch(`${API_URL}/reports/summary`);
    const summaryData = await summaryResponse.json();

    const accountsResponse = await fetch(`${API_URL}/accounts`);
    const accountsData = await accountsResponse.json();

    const transactionsResponse = await fetch(`${API_URL}/transactions?limit=10000`);
    const transactionsData = await transactionsResponse.json();

    // Calculate metrics
    const accountsWithTransactions = new Set(
        transactionsData.transactions.map(t => t.account_id)
    );
    const activeAccounts = accountsWithTransactions.size;

    const balanceDue = accountsData.accounts
        .filter(acc => acc.current_balance < 0)
        .reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);

    const headers = ['Metric', 'Value'];
    const rows = [
        ['Total Accounts', summaryData.total_accounts],
        ['Active Accounts', activeAccounts],
        ['Total Sales', `$${summaryData.total_spent.toFixed(2)}`],
        ['Total Balance Due', `$${balanceDue.toFixed(2)}`],
        ['Total Prepaid', `$${summaryData.total_prepaid.toFixed(2)}`],
        ['Total Remaining', `$${summaryData.total_remaining.toFixed(2)}`],
        ['Total Transactions', summaryData.transaction_count]
    ];

    exportToCSV('camp-summary-report.csv', headers, rows);
};

window.exportSalesToCSV = async function() {
    const response = await fetch(`${API_URL}/reports/sales`);
    const data = await response.json();

    const headers = ['Product Name', 'Quantity Sold', 'Transactions', 'Total Revenue'];
    const rows = data.sales.map(item => [
        item.product_name,
        item.total_quantity,
        item.transaction_count,
        item.total_revenue.toFixed(2)
    ]);

    exportToCSV('sales-by-product-report.csv', headers, rows);
};

window.exportAccountBalancesToCSV = async function() {
    const typeFilter = document.getElementById('accountTypeFilter').value;
    const url = typeFilter ?
        `${API_URL}/accounts?type=${typeFilter}` :
        `${API_URL}/accounts`;

    const response = await fetch(url);
    const data = await response.json();

    // Get transaction counts and totals for each account
    const transactionsResponse = await fetch(`${API_URL}/transactions?limit=10000`);
    const transactionsData = await transactionsResponse.json();

    const purchaseCounts = {};
    const purchaseTotals = {};
    transactionsData.transactions.forEach(transaction => {
        if (transaction.transaction_type === 'purchase') {
            purchaseCounts[transaction.account_id] = (purchaseCounts[transaction.account_id] || 0) + 1;
            purchaseTotals[transaction.account_id] = (purchaseTotals[transaction.account_id] || 0) + Math.abs(transaction.total_amount);
        }
    });

    const headers = ['Name', 'Type', 'Purchase Count', 'Total Spent', 'Current Balance'];
    const rows = data.accounts.map(account => {
        const spent = purchaseTotals[account.id] || 0;
        const purchaseCount = purchaseCounts[account.id] || 0;
        return [
            account.account_name,
            account.account_type,
            purchaseCount,
            spent.toFixed(2),
            account.current_balance.toFixed(2)
        ];
    });

    exportToCSV('account-balances-report.csv', headers, rows);
};

window.exportCategoryToCSV = async function() {
    const salesResponse = await fetch(`${API_URL}/reports/sales`);
    const salesData = await salesResponse.json();

    const productsResponse = await fetch(`${API_URL}/products`);
    const productsData = await productsResponse.json();

    // Create a map of product names to categories
    const productToCategory = {};
    productsData.categories.forEach(cat => {
        cat.products.forEach(prod => {
            productToCategory[prod.name] = cat.name;
        });
    });

    // Aggregate sales by category
    const categoryTotals = {};
    salesData.sales.forEach(sale => {
        const category = productToCategory[sale.product_name] || 'Unknown';
        if (!categoryTotals[category]) {
            categoryTotals[category] = {
                revenue: 0,
                quantity: 0,
                transactions: 0
            };
        }
        categoryTotals[category].revenue += sale.total_revenue;
        categoryTotals[category].quantity += sale.total_quantity;
        categoryTotals[category].transactions += sale.transaction_count;
    });

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1].revenue - a[1].revenue);

    const headers = ['Category', 'Items Sold', 'Transactions', 'Total Revenue'];
    const rows = sortedCategories.map(([category, data]) => [
        category,
        data.quantity,
        data.transactions,
        data.revenue.toFixed(2)
    ]);

    // Add total row
    const totalRevenue = sortedCategories.reduce((sum, [, data]) => sum + data.revenue, 0);
    const totalQuantity = sortedCategories.reduce((sum, [, data]) => sum + data.quantity, 0);
    const totalTransactions = sortedCategories.reduce((sum, [, data]) => sum + data.transactions, 0);

    rows.push([
        'TOTAL',
        totalQuantity,
        totalTransactions,
        totalRevenue.toFixed(2)
    ]);

    exportToCSV('sales-by-category-report.csv', headers, rows);
};

// ============================================================================
// Account Transaction Details Report
// ============================================================================

let selectedAccountData = null;

window.loadAccountDetailsTab = async function() {
    // Populate account dropdown
    try {
        const response = await fetch(`${API_URL}/accounts`);
        const data = await response.json();

        const select = document.getElementById('accountDetailsSelect');
        select.innerHTML = '<option value="">Select an account...</option>';

        // Sort accounts by name
        data.accounts.sort((a, b) => a.account_name.localeCompare(b.account_name));

        data.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.account_name} (#${account.account_number})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
};

window.loadAccountTransactionDetails = async function() {
    const accountId = document.getElementById('accountDetailsSelect').value;
    const container = document.getElementById('accountDetailsTableContainer');
    const summaryDiv = document.getElementById('accountDetailsSummary');
    const exportBtn = document.getElementById('exportAccountDetailsBtn');

    if (!accountId) {
        container.innerHTML = '<div class="no-data">Select an account to view transaction details</div>';
        summaryDiv.innerHTML = '';
        exportBtn.disabled = true;
        selectedAccountData = null;
        return;
    }

    try {
        container.innerHTML = '<div class="loading">Loading transaction details...</div>';
        summaryDiv.innerHTML = '';

        // Fetch account details
        const accountResponse = await fetch(`${API_URL}/accounts/${accountId}`);
        const account = await accountResponse.json();

        // Fetch transactions for this account
        const transactionsResponse = await fetch(`${API_URL}/transactions?account_id=${accountId}`);
        const transactionsData = await transactionsResponse.json();
        const transactions = transactionsData.transactions || [];

        // Store for export
        selectedAccountData = {
            account,
            transactions
        };

        // Enable export button
        exportBtn.disabled = false;

        // Set Account name in summary section
        summaryDiv.innerHTML = `<h3 style="margin: 0 0 1rem 0; color: #333;text-align: center;">${escapeHtml(account.account_name)}</h3>`;

        if (transactions.length === 0) {
            container.innerHTML = '<div class="no-data">No transactions found for this account</div>';
            return;
        }

        // Build transactions table
        let html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Date/Time</th>
                        <th>Type</th>
                        <th style="text-align: right;">Amount</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;

        transactions.forEach(t => {
            const dateStr = formatLocalDateTime(t.created_at);
            const amountClass = t.transaction_type === 'purchase' ? 'negative' : 'positive';
            const notes = t.notes || '';

            html += `
                <tr>
                    <td>#${t.id}</td>
                    <td>${escapeHtml(dateStr)}</td>
                    <td><span class="type-badge">${escapeHtml(t.transaction_type)}</span></td>
                    <td class="currency ${amountClass}">$${Math.abs(t.total_amount).toFixed(2)}</td>
                    <td style="white-space: pre-wrap; max-width: 300px;">${escapeHtml(notes)}</td>
                </tr>
            `;
        });

        // Add total row with current balance
        const balanceClass = account.current_balance < 0 ? 'negative' : 'positive';
        html += `
                <tr style="border-top: 3px solid #333; background: #f8f9fa; font-weight: 600;">
                    <td colspan="3" style="text-align: right; padding-right: 1rem;">${escapeHtml(account.account_name)} - Current Balance:</td>
                    <td class="currency ${balanceClass}" style="font-size: 1.1rem;">$${account.current_balance.toFixed(2)}</td>
                    <td></td>
                </tr>
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading account transaction details:', error);
        container.innerHTML = '<div class="no-data">Error loading transaction details</div>';
        summaryDiv.innerHTML = '';
        exportBtn.disabled = true;
        selectedAccountData = null;
    }
};

window.exportAccountDetailsToCSV = function() {
    if (!selectedAccountData) {
        alert('No data to export');
        return;
    }

    const { account, transactions } = selectedAccountData;

    const headers = [
        'Transaction ID',
        'Date/Time',
        'Type',
        'Amount',
        'Notes'
    ];

    const rows = transactions.map(t => {
        const dateStr = formatLocalDateTime(t.created_at);
        return [
            t.id,
            dateStr,
            t.transaction_type,
            Math.abs(t.total_amount).toFixed(2),
            t.notes || ''
        ];
    });

    // Add total row with account name
    rows.push([
        '',
        '',
        `${account.account_name} - Current Balance`,
        account.current_balance.toFixed(2),
        ''
    ]);

    const filename = `account-transactions-${account.account_number}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filename, headers, rows);
};

// ============================================================================
// Initialize
// ============================================================================

// Load summary data on page load (auth check happens in reports.html via initAuth)
loadSummary();
