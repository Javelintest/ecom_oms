
// ========================================
// CHANNEL MAPPING TOOL
// ========================================

async function openChannelMappingTool() {
    // Update URL hash for routing persistence
    window.location.hash = 'channel_mapping';
    
    const container = document.getElementById('dynamic-content');
    if (!container) return;
    
    try {
        // Fetch platforms and mappings
        const [platformsRes, mappingsRes, productsRes] = await Promise.all([
            axios.get(`${ROOT_API_URL}/mango/inventory/platforms`),
            axios.get(`${ROOT_API_URL}/mango/inventory/mappings`),
            axios.get(`${ROOT_API_URL}/mango/inventory/products`)
        ]);
        
        const platforms = platformsRes.data;
        const mappings = mappingsRes.data;
        const products = productsRes.data;
        
        container.innerHTML = `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 class="fw-bold mb-1"><i class="bi bi-diagram-3 me-2 text-primary"></i>Channel Mapping</h4>
                        <p class="text-muted mb-0 small">Map your internal SKUs to e-commerce platform codes</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary btn-sm" onclick="loadSection('inventory_items')">
                            <i class="bi bi-arrow-left me-1"></i> Back to Items
                        </button>
                        
                        <!-- Import/Export Dropdown -->
                        <div class="dropdown">
                            <button class="btn btn-light btn-sm px-2 shadow-sm border dropdown-toggle no-arrow" type="button" data-bs-toggle="dropdown" title="Bulk Operations">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><h6 class="dropdown-header">Bulk Operations</h6></li>
                                <li><a class="dropdown-item" href="#" onclick="downloadTemplate(); return false;">
                                    <i class="bi bi-download me-2"></i>Download Template
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="exportMappings(); return false;">
                                    <i class="bi bi-file-excel me-2"></i>Export All Mappings
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="openImportModal(); return false;">
                                    <i class="bi bi-upload me-2 text-primary"></i>Import Mappings
                                </a></li>
                            </ul>
                        </div>
                        
                        <button class="btn btn-primary btn-sm" onclick="openAddMappingModal()">
                            <i class="bi bi-plus-lg me-1"></i> Add Mapping
                        </button>
                    </div>
                </div>
                
                <!-- Filters -->
                <div class="card border-0 shadow-sm rounded-3 mb-3 bg-light">
                    <div class="card-body p-3">
                        <div class="row g-2 align-items-center">
                            <div class="col-auto">
                                <label class="form-label mb-0 small fw-bold text-muted">FILTERS:</label>
                            </div>
                            <div class="col-md-3">
                                <input type="text" id="mapping-search" class="form-control form-control-sm" placeholder="Search SKU or platform code..." oninput="filterMappings()">
                            </div>
                            <div class="col-auto">
                                <select id="mapping-platform-filter" class="form-select form-select-sm" onchange="filterMappings()" style="min-width: 180px;">
                                    <option value="">All Platforms</option>
                                    ${platforms.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-auto">
                                <button class="btn btn-sm btn-outline-secondary" onclick="clearMappingFilters()">
                                    <i class="bi bi-x-circle me-1"></i> Clear
                                </button>
                            </div>
                            <div class="col-auto ms-auto">
                                <span class="badge bg-primary" id="mapping-count">${mappings.length} mappings</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Mappings Table -->
                <div class="card border-0 shadow-sm rounded-3">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 mappings-table" style="white-space: nowrap;">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">Internal SKU</th>
                                    <th>Item Name</th>
                                    <th>Platform</th>
                                    <th>Platform Code</th>
                                    <th>Variant Code</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-center pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${mappings.length > 0 ? mappings.map(m => `
                                    <tr data-platform="${m.platform_name}" data-sku="${m.product_sku}" data-code="${m.platform_item_code}">
                                        <td class="ps-4"><strong>${m.product_sku || 'N/A'}</strong></td>
                                        <td>${m.product_name || 'N/A'}</td>
                                        <td><span class="badge bg-info">${m.platform_name}</span></td>
                                        <td><code>${m.platform_item_code}</code></td>
                                        <td>${m.platform_variant_code || '-'}</td>
                                        <td class="text-center">
                                            <span class="badge ${m.is_active ? 'bg-success' : 'bg-secondary'}">
                                                ${m.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td class="text-center pe-4">
                                            <div class="d-flex gap-1 justify-content-center">
                                                <button class="btn btn-sm btn-light border" onclick='editMapping(${JSON.stringify(m)})' title="Edit">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-light border text-danger" onclick="deleteMapping(${m.id})" title="Delete">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="7" class="text-center py-5 text-muted">
                                            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                                            No channel mappings found. Click "Add Mapping" to get started.
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Store data globally for modal access
        window.channelMappingData = { platforms, products };
        
    } catch (error) {
        console.error('Error loading channel mappings:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load channel mappings'
        });
    }
}

