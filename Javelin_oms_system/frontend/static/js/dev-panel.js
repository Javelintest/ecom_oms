/**
 * Developer Panel JavaScript
 * Handles all developer panel UI interactions
 */

const API_BASE = "http://127.0.0.1:8000/api";
let currentCompanyFilter = null;
let currentSection = "dashboard";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadSection("dashboard");
  loadCompanies();
  loadCurrentUser();
});

/**
 * Load current user info
 */
async function loadCurrentUser() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const response = await axios.get(`${API_BASE}/oms/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = response.data;
    document.getElementById("current-user").textContent =
      user.full_name || user.email;

    // Check if user is developer
    if (!user.is_developer) {
      alert("Developer access required!");
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Error loading user:", error);
    window.location.href = "/login.html";
  }
}

/**
 * Load companies for switcher
 */
async function loadCompanies() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${API_BASE}/dev/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const switcher = document.getElementById("company-switcher");
    response.data.companies.forEach((company) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <a class="dropdown-item" href="#" onclick="switchCompany(${company.id})">
          <i class="bi bi-building"></i> ${company.name}
        </a>
      `;
      switcher.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading companies:", error);
  }
}

/**
 * Switch company context
 */
function switchCompany(companyId) {
  currentCompanyFilter = companyId;
  const companyName = companyId ? `Company ${companyId}` : "All Companies";
  document.getElementById("current-company").textContent = companyName;

  // Reload current section
  loadSection(currentSection);
}

/**
 * Load section content
 */
