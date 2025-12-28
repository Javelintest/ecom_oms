/**
 * Dispatch Reports Module
 * Generate and export dispatch reports with filters
 */

// Reports State
const reportsState = {
  currentReport: null,
  dateFrom: null,
  dateTo: null,
  filters: {},
};

/**
 * Render dispatch reports interface
 */
function renderDispatchReports(container) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold mb-1"><i class="bi bi-file-earmark-bar-graph me-2"></i>Dispatch Reports</h2>
        <p class="text-muted mb-0">View and export dispatch scan reports</p>
      </div>
      <button class="btn btn-outline-primary" onclick="loadSection('dispatch_scanner')">
        <i class="bi bi-upc-scan me-2"></i>Back to Scanner
      </button>
    </div>

    <div class="row g-4">
      <!-- Filters Panel -->
      <div class="col-lg-3">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h6 class="mb-0"><i class="bi bi-funnel me-2"></i>Filters</h6>
          </div>
          <div class="card-body">
            <!-- Date Range -->
            <div class="mb-3">
              <label class="form-label small fw-bold">Date Range</label>
              <div class="btn-group-vertical w-100 mb-2" role="group">
                <button class="btn btn-sm btn-outline-primary" onclick="setQuickDateRange('today')">Today</button>
                <button class="btn btn-sm btn-outline-primary" onclick="setQuickDateRange('yesterday')">Yesterday</button>
                <button class="btn btn-sm btn-outline-primary" onclick="setQuickDateRange('week')">Last 7 Days</button>
                <button class="btn btn-sm btn-outline-primary" onclick="setQuickDateRange('month')">This Month</button>
              </div>
              
              <label class="form-label small">From</label>
              <input type="date" class="form-control form-control-sm mb-2" id="report-date-from" value="${today}">
              
              <label class="form-label small">To</label>
              <input type="date" class="form-control form-control-sm" id="report-date-to" value="${today}">
            </div>

            <hr>

            <!-- Platform Filter -->
            <div class="mb-3">
              <label class="form-label small fw-bold">Platform</label>
              <select class="form-select form-select-sm" id="report-platform-filter">
                <option value="">All Platforms</option>
                <option value="Amazon">Amazon</option>
                <option value="Flipkart">Flipkart</option>
                <option value="Meesho">Meesho</option>
                <option value="Myntra">Myntra</option>
              </select>
            </div>

            <hr>

            <!-- Actions -->
            <button class="btn btn-primary w-100 mb-2" onclick="generateDispatchReport()">
              <i class="bi bi-file-earmark-text me-2"></i>Generate Report
            </button>
            
            <button class="btn btn-outline-success w-100" onclick="exportReportCSV()" id="export-csv-btn" disabled>
              <i class="bi bi-file-earmark-spreadsheet me-2"></i>Export CSV
            </button>
            
            <button class="btn btn-outline-success w-100 mt-2" onclick="generateManifest()">
              <i class="bi bi-printer me-2"></i>Generate Manifest
            </button>
          </div>
        </div>
      </div>

      <!-- Report Display -->
      <div class="col-lg-9">
        <!-- Summary Cards -->
        <div id="report-summary" class="row g-3 mb-4">
          <!-- Summary cards will be inserted here -->
        </div>

        <!-- Report Table -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Dispatch Records</h6>
            <span class="badge bg-secondary" id="record-count">0 records</span>
          </div>
          <div class="card-body p-0">
            <div id="report-table-container">
              <div class="text-center text-muted py-5">
                <i class="bi bi-file-earmark-bar-graph display-1 d-block mb-3"></i>
                <p class="mb-0">Select date range and click "Generate Report"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load summary on load
  loadDispatchSummary();
}

/**
 * Set quick date range
 */
function setQuickDateRange(range) {
  const today = new Date();
  const dateFrom = document.getElementById("report-date-from");
  const dateTo = document.getElementById("report-date-to");

  if (!dateFrom || !dateTo) return;

  const todayStr = today.toISOString().split("T")[0];
  dateTo.value = todayStr;

  switch (range) {
    case "today":
      dateFrom.value = todayStr;
      break;
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dateFrom.value = yesterday.toISOString().split("T")[0];
      dateTo.value = yesterday.toISOString().split("T")[0];
      break;
    case "week":
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFrom.value = weekAgo.toISOString().split("T")[0];
      break;
    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom.value = monthStart.toISOString().split("T")[0];
      break;
  }
}

/**
 * Load dispatch summary stats
 */
