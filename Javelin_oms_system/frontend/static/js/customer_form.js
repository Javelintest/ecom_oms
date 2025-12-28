/**
 * Customer Form - Create/Edit Customer
 * Multi-step form with addresses and contacts management
 */

// ============================================================
// CUSTOMER FORM STATE
// ============================================================

let customerFormState = {
  currentStep: 1,
  totalSteps: 4,
  customerId: null,
  isEditMode: false,
  formData: {
    // Step 1: Basic Information
    name: "",
    display_name: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    customer_type: "RETAIL",

    // Step 2: Tax Information
    gst_number: "",
    pan_number: "",
    tax_registration_number: "",

    // Step 3: Addresses
    addresses: [],

    // Step 4: Contacts
    contacts: [],

    // Step 5: Financial Settings
    currency: "INR",
    payment_terms: "NET_30",
    credit_limit: 0,
    opening_balance: 0,
    opening_balance_date: null,
    notes: "",
    tags: [],
  },
};

// ============================================================
// OPEN CUSTOMER FORM
// ============================================================

function openCustomerForm(customerId = null) {
  customerFormState.customerId = customerId;
  customerFormState.isEditMode = !!customerId;
  customerFormState.currentStep = 1;

  if (customerId) {
    loadCustomerForEdit(customerId);
  } else {
    resetCustomerForm();
    showCustomerFormModal();
  }
}

function resetCustomerForm() {
  customerFormState.formData = {
    name: "",
    display_name: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    customer_type: "RETAIL",
    gst_number: "",
    pan_number: "",
    tax_registration_number: "",
    addresses: [],
    contacts: [],
    currency: "INR",
    payment_terms: "NET_30",
    credit_limit: 0,
    opening_balance: 0,
    opening_balance_date: null,
    notes: "",
    tags: [],
  };
}

async function loadCustomerForEdit(customerId) {
  try {
    const response = await axios.get(`/mango/customers/${customerId}`);
    const customer = response.data;

    customerFormState.formData = {
      name: customer.name || "",
      display_name: customer.display_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      mobile: customer.mobile || "",
      website: customer.website || "",
      customer_type: customer.customer_type || "RETAIL",
      gst_number: customer.gst_number || "",
      pan_number: customer.pan_number || "",
      tax_registration_number: customer.tax_registration_number || "",
      addresses: customer.addresses || [],
      contacts: customer.contacts || [],
      currency: customer.currency || "INR",
      payment_terms: customer.payment_terms || "NET_30",
      credit_limit: customer.credit_limit || 0,
      opening_balance: customer.opening_balance || 0,
      opening_balance_date: customer.opening_balance_date || null,
      notes: customer.notes || "",
      tags: customer.tags || [],
    };

    showCustomerFormModal();
  } catch (error) {
    console.error("Error loading customer:", error);
    Swal.fire("Error", "Failed to load customer details", "error");
  }
}

// ============================================================
// SHOW MODAL
// ============================================================

