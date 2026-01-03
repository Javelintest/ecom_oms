/**
 * Channel Order Import Module
 * Upload sales orders from e-commerce platforms
 */

const channelOrderState = {
  selectedPlatform: null,
  selectedFile: null,
  importHistory: [],
  previewData: null,
  fieldMapping: {},
};

// Sales Order State
const salesOrderState = {
  customers: [],
  products: [],
  quotations: [],
  currentOrder: null,
  orderItems: [],
  selectedCustomer: null,
  taxRate: 18.0,
  shippingCharges: 0.0
};

/**
 * Render channel orders interface
 */
function renderChannelOrders(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold mb-1">
          <i class="bi bi-cart-check me-2"></i>Sales Orders
        </h2>
        <p class="text-muted mb-0">Process and track sales orders</p>
      </div>
      <button class="btn btn-outline-primary" onclick="loadSection('channel_settings')">
        <i class="bi bi-sliders me-2"></i>Channel Settings
      </button>
    </div>

    <!-- Tab Navigation -->
    <ul class="nav nav-tabs mb-4" id="orderTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="import-tab" data-bs-toggle="tab" 
                data-bs-target="#import-panel" type="button" role="tab">
          <i class="bi bi-cloud-upload me-2"></i>Channel Import
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="manual-tab" data-bs-toggle="tab" 
                data-bs-target="#manual-panel" type="button" role="tab">
          <i class="bi bi-plus-circle me-2"></i>Manual Order
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="list-tab" data-bs-toggle="tab" 
                data-bs-target="#list-panel" type="button" role="tab">
          <i class="bi bi-list-ul me-2"></i>Order List
        </button>
      </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content" id="orderTabContent">
      <!-- Channel Import Panel -->
      <div class="tab-pane fade show active" id="import-panel" role="tabpanel">
        ${renderImportPanel()}
      </div>

      <!-- Manual Order Panel -->
      <div class="tab-pane fade" id="manual-panel" role="tabpanel">
        <div id="manual-order-container">
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 text-muted">Loading order form...</p>
          </div>
        </div>
      </div>

      <!-- Order List Panel -->
      <div class="tab-pane fade" id="list-panel" role="tabpanel">
        <div id="order-list-container">
          ${renderOrderListPanel()}
        </div>
      </div>
    </div>
  `;

  // Initialize
  loadPlatformList();
  
  // Populate channels after DOM is rendered
  setTimeout(() => populateChannelSelector(), 200);
  
  // Load sales orders when list tab is shown
  setTimeout(() => {
    const listTab = document.getElementById('list-tab');
    if (listTab) {
      listTab.addEventListener('shown.bs.tab', () => {
        loadSalesOrders();
      });
    }
    // Also load if already on list tab
    if (listTab && listTab.classList.contains('active')) {
      loadSalesOrders();
    }
  }, 300);
  
  // Initialize manual order panel when shown
  setTimeout(async () => {
    const manualTab = document.getElementById('manual-tab');
    if (manualTab) {
      manualTab.addEventListener('shown.bs.tab', async () => {
        const container = document.getElementById('manual-order-container');
        if (container && !container.querySelector('#manual-order-form')) {
          container.innerHTML = await renderManualOrderPanel();
          // Add initial item
          setTimeout(() => addOrderItem(), 100);
        }
      });
    }
    // Also initialize if already on manual tab
    const manualPanel = document.getElementById('manual-panel');
    if (manualPanel && manualPanel.classList.contains('active')) {
      const container = document.getElementById('manual-order-container');
      if (container) {
        container.innerHTML = await renderManualOrderPanel();
        setTimeout(() => addOrderItem(), 100);
      }
    }
  }, 300);
}

/**
 * Render import panel content
 */
function renderImportPanel() {
  return `
    <div class="row g-4">
      <!-- Import Configuration -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Configuration</h5>
          </div>
          <div class="card-body">
            <!-- Platform Selection -->
            <div class="mb-3">
              <label class="form-label fw-bold">Select Channel</label>
              <select class="form-select" id="platform-select" onchange="handlePlatformChange()">
                <option value="">-- Choose Channel --</option>
                <optgroup label="Channels" id="custom-channels-group">
                  <option value="" disabled>Loading channels...</option>
                </optgroup>
              </select>
              <small class="text-muted">Select a channel to import orders. Create channels in Channel Settings.</small>
            </div>

            <!-- File Upload -->
            <div class="mb-3">
              <label class="form-label fw-bold">Upload File</label>
              <div class="border rounded p-4 text-center" id="drop-zone" 
                   style="cursor: pointer; border-style: dashed !important;"
                   ondrop="handleFileDrop(event)" 
                   ondragover="handleDragOver(event)"
                   ondragleave="handleDragLeave(event)"
                   onclick="document.getElementById('file-input').click()">
                <i class="bi bi-cloud-upload display-4 text-muted d-block mb-2"></i>
                <p class="mb-1"><strong>Drag & drop your file here</strong></p>
                <p class="small text-muted mb-2">or click to browse</p>
                <p class="small text-muted mb-0">Supports: CSV, Excel (.xlsx)</p>
              </div>
              <input type="file" id="file-input" class="d-none" 
                     accept=".csv,.xlsx,.xls" 
                     onchange="handleFileSelect(event)">
              
              <div id="file-info" class="mt-2" style="display: none;">
                <div class="alert alert-info d-flex align-items-center mb-0">
                  <i class="bi bi-file-earmark-text me-2"></i>
                  <div class="flex-grow-1">
                    <div class="fw-bold" id="file-name"></div>
                    <small id="file-size"></small>
                  </div>
                  <button class="btn btn-sm btn-outline-danger" onclick="clearFile()">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Import Button -->
            <div class="d-grid">
              <button class="btn btn-primary" id="upload-btn" onclick="uploadAndImportOrders()" disabled>
                <i class="bi bi-upload me-2"></i>Upload & Import Orders
              </button>
            </div>
          </div>
        </div>

        <!-- Platform Help -->
        <div class="card border-0 shadow-sm mt-3" id="platform-help" style="display: none;">
          <div class="card-body">
            <h6 class="fw-bold"><i class="bi bi-info-circle me-2"></i>Platform Guide</h6>
            <div id="platform-help-content"></div>
          </div>
        </div>
      </div>

      <!-- Preview & Mapping -->
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-eye me-2"></i>Data Preview</h5>
          </div>
          <div class="card-body">
            <div id="preview-container">
              <div class="text-center text-muted py-5">
                <i class="bi bi-table display-1 d-block mb-3"></i>
                <p class="mb-0">Upload a file to preview data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render manual order creation panel (Advanced)
 */
async function renderManualOrderPanel() {
  const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Load customers and products
  try {
    const [customersRes, productsRes, quotationsRes] = await Promise.all([
      axios.get(`${apiBase}/mango/customers`, { headers }),
      axios.get(`${apiBase}/mango/inventory/products`, { headers }),
      axios.get(`${apiBase}/mango/quotations?status=ACCEPTED`, { headers }).catch(() => ({ data: [] }))
    ]);

    salesOrderState.customers = customersRes.data || [];
    salesOrderState.products = productsRes.data || [];
    salesOrderState.quotations = quotationsRes.data || [];
  } catch (error) {
    console.error("Error loading data:", error);
    Swal.fire("Error", "Failed to load customers/products", "error");
  }

  // Reset order items
  salesOrderState.orderItems = [];
  salesOrderState.selectedCustomer = null;

  return `
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-plus-circle me-2"></i>Create New Sales Order</h5>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-light" onclick="loadFromQuotation()" title="Convert from Quotation">
                <i class="bi bi-file-text me-1"></i>From Quote
              </button>
            </div>
          </div>
          <div class="card-body">
            <form id="manual-order-form" onsubmit="handleCreateOrder(event)">
              <!-- Customer Selection -->
              <div class="card border mb-4">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="bi bi-person me-2"></i>Customer Information</h6>
                </div>
                <div class="card-body">
                  <div class="row mb-3">
                    <div class="col-md-12">
                      <label class="form-label fw-bold">Select Customer <span class="text-danger">*</span></label>
                      <select class="form-select" id="order-customer" required onchange="handleCustomerSelect(this.value)">
                        <option value="">-- Select Customer --</option>
                        ${salesOrderState.customers.map(c => `
                          <option value="${c.id}" data-email="${c.email || ''}" data-phone="${c.phone || ''}" data-address="${c.address || ''}">
                            ${c.name} ${c.customer_code ? `(${c.customer_code})` : ''}
                          </option>
                        `).join('')}
                      </select>
                      <small class="text-muted">Or <a href="#" onclick="loadSection('sales_customers')">create new customer</a></small>
                    </div>
                  </div>
                  <div id="customer-details-preview" class="alert alert-info" style="display: none;">
                    <div class="row">
                      <div class="col-md-6">
                        <strong>Email:</strong> <span id="customer-email-display">-</span><br>
                        <strong>Phone:</strong> <span id="customer-phone-display">-</span>
                      </div>
                      <div class="col-md-6">
                        <strong>Address:</strong> <span id="customer-address-display">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Order Details -->
              <div class="card border mb-4">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="bi bi-calendar me-2"></i>Order Details</h6>
                </div>
                <div class="card-body">
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Order Date <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="order-date" 
                             value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Delivery Date</label>
                      <input type="date" class="form-control" id="delivery-date" 
                             value="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}">
                    </div>
                  </div>
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Status</label>
                      <select class="form-select" id="order-status">
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PROCESSING">Processing</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Currency</label>
                      <select class="form-select" id="order-currency">
                        <option value="INR" selected>INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Order Items -->
              <div class="card border mb-4">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                  <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Order Items</h6>
                  <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-primary" onclick="addOrderItem()">
                      <i class="bi bi-plus-lg me-1"></i>Add Item
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="showBulkAddItemsModal()" title="Bulk Add">
                      <i class="bi bi-list-columns"></i>
                    </button>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-bordered mb-0" id="order-items-table">
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
                      <tbody id="order-items-tbody">
                        <!-- Items will be added here -->
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Shipping Address -->
              <div class="card border mb-4">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="bi bi-truck me-2"></i>Shipping Address</h6>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label fw-bold">Shipping Address <span class="text-danger">*</span></label>
                    <textarea class="form-control" id="shipping-address" rows="3" 
                              placeholder="Enter complete shipping address..." required></textarea>
                  </div>
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Shipping Method</label>
                      <input type="text" class="form-control" id="shipping-method" 
                             placeholder="e.g., Standard, Express, Overnight">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Tracking Number</label>
                      <input type="text" class="form-control" id="tracking-number" 
                             placeholder="Enter after shipping">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Terms & Notes -->
              <div class="card border mb-4">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="bi bi-file-text me-2"></i>Terms & Notes</h6>
                </div>
                <div class="card-body">
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Payment Terms</label>
                      <input type="text" class="form-control" id="payment-terms" 
                             placeholder="e.g., NET 30, Due on receipt" value="NET 30">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Delivery Terms</label>
                      <input type="text" class="form-control" id="delivery-terms" 
                             placeholder="e.g., FOB, CIF">
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-bold">Notes</label>
                    <textarea class="form-control" id="order-notes" rows="3" 
                              placeholder="Internal notes or special instructions..."></textarea>
                  </div>
                </div>
              </div>

              <!-- Submit Buttons -->
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-success btn-lg">
                  <i class="bi bi-check2-circle me-2"></i>Create Sales Order
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="resetOrderForm()">
                  <i class="bi bi-arrow-counterclockwise me-2"></i>Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Order Summary Sidebar -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm sticky-top" style="top: 20px;">
          <div class="card-header bg-primary text-white">
            <h6 class="mb-0"><i class="bi bi-calculator me-2"></i>Order Summary</h6>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label small fw-bold">Tax Rate (%)</label>
              <input type="number" class="form-control form-control-sm" id="tax-rate" 
                     value="18" step="0.1" min="0" max="100" onchange="calculateOrderTotals()">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Shipping Charges</label>
              <input type="number" class="form-control form-control-sm" id="shipping-charges" 
                     value="0" step="0.01" min="0" onchange="calculateOrderTotals()">
            </div>
            <hr>
            <div class="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <strong id="summary-subtotal">₹0.00</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>Discount:</span>
              <strong id="summary-discount">₹0.00</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>Tax:</span>
              <strong id="summary-tax">₹0.00</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>Shipping:</span>
              <strong id="summary-shipping">₹0.00</strong>
            </div>
            <hr>
            <div class="d-flex justify-content-between">
              <strong class="fs-5">Total:</strong>
              <strong class="fs-5 text-success" id="summary-total">₹0.00</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Handle customer selection
function handleCustomerSelect(customerId) {
  if (!customerId) {
    document.getElementById('customer-details-preview').style.display = 'none';
    salesOrderState.selectedCustomer = null;
    return;
  }

  const option = document.querySelector(`#order-customer option[value="${customerId}"]`);
  if (!option) return;

  const customer = salesOrderState.customers.find(c => c.id == customerId);
  if (customer) {
    salesOrderState.selectedCustomer = customer;
    document.getElementById('customer-email-display').textContent = customer.email || '-';
    document.getElementById('customer-phone-display').textContent = customer.phone || '-';
    document.getElementById('customer-address-display').textContent = customer.address || '-';
    document.getElementById('customer-details-preview').style.display = 'block';
    
    // Auto-fill shipping address if available
    if (customer.address) {
      document.getElementById('shipping-address').value = customer.address;
    }
  }
}

// Add order item
let orderItemIndex = 0;
function addOrderItem() {
  const tbody = document.getElementById('order-items-tbody');
  if (!tbody) return;

  const itemId = orderItemIndex++;
  const row = document.createElement('tr');
  row.setAttribute('data-item-id', itemId);
  row.innerHTML = `
    <td>
      <select class="form-select form-select-sm item-product" data-item-id="${itemId}" onchange="updateOrderItemProduct(${itemId}, this.value)">
        <option value="">Select Product...</option>
        ${salesOrderState.products.map(p => `
          <option value="${p.id}" data-price="${p.sales_rate || p.purchase_rate || 0}" data-sku="${p.sku || ''}">
            ${p.name} (${p.sku || 'N/A'})
          </option>
        `).join('')}
      </select>
      <textarea class="form-control form-control-sm mt-1 item-description" data-item-id="${itemId}" 
                placeholder="Description" oninput="updateOrderItemDescription(${itemId}, this.value)"></textarea>
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-qty" data-item-id="${itemId}" 
             value="1" min="1" oninput="updateOrderItemQuantity(${itemId}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-price" data-item-id="${itemId}" 
             value="0" step="0.01" min="0" oninput="updateOrderItemPrice(${itemId}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-discount" data-item-id="${itemId}" 
             value="0" step="0.01" min="0" max="100" oninput="updateOrderItemDiscount(${itemId}, this.value)">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm item-tax" data-item-id="${itemId}" 
             value="18" step="0.01" min="0" max="100" oninput="updateOrderItemTax(${itemId}, this.value)">
    </td>
    <td>
      <div class="fw-bold item-total" id="item-total-${itemId}">₹0.00</div>
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOrderItem(${itemId})">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
}

// Update order item product
function updateOrderItemProduct(itemId, productId) {
  if (!productId) return;
  const product = salesOrderState.products.find(p => p.id == productId);
  if (product) {
    const priceInput = document.querySelector(`.item-price[data-item-id="${itemId}"]`);
    const descInput = document.querySelector(`.item-description[data-item-id="${itemId}"]`);
    if (priceInput) priceInput.value = product.sales_rate || product.purchase_rate || 0;
    if (descInput) descInput.value = product.name || '';
    calculateItemTotal(itemId);
    calculateOrderTotals();
  }
}

// Update order item description
function updateOrderItemDescription(itemId, description) {
  // Just store it, no calculation needed
}

// Update order item quantity
function updateOrderItemQuantity(itemId, quantity) {
  calculateItemTotal(itemId);
  calculateOrderTotals();
}

// Update order item price
function updateOrderItemPrice(itemId, price) {
  calculateItemTotal(itemId);
  calculateOrderTotals();
}

// Update order item discount
function updateOrderItemDiscount(itemId, discount) {
  calculateItemTotal(itemId);
  calculateOrderTotals();
}

// Update order item tax
function updateOrderItemTax(itemId, tax) {
  calculateItemTotal(itemId);
  calculateOrderTotals();
}

// Calculate item total
function calculateItemTotal(itemId) {
  const qty = parseFloat(document.querySelector(`.item-qty[data-item-id="${itemId}"]`)?.value || 0);
  const price = parseFloat(document.querySelector(`.item-price[data-item-id="${itemId}"]`)?.value || 0);
  const discount = parseFloat(document.querySelector(`.item-discount[data-item-id="${itemId}"]`)?.value || 0);
  const tax = parseFloat(document.querySelector(`.item-tax[data-item-id="${itemId}"]`)?.value || 0);

  const subtotal = qty * price;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * tax) / 100;
  const total = afterDiscount + taxAmount;

  const totalElement = document.getElementById(`item-total-${itemId}`);
  if (totalElement) {
    totalElement.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Calculate order totals
function calculateOrderTotals() {
  const items = document.querySelectorAll('#order-items-tbody tr');
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  items.forEach(row => {
    const itemId = row.getAttribute('data-item-id');
    const qty = parseFloat(document.querySelector(`.item-qty[data-item-id="${itemId}"]`)?.value || 0);
    const price = parseFloat(document.querySelector(`.item-price[data-item-id="${itemId}"]`)?.value || 0);
    const discount = parseFloat(document.querySelector(`.item-discount[data-item-id="${itemId}"]`)?.value || 0);
    const tax = parseFloat(document.querySelector(`.item-tax[data-item-id="${itemId}"]`)?.value || 0);

    const lineSubtotal = qty * price;
    const lineDiscount = (lineSubtotal * discount) / 100;
    const afterDiscount = lineSubtotal - lineDiscount;
    const lineTax = (afterDiscount * tax) / 100;

    subtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;
  });

  const shipping = parseFloat(document.getElementById('shipping-charges')?.value || 0);
  const total = subtotal - totalDiscount + totalTax + shipping;

  // Update summary
  document.getElementById('summary-subtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('summary-discount').textContent = `₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('summary-tax').textContent = `₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('summary-shipping').textContent = `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('summary-total').textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Remove order item
function removeOrderItem(itemId) {
  const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
  if (row) {
    row.remove();
    calculateOrderTotals();
  }
}

// Handle create order
async function handleCreateOrder(event) {
  event.preventDefault();

  const customerId = document.getElementById('order-customer')?.value;
  if (!customerId) {
    Swal.fire("Validation Error", "Please select a customer", "error");
    return;
  }

  const items = [];
  const itemRows = document.querySelectorAll('#order-items-tbody tr');
  if (itemRows.length === 0) {
    Swal.fire("Validation Error", "Please add at least one item", "error");
    return;
  }

  itemRows.forEach(row => {
    const itemId = row.getAttribute('data-item-id');
    const productSelect = document.querySelector(`.item-product[data-item-id="${itemId}"]`);
    const productId = productSelect?.value;
    const qty = parseFloat(document.querySelector(`.item-qty[data-item-id="${itemId}"]`)?.value || 0);
    const price = parseFloat(document.querySelector(`.item-price[data-item-id="${itemId}"]`)?.value || 0);
    const discount = parseFloat(document.querySelector(`.item-discount[data-item-id="${itemId}"]`)?.value || 0);
    const tax = parseFloat(document.querySelector(`.item-tax[data-item-id="${itemId}"]`)?.value || 0);
    const description = document.querySelector(`.item-description[data-item-id="${itemId}"]`)?.value || '';

    if (productId && qty > 0 && price > 0) {
      items.push({
        product_id: parseInt(productId),
        quantity: qty,
        unit_price: price,
        discount_percent: discount,
        tax_rate: tax,
        description: description
      });
    }
  });

  if (items.length === 0) {
    Swal.fire("Validation Error", "Please add valid items with quantity and price", "error");
    return;
  }

  const orderData = {
    customer_id: parseInt(customerId),
    order_date: document.getElementById('order-date')?.value,
    delivery_date: document.getElementById('delivery-date')?.value || null,
    status: document.getElementById('order-status')?.value || 'PENDING',
    currency: document.getElementById('order-currency')?.value || 'INR',
    shipping_address: document.getElementById('shipping-address')?.value,
    shipping_method: document.getElementById('shipping-method')?.value || null,
    payment_terms: document.getElementById('payment-terms')?.value || null,
    delivery_terms: document.getElementById('delivery-terms')?.value || null,
    notes: document.getElementById('order-notes')?.value || null,
    shipping_charges: parseFloat(document.getElementById('shipping-charges')?.value || 0),
    items: items
  };

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.post(
      `${apiBase}/mango/sales-orders`,
      orderData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await Swal.fire({
      title: "Success!",
      text: `Sales Order ${response.data.order_number} created successfully!`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });

    // Switch to order list tab
    const listTab = document.getElementById('list-tab');
    if (listTab) {
      listTab.click();
      loadSalesOrders();
    }
  } catch (error) {
    console.error("Error creating order:", error);
    Swal.fire("Error", error.response?.data?.detail || "Failed to create sales order", "error");
  }
}

// Reset order form
function resetOrderForm() {
  document.getElementById('manual-order-form')?.reset();
  document.getElementById('order-items-tbody').innerHTML = '';
  document.getElementById('customer-details-preview').style.display = 'none';
  salesOrderState.orderItems = [];
  salesOrderState.selectedCustomer = null;
  orderItemIndex = 0;
  calculateOrderTotals();
}

// Load from quotation
async function loadFromQuotation() {
  if (salesOrderState.quotations.length === 0) {
    Swal.fire("Info", "No accepted quotations available", "info");
    return;
  }

  const { value: quotationId } = await Swal.fire({
    title: "Select Quotation",
    input: "select",
    inputOptions: Object.fromEntries(
      salesOrderState.quotations.map(q => [q.id, `${q.quotation_number} - ${q.customer?.name || 'N/A'} (₹${q.total_amount})`])
    ),
    showCancelButton: true,
    confirmButtonText: "Load",
    inputValidator: (value) => {
      if (!value) {
        return "Please select a quotation";
      }
    }
  });

  if (quotationId) {
    try {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        `${apiBase}/mango/quotations/${quotationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const quotation = response.data;
      
      // Fill customer
      document.getElementById('order-customer').value = quotation.customer_id;
      handleCustomerSelect(quotation.customer_id);

      // Fill dates
      document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
      if (quotation.valid_until) {
        document.getElementById('delivery-date').value = new Date(quotation.valid_until).toISOString().split('T')[0];
      }

      // Fill items
      document.getElementById('order-items-tbody').innerHTML = '';
      orderItemIndex = 0;
      quotation.items.forEach(item => {
        addOrderItem();
        const itemId = orderItemIndex - 1;
        const productSelect = document.querySelector(`.item-product[data-item-id="${itemId}"]`);
        if (productSelect && item.product_id) {
          productSelect.value = item.product_id;
          updateOrderItemProduct(itemId, item.product_id);
        }
        document.querySelector(`.item-qty[data-item-id="${itemId}"]`).value = item.quantity;
        document.querySelector(`.item-price[data-item-id="${itemId}"]`).value = item.unit_price;
        document.querySelector(`.item-discount[data-item-id="${itemId}"]`).value = item.discount_percent || 0;
        document.querySelector(`.item-tax[data-item-id="${itemId}"]`).value = item.tax_rate || 0;
        if (item.description) {
          document.querySelector(`.item-description[data-item-id="${itemId}"]`).value = item.description;
        }
        calculateItemTotal(itemId);
      });

      // Fill terms
      if (quotation.payment_terms) {
        document.getElementById('payment-terms').value = quotation.payment_terms;
      }
      if (quotation.delivery_terms) {
        document.getElementById('delivery-terms').value = quotation.delivery_terms;
      }
      if (quotation.notes) {
        document.getElementById('order-notes').value = `Converted from Quotation ${quotation.quotation_number}. ${quotation.notes}`;
      }

      calculateOrderTotals();
      Swal.fire("Success", "Quotation data loaded successfully", "success");
    } catch (error) {
      console.error("Error loading quotation:", error);
      Swal.fire("Error", "Failed to load quotation data", "error");
    }
  }
}

// Show bulk add items modal
function showBulkAddItemsModal() {
  Swal.fire({
    title: "Bulk Add Items",
    html: `
      <p>Paste product data from Excel/CSV. Format: <code>Product ID/SKU, Quantity, Unit Price, Discount %, Tax %</code></p>
      <textarea class="form-control font-monospace" id="bulk-items-data" rows="10" placeholder="Paste your data here..."></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: "Add Items",
    preConfirm: () => {
      const data = document.getElementById('bulk-items-data').value;
      if (!data.trim()) {
        Swal.showValidationMessage("Please paste item data");
        return false;
      }
      return data;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      processBulkAddItems(result.value);
    }
  });
}

// Process bulk add items
function processBulkAddItems(data) {
  const lines = data.split('\n').filter(line => line.trim());
  let added = 0;

  lines.forEach(line => {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      addOrderItem();
      const itemId = orderItemIndex - 1;
      const productId = parts[0];
      const qty = parseFloat(parts[1]) || 1;
      const price = parseFloat(parts[2]) || 0;
      const discount = parseFloat(parts[3]) || 0;
      const tax = parseFloat(parts[4]) || 18;

      const productSelect = document.querySelector(`.item-product[data-item-id="${itemId}"]`);
      if (productSelect) {
        // Try to find by ID or SKU
        const product = salesOrderState.products.find(p => 
          p.id == productId || p.sku === productId
        );
        if (product) {
          productSelect.value = product.id;
          updateOrderItemProduct(itemId, product.id);
        }
      }

      document.querySelector(`.item-qty[data-item-id="${itemId}"]`).value = qty;
      document.querySelector(`.item-price[data-item-id="${itemId}"]`).value = price;
      document.querySelector(`.item-discount[data-item-id="${itemId}"]`).value = discount;
      document.querySelector(`.item-tax[data-item-id="${itemId}"]`).value = tax;
      calculateItemTotal(itemId);
      added++;
    }
  });

  calculateOrderTotals();
  Swal.fire("Success", `Added ${added} items`, "success");
}

/**
 * Render order list panel (Advanced Sales Orders)
 */
function renderOrderListPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Sales Orders</h5>
        <button class="btn btn-sm btn-primary" onclick="loadSalesOrders()">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>
      <div class="card-body">
        <!-- Filters -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <label class="form-label fw-bold">Status</label>
            <select class="form-select" id="filter-status" onchange="loadSalesOrders()">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">Customer</label>
            <select class="form-select" id="filter-customer" onchange="loadSalesOrders()">
              <option value="">All Customers</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">From Date</label>
            <input type="date" class="form-control" id="filter-from-date" onchange="loadSalesOrders()">
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">To Date</label>
            <input type="date" class="form-control" id="filter-to-date" onchange="loadSalesOrders()">
          </div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" id="search-orders" 
                     placeholder="Search by Order Number, Customer Name..." 
                     onkeyup="if(event.key === 'Enter') loadSalesOrders()">
            </div>
          </div>
          <div class="col-md-6 text-end">
            <button class="btn btn-outline-secondary" onclick="clearOrderFilters()">
              <i class="bi bi-x-circle me-2"></i>Clear Filters
            </button>
            <button class="btn btn-success" onclick="exportSalesOrders()">
              <i class="bi bi-download me-2"></i>Export
            </button>
          </div>
        </div>

        <!-- Orders Table -->
        <div id="orders-table-container">
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 text-muted">Loading sales orders...</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load sales orders
async function loadSalesOrders() {
  const container = document.getElementById('orders-table-container');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading sales orders...</p>
    </div>
  `;

  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    const params = new URLSearchParams();
    const status = document.getElementById('filter-status')?.value;
    const customerId = document.getElementById('filter-customer')?.value;
    const search = document.getElementById('search-orders')?.value;
    const fromDate = document.getElementById('filter-from-date')?.value;
    const toDate = document.getElementById('filter-to-date')?.value;

    if (status) params.append('status', status);
    if (customerId) params.append('customer_id', customerId);
    if (search) params.append('search', search);
    if (fromDate) params.append('start_date', fromDate);
    if (toDate) params.append('end_date', toDate);

    const response = await axios.get(
      `${apiBase}/mango/sales-orders?${params.toString()}`,
      { headers }
    );

    const orders = response.data || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-inbox display-4 d-block mb-3"></i>
          <p class="mb-0">No sales orders found</p>
          <p class="small">Create orders manually or convert from quotations</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="bg-light">
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Status</th>
              <th class="text-end">Amount</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr>
                <td>
                  <div class="fw-bold">${order.order_number}</div>
                  <small class="text-muted">#${order.id}</small>
                </td>
                <td>
                  <div>${order.customer?.name || 'N/A'}</div>
                  <small class="text-muted">${order.customer?.email || ''}</small>
                </td>
                <td>
                  <div>${new Date(order.order_date).toLocaleDateString()}</div>
                  <small class="text-muted">${new Date(order.order_date).toLocaleTimeString()}</small>
                </td>
                <td>
                  <span class="badge ${getOrderStatusBadge(order.status)}">${order.status}</span>
                </td>
                <td class="text-end">
                  <div class="fw-bold">₹${formatNumber(order.total_amount)}</div>
                  <small class="text-muted">${order.currency}</small>
                </td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewSalesOrder(${order.id})" title="View">
                      <i class="bi bi-eye"></i>
                    </button>
                    ${order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? `
                      <button class="btn btn-outline-secondary" onclick="editSalesOrder(${order.id})" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                    ` : ''}
                    <div class="btn-group">
                      <button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" 
                              data-bs-toggle="dropdown" style="position: static;">
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end" style="z-index: 1050;">
                        <li><a class="dropdown-item" href="#" onclick="viewSalesOrderPDF(${order.id})">
                          <i class="bi bi-eye me-2"></i>View PDF
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="downloadSalesOrderPDF(${order.id})">
                          <i class="bi bi-file-pdf me-2"></i>Download PDF
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${order.id})">
                          <i class="bi bi-arrow-repeat me-2"></i>Update Status
                        </a></li>
                        ${order.status !== 'SHIPPED' && order.status !== 'DELIVERED' ? `
                          <li><a class="dropdown-item text-danger" href="#" onclick="deleteSalesOrder(${order.id})">
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

    // Load customers for filter
    loadCustomersForFilter();
  } catch (error) {
    console.error("Error loading sales orders:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load sales orders. ${error.response?.data?.detail || error.message}
      </div>
    `;
  }
}

// Get order status badge class
function getOrderStatusBadge(status) {
  const badges = {
    'PENDING': 'bg-warning',
    'CONFIRMED': 'bg-info',
    'PROCESSING': 'bg-primary',
    'SHIPPED': 'bg-success',
    'DELIVERED': 'bg-success',
    'CANCELLED': 'bg-danger'
  };
  return badges[status] || 'bg-secondary';
}

// Format number
function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num || 0);
}

// Load customers for filter
async function loadCustomersForFilter() {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${apiBase}/mango/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const select = document.getElementById('filter-customer');
    if (select) {
      select.innerHTML = '<option value="">All Customers</option>' +
        (response.data || []).map(c => 
          `<option value="${c.id}">${c.name} ${c.customer_code ? `(${c.customer_code})` : ''}</option>`
        ).join('');
    }
  } catch (error) {
    console.error("Error loading customers:", error);
  }
}

// View sales order
async function viewSalesOrder(orderId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${apiBase}/mango/sales-orders/${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const order = response.data;
    
    Swal.fire({
      title: `Sales Order ${order.order_number}`,
      html: `
        <div class="text-start">
          <div class="row mb-3">
            <div class="col-md-6">
              <strong>Customer:</strong> ${order.customer?.name || 'N/A'}<br>
              <strong>Email:</strong> ${order.customer?.email || '-'}<br>
              <strong>Phone:</strong> ${order.customer?.phone || '-'}
            </div>
            <div class="col-md-6">
              <strong>Order Date:</strong> ${new Date(order.order_date).toLocaleDateString()}<br>
              <strong>Delivery Date:</strong> ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}<br>
              <strong>Status:</strong> <span class="badge ${getOrderStatusBadge(order.status)}">${order.status}</span>
            </div>
          </div>
          ${order.shipping_address ? `<div class="mb-3"><strong>Shipping Address:</strong><br>${order.shipping_address}</div>` : ''}
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.description || 'N/A'}</td>
                    <td>${item.quantity}</td>
                    <td>₹${formatNumber(item.unit_price)}</td>
                    <td>₹${formatNumber(item.line_total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-end"><strong>Total:</strong></td>
                  <td><strong>₹${formatNumber(order.total_amount)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `,
      width: '800px',
      showCancelButton: true,
      confirmButtonText: "Edit Order",
      cancelButtonText: "Close",
      showDenyButton: true,
      denyButtonText: "View PDF"
    }).then((result) => {
      if (result.isConfirmed) {
        editSalesOrder(orderId);
      } else if (result.isDenied) {
        viewSalesOrderPDF(orderId);
      }
    });
  } catch (error) {
    console.error("Error viewing order:", error);
    Swal.fire("Error", "Failed to load order details", "error");
  }
}

// Edit sales order
function editSalesOrder(orderId) {
  Swal.fire("Info", "Edit functionality coming soon. For now, you can update status or delete the order.", "info");
}

// View sales order PDF
async function viewSalesOrderPDF(orderId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/sales-orders/${orderId}/pdf?view=true`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      Swal.fire("Error", "Please allow popups to view the PDF", "error");
      return;
    }
    
    printWindow.document.write(response.data);
    printWindow.document.close();
  } catch (error) {
    console.error("Error viewing PDF:", error);
    Swal.fire("Error", "Failed to open PDF", "error");
  }
}

// Download sales order PDF
async function downloadSalesOrderPDF(orderId) {
  try {
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const token = localStorage.getItem("access_token");
    
    const response = await axios.get(
      `${apiBase}/mango/sales-orders/${orderId}/pdf/download`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      }
    );
    
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SalesOrder_${orderId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    Swal.fire("Success", "PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error downloading PDF:", error);
    Swal.fire("Error", "Failed to download PDF", "error");
  }
}

// Update order status
async function updateOrderStatus(orderId) {
  const { value: status } = await Swal.fire({
    title: "Update Order Status",
    input: "select",
    inputOptions: {
      "PENDING": "Pending",
      "CONFIRMED": "Confirmed",
      "PROCESSING": "Processing",
      "SHIPPED": "Shipped",
      "DELIVERED": "Delivered",
      "CANCELLED": "Cancelled"
    },
    showCancelButton: true,
    confirmButtonText: "Update",
    inputValidator: (value) => {
      if (!value) {
        return "Please select a status";
      }
    }
  });

  if (status) {
    try {
      const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${apiBase}/mango/sales-orders/${orderId}/update-status?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", "Order status updated successfully", "success");
      loadSalesOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire("Error", error.response?.data?.detail || "Failed to update status", "error");
    }
  }
}

// Delete sales order
async function deleteSalesOrder(orderId) {
  const result = await Swal.fire({
    title: "Delete Order?",
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
        `${apiBase}/mango/sales-orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", "Order deleted successfully", "success");
      loadSalesOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      Swal.fire("Error", error.response?.data?.detail || "Failed to delete order", "error");
    }
  }
}

// Clear order filters
function clearOrderFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-customer').value = '';
  document.getElementById('filter-from-date').value = '';
  document.getElementById('filter-to-date').value = '';
  document.getElementById('search-orders').value = '';
  loadSalesOrders();
}

// Export sales orders
function exportSalesOrders() {
  Swal.fire("Info", "Export functionality coming soon!", "info");
}

/**
 * Populate channel selector with custom channels from API
 */
async function populateChannelSelector() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const channels = response.data.channels || [];
    const customGroup = document.getElementById("custom-channels-group");
    const selector = document.getElementById("platform-select");
    
    if (customGroup && selector) {
      if (channels.length === 0) {
        customGroup.innerHTML = '<option value="" disabled>No channels found. Create a channel in Channel Settings.</option>';
        // Disable upload button if no channels
        const uploadBtn = document.getElementById("upload-btn");
        if (uploadBtn) {
          uploadBtn.disabled = true;
        }
      } else {
        const iconMap = {
          marketplace: "🛒",
          website: "🌐",
          pos: "💳",
          api: "🔌",
          custom: "🔧"
        };
        
        customGroup.innerHTML = channels.map(channel => {
          const icon = iconMap[channel.channel_type] || "🔧";
          return `<option value="channel_${channel.id}">${icon} ${channel.channel_name}</option>`;
        }).join('');
      }
    }
  } catch (error) {
    console.error("Failed to load channels:", error);
    const customGroup = document.getElementById("custom-channels-group");
    if (customGroup) {
      customGroup.innerHTML = '<option value="" disabled>Error loading channels. Please refresh the page.</option>';
    }
  }
}

/**
 * Handle platform change
 */
function handlePlatformChange() {
  const platform = document.getElementById("platform-select").value;
  channelOrderState.selectedPlatform = platform;

  // Hide platform help (only custom channels now)
  const helpCard = document.getElementById("platform-help");
  if (helpCard) {
    helpCard.style.display = "none";
  }

  updateUploadButton();
}

/**
 * Show platform-specific help
 */
function showPlatformHelp(platform) {
  const helpCard = document.getElementById("platform-help");
  const helpContent = document.getElementById("platform-help-content");

  const guides = {
    amazon: `
      <p class="small mb-2"><strong>How to get Amazon sales report:</strong></p>
      <ol class="small mb-0">
        <li>Login to Amazon Seller Central</li>
        <li>Go to Reports → Order Reports</li>
        <li>Select "All Orders" report</li>
        <li>Download as CSV</li>
      </ol>
    `,
    flipkart: `
      <p class="small mb-2"><strong>How to get Flipkart sales report:</strong></p>
      <ol class="small mb-0">
        <li>Login to Flipkart Seller Hub</li>
        <li>Go to Orders → Download Orders</li>
        <li>Select date range</li>
        <li>Download as Excel/CSV</li>
      </ol>
    `,
    meesho: `
      <p class="small mb-2"><strong>How to get Meesho sales report:</strong></p>
      <ol class="small mb-0">
        <li>Login to Meesho Supplier Panel</li>
        <li>Go to Orders section</li>
        <li>Export orders</li>
        <li>Download CSV file</li>
      </ol>
    `,
    custom: `
      <p class="small mb-2"><strong>Custom CSV Format:</strong></p>
      <p class="small">Your CSV should include these columns:</p>
      <ul class="small mb-0">
        <li>Order ID</li>
        <li>Order Date</li>
        <li>Customer Name</li>
        <li>Product Details</li>
        <li>Quantity & Price</li>
        <li>Shipping Address</li>
      </ul>
    `,
  };

  helpContent.innerHTML = guides[platform] || "";
  helpCard.style.display = platform ? "block" : "none";
}

/**
 * Handle file drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add("border-primary", "bg-light");
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("border-primary", "bg-light");
}

/**
 * Handle file drop
 */
function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("border-primary", "bg-light");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

/**
 * Handle file select from input
 */
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

/**
 * Process selected file
 */
function processFile(file) {
  // Validate file type
  const validTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (
    !validTypes.includes(file.type) &&
    !file.name.match(/\.(csv|xlsx|xls)$/i)
  ) {
    Swal.fire({
      icon: "error",
      title: "Invalid File Type",
      text: "Please upload a CSV or Excel file",
    });
    return;
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "File Too Large",
      text: "File size must be less than 10MB",
    });
    return;
  }

  channelOrderState.selectedFile = file;

  // Show file info
  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = formatFileSize(file.size);
  document.getElementById("file-info").style.display = "block";

  updateUploadButton();
}

/**
 * Clear selected file
 */
function clearFile() {
  channelOrderState.selectedFile = null;
  document.getElementById("file-input").value = "";
  document.getElementById("file-info").style.display = "none";
  document.getElementById("preview-container").innerHTML = `
    <div class="text-center text-muted py-5">
      <i class="bi bi-table display-1 d-block mb-3"></i>
      <p class="mb-0">Upload a file to preview data</p>
    </div>
  `;
  updateUploadButton();
}

/**
 * Update upload button state
 */
function updateUploadButton() {
  const btn = document.getElementById("upload-btn");
  btn.disabled =
    !channelOrderState.selectedFile || !channelOrderState.selectedPlatform;
}

/**
 * Upload and preview file
 */
async function uploadFile() {
  if (!channelOrderState.selectedFile || !channelOrderState.selectedPlatform) {
    return;
  }

  Swal.fire({
    title: "Uploading...",
    text: "Please wait while we process your file",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const formData = new FormData();
    formData.append("file", channelOrderState.selectedFile);
    formData.append("platform", channelOrderState.selectedPlatform);

    const response = await axios.post(
      `${API_BASE_URL}/api/mango/channels/import-orders`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    Swal.close();

    channelOrderState.previewData = response.data;
    renderPreview(response.data);
  } catch (error) {
    Swal.close();
    console.error("Upload error:", error);
    Swal.fire({
      icon: "error",
      title: "Upload Failed",
      text: error.response?.data?.detail || "Failed to upload file",
    });
  }
}

/**
 * Render data preview
 */
function renderPreview(data) {
  const container = document.getElementById("preview-container");

  if (!data || !data.preview || data.preview.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No data found in file
      </div>
    `;
    return;
  }

  const headers = Object.keys(data.preview[0]);
  const previewRows = data.preview.slice(0, 5); // Show first 5 rows

  container.innerHTML = `
    <div class="alert alert-success mb-3">
      <i class="bi bi-check-circle me-2"></i>
      <strong>File processed successfully!</strong><br>
      <small>Found ${data.total_rows} rows, showing preview of first 5</small>
    </div>
    
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead class="table-light">
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${previewRows
            .map(
              (row) => `
            <tr>
              ${headers.map((h) => `<td>${row[h] || "-"}</td>`).join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="d-grid gap-2 mt-3">
      <button class="btn btn-success btn-lg" onclick="confirmImport()">
        <i class="bi bi-check2-circle me-2"></i>Confirm Import (${
          data.total_rows
        } orders)
      </button>
      <button class="btn btn-outline-secondary" onclick="clearFile()">
        <i class="bi bi-x-circle me-2"></i>Cancel
      </button>
    </div>
  `;
}

/**
 * Confirm and execute import
 */
async function confirmImport() {
  if (!channelOrderState.previewData) return;

  const result = await Swal.fire({
    title: "Confirm Import",
    html: `
      <p>You are about to import <strong>${
        channelOrderState.previewData.total_rows
      }</strong> orders from <strong>${channelOrderState.selectedPlatform.toUpperCase()}</strong></p>
      <p class="text-muted small">This action cannot be undone. Duplicate orders will be skipped.</p>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Import Orders",
    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: "Importing Orders...",
    html: "Please wait, this may take a few moments",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/mango/channels/import`,
      {
        file_id: channelOrderState.previewData.file_id,
        platform: channelOrderState.selectedPlatform,
      }
    );

    Swal.fire({
      icon: "success",
      title: "Import Successful!",
      html: `
        <p><strong>${
          response.data.success_count
        }</strong> orders imported successfully</p>
        ${
          response.data.failed_count > 0
            ? `<p class="text-warning">${response.data.failed_count} orders failed</p>`
            : ""
        }
        ${
          response.data.duplicate_count > 0
            ? `<p class="text-muted">${response.data.duplicate_count} duplicates skipped</p>`
            : ""
        }
      `,
      timer: 5000,
    });

    // Reset state
    clearFile();

    // Reload to show imported orders
    loadSection("sales_orders");
  } catch (error) {
    Swal.close();
    console.error("Import error:", error);
    Swal.fire({
      icon: "error",
      title: "Import Failed",
      text: error.response?.data?.detail || "Failed to import orders",
    });
  }
}

/**
 * Load import history
 */
async function loadImportHistory() {
  Swal.fire({
    title: "Import History",
    html: '<div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading...</p>',
    showConfirmButton: false,
    allowOutsideClick: false,
  });

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/imports`
    );

    const historyHTML = `
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Platform</th>
              <th>File</th>
              <th>Status</th>
              <th>Results</th>
            </tr>
          </thead>
          <tbody>
            ${response.data
              .map(
                (imp) => `
              <tr>
                <td>${new Date(imp.imported_at).toLocaleString()}</td>
                <td><span class="badge bg-secondary">${imp.platform}</span></td>
                <td>${imp.file_name}</td>
                <td><span class="badge bg-${getStatusColor(imp.status)}">${
                  imp.status
                }</span></td>
                <td>
                  <small>
                    <span class="text-success">${
                      imp.success_count
                    } success</span> / 
                    <span class="text-danger">${imp.failed_count} failed</span>
                  </small>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: "Import History",
      html: historyHTML,
      width: "800px",
      confirmButtonText: "Close",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to load import history",
    });
  }
}

