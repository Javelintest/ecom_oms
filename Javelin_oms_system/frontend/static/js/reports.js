// Reports page JavaScript
const API_BASE_URL = "http://127.0.0.1:8000/oms";

let platforms = [];
let selectedPlatform = null;
let selectedReportType = null;
let availableReportTypes = [];

// ===== SIDEBAR NAVIGATION =====
const sidebar = document.getElementById("sidebar");
const sidebarOpen = document.getElementById("sidebar-open");
const sidebarClose = document.getElementById("sidebar-close");

// Mobile sidebar toggle
sidebarOpen?.addEventListener("click", () => {
  sidebar?.classList.add("open");
});

sidebarClose?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  if (window.innerWidth < 992) {
    if (
      sidebar?.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !sidebarOpen?.contains(e.target)
    ) {
      sidebar.classList.remove("open");
    }
  }
});

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  loadPlatforms();
  setupEventListeners();
});

function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Sidebar theme toggle
  document
    .getElementById("theme-toggle-nav")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      toggleTheme();
    });

  // Refresh button
  document
    .getElementById("btn-refresh-reports")
    ?.addEventListener("click", () => {
      if (selectedPlatform) {
        loadRecentReports(selectedPlatform.id);
      }
    });

  // Request report form
  document
    .getElementById("request-report-form")
    ?.addEventListener("submit", handleRequestReport);

  // Category filter
  document
    .getElementById("category-filter")
    ?.addEventListener("change", filterReportTypes);
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("light-mode")
    ? "light"
    : "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  localStorage.setItem("theme", newTheme);
}

function setTheme(theme) {
  const themeIcon = document.getElementById("theme-icon");
  const themeIconNav = document.getElementById("theme-icon-nav");
  const themeTextNav = document.getElementById("theme-text-nav");

  if (theme === "light") {
    document.body.classList.add("light-mode");
    if (themeIcon) {
      themeIcon.classList.remove("bi-moon-fill");
      themeIcon.classList.add("bi-sun-fill");
    }
    if (themeIconNav) {
      themeIconNav.classList.remove("bi-moon-stars");
      themeIconNav.classList.add("bi-sun");
    }
    if (themeTextNav) {
      themeTextNav.textContent = "Light Mode";
    }
  } else {
    document.body.classList.remove("light-mode");
    if (themeIcon) {
      themeIcon.classList.remove("bi-sun-fill");
      themeIcon.classList.add("bi-moon-fill");
    }
    if (themeIconNav) {
      themeIconNav.classList.remove("bi-sun");
      themeIconNav.classList.add("bi-moon-stars");
    }
    if (themeTextNav) {
      themeTextNav.textContent = "Dark Mode";
    }
  }
}

function showAlert(type, message) {
  const alertsContainer = document.getElementById("reports-alerts");
  if (!alertsContainer) return;

  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertsContainer.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}

