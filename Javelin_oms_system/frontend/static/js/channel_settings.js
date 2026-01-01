/**
 * Advanced Channel Configuration Module
 * Full-page interface for managing channel settings,
 * headers, and dispatch mappings
 */

// API_BASE_URL is already defined in mango.js (which loads before this file)
// No need to redeclare it here - it's available globally

const channelConfigState = {
  currentPlatform: "amazon", // Will be set when opening a channel
  currentPlatformName: "", // Store name for display
  selectedTableId: null, // Track which table is currently selected (numeric ID, not "default")
  viewMode: "landing", // 'landing' or 'detail'
  headers: [],
  mappings: [],
  uploadedFile: null,
  detectedFields: [],
};

const AVAILABLE_PLATFORMS = [];
/*
  Predefined platforms removed for isolated Mango instance.
  Users should create custom channels via "Create Custom Channel".
*/

/**
 * Render channel settings page
 */
async function renderChannelSettings(container, channelId = null) {
  if (!container)
    container =
      document.getElementById("dynamic-content") ||
      document.getElementById("main-content");
  if (!container) {
    console.error("renderChannelSettings: Container not found!");
    return;
  }
  console.log(
    "renderChannelSettings: Rendering into",
    container,
    "with ID:",
    channelId
  );

  // Clear container
  container.innerHTML = "";

  // If channelId is passed (from URL router), set state
  if (channelId) {
    channelConfigState.currentPlatform = channelId;
    // Optimistically set name or fetch it. For now, defaulting logic inside renderChannelDetailPage handles it.
    // But we should ideally fetch the name if not set.
    channelConfigState.viewMode = "detail";
  } else if (
    channelConfigState.currentPlatform &&
    channelConfigState.viewMode === "detail"
  ) {
    // Logic for keeping state if no ID passed but state exists (internal navigation)
  } else {
    channelConfigState.viewMode = "landing";
  }

  try {
    if (channelConfigState.viewMode === "landing") {
      renderChannelLandingPage(container);
    } else {
      // Await the async function to ensure it completes
      await renderChannelDetailPage(container);
    }
  } catch (error) {
    console.error("Error rendering channel settings:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Channel Settings</h5>
        <p>${error.message || "An error occurred while loading the channel configuration page."}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">
          <i class="bi bi-arrow-clockwise me-1"></i>Reload Page
        </button>
      </div>
    `;
  }
}

/**
 * Render Landing Page (Card Grid)
 */
function renderChannelLandingPage(container) {
  container.innerHTML = `
    <!-- Hero Header -->
    <div class="row mb-5">
      <div class="col-12 text-center">
        <h2 class="fw-bold mb-3">Channel Configuration</h2>
        <p class="text-muted lead">Connect and configure your sales channels for seamless synchronization</p>
        <button class="btn btn-primary btn-lg mt-2" onclick="showCreateChannelModal()">
          <i class="bi bi-plus-circle me-2"></i>Create Custom Channel
        </button>
      </div>
    </div>

    <!-- Platform Cards Grid -->
    <div class="row g-4 mb-5">
      ${AVAILABLE_PLATFORMS.map(
        (platform) => `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 border-0 shadow-sm channel-card hover-lift">
            <div class="card-body text-center p-4">
              <div class="display-4 mb-3">${platform.icon}</div>
              <h5 class="card-title fw-bold mb-2">${platform.name}</h5>
              <p class="card-text text-muted small mb-4">${platform.description}</p>
              <button class="btn btn-outline-primary w-100 stretched-link" 
                      onclick="openChannelConfig('${platform.id}', '${platform.name}')">
                <i class="bi bi-gear me-2"></i>Configure
              </button>
            </div>
          </div>
        </div>
      `
      ).join("")}
    </div>

    <!-- Custom Channels Section -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent border-0 pt-4 px-4 pb-0">
            <h4 class="fw-bold mb-0"><i class="bi bi-diagram-3 me-2"></i>My Custom Channels</h4>
          </div>
          <div class="card-body p-4" id="custom-channels-list">
             <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Loading custom channels...</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load custom channels
  loadCustomChannelsList(true); // true = render as cards
}

/**
 * Fetch channel name from API
 */
async function fetchChannelName(channelId) {
  if (!channelId || isNaN(channelId)) {
    return null;
  }
  
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const channel = response.data;
    return channel.channel_name || null;
  } catch (error) {
    console.error("Failed to fetch channel name:", error);
    return null;
  }
}

/**
 * Open channel configuration
 */
async function openChannelConfig(platformId, platformName = null) {
  console.log("openChannelConfig called with:", platformId, platformName);

  // Update URL Hash to trigger router (which calls renderChannelSettings with ID)
  // But to be immediate, we also set state.
  channelConfigState.currentPlatform = platformId;
  channelConfigState.selectedTableId = null; // Reset table selection when switching channels
  channelConfigState.viewMode = "detail";

  // Fetch channel name if not provided or if it's a numeric ID (custom channel)
  if (!platformName && platformId && !isNaN(platformId)) {
    platformName = await fetchChannelName(platformId);
  }
  
  channelConfigState.currentPlatformName = platformName || "Custom Channel";

  // Push to history
  window.location.hash = `channel_settings/${platformId}`;

  // Manually render to ensure immediate feedback (in case router is slow or failing)
  const container = document.getElementById("dynamic-content");
  if (container) {
    renderChannelSettings(container, platformId).catch(error => {
      console.error("Error rendering channel settings:", error);
      container.innerHTML = `
        <div class="alert alert-danger">
          <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Channel</h5>
          <p>${error.message || "Failed to load channel configuration."}</p>
          <button class="btn btn-primary btn-sm" onclick="location.reload()">
            <i class="bi bi-arrow-clockwise me-1"></i>Reload Page
          </button>
        </div>
      `;
    });
  }
}
window.openChannelConfig = openChannelConfig;

/**
 * Back to Landing Page
 */
function backToLanding() {
  channelConfigState.viewMode = "landing";
  channelConfigState.currentPlatform = null;
  window.location.hash = "channel_settings";
}

/**
 * Render Channel Detail Page
 */
/**
 * Render Channel Detail Page (Premium Design)
 */
async function renderChannelDetailPage(container) {
  const channelId = channelConfigState.currentPlatform;
  
  if (!channelId) {
    console.error("renderChannelDetailPage: No channelId provided");
    container.innerHTML = `
      <div class="alert alert-warning">
        <h5><i class="bi bi-exclamation-triangle me-2"></i>No Channel Selected</h5>
        <p>Please select a channel to configure.</p>
        <button class="btn btn-primary btn-sm" onclick="backToLanding()">
          <i class="bi bi-arrow-left me-1"></i>Back to Channels
        </button>
      </div>
    `;
    return;
  }
  
  // Fetch channel details to get the actual name
  let channelName = channelConfigState.currentPlatformName || "Custom Channel";
  let channelIcon = "🔌";
  
  // If channelId is numeric, it's a custom channel - fetch from API
  if (channelId && !isNaN(channelId)) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/mango/channels/${channelId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const channel = response.data;
      channelName = channel.channel_name || channelName;
      channelConfigState.currentPlatformName = channelName;
      
      // Set icon based on channel type
      const iconMap = {
        marketplace: "🛒",
        website: "🌐",
        pos: "💳",
        api: "🔌",
        custom: "🔧"
      };
      channelIcon = iconMap[channel.channel_type] || channelIcon;
    } catch (error) {
      console.error("Failed to fetch channel details:", error);
      // Show warning but continue rendering
      if (error.response?.status === 404) {
        channelName = `Channel ${channelId} (Not Found)`;
      } else if (error.response?.status === 403) {
        channelName = `Channel ${channelId} (Access Denied)`;
      }
      // Use cached name or fallback - don't block rendering
    }
  } else {
    // Predefined platform
    const platform = AVAILABLE_PLATFORMS.find(
      (p) => p.id === channelId
    );
    if (platform) {
      channelName = platform.name;
      channelIcon = platform.icon;
    }
  }
  
  const platform = {
    id: channelId,
    name: channelName,
    icon: channelIcon,
  };

  // Inject Premium Styles
  const styles = `
    <style>
      .config-header-bg {
        background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
        padding: 40px 0 80px; /* Extra bottom padding for overlap */
        color: white;
        border-radius: 0 0 24px 24px;
        margin-bottom: -40px; /* Overlap effect */
      }
      .glass-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
        border-radius: 16px;
      }
      .nav-pills-custom .nav-link {
        color: #64748b;
        background: transparent;
        border-radius: 10px;
        padding: 12px 20px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .nav-pills-custom .nav-link:hover {
        background: rgba(226, 232, 240, 0.5);
        color: #334155;
      }
      .nav-pills-custom .nav-link.active {
        background: #3b82f6;
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
      .stat-badge {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        color: rgba(255,255,255,0.9);
      }
    </style>
  `;

  container.innerHTML = `
    ${styles}
    
    <!-- Premium Header -->
    <div class="config-header-bg shadow-sm">
      <div class="container-fluid px-5">
        <div class="d-flex align-items-center mb-3">
          <button class="btn btn-outline-light btn-sm rounded-circle me-3" onclick="backToLanding()" style="width: 32px; height: 32px; padding: 0;">
            <i class="bi bi-arrow-left"></i>
          </button>
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item"><a href="#" onclick="backToLanding(); return false;" class="text-white-50 text-decoration-none">Channels</a></li>
              <li class="breadcrumb-item active text-white" aria-current="page">${
                platform.name
              }</li>
            </ol>
          </nav>
        </div>
        
        <div class="d-flex justify-content-between align-items-end">
          <div class="d-flex align-items-center">
            <div class="bg-white rounded-3 p-3 shadow-lg me-4" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
               ${platform.icon || "📦"}
            </div>
            <div>
              <h2 class="fw-bold mb-1">${platform.name}</h2>
              <div class="d-flex gap-2">
                <span class="stat-badge"><i class="bi bi-circle-fill text-success fs-6 me-1" style="font-size: 8px;"></i> Active</span>
                <span class="stat-badge"><i class="bi bi-database me-1"></i> Custom Schema</span>
                <span class="stat-badge"><i class="bi bi-clock-history me-1"></i> Sync: Auto</span>
              </div>
            </div>
          </div>
          
          <div class="d-flex gap-2">
            <button class="btn btn-light text-primary fw-medium px-4 shadow-sm" onclick="alert('Sync started!')">
               <i class="bi bi-arrow-repeat me-2"></i> Sync Now
            </button>
            <button class="btn btn-danger bg-opacity-25 border-0 text-white" onclick="deleteChannel()">
               <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area with Glass Card -->
    <div class="container-fluid px-5" style="margin-top: -20px;">
       <div class="row">
          <!-- Sidebar Navigation -->
          <div class="col-md-3">
             <div class="glass-card p-3 mb-4 sticky-top" style="top: 20px;">
                <div class="nav flex-column nav-pills-custom" id="channel-tabs" role="tablist">
                  <button class="nav-link active text-start mb-2" id="headers-tab" data-bs-toggle="pill" 
                          data-bs-target="#headers-panel" type="button">
                    <i class="bi bi-table me-3"></i>Data Schema
                  </button>
                  <button class="nav-link text-start mb-2" id="mapping-tab" data-bs-toggle="pill" 
                          data-bs-target="#mapping-panel" type="button">
                    <i class="bi bi-bezier2 me-3"></i>Field Mapping
                  </button>
                  <button class="nav-link text-start mb-2" id="preview-tab" data-bs-toggle="pill" 
                          data-bs-target="#preview-panel" type="button">
                    <i class="bi bi-window-sidebar me-3"></i>Data Preview
                  </button>
                  <button class="nav-link text-start mb-2" id="tables-tab" data-bs-toggle="pill" 
                          data-bs-target="#tables-panel" type="button">
                    <i class="bi bi-database-fill-add me-3"></i>Tables
                  </button>
                   <button class="nav-link text-start" id="settings-tab" data-bs-toggle="pill" 
                          data-bs-target="#settings-panel" type="button">
                    <i class="bi bi-gear me-3"></i>Advanced Settings
                  </button>
                </div>
             </div>
             
             <!-- Quick Stats Mini Card -->
             <div class="glass-card p-4 text-center">
                <h6 class="text-muted text-uppercase small fw-bold mb-3">Sync Health</h6>
                <div class="position-relative d-inline-block">
                    <svg viewBox="0 0 36 36" class="circular-chart text-success" style="width: 80px;">
                      <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke:#eee; stroke-width:3;" />
                      <path class="circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke: currentColor; stroke-width:3; stroke-dasharray: 100, 100;" />
                    </svg>
                    <div class="position-absolute top-50 start-50 translate-middle fw-bold fs-5">100%</div>
                </div>
             </div>
          </div>

          <!-- Content Panels -->
          <div class="col-md-9">
             <div class="glass-card p-4" style="min-height: 500px;">
                <div class="tab-content" id="channel-tab-content">
                  <!-- Headers Panel -->
                  <div class="tab-pane fade show active" id="headers-panel" role="tabpanel">
                    ${renderHeadersPanel()}
                  </div>

                  <!-- Dispatch Mapping Panel -->
                  <div class="tab-pane fade" id="mapping-panel" role="tabpanel">
                    ${renderMappingPanel()}
                  </div>

                  <!-- Preview Panel -->
                  <div class="tab-pane fade" id="preview-panel" role="tabpanel">
                    ${renderPreviewPanel()}
                  </div>
                  
                  <!-- Tables Panel (NEW) -->
                  <div class="tab-pane fade" id="tables-panel" role="tabpanel">
                    ${renderTablesPanel()}
                  </div>
                  
                   <!-- Settings Panel -->
                  <div class="tab-pane fade" id="settings-panel" role="tabpanel">
                     <div class="text-center py-5">
                        <i class="bi bi-sliders text-muted fs-1 mb-3"></i>
                        <h5>Configuration Options</h5>
                        <p class="text-muted">API credentials and sync frequency settings coming soon.</p>
                     </div>
                  </div>
                </div>
             </div>
          </div>
       </div>
    </div>

  `;

  // Also load tables list for the Tables tab
  try {
    loadChannelTables();
  } catch (error) {
    console.error("Error loading channel tables:", error);
  }

  // Populate the table selector dropdown FIRST
  // This will also load the correct fields based on selection
  try {
    await populateTableSelector();
    // After dropdown is populated, if default is selected, load default config
    if (
      !channelConfigState.selectedTableId ||
      channelConfigState.selectedTableId === "default"
    ) {
      loadPlatformConfiguration();
    }
  } catch (error) {
    console.error("Error populating table selector:", error);
    // Show error in table selector area
    const selector = document.getElementById("table-selector");
    if (selector) {
      selector.innerHTML = `<option value="" disabled>Error loading tables</option>`;
    }
  }

  // Setup tab activation handlers for lazy loading
  setTimeout(() => {
    const tablesTab = document.getElementById("tables-tab");
    if (tablesTab) {
      tablesTab.addEventListener("shown.bs.tab", () => loadChannelTables());
    }
  }, 100);
}

