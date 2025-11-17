// Global variables
let currentLeaveData = [];
let departments = [];
let plannedDates = [];
let currentEmployee = null;
let currentUser = null;

// Put your deployed Apps Script web app URL here
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoPm7iKFT8cwum4GS_VAu5ONH3G7sJ-y-Yb8zHfYw5-jdw-6aeEJQT_5Kbxg6ApQvp/exec";

// Helper for all API calls to Apps Script
function callApi(apiData, onSuccess, onError) {
    const form = new URLSearchParams();
    for (const key in apiData) {
        form.append(key, apiData[key]);
    }
    
    fetch(SCRIPT_URL, {
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
        console.log('API Response:', data);
        if (onSuccess) onSuccess(data);
    })
    .catch(err => {
        console.error('API call failed:', err);
        if (onError) onError(err);
        else showError('Network error: ' + err);
    });
}

// Success Modal Functions
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    const messageElement = document.getElementById('successMessage');
    messageElement.textContent = message;
    modal.classList.remove('hidden');
    
    // Auto close after 2 seconds
    setTimeout(() => {
        closeSuccessModal();
    }, 2000);
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
}

function showError(message) {
    // You can implement an error modal or use alert for now
    alert('Error: ' + message);
}

// Authentication and role management
function checkAuthentication() {
    const savedUser = sessionStorage.getItem('currentUser');
    
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showMainApplication();
            setupRoleBasedAccess();
            loadUserDashboardData(); // Load user data for dashboard
        } catch (e) {
            console.error('Error parsing user data:', e);
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

function loadUserDashboardData() {
    if (!currentUser) return;
    
    console.log('Loading user data for:', currentUser.empId);
    
    callApi(
        { action: 'getEmployeeDetails', empId: currentUser.empId },
        function(employeeData) {
            console.log('Employee data received:', employeeData);
            if (employeeData.success) {
                // Update Dashboard
                updateDashboardData(employeeData);
                
                // Update Apply Leave Tab
                updateApplyLeaveTab(employeeData);
                
                // Update My Leave History Tab
                updateMyLeaveHistoryTab(employeeData);
                
                // Update Plan Leave Tab
                updatePlanLeaveTab(employeeData);
                
                // Update My Plan List Tab
                updateMyPlanListTab(employeeData);
            } else {
                console.error('Error loading employee data:', employeeData.error);
            }
        },
        function(error) {
            console.error('Error loading user data:', error);
        }
    );
}

function updateDashboardData(employeeData) {
    document.getElementById('dashboardEmpId').textContent = employeeData.empId || '-';
    document.getElementById('dashboardEmpName').textContent = employeeData.name || '-';
    document.getElementById('dashboardEmpPosition').textContent = employeeData.position || '-';
    document.getElementById('dashboardEmpDepartment').textContent = employeeData.department || '-';
    document.getElementById('dashboardPrevYearLeave').textContent = employeeData.prevYearLeave || '0';
    document.getElementById('dashboardCurrentYearEntitled').textContent = employeeData.currentYearEntitled || '0';
    document.getElementById('dashboardDaysTaken').textContent = employeeData.daysTaken || '0';
    document.getElementById('dashboardDaysAvailable').textContent = employeeData.totalDaysLeft || '0';
}

function updateApplyLeaveTab(employeeData) {
    document.getElementById('empIdDisplay').textContent = employeeData.empId || '-';
    document.getElementById('empName').textContent = employeeData.name || '-';
    document.getElementById('empPosition').textContent = employeeData.position || '-';
    document.getElementById('empDepartment').textContent = employeeData.department || '-';
    document.getElementById('prevYearLeave').textContent = employeeData.prevYearLeave || '0';
    document.getElementById('currentYearEntitled').textContent = employeeData.currentYearEntitled || '0';
    document.getElementById('daysTaken').textContent = employeeData.daysTaken || '0';
    document.getElementById('totalDaysLeft').textContent = employeeData.totalDaysLeft || '0';
}

function updateMyLeaveHistoryTab(employeeData) {
    document.getElementById('myEmpIdDisplay').textContent = employeeData.empId || '-';
    document.getElementById('myEmpName').textContent = employeeData.name || '-';
    document.getElementById('myEmpPosition').textContent = employeeData.position || '-';
    document.getElementById('myEmpDepartment').textContent = employeeData.department || '-';
    document.getElementById('myPrevYearLeave').textContent = employeeData.prevYearLeave || '0';
    document.getElementById('myCurrentYearEntitled').textContent = employeeData.currentYearEntitled || '0';
    document.getElementById('myDaysTaken').textContent = employeeData.daysTaken || '0';
    document.getElementById('myTotalDaysLeft').textContent = employeeData.totalDaysLeft || '0';
    
    // Auto-load leave history
    loadMyLeaveHistoryAuto();
}

// Update Plan Leave Tab
function updatePlanLeaveTab(employeeData) {
    document.getElementById('planEmpIdDisplay').textContent = employeeData.empId || '-';
    document.getElementById('planEmpName').textContent = employeeData.name || '-';
    document.getElementById('planEmpPosition').textContent = employeeData.position || '-';
    document.getElementById('planEmpDepartment').textContent = employeeData.department || '-';
    document.getElementById('planPrevYearLeave').textContent = employeeData.prevYearLeave || '0';
    document.getElementById('planCurrentYearEntitled').textContent = employeeData.currentYearEntitled || '0';
    document.getElementById('planTotalDaysLeft').textContent = employeeData.totalDaysLeft || '0';
}

// Update My Plan List Tab
function updateMyPlanListTab(employeeData) {
    document.getElementById('myPlanEmpIdDisplay').textContent = employeeData.empId || '-';
    document.getElementById('myPlanEmpName').textContent = employeeData.name || '-';
    document.getElementById('myPlanEmpPosition').textContent = employeeData.position || '-';
    document.getElementById('myPlanEmpDepartment').textContent = employeeData.department || '-';
    document.getElementById('myPlanPrevYearLeave').textContent = employeeData.prevYearLeave || '0';
    document.getElementById('myPlanCurrentYearEntitled').textContent = employeeData.currentYearEntitled || '0';
    document.getElementById('myPlanDaysTaken').textContent = employeeData.daysTaken || '0';
    document.getElementById('myPlanTotalDaysLeft').textContent = employeeData.totalDaysLeft || '0';
    
    // Auto-load planned leaves
    loadMyPlannedLeavesAuto();
}

// Auto-load functions without requiring manual input
function loadMyLeaveHistoryAuto() {
    if (!currentUser) return;
    
    callApi(
        { action: 'getMyLeaveHistory', empId: currentUser.empId },
        function(result) {
            if (result.success) {
                displayMyLeaveHistory(result.leaveHistory);
            } else {
                document.getElementById('myHistoryResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('myHistoryResult').innerHTML = 
                '<div class="error">Error loading leave history: ' + error + '</div>';
        }
    );
}

function loadMyPlannedLeavesAuto() {
    if (!currentUser) return;
    
    callApi(
        { action: 'getMyPlannedLeaves', empId: currentUser.empId },
        function(result) {
            if (result.success) {
                displayMyPlannedLeaves(result.plannedLeaves);
            } else {
                document.getElementById('myPlanResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('myPlanResult').innerHTML = 
                '<div class="error">Error loading planned leaves: ' + error + '</div>';
        }
    );
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

// Show main application
function showMainApplication() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Update welcome message
    if (currentUser) {
        document.getElementById('userWelcome').textContent = 
            `Welcome, ${currentUser.name} (${currentUser.accessLevel})`;
    }
}

// Setup role-based access control
function setupRoleBasedAccess() {
    if (!currentUser) return;
    
    const accessLevel = currentUser.accessLevel;
    const userDepartment = currentUser.department;
    
    // Hide all restricted elements first
    const restrictedTabs = [
        'leaveHistoryDropdown',
        'leavePlanTab',
        'pendingDropdown',
        'employeesDropdown'
    ];
    
    restrictedTabs.forEach(tabId => {
        const element = document.getElementById(tabId);
        if (element) {
            element.style.display = 'none';
        }
    });

    // Hide filter sections by default
    const filterSections = ['historyFilterSection', 'summaryFilterSection', 'planFilterSection'];
    filterSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });

    // Show elements based on access level
    switch(accessLevel) {
        case 'Employee':
            // Only show Dashboard, My Leave, My Leave Plan
            showElements(['myLeaveDropdown', 'myLeavePlanDropdown']);
            break;
            
        case 'Manager':
            // Show all except Employees tab
            showElements(['leaveHistoryDropdown', 'leavePlanTab', 'pendingDropdown', 'myLeaveDropdown', 'myLeavePlanDropdown']);
            
            // Set department filter to manager's department and hide filter sections
            setTimeout(() => {
                setDepartmentFilter(userDepartment);
            }, 100);
            break;
            
        case 'HR':
        case 'Branch Manager':
        case 'Admin':
            // Show all tabs
            showElements(['leaveHistoryDropdown', 'leavePlanTab', 'pendingDropdown', 'employeesDropdown', 'myLeaveDropdown', 'myLeavePlanDropdown']);
            
            // Show filter sections for full access users
            filterSections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'block';
                }
            });
            break;
    }
}

