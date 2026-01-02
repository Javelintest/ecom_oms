/**
 * Customer Detail View Module
 * Comprehensive customer detail page with Summary, Ledger, and Transactions tabs
 */

// State for customer detail view
let customerDetailState = {
  customerId: null,
  customer: null,
  activeTab: "summary",
  ledger: [],
  balance: null,
  analytics: null,
};

/**
 * Main function to render customer detail view
 */
async function viewCustomer(customerId, initialTab = "summary") {
  customerDetailState.customerId = customerId;
  customerDetailState.activeTab = initialTab;

  // Update URL hash for routing
  window.location.hash = `customer/${customerId}/${initialTab}`;

  const container = document.getElementById("dynamic-content");

  // Show loading state
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading customer details...</p>
    </div>
  `;

  try {
    // Fetch customer data
    const response = await axios.get(
      `${API_BASE_URL}/mango/customers/${customerId}`
    );
    customerDetailState.customer = response.data;

    // Render the detail view
    renderCustomerDetailView();
  } catch (error) {
    console.error("Error loading customer:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load customer details. ${
          error.response?.data?.detail || error.message
        }
      </div>
      <button class="btn btn-outline-primary" onclick="loadSection('sales_customers')">
        <i class="bi bi-arrow-left me-2"></i>Back to Customers
      </button>
    `;
  }
}

/**
 * Render the complete customer detail view with tabs
 */
function renderCustomerDetailView() {
  const { customer } = customerDetailState;
  const container = document.getElementById("dynamic-content");

  container.innerHTML = `
    <div class="customer-detail-view fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-outline-secondary rounded-circle p-2" onclick="loadSection('sales_customers')" title="Back to Customers">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div>
            <h2 class="fw-bold text-dark mb-1">${customer.name}</h2>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-secondary">${customer.customer_code}</span>
              ${getCustomerTypeBadge(customer.customer_type)}
              ${getCustomerStatusBadges(customer)}
            </div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary" onclick="editCustomer(${
            customer.id
          })">
            <i class="bi bi-pencil me-2"></i>Edit
          </button>
          <button class="btn btn-primary" onclick="addCustomerPayment(${
            customer.id
          })">
            <i class="bi bi-cash-stack me-2"></i>Record Payment
          </button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <ul class="nav nav-tabs mb-4" id="customerDetailTabs">
        <li class="nav-item">
          <a class="nav-link ${
            customerDetailState.activeTab === "summary" ? "active" : ""
          }" 
             href="#" onclick="switchCustomerTab('summary'); return false;">
            <i class="bi bi-person-badge me-2"></i>Summary
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${
            customerDetailState.activeTab === "ledger" ? "active" : ""
          }" 
             href="#" onclick="switchCustomerTab('ledger'); return false;">
            <i class="bi bi-journal-text me-2"></i>Ledger & Balance
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${
            customerDetailState.activeTab === "transactions" ? "active" : ""
          }" 
             href="#" onclick="switchCustomerTab('transactions'); return false;">
            <i class="bi bi-list-ul me-2"></i>Transactions
          </a>
        </li>
      </ul>

      <!-- Tab Content -->
      <div id="customerDetailTabContent">
        <!-- Content will be loaded here -->
      </div>
    </div>
  `;

  // Load the active tab content
  switchCustomerTab(customerDetailState.activeTab);
}

/**
 * Switch between tabs
 */
