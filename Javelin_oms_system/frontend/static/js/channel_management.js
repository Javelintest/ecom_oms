/**
 * Multi-Channel Master System - Channel Management UI
 * Frontend JavaScript for managing channels
 */

// API Base URL
const CHANNEL_API_BASE = `${API_BASE_URL}/api/mango/channels`;

/**
 * Load channels section
 * @param {HTMLElement} targetContainer - Optional container element to render into
 */
function loadChannelsSection(targetContainer) {
  const container = targetContainer || document.getElementById("main-content");

  if (!container) {
    console.error("Channel management container not found");
    return;
  }

  container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-diagram-3"></i> Channel Management</h2>
            <button class="btn btn-primary" onclick="showCreateChannelModal()">
                <i class="bi bi-plus-circle"></i> Add New Channel
            </button>
        </div>
        
        <div id="channels-list-container">
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading channels...</p>
            </div>
        </div>
        
        <!-- Hidden container for Channel Configuration -->
        <div id="channel-config-container" style="display: none;">
             <!-- Content will be injected by renderChannelSettings() -->
        </div>
    `;

  loadChannelsList();
}

/**
 * Load and display channels list
 */
async function loadChannelsList() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${CHANNEL_API_BASE}/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const channels = response.data;
    renderChannelsList(channels);
  } catch (error) {
    console.error("Error loading channels:", error);
    document.getElementById("channels-list-container").innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Failed to load channels: ${
                  error.response?.data?.detail || error.message
                }
            </div>
        `;
  }
}

/**
 * Render channels grid
 */
