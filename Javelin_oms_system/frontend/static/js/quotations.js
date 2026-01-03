/**
 * Quotations Management Module
 * Advanced quotations system with create, edit, view, and conversion features
 */

// State management
let quotationsState = {
  quotations: [],
  customers: [],
  products: [],
  filters: {
    status: 'all',
    customer_id: null,
    search: '',
    start_date: null,
    end_date: null
  },
  currentQuotation: null
};

/**
 * Render quotations list view
 */
async function renderQuotations(container) {
  container.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">
            <i class="bi bi-file-text me-2"></i>Quotations
          </h2>
          <p class="text-muted mb-0">Create and manage sales quotations</p>
        </div>
        <button class="btn btn-primary" onclick="openQuotationForm()">
          <i class="bi bi-plus-lg me-2"></i>New Quotation
        </button>
      </div>

      <!-- Filters Card -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label small fw-bold">Status</label>
              <select class="form-select form-select-sm" id="filter-status" onchange="applyFilters()">
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="VIEWED">Viewed</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-bold">Customer</label>
              <select class="form-select form-select-sm" id="filter-customer" onchange="applyFilters()">
                <option value="">All Customers</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-bold">Search</label>
              <input type="text" class="form-control form-control-sm" id="filter-search" 
                     placeholder="Quote number, customer..." onkeyup="applyFilters()">
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-bold">Actions</label>
              <div class="d-grid gap-2">
                <button class="btn btn-outline-secondary btn-sm" onclick="resetFilters()">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quotations Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Quotations List</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="exportQuotations()">
              <i class="bi bi-download me-1"></i>Export
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="loadQuotations()">
              <i class="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>
        </div>
        <div class="card-body p-0" style="overflow: visible;">
          <div id="quotations-table-container" style="overflow: visible;">
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-3 text-muted">Loading quotations...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load initial data
  await Promise.all([
    loadCustomers(),
    loadQuotations()
  ]);
}

/**
 * Load quotations from API
 */