function loadSection(section) {
  currentSection = section;

  // Update active nav
  document.querySelectorAll(".dev-sidebar .nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  event?.target?.classList.add("active");

  const contentArea = document.getElementById("content-area");

  switch (section) {
    case "dashboard":
      loadDashboard(contentArea);
      break;
    case "database":
      loadDatabaseBrowser(contentArea);
      break;
    case "users":
      loadUserManagement(contentArea);
      break;
    case "companies":
      loadCompanyManagement(contentArea);
      break;
    case "sql":
      loadSQLExecutor(contentArea);
      break;
    default:
      contentArea.innerHTML = `<h2>${section}</h2><p>Coming soon...</p>`;
  }
}

/**
 * Dashboard
 */
async function loadDashboard(container) {
  container.innerHTML = `
    <h2 class="mb-4">📊 System Dashboard</h2>
    <div id="stats-loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading statistics...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${API_BASE}/dev/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stats = response.data.stats;

    container.innerHTML = `
      <h2 class="mb-4">📊 System Dashboard</h2>
      
      <div class="row g-4 mb-4">
        <div class="col-md-3">
          <div class="card stat-card bg-primary text-white">
            <div class="card-body d-flex align-items-center">
              <div class="icon bg-white bg-opacity-25">
                <i class="bi bi-people"></i>
              </div>
              <div class="ms-3">
                <h3 class="mb-0">${stats.total_users}</h3>
                <small>Total Users</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card stat-card bg-success text-white">
            <div class="card-body d-flex align-items-center">
              <div class="icon bg-white bg-opacity-25">
                <i class="bi bi-building"></i>
              </div>
              <div class="ms-3">
                <h3 class="mb-0">${stats.total_companies}</h3>
                <small>Companies</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card stat-card bg-info text-white">
            <div class="card-body d-flex align-items-center">
              <div class="icon bg-white bg-opacity-25">
                <i class="bi bi-database"></i>
              </div>
              <div class="ms-3">
                <h3 class="mb-0">${stats.database_size_mb} MB</h3>
                <small>Database Size</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card stat-card bg-warning text-white">
            <div class="card-body d-flex align-items-center">
              <div class="icon bg-white bg-opacity-25">
                <i class="bi bi-check-circle"></i>
              </div>
              <div class="ms-3">
                <h3 class="mb-0">${stats.active_users}</h3>
                <small>Active Users</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header bg-light">
              <h5 class="mb-0">Quick Actions</h5>
            </div>
            <div class="card-body">
              <div class="d-flex gap-3">
                <button class="btn btn-primary" onclick="loadSection('database')">
                  <i class="bi bi-database"></i> Browse Database
                </button>
                <button class="btn btn-success" onclick="loadSection('users')">
                  <i class="bi bi-people"></i> Manage Users
                </button>
                <button class="btn btn-info" onclick="loadSection('companies')">
                  <i class="bi bi-building"></i> Manage Companies
                </button>
                <button class="btn btn-warning" onclick="loadSection('sql')">
                  <i class="bi bi-code-square"></i> Execute SQL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading stats:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load statistics: ${error.message}
      </div>
    `;
  }
}

/**
 * Database Browser
 */
async function loadDatabaseBrowser(container) {
  container.innerHTML = `
    <h2 class="mb-4">🗄️ Database Browser</h2>
    <div id="tables-loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading tables...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${API_BASE}/dev/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const tables = response.data.tables;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>🗄️ Database Tables (${tables.length})</h2>
        <div class="input-group" style="width: 300px;">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" id="table-search" placeholder="Search tables...">
        </div>
      </div>
      
      <div class="card data-table">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Table Name</th>
              <th>Rows</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tables-list">
            ${tables
              .map(
                (table, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><code>${table.name}</code></td>
                <td>${table.rows.toLocaleString()}</td>
                <td>${table.size_display}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="viewTableData('${
                    table.name
                  }')">
                    <i class="bi bi-eye"></i> View
                  </button>
                  <button class="btn btn-sm btn-info" onclick="viewTableSchema('${
                    table.name
                  }')">
                    <i class="bi bi-diagram-3"></i> Schema
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Search functionality
    document.getElementById("table-search").addEventListener("input", (e) => {
      const search = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#tables-list tr");
      rows.forEach((row) => {
        const tableName = row.querySelector("code").textContent.toLowerCase();
        row.style.display = tableName.includes(search) ? "" : "none";
      });
    });
  } catch (error) {
    console.error("Error loading tables:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load tables: ${error.message}
      </div>
    `;
  }
}

/**
 * View table data
 */
async function viewTableData(tableName) {
  const container = document.getElementById("content-area");
  container.innerHTML = `
    <h2 class="mb-4">📋 Table: ${tableName}</h2>
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading data...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    const url = currentCompanyFilter
      ? `${API_BASE}/dev/tables/${tableName}/data?company_id=${currentCompanyFilter}`
      : `${API_BASE}/dev/tables/${tableName}/data`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data, pagination } = response.data;

    if (data.length === 0) {
      container.innerHTML = `
        <h2 class="mb-4">📋 Table: ${tableName}</h2>
        <div class="alert alert-info">No data found in this table.</div>
        <button class="btn btn-secondary" onclick="loadSection('database')">
          <i class="bi bi-arrow-left"></i> Back to Tables
        </button>
      `;
      return;
    }

    const columns = Object.keys(data[0]);

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>📋 Table: <code>${tableName}</code></h2>
        <button class="btn btn-secondary" onclick="loadSection('database')">
          <i class="bi bi-arrow-left"></i> Back
        </button>
      </div>
      
      <div class="card mb-3">
        <div class="card-body">
          <strong>Showing ${pagination.total} rows</strong> | Page ${
      pagination.page
    } of ${pagination.pages}
        </div>
      </div>
      
      <div class="card data-table">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead>
              <tr>
                ${columns.map((col) => `<th>${col}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  ${columns
                    .map(
                      (col) =>
                        `<td>${
                          row[col] !== null
                            ? row[col]
                            : '<span class="text-muted">NULL</span>'
                        }</td>`
                    )
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading table data:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load table data: ${error.message}
      </div>
      <button class="btn btn-secondary" onclick="loadSection('database')">
        <i class="bi bi-arrow-left"></i> Back to Tables
      </button>
    `;
  }
}

/**
 * User Management
 */
async function loadUserManagement(container) {
  container.innerHTML = `
    <h2 class="mb-4">👥 User Management</h2>
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading users...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${API_BASE}/dev/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const users = response.data.users;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>👥 User Management (${users.length})</h2>
      </div>
      
      <div class="card data-table">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Full Name</th>
              <th>Company</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
              <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.full_name || "—"}</td>
                <td>${user.company_name || "—"}</td>
                <td>
                  ${
                    user.is_developer
                      ? '<span class="role-badge bg-danger">Developer</span>'
                      : ""
                  }
                  ${
                    user.is_admin
                      ? '<span class="role-badge bg-warning">Admin</span>'
                      : ""
                  }
                  ${
                    !user.is_admin && !user.is_developer
                      ? '<span class="role-badge bg-secondary">User</span>'
                      : ""
                  }
                </td>
                <td>
                  ${
                    user.is_active
                      ? '<span class="badge bg-success">Active</span>'
                      : '<span class="badge bg-danger">Inactive</span>'
                  }
                </td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="editUser(${
                    user.id
                  })">
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Error loading users:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load users: ${error.message}
      </div>
    `;
  }
}

/**
 * Company Management
 */
async function loadCompanyManagement(container) {
  container.innerHTML = `
    <h2 class="mb-4">🏢 Company Management</h2>
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading companies...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${API_BASE}/dev/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const companies = response.data.companies;

    container.innerHTML = `
      <h2 class="mb-4">🏢 Company Management (${companies.length})</h2>
      
      <div class="card data-table">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Users</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${companies
              .map(
                (company) => `
              <tr>
                <td>${company.id}</td>
                <td><strong>${company.name}</strong></td>
                <td>
                  ${company.contact_email || "—"}<br>
                  <small>${company.contact_phone || ""}</small>
                </td>
                <td>${company.user_count}</td>
                <td>
                  ${
                    company.is_active
                      ? '<span class="badge bg-success">Active</span>'
                      : '<span class="badge bg-danger">Inactive</span>'
                  }
                </td>
                <td>${new Date(company.created_at).toLocaleDateString()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Error loading companies:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load companies: ${error.message}
      </div>
    `;
  }
}

/**
 * SQL Executor (placeholder)
 */
function loadSQLExecutor(container) {
  container.innerHTML = `
    <h2 class="mb-4">🔧 SQL Query Executor</h2>
    <div class="alert alert-info">
      <i class="bi bi-info-circle"></i> SQL Executor coming in Phase 2!
    </div>
  `;
}

// Helper functions
function viewTableSchema(tableName) {
  alert(`Schema view for ${tableName} coming soon!`);
}

function editUser(userId) {
  alert(`User editor for ID ${userId} coming soon!`);
}

// ========== PHASE 2: DATA MANAGEMENT FUNCTIONS ==========

/**
 * Enhanced table view with edit/delete functionality
 */
async function viewTableDataEditable(tableName) {
  const container = document.getElementById("content-area");
  container.innerHTML = `
    <h2 class="mb-4">📋 Table: ${tableName}</h2>
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading data...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    
    // Get primary key
    const pkResponse = await axios.get(`${API_BASE}/dev/tables/${tableName}/primary-key`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const primaryKey = pkResponse.data.primary_keys[0];
    
    // Get table data
    const url = currentCompanyFilter
      ? `${API_BASE}/dev/tables/${tableName}/data?company_id=${currentCompanyFilter}`
      : `${API_BASE}/dev/tables/${tableName}/data`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { data, pagination } = response.data;

    if (data.length === 0) {
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>📋 Table: <code>${tableName}</code></h2>
          <div>
            <button class="btn btn-success me-2" onclick="showAddFieldModal('${tableName}')">
              <i class="bi bi-plus-circle"></i> Add Field
            </button>
            <button class="btn btn-secondary" onclick="loadSection('database')">
              <i class="bi bi-arrow-left"></i> Back
            </button>
          </div>
        </div>
        <div class="alert alert-info">No data found in this table.</div>
      `;
      return;
    }

    const columns = Object.keys(data[0]);

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>📋 Table: <code>${tableName}</code></h2>
        <div>
          <button class="btn btn-success me-2" onclick="showAddFieldModal('${tableName}')">
            <i class="bi bi-plus-circle"></i> Add Field
          </button>
          <button class="btn btn-secondary" onclick="loadSection('database')">
            <i class="bi bi-arrow-left"></i> Back
          </button>
        </div>
      </div>
      
      <div class="card mb-3">
        <div class="card-body">
          <strong>Showing ${pagination.total} rows</strong> | Page ${pagination.page} of ${pagination.pages}
          <span class="text-muted ms-3">Primary Key: <code>${primaryKey}</code></span>
        </div>
      </div>
      
      <div class="card data-table">
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0" id="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col}</th>`).join('')}
                <th width="100">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr data-pk="${row[primaryKey]}">
                  ${columns.map(col => `
                    <td 
                      class="editable-cell" 
                      data-column="${col}"
                      data-value="${row[col] !== null ? row[col] : ''}"
                      onclick="makeEditable(this, '${tableName}', '${col}', '${primaryKey}', '${row[primaryKey]}')"
                    >
                      ${row[col] !== null ? row[col] : '<span class="text-muted">NULL</span>'}
                    </td>
                  `).join('')}
                  <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteRow('${tableName}', '${primaryKey}', '${row[primaryKey]}')">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading table data:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load table data: ${error.message}
      </div>
      <button class="btn btn-secondary" onclick="loadSection('database')">
        <i class="bi bi-arrow-left"></i> Back to Tables
      </button>
    `;
  }
}

