// Mango Platform JavaScript (Light Mode Enforced)
const API_BASE_URL = "http://127.0.0.1:8000";
const ROOT_API_URL = "http://127.0.0.1:8000"; // For non-mango global apps (OMS, Settings)

// Configure Axios base URL
if (typeof axios !== "undefined") {
  axios.defaults.baseURL = ROOT_API_URL;
}

// Add Axios Interceptor for 401 Unauthorized
if (typeof axios !== "undefined") {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn("Session expired. Redirecting to login.");
        localStorage.removeItem("access_token");
        window.location.href = "../../login.html";
      }
      return Promise.reject(error);
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  // Auth Check
  const token = localStorage.getItem("access_token");
  if (!token) window.location.href = "../../login.html";

  // Set Default Axios Header
  if (typeof axios !== "undefined" && token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Force Light Theme
  document.documentElement.setAttribute("data-theme", "light");

  // Load default section or restore from hash
  let hash = window.location.hash.substring(1); // Remove '#'
  // Remove leading slash if present (e.g., '/channel_mapping' -> 'channel_mapping')
  if (hash.startsWith("/")) {
    hash = hash.substring(1);
  }
  loadSection(hash || "overview");

  // Fetch and display User/Company Info
  fetchCompanyInfo();

  // Setup Universal Search Listener
  const searchInput = document.querySelector(".universal-search-input");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const term = searchInput.value;
        if (term) {
          Swal.fire({
            icon: "info",
            title: "Searching Inventory...",
            text: `Looking for matches for "${term}"`,
            timer: 1500,
            showConfirmButton: false,
          });
          // Ideally check if it matches an Order ID to go to Deep Track, or Product Name to go to Inventory
          if (term.startsWith("#ORD") || term.startsWith("#AWB")) {
            loadSection("tracking");
            setTimeout(() => {
              const trackInput = document.getElementById("deep-track-input");
              if (trackInput) trackInput.value = term;
            }, 500);
          } else {
            loadSection("inventory_items");
          }
        }
      }
    });
  }
});

// Handle Hash Change (Router)
window.addEventListener("hashchange", () => {
  // Only handle hash change if not already navigating (prevents double-loading)
  if (isNavigating) return;
  
  let hash = window.location.hash.substring(1);
  if (hash.startsWith("/")) hash = hash.substring(1);
  if (hash) {
    loadSection(hash);
  }
});

// Header Action Handlers
function handleQuickCreate() {
  const menu = document.getElementById("quickCreateMenu");
  menu.classList.toggle("show");
}

async function fetchCompanyInfo() {
  try {
    const companyId = localStorage.getItem("company_id");
    // Ideally we fetch full company details. For now, we check /auth/me or a new endpoint.
    // Let's rely on /auth/me for name if we added it, but we didn't add company.name to UserResponse.
    // We might need to fetch company details. Or store name in local storage during setup.
    // Let's try to fetch user info and assumes unrelated API for Company details is needed?
    // Actually, let's keep it simple: Just get /auth/me, if company_id is present, we might need a GET /company/{id} endpoint.
    // But for now, I'll placeholder it or use localStorage if set during setup.

    // Better: Fetch /auth/me and if no company, redirect to portal setup.
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await axios.get(`${ROOT_API_URL}/oms/auth/me`);
    const user = res.data;

    if (!user.company_id) {
      console.warn("No active company context. Attempting auto-switch...");

      try {
        // Fetch available companies
        const companiesRes = await axios.get(
          `${ROOT_API_URL}/oms/auth/my-companies`
        );
        const companies = companiesRes.data;

        if (companies && companies.length > 0) {
          // Auto-switch to the first one
          const targetCompany = companies[0];
          console.log(
            `Auto-switching to company: ${targetCompany.name} (ID: ${targetCompany.id})`
          );

          await axios.post(
            `${ROOT_API_URL}/oms/auth/switch-company/${targetCompany.id}`
          );

          // Refresh page to load new context
          window.location.reload();
          return;
        } else {
          // No companies exist. Redirect to portal setup.
          alert("You need to create an organization to use Mango.");
          window.location.href = "../../index.html";
        }
      } catch (err) {
        console.error("Auto-switch failed", err);
        window.location.href = "../../index.html";
      }
    } else {
      console.log("Logged in user:", user);
      console.log("Active Company:", user.company);

      if (user.company) {
        const nameEl = document.getElementById("active-company-name");
        if (nameEl) nameEl.innerText = user.company.name;
      } else {
        const headerLabel = document.querySelector(".company-label");
        if (headerLabel)
          headerLabel.innerHTML = `ORGANIZATION #${user.company_id} <i class="bi bi-chevron-down small"></i><span class="mx-2 text-muted">|</span>`;
      }
    }
  } catch (e) {
    console.error("Failed to fetch user info", e);
  }
}

// Close menu when clicking outside
document.addEventListener("click", function (event) {
  const menu = document.querySelector(".quick-create-menu");
  const button = document.querySelector(".btn-quick-create");
  if (
    menu &&
    menu.classList.contains("show") &&
    !menu.contains(event.target) &&
    !button.contains(event.target)
  ) {
    menu.classList.remove("show");
  }
});

// Quick Create Actions Router
function handleQcAction(action) {
  // Close menu first
  document.getElementById("quickCreateMenu").classList.remove("show");

  // Route Action
  switch (action) {
    case "item":
      loadSection("inventory_items");
      setTimeout(() => {
        const addBtn = document.getElementById("btn-add-product");
        if (addBtn) addBtn.click();
      }, 500);
      break;
    case "adjustment":
      loadSection("inv_adjustment");
      break;
    case "warehouse":
      renderInventoryModule(
        document.getElementById("dynamic-content"),
        "warehouses"
      );
      setTimeout(() => {
        // Ensure function exists or log error. Assuming showAddWarehouseModal is global or safe to call.
        if (typeof showAddWarehouseModal === "function") {
          showAddWarehouseModal();
        } else {
          console.warn("showAddWarehouseModal not found");
        }
      }, 500);
      break;
    case "po":
      renderPurchaseModule(document.getElementById("dynamic-content"));
      break;
    case "vendor":
      // renderInventoryModule(document.getElementById('dynamic-content'), 'vendors'); // Placeholder if needed
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Opening Vendor Master...",
        showConfirmButton: false,
        timer: 1500,
      });
      break;
    default:
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "This module is coming soon!",
        showConfirmButton: false,
        timer: 2000,
      });
  }
}

// Navigation Handler with Sub-Route Support
let isNavigating = false; // Prevent recursive navigation

function loadSection(sectionId) {
  if (!sectionId) sectionId = "overview";
  
  // Prevent recursive calls
  if (isNavigating) {
    return;
  }
  
  isNavigating = true;

  // Encode/update hash for history/refresh support
  const currentHash = window.location.hash.substring(1);
  if (currentHash !== sectionId) {
    window.location.hash = sectionId;
  }

  // Parse 'section/subSection/action'
  const parts = sectionId.split("/");
  const mainSection = parts[0];
  const subSection = parts[1] || null;
  const action = parts[2] || null;
  
  console.log('Loading section:', sectionId, 'mainSection:', mainSection);

  // Update Sidebar Active State
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
    link.classList.remove("active");
    // Match main section only
    if (link.getAttribute("onclick")?.includes(`'${mainSection}'`)) {
      link.classList.add("active");
    }
    // Keep Inventory active for sub-pages
    if (
      mainSection === "inventory_items" ||
      mainSection === "inventory_settings"
    ) {
      if (link.getAttribute("href") === "#inventory")
        link.classList.add("active");
    }
  });

  const container = document.getElementById("dynamic-content");

  // Router
  switch (mainSection) {
    case "overview":
      renderOverview(container);
      break;
    case "inventory":
    case "inventory_view":
      renderInventoryModule(container, subSection || "dashboard");
      break;
    case "inventory_items":
      // Maps legacy direct call to sub-route
      renderInventoryModule(container, "products");
      break;
    case "inventory_settings":
      renderItemSettings(container);
      break;
    case "channel_mapping":
      if (typeof openChannelMappingTool === "function") {
        openChannelMappingTool();
      } else {
        container.innerHTML =
          '<div class="p-4 text-center">Loading channel mapping...</div>';
      }
      break;
    case "inv_transfer":
      renderInternalFlowModule(container, "transfer");
      break;
    case "inv_transfer_entry":
      // Full-page entry form (create new or edit draft)
      renderStockTransferEntry(container, subSection); // subSection = transfer ID for edit
      break;
    case "inv_transfer_view":
      // Full-page detail/view
      renderStockTransferView(container, subSection); // subSection = transfer ID
      break;
    case "inv_adjustment":
      renderInternalFlowModule(container, "adjustment");
      break;
    case "inv_audit":
      renderInternalFlowModule(container, "audit");
      break;

    // Customer Detail Route
    case "customer":
      if (typeof viewCustomer === "function" && subSection) {
        viewCustomer(subSection, action || "summary");
      } else {
        renderSalesModule(container, "customers");
      }
      break;

    // Sales Module Routes
    case "sales_customers":
      renderSalesModule(container, "customers");
      break;
    case "sales_quotes":
      renderSalesModule(container, "quotes");
      break;
    case "quotation_form":
      if (typeof renderQuotationForm === "function") {
        renderQuotationForm(subSection);
      } else {
        container.innerHTML = '<div class="alert alert-warning">Loading quotation form...</div>';
      }
      break;
    case "quotation_view":
      if (typeof viewQuotation === "function") {
        viewQuotation(subSection);
      } else {
        container.innerHTML = '<div class="alert alert-warning">Loading quotation view...</div>';
      }
      break;
    case "sales_orders":
      if (typeof renderChannelOrders === "function") {
        renderChannelOrders(container);
      } else {
        renderSalesModule(container, "orders");
      }
      break;
    case "sales_invoices":
      renderSalesModule(container, "invoices");
      break;
    case "sales_recurring_invoices":
      renderSalesModule(container, "recurring_invoices");
      break;
    case "sales_delivery_challans":
      renderSalesModule(container, "delivery_challans");
      break;

    // Dispatch Scanner Routes
    case "dispatch_scanner":
      // Always set container content first to prevent default route
      container.innerHTML = `
        <div class="text-center py-5 fade-in">
          <div class="spinner-border text-primary mb-3" role="status"></div>
          <p class="text-muted">Loading Dispatch Scanner...</p>
        </div>
      `;
      
      // Check if function is available
      if (typeof renderDispatchScanner === "function") {
        renderDispatchScanner(container);
      } else {
        // Retry after a short delay to allow scripts to load
        let retryCount = 0;
        const maxRetries = 10;
        const checkInterval = setInterval(() => {
          retryCount++;
          if (typeof renderDispatchScanner === "function") {
            clearInterval(checkInterval);
            renderDispatchScanner(container);
          } else if (retryCount >= maxRetries) {
            clearInterval(checkInterval);
            container.innerHTML = `
              <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                <h4>Dispatch Scanner Module</h4>
                <p class="text-muted">The dispatch scanner module failed to load. Please refresh the page.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                  <i class="bi bi-arrow-clockwise me-2"></i>Refresh Page
                </button>
              </div>
            `;
          }
        }, 100);
      }
      break;
    case "dispatch_reports":
      if (typeof renderDispatchReports === "function") {
        renderDispatchReports(container);
      } else {
        container.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-file-earmark-bar-graph fs-1 text-primary mb-3"></i>
            <h4>Dispatch Reports</h4>
            <p class="text-muted">Loading report module...</p>
          </div>
        `;
        setTimeout(() => {
      if (typeof renderDispatchReports === "function") {
        renderDispatchReports(container);
          }
        }, 500);
      }
      break;
    case "channel_settings":
      if (typeof renderChannelSettings === "function") {
        renderChannelSettings(container, subSection).catch(error => {
          console.error("Error loading channel settings:", error);
          container.innerHTML = `
            <div class="alert alert-danger">
              <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Channel Settings</h5>
              <p>${error.message || "Failed to load channel configuration page."}</p>
              <button class="btn btn-primary btn-sm" onclick="location.reload()">
                <i class="bi bi-arrow-clockwise me-1"></i>Reload Page
              </button>
            </div>
          `;
        });
      } else {
        container.innerHTML = `
          <div class="alert alert-warning">
            <h5><i class="bi bi-exclamation-triangle me-2"></i>Channel Settings Module Not Loaded</h5>
            <p>Please refresh the page to load the channel settings module.</p>
            <button class="btn btn-primary btn-sm" onclick="location.reload()">
              <i class="bi bi-arrow-clockwise me-1"></i>Reload Page
            </button>
          </div>
        `;
      }
      break;
    case "sales_payments":
      renderSalesModule(container, "payments");
      break;
    case "sales_credit_notes":
      renderSalesModule(container, "credit_notes");
      break;
    case "sales_eway_bills":
      renderSalesModule(container, "eway_bills");
      break;

    case "sale":
      renderSaleModule(container);
      break;
    case "return":
      renderReturnModule(container);
      break;
    case "purchase":
      renderPurchaseModule(container);
      break;
    case "payment":
      renderRecoModule(container);
      break;
    case "tracking":
      renderTrackingModule(container);
      break;
    case "flow":
      renderFlowModule(container);
      break;
    case "settings":
      // Mango Application Settings
      if (typeof renderSettingsModule === "function") {
        renderSettingsModule(container, subSection);
      } else {
      container.innerHTML = `<h2>Mango Settings</h2><p>Configure your Mango application settings here.</p>`;
      }
      break;
    case "config":
      // OMS Integration Configuration
      renderSettingsModule(container, subSection);
      break;
    case "design":
      renderDesignModule(container);
      break;
    case "custom_page":
      renderCustomPage(container, subSection);
      break;
    default:
      renderOverview(container);
  }
  
  // Reset navigation flag after a short delay
  setTimeout(() => {
    isNavigating = false;
  }, 100);
}

// ================= VIEWS (Light Mode) =================

// ================= VIEWS (Premium) =================

// ================= ADVANCED ANALYTICS DASHBOARD =================
// Dashboard State Management
let dashboardState = {
  timeframe: 'month',
  compareEnabled: false,
  charts: {},
  refreshInterval: null
};

function renderOverview(container) {
  container.innerHTML = `
    <div class="advanced-dashboard fade-in">
      <!-- Dashboard Header with Time Controls -->
      <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
          <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">
            <i class="bi bi-speedometer2 me-2 text-primary"></i>Analytics Dashboard
          </h2>
          <p class="text-muted mb-0">Comprehensive business intelligence & performance metrics</p>
            </div>
        <div class="d-flex gap-2 align-items-center">
          <!-- Auto Refresh Toggle -->
          <div class="form-check form-switch me-3">
            <input class="form-check-input" type="checkbox" id="autoRefreshToggle" onchange="toggleAutoRefresh(this.checked)">
            <label class="form-check-label small text-muted" for="autoRefreshToggle">Auto-refresh</label>
            </div>
          
          <!-- Timeframe Selector -->
          <div class="btn-group shadow-sm" role="group">
            <button type="button" class="btn btn-outline-secondary btn-sm ${dashboardState.timeframe === 'today' ? 'active' : ''}" onclick="changeDashboardTimeframe('today')">Today</button>
            <button type="button" class="btn btn-outline-secondary btn-sm ${dashboardState.timeframe === 'week' ? 'active' : ''}" onclick="changeDashboardTimeframe('week')">Week</button>
            <button type="button" class="btn btn-outline-secondary btn-sm ${dashboardState.timeframe === 'month' ? 'active' : ''}" onclick="changeDashboardTimeframe('month')">Month</button>
            <button type="button" class="btn btn-outline-secondary btn-sm ${dashboardState.timeframe === 'quarter' ? 'active' : ''}" onclick="changeDashboardTimeframe('quarter')">Quarter</button>
            <button type="button" class="btn btn-outline-secondary btn-sm ${dashboardState.timeframe === 'year' ? 'active' : ''}" onclick="changeDashboardTimeframe('year')">Year</button>
        </div>

          <!-- Custom Date Range -->
          <button class="btn btn-outline-secondary btn-sm shadow-sm" onclick="openCustomDateRange()">
            <i class="bi bi-calendar-range me-1"></i> Custom
          </button>
          
          <!-- Export -->
          <button class="btn btn-primary btn-sm shadow-sm" onclick="exportDashboardReport()">
            <i class="bi bi-download me-1"></i> Export
          </button>
                        </div>
                    </div>

      <!-- Primary KPI Cards Row -->
      <div class="row g-3 mb-4">
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="kpi-card kpi-revenue h-100">
            <div class="kpi-card-inner">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="kpi-label">Total Revenue</span>
                  <div class="kpi-value" id="kpi-revenue">₹0</div>
                  <div class="kpi-trend up" id="kpi-revenue-trend">
                    <i class="bi bi-arrow-up-right"></i>
                    <span>+0%</span>
                    <span class="text-muted ms-1">vs last period</span>
                  </div>
                </div>
                <div class="kpi-icon revenue">
                  <i class="bi bi-currency-rupee"></i>
                </div>
              </div>
              <div class="kpi-sparkline mt-3">
                <canvas id="sparkline-revenue" height="40"></canvas>
              </div>
                    </div>
                </div>
            </div>
            
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="kpi-card kpi-orders h-100">
            <div class="kpi-card-inner">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="kpi-label">Total Orders</span>
                  <div class="kpi-value" id="kpi-orders">0</div>
                  <div class="kpi-trend up" id="kpi-orders-trend">
                    <i class="bi bi-arrow-up-right"></i>
                    <span>+0%</span>
                    <span class="text-muted ms-1">vs last period</span>
                        </div>
                    </div>
                <div class="kpi-icon orders">
                  <i class="bi bi-bag-check"></i>
                </div>
              </div>
              <div class="kpi-sparkline mt-3">
                <canvas id="sparkline-orders" height="40"></canvas>
              </div>
                    </div>
                </div>
            </div>
            
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="kpi-card kpi-aov h-100">
            <div class="kpi-card-inner">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="kpi-label">Avg Order Value</span>
                  <div class="kpi-value" id="kpi-aov">₹0</div>
                  <div class="kpi-trend neutral" id="kpi-aov-trend">
                    <i class="bi bi-dash"></i>
                    <span>0%</span>
                    <span class="text-muted ms-1">vs last period</span>
                        </div>
                    </div>
                <div class="kpi-icon aov">
                  <i class="bi bi-graph-up-arrow"></i>
                </div>
              </div>
              <div class="kpi-sparkline mt-3">
                <canvas id="sparkline-aov" height="40"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="kpi-card kpi-inventory h-100">
            <div class="kpi-card-inner">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="kpi-label">SKUs in Stock</span>
                  <div class="kpi-value" id="kpi-inventory">0</div>
                  <div class="kpi-trend neutral" id="kpi-inventory-trend">
                    <i class="bi bi-exclamation-triangle text-warning"></i>
                    <span class="text-warning" id="low-stock-count">0 low stock</span>
                        </div>
                    </div>
                <div class="kpi-icon inventory">
                  <i class="bi bi-boxes"></i>
                </div>
              </div>
              <div class="kpi-sparkline mt-3">
                <canvas id="sparkline-inventory" height="40"></canvas>
              </div>
                    </div>
                </div>
            </div>
        </div>

      <!-- Secondary KPI Strip -->
      <div class="row g-3 mb-4">
        <div class="col">
          <div class="mini-kpi-strip d-flex gap-4 p-3 bg-white rounded-3 shadow-sm overflow-auto">
            <div class="mini-kpi text-center px-4 border-end">
              <div class="mini-kpi-value text-success fw-bold" id="kpi-delivered">0</div>
              <div class="mini-kpi-label text-muted small">Delivered</div>
            </div>
            <div class="mini-kpi text-center px-4 border-end">
              <div class="mini-kpi-value text-warning fw-bold" id="kpi-processing">0</div>
              <div class="mini-kpi-label text-muted small">Processing</div>
            </div>
            <div class="mini-kpi text-center px-4 border-end">
              <div class="mini-kpi-value text-info fw-bold" id="kpi-shipped">0</div>
              <div class="mini-kpi-label text-muted small">Shipped</div>
            </div>
            <div class="mini-kpi text-center px-4 border-end">
              <div class="mini-kpi-value text-danger fw-bold" id="kpi-cancelled">0</div>
              <div class="mini-kpi-label text-muted small">Cancelled</div>
            </div>
            <div class="mini-kpi text-center px-4 border-end">
              <div class="mini-kpi-value text-primary fw-bold" id="kpi-rto">0</div>
              <div class="mini-kpi-label text-muted small">RTO</div>
            </div>
            <div class="mini-kpi text-center px-4">
              <div class="mini-kpi-value fw-bold" id="kpi-fulfillment-rate">0%</div>
              <div class="mini-kpi-label text-muted small">Fulfillment Rate</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Charts Row -->
      <div class="row g-4 mb-4">
        <!-- Revenue & Orders Trend Chart -->
        <div class="col-lg-8">
          <div class="chart-card h-100">
            <div class="chart-header">
                        <div>
                <h6 class="chart-title">Revenue & Orders Trend</h6>
                <p class="chart-subtitle">Performance over selected period</p>
                        </div>
              <div class="chart-controls">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary active" onclick="updateTrendChartType('area')">Area</button>
                  <button class="btn btn-outline-secondary" onclick="updateTrendChartType('bar')">Bar</button>
                  <button class="btn btn-outline-secondary" onclick="updateTrendChartType('line')">Line</button>
                </div>
              </div>
            </div>
            <div class="chart-body">
              <canvas id="trend-chart" height="280"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Platform Distribution -->
        <div class="col-lg-4">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Channel Distribution</h6>
                <p class="chart-subtitle">Revenue by platform</p>
              </div>
              <button class="btn btn-sm btn-link p-0" onclick="togglePlatformView()">
                <i class="bi bi-gear"></i>
              </button>
            </div>
            <div class="chart-body d-flex align-items-center justify-content-center">
              <canvas id="platform-chart" height="220"></canvas>
            </div>
            <div class="platform-legend mt-3" id="platform-legend"></div>
          </div>
        </div>
      </div>

      <!-- Analytics Grid -->
      <div class="row g-4 mb-4">
        <!-- Order Status Funnel -->
        <div class="col-lg-4">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Order Status Funnel</h6>
                <p class="chart-subtitle">Order lifecycle breakdown</p>
              </div>
            </div>
            <div class="chart-body">
              <canvas id="funnel-chart" height="250"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Hourly Performance Heatmap -->
        <div class="col-lg-4">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Peak Hours Analysis</h6>
                <p class="chart-subtitle">Orders by hour of day</p>
              </div>
            </div>
            <div class="chart-body">
              <canvas id="hourly-chart" height="250"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Growth Indicators -->
        <div class="col-lg-4">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Growth Indicators</h6>
                <p class="chart-subtitle">Key performance metrics</p>
              </div>
            </div>
            <div class="growth-indicators p-3">
              <div class="growth-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">Revenue Growth</span>
                  <span class="fw-bold text-success" id="growth-revenue">+0%</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-success" id="growth-revenue-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="growth-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">Order Growth</span>
                  <span class="fw-bold text-primary" id="growth-orders">+0%</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-primary" id="growth-orders-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="growth-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">Customer Retention</span>
                  <span class="fw-bold text-info" id="growth-retention">0%</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-info" id="growth-retention-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="growth-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">Delivery Success Rate</span>
                  <span class="fw-bold text-warning" id="growth-delivery">0%</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-warning" id="growth-delivery-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="growth-item">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">Inventory Turnover</span>
                  <span class="fw-bold text-secondary" id="growth-turnover">0x</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-secondary" id="growth-turnover-bar" style="width: 0%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row - Tables & Lists -->
      <div class="row g-4">
        <!-- Top Selling Products -->
        <div class="col-lg-6">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Top Selling Products</h6>
                <p class="chart-subtitle">Best performers this period</p>
              </div>
              <button class="btn btn-sm btn-outline-primary" onclick="loadSection('inventory_items')">View All</button>
                    </div>
                    <div class="table-responsive">
              <table class="table table-hover mb-0" id="top-products-table">
                            <thead class="bg-light">
                                <tr>
                    <th class="small text-muted fw-bold">Product</th>
                    <th class="small text-muted fw-bold text-end">Units</th>
                    <th class="small text-muted fw-bold text-end">Revenue</th>
                    <th class="small text-muted fw-bold text-center">Trend</th>
                                </tr>
                            </thead>
                <tbody id="top-products-body">
                  <tr><td colspan="4" class="text-center text-muted py-4">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Recent Orders -->
        <div class="col-lg-6">
          <div class="chart-card h-100">
            <div class="chart-header">
              <div>
                <h6 class="chart-title">Recent Orders</h6>
                <p class="chart-subtitle">Latest order activity</p>
              </div>
              <button class="btn btn-sm btn-outline-primary" onclick="loadSection('orders')">View All</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-light">
                  <tr>
                    <th class="small text-muted fw-bold">Order ID</th>
                    <th class="small text-muted fw-bold">Channel</th>
                    <th class="small text-muted fw-bold text-end">Amount</th>
                    <th class="small text-muted fw-bold text-center">Status</th>
                                </tr>
                </thead>
                <tbody id="recent-orders-body">
                  <tr><td colspan="4" class="text-center text-muted py-4">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
      </div>
    </div>
  `;

  // Initialize dashboard after DOM render
  setTimeout(() => initializeDashboard(), 100);
}

// ================= DASHBOARD INITIALIZATION =================
async function initializeDashboard() {
  // Add CSS styles
  addDashboardStyles();
  
  // Initialize charts
  initializeCharts();
  
  // Load dashboard data
  await loadDashboardData();
}

function addDashboardStyles() {
  if (document.getElementById('dashboard-advanced-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'dashboard-advanced-styles';
  styles.textContent = `
    .advanced-dashboard {
      animation: fadeIn 0.3s ease;
    }
    
    /* KPI Cards */
    .kpi-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }
    
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
    }
    
    .kpi-card .kpi-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .kpi-card .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 8px 0;
      font-family: 'Outfit', sans-serif;
    }
    
    .kpi-card .kpi-trend {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .kpi-card .kpi-trend.up { color: #10b981; }
    .kpi-card .kpi-trend.down { color: #ef4444; }
    .kpi-card .kpi-trend.neutral { color: #64748b; }
    
    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .kpi-icon.revenue { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
    .kpi-icon.orders { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
    .kpi-icon.aov { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; }
    .kpi-icon.inventory { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
    
    /* Mini KPI Strip */
    .mini-kpi-strip {
      white-space: nowrap;
    }
    
    .mini-kpi-value {
      font-size: 18px;
      font-weight: 700;
    }
    
    /* Chart Cards */
    .chart-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
      overflow: hidden;
    }
    
    .chart-header {
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chart-title {
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    
    .chart-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    
    .chart-body {
      padding: 16px 20px;
    }
    
    /* Platform Legend */
    .platform-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 0 20px 16px;
      justify-content: center;
    }
    
    .platform-legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
    }
    
    .platform-legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    /* Growth Indicators */
    .growth-indicators .progress {
      border-radius: 10px;
      background: #f1f5f9;
    }
    
    .growth-indicators .progress-bar {
      border-radius: 10px;
      transition: width 1s ease;
    }
    
    /* Timeframe Buttons */
    .btn-group .btn.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes countUp {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .kpi-value {
      animation: countUp 0.5s ease;
    }
  `;
  document.head.appendChild(styles);
}

// ================= CHART INITIALIZATION =================
function initializeCharts() {
  // Destroy existing charts
  Object.values(dashboardState.charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  dashboardState.charts = {};

  // Initialize Main Trend Chart
  initTrendChart();
  
  // Initialize Platform Distribution Chart
  initPlatformChart();
  
  // Initialize Order Funnel Chart
  initFunnelChart();
  
  // Initialize Hourly Chart
  initHourlyChart();
  
  // Initialize Sparklines
  initSparklines();
}

function initTrendChart() {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
  
  dashboardState.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Revenue (₹)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Orders',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 0) {
                return '₹' + context.parsed.y.toLocaleString('en-IN');
              }
              return context.parsed.y + ' orders';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#94a3b8' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11 },
            color: '#94a3b8',
            callback: value => '₹' + (value >= 1000 ? (value/1000).toFixed(0) + 'k' : value)
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 11 }, color: '#94a3b8' }
        }
      }
    }
  });
}

function initPlatformChart() {
  const ctx = document.getElementById('platform-chart');
  if (!ctx) return;
  
  dashboardState.charts.platform = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Others'],
      datasets: [{
        data: [35, 28, 18, 12, 7],
        backgroundColor: [
          '#ff9900',
          '#2874f0',
          '#f43397',
          '#ff3f6c',
          '#64748b'
        ],
        borderWidth: 0,
        spacing: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed + '%';
            }
          }
        }
      }
    }
  });
  
  // Add center text and legend
  updatePlatformLegend();
}

function updatePlatformLegend() {
  const legendContainer = document.getElementById('platform-legend');
  if (!legendContainer) return;
  
  const platforms = [
    { name: 'Amazon', color: '#ff9900', value: '35%' },
    { name: 'Flipkart', color: '#2874f0', value: '28%' },
    { name: 'Meesho', color: '#f43397', value: '18%' },
    { name: 'Myntra', color: '#ff3f6c', value: '12%' },
    { name: 'Others', color: '#64748b', value: '7%' }
  ];
  
  legendContainer.innerHTML = platforms.map(p => `
    <div class="platform-legend-item">
      <span class="platform-legend-dot" style="background: ${p.color}"></span>
      <span>${p.name}</span>
      <span class="fw-bold">${p.value}</span>
                    </div>
  `).join('');
}

function initFunnelChart() {
  const ctx = document.getElementById('funnel-chart');
  if (!ctx) return;
  
  dashboardState.charts.funnel = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Received', 'Processing', 'Shipped', 'Delivered', 'RTO'],
      datasets: [{
        data: [100, 85, 75, 68, 7],
        backgroundColor: [
          '#3b82f6',
          '#8b5cf6',
          '#06b6d4',
          '#10b981',
          '#ef4444'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ctx.parsed.x + ' orders'
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#64748b' }
        }
      }
    }
  });
}

function initHourlyChart() {
  const ctx = document.getElementById('hourly-chart');
  if (!ctx) return;
  
  const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0') + ':00');
  const data = [2, 1, 1, 0, 0, 1, 3, 8, 15, 22, 28, 35, 42, 38, 32, 28, 35, 45, 52, 48, 35, 22, 12, 5];
  
  dashboardState.charts.hourly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [{
        data: data,
        backgroundColor: data.map(v => {
          const intensity = v / Math.max(...data);
          return `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
        }),
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: ctx => 'Hour: ' + ctx[0].label,
            label: ctx => ctx.parsed.y + ' orders'
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 9 },
            color: '#94a3b8',
            maxRotation: 0,
            callback: (val, idx) => idx % 4 === 0 ? hours[idx] : ''
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { display: false }
        }
      }
    }
  });
}

function initSparklines() {
  const sparklineConfig = {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      elements: { point: { radius: 0 } }
    }
  };
  
  // Revenue sparkline
  const revenueCtx = document.getElementById('sparkline-revenue');
  if (revenueCtx) {
    dashboardState.charts.sparkRevenue = new Chart(revenueCtx, {
      ...sparklineConfig,
      data: {
        labels: Array(7).fill(''),
        datasets: [{
          data: [45, 52, 48, 55, 58, 62, 70],
          borderColor: '#10b981',
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }]
      }
    });
  }
  
  // Orders sparkline
  const ordersCtx = document.getElementById('sparkline-orders');
  if (ordersCtx) {
    dashboardState.charts.sparkOrders = new Chart(ordersCtx, {
      ...sparklineConfig,
      data: {
        labels: Array(7).fill(''),
        datasets: [{
          data: [120, 135, 128, 142, 155, 148, 165],
          borderColor: '#3b82f6',
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }]
      }
    });
  }
  
  // AOV sparkline
  const aovCtx = document.getElementById('sparkline-aov');
  if (aovCtx) {
    dashboardState.charts.sparkAov = new Chart(aovCtx, {
      ...sparklineConfig,
      data: {
        labels: Array(7).fill(''),
        datasets: [{
          data: [850, 820, 880, 860, 890, 875, 895],
          borderColor: '#8b5cf6',
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }]
      }
    });
  }
  
  // Inventory sparkline
  const invCtx = document.getElementById('sparkline-inventory');
  if (invCtx) {
    dashboardState.charts.sparkInv = new Chart(invCtx, {
      ...sparklineConfig,
      data: {
        labels: Array(7).fill(''),
        datasets: [{
          data: [245, 238, 242, 235, 248, 252, 256],
          borderColor: '#f59e0b',
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }]
      }
    });
  }
}

