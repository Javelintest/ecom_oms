/**
 * Advanced Channel Configuration Module
 * Full-page interface for managing channel settings,
 * headers, and dispatch mappings
 */

const channelConfigState = {
  currentPlatform: "amazon",
  headers: [],
  mappings: [],
  uploadedFile: null,
  detectedFields: [],
};

/**
 * Render channel settings page
 */
function renderChannelSettings(container) {
  container.innerHTML = `
    <!-- Page Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <button class="btn btn-sm btn-outline-secondary mb-2" onclick="loadSection('sales_orders')">
          <i class="bi bi-arrow-left me-2"></i>Back to Orders
        </button>
        <h2 class="fw-bold mb-1">
          <i class="bi bi-sliders me-2"></i>Channel Configuration
        </h2>
        <p class="text-muted mb-0">Manage headers, field mappings, and dispatch integration</p>
      </div>
    </div>

    <!-- Channel Selector Tabs -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body">
        <label class="form-label fw-bold">Select Channel:</label>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" name="platform" id="platform-amazon" value="amazon" checked>
          <label class="btn btn-outline-primary" for="platform-amazon" onclick="switchPlatform('amazon')">
            🛒 Amazon
          </label>

          <input type="radio" class="btn-check" name="platform" id="platform-flipkart" value="flipkart">
          <label class="btn btn-outline-primary" for="platform-flipkart" onclick="switchPlatform('flipkart')">
            🛍️ Flipkart
          </label>

          <input type="radio" class="btn-check" name="platform" id="platform-meesho" value="meesho">
          <label class="btn btn-outline-primary" for="platform-meesho" onclick="switchPlatform('meesho')">
            📦 Meesho
          </label>

          <input type="radio" class="btn-check" name="platform" id="platform-myntra" value="myntra">
          <label class="btn btn-outline-primary" for="platform-myntra" onclick="switchPlatform('myntra')">
            👗 Myntra
          </label>

          <input type="radio" class="btn-check" name="platform" id="platform-shopify" value="shopify">
          <label class="btn btn-outline-primary" for="platform-shopify" onclick="switchPlatform('shopify')">
            🛒 Shopify
          </label>
        </div>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="nav nav-tabs border-bottom mb-4" id="channel-tabs" role="tablist">
      <button class="nav-link active" id="headers-tab" data-bs-toggle="tab" 
              data-bs-target="#headers-panel" type="button">
        <i class="bi bi-list-columns me-2"></i>Headers Management
      </button>
      <button class="nav-link" id="mapping-tab" data-bs-toggle="tab" 
              data-bs-target="#mapping-panel" type="button">
        <i class="bi bi-arrow-left-right me-2"></i>Dispatch Mapping
      </button>
      <button class="nav-link" id="oms-tab" data-bs-toggle="tab" 
              data-bs-target="#oms-panel" type="button">
        <i class="bi bi-cloud-arrow-up me-2"></i>OMS Integration
      </button>
      <button class="nav-link" id="preview-tab" data-bs-toggle="tab" 
              data-bs-target="#preview-panel" type="button">
        <i class="bi bi-eye me-2"></i>Preview & Test
      </button>
    </div>

    <div class="tab-content" id="channel-tab-content">
      <!-- Headers Panel -->
      <div class="tab-pane fade show active" id="headers-panel" role="tabpanel">
        ${renderHeadersPanel()}
      </div>

      <!-- Dispatch Mapping Panel -->
      <div class="tab-pane fade" id="mapping-panel" role="tabpanel">
        ${renderMappingPanel()}
      </div>

      <!-- OMS Integration Panel -->
      <div class="tab-pane fade" id="oms-panel" role="tabpanel">
        ${renderOMSPanel()}
      </div>

      <!-- Preview Panel -->
      <div class="tab-pane fade" id="preview-panel" role="tabpanel">
        ${renderPreviewPanel()}
      </div>
    </div>
  `;

  // Load data for current platform
  loadPlatformConfiguration();
}

/**
 * Render Headers Management Panel
 */