// Set department filter for Managers
function setDepartmentFilter(department) {
    const historyDept = document.getElementById('historyDept');
    const summaryDept = document.getElementById('summaryDept');
    const planDept = document.getElementById('planDept');
    
    if (historyDept) historyDept.value = department;
    if (summaryDept) summaryDept.value = department;
    if (planDept) planDept.value = department;
    
    // Hide filter sections for Managers
    const filterSections = ['historyFilterSection', 'summaryFilterSection', 'planFilterSection'];
    filterSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

// Show specific elements
function showElements(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    });
}

// Login function
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('loginEmployeeId').value.trim();
    if (!employeeId) {
        showLoginError('Please enter Employee ID');
        return;
    }
    
    showLoginLoading(true);
    
    callApi(
        { action: 'login', employeeId: employeeId },
        function(result) {
            showLoginLoading(false);
            if (result.success) {
                currentUser = result.user;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                showMainApplication();
                setupRoleBasedAccess();
                loadUserDashboardData(); // Load user data after login
                
                // Load initial data
                loadCurrentEmployeesOnLeave();
                loadDepartments();
            } else {
                showLoginError(result.error || 'Login failed');
            }
        },
        function(error) {
            showLoginLoading(false);
            showLoginError('Login error: ' + error);
        }
    );
});

// Logout function with success modal
function logout() {
    showConfirmModal('Are you sure you want to logout?', function() {
        callApi(
            { action: 'logout' },
            function(result) {
                showSuccessModal('Logged out successfully!');
                setTimeout(() => {
                    sessionStorage.removeItem('currentUser');
                    currentUser = null;
                    showLoginScreen();
                    document.getElementById('loginEmployeeId').value = '';
                    document.getElementById('loginErrorMessage').classList.add('hidden');
                }, 1500);
            },
            function(error) {
                showError('Logout error: ' + error);
            }
        );
    });
}

// Utility functions for login UI
function showLoginError(message) {
    const errorDiv = document.getElementById('loginErrorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showLoginLoading(show) {
    const loadingDiv = document.getElementById('loginLoading');
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

// Get current user for other functions to use
function getCurrentUser() {
    return currentUser;
}

// Check if user has permission for specific actions
function hasPermission(requiredLevels) {
    if (!currentUser) return false;
    return requiredLevels.includes(currentUser.accessLevel);
}

// Set current date on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    
    var now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Set default values for date inputs
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
    
    // Set current month and year
    var planYear = document.getElementById('planYear');
    if (planYear) planYear.value = now.getFullYear();
    
    // Load departments
    loadDepartments();
    
    // Initialize dropdowns
    initDropdowns();
});

// Initialize dropdown functionality
function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const btn = dropdown.querySelector('.dropdown-btn');
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isActive = dropdown.classList.contains('active');
            
            // Close all dropdowns
            document.querySelectorAll('.dropdown').forEach(d => {
                d.classList.remove('active');
            });
            
            // Toggle current dropdown
            if (!isActive) {
                dropdown.classList.add('active');
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    });
}

// Function to load current employees on leave
function loadCurrentEmployeesOnLeave() {
    callApi(
        { action: 'getCurrentEmployeesOnLeave' },
        function(response) {
            // Handle different response formats
            if (response && response.success) {
                // If response has success property, use the data property
                displayCurrentEmployeesOnLeave(response.data || response.currentLeaves || []);
            } else if (Array.isArray(response)) {
                // If response is directly an array
                displayCurrentEmployeesOnLeave(response);
            } else {
                // If response is an object but not in expected format
                console.warn('Unexpected response format:', response);
                displayCurrentEmployeesOnLeave([]);
            }
        },
        function(error) {
            console.error('API call failed:', error);
            document.getElementById('currentLeavesContainer').innerHTML = 
                '<div class="notice-item error">Error loading current leaves: ' + error + '</div>';
        }
    );
}

// Function to display current employees on leave
function displayCurrentEmployeesOnLeave(currentLeaves) {
    var container = document.getElementById('currentLeavesContainer');
    
    // Ensure currentLeaves is an array
    if (!Array.isArray(currentLeaves)) {
        console.error('currentLeaves is not an array:', currentLeaves);
        currentLeaves = [];
    }
    
    if (!currentLeaves || currentLeaves.length === 0) {
        container.innerHTML = '<div class="notice-item info">No employees are currently on leave.</div>';
        return;
    }
    
    var html = '';
    currentLeaves.forEach(function(leave) {
        // Add null checks for leave properties
        var startDate = leave.startDate ? formatDateFromString(leave.startDate) : 'N/A';
        var endDate = leave.endDate ? formatDateFromString(leave.endDate) : 'N/A';
        var handoverInfo = '';
        
        if (leave.handoverName) {
            handoverInfo = '<div class="handover-info"><strong>Handover:</strong> ' + leave.handoverName;
            if (leave.handoverPosition) {
                handoverInfo += ' (' + leave.handoverPosition;
                if (leave.handoverDepartment) {
                    handoverInfo += ' - ' + leave.handoverDepartment;
                }
                handoverInfo += ')';
            }
            handoverInfo += '</div>';
        }
        
        html += '<div class="notice-item leave">' +
            '<div class="leave-header">' +
            '<span class="employee-name">' + (leave.name || 'Unknown') + '</span>' +
            '<span class="leave-type">' + (leave.type || 'Leave') + ' Leave</span>' +
            '</div>' +
            '<div class="leave-dates">' + (leave.days || '0') + ' days from ' + startDate + ' to ' + endDate + '</div>' +
            handoverInfo +
            '</div>';
    });
    
    container.innerHTML = html;
}

