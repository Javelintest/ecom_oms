/**
 * Tax Invoices Management Module
 * Advanced tax invoice system with GST, payment tracking, and conversion from sales orders
 */

// State management
let invoicesState = {
  invoices: [],
  customers: [],
  products: [],
  salesOrders: [],
  filters: {
    status: 'all',
    payment_status: 'all',
    customer_id: null,
    search: '',
    start_date: null,
    end_date: null
  },
  currentInvoice: null
};

/**
 * Render invoices list view
 */
async function renderInvoices(container) {
  container.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">
            <i class="bi bi-file-earmark-text me-2"></i>Tax Invoices
          </h2>
          <p class="text-muted mb-0">Generate and manage tax invoices with GST</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-outline-primary" onclick="loadFromSalesOrder()" title="Create from Sales Order">
            <i class="bi bi-arrow-down-circle me-2"></i>From Order
          </button>
          <button class="btn btn-primary" onclick="openInvoiceForm()">
            <i class="bi bi-plus-lg me-2"></i>New Invoice
          </button>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-2">
              <label class="form-label small fw-bold">Status</label>
              <select class="form-select form-select-sm" id="filter-status" onchange="applyFilters()">
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-bold">Payment</label>
              <select class="form-select form-select-sm" id="filter-payment-status" onchange="applyFilters()">
                <option value="all">All Payments</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-bold">Customer</label>
              <select class="form-select form-select-sm" id="filter-customer" onchange="applyFilters()">
                <option value="">All Customers</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-bold">Search</label>
              <input type="text" class="form-control form-control-sm" id="filter-search" 
                     placeholder="Invoice number, customer..." onkeyup="applyFilters()">
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-bold">Actions</label>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" onclick="resetFilters()">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
                </button>
                <button class="btn btn-outline-primary btn-sm" onclick="exportInvoices()">
                  <i class="bi bi-download me-1"></i>Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoices Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Invoices List</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="loadInvoices()">
              <i class="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>
        </div>
        <div class="card-body p-0" style="overflow: visible;">
          <div id="invoices-table-container" style="overflow: visible;">
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-3 text-muted">Loading invoices...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load initial data
  await Promise.all([
    loadCustomers(),
    loadInvoices()
  ]);
}

/**
 * Load invoices from API
 */
async function loadInvoices() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const params = new URLSearchParams();
    if (invoicesState.filters.status !== 'all') {
      params.append('status', invoicesState.filters.status);
    }
    if (invoicesState.filters.payment_status !== 'all') {
      params.append('payment_status', invoicesState.filters.payment_status);
    }
    if (invoicesState.filters.customer_id) {
      params.append('customer_id', invoicesState.filters.customer_id);
    }
    if (invoicesState.filters.search) {
      params.append('search', invoicesState.filters.search);
    }

    const response = await axios.get(
      `${apiBase}/mango/invoices?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    invoicesState.invoices = response.data;
    renderInvoicesTable();
  } catch (error) {
    console.error("Error loading invoices:", error);
    document.getElementById("invoices-table-container").innerHTML = `
      <div class="alert alert-danger m-4">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load invoices. ${error.response?.data?.detail || error.message}
      </div>
    `;
  }
}

/**
 * Render invoices table
 */
function renderInvoicesTable() {
  const container = document.getElementById("invoices-table-container");
  if (!container) return;

  if (invoicesState.invoices.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
        <p class="text-muted mb-0">No invoices found</p>
        <button class="btn btn-primary mt-3" onclick="openInvoiceForm()">
          <i class="bi bi-plus-lg me-2"></i>Create First Invoice
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <style>
      #invoices-table-container .table-responsive {
        overflow: visible !important;
      }
      #invoices-table-container .card-body {
        overflow: visible !important;
      }
      #invoices-table-container .btn-group {
        position: static;
      }
      #invoices-table-container .dropdown-menu {
        z-index: 1050 !important;
        position: absolute !important;
      }
      #invoices-table-container tbody td:last-child {
        position: relative;
        z-index: 1;
      }
    </style>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="bg-light">
          <tr>
            <th class="ps-4">Invoice Number</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Payment</th>
            <th class="text-end">Amount</th>
            <th class="text-end">Balance</th>
            <th class="text-end pe-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${invoicesState.invoices.map(inv => {
            const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.payment_status !== 'PAID';
            return `
            <tr class="${isOverdue ? 'table-warning' : ''}">
              <td class="ps-4">
                <div class="fw-bold">${inv.invoice_number}</div>
                <small class="text-muted">#${inv.id}</small>
              </td>
              <td>
                <div>${inv.customer?.name || 'N/A'}</div>
                <small class="text-muted">${inv.customer?.email || ''}</small>
              </td>
              <td>
                <div>${new Date(inv.invoice_date).toLocaleDateString()}</div>
                <small class="text-muted">${new Date(inv.invoice_date).toLocaleTimeString()}</small>
              </td>
              <td>
                <div class="${isOverdue ? 'text-danger fw-bold' : ''}">
                  ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}
                </div>
                ${isOverdue ? '<small class="text-danger">Overdue</small>' : ''}
              </td>
              <td>
                <span class="badge ${getInvoiceStatusBadge(inv.status)}">${inv.status}</span>
              </td>
              <td>
                <span class="badge ${getPaymentStatusBadge(inv.payment_status)}">${inv.payment_status}</span>
                ${inv.paid_amount > 0 ? `<br><small class="text-muted">Paid: ₹${formatNumber(inv.paid_amount)}</small>` : ''}
              </td>
              <td class="text-end">
                <div class="fw-bold">₹${formatNumber(inv.total_amount)}</div>
                <small class="text-muted">${inv.currency}</small>
              </td>
              <td class="text-end">
                ${inv.balance_amount > 0 ? `
                  <div class="fw-bold text-danger">₹${formatNumber(inv.balance_amount)}</div>
                ` : `
                  <div class="fw-bold text-success">₹0.00</div>
                `}
              </td>
              <td class="text-end pe-4" style="position: relative;">
                <div class="btn-group btn-group-sm" style="position: static;">
                  <button class="btn btn-outline-primary" onclick="viewInvoice(${inv.id})" title="View">
                    <i class="bi bi-eye"></i>
                  </button>
                  ${inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? `
                    <button class="btn btn-outline-secondary" onclick="editInvoice(${inv.id})" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                  ` : ''}
                  ${inv.payment_status !== 'PAID' ? `
                    <button class="btn btn-outline-success" onclick="recordPayment(${inv.id})" title="Record Payment">
                      <i class="bi bi-cash-coin"></i>
                    </button>
                  ` : ''}
                  <div class="btn-group" style="position: static;">
                    <button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" 
                            data-bs-toggle="dropdown" aria-expanded="false">
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" style="z-index: 1050;">
                      <li><a class="dropdown-item" href="#" onclick="viewInvoicePDF(${inv.id})">
                        <i class="bi bi-eye me-2"></i>View Tax Invoice
                      </a></li>
                      <li><a class="dropdown-item" href="#" onclick="downloadInvoicePDF(${inv.id})">
                        <i class="bi bi-file-pdf me-2"></i>Download PDF
                      </a></li>
                      <li><hr class="dropdown-divider"></li>
                      ${inv.payment_status !== 'PAID' ? `
                        <li><a class="dropdown-item text-success" href="#" onclick="recordPayment(${inv.id})">
                          <i class="bi bi-cash-coin me-2"></i>Record Payment
                        </a></li>
                      ` : ''}
                      ${inv.status === 'DRAFT' ? `
                        <li><a class="dropdown-item" href="#" onclick="sendInvoice(${inv.id})">
                          <i class="bi bi-send me-2"></i>Send Invoice
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteInvoice(${inv.id})">
                          <i class="bi bi-trash me-2"></i>Delete
                        </a></li>
                      ` : ''}
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Get invoice status badge class
 */