// ================= DATA LOADING =================
async function loadDashboardData() {
  try {
    // Fetch data from APIs
    const [productsRes, ordersRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/mango/inventory/products`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/oms/orders`).catch(() => ({ data: [] }))
    ]);
    
    const products = productsRes.data || [];
    const orders = ordersRes.data || [];
    
    // Calculate KPIs
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalSKUs = products.length;
    
    // Update KPI displays with animation
    animateValue('kpi-revenue', 0, totalRevenue, 1000, '₹');
    animateValue('kpi-orders', 0, totalOrders, 1000);
    animateValue('kpi-aov', 0, avgOrderValue, 1000, '₹');
    animateValue('kpi-inventory', 0, totalSKUs, 1000);
    
    // Order status counts
    const statusCounts = {
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      processing: orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      rto: orders.filter(o => o.status === 'RTO').length
    };
    
    document.getElementById('kpi-delivered').textContent = statusCounts.delivered;
    document.getElementById('kpi-processing').textContent = statusCounts.processing;
    document.getElementById('kpi-shipped').textContent = statusCounts.shipped;
    document.getElementById('kpi-cancelled').textContent = statusCounts.cancelled;
    document.getElementById('kpi-rto').textContent = statusCounts.rto;
    
    // Fulfillment rate
    const fulfillmentRate = totalOrders > 0 ? 
      Math.round((statusCounts.delivered / totalOrders) * 100) : 0;
    document.getElementById('kpi-fulfillment-rate').textContent = fulfillmentRate + '%';
    
    // Update trend chart with sample data (would be from API in production)
    updateTrendChartData();
    
    // Update growth indicators
    updateGrowthIndicators();
    
    // Update top products table
    updateTopProductsTable(products);
    
    // Update recent orders table
    updateRecentOrdersTable(orders);
    
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

function animateValue(elementId, start, end, duration, prefix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (end - start) * easeOutQuart;
    
    el.textContent = prefix + Math.round(current).toLocaleString('en-IN');
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function updateTrendChartData() {
  const chart = dashboardState.charts.trend;
  if (!chart) return;
  
  // Generate labels based on timeframe
  const labels = generateTimeLabels(dashboardState.timeframe);
  const revenueData = generateSampleData(labels.length, 50000, 150000);
  const ordersData = generateSampleData(labels.length, 50, 200);
  
  chart.data.labels = labels;
  chart.data.datasets[0].data = revenueData;
  chart.data.datasets[1].data = ordersData;
  chart.update('none');
}

function generateTimeLabels(timeframe) {
  const now = new Date();
  const labels = [];
  
  switch(timeframe) {
    case 'today':
      for (let i = 0; i < 24; i += 2) {
        labels.push(i.toString().padStart(2, '0') + ':00');
      }
      break;
    case 'week':
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        labels.push(days[d.getDay()]);
      }
      break;
    case 'month':
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        labels.push(d.getDate().toString());
      }
      break;
    case 'quarter':
      for (let i = 12; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        labels.push('W' + Math.ceil(d.getDate() / 7));
      }
      break;
    case 'year':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        labels.push(months[d.getMonth()]);
      }
      break;
  }
  
  return labels;
}

function generateSampleData(length, min, max) {
  return Array.from({length}, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

function updateGrowthIndicators() {
  const indicators = [
    { id: 'revenue', value: '+18.5%', bar: 68 },
    { id: 'orders', value: '+12.3%', bar: 55 },
    { id: 'retention', value: '78%', bar: 78 },
    { id: 'delivery', value: '94.2%', bar: 94 },
    { id: 'turnover', value: '4.2x', bar: 42 }
  ];
  
  indicators.forEach(ind => {
    const valueEl = document.getElementById(`growth-${ind.id}`);
    const barEl = document.getElementById(`growth-${ind.id}-bar`);
    if (valueEl) valueEl.textContent = ind.value;
    if (barEl) {
      setTimeout(() => { barEl.style.width = ind.bar + '%'; }, 300);
    }
  });
}

function updateTopProductsTable(products) {
  const tbody = document.getElementById('top-products-body');
  if (!tbody) return;
  
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No products found</td></tr>`;
    return;
  }
  
  // Sort by sales_rate (using as proxy for popularity)
  const topProducts = products
    .sort((a, b) => (b.sales_rate || 0) - (a.sales_rate || 0))
    .slice(0, 5);
  
  tbody.innerHTML = topProducts.map((p, idx) => `
    <tr>
      <td class="py-2">
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-light text-dark">#${idx + 1}</span>
                            <div>
            <div class="fw-medium text-dark">${p.name || 'Unnamed'}</div>
            <small class="text-muted">${p.sku || 'N/A'}</small>
                            </div>
                            </div>
      </td>
      <td class="text-end fw-medium">${Math.floor(Math.random() * 100) + 10}</td>
      <td class="text-end fw-medium">₹${((p.sales_rate || 0) * (Math.random() * 50 + 10)).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
      <td class="text-center">
        <i class="bi bi-arrow-up-right text-success"></i>
      </td>
    </tr>
  `).join('');
}

function updateRecentOrdersTable(orders) {
  const tbody = document.getElementById('recent-orders-body');
  if (!tbody) return;
  
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No orders found</td></tr>`;
    return;
  }
  
  const recentOrders = orders.slice(0, 5);
  const statusColors = {
    'DELIVERED': 'success',
    'SHIPPED': 'info',
    'PROCESSING': 'warning',
    'PENDING': 'secondary',
    'CANCELLED': 'danger',
    'RTO': 'danger'
  };
  
  const platformIcons = {
    'Amazon': '🛒',
    'Flipkart': '📦',
    'Meesho': '🛍️',
    'Myntra': '👗'
  };
  
  tbody.innerHTML = recentOrders.map(o => `
    <tr>
      <td class="py-2">
        <div class="fw-medium text-dark">#${o.platform_order_id || o.id}</div>
        <small class="text-muted">${new Date(o.created_at).toLocaleDateString()}</small>
      </td>
      <td>
        <span>${platformIcons[o.platform] || '📦'} ${o.platform || 'Direct'}</span>
      </td>
      <td class="text-end fw-medium">₹${parseFloat(o.total_amount || 0).toLocaleString('en-IN')}</td>
      <td class="text-center">
        <span class="badge bg-${statusColors[o.status] || 'secondary'} bg-opacity-10 text-${statusColors[o.status] || 'secondary'}">
          ${o.status || 'Unknown'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ================= DASHBOARD CONTROLS =================
function changeDashboardTimeframe(timeframe) {
  dashboardState.timeframe = timeframe;
  
  // Update button states
  document.querySelectorAll('.btn-group .btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(timeframe.substring(0, 3))) {
      btn.classList.add('active');
    }
  });
  
  // Reload data
  loadDashboardData();
}

function toggleAutoRefresh(enabled) {
  if (enabled) {
    dashboardState.refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30000); // Refresh every 30 seconds
  } else {
    if (dashboardState.refreshInterval) {
      clearInterval(dashboardState.refreshInterval);
      dashboardState.refreshInterval = null;
    }
  }
}

function openCustomDateRange() {
  Swal.fire({
    title: 'Custom Date Range',
    html: `
      <div class="row g-3">
        <div class="col-6">
          <label class="form-label small">Start Date</label>
          <input type="date" id="custom-start" class="form-control">
                            </div>
        <div class="col-6">
          <label class="form-label small">End Date</label>
          <input type="date" id="custom-end" class="form-control">
                            </div>
                    </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Apply',
    preConfirm: () => {
      const start = document.getElementById('custom-start').value;
      const end = document.getElementById('custom-end').value;
      return { start, end };
    }
  }).then(result => {
    if (result.isConfirmed && result.value.start && result.value.end) {
      dashboardState.customRange = result.value;
      dashboardState.timeframe = 'custom';
      loadDashboardData();
    }
  });
}

function exportDashboardReport() {
  Swal.fire({
    title: 'Export Dashboard',
    html: `
      <div class="text-start">
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="export-kpis" checked>
          <label class="form-check-label">KPI Summary</label>
                </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="export-trends" checked>
          <label class="form-check-label">Revenue & Order Trends</label>
            </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="export-platforms" checked>
          <label class="form-check-label">Platform Distribution</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="export-products" checked>
          <label class="form-check-label">Top Products</label>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-download me-2"></i>Export PDF',
    cancelButtonText: 'Cancel'
  }).then(result => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Export Started',
        text: 'Your report is being generated...',
        timer: 2000,
        showConfirmButton: false
      });
    }
  });
}

function updateTrendChartType(type) {
  const chart = dashboardState.charts.trend;
  if (!chart) return;
  
  // Update button states
  document.querySelectorAll('.chart-controls .btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase() === type) {
      btn.classList.add('active');
    }
  });
  
  // Update chart type
  if (type === 'bar') {
    chart.config.type = 'bar';
    chart.data.datasets[0].fill = false;
    chart.data.datasets[0].backgroundColor = '#3b82f6';
  } else if (type === 'line') {
    chart.config.type = 'line';
    chart.data.datasets[0].fill = false;
  } else {
    chart.config.type = 'line';
    chart.data.datasets[0].fill = true;
  }
  
  chart.update();
}

function togglePlatformView() {
  // Toggle between revenue and orders view
  Swal.fire({
    title: 'Platform View Settings',
    html: `
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="platformView" id="view-revenue" checked>
        <label class="form-check-label">Show by Revenue</label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="platformView" id="view-orders">
        <label class="form-check-label">Show by Orders</label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Apply'
  });
}

function renderTrackingModule(container) {
  container.innerHTML = `
        <div class="mb-5 fade-in">
             <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">Deep Trace</h2>
             <p class="text-muted">Granular lifecycle analysis across distributed systems.</p>
        </div>
        
        <div class="dashboard-card p-5 mb-5 fade-in text-center" style="background: linear-gradient(to bottom, #ffffff, #f8fafc);">
            <div style="max-width: 600px; margin: 0 auto;">
                <h4 class="fw-bold mb-4 text-dark">Enter Tracking Qualifier</h4>
                <div class="search-input-group shadow-md py-2">
                    <i class="bi bi-upc-scan text-muted fs-5 me-2"></i>
                    <input type="text" class="fs-5" placeholder="Order ID, AWB, or Payment Ref..." id="deep-track-input">
                    <button class="btn btn-primary px-4 fw-bold" style="background-color: var(--mango-primary); border: none;" onclick="simulateSearch()">TRACE</button>
                </div>
                <p class="text-muted small mt-3">Supports: Amazon, Flipkart, Meesho, Myntra, and BlueDart API</p>
            </div>
        </div>
        
        <div id="tracking-results"></div>
    `;
}

function renderRecoModule(container) {
  container.innerHTML = `
        <div class="text-center py-5 fade-in">
            <div class="icon-box mx-auto mb-4 bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                <i class="bi bi-currency-exchange fs-1"></i>
            </div>
            <h3 class="fw-bold text-dark">Reconciliation Engine</h3>
            <p class="text-muted mb-4">Module initialization pending backend services.</p>
            <button class="btn btn-outline-secondary">View Documentation</button>
        </div>
    `;
}

// --- Inventory Module ---

let inventoryState = {
  activeTab: "dashboard",
};

function renderInventoryModule(container, initialTab = "dashboard") {
  // Ensure initialTab is set correctly
  const tab = initialTab || "dashboard";
  inventoryState.activeTab = tab;

  // Render inventory dashboard with tabs
  container.innerHTML = `
    <div class="fade-in">
      <!-- Inventory Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1">
            <i class="bi bi-box-seam me-2"></i>Inventory Management
          </h2>
          <p class="text-muted mb-0">View and manage your inventory across warehouses and channels</p>
        </div>
        <button class="btn btn-primary" onclick="showAddProductModal()">
          <i class="bi bi-plus-lg me-2"></i>New Item
        </button>
      </div>

      <!-- Navigation Tabs -->
      <ul class="nav nav-tabs mb-4" id="inventory-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'dashboard' ? 'active' : ''}" 
                  id="tab-dashboard" onclick="switchInventoryTab('dashboard')">
            <i class="bi bi-speedometer2 me-2"></i>Summary
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'warehouse' ? 'active' : ''}" 
                  id="tab-warehouse" onclick="switchInventoryTab('warehouse')">
            <i class="bi bi-building me-2"></i>Warehouse Wise
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'channel' ? 'active' : ''}" 
                  id="tab-channel" onclick="switchInventoryTab('channel')">
            <i class="bi bi-diagram-3 me-2"></i>Channel Wise
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'aging' ? 'active' : ''}" 
                  id="tab-aging" onclick="switchInventoryTab('aging')">
            <i class="bi bi-clock-history me-2"></i>Inventory Aging
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'products' ? 'active' : ''}" 
                  id="tab-products" onclick="switchInventoryTab('products')">
            <i class="bi bi-list-ul me-2"></i>All Items
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link ${tab === 'reports' ? 'active' : ''}" 
                  id="tab-reports" onclick="switchInventoryTab('reports')">
            <i class="bi bi-file-earmark-bar-graph me-2"></i>Reports
          </button>
        </li>
      </ul>

      <!-- Tab Content -->
        <div id="inventory-content" class="fade-in"></div>
    </div>
    `;

  // Load initial tab content after a brief delay to ensure DOM is ready
  setTimeout(() => {
    loadInventoryTabContent();
  }, 100);
}

async function renderInternalFlowModule(container, flowType) {
  const titles = {
    transfer: "Stock Transfer",
    adjustment: "Stock Adjustment",
    audit: "Stock Audit",
  };

  if (flowType === "transfer") {
    await renderStockTransfers(container);
  } else {
    // Other flow types still under construction
    container.innerHTML = `
            <div class="mb-5 fade-in">
                 <div class="d-flex align-items-center gap-3">
                    <div class="icon-box bg-primary bg-opacity-10 text-primary rounded p-3">
                        <i class="bi bi-arrow-left-right fs-4"></i>
                    </div>
                    <div>
                         <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">${titles[flowType]}</h2>
                         <p class="text-muted mb-0">Internal Inventory Operations</p>
                    </div>
                 </div>
            </div>
            
            <div class="card border-0 shadow-sm p-4 text-center">
                <div class="py-5">
                    <i class="bi bi-cone-striped text-warning display-4 mb-3"></i>
                    <h5 class="text-muted">Module Under Construction</h5>
                    <p class="small text-muted mb-4">The ${titles[flowType]} workflow is being developed.</p>
                    <button class="btn btn-primary" onclick="loadSection('inventory_view')">Back to Inventory</button>
                </div>
            </div>
        `;
  }
}

// Stock Transfer Management
async function renderStockTransfers(container, filterStatus = "all") {
  try {
    const [transfersRes, warehousesRes, productsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/mango/inventory/stock-transfers`),
      axios.get(`${API_BASE_URL}/mango/inventory/warehouses`),
      axios.get(`${API_BASE_URL}/mango/inventory/products`),
    ]);

    let transfers = transfersRes.data;
    const warehouses = warehousesRes.data;
    const products = productsRes.data;

    // Store for later use
    window.stockTransferData = { transfers, warehouses, products };

    // Filter transfers based on status
    const filteredTransfers =
      filterStatus === "all"
        ? transfers
        : filterStatus === "drafts"
        ? transfers.filter((t) => t.status === "DRAFT")
        : filterStatus === "pending"
        ? transfers.filter((t) => t.approval_status === "pending_approval")
        : filterStatus === "approved"
        ? transfers.filter((t) => t.approval_status === "approved")
        : filterStatus === "in_transit"
        ? transfers.filter((t) => t.status === "IN_TRANSIT")
        : filterStatus === "completed"
        ? transfers.filter((t) => t.status === "COMPLETED")
        : transfers;

    const statusColors = {
      DRAFT: "secondary",
      PENDING_APPROVAL: "warning",
      APPROVED: "info",
      IN_TRANSIT: "primary",
      COMPLETED: "success",
      CANCELLED: "danger",
      REJECTED: "danger",
    };

    const approvalBadgeColors = {
      draft: "secondary",
      pending_approval: "warning",
      approved: "success",
      rejected: "danger",
    };

    container.innerHTML = `
            <div class="mb-4 fade-in">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                        <div class="icon-box bg-primary bg-opacity-10 text-primary rounded p-3">
                            <i class="bi bi-arrow-left-right fs-4"></i>
                        </div>
                        <div>
                            <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">Stock Transfers</h2>
                            <p class="text-muted mb-0">Manage inter-warehouse inventory transfers with approval workflow</p>
                        </div>
                    </div>
                    <button class="btn btn-primary px-4" onclick="loadSection('inv_transfer_entry')">
                        <i class="bi bi-plus-lg me-2"></i>New Transfer
                    </button>
                </div>
            </div>
            
            <!-- Filter Tabs -->
            <div class="card border-0 shadow-sm mb-3 fade-in">
                <div class="card-body p-2">
                    <div class="btn-group w-100" role="group">
                        <button type="button" class="btn ${
                          filterStatus === "all"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }" onclick="renderStockTransfers(document.getElementById('dynamic-content'), 'all')">
                            All (${transfers.length})
                        </button>
                        <button type="button" class="btn ${
                          filterStatus === "drafts"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }" onclick="renderStockTransfers(document.getElementById('dynamic-content'), 'drafts')">
                            Drafts (${
                              transfers.filter((t) => t.status === "DRAFT")
                                .length
                            })
                        </button>
                        <button type="button" class="btn ${
                          filterStatus === "pending"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }" onclick="renderStockTransfers(document.getElementById('dynamic-content'), 'pending')">
                            Pending Approval (${
                              transfers.filter(
                                (t) => t.approval_status === "pending_approval"
                              ).length
                            })
                        </button>
                        <button type="button" class="btn ${
                          filterStatus === "approved"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }" onclick="renderStockTransfers(document.getElementById('dynamic-content'), 'approved')">
                            Approved (${
                              transfers.filter(
                                (t) => t.approval_status === "approved"
                              ).length
                            })
                        </button>
                        <button type="button" class="btn ${
                          filterStatus === "completed"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }" onclick="renderStockTransfers(document.getElementById('dynamic-content'), 'completed')">
                            Completed (${
                              transfers.filter((t) => t.status === "COMPLETED")
                                .length
                            })
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card border- shadow-sm fade-in">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4 py-3">Transfer #</th>
                                    <th>Date</th>
                                    <th>Source</th>
                                    <th>Destination</th>
                                    <th>Items</th>
                                    <th>Status</th>
                                    <th>Approval</th>
                                    <th class="pe-4 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                                  filteredTransfers.length === 0
                                    ? `
                                    <tr>
                                        <td colspan="8" class="text-center py-5 text-muted">
                                            <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                                            ${
                                              filterStatus === "all"
                                                ? "No stock transfers yet. Create your first transfer!"
                                                : `No ${filterStatus} transfers found.`
                                            }
                                        </td>
                                    </tr>
                                `
                                    : filteredTransfers
                                        .map((transfer) => {
                                          const sourceWh = warehouses.find(
                                            (w) =>
                                              w.id ===
                                              transfer.source_warehouse_id
                                          );
                                          const destWh = warehouses.find(
                                            (w) =>
                                              w.id ===
                                              transfer.destination_warehouse_id
                                          );
                                          const itemCount = transfer.items
                                            ? transfer.items.length
                                            : 0;

                                          return `
                                        <tr>
                                            <td class="ps-4">
                                                <div class="fw-bold text-dark">${
                                                  transfer.transfer_number
                                                }</div>
                                            </td>
                                            <td>
                                                <small>${new Date(
                                                  transfer.transfer_date
                                                ).toLocaleDateString()}</small>
                                            </td>
                                            <td>
                                                <i class="bi bi-building me-2 text-muted"></i>
                                                ${
                                                  sourceWh
                                                    ? sourceWh.name
                                                    : "N/A"
                                                }
                                            </td>
                                            <td>
                                                <i class="bi bi-building me-2 text-muted"></i>
                                                ${destWh ? destWh.name : "N/A"}
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">${itemCount} items</span>
                                            </td>
                                            <td>
                                                <span class="badge bg-${
                                                  statusColors[transfer.status]
                                                }-subtle text-${
                                            statusColors[transfer.status]
                                          } border border-${
                                            statusColors[transfer.status]
                                          }">
                                                    ${transfer.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-${
                                                  approvalBadgeColors[
                                                    transfer.approval_status
                                                  ]
                                                }-subtle text-${
                                            approvalBadgeColors[
                                              transfer.approval_status
                                            ]
                                          } border border-${
                                            approvalBadgeColors[
                                              transfer.approval_status
                                            ]
                                          }">
                                                    ${
                                                      transfer.approval_status
                                                        ?.replace("_", " ")
                                                        .toUpperCase() || "N/A"
                                                    }
                                                </span>
                                            </td>
                                            <td class="pe-4 text-end">
                                                <div class="btn-group btn-group-sm">
                                                    ${
                                                      transfer.status ===
                                                      "DRAFT"
                                                        ? `
                                                        <button class="btn btn-outline-primary" onclick="loadSection('inv_transfer_entry/${transfer.id}')" title="Edit Draft">
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                    `
                                                        : ""
                                                    }
                                                    ${
                                                      transfer.approval_status ===
                                                      "pending_approval"
                                                        ? `
                                                        <button class="btn btn-outline-success" onclick="approveTransferAction(${transfer.id})" title="Approve">
                                                            <i class="bi bi-check-circle"></i>
                                                        </button>
                                                        <button class="btn btn-outline-danger" onclick="rejectTransferAction(${transfer.id})" title="Reject">
                                                            <i class="bi bi-x-circle"></i>
                                                        </button>
                                                    `
                                                        : ""
                                                    }
                                                    ${
                                                      transfer.approval_status ===
                                                        "approved" &&
                                                      transfer.status !==
                                                        "COMPLETED"
                                                        ? `
                                                        <button class="btn btn-outline-success" onclick="completeTransfer(${transfer.id})" title="Complete Transfer">
                                                            <i class="bi bi-check2-all"></i>
                                                        </button>
                                                    `
                                                        : ""
                                                    }
                                                    <button class="btn btn-outline-info" onclick="loadSection('inv_transfer_view/${
                                                      transfer.id
                                                    }')" title="View Details">
                                                        <i class="bi bi-eye"></i>
                                                    </button>
                                                    ${
                                                      transfer.status !==
                                                        "COMPLETED" &&
                                                      transfer.status !==
                                                        "CANCELLED"
                                                        ? `
                                                        <button class="btn btn-outline-danger" onclick="cancelTransfer(${transfer.id})" title="Cancel Transfer">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    `
                                                        : ""
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                        })
                                        .join("")
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
  } catch (error) {
    console.error("Error loading stock transfers:", error);
    container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load stock transfers. Please check your connection.
            </div>
        `;
  }
}

// Show Create Transfer Modal (LEGACY - redirects to full page)
window.showCreateTransferModal = function () {
  // Redirect to full-page entry form instead
  loadSection("inv_transfer_entry");
};

// Add Transfer Item Row
let transferItemIndex = 0;
window.addTransferItem = function () {
  const container = document.getElementById("transfer-items-container");
  const products = window.stockTransferData.products;

  const itemHtml = `
        <div class="card border mb-3 transfer-item-row" data-index="${transferItemIndex}">
            <div class="card-body p-3">
                <div class="row g-2">
                    <div class="col-md-8">
                        <label class="form-label small">Product</label>
                        <select class="form-select form-select-sm product-select" required>
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
                        <label class="form-label small">Quantity</label>
                        <input type="number" class="form-control form-control-sm quantity-input" min="1" value="1" required>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeTransferItem(${transferItemIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", itemHtml);
  transferItemIndex++;
};

// Remove Transfer Item
window.removeTransferItem = function (index) {
  const row = document.querySelector(`[data-index="${index}"]`);
  if (row) row.remove();
};

// Submit Transfer
window.submitTransfer = async function () {
  const transferNumber = document.getElementById("transfer_number").value;
  const sourceWarehouse = parseInt(
    document.getElementById("source_warehouse").value
  );
  const destinationWarehouse = parseInt(
    document.getElementById("destination_warehouse").value
  );
  const notes = document.getElementById("transfer_notes").value;

  if (!transferNumber || !sourceWarehouse || !destinationWarehouse) {
    return Swal.fire("Error", "Please fill all required fields", "error");
  }

  if (sourceWarehouse === destinationWarehouse) {
    return Swal.fire(
      "Error",
      "Source and destination warehouse cannot be the same",
      "error"
    );
  }

  // Collect items
  const items = [];
  document.querySelectorAll(".transfer-item-row").forEach((row) => {
    const productId = parseInt(row.querySelector(".product-select").value);
    const quantity = parseInt(row.querySelector(".quantity-input").value);

    if (productId && quantity > 0) {
      items.push({
        product_id: productId,
        quantity_sent: quantity,
      });
    }
  });

  if (items.length === 0) {
    return Swal.fire("Error", "Please add at least one item", "error");
  }

  try {
    await axios.post(`${API_BASE_URL}/mango/inventory/stock-transfers`, {
      transfer_number: transferNumber,
      source_warehouse_id: sourceWarehouse,
      destination_warehouse_id: destinationWarehouse,
      notes: notes,
      items: items,
    });

    Swal.fire("Success", "Stock transfer created successfully!", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("createTransferModal")
    ).hide();
    loadSection("inv_transfer"); // Reload the transfers list
  } catch (error) {
    console.error("Error creating transfer:", error);
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to create transfer",
      "error"
    );
  }
};

// Complete Transfer
window.completeTransfer = async function (transferId) {
  const result = await Swal.fire({
    title: "Complete Transfer?",
    text: "This will update stock levels in both warehouses",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes, Complete It",
  });

  if (result.isConfirmed) {
    try {
      await axios.post(
        `${API_BASE_URL}/mango/inventory/stock-transfers/${transferId}/complete`
      );
      Swal.fire("Success", "Transfer completed successfully!", "success");
      loadSection("inv_transfer"); // Reload
    } catch (error) {
      console.error("Error completing transfer:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to complete transfer",
        "error"
      );
    }
  }
};

// Cancel Transfer
window.cancelTransfer = async function (transferId) {
  const result = await Swal.fire({
    title: "Cancel Transfer?",
    text: "This action cannot be undone",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    confirmButtonText: "Yes, Cancel It",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(
        `${API_BASE_URL}/mango/inventory/stock-transfers/${transferId}`
      );
      Swal.fire("Success", "Transfer cancelled successfully!", "success");
      loadSection("inv_transfer"); // Reload
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to cancel transfer",
        "error"
      );
    }
  }
};

function switchInventoryTab(tabName) {
  inventoryState.activeTab = tabName;
  
  // Update tab button active states
  document.querySelectorAll("#inventory-tabs .nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.add("active");
  }
  
  loadInventoryTabContent();
}

async function loadInventoryTabContent() {
  const container = document.getElementById("inventory-content");
  if (!container) return;

  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';

  switch (inventoryState.activeTab) {
    case "dashboard":
      await renderInventoryDashboard(container);
      break;
    case "warehouse":
      await renderWarehouseWiseInventory(container);
      break;
    case "channel":
      await renderChannelWiseInventory(container);
      break;
    case "aging":
      await renderInventoryAging(container);
      break;
    case "products":
      await renderProductList(container);
      break;
    case "reports":
      await renderInventoryReports(container);
      break;
    case "warehouses":
      await renderWarehouseList(container);
      break;
    case "vendors":
      await renderVendorList(container);
      break;
    case "pos":
      await renderPOList(container);
      break;
    case "grns":
      await renderGRNList(container);
      break;
  }
}

// ... (Previous PO Logic) ...

// --- GRN Logic ---
async function renderGRNList(container) {
  // For now, just a placeholder list or fetch if endpoint exists
  // We didn't make a GET /grns endpoint in the router yet, let's assume valid for now or just show Create button

  // Check if we have GET /grn endpoint? Router has create_grn but maybe not list?
  // Let's check router... 'router.post("/grn", ...)' exists.
  // I missed adding GET /grn in the router step.
  // I will implement the UI assuming I'll add the GET endpoint or just focus on creation first.
  // For this step, let's build the Creation Flow mainly.

  container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold">Goods Receipt Notes (GRN)</h5>
            <button class="btn btn-primary btn-sm" onclick="renderCreateGRNForm()">
                <i class="bi bi-box-seam"></i> Receive Stock (New GRN)
            </button>
        </div>
        
        <div class="alert alert-secondary">
            <i class="bi bi-info-circle me-2"></i> GRN History view coming soon. Use "Receive Stock" to process inbound POs.
        </div>
    `;
}