/**
 * Load platform list
 */
function loadPlatformList() {
  // Platform list is hardcoded for now
  // Can be made dynamic by fetching from backend
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get status color
 */
function getStatusColor(status) {
  const colors = {
    pending: "warning",
    processing: "info",
    completed: "success",
    failed: "danger",
  };
  return colors[status] || "secondary";
}

/**
 * Open channel settings modal
 */
async function openChannelSettings() {
  const settingsHTML = `
    <div class="container-fluid">
      <!-- Platform Selector -->
      <div class="mb-3">
        <label class="form-label fw-bold">Configure Channel:</label>
        <select class="form-select" id="settings-platform-select" onchange="loadChannelFields()">
          <option value="">-- Select Channel --</option>
          <option value="amazon">Amazon</option>
          <option value="flipkart">Flipkart</option>
          <option value="meesho">Meesho</option>
          <option value="myntra">Myntra</option>
          <option value="shopify">Shopify</option>
        </select>
      </div>

      <!-- Tabs for Settings Sections -->
      <ul class="nav nav-pills mb-3" id="settingsTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="fields-tab" data-bs-toggle="pill" 
                  data-bs-target="#fields-panel" type="button" role="tab">
            <i class="bi bi-list-columns me-1"></i>Custom Fields
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="mapping-tab" data-bs-toggle="pill" 
                  data-bs-target="#mapping-panel" type="button" role="tab">
            <i class="bi bi-arrow-left-right me-1"></i>Import Mapping
          </button>
        </li>
      </ul>

      <!-- Tab Content -->
      <div class="tab-content" id="settingsTabContent">
        <!-- Custom Fields Panel -->
        <div class="tab-pane fade show active" id="fields-panel" role="tabpanel">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span>Custom Fields</span>
              <button class="btn btn-sm btn-primary" onclick="addCustomField()">
                <i class="bi bi-plus me-1"></i>Add Field
              </button>
            </div>
            <div class="card-body">
              <div id="custom-fields-container">
                <p class="text-muted text-center py-3">Select a channel to manage custom fields</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Import Mapping Panel -->
        <div class="tab-pane fade" id="mapping-panel" role="tabpanel">
          <div class="card">
            <div class="card-header">CSV Column Mappings</div>
            <div class="card-body">
              <div id="column-mappings-container">
                <p class="text-muted text-center py-3">Select a channel to configure import mappings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    title: '<i class="bi bi-sliders me-2"></i>Channel Settings',
    html: settingsHTML,
    width: "900px",
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check2-circle me-2"></i>Save Settings',
    cancelButtonText: "Close",
    customClass: {
      popup: "channel-settings-modal",
    },
    preConfirm: () => {
      return saveChannelSettings();
    },
  });
}

/**
 * Load channel fields for selected platform
 */
async function loadChannelFields() {
  const platform = document.getElementById("settings-platform-select").value;

  if (!platform) {
    document.getElementById("custom-fields-container").innerHTML =
      '<p class="text-muted text-center py-3">Select a channel to manage custom fields</p>';
    return;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/fields`,
      {
        params: { platform },
      }
    );

    renderCustomFields(response.data.fields || []);
    renderColumnMappings(response.data.mappings || []);
  } catch (error) {
    console.error("Error loading fields:", error);
    // If no fields exist, show empty state
    renderCustomFields([]);
    renderColumnMappings([]);
  }
}