function filterMappings() {
    const search = (document.getElementById('mapping-search')?.value || '').toLowerCase();
    const platform = document.getElementById('mapping-platform-filter')?.value || '';
    
    const rows = document.querySelectorAll('.mappings-table tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const rowPlatform = row.dataset.platform || '';
        const rowSku = row.dataset.sku || '';
        const rowCode = row.dataset.code || '';
        const rowText = row.textContent.toLowerCase();
        
        const searchMatch = !search || rowText.includes(search) || rowSku.toLowerCase().includes(search) || rowCode.toLowerCase().includes(search);
        const platformMatch = !platform || rowPlatform === platform;
        
        if (searchMatch && platformMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    const countBadge = document.getElementById('mapping-count');
    if (countBadge) {
        countBadge.textContent = `${visibleCount} mappings`;
    }
}

function clearMappingFilters() {
    const search = document.getElementById('mapping-search');
    const platform = document.getElementById('mapping-platform-filter');
    
    if (search) search.value = '';
    if (platform) platform.value = '';
    
    filterMappings();
}

async function openAddMappingModal() {
    const { platforms, products } = window.channelMappingData || {};
    
    if (!platforms || !products) {
        Swal.fire('Error', 'Failed to load data', 'error');
        return;
    }
    
    // Platform icons mapping
    const platformIcons = {
        'Amazon': 'bi-amazon text-warning',
        'Flipkart': 'bi-cart4 text-primary',
        'Meesho': 'bi-bag-check text-danger',
        'Myntra': 'bi-stars text-info',
        'Shopify': 'bi-shop text-success',
        'WooCommerce': 'bi-wordpress text-primary',
        'Magento': 'bi-box-seam text-orange',
        'Others': 'bi-three-dots text-secondary'
    };
    
    const { value: formValues } = await Swal.fire({
        title: '',
        html: `
            <style>
                .mapping-modal-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    margin: -1.25rem -1.25rem 1.5rem -1.25rem;
                    border-radius: 0.5rem 0.5rem 0 0;
                }
                .mapping-modal-header h3 {
                    margin: 0;
                    font-weight: 600;
                    font-size: 1.5rem;
                }
                .mapping-modal-header p {
                    margin: 0.5rem 0 0 0;
                    opacity: 0.9;
                    font-size: 0.9rem;
                }
                .form-section {
                    background: #f8f9fa;
                    border-radius: 0.5rem;
                    padding: 1.25rem;
                    margin-bottom: 1.25rem;
                }
                .form-section-title {
                    font-weight: 600;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #6c757d;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .platform-select-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                }
                .platform-card {
                    border: 2px solid #e9ecef;
                    border-radius: 0.5rem;
                    padding: 1rem 0.5rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                }
                .platform-card:hover {
                    border-color: #667eea;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                    transform: translateY(-2px);
                }
                .platform-card.selected {
                    border-color: #667eea;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                }
                .platform-card i {
                    font-size: 1.75rem;
                    display: block;
                    margin-bottom: 0.5rem;
                }
                .platform-card .platform-name {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #495057;
                }
                .form-label-enhanced {
                    font-weight: 600;
                    color: #495057;
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .form-label-enhanced .required {
                    color: #dc3545;
                    font-size: 0.75rem;
                }
                .form-label-enhanced .optional {
                    color: #6c757d;
                    font-size: 0.75rem;
                    font-weight: 400;
                }
                .form-control-enhanced {
                    border: 2px solid #e9ecef;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1rem;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }
                .form-control-enhanced:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.15);
                }
                .helper-text {
                    font-size: 0.8rem;
                    color: #6c757d;
                    margin-top: 0.35rem;
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                }
                .status-toggle {
                    background: #f8f9fa;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .3s;
                    border-radius: 24px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #667eea;
                }
                input:checked + .slider:before {
                    transform: translateX(24px);
                }
                /* Product select styling */
                #mapping-product option:checked {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    font-weight: 600;
                }
                #mapping-product option:hover {
                    background: rgba(102, 126, 234, 0.1) !important;
                }
            </style>
            
            <div class="mapping-modal-header">
                <h3><i class="bi bi-plus-circle-fill me-2"></i>Create Channel Mapping</h3>
                <p>Connect your internal product to e-commerce platforms</p>
            </div>
            
            <div class="text-start">
                <!-- Product Selection Section -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="bi bi-box-seam"></i>
                        SELECT PRODUCT
                    </div>
                    <div>
                        <label class="form-label-enhanced">
                            Product
                            <span class="required">● Required</span>
                        </label>
                        
                        <!-- Selected Product Display -->
                        <div id="selected-product-display" class="alert alert-info d-none mb-3" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border: 2px solid #667eea; border-radius: 0.5rem; padding: 0.75rem;">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <small class="text-muted d-block mb-1">Selected Product:</small>
                                    <strong id="selected-product-text">-</strong>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearProductSelection()">
                                    <i class="bi bi-x"></i> Change
                                </button>
                            </div>
                        </div>
                        
                        <!-- Search Input -->
                        <div class="position-relative mb-2">
                            <input 
                                type="text" 
                                id="product-search" 
                                class="form-control form-control-enhanced" 
                                placeholder="Search by SKU or name..." 
                                oninput="filterProducts()"
                            >
                            <i class="bi bi-search position-absolute" style="right: 1rem; top: 50%; transform: translateY(-50%); color: #6c757d;"></i>
                        </div>
                        
                        <!-- Product Select with better styling -->
                        <select id="mapping-product" class="form-select form-control-enhanced" required size="5" style="height: 200px; cursor: pointer;" onchange="showSelectedProduct()">
                            <option value="" disabled selected style="color: #999;">Choose your internal product...</option>
                            ${products.map(p => `
                                <option value="${p.id}" data-sku="${p.sku}" data-name="${p.name}" style="padding: 0.5rem; cursor: pointer;">
                                    ${p.sku} - ${p.name}
                                </option>
                            `).join('')}
                        </select>
                        <div class="helper-text">
                            <i class="bi bi-info-circle"></i>
                            Type to search, then click to select
                        </div>
                    </div>
                </div>
                
                <!-- Platform Selection Section -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="bi bi-diagram-3"></i>
                        SELECT PLATFORM
                    </div>
                    <input type="hidden" id="mapping-platform" required>
                    <div class="platform-select-grid">
                        ${platforms.map(p => `
                            <div class="platform-card" onclick="selectPlatform('${p.value}', '${p.code_label}')" data-platform="${p.value}">
                                <i class="${platformIcons[p.value] || 'bi-globe'}"></i>
                                <div class="platform-name">${p.label}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="helper-text mt-2">
                        <i class="bi bi-info-circle"></i>
                        Click to select your target platform
                    </div>
                </div>
                
                <!-- Platform Details Section -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="bi bi-code-square"></i>
                        PLATFORM DETAILS
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label-enhanced" id="platform-code-label-enhanced">
                            Platform Code
                            <span class="required">● Required</span>
                        </label>
                        <input type="text" id="mapping-code" class="form-control form-control-enhanced" placeholder="Enter platform-specific code" required>
                        <div class="helper-text" id="code-helper">
                            <i class="bi bi-lightbulb"></i>
                            <span id="platform-specific-help">Enter the unique identifier from the platform</span>
                        </div>
                    </div>
                    
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label-enhanced">
                                Variant Code
                                <span class="optional">(Optional)</span>
                            </label>
                            <input type="text" id="mapping-variant" class="form-control form-control-enhanced" placeholder="e.g., RED-M">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-enhanced">
                                Listing URL
                                <span class="optional">(Optional)</span>
                            </label>
                            <input type="url" id="mapping-url" class="form-control form-control-enhanced" placeholder="https://...">
                        </div>
                    </div>
                </div>
                
                <!-- Additional Information Section -->
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="bi bi-journal-text"></i>
                        ADDITIONAL INFORMATION
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label-enhanced">
                            Notes
                            <span class="optional">(Optional)</span>
                        </label>
                        <textarea id="mapping-notes" class="form-control form-control-enhanced" rows="3" placeholder="Add any additional notes or comments..."></textarea>
                    </div>
                    
                    <div class="status-toggle">
                        <div>
                            <strong>Mapping Status</strong>
                            <div class="helper-text mt-1">
                                <i class="bi bi-toggle-on"></i>
                                Enable or disable this mapping
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="mapping-active" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `,
        width: '750px',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-check-lg me-2"></i>Create Mapping',
        cancelButtonText: '<i class="bi bi-x-lg me-2"></i>Cancel',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d',
        customClass: {
            popup: 'border-0 shadow-lg',
            confirmButton: 'px-4 py-2 fw-bold',
            cancelButton: 'px-4 py-2'
        },
        didOpen: () => {
            // Show selected product function
            window.showSelectedProduct = () => {
                const select = document.getElementById('mapping-product');
                const display = document.getElementById('selected-product-display');
                const text = document.getElementById('selected-product-text');
                
                if (select.value) {
                    const selectedOption = select.options[select.selectedIndex];
                    const sku = selectedOption.dataset.sku;
                    const name = selectedOption.dataset.name;
                    
                    text.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i>${sku} - ${name}`;
                    display.classList.remove('d-none');
                } else {
                    display.classList.add('d-none');
                }
            };
            
            // Clear product selection
            window.clearProductSelection = () => {
                const select = document.getElementById('mapping-product');
                const display = document.getElementById('selected-product-display');
                
                select.value = '';
                display.classList.add('d-none');
            };
            
            // Product filtering function
            window.filterProducts = () => {
                const searchText = document.getElementById('product-search').value.toLowerCase();
                const select = document.getElementById('mapping-product');
                const options = select.querySelectorAll('option');
                
                let visibleCount = 0;
                options.forEach(option => {
                    if (option.value === '') {
                        option.style.display = 'none';
                        return;
                    }
                    
                    const sku = option.dataset.sku?.toLowerCase() || '';
                    const name = option.dataset.name?.toLowerCase() || '';
                    
                    if (sku.includes(searchText) || name.includes(searchText)) {
                        option.style.display = '';
                        visibleCount++;
                    } else {
                        option.style.display = 'none';
                    }
                });
                
                // Auto-select if only one match
                if (visibleCount === 1) {
                    const visibleOption = Array.from(options).find(opt => opt.style.display !== 'none' && opt.value !== '');
                    if (visibleOption) {
                        select.value = visibleOption.value;
                    }
                }
            };
            
            // Platform selection function
            window.selectPlatform = (value, codeLabel) => {
                // Remove selected class from all
                document.querySelectorAll('.platform-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Add selected class
                const selectedCard = document.querySelector(`[data-platform="${value}"]`);
                if (selectedCard) {
                    selectedCard.classList.add('selected');
                }
                
                // Update hidden input
                document.getElementById('mapping-platform').value = value;
                
                // Update label
                const label = document.getElementById('platform-code-label-enhanced');
                label.innerHTML = `${codeLabel} <span class="required">● Required</span>`;
                
                // Update helper text
                const helpTexts = {
                    'Amazon': 'Enter the ASIN (Amazon Standard Identification Number) or Seller SKU',
                    'Flipkart': 'Enter the FSN (Flipkart Serial Number) or Product ID',
                    'Meesho': 'Enter the Meesho Product SKU',
                    'Myntra': 'Enter the Style ID from Myntra',
                    'Shopify': 'Enter the Product ID from Shopify admin',
                    'WooCommerce': 'Enter the Product ID from WooCommerce',
                    'Magento': 'Enter the SKU from Magento',
                    'Others': 'Enter the platform-specific product identifier'
                };
                
                document.getElementById('platform-specific-help').textContent = helpTexts[value] || 'Enter the unique identifier from the platform';
            };
        },
        preConfirm: () => {
            const product = document.getElementById('mapping-product').value;
            const platform = document.getElementById('mapping-platform').value;
            const code = document.getElementById('mapping-code').value;
            
            if (!product) {
                Swal.showValidationMessage('Please select a product');
                return false;
            }
            
            if (!platform) {
                Swal.showValidationMessage('Please select a platform');
                return false;
            }
            
            if (!code) {
                Swal.showValidationMessage('Please enter the platform code');
                return false;
            }
            
            return {
                product_id: parseInt(product),
                platform_name: platform,
                platform_item_code: code,
                platform_variant_code: document.getElementById('mapping-variant').value,
                platform_listing_url: document.getElementById('mapping-url').value,
                is_active: document.getElementById('mapping-active').checked,
                notes: document.getElementById('mapping-notes').value
            };
        }
    });
    
    if (formValues) {
        try {
            await axios.post(`${ROOT_API_URL}/mango/inventory/mappings`, formValues);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                html: '<p class="mb-0">Channel mapping created successfully</p>',
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'border-0 shadow-lg'
                }
            });
            
            openChannelMappingTool(); // Reload
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || 'Failed to create mapping',
                customClass: {
                    popup: 'border-0 shadow-lg'
                }
            });
        }
    }
}