async function loadDispatchSummary() {
  try {
    const response = await axios.get(`${API_BASE_URL}/dispatch/summary`);
    const summary = response.data;

    const summaryContainer = document.getElementById("report-summary");
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="col-md-6 col-lg-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small">Total Scans</div>
                <div class="h3 fw-bold mb-0">${summary.total_scans || 0}</div>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded">
                <i class="bi bi-upc-scan text-primary fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6 col-lg-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small">Today</div>
                <div class="h3 fw-bold mb-0 text-success">${
                  summary.scanned_today || 0
                }</div>
              </div>
              <div class="bg-success bg-opacity-10 p-2 rounded">
                <i class="bi bi-calendar-check text-success fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6 col-lg-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2">By Platform</div>
            ${
              Object.entries(summary.by_platform || {})
                .map(
                  ([platform, count]) => `
              <div class="d-flex justify-content-between small mb-1">
                <span>${platform}</span>
                <strong>${count}</strong>
              </div>
            `
                )
                .join("") || '<div class="text-muted small">No data</div>'
            }
          </div>
        </div>
      </div>
      
      <div class="col-md-6 col-lg-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2">By Status</div>
            ${
              Object.entries(summary.by_status || {})
                .map(
                  ([status, count]) => `
              <div class="d-flex justify-content-between small mb-1">
                <span class="text-capitalize">${status}</span>
                <strong>${count}</strong>
              </div>
            `
                )
                .join("") || '<div class="text-muted small">No data</div>'
            }
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading summary:", error);
  }
}

/**
 * Generate dispatch report
 */
async function generateDispatchReport() {
  const dateFrom = document.getElementById("report-date-from")?.value;
  const dateTo = document.getElementById("report-date-to")?.value;
  const platformFilter = document.getElementById(
    "report-platform-filter"
  )?.value;

  if (!dateFrom || !dateTo) {
    Swal.fire({
      icon: "warning",
      title: "Missing Dates",
      text: "Please select date range",
    });
    return;
  }

  const container = document.getElementById("report-table-container");
  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted">Generating report...</p></div>';

  try {
    const params = {
      date_from: `${dateFrom}T00:00:00`,
      date_to: `${dateTo}T23:59:59`,
    };

    if (platformFilter) {
      params.platform_name = platformFilter;
    }

    const response = await axios.get(`${API_BASE_URL}/dispatch/report`, {
      params,
    });
    const report = response.data;

    reportsState.currentReport = report;
    renderReportTable(report);

    // Enable export button
    document.getElementById("export-csv-btn").disabled = false;
  } catch (error) {
    console.error("Error generating report:", error);
    container.innerHTML = `
      <div class="alert alert-danger m-3">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to generate report: ${
          error.response?.data?.detail || error.message
        }
      </div>
    `;
  }
}

/**
 * Render report table
 */
function renderReportTable(report) {
  const container = document.getElementById("report-table-container");
  const recordCount = document.getElementById("record-count");

  if (!report || !report.items || report.items.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3"></i>
        <p class="mb-0">No dispatch records found for the selected period</p>
      </div>
    `;
    recordCount.textContent = "0 records";
    return;
  }

  recordCount.textContent = `${report.total_records} record${
    report.total_records !== 1 ? "s" : ""
  }`;

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th>Order ID</th>
            <th>Platform</th>
            <th>Scanned At</th>
            <th>Scanned By</th>
            <th>AWB Number</th>
            <th>Courier</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.items
            .map(
              (item) => `
            <tr>
              <td><strong>${item.platform_order_id}</strong></td>
              <td><span class="badge bg-secondary">${
                item.platform_name || "N/A"
              }</span></td>
              <td>${new Date(item.scanned_at).toLocaleString()}</td>
              <td>${item.scanned_by}</td>
              <td>${item.awb_number || "-"}</td>
              <td>${item.courier_partner || "-"}</td>
              <td>${item.customer_name || "-"}</td>
              <td>${
                item.order_total ? "₹" + formatNumber(item.order_total) : "-"
              }</td>
              <td><span class="badge bg-${getStatusColor(
                item.dispatch_status
              )}">${item.dispatch_status}</span></td>
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
 * Get status badge color
 */
function getStatusColor(status) {
  const colors = {
    scanned: "primary",
    packed: "info",
    shipped: "success",
    in_transit: "warning",
    delivered: "success",
  };
  return colors[status] || "secondary";
}

/**
 * Export report to CSV
 */