/**
 * Render custom fields list
 */
function renderCustomFields(fields) {
  const container = document.getElementById("custom-fields-container");

  if (fields.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="bi bi-inbox display-4 d-block mb-2"></i>
        <p>No custom fields defined yet. Click "Add Field" to create one.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Field Name</th>
          <th>Field Key</th>
          <th>Type</th>
          <th>Required</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${fields
          .map(
            (field) => `
          <tr data-field-id="${field.id}">
            <td>${field.field_name}</td>
            <td><code>${field.field_key}</code></td>
            <td><span class="badge bg-secondary">${field.field_type}</span></td>
            <td>${
              field.is_required
                ? '<i class="bi bi-check-circle text-success"></i>'
                : "-"
            }</td>
            <td>
              <button class="btn btn-sm btn-outline-primary" onclick="editCustomField(${
                field.id
              })">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomField(${
                field.id
              })">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/**
 * Render column mappings
 */
function renderColumnMappings(mappings) {
  const container = document.getElementById("column-mappings-container");

  if (mappings.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        <p>No column mappings defined. These will be created during import.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>CSV Column</th>
          <th>→</th>
          <th>Maps To</th>
          <th>Transform</th>
        </tr>
      </thead>
      <tbody>
        ${mappings
          .map(
            (mapping) => `
          <tr>
            <td><code>${mapping.csv_column}</code></td>
            <td class="text-center"><i class="bi bi-arrow-right"></i></td>
            <td><strong>${mapping.maps_to_field}</strong></td>
            <td>${mapping.transform_rule || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/**
 * Add new custom field
 */
async function addCustomField() {
  const platform = document.getElementById("settings-platform-select").value;

  if (!platform) {
    Swal.fire({
      icon: "warning",
      title: "Select Channel First",
      text: "Please select a channel before adding fields",
    });
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: "Add Custom Field",
    html: `
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label">Field Name *</label>
          <input type="text" id="field-name" class="form-control" placeholder="e.g., AWB Number">
        </div>
        <div class="mb-3">
          <label class="form-label">Field Type *</label>
          <select id="field-type" class="form-select">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean (Yes/No)</option>
            <option value="dropdown">Dropdown</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">
            <input type="checkbox" id="field-required"> Required Field
          </label>
        </div>
        <div class="mb-3">
          <label class="form-label">Default Value (Optional)</label>
          <input type="text" id="field-default" class="form-control">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Add Field",
    preConfirm: () => {
      const fieldName = document.getElementById("field-name").value;
      const fieldType = document.getElementById("field-type").value;

      if (!fieldName) {
        Swal.showValidationMessage("Field name is required");
        return false;
      }

      return {
        field_name: fieldName,
        field_type: fieldType,
        is_required: document.getElementById("field-required").checked,
        default_value: document.getElementById("field-default").value,
      };
    },
  });

  if (formValues) {
    try {
      await axios.post(`${API_BASE_URL}/api/mango/channels/fields`, {
        platform,
        ...formValues,
      });

      Swal.fire({
        icon: "success",
        title: "Field Added!",
        text: `${formValues.field_name} has been added`,
        timer: 2000,
      });

      loadChannelFields();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          "Failed to add field: " +
          (error.response?.data?.detail || error.message),
      });
    }
  }
}

/**
 * Delete custom field
 */
async function deleteCustomField(fieldId) {
  const result = await Swal.fire({
    title: "Delete Field?",
    text: "This will remove the field definition. Existing data will not be affected.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Delete",
    confirmButtonColor: "#dc3545",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/fields/${fieldId}`
      );
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 2000,
      });
      loadChannelFields();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete field",
      });
    }
  }
}

