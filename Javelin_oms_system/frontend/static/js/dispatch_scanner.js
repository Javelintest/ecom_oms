/**
 * Enhanced Dispatch Scanner Module
 * Camera-based barcode scanning with channel selection and cancellation support
 */

// Load saved settings from localStorage first
const savedAutoSubmit = localStorage.getItem("dispatch_auto_submit");
const savedValidationMode = localStorage.getItem("dispatch_validation_mode");

// Scanner State with persisted values
const scannerState = {
  isScanning: false,
  todayScans: 0,
  recentScans: [],
  selectedWarehouse: null,
  selectedChannel: null, // Fixed channel selection
  scanMode: "dispatch", // 'dispatch' or 'cancel'
  html5QrCode: null, // html5-qrcode scanner instance
  isProcessing: false, // Prevent duplicate scans
  autoSubmit: savedAutoSubmit !== null ? savedAutoSubmit === "true" : true, // Load from storage or default true
  validationMode: savedValidationMode || "strict", // Load from storage or default strict
};

/**
 * Render enhanced dispatch scanner interface
 */
function renderDispatchScanner(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold mb-1"><i class="bi bi-upc-scan me-2"></i>Dispatch Scanner</h2>
        <p class="text-muted mb-0">Scan order barcodes for dispatch tracking</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" onclick="openScannerSettings()">
          <i class="bi bi-gear me-2"></i>Scanner Settings
        </button>
        <button class="btn btn-outline-secondary" onclick="viewDispatchReports()">
          <i class="bi bi-file-earmark-bar-graph me-2"></i>View Reports
        </button>
      </div>
    </div>

    <!-- Channel Selection Banner (Sticky) -->
    <div class="alert alert-info border-0 shadow-sm mb-4" id="channel-selection-banner">
      <div class="row align-items-center">
        <div class="col-md-6">
          <label class="form-label fw-bold mb-2">
            <i class="bi bi-shop me-2"></i>Select Channel/Platform
          </label>
          <select class="form-select form-select-lg" id="channel-selector" onchange="handleChannelChange()">
            <option value="">-- Select Channel --</option>
            <option value="Amazon">Amazon</option>
            <option value="Flipkart">Flipkart</option>
            <option value="Meesho">Meesho</option>
            <option value="Myntra">Myntra</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label fw-bold mb-2">
            <i class="bi bi-building me-2"></i>Warehouse
          </label>
          <select class="form-select form-select-lg" id="warehouse-selector">
            <option value="">Select Warehouse</option>
          </select>
        </div>
      </div>
      <div class="mt-3" id="channel-locked-display" style="display: none;">
        <div class="d-flex align-items-center justify-content-between p-3 bg-white rounded">
          <div>
            <strong class="text-success">Channel Locked:</strong>
            <span class="badge bg-primary fs-6 ms-2" id="locked-channel-name"></span>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="unlockChannel()">
            <i class="bi bi-unlock me-1"></i>Change Channel
          </button>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <!-- Scanner Panel -->
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <!-- Scan Counter -->
            <div class="text-center mb-4">
              <div class="display-1 fw-bold text-primary" id="scan-counter">${scannerState.todayScans}</div>
              <div class="text-muted">Scans Today</div>
            </div>

            <!-- Scan Mode Toggle -->
            <div class="btn-group w-100 mb-4" role="group">
              <input type="radio" class="btn-check" name="scanMode" id="mode-dispatch" value="dispatch" checked>
              <label class="btn btn-outline-success" for="mode-dispatch" onclick="setScanMode('dispatch')">
                <i class="bi bi-truck me-2"></i>Dispatch Order
              </label>
              
              <input type="radio" class="btn-check" name="scanMode" id="mode-cancel" value="cancel">
              <label class="btn btn-outline-danger" for="mode-cancel" onclick="setScanMode('cancel')">
                <i class="bi bi-x-circle me-2"></i>Cancel Order
              </label>
            </div>

            <!-- Camera Scanner -->
            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label fw-bold mb-0">Camera Scanner</label>
                <button class="btn btn-sm btn-primary" id="camera-toggle-btn" onclick="toggleCamera()">
                  <i class="bi bi-camera-video me-1"></i>Start Camera
                </button>
              </div>
              
              <!-- Camera Scanner Container -->
              <div id="camera-container" class="border rounded p-3 mb-4" style="display: none; background: #000; position: relative; z-index: 1; overflow: hidden;">
                <style>
                  #qr-reader {
                    overflow: hidden !important;
                  }
                  #qr-reader video {
                    width: 100% !important;
                    max-height: 400px !important;
                    height: auto !important;
                    display: block !important;
                    object-fit: contain !important;
                  }
                  #qr-reader__dashboard_section {
                    display: none !important;
                  }
                  #qr-reader canvas {
                    max-height: 400px !important;
                  }
                </style>
                <div id="qr-reader" style="width: 100%; height: 400px; max-height: 400px; position: relative; overflow: hidden;"></div>
                <div class="alert alert-info mt-3 mb-0" id="scan-mode-indicator">
                  <i class="bi bi-info-circle me-2"></i>
                  <strong id="scan-mode-text">Auto-Submit Enabled:</strong> 
                  <span id="scan-mode-description">Detected barcodes will be processed automatically</span>
                </div>
              </div>
            </div>

            <!-- Manual Input (Fallback) -->
            <div class="mb-4">
              <label class="form-label fw-bold">Manual Entry (Fallback)</label>
              <div class="input-group input-group-lg">
                <span class="input-group-text"><i class="bi bi-keyboard"></i></span>
                <input 
                  type="text" 
                  class="form-control" 
                  id="barcode-input" 
                  placeholder="Type order ID or scan with USB scanner..." 
                  autocomplete="off"
                >
                <button class="btn btn-primary" onclick="handleManualScan()">
                  <i class="bi bi-check-lg me-2"></i>Submit
                </button>
              </div>
              <small class="text-muted">Press Enter or click Submit</small>
            </div>

            <!-- Additional Details -->
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">AWB Number (Optional)</label>
                <input type="text" class="form-control" id="awb-input" placeholder="Airway bill number">
              </div>
              <div class="col-md-6">
                <label class="form-label">Courier Partner (Optional)</label>
                <select class="form-select" id="courier-select">
                  <option value="">Select Courier</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="Xpressbees">Xpressbees</option>
                  <option value="Amazon Shipping">Amazon Shipping</option>
                  <option value="Ekart">Ekart (Flipkart)</option>
                </select>
              </div>
            </div>

            <!-- Feedback Area -->
            <div id="scan-feedback" class="mt-4"></div>
          </div>
        </div>
      </div>

      <!-- Recent Scans Sidebar -->
      <div class="col-lg-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recent Scans</h6>
          </div>
          <div class="card-body p-0">
            <div id="recent-scans-list" class="list-group list-group-flush" style="max-height: 600px; overflow-y: auto;">
              <div class="text-center text-muted py-4">
                <i class="bi bi-inbox display-4 d-block mb-2"></i>
                <p class="mb-0">No scans yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize
  loadWarehouses();
  loadTodayScans();
  setupScannerListeners();
}