function switchCustomerTab(tabName) {
  customerDetailState.activeTab = tabName;

  // Update URL hash for routing
  if (customerDetailState.customerId) {
    window.location.hash = `customer/${customerDetailState.customerId}/${tabName}`;
  }

  // Update tab navigation - manually update all tabs
  document.querySelectorAll("#customerDetailTabs .nav-link").forEach((tab) => {
    tab.classList.remove("active");
    // Check if this tab matches the active one by checking the onclick attribute
    const onclickAttr = tab.getAttribute("onclick");
    if (onclickAttr && onclickAttr.includes(`'${tabName}'`)) {
      tab.classList.add("active");
    }
  });

  // Render tab content
  const contentContainer = document.getElementById("customerDetailTabContent");

  switch (tabName) {
    case "summary":
      renderCustomerSummaryTab(contentContainer);
      break;
    case "ledger":
      renderCustomerLedgerTab(contentContainer);
      break;
    case "transactions":
      renderCustomerTransactionsTab(contentContainer);
      break;
  }
}

/**
 * Render Summary Tab
 */
function renderCustomerSummaryTab(container) {
  const { customer } = customerDetailState;

  container.innerHTML = `
    <div class="row g-4">
      <!-- Left Column -->
      <div class="col-lg-6">
        <!-- Basic Information Card -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>Basic Information</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="text-muted small mb-1">Customer Code</label>
                <div class="fw-bold">${customer.customer_code}</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Display Name</label>
                <div class="fw-bold">${
                  customer.display_name || customer.name
                }</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Email</label>
                <div>${
                  customer.email ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Phone</label>
                <div>${
                  customer.phone ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Mobile</label>
                <div>${
                  customer.mobile ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Website</label>
                <div>${
                  customer.website
                    ? `<a href="${customer.website}" target="_blank">${customer.website}</a>`
                    : '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Settings Card -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-currency-rupee me-2"></i>Financial Settings</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="text-muted small mb-1">Currency</label>
                <div class="fw-bold">${customer.currency}</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Payment Terms</label>
                <div class="fw-bold">${customer.payment_terms}</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Credit Limit</label>
                <div class="fw-bold">₹${formatNumber(
                  customer.credit_limit
                )}</div>
              </div>
              <div class="col-md-6">
                <label class="text-muted small mb-1">Current Balance</label>
                <div class="fw-bold ${
                  customer.current_balance > 0
                    ? "text-danger"
                    : customer.current_balance < 0
                    ? "text-success"
                    : ""
                }">
                  ₹${formatNumber(customer.current_balance)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tax Information Card -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-file-earmark-text me-2"></i>Tax Information</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-12">
                <label class="text-muted small mb-1">GST Number</label>
                <div>${
                  customer.gst_number ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
              <div class="col-md-12">
                <label class="text-muted small mb-1">PAN Number</label>
                <div>${
                  customer.pan_number ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
              <div class="col-md-12">
                <label class="text-muted small mb-1">Tax Registration Number</label>
                <div>${
                  customer.tax_registration_number ||
                  '<span class="text-muted">Not provided</span>'
                }</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="col-lg-6">
        <!-- Addresses Card -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Addresses</h5>
          </div>
          <div class="card-body">
            ${
              customer.addresses && customer.addresses.length > 0
                ? customer.addresses
                    .map(
                      (addr) => `
                <div class="mb-3 pb-3 border-bottom">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-primary">${addr.address_type}</span>
                    ${
                      addr.is_default
                        ? '<span class="badge bg-success">Default</span>'
                        : ""
                    }
                  </div>
                  <div class="text-secondary">
                    ${addr.address_line1}<br>
                    ${addr.address_line2 ? addr.address_line2 + "<br>" : ""}
                    ${addr.city}, ${addr.state} ${addr.postal_code}<br>
                    ${addr.country}
                    ${
                      addr.landmark
                        ? '<br><small class="text-muted">Landmark: ' +
                          addr.landmark +
                          "</small>"
                        : ""
                    }
                  </div>
                  ${
                    addr.contact_person
                      ? `<div class="mt-2"><strong>Contact:</strong> ${
                          addr.contact_person
                        }${addr.phone ? " - " + addr.phone : ""}</div>`
                      : ""
                  }
                </div>
              `
                    )
                    .join("")
                : '<p class="text-muted">No addresses added</p>'
            }
          </div>
        </div>

        <!-- Contacts Card -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-people me-2"></i>Contacts</h5>
          </div>
          <div class="card-body">
            ${
              customer.contacts && customer.contacts.length > 0
                ? customer.contacts
                    .map(
                      (cont) => `
                <div class="mb-3 pb-3 border-bottom">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong>${cont.name}</strong>
                    ${
                      cont.is_primary
                        ? '<span class="badge bg-success">Primary</span>'
                        : ""
                    }
                  </div>
                  ${
                    cont.designation
                      ? `<div class="text-muted small">${cont.designation}${
                          cont.department ? " - " + cont.department : ""
                        }</div>`
                      : ""
                  }
                  <div class="mt-2">
                    ${
                      cont.email
                        ? `<div><i class="bi bi-envelope me-2"></i>${cont.email}</div>`
                        : ""
                    }
                    ${
                      cont.phone
                        ? `<div><i class="bi bi-telephone me-2"></i>${cont.phone}</div>`
                        : ""
                    }
                    ${
                      cont.mobile
                        ? `<div><i class="bi bi-phone me-2"></i>${cont.mobile}</div>`
                        : ""
                    }
                  </div>
                </div>
              `
                    )
                    .join("")
                : '<p class="text-muted">No contacts added</p>'
            }
          </div>
        </div>

        <!-- Notes & Tags Card -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-journal-text me-2"></i>Notes & Tags</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="text-muted small mb-1">Notes</label>
              <div>${
                customer.notes || '<span class="text-muted">No notes</span>'
              }</div>
            </div>
            <div>
              <label class="text-muted small mb-1">Tags</label>
              <div>
                ${
                  customer.tags && customer.tags.length > 0
                    ? customer.tags
                        .map(
                          (tag) =>
                            `<span class="badge bg-secondary me-1">${tag}</span>`
                        )
                        .join("")
                    : '<span class="text-muted">No tags</span>'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Ledger Tab - Balance, Aging, and Account Summary
 */
async function renderCustomerLedgerTab(container) {
  const { customerId } = customerDetailState;

  // Show loading
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading ledger data...</p>
    </div>
  `;

  try {
    // Fetch balance, aging, and analytics data
    const [balanceResponse, analyticsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/mango/customers/${customerId}/balance`),
      axios.get(`${API_BASE_URL}/mango/customers/${customerId}/analytics?months=12`)
    ]);
    
    customerDetailState.balance = balanceResponse.data;
    customerDetailState.analytics = analyticsResponse.data;

    const balance = customerDetailState.balance;
    const analytics = customerDetailState.analytics;
    const availableCredit = balance.available_credit;

    const stats = analytics?.statistics || {};
    const creditUtilization = balance.credit_limit > 0 
      ? Math.round((balance.current_balance / balance.credit_limit) * 100) 
      : 0;

    container.innerHTML = `
      <!-- Enhanced Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="text-muted small mb-1">Current Balance</div>
                  <div class="h4 fw-bold mb-0 ${
                    balance.current_balance > 0 ? "text-danger" : 
                    balance.current_balance < 0 ? "text-success" : ""
                  }">
                    ₹${formatNumber(balance.current_balance)}
                  </div>
                </div>
                <div class="icon-box bg-danger bg-opacity-10 text-danger rounded p-3">
                  <i class="bi bi-wallet2 fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="text-muted small mb-1">Total Sales</div>
                  <div class="h4 fw-bold mb-0 text-success">
                    ₹${formatNumber(stats.total_sales || 0)}
                  </div>
                  <small class="text-muted">Last 12 months</small>
                </div>
                <div class="icon-box bg-success bg-opacity-10 text-success rounded p-3">
                  <i class="bi bi-graph-up-arrow fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="text-muted small mb-1">Avg Payment Days</div>
                  <div class="h4 fw-bold mb-0 text-info">
                    ${stats.avg_payment_days || 0}
                  </div>
                  <small class="text-muted">Days</small>
                </div>
                <div class="icon-box bg-info bg-opacity-10 text-info rounded p-3">
                  <i class="bi bi-calendar-check fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="text-muted small mb-1">Credit Utilization</div>
                  <div class="h4 fw-bold mb-0 ${
                    creditUtilization > 90 ? "text-danger" : 
                    creditUtilization > 70 ? "text-warning" : "text-success"
                  }">
                    ${creditUtilization}%
                  </div>
                  <small class="text-muted">${formatNumber(availableCredit)} available</small>
                </div>
                <div class="icon-box bg-primary bg-opacity-10 text-primary rounded p-3">
                  <i class="bi bi-percent fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Left Column: Charts and Analysis -->
        <div class="col-lg-8">
          <!-- Account Balance & Credit Details -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="bi bi-wallet2 me-2"></i>Account Balance & Credit</h5>
              <span class="badge ${
                balance.current_balance > balance.credit_limit
                  ? "bg-danger"
                  : balance.current_balance > balance.credit_limit * 0.9
                  ? "bg-warning"
                  : "bg-success"
              }">
                ${balance.current_balance > balance.credit_limit
                  ? "Limit Exceeded"
                  : balance.current_balance > balance.credit_limit * 0.9
                  ? "High Usage"
                  : "Good Standing"}
              </span>
            </div>
            <div class="card-body">
              <div class="row text-center g-4 mb-3">
                <div class="col-md-4">
                  <div class="text-muted small mb-2">Credit Limit</div>
                  <div class="h3 fw-bold">₹${formatNumber(balance.credit_limit)}</div>
                </div>
                <div class="col-md-4">
                  <div class="text-muted small mb-2">Available Credit</div>
                  <div class="h3 fw-bold text-primary">₹${formatNumber(availableCredit)}</div>
                </div>
                <div class="col-md-4">
                  <div class="text-muted small mb-2">Outstanding Invoices</div>
                  <div class="h3 fw-bold text-warning">${stats.outstanding_count || 0}</div>
                </div>
              </div>
              
              <!-- Credit Utilization Progress -->
              <div class="mt-3">
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted small">Credit Utilization</span>
                  <span class="text-muted small fw-bold">${creditUtilization}%</span>
                </div>
                <div class="progress" style="height: 20px;">
                  <div class="progress-bar ${
                    creditUtilization > 90 ? "bg-danger" : 
                    creditUtilization > 70 ? "bg-warning" : "bg-success"
                  }" 
                       role="progressbar" 
                       style="width: ${Math.min(creditUtilization, 100)}%">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Aging Analysis with Chart -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light">
              <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i>Aging Analysis</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <canvas id="agingChart-${customerId}" height="200"></canvas>
                </div>
                <div class="col-md-6">
                  <div class="table-responsive">
                    <table class="table table-sm table-bordered mb-0">
                      <thead class="bg-light">
                        <tr>
                          <th>Age Bucket</th>
                          <th class="text-end">Amount</th>
                          <th class="text-end">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span class="badge bg-success me-2">●</span>Current (0-30)</td>
                          <td class="text-end fw-bold">₹${formatNumber(balance.aging_current)}</td>
                          <td class="text-end">${
                            balance.current_balance > 0
                              ? Math.round((balance.aging_current / balance.current_balance) * 100)
                              : 0
                          }%</td>
                        </tr>
                        <tr>
                          <td><span class="badge bg-warning me-2">●</span>31-60 days</td>
                          <td class="text-end fw-bold text-warning">₹${formatNumber(balance.aging_30)}</td>
                          <td class="text-end">${
                            balance.current_balance > 0
                              ? Math.round((balance.aging_30 / balance.current_balance) * 100)
                              : 0
                          }%</td>
                        </tr>
                        <tr>
                          <td><span class="badge bg-orange me-2">●</span>61-90 days</td>
                          <td class="text-end fw-bold">₹${formatNumber(balance.aging_60)}</td>
                          <td class="text-end">${
                            balance.current_balance > 0
                              ? Math.round((balance.aging_60 / balance.current_balance) * 100)
                              : 0
                          }%</td>
                        </tr>
                        <tr>
                          <td><span class="badge bg-danger me-2">●</span>90+ days</td>
                          <td class="text-end fw-bold text-danger">₹${formatNumber(balance.aging_90_plus)}</td>
                          <td class="text-end">${
                            balance.current_balance > 0
                              ? Math.round((balance.aging_90_plus / balance.current_balance) * 100)
                              : 0
                          }%</td>
                        </tr>
                        <tr class="table-secondary">
                          <td><strong>Total Outstanding</strong></td>
                          <td class="text-end"><strong>₹${formatNumber(balance.current_balance)}</strong></td>
                          <td class="text-end"><strong>100%</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Trends Chart -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="bi bi-graph-up me-2"></i>Payment Trends (Last 12 Months)</h5>
              <select class="form-select form-select-sm" style="width: auto;" id="trendPeriod-${customerId}" onchange="updateTrendsChart(${customerId})">
                <option value="6">6 Months</option>
                <option value="12" selected>12 Months</option>
                <option value="24">24 Months</option>
              </select>
            </div>
            <div class="card-body">
              <canvas id="trendsChart-${customerId}" height="100"></canvas>
            </div>
          </div>

          <!-- Transaction Breakdown -->
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-light">
              <h5 class="mb-0"><i class="bi bi-pie-chart me-2"></i>Transaction Breakdown</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <canvas id="transactionChart-${customerId}" height="200"></canvas>
                </div>
                <div class="col-md-6">
                  <div class="table-responsive">
                    <table class="table table-sm mb-0">
                      <thead class="bg-light">
                        <tr>
                          <th>Type</th>
                          <th class="text-end">Count</th>
                          <th class="text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.entries(analytics?.transaction_breakdown || {}).map(([type, data]) => `
                          <tr>
                            <td><span class="badge ${getTransactionTypeBadge(type)}">${type}</span></td>
                            <td class="text-end">${data.count}</td>
                            <td class="text-end fw-bold">₹${formatNumber(data.total_amount)}</td>
                          </tr>
                        `).join('')}
                        ${Object.keys(analytics?.transaction_breakdown || {}).length === 0 ? `
                          <tr>
                            <td colspan="3" class="text-center text-muted py-3">No transactions yet</td>
                          </tr>
                        ` : ''}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Sidebar -->
        <div class="col-lg-4">
          <!-- Quick Actions -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light">
              <h5 class="mb-0"><i class="bi bi-lightning me-2"></i>Quick Actions</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-primary" onclick="addCustomerPayment(${customerId})">
                  <i class="bi bi-cash-stack me-2"></i>Record Payment
                </button>
                <button class="btn btn-outline-primary" onclick="generateStatement(${customerId})">
                  <i class="bi bi-file-earmark-pdf me-2"></i>Generate Statement
                </button>
                <button class="btn btn-outline-secondary" onclick="sendReminder(${customerId})">
                  <i class="bi bi-envelope me-2"></i>Send Reminder
                </button>
              </div>
              
              <hr class="my-3">
              
              <div class="text-muted small mb-2">Account Status</div>
              <div class="mb-0">
                ${
                  balance.current_balance > balance.credit_limit
                    ? '<div class="alert alert-danger mb-0 py-2"><i class="bi bi-exclamation-triangle me-2"></i>Credit limit exceeded!</div>'
                    : balance.current_balance > balance.credit_limit * 0.9
                    ? '<div class="alert alert-warning mb-0 py-2"><i class="bi bi-exclamation-circle me-2"></i>Nearing credit limit</div>'
                    : '<div class="alert alert-success mb-0 py-2"><i class="bi bi-check-circle me-2"></i>Account in good standing</div>'
                }
              </div>
            </div>
          </div>

          <!-- Outstanding Invoices -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <h6 class="mb-0"><i class="bi bi-file-earmark-text me-2"></i>Outstanding Invoices</h6>
              <span class="badge bg-warning">${analytics?.outstanding_invoices?.length || 0}</span>
            </div>
            <div class="card-body p-0" style="max-height: 400px; overflow-y: auto;">
              ${analytics?.outstanding_invoices?.length > 0 ? `
                <div class="list-group list-group-flush">
                  ${analytics.outstanding_invoices.map(inv => `
                    <div class="list-group-item border-0 border-bottom">
                      <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                          <div class="fw-bold">${inv.reference_number || 'N/A'}</div>
                          <small class="text-muted">Due: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</small>
                        </div>
                        <div class="text-end">
                          <div class="fw-bold text-danger">₹${formatNumber(inv.amount)}</div>
                          ${inv.days_overdue > 0 ? `<small class="badge bg-danger">${inv.days_overdue} days overdue</small>` : ''}
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                  <small>No outstanding invoices</small>
                </div>
              `}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-light">
              <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recent Activity</h6>
            </div>
            <div class="card-body p-0" style="max-height: 300px; overflow-y: auto;">
              ${analytics?.recent_activity?.length > 0 ? `
                <div class="list-group list-group-flush">
                  ${analytics.recent_activity.map(act => `
                    <div class="list-group-item border-0 border-bottom">
                      <div class="d-flex align-items-start">
                        <div class="flex-shrink-0">
                          <span class="badge ${getTransactionTypeBadge(act.type)}">${act.type}</span>
                        </div>
                        <div class="flex-grow-1 ms-2">
                          <div class="small fw-bold">${act.reference || 'N/A'}</div>
                          <div class="small text-muted">${act.description || ''}</div>
                          <div class="small text-muted">${act.date ? new Date(act.date).toLocaleDateString() : ''}</div>
                        </div>
                        <div class="text-end">
                          <div class="small fw-bold ${act.is_debit ? 'text-danger' : 'text-success'}">
                            ${act.is_debit ? '-' : '+'}₹${formatNumber(act.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                  <small>No recent activity</small>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render all charts after a short delay to ensure DOM is ready
    setTimeout(() => {
      renderTrendsChart(customerId);
      renderAgingChart(customerId);
      renderTransactionChart(customerId);
    }, 100);
  } catch (error) {
    console.error("Error loading ledger:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load ledger data. ${
          error.response?.data?.detail || error.message
        }
      </div>
    `;
  }
}

/**
 * Render Transactions Tab - Full transaction history
 */
async function renderCustomerTransactionsTab(container) {
  const { customerId } = customerDetailState;

  // Show loading
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading transactions...</p>
    </div>
  `;

  try {
    // Fetch ledger transactions
    const response = await axios.get(
      `${API_BASE_URL}/mango/customers/${customerId}/ledger`
    );
    customerDetailState.ledger = response.data;

    container.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Transaction History</h5>
            <button class="btn btn-sm btn-outline-primary" onclick="exportTransactions(${customerId})">
              <i class="bi bi-download me-2"></i>Export
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="bg-light">
                <tr>
                  <th class="ps-4">Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th class="text-end">Debit</th>
                  <th class="text-end">Credit</th>
                  <th class="text-end pe-4">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${
                  customerDetailState.ledger.length > 0
                    ? customerDetailState.ledger
                        .map(
                          (txn) => `
                    <tr>
                      <td class="ps-4">
                        <div>${new Date(
                          txn.transaction_date
                        ).toLocaleDateString()}</div>
                        <small class="text-muted">${new Date(
                          txn.transaction_date
                        ).toLocaleTimeString()}</small>
                      </td>
                      <td>
                        <span class="badge ${getTransactionTypeBadge(
                          txn.transaction_type
                        )}">${txn.transaction_type}</span>
                      </td>
                      <td>
                        ${
                          txn.reference_number
                            ? `<a href="#" onclick="viewReference('${txn.reference_type}', '${txn.reference_number}'); return false;">${txn.reference_number}</a>`
                            : '<span class="text-muted">-</span>'
                        }
                      </td>
                      <td>
                        <div>${txn.description || "-"}</div>
                        ${
                          txn.notes
                            ? `<small class="text-muted">${txn.notes}</small>`
                            : ""
                        }
                      </td>
                      <td class="text-end ${
                        txn.debit_amount > 0 ? "text-danger fw-bold" : ""
                      }">
                        ${
                          txn.debit_amount > 0
                            ? "₹" + formatNumber(txn.debit_amount)
                            : "-"
                        }
                      </td>
                      <td class="text-end ${
                        txn.credit_amount > 0 ? "text-success fw-bold" : ""
                      }">
                        ${
                          txn.credit_amount > 0
                            ? "₹" + formatNumber(txn.credit_amount)
                            : "-"
                        }
                      </td>
                      <td class="text-end pe-4 fw-bold">${txn.balance}</td>
                    </tr>
                  `
                        )
                        .join("")
                    : `
                    <tr>
                      <td colspan="7" class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                        No transactions yet
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading transactions:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load transactions. ${
          error.response?.data?.detail || error.message
        }
      </div>
    `;
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTransactionTypeBadge(type) {
  const badges = {
    OPENING: "bg-secondary",
    INVOICE: "bg-danger",
    PAYMENT: "bg-success",
    CREDIT_NOTE: "bg-info",
    DEBIT_NOTE: "bg-warning",
    ADJUSTMENT: "bg-dark",
  };
  return badges[type] || "bg-secondary";
}

// Stub functions for actions
function addCustomerPayment(customerId) {
  Swal.fire({
    title: "Record Payment",
    text: "Payment recording feature coming soon!",
    icon: "info",
  });
}

function generateStatement(customerId) {
  Swal.fire({
    title: "Generate Statement",
    text: "Statement generation feature coming soon!",
    icon: "info",
  });
}

function sendReminder(customerId) {
  Swal.fire({
    title: "Send Reminder",
    text: "Reminder feature coming soon!",
    icon: "info",
  });
}

function exportTransactions(customerId) {
  Swal.fire({
    title: "Export Transactions",
    text: "Export feature coming soon!",
    icon: "info",
  });
}

function viewReference(type, number) {
  Swal.fire({
    title: `View ${type}`,
    text: `Reference: ${number}`,
    icon: "info",
  });
}

function exportTrendsChart(customerId) {
  Swal.fire({
    title: "Export Chart",
    text: "Chart export feature coming soon!",
    icon: "info",
  });
}

// ============================================================
// MONTH-ON-MONTH TRENDS CHART
// ============================================================

/**
 * Generate mock trend data for the last 12 months
 */
function generateMockTrendData() {
  const months = [];
  const sales = [];
  const returns = [];
  const payments = [];
  const expenses = [];

  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months.push(monthName);

    // Generate random but realistic data
    sales.push(Math.floor(Math.random() * 50000) + 30000);
    returns.push(Math.floor(Math.random() * 5000) + 1000);
    payments.push(Math.floor(Math.random() * 45000) + 25000);
    expenses.push(Math.floor(Math.random() * 15000) + 5000);
  }

  return { months, sales, returns, payments, expenses };
}

/**
 * Render the Month-on-Month Trends chart
 */
function renderTrendsChart(customerId) {
  const analytics = customerDetailState.analytics;
  if (!analytics || !analytics.monthly_trends) {
    console.error("Analytics data not available");
    return;
  }

  const ctx = document.getElementById(`trendsChart-${customerId}`);
  if (!ctx) {
    console.error("Trends chart canvas not found");
    return;
  }

  // Destroy existing chart instance if it exists
  const chartKey = `customerTrendsChart_${customerId}`;
  if (window[chartKey]) {
    window[chartKey].destroy();
  }

  // Prepare data from analytics
  const months = analytics.monthly_trends.map(t => {
    const date = new Date(t.month + '-01');
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  });
  const sales = analytics.monthly_trends.map(t => t.sales || 0);
  const payments = analytics.monthly_trends.map(t => t.payments || 0);
  const returns = analytics.monthly_trends.map(t => t.returns || 0);
  const balances = analytics.monthly_trends.map(t => t.balance || 0);

  // Create new chart
  window[chartKey] = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Sales",
          data: sales,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Returns",
          data: returns,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Payments",
          data: payments,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Balance",
          data: balances,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false, // We're using custom toggle buttons
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              label += "₹" + formatNumber(context.parsed.y);
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          ticks: {
            callback: function (value) {
              return "₹" + formatNumber(value);
            },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "₹" + formatNumber(value);
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });

}

/**
 * Update trends chart when period changes
 */
async function updateTrendsChart(customerId) {
  const periodSelect = document.getElementById(`trendPeriod-${customerId}`);
  const months = periodSelect ? parseInt(periodSelect.value) : 12;
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/mango/customers/${customerId}/analytics?months=${months}`
    );
    customerDetailState.analytics = response.data;
    renderTrendsChart(customerId);
  } catch (error) {
    console.error("Error updating trends chart:", error);
  }
}

/**
 * Render Aging Analysis Pie Chart
 */
function renderAgingChart(customerId) {
  const balance = customerDetailState.balance;
  if (!balance) return;

  const ctx = document.getElementById(`agingChart-${customerId}`);
  if (!ctx) return;

  const chartKey = `customerAgingChart_${customerId}`;
  if (window[chartKey]) {
    window[chartKey].destroy();
  }

  const agingData = [
    balance.aging_current || 0,
    balance.aging_30 || 0,
    balance.aging_60 || 0,
    balance.aging_90_plus || 0
  ];

  window[chartKey] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Current (0-30)', '31-60 days', '61-90 days', '90+ days'],
      datasets: [{
        data: agingData,
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#f97316',
          '#ef4444'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = agingData.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ₹${formatNumber(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Render Transaction Breakdown Pie Chart
 */
function renderTransactionChart(customerId) {
  const analytics = customerDetailState.analytics;
  if (!analytics || !analytics.transaction_breakdown) return;

  const ctx = document.getElementById(`transactionChart-${customerId}`);
  if (!ctx) return;

  const chartKey = `customerTransactionChart_${customerId}`;
  if (window[chartKey]) {
    window[chartKey].destroy();
  }

  const breakdown = analytics.transaction_breakdown;
  const labels = Object.keys(breakdown);
  const data = labels.map(key => breakdown[key].total_amount);
  const colors = {
    'INVOICE': '#ef4444',
    'PAYMENT': '#10b981',
    'CREDIT_NOTE': '#3b82f6',
    'DEBIT_NOTE': '#f59e0b',
    'ADJUSTMENT': '#6b7280',
    'OPENING': '#8b5cf6'
  };

  window[chartKey] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(l => colors[l] || '#6b7280'),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ₹${formatNumber(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Setup event listeners for chart metric toggles
 */
function setupTrendsChartToggles(customerId) {
  const toggleIds = [
    `toggle-sales-${customerId}`,
    `toggle-returns-${customerId}`,
    `toggle-payments-${customerId}`,
    `toggle-expenses-${customerId}`,
  ];

  toggleIds.forEach((toggleId, index) => {
    const checkbox = document.getElementById(toggleId);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        if (window.customerTrendsChart) {
          const dataset = window.customerTrendsChart.data.datasets[index];
          dataset.hidden = !this.checked;
          window.customerTrendsChart.update();
        }
      });
    }
  });
}