/**
 * Save channel settings
 */
async function saveChannelSettings() {
  const platform = document.getElementById("settings-platform-select").value;

  if (!platform) {
    Swal.showValidationMessage("Please select a channel");
    return false;
  }

  return true;
}

/**
 * Upload and import orders
 */
async function uploadAndImportOrders() {
  const platformValue = document.getElementById("platform-select").value;
  const fileInput = document.getElementById("file-input");

  if (!platformValue) {
    Swal.fire({
      icon: "warning",
      title: "Select Platform",
      text: "Please select a platform first",
    });
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No File Selected",
      text: "Please select a file to upload",
    });
    return;
  }

  const file = fileInput.files[0];

  Swal.fire({
    title: "Importing Orders...",
    text: "Please wait while we process your file",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const formData = new FormData();
    formData.append("file", file);

    // All selections are now custom channels
    if (!platformValue.startsWith("channel_")) {
      Swal.fire({
        icon: "error",
        title: "Invalid Selection",
        text: "Please select a valid channel",
      });
      return;
    }
    
    // Extract channel ID
    const channelId = platformValue.replace("channel_", "");
    const apiUrl = `${API_BASE_URL}/api/mango/channels/${channelId}/import-orders`;

    const response = await axios.post(
      apiUrl,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    Swal.fire({
      icon: "success",
      title: "Import Complete!",
      html: `
        <p><strong>${
          response.data.imported_count
        }</strong> orders imported successfully</p>
        ${
          response.data.failed_count > 0
            ? `<p class="text-danger">${response.data.failed_count} orders failed</p>`
            : ""
        }
      `,
      confirmButtonText: "View Orders",
    }).then(() => {
      // Switch to order list tab
      document.getElementById("list-tab").click();
    });

    // Clear file input
    fileInput.value = "";
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Import Failed",
      text: error.response?.data?.detail || "Failed to import orders",
    });
  }
}