/**
 * Make cell editable
 */
let editingCell = null;

function makeEditable(cell, tableName, column, primaryKey, primaryValue) {
  // Don't edit if already editing
  if (editingCell) return;
  
  editingCell = cell;
  const originalValue = cell.dataset.value;
  
  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalValue;
  input.className = 'form-control form-control-sm';
  
  // Replace cell content
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  
  // Save on blur or Enter
  const save = async () => {
    const newValue = input.value;
    
    if (newValue !== originalValue) {
      cell.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      
      try {
        await saveCellEdit(tableName, column, newValue, primaryKey, primaryValue);
        cell.innerHTML = newValue || '<span class="text-muted">NULL</span>';
        cell.dataset.value = newValue;
        
        // Show success feedback
        cell.classList.add('bg-success', 'bg-opacity-10');
        setTimeout(() => cell.classList.remove('bg-success', 'bg-opacity-10'), 1000);
      } catch (error) {
        cell.innerHTML = originalValue || '<span class="text-muted">NULL</span>';
        alert(`Failed to save: ${error.response?.data?.detail || error.message}`);
      }
    } else {
      cell.innerHTML = originalValue || '<span class="text-muted">NULL</span>';
    }
    
    editingCell = null;
  };
  
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      cell.innerHTML = originalValue || '<span class="text-muted">NULL</span>';
      editingCell = null;
    }
  });
}