/**
 * Render Headers Panel (Schema/Fields) - Premium
 */
function renderHeadersPanel() {
  return `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold mb-1">Data Schema</h4>
            <p class="text-muted mb-0 small">Define the structure of data received from this channel.</p>
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary shadow-sm rounded-pill px-4" onclick="showBulkImportModal()">
                 <i class="bi bi-stars me-2"></i>AI Import
            </button>
            <button class="btn btn-primary shadow-sm rounded-pill px-4" onclick="showFieldEditModal()">
                <i class="bi bi-plus-lg me-2"></i>Add New Field
            </button>
        </div>
    </div>
    
    <!-- Table Selector Dropdown -->
    <div class="mb-4">
        <div class="d-flex align-items-center gap-3">
            <label class="form-label mb-0 fw-bold text-muted small">
                <i class="bi bi-database me-1"></i>Select Table:
            </label>
            <select class="form-select form-select-sm" id="table-selector" style="max-width: 350px;" 
                    onchange="onTableSelected(this.value)">
                <option value="" disabled>Loading tables...</option>
            </select>
            <button class="btn btn-sm btn-outline-primary" onclick="refreshTableSelector()" title="Refresh tables">
                <i class="bi bi-arrow-clockwise"></i>
            </button>
        </div>
    </div>

    <div id="fields-table-container" class="table-responsive rounded-3 border-0">
         <!-- Premium Skeleton Loader -->
        <div class="text-center py-5 opacity-50">
             <div class="spinner-grow text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
             <p class="fw-medium text-dark">Analyzing Schema...</p>
        </div>
    </div>
  `;
}

/**
 * Render Mapping Panel - Premium
 */
function renderMappingPanel() {
  return `
    <div class="text-center py-5">
        <div class="mb-4 position-relative d-inline-block">
             <div class="bg-light rounded-circle p-4 d-inline-block" style="width: 120px; height: 120px;"></div>
             <i class="bi bi-bezier2 text-primary position-absolute top-50 start-50 translate-middle" style="font-size: 3.5rem;"></i>
        </div>
        <h3 class="fw-bold text-dark mb-2">Smart Field Mapping</h3>
        <p class="text-muted mb-4" style="max-width: 500px; margin: 0 auto;">
            Connect your channel's data fields to the Master Order Sheet for unified processing.
        </p>
        <button class="btn btn-gradient-primary btn-lg rounded-pill px-5 shadow-sm" onclick="loadMappingConfiguration()">
            <i class="bi bi-magic me-2"></i> Launch Mapper
        </button>
        <div id="mapping-config-container" class="mt-5 text-start fade-in"></div>
    </div>
  `;
}

/**
 * Render Preview Panel - Premium
 */
function renderPreviewPanel() {
  return `
    <div class="empty-state text-center py-5">
        <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" width="150" class="mb-4 opacity-75" alt="Preview">
        <h4 class="fw-bold">Data Preview</h4>
        <p class="text-muted mb-4">Visualize your incoming data streams in real-time.</p>
        <div class="d-flex justify-content-center gap-3">
             <button class="btn btn-outline-secondary rounded-pill px-4">Load Sample JSON</button>
             <button class="btn btn-primary rounded-pill px-4" onclick="alert('Connecting to live stream...')">Connect Stream</button>
        </div>
    </div>
   `;
}

/**
 * Render Tables Panel - Multi-Table Management (NEW)
 */
function renderTablesPanel() {
  return `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold mb-1"><i class="bi bi-database-fill-add text-primary me-2"></i>Channel Tables</h4>
            <p class="text-muted mb-0 small">Create multiple tables for this channel with custom names (e.g., Orders, Returns, Inventory).</p>
        </div>
        <button class="btn btn-primary shadow-sm rounded-pill px-4" onclick="showCreateTableModal()">
            <i class="bi bi-plus-lg me-2"></i>Create New Table
        </button>
    </div>

    <div id="channel-tables-container">
        <div class="text-center py-5 opacity-50">
            <div class="spinner-grow text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
            <p class="fw-medium text-dark">Loading Tables...</p>
        </div>
    </div>
  `;
}

/**
 * Load channel tables list
 */
async function loadChannelTables() {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId) return;

  const container = document.getElementById("channel-tables-container");
  if (!container) return;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { default_table, tables } = response.data;

    // Build tables list HTML
    let html = "";

    // Additional tables
    if (tables.length === 0) {
      html += `
        <div class="alert alert-info border-0 mt-3">
          <i class="bi bi-info-circle me-2"></i>
          No tables created yet. All default tables will be created automatically with new channels.
        </div>
      `;
    } else {
      tables.forEach((table) => {
        // Check if it's a system table (default) - use green style
        const isDefault = table.is_system;
        const borderColor = isDefault ? "border-success" : "";
        const iconColor = isDefault ? "text-success" : "text-primary";
        const badgeClass = isDefault
          ? "bg-success-subtle text-success"
          : "bg-secondary-subtle text-secondary";
        const badgetext = isDefault ? "Default" : "Custom";

        const typeIcons = {
          orders: "bi-cart-check",
          returns: "bi-arrow-return-left",
          inventory: "bi-boxes",
          custom: "bi-database-fill",
        };
        const icon = typeIcons[table.table_type] || "bi-table";

        html += `
          <div class="card border-0 shadow-sm mb-3 ${
            isDefault ? "border-start border-4 " + borderColor : "hover-lift"
          }">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="mb-1">
                    <i class="bi ${icon} ${iconColor} me-2"></i>${
          table.table_name
        }
                    <span class="badge ${badgeClass} ms-2">${badgetext}</span>
                  </h5>
                  <p class="text-muted mb-0 small">${
                    isDefault
                      ? table.description || "Default table for this channel"
                      : `<code>${table.table_name}</code>${
                          table.description ? " - " + table.description : ""
                        }`
                  }</p>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  ${
                    isDefault
                      ? `
                  <span class="badge bg-light text-dark"><i class="bi bi-database me-1"></i>Active</span>
                  `
                      : `
                  <span class="badge bg-light text-dark">${
                    table.record_count || 0
                  } records</span>
                  <button class="btn btn-sm btn-outline-success" onclick="manageTableFields(${
                    table.id
                  })" title="Manage Fields">
                    <i class="bi bi-list-columns-reverse"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-primary" onclick="viewTableSchema(${
                    table.id
                  })" title="View Schema">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteChannelTable(${
                    table.id
                  }, '${table.table_name}')" title="Delete">
                    <i class="bi bi-trash"></i>
                  </button>
                  `
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  } catch (error) {
    console.error("Failed to load tables:", error);
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Could not load tables. <a href="#" onclick="loadChannelTables(); return false;">Retry</a>
      </div>
    `;
  }
}

/**
 * Show Create Table Modal
 */
async function showCreateTableModal() {
  const channelId = channelConfigState.currentPlatform;

  const result = await Swal.fire({
    title:
      '<i class="bi bi-database-fill-add text-primary me-2"></i>Create New Table',
    html: `
      <form id="create-table-form" class="text-start">
        <div class="mb-3">
          <label class="form-label fw-bold">Table Name <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-lg" id="new-table-name" 
                 placeholder="e.g., flipkart_returns, amazon_inventory" required
                 oninput="previewTableName(this)">
          <small class="text-muted">Use lowercase letters, numbers, and underscores only</small>
          <div id="table-name-preview" class="mt-2"></div>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Display Name</label>
          <input type="text" class="form-control" id="new-table-display-name" 
                 placeholder="e.g., Flipkart Returns, Amazon Inventory">
          <small class="text-muted">User-friendly name for this table</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Table Type</label>
          <select class="form-select" id="new-table-type">
            <option value="orders">📦 Orders</option>
            <option value="returns">↩️ Returns</option>
            <option value="inventory">📊 Inventory</option>
            <option value="custom">🔧 Custom</option>
          </select>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Description</label>
          <textarea class="form-control" id="new-table-description" rows="2"
                    placeholder="Optional description of this table's purpose"></textarea>
        </div>
      </form>
    `,
    width: 600,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-lg me-2"></i>Create Table',
    cancelButtonText: "Cancel",
    customClass: {
      confirmButton: "btn btn-success px-4",
      cancelButton: "btn btn-outline-secondary px-4",
    },
    preConfirm: () => {
      let tableName = document.getElementById("new-table-name").value.trim();
      if (!tableName) {
        Swal.showValidationMessage("Table name is required");
        return false;
      }
      // Auto-sanitize: convert spaces to underscores, make lowercase, remove special chars
      tableName = tableName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      if (!tableName) {
        Swal.showValidationMessage("Invalid table name after sanitization");
        return false;
      }
      return {
        table_name: tableName,
        display_name: document
          .getElementById("new-table-display-name")
          .value.trim(),
        table_type: document.getElementById("new-table-type").value,
        description: document
          .getElementById("new-table-description")
          .value.trim(),
      };
    },
  });

  if (result.isConfirmed) {
    await createChannelTable(channelId, result.value);
  }
}

/**
 * Preview table name as user types
 */
function previewTableName(input) {
  const preview = document.getElementById("table-name-preview");
  const value = input.value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
  if (value) {
    preview.innerHTML = `<span class="badge bg-primary-subtle text-primary">Table: <code>${value}</code></span>`;
  } else {
    preview.innerHTML = "";
  }
}

/**
 * Create channel table via API
 */
async function createChannelTable(channelId, tableData) {
  try {
    Swal.fire({
      title: "Creating table...",
      didOpen: () => Swal.showLoading(),
    });

    const token = localStorage.getItem("access_token");
    const response = await axios.post(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
      tableData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    Swal.fire({
      icon: "success",
      title: "Table Created!",
      text: `Table "${response.data.table.table_name}" created successfully`,
      timer: 2000,
    });

    // Reload tables list
    loadChannelTables();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Failed to create table",
      text: error.response?.data?.detail || error.message,
    });
  }
}

/**
 * Delete a channel table
 */
async function deleteChannelTable(tableId, tableName) {
  const channelId = channelConfigState.currentPlatform;

  const result = await Swal.fire({
    title: "Delete Table?",
    html: `
      <p>Are you sure you want to delete table <strong>${tableName}</strong>?</p>
      <p class="text-danger"><strong>⚠️ Warning:</strong> This will permanently delete the table and ALL its data!</p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      Swal.fire({ title: "Deleting...", didOpen: () => Swal.showLoading() });

      const token = localStorage.getItem("access_token");
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}?confirm=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Deleted!", "Table has been deleted.", "success");
      loadChannelTables();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to delete table",
        "error"
      );
    }
  }
}

/**
 * View table schema
 */
async function viewTableSchema(tableId) {
  const channelId = channelConfigState.currentPlatform;

  try {
    Swal.fire({ title: "Loading...", didOpen: () => Swal.showLoading() });

    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const table = response.data;

    Swal.fire({
      title: `<i class="bi bi-table text-primary me-2"></i>${table.display_name}`,
      html: `
        <div class="text-start">
          <p><strong>Table Name:</strong> <code>${table.table_name}</code></p>
          <p><strong>Type:</strong> ${table.table_type}</p>
          <p><strong>Records:</strong> ${table.record_count || 0}</p>
          ${
            table.description
              ? `<p><strong>Description:</strong> ${table.description}</p>`
              : ""
          }
          
          <h6 class="mt-4 mb-3">Fields (${table.fields.length})</h6>
          <div class="table-responsive" style="max-height: 300px;">
            <table class="table table-sm">
              <thead class="table-light">
                <tr><th>Name</th><th>Type</th><th>Flags</th></tr>
              </thead>
              <tbody>
                ${table.fields
                  .map(
                    (f) => `
                  <tr>
                    <td><code>${f.field_key}</code></td>
                    <td><span class="badge bg-secondary">${
                      f.field_type
                    }</span></td>
                    <td>
                      ${
                        f.is_required
                          ? '<span class="badge bg-danger-subtle text-danger me-1">Required</span>'
                          : ""
                      }
                      ${
                        f.is_unique
                          ? '<span class="badge bg-info-subtle text-info me-1">Unique</span>'
                          : ""
                      }
                      ${
                        f.is_indexed
                          ? '<span class="badge bg-warning-subtle text-warning">Indexed</span>'
                          : ""
                      }
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `,
      width: 700,
      confirmButtonText: "Close",
    });
  } catch (error) {
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to load table schema",
      "error"
    );
  }
}

// Make new functions globally accessible
window.showCreateTableModal = showCreateTableModal;
window.loadChannelTables = loadChannelTables;
window.deleteChannelTable = deleteChannelTable;
window.viewTableSchema = viewTableSchema;
window.previewTableName = previewTableName;

