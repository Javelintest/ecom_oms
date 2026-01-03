/**
 * Customer Management Module - List View
 * Handles customer listing, filtering, search, and actions
 */

// ============================================================
// CUSTOMER LIST VIEW
// ============================================================

function renderSalesModule(container, subPage = "customers") {
  if (subPage === "customers") {
    renderCustomerList(container);
  } else if (subPage === "quotes") {
    // Render quotations module
    if (typeof renderQuotations === "function") {
      renderQuotations(container);
    } else {
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Quotations module is loading...
        </div>
      `;
      // Load the quotations script if not already loaded
      const script = document.createElement('script');
      script.src = '../../static/js/quotations.js?v=1';
      script.onload = () => renderQuotations(container);
      document.head.appendChild(script);
    }
  } else {
    // Other sales pages - show placeholder for now
    const pages = {
      orders: {
        title: "Sales Orders",
        icon: "bi-receipt",
        description: "Process and track sales orders",
      },
      invoices: {
        title: "Invoices",
        icon: "bi-file-earmark-text",
        description: "Generate and manage invoices",
      },
      recurring_invoices: {
        title: "Recurring Invoices",
        icon: "bi-arrow-repeat",
        description: "Set up automatic recurring invoices",
      },
      delivery_challans: {
        title: "Delivery Challans",
        icon: "bi-truck",
        description: "Create delivery challans for shipments",
      },
      payments: {
        title: "Payments Received",
        icon: "bi-cash-coin",
        description: "Record and track customer payments",
      },
      credit_notes: {
        title: "Credit Notes",
        icon: "bi-file-minus",
        description: "Issue credit notes for returns/adjustments",
      },
      eway_bills: {
        title: "e-Way Bills",
        icon: "bi-file-earmark-code",
        description: "Generate GST e-Way bills",
      },
    };

    const pageInfo = pages[subPage] || pages["customers"];

    container.innerHTML = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="fw-bold text-dark mb-1">
                            <i class="bi ${pageInfo.icon} me-2"></i>${
      pageInfo.title
    }
                        </h2>
                        <p class="text-muted mb-0">${pageInfo.description}</p>
                    </div>
                    <button class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>New ${pageInfo.title.replace(
                          /s$/,
                          ""
                        )}
                    </button>
                </div>
                
                <div class="card border-0 shadow-sm">
                    <div class="card-body p-5 text-center">
                        <i class="bi ${
                          pageInfo.icon
                        }" style="font-size: 80px; color: #e2e8f0;"></i>
                        <h3 class="mt-4 text-muted">${
                          pageInfo.title
                        } Module</h3>
                        <p class="text-muted mb-4">This feature is under development</p>
                        <div class="alert alert-info mx-auto" style="max-width: 600px;">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Coming Soon:</strong> Full ${pageInfo.title.toLowerCase()} management with 
                            create, edit, view, and reporting capabilities.
                        </div>
                    </div>
                </div>
            </div>
        `;
  }
}

// State management
let customerListState = {
  currentPage: 1,
  limit: 50,
  search: "",
  typeFilter: "",
  statusFilter: "active",
  creditHoldFilter: "",
  sortBy: "name",
  sortOrder: "asc",
  customers: [],
  totalCount: 0,
};

function renderCustomerList(container) {
  container.innerHTML = `
        <div class="customer-list-view fade-in">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold text-dark mb-1">
                        <i class="bi bi-people me-2"></i>Customers
                    </h2>
                    <p class="text-muted mb-0">Manage your customer database</p>
                </div>
                <button class="btn btn-primary" onclick="openCustomerForm()">
                    <i class="bi bi-plus-circle me-2"></i>New Customer
                </button>
            </div>

            <!-- Filters & Search -->
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        <!-- Search -->
                        <div class="col-md-4">
                            <div class="input-group">
                                <span class="input-group-text bg-white">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" 
                                       class="form-control border-start-0" 
                                       id="customerSearch" 
                                       placeholder="Search by name, email, phone, code..."
                                       value="${customerListState.search}">
                            </div>
                        </div>

                        <!-- Type Filter -->
                        <div class="col-md-2">
                            <select class="form-select" id="customerTypeFilter">
                                <option value="">All Types</option>
                                <option value="RETAIL" ${
                                  customerListState.typeFilter === "RETAIL"
                                    ? "selected"
                                    : ""
                                }>Retail</option>
                                <option value="WHOLESALE" ${
                                  customerListState.typeFilter === "WHOLESALE"
                                    ? "selected"
                                    : ""
                                }>Wholesale</option>
                                <option value="DISTRIBUTOR" ${
                                  customerListState.typeFilter === "DISTRIBUTOR"
                                    ? "selected"
                                    : ""
                                }>Distributor</option>
                            </select>
                        </div>

                        <!-- Status Filter -->
                        <div class="col-md-2">
                            <select class="form-select" id="customerStatusFilter">
                                <option value="">All Status</option>
                                <option value="active" ${
                                  customerListState.statusFilter === "active"
                                    ? "selected"
                                    : ""
                                }>Active</option>
                                <option value="inactive" ${
                                  customerListState.statusFilter === "inactive"
                                    ? "selected"
                                    : ""
                                }>Inactive</option>
                            </select>
                        </div>

                        <!-- Credit Hold Filter -->
                        <div class="col-md-2">
                            <select class="form-select" id="creditHoldFilter">
                                <option value="">All Credit Status</option>
                                <option value="true" ${
                                  customerListState.creditHoldFilter === "true"
                                    ? "selected"
                                    : ""
                                }>Credit Hold</option>
                                <option value="false" ${
                                  customerListState.creditHoldFilter === "false"
                                    ? "selected"
                                    : ""
                                }>No Hold</option>
                            </select>
                        </div>

                        <!-- Clear Filters -->
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100" onclick="clearCustomerFilters()">
                                <i class="bi bi-x-circle me-2"></i>Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Customer Table -->
            <div class="card border-0 shadow-sm">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" id="customerTable">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4" style="width: 120px;">Code</th>
                                    <th>Customer Name</th>
                                    <th>Contact</th>
                                    <th>Type</th>
                                    <th class="text-end">Balance</th>
                                    <th class="text-end">Credit Limit</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4" style="width: 150px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="customerTableBody">
                                <tr>
                                    <td colspan="8" class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="text-muted mt-3">Loading customers...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="card-footer bg-white border-top">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-muted small" id="customerCount">
                            Showing 0 customers
                        </div>
                        <nav id="customerPagination"></nav>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Attach event listeners
  document
    .getElementById("customerSearch")
    .addEventListener("input", debounce(handleCustomerSearch, 500));
  document
    .getElementById("customerTypeFilter")
    .addEventListener("change", handleCustomerFilter);
  document
    .getElementById("customerStatusFilter")
    .addEventListener("change", handleCustomerFilter);
  document
    .getElementById("creditHoldFilter")
    .addEventListener("change", handleCustomerFilter);

  // Load customers
  loadCustomers();
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadCustomers() {
  try {
    const params = new URLSearchParams({
      skip: (customerListState.currentPage - 1) * customerListState.limit,
      limit: customerListState.limit,
    });

    if (customerListState.search)
      params.append("search", customerListState.search);
    if (customerListState.typeFilter)
      params.append("customer_type", customerListState.typeFilter);
    if (customerListState.statusFilter === "active")
      params.append("is_active", "true");
    if (customerListState.statusFilter === "inactive")
      params.append("is_active", "false");
    if (customerListState.creditHoldFilter)
      params.append("is_credit_hold", customerListState.creditHoldFilter);

    const response = await axios.get(`/mango/customers?${params.toString()}`);

    customerListState.customers = response.data;
    customerListState.totalCount = response.data.length; // TODO: Get actual total from API

    renderCustomerTable();
  } catch (error) {
    console.error("Error loading customers:", error);
    showCustomerError("Failed to load customers. Please try again.");
  }
}

function renderCustomerTable() {
  const tbody = document.getElementById("customerTableBody");

  if (customerListState.customers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 48px; color: #cbd5e1;"></i>
                    <p class="text-muted mt-3 mb-0">No customers found</p>
                    <button class="btn btn-sm btn-primary mt-3" onclick="openCustomerForm()">
                        <i class="bi bi-plus-circle me-2"></i>Create First Customer
                    </button>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = customerListState.customers
    .map(
      (customer) => `
        <tr>
            <td class="ps-4">
                <span class="badge bg-light text-dark border">${
                  customer.customer_code
                }</span>
            </td>
            <td>
                <div class="fw-semibold">${customer.name}</div>
                ${
                  customer.email
                    ? `<small class="text-muted">${customer.email}</small>`
                    : ""
                }
            </td>
            <td>
                ${
                  customer.phone
                    ? `<i class="bi bi-telephone me-1"></i>${customer.phone}`
                    : "-"
                }
            </td>
            <td>
                <span class="badge ${getCustomerTypeBadge(
                  customer.customer_type
                )}">
                    ${customer.customer_type}
                </span>
            </td>
            <td class="text-end">
                <span class="${
                  customer.current_balance > 0
                    ? "text-danger fw-semibold"
                    : "text-success"
                }">
                    ₹${formatNumber(customer.current_balance)}
                </span>
            </td>
            <td class="text-end text-muted">
                ₹${formatNumber(customer.credit_limit)}
            </td>
            <td>
                ${getCustomerStatusBadges(customer)}
            </td>
            <td class="text-end pe-4">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" 
                            onclick="viewCustomer(${customer.id})" 
                            title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" 
                            onclick="editCustomer(${customer.id})" 
                            title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" 
                            onclick="viewCustomerLedger(${customer.id})" 
                            title="Ledger">
                        <i class="bi bi-journal-text"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");

  // Update count
  document.getElementById("customerCount").textContent = `Showing ${
    customerListState.customers.length
  } customer${customerListState.customers.length !== 1 ? "s" : ""}`;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function handleCustomerSearch(event) {
  customerListState.search = event.target.value;
  customerListState.currentPage = 1;
  loadCustomers();
}

