// ====================================================================
// STOCK TRANSFER APPROVAL WORKFLOW - ADDITIONAL FUNCTIONS
// Add these functions to your mango.js file
// ====================================================================

// Approve Transfer Action
window.approveTransferAction = async function (transferId) {
  const result = await Swal.fire({
    title: "Approve Transfer?",
    text: "This will mark the transfer as approved and allow it to be completed",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes, Approve It",
  });

  if (result.isConfirmed) {
    try {
      await axios.post(
        `${API_BASE_URL}/inventory/stock-transfers/${transferId}/approve`
      );
      Swal.fire("Success", "Transfer approved successfully!", "success");
      loadSection("inv_transfer"); // Reload
    } catch (error) {
      console.error("Error approving transfer:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to approve transfer",
        "error"
      );
    }
  }
};

// Reject Transfer Action
window.rejectTransferAction = async function (transferId) {
  const { value: reason } = await Swal.fire({
    title: "Reject Transfer",
    input: "textarea",
    inputLabel: "Rejection Reason",
    inputPlaceholder: "Enter the reason for rejection...",
    inputAttributes: {
      "aria-label": "Enter rejection reason",
    },
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    confirmButtonText: "Reject Transfer",
    inputValidator: (value) => {
      if (!value) {
        return "You need to provide a reason!";
      }
    },
  });

  if (reason) {
    try {
      await axios.post(
        `${API_BASE_URL}/inventory/stock-transfers/${transferId}/reject`,
        {
          rejection_reason: reason,
        }
      );
      Swal.fire("Success", "Transfer rejected", "success");
      loadSection("inv_transfer"); // Reload
    } catch (error) {
      console.error("Error rejecting transfer:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to reject transfer",
        "error"
      );
    }
  }
};

