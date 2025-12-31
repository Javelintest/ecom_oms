/**
 * Enhanced Professional Field Configuration Modal
 * Complete implementation with visual selectors and advanced features
 */

/**
 * Show enhanced field configuration modal with professional design
 */
function showEnhancedFieldModal(fieldData = null) {
  const isEdit = fieldData !== null;
  const field = fieldData || {
    name: "",
    type: "VARCHAR(255)",
    required: false,
    unique: false,
    primary_key: false,
    auto_increment: false,
    indexed: false,
    validation: "none",
    validation_pattern: "",
    min_value: "",
    max_value: "",
    min_length: "",
    max_length: "",
    defaultValue: "",
    description: "",
  };

  const existingModal = document.getElementById("enhancedFieldModal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.className = "modal fade show d-block";
  modal.style.backgroundColor = "rgba(0,0,0,0.7)";
  modal.id = "enhancedFieldModal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", "fieldModalTitle");

  modal.innerHTML = `
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content shadow-lg border-0">
        <div class="modal-header bg-gradient text-white border-0" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div>
            <h5 class="modal-title mb-0" id="fieldModalTitle">
              <i class="bi bi-gear-fill me-2"></i>${
                isEdit ? "Edit" : "Configure"
              } Field
            </h5>
            <small class="text-white-50">Define field properties, validation, and constraints</small>
          </div>
          <button type="button" class="btn-close btn-close-white" onclick="closeEnhancedFieldModal()"></button>
        </div>
        
        <div class="modal-body p-0">
          <!-- Tabs Navigation -->
          <ul class="nav nav-tabs nav-fill border-0 bg-light" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="basic-tab" data-bs-toggle="tab" data-bs-target="#basic-panel" type="button" role="tab">
                <i class="bi bi-pencil-square me-2"></i>Basic Info
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="validation-tab" data-bs-toggle="tab" data-bs-target="#validation-panel" type="button" role="tab">
                <i class="bi bi-shield-check me-2"></i>Validation
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="constraints-tab" data-bs-toggle="tab" data-bs-target="#constraints-panel" type="button" role="tab">
                <i class="bi bi-lock-fill me-2"></i>Constraints
              </button>
            </li>
          </ul>
          
          <div class="tab-content p-4" style="min-height: 500px;">
            <!-- Basic Info Tab -->
            <div class="tab-pane fade show active" id="basic-panel" role="tabpanel">
              <form id="enhanced-field-form">
                <!-- Field Name -->
                <div class="mb-4">
                  <label class="form-label fw-bold">Field Name <span class="text-danger">*</span></label>
                  <input type="text" class="form-control form-control-lg" id="enhanced-field-name" 
                         value="${
                           field.name
                         }" placeholder="e.g., order_id, customer_email" required>
                  <small class="form-text text-muted">
                    <i class="bi bi-info-circle"></i> Use lowercase letters, numbers, and underscores only
                  </small>
                </div>
                
                <!-- Data Type Selector - Visual Grid -->
                <div class="mb-4">
                  <label class="form-label fw-bold">Data Type <span class="text-danger">*</span></label>
                  <div class="row g-2" id="type-selector-grid">
                    ${FIELD_TYPES.map(
                      (type) => `
                      <div class="col-md-3">
                        <input type="radio" class="btn-check" name="field-type" id="type-${type.value.replace(
                          /[^a-z0-9]/gi,
                          "_"
                        )}" 
                               value="${type.value}" ${
                        field.type === type.value ? "checked" : ""
                      }>
                        <label class="btn btn-outline-primary w-100 text-start p-3" for="type-${type.value.replace(
                          /[^a-z0-9]/gi,
                          "_"
                        )}" 
                               style="min-height: 80px;">
                          <div><i class="${type.icon} fs-4"></i></div>
                          <div class="fw-bold small mt-2">${type.label}</div>
                          <div class="text-muted" style="font-size: 0.75rem;">${
                            type.description
                          }</div>
                        </label>
                      </div>
                    `
                    ).join("")}
                  </div>
                </div>
                
                <!-- Default Value -->
                <div class="mb-4">
                  <label class="form-label fw-bold">Default Value</label>
                  <input type="text" class="form-control" id="enhanced-field-default" 
                         value="${
                           field.defaultValue
                         }" placeholder="Optional default value">
                  <small class="form-text text-muted">
                    <i class="bi bi-lightbulb"></i> Use <code>CURRENT_TIMESTAMP</code> for date/time fields
                  </small>
                </div>
                
                <!-- Description -->
                <div class="mb-0">
                  <label class="form-label fw-bold">Description</label>
                  <textarea class="form-control" id="enhanced-field-description" rows="3" 
                            placeholder="Describe the purpose of this field">${
                              field.description
                            }</textarea>
                </div>
              </form>
            </div>
            
            <!-- Validation Tab -->
            <div class="tab-pane fade" id="validation-panel" role="tabpanel">
              <div class="alert alert-info border-0">
                <i class="bi bi-info-circle me-2"></i>
                Validation rules are applied when data is imported. Invalid data will be rejected.
              </div>
              
              <!-- Validation Type Selector -->
              <div class="mb-4">
                <label class="form-label fw-bold">Validation Type</label>
                <div class="row g-2">
                  ${VALIDATION_TYPES.map(
                    (val) => `
                    <div class="col-md-4">
                      <input type="radio" class="btn-check" name="validation-type" id="val-${
                        val.value
                      }" 
                             value="${val.value}" ${
                      field.validation === val.value ? "checked" : ""
                    } 
                             onchange="toggleEnhancedValidationOptions()">
                      <label class="btn btn-outline-success w-100 text-start p-3" for="val-${
                        val.value
                      }">
                        <div><i class="${val.icon} fs-4"></i></div>
                        <div class="fw-bold small mt-2">${val.label}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${
                          val.description
                        }</div>
                        ${
                          val.example
                            ? `<div class="text-primary" style="font-size: 0.7rem; margin-top: 4px;"><code>${val.example}</code></div>`
                            : ""
                        }
                      </label>
                    </div>
                  `
                  ).join("")}
                </div>
              </div>
              
              <!-- Regex Pattern -->
              <div class="validation-option d-none" id="regex-option-enhanced">
                <div class="card border-warning">
                  <div class="card-header bg-warning bg-opacity-10 border-warning">
                    <strong><i class="bi bi-code-slash me-2"></i>Custom Regex Pattern</strong>
                  </div>
                  <div class="card-body">
                    <input type="text" class="form-control font-monospace mb-3" id="enhanced-field-regex" 
                           value="${
                             field.validation_pattern
                           }" placeholder="^[A-Z]{3}-\\d{6}$">
                    <div class="alert alert-warning mb-0">
                      <strong>Example patterns:</strong><br>
                      <code>^ORD-\\d{6}$</code> - Order ID like "ORD-123456"<br>
                      <code>^[A-Z]{3}-[0-9]{4,}$</code> - Code like "ABC-1234"<br>
                      <code>^\\d{10}$</code> - Exactly 10 digits
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Range Options -->
              <div class="validation-option d-none" id="range-option-enhanced">
                <div class="card border-info">
                  <div class="card-header bg-info bg-opacity-10 border-info">
                    <strong><i class="bi bi-bar-chart me-2"></i>Number Range</strong>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label class="form-label">Minimum Value</label>
                        <input type="number" class="form-control form-control-lg" id="enhanced-field-min-value" 
                               value="${
                                 field.min_value
                               }" step="any" placeholder="e.g., 0">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Maximum Value</label>
                        <input type="number" class="form-control form-control-lg" id="enhanced-field-max-value" 
                               value="${
                                 field.max_value
                               }" step="any" placeholder="e.g., 1000000">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Length Options -->
              <div class="validation-option d-none" id="length-option-enhanced">
                <div class="card border-primary">
                  <div class="card-header bg-primary bg-opacity-10 border-primary">
                    <strong><i class="bi bi-rulers me-2"></i>Text Length</strong>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label class="form-label">Minimum Length</label>
                        <input type="number" class="form-control form-control-lg" id="enhanced-field-min-length" 
                               value="${
                                 field.min_length
                               }" min="0" placeholder="e.g., 5">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Maximum Length</label>
                        <input type="number" class="form-control form-control-lg" id="enhanced-field-max-length" 
                               value="${
                                 field.max_length
                               }" min="0" placeholder="e.g., 100">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Validation Test -->
              <div class="mt-4">
                <div class="card border-success">
                  <div class="card-header bg-success bg-opacity-10 border-success">
                    <strong><i class="bi bi-play-circle me-2"></i>Test Validation</strong>
                  </div>
                  <div class="card-body">
                    <div class="input-group">
                      <input type="text" class="form-control" id="validation-test-input" placeholder="Enter test value...">
                      <button class="btn btn-success" type="button" onclick="testFieldValidation()">
                        <i class="bi bi-check-circle me-1"></i>Test
                      </button>
                    </div>
                    <div id="validation-test-result" class="mt-2"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Constraints Tab -->
            <div class="tab-pane fade" id="constraints-panel" role="tabpanel">
              <div class="alert alert-primary border-0">
                <i class="bi bi-info-circle me-2"></i>
                Constraints are enforced at the database level and cannot be bypassed.
              </div>
              
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="card h-100 ${
                    field.required ? "border-danger" : "border-secondary"
                  }">
                    <div class="card-body">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enhanced-field-required" 
                               ${
                                 field.required ? "checked" : ""
                               } style="transform: scale(1.5);">
                        <label class="form-check-label ms-2" for="enhanced-field-required">
                          <strong class="fs-5">Required (NOT NULL)</strong>
                          <p class="text-muted small mb-0 mt-2">Field must have a value. Empty values will be rejected.</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card h-100 ${
                    field.unique ? "border-info" : "border-secondary"
                  }">
                    <div class="card-body">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enhanced-field-unique" 
                               ${
                                 field.unique ? "checked" : ""
                               } style="transform: scale(1.5);">
                        <label class="form-check-label ms-2" for="enhanced-field-unique">
                          <strong class="fs-5">Unique</strong>
                          <p class="text-muted small mb-0 mt-2">No duplicate values allowed. Each value must be unique.</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card h-100 ${
                    field.primary_key ? "border-primary" : "border-secondary"
                  }">
                    <div class="card-body">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enhanced-field-primary" 
                               ${
                                 field.primary_key ? "checked" : ""
                               } style="transform: scale(1.5);">
                        <label class="form-check-label ms-2" for="enhanced-field-primary">
                          <strong class="fs-5">Primary Key</strong>
                          <p class="text-muted small mb-0 mt-2">Table identifier. Must be unique and required.</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card h-100 ${
                    field.auto_increment ? "border-success" : "border-secondary"
                  }">
                    <div class="card-body">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enhanced-field-autoincrement" 
                               ${
                                 field.auto_increment ? "checked" : ""
                               } style="transform: scale(1.5);">
                        <label class="form-check-label ms-2" for="enhanced-field-autoincrement">
                          <strong class="fs-5">Auto-increment</strong>
                          <p class="text-muted small mb-0 mt-2">Automatic sequential numbering for numeric fields.</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-12">
                  <div class="card ${
                    field.indexed ? "border-warning" : "border-secondary"
                  }">
                    <div class="card-body">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enhanced-field-indexed" 
                               ${
                                 field.indexed ? "checked" : ""
                               } style="transform: scale(1.5);">
                        <label class="form-check-label ms-2" for="enhanced-field-indexed">
                          <strong class="fs-5">Indexed for Search</strong>
                          <p class="text-muted small mb-0 mt-2">Create database index for faster searches and queries on this field.</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer bg-light border-0">
          <button type="button" class="btn btn-secondary" onclick="closeEnhancedFieldModal()">
            <i class="bi bi-x-circle me-2"></i>Cancel
          </button>
          <button type="button" class="btn btn-primary btn-lg px-4" onclick="saveEnhancedField()">
            <i class="bi bi-check-circle me-2"></i>${
              isEdit ? "Update" : "Add"
            } Field
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Initialize Bootstrap tabs
  const triggerTabList = [].slice.call(
    modal.querySelectorAll('[data-bs-toggle="tab"]')
  );
  triggerTabList.forEach(function (triggerEl) {
    new bootstrap.Tab(triggerEl);
  });

  // Initialize validation options
  toggleEnhancedValidationOptions();

  // Focus first input
  setTimeout(() => document.getElementById("enhanced-field-name").focus(), 100);
}

/**
 * Toggle validation options based on selected type
 */
function toggleEnhancedValidationOptions() {
  const validationType =
    document.querySelector('input[name="validation-type"]:checked')?.value ||
    "none";
  document
    .querySelectorAll(".validation-option")
    .forEach((el) => el.classList.add("d-none"));

  if (validationType === "regex") {
    document
      .getElementById("regex-option-enhanced")
      ?.classList.remove("d-none");
  } else if (validationType === "range") {
    document
      .getElementById("range-option-enhanced")
      ?.classList.remove("d-none");
  } else if (validationType === "length") {
    document
      .getElementById("length-option-enhanced")
      ?.classList.remove("d-none");
  }
}

/**
 * Test field validation in real-time
 */
function testFieldValidation() {
  const testInput = document.getElementById("validation-test-input").value;
  const resultDiv = document.getElementById("validation-test-result");
  const validationType = document.querySelector(
    'input[name="validation-type"]:checked'
  )?.value;

  if (!testInput) {
    resultDiv.innerHTML =
      '<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Please enter a test value</div>';
    return;
  }

  let isValid = true;
  let message = "";

  // Simple validation testing (enhance as needed)
  if (validationType === "email") {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    isValid = emailRegex.test(testInput);
    message = isValid ? "Valid email format!" : "Invalid email format";
  } else if (validationType === "phone") {
    const phoneRegex =
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    isValid = phoneRegex.test(testInput);
    message = isValid ? "Valid phone format!" : "Invalid phone format";
  } else if (validationType === "regex") {
    const pattern = document.getElementById("enhanced-field-regex").value;
    try {
      const regex = new RegExp(pattern);
      isValid = regex.test(testInput);
      message = isValid ? "Matches pattern!" : "Does not match pattern";
    } catch (e) {
      isValid = false;
      message = "Invalid regex pattern: " + e.message;
    }
  }

  resultDiv.innerHTML = `
    <div class="alert alert-${isValid ? "success" : "danger"} mb-0">
      <i class="bi bi-${isValid ? "check-circle" : "x-circle"} me-2"></i>
      <strong>${message}</strong>
      ${
        !isValid
          ? '<br><small>Value: "' +
            testInput +
            '" will be rejected during import</small>'
          : ""
      }
    </div>
  `;
}

/**
 * Close enhanced field modal
 */
function closeEnhancedFieldModal() {
  const modal = document.getElementById("enhancedFieldModal");
  if (modal) modal.remove();
}

/**
 * Save enhanced field configuration
 */
function saveEnhancedField() {
  const form = document.getElementById("enhanced-field-form");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fieldName = document.getElementById("enhanced-field-name").value;
  const fieldType =
    document.querySelector('input[name="field-type"]:checked')?.value ||
    "VARCHAR(255)";
  const isRequired = document.getElementById("enhanced-field-required").checked;
  const isUnique = document.getElementById("enhanced-field-unique").checked;
  const isPrimaryKey = document.getElementById(
    "enhanced-field-primary"
  ).checked;
  const isAutoIncrement = document.getElementById(
    "enhanced-field-autoincrement"
  ).checked;
  const isIndexed = document.getElementById("enhanced-field-indexed").checked;
  const validation =
    document.querySelector('input[name="validation-type"]:checked')?.value ||
    "none";
  const validationPattern =
    document.getElementById("enhanced-field-regex")?.value || "";
  const minValue =
    document.getElementById("enhanced-field-min-value")?.value || "";
  const maxValue =
    document.getElementById("enhanced-field-max-value")?.value || "";
  const minLength =
    document.getElementById("enhanced-field-min-length")?.value || "";
  const maxLength =
    document.getElementById("enhanced-field-max-length")?.value || "";
  const defaultValue =
    document.getElementById("enhanced-field-default")?.value || "";
  const description =
    document.getElementById("enhanced-field-description")?.value || "";

  const newField = {
    name: fieldName,
    type: fieldType,
    required: isRequired,
    unique: isUnique,
    primary_key: isPrimaryKey,
    auto_increment: isAutoIncrement,
    indexed: isIndexed,
    validation: validation,
    validation_pattern: validation === "regex" ? validationPattern : null,
    min_value: validation === "range" && minValue ? parseFloat(minValue) : null,
    max_value: validation === "range" && maxValue ? parseFloat(maxValue) : null,
    min_length:
      validation === "length" && minLength ? parseInt(minLength) : null,
    max_length:
      validation === "length" && maxLength ? parseInt(maxLength) : null,
    default_value: defaultValue || null,
    description: description || null,
  };

  // Add to display (reuse existing saveAdvancedField logic)
  addFieldToContainer(newField);
  closeEnhancedFieldModal();
}

/**
 * Add field from template
 */
function addFieldFromTemplate(templateName) {
  const template = FIELD_TEMPLATES[templateName];
  if (template) {
    addFieldToContainer(template);
  }
}

/**
 * Helper to add field to container
 */
function addFieldToContainer(fieldConfig) {
  const container = document.getElementById("custom-fields-container");

  // Remove empty state
  const emptyState = container.querySelector(".text-center.text-muted");
  if (emptyState) emptyState.remove();

  const fieldRow = document.createElement("div");
  fieldRow.className = "card mb-2 border-start border-primary border-3";
  fieldRow.setAttribute("data-field-config", JSON.stringify(fieldConfig));

  fieldRow.innerHTML = `
    <div class="card-body p-3">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <h6 class="mb-1">
            <i class="bi bi-diagram-3 text-primary me-2"></i>
            <strong>${fieldConfig.name}</strong>
            <code class="ms-2 text-muted">${fieldConfig.type}</code>
          </h6>
          <div class="mb-2">
            ${
              fieldConfig.required
                ? '<span class="badge bg-danger me-1">Required</span>'
                : ""
            }
            ${
              fieldConfig.unique
                ? '<span class="badge bg-info me-1">Unique</span>'
                : ""
            }
            ${
              fieldConfig.primary_key
                ? '<span class="badge bg-primary me-1">Primary Key</span>'
                : ""
            }
            ${
              fieldConfig.auto_increment
                ? '<span class="badge bg-success me-1">Auto-increment</span>'
                : ""
            }
            ${
              fieldConfig.indexed
                ? '<span class="badge bg-warning me-1">Indexed</span>'
                : ""
            }
            ${
              fieldConfig.validation !== "none"
                ? `<span class="badge bg-secondary me-1">Validated: ${fieldConfig.validation}</span>`
                : ""
            }
          </div>
          <small class="text-muted">${
            fieldConfig.description || "No description provided"
          }</small>
        </div>
        <div class="btn-group">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick='showEnhancedFieldModal(${JSON.stringify(
            fieldConfig
          )})' title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.card').remove(); checkEmptyFields()" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(fieldRow);
}