function getInvoiceStatusBadge(status) {
  const badges = {
    'DRAFT': 'bg-secondary',
    'SENT': 'bg-info',
    'PAID': 'bg-success',
    'PARTIAL': 'bg-warning',
    'OVERDUE': 'bg-danger',
    'CANCELLED': 'bg-dark'
  };
  return badges[status] || 'bg-secondary';
}

/**
 * Get payment status badge class
 */
function getPaymentStatusBadge(status) {
  const badges = {
    'UNPAID': 'bg-danger',
    'PARTIAL': 'bg-warning',
    'PAID': 'bg-success'
  };
  return badges[status] || 'bg-secondary';
}

/**
 * Format number
 */
function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num || 0);
}

/**
 * Load customers for filters
 */
async function loadCustomers() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${apiBase}/mango/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    invoicesState.customers = response.data || [];
    
    const select = document.getElementById('filter-customer');
    if (select) {
      select.innerHTML = '<option value="">All Customers</option>' +
        invoicesState.customers.map(c => 
          `<option value="${c.id}">${c.name} ${c.customer_code ? `(${c.customer_code})` : ''}</option>`
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
  invoicesState.filters.status = document.getElementById('filter-status')?.value || 'all';
  invoicesState.filters.payment_status = document.getElementById('filter-payment-status')?.value || 'all';
  invoicesState.filters.customer_id = document.getElementById('filter-customer')?.value || null;
  invoicesState.filters.search = document.getElementById('filter-search')?.value || '';
  loadInvoices();
}

/**
 * Reset filters
 */
function resetFilters() {
  invoicesState.filters = {
    status: 'all',
    payment_status: 'all',
    customer_id: null,
    search: '',
    start_date: null,
    end_date: null
  };
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-payment-status').value = 'all';
  document.getElementById('filter-customer').value = '';
  document.getElementById('filter-search').value = '';
  loadInvoices();
}

/**
 * View invoice
 */
async function viewInvoice(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${apiBase}/mango/invoices/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const invoice = response.data;
    
    Swal.fire({
      title: `Tax Invoice ${invoice.invoice_number}`,
      html: `
        <div class="text-start">
          <div class="row mb-3">
            <div class="col-md-6">
              <strong>Customer:</strong> ${invoice.customer?.name || 'N/A'}<br>
              <strong>Email:</strong> ${invoice.customer?.email || '-'}<br>
              <strong>Phone:</strong> ${invoice.customer?.phone || '-'}<br>
              ${invoice.customer_gst_number ? `<strong>GSTIN:</strong> ${invoice.customer_gst_number}<br>` : ''}
            </div>
            <div class="col-md-6">
              <strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}<br>
              <strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}<br>
              <strong>Status:</strong> <span class="badge ${getInvoiceStatusBadge(invoice.status)}">${invoice.status}</span><br>
              <strong>Payment:</strong> <span class="badge ${getPaymentStatusBadge(invoice.payment_status)}">${invoice.payment_status}</span>
            </div>
          </div>
          ${invoice.billing_address ? `<div class="mb-3"><strong>Billing Address:</strong><br>${invoice.billing_address}</div>` : ''}
          ${invoice.shipping_address ? `<div class="mb-3"><strong>Shipping Address:</strong><br>${invoice.shipping_address}</div>` : ''}
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>HSN</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${item.description || 'N/A'}</td>
                    <td>${item.hsn_code || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>₹${formatNumber(item.unit_price)}</td>
                    <td>${item.tax_rate}%</td>
                    <td>₹${formatNumber(item.line_total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="text-end"><strong>Total:</strong></td>
                  <td><strong>₹${formatNumber(invoice.total_amount)}</strong></td>
                </tr>
                ${invoice.paid_amount > 0 ? `
                  <tr>
                    <td colspan="5" class="text-end"><strong>Paid:</strong></td>
                    <td>₹${formatNumber(invoice.paid_amount)}</td>
                  </tr>
                ` : ''}
                ${invoice.balance_amount > 0 ? `
                  <tr>
                    <td colspan="5" class="text-end"><strong>Balance:</strong></td>
                    <td class="text-danger"><strong>₹${formatNumber(invoice.balance_amount)}</strong></td>
                  </tr>
                ` : ''}
              </tfoot>
            </table>
          </div>
          ${invoice.igst_amount > 0 ? `<div class="mb-2"><strong>IGST:</strong> ₹${formatNumber(invoice.igst_amount)}</div>` : ''}
          ${invoice.cgst_amount > 0 ? `<div class="mb-2"><strong>CGST:</strong> ₹${formatNumber(invoice.cgst_amount)} | <strong>SGST:</strong> ₹${formatNumber(invoice.sgst_amount)}</div>` : ''}
        </div>
      `,
      width: '900px',
      showCancelButton: true,
      confirmButtonText: "Edit Invoice",
      cancelButtonText: "Close",
      showDenyButton: true,
      denyButtonText: "View PDF"
    }).then((result) => {
      if (result.isConfirmed) {
        editInvoice(invoiceId);
      } else if (result.isDenied) {
        viewInvoicePDF(invoiceId);
      }
    });
  } catch (error) {
    console.error("Error viewing invoice:", error);
    Swal.fire("Error", "Failed to load invoice details", "error");
  }
}

/**
 * Open invoice form (create new)
 */
async function openInvoiceForm() {
  await renderInvoiceForm(null);
}

/**
 * Edit invoice
 */
async function editInvoice(invoiceId) {
  await renderInvoiceForm(invoiceId);
}

/**
 * Render invoice form (create/edit)
 */