/**
 * Save cell edit
 */
async function saveCellEdit(tableName, column, value, primaryKey, primaryValue) {
  const token = localStorage.getItem("access_token");
  
  const response = await axios.put(
    `${API_BASE}/dev/tables/${tableName}/rows`,
    {
      primary_key: primaryKey,
      primary_value: primaryValue,
      updates: {
        [column]: value || null
      }
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
}

/**
 * Delete row
 */
async function deleteRow(tableName, primaryKey, primaryValue) {
  if (!confirm(`Are you sure you want to delete this row? This cannot be undone.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem("access_token");
    
    await axios.delete(
      `${API_BASE}/dev/tables/${tableName}/rows?primary_key=${primaryKey}&primary_value=${primaryValue}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    // Remove row from UI
    const row = document.querySelector(`tr[data-pk="${primaryValue}"]`);
    if (row) {
      row.remove();
    }
    
    alert('Row deleted successfully!');
  } catch (error) {
    alert(`Failed to delete row: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Show add field modal
 */
function showAddFieldModal(tableName) {
  const modal = document.createElement('div');
  modal.className = 'modal fade show d-block';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add Custom Field to <code>${tableName}</code></h5>
          <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
        </div>
        <div class="modal-body">
          <form id="add-field-form">
            <div class="mb-3">
              <label class="form-label">Column Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="field-name" required 
                pattern="[a-zA-Z_][a-zA-Z0-9_]*" 
                placeholder="e.g., custom_field_1">
              <small class="text-muted">Only letters, numbers, and underscores. Must start with letter.</small>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Data Type <span class="text-danger">*</span></label>
              <select class="form-select" id="field-type" required onchange="toggleMaxLength(this.value)">
                <option value="string">String (VARCHAR)</option>
                <option value="text">Text (Long Text)</option>
                <option value="int">Integer</option>
                <option value="float">Float/Decimal</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="datetime">DateTime</option>
              </select>
            </div>
            
            <div class="mb-3" id="max-length-group">
              <label class="form-label">Max Length</label>
              <input type="number" class="form-control" id="field-max-length" value="255" min="1" max="65535">
            </div>
            
            <div class="mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="field-nullable" checked>
                <label class="form-check-label" for="field-nullable">
                  Allow NULL values
                </label>
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Default Value (optional)</label>
              <input type="text" class="form-control" id="field-default" placeholder="Leave empty for no default">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="addFieldToTable('${tableName}')">
            <i class="bi bi-plus-circle"></i> Add Field
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * Toggle max length field
 */
function toggleMaxLength(dataType) {
  const maxLengthGroup = document.getElementById('max-length-group');
  if (dataType === 'string') {
    maxLengthGroup.style.display = 'block';
  } else {
    maxLengthGroup.style.display = 'none';
  }
}

/**
 * Add field to table
 */
async function addFieldToTable(tableName) {
  const form = document.getElementById('add-field-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const columnName = document.getElementById('field-name').value;
  const dataType = document.getElementById('field-type').value;
  const maxLength = dataType === 'string' ? parseInt(document.getElementById('field-max-length').value) : null;
  const nullable = document.getElementById('field-nullable').checked;
  const defaultValue = document.getElementById('field-default').value || null;
  
  try {
    const token = localStorage.getItem("access_token");
    
    await axios.post(
      `${API_BASE}/dev/tables/${tableName}/columns`,
      {
        column_name: columnName,
        data_type: dataType,
        max_length: maxLength,
        nullable: nullable,
        default_value: defaultValue
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    // Close modal
    document.querySelector('.modal').remove();
    
    alert(`Field "${columnName}" added successfully!`);
    
    // Reload table data
    viewTableDataEditable(tableName);
  } catch (error) {
    alert(`Failed to add field: ${error.response?.data?.detail || error.message}`);
  }
}

// Update the original viewTableData to use the editable version
const originalViewTableData = viewTableData;
viewTableData = viewTableDataEditable;