// Enhanced tab opening to handle different views
function openTab(evt, tabName) {
    // Close all dropdowns
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
    
    // Hide all tab contents
    var tabcontent = document.getElementsByClassName("tab-content");
    for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    
    // Remove active class from all buttons
    var tablinks = document.getElementsByClassName("tab-btn");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    
    // Show the specific tab content and activate the button
    document.getElementById(tabName).classList.add("active");
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }
    
    // Load data for specific tabs with proper access control
    const currentUser = getCurrentUser();
    
    if (tabName === 'PendingRequests') {
        if (currentUser && (currentUser.accessLevel === 'Branch Manager' || currentUser.accessLevel === 'HR' || currentUser.accessLevel === 'Admin')) {
            // Branch Manager/HR see both direct requests and recommendations
            loadPendingRequests();
            loadRecommendedRequests();
        } else {
            // Managers see only their department employees
            loadPendingRequests();
        }
    } else if (tabName === 'AllEmployeesHistory') {
        loadDepartments();
        loadAllLeaveHistory();
    } else if (tabName === 'HistorySummary') {
        loadDepartments();
        loadHistorySummary();
    } else if (tabName === 'LeavePlan') {
        loadDepartments();
        loadLeavePlan();
    } else if (tabName === 'PendingPlan') {
        loadPendingPlanRequests();
    } else if (tabName === 'EmployeeList') {
        loadEmployeeList();
    } else if (tabName === 'AddEmployee') {
        initializeAddEmployeeForm();
    }
}

function loadDepartments() {
    callApi(
        { action: 'getDepartments' },
        function(depts) {
            departments = depts;
            var historyDept = document.getElementById('historyDept');
            var summaryDept = document.getElementById('summaryDept');
            var planDept = document.getElementById('planDept');
            
            // Clear existing options except first
            if (historyDept) {
                while (historyDept.options.length > 1) historyDept.remove(1);
            }
            if (summaryDept) {
                while (summaryDept.options.length > 1) summaryDept.remove(1);
            }
            if (planDept) {
                while (planDept.options.length > 1) planDept.remove(1);
            }
            
            depts.forEach(function(dept) {
                if (historyDept) {
                    var option1 = new Option(dept, dept);
                    historyDept.add(option1);
                }
                if (summaryDept) {
                    var option2 = new Option(dept, dept);
                    summaryDept.add(option2);
                }
                if (planDept) {
                    var option3 = new Option(dept, dept);
                    planDept.add(option3);
                }
            });
        },
        function(error) {
            console.error('Error loading departments:', error);
        }
    );
}

function calculateDays() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        // Validate that end date is not before start date
        if (new Date(endDate) < new Date(startDate)) {
            document.getElementById('numDays').value = '0';
            document.getElementById('applyResult').innerHTML = 
                '<div class="error">End date cannot be before start date.</div>';
            return;
        }
        
        callApi(
            { action: 'calculateWorkingDays', startDate: startDate, endDate: endDate },
            function(result) {
                console.log('Calculate Days API Response:', result);
                
                // Extract days from the response - handle different possible formats
                let days;
                
                if (result && typeof result === 'object') {
                    if (result.days !== undefined) {
                        days = result.days;
                    } else if (result.data !== undefined) {
                        days = result.data;
                    } else {
                        // If it's a plain object with a numeric value, use that
                        const values = Object.values(result);
                        days = values.find(val => typeof val === 'number');
                    }
                }
                
                // If we still don't have a valid number, use client-side calculation
                if (days === undefined || days === null || typeof days !== 'number') {
                    console.log('Using client-side fallback calculation');
                    days = calculateDaysClientSide(startDate, endDate);
                }
                
                console.log('Final days value:', days);
                document.getElementById('numDays').value = days;
                
                // Clear any previous error messages
                document.getElementById('applyResult').innerHTML = '';
            },
            function(error) {
                console.error('API Error, using client-side calculation:', error);
                // Fallback to client-side calculation
                var days = calculateDaysClientSide(startDate, endDate);
                document.getElementById('numDays').value = days;
            }
        );
    } else {
        document.getElementById('numDays').value = '';
    }
}

// Client-side calculation fallback
function calculateDaysClientSide(startDate, endDate) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var timeDiff = end.getTime() - start.getTime();
    var dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    return dayDiff;
}