// Order List State
const orderListState = {
  orders: [],
  filteredOrders: [],
  currentPage: 1,
  ordersPerPage: 20,
  filters: {
    channel: "",
    status: "",
    fromDate: "",
    toDate: "",
    search: "",
  },
};

/**
 * Load orders from backend
 */
async function loadOrders() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/orders`
    );
    orderListState.orders = response.data.orders || [];
    orderListState.filteredOrders = [...orderListState.orders];
    renderOrdersTable();
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

/**
 * Filter orders based on selected filters
 */
function filterOrders() {
  // Get filter values
  orderListState.filters.channel =
    document.getElementById("filter-channel").value;
  orderListState.filters.status =
    document.getElementById("filter-status").value;
  orderListState.filters.fromDate =
    document.getElementById("filter-from-date").value;
  orderListState.filters.toDate =
    document.getElementById("filter-to-date").value;
  orderListState.filters.search = document
    .getElementById("search-orders")
    .value.toLowerCase();

  // Apply filters
  orderListState.filteredOrders = orderListState.orders.filter((order) => {
    // Channel filter
    if (
      orderListState.filters.channel &&
      order.source_platform !== orderListState.filters.channel
    ) {
      return false;
    }

    // Status filter
    if (
      orderListState.filters.status &&
      order.order_status !== orderListState.filters.status
    ) {
      return false;
    }

    // Date filters
    if (orderListState.filters.fromDate) {
      const orderDate = new Date(order.created_at);
      const fromDate = new Date(orderListState.filters.fromDate);
      if (orderDate < fromDate) return false;
    }
    if (orderListState.filters.toDate) {
      const orderDate = new Date(order.created_at);
      const toDate = new Date(orderListState.filters.toDate);
      if (orderDate > toDate) return false;
    }

    // Search filter
    if (orderListState.filters.search) {
      const searchTerm = orderListState.filters.search;
      if (
        !order.platform_order_id?.toLowerCase().includes(searchTerm) &&
        !order.customer_name?.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }
    }

    return true;
  });

  orderListState.currentPage = 1;
  renderOrdersTable();
}

/**
 * Clear all filters
 */
function clearFilters() {
  document.getElementById("filter-channel").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-from-date").value = "";
  document.getElementById("filter-to-date").value = "";
  document.getElementById("search-orders").value = "";

  orderListState.filters = {
    channel: "",
    status: "",
    fromDate: "",
    toDate: "",
    search: "",
  };

  orderListState.filteredOrders = [...orderListState.orders];
  orderListState.currentPage = 1;
  renderOrdersTable();
}

/**
 * Render orders table
 */
function renderOrdersTable() {
  const container = document.getElementById("orders-table-container");

  if (!container) return;

  if (orderListState.filteredOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3"></i>
        <p class="mb-0">No orders found</p>
        <p class="small">Try adjusting your filters</p>
      </div>
    `;
    document.getElementById("orders-pagination").style.display = "none";
    return;
  }

  // Pagination
  const startIndex =
    (orderListState.currentPage - 1) * orderListState.ordersPerPage;
  const endIndex = startIndex + orderListState.ordersPerPage;
  const paginatedOrders = orderListState.filteredOrders.slice(
    startIndex,
    endIndex
  );

  // Get unique channels to determine columns
  const channels = [
    ...new Set(orderListState.filteredOrders.map((o) => o.source_platform)),
  ];

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th style="width: 40px;">#</th>
            <th>Order ID</th>
            <th>Channel</th>
            <th>Data Source</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedOrders
            .map((order, index) => {
              const channelBadges = {
                amazon: "bg-warning",
                flipkart: "bg-primary",
                meesho: "bg-danger",
                myntra: "bg-info",
                shopify: "bg-success",
              };

              const statusBadges = {
                pending: "bg-secondary",
                processing: "bg-info",
                shipped: "bg-primary",
                delivered: "bg-success",
                cancelled: "bg-danger",
              };

              const dataSourceBadge =
                order.data_source === "oms"
                  ? '<span class="badge bg-success"><i class="bi bi-cloud-check"></i> OMS</span>'
                  : '<span class="badge bg-info"><i class="bi bi-file-earmark-excel"></i> Mango</span>';

              return `
              <tr>
                <td>${startIndex + index + 1}</td>
                <td><strong>${order.platform_order_id || "N/A"}</strong></td>
                <td>
                  <span class="badge ${
                    channelBadges[order.source_platform] || "bg-secondary"
                  }">
                    ${(order.source_platform || "Unknown").toUpperCase()}
                  </span>
                </td>
                <td>${dataSourceBadge}</td>
                <td>${order.customer_name || "N/A"}</td>
                <td>
                  <span class="badge ${
                    statusBadges[order.order_status] || "bg-secondary"
                  }">
                    ${(order.order_status || "pending").toUpperCase()}
                  </span>
                </td>
                <td>${
                  order.created_at
                    ? new Date(order.created_at).toLocaleDateString()
                    : "N/A"
                }</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails(${
                    order.id
                  }, '${order.data_source}')">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="alert alert-info">
      <i class="bi bi-info-circle me-2"></i>
      Showing ${paginatedOrders.length} of ${
    orderListState.filteredOrders.length
  } orders
      ${
        orderListState.filters.channel
          ? ` from ${orderListState.filters.channel.toUpperCase()}`
          : ""
      }
    </div>
  `;

  // Render pagination
  renderPagination();
}

/**
 * Render pagination controls
 */
function renderPagination() {
  const totalPages = Math.ceil(
    orderListState.filteredOrders.length / orderListState.ordersPerPage
  );

  if (totalPages <= 1) {
    document.getElementById("orders-pagination").style.display = "none";
    return;
  }

  document.getElementById("orders-pagination").style.display = "block";
  const controls = document.getElementById("pagination-controls");

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
    <li class="page-item ${orderListState.currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="changePage(${
        orderListState.currentPage - 1
      }); return false;">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= orderListState.currentPage - 2 &&
        i <= orderListState.currentPage + 2)
    ) {
      paginationHTML += `
        <li class="page-item ${
          i === orderListState.currentPage ? "active" : ""
        }">
          <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (
      i === orderListState.currentPage - 3 ||
      i === orderListState.currentPage + 3
    ) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Next button
  paginationHTML += `
    <li class="page-item ${
      orderListState.currentPage === totalPages ? "disabled" : ""
    }">
      <a class="page-link" href="#" onclick="changePage(${
        orderListState.currentPage + 1
      }); return false;">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  controls.innerHTML = paginationHTML;
}

