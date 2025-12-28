// ====================================================================
// WAREHOUSE VALIDATION FOR STOCK TRANSFER
// Add to stock_transfer_advanced_table.js
// ====================================================================

// Real-time warehouse validation
function validateWarehouses() {
  const sourceSelect = document.getElementById("sourceWarehouse");
  const destSelect = document.getElementById("destinationWarehouse");

  if (!sourceSelect || !destSelect) return true;

  const sourceValue = sourceSelect.value;
  const destValue = destSelect.value;

  // Remove any existing error styling
  sourceSelect.classList.remove("is-invalid");
  destSelect.classList.remove("is-invalid");

  // Remove existing error message
  const existingError = document.getElementById("warehouseValidationError");
  if (existingError) existingError.remove();

  // Check if both are selected and same
  if (sourceValue && destValue && sourceValue === destValue) {
    // Add error styling
    sourceSelect.classList.add("is-invalid");
    destSelect.classList.add("is-invalid");

    // Show error message
    const errorDiv = document.createElement("div");
    errorDiv.id = "warehouseValidationError";
    errorDiv.className = "alert alert-danger alert-dismissible fade show mt-3";
    errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Invalid Selection:</strong> Source and destination warehouse cannot be the same!
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

    // Insert after the destination warehouse field
    const insertPoint = destSelect.closest(".col-md-4").parentElement;
    insertPoint.after(errorDiv);

    return false;
  }

  return true;
}

// Attach validation to warehouse dropdowns
function initializeWarehouseValidation() {
  const sourceSelect = document.getElementById("sourceWarehouse");
  const destSelect = document.getElementById("destinationWarehouse");

  if (sourceSelect && destSelect) {
    sourceSelect.addEventListener("change", validateWarehouses);
    destSelect.addEventListener("change", validateWarehouses);
  }
}

// Override the form data collector to include validation
const originalCollectorAdvanced = window.collectTransferFormDataAdvanced;
window.collectTransferFormDataAdvanced = function () {
  // First validate warehouses
  if (!validateWarehouses()) {
    return null; // Stop if validation fails
  }

  // Then proceed with original collection
  return originalCollectorAdvanced ? originalCollectorAdvanced() : null;
};

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWarehouseValidation);
} else {
  // DOM already loaded
  setTimeout(initializeWarehouseValidation, 500);
}

// Also re-initialize after rendering the form
const originalRenderEntry = window.renderStockTransferEntry;
if (typeof renderStockTransferEntry !== "undefined") {
  window.renderStockTransferEntry = async function (...args) {
    await originalRenderEntry(...args);
    setTimeout(initializeWarehouseValidation, 200);
  };
}