async function editMapping(mapping) {
    const { platforms, products } = window.channelMappingData || {};
    
    const { value: formValues } = await Swal.fire({
        title: '<i class="bi bi-pencil text-primary me-2"></i>Edit Channel Mapping',
        html: `
            <div class="text-start">
                <div class="mb-3">
                    <label class="form-label fw-bold">Internal Product</label>
                    <input type="text" class="form-control" value="${mapping.product_sku} - ${mapping.product_name}" disabled>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Platform</label>
                    <input type="text" class="form-control" value="${mapping.platform_name}" disabled>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Platform Code <span class="text-danger">*</span></label>
                    <input type="text" id="edit-code" class="form-control" value="${mapping.platform_item_code}" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Variant Code</label>
                    <input type="text" id="edit-variant" class="form-control" value="${mapping.platform_variant_code || ''}">
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Listing URL</label>
                    <input type="url" id="edit-url" class="form-control" value="${mapping.platform_listing_url || ''}">
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Notes</label>
                    <textarea id="edit-notes" class="form-control" rows="2">${mapping.notes || ''}</textarea>
                </div>
                
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="edit-active" ${mapping.is_active ? 'checked' : ''}>
                    <label class="form-check-label" for="edit-active">Active</label>
                </div>
            </div>
        `,
        width: '600px',
        showCancelButton: true,
        confirmButtonText: 'Update Mapping',
        confirmButtonColor: '#0d6efd',
        preConfirm: () => {
            return {
                platform_item_code: document.getElementById('edit-code').value,
                platform_variant_code: document.getElementById('edit-variant').value || null,
                platform_listing_url: document.getElementById('edit-url').value || null,
                is_active: document.getElementById('edit-active').checked,
                notes: document.getElementById('edit-notes').value || null
            };
        }
    });
    
    if (formValues) {
        try {
            await axios.put(`${ROOT_API_URL}/mango/inventory/mappings/${mapping.id}`, formValues);
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Mapping updated successfully',
                timer: 2000,
                showConfirmButton: false
            });
            
            openChannelMappingTool(); // Reload
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || 'Failed to update mapping'
            });
        }
    }
}