function exportReportCSV() {
  if (!reportsState.currentReport || !reportsState.currentReport.items) {
    Swal.fire({
      icon: "warning",
      title: "No Report",
      text: "Please generate a report first",
    });
    return;
  }

  const items = reportsState.currentReport.items;

  // Build CSV
  const headers = [
    "Order ID",
    "Platform",
    "Scanned At",
    "Scanned By",
    "AWB Number",
    "Courier",
    "Customer",
    "Amount",
    "Status",
  ];
  const rows = items.map((item) => [
    item.platform_order_id,
    item.platform_name || "",
    new Date(item.scanned_at).toLocaleString(),
    item.scanned_by,
    item.awb_number || "",
    item.courier_partner || "",
    item.customer_name || "",
    item.order_total || "",
    item.dispatch_status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Download CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const dateFrom =
    document.getElementById("report-date-from")?.value || "report";
  const dateTo = document.getElementById("report-date-to")?.value || "";
  const filename = `dispatch_report_${dateFrom}_to_${dateTo}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  Swal.fire({
    icon: "success",
    title: "Exported!",
    text: `Report exported to ${filename}`,
    timer: 2000,
    showConfirmButton: false,
  });
}

/**
 * Generate printable manifest
 */
async function generateManifest() {
  const dateFrom = document.getElementById("report-date-from").value;
  const dateTo = document.getElementById("report-date-to").value;

  if (!dateFrom || !dateTo) {
    Swal.fire({
      icon: "warning",
      title: "Select Date Range",
      text: "Please select date range to generate manifest",
    });
    return;
  }

  Swal.fire({
    title: "Generating Manifest...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await axios.get(`${API_BASE_URL}/dispatch/report`, {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    });

    Swal.close();

    if (!response.data.items || response.data.items.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Records",
        text: "No dispatch records found",
      });
      return;
    }

    const dispatched = response.data.items.filter(
      (i) => i.scan_action !== "cancel"
    );
    const win = window.open("", "_blank");
    win.document.write(getManifestHTML(dispatched, dateFrom, dateTo));
    win.document.close();
    setTimeout(() => win.print(), 500);
  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to generate manifest",
    });
  }
}

function getManifestHTML(items, dateFrom, dateTo) {
  return `<!DOCTYPE html>
<html><head><title>Dispatch Manifest</title>
<style>
@media print { @page { margin: 1cm; } .no-print { display: none; } }
body { font-family: Arial; padding: 20px; max-width: 210mm; margin: 0 auto; }
.header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
.header h1 { margin: 0; font-size: 24px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
th, td { border: 1px solid #000; padding: 8px; text-align: left; }
th { background: #f0f0f0; font-weight: bold; }
.signature-section { margin-top: 40px; page-break-inside: avoid; }
.signature-box { display: inline-block; width: 45%; margin: 10px 2%; vertical-align: top; }
.signature-line { border-top: 2px solid #000; margin-top: 60px; padding-top: 5px; }
</style>
</head>
<body>
<div class="header">
  <h1>📦 DISPATCH MANIFEST</h1>
  <p>Order Delivery Handover Document</p>
</div>
<p><strong>Period:</strong> ${dateFrom} to ${dateTo} | <strong>Generated:</strong> ${new Date().toLocaleDateString()} | <strong>Total Orders:</strong> ${
    items.length
  }</p>
<table>
  <thead><tr><th>S.No</th><th>Order ID</th><th>Platform</th><th>AWB Number</th><th>Courier</th><th>Scanned At</th></tr></thead>
  <tbody>${items
    .map(
      (item, i) => `<tr>
    <td>${i + 1}</td>
    <td><strong>${item.platform_order_id}</strong></td>
    <td>${item.platform_name || "N/A"}</td>
    <td>${item.awb_number || "N/A"}</td>
    <td>${item.courier_partner || "N/A"}</td>
    <td>${new Date(item.scanned_at).toLocaleString()}</td>
  </tr>`
    )
    .join("")}</tbody>
</table>
<div class="signature-section">
  <h3>Acknowledgment & Signatures</h3>
  <div class="signature-box">
    <p><strong>Prepared By (Warehouse)</strong></p>
    <div class="signature-line">
      Name: _________________________<br>
      Signature: ____________________<br>
      Date & Time: __________________
    </div>
  </div>
  <div class="signature-box">
    <p><strong>Received By (Delivery Partner)</strong></p>
    <div class="signature-line">
      Name: _________________________<br>
      Signature: ____________________<br>
      Date & Time: __________________<br>
      ID Number: ____________________
    </div>
  </div>
</div>
<p style="text-align:center; margin-top:30px; font-size:10px; border-top:1px solid #ccc; padding-top:10px;">
  <strong>Important:</strong> This manifest must be signed by both parties and kept for records.<br>
  Generated by Javelin OMS - Dispatch Management System
</p>
<div class="no-print" style="text-align:center; margin-top:20px;">
  <button onclick="window.print()" style="padding:10px 20px; font-size:16px;">🖨️ Print</button>
  <button onclick="window.close()" style="padding:10px 20px; font-size:16px; margin-left:10px;">❌ Close</button>
</div>
</body></html>`;
}
