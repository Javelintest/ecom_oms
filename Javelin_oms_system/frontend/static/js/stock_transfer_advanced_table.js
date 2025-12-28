// ====================================================================
// ADVANCED TABLE ENTRY FUNCTIONS FOR STOCK TRANSFER
// Append these to stock_transfer_workflow.js
// ====================================================================

// Global row index
let tableRowIndex = 0;

// Create HTML for a single item row
function createItemRowHTML(
  index,
  product = null,
  quantity = 1,
  allProducts = []
) {
  const products =
    allProducts.length > 0
      ? allProducts
      : window.stockTransferFormData?.products || [];
  const productId = product?.id || "";
  const productName = product?.name || "";
  const sku = product?.sku || "";
  const availableStock = product?.current_stock || 0;

  return `
        <tr class="item-row" data-row-index="${index}">
            <td class="text-center">${index + 1}</td>
            <td>
                <input type="text" 
                       class="form-control form-control-sm sku-input" 
                       value="${sku}"
                       data-product-id="${productId}"
                       placeholder="Type SKU or scan..."
                       oninput="handleSKUInput(this, ${index})"
                       onkeydown="handleTableKeyNav(event, ${index}, 0)">
                <div class="autocomplete-results" id="autocomplete-${index}" style="display:none;"></div>
            </td>
            <td>
                <input type="text" 
                       class="form-control form-control-sm product-name-input" 
                       value="${productName}"
                       readonly
                       placeholder="Product will appear here">
            </td>
            <td>
                <input type="number" 
                       class="form-control form-control-sm quantity-input" 
                       value="${quantity}"
                       min="1"
                       onkeydown="handleTableKeyNav(event, ${index}, 1)"
                       required>
            </td>
            <td class="text-center available-stock">${
              availableStock || "-"
            }</td>
            <td class="text-center">
                <button type="button" 
                        class="btn btn-sm btn-outline-danger" 
                        onclick="removeItemRow(${index})"
                        title="Remove Item">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

// Add a new row to the table
window.addTransferItemRow = function () {
  const tbody = document.getElementById("transferItemsTableBody");
  const newRow = createItemRowHTML(tableRowIndex, null, 1);
  tbody.insertAdjacentHTML("beforeend", newRow);

  // Focus on the SKU input of the new row
  setTimeout(() => {
    const newRowElement = tbody.querySelector(
      `[data-row-index="${tableRowIndex}"]`
    );
    const skuInput = newRowElement?.querySelector(".sku-input");
    if (skuInput) skuInput.focus();
  }, 100);

  tableRowIndex++;
  updateItemCount();
};

// Remove a row from the table
window.removeItemRow = function (index) {
  const row = document.querySelector(`[data-row-index="${index}"]`);
  if (row) {
    row.remove();
    updateItemCount();
    renumberRows();
  }
};

// Clear all items
window.clearAllItems = function () {
  Swal.fire({
    title: "Clear All Items?",
    text: "This will remove all items from the transfer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    confirmButtonText: "Yes, Clear All",
  }).then((result) => {
    if (result.isConfirmed) {
      document.getElementById("transferItemsTableBody").innerHTML = "";
      tableRowIndex = 0;
      updateItemCount();
      // Add one empty row
      addTransferItemRow();
    }
  });
};

// Renumber rows after deletion
function renumberRows() {
  const rows = document.querySelectorAll(".item-row");
  rows.forEach((row, idx) => {
    row.querySelector("td:first-child").textContent = idx + 1;
  });
}

// Update total item count
function updateItemCount() {
  const rows = document.querySelectorAll(".item-row");
  document.getElementById(
    "totalItemsCount"
  ).textContent = `${rows.length} row(s)`;
}

// Handle SKU input with autocomplete
window.handleSKUInput = function (input, rowIndex) {
  const searchTerm = input.value.trim().toUpperCase();
  const products = window.stockTransferFormData?.products || [];
  const autocompleteDiv = document.getElementById(`autocomplete-${rowIndex}`);

  if (searchTerm.length < 2) {
    autocompleteDiv.style.display = "none";
    return;
  }

  // Filter products by SKU
  const matches = products
    .filter(
      (p) =>
        p.sku.toUpperCase().includes(searchTerm) ||
        p.name.toUpperCase().includes(searchTerm)
    )
    .slice(0, 10); // Limit to 10 results

  if (matches.length === 0) {
    autocompleteDiv.style.display = "none";
    return;
  }

  // Show autocomplete results
  autocompleteDiv.innerHTML = matches
    .map(
      (p) => `
        <div class="autocomplete-item p-2 border-bottom" 
             style="cursor:pointer; background:#fff"
             onmouseover="this.style.background='#f0f0f0'"
             onmouseout="this.style.background='#fff'"
             onclick="selectProduct(${rowIndex}, ${p.id})">
            <strong>${p.sku}</strong> - ${p.name}
            <small class="text-muted d-block">Stock: ${
              p.current_stock || 0
            }</small>
        </div>
    `
    )
    .join("");

  autocompleteDiv.style.display = "block";
  autocompleteDiv.style.position = "absolute";
  autocompleteDiv.style.backgroundColor = "white";
  autocompleteDiv.style.border = "1px solid #ddd";
  autocompleteDiv.style.borderRadius = "4px";
  autocompleteDiv.style.maxHeight = "200px";
  autocompleteDiv.style.overflowY = "auto";
  autocompleteDiv.style.zIndex = "1000";
  autocompleteDiv.style.width = input.offsetWidth + "px";
};

// Select a product from autocomplete
window.selectProduct = function (rowIndex, productId) {
  const products = window.stockTransferFormData?.products || [];
  const product = products.find((p) => p.id === productId);

  if (!product) return;

  const row = document.querySelector(`[data-row-index="${rowIndex}"]`);
  if (!row) return;

  // Update row fields
  row.querySelector(".sku-input").value = product.sku;
  row.querySelector(".sku-input").dataset.productId = product.id;
  row.querySelector(".product-name-input").value = product.name;
  row.querySelector(".available-stock").textContent =
    product.current_stock || 0;

  // Hide autocomplete
  document.getElementById(`autocomplete-${rowIndex}`).style.display = "none";

  // Focus on quantity
  row.querySelector(".quantity-input").focus();
};

// Handle keyboard navigation in table
window.handleTableKeyNav = function (event, rowIndex, colIndex) {
  if (event.key === "Tab") {
    event.preventDefault();
    const row = document.querySelector(`[data-row-index="${rowIndex}"]`);

    if (colIndex === 0) {
      // SKU column -> Quantity column
      row.querySelector(".quantity-input").focus();
    } else if (colIndex === 1) {
      // Quantity column
      if (!event.shiftKey) {
        // Move to next row or create new
        const nextRow = document.querySelector(
          `[data-row-index="${rowIndex + 1}"]`
        );
        if (nextRow) {
          nextRow.querySelector(".sku-input").focus();
        } else {
          addTransferItemRow();
        }
      } else {
        // Shift+Tab -> go back to SKU
        row.querySelector(".sku-input").focus();
      }
    }
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (colIndex === 0) {
      // From SKU, move to quantity
      event.target.closest("tr").querySelector(".quantity-input").focus();
    } else {
      // From quantity, add new row
      addTransferItemRow();
    }
  }
};

// Quick add by SKU (from quick entry bar)
window.addItemBySKU = function () {
  const skuInput = document.getElementById("quickSKUInput");
  const qtyInput = document.getElementById("quickQtyInput");
  const sku = skuInput.value.trim().toUpperCase();
  const qty = parseInt(qtyInput.value) || 1;

  if (!sku) {
    Swal.fire("Error", "Please enter a SKU", "error");
    return;
  }

  const products = window.stockTransferFormData?.products || [];
  const product = products.find((p) => p.sku.toUpperCase() === sku);

  if (!product) {
    Swal.fire("Error", `Product with SKU "${sku}" not found`, "error");
    return;
  }

  // Add row with this product
  const tbody = document.getElementById("transferItemsTableBody");
  const newRow = createItemRowHTML(tableRowIndex, product, qty);
  tbody.insertAdjacentHTML("beforeend", newRow);
  tableRowIndex++;
  updateItemCount();

  // Clear inputs
  skuInput.value = "";
  qtyInput.value = "1";
  skuInput.focus();

  // Show success message
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: `Added ${product.name}`,
    showConfirmButton: false,
    timer: 2000,
  });
};

// Handle quick entry on Enter key
window.handleQuickSKUEntry = function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addItemBySKU();
  }
};

// Show paste from Excel dialog
window.showPasteDialog = function () {
  const modal = new bootstrap.Modal(document.getElementById("pasteExcelModal"));
  document.getElementById("pasteExcelData").value = "";
  modal.show();
};

// Process pasted Excel data
window.processExcelPaste = function () {
  const pasteData = document.getElementById("pasteExcelData").value;
  const clearExisting = document.getElementById("clearExistingItems").checked;
  const products = window.stockTransferFormData?.products || [];

  if (!pasteData.trim()) {
    Swal.fire("Error", "Please paste some data", "error");
    return;
  }

  // Parse pasted data (tab or space separated: SKU\tQuantity)
  const lines = pasteData.trim().split("\n");
  const itemsToAdd = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const parts = line.trim().split(/\t+|\s{2,}/); // Split by tab or multiple spaces
    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: Invalid format (need SKU and Quantity)`);
      return;
    }

    const sku = parts[0].trim().toUpperCase();
    const qty = parseInt(parts[1]);

    if (!sku || isNaN(qty) || qty <= 0) {
      errors.push(`Line ${idx + 1}: Invalid SKU or quantity`);
      return;
    }

    const product = products.find((p) => p.sku.toUpperCase() === sku);
    if (!product) {
      errors.push(`Line ${idx + 1}: Product "${sku}" not found`);
      return;
    }

    itemsToAdd.push({ product, qty });
  });

  if (errors.length > 0) {
    Swal.fire({
      icon: "warning",
      title: "Import Warnings",
      html: `<div class="text-start"><strong>Some items could not be imported:</strong><ul><li>${errors.join(
        "</li><li>"
      )}</li></ul></div>`,
      confirmButtonText: "Continue Anyway",
    });
  }

  // Clear existing if requested
  if (clearExisting) {
    document.getElementById("transferItemsTableBody").innerHTML = "";
    tableRowIndex = 0;
  }

  // Add all valid items
  const tbody = document.getElementById("transferItemsTableBody");
  itemsToAdd.forEach((item) => {
    const newRow = createItemRowHTML(tableRowIndex, item.product, item.qty);
    tbody.insertAdjacentHTML("beforeend", newRow);
    tableRowIndex++;
  });

  updateItemCount();

  // Close modal
  bootstrap.Modal.getInstance(
    document.getElementById("pasteExcelModal")
  ).hide();

  // Show success
  Swal.fire({
    icon: "success",
    title: "Import Complete",
    text: `Successfully imported ${itemsToAdd.length} items`,
    timer: 2000,
    showConfirmButton: false,
  });
};