// Render Stock Transfer Entry Form (Full Page) - ADVANCED VERSION
async function renderStockTransferEntry(container, transferId = null) {
  const isEdit = transferId !== null;
  let transfer = null;
  let warehouses = [];
  let products = [];

  try {
    // Fetch data
    const requests = [
      axios.get(`${API_BASE_URL}/inventory/warehouses`),
      axios.get(`${API_BASE_URL}/inventory/products`),
    ];

    if (isEdit) {
      requests.push(
        axios.get(`${API_BASE_URL}/inventory/stock-transfers/${transferId}`)
      );
    }

    const responses = await Promise.all(requests);
    warehouses = responses[0].data;
    products = responses[1].data;
    if (isEdit) transfer = responses[2].data;
  } catch (error) {
    container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load form data. Please try again.
            </div>
        `;
    return;
  }

  const transferNumber =
    transfer?.transfer_number || `ST-${Date.now().toString().slice(-6)}`;
  const sourceWarehouseId = transfer?.source_warehouse_id || "";
  const destinationWarehouseId = transfer?.destination_warehouse_id || "";
  const notes = transfer?.notes || "";
  const items = transfer?.items || [];

  container.innerHTML = `
        <div class="fade-in">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-3">
                    <button class="btn btn-outline-secondary" onclick="loadSection('inv_transfer')">
                        <i class="bi bi-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">
                            ${
                              isEdit
                                ? "Edit Stock Transfer"
                                : "New Stock Transfer"
                            }
                        </h2>
                        <p class="text-muted mb-0">${transferNumber}</p>
                    </div>
                </div>
                ${
                  transfer?.status
                    ? `
                    <span class="badge bg-secondary fs-6 px-3 py-2">${transfer.status}</span>
                `
                    : ""
                }
            </div>
            
            <!-- Form Card -->
            <div class="card border-0 shadow-sm">
                <div class="card-body p-4">
                    <form id="stockTransferForm">
                        <!-- Transfer Details Section -->
                        <h5 class="fw-bold mb-3 border-bottom pb-2">
                            <i class="bi bi-info-circle me-2"></i>Transfer Details
                        </h5>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label fw-semibold">Transfer Number</label>
                                <input type="text" class="form-control" id="transferNumber" value="${transferNumber}" readonly>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-semibold">Source Warehouse <span class="text-danger">*</span></label>
                                <select class="form-select" id="sourceWarehouse" required>
                                    <option value="">Select Source...</option>
                                    ${warehouses
                                      .map(
                                        (w) => `
                                        <option value="${w.id}" ${
                                          sourceWarehouseId === w.id
                                            ? "selected"
                                            : ""
                                        }>
                                            ${w.name}
                                        </option>
                                    `
                                      )
                                      .join("")}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-semibold">Destination Warehouse <span class="text-danger">*</span></label>
                                <select class="form-select" id="destinationWarehouse" required>
                                    <option value="">Select Destination...</option>
                                    ${warehouses
                                      .map(
                                        (w) => `
                                        <option value="${w.id}" ${
                                          destinationWarehouseId === w.id
                                            ? "selected"
                                            : ""
                                        }>
                                            ${w.name}
                                        </option>
                                    `
                                      )
                                      .join("")}
                                </select>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label fw-semibold">Notes</label>
                                <textarea class="form-control" id="transferNotes" rows="2" placeholder="Enter any additional notes...">${notes}</textarea>
                            </div>
                        </div>
                        
                        <!-- Advanced Items Section -->
                        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                            <h5 class="fw-bold mb-0">
                                <i class="bi bi-box-seam me-2"></i>Transfer Items
                            </h5>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-primary" onclick="addTransferItemRow()">
                                    <i class="bi bi-plus-circle me-1"></i>Add Row
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="showPasteDialog()">
                                    <i class="bi bi-clipboard-plus me-1"></i>Paste from Excel
                                </button>
                                <button type="button" class="btn btn-outline-info" onclick="clearAllItems()">
                                    <i class="bi bi-trash me-1"></i>Clear All
                                </button>
                            </div>
                        </div>
                        
                        <!-- Quick SKU Entry -->
                        <div class="card bg-light border-0 mb-3">
                            <div class="card-body p-3">
                                <div class="row g-2 align-items-end">
                                    <div class="col-md-6">
                                        <label class="form-label small fw-semibold mb-1">
                                            <i class="bi bi-search me-1"></i>Quick Add by SKU/Barcode
                                        </label>
                                        <input type="text" class="form-control" id="quickSKUInput" 
                                               placeholder="Scan barcode or type SKU..." 
                                               onkeypress="handleQuickSKUEntry(event)">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label small fw-semibold mb-1">Quantity</label>
                                        <input type="number" class="form-control" id="quickQtyInput" value="1" min="1">
                                    </div>
                                    <div class="col-md-3">
                                        <button type="button" class="btn btn-primary w-100" onclick="addItemBySKU()">
                                            <i class="bi bi-plus-lg me-1"></i>Add
                                        </button>
                                    </div>
                                </div>
                                <div id="skuSearchResults" class="mt-2" style="display:none;"></div>
                            </div>
                        </div>
                        
                        <!-- Advanced Items Table -->
                        <div class="table-responsive">
                            <table class="table table-hover table-bordered align-middle mb-0" id="transferItemsTable">
                                <thead class="table-light">
                                    <tr>
                                        <th style="width: 5%">#</th>
                                        <th style="width: 20%">
                                            SKU/Item ID <span class="text-danger">*</span>
                                            <small class="text-muted d-block fw-normal">Type to search</small>
                                        </th>
                                        <th style="width: 35%">Product Name</th>
                                        <th style="width: 15%">
                                            Quantity <span class="text-danger">*</span>
                                        </th>
                                        <th style="width: 15%">Available Stock</th>
                                        <th style="width: 5%">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="transferItemsTableBody">
                                    ${
                                      items.length > 0
                                        ? items
                                            .map((item, idx) => {
                                              const product = products.find(
                                                (p) => p.id === item.product_id
                                              );
                                              return createItemRowHTML(
                                                idx,
                                                product,
                                                item.quantity_sent,
                                                products
                                              );
                                            })
                                            .join("")
                                        : ""
                                    }
                                </tbody>
                                <tfoot class="table-light">
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Total Items:</td>
                                        <td colspan="3" class="fw-bold" id="totalItemsCount">0</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <div class="alert alert-info mt-3 mb-0">
                            <i class="bi bi-lightbulb me-2"></i>
                            <strong>Pro Tips:</strong>
                            <ul class="mb-0 mt-2">
                                <li>Use <kbd>Tab</kbd> to navigate between cells</li>
                                <li>Start typing in SKU field for autocomplete suggestions</li>
                                <li>Copy multiple rows from Excel and use "Paste from Excel" button</li>
                                <li>Format: <code>SKU &nbsp; Quantity</code> (tab-separated)</li>
                            </ul>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="d-flex gap-2 justify-content-end border-top pt-3 mt-4">
                            <button type="button" class="btn btn-outline-secondary px-4" onclick="loadSection('inv_transfer')">
                                <i class="bi bi-x-lg me-2"></i>Cancel
                            </button>
                            <button type="button" class="btn btn-outline-primary px-4" onclick="saveTransferDraft(${transferId})">
                                <i class="bi bi-save me-2"></i>Save as Draft
                            </button>
                            <button type="button" class="btn btn-primary px-4" onclick="submitTransferForApproval(${transferId})">
                                <i class="bi bi-send me-2"></i>Submit for Approval
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Paste Dialog Modal -->
        <div class="modal fade" id="pasteExcelModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-clipboard-data me-2"></i>Paste from Excel
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Paste your Excel data below. Format should be:</p>
                        <div class="bg-light p-2 rounded mb-3 font-monospace small">
                            SKU001&nbsp;&nbsp;&nbsp;&nbsp;10<br>
                            SKU002&nbsp;&nbsp;&nbsp;&nbsp;25<br>
                            SKU003&nbsp;&nbsp;&nbsp;&nbsp;5
                        </div>
                        <textarea class="form-control font-monospace" id="pasteExcelData" rows="10" 
                                  placeholder="Paste from Excel here (SKU and Quantity, tab-separated)..."></textarea>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" id="clearExistingItems">
                            <label class="form-check-label" for="clearExistingItems">
                                Clear existing items before importing
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="processExcelPaste()">
                            <i class="bi bi-check-lg me-2"></i>Import Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Initialize with at least one row if creating new
  if (!isEdit && items.length === 0) {
    addTransferItemRow();
  }

  // Store products globally for autocomplete
  window.stockTransferFormData = { warehouses, products, transferId };

  // Initialize autocomplete listeners
  initializeTableAutoComplete();
  updateItemCount();
}

// Add Item to Transfer Entry Form
let transferItemEntryIndex = 0;
window.addTransferItemEntry = function () {
  const container = document.getElementById("transferItemsContainer");
  const products = window.stockTransferFormData?.products || [];

  const itemHtml = `
        <div class="card border mb-3 transfer-item" data-index="${transferItemEntryIndex}">
            <div class="card-body p-3">
                <div class="row g-2">
                    <div class="col-md-8">
                        <label class="form-label small fw-semibold">Product</label>
                        <select class="form-select form-select-sm item-product" required>
                            <option value="">Select Product...</option>
                            ${products
                              .map(
                                (p) =>
                                  `<option value="${p.id}">${p.name} (${p.sku})</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-semibold">Quantity</label>
                        <input type="number" class="form-control form-control-sm item-quantity" min="1" value="1" required>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeTransferItemEntry(${transferItemEntryIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", itemHtml);
  transferItemEntryIndex++;
};

// Remove Item from Transfer Entry Form
window.removeTransferItemEntry = function (index) {
  const item = document.querySelector(`.transfer-item[data-index="${index}"]`);
  if (item) item.remove();
};

// Save Transfer as Draft
window.saveTransferDraft = async function (transferId = null) {
  const formData = collectTransferFormData();
  if (!formData) return;

  formData.is_draft = true; // Mark as draft

  try {
    if (transferId) {
      // Update existing draft
      await axios.put(
        `${API_BASE_URL}/inventory/stock-transfers/${transferId}`,
        formData
      );
      Swal.fire("Success", "Draft updated successfully!", "success");
    } else {
      // Create new draft
      await axios.post(`${API_BASE_URL}/inventory/stock-transfers`, formData);
      Swal.fire("Success", "Draft saved successfully!", "success");
    }
    loadSection("inv_transfer");
  } catch (error) {
    console.error("Error saving draft:", error);
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to save draft",
      "error"
    );
  }
};

// Submit Transfer for Approval
window.submitTransferForApproval = async function (transferId = null) {
  const formData = collectTransferFormData();
  if (!formData) return;

  formData.is_draft = false; // Submit for approval

  try {
    if (transferId) {
      // Update draft then submit
      await axios.put(
        `${API_BASE_URL}/inventory/stock-transfers/${transferId}`,
        formData
      );
      await axios.post(
        `${API_BASE_URL}/inventory/stock-transfers/${transferId}/submit-for-approval`
      );
    } else {
      // Create and auto-submit
      await axios.post(`${API_BASE_URL}/inventory/stock-transfers`, formData);
    }
    Swal.fire("Success", "Transfer submitted for approval!", "success");
    loadSection("inv_transfer");
  } catch (error) {
    console.error("Error submitting transfer:", error);
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to submit transfer",
      "error"
    );
  }
};

// Collect Form Data
function collectTransferFormData() {
  const transferNumber = document.getElementById("transferNumber").value;
  const sourceWarehouse = parseInt(
    document.getElementById("sourceWarehouse").value
  );
  const destinationWarehouse = parseInt(
    document.getElementById("destinationWarehouse").value
  );
  const notes = document.getElementById("transferNotes").value;

  if (!transferNumber || !sourceWarehouse || !destinationWarehouse) {
    Swal.fire("Error", "Please fill all required fields", "error");
    return null;
  }

  if (sourceWarehouse === destinationWarehouse) {
    Swal.fire("Error", "Source and destination cannot be the same", "error");
    return null;
  }

  // Collect items
  const items = [];
  document.querySelectorAll(".transfer-item").forEach((row) => {
    const productId = parseInt(row.querySelector(".item-product").value);
    const quantity = parseInt(row.querySelector(".item-quantity").value);

    if (productId && quantity > 0) {
      items.push({
        product_id: productId,
        quantity_sent: quantity,
      });
    }
  });

  if (items.length === 0) {
    Swal.fire("Error", "Please add at least one item", "error");
    return null;
  }

  return {
    transfer_number: transferNumber,
    source_warehouse_id: sourceWarehouse,
    destination_warehouse_id: destinationWarehouse,
    notes: notes,
    items: items,
  };
}

// Render Stock Transfer View (Detail Page)
async function renderStockTransferView(container, transferId) {
  try {
    const transfer = (
      await axios.get(`${API_BASE_URL}/inventory/stock-transfers/${transferId}`)
    ).data;
    const warehouses = (await axios.get(`${API_BASE_URL}/inventory/warehouses`))
      .data;
    const products = (await axios.get(`${API_BASE_URL}/inventory/products`))
      .data;

    const sourceWh = warehouses.find(
      (w) => w.id === transfer.source_warehouse_id
    );
    const destWh = warehouses.find(
      (w) => w.id === transfer.destination_warehouse_id
    );

    container.innerHTML = `
            <div class="fade-in">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <button class="btn btn-outline-secondary" onclick="loadSection('inv_transfer')">
                            <i class="bi bi-arrow-left"></i>
                        </button>
                        <div>
                            <h2 class="fw-bold text-dark mb-1">${
                              transfer.transfer_number
                            }</h2>
                            <p class="text-muted mb-0">Transfer Details</p>
                        </div>
                    </div>
                    <div>
                        <span class="badge bg-secondary fs-6 px-3 py-2 me-2">${
                          transfer.status
                        }</span>
                        <span class="badge bg-info fs-6 px-3 py-2">${transfer.approval_status?.toUpperCase()}</span>
                    </div>
                </div>
                
                <!-- Details Card -->
                <div class="row">
                    <div class="col-xl-8">
                        <div class="card border-0 shadow-sm mb-4">
                            <div class="card-body p-4">
                                <h5 class="fw-bold mb-3">Transfer Information</h5>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="small text-muted">Source Warehouse</label>
                                        <p class="fw-bold">${
                                          sourceWh?.name || "N/A"
                                        }</p>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small text-muted">Destination Warehouse</label>
                                        <p class="fw-bold">${
                                          destWh?.name || "N/A"
                                        }</p>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small text-muted">Transfer Date</label>
                                        <p class="fw-bold">${new Date(
                                          transfer.transfer_date
                                        ).toLocaleString()}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small text-muted">Completed Date</label>
                                        <p class="fw-bold">${
                                          transfer.completed_date
                                            ? new Date(
                                                transfer.completed_date
                                              ).toLocaleString()
                                            : "Not completed"
                                        }</p>
                                    </div>
                                    ${
                                      transfer.notes
                                        ? `
                                        <div class="col-12">
                                            <label class="small text-muted">Notes</label>
                                            <p class="fw-bold">${transfer.notes}</p>
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Table -->
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-4">
                                <h5 class="fw-bold mb-3">Transfer Items</h5>
                                <table class="table table-hover">
                                    <thead class="bg-light">
                                        <tr>
                                            <th>Product</th>
                                            <th class="text-end">Quantity Sent</th>
                                            <th class="text-end">Quantity Received</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transfer.items
                                          .map((item) => {
                                            const product = products.find(
                                              (p) => p.id === item.product_id
                                            );
                                            return `
                                                <tr>
                                                    <td>${
                                                      product?.name || "Unknown"
                                                    }</td>
                                                    <td class="text-end">${
                                                      item.quantity_sent
                                                    }</td>
                                                    <td class="text-end">${
                                                      item.quantity_received ||
                                                      0
                                                    }</td>
                                                </tr>
                                            `;
                                          })
                                          .join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Timeline -->
                    <div class="col-xl-4">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-4">
                                <h5 class="fw-bold mb-3">Timeline</h5>
                                <div class="timeline">
                                    <div class="timeline-item mb-3">
                                        <div class="d-flex align-items-start">
                                            <div class="bg-primary text-white rounded-circle p-2 me-3">
                                                <i class="bi bi-plus-circle"></i>
                                            </div>
                                            <div>
                                                <p class="fw-bold mb-1">Created</p>
                                                <small class="text-muted">${new Date(
                                                  transfer.transfer_date
                                                ).toLocaleString()}</small>
                                            </div>
                                        </div>
                                    </div>
                                    ${
                                      transfer.approval_status === "approved"
                                        ? `
                                        <div class="timeline-item mb-3">
                                            <div class="d-flex align-items-start">
                                                <div class="bg-success text-white rounded-circle p-2 me-3">
                                                    <i class="bi bi-check-circle"></i>
                                                </div>
                                                <div>
                                                    <p class="fw-bold mb-1">Approved</p>
                                                    <small class="text-muted">${
                                                      transfer.approved_at
                                                        ? new Date(
                                                            transfer.approved_at
                                                          ).toLocaleString()
                                                        : ""
                                                    }</small>
                                                </div>
                                            </div>
                                        </div>
                                    `
                                        : ""
                                    }
                                    ${
                                      transfer.status === "COMPLETED"
                                        ? `
                                        <div class="timeline-item">
                                            <div class="d-flex align-items-start">
                                                <div class="bg-success text-white rounded-circle p-2 me-3">
                                                    <i class="bi bi-check2-all"></i>
                                                </div>
                                                <div>
                                                    <p class="fw-bold mb-1">Completed</p>
                                                    <small class="text-muted">${
                                                      transfer.completed_date
                                                        ? new Date(
                                                            transfer.completed_date
                                                          ).toLocaleString()
                                                        : ""
                                                    }</small>
                                                </div>
                                            </div>
                                        </div>
                                    `
                                        : ""
                                    }
                                    ${
                                      transfer.approval_status === "rejected"
                                        ? `
                                        <div class="timeline-item">
                                            <div class="d-flex align-items-start">
                                                <div class="bg-danger text-white rounded-circle p-2 me-3">
                                                    <i class="bi bi-x-circle"></i>
                                                </div>
                                                <div>
                                                    <p class="fw-bold mb-1">Rejected</p>
                                                    <small class="text-muted d-block">${
                                                      transfer.approved_at
                                                        ? new Date(
                                                            transfer.approved_at
                                                          ).toLocaleString()
                                                        : ""
                                                    }</small>
                                                    ${
                                                      transfer.rejection_reason
                                                        ? `<small class="text-danger">"${transfer.rejection_reason}"</small>`
                                                        : ""
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  } catch (error) {
    console.error("Error loading transfer details:", error);
    container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load transfer details.
            </div>
        `;
  }
}