function handleCustomerFilter() {
  customerListState.typeFilter =
    document.getElementById("customerTypeFilter").value;
  customerListState.statusFilter = document.getElementById(
    "customerStatusFilter"
  ).value;
  customerListState.creditHoldFilter =
    document.getElementById("creditHoldFilter").value;
  customerListState.currentPage = 1;
  loadCustomers();
}

function clearCustomerFilters() {
  customerListState = {
    ...customerListState,
    search: "",
    typeFilter: "",
    statusFilter: "active",
    creditHoldFilter: "",
    currentPage: 1,
  };

  document.getElementById("customerSearch").value = "";
  document.getElementById("customerTypeFilter").value = "";
  document.getElementById("customerStatusFilter").value = "active";
  document.getElementById("creditHoldFilter").value = "";

  loadCustomers();
}

// ============================================================
// CUSTOMER ACTIONS
// ============================================================

function openCustomerForm(customerId = null) {
  // TODO: Implement customer form modal/page
  Swal.fire({
    title: customerId ? "Edit Customer" : "New Customer",
    text: "Customer form will be implemented in Phase 4",
    icon: "info",
  });
}

function viewCustomer(customerId) {
  // TODO: Navigate to customer detail view
  loadSection(`sales_customer_view/${customerId}`);
}

function editCustomer(customerId) {
  openCustomerForm(customerId);
}

function viewCustomerLedger(customerId) {
  // Open customer detail view directly to ledger tab
  viewCustomer(customerId, "ledger");
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCustomerTypeBadge(type) {
  const badges = {
    RETAIL: "bg-primary",
    WHOLESALE: "bg-success",
    DISTRIBUTOR: "bg-info",
  };
  return badges[type] || "bg-secondary";
}

function getCustomerStatusBadges(customer) {
  let badges = [];

  if (customer.is_active) {
    badges.push(
      '<span class="badge bg-success-subtle text-success">Active</span>'
    );
  } else {
    badges.push('<span class="badge bg-secondary">Inactive</span>');
  }

  if (customer.is_credit_hold) {
    badges.push(
      '<span class="badge bg-danger-subtle text-danger ms-1">Hold</span>'
    );
  }

  return badges.join(" ");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showCustomerError(message) {
  const tbody = document.getElementById("customerTableBody");
  if (tbody) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 48px;"></i>
                    <p class="text-danger mt-3 mb-0">${message}</p>
                    <button class="btn btn-sm btn-primary mt-3" onclick="loadCustomers()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Retry
                    </button>
                </td>
            </tr>
        `;
  }
}