async function renderCreateGRNForm() {
  const container = document.getElementById("purchase-content");
  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    // Fetch Open POs
    const posRes = await axios.get(`${API_BASE_URL}/inventory/purchase-orders`);
    const pos = posRes.data; // Filter for non-completed if needed?

    container.innerHTML = `
             <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="fw-bold">Receive Stock (GRN)</h4>
                <button class="btn btn-outline-secondary btn-sm" onclick="loadPurchaseTabContent()">Cancel</button>
            </div>
            
            <div class="card border-0 shadow-sm p-4 mb-4">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label small text-muted">Select Purchase Order</label>
                        <select class="form-select" id="grn-po-select" onchange="loadPOItemsForGRN()">
                            <option value="">Select PO...</option>
                            ${pos
                              .map(
                                (po) =>
                                  `<option value="${po.id}">#${
                                    po.po_number
                                  } - ${new Date(
                                    po.order_date
                                  ).toLocaleDateString()}</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small text-muted">Vendor Invoice No.</label>
                        <input type="text" class="form-control" id="grn-invoice">
                    </div>
                     <div class="col-md-4">
                        <label class="form-label small text-muted">GRN Number</label>
                        <input type="text" class="form-control" id="grn-number" value="GRN-${Date.now()
                          .toString()
                          .slice(-6)}">
                    </div>
                </div>
            </div>
            
            <div id="grn-items-container" class="fade-in">
                <!-- Items loaded here -->
                <div class="text-center py-4 text-muted border rounded border-dashed">
                    Select a PO to view items for receiving.
                </div>
            </div>
        `;

    // Store POs for quick access
    window.allPOs = pos;
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to load POs", "error");
    loadPurchaseTabContent();
  }
}

window.loadPOItemsForGRN = function () {
  const poId = document.getElementById("grn-po-select").value;
  const container = document.getElementById("grn-items-container");

  if (!poId) {
    container.innerHTML =
      '<div class="text-center py-4 text-muted border rounded border-dashed">Select a PO to view items for receiving.</div>';
    return;
  }

  // Find PO Details (Assuming we fetched full POs with items, Router: response_model=POResponse includes items)
  const po = window.allPOs.find((p) => p.id == poId);

  if (!po || !po.items) {
    container.innerHTML =
      '<div class="alert alert-warning">No items found for this PO.</div>';
    return;
  }

  container.innerHTML = `
        <h5 class="fw-bold mb-3">Receiving & QC</h5>
        <div class="table-responsive mb-4">
            <table class="table table-bordered align-middle">
                <thead class="bg-light">
                    <tr>
                        <th style="width: 20%">Product</th>
                        <th style="width: 10%">Ordered</th>
                        <th style="width: 10%">Prev. Recv</th>
                        <th style="width: 15%">Received Now</th>
                        <th style="width: 15%">Accepted (QC Pass)</th>
                        <th style="width: 15%">Rejected (QC Fail)</th>
                        <th style="width: 15%">Batch / QC Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${po.items
                      .map(
                        (item) => `
                        <tr class="grn-item-row" data-po-item-id="${
                          item.id
                        }" data-product-id="${item.product_id}">
                            <td>
                                <div class="fw-bold text-dark">SKU: ${
                                  item.sku || "N/A"
                                }</div> 
                                <span class="small text-muted">Item #${
                                  item.id
                                }</span>
                            </td>
                            <td>${item.quantity_ordered}</td>
                            <td>${item.quantity_received}</td>
                            <td>
                                <input type="number" class="form-control form-control-sm bg-info bg-opacity-10 fw-bold qty-recv" 
                                    min="0" max="${
                                      item.quantity_ordered -
                                      item.quantity_received
                                    }" value="0" 
                                    onchange="autoFillAccepted(this)">
                            </td>
                            <td>
                                <input type="number" class="form-control form-control-sm border-success qty-accept" 
                                    min="0" value="0" onchange="calcRejected(this)">
                            </td>
                            <td>
                                <input type="number" class="form-control form-control-sm border-danger qty-reject" 
                                    min="0" value="0" readonly>
                            </td>
                            <td>
                                <input type="text" class="form-control form-control-sm mb-1 batch-input" placeholder="Batch No">
                                <input type="date" class="form-control form-control-sm mb-1 expiry-input">
                                <input type="text" class="form-control form-control-sm reason-input" placeholder="Rej. Reason">
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
        
        <div class="d-flex justify-content-end">
            <button class="btn btn-success px-5 py-2 fw-bold" onclick="submitGRN()">Submit GRN</button>
        </div>
    `;
};

window.autoFillAccepted = function (input) {
  const row = input.closest("tr");
  const recv = parseInt(input.value) || 0;
  row.querySelector(".qty-accept").value = recv;
  row.querySelector(".qty-reject").value = 0;
};

window.calcRejected = function (input) {
  const row = input.closest("tr");
  const recv = parseInt(row.querySelector(".qty-recv").value) || 0;
  const accept = parseInt(input.value) || 0;

  if (accept > recv) {
    Swal.fire(
      "Invalid",
      "Accepted quantity cannot exceed received quantity",
      "warning"
    );
    input.value = recv;
    row.querySelector(".qty-reject").value = 0;
    return;
  }

  row.querySelector(".qty-reject").value = recv - accept;
};

window.submitGRN = async function () {
  const poId = document.getElementById("grn-po-select").value;
  const grnNo = document.getElementById("grn-number").value;
  const invoice = document.getElementById("grn-invoice").value;

  if (!poId || !grnNo)
    return Swal.fire("Error", "PO and GRN Number required", "error");

  const items = [];
  let hasItems = false;

  document.querySelectorAll(".grn-item-row").forEach((row) => {
    const recv = parseInt(row.querySelector(".qty-recv").value) || 0;
    if (recv > 0) {
      hasItems = true;
      items.push({
        po_item_id: parseInt(row.dataset.poItemId),
        product_id: parseInt(row.dataset.productId),
        quantity_received: recv,
        quantity_accepted:
          parseInt(row.querySelector(".qty-accept").value) || 0,
        quantity_rejected:
          parseInt(row.querySelector(".qty-reject").value) || 0,
        batch_number: row.querySelector(".batch-input").value,
        expiry_date: row.querySelector(".expiry-input").value
          ? new Date(row.querySelector(".expiry-input").value).toISOString()
          : null,
        rejection_reason: row.querySelector(".reason-input").value,
      });
    }
  });

  if (!hasItems)
    return Swal.fire(
      "Error",
      "No items received. Please enter quantities.",
      "error"
    );

  try {
    await axios.post(`${API_BASE_URL}/mango/inventory/grn`, {
      po_id: parseInt(poId),
      grn_number: grnNo,
      vendor_invoice_no: invoice,
      items: items,
    });

    Swal.fire("Success", "Stock Received Successfully!", "success");
    loadInventoryTabContent(); // Reload tabs
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to submit GRN", "error");
  }
};

// --- Purchase Orders Logic ---
async function renderPOList(container) {
  try {
    const res = await axios.get(`${API_BASE_URL}/inventory/purchase-orders`);
    const pos = res.data;

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold">Purchase Orders</h5>
                <button class="btn btn-primary btn-sm" onclick="renderCreatePOForm()">
                    <i class="bi bi-plus-lg"></i> Create PO
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover table-modern align-middle">
                    <thead>
                        <tr>
                            <th>PO Number</th>
                            <th>Date</th>
                            <th>Vendor</th>
                            <th>Status</th>
                            <th>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                          pos.length > 0
                            ? pos
                                .map(
                                  (po) => `
                            <tr>
                                <td class="fw-bold">${po.po_number}</td>
                                <td class="text-muted small">${new Date(
                                  po.order_date
                                ).toLocaleDateString()}</td>
                                <td>Vendor #${
                                  po.vendor_id
                                }</td> <!-- TODO: Name lookup -->
                                <td><span class="badge bg-primary-subtle text-primary">${
                                  po.status
                                }</span></td>
                                <td class="fw-bold">₹${po.total_amount}</td>
                            </tr>
                        `
                                )
                                .join("")
                            : `<tr><td colspan="5" class="text-center py-4 text-muted">No Purchase Orders found.</td></tr>`
                        }
                    </tbody>
                </table>
            </div>
        `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger">Failed to load Purchase Orders.</div>`;
  }
}

async function renderCreatePOForm() {
  const container = document.getElementById("purchase-content");
  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    // Fetch dependencies for dropdowns
    const [vendorsRes, warehousesRes, productsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/mango/inventory/vendors`),
      axios.get(`${API_BASE_URL}/mango/inventory/warehouses`),
      axios.get(`${API_BASE_URL}/mango/inventory/products`),
    ]);

    const vendors = vendorsRes.data;
    const warehouses = warehousesRes.data;
    const products = productsRes.data;

    // Store products globally or in closure for row adding access
    window.availableProducts = products;

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="fw-bold">Create Purchase Order</h4>
                <button class="btn btn-outline-secondary btn-sm" onclick="loadPurchaseTabContent()">Cancel</button>
            </div>
            
            <div class="card border-0 shadow-sm p-4 mb-4">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label small text-muted">PO Number</label>
                        <input type="text" class="form-control" id="po-number" value="PO-${Date.now()
                          .toString()
                          .slice(-6)}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small text-muted">Vendor</label>
                        <select class="form-select" id="po-vendor">
                            <option value="">Select Vendor...</option>
                            ${vendors
                              .map(
                                (v) =>
                                  `<option value="${v.id}">${v.name}</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small text-muted">Destination Warehouse</label>
                        <select class="form-select" id="po-warehouse">
                            <option value="">Select Warehouse...</option>
                            ${warehouses
                              .map(
                                (w) =>
                                  `<option value="${w.id}">${w.name}</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small text-muted">Delivery Date</label>
                        <input type="date" class="form-control" id="po-date">
                    </div>
                </div>
            </div>
            
            <h5 class="fw-bold mb-3">Order Items</h5>
            <div class="card border-0 shadow-sm p-0 mb-4 overflow-hidden">
                <table class="table table-hover mb-0" id="po-items-table">
                    <thead class="bg-light">
                        <tr>
                            <th style="width: 40%">Product (SKU)</th>
                            <th style="width: 15%">Quantity</th>
                            <th style="width: 20%">Unit Price (₹)</th>
                            <th style="width: 20%">Total</th>
                            <th style="width: 5%"></th>
                        </tr>
                    </thead>
                    <tbody id="po-items-body">
                        <!-- Rows added dynamically -->
                    </tbody>
                </table>
                <div class="p-3 bg-light border-top">
                    <button class="btn btn-outline-primary btn-sm" onclick="addPOItemRow()">
                        <i class="bi bi-plus text-lg"></i> Add Item
                    </button>
                </div>
            </div>
            
            <div class="d-flex justify-content-end align-items-center">
                 <div class="me-4 text-end">
                    <small class="text-muted d-block">Total Amount</small>
                    <span class="fs-4 fw-bold text-dark" id="po-grand-total">₹0.00</span>
                 </div>
                 <button class="btn btn-primary px-5 py-2 fw-bold" onclick="submitPO()">Create PO</button>
            </div>
        `;

    // Add one initial empty row
    addPOItemRow();
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to load form dependencies", "error");
    loadPurchaseTabContent(); // Go back
  }
}

window.addPOItemRow = function () {
  const tbody = document.getElementById("po-items-body");
  const rowId = "row-" + Date.now();
  const row = document.createElement("tr");
  row.id = rowId;

  const productOptions = window.availableProducts
    .map(
      (p) =>
        `<option value="${p.id}" data-price="0">${p.sku} - ${p.name}</option>`
    )
    .join("");

  row.innerHTML = `
        <td>
            <select class="form-select form-select-sm product-select">
                <option value="">Select Product...</option>
                ${productOptions}
            </select>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm qty-input" value="1" min="1" onchange="calcPORow('${rowId}')">
        </td>
        <td>
            <input type="number" class="form-control form-control-sm price-input" value="0" min="0" onchange="calcPORow('${rowId}')">
        </td>
        <td>
            <span class="fw-bold row-total">₹0.00</span>
        </td>
        <td class="text-center">
            <i class="bi bi-trash text-danger" role="button" onclick="removePORow('${rowId}')"></i>
        </td>
    `;
  tbody.appendChild(row);
};

window.removePORow = function (rowId) {
  document.getElementById(rowId).remove();
  updatePOGrandTotal();
};

window.calcPORow = function (rowId) {
  const row = document.getElementById(rowId);
  const qty = parseFloat(row.querySelector(".qty-input").value) || 0;
  const price = parseFloat(row.querySelector(".price-input").value) || 0;
  const total = qty * price;

  row.querySelector(".row-total").innerText = "₹" + total.toFixed(2);
  updatePOGrandTotal();
};

window.updatePOGrandTotal = function () {
  let grandTotal = 0;
  document.querySelectorAll("#po-items-body tr").forEach((row) => {
    const qty = parseFloat(row.querySelector(".qty-input").value) || 0;
    const price = parseFloat(row.querySelector(".price-input").value) || 0;
    grandTotal += qty * price;
  });
  document.getElementById("po-grand-total").innerText =
    "₹" + grandTotal.toFixed(2);
};

window.submitPO = async function () {
  const poNumber = document.getElementById("po-number").value;
  const vendorId = document.getElementById("po-vendor").value;
  const warehouseId = document.getElementById("po-warehouse").value;
  const date = document.getElementById("po-date").value;

  if (!poNumber || !vendorId || !warehouseId || !date) {
    return Swal.fire("Error", "Please fill all header fields", "error");
  }

  const items = [];
  let validationError = false;

  document.querySelectorAll("#po-items-body tr").forEach((row) => {
    const prodId = row.querySelector(".product-select").value;
    const qty = row.querySelector(".qty-input").value;
    const price = row.querySelector(".price-input").value;

    if (!prodId || qty <= 0) validationError = true;

    items.push({
      product_id: parseInt(prodId),
      quantity_ordered: parseInt(qty),
      unit_price: parseFloat(price),
      tax_rate: 0, // Simplified for now
    });
  });

  if (validationError || items.length === 0) {
    return Swal.fire(
      "Error",
      "Please valid items (Product required, Qty > 0)",
      "error"
    );
  }

  const payload = {
    po_number: poNumber,
    vendor_id: parseInt(vendorId),
    warehouse_id: parseInt(warehouseId),
    order_date: new Date(date).toISOString(),
    expected_delivery_date: new Date(date).toISOString(), // Simplified matches order date for now
    items: items,
  };

  try {
    await axios.post(`${API_BASE_URL}/inventory/purchase-orders`, payload);
    Swal.fire("Success", "Purchase Order Created!", "success");
    switchInventoryTab("pos"); // Go back to list
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to submit PO", "error");
  }
};

function renderInventoryDashboard(container) {
  container.innerHTML = `
        <div class="row g-4 mb-4">
             <div class="col-md-3">
                <div class="dashboard-card p-3">
                    <h6 class="text-muted text-uppercase small fw-bold">Total Stock Value</h6>
                    <h3 class="mb-0 fw-bold">₹0.00</h3>
                </div>
             </div>
             <div class="col-md-3">
                <div class="dashboard-card p-3">
                    <h6 class="text-muted text-uppercase small fw-bold">Active POs</h6>
                    <h3 class="mb-0 fw-bold">0</h3>
                </div>
             </div>
             <div class="col-md-3">
                <div class="dashboard-card p-3">
                    <h6 class="text-muted text-uppercase small fw-bold">Pending GRNs</h6>
                    <h3 class="mb-0 fw-bold">0</h3>
                </div>
             </div>
             <div class="col-md-3">
                <div class="dashboard-card p-3">
                    <h6 class="text-muted text-uppercase small fw-bold">Low Stock alerts</h6>
                    <h3 class="mb-0 fw-bold text-danger">0</h3>
                </div>
             </div>
        </div>
        
        <div class="dashboard-card p-5 text-center">
            <i class="bi bi-box-seam text-primary fs-1 mb-3"></i>
            <h4>Welcome to Mango Inventory</h4>
            <p class="text-muted">Select a tab above to manage your inventory configuration and inbound flows.</p>
        </div>
    `;
}

// --- Warehouses Logic ---
async function renderWarehouseList(container) {
  try {
    const res = await axios.get(`${API_BASE_URL}/mango/inventory/warehouses`);
    const warehouses = res.data;

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold">Warehouses</h5>
                <button class="btn btn-primary btn-sm" onclick="showAddWarehouseModal()">
                    <i class="bi bi-plus-lg"></i> Add Warehouse
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover table-modern align-middle">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Address</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                          warehouses.length > 0
                            ? warehouses
                                .map(
                                  (w) => `
                            <tr>
                                <td class="fw-bold">${w.name}</td>
                                <td><code>${w.code}</code></td>
                                <td class="text-muted small">${
                                  w.address || "-"
                                }</td>
                                <td><span class="badge bg-success-subtle text-success">Active</span></td>
                            </tr>
                        `
                                )
                                .join("")
                            : `<tr><td colspan="4" class="text-center py-4 text-muted">No warehouses found.</td></tr>`
                        }
                    </tbody>
                </table>
            </div>
        `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger">Failed to load warehouses.</div>`;
  }
}

async function showAddWarehouseModal() {
  const { value: formValues } = await Swal.fire({
    title: "Add Warehouse",
    html:
      '<input id="swal-name" class="swal2-input" placeholder="Warehouse Name">' +
      '<input id="swal-code" class="swal2-input" placeholder="Code (e.g. WH-01)">' +
      '<input id="swal-address" class="swal2-input" placeholder="Address">',
    focusConfirm: false,
    preConfirm: () => {
      return {
        name: document.getElementById("swal-name").value,
        code: document.getElementById("swal-code").value,
        address: document.getElementById("swal-address").value,
      };
    },
  });

  if (formValues) {
    if (!formValues.name || !formValues.code)
      return Swal.fire("Error", "Name and Code are required", "error");

    try {
      await axios.post(
        `${API_BASE_URL}/mango/inventory/warehouses`,
        formValues
      );
      Swal.fire("Success", "Warehouse created successfully", "success");
      loadInventoryTabContent(); // Reload
    } catch (err) {
      Swal.fire("Error", "Failed to create warehouse", "error");
    }
  }
}

// --- Vendors Logic ---
async function renderVendorList(container) {
  try {
    const res = await axios.get(`${API_BASE_URL}/mango/inventory/vendors`);
    const vendors = res.data;

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold">Vendors</h5>
                <button class="btn btn-primary btn-sm" onclick="showAddVendorModal()">
                    <i class="bi bi-plus-lg"></i> Add Vendor
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover table-modern align-middle">
                    <thead>
                        <tr>
                            <th>Vendor Name</th>
                            <th>Code</th>
                            <th>Contact</th>
                            <th>Terms</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                          vendors.length > 0
                            ? vendors
                                .map(
                                  (v) => `
                            <tr>
                                <td class="fw-bold">${v.name}</td>
                                <td><code>${v.code}</code></td>
                                <td>
                                    <div>${v.contact_person || "-"}</div>
                                    <div class="small text-muted">${
                                      v.email || ""
                                    }</div>
                                </td>
                                <td class="text-muted small">${
                                  v.payment_terms || "-"
                                }</td>
                                <td><span class="badge bg-success-subtle text-success">Active</span></td>
                            </tr>
                        `
                                )
                                .join("")
                            : `<tr><td colspan="5" class="text-center py-4 text-muted">No vendors found.</td></tr>`
                        }
                    </tbody>
                </table>
            </div>
        `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger">Failed to load vendors.</div>`;
  }
}

async function showAddVendorModal() {
  const { value: formValues } = await Swal.fire({
    title: "Add Vendor",
    html:
      '<input id="swal-vname" class="swal2-input" placeholder="Vendor Name">' +
      '<input id="swal-vcode" class="swal2-input" placeholder="Code (e.g. VEN-001)">' +
      '<input id="swal-vcontact" class="swal2-input" placeholder="Contact Person">' +
      '<input id="swal-vemail" class="swal2-input" placeholder="Email">' +
      '<input id="swal-vterms" class="swal2-input" placeholder="Payment Terms (e.g. Net 30)">',
    focusConfirm: false,
    preConfirm: () => {
      return {
        name: document.getElementById("swal-vname").value,
        code: document.getElementById("swal-vcode").value,
        contact_person: document.getElementById("swal-vcontact").value,
        email: document.getElementById("swal-vemail").value,
        payment_terms: document.getElementById("swal-vterms").value,
      };
    },
  });

  if (formValues) {
    if (!formValues.name || !formValues.code)
      return Swal.fire("Error", "Name and Code are required", "error");

    try {
      await axios.post(`${API_BASE_URL}/mango/inventory/vendors`, formValues);
      Swal.fire("Success", "Vendor created successfully", "success");
      loadInventoryTabContent(); // Reload
    } catch (err) {
      Swal.fire("Error", "Failed to create vendor", "error");
    }
  }
}

// --- Products Logic ---
// --- Column Configuration ---
const ITEM_COLUMNS_CONFIG = {
  // 1. Core Identification
  name: { label: "Item Name", type: "text", sortable: true },
  item_code: { label: "SKU / Code", type: "text", sortable: true },
  item_short_name: { label: "Short Name", type: "text" },
  item_type: { label: "Type", type: "text" },
  item_status: { label: "Status", type: "badge" },
  item_level: { label: "Level", type: "text" },
  // 2. Category & Brand
  brand: { label: "Brand", type: "text" },
  category: { label: "Category", type: "text" },
  product_group: { label: "Product Group", type: "text" },
  model_no: { label: "Model No", type: "text" },
  variant_group: { label: "Variant Group", type: "text" },
  // 3. Units & Inventory
  base_uom: { label: "Base UOM", type: "text" },
  alternate_uom: { label: "Alt UOM", type: "text" },
  uom_conversion_factor: { label: "Conv Factor", type: "number" },
  inventory_tracking_flag: { label: "Track Stock", type: "boolean" },
  batch_tracking_flag: { label: "Track Batch", type: "boolean" },
  serial_tracking_flag: { label: "Track Serial", type: "boolean" },
  expiry_tracking_flag: { label: "Track Expiry", type: "boolean" },
  // 4. Tax & Compliance
  hsn_sac: { label: "HSN/SAC", type: "text" },
  gst_applicable_flag: { label: "GST Applicable", type: "boolean" },
  tax_category: { label: "Tax Category", type: "text" },
  country_of_origin: { label: "Origin Country", type: "text" },
  intra_state_tax_rate: { label: "Intra Tax", type: "text" },
  inter_state_tax_rate: { label: "Inter Tax", type: "text" },
  // 5. Physical & Technical
  color: { label: "Color", type: "text" },
  size: { label: "Size", type: "text" },
  material: { label: "Material", type: "text" },
  weight_kg: { label: "Weight", type: "number" },
  weight_uom: { label: "Weight Unit", type: "text" },
  volume: { label: "Volume", type: "number" },
  length_cm: { label: "Length", type: "number" },
  width_cm: { label: "Width", type: "number" },
  height_cm: { label: "Height", type: "number" },
  dimension_uom: { label: "Dim Unit", type: "text" },
  // 6. Quality & Storage
  quality_grade: { label: "Quality Grade", type: "text" },
  shelf_life_days: { label: "Shelf Life (Days)", type: "number" },
  storage_type: { label: "Storage Type", type: "text" },
  temperature_range: { label: "Temp Range", type: "text" },
  // 7. Pricing
  sales_rate: { label: "Sales Rate", type: "money" },
  purchase_rate: { label: "Purchase Rate", type: "money" },
  standard_cost: { label: "Standard Cost", type: "money" },
  costing_method: { label: "Costing Method", type: "text" },
  default_margin_percent: { label: "Margin %", type: "number" },
  price_control_type: { label: "Price Control", type: "text" },
  // 8. Logistics
  min_order_qty: { label: "Min Order Qty", type: "number" },
  max_order_qty: { label: "Max Order Qty", type: "number" },
  reorder_level: { label: "Reorder Level", type: "number" },
  hazardous_flag: { label: "Hazardous", type: "boolean" },
  stackable_flag: { label: "Stackable", type: "boolean" },
  // 9. Analytics
  abc_classification: { label: "ABC Class", type: "text" },
  demand_velocity: { label: "Velocity", type: "text" },
  lifecycle_stage: { label: "Lifecycle", type: "text" },
  search_keywords: { label: "Tags", type: "text" },
  // 10. Audit
  created_at: { label: "Created At", type: "date" },
  updated_at: { label: "Updated At", type: "date" },
};

const DEFAULT_VISIBLE_COLUMNS = [
  "name",
  "item_code",
  "brand",
  "sales_rate",
  "item_status",
];

// Helper to format values
function getFormattedValue(item, key) {
  const config = ITEM_COLUMNS_CONFIG[key];
  const val = item[key] !== undefined && item[key] !== null ? item[key] : "";

  if (key === "name") return `<span class="fw-bold text-primary">${val}</span>`;

  if (config?.type === "money") {
    return `₹${parseFloat(val || 0).toFixed(2)}`;
  }
  if (config?.type === "badge") {
    const cls =
      val === "Active"
        ? "bg-success"
        : val === "Inactive"
        ? "bg-warning"
        : "bg-secondary";
    return `<span class="badge ${cls} bg-opacity-10 text-dark border px-2 py-1 align-middle">${val}</span>`;
  }
  if (config?.type === "boolean") {
    return val
      ? '<i class="bi bi-check-circle-fill text-success"></i>'
      : '<i class="bi bi-circle text-muted opacity-25"></i>';
  }
  if (config?.type === "date") {
    return val ? new Date(val).toLocaleDateString() : "-";
  }
  return val;
}

// Open Advanced Column Customizer
function openColumnCustomizer() {
  const current =
    JSON.parse(localStorage.getItem("inventory_visible_columns")) ||
    DEFAULT_VISIBLE_COLUMNS;

  // Create ordered list of all columns (Selected first, then others)
  // Actually, we want to show all columns, but maybe keep the current order for selected ones?
  // Let's just list them. If we suport reordering, we need to respect it.

  // Merge current config with order
  let orderedKeys = [...current];
  Object.keys(ITEM_COLUMNS_CONFIG).forEach((k) => {
    if (!orderedKeys.includes(k)) orderedKeys.push(k);
  });

  const totalCount = Object.keys(ITEM_COLUMNS_CONFIG).length;

  const listHtml = orderedKeys
    .map((key) => {
      const conf = ITEM_COLUMNS_CONFIG[key];
      const isChecked = current.includes(key);
      // Special case for 'name' which might be mandatory or locked? User screenshot shows lock icon for Name.
      const isLocked = key === "name";

      return `
            <div class="list-group-item d-flex align-items-center gap-3 p-2 border-0 mb-1 rounded bg-light-hover" data-id="${key}">
                <i class="bi bi-grid-3x2-gap-fill text-muted cursor-move handle opacity-50"></i>
                <div class="form-check mb-0 flex-grow-1 d-flex align-items-center gap-2">
                    ${
                      isLocked
                        ? `<i class="bi bi-lock-fill text-muted"></i> <input type="checkbox" class="form-check-input d-none" checked disabled>`
                        : `<input class="form-check-input me-2" type="checkbox" id="col-${key}" ${
                            isChecked ? "checked" : ""
                          }>`
                    }
                    <label class="form-check-label w-100 cursor-pointer user-select-none" for="col-${key}">
                        ${conf.label}
                    </label>
                </div>
            </div>
        `;
    })
    .join("");

  Swal.fire({
    html: `
            <div class="text-start">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold mb-0">Customize Columns</h5>
                    <div class="d-flex align-items-center gap-2">
                         <small class="text-muted"><span id="selected-count">${current.length}</span> of ${totalCount} Selected</small>
                         <button type="button" class="btn-close" onclick="Swal.close()"></button>
                    </div>
                </div>
                
                <div class="position-relative mb-3">
                    <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input type="text" id="col-search" class="form-control ps-5 rounded-pill bg-light border-0" placeholder="Search columns...">
                </div>

                <div class="list-group custom-scroll" id="columns-list" style="max-height: 400px; overflow-y: auto;">
                    ${listHtml}
                </div>
            </div>
        `,
    width: "500px",
    showConfirmButton: true,
    confirmButtonText: "Save",
    confirmButtonColor: "#0d6efd",
    showCancelButton: true,
    cancelButtonText: "Cancel",
    customClass: {
      container: "font-sans",
      popup: "rounded-4 p-4",
      actions: "w-100 justify-content-between px-4 pb-2",
      confirmButton: "w-45 rounded-3",
      cancelButton: "w-45 rounded-3 btn btn-light text-dark border-0",
    },
    buttonsStyling: false,
    didOpen: () => {
      const popup = Swal.getPopup();
      const listEl = popup.querySelector("#columns-list");
      const searchEl = popup.querySelector("#col-search");
      const countEl = popup.querySelector("#selected-count");

      // Init Sortable
      if (typeof Sortable !== "undefined" && listEl) {
        new Sortable(listEl, {
          animation: 150,
          handle: ".handle",
          ghostClass: "bg-light",
        });
      }

      // Search Filter
      if (searchEl && listEl) {
        searchEl.focus(); // Auto focus
        searchEl.addEventListener("keyup", (e) => {
          // keyup often safer than input for some browsers
          const term = e.target.value.toLowerCase().trim();
          const items = listEl.querySelectorAll(".list-group-item");

          items.forEach((item) => {
            const label = item.querySelector("label");
            const text = (
              label ? label.textContent : item.innerText
            ).toLowerCase();
            // Toggle visibility
            if (text.includes(term)) {
              item.classList.remove("d-none");
              item.classList.add("d-flex");
            } else {
              item.classList.remove("d-flex");
              item.classList.add("d-none");
            }
          });
        });

        // Trigger input too just in case
        searchEl.addEventListener("input", (e) => {
          const term = e.target.value.toLowerCase().trim();
          const items = listEl.querySelectorAll(".list-group-item");
          items.forEach((item) => {
            const label = item.querySelector("label");
            const text = (
              label ? label.textContent : item.innerText
            ).toLowerCase();
            if (text.includes(term)) {
              item.classList.remove("d-none");
              item.classList.add("d-flex");
            } else {
              item.classList.remove("d-flex");
              item.classList.add("d-none");
            }
          });
        });
      }

      // Update Count on Check
      if (listEl) {
        listEl.addEventListener("change", () => {
          const checked = listEl.querySelectorAll(
            'input[type="checkbox"]:checked, input[type="checkbox"][disabled]'
          ).length;
          if (countEl) countEl.innerText = checked;
        });
      }
    },
    preConfirm: () => {
      const listEl = document.getElementById("columns-list");
      const selected = [];

      // Push 'name' first if locked
      if (!selected.includes("name")) selected.push("name");

      Array.from(listEl.children).forEach((item) => {
        const key = item.getAttribute("data-id");
        if (key === "name") return; // Handled

        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          selected.push(key);
        }
      });
      return selected;
    },
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.setItem(
        "inventory_visible_columns",
        JSON.stringify(result.value)
      );
      renderProductList();
    }
  });
}

// ============ INVENTORY DASHBOARD & VIEWS ============