/**
 * Change page
 */
function changePage(page) {
  const totalPages = Math.ceil(
    orderListState.filteredOrders.length / orderListState.ordersPerPage
  );
  if (page < 1 || page > totalPages) return;

  orderListState.currentPage = page;
  renderOrdersTable();

  // Scroll to top
  document
    .getElementById("orders-table-container")
    .scrollIntoView({ behavior: "smooth" });
}

/**
 * View order details
 */
function viewOrderDetails(orderId, dataSource) {
  const order = orderListState.orders.find((o) => o.id === orderId);
  if (!order) return;

  const dataSourceBadge =
    dataSource === "oms"
      ? '<span class="badge bg-success"><i class="bi bi-cloud-check"></i> Live OMS Data</span>'
      : '<span class="badge bg-info"><i class="bi bi-file-earmark-excel"></i> Excel Upload (Mango)</span>';

  Swal.fire({
    title: `Order: ${order.platform_order_id}`,
    html: `
      <div class="text-start">
        <h6 class="fw-bold mb-2">Basic Info:</h6>
        <p class="mb-1"><strong>Data Source:</strong> ${dataSourceBadge}</p>
        <p class="mb-1"><strong>Channel:</strong> ${order.source_platform?.toUpperCase()}</p>
        <p class="mb-1"><strong>Customer:</strong> ${order.customer_name}</p>
        <p class="mb-1"><strong>Status:</strong> ${order.order_status?.toUpperCase()}</p>
        <p class="mb-3"><strong>Date:</strong> ${new Date(
          order.created_at
        ).toLocaleString()}</p>

        ${
          order.channel_data
            ? `
          <h6 class="fw-bold mb-2">Channel Data:</h6>
          <pre class="bg-light p-2 rounded small" style="max-height: 300px; overflow-y: auto;">${JSON.stringify(
            order.channel_data,
            null,
            2
          )}</pre>
        `
            : ""
        }
      </div>
    `,
    width: 700,
    confirmButtonText: "Close",
  });
}

/**
 * Export orders to Excel
 */
function exportOrders() {
  Swal.fire({
    icon: "info",
    title: "Export Feature",
    text: "Excel export will be implemented soon!",
  });
}

// Load orders when order list tab is shown
document.addEventListener("DOMContentLoaded", () => {
  const listTab = document.getElementById("list-tab");
  if (listTab) {
    // Load orders when tab is clicked
    listTab.addEventListener("shown.bs.tab", () => {
      loadOrders();
    });

    // Also load if tab is already active on page load
    if (listTab.classList.contains("active")) {
      loadOrders();
    }
  }
});