async function loadPlatforms() {
  try {
    const res = await axios.get(`${API_BASE_URL}/platforms/`);
    platforms = res.data.filter((p) => p.is_active);

    const selector = document.getElementById("platform-selector");
    if (selector) {
      selector.innerHTML = "";

      if (platforms.length === 0) {
        selector.innerHTML =
          '<div class="alert alert-warning mb-0">No platforms configured. Please connect platforms first.</div>';
        return;
      }

      platforms.forEach((platform, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn btn-outline-primary ${
          index === 0 ? "active" : ""
        }`;
        btn.textContent = platform.display_name;
        btn.onclick = () => selectPlatform(platform, btn);
        selector.appendChild(btn);
      });

      // Auto-select first platform
      if (platforms.length > 0) {
        selectPlatform(platforms[0]);
      }
    }
  } catch (err) {
    console.error("Failed to load platforms", err);
    showAlert(
      "danger",
      "Failed to load platforms: " + (err.response?.data?.detail || err.message)
    );
  }
}

async function selectPlatform(platform, buttonElement) {
  selectedPlatform = platform;

  // Update button states
  document.querySelectorAll("#platform-selector .btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (buttonElement) {
    buttonElement.classList.add("active");
  } else {
    // If called programmatically, find and activate the button
    const buttons = document.querySelectorAll("#platform-selector .btn");
    buttons.forEach((btn) => {
      if (btn.textContent === platform.display_name) {
        btn.classList.add("active");
      }
    });
  }

  // Load report types for this platform
  await loadReportTypes(platform.id);

  // Load recent reports
  await loadRecentReports(platform.id);
}

async function loadReportTypes(platformId) {
  try {
    const res = await axios.get(`${API_BASE_URL}/reports/types`, {
      params: { platform_id: platformId },
    });

    availableReportTypes = res.data;

    // Update count
    document.getElementById("report-types-count").textContent =
      availableReportTypes.length;

    // Get unique categories
    const categories = [
      ...new Set(availableReportTypes.map((r) => r.category)),
    ];
    const categoryFilter = document.getElementById("category-filter");
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
      });
    }

    // Display report types
    displayReportTypes(availableReportTypes);
  } catch (err) {
    console.error("Failed to load report types", err);
    showAlert(
      "danger",
      "Failed to load report types: " +
        (err.response?.data?.detail || err.message)
    );
  }
}

function displayReportTypes(reportTypes) {
  const container = document.getElementById("report-types-list");
  if (!container) return;

  if (reportTypes.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3 opacity-50"></i>
        <p>No report types available for this platform</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  reportTypes.forEach((reportType) => {
    const card = document.createElement("div");
    card.className = "report-type-card";
    card.onclick = () => selectReportType(reportType, card);
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h6 class="mb-0">${reportType.name}</h6>
        <span class="badge bg-info category-badge">${reportType.category}</span>
      </div>
      <p class="small text-muted mb-0">${reportType.description}</p>
    `;
    container.appendChild(card);
  });
}

function filterReportTypes() {
  const category = document.getElementById("category-filter").value;
  const filtered = category
    ? availableReportTypes.filter((r) => r.category === category)
    : availableReportTypes;
  displayReportTypes(filtered);
}

function selectReportType(reportType, cardElement) {
  selectedReportType = reportType;

  // Update card states
  document.querySelectorAll(".report-type-card").forEach((card) => {
    card.classList.remove("selected");
  });
  if (cardElement) {
    cardElement.classList.add("selected");
  }

  // Show report info
  const infoDiv = document.getElementById("selected-report-info");
  const nameDiv = document.getElementById("selected-report-name");
  const descDiv = document.getElementById("selected-report-description");

  if (infoDiv && nameDiv && descDiv) {
    nameDiv.textContent = reportType.name;
    descDiv.textContent = reportType.description;
    infoDiv.style.display = "block";
  }

  // Enable request button
  document.getElementById("btn-request-report").disabled = false;
}

async function handleRequestReport(e) {
  e.preventDefault();

  if (!selectedPlatform || !selectedReportType) {
    showAlert("warning", "Please select a platform and report type");
    return;
  }

  const btn = document.getElementById("btn-request-report");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Requesting...';

  try {
    const startDate = document.getElementById("report-start-date").value;
    const endDate = document.getElementById("report-end-date").value;

    const params = {
      platform_id: selectedPlatform.id,
      report_type: selectedReportType.type,
    };

    if (startDate) params.start_date = new Date(startDate).toISOString();
    if (endDate) params.end_date = new Date(endDate).toISOString();

    const res = await axios.post(`${API_BASE_URL}/reports/request`, null, {
      params,
    });

    showAlert(
      "success",
      `Report requested successfully! Report ID: ${res.data.report_id}`
    );

    // Reset form
    document.getElementById("request-report-form").reset();

    // Reload recent reports
    setTimeout(() => {
      loadRecentReports(selectedPlatform.id);
    }, 1000);
  } catch (err) {
    console.error("Failed to request report", err);
    const errorMsg = err.response?.data?.detail || err.message;

    // Check if it's a credentials configuration error
    if (
      errorMsg.includes("Credentials are missing") ||
      errorMsg.includes("not configured")
    ) {
      showAlert(
        "warning",
        `
        <strong>Platform Not Connected!</strong><br>
        Please connect this platform first before requesting reports.
        <a href="connections.html" class="alert-link ms-2">Go to Connections</a>
      `
      );
    }
    // Check if it's an authentication/authorization error
    else if (
      errorMsg.includes("Unauthorized") ||
      errorMsg.includes("Access to requested resource is denied") ||
      errorMsg.includes("access token") ||
      errorMsg.includes("revoked") ||
      errorMsg.includes("malformed")
    ) {
      showAlert(
        "danger",
        `
        <strong>Invalid or Expired Credentials!</strong><br>
        Your platform credentials may be expired or invalid. Please reconnect the platform.
        <a href="connections.html" class="alert-link ms-2">Reconnect Platform</a>
      `
      );
    } else {
      showAlert("danger", "Failed to request report: " + errorMsg);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function loadRecentReports(platformId) {
  try {
    const res = await axios.get(`${API_BASE_URL}/reports/list`, {
      params: { platform_id: platformId },
    });

    const tbody = document.getElementById("recent-reports-table");
    if (!tbody) return;

    // Check if using mock data and show notification
    if (res.data.mock_data) {
      showAlert(
        "warning",
        `
        <strong>Using Mock Data</strong><br>
        ${res.data.message}
        <a href="connections.html" class="alert-link ms-2">Update Credentials</a>
      `
      );
    }

    if (!res.data.reports || res.data.reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-inbox display-6 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No reports yet. Request a report to get started.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = "";
    res.data.reports.forEach((report) => {
      const tr = document.createElement("tr");

      // Get report type name
      const reportTypeInfo = availableReportTypes.find(
        (rt) => rt.type === report.report_type
      );
      const reportName = reportTypeInfo
        ? reportTypeInfo.name
        : report.report_type;

      // Status badge
      let statusBadge = "";
      switch (report.processing_status) {
        case "DONE":
          statusBadge = '<span class="badge bg-success">Completed</span>';
          break;
        case "IN_PROGRESS":
        case "IN_QUEUE":
          statusBadge = '<span class="badge bg-info">Processing</span>';
          break;
        case "FATAL":
        case "CANCELLED":
          statusBadge = '<span class="badge bg-danger">Failed</span>';
          break;
        default:
          statusBadge = `<span class="badge bg-secondary">${report.processing_status}</span>`;
      }

      // Actions
      let actions = "";
      if (report.processing_status === "DONE" && report.report_document_id) {
        actions = `
          <button class="btn btn-sm btn-primary" onclick="downloadReport('${report.report_document_id}', ${platformId})">
            <i class="bi bi-download me-1"></i>Download
          </button>
        `;
      } else if (
        report.processing_status === "IN_PROGRESS" ||
        report.processing_status === "IN_QUEUE"
      ) {
        actions = `
          <button class="btn btn-sm btn-outline-secondary" onclick="checkReportStatus('${report.report_id}', ${platformId})">
            <i class="bi bi-arrow-clockwise me-1"></i>Check Status
          </button>
        `;
      }

      const createdTime = report.created_time
        ? new Date(report.created_time).toLocaleString()
        : "N/A";

      tr.innerHTML = `
        <td>${reportName}</td>
        <td>${statusBadge}</td>
        <td>${createdTime}</td>
        <td>${actions}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load recent reports", err);
    const tbody = document.getElementById("recent-reports-table");
    if (tbody) {
      const errorMsg = err.response?.data?.detail || err.message;

      // Check if it's a credentials configuration error
      if (
        errorMsg.includes("Credentials are missing") ||
        errorMsg.includes("not configured")
      ) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-4">
              <i class="bi bi-exclamation-circle display-6 d-block mb-2 text-warning"></i>
              <p class="mb-2"><strong>Platform Not Connected</strong></p>
              <p class="mb-2 text-muted small">Please connect this platform first to view and request reports.</p>
              <a href="connections.html" class="btn btn-sm btn-primary">
                <i class="bi bi-plug me-1"></i>Connect Platform
              </a>
            </td>
          </tr>
        `;
      }
      // Check if it's an authentication/authorization error
      else if (
        errorMsg.includes("Unauthorized") ||
        errorMsg.includes("Access to requested resource is denied") ||
        errorMsg.includes("access token") ||
        errorMsg.includes("revoked") ||
        errorMsg.includes("malformed")
      ) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-4">
              <i class="bi bi-key display-6 d-block mb-2 text-danger"></i>
              <p class="mb-2"><strong>Invalid or Expired Credentials</strong></p>
              <p class="mb-2 text-muted small">Your platform credentials may be expired or invalid. Please reconnect.</p>
              <div class="small text-muted mb-3">${errorMsg}</div>
              <a href="connections.html" class="btn btn-sm btn-warning">
                <i class="bi bi-arrow-repeat me-1"></i>Reconnect Platform
              </a>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle display-6 d-block mb-2"></i>
              <p class="mb-0">Failed to load reports: ${errorMsg}</p>
            </td>
          </tr>
        `;
      }
    }
  }
}

async function checkReportStatus(reportId, platformId) {
  try {
    const res = await axios.get(`${API_BASE_URL}/reports/status/${reportId}`, {
      params: { platform_id: platformId },
    });

    showAlert("info", `Report status: ${res.data.processing_status}`);

    // Reload reports if completed
    if (res.data.processing_status === "DONE") {
      loadRecentReports(platformId);
    }
  } catch (err) {
    console.error("Failed to check report status", err);
    showAlert(
      "danger",
      "Failed to check status: " + (err.response?.data?.detail || err.message)
    );
  }
}

async function downloadReport(reportDocumentId, platformId) {
  try {
    showAlert("info", "Downloading report...");

    const res = await axios.get(
      `${API_BASE_URL}/reports/download/${reportDocumentId}`,
      {
        params: { platform_id: platformId },
      }
    );

    // Create a blob and download
    const blob = new Blob([res.data.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${reportDocumentId}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showAlert("success", "Report downloaded successfully!");
  } catch (err) {
    console.error("Failed to download report", err);
    showAlert(
      "danger",
      "Failed to download report: " +
        (err.response?.data?.detail || err.message)
    );
  }
}

// Make functions available globally
window.downloadReport = downloadReport;
window.checkReportStatus = checkReportStatus;