// Initialize autocomplete listeners
function initializeTableAutoComplete() {
  // Close autocomplete when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.classList.contains("sku-input")) {
      document.querySelectorAll(".autocomplete-results").forEach((div) => {
        div.style.display = "none";
      });
    }
  });
}

// Override the collectTransferFormData function to work with the table
window.collectTransferFormDataAdvanced = function () {
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

  // Collect items from table
  const items = [];
  const rows = document.querySelectorAll(".item-row");

  rows.forEach((row, idx) => {
    const skuInput = row.querySelector(".sku-input");
    const productId = parseInt(skuInput.dataset.productId);
    const quantity = parseInt(row.querySelector(".quantity-input").value);

    if (productId && quantity > 0) {
      items.push({
        product_id: productId,
        quantity_sent: quantity,
      });
    } else if (skuInput.value.trim()) {
      // Row has SKU but no valid product selected
      Swal.fire(
        "Error",
        `Row ${idx + 1}: Please select a valid product from autocomplete`,
        "error"
      );
      throw new Error("Invalid product");
    }
  });

  if (items.length === 0) {
    Swal.fire("Error", "Please add at least one valid item", "error");
    return null;
  }

  return {
    transfer_number: transferNumber,
    source_warehouse_id: sourceWarehouse,
    destination_warehouse_id: destinationWarehouse,
    notes: notes,
    items: items,
  };
};

// Update the save/submit functions to use the new collector
const originalCollector = window.collectTransferFormData;
window.collectTransferFormData = function () {
  // Try the table-based collector first
  if (document.getElementById("transferItemsTable")) {
    return collectTransferFormDataAdvanced();
  }
  // Fallback to original
  return originalCollector ? originalCollector() : null;
};