/**
 * Navigate to Data Schema tab and select a specific table
 */
function manageTableFields(tableId) {
  // Set the selected table
  channelConfigState.selectedTableId = tableId.toString();

  // Switch to Data Schema tab
  const headersTab = document.getElementById("headers-tab");
  if (headersTab) {
    const tab = new bootstrap.Tab(headersTab);
    tab.show();
  }

  // Update dropdown and load fields
  setTimeout(() => {
    const selector = document.getElementById("table-selector");
    if (selector) {
      selector.value = tableId.toString();
    }
    onTableSelected(tableId.toString());
  }, 100);
}

window.manageTableFields = manageTableFields;

/**
 * Populate the table selector dropdown with all tables for the channel
 */
async function populateTableSelector() {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId) return;

  const selector = document.getElementById("table-selector");
  if (!selector) return;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { tables } = response.data;

    // Build options from ALL tables (now ALL default tables are in channel_tables with IDs)
    let optionsHtml = "";

    tables.forEach((table, index) => {
      const typeEmoji = {
        orders: "📦",
        returns: "↩️",
        inventory: "📊",
        custom: "🔧",
      };
      const emoji = typeEmoji[table.table_type] || "📋";
      const label = table.is_system ? "Default" : "Custom";
      const selected = index === 0 ? "selected" : ""; // First one selected by default

      optionsHtml += `<option value="${table.id}" data-table="${
        table.table_name
      }" ${selected}>${emoji} ${
        table.display_name || table.table_name
      } (${label})</option>`;
    });

    selector.innerHTML = optionsHtml;

    // Store current selected table in state (use numeric ID, never "default")
    // IMPORTANT: Don't override existing selection - preserve user's choice
    if (!channelConfigState.selectedTableId && tables.length > 0) {
      channelConfigState.selectedTableId = tables[0].id.toString(); // Use first table's ID as string
    }

    // Set the dropdown value WITHOUT triggering onchange
    const currentOnChange = selector.onchange;
    selector.onchange = null;
    if (channelConfigState.selectedTableId) {
      // Ensure the selected table ID exists in the tables list
      const selectedTable = tables.find(t => t.id.toString() === channelConfigState.selectedTableId.toString());
      if (selectedTable) {
        selector.value = channelConfigState.selectedTableId.toString();
      } else if (tables.length > 0) {
        // If selected table doesn't exist, use first table
        channelConfigState.selectedTableId = tables[0].id.toString();
        selector.value = channelConfigState.selectedTableId.toString();
      }
    }
    selector.onchange = currentOnChange;

    // Manually load fields for the selected table (only once)
    // Only load if we haven't loaded yet or if explicitly needed
    if (channelConfigState.selectedTableId) {
      const container = document.getElementById("fields-table-container");
      // Only auto-load if container is empty or showing loading state
      if (!container || !container.innerHTML || container.innerHTML.includes("Loading") || container.innerHTML.includes("Analyzing")) {
        onTableSelected(channelConfigState.selectedTableId);
      }
    } else if (tables.length > 0) {
      // Fallback: select first table if nothing is selected
      const firstTableId = tables[0].id.toString();
      channelConfigState.selectedTableId = firstTableId;
      selector.value = firstTableId;
      onTableSelected(firstTableId);
    }
  } catch (error) {
    console.error("Failed to load tables for selector:", error);
    const errorMsg = error.response?.data?.detail || error.message || "Unknown error";
    selector.innerHTML = `
      <option value="" disabled selected>Error loading tables</option>
      <option value="" disabled>${errorMsg}</option>
    `;
    
    // Show error in container
    const container = document.getElementById("fields-table-container");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Failed to load tables:</strong> ${errorMsg}
          <br><br>
          <button class="btn btn-sm btn-primary" onclick="populateTableSelector();">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </div>
      `;
    }
  }
}

/**
 * Handle table selection from dropdown
 */
async function onTableSelected(tableValue) {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId) {
    console.log("No channelId, returning early");
    return;
  }

  const container = document.getElementById("fields-table-container");
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="text-center py-5 opacity-50">
      <div class="spinner-grow text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
      <p class="fw-medium text-dark">Loading fields...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("access_token");
    let tableId = tableValue;

    // Handle "default" case - need to fetch tables first to get the actual table ID
    if (tableValue === "default" || tableValue === "" || isNaN(parseInt(tableValue))) {
      // Fetch tables list to find the default/first table
      const tablesResponse = await axios.get(
        `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { tables } = tablesResponse.data;
      
      if (!tables || tables.length === 0) {
        throw new Error("No tables found for this channel");
      }

      // Find default table (orders type or first table)
      const defaultTable = tables.find(t => t.table_type === "orders") || tables[0];
      tableId = defaultTable.id;
      
      // Update state and dropdown
      channelConfigState.selectedTableId = tableId.toString();
      const selector = document.getElementById("table-selector");
      if (selector) {
        selector.value = tableId.toString();
      }
    } else {
      // Valid numeric table ID - UPDATE STATE IMMEDIATELY to prevent race conditions
      channelConfigState.selectedTableId = tableId.toString();
      
      // Sync dropdown to match state
      const selector = document.getElementById("table-selector");
      if (selector && selector.value !== tableId.toString()) {
        selector.value = tableId.toString();
      }
    }

    // Fetch table details with fields
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const table = response.data;
    renderTableFields(table);
  } catch (error) {
    console.error("Failed to load table fields:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Could not load fields: ${errorMessage}
        <br><br>
        <button class="btn btn-sm btn-outline-primary" onclick="onTableSelected('${tableValue}');">
          <i class="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="populateTableSelector();">
          <i class="bi bi-arrow-clockwise me-1"></i>Reload Tables
        </button>
      </div>
    `;
  }
}

/**
 * Render fields for a specific table
 */
function renderTableFields(table) {
  const container = document.getElementById("fields-table-container");
  if (!container) return;

  if (!table.fields || table.fields.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-inbox display-1 text-muted opacity-25 mb-3"></i>
        <h5>No Fields Defined</h5>
        <p class="text-muted">This table has no custom fields yet.</p>
        <button class="btn btn-primary rounded-pill px-4" onclick="showFieldEditModal()">
          <i class="bi bi-plus-lg me-2"></i>Add First Field
        </button>
      </div>
    `;
    return;
  }

  // Build table HTML with action buttons
  let html = `
    <table class="table table-hover align-middle mb-0">
      <thead class="bg-light">
        <tr>
          <th style="width: 40px;">#</th>
          <th>HEADER NAME</th>
          <th>FIELD KEY</th>
          <th>TYPE</th>
          <th>FLAGS</th>
          <th>REQUIRED</th>
          <th style="width: 120px;" class="text-end">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
  `;

  table.fields.forEach((field, idx) => {
    html += `
      <tr>
        <td class="text-muted">${idx + 1}</td>
        <td><strong>${field.field_name || field.field_key}</strong></td>
        <td><code class="text-primary">${field.field_key}</code></td>
        <td><span class="badge bg-primary">${field.field_type}</span></td>
        <td>
          ${
            field.is_unique
              ? '<span class="badge bg-info-subtle text-info me-1">Unique</span>'
              : "—"
          }
          ${
            field.is_indexed
              ? '<span class="badge bg-warning-subtle text-warning">Indexed</span>'
              : ""
          }
        </td>
        <td>
          ${
            field.is_required
              ? '<i class="bi bi-check-circle-fill text-success"></i>'
              : "—"
          }
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary btn-sm" 
                    onclick="editTableField(${table.id}, ${field.id})" 
                    title="Edit Field">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" 
                    onclick="deleteTableField(${table.id}, ${field.id}, '${field.field_name || field.field_key}')" 
                    title="Delete Field">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

/**
 * Refresh table selector dropdown
 */
function refreshTableSelector() {
  populateTableSelector();
}

// Make table selector functions globally accessible
window.populateTableSelector = populateTableSelector;
window.onTableSelected = onTableSelected;
window.refreshTableSelector = refreshTableSelector;
window.renderTableFields = renderTableFields;

// ... existing code ...

/**
 * Render Headers Management Panel
 */
// ============ FIELD MANAGEMENT ============

/**
 * Show Field Editor Modal (Add/Edit)
 */
async function showFieldEditModal(headerId = null, fieldData = null, tableId = null) {
  // Support both legacy (headerId) and new (fieldData) ways of calling
  const header = headerId
    ? (fieldData || channelConfigState.headers.find((h) => h.id === headerId))
    : fieldData;
  const isEdit = !!header;
  const channelId = channelConfigState.currentPlatform;
  const editTableId = tableId || channelConfigState.selectedTableId;
  
  // Load tables for dropdown
  let tablesOptions = '<option value="">Loading tables...</option>';
  let defaultTableId = channelConfigState.selectedTableId || "";
  
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const { tables } = response.data;
    if (tables && tables.length > 0) {
      tablesOptions = tables.map(table => {
        const typeEmoji = {
          orders: "📦",
          returns: "↩️",
          inventory: "📊",
          custom: "🔧",
        };
        const emoji = typeEmoji[table.table_type] || "📋";
        const label = table.is_system ? "Default" : "Custom";
        const selected = table.id.toString() === defaultTableId.toString() ? "selected" : "";
        return `<option value="${table.id}" ${selected}>${emoji} ${table.display_name || table.table_name} (${label})</option>`;
      }).join("");
      
      // If no table was selected, use the first one
      if (!defaultTableId && tables.length > 0) {
        defaultTableId = tables[0].id.toString();
      }
    } else {
      tablesOptions = '<option value="">No tables available</option>';
    }
  } catch (error) {
    console.error("Failed to load tables:", error);
    tablesOptions = '<option value="">Error loading tables</option>';
  }

  Swal.fire({
    title: isEdit ? "Edit Field" : "Add New Data Field",
    html: `
      <form id="field-editor-form" class="text-start">
        ${!isEdit ? `
        <div class="mb-3">
          <label class="form-label fw-bold">
            <i class="bi bi-database me-1"></i>Select Table <span class="text-danger">*</span>
          </label>
          <select class="form-select" id="field_table_id" required>
            ${tablesOptions}
          </select>
          <small class="text-muted">Choose which table to add this field to</small>
        </div>
        ` : `
        <div class="alert alert-info small mb-3">
          <i class="bi bi-info-circle me-1"></i>Editing field in table context. Table cannot be changed.
        </div>
        `}
        
        <div class="mb-3">
          <label class="form-label fw-bold">Display Name <span class="text-danger">*</span></label>
          <input type="text" class="form-control" id="field_name" 
                 value="${header ? header.field_name : ""}" required
                 ${isEdit ? "readonly" : ""} placeholder="e.g. Shipment ID">
          <small class="text-muted">User-friendly name for this field</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Database Key (Snake Case) <span class="text-danger">*</span></label>
          <div class="input-group">
            <input type="text" class="form-control" id="field_key" 
                   value="${header ? header.field_key : ""}" required
                   ${isEdit ? "readonly" : ""} placeholder="e.g. shipment_id">
            <span class="input-group-text"><i class="bi bi-lock"></i></span>
          </div>
          <small class="text-muted">Auto-generated from display name (editable)</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Data Type <span class="text-danger">*</span></label>
          <select class="form-select" id="field_type" ${
            isEdit ? "disabled" : ""
          }>
            <option value="VARCHAR(255)" ${
              header?.field_type === "VARCHAR(255)" ? "selected" : ""
            }>Text (Short) - Names, Titles</option>
            <option value="INT" ${
              header?.field_type === "INT" ? "selected" : ""
            }>Number (Integer)</option>
            <option value="DECIMAL(10,2)" ${
              header?.field_type === "DECIMAL(10,2)" ? "selected" : ""
            }>Decimal - Prices, Amounts</option>
            <option value="DATETIME" ${
              header?.field_type === "DATETIME" ? "selected" : ""
            }>Date & Time</option>
            <option value="BOOLEAN" ${
              header?.field_type === "BOOLEAN" ? "selected" : ""
            }>Yes/No (Boolean)</option>
            <option value="TEXT" ${
              header?.field_type === "TEXT" ? "selected" : ""
            }>Long Text - Descriptions</option>
          </select>
        </div>

        <div class="mb-3">
           <label class="form-label fw-bold">Data Integrity & Constraints</label>
           <div class="form-check">
             <input class="form-check-input" type="checkbox" id="is_required" 
                    ${header?.is_required ? "checked" : ""}>
             <label class="form-check-label" for="is_required">Value cannot be empty (NOT NULL)</label>
           </div>
           <div class="form-check">
             <input class="form-check-input" type="checkbox" id="is_unique" 
                    ${header?.is_unique ? "checked" : ""} ${
      isEdit ? "disabled" : ""
    }>
             <label class="form-check-label" for="is_unique">No duplicate values allowed</label>
           </div>
           <div class="form-check">
             <input class="form-check-input" type="checkbox" id="is_primary_key" 
                    ${header?.is_primary_key ? "checked" : ""} ${
      isEdit ? "disabled" : ""
    }>
             <label class="form-check-label" for="is_primary_key">Global unique identifier for rows</label>
           </div>
           <div class="form-check">
             <input class="form-check-input" type="checkbox" id="is_indexed" 
                    ${header?.is_indexed ? "checked" : ""} ${
      isEdit ? "disabled" : ""
    }>
             <label class="form-check-label" for="is_indexed">Optimize for faster searching</label>
           </div>
        </div>

        ${
          isEdit
            ? `<div class="alert alert-warning small"><i class="bi bi-exclamation-triangle"></i> Structure changes (Type, Unique, Index) are disabled for existing fields to prevent data loss.</div>`
            : ""
        }
      </form>
    `,
    showCancelButton: true,
    confirmButtonText: isEdit ? "Update Metadata" : "Save Changes",
    cancelButtonText: "Cancel",
    didOpen: () => {
      // Auto-generate field_key from field_name when typing (only for new fields)
      if (!isEdit) {
        const fieldNameInput = document.getElementById("field_name");
        const fieldKeyInput = document.getElementById("field_key");
        
        fieldNameInput.addEventListener("input", () => {
          if (!fieldKeyInput.dataset.manualEdit) {
            const autoKey = fieldNameInput.value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "");
            fieldKeyInput.value = autoKey;
          }
        });
        
        fieldKeyInput.addEventListener("input", () => {
          fieldKeyInput.dataset.manualEdit = "true";
        });
      }
    },
    preConfirm: () => {
      const name = document.getElementById("field_name").value;
      if (!name) {
        Swal.showValidationMessage("Field name is required");
        return false;
      }
      
      // For edit mode, use the tableId from the field's context
      // For create mode, get from dropdown
      const tableId = isEdit 
        ? (editTableId || document.getElementById("field_table_id")?.value)
        : document.getElementById("field_table_id")?.value;
      
      if (!isEdit && !tableId) {
        Swal.showValidationMessage("Please select a table");
        return false;
      }
      
      if (isEdit && !tableId) {
        Swal.showValidationMessage("Cannot determine table context for editing");
        return false;
      }
      
      const fieldKey = document.getElementById("field_key").value;
      if (!fieldKey) {
        Swal.showValidationMessage("Database key is required");
        return false;
      }
      
      return {
        name: name,
        field_key: fieldKey,
        type: document.getElementById("field_type").value,
        required: document.getElementById("is_required").checked,
        primary_key: document.getElementById("is_primary_key").checked,
        unique: document.getElementById("is_unique").checked,
        indexed: document.getElementById("is_indexed").checked,
        table_id: tableId,
        field_id: isEdit ? (header.id || headerId) : null,
      };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      handleSaveField(result.value, isEdit ? (header.id || headerId) : null);
    }
  });
}

/**
 * Handle Save Field (Call Backend)
 */
async function handleSaveField(fieldData, fieldId) {
  try {
    const platformId = channelConfigState.currentPlatform;
    
    // CRITICAL: Always use table_id from fieldData (from modal) - this is the source of truth
    // Only fall back to state if modal didn't provide it (shouldn't happen in create mode)
    const selectedTableId = fieldData.table_id || channelConfigState.selectedTableId;
    
    // Validation: Ensure we have a valid table ID
    if (!selectedTableId || selectedTableId === "default") {
      Swal.fire(
        "Error",
        "Table selection is required. Please select a table from the dropdown.",
        "error"
      );
      return;
    }
    
    console.log("handleSaveField: Using table_id:", selectedTableId, "from fieldData:", fieldData.table_id);

    // Check if it's a predefined platform (prevent schema mods)
    if (
      ["amazon", "flipkart", "meesho", "myntra", "shopify"].includes(platformId)
    ) {
      Swal.fire(
        "Action Restricted",
        "You cannot modify the schema of predefined platforms.",
        "warning"
      );
      return;
    }

    // Remove table_id from payload before sending
    const { table_id, ...payload } = fieldData;
    const token = localStorage.getItem("access_token");

    Swal.fire({ title: "Saving Field...", didOpen: () => Swal.showLoading() });

    if (fieldId) {
      // UPDATE - Use table-specific endpoint if table_id is provided
      let updateEndpoint;
      if (selectedTableId && selectedTableId !== "default") {
        updateEndpoint = `${API_BASE_URL}/api/mango/channels/${platformId}/tables/${selectedTableId}/fields/${fieldId}`;
      } else {
        updateEndpoint = `${API_BASE_URL}/api/mango/channels/${platformId}/fields/${fieldId}`;
      }
      
      const response = await axios.put(updateEndpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Get table_id from response for update as well
      const responseTableId = response.data?.table_id || selectedTableId;
      
      Swal.fire("Success", "Field updated successfully", "success");
      
      // Reload the table where field was updated
      if (responseTableId && responseTableId !== "default") {
        channelConfigState.selectedTableId = responseTableId.toString();
        const selector = document.getElementById("table-selector");
        if (selector) {
          selector.value = responseTableId.toString();
        }
        onTableSelected(responseTableId.toString());
      }
      return; // Exit early for update
    } else {
      // CREATE - check if targeting default table or custom table
      let endpoint;

      if (selectedTableId && selectedTableId !== "default") {
        // Custom table - use tables/{table_id}/fields endpoint
        endpoint = `${API_BASE_URL}/api/mango/channels/${platformId}/tables/${selectedTableId}/fields`;
      } else {
        // Default table - use regular fields endpoint
        endpoint = `${API_BASE_URL}/api/mango/channels/${platformId}/fields`;
      }

      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Get the actual table_id from response (backend confirms where field was created)
      const responseTableId = response.data?.table_id || fieldData.table_id || selectedTableId;
      
      Swal.fire("Success", "Field saved successfully", "success");

      // CRITICAL: Use the table_id from the response (backend confirms where field was created)
      const actualTableId = responseTableId || fieldData.table_id || selectedTableId;
      
      // Update state to match the table where field was actually created
      if (actualTableId && actualTableId !== "default") {
        channelConfigState.selectedTableId = actualTableId.toString();
        
        // Sync dropdown to show correct table
        const selector = document.getElementById("table-selector");
        if (selector) {
          selector.value = actualTableId.toString();
        }
        
        // Reload fields for the CORRECT table
        onTableSelected(actualTableId.toString());
      } else {
        // Fallback to state-based reload
        if (selectedTableId && selectedTableId !== "default") {
          onTableSelected(selectedTableId);
        } else {
          loadPlatformConfiguration();
        }
      }
    }
  } catch (error) {
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to save field",
      "error"
    );
  }
}

/**
 * Edit Field from Table (Table-specific)
 */
async function editTableField(tableId, fieldId) {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId || !tableId || !fieldId) return;

  try {
    const token = localStorage.getItem("access_token");
    
    // Fetch field details from the table
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const table = response.data;
    const field = table.fields.find(f => f.id === fieldId);
    
    if (!field) {
      Swal.fire("Error", "Field not found", "error");
      return;
    }
    
    // Show edit modal with field data
    showFieldEditModal(fieldId, field, tableId);
  } catch (error) {
    Swal.fire(
      "Error",
      error.response?.data?.detail || "Failed to load field details",
      "error"
    );
  }
}

/**
 * Delete Field from Table (Table-specific with strict isolation)
 */
async function deleteTableField(tableId, fieldId, fieldName) {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId || !tableId || !fieldId) return;

  // Check if it's a predefined platform
  if (
    ["amazon", "flipkart", "meesho", "myntra", "shopify"].includes(channelId)
  ) {
    Swal.fire(
      "Action Restricted",
      "You cannot modify the schema of predefined platforms.",
      "warning"
    );
    return;
  }

  const result = await Swal.fire({
    title: "Delete Field?",
    html: `
      <p>Are you sure you want to delete field <strong>${fieldName}</strong>?</p>
      <p class="text-danger fw-bold">
        <i class="bi bi-exclamation-octagon"></i> WARNING: This will permanently delete the column metadata!
      </p>
      <p class="text-muted small">Note: The physical column may remain in the database but will be unused.</p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      Swal.fire({ title: "Deleting...", didOpen: () => Swal.showLoading() });

      const token = localStorage.getItem("access_token");
      
      // Use table-specific delete endpoint for strict isolation
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}/fields/${fieldId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Deleted!", "Field has been deleted.", "success");
      
      // Reload the current table
      onTableSelected(tableId.toString());
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to delete field",
        "error"
      );
    }
  }
}