// Render Inventory Dashboard (Summary)
async function renderInventoryDashboard(container) {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    
    // Fetch inventory summary
    const summaryRes = await axios.get(
      `${apiBase}/mango/inventory/summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const summary = summaryRes.data;

    container.innerHTML = `
      <div class="row g-4 mb-4">
        <!-- Summary Cards -->
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-2">Total Items</h6>
                  <h3 class="fw-bold mb-0">${summary.total_items || 0}</h3>
                  <small class="text-muted">${summary.total_skus || 0} unique SKUs</small>
                </div>
                <div class="bg-primary bg-opacity-10 p-3 rounded">
                  <i class="bi bi-box-seam fs-4 text-primary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-2">Total Quantity</h6>
                  <h3 class="fw-bold mb-0">${(summary.total_quantity || 0).toLocaleString()}</h3>
                  <small class="text-muted">${summary.available_quantity || 0} available</small>
                </div>
                <div class="bg-success bg-opacity-10 p-3 rounded">
                  <i class="bi bi-stack fs-4 text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-2">Total Value</h6>
                  <h3 class="fw-bold mb-0">₹${(summary.total_value || 0).toLocaleString('en-IN')}</h3>
                  <small class="text-muted">At cost price</small>
                </div>
                <div class="bg-warning bg-opacity-10 p-3 rounded">
                  <i class="bi bi-currency-rupee fs-4 text-warning"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-muted mb-2">Low Stock Items</h6>
                  <h3 class="fw-bold mb-0 text-danger">${summary.low_stock_count || 0}</h3>
                  <small class="text-muted">Below reorder level</small>
                </div>
                <div class="bg-danger bg-opacity-10 p-3 rounded">
                  <i class="bi bi-exclamation-triangle fs-4 text-danger"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Warehouse Summary -->
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-light">
              <h5 class="mb-0"><i class="bi bi-building me-2"></i>Warehouse Summary</h5>
            </div>
            <div class="card-body">
              <div id="warehouse-summary-list">
                <div class="text-center py-3">
                  <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Channel Summary -->
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-light">
              <h5 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>Channel Summary</h5>
            </div>
            <div class="card-body">
              <div id="channel-summary-list">
                <div class="text-center py-3">
                  <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mt-2">
        <!-- Recent Activity -->
        <div class="col-md-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recent Inventory Activity</h5>
              <a href="#" onclick="switchInventoryTab('reports'); return false;" class="btn btn-sm btn-outline-primary">View All Reports</a>
            </div>
            <div class="card-body">
              <div id="recent-activity-list">
                <div class="text-center py-3">
                  <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load warehouse and channel summaries
    loadWarehouseSummary();
    loadChannelSummary();
    loadRecentActivity();
  } catch (error) {
    console.error("Error loading inventory dashboard:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Dashboard</h5>
        <p>${error.response?.data?.detail || error.message || "Failed to load inventory summary"}</p>
      </div>
    `;
  }
}

// Load Warehouse Summary
async function loadWarehouseSummary() {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const res = await axios.get(
      `${apiBase}/mango/inventory/warehouse-summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const warehouses = res.data.warehouses || [];

    const container = document.getElementById("warehouse-summary-list");
    if (!container) return;

    if (warehouses.length === 0) {
      container.innerHTML = '<p class="text-muted text-center mb-0">No warehouses found</p>';
      return;
    }

    container.innerHTML = warehouses.map(wh => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <h6 class="mb-0">${wh.name}</h6>
          <small class="text-muted">${wh.code || ''}</small>
        </div>
        <div class="text-end">
          <div class="fw-bold">${(wh.total_quantity || 0).toLocaleString()}</div>
          <small class="text-muted">items</small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    const container = document.getElementById("warehouse-summary-list");
    if (container) {
      container.innerHTML = '<p class="text-danger small mb-0">Failed to load warehouse data</p>';
    }
  }
}

// Load Channel Summary
async function loadChannelSummary() {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const res = await axios.get(
      `${apiBase}/api/mango/channels`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const channels = res.data.channels || [];

    const container = document.getElementById("channel-summary-list");
    if (!container) return;

    if (channels.length === 0) {
      container.innerHTML = '<p class="text-muted text-center mb-0">No channels found</p>';
      return;
    }

    container.innerHTML = channels.map(ch => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <h6 class="mb-0">${ch.channel_name}</h6>
          <small class="text-muted">${ch.channel_type || ''}</small>
        </div>
        <div class="text-end">
          <a href="#" onclick="switchInventoryTab('channel'); return false;" class="btn btn-sm btn-outline-primary">View</a>
        </div>
      </div>
    `).join('');
  } catch (error) {
    const container = document.getElementById("channel-summary-list");
    if (container) {
      container.innerHTML = '<p class="text-danger small mb-0">Failed to load channel data</p>';
    }
  }
}

// Load Recent Activity
async function loadRecentActivity() {
  const container = document.getElementById("recent-activity-list");
  if (!container) return;

  container.innerHTML = `
    <div class="text-muted text-center py-3">
      <i class="bi bi-info-circle me-2"></i>Recent activity will be displayed here
    </div>
  `;
}

// Render Warehouse-Wise Inventory
async function renderWarehouseWiseInventory(container) {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const res = await axios.get(
      `${apiBase}/mango/inventory/warehouse-summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const warehouses = res.data.warehouses || [];

    container.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-building me-2"></i>Warehouse-Wise Inventory</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="exportWarehouseInventory()">
              <i class="bi bi-download me-1"></i>Export
            </button>
          </div>
        </div>
        <div class="card-body">
          ${warehouses.length === 0 ? `
            <div class="text-center py-5">
              <i class="bi bi-building text-muted display-4 d-block mb-3"></i>
              <h5 class="text-muted">No Warehouses Found</h5>
              <p class="text-muted">Create warehouses to track inventory by location.</p>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Code</th>
                    <th>Total Items</th>
                    <th>Total Quantity</th>
                    <th>Total Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${warehouses.map(wh => `
                    <tr>
                      <td><strong>${wh.name}</strong></td>
                      <td><span class="badge bg-light text-dark">${wh.code || 'N/A'}</span></td>
                      <td>${wh.item_count || 0}</td>
                      <td>${(wh.total_quantity || 0).toLocaleString()}</td>
                      <td>₹${(wh.total_value || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewWarehouseDetails(${wh.id})">
                          <i class="bi bi-eye me-1"></i>View Details
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Warehouse Inventory</h5>
        <p>${error.response?.data?.detail || error.message || "Failed to load warehouse inventory"}</p>
      </div>
    `;
  }
}

// Render Channel-Wise Inventory
async function renderChannelWiseInventory(container) {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const channelsRes = await axios.get(
      `${apiBase}/api/mango/channels`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const channels = channelsRes.data.channels || [];

    container.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>Channel-Wise Inventory</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="exportChannelInventory()">
              <i class="bi bi-download me-1"></i>Export
            </button>
          </div>
        </div>
        <div class="card-body">
          ${channels.length === 0 ? `
            <div class="text-center py-5">
              <i class="bi bi-diagram-3 text-muted display-4 d-block mb-3"></i>
              <h5 class="text-muted">No Channels Found</h5>
              <p class="text-muted">Create channels to track inventory by sales channel.</p>
              <a href="#" onclick="loadSection('channel_settings'); return false;" class="btn btn-primary">
                <i class="bi bi-plus me-1"></i>Create Channel
              </a>
            </div>
          ` : `
            <div class="row g-3">
              ${channels.map(ch => `
                <div class="col-md-6">
                  <div class="card border h-100">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 class="fw-bold mb-1">${ch.channel_name}</h6>
                          <span class="badge bg-secondary">${ch.channel_type || 'custom'}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewChannelInventory(${ch.id})">
                          <i class="bi bi-eye me-1"></i>View
                        </button>
                      </div>
                      <div class="row g-2 mt-2">
                        <div class="col-6">
                          <small class="text-muted d-block">Orders</small>
                          <strong id="channel-${ch.id}-orders">-</strong>
                        </div>
                        <div class="col-6">
                          <small class="text-muted d-block">Items</small>
                          <strong id="channel-${ch.id}-items">-</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Load channel statistics
    channels.forEach(ch => loadChannelStats(ch.id));
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Channel Inventory</h5>
        <p>${error.response?.data?.detail || error.message || "Failed to load channel inventory"}</p>
      </div>
    `;
  }
}

// Load Channel Statistics
async function loadChannelStats(channelId) {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const res = await axios.get(
      `${apiBase}/api/mango/channels/${channelId}/stats`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const stats = res.data;

    const ordersEl = document.getElementById(`channel-${channelId}-orders`);
    const itemsEl = document.getElementById(`channel-${channelId}-items`);
    
    if (ordersEl) {
      ordersEl.textContent = stats.total_orders || 0;
    }
    if (itemsEl) {
      itemsEl.textContent = stats.total_items || 0;
    }
  } catch (error) {
    // Silently fail - element might not exist if user navigated away
    console.debug(`Error loading stats for channel ${channelId}:`, error);
  }
}

// Render Inventory Aging
async function renderInventoryAging(container) {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const res = await axios.get(
      `${apiBase}/mango/inventory/aging`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const agingData = res.data;

    container.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i>Inventory Aging Analysis</h5>
          <div class="d-flex gap-2">
            <input type="date" id="aging-date-filter" class="form-control form-control-sm" 
                   value="${new Date().toISOString().split('T')[0]}" 
                   onchange="loadInventoryAging()">
            <button class="btn btn-sm btn-outline-primary" onclick="exportAgingReport()">
              <i class="bi bi-download me-1"></i>Export
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="text-muted mb-1">0-30 Days</h6>
                  <h4 class="fw-bold text-success">${(agingData.aging_0_30 || 0).toLocaleString()}</h4>
                  <small class="text-muted">items</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="text-muted mb-1">31-60 Days</h6>
                  <h4 class="fw-bold text-warning">${(agingData.aging_31_60 || 0).toLocaleString()}</h4>
                  <small class="text-muted">items</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="text-muted mb-1">61-90 Days</h6>
                  <h4 class="fw-bold text-orange">${(agingData.aging_61_90 || 0).toLocaleString()}</h4>
                  <small class="text-muted">items</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="text-muted mb-1">90+ Days</h6>
                  <h4 class="fw-bold text-danger">${(agingData.aging_90_plus || 0).toLocaleString()}</h4>
                  <small class="text-muted">items</small>
                </div>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th>Quantity</th>
                  <th>Last Movement</th>
                  <th>Age (Days)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="aging-items-list">
                <tr>
                  <td colspan="7" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Load aging items
    loadAgingItems();
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Inventory Aging</h5>
        <p>${error.response?.data?.detail || error.message || "Failed to load aging data"}</p>
      </div>
    `;
  }
}

// Load Aging Items
async function loadAgingItems() {
  try {
    const token = localStorage.getItem("access_token");
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8000';
    const dateFilter = document.getElementById("aging-date-filter")?.value || new Date().toISOString().split('T')[0];
    
    const res = await axios.get(
      `${apiBase}/mango/inventory/aging/items?as_of_date=${dateFilter}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const items = res.data.items || [];

    const container = document.getElementById("aging-items-list");
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">No aging items found</td>
        </tr>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const ageClass = item.age_days <= 30 ? 'text-success' : 
                      item.age_days <= 60 ? 'text-warning' : 
                      item.age_days <= 90 ? 'text-orange' : 'text-danger';
      const statusBadge = item.age_days <= 30 ? 'bg-success' : 
                         item.age_days <= 60 ? 'bg-warning' : 
                         item.age_days <= 90 ? 'bg-orange' : 'bg-danger';
      
      return `
        <tr>
          <td><strong>${item.item_name || 'N/A'}</strong></td>
          <td><span class="badge bg-light text-dark">${item.sku || 'N/A'}</span></td>
          <td>${item.warehouse_name || 'N/A'}</td>
          <td>${(item.quantity || 0).toLocaleString()}</td>
          <td>${item.last_movement_date ? new Date(item.last_movement_date).toLocaleDateString() : 'N/A'}</td>
          <td><span class="fw-bold ${ageClass}">${item.age_days || 0}</span></td>
          <td><span class="badge ${statusBadge}">${item.age_category || 'N/A'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    const container = document.getElementById("aging-items-list");
    if (container) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">Failed to load aging items</td>
        </tr>
      `;
    }
  }
}

// Reload Inventory Aging
window.loadInventoryAging = function() {
  loadAgingItems();
};

// Render Inventory Reports
async function renderInventoryReports(container) {
  container.innerHTML = `
    <div class="row g-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-file-earmark-bar-graph display-4 text-primary mb-3"></i>
            <h5 class="fw-bold">Stock Report</h5>
            <p class="text-muted small">Current stock levels across all warehouses</p>
            <button class="btn btn-primary" onclick="generateStockReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-clock-history display-4 text-warning mb-3"></i>
            <h5 class="fw-bold">Aging Report</h5>
            <p class="text-muted small">Inventory aging analysis by date</p>
            <button class="btn btn-warning" onclick="generateAgingReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-exclamation-triangle display-4 text-danger mb-3"></i>
            <h5 class="fw-bold">Low Stock Report</h5>
            <p class="text-muted small">Items below reorder level</p>
            <button class="btn btn-danger" onclick="generateLowStockReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-building display-4 text-info mb-3"></i>
            <h5 class="fw-bold">Warehouse Report</h5>
            <p class="text-muted small">Inventory breakdown by warehouse</p>
            <button class="btn btn-info" onclick="generateWarehouseReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-diagram-3 display-4 text-success mb-3"></i>
            <h5 class="fw-bold">Channel Report</h5>
            <p class="text-muted small">Inventory and orders by channel</p>
            <button class="btn btn-success" onclick="generateChannelReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center p-4">
            <i class="bi bi-currency-rupee display-4 text-secondary mb-3"></i>
            <h5 class="fw-bold">Valuation Report</h5>
            <p class="text-muted small">Inventory value at cost and selling price</p>
            <button class="btn btn-secondary" onclick="generateValuationReport()">
              <i class="bi bi-download me-1"></i>Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Report Generation Functions
window.generateStockReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Stock Report",
    text: "Report generation will be implemented soon!",
  });
};

window.generateAgingReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Aging Report",
    text: "Report generation will be implemented soon!",
  });
};

window.generateLowStockReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Low Stock Report",
    text: "Report generation will be implemented soon!",
  });
};

window.generateWarehouseReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Warehouse Report",
    text: "Report generation will be implemented soon!",
  });
};

window.generateChannelReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Channel Report",
    text: "Report generation will be implemented soon!",
  });
};

window.generateValuationReport = async function() {
  Swal.fire({
    icon: "info",
    title: "Valuation Report",
    text: "Report generation will be implemented soon!",
  });
};

window.viewWarehouseDetails = function(warehouseId) {
  Swal.fire({
    icon: "info",
    title: "Warehouse Details",
    text: `Viewing details for warehouse ID: ${warehouseId}`,
  });
};

window.viewChannelInventory = function(channelId) {
  Swal.fire({
    icon: "info",
    title: "Channel Inventory",
    text: `Viewing inventory for channel ID: ${channelId}`,
  });
};

window.exportWarehouseInventory = function() {
  Swal.fire({
    icon: "info",
    title: "Export Warehouse Inventory",
    text: "Export functionality will be implemented soon!",
  });
};

window.exportChannelInventory = function() {
  Swal.fire({
    icon: "info",
    title: "Export Channel Inventory",
    text: "Export functionality will be implemented soon!",
  });
};

window.exportAgingReport = function() {
  Swal.fire({
    icon: "info",
    title: "Export Aging Report",
    text: "Export functionality will be implemented soon!",
  });
};

// --- Dynamic Product List ---
async function renderProductList(container) {
  if (!container) container = document.getElementById("inventory-content");
  if (!container) return; // Guard

  try {
    const res = await axios.get(`${API_BASE_URL}/mango/inventory/products`);
    const products = res.data;

    const visibleCols =
      JSON.parse(localStorage.getItem("inventory_visible_columns")) ||
      DEFAULT_VISIBLE_COLUMNS;

    // Get unique SKUs and Statuses for filters
    const uniqueSkus = [
      ...new Set(products.map((p) => p.sku).filter(Boolean)),
    ].sort();
    const uniqueStatuses = [
      ...new Set(products.map((p) => p.item_status).filter(Boolean)),
    ].sort();

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-2">
                    <h5 class="fw-bold mb-0">All Items</h5>
                    <span class="badge bg-light text-secondary border rounded-pill">${
                      products.length
                    }</span>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary btn-sm px-3 shadow-sm bg-white" onclick="openColumnCustomizer()" title="Customize Columns">
                        <i class="bi bi-layout-three-columns me-1"></i> Columns
                    </button>
                    <button class="btn btn-outline-primary btn-sm px-3 shadow-sm bg-white" onclick="openChannelMappingTool()" title="Channel Mapping">
                        <i class="bi bi-diagram-3 me-1"></i> Channel Mapping
                    </button>
                    <button class="btn btn-light btn-sm px-3 shadow-sm border" onclick="loadSection('inventory_settings')" title="Item Settings">
                        <i class="bi bi-gear-fill text-muted"></i>
                    </button>
                    
                    <!-- 3-Dot Menu -->
                    <div class="dropdown">
                        <button class="btn btn-light btn-sm px-3 shadow-sm border dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More Actions">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                            <li><h6 class="dropdown-header text-muted small">Bulk Actions</h6></li>
                            <li><a class="dropdown-item" href="#" onclick="exportItems(); return false;"><i class="bi bi-download me-2"></i>Export Items</a></li>
                            <li><a class="dropdown-item" href="#" onclick="importItems(); return false;"><i class="bi bi-upload me-2"></i>Import Items</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><h6 class="dropdown-header text-muted small">Tools</h6></li>
                            <li><a class="dropdown-item" href="#" onclick="bulkUpdatePrices(); return false;"><i class="bi bi-currency-dollar me-2"></i>Bulk Update Prices</a></li>
                            <li><a class="dropdown-item" href="#" onclick="bulkUpdateStock(); return false;"><i class="bi bi-boxes me-2"></i>Bulk Update Stock</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="bulkDeleteItems(); return false;"><i class="bi bi-trash me-2"></i>Bulk Delete</a></li>
                        </ul>
                    </div>
                    
                     <button class="btn btn-primary btn-sm px-3 shadow-sm fw-bold" onclick="showAddProductModal()">
                        <i class="bi bi-plus-lg me-1"></i> New Item
                    </button>
                </div>
            </div>

            <!-- Filters Row -->
            <div class="card border-0 shadow-sm rounded-3 mb-3 bg-light">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-auto">
                            <label class="form-label mb-0 small fw-bold text-muted">FILTERS:</label>
                        </div>
                        <div class="col-md-3">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                                <input type="text" id="filter-search" class="form-control" placeholder="Search items..." oninput="applyItemFilters()">
                            </div>
                        </div>
                        <div class="col-auto">
                            <select id="filter-sku" class="form-select form-select-sm" onchange="applyItemFilters()" style="min-width: 180px;">
                                <option value="">All Item Codes</option>
                                ${uniqueSkus
                                  .map(
                                    (sku) =>
                                      `<option value="${sku}">${sku}</option>`
                                  )
                                  .join("")}
                            </select>
                        </div>
                        <div class="col-auto">
                            <select id="filter-status" class="form-select form-select-sm" onchange="applyItemFilters()" style="min-width: 140px;">
                                <option value="">All Statuses</option>
                                ${uniqueStatuses
                                  .map(
                                    (status) =>
                                      `<option value="${status}">${status}</option>`
                                  )
                                  .join("")}
                            </select>
                        </div>
                        <div class="col-auto">
                            <button class="btn btn-sm btn-outline-secondary" onclick="clearItemFilters()">
                                <i class="bi bi-x-circle me-1"></i> Clear
                            </button>
                        </div>
                        <div class="col-auto ms-auto">
                            <span class="badge bg-primary" id="filtered-count">${
                              products.length
                            } items</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 items-table" style="font-size: 0.9rem; white-space: nowrap;">
                            <thead class="bg-light text-uppercase small text-muted">
                                <tr>
                                    <th style="width: 40px;" class="ps-4">
                                        <div class="form-check">
                                            <input type="checkbox" class="form-check-input">
                                        </div>
                                    </th>
                                    ${visibleCols
                                      .map(
                                        (key) => `
                                        <th class="${
                                          ITEM_COLUMNS_CONFIG[key]?.type ===
                                          "money"
                                            ? "text-end"
                                            : ""
                                        }">
                                            ${
                                              ITEM_COLUMNS_CONFIG[key]?.label ||
                                              key
                                            }
                                        </th>
                                    `
                                      )
                                      .join("")}
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                                  products.length > 0
                                    ? products
                                        .map(
                                          (p) => `
                                    <tr data-sku="${
                                      p.sku || ""
                                    }" data-status="${p.item_status || ""}">
                                        <td class="ps-4">
                                            <div class="form-check">
                                                <input type="checkbox" class="form-check-input">
                                            </div>
                                        </td>
                                        ${visibleCols
                                          .map(
                                            (key) => `
                                            <td class="${
                                              ITEM_COLUMNS_CONFIG[key]?.type ===
                                              "money"
                                                ? "text-end"
                                                : ""
                                            }">
                                                ${getFormattedValue(p, key)}
                                            </td>
                                        `
                                          )
                                          .join("")}
                                        <td class="text-end pe-4">
                                            <div class="d-flex gap-1 justify-content-end">
                                                <button class="btn btn-sm btn-icon text-muted hover-primary" onclick="editProduct(${p.id})" title="Edit">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-icon text-danger hover-danger" onclick="deleteProduct(${
                                                  p.id
                                                }, '${p.name?.replace(
                                            /'/g,
                                            "\\'"
                                          )}')" title="Delete">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `
                                        )
                                        .join("")
                                    : `
                                    <tr>
                                        <td colspan="${
                                          visibleCols.length + 2
                                        }" class="text-center py-5">
                                            <div class="text-muted d-flex flex-column align-items-center">
                                                <i class="bi bi-box-seam display-4 opacity-50 mb-2"></i>
                                                <p class="mb-0">No items found.</p>
                                                <small>Click "New Item" to get started.</small>
                                            </div>
                                        </td>
                                    </tr>
                                `
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                <!-- Pagination could go here -->
            </div>
        `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `
            <div class="alert alert-danger shadow-sm border-0 d-flex align-items-center gap-3">
                <i class="bi bi-exclamation-triangle-fill fs-4"></i>
                <div>
                    <h6 class="mb-0 fw-bold">Failed to load items</h6>
                    <small>${err.message}</small>
                </div>
            </div>
        `;
  }
}

// --- Advanced Item Master Creation View ---
function renderItemCreationForm(container) {
  if (!container) container = document.getElementById("inventory-content");

  container.innerHTML = `
        <div class="fade-in">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div class="d-flex align-items-center gap-3">
                    <button class="btn btn-light btn-icon rounded-circle shadow-sm" onclick="loadSection('inventory_items')" title="Close">
                        <i class="bi bi-arrow-left"></i>
                    </button>
                    <div>
                        <h4 class="fw-bold mb-0">Create New Item</h4>
                        <small class="text-muted">Advanced Item Master Configuration</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                     <button type="button" class="btn btn-outline-secondary px-4" onclick="loadSection('inventory_items')">Discard</button>
                     <button type="button" class="btn btn-primary px-4 fw-bold shadow-sm" onclick="submitNewItem()">
                        <i class="bi bi-check-lg me-2"></i> Save Item
                     </button>
                </div>
            </div>

            <div class="row g-4 justify-content-center">
                <div class="col-xl-11">
                    <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div class="card-header bg-white border-bottom p-0">
                             <ul class="nav nav-tabs nav-tabs-custom card-header-tabs m-0 px-4 pt-3" id="itemTabs" role="tablist">
                                <li class="nav-item">
                                    <button class="nav-link active fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-core">
                                        <i class="bi bi-info-circle me-2"></i>Core Info
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-hierarchy">
                                        <i class="bi bi-diagram-3 me-2"></i>Hierarchy
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-inventory">
                                        <i class="bi bi-box-seam me-2"></i>Inventory
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-financials">
                                        <i class="bi bi-currency-dollar me-2"></i>Financials
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-attributes">
                                        <i class="bi bi-sliders me-2"></i>Attributes
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link fw-bold py-3" data-bs-toggle="tab" data-bs-target="#tab-analytics">
                                        <i class="bi bi-graph-up me-2"></i>Analytics
                                    </button>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="card-body p-4 p-md-5 bg-light bg-opacity-10">
                            <form id="new-item-form" class="tab-content">
                                
                                <!-- 1. Core Info -->
                                <div class="tab-pane fade show active" id="tab-core">
                                    <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Basic Identification</h6>
                                    <div class="row g-4">
                                        <div class="col-md-8">
                                            <label class="form-label fw-bold">Item Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-lg" id="item-name" placeholder="e.g. Wireless Noise Cancelling Headphones" required>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Item Code / SKU <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-lg font-monospace" id="item-code" placeholder="Unique Code">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small text-muted">Short Name (Alias)</label>
                                            <input type="text" class="form-control" id="item-short-name">
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small text-muted">Status</label>
                                            <select class="form-select" id="item-status">
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Discontinued">Discontinued</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small text-muted">Item Type</label>
                                            <select class="form-select" id="item-type">
                                                <option value="Goods">Goods</option>
                                                <option value="Service">Service</option>
                                                <option value="Raw Material">Raw Material</option>
                                                <option value="WIP">WIP</option>
                                            </select>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold">Description</label>
                                            <textarea class="form-control" id="item-desc" rows="3"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <!-- 2. Hierarchy -->
                                <div class="tab-pane fade" id="tab-hierarchy">
                                    <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Categorization & Grouping</h6>
                                    <div class="row g-4">
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Product Group</label>
                                            <input type="text" class="form-control" id="item-group" list="group-list">
                                            <datalist id="group-list"><option value="Electronics"><option value="Apparel"><option value="Home"></datalist>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Brand</label>
                                            <input type="text" class="form-control" id="item-brand">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Model Number</label>
                                            <input type="text" class="form-control" id="item-model">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small text-muted">Category</label>
                                            <input type="text" class="form-control" id="item-category">
                                        </div>
                                        <div class="col-md-6">
                                             <label class="form-label small text-muted">Variant Group</label>
                                             <input type="text" class="form-control" id="item-variant-group" placeholder="e.g. iPhone 15 Series">
                                        </div>
                                    </div>
                                </div>

                                <!-- 3. Inventory & Units -->
                                <div class="tab-pane fade" id="tab-inventory">
                                    <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Units & Tracking</h6>
                                    <div class="row g-4">
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Base UOM <span class="text-danger">*</span></label>
                                            <select class="form-select" id="item-base-uom">
                                                <option value="pcs">Pieces (pcs)</option>
                                                <option value="kg">Kilogram (kg)</option>
                                                <option value="box">Box</option>
                                                <option value="mtr">Meter</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small text-muted">Alternate UOM</label>
                                            <input type="text" class="form-control" id="item-alt-uom">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small text-muted">Conversion Factor</label>
                                            <input type="number" class="form-control" id="item-conv-factor" value="1.0" step="0.0001">
                                            <small class="text-muted">1 Alt = X Base</small>
                                        </div>

                                        <div class="col-12 mt-4">
                                            <label class="form-label fw-bold mb-3">Tracking Controls</label>
                                            <div class="d-flex flex-wrap gap-4">
                                                <div class="form-check form-switch card p-3 border">
                                                    <input class="form-check-input" type="checkbox" id="track-inventory" checked>
                                                    <label class="form-check-label fw-bold ms-2" for="track-inventory">Track Inventory</label>
                                                </div>
                                                <div class="form-check form-switch card p-3 border">
                                                    <input class="form-check-input" type="checkbox" id="track-batch">
                                                    <label class="form-check-label fw-bold ms-2" for="track-batch">Batch / Lot Tracking</label>
                                                </div>
                                                <div class="form-check form-switch card p-3 border">
                                                    <input class="form-check-input" type="checkbox" id="track-serial">
                                                    <label class="form-check-label fw-bold ms-2" for="track-serial">Serial Number Tracking</label>
                                                </div>
                                                 <div class="form-check form-switch card p-3 border">
                                                    <input class="form-check-input" type="checkbox" id="track-expiry">
                                                    <label class="form-check-label fw-bold ms-2" for="track-expiry">Expiry Date Tracking</label>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6 mt-4">
                                             <label class="form-label fw-bold">Stock Levels</label>
                                             <div class="input-group mb-2">
                                                 <span class="input-group-text">Min Order Qty</span>
                                                 <input type="number" class="form-control" id="item-min-qty">
                                             </div>
                                              <div class="input-group mb-2">
                                                 <span class="input-group-text">Reorder Level</span>
                                                 <input type="number" class="form-control" id="item-reorder-level">
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 4. Financials (Pricing & Tax) -->
                                <div class="tab-pane fade" id="tab-financials">
                                    <div class="row g-4">
                                        <div class="col-md-6">
                                            <h6 class="fw-bold text-primary mb-3 text-uppercase small ls-1">Pricing & Costing</h6>
                                            <div class="card p-3 border shadow-sm">
                                                <div class="mb-3">
                                                    <label class="form-label fw-bold">Sales Rate (Selling Price)</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text">₹</span>
                                                        <input type="number" class="form-control fw-bold" id="item-sales-rate" step="0.01">
                                                    </div>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label fw-bold">Standard Cost (Buying Price)</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text">₹</span>
                                                        <input type="number" class="form-control" id="item-std-cost" step="0.01">
                                                    </div>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label small text-muted">Costing Method</label>
                                                    <select class="form-select text-muted" id="item-costing">
                                                        <option value="Weighted Average">Weighted Average</option>
                                                        <option value="FIFO">FIFO</option>
                                                        <option value="Standard">Standard Cost</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="col-md-6">
                                             <h6 class="fw-bold text-primary mb-3 text-uppercase small ls-1">Taxation</h6>
                                             <div class="card p-3 border shadow-sm">
                                                 <div class="mb-3">
                                                     <label class="form-label fw-bold">HSN / SAC Code</label>
                                                     <input type="text" class="form-control" id="item-hsn" placeholder="xxxxxx">
                                                 </div>
                                                 <div class="mb-3">
                                                    <label class="form-label small text-muted">GST Applicability</label>
                                                    <select class="form-select" id="item-gst-flag">
                                                        <option value="true">Taxable</option>
                                                        <option value="false">Exempt/Nil Rated</option>
                                                    </select>
                                                </div>
                                                <div class="row g-2">
                                                    <div class="col-6">
                                                        <label class="form-label small text-muted">Intra-State Rating</label>
                                                        <select class="form-select form-select-sm" id="item-intra-tax">
                                                            <option value="">Select...</option>
                                                            <option value="GST18">GST 18%</option>
                                                            <option value="GST12">GST 12%</option>
                                                            <option value="GST5">GST 5%</option>
                                                            <option value="GST28">GST 28%</option>
                                                             <option value="GST0">GST 0%</option>
                                                        </select>
                                                    </div>
                                                    <div class="col-6">
                                                         <label class="form-label small text-muted">Inter-State Rating</label>
                                                         <select class="form-select form-select-sm" id="item-inter-tax">
                                                            <option value="">Select...</option>
                                                            <option value="IGST18">IGST 18%</option>
                                                            <option value="IGST12">IGST 12%</option>
                                                            <option value="IGST5">IGST 5%</option>
                                                            <option value="IGST28">IGST 28%</option>
                                                            <option value="IGST0">IGST 0%</option>
                                                        </select>
                                                    </div>
                                                </div>
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 5. Attributes (Physical, Quality, Logistics) -->
                                <div class="tab-pane fade" id="tab-attributes">
                                    <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Physical & Logistics</h6>
                                    <div class="row g-4 mb-4">
                                        <div class="col-md-3">
                                            <label class="form-label small text-muted">Dimensions (L x W x H)</label>
                                            <div class="input-group input-group-sm">
                                                <input type="number" class="form-control" placeholder="L" id="item-len">
                                                <input type="number" class="form-control" placeholder="W" id="item-width">
                                                <input type="number" class="form-control" placeholder="H" id="item-height">
                                            </div>
                                        </div>
                                         <div class="col-md-2">
                                            <label class="form-label small text-muted">Dim Unit</label>
                                            <select class="form-select form-select-sm" id="item-dim-uom">
                                                <option value="cm">cm</option>
                                                <option value="in">inch</option>
                                                <option value="mm">mm</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small text-muted">Weight</label>
                                            <input type="number" class="form-control form-control-sm" id="item-weight" step="0.001">
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label small text-muted">Weight Unit</label>
                                             <select class="form-select form-select-sm" id="item-weight-uom">
                                                <option value="kg">kg</option>
                                                <option value="g">g</option>
                                                <option value="lb">lb</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                     <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Quality & Storage</h6>
                                     <div class="row g-4">
                                         <div class="col-md-4">
                                             <label class="form-label small text-muted">Shelf Life (Days)</label>
                                             <input type="number" class="form-control" id="item-shelf-life">
                                         </div>
                                         <div class="col-md-4">
                                             <label class="form-label small text-muted">Storage Type</label>
                                             <select class="form-select" id="item-storage">
                                                 <option value="Ambient">Ambient</option>
                                                 <option value="Cold Storage">Cold Storage</option>
                                                 <option value="Frozen">Frozen</option>
                                                 <option value="Hazardous">Hazardous</option>
                                             </select>
                                         </div>
                                         <div class="col-md-4">
                                              <label class="form-label small text-muted">Material / Composition</label>
                                              <input type="text" class="form-control" id="item-material">
                                         </div>
                                     </div>
                                </div>

                                <!-- 6. Analytics -->
                                <div class="tab-pane fade" id="tab-analytics">
                                     <h6 class="fw-bold text-primary mb-4 text-uppercase small ls-1">Classification & AI</h6>
                                     <div class="row g-4">
                                         <div class="col-md-4">
                                             <label class="form-label fw-bold">ABC Classification</label>
                                             <select class="form-select" id="item-abc">
                                                 <option value="">Auto-Calculate</option>
                                                 <option value="A">Class A (High Value)</option>
                                                 <option value="B">Class B (Medium)</option>
                                                 <option value="C">Class C (Low Value)</option>
                                             </select>
                                         </div>
                                         <div class="col-md-4">
                                             <label class="form-label fw-bold">Lifecycle Stage</label>
                                              <select class="form-select" id="item-lifecycle">
                                                 <option value="Introduction">Introduction</option>
                                                 <option value="Growth">Growth</option>
                                                 <option value="Maturity">Maturity</option>
                                                 <option value="Decline">Decline</option>
                                             </select>
                                         </div>
                                         <div class="col-12">
                                             <label class="form-label fw-bold">Search Keywords / Meta Tags</label>
                                             <textarea class="form-control" id="item-tags" rows="2" placeholder="Comma separated tags for search optimization"></textarea>
                                         </div>
                                     </div>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Initialize Boostrap Tabs if needed (Usually auto-works with data-bs-toggle)
}

function showAddProductModal() {
  renderItemCreationForm();
}

async function submitNewItem() {
  // 1. Gather Core Data
  const name = document.getElementById("item-name").value;
  const code = document.getElementById("item-code").value;

  if (!name || !code)
    return Swal.fire(
      "Missing Fields",
      "Item Name and Item Code/SKU are required.",
      "warning"
    );

  const payload = {
    // Core
    name: name,
    sku: code, // Backward compat
    item_code: code,
    item_short_name: document.getElementById("item-short-name").value,
    item_status: document.getElementById("item-status").value,
    item_type: document.getElementById("item-type").value,
    description: document.getElementById("item-desc").value,

    // Hierarchy
    product_group: document.getElementById("item-group").value,
    brand: document.getElementById("item-brand").value,
    model_no: document.getElementById("item-model").value,
    category: document.getElementById("item-category").value,
    variant_group: document.getElementById("item-variant-group").value,

    // Units
    base_uom: document.getElementById("item-base-uom").value,
    alternate_uom: document.getElementById("item-alt-uom").value,
    uom_conversion_factor: parseFloat(
      document.getElementById("item-conv-factor").value || 1
    ),
    inventory_tracking_flag: document.getElementById("track-inventory").checked,
    batch_tracking_flag: document.getElementById("track-batch").checked,
    serial_tracking_flag: document.getElementById("track-serial").checked,
    expiry_tracking_flag: document.getElementById("track-expiry").checked,
    min_order_qty: parseFloat(
      document.getElementById("item-min-qty").value || 0
    ),
    reorder_level: parseFloat(
      document.getElementById("item-reorder-level").value || 0
    ),

    // Financials
    sales_rate: parseFloat(
      document.getElementById("item-sales-rate").value || 0
    ),
    standard_cost: parseFloat(
      document.getElementById("item-std-cost").value || 0
    ),
    purchase_rate: parseFloat(
      document.getElementById("item-std-cost").value || 0
    ), // Mapping std cost to purchase rate for simplicity
    costing_method: document.getElementById("item-costing").value,
    hsn_sac: document.getElementById("item-hsn").value,
    hsn_code: document.getElementById("item-hsn").value, // Dup for new schema
    gst_applicable_flag:
      document.getElementById("item-gst-flag").value === "true",
    intra_state_tax_rate: document.getElementById("item-intra-tax").value,
    inter_state_tax_rate: document.getElementById("item-inter-tax").value,

    // Physical
    length_cm: parseFloat(document.getElementById("item-len").value || 0),
    width_cm: parseFloat(document.getElementById("item-width").value || 0),
    height_cm: parseFloat(document.getElementById("item-height").value || 0),
    dimension_uom: document.getElementById("item-dim-uom").value,
    weight_kg: parseFloat(document.getElementById("item-weight").value || 0),
    weight_uom: document.getElementById("item-weight-uom").value,

    // Quality
    shelf_life_days: parseInt(
      document.getElementById("item-shelf-life").value || 0
    ),
    storage_type: document.getElementById("item-storage").value,
    material: document.getElementById("item-material").value,

    // Analytics
    abc_classification: document.getElementById("item-abc").value,
    lifecycle_stage: document.getElementById("item-lifecycle").value,
    search_keywords: document.getElementById("item-tags").value,
  };

  try {
    await axios.post(`${API_BASE_URL}/mango/inventory/products`, payload);
    Swal.fire({
      icon: "success",
      title: "Success",
      text: "Item Master created successfully!",
      timer: 1500,
      showConfirmButton: false,
    });
    loadSection("inventory_items");
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Save Failed",
      err.response?.data?.detail || "Unknown error occurred",
      "error"
    );
  }
}

function renderFlowModule(container) {
  container.innerHTML = `
       <div class="text-center py-5 fade-in">
            <div class="icon-box mx-auto mb-4 bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                <i class="bi bi-kanban fs-1"></i>
            </div>
            <h3 class="fw-bold text-dark">Flow State Manager</h3>
            <p class="text-muted mb-4">Visual state machine is under development.</p>
        </div>
    `;
}

// ================= DESIGN MODULE =================
// State for custom dashboards and pages
let designState = {
  customPages: JSON.parse(localStorage.getItem('custom_dashboard_pages') || '[]'),
  currentEditingPage: null,
  availableWidgets: [
    { id: 'kpi_card', name: 'KPI Card', icon: 'bi-speedometer2', category: 'metrics' },
    { id: 'line_chart', name: 'Line Chart', icon: 'bi-graph-up', category: 'charts' },
    { id: 'bar_chart', name: 'Bar Chart', icon: 'bi-bar-chart', category: 'charts' },
    { id: 'pie_chart', name: 'Pie/Doughnut Chart', icon: 'bi-pie-chart', category: 'charts' },
    { id: 'area_chart', name: 'Area Chart', icon: 'bi-graph-up-arrow', category: 'charts' },
    { id: 'data_table', name: 'Data Table', icon: 'bi-table', category: 'data' },
    { id: 'recent_orders', name: 'Recent Orders', icon: 'bi-bag-check', category: 'data' },
    { id: 'top_products', name: 'Top Products', icon: 'bi-star', category: 'data' },
    { id: 'platform_breakdown', name: 'Platform Breakdown', icon: 'bi-diagram-3', category: 'analytics' },
    { id: 'trend_indicator', name: 'Trend Indicator', icon: 'bi-arrow-up-right', category: 'metrics' },
    { id: 'progress_gauge', name: 'Progress Gauge', icon: 'bi-speedometer', category: 'metrics' },
    { id: 'calendar_heatmap', name: 'Calendar Heatmap', icon: 'bi-calendar3', category: 'analytics' },
    { id: 'text_block', name: 'Text/Notes Block', icon: 'bi-card-text', category: 'content' },
    { id: 'image_block', name: 'Image/Logo Block', icon: 'bi-image', category: 'content' },
  ]
};

function renderDesignModule(container) {
  addDesignModuleStyles();
  
  container.innerHTML = `
    <div class="design-module fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1" style="font-family: 'Outfit', sans-serif;">
            <i class="bi bi-palette me-2 text-primary"></i>Design Studio
          </h2>
          <p class="text-muted mb-0">Create custom dashboards, reports, and document templates</p>
        </div>
      </div>

      <!-- Design Cards Grid -->
      <div class="row g-4">
        <!-- Dashboard Designer Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100" onclick="openDashboardDesigner()">
            <div class="design-card-icon dashboard">
              <i class="bi bi-grid-1x2"></i>
            </div>
            <h5 class="design-card-title">Dashboard Designer</h5>
            <p class="design-card-desc">Create custom dashboard pages with widgets, charts, and KPIs. Add them as sub-items under Overview menu.</p>
            <div class="design-card-stats">
              <span class="badge bg-primary bg-opacity-10 text-primary">${designState.customPages.length} pages created</span>
            </div>
            <div class="design-card-action">
              <span>Open Designer</span>
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>

        <!-- Quotations Template Designer Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100" onclick="openQuotationTemplateDesigner()">
            <div class="design-card-icon quotation" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <i class="bi bi-file-text"></i>
            </div>
            <h5 class="design-card-title">Quotations Template Designer</h5>
            <p class="design-card-desc">Customize quotation PDF templates with your branding, layout, colors, and fields. Edit HTML/CSS directly.</p>
            <div class="design-card-stats">
              <span class="badge bg-success bg-opacity-10 text-success">Active</span>
            </div>
            <div class="design-card-action">
              <span>Open Designer</span>
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>

        <!-- Invoice Template Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100 coming-soon">
            <div class="design-card-icon invoice">
              <i class="bi bi-receipt"></i>
            </div>
            <h5 class="design-card-title">Invoice Templates</h5>
            <p class="design-card-desc">Design professional invoice templates with your branding, custom fields, and layouts.</p>
            <div class="design-card-stats">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">Coming Soon</span>
            </div>
            <div class="design-card-action disabled">
              <span>Coming Soon</span>
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>

        <!-- Report Builder Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100 coming-soon">
            <div class="design-card-icon report">
              <i class="bi bi-file-earmark-bar-graph"></i>
            </div>
            <h5 class="design-card-title">Report Builder</h5>
            <p class="design-card-desc">Build scheduled reports with custom data queries, visualizations, and export options.</p>
            <div class="design-card-stats">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">Coming Soon</span>
            </div>
            <div class="design-card-action disabled">
              <span>Coming Soon</span>
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>

        <!-- Label Designer Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100 coming-soon">
            <div class="design-card-icon label">
              <i class="bi bi-upc-scan"></i>
            </div>
            <h5 class="design-card-title">Label Designer</h5>
            <p class="design-card-desc">Create shipping labels, product labels, and barcode templates for printing.</p>
            <div class="design-card-stats">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">Coming Soon</span>
            </div>
            <div class="design-card-action disabled">
              <span>Coming Soon</span>
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>

        <!-- Email Templates Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100 coming-soon">
            <div class="design-card-icon email">
              <i class="bi bi-envelope-paper"></i>
            </div>
            <h5 class="design-card-title">Email Templates</h5>
            <p class="design-card-desc">Design email templates for order confirmations, shipping updates, and notifications.</p>
            <div class="design-card-stats">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">Coming Soon</span>
            </div>
            <div class="design-card-action disabled">
              <span>Coming Soon</span>
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>

        <!-- Theme Customizer Card -->
        <div class="col-lg-4 col-md-6">
          <div class="design-card h-100 coming-soon">
            <div class="design-card-icon theme">
              <i class="bi bi-brush"></i>
            </div>
            <h5 class="design-card-title">Theme Customizer</h5>
            <p class="design-card-desc">Customize the look and feel of your dashboard with colors, fonts, and branding.</p>
            <div class="design-card-stats">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">Coming Soon</span>
            </div>
            <div class="design-card-action disabled">
              <span>Coming Soon</span>
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Pages Section -->
      ${designState.customPages.length > 0 ? `
        <div class="mt-5">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">Your Custom Pages</h5>
            <button class="btn btn-outline-primary btn-sm" onclick="openDashboardDesigner()">
              <i class="bi bi-plus-lg me-1"></i> Create New
            </button>
          </div>
          <div class="row g-3">
            ${designState.customPages.map(page => `
              <div class="col-md-4">
                <div class="card border-0 shadow-sm">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 class="mb-1">${page.name}</h6>
                        <small class="text-muted">${page.description || 'No description'}</small>
                      </div>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="openDashboardDesigner('${page.id}')" title="Edit">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteCustomPage('${page.id}')" title="Delete">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div class="small text-muted">
                      <i class="bi bi-grid-1x2 me-1"></i> ${page.widgets.length} widgets
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Open Quotation Template Designer
function openQuotationTemplateDesigner() {
  const container = document.getElementById('dynamic-content');
  
  // Load saved template or use default
  const savedTemplate = localStorage.getItem('quotation_template_html') || '';
  const defaultTemplate = getDefaultQuotationTemplate();
  const templateHtml = savedTemplate || defaultTemplate;
  
  container.innerHTML = `
    <div class="quotation-template-designer fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light btn-icon rounded-circle shadow-sm" onclick="loadSection('design')" title="Back">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 class="fw-bold mb-0">
              <i class="bi bi-file-text me-2 text-success"></i>Quotation Template Designer
            </h4>
            <small class="text-muted">Customize your quotation PDF template HTML and CSS</small>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" onclick="previewQuotationTemplate()">
            <i class="bi bi-eye me-1"></i> Preview
          </button>
          <button class="btn btn-outline-primary" onclick="resetQuotationTemplate()">
            <i class="bi bi-arrow-counterclockwise me-1"></i> Reset to Default
          </button>
          <button class="btn btn-success" onclick="saveQuotationTemplate()">
            <i class="bi bi-check-lg me-1"></i> Save Template
          </button>
        </div>
      </div>

      <div class="row g-4">
        <!-- Template Editor (Left) -->
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-light">
              <h6 class="mb-0">
                <i class="bi bi-code-square me-2"></i>Template HTML/CSS Editor
              </h6>
            </div>
            <div class="card-body p-0">
              <div class="editor-toolbar bg-light border-bottom p-2 d-flex justify-content-between align-items-center">
                <div>
                  <small class="text-muted">Edit the HTML template. Use placeholders like {quotation_number}, {customer_name}, etc.</small>
                </div>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary" onclick="insertTemplatePlaceholder('quotation_number')" title="Insert Placeholder">
                    <i class="bi bi-code"></i> Insert Placeholder
                  </button>
                </div>
              </div>
              <textarea 
                id="quotation-template-editor" 
                class="form-control font-monospace" 
                style="min-height: 600px; font-size: 13px; border: none; resize: vertical;"
                spellcheck="false"
              >${escapeHtml(templateHtml)}</textarea>
            </div>
          </div>
        </div>

        <!-- Preview & Placeholders (Right) -->
        <div class="col-lg-5">
          <!-- Available Placeholders -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-primary text-white">
              <h6 class="mb-0">
                <i class="bi bi-list-ul me-2"></i>Available Placeholders
              </h6>
            </div>
            <div class="card-body">
              <div class="small">
                <div class="mb-2">
                  <strong>Quotation Info:</strong>
                  <div class="mt-1">
                    <code class="d-block mb-1">{quotation_number}</code>
                    <code class="d-block mb-1">{quotation_date}</code>
                    <code class="d-block mb-1">{valid_until}</code>
                    <code class="d-block mb-1">{status}</code>
                    <code class="d-block mb-1">{subtotal}</code>
                    <code class="d-block mb-1">{discount_amount}</code>
                    <code class="d-block mb-1">{tax_amount}</code>
                    <code class="d-block mb-1">{total_amount}</code>
                    <code class="d-block mb-1">{currency}</code>
                  </div>
                </div>
                <div class="mb-2">
                  <strong>Customer Info:</strong>
                  <div class="mt-1">
                    <code class="d-block mb-1">{customer_name}</code>
                    <code class="d-block mb-1">{customer_email}</code>
                    <code class="d-block mb-1">{customer_code}</code>
                  </div>
                </div>
                <div class="mb-2">
                  <strong>Company Info:</strong>
                  <div class="mt-1">
                    <code class="d-block mb-1">{company_name}</code>
                    <code class="d-block mb-1">{company_address}</code>
                    <code class="d-block mb-1">{company_phone}</code>
                    <code class="d-block mb-1">{company_email}</code>
                  </div>
                </div>
                <div class="mb-2">
                  <strong>Items Loop:</strong>
                  <div class="mt-1">
                    <code class="d-block mb-1">{items_loop_start}</code>
                    <code class="d-block mb-1">{item_description}</code>
                    <code class="d-block mb-1">{item_quantity}</code>
                    <code class="d-block mb-1">{item_unit_price}</code>
                    <code class="d-block mb-1">{item_line_total}</code>
                    <code class="d-block mb-1">{items_loop_end}</code>
                  </div>
                </div>
                <div class="mb-2">
                  <strong>Terms & Notes:</strong>
                  <div class="mt-1">
                    <code class="d-block mb-1">{payment_terms}</code>
                    <code class="d-block mb-1">{delivery_terms}</code>
                    <code class="d-block mb-1">{notes}</code>
                    <code class="d-block mb-1">{terms_conditions}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Live Preview -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
              <h6 class="mb-0">
                <i class="bi bi-eye me-2"></i>Live Preview
              </h6>
            </div>
            <div class="card-body p-0">
              <iframe 
                id="quotation-template-preview" 
                style="width: 100%; height: 500px; border: none;"
                srcdoc=""
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize editor with change listener for live preview
  const editor = document.getElementById('quotation-template-editor');
  if (editor) {
    editor.addEventListener('input', debounce(updateQuotationTemplatePreview, 500));
    updateQuotationTemplatePreview();
  }
}

// Get default quotation template
function getDefaultQuotationTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quotation {quotation_number}</title>
    <style>
        @media print {
            @page {
                margin: 1.5cm;
                size: A4;
            }
            .no-print { display: none; }
        }
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header h2 {
            color: #64748b;
            margin: 5px 0;
            font-size: 18px;
            font-weight: normal;
        }
        .company-info {
            float: right;
            text-align: right;
            font-size: 12px;
            color: #64748b;
        }
        .quotation-info {
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
        }
        .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #1e293b;
            font-size: 14px;
            text-transform: uppercase;
        }
        .info-box p {
            margin: 5px 0;
            font-size: 13px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 12px;
        }
        th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .totals {
            margin-top: 20px;
            float: right;
            width: 300px;
        }
        .totals table {
            margin: 0;
        }
        .totals td {
            padding: 8px 12px;
            border: none;
        }
        .totals .label {
            text-align: right;
            font-weight: 600;
        }
        .totals .amount {
            text-align: right;
            font-size: 14px;
        }
        .total-row {
            background: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }
        .total-row td {
            padding: 15px 12px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
        }
        .terms {
            margin-top: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .terms h4 {
            margin: 0 0 10px 0;
            color: #1e293b;
        }
        .terms p {
            margin: 5px 0;
            font-size: 12px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <strong>{company_name}</strong><br>
            {company_address}<br>
            {company_phone}<br>
            {company_email}
        </div>
        <h1>QUOTATION</h1>
        <h2>{quotation_number}</h2>
    </div>
    
    <div class="quotation-info">
        <div class="info-box">
            <h3>Quotation Details</h3>
            <p><strong>Date:</strong> {quotation_date}</p>
            <p><strong>Valid Until:</strong> {valid_until}</p>
            <p><strong>Status:</strong> {status}</p>
        </div>
        
        <div class="info-box">
            <h3>Bill To</h3>
            <p><strong>{customer_name}</strong></p>
            <p>{customer_email}</p>
            <p>Code: {customer_code}</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Description</th>
                <th style="width: 10%;" class="text-center">Qty</th>
                <th style="width: 15%;" class="text-right">Unit Price</th>
                <th style="width: 10%;" class="text-right">Discount %</th>
                <th style="width: 10%;" class="text-right">Tax %</th>
                <th style="width: 15%;" class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            {items_loop_start}
            <tr>
                <td>1</td>
                <td>
                    <strong>{item_description}</strong>
                    <br><small style="color: #64748b;">SKU: {item_sku}</small>
                </td>
                <td class="text-center">{item_quantity} {item_unit_of_measure}</td>
                <td class="text-right">{item_unit_price}</td>
                <td class="text-right">{item_discount_percent}%</td>
                <td class="text-right">{item_tax_rate}%</td>
                <td class="text-right"><strong>{item_line_total}</strong></td>
            </tr>
            {items_loop_end}
        </tbody>
    </table>
    
    <div class="totals">
        <table>
            <tr>
                <td class="label">Subtotal:</td>
                <td class="amount">{subtotal}</td>
            </tr>
            <tr>
                <td class="label">Discount:</td>
                <td class="amount">{discount_amount}</td>
            </tr>
            <tr>
                <td class="label">Tax:</td>
                <td class="amount">{tax_amount}</td>
            </tr>
            <tr class="total-row">
                <td class="label">Total:</td>
                <td class="amount">{total_amount}</td>
            </tr>
        </table>
    </div>
    
    {payment_terms}
    {delivery_terms}
    {terms_conditions}
    {notes}
    
    <div class="footer">
        <p style="text-align: center;">
            <strong>Thank you for your business!</strong><br>
            This quotation is valid until {valid_until}.<br>
            Generated on {generated_date}
        </p>
    </div>
</body>
</html>`;
}

// Save quotation template
function saveQuotationTemplate() {
  const editor = document.getElementById('quotation-template-editor');
  if (!editor) return;
  
  const template = editor.value;
  localStorage.setItem('quotation_template_html', template);
  
  Swal.fire({
    title: "Success!",
    text: "Quotation template saved successfully. It will be used for all future PDF generations.",
    icon: "success",
    timer: 2000,
    showConfirmButton: false
  });
}

// Reset to default template
function resetQuotationTemplate() {
  Swal.fire({
    title: "Reset Template?",
    text: "This will restore the default template. Your current changes will be lost.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Reset",
    cancelButtonText: "Cancel"
  }).then((result) => {
    if (result.isConfirmed) {
      const editor = document.getElementById('quotation-template-editor');
      if (editor) {
        editor.value = getDefaultQuotationTemplate();
        localStorage.removeItem('quotation_template_html');
        updateQuotationTemplatePreview();
        Swal.fire("Success", "Template reset to default", "success");
      }
    }
  });
}

// Preview quotation template
function previewQuotationTemplate() {
  const editor = document.getElementById('quotation-template-editor');
  if (!editor) return;
  
  const template = editor.value;
  const previewHtml = template
    .replace(/{quotation_number}/g, 'QTN-0001')
    .replace(/{quotation_date}/g, new Date().toLocaleDateString())
    .replace(/{valid_until}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
    .replace(/{status}/g, 'DRAFT')
    .replace(/{customer_name}/g, 'Sample Customer')
    .replace(/{customer_email}/g, 'customer@example.com')
    .replace(/{customer_code}/g, 'CUST001')
    .replace(/{company_name}/g, 'Your Company Name')
    .replace(/{company_address}/g, '123 Business St, City, State 12345')
    .replace(/{company_phone}/g, '+1 (555) 123-4567')
    .replace(/{company_email}/g, 'info@company.com')
    .replace(/{subtotal}/g, '₹10,000.00')
    .replace(/{discount_amount}/g, '₹500.00')
    .replace(/{tax_amount}/g, '₹1,800.00')
    .replace(/{total_amount}/g, '₹11,300.00')
    .replace(/{currency}/g, 'INR')
    .replace(/{payment_terms}/g, '<div class="terms"><h4>Payment Terms</h4><p>NET 30</p></div>')
    .replace(/{delivery_terms}/g, '<div class="terms"><h4>Delivery Terms</h4><p>FOB</p></div>')
    .replace(/{terms_conditions}/g, '<div class="terms"><h4>Terms & Conditions</h4><p>Standard terms apply.</p></div>')
    .replace(/{notes}/g, '<div class="terms"><h4>Notes</h4><p>Thank you for your business!</p></div>')
    .replace(/{generated_date}/g, new Date().toLocaleString())
    .replace(/{items_loop_start}/g, '')
    .replace(/{items_loop_end}/g, '')
    .replace(/{item_description}/g, 'Sample Product')
    .replace(/{item_sku}/g, 'SKU-001')
    .replace(/{item_quantity}/g, '10')
    .replace(/{item_unit_of_measure}/g, 'PCS')
    .replace(/{item_unit_price}/g, '₹1,000.00')
    .replace(/{item_discount_percent}/g, '5')
    .replace(/{item_tax_rate}/g, '18')
    .replace(/{item_line_total}/g, '₹11,300.00');
  
  const previewWindow = window.open('', '_blank', 'width=1200,height=800');
  if (previewWindow) {
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
  }
}

// Update live preview
function updateQuotationTemplatePreview() {
  const editor = document.getElementById('quotation-template-editor');
  const preview = document.getElementById('quotation-template-preview');
  if (!editor || !preview) return;
  
  const template = editor.value;
  const previewHtml = template
    .replace(/{quotation_number}/g, 'QTN-0001')
    .replace(/{quotation_date}/g, new Date().toLocaleDateString())
    .replace(/{valid_until}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
    .replace(/{status}/g, 'DRAFT')
    .replace(/{customer_name}/g, 'Sample Customer')
    .replace(/{customer_email}/g, 'customer@example.com')
    .replace(/{customer_code}/g, 'CUST001')
    .replace(/{company_name}/g, 'Your Company Name')
    .replace(/{company_address}/g, '123 Business St, City, State 12345')
    .replace(/{company_phone}/g, '+1 (555) 123-4567')
    .replace(/{company_email}/g, 'info@company.com')
    .replace(/{subtotal}/g, '₹10,000.00')
    .replace(/{discount_amount}/g, '₹500.00')
    .replace(/{tax_amount}/g, '₹1,800.00')
    .replace(/{total_amount}/g, '₹11,300.00')
    .replace(/{currency}/g, 'INR')
    .replace(/{payment_terms}/g, '<div class="terms"><h4>Payment Terms</h4><p>NET 30</p></div>')
    .replace(/{delivery_terms}/g, '<div class="terms"><h4>Delivery Terms</h4><p>FOB</p></div>')
    .replace(/{terms_conditions}/g, '<div class="terms"><h4>Terms & Conditions</h4><p>Standard terms apply.</p></div>')
    .replace(/{notes}/g, '<div class="terms"><h4>Notes</h4><p>Thank you for your business!</p></div>')
    .replace(/{generated_date}/g, new Date().toLocaleString())
    .replace(/{items_loop_start}/g, '')
    .replace(/{items_loop_end}/g, '')
    .replace(/{item_description}/g, 'Sample Product')
    .replace(/{item_sku}/g, 'SKU-001')
    .replace(/{item_quantity}/g, '10')
    .replace(/{item_unit_of_measure}/g, 'PCS')
    .replace(/{item_unit_price}/g, '₹1,000.00')
    .replace(/{item_discount_percent}/g, '5')
    .replace(/{item_tax_rate}/g, '18')
    .replace(/{item_line_total}/g, '₹11,300.00');
  
  preview.srcdoc = previewHtml;
}

// Insert template placeholder
function insertTemplatePlaceholder(placeholder) {
  const editor = document.getElementById('quotation-template-editor');
  if (!editor) return;
  
  const cursorPos = editor.selectionStart;
  const textBefore = editor.value.substring(0, cursorPos);
  const textAfter = editor.value.substring(cursorPos);
  
  editor.value = textBefore + '{' + placeholder + '}' + textAfter;
  editor.focus();
  editor.setSelectionRange(cursorPos + placeholder.length + 2, cursorPos + placeholder.length + 2);
  updateQuotationTemplatePreview();
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Escape HTML helper
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ================= END QUOTATION TEMPLATE DESIGNER =================

function addDesignModuleStyles() {
  if (document.getElementById('design-module-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'design-module-styles';
  styles.textContent = `
    /* Design Cards */
    .design-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    .design-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.1);
    }
    
    .design-card.coming-soon {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .design-card.coming-soon:hover {
      transform: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    
    .design-card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 16px;
    }
    
    .design-card-icon.dashboard { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; }
    .design-card-icon.invoice { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
    .design-card-icon.report { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; }
    .design-card-icon.label { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
    .design-card-icon.email { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; }
    .design-card-icon.theme { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; }
    
    .design-card-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .design-card-desc {
      color: #64748b;
      font-size: 14px;
      flex-grow: 1;
      margin-bottom: 16px;
    }
    
    .design-card-stats {
      margin-bottom: 16px;
    }
    
    .design-card-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      color: #3b82f6;
      font-weight: 600;
      font-size: 14px;
    }
    
    .design-card-action.disabled {
      color: #94a3b8;
    }
    
    /* Custom Page Cards */
    .custom-page-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
    }
    
    .custom-page-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 15px rgba(59,130,246,0.1);
    }
    
    .custom-page-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    
    .custom-page-info {
      flex-grow: 1;
    }
    
    .custom-page-actions {
      display: flex;
      gap: 4px;
    }
    
    .custom-page-actions .btn-icon {
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      transition: all 0.2s;
    }
    
    .custom-page-actions .btn-icon:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    
    .custom-page-actions .btn-icon.text-danger:hover {
      background: #fee2e2;
      color: #dc2626;
    }
    
    /* Dashboard Designer */
    .dashboard-designer {
      min-height: calc(100vh - 200px);
    }
    
    .widget-palette {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      position: sticky;
      top: 20px;
    }
    
    .widget-category {
      margin-bottom: 16px;
    }
    
    .widget-category-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .widget-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 6px;
      cursor: grab;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    
    .widget-item:hover {
      background: #f1f5f9;
      border-color: #3b82f6;
    }
    
    .widget-item:active {
      cursor: grabbing;
    }
    
    .widget-item-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    
    .widget-item-name {
      font-size: 13px;
      font-weight: 500;
      color: #334155;
    }
    
    /* Canvas Area */
    .design-canvas {
      background: #f8fafc;
      border: 2px dashed #e2e8f0;
      border-radius: 12px;
      min-height: 500px;
      padding: 20px;
      transition: all 0.3s;
    }
    
    .design-canvas.drag-over {
      border-color: #3b82f6;
      background: rgba(59,130,246,0.05);
    }
    
    .design-canvas.empty {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .canvas-placeholder {
      text-align: center;
      color: #94a3b8;
    }
    
    .canvas-placeholder i {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    /* Placed Widgets */
    .placed-widget {
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
      position: relative;
      transition: all 0.2s;
    }
    
    .placed-widget:hover {
      border-color: #3b82f6;
    }
    
    .placed-widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .placed-widget-title {
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .placed-widget-actions {
      display: flex;
      gap: 4px;
    }
    
    .widget-preview {
      min-height: 100px;
      background: #f8fafc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
    }
    
    /* Page Settings Panel */
    .page-settings-panel {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
  `;
  document.head.appendChild(styles);
}

// Open Dashboard Designer
function openDashboardDesigner(pageId = null) {
  const container = document.getElementById('dynamic-content');
  designState.currentEditingPage = pageId ? designState.customPages.find(p => p.id === pageId) : null;
  
  const page = designState.currentEditingPage || {
    id: 'page_' + Date.now(),
    name: '',
    icon: 'bi-bar-chart-line',
    description: '',
    showInMenu: true,
    widgets: []
  };
  
  container.innerHTML = `
    <div class="dashboard-designer fade-in">
      <!-- Designer Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light btn-icon rounded-circle shadow-sm" onclick="loadSection('design')" title="Back">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 class="fw-bold mb-0">${pageId ? 'Edit Dashboard Page' : 'Create Dashboard Page'}</h4>
            <small class="text-muted">Design your custom report page</small>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" onclick="previewDashboardPage()">
            <i class="bi bi-eye me-1"></i> Preview
          </button>
          <button class="btn btn-primary" onclick="saveDashboardPage()">
            <i class="bi bi-check-lg me-1"></i> Save Page
          </button>
        </div>
      </div>

      <div class="row g-4">
        <!-- Widget Palette (Left) -->
        <div class="col-lg-3">
          <div class="widget-palette">
            <h6 class="fw-bold mb-3">Widgets</h6>
            <p class="text-muted small mb-3">Drag widgets to the canvas</p>
            
            <!-- Metrics Widgets -->
            <div class="widget-category">
              <div class="widget-category-title">Metrics</div>
              ${designState.availableWidgets.filter(w => w.category === 'metrics').map(w => `
                <div class="widget-item" draggable="true" data-widget-id="${w.id}" ondragstart="handleWidgetDragStart(event, '${w.id}')">
                  <div class="widget-item-icon"><i class="bi ${w.icon}"></i></div>
                  <span class="widget-item-name">${w.name}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Charts Widgets -->
            <div class="widget-category">
              <div class="widget-category-title">Charts</div>
              ${designState.availableWidgets.filter(w => w.category === 'charts').map(w => `
                <div class="widget-item" draggable="true" data-widget-id="${w.id}" ondragstart="handleWidgetDragStart(event, '${w.id}')">
                  <div class="widget-item-icon"><i class="bi ${w.icon}"></i></div>
                  <span class="widget-item-name">${w.name}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Data Widgets -->
            <div class="widget-category">
              <div class="widget-category-title">Data</div>
              ${designState.availableWidgets.filter(w => w.category === 'data').map(w => `
                <div class="widget-item" draggable="true" data-widget-id="${w.id}" ondragstart="handleWidgetDragStart(event, '${w.id}')">
                  <div class="widget-item-icon"><i class="bi ${w.icon}"></i></div>
                  <span class="widget-item-name">${w.name}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Analytics Widgets -->
            <div class="widget-category">
              <div class="widget-category-title">Analytics</div>
              ${designState.availableWidgets.filter(w => w.category === 'analytics').map(w => `
                <div class="widget-item" draggable="true" data-widget-id="${w.id}" ondragstart="handleWidgetDragStart(event, '${w.id}')">
                  <div class="widget-item-icon"><i class="bi ${w.icon}"></i></div>
                  <span class="widget-item-name">${w.name}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Content Widgets -->
            <div class="widget-category">
              <div class="widget-category-title">Content</div>
              ${designState.availableWidgets.filter(w => w.category === 'content').map(w => `
                <div class="widget-item" draggable="true" data-widget-id="${w.id}" ondragstart="handleWidgetDragStart(event, '${w.id}')">
                  <div class="widget-item-icon"><i class="bi ${w.icon}"></i></div>
                  <span class="widget-item-name">${w.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Design Canvas (Center) -->
        <div class="col-lg-6">
          <div class="design-canvas ${page.widgets.length === 0 ? 'empty' : ''}" 
               id="design-canvas"
               ondrop="handleWidgetDrop(event)" 
               ondragover="handleDragOver(event)"
               ondragleave="handleDragLeave(event)">
            ${page.widgets.length === 0 ? `
              <div class="canvas-placeholder">
                <i class="bi bi-plus-square-dotted"></i>
                <h5>Drag widgets here</h5>
                <p class="small">Drop widgets from the left panel to build your dashboard</p>
              </div>
            ` : ''}
            <div id="placed-widgets">
              ${page.widgets.map((w, idx) => renderPlacedWidget(w, idx)).join('')}
            </div>
          </div>
        </div>

        <!-- Page Settings (Right) -->
        <div class="col-lg-3">
          <div class="page-settings-panel">
            <h6 class="fw-bold mb-3">Page Settings</h6>
            
            <div class="mb-3">
              <label class="form-label small text-muted">Page Name *</label>
              <input type="text" class="form-control" id="page-name" value="${page.name}" placeholder="e.g., Sales Overview">
            </div>
            
            <div class="mb-3">
              <label class="form-label small text-muted">Description</label>
              <textarea class="form-control" id="page-description" rows="2" placeholder="Brief description...">${page.description}</textarea>
            </div>
            
            <div class="mb-3">
              <label class="form-label small text-muted">Icon</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi ${page.icon}" id="selected-icon-preview"></i></span>
                <select class="form-select" id="page-icon" onchange="updateIconPreview(this.value)">
                  <option value="bi-bar-chart-line" ${page.icon === 'bi-bar-chart-line' ? 'selected' : ''}>Bar Chart</option>
                  <option value="bi-graph-up" ${page.icon === 'bi-graph-up' ? 'selected' : ''}>Graph Up</option>
                  <option value="bi-pie-chart" ${page.icon === 'bi-pie-chart' ? 'selected' : ''}>Pie Chart</option>
                  <option value="bi-speedometer2" ${page.icon === 'bi-speedometer2' ? 'selected' : ''}>Dashboard</option>
                  <option value="bi-currency-rupee" ${page.icon === 'bi-currency-rupee' ? 'selected' : ''}>Revenue</option>
                  <option value="bi-bag-check" ${page.icon === 'bi-bag-check' ? 'selected' : ''}>Orders</option>
                  <option value="bi-boxes" ${page.icon === 'bi-boxes' ? 'selected' : ''}>Inventory</option>
                  <option value="bi-people" ${page.icon === 'bi-people' ? 'selected' : ''}>Customers</option>
                  <option value="bi-truck" ${page.icon === 'bi-truck' ? 'selected' : ''}>Shipping</option>
                  <option value="bi-calendar3" ${page.icon === 'bi-calendar3' ? 'selected' : ''}>Calendar</option>
                  <option value="bi-file-earmark-text" ${page.icon === 'bi-file-earmark-text' ? 'selected' : ''}>Report</option>
                  <option value="bi-lightning" ${page.icon === 'bi-lightning' ? 'selected' : ''}>Performance</option>
                </select>
              </div>
            </div>
            
            <div class="mb-4">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="show-in-menu" ${page.showInMenu ? 'checked' : ''}>
                <label class="form-check-label small" for="show-in-menu">
                  Show in Overview submenu
                </label>
              </div>
              <small class="text-muted d-block mt-1">Page will appear under Overview in navigation</small>
            </div>
            
            <hr>
            
            <h6 class="fw-bold mb-3">Quick Add</h6>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-primary btn-sm" onclick="addQuickWidget('kpi_card')">
                <i class="bi bi-speedometer2 me-2"></i>Add KPI Card
              </button>
              <button class="btn btn-outline-primary btn-sm" onclick="addQuickWidget('line_chart')">
                <i class="bi bi-graph-up me-2"></i>Add Chart
              </button>
              <button class="btn btn-outline-primary btn-sm" onclick="addQuickWidget('data_table')">
                <i class="bi bi-table me-2"></i>Add Table
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Store page ID for saving
  window.currentDesigningPageId = page.id;
  window.currentPageWidgets = [...page.widgets];
}

function renderPlacedWidget(widget, index) {
  const widgetDef = designState.availableWidgets.find(w => w.id === widget.type) || { name: 'Widget', icon: 'bi-square' };
  
  return `
    <div class="placed-widget" data-widget-index="${index}">
      <div class="placed-widget-header">
        <div class="placed-widget-title">
          <i class="bi ${widgetDef.icon} text-primary"></i>
          <span>${widget.title || widgetDef.name}</span>
        </div>
        <div class="placed-widget-actions">
          <button class="btn btn-sm btn-icon" onclick="configureWidget(${index})" title="Configure">
            <i class="bi bi-gear"></i>
          </button>
          <button class="btn btn-sm btn-icon text-danger" onclick="removeWidget(${index})" title="Remove">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="widget-preview">
        ${getWidgetPreview(widget.type)}
      </div>
    </div>
  `;
}

function getWidgetPreview(type) {
  const previews = {
    'kpi_card': '<div class="text-center"><div class="fw-bold fs-4 text-primary">₹0</div><small class="text-muted">KPI Value</small></div>',
    'line_chart': '<i class="bi bi-graph-up fs-1 text-primary opacity-50"></i>',
    'bar_chart': '<i class="bi bi-bar-chart fs-1 text-primary opacity-50"></i>',
    'pie_chart': '<i class="bi bi-pie-chart fs-1 text-primary opacity-50"></i>',
    'area_chart': '<i class="bi bi-graph-up-arrow fs-1 text-primary opacity-50"></i>',
    'data_table': '<i class="bi bi-table fs-1 text-primary opacity-50"></i>',
    'recent_orders': '<i class="bi bi-bag-check fs-1 text-success opacity-50"></i>',
    'top_products': '<i class="bi bi-star fs-1 text-warning opacity-50"></i>',
    'platform_breakdown': '<i class="bi bi-diagram-3 fs-1 text-info opacity-50"></i>',
    'trend_indicator': '<i class="bi bi-arrow-up-right fs-1 text-success opacity-50"></i>',
    'progress_gauge': '<i class="bi bi-speedometer fs-1 text-primary opacity-50"></i>',
    'calendar_heatmap': '<i class="bi bi-calendar3 fs-1 text-primary opacity-50"></i>',
    'text_block': '<i class="bi bi-card-text fs-1 text-secondary opacity-50"></i>',
    'image_block': '<i class="bi bi-image fs-1 text-secondary opacity-50"></i>',
  };
  return previews[type] || '<i class="bi bi-square fs-1 opacity-50"></i>';
}

// Drag and Drop Handlers
function handleWidgetDragStart(event, widgetId) {
  event.dataTransfer.setData('widgetId', widgetId);
  event.dataTransfer.effectAllowed = 'copy';
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  document.getElementById('design-canvas').classList.add('drag-over');
}

function handleDragLeave(event) {
  document.getElementById('design-canvas').classList.remove('drag-over');
}

function handleWidgetDrop(event) {
  event.preventDefault();
  document.getElementById('design-canvas').classList.remove('drag-over');
  
  const widgetId = event.dataTransfer.getData('widgetId');
  if (!widgetId) return;
  
  addWidgetToCanvas(widgetId);
}

function addWidgetToCanvas(widgetId) {
  const widgetDef = designState.availableWidgets.find(w => w.id === widgetId);
  if (!widgetDef) return;
  
  const newWidget = {
    id: 'widget_' + Date.now(),
    type: widgetId,
    title: widgetDef.name,
    config: {}
  };
  
  window.currentPageWidgets = window.currentPageWidgets || [];
  window.currentPageWidgets.push(newWidget);
  
  // Update canvas
  const canvas = document.getElementById('design-canvas');
  canvas.classList.remove('empty');
  
  const placeholder = canvas.querySelector('.canvas-placeholder');
  if (placeholder) placeholder.remove();
  
  const placedWidgets = document.getElementById('placed-widgets');
  placedWidgets.innerHTML = window.currentPageWidgets.map((w, idx) => renderPlacedWidget(w, idx)).join('');
}

function addQuickWidget(type) {
  addWidgetToCanvas(type);
}

function removeWidget(index) {
  window.currentPageWidgets.splice(index, 1);
  const placedWidgets = document.getElementById('placed-widgets');
  placedWidgets.innerHTML = window.currentPageWidgets.map((w, idx) => renderPlacedWidget(w, idx)).join('');
  
  if (window.currentPageWidgets.length === 0) {
    const canvas = document.getElementById('design-canvas');
    canvas.classList.add('empty');
    canvas.innerHTML = `
      <div class="canvas-placeholder">
        <i class="bi bi-plus-square-dotted"></i>
        <h5>Drag widgets here</h5>
        <p class="small">Drop widgets from the left panel to build your dashboard</p>
      </div>
      <div id="placed-widgets"></div>
    `;
  }
}

function configureWidget(index) {
  const widget = window.currentPageWidgets[index];
  const widgetDef = designState.availableWidgets.find(w => w.id === widget.type);
  
  Swal.fire({
    title: 'Configure Widget',
    html: `
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label small">Widget Title</label>
          <input type="text" class="form-control" id="widget-title" value="${widget.title || widgetDef.name}">
        </div>
        <div class="mb-3">
          <label class="form-label small">Data Source</label>
          <select class="form-select" id="widget-source">
            <option value="orders">Orders Data</option>
            <option value="inventory">Inventory Data</option>
            <option value="revenue">Revenue Data</option>
            <option value="customers">Customer Data</option>
            <option value="platforms">Platform Analytics</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label small">Width</label>
          <select class="form-select" id="widget-width">
            <option value="full">Full Width</option>
            <option value="half">Half Width</option>
            <option value="third">One Third</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Apply',
    preConfirm: () => {
      return {
        title: document.getElementById('widget-title').value,
        source: document.getElementById('widget-source').value,
        width: document.getElementById('widget-width').value
      };
    }
  }).then(result => {
    if (result.isConfirmed) {
      window.currentPageWidgets[index].title = result.value.title;
      window.currentPageWidgets[index].config = {
        source: result.value.source,
        width: result.value.width
      };
      
      const placedWidgets = document.getElementById('placed-widgets');
      placedWidgets.innerHTML = window.currentPageWidgets.map((w, idx) => renderPlacedWidget(w, idx)).join('');
    }
  });
}

function updateIconPreview(iconClass) {
  document.getElementById('selected-icon-preview').className = 'bi ' + iconClass;
}

function saveDashboardPage() {
  const name = document.getElementById('page-name').value.trim();
  
  if (!name) {
    Swal.fire('Error', 'Please enter a page name', 'warning');
    return;
  }
  
  if (!window.currentPageWidgets || window.currentPageWidgets.length === 0) {
    Swal.fire('Error', 'Please add at least one widget to the page', 'warning');
    return;
  }
  
  const page = {
    id: window.currentDesigningPageId,
    name: name,
    description: document.getElementById('page-description').value,
    icon: document.getElementById('page-icon').value,
    showInMenu: document.getElementById('show-in-menu').checked,
    widgets: window.currentPageWidgets,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Find and update or add new
  const existingIndex = designState.customPages.findIndex(p => p.id === page.id);
  if (existingIndex >= 0) {
    designState.customPages[existingIndex] = page;
  } else {
    designState.customPages.push(page);
  }
  
  // Save to localStorage
  localStorage.setItem('custom_dashboard_pages', JSON.stringify(designState.customPages));
  
  // Update sidebar menu
  updateSidebarWithCustomPages();
  
  Swal.fire({
    icon: 'success',
    title: 'Page Saved!',
    text: page.showInMenu ? 'Your page has been added to the Overview menu.' : 'Your page has been saved.',
    timer: 2000,
    showConfirmButton: false
  }).then(() => {
    loadSection('design');
  });
}

function previewDashboardPage() {
  const name = document.getElementById('page-name').value.trim() || 'Preview';
  
  Swal.fire({
    title: name,
    html: `
      <div class="text-start" style="max-height: 400px; overflow-y: auto;">
        ${window.currentPageWidgets?.map(w => {
          const def = designState.availableWidgets.find(d => d.id === w.type);
          return `
            <div class="p-3 mb-2 bg-light rounded">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi ${def?.icon || 'bi-square'}"></i>
                <strong>${w.title || def?.name || 'Widget'}</strong>
              </div>
              <div class="text-muted small">${def?.name || 'Widget'} widget</div>
            </div>
          `;
        }).join('') || '<p class="text-muted">No widgets added yet</p>'}
      </div>
    `,
    width: 600,
    confirmButtonText: 'Close'
  });
}

function viewCustomPage(pageId) {
  const page = designState.customPages.find(p => p.id === pageId);
  if (!page) return;
  
  loadSection('custom_page/' + pageId);
}

function editCustomPage(pageId) {
  openDashboardDesigner(pageId);
}

function deleteCustomPage(pageId) {
  Swal.fire({
    title: 'Delete Page?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Yes, Delete'
  }).then(result => {
    if (result.isConfirmed) {
      designState.customPages = designState.customPages.filter(p => p.id !== pageId);
      localStorage.setItem('custom_dashboard_pages', JSON.stringify(designState.customPages));
      updateSidebarWithCustomPages();
      renderDesignModule(document.getElementById('dynamic-content'));
      Swal.fire('Deleted!', 'Page has been deleted.', 'success');
    }
  });
}

// Update sidebar with custom pages under Overview
function updateSidebarWithCustomPages() {
  const pages = JSON.parse(localStorage.getItem('custom_dashboard_pages') || '[]').filter(p => p.showInMenu);
  
  // Find or create the Overview submenu container
  const overviewLink = document.querySelector('a[href="#overview"]')?.parentElement;
  if (!overviewLink) return;
  
  // Remove existing custom pages submenu
  const existingSubmenu = overviewLink.querySelector('.custom-pages-submenu');
  if (existingSubmenu) existingSubmenu.remove();
  
  if (pages.length === 0) return;
  
  // Create submenu
  const submenu = document.createElement('ul');
  submenu.className = 'custom-pages-submenu nav flex-column ms-4 mt-1';
  submenu.innerHTML = pages.map(p => `
    <li class="nav-item">
      <a class="nav-link py-1 small" href="#custom_page/${p.id}" onclick="loadSection('custom_page/${p.id}'); return false;">
        <i class="bi ${p.icon} me-2"></i>${p.name}
      </a>
    </li>
  `).join('');
  
  overviewLink.appendChild(submenu);
}

// Render Custom Page
function renderCustomPage(container, pageId) {
  const page = designState.customPages.find(p => p.id === pageId);
  
  if (!page) {
  container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-file-x fs-1 text-muted"></i>
        <h4 class="mt-3">Page Not Found</h4>
        <p class="text-muted">This custom page doesn't exist or has been deleted.</p>
        <button class="btn btn-primary" onclick="loadSection('overview')">Go to Overview</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="custom-page fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex align-items-center gap-3">
          <div class="page-icon">
            <i class="bi ${page.icon} fs-4 text-primary"></i>
          </div>
          <div>
            <h2 class="fw-bold text-dark mb-1">${page.name}</h2>
            <p class="text-muted mb-0">${page.description || 'Custom dashboard page'}</p>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" onclick="editCustomPage('${page.id}')">
            <i class="bi bi-pencil me-1"></i> Edit
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="exportCustomPage('${page.id}')">
            <i class="bi bi-download me-1"></i> Export
          </button>
        </div>
      </div>

      <!-- Widgets Grid -->
      <div class="row g-4" id="custom-page-widgets">
        ${page.widgets.map(w => renderCustomPageWidget(w)).join('')}
      </div>
    </div>
  `;
  
  // Initialize any charts in the widgets
  setTimeout(() => initCustomPageCharts(page.widgets), 100);
}

function renderCustomPageWidget(widget) {
  const widgetDef = designState.availableWidgets.find(w => w.id === widget.type);
  const width = widget.config?.width === 'half' ? 'col-lg-6' : widget.config?.width === 'third' ? 'col-lg-4' : 'col-12';
  
  return `
    <div class="${width}">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header bg-white border-bottom">
          <div class="d-flex align-items-center gap-2">
            <i class="bi ${widgetDef?.icon || 'bi-square'} text-primary"></i>
            <h6 class="mb-0 fw-bold">${widget.title || widgetDef?.name || 'Widget'}</h6>
          </div>
      </div>
      <div class="card-body">
          <div class="widget-content" id="widget-content-${widget.id}" data-widget-type="${widget.type}">
            ${getWidgetContent(widget)}
        </div>
        </div>
      </div>
    </div>
  `;
}

function getWidgetContent(widget) {
  switch (widget.type) {
    case 'kpi_card':
      return `
          <div class="text-center py-4">
          <div class="display-4 fw-bold text-primary">₹1.2L</div>
          <div class="text-muted">Total Value</div>
          <div class="mt-2 text-success small"><i class="bi bi-arrow-up"></i> +12% vs last period</div>
            </div>
      `;
    case 'line_chart':
    case 'bar_chart':
    case 'area_chart':
      return `<canvas id="chart-${widget.id}" height="200"></canvas>`;
    case 'pie_chart':
      return `<canvas id="chart-${widget.id}" height="200"></canvas>`;
    case 'data_table':
      return `
        <div class="table-responsive">
          <table class="table table-sm table-hover">
            <thead><tr><th>Item</th><th class="text-end">Value</th></tr></thead>
            <tbody>
              <tr><td>Sample Item 1</td><td class="text-end">₹1,000</td></tr>
              <tr><td>Sample Item 2</td><td class="text-end">₹2,500</td></tr>
              <tr><td>Sample Item 3</td><td class="text-end">₹800</td></tr>
            </tbody>
          </table>
          </div>
      `;
    case 'recent_orders':
      return `
        <div class="list-group list-group-flush">
          <div class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div><strong>#ORD-001</strong><br><small class="text-muted">Amazon</small></div>
            <span class="badge bg-success">Delivered</span>
        </div>
          <div class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div><strong>#ORD-002</strong><br><small class="text-muted">Flipkart</small></div>
            <span class="badge bg-warning">Processing</span>
      </div>
    </div>
  `;
    case 'trend_indicator':
      return `
        <div class="d-flex align-items-center justify-content-center py-4">
          <div class="text-center">
            <i class="bi bi-arrow-up-right-circle text-success" style="font-size: 48px;"></i>
            <div class="mt-2 fs-4 fw-bold text-success">+24.5%</div>
            <div class="text-muted small">Growth Rate</div>
          </div>
        </div>
      `;
    default:
      return `<div class="text-center py-4 text-muted"><i class="bi ${designState.availableWidgets.find(w => w.id === widget.type)?.icon || 'bi-square'} fs-1"></i><p class="mt-2">Widget Preview</p></div>`;
  }
}

function initCustomPageCharts(widgets) {
  widgets.forEach(widget => {
    if (['line_chart', 'bar_chart', 'area_chart', 'pie_chart'].includes(widget.type)) {
      const ctx = document.getElementById(`chart-${widget.id}`);
      if (!ctx) return;
      
      if (widget.type === 'pie_chart') {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Amazon', 'Flipkart', 'Meesho', 'Others'],
            datasets: [{
              data: [35, 28, 22, 15],
              backgroundColor: ['#ff9900', '#2874f0', '#f43397', '#64748b']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
      } else {
        new Chart(ctx, {
          type: widget.type === 'bar_chart' ? 'bar' : 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Data',
              data: [65, 59, 80, 81, 56, 72],
              borderColor: '#3b82f6',
              backgroundColor: widget.type === 'area_chart' ? 'rgba(59,130,246,0.2)' : '#3b82f6',
              fill: widget.type === 'area_chart',
              tension: 0.4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    }
  });
}

function exportCustomPage(pageId) {
  Swal.fire({
    icon: 'info',
    title: 'Export',
    text: 'Export functionality coming soon!',
    timer: 2000,
    showConfirmButton: false
  });
}

// Initialize custom pages on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateSidebarWithCustomPages, 500);
});

// --- Settings Module ---

// --- Settings Module ---
// (settingsState declared below)

// --- Settings Module ---

let settingsState = {
  view: "dashboard", // dashboard, general, warehouses, vendors, taxes, users
  history: [],
};

// Main Entry Point
function renderSettingsModule(container, subSection = null) {
  if (!container) container = document.getElementById("dynamic-content");

  // If subSection is provided, render specific settings page
  if (subSection) {
    settingsState.view = subSection;
    renderSettingsSubModule(container);
    return;
  }

  // Otherwise, render the settings dashboard
  renderSettingsDashboard(container);
}

function renderSettingsDashboard(container) {
  container.innerHTML = `
        <div class="container-fluid p-4 fade-in">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1">
            <i class="bi bi-gear me-2"></i>Mango Settings
          </h2>
          <p class="text-muted mb-0">Configure your Mango application settings here.</p>
        </div>
      </div>
            
            <div class="row g-4">
                <!-- Organization Settings -->
        <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4">
                            <div class="d-flex align-items-center mb-3 text-primary">
                <i class="bi bi-building fs-3 me-2"></i>
                                <h5 class="fw-bold mb-0">Organization</h5>
                            </div>
              <p class="text-muted small mb-3">Manage company profile and organizational settings</p>
                            <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('general')">
                  <i class="bi bi-person-badge me-2 text-primary"></i>Profile & Branding
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('warehouses')">
                  <i class="bi bi-geo-alt me-2 text-primary"></i>Warehouses & Locations
                </a>
                            </div>
                        </div>
                    </div>
                </div>

        <!-- Inventory & Products -->
        <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm h-100">
                         <div class="card-body p-4">
                            <div class="d-flex align-items-center mb-3 text-success">
                <i class="bi bi-box-seam fs-3 me-2"></i>
                                <h5 class="fw-bold mb-0">Inventory</h5>
                            </div>
              <p class="text-muted small mb-3">Configure inventory and product settings</p>
                            <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('vendors')">
                  <i class="bi bi-truck me-2 text-success"></i>Vendors
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('taxes')">
                  <i class="bi bi-receipt me-2 text-success"></i>Taxes & Compliance
                </a>
                            </div>
                        </div>
                    </div>
                </div>

        <!-- Channels & Integration -->
        <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm h-100">
                         <div class="card-body p-4">
                             <div class="d-flex align-items-center mb-3 text-info">
                <i class="bi bi-diagram-3 fs-3 me-2"></i>
                <h5 class="fw-bold mb-0">Channels</h5>
              </div>
              <p class="text-muted small mb-3">Manage sales channels and integrations</p>
              <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="loadSection('channel_settings')">
                  <i class="bi bi-sliders me-2 text-info"></i>Channel Configuration
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('oms-integration')">
                  <i class="bi bi-cloud-arrow-up me-2 text-info"></i>OMS Integration
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- System & Preferences -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
              <div class="d-flex align-items-center mb-3 text-warning">
                <i class="bi bi-gear fs-3 me-2"></i>
                                <h5 class="fw-bold mb-0">System</h5>
                            </div>
              <p class="text-muted small mb-3">System preferences and configurations</p>
                             <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('preferences')">
                  <i class="bi bi-sliders me-2 text-warning"></i>Preferences
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('notifications')">
                  <i class="bi bi-bell me-2 text-warning"></i>Notifications
                </a>
                            </div>
                        </div>
                    </div>
                </div>

        <!-- Users & Access -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
              <div class="d-flex align-items-center mb-3 text-danger">
                <i class="bi bi-people fs-3 me-2"></i>
                <h5 class="fw-bold mb-0">Users & Access</h5>
              </div>
              <p class="text-muted small mb-3">Manage users, roles, and permissions</p>
              <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('users')">
                  <i class="bi bi-person-check me-2 text-danger"></i>Users & Roles
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('permissions')">
                  <i class="bi bi-shield-lock me-2 text-danger"></i>Permissions
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Data & Reports -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
              <div class="d-flex align-items-center mb-3 text-secondary">
                <i class="bi bi-database fs-3 me-2"></i>
                <h5 class="fw-bold mb-0">Data & Reports</h5>
              </div>
              <p class="text-muted small mb-3">Data management and reporting settings</p>
              <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('backup')">
                  <i class="bi bi-cloud-upload me-2 text-secondary"></i>Backup & Export
                </a>
                <a href="#" class="list-group-item list-group-item-action border-0 ps-0 py-2" onclick="navigateToSettings('reports')">
                  <i class="bi bi-file-earmark-bar-graph me-2 text-secondary"></i>Report Settings
                </a>
              </div>
            </div>
          </div>
        </div>
            </div>
        </div>
    `;
}

function navigateToSettings(view) {
  settingsState.view = view;
  loadSection(`settings/${view}`);
}

function goBackToSettings() {
  loadSection("settings");
}

async function renderSettingsSubModule(container) {
  container.innerHTML = `
        <div class="container-fluid p-4 fade-in">
             <div class="d-flex align-items-center mb-4">
                <button class="btn btn-light btn-sm me-3 border" onclick="goBackToSettings()">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
                <h4 class="fw-bold mb-0 text-capitalize">${settingsState.view} Settings</h4>
            </div>
            <div id="submodule-content">
                <div class="spinner-border text-primary"></div>
            </div>
        </div>
    `;

  const content = document.getElementById("submodule-content");

  if (settingsState.view === "general") {
    renderGeneralSettings(content);
  } else if (settingsState.view === "warehouses") {
    await renderWarehouseSettings(content);
  } else if (settingsState.view === "vendors") {
    await renderVendorSettings(content);
  } else if (settingsState.view === "taxes") {
    renderTaxSettings(content);
  } else {
    content.innerHTML = `<div class="alert alert-warning">Module '${settingsState.view}' is coming soon.</div>`;
  }
}

async function renderGeneralSettings(container) {
  try {
    const res = await axios.get(`${ROOT_API_URL}/oms/settings/company/profile`);
    const p = res.data;

    container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-10 col-xl-9">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 class="fw-bold mb-1">Organization Profile</h4>
                            <p class="text-muted small mb-0">Manage your company details and branding settings.</p>
                        </div>
                        <button class="btn btn-primary px-4" id="save-btn" onclick="saveCompanyProfile()">
                            <i class="bi bi-check-lg me-1"></i> Save Changes
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
                        <div class="card-body p-4 p-md-5">
                            
                            <!-- Logo Section -->
                            <div class="row mb-5">
                                <div class="col-md-4">
                                    <h6 class="fw-bold text-dark">Organization Logo</h6>
                                    <p class="text-muted small">Upload your company logo to appear on invoices and bills.</p>
                                </div>
                                <div class="col-md-8">
                                    <div class="d-flex align-items-start gap-4">
                                        <div class="position-relative border rounded bg-light d-flex align-items-center justify-content-center" 
                                             style="width: 200px; height: 120px; overflow: hidden;">
                                            <img src="${
                                              p.logo_url &&
                                              p.logo_url !== "null"
                                                ? p.logo_url
                                                : "https://via.placeholder.com/200x120?text=Upload+Logo"
                                            }" 
                                                 id="logo-preview" 
                                                 alt="Logo" 
                                                 style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                            
                                            <div id="logo-spinner" class="position-absolute top-50 start-50 translate-middle d-none">
                                                <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <input type="file" id="logo-input" hidden accept="image/*" onchange="uploadLogo()">
                                            <button class="btn btn-outline-primary btn-sm mb-2" onclick="document.getElementById('logo-input').click()">
                                                <i class="bi bi-upload me-1"></i> Upload Logo
                                            </button>
                                            <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                                                Recommended: 240x240 px @ 72 DPI.<br>Max size: 1MB. Formats: PNG, JPG.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="text-muted opacity-10 my-4">

                            <!-- Identity Section -->
                            <div class="row mb-4">
                                <div class="col-md-4">
                                    <h6 class="fw-bold text-dark">Identity & Location</h6>
                                </div>
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold small text-secondary">Organization Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="org-name" value="${
                                          p.name
                                        }">
                                    </div>
                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Industry</label>
                                            <select class="form-select" id="org-industry">
                                                <option value="">Select Industry</option>
                                                <option value="Retail" ${
                                                  p.industry === "Retail"
                                                    ? "selected"
                                                    : ""
                                                }>Retail</option>
                                                <option value="Services" ${
                                                  p.industry === "Services"
                                                    ? "selected"
                                                    : ""
                                                }>Services</option>
                                                <option value="Manufacturing" ${
                                                  p.industry === "Manufacturing"
                                                    ? "selected"
                                                    : ""
                                                }>Manufacturing</option>
                                                <option value="Technology" ${
                                                  p.industry === "Technology"
                                                    ? "selected"
                                                    : ""
                                                }>Technology</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Location</label>
                                            <select class="form-select" id="org-location">
                                                <option value="India" ${
                                                  p.location === "India"
                                                    ? "selected"
                                                    : ""
                                                }>India</option>
                                                <option value="USA" ${
                                                  p.location === "USA"
                                                    ? "selected"
                                                    : ""
                                                }>USA</option>
                                                <option value="UK" ${
                                                  p.location === "UK"
                                                    ? "selected"
                                                    : ""
                                                }>UK</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label fw-bold small text-secondary">Address</label>
                                        <input type="text" class="form-control mb-2" id="org-addr1" placeholder="Street Address 1" value="${
                                          p.address_line1 || ""
                                        }">
                                        <input type="text" class="form-control mb-2" id="org-addr2" placeholder="Street Address 2 (Optional)" value="${
                                          p.address_line2 || ""
                                        }">
                                        <div class="row g-2">
                                             <div class="col-6"><input type="text" class="form-control" id="org-city" placeholder="City" value="${
                                               p.city || ""
                                             }"></div>
                                             <div class="col-6"><input type="text" class="form-control" id="org-zip" placeholder="Zip/Postal Code" value="${
                                               p.zip_code || ""
                                             }"></div>
                                        </div>
                                        <div class="row g-2 mt-2">
                                             <div class="col-6">
                                                <input type="text" class="form-control" id="org-state" placeholder="State/Province" value="${
                                                  p.state || "Delhi"
                                                }">
                                             </div>
                                             <div class="col-6"><input type="text" class="form-control" id="org-phone" placeholder="Phone Number" value="${
                                               p.phone || ""
                                             }"></div>
                                        </div>
                                    </div>
                                    <div class="row g-3">
                                         <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Website</label>
                                            <input type="text" class="form-control" id="org-website" placeholder="https://" value="${
                                              p.website || ""
                                            }">
                                         </div>
                                         <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Tax ID</label>
                                            <input type="text" class="form-control" id="org-tax" placeholder="GSTIN / VAT ID" value="${
                                              p.tax_id || ""
                                            }">
                                         </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="text-muted opacity-10 my-4">

                            <!-- Regional Settings -->
                            <div class="row mb-4">
                                <div class="col-md-4">
                                    <h6 class="fw-bold text-dark">Regional Settings</h6>
                                </div>
                                <div class="col-md-8">
                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Base Currency</label>
                                            <select class="form-select" id="org-currency">
                                                <option value="INR" ${
                                                  p.currency === "INR"
                                                    ? "selected"
                                                    : ""
                                                }>INR (Indian Rupee)</option>
                                                <option value="USD" ${
                                                  p.currency === "USD"
                                                    ? "selected"
                                                    : ""
                                                }>USD (US Dollar)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Time Zone</label>
                                            <select class="form-select" id="org-timezone">
                                                <option value="Asia/Kolkata" ${
                                                  p.timezone === "Asia/Kolkata"
                                                    ? "selected"
                                                    : ""
                                                }>(GMT 5:30) India Standard Time</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Fiscal Year</label>
                                            <select class="form-select" id="org-fiscal-year">
                                                <option value="April - March" ${
                                                  p.fiscal_year ===
                                                  "April - March"
                                                    ? "selected"
                                                    : ""
                                                }>April - March</option>
                                                <option value="January - December" ${
                                                  p.fiscal_year ===
                                                  "January - December"
                                                    ? "selected"
                                                    : ""
                                                }>January - December</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label fw-bold small text-secondary">Language</label>
                                            <select class="form-select" id="org-language">
                                                <option value="English" ${
                                                  p.language === "English"
                                                    ? "selected"
                                                    : ""
                                                }>English</option>
                                                <option value="Hindi" ${
                                                  p.language === "Hindi"
                                                    ? "selected"
                                                    : ""
                                                }>Hindi</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label fw-bold small text-secondary">Date Format</label>
                                         <div class="input-group">
                                            <select class="form-select" id="org-date-format">
                                                <option value="dd/MM/yyyy" ${
                                                  p.date_format === "dd/MM/yyyy"
                                                    ? "selected"
                                                    : ""
                                                }>dd/MM/yyyy [ 27/12/2025 ]</option>
                                                <option value="MM/dd/yyyy" ${
                                                  p.date_format === "MM/dd/yyyy"
                                                    ? "selected"
                                                    : ""
                                                }>MM/dd/yyyy [ 12/27/2025 ]</option>
                                                <option value="yyyy-MM-dd" ${
                                                  p.date_format === "yyyy-MM-dd"
                                                    ? "selected"
                                                    : ""
                                                }>yyyy-MM-dd [ 2025-12-27 ]</option>
                                            </select>
                                         </div>
                                    </div>

                                     <div class="mb-3">
                                        <label class="form-label fw-bold small text-secondary mb-2">Report Basis</label>
                                        <div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="reportBasis" id="rb-accrual" value="Accrual" ${
                                                  p.report_basis !== "Cash"
                                                    ? "checked"
                                                    : ""
                                                }>
                                                <label class="form-check-label" for="rb-accrual">
                                                    <span class="fw-bold text-dark">Accrual</span> <span class="text-muted small ms-1">- You owe tax as of invoice date</span>
                                                </label>
                                            </div>
                                            <div class="form-check mt-2">
                                                <input class="form-check-input" type="radio" name="reportBasis" id="rb-cash" value="Cash" ${
                                                  p.report_basis === "Cash"
                                                    ? "checked"
                                                    : ""
                                                }>
                                                <label class="form-check-label" for="rb-cash">
                                                    <span class="fw-bold text-dark">Cash</span> <span class="text-muted small ms-1">- You owe tax upon payment receipt</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            <!-- Save Actions in Footer -->
                             <div class="d-flex justify-content-end pt-4 border-top">
                                <button class="btn btn-light px-4 me-2" onclick="goBackToSettings()">Cancel</button>
                                <button class="btn btn-primary px-5" onclick="saveCompanyProfile()">Save</button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger shadow-sm">Failed to load profile. ${err.message}. Check <a href="#" onclick="fetchCompanyInfo()">Connection</a>.</div>`;
  }
}

async function uploadLogo() {
  const input = document.getElementById("logo-input");
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append("file", file);

  // UI Feedback
  const spinner = document.getElementById("logo-spinner");
  const img = document.getElementById("logo-preview");
  spinner.classList.remove("d-none");
  img.style.opacity = "0.5";

  try {
    const res = await axios.post(
      `${ROOT_API_URL}/oms/settings/company/logo`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // Update Image
    img.src = res.data.logo_url;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Logo uploaded successfully",
      showConfirmButton: false,
      timer: 3000,
    });
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to upload logo", "error");
  } finally {
    spinner.classList.add("d-none");
    img.style.opacity = "1";
  }
}

async function saveCompanyProfile() {
  const btn = document.getElementById("save-btn"); // Primary Header Button
  const originalText = btn ? btn.innerHTML : "Save";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;
  }

  const payload = {
    name: document.getElementById("org-name").value,
    industry: document.getElementById("org-industry").value,
    location: document.getElementById("org-location").value,
    address_line1: document.getElementById("org-addr1").value,
    address_line2: document.getElementById("org-addr2").value,
    city: document.getElementById("org-city").value,
    state: document.getElementById("org-state").value,
    zip_code: document.getElementById("org-zip").value,
    phone: document.getElementById("org-phone").value,
    website: document.getElementById("org-website").value,
    tax_id: document.getElementById("org-tax").value,
    currency: document.getElementById("org-currency").value,
    timezone: document.getElementById("org-timezone").value,
    fiscal_year: document.getElementById("org-fiscal-year").value,
    report_basis: document.querySelector('input[name="reportBasis"]:checked')
      .value,
    language: document.getElementById("org-language").value,
    date_format: document.getElementById("org-date-format").value,
  };

  try {
    await axios.post(`${ROOT_API_URL}/oms/settings/company/profile`, payload);
    Swal.fire({
      icon: "success",
      title: "Profile Updated",
      text: "Your organization settings have been saved.",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire("Error", "Failed to update profile.", "error");
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

async function renderWarehouseSettings(container) {
  try {
    const res = await axios.get(`${ROOT_API_URL}/oms/settings/warehouses`);
    const warehouses = res.data;

    container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                             <h4 class="fw-bold mb-1">Warehouses & Locations</h4>
                             <p class="text-muted small mb-0">Manage physical storage locations.</p>
                        </div>
                        <button class="btn btn-primary px-4" onclick="openWarehouseModal()">
                            <i class="bi bi-plus-lg me-1"></i> New Warehouse
                        </button>
                    </div>
                    
                    ${
                      warehouses.length === 0
                        ? `
                        <div class="text-center py-5 border rounded-3 bg-light dashed-border">
                            <i class="bi bi-building text-muted display-4"></i>
                            <h5 class="mt-3 text-muted">No Warehouses Found</h5>
                            <p class="text-muted small mb-4">Create your first warehouse to start tracking inventory.</p>
                            <button class="btn btn-primary" onclick="openWarehouseModal()">Create Warehouse</button>
                        </div>
                    `
                        : `
                        <div class="row g-4">
                            ${warehouses
                              .map(
                                (w) => `
                                <div class="col-md-6 col-xl-4 mb-3">
                                    <div class="card h-100 border-0 shadow-sm hover-shadow transition-all">
                                        <div class="card-body p-4">
                                            <div class="d-flex justify-content-between align-items-start mb-3">
                                                <div class="d-flex align-items-center gap-3">
                                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                                        <i class="bi bi-building fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <h5 class="fw-bold mb-0 text-dark">${
                                                          w.name
                                                        }</h5>
                                                        <span class="badge bg-light text-secondary border mt-1">${
                                                          w.code
                                                        }</span>
                                                    </div>
                                                </div>
                                                <div class="dropdown">
                                                    <button class="btn btn-link text-muted p-0" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                                        <li><a class="dropdown-item" href="#" onclick="openWarehouseModal(${
                                                          w.id
                                                        })"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                                        <li><hr class="dropdown-divider"></li>
                                                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteWarehouse(${
                                                          w.id
                                                        }, '${
                                  w.name
                                }')"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            
                                            <div class="d-flex align-items-center text-muted small mb-2">
                                                <i class="bi bi-geo-alt me-2"></i> ${
                                                  w.address ||
                                                  "No Address Provided"
                                                }
                                            </div>
                                            
                                            <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                                                <span class="badge ${
                                                  w.is_active
                                                    ? "bg-success-subtle text-success"
                                                    : "bg-secondary-subtle"
                                                } rounded-pill px-3">
                                                    ${
                                                      w.is_active
                                                        ? "Active"
                                                        : "Inactive"
                                                    }
                                                </span>
                                                <small class="text-muted">ID: ${
                                                  w.id
                                                }</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    `
                    }
                </div>
            </div>
        `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load warehouses. ${err.message}</div>`;
  }
}

async function openWarehouseModal(id = null) {
  let warehouse = null;
  let title = "New Warehouse";
  let btnText = "Create Warehouse";

  // Address defaults
  let addr1 = "",
    city = "",
    state = "",
    zip = "";

  if (id) {
    title = "Edit Warehouse";
    btnText = "Save Changes";
    try {
      const res = await axios.get(
        `${ROOT_API_URL}/oms/settings/warehouses/${id}`
      );
      warehouse = res.data;

      if (warehouse && warehouse.address) {
        const parts = warehouse.address.split(",").map((s) => s.trim());
        if (parts.length >= 3) {
          addr1 = parts[0];
          city = parts[1];
          state = parts[2];
          zip = parts[3] || "";
        } else {
          addr1 = warehouse.address;
        }
      }
    } catch (e) {
      Swal.fire("Error", "Failed to load warehouse data", "error");
      return;
    }
  }

  const htmlContent = `
        <div class="text-start">
            <input type="hidden" id="modal-wh-id" value="${id || ""}">
            <div class="row g-3 mb-3">
                <div class="col-md-8">
                    <label class="form-label fw-bold small">Warehouse Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="modal-wh-name" value="${
                      warehouse?.name || ""
                    }" placeholder="e.g. North DC">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-bold small">Code <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="modal-wh-code" value="${
                      warehouse?.code || ""
                    }" placeholder="e.g. WH01">
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label fw-bold small">Address</label>
                <input type="text" class="form-control mb-2" id="modal-wh-addr1" value="${addr1}" placeholder="Street Address">
                <div class="row g-2">
                    <div class="col-6">
                        <input type="text" class="form-control" id="modal-wh-city" value="${city}" placeholder="City">
                    </div>
                    <div class="col-6">
                        <input type="text" class="form-control" id="modal-wh-zip" value="${zip}" placeholder="Zip Code">
                    </div>
                </div>
                <div class="row g-2 mt-1">
                     <div class="col-12">
                         <input type="text" class="form-control" id="modal-wh-state" value="${state}" placeholder="State/Province">
                     </div>
                </div>
            </div>
            
            <div class="form-check form-switch bg-light p-3 rounded border">
                <input class="form-check-input ms-0 me-2" type="checkbox" id="modal-wh-active" ${
                  !warehouse || warehouse.is_active ? "checked" : ""
                }>
                <label class="form-check-label fw-bold" for="modal-wh-active">Active Status</label>
                <div class="text-muted small mt-1">Enable to allow stock movements for this location.</div>
            </div>
        </div>
    `;

  Swal.fire({
    title: title,
    html: htmlContent,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: btnText,
    confirmButtonColor: "#0d6efd",
    cancelButtonText: "Cancel",
    focusConfirm: false,
    preConfirm: async () => {
      const name = document.getElementById("modal-wh-name").value;
      const code = document.getElementById("modal-wh-code").value;
      if (!name || !code) {
        Swal.showValidationMessage("Name and Code are required");
        return false;
      }

      const addr1 = document.getElementById("modal-wh-addr1").value;
      const city = document.getElementById("modal-wh-city").value;
      const zip = document.getElementById("modal-wh-zip").value;
      const state = document.getElementById("modal-wh-state").value;
      const fullAddress = [addr1, city, state, zip]
        .filter((item) => item && item.trim() !== "")
        .join(", ");

      const isActive = document.getElementById("modal-wh-active").checked
        ? 1
        : 0;
      const whId = document.getElementById("modal-wh-id").value;

      try {
        if (whId) {
          await axios.put(`${ROOT_API_URL}/oms/settings/warehouses/${whId}`, {
            name,
            code,
            address: fullAddress,
            is_active: isActive,
          });
        } else {
          await axios.post(`${ROOT_API_URL}/oms/settings/warehouses`, {
            name,
            code,
            address: fullAddress,
            is_active: isActive,
          });
        }
        return true;
      } catch (error) {
        Swal.showValidationMessage(
          error.response?.data?.detail || "Request failed"
        );
        return false;
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: "success",
        title: "Saved!",
        timer: 1500,
        showConfirmButton: false,
      });
      const container = document.getElementById("settings-content");
      if (container) renderWarehouseSettings(container);
    }
  });
}

async function deleteWarehouse(id, name) {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `Delete warehouse "${name}"? This cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(`${ROOT_API_URL}/oms/settings/warehouses/${id}`);
      Swal.fire("Deleted!", "Warehouse has been deleted.", "success");
      const container = document.getElementById("settings-content");
      renderWarehouseSettings(container);
    } catch (err) {
      Swal.fire("Error", "Failed to delete warehouse.", "error");
    }
  }
}

async function renderVendorSettings(container) {
  try {
    const res = await axios.get(`${API_BASE_URL}/mango/inventory/vendors`);
    const vendors = res.data;

    container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="fw-bold mb-0">Vendors</h4>
                <button class="btn btn-primary btn-sm" onclick="showAddVendorModal()">+ Add New</button>
            </div>
            
            <div class="card border-0 shadow-sm">
                <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light">
                        <tr>
                            <th class="ps-4">Name</th>
                            <th>Code</th>
                            <th>Contact</th>
                            <th>Email</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendors
                          .map(
                            (v) => `
                            <tr>
                                <td class="ps-4 fw-bold text-dark">${
                                  v.name
                                }</td>
                                <td><span class="badge bg-light text-dark border">${
                                  v.code
                                }</span></td>
                                <td>${v.contact_person || "-"}</td>
                                <td>${v.email || "-"}</td>
                                <td class="text-end pe-4">
                                     <button class="btn btn-sm btn-link text-muted"><i class="bi bi-pencil"></i></button>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  } catch (err) {
    container.innerHTML =
      '<div class="alert alert-danger">Failed to load vendors.</div>';
  }
}

function renderTaxSettings(container) {
  container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="fw-bold mb-0">Tax Configuration</h4>
            <button class="btn btn-primary btn-sm" disabled>+ Add Tax Group (Pro)</button>
        </div>
        
        <div class="alert alert-info border-0 bg-info bg-opacity-10 small mb-4">
            <i class="bi bi-info-circle me-2"></i> Only standard GST rates are currently enabled.
        </div>
        
        <div class="row g-4">
            <div class="col-md-6">
                <div class="card border-0 shadow-sm p-3">
                    <h6 class="fw-bold border-bottom pb-2">Intra-State (GST)</h6>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between"><span>GST5</span> <span class="badge bg-secondary">5%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>GST12</span> <span class="badge bg-secondary">12%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>GST18</span> <span class="badge bg-secondary">18%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>GST28</span> <span class="badge bg-secondary">28%</span></li>
                    </ul>
                </div>
            </div>
             <div class="col-md-6">
                <div class="card border-0 shadow-sm p-3">
                    <h6 class="fw-bold border-bottom pb-2">Inter-State (IGST)</h6>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between"><span>IGST5</span> <span class="badge bg-primary">5%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>IGST12</span> <span class="badge bg-primary">12%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>IGST18</span> <span class="badge bg-primary">18%</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>IGST28</span> <span class="badge bg-primary">28%</span></li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// Reuse existing Add Modal logic? Yes, showAddWarehouseModal and showAddVendorModal exist.
// Checking if they are accessible (global scope). Yes they should be if previously defined or I can refine them.
// I will check if they are defined in next steps if needed, for now assume they work as they were in previous file versions (I recall seeing them).
// Actually, I should verify if they are defined. If not, I need to define them.
// I'll define simple versions here to be safe if they aren't globally available or were removed.

async function showAddVendorModal() {
  const { value: formValues } = await Swal.fire({
    title: "New Vendor",
    html: `
            <input id="swal-v-name" class="form-control mb-2" placeholder="Vendor Name">
            <input id="swal-v-code" class="form-control mb-2" placeholder="Code (e.g. VEN01)">
            <input id="swal-v-email" class="form-control mb-2" placeholder="Email">
             <input id="swal-v-contact" class="form-control" placeholder="Contact Person">
        `,
    focusConfirm: false,
    preConfirm: () => {
      return {
        name: document.getElementById("swal-v-name").value,
        code: document.getElementById("swal-v-code").value,
        email: document.getElementById("swal-v-email").value,
        contact_person: document.getElementById("swal-v-contact").value,
      };
    },
  });
  if (formValues) {
    try {
      await axios.post(`${API_BASE_URL}/mango/inventory/vendors`, formValues);
      Swal.fire("Success", "Vendor added", "success");
      loadSettingsTabContent();
    } catch (e) {
      Swal.fire("Error", "Failed to add vendor", "error");
    }
  }
}

// Helpers
function handleQuickTrack() {
  const val = document.getElementById("quick-track-input").value;
  if (val) {
    loadSection("tracking");
    setTimeout(() => {
      const trackInput = document.getElementById("deep-track-input");
      if (trackInput) {
        trackInput.value = val;
        simulateSearch();
      }
    }, 100);
  }
}

function simulateSearch() {
  const results = document.getElementById("tracking-results");
  results.innerHTML = `
        <div class="dashboard-card p-4 fade-in">
            <div class="d-flex align-items-center gap-3 mb-4">
                <div class="spinner-border text-warning" role="status" style="width: 1.5rem; height: 1.5rem;"></div>
                <span class="text-muted fw-medium">Querying distributed ledgers...</span>
            </div>
        </div>`;

  setTimeout(() => {
    results.innerHTML = `
            <div class="dashboard-card p-0 overflow-hidden fade-in">
                <div class="p-4 bg-light border-bottom d-flex justify-content-between align-items-center">
                    <div>
                        <div class="text-uppercase text-muted small fw-bold tracking-wider">Order Output</div>
                        <h4 class="fw-bold text-dark mb-0">#ORD-9921-XJY</h4>
                    </div>
                    <span class="status-badge success fs-6 px-3 py-2">DELIVERED</span>
                </div>
                <div class="p-4">
                    <div class="row g-4">
                        <div class="col-md-3">
                            <label class="text-muted small fw-bold">Customer</label>
                            <div class="fw-medium text-dark">John Doe</div>
                            <small class="text-muted">john.doe@example.com</small>
                        </div>
                        <div class="col-md-3">
                            <label class="text-muted small fw-bold">Amount</label>
                            <div class="fw-bold text-dark">₹ 1,299.00</div>
                            <small class="text-success">Paid via UPI</small>
                        </div>
                         <div class="col-md-3">
                            <label class="text-muted small fw-bold">Channel</label>
                            <div><span class="badge bg-secondary">Amazon</span></div>
                        </div>
                        <div class="col-md-3">
                            <label class="text-muted small fw-bold">Logistics</label>
                            <div class="fw-medium text-dark">BlueDart Express</div>
                            <small class="text-info font-monospace">AWB: 771829102</small>
                        </div>
                    </div>
                
                    <div class="mt-5">
                       <h6 class="fw-bold text-dark mb-4">Event Timeline</h6>
                       <div class="d-flex gap-4 overflow-auto pb-2">
                            <div class="position-relative text-center" style="min-width: 120px;">
                                <div class="bg-success text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 32px; height: 32px;"><i class="bi bi-check"></i></div>
                                <div class="small fw-bold text-dark">Placed</div>
                                <div class="small text-muted" style="font-size: 0.75rem;">10:00 AM</div>
                            </div>
                             <div class="border-top border-success flex-grow-1 mt-3 op-50"></div>
                             <div class="position-relative text-center" style="min-width: 120px;">
                                <div class="bg-success text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 32px; height: 32px;"><i class="bi bi-check"></i></div>
                                <div class="small fw-bold text-dark">Packed</div>
                                <div class="small text-muted" style="font-size: 0.75rem;">10:45 AM</div>
                            </div>
                             <div class="border-top border-success flex-grow-1 mt-3 op-50"></div>
                             <div class="position-relative text-center" style="min-width: 120px;">
                                <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 32px; height: 32px;"><i class="bi bi-truck"></i></div>
                                <div class="small fw-bold text-dark">Shipped</div>
                                <div class="small text-muted" style="font-size: 0.75rem;">02:00 PM</div>
                            </div>
                             <div class="border-top border-secondary flex-grow-1 mt-3"></div>
                             <div class="position-relative text-center" style="min-width: 120px;">
                                <div class="bg-light border text-muted rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 32px; height: 32px;"><i class="bi bi-house"></i></div>
                                <div class="small fw-bold text-muted">Delivered</div>
                                <div class="small text-muted" style="font-size: 0.75rem;">Est. Tomorrow</div>
                            </div>
                       </div>
                    </div>
                </div>
            </div>
        `;
  }, 1000);
}

async function openCompanyModal() {
  const modal = new bootstrap.Modal(
    document.getElementById("companyDetailsModal")
  );
  modal.show();

  try {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(
      `${API_BASE_URL.replace("/mango", "/oms")}/auth/me`
    );
    const user = res.data;

    if (user.company) {
      const c = user.company;
      document.getElementById("modal-comp-name").innerText = c.name;

      let addr = c.address || "";
      if (c.city) addr += `, ${c.city}`;
      if (c.state) addr += `, ${c.state}`;
      if (c.country) addr += `, ${c.country}`;
      if (c.zip_code) addr += ` - ${c.zip_code}`;
      document.getElementById("modal-comp-address").innerText = addr || "N/A";

      // Set Code
      const codeDisp = c.tax_id || `#${c.id}`;
      document.getElementById("modal-comp-code").innerText = codeDisp;

      document.getElementById("modal-comp-email").innerHTML = c.email
        ? `<i class="bi bi-envelope me-2"></i>${c.email}`
        : "";
      document.getElementById("modal-comp-phone").innerHTML = c.phone
        ? `<i class="bi bi-telephone me-2"></i>${c.phone}`
        : "";
      document.getElementById("modal-comp-website").innerHTML = c.website
        ? `<i class="bi bi-globe me-2"></i><a href="${c.website}" target="_blank">${c.website}</a>`
        : "";

      document.getElementById("modal-comp-curr").innerText =
        c.currency || "INR";
      document.getElementById("modal-comp-tz").innerText = c.timezone || "UTC";
    }
  } catch (e) {
    console.error("Failed to load company details", e);
  }
}

// --- Item Settings Module ---
async function renderItemSettings(container) {
  if (!container) container = document.getElementById("dynamic-content");

  const visibleCols =
    JSON.parse(localStorage.getItem("inventory_visible_columns")) ||
    DEFAULT_VISIBLE_COLUMNS;

  // Fetch Custom Fields
  let customFields = [];
  try {
    const res = await axios.get(
      `${ROOT_API_URL}/oms/settings/custom-fields/product`
    );
    customFields = res.data;
  } catch (e) {
    console.error("Failed to load custom fields", e);
  }

  // Generate Fields HTML for Customization Tab (Standard Columns)
  const standardFieldsHtml = Object.entries(ITEM_COLUMNS_CONFIG)
    .map(([key, conf]) => {
      const isChecked = visibleCols.includes(key);
      const isLocked = key === "name";
      return `
            <div class="col-md-6 col-lg-4 field-item standard-field" data-key="${key}">
                <div class="card h-100 border shadow-sm hover-shadow transition-all">
                    <div class="card-body d-flex align-items-center gap-3 p-3">
                        <div class="handle cursor-move text-muted opacity-50"><i class="bi bi-grid-3x2-gap-fill"></i></div>
                        <div class="form-check mb-0 flex-grow-1">
                            <input class="form-check-input" type="checkbox" id="setting-col-${key}" value="${key}" 
                                ${isChecked ? "checked" : ""} ${
        isLocked ? "disabled" : ""
      } onchange="updateColumnSetting('${key}', this.checked)">
                            <label class="form-check-label w-100 fw-medium text-dark stretched-link" for="setting-col-${key}">
                                ${conf.label}
                            </label>
                        </div>
                        ${
                          isLocked
                            ? '<i class="bi bi-lock-fill text-muted" title="Mandatory Field"></i>'
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  // Generate HTML for Custom Fields
  const customFieldsHtml =
    customFields.length > 0
      ? customFields
          .map((cf) => {
            // Custom fields are auto-enabled for column view if they exist? Or same logic?
            // For now, let's just list them to Manage (Delete/Edit) and maybe toggle visibility too.
            // We need to add them to column config dynamically in real-time, but for this view:
            const isChecked = visibleCols.includes(cf.field_key);

            return `
            <div class="col-md-6 col-lg-4 field-item custom-field" data-key="${
              cf.field_key
            }">
                <div class="card h-100 border border-primary bg-primary bg-opacity-10 shadow-sm hover-shadow transition-all">
                    <div class="card-body d-flex align-items-center gap-3 p-3">
                        <div class="handle cursor-move text-primary opacity-50"><i class="bi bi-star-fill"></i></div>
                        <div class="form-check mb-0 flex-grow-1">
                            <input class="form-check-input" type="checkbox" id="setting-col-${
                              cf.field_key
                            }" value="${cf.field_key}" 
                                ${
                                  isChecked ? "checked" : ""
                                } onchange="updateColumnSetting('${
              cf.field_key
            }', this.checked)">
                            <label class="form-check-label w-100 fw-bold text-primary stretched-link" for="setting-col-${
                              cf.field_key
                            }">
                                ${
                                  cf.field_label
                                } <span class="badge bg-white text-primary border ms-2">${
              cf.field_type
            }</span>
                            </label>
                        </div>
                        <button class="btn btn-sm btn-link text-danger z-2 position-relative" onclick="deleteCustomField(${
                          cf.id
                        })" title="Delete Field"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
          })
          .join("")
      : `<div class="col-12 text-center text-muted py-4 small">No custom fields added yet.</div>`;

  container.innerHTML = `
        <div class="fade-in max-w-7xl mx-auto pt-2">
            <!-- Header -->
            <div class="d-flex align-items-center gap-3 mb-4">
                <button class="btn btn-light btn-icon rounded-circle shadow-sm" onclick="loadSection('inventory_items')">
                    <i class="bi bi-arrow-left"></i>
                </button>
                <div>
                   <h2 class="fw-bold mb-0">Items</h2>
                   <p class="text-muted mb-0 small">Manage item configuration and preferences.</p>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 overflow-hidden" style="min-height: 70vh;">
                <div class="card-header bg-white border-bottom px-4 pt-3 pb-0">
                    <ul class="nav nav-tabs card-header-tabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold py-3 px-4 border-0 border-bottom-primary" id="tab-general" data-bs-toggle="tab" data-bs-target="#content-general" type="button" role="tab">General</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold text-muted py-3 px-4 border-0" id="tab-fields" data-bs-toggle="tab" data-bs-target="#content-fields" type="button" role="tab">Field Customization</button>
                        </li>
                    </ul>
                </div>

                <div class="card-body p-0 tab-content bg-light-subtle">
                    <!-- General Settings -->
                    <div class="tab-pane fade show active p-4" id="content-general" role="tabpanel">
                       <div class="row justify-content-center">
                            <div class="col-lg-8">
                                <div class="bg-white p-4 rounded-3 border mb-4">
                                     <div class="d-flex justify-content-between align-items-center">
                                        <label class="fw-bold mb-0 text-dark">Set a decimal rate for your item quantity</label>
                                        <select class="form-select form-select-sm w-auto"><option value="2" selected>2</option></select>
                                    </div>
                                </div>
                                
                                <div class="bg-white p-4 rounded-3 border mb-4">
                                    <h6 class="fw-bold mb-3">HSN Code or SAC</h6>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="hsn-enable" checked>
                                        <label class="form-check-label fw-medium" for="hsn-enable">Enable the HSN Code or SAC field</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Field Customization -->
                    <div class="tab-pane fade p-4" id="content-fields" role="tabpanel">
                         <div class="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h5 class="fw-bold mb-1">Field Customization</h5>
                                <p class="text-muted mb-0 small">Manage standard and custom fields.</p>
                            </div>
                             <div class="d-flex gap-2">
                                <button class="btn btn-primary btn-sm shadow-sm" onclick="openNewFieldModal()">
                                    <i class="bi bi-plus-lg me-1"></i> New Custom Field
                                </button>
                            </div>
                        </div>
                        
                        <!-- Search -->
                        <div class="position-relative mb-4">
                             <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                             <input type="text" id="setting-field-search" class="form-control ps-5 rounded-pill" placeholder="Search fields..." onkeyup="filterSettingsFields(this.value)">
                        </div>

                        <h6 class="fw-bold text-muted mb-3 text-uppercase small ls-1">Custom Fields</h6>
                        <div class="row g-3 mb-4" id="custom-field-grid">${customFieldsHtml}</div>

                        <h6 class="fw-bold text-muted mb-3 text-uppercase small ls-1">Standard Fields</h6>
                        <div class="row g-3" id="standard-field-grid">${standardFieldsHtml}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Custom Field Modal - Advanced Professional Version
function openNewFieldModal() {
  const fieldTypes = [
    {
      value: "Text",
      label: "Single Line Text",
      icon: "bi-input-cursor-text",
      desc: "Short text input",
    },
    {
      value: "TextArea",
      label: "Multi-line Text",
      icon: "bi-text-paragraph",
      desc: "Long text with line breaks",
    },
    {
      value: "Email",
      label: "Email",
      icon: "bi-envelope",
      desc: "Email address with validation",
    },
    { value: "URL", label: "URL", icon: "bi-link-45deg", desc: "Web address" },
    {
      value: "Phone",
      label: "Phone",
      icon: "bi-telephone",
      desc: "Phone number",
    },
    { value: "Number", label: "Number", icon: "bi-123", desc: "Whole number" },
    {
      value: "Decimal",
      label: "Decimal",
      icon: "bi-coin",
      desc: "Number with decimals",
    },
    {
      value: "Amount",
      label: "Currency",
      icon: "bi-currency-dollar",
      desc: "Monetary value",
    },
    {
      value: "Percent",
      label: "Percentage",
      icon: "bi-percent",
      desc: "Percentage value",
    },
    {
      value: "Date",
      label: "Date",
      icon: "bi-calendar-date",
      desc: "Date picker",
    },
    {
      value: "DateTime",
      label: "Date & Time",
      icon: "bi-calendar-event",
      desc: "Date and time picker",
    },
    {
      value: "Boolean",
      label: "Checkbox",
      icon: "bi-check-square",
      desc: "True/false toggle",
    },
    {
      value: "Dropdown",
      label: "Dropdown",
      icon: "bi-caret-down-square",
      desc: "Select one option",
    },
    {
      value: "MultiSelect",
      label: "Multi-select",
      icon: "bi-card-checklist",
      desc: "Select multiple options",
    },
    {
      value: "Image",
      label: "Image Upload",
      icon: "bi-image",
      desc: "Upload image files",
    },
    {
      value: "Attachment",
      label: "File Attachment",
      icon: "bi-paperclip",
      desc: "Upload any file type",
    },
  ];

  const fieldTypeOptions = fieldTypes
    .map(
      (ft) => `
        <div class="col-6 col-md-4 mb-2">
            <div class="field-type-card p-3 rounded-3 border bg-hover-light cursor-pointer" onclick="selectFieldType('${ft.value}', this)" data-type="${ft.value}">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi ${ft.icon} text-primary fs-5"></i>
                    <span class="fw-bold small">${ft.label}</span>
                </div>
                <p class="text-muted mb-0" style="font-size: 0.7rem;">${ft.desc}</p>
            </div>
        </div>
    `
    )
    .join("");

  Swal.fire({
    title:
      '<i class="bi bi-plus-circle text-primary me-2"></i>Create Custom Field',
    html: `
            <style>
                .field-type-card { 
                    transition: all 0.2s; 
                    cursor: pointer;
                }
                .field-type-card:hover { 
                    background: #f0f7ff !important; 
                    border-color: #4a90e2 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .field-type-card.selected { 
                    background: #e3f2fd !important; 
                    border: 2px solid #2196F3 !important;
                    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
                }
                .bg-hover-light:hover { background: #f8f9fa; }
                .nav-pills .nav-link { 
                    color: #6c757d; 
                    border-radius: 8px;
                    font-weight: 500;
                }
                .nav-pills .nav-link.active { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .advanced-field-input {
                    border-radius: 8px;
                    border: 1.5px solid #e0e0e0;
                    transition: all 0.2s;
                }
                .advanced-field-input:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                .field-preview {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 12px;
                    padding: 2rem;
                }
            </style>
            <div class="text-start">
                <!-- Tabs Navigation -->
                <ul class="nav nav-pills mb-4 bg-light p-2 rounded-3" role="tablist">
                    <li class="nav-item flex-fill" role="presentation">
                        <button class="nav-link active w-100" id="basic-tab" data-bs-toggle="pill" data-bs-target="#basic-panel" type="button">
                            <i class="bi bi-gear me-1"></i> Basic
                        </button>
                    </li>
                    <li class="nav-item flex-fill" role="presentation">
                        <button class="nav-link w-100" id="advanced-tab" data-bs-toggle="pill" data-bs-target="#advanced-panel" type="button">
                            <i class="bi bi-sliders me-1"></i> Advanced
                        </button>
                    </li>
                    <li class="nav-item flex-fill" role="presentation">
                        <button class="nav-link w-100" id="preview-tab" data-bs-toggle="pill" data-bs-target="#preview-panel" type="button">
                            <i class="bi bi-eye me-1"></i> Preview
                        </button>
                    </li>
                </ul>

                <div class="tab-content">
                    <!-- Basic Settings -->
                    <div class="tab-pane fade show active" id="basic-panel" role="tabpanel">
                        <div class="mb-4">
                            <label class="form-label fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-tag text-primary"></i> Field Label <span class="text-danger">*</span>
                            </label>
                            <input type="text" id="cf-label" class="form-control advanced-field-input" placeholder="e.g., Warranty Period, Installation Date..." onkeyup="updatePreview()">
                            <div class="form-text"><i class="bi bi-info-circle me-1"></i>This will be displayed on forms</div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label fw-bold d-flex align-items-center gap-2 mb-3">
                                <i class="bi bi-box text-primary"></i> Data Type <span class="text-danger">*</span>
                            </label>
                            <input type="hidden" id="cf-type" value="Text">
                            <div class="row g-2" id="field-type-grid">
                                ${fieldTypeOptions}
                            </div>
                        </div>

                        <!-- Options for Dropdown/Multi-select -->
                        <div class="mb-4 d-none" id="cf-options-container">
                            <label class="form-label fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-list-ul text-primary"></i> Dropdown Options <span class="text-danger">*</span>
                            </label>
                            <textarea id="cf-options" class="form-control advanced-field-input" rows="4" placeholder="Enter each option on a new line:
High
Medium  
Low"></textarea>
                            <div class="form-text"><i class="bi bi-info-circle me-1"></i>One option per line</div>
                        </div>
                    </div>

                    <!-- Advanced Settings -->
                    <div class="tab-pane fade" id="advanced-panel" role="tabpanel">
                        <div class="mb-4">
                            <label class="form-label fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-chat-left-text text-primary"></i> Help Text
                            </label>
                            <textarea id="cf-help" class="form-control advanced-field-input" rows="2" placeholder="Provide guidance to users filling this field..." onkeyup="updatePreview()"></textarea>
                            <div class="form-text">Appears below the field as helper text</div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-input-cursor text-primary"></i> Default Value
                            </label>
                            <input type="text" id="cf-default" class="form-control advanced-field-input" placeholder="Pre-filled value...">
                        </div>

                        <div class="mb-4">
                            <label class="form-label fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-sort-numeric-down text-primary"></i> Display Order
                            </label>
                            <input type="number" id="cf-order" class="form-control advanced-field-input" placeholder="1" value="1">
                            <div class="form-text">Lower numbers appear first</div>
                        </div>

                        <div class="form-check form-switch mb-3 p-3 bg-light rounded-3">
                            <input class="form-check-input" type="checkbox" id="cf-mandatory" onchange="updatePreview()">
                            <label class="form-check-label fw-bold" for="cf-mandatory">
                                <i class="bi bi-exclamation-circle text-warning me-1"></i> Required Field
                            </label>
                            <div class="form-text ms-4">Users must fill this field</div>
                        </div>

                        <div class="form-check form-switch mb-3 p-3 bg-light rounded-3">
                            <input class="form-check-input" type="checkbox" id="cf-unique">
                            <label class="form-check-label fw-bold" for="cf-unique">
                                <i class="bi bi-shield-check text-success me-1"></i> Unique Values
                            </label>
                            <div class="form-text ms-4">Prevent duplicate values across items</div>
                        </div>

                        <div class="form-check form-switch mb-3 p-3 bg-light rounded-3">
                            <input class="form-check-input" type="checkbox" id="cf-searchable" checked>
                            <label class="form-check-label fw-bold" for="cf-searchable">
                                <i class="bi bi-search text-info me-1"></i> Searchable
                            </label>
                            <div class="form-text ms-4">Include in global search</div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="tab-pane fade" id="preview-panel" role="tabpanel">
                        <div class="field-preview">
                            <div class="card border-0 shadow-sm">
                                <div class="card-body">
                                    <label class="form-label fw-bold mb-2">
                                        <span id="preview-label">Field Label</span>
                                        <span class="text-danger d-none" id="preview-required">*</span>
                                    </label>
                                    <input type="text" class="form-control mb-2" placeholder="Sample input field" readonly>
                                    <small class="text-muted" id="preview-help"></small>
                                    <div class="mt-3 p-3 bg-info bg-opacity-10 border border-info border-opacity-25 rounded">
                                        <strong>Field Type:</strong> <span id="preview-type" class="badge bg-primary ms-2">Text</span><br>
                                        <strong>Mandatory:</strong> <span id="preview-mandatory">No</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
    width: "700px",
    confirmButtonText: '<i class="bi bi-plus-lg me-2"></i>Create Field',
    cancelButtonText: '<i class="bi bi-x-lg me-2"></i>Cancel',
    confirmButtonColor: "#667eea",
    showCancelButton: true,
    customClass: {
      confirmButton: "btn btn-lg px-4 shadow-sm",
      cancelButton: "btn btn-lg btn-light px-4",
    },
    didOpen: () => {
      // Auto-select first field type
      const firstTypeCard = document.querySelector(".field-type-card");
      if (firstTypeCard) firstTypeCard.click();
    },
    preConfirm: async () => {
      const label = document.getElementById("cf-label").value.trim();
      const type = document.getElementById("cf-type").value;

      if (!label) return Swal.showValidationMessage("Field label is required");

      const optionsRaw = document.getElementById("cf-options").value;
      let options = null;
      if (type === "Dropdown" || type === "MultiSelect") {
        options = optionsRaw
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s);
        if (options.length === 0)
          return Swal.showValidationMessage(
            "Please provide at least one option"
          );
      }

      const mandatory = document.getElementById("cf-mandatory").checked;
      const defaultVal =
        document.getElementById("cf-default").value.trim() || null;

      try {
        await axios.post(`${ROOT_API_URL}/oms/settings/custom-fields`, {
          field_label: label,
          field_type: type,
          is_mandatory: mandatory,
          options: options,
          default_value: defaultVal,
        });
        return true;
      } catch (e) {
        Swal.showValidationMessage(
          e.response?.data?.detail || "Failed to create field"
        );
        return false;
      }
    },
  }).then((res) => {
    if (res.isConfirmed) {
      Swal.fire({
        icon: "success",
        title: "Field Created Successfully!",
        text: "Your custom field is now available.",
        timer: 2000,
        showConfirmButton: false,
      });
      renderItemSettings(); // Reload
    }
  });
}

