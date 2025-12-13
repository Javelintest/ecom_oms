// Adjust this if your backend runs on a different host/port
const API_BASE_URL = "http://127.0.0.1:8000";

let platforms = [];

// ===== SIDEBAR NAVIGATION =====
const sidebar = document.getElementById('sidebar');
const sidebarOpen = document.getElementById('sidebar-open');
const sidebarClose = document.getElementById('sidebar-close');

// Mobile sidebar toggle
sidebarOpen?.addEventListener('click', () => {
  sidebar?.classList.add('open');
});

sidebarClose?.addEventListener('click', () => {
  sidebar?.classList.remove('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth < 992) {
    if (sidebar?.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !sidebarOpen?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// Section navigation from sidebar
const sectionNavLinks = document.querySelectorAll(".sidebar-nav .nav-link[data-section]");
const sections = document.querySelectorAll(".section-block");
const pageTitle = document.getElementById('page-title');

sectionNavLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.getAttribute("data-section");
    
    // Update active state
    sectionNavLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    // Show/hide sections
    sections.forEach((sec) => sec.classList.add("d-none"));
    const targetSection = document.getElementById(`section-${target}`);
    if (targetSection) {
      targetSection.classList.remove("d-none");
    }

    // Update page title
    if (pageTitle) {
      pageTitle.textContent = link.querySelector('span')?.textContent || target;
    }

    // Load data for section
    if (target === "dashboard") {
      loadDashboard();
    } else if (target === "orders") {
      loadOrders();
    } else if (target === "inventory") {
      loadInventory();
    } else if (target === "platforms") {
      loadPlatforms();
    }

    // Close mobile sidebar
    sidebar?.classList.remove('open');
  });
});

// Handle hash navigation (for links from other pages)
function handleHashNavigation() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const link = document.querySelector(`.sidebar-nav .nav-link[data-section="${hash}"]`);
    if (link) {
      link.click();
    }
  }
}

window.addEventListener('hashchange', handleHashNavigation);

// Load platforms list
async function loadPlatformsList() {
  try {
    const res = await axios.get(`${API_BASE_URL}/platforms/`);
    platforms = res.data;
    
    // Populate platform filters
    const filters = ["dashboard-platform-filter", "orders-platform-filter", "inventory-platform-filter"];
    filters.forEach(filterId => {
      const select = document.getElementById(filterId);
      if (select) {
        // Keep "All Platforms" option and add platform options
        const allOption = select.querySelector('option[value=""]');
        select.innerHTML = "";
        if (allOption) select.appendChild(allOption);
        
        platforms.forEach(p => {
          const option = document.createElement("option");
          option.value = p.id;
          option.textContent = p.display_name;
          select.appendChild(option);
        });
      }
    });
  } catch (err) {
    console.error("Failed to load platforms", err);
  }
}

let orderStatusChart = null;
let platformRevenueChart = null;

async function loadDashboard() {
  try {
    const platformFilter = document.getElementById("dashboard-platform-filter")?.value || "";
    const startDate = document.getElementById("start-date")?.value || "";
    const endDate = document.getElementById("end-date")?.value || "";
    
    // Build URL with filters
    const params = new URLSearchParams();
    if (platformFilter) params.append("platform_id", platformFilter);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    
    const url = `${API_BASE_URL}/dashboard/summary${params.toString() ? '?' + params.toString() : ''}`;
    
    const res = await axios.get(url);
    const data = res.data;
    
    // Render KPI Cards
    renderKPICards(data);
    
    // Render Charts
    renderOrderStatusChart(data.order_status_distribution || {});
    renderPlatformRevenueChart(data.platform_breakdown || []);
    
    // Render Platform Performance Table
    renderPlatformPerformanceTable(data.platform_breakdown || [], data.avg_order_value || 0);
    
    // Render Inventory Summary
    renderInventorySummary(data.inventory || {});
    
    // Render Recent Orders
    renderRecentOrders(data.recent_orders || []);
    
  } catch (err) {
    console.error("Dashboard load failed", err);
    showDashboardError();
  }
}