function renderChannelsList(channels) {
  const container = document.getElementById("channels-list-container");

  if (channels.length === 0) {
    container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i>
                No channels created yet. Click "Add New Channel" to get started!
            </div>
        `;
    return;
  }

  const channelsHTML = channels
    .map(
      (channel) => `
        <div class="col-md-4 mb-4">
            <div class="card h-100 ${!channel.is_active ? "opacity-50" : ""}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title">
                            <i class="bi bi-shop"></i> ${channel.channel_name}
                        </h5>
                        <span class="badge ${
                          channel.is_active ? "bg-success" : "bg-secondary"
                        }">
                            ${channel.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    
                    <p class="card-text text-muted small">
                        <strong>Type:</strong> ${channel.channel_type}<br>
                        <strong>Code:</strong> <code>${
                          channel.channel_code
                        }</code><br>
                        <strong>Table:</strong> <code>${
                          channel.table_name
                        }</code><br>
                        <strong>Created:</strong> ${new Date(
                          channel.created_at
                        ).toLocaleDateString()}
                    </p>
                    
                    ${
                      channel.description
                        ? `<p class="card-text"><small>${channel.description}</small></p>`
                        : ""
                    }
                    
                    <div id="channel-stats-${channel.id}" class="mb-3">
                        <small class="text-muted">Loading stats...</small>
                    </div>
                    
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="openChannelSettings(${
                          channel.id
                        }, '${channel.channel_name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-gear"></i> Configure
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="uploadOrdersToChannel(${
                          channel.id
                        })">
                            <i class="bi bi-upload"></i> Upload
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="editChannel(${
                          channel.id
                        })">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteChannel(${
                          channel.id
                        }, '${channel.channel_name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = `
        <div class="row">
            ${channelsHTML}
        </div>
    `;

  // Load stats for each channel
  channels.forEach((channel) => loadChannelStats(channel.id));
}

/**
 * Load channel statistics
 */
async function loadChannelStats(channelId) {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${CHANNEL_API_BASE}/${channelId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stats = response.data;
    document.getElementById(`channel-stats-${channelId}`).innerHTML = `
            <div class="progress mb-2" style="height: 20px;">
                <div class="progress-bar bg-success" role="progressbar" 
                    style="width: ${stats.sync_percentage}%" 
                    aria-valuenow="${stats.sync_percentage}" aria-valuemin="0" aria-valuemax="100">
                    ${stats.sync_percentage}%
                </div>
            </div>
            <small class="text-muted">
                <i class="bi bi-box"></i> ${stats.total_orders} orders 
                (<i class="bi bi-check-circle text-success"></i> ${stats.synced_orders} synced)
            </small>
        `;
  } catch (error) {
    console.error(`Error loading stats for channel ${channelId}:`, error);
  }
}

/**
 * Show create channel modal
 */
function showCreateChannelModal() {
  const modal = document.createElement("div");
  modal.className = "modal fade show d-block";
  modal.style.backgroundColor = "rgba(15, 23, 42, 0.6)"; // Darker, richer backdrop
  modal.style.backdropFilter = "blur(8px)"; // Glassmorphism blur
  modal.id = "createChannelModal";

  // Premium UI Structure
  modal.innerHTML = `
        <style>
            .premium-modal-dialog {
                max-width: 550px;
                margin: 3.5rem auto;
            }
            .premium-card {
                background: #ffffff;
                border: none;
                border-radius: 20px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                overflow: hidden;
            }
            .premium-header {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                padding: 30px 40px;
                color: white;
                position: relative;
            }
            .header-icon {
                font-size: 2.5rem;
                margin-bottom: 10px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent; 
                display: inline-block;
            }
            .close-btn-custom {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: rgba(255,255,255,0.7);
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            .close-btn-custom:hover {
                background: rgba(255,255,255,0.2);
                color: white;
            }
            .premium-body {
                padding: 40px;
                background: #f8fafc;
            }
            .form-floating-custom {
                position: relative;
                margin-bottom: 24px;
            }
            .form-floating-custom input,
            .form-floating-custom select,
            .form-floating-custom textarea {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px 16px 16px 50px; /* Space for icon */
                font-size: 1rem;
                width: 100%;
                transition: all 0.2s;
                color: #334155;
            }
            .form-floating-custom input:focus,
            .form-floating-custom select:focus,
            .form-floating-custom textarea:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                outline: none;
            }
            .input-icon {
                position: absolute;
                left: 18px;
                top: 18px;
                color: #94a3b8;
                font-size: 1.1rem;
                transition: color 0.2s;
            }
            .form-floating-custom input:focus + .input-icon, 
            .form-floating-custom select:focus + .input-icon {
                color: #3b82f6;
            }
            .field-label {
                position: absolute;
                left: 48px;
                top: 18px;
                color: #94a3b8;
                pointer-events: none;
                transition: all 0.2s;
                font-size: 1rem;
            }
            /* Active state for label */
            .form-floating-custom input:focus ~ .field-label,
            .form-floating-custom input:not(:placeholder-shown) ~ .field-label,
            .form-floating-custom select:focus ~ .field-label,
            .form-floating-custom select:valid ~ .field-label,
            .form-floating-custom textarea:focus ~ .field-label,
            .form-floating-custom textarea:not(:placeholder-shown) ~ .field-label {
                top: -10px;
                left: 12px;
                font-size: 0.8rem;
                background: #f8fafc;
                padding: 0 6px;
                color: #3b82f6;
                font-weight: 600;
            }
            .btn-action-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                padding: 14px 28px;
                border-radius: 12px;
                font-weight: 600;
                letter-spacing: 0.5px;
                width: 100%;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .btn-action-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
                color: white;
            }
            .helper-text {
                font-size: 0.8rem;
                color: #64748b;
                margin-top: 6px;
                margin-left: 12px;
                display: block;
            }
        </style>

        <div class="modal-dialog premium-modal-dialog">
            <div class="modal-content premium-card">
                <div class="modal-header premium-header d-block border-0">
                    <button type="button" class="close-btn-custom" onclick="closeModal('createChannelModal')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <div class="d-flex align-items-center mb-2">
                         <div class="header-icon-container me-3">
                            <span style="font-size: 2rem;">🚀</span>
                         </div>
                         <div>
                             <h4 class="modal-title fw-bold mb-1">Create Sales Channel</h4>
                             <p class="mb-0 text-white-50 small">Connect a new source to your order management system</p>
                         </div>
                    </div>
                </div>
                
                <div class="modal-body premium-body">
                    <form id="create-channel-form">
                        
                        <!-- Channel Name -->
                        <div class="form-floating-custom">
                            <input type="text" id="channel-name" placeholder=" " required autocomplete="off">
                            <i class="bi bi-tag input-icon"></i>
                            <label for="channel-name" class="field-label">Channel Name</label>
                            <span class="helper-text">e.g., "Amazon US", "Shopify Store", "Wholesale Portal"</span>
                        </div>
                        
                        <!-- Channel Type -->
                        <div class="form-floating-custom">
                             <select id="channel-type" required>
                                <option value="" disabled selected></option>
                                <option value="marketplace">Marketplace (Amazon, eBay, etc.)</option>
                                <option value="webstore">Webstore (Shopify, WooCommerce)</option>
                                <option value="offline">Offline / POS</option>
                                <option value="social">Social Commerce (Instagram, FB)</option>
                                <option value="b2b">B2B / Wholesale</option>
                            </select>
                            <i class="bi bi-grid input-icon"></i>
                            <label for="channel-type" class="field-label">Channel Type</label>
                        </div>
                        
                        <!-- Description -->
                        <div class="form-floating-custom mb-4">
                            <textarea id="channel-description" rows="3" placeholder=" " style="height: 100px; padding-top: 16px;"></textarea>
                            <i class="bi bi-file-text input-icon" style="top: 16px;"></i>
                            <label for="channel-description" class="field-label" style="top: 16px;">Description (Optional)</label>
                        </div>

                        <!-- Action Button -->
                        <button type="button" class="btn-action-primary" onclick="createChannel()">
                            <i class="bi bi-plus-lg me-2"></i> Create Channel
                        </button>
                        
                    </form>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
}