// Helper for field type selection
function selectFieldType(type, element) {
  // Remove selected class from all
  document
    .querySelectorAll(".field-type-card")
    .forEach((card) => card.classList.remove("selected"));
  // Add to clicked
  element.classList.add("selected");
  // Set hidden input
  document.getElementById("cf-type").value = type;

  // Show/hide options based on type
  const optionsContainer = document.getElementById("cf-options-container");
  if (type === "Dropdown" || type === "MultiSelect") {
    optionsContainer.classList.remove("d-none");
  } else {
    optionsContainer.classList.add("d-none");
  }

  updatePreview();
}

// Update preview panel
function updatePreview() {
  const label = document.getElementById("cf-label")?.value || "Field Label";
  const type = document.getElementById("cf-type")?.value || "Text";
  const help = document.getElementById("cf-help")?.value || "";
  const mandatory = document.getElementById("cf-mandatory")?.checked || false;

  document.getElementById("preview-label").textContent = label;
  document.getElementById("preview-type").textContent = type;
  document.getElementById("preview-help").textContent = help;
  document.getElementById("preview-mandatory").textContent = mandatory
    ? "Yes"
    : "No";

  if (mandatory) {
    document.getElementById("preview-required").classList.remove("d-none");
  } else {
    document.getElementById("preview-required").classList.add("d-none");
  }
}