/**
 * Delete Header / Field (Legacy - for backward compatibility)
 */
async function deleteHeader(headerId) {
  const header = channelConfigState.headers.find((h) => h.id === headerId);
  if (!header) return;

  const platformId = channelConfigState.currentPlatform;
  // Check if it's a predefined platform
  if (
    ["amazon", "flipkart", "meesho", "myntra", "shopify"].includes(platformId)
  ) {
    Swal.fire(
      "Action Restricted",
      "You cannot modify the schema of predefined platforms.",
      "warning"
    );
    return;
  }

  const result = await Swal.fire({
    title: "Delete Field?",
    html: `
      <p>Are you sure you want to delete field <strong>${header.field_name}</strong>?</p>
      <p class="text-danger fw-bold"><i class="bi bi-exclamation-octagon"></i> WARNING: This will permanently delete the column and ALL data stored in it!</p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      Swal.fire({ title: "Deleting...", didOpen: () => Swal.showLoading() });

      // Use column name for deletion endpoint
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/${platformId}/fields/${header.field_name}`
      );

      Swal.fire("Deleted!", "Field has been deleted.", "success");
      loadPlatformConfiguration();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to delete field",
        "error"
      );
    }
  }
}

// Make functions globally accessible
window.editTableField = editTableField;
window.deleteTableField = deleteTableField;

// ============ MAPPING PANELS ============

/**
 * Render Mapping Panel
 */
function renderMappingPanel() {
  if (channelConfigState.headers.length === 0) {
    return `
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
           <i class="bi bi-diagram-3 display-4 text-muted mb-3"></i>
           <p class="lead">No fields available to map.</p>
           <button class="btn btn-primary btn-sm" onclick="document.getElementById('headers-tab').click()">
             Go to Headers Tab
           </button>
        </div>
      </div>`;
  }

  // Master Fields Definition
  const masterFields = [
    { key: "order_number", label: "Order ID / Number", required: true },
    { key: "order_date", label: "Order Date", required: false },
    { key: "order_amount", label: "Total Amount", required: false },
    { key: "customer_name", label: "Customer Name", required: false },
    { key: "customer_email", label: "Customer Email", required: false },
    { key: "customer_phone", label: "Customer Phone", required: false },
    { key: "shipping_address", label: "Shipping Address", required: false },
    { key: "shipping_city", label: "City", required: false },
    { key: "shipping_pincode", label: "Pincode", required: false },
    { key: "order_status", label: "Order Status", required: false },
    { key: "sku", label: "Product SKU (Line Item)", required: false },
  ];

  return `
    <!-- Master Sheet Mapping Section -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-header bg-light d-flex justify-content-between align-items-center">
        <div>
           <strong class="text-primary"><i class="bi bi-database-fill-gear me-2"></i>Master Order Sheet Mapping</strong>
           <p class="small text-muted mb-0">Map your channel fields to the unified System Master Sheet.</p>
        </div>
        <span class="badge bg-primary">Priority</span>
      </div>
      <div class="card-body">
         <div class="table-responsive">
           <table class="table align-middle">
             <thead>
               <tr>
                 <th width="35%">Master System Field</th>
                 <th width="5%" class="text-center">Link</th>
                 <th width="35%">Your Channel Field</th>
                 <th width="25%">Transformation</th>
               </tr>
             </thead>
             <tbody>
               ${masterFields
                 .map((mf) => {
                   // Find existing mapping (needs to be loaded in state)
                   // For now assuming we will load this into channelConfigState.masterMappings
                   return `
                  <tr>
                    <td>
                      <div class="fw-bold">${mf.label}</div>
                      <code class="small text-muted">${mf.key}</code>
                      ${
                        mf.required
                          ? '<span class="badge bg-danger-subtle text-danger ms-2">Required</span>'
                          : ""
                      }
                    </td>
                    <td class="text-center"><i class="bi bi-arrow-left-right text-muted"></i></td>
                    <td>
                      <select class="form-select master-map-select" data-master-field="${
                        mf.key
                      }">
                        <option value="">-- Select Channel Field --</option>
                        ${channelConfigState.headers
                          .map(
                            (h) =>
                              `<option value="${h.field_name}">${h.field_name} (${h.field_type})</option>`
                          )
                          .join("")}
                      </select>
                    </td>
                    <td>
                       <select class="form-select form-select-sm master-trans-select" data-master-field="${
                         mf.key
                       }">
                         <option value="direct">Direct Copy (No Change)</option>
                         <option value="uppercase">Uppercase</option>
                         <option value="lowercase">Lowercase</option>
                         <option value="trim">Trim Whitespace</option>
                         <option value="date_iso">Format Date (ISO)</option>
                         <option value="currency">Format Currency</option>
                       </select>
                    </td>
                  </tr>
                  `;
                 })
                 .join("")}
             </tbody>
           </table>
         </div>
      </div>
      <div class="card-footer bg-white border-top-0 text-end">
         <button class="btn btn-success" onclick="saveMasterMappings()">
           <i class="bi bi-save me-2"></i>Save Master Mappings
         </button>
      </div>
    </div>

    <!-- Dispatch Mapping Section -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <strong><i class="bi bi-upc-scan me-2"></i>Dispatch Scanner Mapping</strong>
        <p class="small text-muted mb-0">Map fields to update status via Barcode Scanner.</p>
      </div>
      <div class="card-body">
        <div id="mappings-container">
           ${renderDispatchMappingInternal()}
        </div>
      </div>
       <div class="card-footer bg-white border-top-0 text-end">
         <button class="btn btn-primary" onclick="saveDispatchMappings()">
           <i class="bi bi-save me-2"></i>Save Dispatch Mappings
         </button>
      </div>
    </div>
  `;
}

