// --- GLOBALS & CONFIG --- //
const VALID_USR = 'venkatesh@gmail.com';
const VALID_PWD = 'password123';

const isLogin = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
const isDashboard = window.location.pathname.endsWith('dashboard.html');

let transactions = JSON.parse(localStorage.getItem('expense_transactions')) || [];
let currentFilter = 'All';

// --- INIT --- //
function init() {
    checkTheme();
    checkAuth();
    if (isLogin) {
        initLogin();
    } else if (isDashboard) {
        initDashboard();
    }
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn && isDashboard) window.location.href = 'index.html';
    if (isLoggedIn && isLogin) window.location.href = 'dashboard.html';
}

function checkTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// --- LOGIN LOGIC --- //
function initLogin() {
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('loginError');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        
        errorMsg.style.display = 'none';
        
        // Mock loading state
        loginText.style.display = 'none';
        loginSpinner.style.display = 'block';
        
        setTimeout(() => {
            if (u === VALID_USR && p === VALID_PWD) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUser', 'Venkatesh');
                window.location.href = 'dashboard.html';
            } else {
                loginText.style.display = 'block';
                loginSpinner.style.display = 'none';
                errorMsg.style.display = 'block';
            }
        }, 800);
    });
}

// --- DASHBOARD LOGIC --- //