function toggleCfOptions(val) {
  const el = document.getElementById("cf-options-container");
  if (val === "Dropdown" || val === "MultiSelect")
    el.classList.remove("d-none");
  else el.classList.add("d-none");
}

async function deleteCustomField(id) {
  const res = await Swal.fire({
    title: "Delete Field?",
    text: "This will remove it from future items. Existing data remains.",
    icon: "warning",
    showCancelButton: true,
  });
  if (res.isConfirmed) {
    try {
      await axios.delete(`${ROOT_API_URL}/oms/settings/custom-fields/${id}`);
      renderItemSettings();
    } catch (e) {
      Swal.fire("Error", "Failed to delete", "error");
    }
  }
}

// Helpers for Settings
function filterSettingsFields(term) {
  term = term.toLowerCase();
  document.querySelectorAll(".field-item").forEach((el) => {
    const text = el.innerText.toLowerCase();
    el.style.display = text.includes(term) ? "block" : "none";
  });
}

function updateColumnSetting(key, checked) {
  let current =
    JSON.parse(localStorage.getItem("inventory_visible_columns")) ||
    DEFAULT_VISIBLE_COLUMNS;
  if (checked) {
    if (!current.includes(key)) current.push(key);
  } else {
    current = current.filter((k) => k !== key);
  }
  localStorage.setItem("inventory_visible_columns", JSON.stringify(current));
}