function showCustomerFormModal() {
  const modalHTML = `
        <div class="modal fade" id="customerFormModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header border-bottom-0 bg-light">
                        <div class="w-100">
                            <h5 class="modal-title mb-3">
                                <i class="bi bi-person-plus me-2"></i>
                                ${
                                  customerFormState.isEditMode
                                    ? "Edit Customer"
                                    : "New Customer"
                                }
                            </h5>
                            <!-- Progress Steps -->
                            <div class="progress-steps">
                                <div class="step ${
                                  customerFormState.currentStep === 1
                                    ? "active"
                                    : ""
                                } ${
    customerFormState.currentStep > 1 ? "completed" : ""
  }">
                                    <div class="step-number">1</div>
                                    <div class="step-label">Basic Info</div>
                                </div>
                                <div class="step-line"></div>
                                <div class="step ${
                                  customerFormState.currentStep === 2
                                    ? "active"
                                    : ""
                                } ${
    customerFormState.currentStep > 2 ? "completed" : ""
  }">
                                    <div class="step-number">2</div>
                                    <div class="step-label">Addresses</div>
                                </div>
                                <div class="step-line"></div>
                                <div class="step ${
                                  customerFormState.currentStep === 3
                                    ? "active"
                                    : ""
                                } ${
    customerFormState.currentStep > 3 ? "completed" : ""
  }">
                                    <div class="step-number">3</div>
                                    <div class="step-label">Contacts</div>
                                </div>
                                <div class="step-line"></div>
                                <div class="step ${
                                  customerFormState.currentStep === 4
                                    ? "active"
                                    : ""
                                }">
                                    <div class="step-number">4</div>
                                    <div class="step-label">Financial</div>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4" id="customerFormBody">
                        <!-- Form steps will be rendered here -->
                    </div>
                    <div class="modal-footer border-top-0 bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Cancel
                        </button>
                        <button type="button" 
                                class="btn btn-outline-primary" 
                                id="btnPrevStep"
                                onclick="previousFormStep()"
                                ${
                                  customerFormState.currentStep === 1
                                    ? "disabled"
                                    : ""
                                }>
                            <i class="bi bi-arrow-left me-2"></i>Previous
                        </button>
                        <button type="button" 
                                class="btn btn-primary" 
                                id="btnNextStep"
                                onclick="${
                                  customerFormState.currentStep === 4
                                    ? "submitCustomerForm()"
                                    : "nextFormStep()"
                                }">
                            ${
                              customerFormState.currentStep === 4
                                ? '<i class="bi bi-check-circle me-2"></i>Save Customer'
                                : 'Next<i class="bi bi-arrow-right ms-2"></i>'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Remove existing modal if any
  const existingModal = document.getElementById("customerFormModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add custom styles
  addCustomerFormStyles();

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("customerFormModal")
  );
  modal.show();

  // Render current step
  renderFormStep();
}

// ============================================================
// STEP NAVIGATION
// ============================================================

function nextFormStep() {
  if (validateCurrentStep()) {
    saveCurrentStepData();
    if (customerFormState.currentStep < customerFormState.totalSteps) {
      customerFormState.currentStep++;
      updateModalForStep();
      renderFormStep();
    }
  }
}

function previousFormStep() {
  saveCurrentStepData();
  if (customerFormState.currentStep > 1) {
    customerFormState.currentStep--;
    updateModalForStep();
    renderFormStep();
  }
}

function updateModalForStep() {
  // Update progress steps
  document.querySelectorAll(".progress-steps .step").forEach((step, index) => {
    step.classList.remove("active", "completed");
    if (index + 1 === customerFormState.currentStep) {
      step.classList.add("active");
    } else if (index + 1 < customerFormState.currentStep) {
      step.classList.add("completed");
    }
  });

  // Update buttons
  const btnPrev = document.getElementById("btnPrevStep");
  const btnNext = document.getElementById("btnNextStep");

  btnPrev.disabled = customerFormState.currentStep === 1;

  if (customerFormState.currentStep === 4) {
    btnNext.innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Customer';
    btnNext.onclick = submitCustomerForm;
  } else {
    btnNext.innerHTML = 'Next<i class="bi bi-arrow-right ms-2"></i>';
    btnNext.onclick = nextFormStep;
  }
}

// ============================================================
// RENDER FORM STEPS
// ============================================================

function renderFormStep() {
  const formBody = document.getElementById("customerFormBody");

  switch (customerFormState.currentStep) {
    case 1:
      formBody.innerHTML = renderStep1BasicInfo();
      break;
    case 2:
      formBody.innerHTML = renderStep2Addresses();
      attachAddressHandlers();
      break;
    case 3:
      formBody.innerHTML = renderStep3Contacts();
      attachContactHandlers();
      break;
    case 4:
      formBody.innerHTML = renderStep4Financial();
      break;
  }
}

function renderStep1BasicInfo() {
  const data = customerFormState.formData;
  return `
        <div class="step-content fade-in">
            <h6 class="text-primary mb-3"><i class="bi bi-info-circle me-2"></i>Basic Information</h6>
            
            <div class="row g-3">
                <!-- Customer Name -->
                <div class="col-md-6">
                    <label class="form-label required">Customer Name</label>
                    <input type="text" class="form-control" id="customerName" 
                           value="${
                             data.name
                           }" placeholder="Enter customer name" required>
                    <div class="invalid-feedback">Customer name is required</div>
                </div>
                
                <!-- Display Name -->
                <div class="col-md-6">
                    <label class="form-label">Display Name</label>
                    <input type="text" class="form-control" id="displayName" 
                           value="${
                             data.display_name
                           }" placeholder="Short name (optional)">
                    <small class="text-muted">Leave blank to use customer name</small>
                </div>
                
                <!-- Customer Type -->
                <div class="col-md-4">
                    <label class="form-label required">Customer Type</label>
                    <select class="form-select" id="customerType">
                        <option value="RETAIL" ${
                          data.customer_type === "RETAIL" ? "selected" : ""
                        }>Retail</option>
                        <option value="WHOLESALE" ${
                          data.customer_type === "WHOLESALE" ? "selected" : ""
                        }>Wholesale</option>
                        <option value="DISTRIBUTOR" ${
                          data.customer_type === "DISTRIBUTOR" ? "selected" : ""
                        }>Distributor</option>
                    </select>
                </div>
                
                <!-- Email -->
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" id="customerEmail" 
                           value="${
                             data.email
                           }" placeholder="customer@example.com">
                </div>
                
                <!-- Phone -->
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="customerPhone" 
                           value="${data.phone}" placeholder="+91 1234567890">
                </div>
                
                <!-- Mobile -->
                <div class="col-md-6">
                    <label class="form-label">Mobile</label>
                    <input type="tel" class="form-control" id="customerMobile" 
                           value="${data.mobile}" placeholder="+91 9876543210">
                </div>
                
                <!-- Website -->
                <div class="col-md-6">
                    <label class="form-label">Website</label>
                    <input type="url" class="form-control" id="customerWebsite" 
                           value="${
                             data.website
                           }" placeholder="https://example.com">
                </div>
            </div>
            
            <hr class="my-4">
            
            <h6 class="text-primary mb-3"><i class="bi bi-file-text me-2"></i>Tax Information</h6>
            
            <div class="row g-3">
                <!-- GST Number -->
                <div class="col-md-4">
                    <label class="form-label">GST Number (GSTIN)</label>
                    <input type="text" class="form-control" id="gstNumber" 
                           value="${
                             data.gst_number
                           }" placeholder="22AAAAA0000A1Z5" maxlength="15">
                    <small class="text-muted">15 characters</small>
                </div>
                
                <!-- PAN Number -->
                <div class="col-md-4">
                    <label class="form-label">PAN Number</label>
                    <input type="text" class="form-control" id="panNumber" 
                           value="${
                             data.pan_number
                           }" placeholder="ABCDE1234F" maxlength="10">
                    <small class="text-muted">10 characters</small>
                </div>
                
                <!-- Tax Registration -->
                <div class="col-md-4">
                    <label class="form-label">Tax Registration</label>
                    <input type="text" class="form-control" id="taxRegistration" 
                           value="${
                             data.tax_registration_number
                           }" placeholder="For international">
                </div>
            </div>
        </div>
    `;
}

function renderStep2Addresses() {
  const addresses = customerFormState.formData.addresses;
  return `
        <div class="step-content fade-in">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="text-primary mb-0"><i class="bi bi-geo-alt me-2"></i>Addresses</h6>
                <button type="button" class="btn btn-sm btn-primary" onclick="addNewAddress()">
                    <i class="bi bi-plus-circle me-2"></i>Add Address
                </button>
            </div>
            
            <div id="addressesList">
                ${
                  addresses.length === 0
                    ? `
                    <div class="text-center py-5">
                        <i class="bi bi-mailbox" style="font-size: 48px; color: #cbd5e1;"></i>
                        <p class="text-muted mt-3">No addresses added yet</p>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="addNewAddress()">
                            Add First Address
                        </button>
                    </div>
                `
                    : addresses
                        .map((addr, idx) => renderAddressCard(addr, idx))
                        .join("")
                }
            </div>
        </div>
    `;
}

function renderAddressCard(address, index) {
  return `
        <div class="card mb-3 address-card" data-index="${index}">
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Address Type</label>
                        <select class="form-select" data-field="address_type">
                            <option value="BOTH" ${
                              address.address_type === "BOTH" ? "selected" : ""
                            }>Both</option>
                            <option value="BILLING" ${
                              address.address_type === "BILLING"
                                ? "selected"
                                : ""
                            }>Billing</option>
                            <option value="SHIPPING" ${
                              address.address_type === "SHIPPING"
                                ? "selected"
                                : ""
                            }>Shipping</option>
                        </select>
                    </div>
                    <div class="col-md-8">
                        <label class="form-label">Address Line 1</label>
                        <input type="text" class="form-control" data-field="address_line1" 
                               value="${
                                 address.address_line1 || ""
                               }" placeholder="Building, Street">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Address Line 2</label>
                        <input type="text" class="form-control" data-field="address_line2" 
                               value="${
                                 address.address_line2 || ""
                               }" placeholder="Landmark (optional)">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">City</label>
                        <input type="text" class="form-control" data-field="city" 
                               value="${address.city || ""}" placeholder="City">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">State</label>
                        <input type="text" class="form-control" data-field="state" 
                               value="${
                                 address.state || ""
                               }" placeholder="State">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Country</label>
                        <input type="text" class="form-control" data-field="country" 
                               value="${
                                 address.country || "India"
                               }" placeholder="Country">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Postal Code</label>
                        <input type="text" class="form-control" data-field="postal_code" 
                               value="${
                                 address.postal_code || ""
                               }" placeholder="123456">
                    </div>
                    <div class="col-md-6">
                        <div class="form-check mt-4">
                            <input class="form-check-input" type="checkbox" data-field="is_default" 
                                   ${
                                     address.is_default ? "checked" : ""
                                   } id="default${index}">
                            <label class="form-check-label" for="default${index}">
                                Set as default address
                            </label>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger mt-3" onclick="removeAddress(${index})">
                    <i class="bi bi-trash me-2"></i>Remove Address
                </button>
            </div>
        </div>
    `;
}

function renderStep3Contacts() {
  const contacts = customerFormState.formData.contacts;
  return `
        <div class="step-content fade-in">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="text-primary mb-0"><i class="bi bi-person me-2"></i>Contact Persons</h6>
                <button type="button" class="btn btn-sm btn-primary" onclick="addNewContact()">
                    <i class="bi bi-plus-circle me-2"></i>Add Contact
                </button>
            </div>
            
            <div id="contactsList">
                ${
                  contacts.length === 0
                    ? `
                    <div class="text-center py-5">
                        <i class="bi bi-person-badge" style="font-size: 48px; color: #cbd5e1;"></i>
                        <p class="text-muted mt-3">No contact persons added yet</p>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="addNewContact()">
                            Add First Contact
                        </button>
                    </div>
                `
                    : contacts
                        .map((contact, idx) => renderContactCard(contact, idx))
                        .join("")
                }
            </div>
        </div>
    `;
}

function renderContactCard(contact, index) {
  return `
        <div class="card mb-3 contact-card" data-index="${index}">
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" data-field="name" 
                               value="${
                                 contact.name || ""
                               }" placeholder="Contact Person Name">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" data-field="email" 
                               value="${
                                 contact.email || ""
                               }" placeholder="email@example.com">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Phone</label>
                        <input type="tel" class="form-control" data-field="phone" 
                               value="${
                                 contact.phone || ""
                               }" placeholder="+91 1234567890">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Mobile</label>
                        <input type="tel" class="form-control" data-field="mobile" 
                               value="${
                                 contact.mobile || ""
                               }" placeholder="+91 9876543210">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Designation</label>
                        <input type="text" class="form-control" data-field="designation" 
                               value="${
                                 contact.designation || ""
                               }" placeholder="Manager, Director, etc.">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Department</label>
                        <input type="text" class="form-control" data-field="department" 
                               value="${
                                 contact.department || ""
                               }" placeholder="Sales, Accounts, etc.">
                    </div>
                    <div class="col-md-6">
                        <div class="form-check mt-4">
                            <input class="form-check-input" type="checkbox" data-field="is_primary" 
                                   ${
                                     contact.is_primary ? "checked" : ""
                                   } id="primary${index}">
                            <label class="form-check-label" for="primary${index}">
                                Primary contact
                            </label>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger mt-3" onclick="removeContact(${index})">
                    <i class="bi bi-trash me-2"></i>Remove Contact
                </button>
            </div>
        </div>
    `;
}

function renderStep4Financial() {
  const data = customerFormState.formData;
  return `
        <div class="step-content fade-in">
            <h6 class="text-primary mb-3"><i class="bi bi-cash-coin me-2"></i>Financial Settings</h6>
            
            <div class="row g-3">
                <!-- Currency -->
                <div class="col-md-4">
                    <label class="form-label">Currency</label>
                    <select class="form-select" id="currency">
                        <option value="INR" ${
                          data.currency === "INR" ? "selected" : ""
                        }>INR (₹)</option>
                        <option value="USD" ${
                          data.currency === "USD" ? "selected" : ""
                        }>USD ($)</option>
                        <option value="EUR" ${
                          data.currency === "EUR" ? "selected" : ""
                        }>EUR (€)</option>
                    </select>
                </div>
                
                <!-- Payment Terms -->
                <div class="col-md-4">
                    <label class="form-label">Payment Terms</label>
                    <select class="form-select" id="paymentTerms">
                        <option value="CASH" ${
                          data.payment_terms === "CASH" ? "selected" : ""
                        }>Cash</option>
                        <option value="COD" ${
                          data.payment_terms === "COD" ? "selected" : ""
                        }>COD</option>
                        <option value="NET_15" ${
                          data.payment_terms === "NET_15" ? "selected" : ""
                        }>Net 15 Days</option>
                        <option value="NET_30" ${
                          data.payment_terms === "NET_30" ? "selected" : ""
                        }>Net 30 Days</option>
                        <option value="NET_60" ${
                          data.payment_terms === "NET_60" ? "selected" : ""
                        }>Net 60 Days</option>
                        <option value="NET_90" ${
                          data.payment_terms === "NET_90" ? "selected" : ""
                        }>Net 90 Days</option>
                    </select>
                </div>
                
                <!-- Credit Limit -->
                <div class="col-md-4">
                    <label class="form-label">Credit Limit</label>
                    <input type="number" class="form-control" id="creditLimit" 
                           value="${
                             data.credit_limit
                           }" placeholder="0.00" min="0" step="0.01">
                </div>
                
                <!-- Opening Balance -->
                <div class="col-md-6">
                    <label class="form-label">Opening Balance</label>
                    <input type="number" class="form-control" id="openingBalance" 
                           value="${
                             data.opening_balance
                           }" placeholder="0.00" step="0.01">
                    <small class="text-muted">Positive = Customer owes you, Negative = You owe customer</small>
                </div>
                
                <!-- Opening Balance Date -->
                <div class="col-md-6">
                    <label class="form-label">Opening Balance Date</label>
                    <input type="date" class="form-control" id="openingBalanceDate" 
                           value="${data.opening_balance_date || ""}">
                </div>
                
                <!-- Notes -->
                <div class="col-12">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" id="customerNotes" rows="3" 
                              placeholder="Additional notes about this customer...">${
                                data.notes
                              }</textarea>
                </div>
            </div>
        </div>
    `;
}

// Continue in next file part due to length...