function renderHeadersPanel() {
  return `
    <div class="row g-4">
      <!-- Excel Upload Section -->
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0"><i class="bi bi-file-earmark-excel me-2"></i>Bulk Header Creation</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Upload a sample Excel/CSV file</strong><br>
              <small>System will auto-detect columns and create headers with appropriate data types</small>
            </div>

            <!-- Upload Area -->
            <div class="border border-2 border-dashed rounded p-4 text-center mb-3" 
                 id="excel-drop-zone"
                 style="cursor: pointer; min-height: 200px;"
                 ondrop="handleExcelDrop(event)"
                 ondragover="handleDragOver(event)"
                 ondragleave="handleDragLeave(event)"
                 onclick="document.getElementById('excel-input').click()">
              <i class="bi bi-cloud-upload display-1 text-success d-block mb-3"></i>
              <h5>Drop Excel/CSV file here</h5>
              <p class="text-muted">or click to browse</p>
              <p class="small text-muted mb-0">Supports: .xlsx, .xls, .csv (Max 5MB)</p>
            </div>
            <input type="file" id="excel-input" class="d-none" 
                   accept=".xlsx,.xls,.csv" 
                   onchange="handleExcelSelect(event)">

            <!-- File Info -->
            <div id="excel-file-info" style="display: none;">
              <div class="alert alert-success d-flex align-items-center">
                <i class="bi bi-file-earmark-check me-2"></i>
                <div class="flex-grow-1">
                  <strong id="excel-file-name"></strong><br>
                  <small id="excel-file-size"></small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="clearExcelFile()">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>

            <!-- Upload Button -->
            <div class="d-grid">
              <button class="btn btn-success btn-lg" id="analyze-excel-btn" onclick="analyzeExcelFile()" disabled>
                <i class="bi bi-gear me-2"></i>Analyze & Detect Headers
              </button>
            </div>

            <!-- Detection Results -->
            <div id="detection-results" style="display: none;" class="mt-4">
              <!-- Results will be shown here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Current Headers List -->
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Current Headers</h5>
            <button class="btn btn-sm btn-primary" onclick="addHeaderManually()">
              <i class="bi bi-plus me-1"></i>Add Manually
            </button>
          </div>
          <div class="card-body">
            <div id="headers-list-container">
              <div class="text-center text-muted py-5">
                <i class="bi bi-inbox display-4 d-block mb-3"></i>
                <p class="mb-0">No headers defined yet</p>
                <p class="small">Upload an Excel file or add headers manually</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Mapping Panel
 */
function renderMappingPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0">Map Channel Fields to Dispatch Scanner</h5>
        <p class="small text-muted mb-0">Connect your channel headers with dispatch scan fields for automatic updates</p>
      </div>
      <div class="card-body">
        <div id="mappings-container">
          <div class="text-center text-muted py-5">
            <i class="bi bi-diagram-3 display-4 d-block mb-3"></i>
            <p class="mb-0">Define headers first to create mappings</p>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="saveMappings()">
          <i class="bi bi-check2-circle me-2"></i>Save Mappings
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Preview Panel
 */
function renderPreviewPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0">Configuration Preview</h5>
      </div>
      <div class="card-body">
        <div id="preview-container">
          <p class="text-muted">Configure headers and mappings to see preview</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Switch platform
 */
function switchPlatform(platform) {
  channelConfigState.currentPlatform = platform;
  loadPlatformConfiguration();
}

/**
 * Load platform configuration
 */
async function loadPlatformConfiguration() {
  const platform = channelConfigState.currentPlatform;

  try {
    const response = await axios.get(`${API_BASE_URL}/channel/fields`, {
      params: { platform },
    });

    channelConfigState.headers = response.data.fields || [];
    channelConfigState.mappings = response.data.mappings || [];

    renderHeadersList();
    renderMappingsList();
  } catch (error) {
    // Silently handle error - just show empty state
    console.log(
      "Could not load configuration (expected on first use):",
      error.message
    );
    channelConfigState.headers = [];
    channelConfigState.mappings = [];

    // Only render if containers exist (we're on the settings page)
    if (document.getElementById("headers-list-container")) {
      renderHeadersList();
    }
    if (document.getElementById("mappings-container")) {
      renderMappingsList();
    }
  }
}

/**
 * Handle Excel file selection
 */
function handleExcelSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processExcelFile(file);
  }
}

/**
 * Handle Excel file drop
 */
function handleExcelDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("border-success", "bg-light");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processExcelFile(files[0]);
  }
}

/**
 * Process Excel file
 */
function processExcelFile(file) {
  // Validate file
  const validTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  if (
    !validTypes.includes(file.type) &&
    !file.name.match(/\.(xlsx|xls|csv)$/i)
  ) {
    Swal.fire({
      icon: "error",
      title: "Invalid File",
      text: "Please upload an Excel (.xlsx, .xls) or CSV file",
    });
    return;
  }

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "File Too Large",
      text: "File size must be less than 5MB",
    });
    return;
  }

  channelConfigState.uploadedFile = file;

  // Show file info
  document.getElementById("excel-file-name").textContent = file.name;
  document.getElementById("excel-file-size").textContent = formatFileSize(
    file.size
  );
  document.getElementById("excel-file-info").style.display = "block";
  document.getElementById("analyze-excel-btn").disabled = false;
}

/**
 * Clear Excel file
 */
function clearExcelFile() {
  channelConfigState.uploadedFile = null;
  document.getElementById("excel-input").value = "";
  document.getElementById("excel-file-info").style.display = "none";
  document.getElementById("analyze-excel-btn").disabled = true;
  document.getElementById("detection-results").style.display = "none";
}

/**
 * Analyze Excel file and detect headers
 */
async function analyzeExcelFile() {
  if (!channelConfigState.uploadedFile) return;

  Swal.fire({
    title: "Analyzing File...",
    text: "Please wait while we detect headers and data types",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const formData = new FormData();
    formData.append("file", channelConfigState.uploadedFile);

    const response = await axios.post(
      `${API_BASE_URL}/channel/upload-schema?platform=${channelConfigState.currentPlatform}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    Swal.close();

    channelConfigState.detectedFields = response.data.detected_fields;
    showDetectedFields(response.data.detected_fields);
  } catch (error) {
    Swal.close();
    console.error("Analysis error:", error);
    Swal.fire({
      icon: "error",
      title: "Analysis Failed",
      text: error.response?.data?.detail || "Failed to analyze file",
    });
  }
}