/**
 * Check if fields container is empty and show empty state
 */
function checkEmptyFields() {
  const container = document.getElementById("custom-fields-container");
  if (container && container.children.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
        <p class="mb-0">No fields added yet</p>
        <small>Click "Add Field" or use templates above to get started</small>
      </div>
    `;
  }
}

/**
 * Enhanced Create/Edit Channel Modal
 */
async function showEnhancedCreateChannelModal(channelId = null) {
  const isEdit = channelId !== null;
  let channelData = null;

  if (isEdit) {
    try {
      const token = localStorage.getItem("access_token");
      // Fetch schema data
      const response = await axios.get(
        `${API_BASE_URL}/api/mango/channels/${channelId}/schema`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      channelData = response.data;
    } catch (error) {
      console.error("Failed to load channel schema", error);
      Swal.fire("Error", "Failed to load channel details", "error");
      return;
    }
  }

  const existingModal = document.getElementById("createChannelModal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.className = "modal fade show d-block";
  modal.style.backgroundColor = "rgba(0,0,0,0.6)";
  modal.id = "createChannelModal";

  modal.innerHTML = `
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content shadow-lg border-0">
        <!-- Header with gradient -->
        <div class="modal-header bg-gradient text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div>
            <h4 class="modal-title mb-0" id="createChannelTitle">
              <i class="bi bi-diagram-3-fill me-2"></i>${
                isEdit ? "Edit Channel Configuration" : "Create Custom Channel"
              }
            </h4>
            <small class="text-white-50">${
              isEdit
                ? "Modify channel settings and fields"
                : "Build your custom order table with advanced features"
            }</small>
          </div>
          <button type="button" class="btn-close btn-close-white" onclick="closeChannelModal('createChannelModal')"></button>
        </div>
        
        <div class="modal-body p-4" style="max-height: 70vh; overflow-y: auto;">
          <form id="create-channel-form">
            <!-- Channel Information Card -->
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-header bg-light border-0">
                <h6 class="mb-0"><i class="bi bi-info-circle me-2 text-primary"></i>Channel Information</h6>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label fw-bold" for="channel-name">Channel Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control form-control-lg" id="channel-name" 
                           value="${isEdit ? channelData.channel_name : ""}" 
                           placeholder="e.g., Amazon US, Flipkart B2B" required ${
                             isEdit ? "disabled" : ""
                           }>
                    ${
                      !isEdit
                        ? '<small class="form-text text-muted"><i class="bi bi-lightbulb"></i> This will create a dedicated database table</small>'
                        : ""
                    }
                  </div>
                  
                  <div class="col-md-6">
                    <label class="form-label fw-bold" for="channel-type">Channel Type</label>
                    <select class="form-select form-select-lg" id="channel-type">
                      <option value="marketplace" ${
                        isEdit && channelData.channel_type === "marketplace"
                          ? "selected"
                          : ""
                      }>🛍️ Marketplace</option>
                      <option value="webstore" ${
                        isEdit && channelData.channel_type === "webstore"
                          ? "selected"
                          : ""
                      }>🌐 Webstore</option>
                      <option value="offline" ${
                        isEdit && channelData.channel_type === "offline"
                          ? "selected"
                          : ""
                      }>🏪 Offline Store</option>
                      <option value="social" ${
                        isEdit && channelData.channel_type === "social"
                          ? "selected"
                          : ""
                      }>📱 Social Commerce</option>
                      <option value="other" ${
                        isEdit && channelData.channel_type === "other"
                          ? "selected"
                          : ""
                      }>📦 Other</option>
                    </select>
                  </div>
                  
                  <div class="col-12">
                    <label class="form-label fw-bold" for="channel-description">Description</label>
                    <textarea class="form-control" id="channel-description" rows="2"
                              placeholder="Brief description of this channel">${
                                isEdit && channelData.description
                                  ? channelData.description
                                  : ""
                              }</textarea>
                  </div>
                  
                  <div class="col-12">
                     <div class="alert alert-info mb-0">
                      <i class="bi bi-table me-2"></i>
                      <strong>Table Name:</strong> <code id="table-name-preview" class="bg-white px-2 py-1 rounded">${
                        isEdit
                          ? channelData.table_name
                          : "Type channel name above..."
                      }</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Custom Fields Card -->
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-gradient text-white border-0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="d-flex justify-content-between align-items-center">
                  <h6 class="mb-0"><i class="bi bi-grid-3x3-gap me-2"></i>Custom Table Fields</h6>
                  <button type="button" class="btn btn-light btn-sm" onclick="showEnhancedFieldModal()">
                    <i class="bi bi-plus-circle me-1"></i> Add Field
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="alert alert-primary border-0">
                  <i class="bi bi-info-circle me-2"></i>
                  System fields (id, company_id, timestamps) are added automatically. Define your custom fields below.
                </div>
                
                <!-- Field Templates -->
                <div class="mb-3">
                  <label class="form-label small text-muted">Quick Add from Templates:</label>
                  <div class="btn-group btn-group-sm flex-wrap" role="group">
                    <button type="button" class="btn btn-outline-secondary" onclick="addFieldFromTemplate('order_id')">
                      <i class="bi bi-tag"></i> Order ID
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="addFieldFromTemplate('customer_email')">
                      <i class="bi bi-envelope"></i> Email
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="addFieldFromTemplate('phone_number')">
                      <i class="bi bi-telephone"></i> Phone
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="addFieldFromTemplate('order_amount')">
                      <i class="bi bi-currency-dollar"></i> Amount
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="addFieldFromTemplate('order_date')">
                      <i class="bi bi-calendar"></i> Date
                    </button>
                  </div>
                </div>
                
                <div id="custom-fields-container" class="min-height-100">
                  <div class="text-center text-muted py-5">
                    <i class="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
                    <p class="mb-0">No fields added yet</p>
                    <small>Click "Add Field" or use templates above to get started</small>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer bg-light border-0">
          <button type="button" class="btn btn-secondary" onclick="closeChannelModal('createChannelModal')">
            <i class="bi bi-x-circle me-2"></i>Cancel
          </button>
          ${
            isEdit
              ? `<button type="button" class="btn btn-warning btn-lg px-4" onclick="updateCustomChannel(${channelId})" disabled title="Update functionality coming soon">
               <i class="bi bi-pencil-square me-2"></i>Update Channel (Read Only)
             </button>`
              : `<button type="button" class="btn btn-primary btn-lg px-4" onclick="createCustomChannel()">
               <i class="bi bi-check-circle me-2"></i>Create Channel & Table
             </button>`
          }
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Auto-update table name preview (only for create mode)
  if (!isEdit) {
    document.getElementById("channel-name").addEventListener("input", (e) => {
      const name = e.target.value;
      const sanitized = name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_");
      document.getElementById("table-name-preview").textContent = sanitized
        ? `${sanitized}_orders`
        : "Type channel name above...";
    });
  }

  // Populate fields if editing
  if (isEdit && channelData && channelData.fields) {
    channelData.fields.forEach((field) => {
      addFieldToContainer(field);
    });
  }
}

// Field templates
const FIELD_TEMPLATES = {
  order_id: {
    name: "order_id",
    type: "VARCHAR(50)",
    required: true,
    unique: true,
    validation: "regex",
    validation_pattern: "^[A-Z0-9]{3}-[A-Z0-9]{6,}$",
    description: "Unique order identifier",
  },
  customer_email: {
    name: "customer_email",
    type: "VARCHAR(255)",
    required: true,
    validation: "email",
    description: "Customer email address",
  },
  phone_number: {
    name: "phone_number",
    type: "VARCHAR(20)",
    required: false,
    validation: "phone",
    description: "Customer phone number",
  },
  order_amount: {
    name: "order_amount",
    type: "DECIMAL(12,2)",
    required: true,
    validation: "range",
    min_value: 0,
    max_value: 1000000,
    default_value: "0.00",
    description: "Order total amount",
  },
  order_date: {
    name: "order_date",
    type: "DATETIME",
    required: true,
    default_value: "CURRENT_TIMESTAMP",
    description: "When order was placed",
  },
};