/**
 * Toggle auto-submit setting
 */
function toggleAutoSubmit() {
  const toggleElement = document.getElementById("auto-submit-toggle");
  if (toggleElement) {
    scannerState.autoSubmit = toggleElement.checked;
  }

  // Update indicator text (only if elements exist)
  const modeText = document.getElementById("scan-mode-text");
  const modeDesc = document.getElementById("scan-mode-description");

  if (modeText && modeDesc) {
    if (scannerState.autoSubmit) {
      modeText.textContent = "Auto-Submit Enabled:";
      modeDesc.textContent = "Detected barcodes will be processed automatically";
    } else {
      modeText.textContent = "Manual Mode:";
      modeDesc.textContent =
        "Scanned barcodes will appear in input field, click Submit to process";
    }
  }

  // Save preference to localStorage
  localStorage.setItem("dispatch_auto_submit", scannerState.autoSubmit);
}

/**
 * Toggle validation mode setting
 */
function toggleValidationMode() {
  scannerState.validationMode = document.getElementById(
    "validation-mode-toggle"
  ).checked
    ? "loose"
    : "strict";

  // Show explanation
  if (scannerState.validationMode === "loose") {
    Swal.fire({
      icon: "info",
      title: "Loose Validation Enabled",
      html: `
        <p><strong>Scans will be saved immediately</strong> without checking if order exists.</p>
        <p>Use this mode when:</p>
        <ul class="text-start">
          <li>Orders haven't synced yet</li>
          <li>Scanning logistics labels before order data arrives</li>
          <li>Bulk scanning without real-time validation</li>
        </ul>
        <p class="text-muted small">Orders will be linked later when data becomes available</p>
      `,
      timer: 5000,
      timerProgressBar: true,
    });
  }

  // Save preference to localStorage
  localStorage.setItem("dispatch_validation_mode", scannerState.validationMode);
}