/**
 * Show detected fields for review
 */
function showDetectedFields(fields) {
  const resultsDiv = document.getElementById("detection-results");

  resultsDiv.innerHTML = `
    <div class="alert alert-success">
      <i class="bi bi-check-circle me-2"></i>
      <strong>Found ${
        fields.length
      } columns!</strong> Review and create headers:
    </div>
    
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-fields" onclick="toggleAllFields(this)" checked>
            </th>
            <th>Column Name</th>
            <th>Detected Type</th>
            <th>Sample Value</th>
            <th>Required</th>
          </tr>
        </thead>
        <tbody>
          ${fields
            .map(
              (field, index) => `
            <tr>
              <td>
                <input type="checkbox" class="field-checkbox" data-index="${index}" checked>
              </td>
              <td>
                <input type="text" class="form-control form-control-sm" 
                       value="${field.suggested_field_name}" 
                       id="field-name-${index}">
              </td>
              <td>
                <select class="form-select form-select-sm" id="field-type-${index}">
                  <option value="text" ${
                    field.detected_type === "text" ? "selected" : ""
                  }>Text</option>
                  <option value="number" ${
                    field.detected_type === "number" ? "selected" : ""
                  }>Number</option>
                  <option value="date" ${
                    field.detected_type === "date" ? "selected" : ""
                  }>Date</option>
                  <option value="boolean" ${
                    field.detected_type === "boolean" ? "selected" : ""
                  }>Boolean</option>
                </select>
              </td>
              <td><small class="text-muted">${
                field.sample_values[0] || "-"
              }</small></td>
              <td>
                <input type="checkbox" id="field-required-${index}" 
                       ${field.is_required_suggestion ? "checked" : ""}>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="d-grid gap-2">
      <button class="btn btn-success btn-lg" onclick="createBulkHeaders()">
        <i class="bi bi-check2-all me-2"></i>Create Selected Headers
      </button>
      <button class="btn btn-outline-secondary" onclick="clearExcelFile()">
        Cancel
      </button>
    </div>
  `;

  resultsDiv.style.display = "block";
}

/**
 * Toggle all field checkboxes
 */
function toggleAllFields(checkbox) {
  document.querySelectorAll(".field-checkbox").forEach((cb) => {
    cb.checked = checkbox.checked;
  });
}

/**
 * Create headers in bulk from detected fields
 */
async function createBulkHeaders() {
  const selectedFields = [];

  document.querySelectorAll(".field-checkbox:checked").forEach((checkbox) => {
    const index = checkbox.dataset.index;
    selectedFields.push({
      field_name: document.getElementById(`field-name-${index}`).value,
      field_type: document.getElementById(`field-type-${index}`).value,
      is_required: document.getElementById(`field-required-${index}`).checked,
      column_name: channelConfigState.detectedFields[index].column_name,
    });
  });

  if (selectedFields.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Fields Selected",
      text: "Please select at least one field to create",
    });
    return;
  }

  Swal.fire({
    title: "Creating Headers...",
    text: `Creating ${selectedFields.length} headers`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await axios.post(
      `${API_BASE_URL}/channel/${channelConfigState.currentPlatform}/fields/bulk`,
      {
        fields: selectedFields,
      }
    );

    Swal.fire({
      icon: "success",
      title: "Headers Created!",
      text: `Successfully created ${selectedFields.length} headers`,
      timer: 2000,
    });

    // Reload configuration
    loadPlatformConfiguration();
    clearExcelFile();
  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "Creation Failed",
      text: error.response?.data?.detail || "Failed to create headers",
    });
  }
}

/**
 * Render headers list
 */
function renderHeadersList() {
  const container = document.getElementById("headers-list-container");

  if (!container) return;

  if (channelConfigState.headers.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3"></i>
        <p class="mb-0">No headers defined yet</p>
        <p class="small">Upload an Excel file or add headers manually</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th style="width: 40px;">#</th>
            <th>Header Name</th>
            <th>Field Key</th>
            <th>Type</th>
            <th>Required</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${channelConfigState.headers
            .map(
              (header, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${header.field_name}</strong></td>
              <td><code class="small">${header.field_key}</code></td>
              <td><span class="badge bg-info">${header.field_type}</span></td>
              <td>${
                header.is_required
                  ? '<i class="bi bi-check-circle text-success"></i>'
                  : "-"
              }</td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editHeader(${
                  header.id
                })">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteHeader(${
                  header.id
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
    </div>
  `;
}