// Make functions global for inline HTML onclick attributes
window.navTo = function(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');
    
    // Update bottom nav active state (excluding add and budgets which are mock buttons)
    if (['home', 'list', 'settings'].includes(viewId)) {
        document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-tab="${viewId}"]`);
        if (navItem) navItem.classList.add('active');
    }
    
    // Refresh calculations if moving to home
    if(viewId === 'home') renderCalculations();
};

window.logout = function() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
};

window.resetAllData = function() {
    if (confirm("Are you sure you want to delete all transactions? This cannot be undone.")) {
        transactions = [];
        updateStorageAndUI();
        alert("All data reset successfully.");
        navTo('home');
    }
};

window.deleteTxn = function(id) {
    if(confirm("Delete this transaction?")) {
        transactions = transactions.filter(t => t.id !== id);
        updateStorageAndUI();
    }
};

window.editTxn = function(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return;
    
    const newName = prompt("Edit Transaction Name:", t.name);
    if (newName === null || newName.trim() === '') return;
    
    const newAmtStr = prompt("Edit Amount ($):", t.amount);
    if (newAmtStr === null || newAmtStr.trim() === '') return;
    
    const newAmt = parseFloat(newAmtStr);
    if (isNaN(newAmt) || newAmt <= 0) {
        alert("Invalid amount");
        return;
    }
    
    t.name = newName;
    t.amount = newAmt;
    updateStorageAndUI();
};


function initDashboard() {
    // Fill user name
    const userName = localStorage.getItem('currentUser') || 'Venkatesh';
    document.getElementById('displayUserName').textContent = userName;
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = localStorage.getItem('theme') === 'dark';
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter') || 'All';
            renderFullList();
        });
    });
    
    // Form Listener
    const addForm = document.getElementById('addTxnForm');
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const isExpense = document.querySelector('input[name="txnType"]:checked').value === 'expense';
        const name = document.getElementById('txnName').value;
        const amount = parseFloat(document.getElementById('txnAmount').value);
        const category = document.getElementById('txnCategory').value;
        const date = document.getElementById('txnDate').value;
        
        const txn = {
            id: Date.now(),
            type: isExpense ? 'expense' : 'income',
            name: name,
            amount: amount,
            category: category,
            date: date
        };
        
        transactions.push(txn);
        updateStorageAndUI();
        
        // Reset form and nav back home
        addForm.reset();
        // Set date to today default
        document.getElementById('txnDate').valueAsDate = new Date();
        navTo('home');
    });

    // Default Date to today
    document.getElementById('txnDate').valueAsDate = new Date();
    
    // Initial Render
    renderAll();
}

function updateStorageAndUI() {
    localStorage.setItem('expense_transactions', JSON.stringify(transactions));
    renderAll();
}

function renderAll() {
    renderCalculations();
    renderRecentList();
    renderFullList();
}

function renderCalculations() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
    });
    
    const balance = totalIncome - totalExpense;
    
    // Format to 2 decimal places with commas
    const fmt = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    document.getElementById('totalBalance').textContent = fmt(balance);
    document.getElementById('totalIncome').textContent = fmt(totalIncome);
    document.getElementById('totalExpense').textContent = fmt(totalExpense);
    
    document.getElementById('totalBalance').style.color = balance < 0 ? 'var(--danger-color)' : 'var(--text-primary)';
}

function getIconData(category, type) {
    if (type === 'income') return { icon: 'fa-money-bill-wave', cl: 'icon-green'};
    const catMap = {
        'Groceries': { icon: 'fa-cart-shopping', cl: 'icon-orange' },
        'Transport': { icon: 'fa-car', cl: 'icon-blue' },
        'Food & Drink': { icon: 'fa-utensils', cl: 'icon-yellow' },
        'Shopping': { icon: 'fa-bag-shopping', cl: 'icon-orange' }
    };
    return catMap[category] || { icon: 'fa-receipt', cl: 'icon-blue' };
}

function renderRecentList() {
    const container = document.getElementById('recentTxnList');
    container.innerHTML = '';
    
    // Top 3 newest
    const sorted = [...transactions].sort((a,b) => b.id - a.id).slice(0, 3);
    
    if (sorted.length === 0) {
        container.innerHTML = `<div class="empty-state">No transactions yet. Add one to get started!</div>`;
        return;
    }
    
    sorted.forEach(t => {
        const iconData = getIconData(t.category, t.type);
        const sign = t.type === 'expense' ? '-' : '+';
        const amtCl = t.type === 'expense' ? 'amount-neg' : 'amount-pos';
        const fDate = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let timeLabel = 'Today'; // Mocking time logic slightly for UI effect
        
        container.innerHTML += `
            <div class="transaction-item">
                <div class="txn-left">
                    <div class="txn-icon ${iconData.cl}">
                        <i class="fa-solid ${iconData.icon}"></i>
                    </div>
                    <div class="txn-details">
                        <h4>${t.name}</h4>
                        <p>${timeLabel} • ${t.category}</p>
                    </div>
                </div>
                <div class="txn-amount ${amtCl}">
                    ${sign}$${t.amount.toFixed(2)}
                </div>
            </div>
        `;
    });
}

function renderFullList() {
    const container = document.getElementById('fullTxnList');
    container.innerHTML = '';
    
    let filtered = transactions;
    if (currentFilter !== 'All') {
        filtered = transactions.filter(t => t.category === currentFilter);
    }
    
    document.getElementById('fullListCount').textContent = `Showing ${filtered.length} items`;
    
    const sorted = [...filtered].sort((a,b) => b.id - a.id);
    
    if (sorted.length === 0) {
        container.innerHTML = `<div class="empty-state">No transactions found.</div>`;
        return;
    }
    
    sorted.forEach(t => {
        const sign = t.type === 'expense' ? '-' : '+';
        const amtCl = t.type === 'income' ? 'amount-positive' : '';
        const fDate = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        container.innerHTML += `
            <div class="list-item">
                <div class="list-item-left">
                    <h4>${t.name}</h4>
                    <p>${fDate} &bull; ${t.category}</p>
                </div>
                <div class="list-item-amount ${amtCl}">
                    ${sign}$${t.amount.toFixed(2)}
                </div>
                <div class="list-item-actions">
                    <i class="fa-solid fa-pen" onclick="editTxn(${t.id})" title="Edit"></i>
                    <i class="fa-solid fa-trash" onclick="deleteTxn(${t.id})" title="Delete"></i>
                </div>
            </div>
        `;
    });
}

// Start
window.addEventListener('DOMContentLoaded', init);