async function renderInvoiceForm(invoiceId = null) {
  const container = document.getElementById("dynamic-content");
  if (!container) {
    // Try to get container from invoices page
    const invoicesContainer = document.querySelector('#invoices-table-container')?.closest('.card')?.parentElement;
    if (invoicesContainer) {
      // Create a modal or replace the invoices list
      await renderInvoiceFormModal(invoiceId);
      return;
    }
    Swal.fire("Error", "Could not find container for invoice form", "error");
    return;
  }

  const isEdit = invoiceId !== null;
  let invoice = null;
  let customers = [];
  let products = [];
  let salesOrders = [];

  // Show loading
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading invoice form...</p>
    </div>
  `;

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    // Load customers, products, and sales orders
    [customers, products, salesOrdersResponse] = await Promise.all([
      axios.get(`${apiBase}/mango/customers`, { headers }).then(r => r.data || []),
      axios.get(`${apiBase}/mango/inventory/products`, { headers }).then(r => r.data || []),
      axios.get(`${apiBase}/mango/sales-orders?limit=100`, { headers }).then(r => r)
    ]);
    
    // Handle sales orders response format
    let salesOrders = [];
    if (Array.isArray(salesOrdersResponse.data)) {
      salesOrders = salesOrdersResponse.data;
    } else if (salesOrdersResponse.data && Array.isArray(salesOrdersResponse.data.data)) {
      salesOrders = salesOrdersResponse.data.data;
    } else if (salesOrdersResponse.data && salesOrdersResponse.data.orders) {
      salesOrders = salesOrdersResponse.data.orders;
    }
    
    // Filter out cancelled orders for dropdown
    salesOrders = salesOrders.filter(so => 
      so.status && 
      so.status.toUpperCase() !== 'CANCELLED' &&
      parseFloat(so.total_amount || 0) > 0
    );
    
    // Sort by date (newest first)
    salesOrders.sort((a, b) => {
      const dateA = new Date(a.order_date || a.created_at || 0);
      const dateB = new Date(b.order_date || b.created_at || 0);
      return dateB - dateA;
    });

    // Load invoice if editing
    if (isEdit) {
      const response = await axios.get(
        `${apiBase}/mango/invoices/${invoiceId}`,
        { headers }
      );
      invoice = response.data;
    }

    // Calculate due date (default: 30 days from invoice date)
    const invoiceDate = invoice?.invoice_date 
      ? new Date(invoice.invoice_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const dueDate = invoice?.due_date
      ? new Date(invoice.due_date).toISOString().split('T')[0]
      : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

    // Render form
    container.innerHTML = `
      <div class="fade-in">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button class="btn btn-outline-secondary mb-2" onclick="loadSection('sales_invoices')">
              <i class="bi bi-arrow-left me-2"></i>Back to Invoices
            </button>
            <h2 class="fw-bold text-dark mb-1">
              <i class="bi bi-file-earmark-text me-2"></i>${isEdit ? 'Edit' : 'New'} Tax Invoice
            </h2>
            <p class="text-muted mb-0">${isEdit ? invoice.invoice_number : 'Create a new tax invoice'}</p>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-outline-secondary" onclick="saveInvoiceDraft()">
              <i class="bi bi-save me-2"></i>Save Draft
            </button>
            <button type="button" class="btn btn-primary" onclick="saveInvoice()">
              <i class="bi bi-check-lg me-2"></i>${isEdit ? 'Update' : 'Create'} Invoice
            </button>
          </div>
        </div>

        <form id="invoice-form">
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
                      <select class="form-select" id="invoice-customer" required onchange="handleCustomerSelectInvoice(this.value)">
                        <option value="">Select Customer...</option>
                        ${customers.map(c => `
                          <option value="${c.id}" ${invoice?.customer_id === c.id ? 'selected' : ''}
                                  data-gst="${c.gst_number || ''}" data-state="${c.state || ''}">
                            ${c.name} ${c.customer_code ? `(${c.customer_code})` : ''}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label fw-bold">Invoice Date <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="invoice-date" 
                             value="${invoiceDate}" required>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label fw-bold">Due Date <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="invoice-due-date" 
                             value="${dueDate}" required>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Create From Sales Order</label>
                      <div class="input-group">
                        <select class="form-select" id="invoice-sales-order" onchange="loadFromSalesOrderInvoice(this.value)">
                          <option value="">None (Manual Entry)</option>
                          ${salesOrders.filter(so => so.status && so.status.toUpperCase() !== 'CANCELLED').map(so => `
                            <option value="${so.id}" ${invoice?.sales_order_id === so.id ? 'selected' : ''}>
                              ${so.order_number || `#${so.id}`} - ${so.customer?.name || 'N/A'} - ₹${formatNumber(so.total_amount || 0)} (${so.status || 'N/A'})
                            </option>
                          `).join('')}
                        </select>
                        <button type="button" class="btn btn-outline-primary" onclick="openSalesOrderSelector()" title="Select Sales Order">
                          <i class="bi bi-arrow-down-circle"></i> From Order
                        </button>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Invoice Type</label>
                      <select class="form-select" id="invoice-type">
                        <option value="TAX_INVOICE" ${invoice?.invoice_type === 'TAX_INVOICE' ? 'selected' : ''}>Tax Invoice</option>
                        <option value="PROFORMA" ${invoice?.invoice_type === 'PROFORMA' ? 'selected' : ''}>Proforma Invoice</option>
                        <option value="RETAIL" ${invoice?.invoice_type === 'RETAIL' ? 'selected' : ''}>Retail Invoice</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Customer GSTIN</label>
                      <input type="text" class="form-control" id="invoice-customer-gst" 
                             value="${invoice?.gst_number || ''}" 
                             placeholder="Customer GST Number">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Place of Supply</label>
                      <input type="text" class="form-control" id="invoice-place-of-supply" 
                             value="${invoice?.place_of_supply || ''}" 
                             placeholder="State for GST calculation">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Items -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Items</h5>
                  <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-primary" onclick="addInvoiceItem()">
                      <i class="bi bi-plus-lg me-1"></i>Add Item
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="showBulkAddInvoiceModal()" title="Bulk Add Items">
                      <i class="bi bi-list-columns"></i>
                    </button>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-bordered mb-0" id="invoice-items-table">
                      <thead class="bg-light">
                        <tr>
                          <th style="width: 25%">Product</th>
                          <th style="width: 8%">HSN</th>
                          <th style="width: 8%">Qty</th>
                          <th style="width: 12%">Unit Price</th>
                          <th style="width: 8%">Disc %</th>
                          <th style="width: 8%">Tax %</th>
                          <th style="width: 15%">Total</th>
                          <th style="width: 16%">Actions</th>
                        </tr>
                      </thead>
                      <tbody id="invoice-items-tbody">
                        ${invoice?.items?.length > 0 ? invoice.items.map((item, idx) => {
                          invoiceItemIndex = Math.max(invoiceItemIndex, idx + 1);
                          return `
                          <tr data-item-index="${idx}">
                            <td>
                              <select class="form-select form-select-sm item-product" data-index="${idx}" onchange="updateInvoiceItemProduct(${idx}, this.value)">
                                <option value="">Select Product...</option>
                                ${products.map(p => `
                                  <option value="${p.id}" ${item.product_id === p.id ? 'selected' : ''} 
                                          data-sku="${p.sku || ''}" data-price="${p.sales_rate || 0}" data-hsn="${p.hsn_code || ''}">
                                    ${p.name} (${p.sku || 'N/A'})
                                  </option>
                                `).join('')}
                              </select>
                              <input type="text" class="form-control form-control-sm mt-1 item-description" 
                                     placeholder="Description" value="${item.description || ''}" 
                                     data-index="${idx}" oninput="updateInvoiceItemDescription(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="text" class="form-control form-control-sm item-hsn" 
                                     value="${item.hsn_code || ''}" 
                                     data-index="${idx}" oninput="updateInvoiceItemHSN(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-qty" 
                                     value="${item.quantity}" min="1" 
                                     data-index="${idx}" oninput="updateInvoiceItemQuantity(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-price" 
                                     value="${item.unit_price}" step="0.01" min="0" 
                                     data-index="${idx}" oninput="updateInvoiceItemPrice(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-discount" 
                                     value="${item.discount_percent || 0}" step="0.01" min="0" max="100" 
                                     data-index="${idx}" oninput="updateInvoiceItemDiscount(${idx}, this.value)">
                            </td>
                            <td>
                              <input type="number" class="form-control form-control-sm item-tax" 
                                     value="${item.tax_rate || 0}" step="0.01" min="0" max="100" 
                                     data-index="${idx}" oninput="updateInvoiceItemTax(${idx}, this.value)">
                            </td>
                            <td>
                              <div class="fw-bold item-total" id="invoice-item-total-${idx}">₹${formatNumber(item.line_total || 0)}</div>
                            </td>
                            <td>
                              <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceItem(${idx})">
                                <i class="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        `;
                        }).join('') : ''}
                      </tbody>
                      <tfoot class="bg-light">
                        <tr>
                          <td colspan="6" class="text-end fw-bold">Subtotal:</td>
                          <td class="fw-bold" id="invoice-subtotal">₹0</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colspan="6" class="text-end">Discount:</td>
                          <td id="invoice-discount">₹0</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colspan="6" class="text-end">Tax (IGST+CGST+SGST):</td>
                          <td id="invoice-tax">₹0</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colspan="6" class="text-end">Shipping:</td>
                          <td>
                            <input type="number" class="form-control form-control-sm" id="invoice-shipping" 
                                   value="${invoice?.shipping_charges || 0}" step="0.01" min="0" 
                                   oninput="calculateInvoiceTotals()">
                          </td>
                          <td></td>
                        </tr>
                        <tr class="table-secondary">
                          <td colspan="6" class="text-end fw-bold">Total:</td>
                          <td class="fw-bold fs-5" id="invoice-total">₹0</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Addresses & Terms -->
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-light">
                  <h5 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Addresses & Terms</h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Shipping Address</label>
                      <textarea class="form-control" id="invoice-shipping-address" rows="3" 
                                placeholder="Shipping address...">${invoice?.shipping_address || ''}</textarea>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Billing Address</label>
                      <textarea class="form-control" id="invoice-billing-address" rows="3" 
                                placeholder="Billing address...">${invoice?.billing_address || ''}</textarea>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Payment Terms</label>
                      <input type="text" class="form-control" id="invoice-payment-terms" 
                             value="${invoice?.payment_terms || 'NET 30'}" 
                             placeholder="e.g., NET 30, Due on receipt">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Delivery Terms</label>
                      <input type="text" class="form-control" id="invoice-delivery-terms" 
                             value="${invoice?.delivery_terms || ''}" 
                             placeholder="e.g., FOB, CIF">
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-bold">Notes</label>
                      <textarea class="form-control" id="invoice-notes" rows="2" 
                                placeholder="Internal notes...">${invoice?.notes || ''}</textarea>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-bold">Terms & Conditions</label>
                      <textarea class="form-control" id="invoice-terms" rows="3" 
                                placeholder="Terms and conditions...">${invoice?.terms_conditions || ''}</textarea>
                    </div>
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
                    <select class="form-select form-select-sm" id="invoice-currency">
                      <option value="INR" ${invoice?.currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
                      <option value="USD" ${invoice?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                      <option value="EUR" ${invoice?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
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
                  <div class="d-flex justify-content-between mb-2">
                    <span>Shipping:</span>
                    <span id="summary-shipping">₹0</span>
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
    window.invoiceFormData = {
      invoiceId,
      customers,
      products,
      salesOrders: salesOrders, // Store filtered sales orders
      items: invoice?.items || []
    };

    // Initialize with at least one empty row if creating new
    if (!isEdit && (!invoice || !invoice.items || invoice.items.length === 0)) {
      addInvoiceItem();
    }

    // Calculate totals after a short delay to ensure DOM is ready
    setTimeout(() => {
      calculateInvoiceTotals();
    }, 100);
  } catch (error) {
    console.error("Error loading invoice form:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load invoice form. ${error.response?.data?.detail || error.message}
      </div>
      <button class="btn btn-outline-primary" onclick="loadSection('sales_invoices')">
        <i class="bi bi-arrow-left me-2"></i>Back to Invoices
      </button>
    `;
  }
}

/**
 * Render invoice form in modal (fallback if container not found)
 */
async function renderInvoiceFormModal(invoiceId = null) {
  // This is a fallback - for now just redirect to the form route
  if (typeof loadSection === 'function') {
    // We'll handle this differently - replace the invoices list with the form
    const container = document.querySelector('#invoices-table-container')?.parentElement?.parentElement;
    if (container) {
      await renderInvoiceForm(invoiceId);
    } else {
      Swal.fire("Info", "Please use the 'From Order' button or navigate to create invoice", "info");
    }
  }
}

/**
 * Record payment
 */
async function recordPayment(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Get invoice details first
    const invoiceResponse = await axios.get(
      `${apiBase}/mango/invoices/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const invoice = invoiceResponse.data;
    const maxPayment = invoice.balance_amount;
    
    const { value: formValues } = await Swal.fire({
      title: "Record Payment",
      html: `
        <div class="text-start">
          <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
          <p><strong>Total Amount:</strong> ₹${formatNumber(invoice.total_amount)}</p>
          <p><strong>Balance:</strong> ₹${formatNumber(invoice.balance_amount)}</p>
        </div>
        <input id="paid-amount" class="swal2-input" type="number" 
               placeholder="Payment Amount" value="${maxPayment}" 
               min="0.01" max="${maxPayment}" step="0.01" required>
        <input id="payment-method" class="swal2-input" type="text" 
               placeholder="Payment Method (Cash, Bank Transfer, etc.)">
        <input id="reference-number" class="swal2-input" type="text" 
               placeholder="Reference Number (optional)">
        <textarea id="payment-notes" class="swal2-textarea" 
                  placeholder="Payment Notes (optional)"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Record Payment",
      preConfirm: () => {
        const paidAmount = parseFloat(document.getElementById('paid-amount').value);
        if (!paidAmount || paidAmount <= 0) {
          Swal.showValidationMessage("Please enter a valid payment amount");
          return false;
        }
        if (paidAmount > maxPayment) {
          Swal.showValidationMessage(`Payment cannot exceed balance of ₹${formatNumber(maxPayment)}`);
          return false;
        }
        return {
          paid_amount: paidAmount,
          payment_method: document.getElementById('payment-method').value || null,
          reference_number: document.getElementById('reference-number').value || null,
          notes: document.getElementById('payment-notes').value || null
        };
      }
    });

    if (formValues) {
      await axios.post(
        `${apiBase}/mango/invoices/${invoiceId}/mark-paid`,
        formValues,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", "Payment recorded successfully", "success");
      loadInvoices();
    }
  } catch (error) {
    console.error("Error recording payment:", error);
    Swal.fire("Error", error.response?.data?.detail || "Failed to record payment", "error");
  }
}

/**
 * View invoice PDF
 */
async function viewInvoicePDF(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/invoices/${invoiceId}/pdf?view=true`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      Swal.fire("Error", "Please allow popups to view the invoice", "error");
      return;
    }
    
    printWindow.document.write(response.data);
    printWindow.document.close();
  } catch (error) {
    console.error("Error viewing PDF:", error);
    Swal.fire("Error", "Failed to open invoice PDF", "error");
  }
}

/**
 * Download invoice PDF
 */
async function downloadInvoicePDF(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/invoices/${invoiceId}/pdf`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TaxInvoice_${invoiceId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    Swal.fire("Success", "Invoice downloaded successfully", "success");
  } catch (error) {
    console.error("Error downloading PDF:", error);
    Swal.fire("Error", "Failed to download invoice", "error");
  }
}

/**
 * Record payment for invoice
 */
async function recordPayment(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Get invoice details first
    const invoiceResponse = await axios.get(
      `${apiBase}/mango/invoices/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const invoice = invoiceResponse.data;
    const maxPayment = invoice.balance_amount || invoice.total_amount;
    
    const { value: formValues } = await Swal.fire({
      title: "Record Payment",
      html: `
        <div class="text-start mb-3">
          <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
          <p><strong>Total Amount:</strong> ₹${formatNumber(invoice.total_amount)}</p>
          <p><strong>Already Paid:</strong> ₹${formatNumber(invoice.paid_amount || 0)}</p>
          <p><strong>Balance:</strong> ₹${formatNumber(maxPayment)}</p>
        </div>
        <input id="paid-amount" class="swal2-input" type="number" 
               placeholder="Payment Amount" step="0.01" min="0.01" max="${maxPayment}" 
               value="${maxPayment}" required>
        <input id="payment-method" class="swal2-input" type="text" 
               placeholder="Payment Method (Cash, Bank Transfer, etc.)">
        <input id="reference-number" class="swal2-input" type="text" 
               placeholder="Reference Number (optional)">
        <textarea id="payment-notes" class="swal2-textarea" 
                  placeholder="Payment Notes (optional)"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Record Payment",
      preConfirm: () => {
        const paidAmount = parseFloat(document.getElementById('paid-amount').value);
        if (!paidAmount || paidAmount <= 0) {
          Swal.showValidationMessage("Please enter a valid payment amount");
          return false;
        }
        if (paidAmount > maxPayment) {
          Swal.showValidationMessage(`Payment cannot exceed balance of ₹${formatNumber(maxPayment)}`);
          return false;
        }
        return {
          paid_amount: paidAmount,
          payment_method: document.getElementById('payment-method').value || null,
          reference_number: document.getElementById('reference-number').value || null,
          notes: document.getElementById('payment-notes').value || null
        };
      }
    });

    if (formValues) {
      const response = await axios.post(
        `${apiBase}/mango/invoices/${invoiceId}/mark-paid`,
        formValues,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", response.data.message || "Payment recorded successfully", "success");
      loadInvoices();
    }
  } catch (error) {
    console.error("Error recording payment:", error);
    const errorMsg = error.response?.data?.detail || error.message || "Failed to record payment";
    Swal.fire("Error", String(errorMsg), "error");
  }
}

/**
 * Send invoice
 */
async function sendInvoice(invoiceId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Update invoice status to SENT using PUT
    await axios.put(
      `${apiBase}/mango/invoices/${invoiceId}`,
      { status: 'SENT' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    Swal.fire("Success", "Invoice sent successfully", "success");
    loadInvoices();
  } catch (error) {
    console.error("Error sending invoice:", error);
    const errorMsg = error.response?.data?.detail || error.message || "Failed to send invoice";
    Swal.fire("Error", String(errorMsg), "error");
  }
}

/**
 * Delete invoice
 */
async function deleteInvoice(invoiceId) {
  const result = await Swal.fire({
    title: "Delete Invoice?",
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
        `${apiBase}/mango/invoices/${invoiceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", "Invoice deleted successfully", "success");
      loadInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      Swal.fire("Error", error.response?.data?.detail || "Failed to delete invoice", "error");
    }
  }
}

/**
 * Load from sales order
 */
async function loadFromSalesOrder() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Show loading
    Swal.fire({
      title: "Loading...",
      text: "Fetching sales orders",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Get all sales orders (no status filter)
    let ordersResponse;
    try {
      ordersResponse = await axios.get(
        `${apiBase}/mango/sales-orders?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Error fetching sales orders:", err);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.detail || err.message || "Failed to load sales orders",
        confirmButtonText: "OK"
      });
      return;
    }

    Swal.close();
    
    // Handle response - could be array directly or wrapped in data
    let orders = [];
    if (Array.isArray(ordersResponse.data)) {
      orders = ordersResponse.data;
    } else if (ordersResponse.data && Array.isArray(ordersResponse.data.data)) {
      orders = ordersResponse.data.data;
    } else if (ordersResponse.data && ordersResponse.data.orders) {
      orders = ordersResponse.data.orders;
    }
    
    console.log("Fetched sales orders:", orders.length, orders);
    
    // Filter out only cancelled orders - allow all other statuses
    orders = orders.filter(o => {
      // Must have an ID
      if (!o || !o.id) return false;
      
      // Must have a status
      if (!o.status) return false;
      
      // Exclude only cancelled orders
      if (o.status.toUpperCase() === 'CANCELLED') return false;
      
      // Must have a total amount > 0
      const total = parseFloat(o.total_amount || 0);
      if (total <= 0) return false;
      
      return true;
    });
    
    console.log("Filtered sales orders:", orders.length, orders);
    
    if (orders.length === 0) {
      // Check if there were any orders at all
      const allOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : 
                       (ordersResponse.data?.data || ordersResponse.data?.orders || []);
      
      if (allOrders.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Sales Orders Found",
          text: "No sales orders found in the system. Please create a sales order first.",
          confirmButtonText: "OK"
        });
      } else {
        Swal.fire({
          icon: "warning",
          title: "No Valid Sales Orders",
          html: `Found ${allOrders.length} sales order(s), but none are available for invoicing.<br><br>
                 <small>Orders must have a valid status (not CANCELLED) and total amount > 0.</small>`,
          confirmButtonText: "OK"
        });
      }
      return;
    }

    // Sort by date (newest first)
    orders.sort((a, b) => {
      const dateA = new Date(a.order_date || a.created_at || 0);
      const dateB = new Date(b.order_date || b.created_at || 0);
      return dateB - dateA;
    });

    const { value: orderId } = await Swal.fire({
      title: "Select Sales Order",
      html: `<p class="text-muted mb-3">Select a sales order to create an invoice from:</p>`,
      input: "select",
      inputOptions: Object.fromEntries(
        orders.map(o => [
          String(o.id), 
          `${o.order_number || `#${o.id}`} - ${o.customer?.name || 'N/A'} - ₹${formatNumber(o.total_amount || 0)} (${o.status || 'N/A'})`
        ])
      ),
      showCancelButton: true,
      confirmButtonText: "Create Invoice",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "Please select a sales order";
        }
      }
    });

    if (orderId) {
      // Show loading
      Swal.fire({
        title: "Creating Invoice...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        // Create invoice from sales order
        const response = await axios.post(
          `${apiBase}/mango/invoices/from-sales-order/${orderId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        Swal.fire({
          title: "Success!",
          text: `Tax Invoice ${response.data.invoice_number || response.data.invoice?.invoice_number || 'created'} created successfully!`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });

        // Reload invoices list
        if (typeof loadInvoices === 'function') {
          loadInvoices();
        } else {
          // If we're on the invoices page, reload it
          if (typeof loadSection === 'function') {
            loadSection('sales_invoices');
          }
        }
      } catch (createError) {
        console.error("Error creating invoice from sales order:", createError);
        const errorMsg = createError.response?.data?.detail || createError.message || "Failed to create invoice";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: String(errorMsg),
          confirmButtonText: "OK"
        });
      }
    }
  } catch (error) {
    console.error("Error loading sales orders:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.response?.data?.detail || error.message || "Failed to load sales orders",
      confirmButtonText: "OK"
    });
  }
}

/**
 * Export invoices
 */
function exportInvoices() {
  try {
    const invoices = invoicesState.invoices;
    if (invoices.length === 0) {
      Swal.fire("Info", "No invoices to export", "info");
      return;
    }

    // Create CSV content
    const headers = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Status', 'Payment Status', 'Total Amount', 'Balance'];
    const rows = invoices.map(inv => [
      inv.invoice_number || '',
      inv.customer?.name || '',
      new Date(inv.invoice_date).toLocaleDateString(),
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
      inv.status || '',
      inv.payment_status || '',
      inv.total_amount || 0,
      inv.balance_amount || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire("Success", "Invoices exported successfully!", "success");
  } catch (error) {
    console.error("Error exporting invoices:", error);
    Swal.fire("Error", "Failed to export invoices", "error");
  }
}

// ========== Invoice Form Functions ==========

// Item management
let invoiceItemIndex = 0;

function addInvoiceItem() {
  const tbody = document.getElementById("invoice-items-tbody");
  if (!tbody) return;

  const idx = invoiceItemIndex++;
  const products = window.invoiceFormData?.products || [];

  const row = document.createElement('tr');
  row.setAttribute('data-item-index', idx);
  row.innerHTML = `
    <td>
      <select class="form-select form-select-sm item-product" data-index="${idx}" onchange="updateInvoiceItemProduct(${idx}, this.value)">
        <option value="">Select Product...</option>
        ${products.map(p => `
          <option value="${p.id}" data-sku="${p.sku || ''}" data-price="${p.sales_rate || 0}" data-hsn="${p.hsn_code || ''}">
            ${p.name} (${p.sku || 'N/A'})
          </option>
        `).join('')}
      </select>
      <input type="text" class="form-control form-control-sm mt-1 item-description" 
             placeholder="Description" data-index="${idx}" oninput="updateInvoiceItemDescription(${idx}, this.value)">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm item-hsn" 
             placeholder="HSN Code" data-index="${idx}" oninput="updateInvoiceItemHSN(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-qty" value="1" min="1" 
             data-index="${idx}" oninput="updateInvoiceItemQuantity(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-price" value="0" step="0.01" min="0" 
             data-index="${idx}" oninput="updateInvoiceItemPrice(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-discount" value="0" step="0.01" min="0" max="100" 
             data-index="${idx}" oninput="updateInvoiceItemDiscount(${idx}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-tax" value="0" step="0.01" min="0" max="100" 
             data-index="${idx}" oninput="updateInvoiceItemTax(${idx}, this.value)">
    </td>
    <td>
      <div class="fw-bold item-total" id="invoice-item-total-${idx}">₹0</div>
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceItem(${idx})">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
}

function removeInvoiceItem(index) {
  const row = document.querySelector(`#invoice-items-tbody tr[data-item-index="${index}"]`);
  if (row) {
    row.remove();
    calculateInvoiceTotals();
  }
}

function updateInvoiceItemProduct(index, productId) {
  const row = document.querySelector(`#invoice-items-tbody tr[data-item-index="${index}"]`);
  if (!row) return;

  const select = row.querySelector('.item-product');
  const option = select.options[select.selectedIndex];
  const price = parseFloat(option.dataset.price || 0);
  const sku = option.dataset.sku || '';
  const hsn = option.dataset.hsn || '';

  row.querySelector('.item-price').value = price;
  row.querySelector('.item-hsn').value = hsn;
  if (!row.querySelector('.item-description').value) {
    row.querySelector('.item-description').value = option.text.trim();
  }

  calculateInvoiceItemTotal(index);
  calculateInvoiceTotals();
}

function updateInvoiceItemDescription(index, value) {
  // Just update the value, no calculation needed
}

function updateInvoiceItemHSN(index, value) {
  // Just update the value, no calculation needed
}

function updateInvoiceItemQuantity(index, value) {
  const qty = parseFloat(value) || 0;
  if (qty <= 0) {
    document.querySelector(`#invoice-items-tbody tr[data-item-index="${index}"] .item-qty`).value = 1;
    calculateInvoiceItemTotal(index);
    calculateInvoiceTotals();
    return;
  }
  calculateInvoiceItemTotal(index);
  calculateInvoiceTotals();
}

function updateInvoiceItemPrice(index, value) {
  calculateInvoiceItemTotal(index);
  calculateInvoiceTotals();
}

function updateInvoiceItemDiscount(index, value) {
  const discount = parseFloat(value) || 0;
  if (discount > 100) {
    document.querySelector(`#invoice-items-tbody tr[data-item-index="${index}"] .item-discount`).value = 100;
    calculateInvoiceItemTotal(index);
    calculateInvoiceTotals();
    return;
  }
  calculateInvoiceItemTotal(index);
  calculateInvoiceTotals();
}

function updateInvoiceItemTax(index, value) {
  calculateInvoiceItemTotal(index);
  calculateInvoiceTotals();
}

function calculateInvoiceItemTotal(index) {
  const row = document.querySelector(`#invoice-items-tbody tr[data-item-index="${index}"]`);
  if (!row) return 0;

  const qty = parseFloat(row.querySelector('.item-qty')?.value || 0);
  const price = parseFloat(row.querySelector('.item-price')?.value || 0);
  const discountPercent = parseFloat(row.querySelector('.item-discount')?.value || 0);
  const taxRate = parseFloat(row.querySelector('.item-tax')?.value || 0);

  const subtotal = qty * price;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  const totalElement = document.getElementById(`invoice-item-total-${index}`);
  if (totalElement) {
    totalElement.textContent = `₹${formatNumber(total)}`;
  }

  return total;
}

function calculateInvoiceTotals() {
  const rows = document.querySelectorAll('#invoice-items-tbody tr[data-item-index]');
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  rows.forEach(row => {
    const index = row.getAttribute('data-item-index');
    const qty = parseFloat(row.querySelector('.item-qty')?.value || 0);
    const price = parseFloat(row.querySelector('.item-price')?.value || 0);
    const discountPercent = parseFloat(row.querySelector('.item-discount')?.value || 0);
    const taxRate = parseFloat(row.querySelector('.item-tax')?.value || 0);

    const itemSubtotal = qty * price;
    const itemDiscount = itemSubtotal * (discountPercent / 100);
    const afterDiscount = itemSubtotal - itemDiscount;
    const itemTax = afterDiscount * (taxRate / 100);

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
  });

  const shipping = parseFloat(document.getElementById('invoice-shipping')?.value || 0);
  const total = subtotal - totalDiscount + totalTax + shipping;

  // Update table footer
  document.getElementById('invoice-subtotal').textContent = `₹${formatNumber(subtotal)}`;
  document.getElementById('invoice-discount').textContent = `₹${formatNumber(totalDiscount)}`;
  document.getElementById('invoice-tax').textContent = `₹${formatNumber(totalTax)}`;
  document.getElementById('invoice-total').textContent = `₹${formatNumber(total)}`;

  // Update summary card
  document.getElementById('summary-subtotal').textContent = `₹${formatNumber(subtotal)}`;
  document.getElementById('summary-discount').textContent = `₹${formatNumber(totalDiscount)}`;
  document.getElementById('summary-tax').textContent = `₹${formatNumber(totalTax)}`;
  document.getElementById('summary-shipping').textContent = `₹${formatNumber(shipping)}`;
  document.getElementById('summary-total').textContent = `₹${formatNumber(total)}`;
}

function handleCustomerSelectInvoice(customerId) {
  const select = document.getElementById('invoice-customer');
  const option = select.options[select.selectedIndex];
  const gst = option.dataset.gst || '';
  const state = option.dataset.state || '';

  document.getElementById('invoice-customer-gst').value = gst;
  document.getElementById('invoice-place-of-supply').value = state;
}

/**
 * Open advanced sales order selector dialog with search
 */
async function openSalesOrderSelector() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    // Show loading
    Swal.fire({
      title: "Loading...",
      text: "Fetching sales orders",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Get all sales orders
    const ordersResponse = await axios.get(
      `${apiBase}/mango/sales-orders?limit=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    Swal.close();
    
    // Handle response
    let allOrders = [];
    if (Array.isArray(ordersResponse.data)) {
      allOrders = ordersResponse.data;
    } else if (ordersResponse.data && Array.isArray(ordersResponse.data.data)) {
      allOrders = ordersResponse.data.data;
    } else if (ordersResponse.data && ordersResponse.data.orders) {
      allOrders = ordersResponse.data.orders;
    }
    
    // Filter out cancelled orders
    allOrders = allOrders.filter(o => {
      if (!o || !o.id) return false;
      if (!o.status) return false;
      if (o.status.toUpperCase() === 'CANCELLED') return false;
      const total = parseFloat(o.total_amount || 0);
      if (total <= 0) return false;
      return true;
    });
    
    if (allOrders.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Sales Orders Available",
        text: "No sales orders available to load. Please create a sales order first.",
        confirmButtonText: "OK"
      });
      return;
    }
    
    // Sort by date (newest first)
    allOrders.sort((a, b) => {
      const dateA = new Date(a.order_date || a.created_at || 0);
      const dateB = new Date(b.order_date || b.created_at || 0);
      return dateB - dateA;
    });
    
    // Create HTML for table format
    const ordersTableRows = allOrders.map(order => {
      const orderDate = order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A';
      const statusBadge = getOrderStatusBadge(order.status);
      const itemCount = order.items ? order.items.length : 0;
      return `
        <tr class="sales-order-row" 
            data-order-id="${order.id}" 
            data-order-number="${(order.order_number || '').toLowerCase()}" 
            data-customer="${(order.customer?.name || '').toLowerCase()}"
            data-email="${(order.customer?.email || '').toLowerCase()}"
            data-amount="${order.total_amount || 0}"
            onclick="selectSalesOrderRow(${order.id})"
            style="cursor: pointer; transition: background-color 0.2s;">
          <td>
            <div class="fw-bold text-primary">${order.order_number || `#${order.id}`}</div>
            <small class="text-muted">#${order.id}</small>
          </td>
          <td>
            <div class="fw-bold">${order.customer?.name || 'N/A'}</div>
            ${order.customer?.email ? `<small class="text-muted">${order.customer.email}</small>` : ''}
          </td>
          <td>
            <div>${orderDate}</div>
            <small class="text-muted">${order.currency || 'INR'}</small>
          </td>
          <td>${statusBadge}</td>
          <td class="text-end">
            <div class="fw-bold text-success">₹${formatNumber(order.total_amount || 0)}</div>
            ${itemCount > 0 ? `<small class="text-muted">${itemCount} item(s)</small>` : ''}
          </td>
          <td class="text-center">
            <i class="bi bi-check-circle text-success" id="check-${order.id}" style="display: none; font-size: 20px;"></i>
          </td>
        </tr>
      `;
    }).join('');
    
    // Create search and table container
    const searchHtml = `
      <div style="max-height: 550px; overflow-y: auto;">
        <div class="mb-3">
          <input type="text" id="sales-order-search" class="form-control" 
                 placeholder="🔍 Search by order number, customer name, email, or amount..." 
                 onkeyup="filterSalesOrdersTable(this.value)"
                 style="padding: 10px; border-radius: 6px; font-size: 14px;">
        </div>
        <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
          <table class="table table-hover table-sm align-middle mb-0" id="sales-orders-table">
            <thead class="table-light sticky-top" style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="width: 15%;">Order Number</th>
                <th style="width: 25%;">Customer</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 20%;" class="text-end">Amount</th>
                <th style="width: 10%;" class="text-center">Select</th>
              </tr>
            </thead>
            <tbody id="sales-orders-tbody">
              ${ordersTableRows}
            </tbody>
          </table>
        </div>
        <div id="no-orders-found" style="display: none; text-align: center; padding: 40px; color: #999;">
          <i class="bi bi-search" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
          <p class="mb-0">No orders found matching your search</p>
        </div>
      </div>
      <style>
        .sales-order-row {
          transition: all 0.2s ease;
        }
        .sales-order-row:hover {
          background-color: #f8f9fa !important;
        }
        .sales-order-row.selected {
          background-color: #e7f3ff !important;
        }
        .sales-order-row.selected td {
          border-color: #007bff !important;
        }
        #sales-orders-table thead th {
          background-color: #f8f9fa;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        #sales-orders-table tbody td {
          font-size: 14px;
          vertical-align: middle;
        }
      </style>
    `;
    
    // Store orders globally for filtering
    window.salesOrdersForSelector = allOrders;
    window.selectedSalesOrderId = null;
    
    const result = await Swal.fire({
      title: "Select Sales Order",
      html: searchHtml,
      width: '700px',
      showCancelButton: true,
      confirmButtonText: "Load Selected Order",
      cancelButtonText: "Cancel",
      didOpen: () => {
        // Focus on search input
        setTimeout(() => {
          document.getElementById('sales-order-search')?.focus();
        }, 100);
      },
      preConfirm: () => {
        if (!window.selectedSalesOrderId) {
          Swal.showValidationMessage("Please select a sales order");
          return false;
        }
        return window.selectedSalesOrderId;
      }
    });
    
    if (result.isConfirmed && result.value) {
      const orderId = result.value;
      // Update the dropdown and load the order
      document.getElementById('invoice-sales-order').value = orderId;
      await loadFromSalesOrderInvoice(orderId);
      Swal.fire({
        icon: "success",
        title: "Order Loaded",
        text: "Sales order data has been loaded into the invoice form.",
        timer: 2000,
        showConfirmButton: false
      });
    }
    
    // Cleanup
    window.salesOrdersForSelector = null;
    window.selectedSalesOrderId = null;
  } catch (error) {
    console.error("Error loading sales orders:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.response?.data?.detail || error.message || "Failed to load sales orders",
      confirmButtonText: "OK"
    });
  }
}

/**
 * Filter sales orders table based on search query
 */
function filterSalesOrdersTable(searchQuery) {
  const query = (searchQuery || '').toLowerCase().trim();
  const tbody = document.getElementById('sales-orders-tbody');
  const noOrdersFound = document.getElementById('no-orders-found');
  const table = document.getElementById('sales-orders-table');
  
  if (!tbody || !window.salesOrdersForSelector) return;
  
  let visibleCount = 0;
  
  // Filter table rows
  const rows = tbody.querySelectorAll('.sales-order-row');
  rows.forEach(row => {
    const orderNumber = row.dataset.orderNumber || '';
    const customer = row.dataset.customer || '';
    const email = row.dataset.email || '';
    const amount = String(row.dataset.amount || '');
    const orderId = String(row.dataset.orderId || '');
    
    const matches = !query || 
      orderNumber.includes(query) ||
      customer.includes(query) ||
      email.includes(query) ||
      amount.includes(query) ||
      orderId.includes(query);
    
    if (matches) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Show/hide "no orders found" message
  if (visibleCount === 0 && query) {
    if (table) table.style.display = 'none';
    if (noOrdersFound) noOrdersFound.style.display = 'block';
  } else {
    if (table) table.style.display = '';
    if (noOrdersFound) noOrdersFound.style.display = 'none';
  }
}

/**
 * Select a sales order row
 */
function selectSalesOrderRow(orderId) {
  // Remove previous selection
  document.querySelectorAll('.sales-order-row').forEach(row => {
    row.classList.remove('selected');
    const checkIcon = document.getElementById(`check-${row.dataset.orderId}`);
    if (checkIcon) checkIcon.style.display = 'none';
  });
  
  // Add selection to clicked row
  const selectedRow = document.querySelector(`.sales-order-row[data-order-id="${orderId}"]`);
  if (selectedRow) {
    selectedRow.classList.add('selected');
    const checkIcon = document.getElementById(`check-${orderId}`);
    if (checkIcon) checkIcon.style.display = 'inline';
    window.selectedSalesOrderId = orderId;
  }
}

/**
 * Get order status badge HTML
 */
function getOrderStatusBadge(status) {
  const statusUpper = (status || '').toUpperCase();
  const badges = {
    'PENDING': '<span class="badge bg-warning">PENDING</span>',
    'CONFIRMED': '<span class="badge bg-info">CONFIRMED</span>',
    'PROCESSING': '<span class="badge bg-primary">PROCESSING</span>',
    'SHIPPED': '<span class="badge bg-success">SHIPPED</span>',
    'DELIVERED': '<span class="badge bg-success">DELIVERED</span>',
    'CANCELLED': '<span class="badge bg-danger">CANCELLED</span>'
  };
  return badges[statusUpper] || `<span class="badge bg-secondary">${status || 'N/A'}</span>`;
}

async function loadFromSalesOrderInvoice(salesOrderId) {
  if (!salesOrderId) {
    // If called without ID, clear the form
    document.getElementById('invoice-sales-order').value = '';
    return;
  }

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${apiBase}/mango/sales-orders/${salesOrderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const order = response.data;
    
    // Set customer
    document.getElementById('invoice-customer').value = order.customer_id;
    handleCustomerSelectInvoice(order.customer_id);

    // Set dates
    if (order.order_date) {
      document.getElementById('invoice-date').value = new Date(order.order_date).toISOString().split('T')[0];
    }
    if (order.delivery_date) {
      document.getElementById('invoice-due-date').value = new Date(order.delivery_date).toISOString().split('T')[0];
    }

    // Clear existing items
    const tbody = document.getElementById('invoice-items-tbody');
    tbody.innerHTML = '';
    invoiceItemIndex = 0;

    // Add items from sales order
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        addInvoiceItem();
        const row = document.querySelector(`#invoice-items-tbody tr[data-item-index="${invoiceItemIndex - 1}"]`);
        if (row) {
          row.querySelector('.item-product').value = item.product_id || '';
          updateInvoiceItemProduct(invoiceItemIndex - 1, item.product_id);
          row.querySelector('.item-qty').value = item.quantity || 1;
          row.querySelector('.item-price').value = item.unit_price || 0;
          row.querySelector('.item-discount').value = item.discount_percent || 0;
          row.querySelector('.item-tax').value = item.tax_rate || 0;
          if (item.description) {
            row.querySelector('.item-description').value = item.description;
          }
          calculateInvoiceItemTotal(invoiceItemIndex - 1);
        }
      });
    }

    // Set shipping charges
    if (order.shipping_charges) {
      document.getElementById('invoice-shipping').value = order.shipping_charges;
    }

    // Set addresses and terms
    if (order.shipping_address) {
      document.getElementById('invoice-shipping-address').value = order.shipping_address;
    }
    if (order.payment_terms) {
      document.getElementById('invoice-payment-terms').value = order.payment_terms;
    }
    if (order.delivery_terms) {
      document.getElementById('invoice-delivery-terms').value = order.delivery_terms;
    }

    calculateInvoiceTotals();
  } catch (error) {
    console.error("Error loading sales order:", error);
    Swal.fire("Error", "Failed to load sales order details", "error");
  }
}

function showBulkAddInvoiceModal() {
  Swal.fire({
    title: "Bulk Add Items",
    html: `
      <textarea id="bulk-items-text" class="form-control" rows="10" 
                placeholder="Enter items (one per line):&#10;Product Name | Qty | Price | Discount % | Tax %&#10;Example:&#10;Product A | 10 | 100 | 5 | 18"></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: "Add Items",
    preConfirm: () => {
      const text = document.getElementById('bulk-items-text').value;
      if (!text.trim()) {
        Swal.showValidationMessage("Please enter items");
        return false;
      }
      return text;
    }
  }).then(result => {
    if (result.isConfirmed && result.value) {
      processBulkAddInvoiceItems(result.value);
    }
  });
}

function processBulkAddInvoiceItems(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const products = window.invoiceFormData?.products || [];

  lines.forEach(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      const productName = parts[0];
      const qty = parseFloat(parts[1]) || 1;
      const price = parseFloat(parts[2]) || 0;
      const discount = parseFloat(parts[3]) || 0;
      const tax = parseFloat(parts[4]) || 0;

      // Find product by name
      const product = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
      
      addInvoiceItem();
      const row = document.querySelector(`#invoice-items-tbody tr[data-item-index="${invoiceItemIndex - 1}"]`);
      if (row) {
        if (product) {
          row.querySelector('.item-product').value = product.id;
          updateInvoiceItemProduct(invoiceItemIndex - 1, product.id);
        }
        row.querySelector('.item-description').value = productName;
        row.querySelector('.item-qty').value = qty;
        row.querySelector('.item-price').value = price;
        row.querySelector('.item-discount').value = discount;
        row.querySelector('.item-tax').value = tax;
        calculateInvoiceItemTotal(invoiceItemIndex - 1);
      }
    }
  });

  calculateInvoiceTotals();
  Swal.fire("Success", `Added ${lines.length} items`, "success");
}