function renderKPICards(data) {
  const container = document.getElementById("dashboard-kpi-cards");
  if (!container) return;
  
    container.innerHTML = "";

  const kpiCards = [
      {
        label: "Total Orders",
      value: data.total_orders || 0,
      icon: "bi-cart-check-fill",
      color: "primary",
      change: "+12%"
      },
      {
        label: "Total Revenue",
      value: "₹ " + (data.total_revenue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      icon: "bi-currency-rupee",
      color: "success",
      change: "+8.5%"
    },
    {
      label: "Avg Order Value",
      value: "₹ " + (data.avg_order_value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      icon: "bi-graph-up-arrow",
      color: "info",
      change: "+5.2%"
      },
      {
        label: "Pending Orders",
      value: data.pending_orders || 0,
      icon: "bi-clock-fill",
      color: "warning",
      change: null
      },
      {
        label: "Shipped Orders",
      value: data.shipped_orders || 0,
      icon: "bi-truck",
      color: "info",
      change: null
      },
      {
      label: "Delivered",
        value: data.delivered_orders || 0,
      icon: "bi-check-circle-fill",
      color: "success",
      change: data.delivery_rate ? `${data.delivery_rate.toFixed(1)}%` : null
    }
    ];

  kpiCards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.className = `card-kpi ${card.color}`;
    cardElement.innerHTML = `
      <div class="kpi-icon"><i class="bi ${card.icon}"></i></div>
      <h5>${card.label}</h5>
      <div class="value">${card.value}</div>
      ${card.change ? `<div class="change"><i class="bi bi-arrow-up"></i> ${card.change}</div>` : ''}
    `;
    container.appendChild(cardElement);
  });
}

function renderOrderStatusChart(statusData) {
  const ctx = document.getElementById('orderStatusChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (orderStatusChart) {
    orderStatusChart.destroy();
  }
  
  const labels = Object.keys(statusData);
  const values = Object.values(statusData);
  const colors = {
    'Pending': '#f59e0b',
    'Shipped': '#3b82f6',
    'Delivered': '#10b981',
    'Cancelled': '#ef4444'
  };
  
  orderStatusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(l => colors[l] || '#6b7280'),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1
        }
      }
    }
  });
}

function renderPlatformRevenueChart(platformData) {
  const ctx = document.getElementById('platformRevenueChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (platformRevenueChart) {
    platformRevenueChart.destroy();
  }
  
  const labels = platformData.map(p => p.platform_name);
  const revenues = platformData.map(p => p.revenue || 0);
  const orderCounts = platformData.map(p => p.order_count || 0);
  
  platformRevenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: revenues,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Orders',
          data: orderCounts,
          type: 'line',
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#e5e7eb',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.1)'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.1)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            drawOnChartArea: false,
          }
        }
      }
    }
  });
}