function applyLeave() {
    // Use the current logged-in user's ID instead of input field
    if (!currentUser) {
        document.getElementById('applyResult').innerHTML = 
            '<div class="error">Please login first.</div>';
        return;
    }
    
    var empId = currentUser.empId; // Use logged-in user's ID
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    var leaveType = document.getElementById('leaveType').value;
    var handoverName = document.getElementById('handoverName').value;
    var handoverPosition = document.getElementById('handoverPosition').value;
    var handoverDepartment = document.getElementById('handoverDepartment').value;

    // Validate required fields
    if (!startDate || !endDate) {
        document.getElementById('applyResult').innerHTML = 
            '<div class="error">Please select start and end dates.</div>';
        return;
    }

    // Validate handover information
    if (!handoverName || !handoverPosition || !handoverDepartment) {
        document.getElementById('applyResult').innerHTML = 
            '<div class="error">Please fill in all handover information.</div>';
        return;
    }

    // Show loading state
    document.getElementById('applyResult').innerHTML = 
        '<div class="loading">Submitting leave application...</div>';

    callApi(
        {
            action: 'applyForLeave',
            empId: empId,
            startDate: startDate,
            endDate: endDate,
            leaveType: leaveType,
            handoverName: handoverName,
            handoverPosition: handoverPosition,
            handoverDepartment: handoverDepartment
        },
        function(result) {
            var resultDiv = document.getElementById('applyResult');
            if (result.success) {
                resultDiv.innerHTML = '<div class="success">' + result.message + '</div>';
                // Clear form fields but keep employee info displayed
                document.getElementById('startDate').value = '';
                document.getElementById('endDate').value = '';
                document.getElementById('numDays').value = '';
                document.getElementById('handoverName').value = '';
                document.getElementById('handoverPosition').value = '';
                document.getElementById('handoverDepartment').value = '';
                
                // Show success modal
                showSuccessModal('Leave application submitted successfully!');
                
                // Refresh the employee data to update leave balance
                loadUserDashboardData();
            } else {
                resultDiv.innerHTML = '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('applyResult').innerHTML = 
                '<div class="error">Error submitting leave application: ' + error + '</div>';
        }
    );
}

function previewLeaveRequest(leaveId) {
    callApi(
        { action: 'getLeaveDetails', leaveId: leaveId },
        function(leaveDetails) {
            displayPreviewModal(leaveDetails);
        },
        function(error) {
            alert('Error loading leave details: ' + error);
        }
    );
}

// Enhanced displayPreviewModal function
function displayPreviewModal(leaveDetails) {
    var modal = document.getElementById('previewModal');
    var content = document.getElementById('previewContent');
    
    var startDate = formatDateFromString(leaveDetails.startDate);
    var endDate = formatDateFromString(leaveDetails.endDate);
    var appliedDate = formatDateFromString(leaveDetails.appliedDate);
    
    // Get employee details for leave balance information
    callApi(
        { action: 'getEmployeeDetails', empId: leaveDetails.empId },
        function(employeeData) {
            var html = '<div class="preview-layout">';
            
            // Employee Information
            html += '<div class="preview-section">' +
                '<h4>Employee Information</h4>' +
                '<div class="preview-grid">' +
                '<div class="preview-item"><label>Name:</label><span>' + leaveDetails.name + '</span></div>' +
                '<div class="preview-item"><label>Employee ID:</label><span>' + leaveDetails.empId + '</span></div>' +
                '<div class="preview-item"><label>Position:</label><span>' + leaveDetails.position + '</span></div>' +
                '<div class="preview-item"><label>Department:</label><span>' + leaveDetails.department + '</span></div>' +
                '</div></div>';
            
            // Leave Balance Information
            if (employeeData.success) {
                html += '<div class="preview-section">' +
                    '<h4>Leave Balance</h4>' +
                    '<div class="preview-grid">' +
                    '<div class="preview-item"><label>Previous Year Leave:</label><span>' + employeeData.prevYearLeave + ' days</span></div>' +
                    '<div class="preview-item"><label>Current Year Entitled:</label><span>' + employeeData.currentYearEntitled + ' days</span></div>' +
                    '<div class="preview-item"><label>Days Taken:</label><span>' + employeeData.daysTaken + ' days</span></div>' +
                    '<div class="preview-item"><label>Days Available:</label><span>' + employeeData.totalDaysLeft + ' days</span></div>' +
                    '</div></div>';
            }
            
            // Leave Request Details
            html += '<div class="preview-section">' +
                '<h4>Leave Request Details</h4>' +
                '<div class="preview-grid">' +
                '<div class="preview-item"><label>Start Date:</label><span>' + startDate + '</span></div>' +
                '<div class="preview-item"><label>End Date:</label><span>' + endDate + '</span></div>' +
                '<div class="preview-item"><label>Number of Days:</label><span>' + leaveDetails.days + '</span></div>' +
                '<div class="preview-item"><label>Leave Type:</label><span>' + leaveDetails.type + '</span></div>' +
                '<div class="preview-item"><label>Status:</label><span>' + leaveDetails.status + '</span></div>' +
                '<div class="preview-item"><label>Applied Date:</label><span>' + appliedDate + '</span></div>' +
                '</div></div>';
            
            // Handover Information
            if (leaveDetails.handoverName) {
                html += '<div class="preview-section">' +
                    '<h4>Handover Information</h4>' +
                    '<div class="preview-grid">' +
                    '<div class="preview-item"><label>Name:</label><span>' + leaveDetails.handoverName + '</span></div>' +
                    '<div class="preview-item"><label>Position:</label><span>' + leaveDetails.handoverPosition + '</span></div>' +
                    '<div class="preview-item"><label>Department:</label><span>' + leaveDetails.handoverDepartment + '</span></div>' +
                    '</div></div>';
            }
            
            // Notes
            if (leaveDetails.notes) {
                html += '<div class="preview-section">' +
                    '<h4>Notes</h4>' +
                    '<div class="preview-notes">' + leaveDetails.notes + '</div>' +
                    '</div>';
            }
            
            // Signatures Section
            html += '<div class="preview-section signatures-section">' +
                '<h4>Approval Signatures</h4>' +
                '<div class="signatures-grid">' +
                '<div class="signature-box">' +
                '<div class="signature-line"></div>' +
                '<div class="signature-label">Employee Signature</div>' +
                '<div class="signature-name">' + leaveDetails.name + '</div>' +
                '</div>' +
                '<div class="signature-box">' +
                '<div class="signature-line"></div>' +
                '<div class="signature-label">Handover Employee Signature</div>' +
                '<div class="signature-name">' + (leaveDetails.handoverName || 'N/A') + '</div>' +
                '</div>' +
                '<div class="signature-box">' +
                '<div class="signature-line"></div>' +
                '<div class="signature-label">Approver Signature</div>' +
                '<div class="signature-name">' + (leaveDetails.approvedBy || 'Pending') + '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
            
            // Print Button
            html += '<div class="preview-actions">' +
                '<button class="btn-primary" onclick="printLeaveRequest(\'' + leaveDetails.id + '\')">Print Leave Request</button>' +
                '</div>';
            
            html += '</div>';
            
            content.innerHTML = html;
            modal.classList.remove('hidden');
        },
        function(error) {
            console.error('Error loading employee details:', error);
            // Fallback if employee details fail to load
            var fallbackHtml = '<div class="error">Error loading employee details. Please try again.</div>';
            content.innerHTML = fallbackHtml;
            modal.classList.remove('hidden');
        }
    );
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

// Enhanced pending requests loading
function loadPendingRequests() {
    const currentUser = getCurrentUser();
    let department = null;
    
    if (currentUser && currentUser.accessLevel === 'Manager') {
        department = currentUser.department;
    }
    
    callApi(
        { action: 'getPendingRequests', department: department },
        function(result) {
            if (result.success) {
                displayPendingRequests(result.pendingRequests);
            } else {
                document.getElementById('pendingResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('pendingResult').innerHTML = 
                '<div class="error">Error loading pending requests: ' + error + '</div>';
        }
    );
}

// Enhanced pending plan requests loading
function loadPendingPlanRequests() {
    const currentUser = getCurrentUser();
    let department = null;
    
    if (currentUser && currentUser.accessLevel === 'Manager') {
        department = currentUser.department;
    }
    
    callApi(
        { action: 'getPendingPlanRequests', department: department },
        function(result) {
            if (result.success) {
                displayPendingPlanRequests(result.pendingPlans);
            } else {
                document.getElementById('pendingPlanResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('pendingPlanResult').innerHTML = 
                '<div class="error">Error loading pending plan requests: ' + error + '</div>';
        }
    );
}

// Load recommended requests for Branch Manager/HR
function loadRecommendedRequests() {
    callApi(
        { action: 'getRecommendedRequests' },
        function(result) {
            if (result.success) {
                displayRecommendedRequests(result.recommendedRequests);
            } else {
                document.getElementById('pendingResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('pendingResult').innerHTML = 
                '<div class="error">Error loading recommended requests: ' + error + '</div>';
        }
    );
}

// Enhanced display function for pending requests
function displayPendingRequests(requests) {
    var container = document.getElementById('pendingResult');
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.accessLevel : '';
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="info-message">No pending leave requests.</div>';
        return;
    }
    
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Employee ID</th>' +
        '<th>Name</th>' +
        '<th>Role</th>' +
        '<th>Department</th>' +
        '<th>Start Date</th>' +
        '<th>End Date</th>' +
        '<th>Days</th>' +
        '<th>Type</th>' +
        '<th>Applied Date</th>' +
        '<th>Actions</th>' +
        '</tr></thead><tbody>';
    
    requests.forEach(function(leave) {
        var startDate = formatDateFromString(leave.startDate);
        var endDate = formatDateFromString(leave.endDate);
        var appliedDate = formatDateFromString(leave.appliedDate);
        
        html += '<tr>' +
            '<td>' + leave.empId + '</td>' +
            '<td>' + leave.name + '</td>' +
            '<td>' + leave.accessLevel + '</td>' +
            '<td>' + leave.department + '</td>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td>' + leave.days + '</td>' +
            '<td>' + leave.type + '</td>' +
            '<td>' + appliedDate + '</td>' +
            '<td>';
        
        // Show appropriate buttons based on user role and employee role
        if (userRole === 'Manager' && leave.accessLevel === 'Employee') {
            // Managers can only recommend their department employees
            html += '<button class="btn-approve" onclick="recommendLeaveRequest(\'' + leave.id + '\')">Recommend</button>';
            html += '<button class="btn-reject" onclick="rejectLeaveRequest(\'' + leave.id + '\')">Reject</button>';
        } else if ((userRole === 'Branch Manager' || userRole === 'HR' || userRole === 'Admin')) {
            // Branch Manager/HR can approve managers, branch managers, and HR requests
            if (leave.accessLevel === 'Manager' || leave.accessLevel === 'Branch Manager' || leave.accessLevel === 'HR') {
                html += '<button class="btn-approve" onclick="approveLeaveRequest(\'' + leave.id + '\')">Approve</button>';
                html += '<button class="btn-reject" onclick="rejectLeaveRequest(\'' + leave.id + '\')">Reject</button>';
            }
        }
        
        html += '<button class="btn-preview" onclick="previewLeaveRequest(\'' + leave.id + '\')">Preview</button>' +
            '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Enhanced display function for pending plan requests
function displayPendingPlanRequests(plans) {
    var container = document.getElementById('pendingPlanResult');
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.accessLevel : '';
    
    if (!plans || plans.length === 0) {
        container.innerHTML = '<div class="info-message">No pending leave plan requests.</div>';
        return;
    }
    
    var html = '';
    
    // Add section header explaining direct approval
    if (userRole === 'Manager') {
        html += '<div class="section-header"><h3>Department Employee Planned Leaves (For Direct Approval)</h3></div>';
    } else if (userRole === 'Branch Manager' || userRole === 'HR' || userRole === 'Admin') {
        html += '<div class="section-header"><h3>All Planned Leave Requests</h3></div>';
    }
    
    html += '<table class="data-table"><thead><tr>' +
        '<th>Employee ID</th>' +
        '<th>Name</th>' +
        '<th>Role</th>' +
        '<th>Department</th>' +
        '<th>From Date</th>' +
        '<th>To Date</th>' +
        '<th>Days</th>' +
        '<th>Planned Date</th>' +
        '<th>Actions</th>' +
        '</tr></thead><tbody>';
    
    plans.forEach(function(plan) {
        var fromDate = formatDateFromString(plan.fromDate);
        var toDate = formatDateFromString(plan.toDate);
        var plannedDate = formatDateFromString(plan.plannedDate);
        
        html += '<tr>' +
            '<td>' + plan.empId + '</td>' +
            '<td>' + plan.name + '</td>' +
            '<td>' + plan.accessLevel + '</td>' +
            '<td>' + plan.department + '</td>' +
            '<td>' + fromDate + '</td>' +
            '<td>' + toDate + '</td>' +
            '<td>' + plan.days + '</td>' +
            '<td>' + plannedDate + '</td>' +
            '<td>';
        
        // DIRECT APPROVAL - No recommendation step for planned leaves
        if (userRole === 'Manager' && plan.accessLevel === 'Employee') {
            // Managers can directly approve/reject their department employees' planned leaves
            html += '<button class="btn-approve" onclick="approvePlanRequest(\'' + plan.id + '\')">Approve</button>';
            html += '<button class="btn-reject" onclick="rejectPlanRequest(\'' + plan.id + '\')">Reject</button>';
        } else if ((userRole === 'Branch Manager' || userRole === 'HR' || userRole === 'Admin')) {
            // Higher roles can also approve all planned leaves
            html += '<button class="btn-approve" onclick="approvePlanRequest(\'' + plan.id + '\')">Approve</button>';
            html += '<button class="btn-reject" onclick="rejectPlanRequest(\'' + plan.id + '\')">Reject</button>';
        }
        
        html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Display recommended requests (for Branch Manager/HR)
function displayRecommendedRequests(recommendedRequests) {
    var container = document.getElementById('pendingResult');
    const currentUser = getCurrentUser();
    
    if (!recommendedRequests || recommendedRequests.length === 0) {
        // Don't show message if there are regular pending requests
        return;
    }
    
    var html = '<div class="section-header"><h3>Recommended Leave Requests</h3></div>';
    html += '<table class="data-table"><thead><tr>' +
        '<th>Employee ID</th>' +
        '<th>Name</th>' +
        '<th>Department</th>' +
        '<th>Start Date</th>' +
        '<th>End Date</th>' +
        '<th>Days</th>' +
        '<th>Type</th>' +
        '<th>Recommended By</th>' +
        '<th>Applied Date</th>' +
        '<th>Actions</th>' +
        '</tr></thead><tbody>';
    
    recommendedRequests.forEach(function(leave) {
        var startDate = formatDateFromString(leave.startDate);
        var endDate = formatDateFromString(leave.endDate);
        var appliedDate = formatDateFromString(leave.appliedDate);
        
        html += '<tr>' +
            '<td>' + leave.empId + '</td>' +
            '<td>' + leave.name + '</td>' +
            '<td>' + leave.department + '</td>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td>' + leave.days + '</td>' +
            '<td>' + leave.type + '</td>' +
            '<td>' + leave.recommendedBy + '</td>' +
            '<td>' + appliedDate + '</td>' +
            '<td>' +
            '<button class="btn-approve" onclick="approveLeaveRequest(\'' + leave.id + '\')">Approve</button>' +
            '<button class="btn-reject" onclick="rejectLeaveRequest(\'' + leave.id + '\')">Reject</button>' +
            '<button class="btn-preview" onclick="previewLeaveRequest(\'' + leave.id + '\')">Preview</button>' +
            '</td></tr>';
    });
    
    html += '</tbody></table>';
    
    // Append to existing content or replace if no regular pending requests
    var existingContent = container.innerHTML;
    if (existingContent.includes('No pending leave requests')) {
        container.innerHTML = html;
    } else {
        container.innerHTML = html + existingContent;
    }
}

// Utility function to format date from string
function formatDateFromString(dateString) {
    if (!dateString) return '';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Initialize add employee form
function initializeAddEmployeeForm() {
    // Set join date to today by default
    var today = new Date().toISOString().split('T')[0];
    var joinDateInput = document.getElementById('newEmpJoinDate');
    if (joinDateInput) {
        joinDateInput.value = today;
    }
}

function displayMyLeaveHistory(leaveHistory) {
    var container = document.getElementById('myHistoryResult');
    
    if (!leaveHistory || leaveHistory.length === 0) {
        container.innerHTML = '<div class="info-message">No leave history found.</div>';
        return;
    }
    
    // Filter out planned leaves - only show actual leave requests
    var filteredHistory = leaveHistory.filter(function(leave) {
        return leave.status !== 'Planned';
    });
    
    if (filteredHistory.length === 0) {
        container.innerHTML = '<div class="info-message">No leave requests found.</div>';
        return;
    }
    
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Start Date</th>' +
        '<th>End Date</th>' +
        '<th>Days</th>' +
        '<th>Type</th>' +
        '<th>Status</th>' +
        '<th>Handover Name</th>' +
        '<th>Applied Date</th>' +
        '<th class="actions-column">Actions</th>' +
        '</tr></thead><tbody>';
    
    filteredHistory.forEach(function(leave) {
        var startDate = formatDateFromString(leave.startDate);
        var endDate = formatDateFromString(leave.endDate);
        var appliedDate = formatDateFromString(leave.appliedDate);
        
        var statusClass = '';
        if (leave.status === 'Approved') statusClass = 'status-approved';
        else if (leave.status === 'Rejected') statusClass = 'status-rejected';
        else if (leave.status === 'Pending') statusClass = 'status-pending';
        
        html += '<tr>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td>' + leave.days + '</td>' +
            '<td>' + leave.type + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + leave.status + '</span></td>' +
            '<td>' + (leave.handoverName || '-') + '</td>' +
            '<td>' + appliedDate + '</td>' +
            '<td class="actions-column">';
        
        if (leave.status === 'Approved') {
            html += '<button class="btn-preview" onclick="previewLeaveRequest(\'' + leave.id + '\')">Preview</button>';
        }
        
        html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function loadAllLeaveHistory() {
    const empIdElement = document.getElementById('historyEmpId');
    const deptElement = document.getElementById('historyDept');
    const statusElement = document.getElementById('historyStatus');
    const startFromElement = document.getElementById('historyStartFrom');
    const startToElement = document.getElementById('historyStartTo');

    // Safely get values (handle missing elements)
    const empId = empIdElement ? empIdElement.value : '';
    let dept = deptElement ? deptElement.value : '';
    const status = statusElement ? statusElement.value : '';
    const startFrom = startFromElement ? startFromElement.value : '';
    const startTo = startToElement ? startToElement.value : '';

    // For Managers, force their department
    if (currentUser && currentUser.accessLevel === 'Manager') {
        dept = currentUser.department;
    }

    callApi(
        {
            action: 'getAllLeaveHistory',
            empId: empId,
            dept: dept,
            status: status,
            startFrom: startFrom,
            startTo: startTo
        },
        function(result) {
            if (result.success) {
                displayAllLeaveHistory(result.leaveHistory);
                updateStatistics(result.leaveHistory);
            } else {
                document.getElementById('allHistoryResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('allHistoryResult').innerHTML = 
                '<div class="error">Error loading leave history: ' + error + '</div>';
        }
    );
}

function displayAllLeaveHistory(leaveHistory) {
    var container = document.getElementById('allHistoryResult');
    
    if (!leaveHistory || leaveHistory.length === 0) {
        container.innerHTML = '<div class="info-message">No leave history found for the selected criteria.</div>';
        return;
    }
    
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Employee ID</th>' +
        '<th>Name</th>' +
        '<th>Department</th>' +
        '<th>Start Date</th>' +
        '<th>End Date</th>' +
        '<th>Days</th>' +
        '<th>Type</th>' +
        '<th>Status</th>' +
        '<th>Handover Name</th>' +
        '<th>Applied Date</th>' +
        '<th class="actions-column">Actions</th>' +
        '</tr></thead><tbody>';
    
    leaveHistory.forEach(function(leave) {
        var startDate = formatDateFromString(leave.startDate);
        var endDate = formatDateFromString(leave.endDate);
        var appliedDate = formatDateFromString(leave.appliedDate);
        
        var statusClass = '';
        if (leave.status === 'Approved') statusClass = 'status-approved';
        else if (leave.status === 'Rejected') statusClass = 'status-rejected';
        else if (leave.status === 'Pending') statusClass = 'status-pending';
        else if (leave.status === 'Planned') statusClass = 'status-planned';
        
        html += '<tr>' +
            '<td>' + leave.empId + '</td>' +
            '<td>' + leave.name + '</td>' +
            '<td>' + leave.department + '</td>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td>' + leave.days + '</td>' +
            '<td>' + leave.type + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + leave.status + '</span></td>' +
            '<td>' + (leave.handoverName || '-') + '</td>' +
            '<td>' + appliedDate + '</td>' +
            '<td class="actions-column">' +
            '<button class="btn-preview" onclick="previewLeaveRequest(\'' + leave.id + '\')">Preview</button>' +
            '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStatistics(leaveHistory) {
    if (!leaveHistory) return;
    
    const totalRequests = document.getElementById('totalRequests');
    const approvedRequests = document.getElementById('approvedRequests');
    const pendingRequests = document.getElementById('pendingRequests');
    const rejectedRequests = document.getElementById('rejectedRequests');
    const plannedRequests = document.getElementById('plannedRequests');
    
    if (totalRequests) totalRequests.textContent = leaveHistory.length;
    if (approvedRequests) approvedRequests.textContent = leaveHistory.filter(l => l.status === 'Approved').length;
    if (pendingRequests) pendingRequests.textContent = leaveHistory.filter(l => l.status === 'Pending').length;
    if (rejectedRequests) rejectedRequests.textContent = leaveHistory.filter(l => l.status === 'Rejected').length;
    if (plannedRequests) plannedRequests.textContent = leaveHistory.filter(l => l.status === 'Planned').length;
}

function loadHistorySummary() {
    callApi(
        { action: 'getAllEmployees' },
        function(result) {
            if (result.success) {
                displayLeaveSummary(result.employees);
            } else {
                document.getElementById('historySummaryResult').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('historySummaryResult').innerHTML = 
                '<div class="error">Error loading leave summary: ' + error + '</div>';
        }
    );
}

function displayLeaveSummary(employees) {
    var container = document.getElementById('historySummaryResult');
    
    if (!employees || employees.length === 0) {
        container.innerHTML = '<div class="info-message">No employee data found.</div>';
        return;
    }
    
    // Apply filters if any
    const empIdElement = document.getElementById('summaryEmpId');
    const deptElement = document.getElementById('summaryDept');
    const statusElement = document.getElementById('summaryStatus');

    const empId = empIdElement ? empIdElement.value : '';
    let dept = deptElement ? deptElement.value : '';
    const status = statusElement ? statusElement.value : '';

    // For Managers, force their department
    if (currentUser && currentUser.accessLevel === 'Manager') {
        dept = currentUser.department;
    }

    let filteredEmployees = employees;

    // Apply employee ID filter
    if (empId) {
        filteredEmployees = filteredEmployees.filter(function(employee) {
            return employee.empId && employee.empId.toLowerCase().includes(empId.toLowerCase());
        });
    }

    // Apply department filter
    if (dept) {
        filteredEmployees = filteredEmployees.filter(function(employee) {
            return employee.department === dept;
        });
    }

    // Apply status filter
    if (status) {
        filteredEmployees = filteredEmployees.filter(function(employee) {
            return employee.status === status;
        });
    }

    if (filteredEmployees.length === 0) {
        container.innerHTML = '<div class="info-message">No employees found for the selected criteria.</div>';
        return;
    }

    // Calculate totals
    var totalPrevYearLeave = 0;
    var totalCurYearEntitled = 0;
    var totalDaysTaken = 0;
    var totalDaysAvailable = 0;

    filteredEmployees.forEach(function(employee) {
        totalPrevYearLeave += parseFloat(employee.prevYearLeave) || 0;
        totalCurYearEntitled += parseFloat(employee.currentYearEntitled) || 0;
        totalDaysTaken += parseFloat(employee.daysTaken) || 0;
        totalDaysAvailable += parseFloat(employee.totalDaysLeft) || 0;
    });

    var html = '<div class="summary-stats">' +
        '<h4>Leave Balance Summary</h4>' +
        '<div class="stats-grid">' +
        '<div class="stat-card"><div class="stat-number">' + filteredEmployees.length + '</div><div class="stat-label">Total Employees</div></div>' +
        '<div class="stat-card"><div class="stat-number">' + totalPrevYearLeave.toFixed(1) + '</div><div class="stat-label">Total Prev Year</div></div>' +
        '<div class="stat-card"><div class="stat-number">' + totalCurYearEntitled.toFixed(1) + '</div><div class="stat-label">Total Entitled</div></div>' +
        '<div class="stat-card"><div class="stat-number">' + totalDaysTaken.toFixed(1) + '</div><div class="stat-label">Total Taken</div></div>' +
        '<div class="stat-card"><div class="stat-number">' + totalDaysAvailable.toFixed(1) + '</div><div class="stat-label">Total Available</div></div>' +
        '</div></div>';
    
    html += '<table class="summary-table"><thead><tr>' +
        '<th>Emp ID</th>' +
        '<th>Name</th>' +
        '<th>Department</th>' +
        '<th>Prev Year Leave</th>' +
        '<th>Cur Year Entitled</th>' +
        '<th>Taken</th>' +
        '<th>Available</th>' +
        '<th>Status</th>' +
        '</tr></thead><tbody>';
    
    // Sort employees by department and name
    filteredEmployees.sort(function(a, b) {
        if (a.department !== b.department) {
            return a.department.localeCompare(b.department);
        }
        return a.name.localeCompare(b.name);
    });
    
    var currentDept = '';
    filteredEmployees.forEach(function(employee) {
        // Add department header if department changed
        if (employee.department !== currentDept) {
            currentDept = employee.department;
            html += '<tr class="department-row">' +
                '<td colspan="8"><strong>Department: ' + currentDept + '</strong></td>' +
                '</tr>';
        }
        
        var statusClass = '';
        if (employee.status === 'Active') statusClass = 'status-approved';
        else if (employee.status === 'Inactive') statusClass = 'status-rejected';
        else if (employee.status === 'Suspended') statusClass = 'status-pending';
        
        html += '<tr>' +
            '<td>' + employee.empId + '</td>' +
            '<td>' + employee.name + '</td>' +
            '<td>' + employee.department + '</td>' +
            '<td>' + (employee.prevYearLeave || 0) + '</td>' +
            '<td>' + (employee.currentYearEntitled || 0) + '</td>' +
            '<td>' + (employee.daysTaken || 0) + '</td>' +
            '<td><strong>' + (employee.totalDaysLeft || 0) + '</strong></td>' +
            '<td><span class="status-badge ' + statusClass + '">' + (employee.status || 'Active') + '</span></td>' +
            '</tr>';
    });
    
    // Add total row
    html += '<tr class="department-total">' +
        '<td colspan="3"><strong>Total</strong></td>' +
        '<td><strong>' + totalPrevYearLeave.toFixed(1) + '</strong></td>' +
        '<td><strong>' + totalCurYearEntitled.toFixed(1) + '</strong></td>' +
        '<td><strong>' + totalDaysTaken.toFixed(1) + '</strong></td>' +
        '<td><strong>' + totalDaysAvailable.toFixed(1) + '</strong></td>' +
        '<td></td>' +
        '</tr>';
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function exportToCSV() {
    callApi(
        { action: 'exportLeaveHistoryToCSV' },
        function(fileUrl) {
            // Create a temporary link to download the file
            var link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.click();
            
            alert('CSV export completed! The file should download shortly.');
        },
        function(error) {
            alert('Error exporting to CSV: ' + error);
        }
    );
}

function loadLeavePlan() {
    const currentUser = getCurrentUser();
    let department = null;
    
    if (currentUser && currentUser.accessLevel === 'Manager') {
        department = currentUser.department;
    } else {
        const planDept = document.getElementById('planDept');
        department = planDept ? planDept.value : null;
    }
    
    const planYear = document.getElementById('planYear');
    const year = planYear ? planYear.value : new Date().getFullYear();
    
    callApi(
        { action: 'getLeavePlanForYear', department: department, year: year },
        function(result) {
            if (result.success) {
                displayLeavePlan(result.leavePlan);
            } else {
                document.getElementById('plannedLeavesByMonth').innerHTML = 
                    '<div class="error">' + result.error + '</div>';
            }
        },
        function(error) {
            document.getElementById('plannedLeavesByMonth').innerHTML = 
                '<div class="error">Error loading leave plan: ' + error + '</div>';
        }
    );
}

function displayLeavePlan(leavePlan) {
    var container = document.getElementById('plannedLeavesByMonth');
    
    if (!leavePlan || leavePlan.length === 0) {
        container.innerHTML = '<div class="info-message">No planned leaves found for the selected criteria.</div>';
        return;
    }
    
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Employee ID</th>' +
        '<th>Name</th>' +
        '<th>Department</th>' +
        '<th>Start Date</th>' +
        '<th>End Date</th>' +
        '<th>Days</th>' +
        '<th>Status</th>' +
        '</tr></thead><tbody>';
    
    leavePlan.forEach(function(plan) {
        var startDate = formatDateFromString(plan.startDate);
        var endDate = formatDateFromString(plan.endDate);
        
        var statusClass = '';
        if (plan.status === 'Approved') statusClass = 'status-approved';
        else if (plan.status === 'Planned') statusClass = 'status-pending';
        
        html += '<tr>' +
            '<td>' + plan.empId + '</td>' +
            '<td>' + plan.name + '</td>' +
            '<td>' + plan.department + '</td>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td>' + plan.days + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + plan.status + '</span></td>' +
            '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

let confirmActionCallback = null;

function showConfirmModal(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    confirmActionCallback = callback;
    document.getElementById('confirmActionBtn').onclick = () => {
        closeConfirmModal();
        if (confirmActionCallback) confirmActionCallback();
    };
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}

// Missing function implementations
function approveLeaveRequest(leaveId) {
    showConfirmModal('Are you sure you want to approve this leave request?', function() {
        callApi(
            { action: 'approveLeaveRequest', leaveId: leaveId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Leave request approved!');
                    loadPendingRequests();
                    loadRecommendedRequests();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Approval error: ' + error);
            }
        );
    });
}

function rejectLeaveRequest(leaveId) {
    showConfirmModal('Are you sure you want to reject this leave request?', function() {
        callApi(
            { action: 'rejectLeaveRequest', leaveId: leaveId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Leave request rejected!');
                    loadPendingRequests();
                    loadRecommendedRequests();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Rejection error: ' + error);
            }
        );
    });
}

function recommendLeaveRequest(leaveId) {
    showConfirmModal('Are you sure you want to recommend this leave request?', function() {
        callApi(
            { action: 'recommendLeaveRequest', leaveId: leaveId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Leave request recommended!');
                    loadPendingRequests();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Recommendation error: ' + error);
            }
        );
    });
}

function approvePlanRequest(planId) {
    showConfirmModal('Are you sure you want to approve this planned leave?', function() {
        callApi(
            { action: 'approvePlanRequest', planId: planId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Planned leave approved!');
                    loadPendingPlanRequests();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Approval error: ' + error);
            }
        );
    });
}

function rejectPlanRequest(planId) {
    showConfirmModal('Are you sure you want to reject this planned leave?', function() {
        callApi(
            { action: 'rejectPlanRequest', planId: planId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Planned leave rejected!');
                    loadPendingPlanRequests();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Rejection error: ' + error);
            }
        );
    });
}

function printLeaveRequest(leaveId) {
    // Implementation for printing leave request
    window.print();
}

function loadEmployeeList() {
    callApi(
        { action: 'getEmployeeList' },
        function(result) {
            if (result.success) {
                // Display employee list
                console.log('Employee list:', result.employees);
            } else {
                showError('Error loading employee list: ' + result.error);
            }
        },
        function(error) {
            showError('Error loading employee list: ' + error);
        }
    );
}

function addNewEmployee() {
    const formData = {
        action: 'addEmployee',
        empId: document.getElementById('newEmpId').value,
        name: document.getElementById('newEmpName').value,
        email: document.getElementById('newEmpEmail').value,
        position: document.getElementById('newEmpPosition').value,
        department: document.getElementById('newEmpDepartment').value,
        accessLevel: document.getElementById('newEmpAccessLevel').value,
        joinDate: document.getElementById('newEmpJoinDate').value,
        status: document.getElementById('newEmpStatus').value,
        currentYearEntitled: document.getElementById('newEmpCurYearEntitled').value,
        prevYearLeave: document.getElementById('newEmpPrevYearLeave').value
    };
    
    callApi(
        formData,
        function(result) {
            if (result.success) {
                showSuccessModal('Employee added successfully!');
                // Clear form
                document.getElementById('newEmpId').value = '';
                document.getElementById('newEmpName').value = '';
                document.getElementById('newEmpEmail').value = '';
                document.getElementById('newEmpPosition').value = '';
                document.getElementById('newEmpDepartment').value = '';
                document.getElementById('newEmpJoinDate').value = '';
                document.getElementById('newEmpCurYearEntitled').value = '21';
                document.getElementById('newEmpPrevYearLeave').value = '0';
            } else {
                showError('Error adding employee: ' + result.error);
            }
        },
        function(error) {
            showError('Error adding employee: ' + error);
        }
    );
}

function clearEmployeeForm() {
    document.getElementById('newEmpId').value = '';
    document.getElementById('newEmpName').value = '';
    document.getElementById('newEmpEmail').value = '';
    document.getElementById('newEmpPosition').value = '';
    document.getElementById('newEmpDepartment').value = '';
    document.getElementById('newEmpJoinDate').value = '';
    document.getElementById('newEmpCurYearEntitled').value = '21';
    document.getElementById('newEmpPrevYearLeave').value = '0';
}

function displayMyPlannedLeaves(plannedLeaves) {
    var container = document.getElementById('myPlanResult');
    
    if (!plannedLeaves || plannedLeaves.length === 0) {
        container.innerHTML = '<div class="info-message">No planned leaves found.</div>';
        return;
    }
    
    var html = '<table class="data-table"><thead><tr>' +
        '<th>From Date</th>' +
        '<th>To Date</th>' +
        '<th>Days</th>' +
        '<th>Status</th>' +
        '<th>Planned Date</th>' +
        '<th class="actions-column">Actions</th>' +
        '</tr></thead><tbody>';
    
    plannedLeaves.forEach(function(plan) {
        var fromDate = formatDateFromString(plan.fromDate);
        var toDate = formatDateFromString(plan.toDate);
        var plannedDate = formatDateFromString(plan.plannedDate);
        
        var statusClass = '';
        if (plan.status === 'Approved') statusClass = 'status-approved';
        else if (plan.status === 'Pending') statusClass = 'status-pending';
        
        html += '<tr>' +
            '<td>' + fromDate + '</td>' +
            '<td>' + toDate + '</td>' +
            '<td>' + plan.days + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + plan.status + '</span></td>' +
            '<td>' + plannedDate + '</td>' +
            '<td class="actions-column">';
        
        if (plan.status === 'Pending') {
            html += '<button class="btn-cancel" onclick="cancelPlannedLeave(\'' + plan.id + '\')">Cancel</button>';
        }
        
        html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function cancelPlannedLeave(planId) {
    showConfirmModal('Are you sure you want to cancel this planned leave?', function() {
        callApi(
            { action: 'cancelPlannedLeave', planId: planId },
            function(result) {
                if (result.success) {
                    showSuccessModal('Planned leave cancelled!');
                    loadMyPlannedLeavesAuto();
                } else {
                    showError('Error: ' + result.error);
                }
            },
            function(error) {
                showError('Cancellation error: ' + error);
            }
        );
    });
}

// Plan Leave functions
function addPlannedDates() {
    const fromDate = document.getElementById('planFromDate').value;
    const toDate = document.getElementById('planToDate').value;
    
    if (!fromDate || !toDate) {
        alert('Please select both from and to dates');
        return;
    }
    
    if (new Date(toDate) < new Date(fromDate)) {
        alert('To date cannot be before from date');
        return;
    }
    
    // Calculate days
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Add to planned dates array
    plannedDates.push({
        fromDate: fromDate,
        toDate: toDate,
        days: days
    });
    
    updatePlannedDatesDisplay();
}

function updatePlannedDatesDisplay() {
    const container = document.getElementById('plannedDatesContainer');
    let totalDays = 0;
    
    let html = '';
    plannedDates.forEach((date, index) => {
        totalDays += date.days;
        html += `
            <div class="planned-date-item">
                <span>${formatDateFromString(date.fromDate)} to ${formatDateFromString(date.toDate)} (${date.days} days)</span>
                <button class="btn-remove" onclick="removePlannedDate(${index})">×</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('totalPlannedDays').textContent = totalDays;
    
    // Update days remaining
    const availableDays = parseInt(document.getElementById('planTotalDaysLeft').textContent) || 0;
    document.getElementById('daysRemaining').textContent = availableDays - totalDays;
}

function removePlannedDate(index) {
    plannedDates.splice(index, 1);
    updatePlannedDatesDisplay();
}

function savePlannedLeave() {
    if (plannedDates.length === 0) {
        alert('Please add at least one planned leave period');
        return;
    }
    
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const availableDays = parseInt(document.getElementById('planTotalDaysLeft').textContent) || 0;
    const totalPlanned = plannedDates.reduce((sum, date) => sum + date.days, 0);
    
    if (totalPlanned > availableDays) {
        alert('Total planned days exceed available leave days');
        return;
    }
    
    callApi(
        {
            action: 'savePlannedLeave',
            empId: currentUser.empId,
            plannedDates: plannedDates
        },
        function(result) {
            if (result.success) {
                showSuccessModal('Planned leave saved successfully!');
                plannedDates = [];
                updatePlannedDatesDisplay();
                loadUserDashboardData();
            } else {
                showError('Error saving planned leave: ' + result.error);
            }
        },
        function(error) {
            showError('Error saving planned leave: ' + error);
        }
    );
}

function clearPlanForm() {
    plannedDates = [];
    updatePlannedDatesDisplay();
    document.getElementById('planFromDate').value = '';
    document.getElementById('planToDate').value = '';
}

// Print functions
function printMyLeaveHistory() {
    window.print();
}

function printMyPlanList() {
    window.print();
}

function printAllLeaveHistory() {
    window.print();
}

function printHistorySummary() {
    window.print();
}

function printPlanList() {
    window.print();
}

function printEmployeeList() {
    window.print();
}

// Search and filter functions for employee list
function searchEmployees() {
    // Implementation for employee search
    console.log('Search employees function called');
}

function filterEmployees() {
    // Implementation for employee filtering
    console.log('Filter employees function called');
}