/**
 * Render mappings list
 */
function renderMappingsList() {
  const container = document.getElementById("mappings-container");

  if (!container) return;

  if (channelConfigState.headers.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-diagram-3 display-4 d-block mb-3"></i>
        <p class="mb-0">Define headers first to create mappings</p>
      </div>
    `;
    return;
  }

  // Dispatch scan fields available for mapping
  const scanFields = [
    { key: "platform_order_id", name: "Platform Order ID" },
    { key: "barcode_data", name: "Barcode Data" },
    { key: "awb_number", name: "AWB Number" },
    { key: "courier_partner", name: "Courier Partner" },
    { key: "warehouse_id", name: "Warehouse ID" },
  ];

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead class="table-light">
          <tr>
            <th>Channel Field</th>
            <th style="width: 60px;" class="text-center">→</th>
            <th>Dispatch Scan Field</th>
            <th style="width: 150px;">Bidirectional</th>
          </tr>
        </thead>
        <tbody>
          ${channelConfigState.headers
            .map((header) => {
              const existingMapping = channelConfigState.mappings.find(
                (m) => m.channel_field_key === header.field_key
              );
              return `
              <tr>
                <td>
                  <strong>${header.field_name}</strong><br>
                  <small class="text-muted">${header.field_type}</small>
                </td>
                <td class="text-center">
                  <i class="bi bi-arrow-right text-primary"></i>
                </td>
                <td>
                  <select class="form-select form-select-sm mapping-select" 
                          data-channel-field="${header.field_key}">
                    <option value="">-- Not Mapped --</option>
                    ${scanFields
                      .map(
                        (sf) => `
                      <option value="${sf.key}" ${
                          existingMapping?.scan_field_key === sf.key
                            ? "selected"
                            : ""
                        }>
                        ${sf.name}
                      </option>
                    `
                      )
                      .join("")}
                  </select>
                </td>
                <td class="text-center">
                  <input type="checkbox" class="form-check-input" 
                         data-channel-field="${header.field_key}"
                         ${existingMapping?.is_bidirectional ? "checked" : ""}>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="alert alert-info mt-3">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Bidirectional Sync:</strong> When enabled, scanning will update the channel field, 
      and importing will update the dispatch field.
    </div>
  `;
}

/**
 * Save mappings
 */
async function saveMappings() {
  const mappings = [];

  document.querySelectorAll(".mapping-select").forEach((select) => {
    if (select.value) {
      const channelField = select.dataset.channelField;
      const bidirectionalCheckbox = document.querySelector(
        `input[data-channel-field="${channelField}"]`
      );

      mappings.push({
        channel_field_key: channelField,
        scan_field_key: select.value,
        is_bidirectional: bidirectionalCheckbox
          ? bidirectionalCheckbox.checked
          : false,
      });
    }
  });

  try {
    await axios.post(
      `${API_BASE_URL}/channel/${channelConfigState.currentPlatform}/mappings`,
      {
        mappings,
      }
    );

    Swal.fire({
      icon: "success",
      title: "Mappings Saved!",
      timer: 2000,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Save Failed",
      text: error.response?.data?.detail || "Failed to save mappings",
    });
  }
}

/**
 * Add header manually
 */
function addHeaderManually() {
  // This will open a form similar to the previous implementation
  Swal.fire({
    title: "Add Header Manually",
    html: `
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label">Header Name *</label>
          <input type="text" id="manual-field-name" class="form-control" placeholder="e.g., SKU">
        </div>
        <div class="mb-3">
          <label class="form-label">Field Type *</label>
          <select id="manual-field-type" class="form-select">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>
        <div class="mb-3">
          <label>
            <input type="checkbox" id="manual-field-required"> Required Field
          </label>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Add Header",
    preConfirm: () => {
      const fieldName = document.getElementById("manual-field-name").value;
      if (!fieldName) {
        Swal.showValidationMessage("Header name is required");
        return false;
      }
      return {
        field_name: fieldName,
        field_type: document.getElementById("manual-field-type").value,
        is_required: document.getElementById("manual-field-required").checked,
      };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await axios.post(
          `${API_BASE_URL}/channel/${channelConfigState.currentPlatform}/fields/bulk`,
          {
            fields: [result.value],
          }
        );

        Swal.fire({
          icon: "success",
          title: "Header Added!",
          timer: 2000,
        });

        loadPlatformConfiguration();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to add header",
        });
      }
    }
  });
}