async function deleteMapping(mappingId) {
    const result = await Swal.fire({
        title: 'Delete Mapping?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        try {
            await axios.delete(`${ROOT_API_URL}/mango/inventory/mappings/${mappingId}`);
            
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Mapping deleted successfully',
                timer: 2000,
                showConfirmButton: false
            });
            
            openChannelMappingTool(); // Reload
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to delete mapping'
            });
        }
    }
}

// ========================================
// BULK IMPORT/EXPORT FUNCTIONS
// ========================================

async function downloadTemplate() {
    try {
        const response = await axios.get(`${ROOT_API_URL}/mango/inventory/mappings/template`, {
            responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'channel_mapping_template.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
            icon: 'success',
            title: 'Template Downloaded!',
            text: 'Fill in the template and upload it using the Import option',
            timer: 3000
        });
    } catch (error) {
        Swal.fire('Error', 'Failed to download template', 'error');
    }
}

async function exportMappings() {
    try {
        const response = await axios.get(`${ROOT_API_URL}/mango/inventory/mappings/export`, {
            responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'channel_mappings.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
            icon: 'success',
            title: 'Exported!',
            text: 'All mappings have been exported to Excel',
            timer: 3000
        });
    } catch (error) {
        Swal.fire('Error', 'Failed to export mappings', 'error');
    }
}

