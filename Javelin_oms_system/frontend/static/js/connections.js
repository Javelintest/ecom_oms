// Connections page JavaScript
const API_BASE_URL = "http://127.0.0.1:8000/oms";

let platforms = [];

// ===== SIDEBAR NAVIGATION =====
const sidebar = document.getElementById('sidebar');
const sidebarOpen = document.getElementById('sidebar-open');
const sidebarClose = document.getElementById('sidebar-close');

// Mobile sidebar toggle
sidebarOpen?.addEventListener('click', () => {
  sidebar?.classList.add('open');
});

sidebarClose?.addEventListener('click', () => {
  sidebar?.classList.remove('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth < 992) {
    if (sidebar?.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !sidebarOpen?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  loadPlatformsList();
  loadAllConnectionStatuses();
  loadConnectionLogs();
  setupEventListeners();
  setupSidebarThemeToggle();
  
  // Check for URL parameters (OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const error = urlParams.get('error');
  const platform = urlParams.get('platform');
  
  if (success === 'true') {
    showAlert('success', `${platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Platform'} connected successfully!`);
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => loadAllConnectionStatuses(), 1000);
  } else if (error) {
    showAlert('danger', `Connection failed: ${decodeURIComponent(error)}`);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

async function loadPlatformsList() {
  try {
    const res = await axios.get(`${API_BASE_URL}/platforms/`);
    platforms = res.data;
  } catch (err) {
    console.error("Failed to load platforms", err);
  }
}

async function loadAllConnectionStatuses() {
  if (!platforms || platforms.length === 0) {
    await loadPlatformsList();
  }
  
  for (const platform of platforms) {
    try {
      await loadConnectionStatus(platform.id, platform.name);
    } catch (err) {
      console.error(`Failed to load status for ${platform.name}:`, err);
    }
  }
}

async function loadConnectionStatus(platformId, platformName) {
  try {
    const res = await axios.get(`${API_BASE_URL}/connections/status/${platformId}`);
    const status = res.data;
    updateConnectionCard(platformName, status);
  } catch (err) {
    console.error(`Failed to load status for ${platformName}:`, err);
  }
}

function updateConnectionCard(platformName, status) {
  const card = document.getElementById(`${platformName}-card`);
  const statusDiv = document.getElementById(`${platformName}-status`);
  const actionsDiv = document.getElementById(`${platformName}-actions`);
  
  if (!card || !statusDiv || !actionsDiv) return;
  
  // Update card class
  card.className = 'connection-card';
  if (status.connection_status === 'configured') {
    card.classList.add('connected');
  } else if (status.connection_status === 'error') {
    card.classList.add('error');
  } else {
    card.classList.add('not-connected');
  }
  
  // Update status badge
  let badgeClass = 'secondary';
  let statusText = 'Not Connected';
  
  if (status.connection_status === 'configured') {
    badgeClass = 'success';
    statusText = 'Connected';
  } else if (status.connection_status === 'incomplete') {
    badgeClass = 'warning';
    statusText = 'Incomplete';
  } else if (status.connection_status === 'error') {
    badgeClass = 'danger';
    statusText = 'Error';
  }
  
  statusDiv.innerHTML = `
    <span class="badge bg-${badgeClass} status-badge">${statusText}</span>
    ${status.error_message ? `<div class="mt-2 small text-danger">${status.error_message}</div>` : ''}
  `;
  
  // Update actions
  if (status.is_configured) {
    actionsDiv.innerHTML = `
      <button class="btn btn-sm btn-outline-primary" onclick="testConnection(${status.platform_id}, '${platformName}')">
        <i class="bi bi-check-circle me-1"></i>Test
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="disconnectPlatform(${status.platform_id}, '${platformName}')">
        <i class="bi bi-x-circle me-1"></i>Disconnect
      </button>
    `;
  } else {
    actionsDiv.innerHTML = `
      <span class="text-muted small">Configure connection to enable</span>
    `;
  }
}

function showAlert(type, message) {
  const alertsContainer = document.getElementById('connection-alerts');
  if (!alertsContainer) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertsContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

async function testConnection(platformId, platformName) {
  const resultDiv = document.getElementById(`${platformName}-test-result`);
  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.className = 'test-result';
    resultDiv.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Testing connection...';
  }
  
  try {
    const res = await axios.post(`${API_BASE_URL}/connections/test/${platformId}`);
    
    if (resultDiv) {
      resultDiv.className = `test-result ${res.data.status}`;
      resultDiv.innerHTML = `
        <i class="bi bi-${res.data.status === 'success' ? 'check-circle' : 'x-circle'} me-2"></i>
        ${res.data.message}
      `;
    }
    
    if (res.data.status === 'success') {
      showAlert('success', `${platformName} connection test successful!`);
      loadConnectionStatus(platformId, platformName);
    } else {
      showAlert('danger', `Connection test failed: ${res.data.message}`);
    }
  } catch (err) {
    if (resultDiv) {
      resultDiv.className = 'test-result error';
      resultDiv.innerHTML = `
        <i class="bi bi-x-circle me-2"></i>
        Test failed: ${err.response?.data?.detail || err.message}
      `;
    }
    showAlert('danger', `Test failed: ${err.response?.data?.detail || err.message}`);
  }
}

async function disconnectPlatform(platformId, platformName) {
  if (!confirm(`Are you sure you want to disconnect ${platformName}? This will remove all stored credentials.`)) {
    return;
  }
  
  try {
    await axios.delete(`${API_BASE_URL}/connections/${platformId}`);
    showAlert('success', `${platformName} disconnected successfully`);
    loadConnectionStatus(platformId, platformName);
  } catch (err) {
    showAlert('danger', `Failed to disconnect: ${err.response?.data?.detail || err.message}`);
  }
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const button = field.nextElementSibling;
  const icon = button.querySelector('i');
  
  if (field.type === 'password') {
    field.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    field.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
}

// Make functions available globally
window.testConnection = testConnection;
window.disconnectPlatform = disconnectPlatform;
window.togglePassword = togglePassword;

// Amazon OAuth Form
document.getElementById('amazon-oauth-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Initiating...';
    
    const res = await axios.post(`${API_BASE_URL}/connections/amazon/oauth/initiate`, {
      client_id: document.getElementById('amazon-client-id').value,
      client_secret: document.getElementById('amazon-client-secret').value,
      marketplace_id: document.getElementById('amazon-marketplace-id').value,
      region: document.getElementById('amazon-region').value
    });
    
    // Redirect to Amazon authorization URL
    window.location.href = res.data.authorization_url;
  } catch (err) {
    showAlert('danger', `Failed to initiate OAuth: ${err.response?.data?.detail || err.message}`);
    e.target.querySelector('button[type="submit"]').disabled = false;
    e.target.querySelector('button[type="submit"]').innerHTML = '<i class="bi bi-shield-check me-2"></i>Start OAuth Flow';
  }
});

// Amazon Manual Connection
document.getElementById('amazon-manual-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Connecting...';
    
    await axios.post(`${API_BASE_URL}/connections/amazon/manual`, {
      client_id: document.getElementById('amazon-manual-client-id').value,
      client_secret: document.getElementById('amazon-manual-client-secret').value,
      refresh_token: document.getElementById('amazon-refresh-token').value,
      marketplace_id: document.getElementById('amazon-manual-marketplace-id').value,
      region: document.getElementById('amazon-manual-region').value
    });
    
    showAlert('success', 'Amazon connected successfully!');
    e.target.reset();
    await loadAllConnectionStatuses();
    
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connect Amazon';
  } catch (err) {
    showAlert('danger', `Connection failed: ${err.response?.data?.detail || err.message}`);
    e.target.querySelector('button[type="submit"]').disabled = false;
    e.target.querySelector('button[type="submit"]').innerHTML = '<i class="bi bi-check-circle me-2"></i>Connect Amazon';
  }
});

// Flipkart Connection
document.getElementById('flipkart-connection-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Connecting...';
    
    await axios.post(`${API_BASE_URL}/connections/flipkart/manual`, {
      username: document.getElementById('flipkart-username').value,
      password: document.getElementById('flipkart-password').value,
      api_key: document.getElementById('flipkart-api-key').value || null,
      api_secret: document.getElementById('flipkart-api-secret').value || null
    });
    
    showAlert('success', 'Flipkart connected successfully!');
    e.target.reset();
    await loadAllConnectionStatuses();
    
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connect Flipkart';
  } catch (err) {
    showAlert('danger', `Connection failed: ${err.response?.data?.detail || err.message}`);
    e.target.querySelector('button[type="submit"]').disabled = false;
    e.target.querySelector('button[type="submit"]').innerHTML = '<i class="bi bi-check-circle me-2"></i>Connect Flipkart';
  }
});