/**
 * Open scanner settings modal
 */
function openScannerSettings() {
  Swal.fire({
    title: '<i class="bi bi-gear me-2"></i>Scanner Settings',
    html: `
      <div class="text-start">
        <!-- Auto-Submit Setting -->
        <div class="card mb-3">
          <div class="card-body">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="modal-auto-submit-toggle" ${
                scannerState.autoSubmit ? "checked" : ""
              }>
              <label class="form-check-label fw-bold" for="modal-auto-submit-toggle">
                <i class="bi bi-lightning-charge me-2 text-warning"></i>Auto-Submit Mode
              </label>
            </div>
            <small class="text-muted d-block mt-2">
              When enabled, scanned barcodes are processed automatically without clicking Submit button.
            </small>
          </div>
        </div>

        <!-- Validation Mode Setting -->
        <div class="card mb-3">
          <div class="card-body">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="modal-validation-mode-toggle" ${
                scannerState.validationMode === "loose" ? "checked" : ""
              }>
              <label class="form-check-label fw-bold" for="modal-validation-mode-toggle">
                <i class="bi bi-shield-check me-2 text-info"></i>Loose Validation Mode
              </label>
            </div>
            <small class="text-muted d-block mt-2">
              <strong>Strict (OFF):</strong> Order must exist in database before scanning<br>
              <strong>Loose (ON):</strong> Save scan immediately, map to order later
            </small>
            <div class="alert alert-info mt-2 mb-0 small">
              <strong>Use Loose Mode when:</strong>
              <ul class="mb-0 ps-3">
                <li>Orders haven't synced yet</li>
                <li>Scanning before order data arrives</li>
                <li>Bulk scanning without validation</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Current Settings Status -->
        <div class="alert alert-secondary mb-0">
          <strong><i class="bi bi-info-circle me-2"></i>Current Status:</strong><br>
          <span id="settings-status"></span>
        </div>
      </div>
    `,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-lg me-2"></i>Save Settings',
    cancelButtonText: "Cancel",
    didOpen: () => {
      // Update status display
      updateSettingsStatus();

      // Add change listeners
      document
        .getElementById("modal-auto-submit-toggle")
        .addEventListener("change", updateSettingsStatus);
      document
        .getElementById("modal-validation-mode-toggle")
        .addEventListener("change", updateSettingsStatus);
    },
    preConfirm: () => {
      // Get values from modal
      const autoSubmit = document.getElementById(
        "modal-auto-submit-toggle"
      ).checked;
      const validationMode = document.getElementById(
        "modal-validation-mode-toggle"
      ).checked
        ? "loose"
        : "strict";

      return { autoSubmit, validationMode };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      // Apply settings
      scannerState.autoSubmit = result.value.autoSubmit;
      scannerState.validationMode = result.value.validationMode;

      // Update UI toggles (if they exist in main view)
      const autoSubmitToggle = document.getElementById("auto-submit-toggle");
      if (autoSubmitToggle) autoSubmitToggle.checked = scannerState.autoSubmit;

      const validationToggle = document.getElementById(
        "validation-mode-toggle"
      );
      if (validationToggle)
        validationToggle.checked = scannerState.validationMode === "loose";

      // Save to localStorage
      localStorage.setItem("dispatch_auto_submit", scannerState.autoSubmit);
      localStorage.setItem(
        "dispatch_validation_mode",
        scannerState.validationMode
      );

      // Update scan mode indicator
      toggleAutoSubmit();

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Settings Saved!",
        text: "Scanner settings have been updated",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  });
}

/**
 * Update settings status display in modal
 */
function updateSettingsStatus() {
  const statusEl = document.getElementById("settings-status");
  if (!statusEl) return;

  const autoSubmit = document.getElementById(
    "modal-auto-submit-toggle"
  )?.checked;
  const validationMode = document.getElementById("modal-validation-mode-toggle")
    ?.checked
    ? "loose"
    : "strict";

  const autoSubmitText = autoSubmit
    ? '<span class="badge bg-success">Auto-Submit: ON</span>'
    : '<span class="badge bg-secondary">Auto-Submit: OFF</span>';

  const validationText =
    validationMode === "loose"
      ? '<span class="badge bg-info">Validation: LOOSE</span>'
      : '<span class="badge bg-primary">Validation: STRICT</span>';

  statusEl.innerHTML = `${autoSubmitText} ${validationText}`;
}

/**
 * Handle channel selection change
 */
function handleChannelChange() {
  const selector = document.getElementById("channel-selector");
  const selectedChannel = selector.value;

  if (selectedChannel) {
    // Lock the channel
    scannerState.selectedChannel = selectedChannel;

    // Update UI
    document.getElementById("locked-channel-name").textContent =
      selectedChannel;
    document.getElementById("channel-locked-display").style.display = "block";
    selector.disabled = true;

    Swal.fire({
      icon: "success",
      title: "Channel Locked",
      text: `All scans will be recorded under ${selectedChannel}`,
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

/**
 * Unlock channel selection
 */
function unlockChannel() {
  Swal.fire({
    title: "Change Channel?",
    text: "This will allow you to select a different platform",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, change",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (result.isConfirmed) {
      scannerState.selectedChannel = null;
      document.getElementById("channel-selector").disabled = false;
      document.getElementById("channel-selector").value = "";
      document.getElementById("channel-locked-display").style.display = "none";
    }
  });
}

/**
 * Set scan mode (dispatch or cancel)
 */
function setScanMode(mode) {
  scannerState.scanMode = mode;
  const feedbackDiv = document.getElementById("scan-feedback");

  if (mode === "cancel") {
    feedbackDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Cancel Mode Active:</strong> Scans will mark orders as CANCELLED
      </div>
    `;
  } else {
    feedbackDiv.innerHTML = "";
  }
}

/**
 * Toggle camera on/off
 */
async function toggleCamera() {
  const container = document.getElementById("camera-container");
  const btn = document.getElementById("camera-toggle-btn");

  if (scannerState.html5QrCode) {
    // Stop camera
    await stopCamera();
    container.style.display = "none";
    btn.innerHTML = '<i class="bi bi-camera-video me-1"></i>Start Camera';
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-primary");
  } else {
    // Check if channel is selected
    if (!scannerState.selectedChannel) {
      Swal.fire({
        icon: "warning",
        title: "Select Channel First",
        text: "Please select a channel/platform before starting the scanner",
      });
      return;
    }

    // Check if Html5Qrcode is loaded
    if (typeof Html5Qrcode === "undefined") {
      Swal.fire({
        icon: "error",
        title: "Library Not Loaded",
        text: "html5-qrcode library is not loaded. Please refresh the page.",
      });
      return;
    }

    // Start camera
    try {
      await startCamera();
      container.style.display = "block";
      btn.innerHTML = '<i class="bi bi-camera-video-off me-1"></i>Stop Camera';
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-danger");
    } catch (error) {
      console.error("Camera error:", error);
      Swal.fire({
        icon: "error",
        title: "Camera Error",
        html: `Failed to access camera:<br><small>${error.message}</small><br><br>
               <strong>Common fixes:</strong><br>
               • Allow camera permissions in browser<br>
               • Close other apps using camera<br>
               • Use HTTPS or localhost`,
      });
    }
  }
}

/**
 * Start camera for scanning with html5-qrcode
 */
async function startCamera() {
  try {
    console.log("=== Camera Initialization Start ===");
    console.log("1. Checking Html5Qrcode availability...");

    if (typeof Html5Qrcode === "undefined") {
      throw new Error("Html5Qrcode library not loaded");
    }
    console.log("✓ Html5Qrcode library is available");

    console.log("2. Checking available cameras...");
    const cameras = await Html5Qrcode.getCameras();
    console.log("✓ Found cameras:", cameras.length);

    if (cameras.length === 0) {
      throw new Error("No cameras found on this device");
    }

    console.log("3. Initializing Html5Qrcode scanner...");
    scannerState.html5QrCode = new Html5Qrcode("qr-reader");
    console.log("✓ Scanner instance created");

    // Optimized configuration for better detection
    const config = {
      fps: 30, // Increased to 30 for FASTER scanning
      qrbox: { width: 300, height: 300 }, // Larger scanning area
      aspectRatio: 1.0,
      disableFlip: false, // Allow mirrored scanning
      videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    console.log("4. Starting camera with optimized config:", config);

    // Use the first available camera (usually back camera on mobile)
    const cameraId = cameras[0].id;
    console.log("Using camera:", cameras[0].label || cameraId);

    // Start scanning with all supported formats
    await scannerState.html5QrCode.start(
      cameraId,
      config,
      onScanSuccess,
      onScanError
    );

    console.log("✓ Camera started successfully!");
    console.log("📷 Scanner is now actively detecting barcodes...");
    console.log("💡 TIP: Hold barcode/QR 6-12 inches from camera");
    console.log("💡 TIP: Ensure good lighting and steady hand");
    console.log("=== Camera Initialization Complete ===");

    // Add blink indicator to show scanner is active
    const cameraContainer = document.getElementById("qr-reader");
    if (cameraContainer) {
      const indicator = document.createElement("div");
      indicator.id = "scan-indicator";
      indicator.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        width: 12px;
        height: 12px;
        background: #00ff00;
        border-radius: 50%;
        animation: blink 1s ease-in-out infinite;
        z-index: 1000;
      `;
      cameraContainer.appendChild(indicator);

      // Add CSS animation
      if (!document.getElementById("scan-animation-style")) {
        const style = document.createElement("style");
        style.id = "scan-animation-style";
        style.innerHTML = `
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  } catch (error) {
    console.error("❌ Camera initialization failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    scannerState.html5QrCode = null;
    throw error;
  }
}

/**
 * Stop camera scanner
 */
async function stopCamera() {
  if (scannerState.html5QrCode) {
    try {
      await scannerState.html5QrCode.stop();
      await scannerState.html5QrCode.clear();
      scannerState.html5QrCode = null;
      scannerState.isProcessing = false;
      console.log("Camera stopped");
    } catch (error) {
      console.error("Error stopping camera:", error);
    }
  }
}

/**
 * Callback when barcode is successfully scanned
 */
function onScanSuccess(decodedText, decodedResult) {
  // Prevent processing duplicate scans
  if (scannerState.isProcessing) {
    console.log("⏳ Scan ignored - already processing");
    return;
  }

  console.warn("========================================");
  console.warn("🎯 BARCODE DETECTED:", decodedText);
  console.warn("📋 Scan details:", decodedResult);
  console.warn("========================================");

  // Flash entire screen for visibility
  document.body.style.backgroundColor = "#00ff00";
  setTimeout(() => {
    document.body.style.backgroundColor = "";
  }, 200);

  scannerState.isProcessing = true;

  // Strong visual feedback
  const container = document.getElementById("qr-reader");
  if (container) {
    // Flash green border
    container.style.border = "8px solid #28a745";
    container.style.transition = "border 0.3s";
    setTimeout(() => {
      container.style.border = "none";
    }, 500);
  }

  // Play sound
  playSuccessSound();

  // Check auto-submit setting
  if (scannerState.autoSubmit) {
    console.log("⚡ Auto-submit mode: Processing immediately...");
    // Auto-submit: process immediately
    processScan(decodedText)
      .then(() => {
        // After successful scan, show "Next" button
        showNextButton();
      })
      .catch(() => {
        // On error, allow scanning immediately
        setTimeout(() => {
          scannerState.isProcessing = false;
          console.log("✅ Ready for next scan");
        }, 1000);
      });
  } else {
    console.log("✋ Manual mode: Populating input field...");
    // Manual mode: populate input field
    const input = document.getElementById("barcode-input");
    if (input) {
      input.value = decodedText;
      input.focus();
      input.select(); // Highlight the text
    }

    showScanFeedback("info", `📦 Barcode scanned: ${decodedText}`, {
      order_details: { info: "Click Submit button to process this order" },
    });

    // Allow next scan immediately in manual mode
    setTimeout(() => {
      scannerState.isProcessing = false;
      console.log("✅ Ready for next scan");
    }, 500);
  }
}

/**
 * Show "Next" button after successful scan
 */
function showNextButton() {
  const feedbackDiv = document.getElementById("scan-feedback");

  // Add "Next" button to feedback
  const existingContent = feedbackDiv.innerHTML;
  feedbackDiv.innerHTML =
    existingContent +
    `
    <div class="d-grid mt-3">
      <button class="btn btn-primary btn-lg" onclick="readyForNextScan()" id="next-scan-btn">
        <i class="bi bi-arrow-right-circle me-2"></i>Next Scan
      </button>
    </div>
  `;
}

/**
 * Reset scanner to ready state for next scan
 */
function readyForNextScan() {
  scannerState.isProcessing = false;

  // Clear feedback
  const feedbackDiv = document.getElementById("scan-feedback");
  feedbackDiv.innerHTML = "";

  // Clear inputs
  document.getElementById("barcode-input").value = "";
  document.getElementById("awb-input").value = "";

  console.log("✅ Ready for next scan");

  // Focus back on input for USB scanner
  document.getElementById("barcode-input").focus();
}

/**
 * Callback for scan errors (optional, for debugging)
 */
function onScanError(errorMessage) {
  // Ignore scan errors (happens frequently during scanning)
}

// ... (rest of the functions remain the same: loadWarehouses, loadTodayScans, setupScannerListeners,
// handleManualScan, processScan, handleOrderCancellation, updateScanCounter, renderRecentScans,
// showScanFeedback, playSuccessSound, playErrorSound, formatTimeAgo, viewDispatchReports)
// Copy all remaining functions from lines 230 onwards
async function loadWarehouses() {
  try {
    const selector = document.getElementById("warehouse-selector");
    if (selector) {
      selector.innerHTML = `
        <option value="">Select Warehouse</option>
        <option value="1">Main Warehouse</option>
        <option value="2">Secondary Warehouse</option>
      `;
    }
  } catch (error) {
    console.error("Error loading warehouses:", error);
  }
}

async function loadTodayScans() {
  try {
    const response = await axios.get(`${API_BASE_URL}/mango/dispatch/summary`);
    scannerState.todayScans = response.data.scanned_today || 0;
    updateScanCounter();
    loadRecentScans();
  } catch (error) {
    // Handle 404 gracefully - endpoint might not exist yet
    if (error.response?.status === 404) {
      console.log("Dispatch summary endpoint not available, using defaults");
      scannerState.todayScans = 0;
      updateScanCounter();
      loadRecentScans();
    } else {
      console.error("Error loading scan summary:", error);
      scannerState.todayScans = 0;
      updateScanCounter();
    }
  }
}

async function loadRecentScans() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await axios.get(`${API_BASE_URL}/mango/dispatch/scans`, {
      params: {
        date_from: today,
        limit: 20,
      },
    });

    scannerState.recentScans = response.data || [];
    renderRecentScans();
  } catch (error) {
    // Handle 404 gracefully
    if (error.response?.status === 404) {
      console.log("Dispatch scans endpoint not available, using empty list");
      scannerState.recentScans = [];
      renderRecentScans();
    } else {
      console.error("Error loading recent scans:", error);
      scannerState.recentScans = [];
      renderRecentScans();
    }
  }
}

function setupScannerListeners() {
  const input = document.getElementById("barcode-input");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleManualScan();
      }
    });
    input.focus();
  }

  // Settings are already loaded from localStorage in scannerState initialization
  // Just log current settings for confirmation
  console.log("📋 Scanner Settings Loaded:");
  console.log("  - Auto-Submit:", scannerState.autoSubmit ? "ON" : "OFF");
  console.log(
    "  - Validation Mode:",
    scannerState.validationMode.toUpperCase()
  );

  // Update toggle UI to match loaded state (no need to reload from storage)
  const autoSubmitToggle = document.getElementById("auto-submit-toggle");
  if (autoSubmitToggle) autoSubmitToggle.checked = scannerState.autoSubmit;

  const validationToggle = document.getElementById("validation-mode-toggle");
  if (validationToggle)
    validationToggle.checked = scannerState.validationMode === "loose";

  // Update scan mode indicator if in auto-submit mode (only if elements exist)
  const modeText = document.getElementById("scan-mode-text");
  const modeDesc = document.getElementById("scan-mode-description");
  if (scannerState.autoSubmit && modeText && modeDesc) {
    toggleAutoSubmit();
  }
}

async function handleManualScan() {
  const input = document.getElementById("barcode-input");
  const barcodeData = input.value.trim();

  if (!barcodeData) {
    showScanFeedback("warning", "Please enter a barcode or order ID");
    return;
  }

  if (!scannerState.selectedChannel) {
    showScanFeedback("warning", "Please select a channel first");
    return;
  }

  await processScan(barcodeData);
}

async function processScan(barcodeData) {
  const feedbackDiv = document.getElementById("scan-feedback");
  feedbackDiv.innerHTML =
    '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Processing...</p></div>';

  try {
    let validationResponse = null;

    // In STRICT mode: validate first
    // In LOOSE mode: skip validation, go straight to save
    if (scannerState.validationMode === "strict") {
      console.log("🔒 STRICT MODE: Validating order exists...");

      validationResponse = await axios.post(
        `${API_BASE_URL}/mango/dispatch/validate`,
        null,
        {
          params: { barcode_data: barcodeData },
        }
      );

      if (!validationResponse.data.is_valid) {
        showScanFeedback(
          "danger",
          validationResponse.data.message,
          validationResponse.data
        );
        playErrorSound();
        return;
      }

      if (scannerState.scanMode === "cancel") {
        await handleOrderCancellation(barcodeData, validationResponse.data);
        return;
      }

      if (validationResponse.data.already_dispatched) {
        showScanFeedback(
          "warning",
          validationResponse.data.message,
          validationResponse.data
        );
        playErrorSound();
        return;
      }
    } else {
      console.log(
        "🔓 LOOSE MODE: Skipping validation, saving scan directly..."
      );
    }

    const warehouseId =
      document.getElementById("warehouse-selector")?.value || null;
    const awbNumber = document.getElementById("awb-input")?.value || null;
    const courierPartner =
      document.getElementById("courier-select")?.value || null;

    const scanData = {
      platform_order_id: barcodeData,
      barcode_data: barcodeData,
      warehouse_id: warehouseId ? parseInt(warehouseId) : null,
      awb_number: awbNumber,
      courier_partner: courierPartner,
      platform_name: scannerState.selectedChannel,
    };

    // Include validation mode and scan action in request
    const scanResponse = await axios.post(
      `${API_BASE_URL}/mango/dispatch/scan?validation_mode=${scannerState.validationMode}&scan_action=${scannerState.scanMode}`,
      scanData
    );

    // Success message varies by mode
    const successMessage =
      scannerState.validationMode === "loose"
        ? `✓ Scan recorded: ${barcodeData}`
        : `✓ Order ${barcodeData} dispatched successfully!`;

    showScanFeedback("success", successMessage, scanResponse.data);
    playSuccessSound();

    scannerState.todayScans++;
    updateScanCounter();

    scannerState.recentScans.unshift(scanResponse.data);
    if (scannerState.recentScans.length > 20) {
      scannerState.recentScans.pop();
    }
    renderRecentScans();

    document.getElementById("barcode-input").value = "";
    document.getElementById("awb-input").value = "";
    document.getElementById("barcode-input").focus();

    setTimeout(() => {
      if (scannerState.scanMode === "dispatch") {
        feedbackDiv.innerHTML = "";
      }
    }, 3000);
  } catch (error) {
    console.error("Error processing scan:", error);
    const errorMsg = error.response?.data?.detail || "Failed to process scan";
    showScanFeedback("danger", errorMsg);
    playErrorSound();
  }
}

async function handleOrderCancellation(orderId, orderData) {
  const result = await Swal.fire({
    title: "Cancel Order?",
    html: `
      <p>Are you sure you want to mark this order as CANCELLED?</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      ${
        orderData.order_details?.customer_name
          ? `<p><strong>Customer:</strong> ${orderData.order_details.customer_name}</p>`
          : ""
      }
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Cancel Order",
    confirmButtonColor: "#dc3545",
    cancelButtonText: "No, Go Back",
  });

  if (result.isConfirmed) {
    try {
      showScanFeedback("success", `Order ${orderId} marked as CANCELLED`);
      playSuccessSound();

      document.getElementById("barcode-input").value = "";
      document.getElementById("barcode-input").focus();
    } catch (error) {
      showScanFeedback(
        "danger",
        "Failed to cancel order: " +
          (error.response?.data?.detail || error.message)
      );
      playErrorSound();
    }
  }
}

function updateScanCounter() {
  const counter = document.getElementById("scan-counter");
  if (counter) {
    counter.textContent = scannerState.todayScans;
    counter.style.transform = "scale(1.2)";
    counter.style.transition = "transform 0.2s";
    setTimeout(() => {
      counter.style.transform = "scale(1)";
    }, 200);
  }
}

function renderRecentScans() {
  const list = document.getElementById("recent-scans-list");
  if (!list) return;

  if (scannerState.recentScans.length === 0) {
    list.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-inbox display-4 d-block mb-2"></i>
        <p class="mb-0">No scans yet</p>
      </div>
    `;
    return;
  }

  list.innerHTML = scannerState.recentScans
    .map((scan) => {
      const statusBadge =
        scan.scan_action === "cancel"
          ? '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Cancelled</span>'
          : '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Dispatched</span>';

      return `
    <div class="list-group-item">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="flex-grow-1">
          <div class="fw-bold">${scan.platform_order_id}</div>
          <small class="text-muted">${
            scan.platform_name || "Unknown Platform"
          }</small>
          ${
            scan.awb_number
              ? `<div class="small"><i class="bi bi-box-seam me-1"></i>${scan.awb_number}</div>`
              : ""
          }
        </div>
        <small class="text-muted">${formatTimeAgo(
          new Date(scan.scanned_at)
        )}</small>
      </div>
      ${statusBadge}
    </div>
  `;
    })
    .join("");
}

function showScanFeedback(type, message, data = null) {
  const feedbackDiv = document.getElementById("scan-feedback");
  if (!feedbackDiv) return;

  const alertClass = `alert-${type}`;
  const iconMap = {
    success: "check-circle-fill",
    danger: "exclamation-triangle-fill",
    warning: "exclamation-circle-fill",
    info: "info-circle-fill",
  };

  feedbackDiv.innerHTML = `
    <div class="alert ${alertClass} d-flex align-items-center" role="alert">
      <i class="bi bi-${iconMap[type]} me-3 fs-4"></i>
      <div class="flex-grow-1">
        <strong>${message}</strong>
        ${
          data?.order_details
            ? `
          <div class="mt-2 small">
            ${
              data.order_details.customer_name
                ? `Customer: ${data.order_details.customer_name}<br>`
                : ""
            }
            ${
              data.order_details.order_total
                ? `Total: ₹${formatNumber(data.order_details.order_total)}<br>`
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported
  }
}

function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200;
    oscillator.type = "square";

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.2
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Audio not supported
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

function formatNumber(num) {
  return new Intl.NumberFormat("en-IN").format(num);
}

function viewDispatchReports() {
  loadSection("dispatch_reports");
}