async function saveInvoiceDraft() {
  await saveInvoice('DRAFT');
}

async function saveInvoice(status = 'DRAFT') {
  try {
    const form = document.getElementById('invoice-form');
    if (!form || !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    const customerId = parseInt(document.getElementById('invoice-customer').value);
    const invoiceDate = document.getElementById('invoice-date').value;
    const dueDate = document.getElementById('invoice-due-date').value;
    const salesOrderId = document.getElementById('invoice-sales-order').value || null;
    const invoiceType = document.getElementById('invoice-type').value;
    const currency = document.getElementById('invoice-currency').value;
    const shippingCharges = parseFloat(document.getElementById('invoice-shipping').value || 0);
    const customerGst = document.getElementById('invoice-customer-gst').value || null;
    const placeOfSupply = document.getElementById('invoice-place-of-supply').value || null;
    const shippingAddress = document.getElementById('invoice-shipping-address').value || null;
    const billingAddress = document.getElementById('invoice-billing-address').value || null;
    const paymentTerms = document.getElementById('invoice-payment-terms').value || null;
    const deliveryTerms = document.getElementById('invoice-delivery-terms').value || null;
    const notes = document.getElementById('invoice-notes').value || null;
    const termsConditions = document.getElementById('invoice-terms').value || null;

    // Collect items
    const rows = document.querySelectorAll('#invoice-items-tbody tr[data-item-index]');
    const items = Array.from(rows).map(row => {
      const index = row.getAttribute('data-item-index');
      const productId = parseInt(row.querySelector('.item-product').value) || null;
      const description = row.querySelector('.item-description').value || '';
      const hsnCode = row.querySelector('.item-hsn').value || null;
      const quantity = parseInt(row.querySelector('.item-qty').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
      const discountPercent = parseFloat(row.querySelector('.item-discount').value) || 0;
      const taxRate = parseFloat(row.querySelector('.item-tax').value) || 0;

      return {
        product_id: productId,
        description: description,
        hsn_code: hsnCode,
        quantity: quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        tax_rate: taxRate
      };
    }).filter(item => item.quantity > 0 && item.unit_price > 0);

    if (items.length === 0) {
      Swal.fire("Validation Error", "Please add at least one item with quantity and price", "error");
      return;
    }

    const invoiceData = {
      customer_id: customerId,
      sales_order_id: salesOrderId ? parseInt(salesOrderId) : null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: status,
      invoice_type: invoiceType,
      currency: currency,
      shipping_charges: shippingCharges,
      gst_number: customerGst,
      place_of_supply: placeOfSupply,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      payment_terms: paymentTerms,
      delivery_terms: deliveryTerms,
      notes: notes,
      terms_conditions: termsConditions,
      items: items
    };

    const invoiceId = window.invoiceFormData?.invoiceId;
    let response;

    if (invoiceId) {
      // Update existing
      response = await axios.put(
        `${apiBase}/mango/invoices/${invoiceId}`,
        invoiceData,
        { headers }
      );
    } else {
      // Create new
      response = await axios.post(
        `${apiBase}/mango/invoices`,
        invoiceData,
        { headers }
      );
      
      if (response.data && response.data.id) {
        window.invoiceFormData.invoiceId = response.data.id;
      }
    }

    const successMessage = status === 'DRAFT' 
      ? `Invoice ${invoiceId ? 'updated' : 'saved'} as draft successfully!`
      : `Invoice ${invoiceId ? 'updated' : 'created'} successfully!`;
    
    await Swal.fire({
      title: "Success!",
      text: successMessage,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });

    // Navigate back to invoices list
    if (typeof loadSection === 'function') {
      loadSection('sales_invoices');
    } else {
      window.location.hash = 'sales_invoices';
    }
  } catch (error) {
    console.error("Error saving invoice:", error);
    const errorMsg = error.response?.data?.detail || error.message || "Failed to save invoice";
    Swal.fire("Error", String(errorMsg), "error");
  }
}