async function loadQuotations() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const params = new URLSearchParams();
    if (quotationsState.filters.status !== 'all') {
      params.append('status', quotationsState.filters.status);
    }
    if (quotationsState.filters.customer_id) {
      params.append('customer_id', quotationsState.filters.customer_id);
    }
    if (quotationsState.filters.search) {
      params.append('search', quotationsState.filters.search);
    }

    const response = await axios.get(
      `${apiBase}/mango/quotations?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    quotationsState.quotations = response.data;
    renderQuotationsTable();
  } catch (error) {
    console.error("Error loading quotations:", error);
    document.getElementById("quotations-table-container").innerHTML = `
      <div class="alert alert-danger m-4">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load quotations. ${error.response?.data?.detail || error.message}
      </div>
    `;
  }
}

/**
 * Render quotations table
 */
function renderQuotationsTable() {
  const container = document.getElementById("quotations-table-container");
  if (!container) return;

  if (quotationsState.quotations.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
        <p class="text-muted mb-0">No quotations found</p>
        <button class="btn btn-primary mt-3" onclick="openQuotationForm()">
          <i class="bi bi-plus-lg me-2"></i>Create First Quotation
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <style>
      /* Fix dropdown z-index in table */
      #quotations-table-container .table-responsive {
        overflow: visible !important;
      }
      #quotations-table-container .card-body {
        overflow: visible !important;
      }
      #quotations-table-container .btn-group {
        position: static;
      }
      #quotations-table-container .dropdown-menu {
        z-index: 1050 !important;
        position: absolute !important;
      }
      #quotations-table-container tbody tr {
        position: relative;
      }
      #quotations-table-container tbody td:last-child {
        position: relative;
        z-index: 1;
      }
      #quotations-table-container tbody td:last-child .dropdown-menu {
        z-index: 1051 !important;
      }
    </style>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="bg-light">
          <tr>
            <th class="ps-4">Quote Number</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Valid Until</th>
            <th>Status</th>
            <th class="text-end">Amount</th>
            <th class="text-end pe-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${quotationsState.quotations.map(quote => `
            <tr>
              <td class="ps-4">
                <div class="fw-bold">${quote.quotation_number}</div>
                <small class="text-muted">#${quote.id}</small>
              </td>
              <td>
                <div>${quote.customer?.name || 'N/A'}</div>
                <small class="text-muted">${quote.customer?.email || ''}</small>
              </td>
              <td>
                <div>${new Date(quote.quotation_date).toLocaleDateString()}</div>
                <small class="text-muted">${new Date(quote.quotation_date).toLocaleTimeString()}</small>
              </td>
              <td>
                <div class="${new Date(quote.valid_until) < new Date() ? 'text-danger' : ''}">
                  ${new Date(quote.valid_until).toLocaleDateString()}
                </div>
                ${new Date(quote.valid_until) < new Date() ? '<small class="text-danger">Expired</small>' : ''}
              </td>
              <td>
                <span class="badge ${getStatusBadge(quote.status)}">${quote.status}</span>
              </td>
              <td class="text-end">
                <div class="fw-bold">₹${formatNumber(quote.total_amount)}</div>
                <small class="text-muted">${quote.currency}</small>
              </td>
              <td class="text-end pe-4" style="position: relative;">
                <div class="btn-group btn-group-sm" style="position: static;">
                  <button class="btn btn-outline-primary" onclick="viewQuotation(${quote.id})" title="View">
                    <i class="bi bi-eye"></i>
                  </button>
                  ${quote.status === 'DRAFT' || quote.status === 'SENT' ? `
                    <button class="btn btn-outline-secondary" onclick="editQuotation(${quote.id})" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                  ` : ''}
                  ${quote.status === 'ACCEPTED' ? `
                    <button class="btn btn-outline-success" onclick="convertToOrder(${quote.id})" title="Convert to Order">
                      <i class="bi bi-arrow-right-circle"></i>
                    </button>
                  ` : ''}
                  <div class="btn-group" style="position: static;">
                    <button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" 
                            data-bs-toggle="dropdown" aria-expanded="false">
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" style="z-index: 1050;">
                      ${quote.status === 'DRAFT' ? `
                        <li><a class="dropdown-item" href="#" onclick="sendQuotation(${quote.id})">
                          <i class="bi bi-send me-2"></i>Send
                        </a></li>
                      ` : ''}
                      ${quote.status === 'SENT' || quote.status === 'VIEWED' ? `
                        <li><a class="dropdown-item text-success" href="#" onclick="acceptQuotation(${quote.id})">
                          <i class="bi bi-check-circle me-2"></i>Accept
                        </a></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="rejectQuotation(${quote.id})">
                          <i class="bi bi-x-circle me-2"></i>Reject
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                      ` : ''}
                      <li><a class="dropdown-item" href="#" onclick="duplicateQuotation(${quote.id})">
                        <i class="bi bi-files me-2"></i>Duplicate
                      </a></li>
                      <li><a class="dropdown-item" href="#" onclick="viewQuotationPDF(${quote.id})">
                        <i class="bi bi-eye me-2"></i>View PDF
                      </a></li>
                      <li><a class="dropdown-item" href="#" onclick="downloadQuotationPDF(${quote.id})">
                        <i class="bi bi-file-pdf me-2"></i>Download PDF
                      </a></li>
                      <li><a class="dropdown-item" href="#" onclick="sendQuotationEmail(${quote.id})">
                        <i class="bi bi-envelope me-2"></i>Send via Email
                      </a></li>
                      <li><a class="dropdown-item" href="#" onclick="updateQuotationStatus(${quote.id})">
                        <i class="bi bi-arrow-repeat me-2"></i>Change Status
                      </a></li>
                      ${quote.status === 'DRAFT' ? `
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteQuotation(${quote.id})">
                          <i class="bi bi-trash me-2"></i>Delete
                        </a></li>
                      ` : ''}
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Get status badge class
 */
function getStatusBadge(status) {
  const badges = {
    'DRAFT': 'bg-secondary',
    'SENT': 'bg-info',
    'VIEWED': 'bg-primary',
    'ACCEPTED': 'bg-success',
    'REJECTED': 'bg-danger',
    'EXPIRED': 'bg-warning',
    'CONVERTED': 'bg-dark'
  };
  return badges[status] || 'bg-secondary';
}

/**
 * Load customers for filter dropdown
 */
async function loadCustomers() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/customers`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    quotationsState.customers = response.data;
    
    const select = document.getElementById("filter-customer");
    if (select) {
      select.innerHTML = '<option value="">All Customers</option>' +
        quotationsState.customers.map(c => 
          `<option value="${c.id}">${c.name}</option>`
        ).join('');
    }
  } catch (error) {
    console.error("Error loading customers:", error);
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  quotationsState.filters.status = document.getElementById("filter-status")?.value || 'all';
  quotationsState.filters.customer_id = document.getElementById("filter-customer")?.value || null;
  quotationsState.filters.search = document.getElementById("filter-search")?.value || '';
  
  loadQuotations();
}

/**
 * Reset filters
 */
function resetFilters() {
  quotationsState.filters = {
    status: 'all',
    customer_id: null,
    search: '',
    start_date: null,
    end_date: null
  };
  
  if (document.getElementById("filter-status")) document.getElementById("filter-status").value = 'all';
  if (document.getElementById("filter-customer")) document.getElementById("filter-customer").value = '';
  if (document.getElementById("filter-search")) document.getElementById("filter-search").value = '';
  
  loadQuotations();
}

/**
 * Open quotation form (create new)
 */
function openQuotationForm(quotationId = null) {
  if (typeof renderQuotationForm === 'function') {
    renderQuotationForm(quotationId);
  } else {
    // Navigate to form route
    window.location.hash = `quotation_form${quotationId ? `/${quotationId}` : ''}`;
  }
}

/**
 * View quotation details
 */
async function viewQuotation(quotationId) {
  const container = document.getElementById("dynamic-content");
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading quotation...</p>
    </div>
  `;

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/quotations/${quotationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const quote = response.data;
    
    container.innerHTML = `
      <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button class="btn btn-outline-secondary mb-2" onclick="loadSection('sales_quotes')">
              <i class="bi bi-arrow-left me-2"></i>Back to Quotations
            </button>
            <h2 class="fw-bold text-dark mb-1">${quote.quotation_number}</h2>
            <p class="text-muted mb-0">Quotation Details</p>
          </div>
          <div class="btn-group">
            <span class="badge ${getStatusBadge(quote.status)} fs-6 px-3 py-2">${quote.status}</span>
            ${quote.status === 'DRAFT' || quote.status === 'SENT' ? `
              <button class="btn btn-outline-secondary" onclick="editQuotation(${quote.id})">
                <i class="bi bi-pencil me-2"></i>Edit
              </button>
            ` : ''}
            ${quote.status === 'ACCEPTED' ? `
              <button class="btn btn-success" onclick="convertToOrder(${quote.id})">
                <i class="bi bi-arrow-right-circle me-2"></i>Convert to Order
              </button>
            ` : ''}
          </div>
        </div>

        <div class="row g-4">
          <div class="col-lg-8">
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-header bg-light">
                <h5 class="mb-0">Customer Information</h5>
              </div>
              <div class="card-body">
                <p><strong>Customer:</strong> ${quote.customer?.name || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(quote.quotation_date).toLocaleDateString()}</p>
                <p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="card border-0 shadow-sm">
              <div class="card-header bg-light">
                <h5 class="mb-0">Items</h5>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-bordered mb-0">
                    <thead class="bg-light">
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th>Tax</th>
                        <th class="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${quote.items.map(item => `
                        <tr>
                          <td>${item.description || 'N/A'}</td>
                          <td>${item.quantity}</td>
                          <td>₹${formatNumber(item.unit_price)}</td>
                          <td>${item.discount_percent}%</td>
                          <td>${item.tax_rate}%</td>
                          <td class="text-end fw-bold">₹${formatNumber(item.line_total)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot class="bg-light">
                      <tr>
                        <td colspan="5" class="text-end fw-bold">Subtotal:</td>
                        <td class="text-end fw-bold">₹${formatNumber(quote.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colspan="5" class="text-end">Discount:</td>
                        <td class="text-end">₹${formatNumber(quote.discount_amount)}</td>
                      </tr>
                      <tr>
                        <td colspan="5" class="text-end">Tax:</td>
                        <td class="text-end">₹${formatNumber(quote.tax_amount)}</td>
                      </tr>
                      <tr class="table-secondary">
                        <td colspan="5" class="text-end fw-bold fs-5">Total:</td>
                        <td class="text-end fw-bold fs-5">₹${formatNumber(quote.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-light">
                <h5 class="mb-0">Summary</h5>
              </div>
              <div class="card-body">
                <p><strong>Payment Terms:</strong> ${quote.payment_terms || 'N/A'}</p>
                <p><strong>Delivery Terms:</strong> ${quote.delivery_terms || 'N/A'}</p>
                ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ''}
                ${quote.terms_conditions ? `<div><strong>Terms & Conditions:</strong><br>${quote.terms_conditions}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load quotation. ${error.response?.data?.detail || error.message}
      </div>
    `;
  }
}

/**
 * Edit quotation
 */
function editQuotation(quotationId) {
  window.location.hash = `quotation_form/${quotationId}`;
}

/**
 * Send quotation
 */
async function sendQuotation(quotationId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    await axios.post(
      `${apiBase}/mango/quotations/${quotationId}/send`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    Swal.fire("Success", "Quotation marked as sent", "success");
    loadQuotations();
  } catch (error) {
    Swal.fire("Error", error.response?.data?.detail || "Failed to send quotation", "error");
  }
}

/**
 * Convert quotation to order
 */
async function convertToOrder(quotationId) {
  const result = await Swal.fire({
    title: "Convert to Order?",
    html: `
      <p>This will create a sales order from this quotation.</p>
      <p class="text-muted small">The quotation will be marked as converted and cannot be edited.</p>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Convert",
    confirmButtonColor: "#28a745"
  });

  if (result.isConfirmed) {
    try {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      
      const response = await axios.post(
        `${apiBase}/mango/quotations/${quotationId}/convert-to-order`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await Swal.fire({
        title: "Success!",
        html: `
          <p>Quotation converted to sales order successfully!</p>
          <p class="text-primary fw-bold">Order Number: ${response.data.order_number}</p>
        `,
        icon: "success",
        confirmButtonText: "View Order"
      });
      
      loadQuotations();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.detail || "Failed to convert quotation", "error");
    }
  }
}

/**
 * Delete quotation
 */
async function deleteQuotation(quotationId) {
  const result = await Swal.fire({
    title: "Delete Quotation?",
    text: "This action cannot be undone",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    confirmButtonText: "Yes, Delete"
  });

  if (result.isConfirmed) {
    try {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      
      await axios.delete(
        `${apiBase}/mango/quotations/${quotationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Swal.fire("Success", "Quotation deleted", "success");
      loadQuotations();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.detail || "Failed to delete quotation", "error");
    }
  }
}

/**
 * Duplicate quotation
 */
function duplicateQuotation(quotationId) {
  // Navigate to form with duplicate flag
  window.location.hash = `quotation_form/${quotationId}?duplicate=true`;
}

/**
 * View quotation PDF in new window
 */
async function viewQuotationPDF(quotationId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Fetch HTML content with authentication
    const response = await axios.get(
      `${apiBase}/mango/quotations/${quotationId}/pdf?view=true`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    // Open in new window and write HTML
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      Swal.fire("Error", "Please allow popups to view the quotation PDF", "error");
      return;
    }
    
    printWindow.document.write(response.data);
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.focus();
    }, 500);
  } catch (error) {
    console.error("Error viewing PDF:", error);
    Swal.fire("Error", error.response?.data?.detail || "Failed to open PDF", "error");
  }
}

/**
 * Download quotation PDF
 */
async function downloadQuotationPDF(quotationId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Fetch HTML content with authentication
    const response = await axios.get(
      `${apiBase}/mango/quotations/${quotationId}/pdf/download`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    // Create blob and download
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quotation_${quotationId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    Swal.fire({
      title: "Success!",
      text: "Quotation PDF downloaded successfully",
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    Swal.fire("Error", error.response?.data?.detail || "Failed to download PDF", "error");
  }
}

/**
 * Accept quotation
 */
async function acceptQuotation(quotationId) {
  const result = await Swal.fire({
    title: "Accept Quotation?",
    text: "This will mark the quotation as accepted",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Accept",
    confirmButtonColor: "#28a745"
  });

  if (result.isConfirmed) {
    try {
      await updateQuotationStatusAction(quotationId, 'ACCEPTED');
    } catch (error) {
      // Error handled in updateQuotationStatusAction
    }
  }
}

/**
 * Reject quotation
 */
async function rejectQuotation(quotationId) {
  const { value: reason } = await Swal.fire({
    title: "Reject Quotation",
    input: "textarea",
    inputLabel: "Rejection Reason",
    inputPlaceholder: "Enter the reason for rejection...",
    showCancelButton: true,
    confirmButtonText: "Reject",
    confirmButtonColor: "#dc3545",
    inputValidator: (value) => {
      if (!value) {
        return "Please provide a reason for rejection";
      }
    }
  });

  if (reason) {
    try {
      await updateQuotationStatusAction(quotationId, 'REJECTED', reason);
    } catch (error) {
      // Error handled in updateQuotationStatusAction
    }
  }
}

/**
 * Update quotation status
 */
async function updateQuotationStatus(quotationId) {
  const { value: formValues } = await Swal.fire({
    title: "Update Status",
    html: `
      <select id="status-select" class="swal2-select">
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="VIEWED">Viewed</option>
        <option value="ACCEPTED">Accepted</option>
        <option value="REJECTED">Rejected</option>
        <option value="EXPIRED">Expired</option>
      </select>
      <textarea id="status-notes" class="swal2-textarea mt-3" placeholder="Notes (optional)"></textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Update",
    preConfirm: () => {
      return {
        status: document.getElementById('status-select').value,
        notes: document.getElementById('status-notes').value
      };
    }
  });

  if (formValues) {
    try {
      await updateQuotationStatusAction(quotationId, formValues.status, formValues.notes);
    } catch (error) {
      // Error handled in updateQuotationStatusAction
    }
  }
}

/**
 * Update quotation status action (internal)
 */
async function updateQuotationStatusAction(quotationId, status, notes = null) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.post(
      `${apiBase}/mango/quotations/${quotationId}/update-status`,
      {
        new_status: status,
        notes: notes || null
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const message = response.data?.message || "Status updated successfully";
    Swal.fire({
      title: "Success",
      text: typeof message === 'string' ? message : "Status updated successfully",
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });
    loadQuotations();
  } catch (error) {
    console.error("Error updating quotation status:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to update status";
    Swal.fire({
      title: "Error",
      text: typeof errorMessage === 'string' ? errorMessage : "Failed to update status",
      icon: "error"
    });
    throw error;
  }
}

/**
 * Send quotation via email
 */
async function sendQuotationEmail(quotationId) {
  const { value: formValues } = await Swal.fire({
    title: "Send Quotation via Email",
    html: `
      <input id="email-to" class="swal2-input" placeholder="Email Address" type="email">
      <input id="email-subject" class="swal2-input" placeholder="Subject" value="">
      <textarea id="email-message" class="swal2-textarea" placeholder="Message (optional)"></textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Send Email",
    preConfirm: () => {
      return {
        email: document.getElementById('email-to').value,
        subject: document.getElementById('email-subject').value,
        message: document.getElementById('email-message').value
      };
    }
  });

  if (formValues && formValues.email) {
    try {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      
      const response = await axios.post(
        `${apiBase}/mango/quotations/${quotationId}/send-email`,
        {
          email_to: formValues.email,
          subject: formValues.subject,
          message: formValues.message
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Swal.fire("Success", `Quotation sent to ${response.data.to}`, "success");
      loadQuotations();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.detail || "Failed to send email", "error");
    }
  }
}

/**
 * Export quotations
 */
function exportQuotations() {
  Swal.fire({
    title: "Export Quotations",
    text: "Export feature coming soon!",
    icon: "info"
  });
}

/**
 * Format number helper
 */
function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num || 0);
}

/**
 * Render quotation form (create/edit)
 */
async function renderQuotationForm(quotationId = null) {
  const container = document.getElementById("dynamic-content");
  if (!container) return;

  const isEdit = quotationId !== null;
  let quotation = null;
  let customers = [];
  let products = [];

  // Show loading
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading quotation form...</p>
    </div>
  `;

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    // Load customers and products
    [customers, products] = await Promise.all([
      axios.get(`${apiBase}/mango/customers`, { headers }).then(r => r.data),
      axios.get(`${apiBase}/mango/inventory/products`, { headers }).then(r => r.data)
    ]);

    // Load quotation if editing
    if (isEdit) {
      const response = await axios.get(
        `${apiBase}/mango/quotations/${quotationId}`,
        { headers }
      );
      quotation = response.data;
    }

    // Render form
    container.innerHTML = `
      <div class="fade-in">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button class="btn btn-outline-secondary mb-2" onclick="loadSection('sales_quotes')">
              <i class="bi bi-arrow-left me-2"></i>Back to Quotations
            </button>
            <h2 class="fw-bold text-dark mb-1">
              <i class="bi bi-file-text me-2"></i>${isEdit ? 'Edit' : 'New'} Quotation
            </h2>
            <p class="text-muted mb-0">${isEdit ? quotation.quotation_number : 'Create a new sales quotation'}</p>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-outline-secondary" onclick="saveQuotationDraft()">
              <i class="bi bi-save me-2"></i>Save Draft
            </button>
            <button type="button" class="btn btn-primary" onclick="saveAndSendQuotation()">
              <i class="bi bi-send me-2"></i>${isEdit ? 'Update' : 'Create'} & Send
            </button>
          </div>
        </div>

        <form id="quotation-form">
          <div class="row g-4">
            <!-- Left Column: Details -->
            <div class="col-lg-8">
              <!-- Customer & Dates -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-light">
                  <h5 class="mb-0"><i class="bi bi-person me-2"></i>Customer & Dates</h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Customer <span class="text-danger">*</span></label>
                      <select class="form-select" id="quotation-customer" required>
                        <option value="">Select Customer...</option>
                        ${customers.map(c => `
                          <option value="${c.id}" ${quotation?.customer_id === c.id ? 'selected' : ''}>
                            ${c.name} (${c.customer_code || ''})
                          </option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label fw-bold">Quotation Date <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="quotation-date" 
                             value="${quotation?.quotation_date ? new Date(quotation.quotation_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" 
                             required>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label fw-bold">Valid Until <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="quotation-valid-until" 
                             value="${quotation?.valid_until ? new Date(quotation.valid_until).toISOString().split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}" 
                             required>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Items -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Items</h5>
                  <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-primary" onclick="addQuotationItem()">
                      <i class="bi bi-plus-lg me-1"></i>Add Item
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="showBulkAddModal()" title="Bulk Add Items">
                      <i class="bi bi-list-columns"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="copyAllItems()" title="Copy All Items">
                      <i class="bi bi-clipboard"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="clearAllItems()" title="Clear All Items">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-bordered mb-0" id="quotation-items-table">
                      <thead class="bg-light">
                        <tr>
                          <th style="width: 30%">Product</th>
                          <th style="width: 10%">Qty</th>
                          <th style="width: 15%">Unit Price</th>
                          <th style="width: 10%">Discount %</th>
                          <th style="width: 10%">Tax %</th>
                          <th style="width: 15%">Total</th>
                          <th style="width: 10%">Actions</th>
                        </tr>
                      </thead>
                      <tbody id="quotation-items-tbody">
                        ${quotation?.items?.length > 0 ? quotation.items.map((item, idx) => {
                          quotationItemIndex = Math.max(quotationItemIndex, idx + 1);
                          return `
                          <tr data-item-index="${idx}">
                            <td>
                              <select class="form-select form-select-sm item-product" data-index="${idx}" onchange="updateItemProduct(${idx}, this.value)">
                                <option value="">Select Product...</option>
                                ${products.map(p => `
                                  <option value="${p.id}" ${item.product_id === p.id ? 'selected' : ''} 
                                          data-sku="${p.sku}" data-price="${p.sales_rate || 0}">
                                    ${p.name} (${p.sku})
                                  </option>
                                `).join('')}
                              </select>
                              <input type="text" class="form-control form-control-sm mt-1 item-description" 
                                     placeholder="Description" value="${item.description || ''}" 
                                     data-index="${idx}" oninput="updateItemDescription(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-qty" 
                                     value="${item.quantity}" min="1" 
                                     data-index="${idx}" oninput="updateItemQuantity(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-price" 
                                     value="${item.unit_price}" step="0.01" min="0" 
                                     data-index="${idx}" oninput="updateItemPrice(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-discount" 
                                     value="${item.discount_percent || 0}" step="0.01" min="0" max="100" 
                                     data-index="${idx}" oninput="updateItemDiscount(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-tax" 
                                     value="${item.tax_rate || 0}" step="0.01" min="0" max="100" 
                                     data-index="${idx}" oninput="updateItemTax(${idx}, this.value)">
                            </td>
                            <td>
                              <div class="fw-bold item-total" id="item-total-${idx}">₹${formatNumber(item.line_total)}</div>
                            </td>
                            <td>
                              <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuotationItem(${idx})">
                                <i class="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        `;
                        }).join('') : ''}
                      </tbody>
                      <tfoot class="bg-light">
                        <tr>
                          <td colspan="5" class="text-end fw-bold">Subtotal:</td>
                          <td class="fw-bold" id="quotation-subtotal">₹0</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colspan="5" class="text-end">Discount:</td>
                          <td id="quotation-discount">₹0</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colspan="5" class="text-end">Tax:</td>
                          <td id="quotation-tax">₹0</td>
                          <td></td>
                        </tr>
                        <tr class="table-secondary">
                          <td colspan="5" class="text-end fw-bold">Total:</td>
                          <td class="fw-bold fs-5" id="quotation-total">₹0</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Terms & Notes -->
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-light">
                  <h5 class="mb-0"><i class="bi bi-file-text me-2"></i>Terms & Notes</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label fw-bold">Payment Terms</label>
                    <input type="text" class="form-control" id="quotation-payment-terms" 
                           value="${quotation?.payment_terms || 'NET 30'}" 
                           placeholder="e.g., NET 30, Due on receipt">
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-bold">Delivery Terms</label>
                    <input type="text" class="form-control" id="quotation-delivery-terms" 
                           value="${quotation?.delivery_terms || ''}" 
                           placeholder="e.g., FOB, CIF">
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-bold">Notes</label>
                    <textarea class="form-control" id="quotation-notes" rows="3" 
                              placeholder="Internal notes...">${quotation?.notes || ''}</textarea>
                  </div>
                  <div>
                    <label class="form-label fw-bold">Terms & Conditions</label>
                    <textarea class="form-control" id="quotation-terms" rows="4" 
                              placeholder="Terms and conditions for the quotation...">${quotation?.terms_conditions || ''}</textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Summary -->
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm sticky-top" style="top: 20px;">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0"><i class="bi bi-calculator me-2"></i>Summary</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Currency</label>
                    <select class="form-select form-select-sm" id="quotation-currency">
                      <option value="INR" ${quotation?.currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
                      <option value="USD" ${quotation?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                      <option value="EUR" ${quotation?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    </select>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Subtotal:</span>
                    <span class="fw-bold" id="summary-subtotal">₹0</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Discount:</span>
                    <span id="summary-discount">₹0</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Tax:</span>
                    <span id="summary-tax">₹0</span>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between">
                    <span class="fw-bold fs-5">Total:</span>
                    <span class="fw-bold fs-5 text-primary" id="summary-total">₹0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;

    // Store data globally for form handlers
    window.quotationFormData = {
      quotationId,
      customers,
      products,
      items: quotation?.items || []
    };

    // Initialize with at least one empty row if creating new
    if (!isEdit && (!quotation || !quotation.items || quotation.items.length === 0)) {
      addQuotationItem();
    }

    // Calculate totals after a short delay to ensure DOM is ready
    setTimeout(() => {
      calculateQuotationTotals();
    }, 100);
  } catch (error) {
    console.error("Error loading quotation form:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load quotation form. ${error.response?.data?.detail || error.message}
      </div>
      <button class="btn btn-outline-primary" onclick="loadSection('sales_quotes')">
        <i class="bi bi-arrow-left me-2"></i>Back to Quotations
      </button>
    `;
  }
}

// Item management functions
let quotationItemIndex = 0;

function addQuotationItem() {
  const tbody = document.getElementById("quotation-items-tbody");
  if (!tbody) return;

  const idx = quotationItemIndex++;
  const products = window.quotationFormData?.products || [];

  const row = document.createElement('tr');
  row.setAttribute('data-item-index', idx);
  row.innerHTML = `
    <td>
      <select class="form-select form-select-sm item-product" data-index="${idx}" onchange="updateItemProduct(${idx}, this.value)">
        <option value="">Select Product...</option>
        ${products.map(p => `
          <option value="${p.id}" data-sku="${p.sku}" data-price="${p.sales_rate || 0}">
            ${p.name} (${p.sku})
          </option>
        `).join('')}
      </select>
      <input type="text" class="form-control form-control-sm mt-1 item-description" 
             placeholder="Description" data-index="${idx}" oninput="updateItemDescription(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-qty" value="1" min="1" 
             data-index="${idx}" oninput="updateItemQuantity(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-price" value="0" step="0.01" min="0" 
             data-index="${idx}" oninput="updateItemPrice(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-discount" value="0" step="0.01" min="0" max="100" 
             data-index="${idx}" oninput="updateItemDiscount(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-tax" value="0" step="0.01" min="0" max="100" 
             data-index="${idx}" oninput="updateItemTax(${idx}, this.value)">
    </td>
    <td>
      <div class="fw-bold item-total" id="item-total-${idx}">₹0</div>
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuotationItem(${idx})">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(row);
  calculateQuotationTotals();
}

function removeQuotationItem(index) {
  const row = document.querySelector(`tr[data-item-index="${index}"]`);
  if (row) {
    row.remove();
    calculateQuotationTotals();
  }
}

function updateItemProduct(index, productId) {
  const row = document.querySelector(`tr[data-item-index="${index}"]`);
  if (!row) return;
  
  const select = row.querySelector('.item-product');
  const option = select?.querySelector(`option[value="${productId}"]`);
  if (option) {
    const price = parseFloat(option.getAttribute('data-price')) || 0;
    const priceInput = row.querySelector('.item-price');
    if (priceInput) {
      priceInput.value = price;
      // Trigger calculation
      setTimeout(() => calculateQuotationTotals(), 10);
    }
  }
}

function updateItemDescription(index, value) {
  // Description doesn't affect calculations, but we can store it
  // No need to recalculate
}

function updateItemQuantity(index, value) {
  if (value && parseFloat(value) > 0) {
    calculateQuotationTotals();
  }
}

function updateItemPrice(index, value) {
  if (value && parseFloat(value) >= 0) {
    calculateQuotationTotals();
  }
}

function updateItemDiscount(index, value) {
  const numValue = parseFloat(value || 0);
  if (numValue >= 0 && numValue <= 100) {
    calculateQuotationTotals();
  }
}

function updateItemTax(index, value) {
  const numValue = parseFloat(value || 0);
  if (numValue >= 0 && numValue <= 100) {
    calculateQuotationTotals();
  }
}

function calculateQuotationTotals() {
  const rows = document.querySelectorAll('#quotation-items-tbody tr');
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  rows.forEach(row => {
    const index = row.getAttribute('data-item-index');
    
    // Use class selectors for more reliable selection
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const discountInput = row.querySelector('.item-discount');
    const taxInput = row.querySelector('.item-tax');
    
    const qty = parseFloat(qtyInput?.value || 0);
    const price = parseFloat(priceInput?.value || 0);
    const discountPercent = parseFloat(discountInput?.value || 0);
    const taxPercent = parseFloat(taxInput?.value || 0);

    const lineSubtotal = qty * price;
    const lineDiscount = (lineSubtotal * discountPercent) / 100;
    const lineAfterDiscount = lineSubtotal - lineDiscount;
    const lineTax = (lineAfterDiscount * taxPercent) / 100;
    const lineTotal = lineAfterDiscount + lineTax;

    // Update row total
    const totalCell = document.getElementById(`item-total-${index}`);
    if (totalCell) {
      totalCell.textContent = `₹${formatNumber(lineTotal)}`;
    }

    subtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;
  });

  // Update summary
  const subtotalEl = document.getElementById('quotation-subtotal');
  if (subtotalEl) subtotalEl.textContent = `₹${formatNumber(subtotal)}`;
  const discountEl = document.getElementById('quotation-discount');
  if (discountEl) discountEl.textContent = `₹${formatNumber(totalDiscount)}`;
  const taxEl = document.getElementById('quotation-tax');
  if (taxEl) taxEl.textContent = `₹${formatNumber(totalTax)}`;
  const total = subtotal - totalDiscount + totalTax;
  const totalEl = document.getElementById('quotation-total');
  if (totalEl) totalEl.textContent = `₹${formatNumber(total)}`;

  // Update right sidebar
  const summarySubtotal = document.getElementById('summary-subtotal');
  if (summarySubtotal) summarySubtotal.textContent = `₹${formatNumber(subtotal)}`;
  const summaryDiscount = document.getElementById('summary-discount');
  if (summaryDiscount) summaryDiscount.textContent = `₹${formatNumber(totalDiscount)}`;
  const summaryTax = document.getElementById('summary-tax');
  if (summaryTax) summaryTax.textContent = `₹${formatNumber(totalTax)}`;
  const summaryTotal = document.getElementById('summary-total');
  if (summaryTotal) summaryTotal.textContent = `₹${formatNumber(total)}`;
}

/**
 * Save quotation as draft
 */
async function saveQuotationDraft() {
  // Show loading
  const btn = event?.target?.closest('button');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
  }

  try {
    await saveQuotation('DRAFT');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-save me-2"></i>Save Draft';
    }
  }
}

/**
 * Save and send quotation
 */
async function saveAndSendQuotation() {
  // Validate required fields first
  const customer = document.getElementById('quotation-customer')?.value;
  if (!customer) {
    Swal.fire("Validation Error", "Please select a customer", "error");
    return;
  }

  // Show loading
  const btn = event?.target?.closest('button');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
  }

  try {
    const quotationId = window.quotationFormData?.quotationId;
    const isEdit = quotationId !== null;
    
    // First save the quotation
    await saveQuotation('SENT');
    
    // For existing quotations, call the send endpoint
    if (isEdit) {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      
      try {
        await axios.post(
          `${apiBase}/mango/quotations/${quotationId}/send`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (sendError) {
        // If send fails, quotation is still saved
        console.error("Error marking as sent:", sendError);
      }
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-send me-2"></i>${window.quotationFormData?.quotationId ? 'Update' : 'Create'} & Send`;
    }
  }
}

/**
 * Save quotation (internal function)
 */
async function saveQuotation(status = 'DRAFT') {
  try {
    const form = document.getElementById('quotation-form');
    if (!form) {
      Swal.fire("Error", "Form not found", "error");
      return;
    }

    // Validate required fields
    const customer = document.getElementById('quotation-customer')?.value;
    if (!customer) {
      Swal.fire("Validation Error", "Please select a customer", "error");
      return;
    }

    const quotationDate = document.getElementById('quotation-date')?.value;
    const validUntil = document.getElementById('quotation-valid-until')?.value;
    
    if (!quotationDate || !validUntil) {
      Swal.fire("Validation Error", "Please fill in all required date fields", "error");
      return;
    }

    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    // Collect form data
    const rows = document.querySelectorAll('#quotation-items-tbody tr');
    const items = Array.from(rows).map(row => {
      const productSelect = row.querySelector('.item-product');
      const productId = productSelect?.value ? parseInt(productSelect.value) : null;
      const description = row.querySelector('.item-description')?.value || '';
      const qty = parseFloat(row.querySelector('.item-qty')?.value || 0);
      const price = parseFloat(row.querySelector('.item-price')?.value || 0);
      const discount = parseFloat(row.querySelector('.item-discount')?.value || 0);
      const tax = parseFloat(row.querySelector('.item-tax')?.value || 0);

      return {
        product_id: productId,
        description: description,
        quantity: qty,
        unit_price: price,
        discount_percent: discount,
        tax_rate: tax
      };
    }).filter(item => item.quantity > 0 && item.unit_price > 0);

    if (items.length === 0) {
      Swal.fire("Validation Error", "Please add at least one item with quantity and price", "error");
      return;
    }

    const quotationData = {
      customer_id: parseInt(customer),
      quotation_date: quotationDate,
      valid_until: validUntil,
      status: status,
      payment_terms: document.getElementById('quotation-payment-terms')?.value || '',
      delivery_terms: document.getElementById('quotation-delivery-terms')?.value || '',
      notes: document.getElementById('quotation-notes')?.value || '',
      terms_conditions: document.getElementById('quotation-terms')?.value || '',
      currency: document.getElementById('quotation-currency')?.value || 'INR',
      items: items
    };

    const quotationId = window.quotationFormData?.quotationId;
    let response;

    if (quotationId) {
      // Update existing
      response = await axios.put(
        `${apiBase}/mango/quotations/${quotationId}`,
        quotationData,
        { headers }
      );
    } else {
      // Create new
      response = await axios.post(
        `${apiBase}/mango/quotations`,
        quotationData,
        { headers }
      );
      
      // Store the new quotation ID
      if (response.data && response.data.id) {
        window.quotationFormData.quotationId = response.data.id;
      }
    }

    // Show success message
    const successMessage = status === 'DRAFT' 
      ? `Quotation ${quotationId ? 'updated' : 'saved'} as draft successfully!`
      : `Quotation ${quotationId ? 'updated' : 'created'} and marked as sent!`;
    
    await Swal.fire({
      title: "Success!",
      text: successMessage,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });

    // Navigate back to quotations list
    if (typeof loadSection === 'function') {
      loadSection('sales_quotes');
    } else {
      window.location.hash = 'sales_quotes';
    }
  } catch (error) {
    console.error("Error saving quotation:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to save quotation";
    Swal.fire({
      title: "Error",
      text: errorMessage,
      icon: "error",
      confirmButtonText: "OK"
    });
    throw error; // Re-throw so calling function can handle it
  }
}


