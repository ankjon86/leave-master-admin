// [REPLACE Main.js completely with this version]

// Global debug mode
const DEBUG = true;

// Your Google Apps Script Web App URL (must be deployed as "Anyone, even anonymous")
const ADMIN_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3PDk6qqkI42B3OKlQFnkoabQir6SsbCD8PDDjQR8ubvCEgoAlvcMjouLVlYsSJyIT/exec";

// JSONP callback counter
let jsonpCallbackId = 0;

function log(message) {
    if (DEBUG) console.log('AdminPortal:', message);
}

// JSONP API call function
function callAdminApi(apiData, onSuccess, onError) {
    const callbackName = 'jsonpCallback_' + jsonpCallbackId++;
    
    // Create the callback function
    window[callbackName] = function(response) {
        // Clean up
        delete window[callbackName];
        document.head.removeChild(script);
        
        console.log('Admin API Response:', response);
        if (onSuccess) onSuccess(response);
    };
    
    // Build the URL with JSONP parameters
    let url = ADMIN_SCRIPT_URL + '?';
    const params = new URLSearchParams();
    
    // Add all API data as parameters
    for (const key in apiData) {
        params.append(key, apiData[key]);
    }
    
    // Add callback parameter for JSONP
    params.append('callback', callbackName);
    
    url += params.toString();
    
    // Create and inject script tag
    const script = document.createElement('script');
    script.src = url;
    script.onerror = function(err) {
        delete window[callbackName];
        document.head.removeChild(script);
        console.error('Admin API call failed:', err);
        if (onError) onError(err);
        else showAdminError('Network error: ' + err);
    };
    
    document.head.appendChild(script);
}

// Alternative: Fetch with no-cors mode (limited)
function callAdminApiFallback(apiData, onSuccess, onError) {
    const form = new URLSearchParams();
    for (const key in apiData) {
        form.append(key, apiData[key]);
    }
    
    fetch(ADMIN_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // This won't allow reading response, but will send data
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    })
    .then(() => {
        // With no-cors, we can't read response, so assume success
        if (onSuccess) onSuccess({ success: true, message: 'Request sent (no-cors mode)' });
    })
    .catch(err => {
        console.error('Fallback API call failed:', err);
        if (onError) onError(err);
    });
}

function handleAdminLogin(e) {
    e.preventDefault();
    log('Login form submitted');
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
        showAdminLoginError('Please enter both username and password');
        return;
    }
    
    showAdminLoginLoading(true);

    callAdminApi(
        { 
            action: 'adminLogin',
            username: username,
            password: password
        },
        function(result) {
            log('📨 Login response received');
            
            showAdminLoginLoading(false);
            
            if (result && typeof result === 'object' && result.success === true) {
                log('✅ Login successful, storing user session');
                sessionStorage.setItem('adminUser', JSON.stringify(result.user));
                showAdminPortal();
                loadAdminDashboard();
            } else {
                const errorMsg = (result && result.error) ? result.error : 'Login failed';
                log('❌ Login failed: ' + errorMsg);
                showAdminLoginError(errorMsg);
            }
        },
        function(error) {
            log('❌ Login request failed: ' + error.message);
            showAdminLoginLoading(false);
            showAdminLoginError('Login error: ' + error.message);
        }
    );
}