function renderDispatchMappingInternal() {
  // Reuse existing list logic but return string
  const scanFields = [
    { key: "platform_order_id", name: "Platform Order ID" },
    { key: "barcode_data", name: "Barcode Data" },
    { key: "awb_number", name: "AWB Number" },
  ];

  return `
    <div class="table-responsive">
      <table class="table">
        <thead class="table-light">
          <tr>
            <th>Channel Field</th>
            <th class="text-center">→</th>
            <th>Scanner Field</th>
          </tr>
        </thead>
        <tbody>
          ${channelConfigState.headers
            .map((header) => {
              const existingMapping = channelConfigState.mappings.find(
                (m) => m.channel_field_key === header.field_key
              );
              return `
              <tr>
                <td><strong>${header.field_name}</strong></td>
                <td class="text-center"><i class="bi bi-arrow-right"></i></td>
                <td>
                  <select class="form-select form-select-sm dispatch-map-select" 
                          data-channel-field="${header.field_key}">
                    <option value="">-- Not Mapped --</option>
                    ${scanFields
                      .map(
                        (sf) => `
                      <option value="${sf.key}" ${
                          existingMapping?.scan_field_key === sf.key
                            ? "selected"
                            : ""
                        }>
                        ${sf.name}
                      </option>
                    `
                      )
                      .join("")}
                  </select>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Save Master Mappings
 */
async function saveMasterMappings() {
  const platformId = channelConfigState.currentPlatform;
  const mappings = [];

  document.querySelectorAll(".master-map-select").forEach((select) => {
    if (select.value) {
      mappings.push({
        channel_field_name: select.value,
        master_field_name: select.dataset.masterField,
        transformation: document.querySelector(
          `.master-trans-select[data-master-field="${select.dataset.masterField}"]`
        ).value,
      });
    }
  });

  try {
    Swal.fire({
      title: "Saving Mappings...",
      didOpen: () => Swal.showLoading(),
    });

    await axios.post(
      `${API_BASE_URL}/api/mango/channels/${platformId}/mappings/master`,
      { mappings }
    );

    Swal.fire("Success", "Master mappings saved successfully!", "success");
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Failed to save mappings", "error");
  }
}

/**
 * Save Dispatch Mappings
 */
async function saveDispatchMappings() {
  // Use existing saveMappings logic but renamed
  saveMappings();
}

/**
 * Render Preview Panel
 */
function renderPreviewPanel() {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-light">
        <h5 class="mb-0">Configuration Preview</h5>
      </div>
      <div class="card-body">
        <div id="preview-container">
          <p class="text-muted">Configure headers and mappings to see preview</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Switch platform
 */
function switchPlatform(platform) {
  channelConfigState.currentPlatform = platform;
  loadPlatformConfiguration();
}

/**
 * Load platform configuration
 */
async function loadPlatformConfiguration() {
  const platform = channelConfigState.currentPlatform;

  try {
    let response;
    // Check if it's a predefined platform (string) or custom channel (number)
    const isCustom = !isNaN(platform);

    if (isCustom) {
      // Custom Channel: Use new endpoint
      response = await axios.get(
        `${API_BASE_URL}/api/mango/channels/${platform}/fields`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
    } else {
      // Predefined Platform: Use legacy endpoint
      response = await axios.get(`${API_BASE_URL}/api/mango/channel/fields`, {
        params: { platform },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
    }

    channelConfigState.headers = response.data.fields || [];
    channelConfigState.mappings = response.data.mappings || [];

    renderHeadersList();
    renderMappingsList();
  } catch (error) {
    // Silently handle error - just show empty state
    console.log(
      "Could not load configuration (expected on first use):",
      error.message
    );
    channelConfigState.headers = [];
    channelConfigState.mappings = [];

    // Only render if containers exist (we're on the settings page)
    if (document.getElementById("headers-list-container")) {
      renderHeadersList();
    }
    if (document.getElementById("mappings-container")) {
      renderMappingsList();
    }
  }
}

/**
 * Handle Excel file selection
 */
function handleExcelSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processExcelFile(file);
  }
}

/**
 * Handle Excel file drop
 */
function handleExcelDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("border-success", "bg-light");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processExcelFile(files[0]);
  }
}

/**
 * Process Excel file
 */
function processExcelFile(file) {
  // Validate file
  const validTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  if (
    !validTypes.includes(file.type) &&
    !file.name.match(/\.(xlsx|xls|csv)$/i)
  ) {
    Swal.fire({
      icon: "error",
      title: "Invalid File",
      text: "Please upload an Excel (.xlsx, .xls) or CSV file",
    });
    return;
  }

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "File Too Large",
      text: "File size must be less than 5MB",
    });
    return;
  }

  channelConfigState.uploadedFile = file;

  // Show file info
  document.getElementById("excel-file-name").textContent = file.name;
  document.getElementById("excel-file-size").textContent = formatFileSize(
    file.size
  );
  document.getElementById("excel-file-info").style.display = "block";
  document.getElementById("analyze-excel-btn").disabled = false;
}

/**
 * Clear Excel file
 */
function clearExcelFile() {
  channelConfigState.uploadedFile = null;
  document.getElementById("excel-input").value = "";
  document.getElementById("excel-file-info").style.display = "none";
  document.getElementById("analyze-excel-btn").disabled = true;
  document.getElementById("detection-results").style.display = "none";
}

/**
 * Analyze Excel file and detect headers
 */