async function openImportModal() {
    const { value: file } = await Swal.fire({
        title: '<i class="bi bi-upload text-primary me-2"></i>Import Channel Mappings',
        html: `
            <div class="text-start">
                <div class="alert alert-info mb-3">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Before importing:</strong>
                    <ul class="mb-0 mt-2 small">
                        <li>Download the template or export existing mappings</li>
                        <li>Fill in your mapping data</li>
                        <li>Ensure Internal SKUs exist in your item master</li>
                        <li>One product can only have ONE mapping per platform</li>
                    </ul>
                </div>
                
                <label class="form-label fw-bold">Select Excel File</label>
                <input type="file" id="import-file" class="form-control" accept=".xlsx,.xls">
                
                <div class="mt-3 text-muted small">
                    <i class="bi bi-lightbulb"></i> Supported formats: .xlsx, .xls
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-upload me-2"></i>Upload & Import',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0d6efd',
        width: '600px',
        preConfirm: () => {
            const fileInput = document.getElementById('import-file');
            const file = fileInput.files[0];
            
            if (!file) {
                Swal.showValidationMessage('Please select a file');
                return false;
            }
            
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                Swal.showValidationMessage('File must be an Excel file (.xlsx or .xls)');
                return false;
            }
            
            return file;
        }
    });
    
    if (file) {
        await uploadMappings(file);
    }
}

async function uploadMappings(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading
    Swal.fire({
        title: 'Processing...',
        html: 'Importing mappings from Excel file',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await axios.post(
            `${ROOT_API_URL}/mango/inventory/mappings/import`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        const result = response.data;
        
        // Show results
        let resultsHtml = `
            <div class="text-start">
                <div class="mb-3">
                    <strong>Import Summary:</strong>
                    <ul class="mt-2">
                        <li>Total rows: ${result.total_rows}</li>
                        <li class="text-success">✓ Successfully imported: ${result.success_count}</li>
                        <li class="text-danger">✗ Failed: ${result.error_count}</li>
                    </ul>
                </div>
        `;
        
        if (result.errors && result.errors.length > 0) {
            resultsHtml += `
                <div class="alert alert-warning">
                    <strong>Errors:</strong>
                    <div class="mt-2 small" style="max-height: 200px; overflow-y: auto;">
                        ${result.errors.map(err => `
                            <div class="mb-1">
                                Row ${err.row} (${err.sku}): ${err.error}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        resultsHtml += '</div>';
        
        await Swal.fire({
            icon: result.success_count > 0 ? 'success' : 'warning',
            title: result.success_count > 0 ? 'Import Complete!' : 'Import Failed',
            html: resultsHtml,
            width: '600px',
            confirmButtonText: 'OK'
        });
        
        // Reload mappings
        if (result.success_count > 0) {
            openChannelMappingTool();
        }
        
    } catch (error) {
        console.error('Import error:', error);
        
        let errorMsg = 'Failed to import mappings';
        
        if (error.response?.data?.detail) {
             const detail = error.response.data.detail;
             if (Array.isArray(detail)) {
                 errorMsg = `<div class="text-danger text-start">
                    <strong>Validation Errors:</strong>
                    <ul class="mb-0 ps-3 mt-1 small">
                        ${detail.map(d => `<li>${typeof d === 'object' ? (d.msg || JSON.stringify(d)) : d}</li>`).join('')}
                    </ul>
                 </div>`;
             } else if (typeof detail === 'object') {
                 errorMsg = JSON.stringify(detail);
             } else {
                 errorMsg = detail;
             }
        } else if (error.message) {
            errorMsg = error.message;
        }

        Swal.fire({
            icon: 'error',
            title: 'Import Failed',
            html: `<div class="text-start">${errorMsg}</div>`,
            width: '600px'
        });
    }
}