function saveItemSettings() {
  Swal.fire({
    icon: "success",
    title: "Settings Saved",
    text: "Your item configurations have been updated.",
    timer: 1500,
    showConfirmButton: false,
  });
}

// Bulk Action Functions
async function exportItems() {
  try {
    const res = await axios.get(
      `${ROOT_API_URL}/mango/inventory/products/export`,
      {
        responseType: "blob",
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "items_export.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();

    Swal.fire({
      icon: "success",
      title: "Export Successful!",
      text: "Your items have been exported to Excel.",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (e) {
    Swal.fire({
      icon: "error",
      title: "Export Failed",
      text: e.response?.data?.detail || "Failed to export items",
    });
  }
}

async function importItems() {
  const { value: file } = await Swal.fire({
    title:
      '<i class="bi bi-upload text-primary me-2"></i>Import Items from Excel',
    html: `
            <div class="text-start">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>How to Import:</strong>
                    <ol class="mb-0 mt-2">
                        <li>Download the template file below</li>
                        <li>Fill in your item data (remove sample rows)</li>
                        <li>Upload the completed Excel file</li>
                    </ol>
                </div>
                
                <div class="mb-3">
                    <button class="btn btn-sm btn-outline-primary w-100" id="download-template-btn" type="button">
                        <i class="bi bi-download me-2"></i>Download Sample Template
                    </button>
                </div>
                
                <div class="border rounded-3 p-4 text-center bg-light">
                    <i class="bi bi-file-earmark-excel fs-1 text-success mb-3 d-block"></i>
                    <input type="file" id="excel-file" class="form-control" accept=".xlsx,.xls">
                    <small class="text-muted d-block mt-2">Supports .xlsx and .xls files (Max 1000 rows)</small>
                </div>
            </div>
        `,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-upload me-2"></i>Upload & Import',
    cancelButtonText: "Cancel",
    confirmButtonColor: "#28a745",
    didOpen: () => {
      // Attach event listener to download button
      const downloadBtn = document.getElementById("download-template-btn");
      if (downloadBtn) {
        downloadBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          downloadBtn.disabled = true;
          downloadBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Downloading...';

          try {
            const res = await axios.get(
              `${ROOT_API_URL}/mango/inventory/products/template`,
              {
                responseType: "blob",
              }
            );

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "items_import_template.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            downloadBtn.innerHTML =
              '<i class="bi bi-check-circle me-2"></i>Downloaded!';
            setTimeout(() => {
              downloadBtn.innerHTML =
                '<i class="bi bi-download me-2"></i>Download Sample Template';
              downloadBtn.disabled = false;
            }, 2000);
          } catch (error) {
            console.error("Download error:", error);
            downloadBtn.innerHTML =
              '<i class="bi bi-x-circle me-2"></i>Download Failed';
            downloadBtn.disabled = false;

            Swal.showValidationMessage(
              `Failed to download template: ${
                error.response?.data?.detail || error.message
              }`
            );
          }
        });
      }
    },
    preConfirm: () => {
      const fileInput = document.getElementById("excel-file");
      if (!fileInput.files || !fileInput.files[0]) {
        Swal.showValidationMessage("Please select a file to upload");
        return false;
      }
      return fileInput.files[0];
    },
  });

  if (file) {
    const formData = new FormData();
    formData.append("file", file);

    // Show loading
    Swal.fire({
      title: "Importing...",
      html: '<div class="spinner-border text-primary" role="status"></div><p class="mt-3">Processing your file...</p>',
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    try {
      const res = await axios.post(
        `${ROOT_API_URL}/mango/inventory/products/import`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const result = res.data;

      let message = `
                <div class="text-start">
                    <div class="alert alert-success">
                        <strong><i class="bi bi-check-circle me-2"></i>Import Completed!</strong>
                    </div>
                    <ul class="list-unstyled mb-0">
                        <li><i class="bi bi-plus-circle text-success me-2"></i><strong>Created:</strong> ${
                          result.created
                        } items</li>
                        <li><i class="bi bi-arrow-repeat text-info me-2"></i><strong>Updated:</strong> ${
                          result.updated
                        } items</li>
                        ${
                          result.total_errors > 0
                            ? `<li><i class="bi bi-exclamation-triangle text-warning me-2"></i><strong>Errors:</strong> ${result.total_errors} rows</li>`
                            : ""
                        }
                    </ul>
                    ${
                      result.errors && result.errors.length > 0
                        ? `
                        <div class="mt-3">
                            <strong>Error Details:</strong>
                            <div class="alert alert-warning mt-2 small" style="max-height: 200px; overflow-y: auto;">
                                ${result.errors
                                  .map((err) => `<div>• ${err}</div>`)
                                  .join("")}
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;

      Swal.fire({
        icon: result.total_errors > 0 ? "warning" : "success",
        title: "Import Results",
        html: message,
        width: "600px",
        confirmButtonText: "OK",
      }).then(() => {
        // Reload products list
        loadSection("inventory_items");
      });
    } catch (e) {
      console.error("Import error:", e);

      let errorMsg =
        "Failed to import items. Please check your file format and try again.";
      let errorTitle = "Import Failed";

      if (e.response?.data?.detail) {
        const detail = e.response.data.detail;
        if (Array.isArray(detail)) {
          // Handle Pydantic validation errors (array of objects) or string arrays
          errorMsg = `<div class="text-danger text-start">
                        <strong>Validation Errors:</strong>
                        <ul class="mb-0 ps-3 mt-1 small">
                            ${detail
                              .map(
                                (d) =>
                                  `<li>${
                                    typeof d === "object"
                                      ? d.msg || JSON.stringify(d)
                                      : d
                                  }</li>`
                              )
                              .join("")}
                        </ul>
                     </div>`;
        } else if (typeof detail === "object") {
          errorMsg = JSON.stringify(detail);
        } else {
          errorMsg = detail;
        }
      } else if (e.message) {
        errorMsg = e.message;
      }

      Swal.fire({
        icon: "error",
        title: errorTitle,
        html: `<div class="text-start">${errorMsg}</div>`,
        width: "600px",
      });
    }
  }
}

// Helper to download template
async function downloadTemplate() {
  try {
    const res = await axios.get(
      `${ROOT_API_URL}/mango/inventory/products/template`,
      {
        responseType: "blob",
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "items_import_template.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();

    Swal.fire({
      icon: "success",
      title: "Template Downloaded!",
      text: "Check your downloads folder",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (e) {
    Swal.fire({
      icon: "error",
      title: "Download Failed",
      text: "Failed to download template",
    });
  }
}

function bulkUpdatePrices() {
  Swal.fire({
    icon: "info",
    title: "Bulk Update Prices",
    text: "Bulk price update functionality will be implemented soon.",
    confirmButtonText: "OK",
  });
}

function bulkUpdateStock() {
  Swal.fire({
    icon: "info",
    title: "Bulk Update Stock",
    text: "Bulk stock update functionality will be implemented soon.",
    confirmButtonText: "OK",
  });
}

function bulkDeleteItems() {
  Swal.fire({
    icon: "warning",
    title: "Bulk Delete",
    text: "Bulk delete functionality will be implemented soon.",
    confirmButtonText: "OK",
  });
}

// Edit Product Function - Opens the edit form with product data
async function editProduct(productId) {
  try {
    // Show loading
    Swal.fire({
      title: 'Loading...',
      text: 'Fetching product details',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Fetch product details
    const res = await axios.get(`${API_BASE_URL}/mango/inventory/products/${productId}`);
    const product = res.data;
    
    Swal.close();
    
    // Render the edit form with product data
    renderItemEditForm(product);
    
  } catch (err) {
    console.error('Failed to load product:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.response?.data?.detail || 'Failed to load product details'
    });
  }
}

// Render Item Edit Form (similar to creation form but pre-filled)
function renderItemEditForm(product) {
  const container = document.getElementById("inventory-content");
  if (!container) return;

  // Store product ID for update
  window.editingProductId = product.id;

  container.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light btn-icon rounded-circle shadow-sm" onclick="loadSection('inventory_items')" title="Close">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 class="fw-bold mb-0">Edit Item: ${product.name}</h4>
            <small class="text-muted">SKU: ${product.sku}</small>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary px-4" onclick="loadSection('inventory_items')">Discard</button>
          <button type="button" class="btn btn-primary px-4 fw-bold shadow-sm" onclick="submitItemUpdate()">
            <i class="bi bi-check-lg me-2"></i> Update Item
          </button>
        </div>
      </div>

      <!-- Form Tabs -->
      <ul class="nav nav-tabs mb-4" role="tablist">
        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tab-basic-edit">Basic Info</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-financial-edit">Financial</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-dimensions-edit">Dimensions</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-inventory-edit">Inventory Settings</a></li>
      </ul>

      <div class="tab-content">
        <!-- Basic Info Tab -->
        <div class="tab-pane fade show active" id="tab-basic-edit">
          <div class="card border-0 shadow-sm p-4">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label small text-muted">SKU / Item Code *</label>
                <input type="text" class="form-control" id="edit-sku" value="${product.sku || ''}" required>
              </div>
              <div class="col-md-6">
                <label class="form-label small text-muted">Item Name *</label>
                <input type="text" class="form-control" id="edit-name" value="${product.name || ''}" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted">Status</label>
                <select class="form-select" id="edit-item-status">
                  <option value="Active" ${product.item_status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Inactive" ${product.item_status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                  <option value="Discontinued" ${product.item_status === 'Discontinued' ? 'selected' : ''}>Discontinued</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small text-muted">Description</label>
                <textarea class="form-control" id="edit-description" rows="3">${product.description || ''}</textarea>
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Category</label>
                <input type="text" class="form-control" id="edit-category" value="${product.category || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Brand</label>
                <input type="text" class="form-control" id="edit-brand" value="${product.brand || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Item Type</label>
                <select class="form-select" id="edit-item-type">
                  <option value="Finished Goods" ${product.item_type === 'Finished Goods' ? 'selected' : ''}>Finished Goods</option>
                  <option value="Raw Material" ${product.item_type === 'Raw Material' ? 'selected' : ''}>Raw Material</option>
                  <option value="WIP" ${product.item_type === 'WIP' ? 'selected' : ''}>WIP</option>
                  <option value="Service" ${product.item_type === 'Service' ? 'selected' : ''}>Service</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Base UOM</label>
                <select class="form-select" id="edit-base-uom">
                  <option value="PC" ${product.base_uom === 'PC' ? 'selected' : ''}>PC (Piece)</option>
                  <option value="KG" ${product.base_uom === 'KG' ? 'selected' : ''}>KG</option>
                  <option value="LTR" ${product.base_uom === 'LTR' ? 'selected' : ''}>LTR (Litre)</option>
                  <option value="MTR" ${product.base_uom === 'MTR' ? 'selected' : ''}>MTR (Meter)</option>
                  <option value="BOX" ${product.base_uom === 'BOX' ? 'selected' : ''}>BOX</option>
                  <option value="SET" ${product.base_uom === 'SET' ? 'selected' : ''}>SET</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">HSN/SAC Code</label>
                <input type="text" class="form-control" id="edit-hsn-sac" value="${product.hsn_sac || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Country of Origin</label>
                <input type="text" class="form-control" id="edit-country-origin" value="${product.country_of_origin || 'India'}">
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Tab -->
        <div class="tab-pane fade" id="tab-financial-edit">
          <div class="card border-0 shadow-sm p-4">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label small text-muted">Purchase Rate (₹)</label>
                <input type="number" class="form-control" id="edit-purchase-rate" step="0.01" value="${product.purchase_rate || 0}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Sales Rate (₹)</label>
                <input type="number" class="form-control" id="edit-sales-rate" step="0.01" value="${product.sales_rate || 0}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Default Margin (%)</label>
                <input type="number" class="form-control" id="edit-margin" step="0.01" value="${product.default_margin_percent || 0}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Intra-State Tax Rate</label>
                <input type="text" class="form-control" id="edit-intra-tax" placeholder="e.g., 18%" value="${product.intra_state_tax_rate || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Inter-State Tax Rate</label>
                <input type="text" class="form-control" id="edit-inter-tax" placeholder="e.g., 18%" value="${product.inter_state_tax_rate || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Costing Method</label>
                <select class="form-select" id="edit-costing-method">
                  <option value="Weighted Average" ${product.costing_method === 'Weighted Average' ? 'selected' : ''}>Weighted Average</option>
                  <option value="FIFO" ${product.costing_method === 'FIFO' ? 'selected' : ''}>FIFO</option>
                  <option value="Standard Cost" ${product.costing_method === 'Standard Cost' ? 'selected' : ''}>Standard Cost</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Dimensions Tab -->
        <div class="tab-pane fade" id="tab-dimensions-edit">
          <div class="card border-0 shadow-sm p-4">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label small text-muted">Weight (kg)</label>
                <input type="number" class="form-control" id="edit-weight" step="0.01" value="${product.weight_kg || 0}">
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted">Length (cm)</label>
                <input type="number" class="form-control" id="edit-length" step="0.01" value="${product.length_cm || 0}">
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted">Width (cm)</label>
                <input type="number" class="form-control" id="edit-width" step="0.01" value="${product.width_cm || 0}">
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted">Height (cm)</label>
                <input type="number" class="form-control" id="edit-height" step="0.01" value="${product.height_cm || 0}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Color</label>
                <input type="text" class="form-control" id="edit-color" value="${product.color || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Size</label>
                <input type="text" class="form-control" id="edit-size" value="${product.size || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Material</label>
                <input type="text" class="form-control" id="edit-material" value="${product.material || ''}">
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Settings Tab -->
        <div class="tab-pane fade" id="tab-inventory-edit">
          <div class="card border-0 shadow-sm p-4">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label small text-muted">Min Order Qty</label>
                <input type="number" class="form-control" id="edit-min-order" value="${product.min_order_qty || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Max Order Qty</label>
                <input type="number" class="form-control" id="edit-max-order" value="${product.max_order_qty || ''}">
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Reorder Level</label>
                <input type="number" class="form-control" id="edit-reorder-level" value="${product.reorder_level || ''}">
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch mt-3">
                  <input class="form-check-input" type="checkbox" id="edit-batch-tracking" ${product.batch_tracking_flag ? 'checked' : ''}>
                  <label class="form-check-label">Batch Tracking</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch mt-3">
                  <input class="form-check-input" type="checkbox" id="edit-serial-tracking" ${product.serial_tracking_flag ? 'checked' : ''}>
                  <label class="form-check-label">Serial Number Tracking</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="edit-expiry-tracking" ${product.expiry_tracking_flag ? 'checked' : ''}>
                  <label class="form-check-label">Expiry Date Tracking</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="edit-hazardous" ${product.hazardous_flag ? 'checked' : ''}>
                  <label class="form-check-label">Hazardous Item</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Submit Item Update
async function submitItemUpdate() {
  const productId = window.editingProductId;
  if (!productId) {
    Swal.fire('Error', 'No product selected for editing', 'error');
    return;
  }

  // Validate required fields
  const sku = document.getElementById('edit-sku')?.value?.trim();
  const name = document.getElementById('edit-name')?.value?.trim();

  if (!sku || !name) {
    Swal.fire('Validation Error', 'SKU and Name are required', 'warning');
    return;
  }

  const updateData = {
    sku: sku,
    name: name,
    description: document.getElementById('edit-description')?.value || '',
    category: document.getElementById('edit-category')?.value || '',
    brand: document.getElementById('edit-brand')?.value || '',
    item_type: document.getElementById('edit-item-type')?.value || 'Finished Goods',
    item_status: document.getElementById('edit-item-status')?.value || 'Active',
    base_uom: document.getElementById('edit-base-uom')?.value || 'PC',
    hsn_sac: document.getElementById('edit-hsn-sac')?.value || '',
    country_of_origin: document.getElementById('edit-country-origin')?.value || 'India',
    purchase_rate: parseFloat(document.getElementById('edit-purchase-rate')?.value) || 0,
    sales_rate: parseFloat(document.getElementById('edit-sales-rate')?.value) || 0,
    default_margin_percent: parseFloat(document.getElementById('edit-margin')?.value) || 0,
    intra_state_tax_rate: document.getElementById('edit-intra-tax')?.value || '',
    inter_state_tax_rate: document.getElementById('edit-inter-tax')?.value || '',
    costing_method: document.getElementById('edit-costing-method')?.value || 'Weighted Average',
    weight_kg: parseFloat(document.getElementById('edit-weight')?.value) || 0,
    length_cm: parseFloat(document.getElementById('edit-length')?.value) || 0,
    width_cm: parseFloat(document.getElementById('edit-width')?.value) || 0,
    height_cm: parseFloat(document.getElementById('edit-height')?.value) || 0,
    color: document.getElementById('edit-color')?.value || '',
    size: document.getElementById('edit-size')?.value || '',
    material: document.getElementById('edit-material')?.value || '',
    min_order_qty: parseFloat(document.getElementById('edit-min-order')?.value) || null,
    max_order_qty: parseFloat(document.getElementById('edit-max-order')?.value) || null,
    reorder_level: parseFloat(document.getElementById('edit-reorder-level')?.value) || null,
    batch_tracking_flag: document.getElementById('edit-batch-tracking')?.checked || false,
    serial_tracking_flag: document.getElementById('edit-serial-tracking')?.checked || false,
    expiry_tracking_flag: document.getElementById('edit-expiry-tracking')?.checked || false,
    hazardous_flag: document.getElementById('edit-hazardous')?.checked || false,
  };

  try {
    Swal.fire({
      title: 'Updating...',
      text: 'Please wait while the item is being updated',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await axios.put(`${API_BASE_URL}/mango/inventory/products/${productId}`, updateData);

    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Item updated successfully!',
      timer: 1500,
      showConfirmButton: false
    });

    // Clear editing state and reload list
    window.editingProductId = null;
    loadSection('inventory_items');

  } catch (err) {
    console.error('Update failed:', err);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: err.response?.data?.detail || 'Failed to update item'
    });
  }
}

// Delete Product Function
async function deleteProduct(productId, productName) {
  const result = await Swal.fire({
    title: "Delete Product?",
    html: `Are you sure you want to delete <strong>${productName}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: '<i class="bi bi-trash me-2"></i>Yes, Delete',
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(
        `${ROOT_API_URL}/mango/inventory/products/${productId}`
      );

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Product has been deleted successfully.",
        timer: 2000,
        showConfirmButton: false,
      });

      // Reload product list
      loadSection("inventory_items");
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: e.response?.data?.detail || "Failed to delete product",
      });
    }
  }
}

// Item Filter Functions
function applyItemFilters() {
  const searchText = (
    document.getElementById("filter-search")?.value || ""
  ).toLowerCase();
  const skuFilter = document.getElementById("filter-sku")?.value || "";
  const statusFilter = document.getElementById("filter-status")?.value || "";

  const rows = document.querySelectorAll(".items-table tbody tr");
  let visibleCount = 0;

  rows.forEach((row) => {
    const sku = row.dataset.sku || "";
    const status = row.dataset.status || "";

    // Get all text content from the row for search
    const rowText = row.textContent.toLowerCase();

    const searchMatch = !searchText || rowText.includes(searchText);
    const skuMatch = !skuFilter || sku === skuFilter;
    const statusMatch = !statusFilter || status === statusFilter;

    if (searchMatch && skuMatch && statusMatch) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });

  // Update count
  const countBadge = document.getElementById("filtered-count");
  if (countBadge) {
    countBadge.textContent = `${visibleCount} items`;
  }
}

function clearItemFilters() {
  const searchInput = document.getElementById("filter-search");
  const skuFilter = document.getElementById("filter-sku");
  const statusFilter = document.getElementById("filter-status");

  if (searchInput) searchInput.value = "";
  if (skuFilter) skuFilter.value = "";
  if (statusFilter) statusFilter.value = "";

  applyItemFilters();
}

// OMS Configuration Functions (moved from channel_settings.js)
async function loadOMSConfigMain() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/mango/channel/oms-config`
    );
    renderOMSConfigMain(response.data.configs);
  } catch (error) {
    console.error("Error loading OMS config:", error);
    document.getElementById("oms-config-container-main").innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load OMS configuration
      </div>
    `;
  }
}

function renderOMSConfigMain(configs) {
  const container = document.getElementById("oms-config-container-main");

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
                id="oms-toggle-main-${config.platform}"
                ${config.sync_enabled ? "checked" : ""}
                onchange="toggleOMSSyncMain('${config.platform}', this.checked)"
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

async function toggleOMSSyncMain(platform, enable) {
  const checkbox = document.getElementById(`oms-toggle-main-${platform}`);
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
    loadOMSConfigMain();
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

// OMS Integration Settings
function renderOMSIntegrationSettings(container) {
  container.innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="bi bi-cloud-arrow-up me-2"></i>OMS Integration Configuration</h5>
      </div>
      <div class="card-body">
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Hybrid Order Management</h6>
          <p class="mb-2">Toggle between two modes for each platform:</p>
          <ul class="mb-2">
            <li><strong>OMS Sync OFF (Default)</strong>: Use Excel uploads with custom fields (Mango System)</li>
            <li><strong>OMS Sync ON</strong>: Live integration with main OMS platform for real-time orders</li>
          </ul>
          <small class="text-muted">You can enable different modes for different platforms!</small>
        </div>
        <div id="oms-config-container-main">
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
  loadOMSConfigMain();
}

// Additional Settings Functions
function renderUsersSettings(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      <h5><i class="bi bi-people me-2"></i>Users & Roles Management</h5>
      <p>User management is available through the main Javelin Portal. Please use the admin panel to manage users and roles.</p>
      <a href="/admin" class="btn btn-primary btn-sm mt-2" target="_blank">Open Admin Panel</a>
    </div>
  `;
}

function renderPreferencesSettings(container) {
  container.innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="bi bi-sliders me-2"></i>Application Preferences</h5>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          <p class="mb-0">Most preferences are managed through Organization Profile settings. <a href="#" onclick="navigateToSettings('general')">Go to Profile & Branding</a></p>
        </div>
      </div>
    </div>
  `;
}

function renderNotificationsSettings(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      <h5><i class="bi bi-bell me-2"></i>Notification Settings</h5>
      <p>Notification preferences will be available in a future update.</p>
    </div>
  `;
}

function renderPermissionsSettings(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      <h5><i class="bi bi-shield-lock me-2"></i>Permissions Management</h5>
      <p>Permission management is available through the main Javelin Portal. Please use the admin panel to manage permissions.</p>
      <a href="/admin" class="btn btn-primary btn-sm mt-2" target="_blank">Open Admin Panel</a>
    </div>
  `;
}

function renderBackupSettings(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      <h5><i class="bi bi-cloud-upload me-2"></i>Backup & Export</h5>
      <p>Data backup and export features will be available in a future update.</p>
    </div>
  `;
}

function renderReportsSettings(container) {
  container.innerHTML = `
    <div class="alert alert-info">
      <h5><i class="bi bi-file-earmark-bar-graph me-2"></i>Report Settings</h5>
      <p>Report configuration settings will be available in a future update.</p>
    </div>
  `;
}

function renderTaxSettings(container) {
  container.innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="bi bi-receipt me-2"></i>Taxes & Compliance</h5>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          <p class="mb-0">Tax settings are configured at the product level. Manage tax rates in the <a href="#" onclick="loadSection('inventory')">Inventory</a> section when creating or editing products.</p>
        </div>
      </div>
    </div>
  `;
}

// Toggle OMS Sync
async function toggleOMSSync(platform, checkbox) {
  const originalState = checkbox.checked;
  const syncEnabled = checkbox.checked;
  
  try {
    const token = localStorage.getItem("access_token");
    await axios.post(
      `${API_BASE_URL}/api/mango/oms-config/toggle`,
      { platform, sync_enabled: syncEnabled },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    Swal.fire({
      icon: "success",
      title: "Configuration Updated",
      text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} OMS sync ${syncEnabled ? "enabled" : "disabled"}`,
      timer: 2000,
      showConfirmButton: false
    });
    
    // Reload config to update UI
    loadOMSConfigMain();
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

// Load OMS Config Main
async function loadOMSConfigMain() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/oms-config`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const configs = response.data.configs || [];
    const container = document.getElementById("oms-config-container-main");
    
    if (!container) return;
    
    if (configs.length === 0) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <p class="mb-0">No platform configurations found.</p>
        </div>
      `;
      return;
    }
    
    const platformIcons = {
      amazon: "bi-shop",
      flipkart: "bi-bag",
      meesho: "bi-box",
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
    
    container.innerHTML = configs.map((config) => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-3">
              <h6 class="mb-0">
                <i class="bi ${platformIcons[config.platform] || "bi-shop"} me-2 text-${platformColors[config.platform]}"></i>
                ${config.platform.charAt(0).toUpperCase() + config.platform.slice(1)}
              </h6>
            </div>
            <div class="col-md-4">
              <div class="d-flex align-items-center">
                <span class="badge ${config.sync_enabled ? "bg-success" : "bg-secondary"} me-2">
                  ${config.sync_enabled ? "🟢 OMS Sync ON" : "🔴 OMS Sync OFF"}
                </span>
                <small class="text-muted">
                  ${config.sync_enabled ? "Using live OMS data" : "Using Excel uploads"}
                </small>
              </div>
            </div>
            <div class="col-md-3">
              ${config.last_sync_at ? `
                <small class="text-muted">
                  Last sync: ${new Date(config.last_sync_at).toLocaleString()}
                </small>
              ` : '<small class="text-muted">Never synced</small>'}
            </div>
            <div class="col-md-2 text-end">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" 
                       ${config.sync_enabled ? "checked" : ""}
                       onchange="toggleOMSSync('${config.platform}', this)">
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    const container = document.getElementById("oms-config-container-main");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <p class="mb-0">Failed to load OMS configuration: ${error.message}</p>
        </div>
      `;
    }
  }
}