async function analyzeExcelFile() {
  if (!channelConfigState.uploadedFile) return;

  Swal.fire({
    title: "Analyzing File...",
    text: "Please wait while we detect headers and data types",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const formData = new FormData();
    formData.append("file", channelConfigState.uploadedFile);

    const response = await axios.post(
      `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    Swal.close();

    channelConfigState.detectedFields = response.data.detected_fields;
    showDetectedFields(response.data.detected_fields);
  } catch (error) {
    Swal.close();
    console.error("Analysis error:", error);
    Swal.fire({
      icon: "error",
      title: "Analysis Failed",
      text: error.response?.data?.detail || "Failed to analyze file",
    });
  }
}

/**
 * Show detected fields for review
 */
function showDetectedFields(fields) {
  const resultsDiv = document.getElementById("detection-results");

  resultsDiv.innerHTML = `
    <div class="alert alert-success">
      <i class="bi bi-check-circle me-2"></i>
      <strong>Found ${
        fields.length
      } columns!</strong> Review and create headers:
    </div>
    
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-fields" onclick="toggleAllFields(this)" checked>
            </th>
            <th>Column Name</th>
            <th>Detected Type</th>
            <th>Sample Value</th>
            <th>Required</th>
          </tr>
        </thead>
        <tbody>
          ${fields
            .map(
              (field, index) => `
            <tr>
              <td>
                <input type="checkbox" class="field-checkbox" data-index="${index}" checked>
              </td>
              <td>
                <input type="text" class="form-control form-control-sm" 
                       value="${field.suggested_field_name}" 
                       id="field-name-${index}">
              </td>
              <td>
                <select class="form-select form-select-sm" id="field-type-${index}">
                  <option value="text" ${
                    field.detected_type === "text" ? "selected" : ""
                  }>Text</option>
                  <option value="number" ${
                    field.detected_type === "number" ? "selected" : ""
                  }>Number</option>
                  <option value="date" ${
                    field.detected_type === "date" ? "selected" : ""
                  }>Date</option>
                  <option value="boolean" ${
                    field.detected_type === "boolean" ? "selected" : ""
                  }>Boolean</option>
                </select>
              </td>
              <td><small class="text-muted">${
                field.sample_values[0] || "-"
              }</small></td>
              <td>
                <input type="checkbox" id="field-required-${index}" 
                       ${field.is_required_suggestion ? "checked" : ""}>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="d-grid gap-2">
      <button class="btn btn-success btn-lg" onclick="createBulkHeaders()">
        <i class="bi bi-check2-all me-2"></i>Create Selected Headers
      </button>
      <button class="btn btn-outline-secondary" onclick="clearExcelFile()">
        Cancel
      </button>
    </div>
  `;

  resultsDiv.style.display = "block";
}

/**
 * Toggle all field checkboxes
 */
function toggleAllFields(checkbox) {
  document.querySelectorAll(".field-checkbox").forEach((cb) => {
    cb.checked = checkbox.checked;
  });
}

/**
 * Create headers in bulk from detected fields
 */
async function createBulkHeaders() {
  const selectedFields = [];

  document.querySelectorAll(".field-checkbox:checked").forEach((checkbox) => {
    const index = checkbox.dataset.index;
    selectedFields.push({
      field_name: document.getElementById(`field-name-${index}`).value,
      field_type: document.getElementById(`field-type-${index}`).value,
      is_required: document.getElementById(`field-required-${index}`).checked,
      column_name: channelConfigState.detectedFields[index].column_name,
    });
  });

  if (selectedFields.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Fields Selected",
      text: "Please select at least one field to create",
    });
    return;
  }

  Swal.fire({
    title: "Creating Headers...",
    text: `Creating ${selectedFields.length} headers`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await axios.post(
      `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/fields/bulk`,
      {
        fields: selectedFields,
      }
    );

    Swal.fire({
      icon: "success",
      title: "Headers Created!",
      text: `Successfully created ${selectedFields.length} headers`,
      timer: 2000,
    });

    // Reload configuration
    loadPlatformConfiguration();
    clearExcelFile();
  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "Creation Failed",
      text: error.response?.data?.detail || "Failed to create headers",
    });
  }
}

/**
 * Render headers list
 */
function renderHeadersList() {
  const container =
    document.getElementById("fields-table-container") ||
    document.getElementById("headers-list-container");

  if (!container) return;

  if (channelConfigState.headers.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox display-4 d-block mb-3"></i>
        <p class="mb-0">No headers defined yet</p>
        <p class="small">Upload an Excel file or add headers manually</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th style="width: 40px;">#</th>
            <th>Header Name</th>
            <th>Field Key</th>
            <th>Type</th>
            <th>FLAGS</th>
            <th>Required</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${channelConfigState.headers
            .map((header, index) => {
              // Build constraint badges
              const badges = [];
              if (header.is_primary_key)
                badges.push(
                  '<span class="badge bg-warning text-dark" title="Primary Key">🔑 PK</span>'
                );
              if (header.is_unique)
                badges.push(
                  '<span class="badge bg-info" title="Unique">⭐ UNQ</span>'
                );
              if (header.foreign_key_table)
                badges.push(
                  '<span class="badge bg-success" title="Foreign Key">🔗 FK</span>'
                );
              if (header.is_indexed)
                badges.push(
                  '<span class="badge bg-secondary" title="Indexed">📊 IDX</span>'
                );

              return `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${header.field_name}</strong></td>
              <td><code class="small">${header.field_key}</code></td>
              <td><span class="badge bg-info">${header.field_type}</span></td>
              <td>${
                badges.length > 0
                  ? badges.join(" ")
                  : '<span class="text-muted small">—</span>'
              }</td>
              <td>${
                header.is_required
                  ? '<i class="bi bi-check-circle text-success"></i>'
                  : "—"
              }</td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showFieldEditModal(${
                  header.id
                })">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteHeader(${
                  header.id
                })">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render mappings list
 */
function renderMappingsList() {
  const container =
    document.getElementById("mapping-config-container") ||
    document.getElementById("mappings-container");

  if (!container) return;

  if (channelConfigState.headers.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-diagram-3 display-4 d-block mb-3"></i>
        <p class="mb-0">Define headers first to create mappings</p>
      </div>
    `;
    return;
  }

  // Dispatch scan fields available for mapping
  const scanFields = [
    { key: "platform_order_id", name: "Platform Order ID" },
    { key: "barcode_data", name: "Barcode Data" },
    { key: "awb_number", name: "AWB Number" },
    { key: "courier_partner", name: "Courier Partner" },
    { key: "warehouse_id", name: "Warehouse ID" },
  ];

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead class="table-light">
          <tr>
            <th>Channel Field</th>
            <th style="width: 60px;" class="text-center">→</th>
            <th>Dispatch Scan Field</th>
            <th style="width: 150px;">Bidirectional</th>
          </tr>
        </thead>
        <tbody>
          ${channelConfigState.headers
            .map((header) => {
              const existingMapping = channelConfigState.mappings.find(
                (m) => m.channel_field_key === header.field_key
              );
              return `
              <tr>
                <td>
                  <strong>${header.field_name}</strong><br>
                  <small class="text-muted">${header.field_type}</small>
                </td>
                <td class="text-center">
                  <i class="bi bi-arrow-right text-primary"></i>
                </td>
                <td>
                  <select class="form-select form-select-sm mapping-select" 
                          data-channel-field="${header.field_key}">
                    <option value="">-- Not Mapped --</option>
                    ${scanFields
                      .map(
                        (sf) => `
                      <option value="${sf.key}" ${
                          existingMapping?.scan_field_key === sf.key
                            ? "selected"
                            : ""
                        }>
                        ${sf.name}
                      </option>
                    `
                      )
                      .join("")}
                  </select>
                </td>
                <td class="text-center">
                  <input type="checkbox" class="form-check-input" 
                         data-channel-field="${header.field_key}"
                         ${existingMapping?.is_bidirectional ? "checked" : ""}>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="alert alert-info mt-3">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Bidirectional Sync:</strong> When enabled, scanning will update the channel field, 
      and importing will update the dispatch field.
    </div>
  `;
}

/**
 * Save mappings
 */
async function saveMappings() {
  const mappings = [];

  document.querySelectorAll(".mapping-select").forEach((select) => {
    if (select.value) {
      const channelField = select.dataset.channelField;
      const bidirectionalCheckbox = document.querySelector(
        `input[data-channel-field="${channelField}"]`
      );

      mappings.push({
        channel_field_key: channelField,
        scan_field_key: select.value,
        is_bidirectional: bidirectionalCheckbox
          ? bidirectionalCheckbox.checked
          : false,
      });
    }
  });

  try {
    await axios.post(
      `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/sync-to-master`,
      {
        mappings,
      }
    );

    Swal.fire({
      icon: "success",
      title: "Mappings Saved!",
      timer: 2000,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Save Failed",
      text: error.response?.data?.detail || "Failed to save mappings",
    });
  }
}

/**
 * Add header manually
 */
/**
 * Add header manually
 */
function addHeaderManually() {
  showFieldEditModal();
}

/**
 * Delete header
 */
async function deleteHeader(headerId) {
  const result = await Swal.fire({
    title: "Delete Header?",
    text: "This will remove the header definition",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Delete",
    confirmButtonColor: "#dc3545",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/fields/${headerId}`
      );
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 2000,
      });
      loadPlatformConfiguration();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete header",
      });
    }
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Show Enhanced Field Edit Modal with Schema Management
 */
/**
 * Show Enhanced Field Edit Modal with Schema Management
 */
/**
 * Generate Snake Case Key from Name
 * Usage: onkeyup="generateFieldKey(this.value)"
 */
function generateFieldKey(name) {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 50); // Limit length

  const keyInput = document.getElementById("edit-field-key");
  if (keyInput) {
    keyInput.value = key;
  }
}

/**
 * Show Enhanced Field Edit Modal with Schema Management
 */
async function showFieldEditModal(fieldId = null) {
  let field = null;
  const isEdit = !!fieldId;

  if (fieldId) {
    field = channelConfigState.headers.find((h) => h.id === fieldId);
    if (!field) return;
  }

  // Default structure for new field
  if (!field) {
    field = {
      field_name: "",
      field_key: "",
      field_type: "VARCHAR(255)",
      is_required: false,
      is_unique: false,
      is_primary_key: false,
      is_indexed: false,
      foreign_key_table: null,
      foreign_key_field: null,
      on_duplicate: "skip",
    };
  }

  // Get available FK tables
  let fkTables = [];
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/foreign-key-tables`
    );
    fkTables = response.data.tables || [];
  } catch (error) {
    fkTables = [];
  }

  const fkTableOptions = fkTables
    .map(
      (t) =>
        `<option value="${t.name}"${
          field.foreign_key_table === t.name ? " selected" : ""
        }>${t.label}</option>`
    )
    .join("");

  Swal.fire({
    title: isEdit ? "Edit Field Configuration" : "Add New Data Field",
    width: 800,
    background: "#f8f9fa",
    customClass: {
      popup: "shadow-lg rounded-4 border-0",
      title: "fw-bold text-dark mb-4",
    },
    html: `
      <div class="text-start px-3">
        <!-- Basic Info Section -->
        <div class="card shadow-sm border-0 mb-4">
           <div class="card-body bg-white rounded-3">
              <h6 class="text-uppercase text-muted fw-bold small mb-3"><i class="bi bi-card-text me-2"></i>Field Definition</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label fw-bold small text-secondary">Display Name</label>
                  <input type="text" class="form-control form-control-lg bg-light border-0 fw-bold text-dark" 
                         id="edit-field-name" value="${field.field_name}" 
                         placeholder="e.g. Customer Email"
                         ${
                           isEdit
                             ? "readonly"
                             : 'onkeyup="generateFieldKey(this.value)"'
                         }>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-bold small text-secondary">Database Key (Snake Case)</label>
                  <div class="input-group">
                    <span class="input-group-text bg-light border-0"><i class="bi bi-key text-muted"></i></span>
                    <input type="text" class="form-control bg-light border-0 font-monospace text-muted" 
                           id="edit-field-key" value="${
                             field.field_key
                           }" readonly placeholder="auto_generated_key">
                  </div>
                </div>
                <div class="col-12">
                   <label class="form-label fw-bold small text-secondary">Data Type</label>
                   <select class="form-select border-0 bg-light py-2" id="edit-field-type" ${
                     isEdit ? "disabled" : ""
                   }>
                      <option value="VARCHAR(255)" ${
                        field.field_type === "VARCHAR(255)" ? "selected" : ""
                      }>📝 Text (Short) - Names, Titles</option>
                      <option value="TEXT" ${
                        field.field_type === "TEXT" ? "selected" : ""
                      }>📄 Text (Long) - Descriptions, Notes</option>
                      <option value="INT" ${
                        field.field_type === "INT" ? "selected" : ""
                      }>🔢 Number (Integer) - Quantities, IDs</option>
                      <option value="DECIMAL(10,2)" ${
                        field.field_type === "DECIMAL(10,2)" ? "selected" : ""
                      }>💲 Decimal - Prices, Amounts</option>
                      <option value="DATETIME" ${
                        field.field_type === "DATETIME" ? "selected" : ""
                      }>📅 Date & Time</option>
                      <option value="BOOLEAN" ${
                        field.field_type === "BOOLEAN" ? "selected" : ""
                      }>✅ Yes/No (Boolean)</option>
                   </select>
                </div>
              </div>
           </div>
        </div>
        
        <!-- Constraints Section -->
        <div class="card shadow-sm border-0 mb-4 bg-white">
           <div class="card-body">
              <h6 class="text-uppercase text-muted fw-bold small mb-3"><i class="bi bi-shield-lock me-2"></i>Data Integrity & Constraints</h6>
              
              <div class="row g-3">
                 <div class="col-md-6">
                    <label class="d-flex align-items-center p-3 border rounded-3 h-100 hover-shadow transition-all cursor-pointer">
                       <input class="form-check-input me-3 fs-5" type="checkbox" id="edit-required" ${
                         field.is_required ? "checked" : ""
                       }>
                       <div>
                          <span class="d-block fw-bold text-dark">Required Field</span>
                          <span class="small text-muted d-block">Value cannot be empty (NOT NULL)</span>
                       </div>
                    </label>
                 </div>
                 
                 <div class="col-md-6">
                    <label class="d-flex align-items-center p-3 border rounded-3 h-100 hover-shadow transition-all cursor-pointer ${
                      isEdit ? "opacity-50" : ""
                    }">
                       <input class="form-check-input me-3 fs-5" type="checkbox" id="edit-unique" ${
                         field.is_unique ? "checked" : ""
                       } ${isEdit ? "disabled" : ""}>
                       <div>
                          <span class="d-block fw-bold text-dark">Unique Value</span>
                          <span class="small text-muted d-block">No duplicate values allowed</span>
                       </div>
                    </label>
                 </div>

                 <div class="col-md-6">
                    <label class="d-flex align-items-center p-3 border rounded-3 h-100 hover-shadow transition-all cursor-pointer ${
                      isEdit ? "opacity-50" : ""
                    }">
                       <input class="form-check-input me-3 fs-5" type="checkbox" id="edit-primary-key" ${
                         field.is_primary_key ? "checked" : ""
                       } ${isEdit ? "disabled" : ""}>
                       <div>
                          <span class="d-block fw-bold text-dark">Primary Key</span>
                          <span class="small text-muted d-block">Global unique identifier for rows</span>
                       </div>
                    </label>
                 </div>

                 <div class="col-md-6">
                    <label class="d-flex align-items-center p-3 border rounded-3 h-100 hover-shadow transition-all cursor-pointer ${
                      isEdit ? "opacity-50" : ""
                    }">
                       <input class="form-check-input me-3 fs-5" type="checkbox" id="edit-indexed" ${
                         field.is_indexed ? "checked" : ""
                       } ${isEdit ? "disabled" : ""}>
                       <div>
                          <span class="d-block fw-bold text-dark">Indexed</span>
                          <span class="small text-muted d-block">Optimize for faster searching</span>
                       </div>
                    </label>
                 </div>
              </div>
           </div>
        </div>
        
        <!-- Advanced Collapsible -->
        <div class="accordion" id="advancedFieldOpts">
          <div class="accordion-item border-0 shadow-sm rounded-3 overflow-hidden">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed bg-white fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapseAdvanced">
                <i class="bi bi-sliders me-2"></i> Advanced Options
              </button>
            </h2>
            <div id="collapseAdvanced" class="accordion-collapse collapse" data-bs-parent="#advancedFieldOpts">
              <div class="accordion-body bg-light">
                 <!-- Foreign Key -->
                 <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="edit-is-fk" ${
                      field.foreign_key_table ? "checked" : ""
                    } onchange="toggleFKFields()">
                    <label class="form-check-label fw-bold" for="edit-is-fk">Foreign Key Reference</label>
                 </div>
                 
                 <div id="fk-config" class="card card-body border-0 shadow-sm mb-3" style="display: ${
                   field.foreign_key_table ? "block" : "none"
                 }">
                    <div class="row g-3">
                       <div class="col-md-6">
                          <label class="form-label small fw-bold">Reference Table</label>
                          <select class="form-select form-select-sm" id="edit-fk-table">
                             <option value="">Select Table...</option>
                             ${fkTableOptions}
                          </select>
                       </div>
                       <div class="col-md-6">
                          <label class="form-label small fw-bold">Target Column</label>
                          <input type="text" class="form-control form-control-sm" id="edit-fk-field" value="${
                            field.foreign_key_field || "id"
                          }">
                       </div>
                    </div>
                 </div>

                 <!-- Duplicate Handling -->
                 <div class="mb-0">
                    <label class="form-label small fw-bold">Import Behavior (On Duplicate)</label>
                    <select class="form-select form-select-sm" id="edit-on-duplicate">
                       <option value="skip" ${
                         field.on_duplicate === "skip" ? "selected" : ""
                       }>Skip Row</option>
                       <option value="update" ${
                         field.on_duplicate === "update" ? "selected" : ""
                       }>Update Existing Record</option>
                       <option value="error" ${
                         field.on_duplicate === "error" ? "selected" : ""
                       }>Throw Error</option>
                    </select>
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Save Changes",
    cancelButtonText: "Cancel",
    didOpen: () => {
      window.toggleFKFields = function () {
        const isFk = document.getElementById("edit-is-fk").checked;
        document.getElementById("fk-config").style.display = isFk
          ? "block"
          : "none";
      };
    },
    preConfirm: async () => {
      const data = {
        field_name: document.getElementById("edit-field-name").value,
        field_key: document.getElementById("edit-field-key").value,
        field_type: document.getElementById("edit-field-type").value,
        is_required: document.getElementById("edit-required").checked,
        is_primary_key: document.getElementById("edit-primary-key").checked,
        is_unique: document.getElementById("edit-unique").checked,
        is_indexed: document.getElementById("edit-indexed").checked,
        foreign_key_table: document.getElementById("edit-is-fk").checked
          ? document.getElementById("edit-fk-table").value
          : null,
        foreign_key_field: document.getElementById("edit-is-fk").checked
          ? document.getElementById("edit-fk-field").value
          : null,
        on_duplicate: document.getElementById("edit-on-duplicate").value,
      };

      try {
        if (fieldId) {
          // Update existing
          await axios.put(
            `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/fields/${fieldId}`,
            data
          );
        } else {
          // Create new - check if targeting default table or custom table
          const selectedTableId = channelConfigState.selectedTableId;
          let endpoint;

          console.log("=== Advanced Field Editor Save ===");
          console.log("selectedTableId:", selectedTableId);

          if (selectedTableId && selectedTableId !== "default") {
            // Custom table
            endpoint = `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/tables/${selectedTableId}/fields`;
            console.log("Using CUSTOM table endpoint:", endpoint);
          } else {
            // Default table
            endpoint = `${API_BASE_URL}/api/mango/channels/${channelConfigState.currentPlatform}/fields`;
            console.log("Using DEFAULT table endpoint:", endpoint);
          }

          await axios.post(endpoint, data);
        }
        return true;
      } catch (error) {
        Swal.showValidationMessage(
          `Error: ${error.response?.data?.detail || error.message}`
        );
        return false;
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: "success",
        title: "Field Updated!",
        timer: 1500,
        showConfirmButton: false,
      });
      loadPlatformConfiguration();
    }
  });
}

// ========== CUSTOM CHANNEL CREATION ==========

/**
 * Show create channel modal with custom field builder
 */
/**
 * Show Create Channel Modal using Enhanced UI
 */
function showCreateChannelModal() {
  if (typeof showEnhancedCreateChannelModal === "function") {
    showEnhancedCreateChannelModal();
  } else {
    // Fallback to old modal if enhanced script not loaded
    // ... (old code truncated for brevity, practically we just assume it exists)
    console.error("Enhanced UI script not loaded");
    Swal.fire(
      "Error",
      "Enhanced UI component missing. Please refresh.",
      "error"
    );
  }
}

/**
 * Add custom field - opens advanced configuration modal
 */
function addCustomField() {
  showAdvancedFieldModal();
}

/**
 * Show advanced field configuration modal
 */
function showAdvancedFieldModal(fieldData = null) {
  const isEdit = fieldData !== null;
  const field = fieldData || {
    name: "",
    type: "VARCHAR(255)",
    required: false,
    unique: false,
    primaryKey: false,
    autoIncrement: false,
    indexed: false,
    validation: "none",
    validationPattern: "",
    minValue: "",
    maxValue: "",
    minLength: "",
    maxLength: "",
    defaultValue: "",
    description: "",
  };

  const existingModal = document.getElementById("advancedFieldModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.className = "modal fade show d-block";
  modal.style.backgroundColor = "rgba(0,0,0,0.6)";
  modal.id = "advancedFieldModal";
  modal.innerHTML = `
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">
            <i class="bi bi-gear me-2"></i>${
              isEdit ? "Edit" : "Add"
            } Field Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" onclick="closeFieldModal()"></button>
        </div>
        <div class="modal-body">
          <form id="advanced-field-form">
            <div class="row">
              <!-- Left Column: Basic Properties -->
              <div class="col-md-6">
                <div class="card border mb-3">
                  <div class="card-header bg-light">
                    <strong><i class="bi bi-pencil-square me-2"></i>Basic Properties</strong>
                  </div>
                  <div class="card-body">
                    <div class="mb-3">
                      <label class="form-label">Field Name <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="field-name" 
                             value="${
                               field.name
                             }" placeholder="e.g., order_id, customer_email" required>
                      <small class="text-muted">Use lowercase with underscores</small>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Data Type <span class="text-danger">*</span></label>
                      <select class="form-select" id="field-type">
                        <option value="VARCHAR(50)" ${
                          field.type.startsWith("VARCHAR(50)") ? "selected" : ""
                        }>Text - Short (50 chars)</option>
                        <option value="VARCHAR(255)" ${
                          field.type === "VARCHAR(255)" ? "selected" : ""
                        }>Text - Medium (255 chars)</option>
                        <option value="TEXT" ${
                          field.type === "TEXT" ? "selected" : ""
                        }>Text - Long</option>
                        <option value="INT" ${
                          field.type === "INT" ? "selected" : ""
                        }>Number - Integer</option>
                        <option value="BIGINT" ${
                          field.type === "BIGINT" ? "selected" : ""
                        }>Number - Big Integer</option>
                        <option value="DECIMAL(12,2)" ${
                          field.type === "DECIMAL(12,2)" ? "selected" : ""
                        }>Number - Decimal (12,2)</option>
                        <option value="DECIMAL(18,4)" ${
                          field.type === "DECIMAL(18,4)" ? "selected" : ""
                        }>Number - Decimal (18,4)</option>
                        <option value="DATETIME" ${
                          field.type === "DATETIME" ? "selected" : ""
                        }>Date & Time</option>
                        <option value="DATE" ${
                          field.type === "DATE" ? "selected" : ""
                        }>Date Only</option>
                        <option value="TIME" ${
                          field.type === "TIME" ? "selected" : ""
                        }>Time Only</option>
                        <option value="BOOLEAN" ${
                          field.type === "BOOLEAN" ? "selected" : ""
                        }>Yes/No (Boolean)</option>
                        <option value="JSON" ${
                          field.type === "JSON" ? "selected" : ""
                        }>JSON Data</option>
                      </select>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Default Value</label>
                      <input type="text" class="form-control" id="field-default" 
                             value="${
                               field.defaultValue
                             }" placeholder="Optional default value">
                      <small class="text-muted">Use CURRENT_TIMESTAMP for datetime</small>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">Description</label>
                      <textarea class="form-control" id="field-description" rows="2" 
                                placeholder="Brief description of this field">${
                                  field.description
                                }</textarea>
                    </div>
                  </div>
                </div>

                <!-- Constraints Card -->
                <div class="card border">
                  <div class="card-header bg-light">
                    <strong><i class="bi bi-shield-lock me-2"></i>Constraints & Keys</strong>
                  </div>
                  <div class="card-body">
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="field-required" 
                             ${field.required ? "checked" : ""}>
                      <label class="form-check-label" for="field-required">
                        <strong>Required</strong> <small class="text-muted">(NOT NULL)</small>
                      </label>
                    </div>
                    
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="field-unique" 
                             ${field.unique ? "checked" : ""}>
                      <label class="form-check-label" for="field-unique">
                        <strong>Unique</strong> <small class="text-muted">(No duplicates)</small>
                      </label>
                    </div>
                    
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="field-primary" 
                             ${field.primaryKey ? "checked" : ""}>
                      <label class="form-check-label" for="field-primary">
                        <strong>Primary Key</strong> <small class="text-muted">(Table identifier)</small>
                      </label>
                    </div>
                    
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="field-autoincrement" 
                             ${field.autoIncrement ? "checked" : ""}>
                      <label class="form-check-label" for="field-autoincrement">
                        <strong>Auto-increment</strong> <small class="text-muted">(For numbers)</small>
                      </label>
                    </div>
                    
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="field-indexed" 
                             ${field.indexed ? "checked" : ""}>
                      <label class="form-check-label" for="field-indexed">
                        <strong>Indexed</strong> <small class="text-muted">(Faster searches)</small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Validations -->
              <div class="col-md-6">
                <div class="card border mb-3">
                  <div class="card-header bg-light">
                    <strong><i class="bi bi-check-circle me-2"></i>Data Validation</strong>
                  </div>
                  <div class="card-body">
                    <div class="mb-3">
                      <label class="form-label">Validation Type</label>
                      <select class="form-select" id="field-validation" onchange="toggleValidationOptions()">
                        <option value="none" ${
                          field.validation === "none" ? "selected" : ""
                        }>No Validation</option>
                        <option value="email" ${
                          field.validation === "email" ? "selected" : ""
                        }>Email Address</option>
                        <option value="phone" ${
                          field.validation === "phone" ? "selected" : ""
                        }>Phone Number</option>
                        <option value="url" ${
                          field.validation === "url" ? "selected" : ""
                        }>Website URL</option>
                        <option value="regex" ${
                          field.validation === "regex" ? "selected" : ""
                        }>Custom Regex Pattern</option>
                        <option value="range" ${
                          field.validation === "range" ? "selected" : ""
                        }>Number Range</option>
                        <option value="length" ${
                          field.validation === "length" ? "selected" : ""
                        }>Text Length</option>
                      </select>
                    </div>
                    
                    <!-- Regex Pattern -->
                    <div class="mb-3 validation-option" id="regex-option" style="display: none;">
                      <label class="form-label">Regex Pattern</label>
                      <input type="text" class="form-control font-monospace" id="field-regex" 
                             value="${
                               field.validationPattern
                             }" placeholder="^[A-Z]{3}-\\d{6}$">
                      <small class="text-muted">Example: ^ORD-\\d{6}$ for "ORD-123456"</small>
                    </div>
                    
                    <!-- Number Range -->
                    <div class="validation-option" id="range-option" style="display: none;">
                      <div class="row">
                        <div class="col-6 mb-3">
                          <label class="form-label">Min Value</label>
                          <input type="number" class="form-control" id="field-min-value" 
                                 value="${field.minValue}" step="any">
                        </div>
                        <div class="col-6 mb-3">
                          <label class="form-label">Max Value</label>
                          <input type="number" class="form-control" id="field-max-value" 
                                 value="${field.maxValue}" step="any">
                        </div>
                      </div>
                    </div>
                    
                    <!-- Text Length -->
                    <div class="validation-option" id="length-option" style="display: none;">
                      <div class="row">
                        <div class="col-6 mb-3">
                          <label class="form-label">Min Length</label>
                          <input type="number" class="form-control" id="field-min-length" 
                                 value="${field.minLength}" min="0">
                        </div>
                        <div class="col-6 mb-3">
                          <label class="form-label">Max Length</label>
                          <input type="number" class="form-control" id="field-max-length" 
                                 value="${field.maxLength}" min="0">
                        </div>
                      </div>
                    </div>
                    
                    <!-- Validation Preview -->
                    <div class="alert alert-info py-2 mb-0">
                      <small>
                        <i class="bi bi-info-circle me-1"></i>
                        <span id="validation-preview">Select a validation type to see preview</span>
                      </small>
                    </div>
                  </div>
                </div>

                <!-- Validation Examples -->
                <div class="card border">
                  <div class="card-header bg-light">
                    <strong><i class="bi bi-lightbulb me-2"></i>Examples & Tips</strong>
                  </div>
                  <div class="card-body" id="validation-examples">
                    <p class="mb-1"><strong>Email:</strong> <code>admin@javelin.com</code></p>
                    <p class="mb-1"><strong>Phone:</strong> <code>+91 8585959905</code></p>
                    <p class="mb-1"><strong>URL:</strong> <code>https://www.astraz.in</code></p>
                    <p class="mb-0 text-muted small">Validation is applied during data import</p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeFieldModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="saveAdvancedField()">
            <i class="bi bi-check-circle me-2"></i>${
              isEdit ? "Update" : "Add"
            } Field
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Initialize validation options visibility
  toggleValidationOptions();
}

/**
 * Placeholder for closing the advanced field modal
 */
function closeFieldModal() {
  const modal = document.getElementById("advancedFieldModal");
  if (modal) {
    modal.remove();
  }
}

/**
 * Placeholder for toggling validation options visibility
 */
function toggleValidationOptions() {
  const validationType = document.getElementById("field-validation").value;
  document
    .querySelectorAll(".validation-option")
    .forEach((el) => (el.style.display = "none"));

  let previewText = "Select a validation type to see preview";

  switch (validationType) {
    case "regex":
      document.getElementById("regex-option").style.display = "block";
      previewText = "Custom regular expression pattern.";
      break;
    case "range":
      document.getElementById("range-option").style.display = "block";
      previewText = "Number must be within the specified range.";
      break;
    case "length":
      document.getElementById("length-option").style.display = "block";
      previewText = "Text length must be within the specified range.";
      break;
    case "email":
      previewText = "Value must be a valid email address.";
      break;
    case "phone":
      previewText = "Value must be a valid phone number.";
      break;
    case "url":
      previewText = "Value must be a valid URL.";
      break;
    case "none":
    default:
      // No specific options to show
      break;
  }
  document.getElementById("validation-preview").innerText = previewText;
}

/**
 * Placeholder for saving the advanced field configuration
 */
function saveAdvancedField() {
  const form = document.getElementById("advanced-field-form");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fieldName = document.getElementById("field-name").value;
  const fieldType = document.getElementById("field-type").value;
  const isRequired = document.getElementById("field-required").checked;
  const isUnique = document.getElementById("field-unique").checked;
  const isPrimaryKey = document.getElementById("field-primary").checked;
  const isAutoIncrement = document.getElementById(
    "field-autoincrement"
  ).checked;
  const isIndexed = document.getElementById("field-indexed").checked;
  const validation = document.getElementById("field-validation").value;
  const validationPattern = document.getElementById("field-regex").value;
  const minValue = document.getElementById("field-min-value").value;
  const maxValue = document.getElementById("field-max-value").value;
  const minLength = document.getElementById("field-min-length").value;
  const maxLength = document.getElementById("field-max-length").value;
  const defaultValue = document.getElementById("field-default").value;
  const description = document.getElementById("field-description").value;

  const newField = {
    name: fieldName,
    type: fieldType,
    required: isRequired,
    unique: isUnique,
    primary_key: isPrimaryKey, // Backend uses snake_case
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

  // Display field in container
  const container = document.getElementById("custom-fields-container");
  const fieldRow = document.createElement("div");
  fieldRow.className =
    "alert alert-secondary py-2 mb-2 d-flex justify-content-between align-items-center custom-field-row";
  fieldRow.setAttribute("data-field-config", JSON.stringify(newField)); // Store config

  fieldRow.innerHTML = `
    <div>
      <strong>${newField.name}</strong> (${newField.type}) 
      ${
        newField.required ? '<span class="badge bg-danger">Required</span>' : ""
      }
      ${newField.unique ? '<span class="badge bg-info">Unique</span>' : ""}
      ${newField.primary_key ? '<span class="badge bg-primary">PK</span>' : ""}
      ${
        newField.indexed
          ? '<span class="badge bg-secondary">Indexed</span>'
          : ""
      }
      ${
        newField.validation !== "none"
          ? `<span class="badge bg-warning">Validated (${newField.validation})</span>`
          : ""
      }
      <br><small class="text-muted">${
        newField.description || "No description"
      }</small>
    </div>
    <div>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.custom-field-row').remove()">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(fieldRow);

  closeFieldModal();
}

/**
 * Function to add a custom field (calls the enhanced modal)
 */
function addCustomField() {
  // Call the enhanced professional modal instead
  showEnhancedFieldModal();
}

/**
 * Close channel modal
 */
function closeChannelModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

/**
 * Create custom channel with advanced field configurations
 */
async function createCustomChannel() {
  const form = document.getElementById("create-channel-form");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const channelName = document.getElementById("channel-name").value;
  const channelType = document.getElementById("channel-type").value;
  const description = document.getElementById("channel-description").value;

  // Collect all advanced field configurations
  const customFields = [];
  // Enhanced UI uses cards with data-field-config
  const fieldRows = document.querySelectorAll(
    "#custom-fields-container .card, .custom-field-row"
  );
  fieldRows.forEach((row) => {
    const fieldConfigStr = row.getAttribute("data-field-config");
    if (fieldConfigStr) {
      try {
        const fieldConfig = JSON.parse(fieldConfigStr);
        customFields.push(fieldConfig);
      } catch (e) {
        console.error("Error parsing field config:", e);
      }
    }
  });

  try {
    const token = localStorage.getItem("access_token");

    // Create channel with all field configurations in one request
    const requestData = {
      channel_name: channelName,
      channel_type: channelType,
      description: description || null,
    };

    // Add fields if any are defined
    if (customFields.length > 0) {
      requestData.fields = customFields;
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/mango/channels/create`,
      requestData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const channelId = response.data.id;
    const tableName = response.data.table_name;

    closeChannelModal("createChannelModal");

    await Swal.fire({
      icon: "success",
      title: "Channel Created!",
      html: `
        <p>Channel "<strong>${
          response.data.channel_name
        }</strong>" created successfully!</p>
        <p class="text-muted small">
          Table: <code>${tableName}</code><br>
          Custom Fields: ${customFields.length} configured<br>
          ${
            customFields.length > 0
              ? `<strong>Features:</strong><br>
            ${
              customFields.filter((f) => f.validation !== "none").length
            } validated fields<br>
            ${
              customFields.filter((f) => f.unique).length
            } unique constraints<br>
            ${
              customFields.filter((f) => f.primary_key).length
            } primary keys<br>`
              : ""
          }
          You can now start uploading data to this channel.
        </p>
      `,
      confirmButtonText: "OK",
    });

    // Reload the configuration page to show new channel
    renderChannelSettings(document.querySelector(".main-content"));
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Failed to Create Channel",
      text: error.response?.data?.detail || error.message,
    });
  }
}

/**
 * Update custom channel
 */
async function updateCustomChannel(channelId) {
  const form = document.getElementById("create-channel-form");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Currently only supporting read-only view or basic updates if endpoint available
  // But user requested "Edit" functionality, so we should at least allow field additions if supported
  // For now, we'll just show a message as the backend endpoint might not support full updates yet
  // OR we implement the update call if backend supports it.

  // Assuming strict update is not yet fully supported (e.g. altering columns),
  // but we can update basic info.

  Swal.fire({
    icon: "info",
    title: "Update Feature",
    text: "Example implementation: Channel update logic would go here. Currently backend schema evolution is restricted.",
  });
}

// ========== CUSTOM CHANNELS LIST VIEW ==========

/**
 * Load and display custom channels list
 */
async function loadCustomChannelsList() {
  const container = document.getElementById("custom-channels-list");

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/list`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const channels = response.data;

    if (channels.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="bi bi-inbox fs-3 d-block mb-2"></i>
          <p class="mb-0">No custom channels created yet. Click "Create Custom Channel" to get started!</p>
        </div>
      `;
      return;
    }

    // Render channels as cards
    const channelsHTML = `
      <div class="row g-4">
        ${channels
          .map(
            (channel) => `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 border-0 shadow-sm channel-card hover-lift">
             <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="display-6">📦</div>
                  ${
                    channel.is_active
                      ? '<span class="badge bg-success-subtle text-success">Active</span>'
                      : '<span class="badge bg-secondary-subtle text-secondary">Inactive</span>'
                  }
                </div>
                <h5 class="card-title fw-bold mb-1 text-truncate" title="${
                  channel.channel_name
                }">
                    ${channel.channel_name}
                </h5>
                <p class="card-text text-muted small mb-3 text-truncate">
                   ${channel.description || "Custom Channel"}
                </p>
                <div class="d-grid gap-2">
                   <button class="btn btn-primary" onclick="openChannelConfig('${
                     channel.id
                   }', '${channel.channel_name.replace(/'/g, "\\'")}')">
                      <i class="bi bi-gear me-2"></i>Configure
                   </button>
                   <div class="btn-group w-100">
                      <button class="btn btn-outline-secondary btn-sm" onclick="editChannelFields(${
                        channel.id
                      }, '${channel.table_name}')" title="Edit Fields">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-outline-danger btn-sm" onclick="deleteCustomChannel(${
                        channel.id
                      }, '${channel.channel_name}')" title="Delete">
                        <i class="bi bi-trash"></i>
                      </button>
                   </div>
                </div>
             </div>
             <div class="card-footer bg-transparent border-0 pt-0">
               <small class="text-muted" style="font-size: 0.75rem;">
                 Created: ${new Date(channel.created_at).toLocaleDateString()}
               </small>
             </div>
          </div>
        </div>
        `
          )
          .join("")}
      </div>
    `;

    container.innerHTML = channelsHTML;
  } catch (error) {
    console.error("Error loading channels:", error);
    container.innerHTML = `
      <div class="alert alert-warning mb-0">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load custom channels: ${error.message}
      </div>
    `;
  }
}