// Test server connection
function testServerConnection() {
    log('Testing server connection...');
    
    callAdminApi(
        { action: 'testConnection' },
        function(result) {
            if (result && result.success) {
                log('✅ Server connection successful: ' + JSON.stringify(result));
            } else {
                log('❌ Server returned error: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            log('❌ Server connection failed: ' + error.message);
            // Try fallback method
            callAdminApiFallback(
                { action: 'testConnection' },
                function(fallbackResult) {
                    log('✅ Fallback connection successful');
                },
                function(fallbackError) {
                    log('❌ All connection methods failed');
                }
            );
        }
    );
}

// [KEEP ALL THE EXISTING FUNCTIONS FROM THE PREVIOUS VERSION...]
// loadAdminDashboard, loadRecentActivities, loadCompaniesList, etc.
// All the display functions and utility functions remain the same

function loadAdminDashboard() {
    log('Loading dashboard stats...');
    
    callAdminApi(
        { action: 'getDashboardStats' },
        function(companyResult) {
            if (companyResult && companyResult.success) {
                updateElementText('totalCompanies', companyResult.stats?.totalCompanies || 0);
                updateElementText('activeSubscriptions', companyResult.stats?.activeSubscriptions || 0);
                updateElementText('pendingRegistrations', companyResult.stats?.pendingRegistrations || 0);
                
                callAdminApi(
                    { action: 'getPaymentStats' },
                    function(paymentResult) {
                        if (paymentResult && paymentResult.success) {
                            updateElementText('monthlyRevenue', '$' + (paymentResult.stats?.collectedRevenue || 0));
                            loadDashboardActivities();
                        } else {
                            updateElementText('monthlyRevenue', '$0');
                            loadDashboardActivities();
                        }
                    },
                    function(error) {
                        updateElementText('monthlyRevenue', '$0');
                        loadDashboardActivities();
                    }
                );
            } else {
                showErrorMessage('Failed to load dashboard: ' + (companyResult.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to load dashboard: ' + error.message);
        }
    );
}

function loadDashboardActivities() {
    log('Loading dashboard activities...');
    
    callAdminApi(
        { action: 'getRecentActivities' },
        function(result) {
            if (result && result.success) {
                displayDashboardActivities(result.recentActivities || []);
            } else {
                showError('dashboardActivitiesList', result.error || 'Failed to load activities');
            }
        },
        function(error) {
            showError('dashboardActivitiesList', 'Failed to load activities: ' + error.message);
        }
    );
}

function loadRecentActivities() {
    log('Loading recent activities...');
    showLoading('recentActivitiesList');
    
    callAdminApi(
        { action: 'getRecentActivities' },
        function(result) {
            log('📋 Activities response received:', result);
            
            if (!result) {
                showError('recentActivitiesList', 'Server returned empty response');
                return;
            }
            
            if (typeof result === 'object' && result.success === true) {
                log('✅ Activities data valid, displaying activities');
                
                if (result.recentActivities && Array.isArray(result.recentActivities)) {
                    displayRecentActivities(result.recentActivities);
                } else {
                    showError('recentActivitiesList', 'No recent activities data');
                }
                
                showSuccessMessage('Activities loaded successfully!');
            } else {
                const errorMsg = result.error || 'Failed to load activities';
                log('❌ Activities returned error: ' + errorMsg);
                showError('recentActivitiesList', errorMsg);
            }
        },
        function(error) {
            log('❌ Activities request failed: ' + error.message);
            showError('recentActivitiesList', 'Failed to load activities: ' + error.message);
        }
    );
}

function loadCompaniesList() {
    log('Loading companies list...');
    showLoading('companiesList');
    
    callAdminApi(
        { action: 'getAllCompanies' },
        function(result) {
            if (result && result.success) {
                log('✅ Companies data loaded: ' + (result.companies?.length || 0) + ' companies');
                displayCompaniesList(result.companies || []);
                setupCompaniesFilters();
            } else {
                showError('companiesList', result.error || 'Failed to load companies');
            }
        },
        function(error) {
            showError('companiesList', 'Failed to load companies: ' + error.message);
        }
    );
}

function activateCompany(companyId) {
    if (!confirm('Are you sure you want to activate this company?')) {
        return;
    }
    
    log('Activating company: ' + companyId);
    
    callAdminApi(
        { 
            action: 'updateCompanyStatus',
            companyId: companyId,
            newStatus: 'active'
        },
        function(result) {
            if (result && result.success) {
                showSuccessMessage('Company activated successfully!');
                loadCompaniesList();
            } else {
                showErrorMessage('Failed to activate company: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to activate company: ' + error.message);
        }
    );
}

function suspendCompany(companyId) {
    if (!confirm('Are you sure you want to suspend this company?')) {
        return;
    }
    
    log('Suspending company: ' + companyId);
    
    callAdminApi(
        { 
            action: 'updateCompanyStatus',
            companyId: companyId,
            newStatus: 'suspended'
        },
        function(result) {
            if (result && result.success) {
                showSuccessMessage('Company suspended successfully!');
                loadCompaniesList();
            } else {
                showErrorMessage('Failed to suspend company: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to suspend company: ' + error.message);
        }
    );
}

function viewCompanyDetails(companyId) {
    log('Loading company details for: ' + companyId);
    showLoading('companyDetailsModalContent');
    
    callAdminApi(
        { 
            action: 'getCompanyDetails',
            companyId: companyId
        },
        function(result) {
            if (result && result.success) {
                displayCompanyDetails(result.company);
                document.getElementById('companyDetailsModal').classList.remove('hidden');
            } else {
                showErrorMessage('Failed to load company details: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to load company details: ' + error.message);
        }
    );
}

function sendSetupEmail() {
    const companyId = document.getElementById('setupCompanyModal').getAttribute('data-company-id');
    const companyUrl = document.getElementById('companyUrl').value;
    const companyName = document.getElementById('setupCompanyName').textContent;
    const adminName = document.getElementById('setupAdminName').textContent;
    const adminEmail = document.getElementById('setupAdminEmail').textContent;
    const username = document.getElementById('setupUsername').textContent;
    const password = document.getElementById('setupPassword').textContent;
    
    if (!companyUrl) {
        showModalMessage('Please enter the company portal URL', 'error');
        return;
    }
    
    log('Sending setup email for: ' + companyId);
    
    callAdminApi(
        {
            action: 'sendCompanySetupEmail',
            companyId: companyId,
            companyName: companyName,
            adminName: adminName,
            adminEmail: adminEmail,
            username: username,
            password: password,
            companyUrl: companyUrl
        },
        function(result) {
            if (result && result.success) {
                showModalMessage('Setup email sent successfully!', 'success');
                setTimeout(() => {
                    closeSetupModal();
                    loadCompaniesList();
                }, 2000);
            } else {
                showModalMessage('Failed to send setup email: ' + (result.error || 'Unknown error'), 'error');
            }
        },
        function(error) {
            showModalMessage('Failed to send setup email: ' + error.message, 'error');
        }
    );
}

function loadSubscriptionsData() {
    log('Loading subscriptions data...');
    showLoading('subscriptionsList');
    
    callAdminApi(
        { action: 'getSubscriptionsData' },
        function(result) {
            if (result && result.success) {
                log('✅ Subscriptions data loaded');
                updateElementText('starterSubscriptions', result.stats?.smallTeam || 0);
                updateElementText('standardSubscriptions', result.stats?.growingBusiness || 0);
                updateElementText('proSubscriptions', result.stats?.enterprise || 0);
                displaySubscriptionsList(result.subscriptions || []);
            } else {
                showError('subscriptionsList', result.error || 'Failed to load subscriptions');
            }
        },
        function(error) {
            showError('subscriptionsList', 'Failed to load subscriptions: ' + error.message);
        }
    );
}

function loadBillingData() {
    log('Loading billing data...');
    showLoading('paymentsList');
    
    callAdminApi(
        { action: 'getPaymentsData' },
        function(result) {
            if (result && result.success) {
                log('✅ Billing data loaded');
                updateElementText('totalRevenue', '$' + (result.stats?.totalRevenue || 0));
                updateElementText('collectedRevenue', '$' + (result.stats?.collectedRevenue || 0));
                updateElementText('pendingAmount', '$' + (result.stats?.pendingAmount || 0));
                updateElementText('activeSubsCount', result.stats?.activeSubscriptions || 0);
                displayPaymentsList(result.payments || []);
            } else {
                showError('paymentsList', result.error || 'Failed to load billing data');
            }
        },
        function(error) {
            showError('paymentsList', 'Failed to load billing data: ' + error.message);
        }
    );
}

function generateRevenueReport() {
    log('Generating revenue report...');
    callAdminApi(
        { action: 'generateRevenueReport' },
        function(result) {
            if (result && result.success) {
                showSuccessMessage('Revenue report generated successfully!');
                if (result.downloadUrl) {
                    window.open(result.downloadUrl, '_blank');
                }
            } else {
                showErrorMessage('Failed to generate report: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to generate report: ' + error.message);
        }
    );
}

function loadSystemSettings() {
    log('Loading system settings...');
    callAdminApi(
        { action: 'getSystemSettings' },
        function(result) {
            if (result && result.success) {
                document.getElementById('trialPeriod').value = result.settings?.trialPeriod || 14;
                document.getElementById('maintenanceMode').value = result.settings?.maintenanceMode ? 'true' : 'false';
                document.getElementById('adminEmail').value = result.settings?.adminEmail || 'admin@leavemaster.com';
                document.getElementById('systemHealth').innerHTML = '<div class="success">System settings loaded successfully</div>';
            } else {
                showErrorMessage('Failed to load system settings: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to load system settings: ' + error.message);
        }
    );
}

function saveSystemSettings() {
    log('Saving system settings...');
    const trialPeriod = document.getElementById('trialPeriod').value;
    const maintenanceMode = document.getElementById('maintenanceMode').value;
    const adminEmail = document.getElementById('adminEmail').value;
    
    const settings = {
        trialPeriod: parseInt(trialPeriod),
        maintenanceMode: maintenanceMode === 'true',
        adminEmail: adminEmail
    };
    
    callAdminApi(
        { 
            action: 'saveSystemSettings',
            settings: JSON.stringify(settings)
        },
        function(result) {
            if (result && result.success) {
                showSuccessMessage('System settings saved successfully!');
            } else {
                showErrorMessage('Failed to save settings: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to save settings: ' + error.message);
        }
    );
}

function sendTestEmail() {
    log('Sending test email...');
    callAdminApi(
        { action: 'sendTestEmail' },
        function(result) {
            if (result && result.success) {
                showSuccessMessage('Test email sent successfully!');
            } else {
                showErrorMessage('Failed to send test email: ' + (result.error || 'Unknown error'));
            }
        },
        function(error) {
            showErrorMessage('Failed to send test email: ' + error.message);
        }
    );
}

// Utility Functions
function showAdminLoginLoading(show) {
    const loading = document.getElementById('adminLoginLoading');
    const error = document.getElementById('adminLoginErrorMessage');
    
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
    if (error && show) {
        error.classList.add('hidden');
    }
}

function showAdminLoginError(message) {
    const error = document.getElementById('adminLoginErrorMessage');
    if (error) {
        error.textContent = message;
        error.classList.remove('hidden');
    }
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
    }
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: 500;
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: 500;
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAdminPortal() {
    log('Switching to admin portal view');
    const loginScreen = document.getElementById('adminLoginScreen');
    const adminPortal = document.getElementById('mainAdminPortal');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (adminPortal) adminPortal.classList.remove('hidden');
    
    const adminUser = sessionStorage.getItem('adminUser');
    if (adminUser) {
        try {
            const user = JSON.parse(adminUser);
            const welcomeElement = document.getElementById('adminWelcome');
            if (welcomeElement) {
                welcomeElement.textContent = 'Welcome, ' + (user.name || user.username);
            }
        } catch (e) {
            log('Error parsing user data: ' + e.message);
        }
    }
}

function adminLogout() {
    log('Logging out user');
    sessionStorage.removeItem('adminUser');
    const loginScreen = document.getElementById('adminLoginScreen');
    const adminPortal = document.getElementById('mainAdminPortal');
    const loginForm = document.getElementById('adminLoginForm');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (adminPortal) adminPortal.classList.add('hidden');
    if (loginForm) loginForm.reset();
}

function openAdminTab(tabName, element) {
    log('Opening tab: ' + tabName);
    
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    if (element) {
        element.classList.add('active');
    }
    
    switch(tabName) {
        case 'Dashboard':
            loadAdminDashboard();
            break;
        case 'Activities':
            loadRecentActivities();
            break;
        case 'Companies':
            loadCompaniesList();
            break;
        case 'Subscriptions':
            loadSubscriptionsData();
            break;
        case 'Billing':
            loadBillingData();
            break;
        case 'System':
            loadSystemSettings();
            break;
    }
}

// Display Functions (Add these if missing)
function displayDashboardActivities(activities) {
    const container = document.getElementById('dashboardActivitiesList');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="loading">No recent activities</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Admin</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    activities.forEach(activity => {
        const statusClass = getStatusClass(activity.status);
        html += `
            <tr>
                <td>${escapeHtml(activity.companyName)}</td>
                <td>${escapeHtml(activity.adminName)}</td>
                <td>${escapeHtml(activity.plan)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(activity.status)}</span></td>
                <td>${escapeHtml(activity.date)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayRecentActivities(activities) {
    const container = document.getElementById('recentActivitiesList');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="loading">No recent activities found</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Admin</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    activities.forEach(activity => {
        const statusClass = getStatusClass(activity.status);
        html += `
            <tr>
                <td>${escapeHtml(activity.companyName)}</td>
                <td>${escapeHtml(activity.adminName)}</td>
                <td>${escapeHtml(activity.plan)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(activity.status)}</span></td>
                <td>${escapeHtml(activity.date)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayCompaniesList(companies) {
    const container = document.getElementById('companiesList');
    if (!container) return;
    
    if (!companies || companies.length === 0) {
        container.innerHTML = '<div class="loading">No companies found</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Admin</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Employees</th>
                    <th>Status</th>
                    <th>URL</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    companies.forEach(company => {
        const statusClass = getStatusClass(company.status);
        const trialEnd = company.trialEnd ? new Date(company.trialEnd) : null;
        const isTrialExpired = trialEnd && trialEnd < new Date();
        
        html += `
            <tr class="${isTrialExpired ? 'status-row-warning' : ''}">
                <td>
                    <div class="company-info">
                        <div class="company-name">${escapeHtml(company.companyName)}</div>
                        <div class="company-id">${escapeHtml(company.companyId)}</div>
                    </div>
                </td>
                <td>${escapeHtml(company.adminName)}</td>
                <td>${escapeHtml(company.adminEmail)}</td>
                <td>${escapeHtml(company.subscriptionPlan)}</td>
                <td>${company.employeeCount}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(company.status)}</span></td>
                <td>
                    ${company.companyUrl ? 
                        `<a href="${escapeHtml(company.companyUrl)}" target="_blank" class="btn-url">Open</a>` : 
                        `<span class="no-url">Not set</span>`
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view" onclick="viewCompanyDetails('${escapeHtml(company.companyId)}')" title="View Details">👁️</button>
                        ${company.status !== 'active' ? 
                            `<button class="btn-activate" onclick="activateCompany('${escapeHtml(company.companyId)}')" title="Activate">✅</button>` : 
                            `<button class="btn-suspend" onclick="suspendCompany('${escapeHtml(company.companyId)}')" title="Suspend">⏸️</button>`
                        }
                        <button class="btn-setup" onclick="openSetupModal('${escapeHtml(company.companyId)}')" title="Setup Email">📧</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displaySubscriptionsList(subscriptions) {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    if (!subscriptions || subscriptions.length === 0) {
        container.innerHTML = '<div class="loading">No active subscriptions found</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Monthly Price</th>
                    <th>Employees</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    subscriptions.forEach(sub => {
        const statusClass = getStatusClass(sub.status);
        html += `
            <tr>
                <td>${escapeHtml(sub.companyName)}</td>
                <td>${escapeHtml(sub.plan)}</td>
                <td class="amount-cell">$${sub.monthlyPrice}</td>
                <td>${sub.employeeCount}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(sub.status)}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayPaymentsList(payments) {
    const container = document.getElementById('paymentsList');
    if (!container) return;
    
    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="loading">No payments found</div>';
        return;
    }
    
    let totalAmount = 0;
    let paidAmount = 0;
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice ID</th>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Receipt</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    payments.forEach(payment => {
        const statusClass = getPaymentStatusClass(payment.status);
        totalAmount += payment.amount;
        if (payment.status === 'paid' || payment.status === 'completed') {
            paidAmount += payment.amount;
        }
        
        html += `
            <tr class="${getPaymentRowClass(payment.status)}">
                <td>${escapeHtml(payment.invoiceId)}</td>
                <td>
                    <div class="company-info">
                        <div class="company-name">${escapeHtml(payment.companyName)}</div>
                        <div class="company-id">${escapeHtml(payment.companyId)}</div>
                    </div>
                </td>
                <td>${escapeHtml(payment.plan)}</td>
                <td class="amount-cell">$${payment.amount.toFixed(2)}</td>
                <td>${escapeHtml(payment.paymentDate)}</td>
                <td>${escapeHtml(payment.dueDate)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(payment.status)}</span></td>
                <td>${escapeHtml(payment.receiptNo)}</td>
            </tr>
        `;
    });
    
    html += `</tbody>
        <tfoot>
            <tr class="table-summary">
                <td colspan="3">Total: ${payments.length} payments</td>
                <td class="amount-cell">$${totalAmount.toFixed(2)}</td>
                <td colspan="2">Paid: $${paidAmount.toFixed(2)}</td>
                <td colspan="2">Pending: $${(totalAmount - paidAmount).toFixed(2)}</td>
            </tr>
        </tfoot>
    </table>`;
    
    container.innerHTML = html;
}

function displayCompanyDetails(company) {
    const container = document.getElementById('companyDetailsModalContent');
    if (!container) return;
    
    let html = `
        <div class="company-details-grid">
            <div class="detail-group">
                <label>Company ID:</label>
                <span>${escapeHtml(company.companyId)}</span>
            </div>
            <div class="detail-group">
                <label>Company Name:</label>
                <span>${escapeHtml(company.companyName)}</span>
            </div>
            <div class="detail-group">
                <label>Admin Name:</label>
                <span>${escapeHtml(company.adminName)}</span>
            </div>
            <div class="detail-group">
                <label>Admin Email:</label>
                <span>${escapeHtml(company.adminEmail)}</span>
            </div>
            <div class="detail-group">
                <label>Phone:</label>
                <span>${escapeHtml(company.phoneNumber || 'Not provided')}</span>
            </div>
            <div class="detail-group">
                <label>Username:</label>
                <span>${escapeHtml(company.username)}</span>
            </div>
            <div class="detail-group">
                <label>Subscription Plan:</label>
                <span>${escapeHtml(company.subscriptionPlan)}</span>
            </div>
            <div class="detail-group">
                <label>Status:</label>
                <span class="status-badge ${getStatusClass(company.status)}">${escapeHtml(company.status)}</span>
            </div>
            <div class="detail-group">
                <label>Employee Count:</label>
                <span>${company.employeeCount}</span>
            </div>
            <div class="detail-group">
                <label>Trial Start:</label>
                <span>${escapeHtml(company.trialStart)}</span>
            </div>
            <div class="detail-group">
                <label>Trial End:</label>
                <span>${escapeHtml(company.trialEnd)}</span>
            </div>
            <div class="detail-group full-width">
                <label>Company URL:</label>
                <span>
                    ${company.companyUrl ? 
                        `<a href="${escapeHtml(company.companyUrl)}" target="_blank" class="company-url-link">${escapeHtml(company.companyUrl)}</a>` : 
                        'Not set'
                    }
                </span>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" onclick="closeCompanyDetailsModal()">Close</button>
            ${!company.companyUrl ? 
                `<button class="btn-primary" onclick="openSetupModal('${escapeHtml(company.companyId)}')">Setup Company</button>` : 
                `<button class="btn-primary" onclick="openSetupModal('${escapeHtml(company.companyId)}')">Resend Setup</button>`
            }
        </div>
    `;
    
    container.innerHTML = html;
}

// Modal Management Functions
function openSetupModal(companyId) {
    log('Opening setup modal for: ' + companyId);
    
    callAdminApi(
        { 
            action: 'getCompanyDetails',
            companyId: companyId
        },
        function(result) {
            if (result && result.success) {
                const company = result.company;
                document.getElementById('setupCompanyModal').setAttribute('data-company-id', companyId);
                document.getElementById('setupCompanyName').textContent = company.companyName;
                document.getElementById('setupAdminName').textContent = company.adminName;
                document.getElementById('setupAdminEmail').textContent = company.adminEmail;
                document.getElementById('setupUsername').textContent = company.username;
                document.getElementById('setupPassword').textContent = company.password || 'changeme123';
                document.getElementById('companyUrl').value = company.companyUrl || '';
                
                document.getElementById('setupCompanyModal').classList.remove('hidden');
                document.getElementById('setupModalMessage').classList.add('hidden');
            } else {
                showErrorMessage('Failed to load company details for setup');
            }
        },
        function(error) {
            showErrorMessage('Failed to load company details: ' + error.message);
        }
    );
}

function closeSetupModal() {
    document.getElementById('setupCompanyModal').classList.add('hidden');
    document.getElementById('setupModalMessage').classList.add('hidden');
}

function closeCompanyDetailsModal() {
    document.getElementById('companyDetailsModal').classList.add('hidden');
}

function showModalMessage(message, type) {
    const messageDiv = document.getElementById('setupModalMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.classList.remove('hidden');
    }
}

// Search and Filter Functions
function setupCompaniesFilters() {
    const searchInput = document.getElementById('companySearch');
    const statusFilter = document.getElementById('companyStatusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterCompanies);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterCompanies);
    }
}

function filterCompanies() {
    const searchTerm = document.getElementById('companySearch').value.toLowerCase();
    const statusFilter = document.getElementById('companyStatusFilter').value;
    
    const rows = document.querySelectorAll('#companiesList tbody tr');
    
    rows.forEach(row => {
        const companyName = row.cells[0].querySelector('.company-name').textContent.toLowerCase();
        const adminName = row.cells[1].textContent.toLowerCase();
        const status = row.cells[5].querySelector('.status-badge').textContent.toLowerCase();
        
        const matchesSearch = companyName.includes(searchTerm) || adminName.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

// Utility Functions
function getStatusClass(status) {
    switch (status) {
        case 'active': return 'status-active';
        case 'trial': return 'status-trial';
        case 'suspended': return 'status-suspended';
        default: return 'status-trial';
    }
}

function getPaymentStatusClass(status) {
    switch (status) {
        case 'paid':
        case 'completed':
            return 'status-paid';
        case 'pending':
        case 'due':
            return 'status-pending';
        case 'overdue':
        case 'failed':
            return 'status-overdue';
        case 'refunded':
            return 'status-refunded';
        default:
            return 'status-pending';
    }
}

function getPaymentRowClass(status) {
    switch (status) {
        case 'paid':
        case 'completed':
            return 'status-row-success';
        case 'pending':
        case 'due':
            return 'status-row-warning';
        default:
            return '';
    }
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return dateString;
    }
}

function goToLandingPage() {
    window.location.href = 'https://your-landing-page.com';
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    log('Admin Portal Initialized');
    testServerConnection();
    
    const adminUser = sessionStorage.getItem('adminUser');
    if (adminUser) {
        showAdminPortal();
        loadAdminDashboard();
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
});


