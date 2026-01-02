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
        ${renderManualOrderPanel()}
      </div>

      <!-- Order List Panel -->
      <div class="tab-pane fade" id="list-panel" role="tabpanel">
        ${renderOrderListPanel()}
      </div>
    </div>
  `;

  // Initialize
  loadPlatformList();
  
  // Populate channels after DOM is rendered
  setTimeout(() => populateChannelSelector(), 200);
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
 * Render manual order creation panel
 */
function renderManualOrderPanel() {
  return `
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0"><i class="bi bi-plus-circle me-2"></i>Create New Order</h5>
          </div>
          <div class="card-body">
            <form id="manual-order-form">
              <!-- Customer Information -->
              <h6 class="fw-bold mb-3">Customer Information</h6>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Customer Name *</label>
                  <input type="text" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control">
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Phone *</label>
                  <input type="tel" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Platform</label>
                  <select class="form-select">
                    <option value="direct">Direct/Walk-in</option>
                    <option value="website">Website</option>
                    <option value="phone">Phone Order</option>
                  </select>
                </div>
              </div>

              <hr>

              <!-- Order Items -->
              <h6 class="fw-bold mb-3">Order Items</h6>
              <div id="order-items">
                <div class="row mb-2">
                  <div class="col-md-5">
                    <label class="form-label">Product</label>
                    <select class="form-select">
                      <option>Select Product...</option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-control" value="1" min="1">
                  </div>
                  <div class="col-md-2">
                    <label class="form-label">Price</label>
                    <input type="number" class="form-control" step="0.01">
                  </div>
                  <div class="col-md-2">
                    <label class="form-label">Total</label>
                    <input type="text" class="form-control" readonly>
                  </div>
                  <div class="col-md-1 d-flex align-items-end">
                    <button type="button" class="btn btn-sm btn-outline-danger">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline-primary mb-3">
                <i class="bi bi-plus me-2"></i>Add Item
              </button>

              <hr>

              <!-- Shipping Address -->
              <h6 class="fw-bold mb-3">Shipping Address</h6>
              <div class="mb-3">
                <label class="form-label">Address Line 1 *</label>
                <input type="text" class="form-control" required>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">City *</label>
                  <input type="text" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">State *</label>
                  <input type="text" class="form-control" required>
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Pincode *</label>
                  <input type="text" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Country</label>
                  <input type="text" class="form-control" value="India">
                </div>
              </div>

              <!-- Submit -->
              <div class="d-grid gap-2 mt-4">
                <button type="submit" class="btn btn-success btn-lg">
                  <i class="bi bi-check2-circle me-2"></i>Create Order
                </button>
                <button type="reset" class="btn btn-outline-secondary">
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm sticky-top" style="top: 20px;">
          <div class="card-header bg-light">
            <h6 class="mb-0">Order Summary</h6>
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <strong>₹0.00</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>Tax (18%):</span>
              <strong>₹0.00</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>Shipping:</span>
              <strong>₹0.00</strong>
            </div>
            <hr>
            <div class="d-flex justify-content-between">
              <strong>Total:</strong>
              <strong class="text-success">₹0.00</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render order list panel
 */
function renderOrderListPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Channel Orders</h5>
      </div>
      <div class="card-body">
        <!-- Filters -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <label class="form-label fw-bold">Filter by Channel</label>
            <select class="form-select" id="filter-channel">
              <option value="">All Channels</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
              <option value="meesho">Meesho</option>
              <option value="myntra">Myntra</option>
              <option value="shopify">Shopify</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">Filter by Status</label>
            <select class="form-select" id="filter-status">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">From Date</label>
            <input type="date" class="form-control" id="filter-from-date">
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold">To Date</label>
            <input type="date" class="form-control" id="filter-to-date">
          </div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" id="search-orders" 
                     placeholder="Search by Order ID, Customer Name...">
            </div>
          </div>
          <div class="col-md-6 text-end">
            <button class="btn btn-primary" onclick="filterOrders()">
              <i class="bi bi-funnel me-2"></i>Apply Filters
            </button>
            <button class="btn btn-outline-secondary" onclick="clearFilters()">
              <i class="bi bi-x-circle me-2"></i>Clear Filters
            </button>
            <button class="btn btn-success" onclick="exportOrders()">
              <i class="bi bi-download me-2"></i>Export to Excel
            </button>
          </div>
        </div>

        <!-- Orders Table -->
        <div id="orders-table-container">
          <div class="text-center text-muted py-5">
            <i class="bi bi-inbox display-4 d-block mb-3"></i>
            <p class="mb-0">No orders found</p>
            <p class="small">Import orders or create manually to see them here</p>
          </div>
        </div>

        <!-- Pagination -->
        <div id="orders-pagination" class="mt-4" style="display: none;">
          <nav>
            <ul class="pagination justify-content-center" id="pagination-controls">
            </ul>
          </nav>
        </div>
      </div>
    </div>
  `;
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
