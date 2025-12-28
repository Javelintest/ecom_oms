// ====================================================================
// STUB FUNCTIONS FOR UNIMPLEMENTED MODULES
// These prevent ReferenceErrors for menu items without implementations
// ====================================================================

// Note: renderSalesModule is now implemented in customer_module.js

// Stub for standalone Sale Module (legacy)
function renderSaleModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-cart-check" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Sales Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Return Module
function renderReturnModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-arrow-return-left" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Returns Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Purchase Module
function renderPurchaseModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-bag-check" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Purchase Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Payment/Reconciliation Module
function renderRecoModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-credit-card" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Payment & Reconciliation</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Tracking Module (Deep Track)
function renderTrackingModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-geo-alt" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Deep Track Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Flow Module
function renderFlowModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-diagram-3" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Flow Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}

// Stub for Design Module
function renderDesignModule(container) {
  container.innerHTML = `
        <div class="text-center p-5">
            <i class="bi bi-palette" style="font-size: 64px; color: #cbd5e1;"></i>
            <h3 class="mt-3 text-muted">Design Module</h3>
            <p class="text-muted">This module is under development</p>
        </div>
    `;
}