/**
 * View channel details
 */
async function viewChannelDetails(channelId) {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const channel = response.data;

    Swal.fire({
      title: channel.channel_name,
      html: `
        <div class="text-start">
          <p><strong>Channel Code:</strong> <code>${
            channel.channel_code
          }</code></p>
          <p><strong>Type:</strong> ${channel.channel_type}</p>
          <p><strong>Table Name:</strong> <code>${channel.table_name}</code></p>
          <p><strong>Status:</strong> <span class="badge ${
            channel.is_active ? "bg-success" : "bg-secondary"
          }">${channel.is_active ? "Active" : "Inactive"}</span></p>
          <p><strong>Created:</strong> ${new Date(
            channel.created_at
          ).toLocaleString()}</p>
          ${
            channel.description
              ? `<p><strong>Description:</strong> ${channel.description}</p>`
              : ""
          }
        </div>
      `,
      icon: "info",
      confirmButtonText: "Close",
    });
  } catch (error) {
    Swal.fire("Error", "Failed to load channel details", "error");
  }
}

/**
 * Edit channel fields (Opens Enhanced UI in Edit Mode)
 */
function editChannelFields(channelId, tableName) {
  if (typeof showEnhancedCreateChannelModal === "function") {
    showEnhancedCreateChannelModal(channelId);
  } else {
    // Fallback
    Swal.fire({
      title: "Edit Channel Fields",
      html: `
        <p>You can edit the table structure for <code>${tableName}</code> in the Developer Panel.</p>
        <p class="text-muted small">Navigate to Developer Panel → Database Browser → ${tableName}</p>
      `,
      icon: "info",
    });
  }
}