/**
 * Delete header
 */
async function deleteHeader(headerId) {
  const result = await Swal.fire({
    title: "Delete Header?",
    text: "This will remove the header definition",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Delete",
    confirmButtonColor: "#dc3545",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(`${API_BASE_URL}/channel/fields/${headerId}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 2000,
      });
      loadPlatformConfiguration();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete header",
      });
    }
  }
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
 * Render OMS Integration Panel
 */
function renderOMSPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="bi bi-cloud-arrow-up me-2"></i>OMS Platform Integration</h5>
      </div>
      <div class="card-body">
        <!-- Info Section -->
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Hybrid Order Management</h6>
          <p class="mb-2">Toggle between two modes for each platform:</p>
          <ul class="mb-2">
            <li><strong>OMS Sync OFF (Default)</strong>: Use Excel uploads with custom fields (Mango System)</li>
            <li><strong>OMS Sync ON</strong>: Live integration with main OMS platform for real-time orders</li>
          </ul>
          <small class="text-muted">You can enable different modes for different platforms!</small>
        </div>

        <!-- Platform Toggles -->
        <div id="oms-config-container">
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading OMS configuration...</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load OMS Configuration
 */
async function loadOMSConfig() {
  try {
    const response = await axios.get(`${API_BASE_URL}/channel/oms-config`);
    renderOMSConfig(response.data.configs);
  } catch (error) {
    console.error("Error loading OMS config:", error);
    document.getElementById("oms-config-container").innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load OMS configuration
      </div>
    `;
  }
}

/**
 * Render OMS Configuration
 */
function renderOMSConfig(configs) {
  const container = document.getElementById("oms-config-container");

  const platformIcons = {
    amazon: "bi-amazon",
    flipkart: "bi-cart",
    meesho: "bi-bag",
    myntra: "bi-shop",
    shopify: "bi-cart3",
  };

  const platformColors = {
    amazon: "warning",
    flipkart: "primary",
    meesho: "danger",
    myntra: "info",
    shopify: "success",
  };

  container.innerHTML = configs
    .map(
      (config) => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-3">
            <h6 class="mb-0">
              <i class="bi ${
                platformIcons[config.platform] || "bi-shop"
              } me-2 text-${platformColors[config.platform]}"></i>
              ${
                config.platform.charAt(0).toUpperCase() +
                config.platform.slice(1)
              }
            </h6>
          </div>
          <div class="col-md-4">
            <div class="d-flex align-items-center">
              <span class="badge ${
                config.sync_enabled ? "bg-success" : "bg-secondary"
              } me-2">
                ${config.sync_enabled ? "🟢 OMS Sync ON" : "🔴 OMS Sync OFF"}
              </span>
              <small class="text-muted">
                ${
                  config.sync_enabled
                    ? "Using live OMS data"
                    : "Using Excel uploads"
                }
              </small>
            </div>
          </div>
          <div class="col-md-3">
            ${
              config.last_sync_at
                ? `
              <small class="text-muted">
                Last sync: ${new Date(config.last_sync_at).toLocaleString()}
              </small>
            `
                : `
              <small class="text-muted">Never synced</small>
            `
            }
          </div>
          <div class="col-md-2 text-end">
            <div class="form-check form-switch">
              <input 
                class="form-check-input" 
                type="checkbox" 
                id="oms-toggle-${config.platform}"
                ${config.sync_enabled ? "checked" : ""}
                onchange="toggleOMSSync('${config.platform}', this.checked)"
                style="width: 3em; height: 1.5em; cursor: pointer;">
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/**
 * Toggle OMS Sync
 */
async function toggleOMSSync(platform, enable) {
  const checkbox = document.getElementById(`oms-toggle-${platform}`);
  const originalState = !enable;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/channel/oms-config/toggle`,
      {
        platform: platform,
        enable_sync: enable,
      }
    );

    Swal.fire({
      icon: "success",
      title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${
        enable ? "Connected" : "Disconnected"
      }`,
      text: response.data.message,
      timer: 2000,
      showConfirmButton: false,
    });

    // Reload config to update UI
    loadOMSConfig();
  } catch (error) {
    // Revert checkbox on error
    checkbox.checked = originalState;

    Swal.fire({
      icon: "error",
      title: "Toggle Failed",
      text: error.response?.data?.detail || "Failed to toggle OMS sync",
    });
  }
}

// Load OMS config when OMS tab is shown
document.addEventListener("DOMContentLoaded", () => {
  const omsTab = document.getElementById("oms-tab");
  if (omsTab) {
    omsTab.addEventListener("shown.bs.tab", () => {
      loadOMSConfig();
    });
  }
});
