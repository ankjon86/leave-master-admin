// Global debug mode
const DEBUG = true;

// Your Google Apps Script Web App URL
const ADMIN_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

function log(message) {
    if (DEBUG) console.log('AdminPortal:', message);
}

// Helper for all API calls to Google Apps Script
function callAdminApi(apiData, onSuccess, onError) {
    const form = new URLSearchParams();
    for (const key in apiData) {
        form.append(key, apiData[key]);
    }
    
    fetch(ADMIN_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Admin API Response:', data);
        if (onSuccess) onSuccess(data);
    })
    .catch(err => {
        console.error('Admin API call failed:', err);
        if (onError) onError(err);
        else showAdminError('Network error: ' + err);
    });
}

// Test server connection
function testServerConnection() {
    log('Testing server connection...');
    
    callAdminApi(
        { action: 'testConnection' },
        function(result) {
            if (result && typeof result === 'object') {
                log('✅ Server connection successful: ' + JSON.stringify(result));
            } else {
                log('❌ Server returned invalid response: ' + result);
            }
        },
        function(error) {
            log('❌ Server connection failed: ' + error.message);
        }
    );
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
            log('📨 Login response received, type: ' + typeof result);
            
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

function loadAdminDashboard() {
    log('Loading dashboard stats...');
    
    // Get company stats
    callAdminApi(
        { action: 'getDashboardStats' },
        function(companyResult) {
            if (companyResult && companyResult.success) {
                // Update company stats
                updateElementText('totalCompanies', companyResult.stats?.totalCompanies || 0);
                updateElementText('activeSubscriptions', companyResult.stats?.activeSubscriptions || 0);
                updateElementText('pendingRegistrations', companyResult.stats?.pendingRegistrations || 0);
                
                // Now get payment stats
                callAdminApi(
                    { action: 'getPaymentStats' },
                    function(paymentResult) {
                        if (paymentResult && paymentResult.success) {
                            updateElementText('monthlyRevenue', '$' + (paymentResult.stats?.collectedRevenue || 0));
                            
                            // Load recent activities for dashboard
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
                
                // Setup search and filter functionality
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
                
                // Update subscription stats
                updateElementText('starterSubscriptions', result.stats?.smallTeam || 0);
                updateElementText('standardSubscriptions', result.stats?.growingBusiness || 0);
                updateElementText('proSubscriptions', result.stats?.enterprise || 0);
                
                // Display subscriptions
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
                
                // Update billing stats with amounts
                updateElementText('totalRevenue', '$' + (result.stats?.totalRevenue || 0));
                updateElementText('collectedRevenue', '$' + (result.stats?.collectedRevenue || 0));
                updateElementText('pendingAmount', '$' + (result.stats?.pendingAmount || 0));
                updateElementText('activeSubsCount', result.stats?.activeSubscriptions || 0);
                
                // Display payments
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
                // Populate system settings form
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

// Keep all the utility functions as they are
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
    // Create temporary success message
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
    // Create temporary error message
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
    
    // Update welcome message
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
    
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active class to clicked tab
    if (element) {
        element.classList.add('active');
    }
    
    // Load tab-specific data
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

// Initialize the Admin Portal
document.addEventListener('DOMContentLoaded', function() {
    log('DOM Content Loaded - Initializing Admin Portal');
    
    // Test server connection immediately
    testServerConnection();
    
    // Check if already logged in
    const adminUser = sessionStorage.getItem('adminUser');
    if (adminUser) {
        log('User already logged in, showing admin portal');
        showAdminPortal();
        loadAdminDashboard();
    }

    // Setup login form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
        log('Login form event listener attached');
    }
});