function renderPlatformPerformanceTable(platformData, avgOrderValue) {
  const tbody = document.getElementById("platform-performance-table");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (platformData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No platform data available</td></tr>';
    return;
  }
  
  platformData.forEach(p => {
    const avgOrder = p.order_count > 0 ? (p.revenue / p.order_count) : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="badge bg-primary px-3 py-1">${p.platform_name}</span>
      </td>
      <td class="text-end fw-semibold">${p.order_count || 0}</td>
      <td class="text-end fw-semibold">₹ ${(p.revenue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td class="text-end fw-semibold">₹ ${avgOrder.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderInventorySummary(inventory) {
  const container = document.getElementById("inventory-summary-cards");
  if (!container) return;
  
  container.innerHTML = "";
  
  const inventoryItems = [
    {
      label: "Total SKUs",
      value: inventory.total_skus || 0,
      icon: "bi-box"
    },
    {
      label: "Total Quantity",
      value: inventory.total_quantity || 0,
      icon: "bi-stack"
    },
    {
      label: "Available",
      value: inventory.available_quantity || 0,
      icon: "bi-check-circle"
    },
    {
      label: "Reserved",
      value: inventory.reserved_quantity || 0,
      icon: "bi-lock"
    }
  ];
  
  inventoryItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "inventory-card";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="label">${item.label}</div>
          <div class="value">${item.value.toLocaleString('en-IN')}</div>
        </div>
        <i class="bi ${item.icon}" style="font-size: 1.5rem; opacity: 0.5;"></i>
          </div>
        `;
    container.appendChild(card);
      });
    }

function renderRecentOrders(orders) {
  const tbody = document.getElementById("recent-orders-table");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No recent orders</td></tr>';
    return;
  }
  
  orders.forEach(order => {
    const tr = document.createElement("tr");
    const purchaseDate = order.purchase_date ? new Date(order.purchase_date).toLocaleDateString() : "N/A";
    tr.innerHTML = `
      <td><span class="badge bg-primary px-3 py-1">${order.platform}</span></td>
      <td><code>${order.platform_order_id}</code></td>
      <td><span class="badge bg-${getStatusColor(order.status)} px-3 py-1">${order.status}</span></td>
      <td class="text-end fw-semibold">${order.currency || "₹"} ${parseFloat(order.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td class="text-muted">${purchaseDate}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showDashboardError() {
  const container = document.getElementById("dashboard-kpi-cards");
  if (container) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load dashboard data. Please try refreshing the page.
          </div>
        </div>
      `;
  }
}

async function loadOrders() {
  try {
    const platformFilter = document.getElementById("orders-platform-filter")?.value || "";
    const url = platformFilter 
      ? `${API_BASE_URL}/orders/?platform_id=${platformFilter}`
      : `${API_BASE_URL}/orders/`;
    
    const res = await axios.get(url);
    const tbody = document.querySelector("#orders-table tbody");
    tbody.innerHTML = "";
    
    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No orders found</td></tr>`;
      return;
    }
    
    res.data.forEach((o) => {
      const tr = document.createElement("tr");
      const purchaseDate = o.purchase_date ? new Date(o.purchase_date).toLocaleString() : "";
      tr.innerHTML = `
        <td><span class="badge bg-primary">${o.platform}</span></td>
        <td>${o.platform_order_id}</td>
        <td>${o.customer_name || "N/A"}</td>
        <td><span class="badge bg-${getStatusColor(o.status)}">${o.status}</span></td>
        <td>${purchaseDate}</td>
        <td>${o.currency || "₹"} ${parseFloat(o.order_total || 0).toFixed(2)}</td>
        <td>${o.currency || "INR"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Orders load failed", err);
  }
}

async function loadInventory() {
  try {
    const platformFilter = document.getElementById("inventory-platform-filter")?.value || "";
    const url = platformFilter 
      ? `${API_BASE_URL}/inventory/?platform_id=${platformFilter}`
      : `${API_BASE_URL}/inventory/`;
    
    const res = await axios.get(url);
    const tbody = document.querySelector("#inventory-table tbody");
    tbody.innerHTML = "";
    
    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No inventory found</td></tr>`;
      return;
    }
    
    res.data.forEach((i) => {
      const tr = document.createElement("tr");
      const updatedAt = i.updated_at ? new Date(i.updated_at).toLocaleString() : "";
      tr.innerHTML = `
        <td><span class="badge bg-primary">${i.platform}</span></td>
        <td>${i.sku}</td>
        <td>${i.product_id || "N/A"}</td>
        <td>${i.product_name || "N/A"}</td>
        <td>${i.total_quantity || 0}</td>
        <td>${i.available_quantity || 0}</td>
        <td>${i.reserved_quantity || 0}</td>
        <td>${updatedAt}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Inventory load failed", err);
  }
}

async function loadPlatforms() {
  try {
    const res = await axios.get(`${API_BASE_URL}/platforms/`);
    const tbody = document.querySelector("#platforms-table tbody");
    tbody.innerHTML = "";
    
    res.data.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.display_name}</td>
        <td>
          <span class="badge bg-${p.is_active ? 'success' : 'secondary'}">
            ${p.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="togglePlatform(${p.id})">
            ${p.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Platforms load failed", err);
  }
}

function getStatusColor(status) {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("pending") || statusLower.includes("confirmed")) return "warning";
  if (statusLower.includes("shipped") || statusLower.includes("dispatched")) return "info";
  if (statusLower.includes("delivered") || statusLower.includes("completed")) return "success";
  if (statusLower.includes("cancelled") || statusLower.includes("returned")) return "danger";
  return "secondary";
}

async function togglePlatform(platformId) {
  try {
    await axios.put(`${API_BASE_URL}/platforms/${platformId}/toggle`);
    await loadPlatforms();
    await loadPlatformsList();
  } catch (err) {
    console.error("Toggle platform failed", err);
    alert("Failed to toggle platform status");
  }
}

// Make togglePlatform available globally
window.togglePlatform = togglePlatform;

// ===== DATE FILTER FUNCTIONALITY =====
function setupDateFilters() {
  const dateFilterButtons = document.querySelectorAll('.btn-date-filter');
  const customDateRange = document.getElementById('custom-date-range');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  
  // Set today as default end date
  if (endDateInput) {
    const today = new Date().toISOString().split('T')[0];
    endDateInput.value = today;
    endDateInput.max = today;
  }
  
  if (startDateInput) {
    startDateInput.max = new Date().toISOString().split('T')[0];
  }
  
  dateFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      dateFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const range = btn.getAttribute('data-range');
      const today = new Date();
      let startDate = '';
      let endDate = new Date().toISOString().split('T')[0];
      
      if (range === 'today') {
        startDate = endDate;
        customDateRange.style.display = 'none';
      } else if (range === '10days') {
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        startDate = tenDaysAgo.toISOString().split('T')[0];
        customDateRange.style.display = 'none';
      } else if (range === 'month') {
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        startDate = oneMonthAgo.toISOString().split('T')[0];
        customDateRange.style.display = 'none';
      } else if (range === 'custom') {
        customDateRange.style.display = 'flex';
        startDate = startDateInput?.value || '';
        endDate = endDateInput?.value || endDate;
        return; // Don't load dashboard yet, wait for user to select dates
      }
      
      // Set date inputs
      if (startDateInput) startDateInput.value = startDate;
      if (endDateInput) endDateInput.value = endDate;
      
      // Load dashboard with new date range
      loadDashboard();
    });
  });
  
  // Custom date range inputs
  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      const customBtn = document.querySelector('.btn-date-filter[data-range="custom"]');
      if (customBtn && customDateRange.style.display === 'flex') {
        customBtn.classList.add('active');
        loadDashboard();
      }
    });
  }
  
  if (endDateInput) {
    endDateInput.addEventListener('change', () => {
      const customBtn = document.querySelector('.btn-date-filter[data-range="custom"]');
      if (customBtn && customDateRange.style.display === 'flex') {
        customBtn.classList.add('active');
        loadDashboard();
      }
    });
  }
  
  // Set default to "Last 10 Days"
  const defaultBtn = document.querySelector('.btn-date-filter[data-range="10days"]');
  if (defaultBtn) {
    defaultBtn.click();
  }
}

// Event listeners for filters
document.getElementById("dashboard-platform-filter")?.addEventListener("change", loadDashboard);
document.getElementById("orders-platform-filter")?.addEventListener("change", loadOrders);
document.getElementById("inventory-platform-filter")?.addEventListener("change", loadInventory);

// Refresh dashboard buttons (both top navbar and header)
function setupRefreshButtons() {
  const refreshButtons = [
    document.getElementById("btn-refresh-dashboard"),
    document.getElementById("btn-refresh-dashboard-header")
  ];
  
  refreshButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener("click", () => {
        const icon = btn.querySelector('i');
        if (icon) icon.classList.add('spin');
        loadDashboard().then(() => {
          setTimeout(() => {
            if (icon) icon.classList.remove('spin');
          }, 500);
        });
      });
    }
  });
}

setupRefreshButtons();

document.getElementById("btn-sync-orders")?.addEventListener("click", async () => {
  try {
    const btn = document.getElementById("btn-sync-orders");
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>Syncing...';
    
    const res = await axios.post(`${API_BASE_URL}/orders/sync`);
    await loadOrders();
    await loadDashboard();
    
    const message = `Orders synced successfully!\nTotal inserted: ${res.data.total_inserted}\nPlatforms: ${JSON.stringify(res.data.platforms, null, 2)}`;
    alert(message);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sync All Orders';
  } catch (err) {
    console.error("Sync orders failed", err);
    alert("Failed to sync orders: " + (err.response?.data?.detail || err.message));
    const btn = document.getElementById("btn-sync-orders");
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sync All Orders';
  }
});

document.getElementById("btn-sync-inventory")?.addEventListener("click", async () => {
  try {
    const btn = document.getElementById("btn-sync-inventory");
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>Syncing...';
    
    const res = await axios.post(`${API_BASE_URL}/inventory/sync`);
    await loadInventory();
    
    const message = `Inventory synced successfully!\nTotal upserted: ${res.data.total_upserted}\nPlatforms: ${JSON.stringify(res.data.platforms, null, 2)}`;
    alert(message);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sync All Inventory';
  } catch (err) {
    console.error("Sync inventory failed", err);
    alert("Failed to sync inventory: " + (err.response?.data?.detail || err.message));
    const btn = document.getElementById("btn-sync-inventory");
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sync All Inventory';
  }
});

// ===== THEME MANAGEMENT =====
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
  const themeIcon = document.getElementById('theme-icon');
  const themeIconNav = document.getElementById('theme-icon-nav');
  const themeTextNav = document.getElementById('theme-text-nav');
  
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    if (themeIcon) {
      themeIcon.classList.remove('bi-moon-fill');
      themeIcon.classList.add('bi-sun-fill');
    }
    if (themeIconNav) {
      themeIconNav.classList.remove('bi-moon-stars');
      themeIconNav.classList.add('bi-sun');
    }
    if (themeTextNav) {
      themeTextNav.textContent = 'Light Mode';
    }
  } else {
    document.body.classList.remove('light-mode');
    if (themeIcon) {
      themeIcon.classList.remove('bi-sun-fill');
      themeIcon.classList.add('bi-moon-fill');
    }
    if (themeIconNav) {
      themeIconNav.classList.remove('bi-sun');
      themeIconNav.classList.add('bi-moon-stars');
  }
    if (themeTextNav) {
      themeTextNav.textContent = 'Dark Mode';
    }
  }
}

// Theme toggle buttons
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-nav')?.addEventListener('click', (e) => {
  e.preventDefault();
  toggleTheme();
});

// Initialize theme on page load
initializeTheme();

// Initial load
loadPlatformsList().then(() => {
  setupDateFilters();
  loadDashboard();
  handleHashNavigation();
});