/**
 * Create new channel
 */
async function createChannel() {
  const form = document.getElementById("create-channel-form");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const channelName = document.getElementById("channel-name").value;
  const channelType = document.getElementById("channel-type").value;
  const description = document.getElementById("channel-description").value;

  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.post(
      `${CHANNEL_API_BASE}/create`,
      {
        channel_name: channelName,
        channel_type: channelType,
        description: description || null,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    closeModal("createChannelModal");

    Swal.fire({
      icon: "success",
      title: "Channel Created!",
      html: `
                <p>Channel "<strong>${response.data.channel_name}</strong>" created successfully!</p>
                <p class="text-muted small">
                    Table: <code>${response.data.table_name}</code><br>
                    You can now upload orders to this channel.
                </p>
            `,
      confirmButtonText: "OK",
    });

    loadChannelsList();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Failed to Create Channel",
      text: error.response?.data?.detail || error.message,
    });
  }
}

/**
 * Close modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

/**
 * View channel details
 */
async function viewChannelDetails(channelId) {
  try {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(`${CHANNEL_API_BASE}/${channelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const channel = response.data;

    Swal.fire({
      title: channel.channel_name,
      html: `
                <div class="text-start">
                    <p><strong>Channel Code:</strong> <code>${
                      channel.channel_code
                    }</code></p>
                    <p><strong>Type:</strong> ${channel.channel_type}</p>
                    <p><strong>Table Name:</strong> <code>${
                      channel.table_name
                    }</code></p>
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
 * Delete channel
 */
async function deleteChannel(channelId, channelName) {
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
      await axios.delete(`${CHANNEL_API_BASE}/${channelId}?confirm=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire("Deleted!", "Channel has been deleted.", "success");
      loadChannelsList();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.detail || "Failed to delete channel",
        "error"
      );
    }
  }
}

/**
 * Placeholder for upload orders (to be implemented in Phase 4)
 */
function uploadOrdersToChannel(channelId) {
  Swal.fire({
    title: "Upload Orders",
    text: "Excel upload feature will be implemented in Phase 4",
    icon: "info",
  });
}

/**
 * Edit channel
 */
function editChannel(channelId) {
  Swal.fire({
    title: "Edit Channel",
    text: "Channel editing feature coming soon",
    icon: "info",
  });
}

/**
 * Open channel settings page with proper name syncing
 */
function openChannelSettings(channelId, channelName) {
  if (typeof openChannelConfig === "function") {
    openChannelConfig(channelId, channelName);
  } else {
    // Fallback: navigate directly
    window.location.hash = `channel_settings/${channelId}`;
  }
}

// Make functions globally accessible
window.openChannelSettings = openChannelSettings;