// Refresh All Button
document.getElementById('btn-refresh-all')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh-all');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-2"></i>Refreshing...';
  
  await loadAllConnectionStatuses();
  await loadConnectionLogs();
  
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Refresh All';
});

// Load Connection Logs
async function loadConnectionLogs() {
  try {
    const res = await axios.get(`${API_BASE_URL}/sync-logs/`, {
      params: { limit: 20 }
    });
    
    const tbody = document.getElementById('connection-logs-table');
    if (!tbody) return;
    
    if (res.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            <i class="bi bi-info-circle me-2"></i>
            No sync logs yet. Sync operations will appear here.
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = "";
    res.data.forEach(log => {
      const tr = document.createElement("tr");
      const createdAt = log.created_at ? new Date(log.created_at).toLocaleString() : "N/A";
      tr.innerHTML = `
        <td><span class="badge bg-primary">${log.platform}</span></td>
        <td><span class="badge bg-secondary">${log.job_type || 'N/A'}</span></td>
        <td><span class="badge bg-${log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'}">${log.status}</span></td>
        <td>${log.message || 'N/A'}</td>
        <td>${log.records_processed || 0}</td>
        <td>${createdAt}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load connection logs", err);
    const tbody = document.getElementById('connection-logs-table');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Failed to load logs
          </td>
        </tr>
      `;
    }
  }
}

window.loadConnectionLogs = loadConnectionLogs;

function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

// Sandbox Token Helper Functions
function fillSandboxToken() {
  // Sandbox refresh token provided by user
  const sandboxToken = "Atzr|IwEBIJr8eMCYuW0jrg395U93I4I93BSo2D8qAkSuamsJH76LuzdovY0lUdGvUq-WgccsT_ztyLIjeXB2pXIhZiLyrCAPyq9P_5cZO5c1skAJp4iKRtKm-S61Pi4oG44kgNOS_h8gEwCUB8uhGMr7ZteKQOk7KMcpErW23uAWlBcqE6uUYkG5XNDVDUUZ97iz-lu_nrfz0GOaNR9TEL4RN-krYGvQW1MXj-IcMa71JDE6qpyFCXWNLQe_bgFdNBFKUTVIAj6D60i-oWqHnXVsbdnHpUqIL7gVSEuA_Q_gqFfXbOxmGmX4STArMo_9muiJm4On1q0";
  
  const refreshTokenField = document.getElementById('amazon-refresh-token');
  const regionField = document.getElementById('amazon-manual-region');
  
  if (refreshTokenField) {
    refreshTokenField.value = sandboxToken;
  }
  
  if (regionField) {
    regionField.value = 'SANDBOX';
  }
  
  // Expand the manual connection accordion if collapsed
  const manualAccordion = document.getElementById('amazonManual');
  if (manualAccordion && !manualAccordion.classList.contains('show')) {
    const manualButton = document.querySelector('[data-bs-target="#amazonManual"]');
    if (manualButton) {
      manualButton.click();
    }
  }
  
  showAlert('info', 'Sandbox token and region have been filled. Please enter your Client ID and Client Secret to complete the connection.');
}

function pasteSandboxToken() {
  fillSandboxToken();
}

// Make functions available globally
window.fillSandboxToken = fillSandboxToken;
window.pasteSandboxToken = pasteSandboxToken;

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
  const themeIcon = document.getElementById('theme-icon');
  const themeIconNav = document.getElementById('theme-icon-nav');
  const themeTextNav = document.getElementById('theme-text-nav');
  
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    if (themeIcon) {
      themeIcon.classList.remove('bi-moon-fill');
      themeIcon.classList.add('bi-sun-fill');
    }
    if (themeIconNav) {
      themeIconNav.classList.remove('bi-moon-stars');
      themeIconNav.classList.add('bi-sun');
    }
    if (themeTextNav) {
      themeTextNav.textContent = 'Light Mode';
    }
  } else {
    document.body.classList.remove('light-mode');
    if (themeIcon) {
      themeIcon.classList.remove('bi-sun-fill');
      themeIcon.classList.add('bi-moon-fill');
    }
    if (themeIconNav) {
      themeIconNav.classList.remove('bi-sun');
      themeIconNav.classList.add('bi-moon-stars');
    }
    if (themeTextNav) {
      themeTextNav.textContent = 'Dark Mode';
    }
  }
}

function setupSidebarThemeToggle() {
  document.getElementById('theme-toggle-nav')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleTheme();
  });
}