/**
 * Delete custom channel
 */
async function deleteCustomChannel(channelId, channelName) {
  const result = await Swal.fire({
    title: "Delete Channel?",
    html: `
      <p>Are you sure you want to delete channel "<strong>${channelName}</strong>"?</p>
      <p class="text-danger"><strong>Warning:</strong> This will permanently delete the channel's database table and ALL its data!</p>
      <p class="text-muted small">This action cannot be undone.</p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(
        `${API_BASE_URL}/api/mango/channels/${channelId}?confirm=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Swal.fire("Deleted!", "Channel has been deleted.", "success");
      loadCustomChannelsList(); // Reload list
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to delete channel",
        "error"
      );
    }
  }
}
// Make functions global for inline onclick handlers
window.openChannelConfig = openChannelConfig;
window.editChannelFields = editChannelFields;
window.deleteCustomChannel = deleteCustomChannel;
window.backToLanding = backToLanding;
window.switchPlatform = switchPlatform;
window.showCreateChannelModal = showCreateChannelModal;
window.showFieldEditModal = showFieldEditModal;
window.deleteHeader = deleteHeader;
window.saveMasterMappings = saveMasterMappings;
window.saveDispatchMappings = saveDispatchMappings;
window.handleExcelSelect = handleExcelSelect;
window.handleExcelDrop = handleExcelDrop;
window.analyzeExcelFile = analyzeExcelFile;
window.clearExcelFile = clearExcelFile;
window.saveField = handleSaveField;
/**
 * Show Bulk Import Modal (SQL / File)
 */
async function showBulkImportModal() {
  const channelId = channelConfigState.currentPlatform;
  if (!channelId) return;

  // Load tables for dropdown
  let tablesOptions = '<option value="">Loading tables...</option>';
  let defaultTableId = channelConfigState.selectedTableId || "";
  
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
      `${API_BASE_URL}/api/mango/channels/${channelId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const { tables } = response.data;
    if (tables && tables.length > 0) {
      tablesOptions = tables.map(table => {
        const typeEmoji = {
          orders: "📦",
          returns: "↩️",
          inventory: "📊",
          custom: "🔧",
        };
        const emoji = typeEmoji[table.table_type] || "📋";
        const label = table.is_system ? "Default" : "Custom";
        const selected = table.id.toString() === defaultTableId.toString() ? "selected" : "";
        return `<option value="${table.id}" ${selected}>${emoji} ${table.display_name || table.table_name} (${label})</option>`;
      }).join("");
      
      // If no table was selected, use the first one
      if (!defaultTableId && tables.length > 0) {
        defaultTableId = tables[0].id.toString();
      }
    } else {
      tablesOptions = '<option value="">No tables available</option>';
    }
  } catch (error) {
    console.error("Failed to load tables:", error);
    tablesOptions = '<option value="">Error loading tables</option>';
  }

  const result = await Swal.fire({
    title: "Advanced Field Import",
    width: 800,
    background: "#f8f9fa",
    customClass: {
      popup: "shadow-lg rounded-4 border-0",
      confirmButton: "btn btn-primary px-4",
      cancelButton: "btn btn-outline-secondary px-4",
    },
    html: `
      <div class="text-start">
        <p class="text-muted small mb-4">
          Quickly define your schema by importing from SQL definitions or uploading a sample file.
        </p>
        
        <div class="mb-4">
          <label class="form-label fw-bold">
            <i class="bi bi-database me-1"></i>Select Table <span class="text-danger">*</span>
          </label>
          <select class="form-select" id="import_table_id" required>
            ${tablesOptions}
          </select>
          <small class="text-muted">Choose which table to import fields into</small>
        </div>
        
        <ul class="nav nav-pills nav-fill mb-4 gap-2" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active bg-white shadow-sm border" id="tab-sql" data-bs-toggle="pill" data-bs-target="#content-sql" type="button" role="tab">
              <i class="bi bi-filetype-sql me-2 text-primary"></i>SQL Import
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link bg-white shadow-sm border" id="tab-file" data-bs-toggle="pill" data-bs-target="#content-file" type="button" role="tab">
              <i class="bi bi-file-earmark-spreadsheet me-2 text-success"></i>CSV / Excel
            </button>
          </li>
        </ul>

        <div class="tab-content">
          <!-- SQL Tab -->
          <div class="tab-pane fade show active" id="content-sql" role="tabpanel">
            <label class="form-label fw-bold small text-secondary">Paste CREATE TABLE Statement</label>
            <textarea class="form-control font-monospace bg-white" id="import-sql-text" rows="8" 
              placeholder="CREATE TABLE orders (\n  id INT PRIMARY KEY,\n  customer_name VARCHAR(255),\n  amount DECIMAL(10,2)\n);"></textarea>
            <div class="form-text small"><i class="bi bi-info-circle me-1"></i>We'll extract field names and types automatically.</div>
          </div>

          <!-- File Tab -->
          <div class="tab-pane fade" id="content-file" role="tabpanel">
             <label class="form-label fw-bold small text-secondary">Upload Sample File</label>
             <div class="upload-box p-5 border-2 border-dashed rounded-3 text-center bg-white" onclick="document.getElementById('import-file-input').click()" style="cursor: pointer;">
                <input type="file" id="import-file-input" class="d-none" accept=".csv, .xlsx">
                <i class="bi bi-cloud-upload text-muted" style="font-size: 2rem;"></i>
                <p class="mb-0 mt-2 fw-bold text-dark">Click to upload</p>
                <p class="small text-muted mb-0">Supported formats: CSV, Excel (xlsx)</p>
                <p class="small text-primary mt-2" id="import-file-name"></p>
             </div>
          </div>
        </div>
        
        <!-- Preview Area (Hidden initially) -->
        <div id="import-preview-area" class="mt-4 d-none">
           <h6 class="fw-bold small text-uppercase text-muted mb-3">Preview Fields (<span id="preview-count">0</span>)</h6>
           <div class="table-responsive bg-white rounded-3 border shadow-sm" style="max-height: 200px;">
              <table class="table table-sm table-hover mb-0">
                 <thead class="bg-light sticky-top">
                    <tr>
                       <th class="ps-3">Name</th>
                       <th>Type</th>
                       <th>Options</th>
                    </tr>
                 </thead>
                 <tbody id="import-preview-body"></tbody>
              </table>
           </div>
        </div>

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Analyze & Import",
    cancelButtonText: "Cancel",
    didOpen: () => {
      // File input handler
      const fileInput = document.getElementById("import-file-input");
      fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) {
          document.getElementById("import-file-name").textContent =
            e.target.files[0].name;
        }
      });
    },
    preConfirm: async () => {
      // Get selected table ID
      const tableId = document.getElementById("import_table_id")?.value;
      if (!tableId) {
        Swal.showValidationMessage("Please select a table");
        return false;
      }

      // Check which tab is active (basic check via class)
      const sqlTab = document.getElementById("tab-sql");
      const isSql = sqlTab.classList.contains("active");

      try {
        let extractedFields = [];

        if (isSql) {
          const sqlText = document.getElementById("import-sql-text").value;
          if (!sqlText) throw new Error("Please enter SQL text");

          const response = await axios.post(
            `${API_BASE_URL}/api/mango/channels/${channelId}/schema/infer-sql`,
            {
              sql_text: sqlText,
            }
          );
          extractedFields = response.data.fields;
        } else {
          const fileInput = document.getElementById("import-file-input");
          if (!fileInput.files[0]) throw new Error("Please select a file");

          const formData = new FormData();
          formData.append("file", fileInput.files[0]);

          const response = await axios.post(
            `${API_BASE_URL}/api/mango/channels/${channelId}/schema/infer-file`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
          extractedFields = response.data.fields;
        }

        if (extractedFields.length === 0)
          throw new Error("No fields found to import");

        const total = extractedFields.length;
        let saved = 0;

        Swal.showLoading(); // Switch to loading state

        const token = localStorage.getItem("access_token");
        
        // Determine endpoint based on table selection
        const endpoint = tableId && tableId !== "default"
          ? `${API_BASE_URL}/api/mango/channels/${channelId}/tables/${tableId}/fields`
          : `${API_BASE_URL}/api/mango/channels/${channelId}/fields`;

        for (const field of extractedFields) {
          try {
            await axios.post(
              endpoint,
              {
                name: field.field_name,
                field_key: field.field_key || field.field_name?.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                type: field.field_type,
                required: field.is_required || false,
                unique: field.is_unique || false,
                primary_key: field.is_primary_key || false,
                indexed: field.is_indexed || false,
                validation: "none",
                on_duplicate: "skip",
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            saved++;
          } catch (fieldError) {
            // Log error but continue with other fields
            console.error(`Failed to save field ${field.field_name}:`, fieldError);
            // Don't increment saved count for failed fields
          }
        }

        return { saved, total };
      } catch (error) {
        Swal.showValidationMessage(
          error.response?.data?.detail || error.message
        );
        return false;
      }
    },
  });

  if (result.isConfirmed) {
    Swal.fire({
      icon: "success",
      title: "Import Successful",
      text: `Added ${result.value.saved} of ${result.value.total} fields to the schema.`,
      timer: 2000,
    });
    // Refresh list based on selected table
    const tableId = document.getElementById("import_table_id")?.value;
    if (tableId && tableId !== "default") {
      onTableSelected(tableId); // Reload custom table fields
    } else {
      loadPlatformConfiguration(); // Reload default table
    }
  }
}
window.showBulkImportModal = showBulkImportModal;
