/**
 * Customer Form - Part 2: Handlers & Submission
 * Address/Contact management and Form submission
 */

// ============================================================
// ADDRESS MANAGEMENT
// ============================================================

function addNewAddress() {
  customerFormState.formData.addresses.push({
    address_type: "BOTH",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    is_default: customerFormState.formData.addresses.length === 0,
  });

  renderFormStep();
}

function removeAddress(index) {
  customerFormState.formData.addresses.splice(index, 1);
  renderFormStep();
}

function attachAddressHandlers() {
  document.querySelectorAll(".address-card").forEach((card) => {
    const index = parseInt(card.dataset.index);
    const address = customerFormState.formData.addresses[index];

    card.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.addEventListener("change", (e) => {
        if (input.type === "checkbox") {
          address[field] = input.checked;
          // If setting as default, unset others
          if (field === "is_default" && input.checked) {
            customerFormState.formData.addresses.forEach((addr, idx) => {
              if (idx !== index) addr.is_default = false;
            });
          }
        } else {
          address[field] = input.value;
        }
      });
    });
  });
}

// ============================================================
// CONTACT MANAGEMENT
// ============================================================

function addNewContact() {
  customerFormState.formData.contacts.push({
    name: "",
    email: "",
    phone: "",
    mobile: "",
    designation: "",
    department: "",
    is_primary: customerFormState.formData.contacts.length === 0,
  });

  renderFormStep();
}

function removeContact(index) {
  customerFormState.formData.contacts.splice(index, 1);
  renderFormStep();
}

function attachContactHandlers() {
  document.querySelectorAll(".contact-card").forEach((card) => {
    const index = parseInt(card.dataset.index);
    const contact = customerFormState.formData.contacts[index];

    card.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.addEventListener("change", (e) => {
        if (input.type === "checkbox") {
          contact[field] = input.checked;
          // If setting as primary, unset others
          if (field === "is_primary" && input.checked) {
            customerFormState.formData.contacts.forEach((cnt, idx) => {
              if (idx !== index) cnt.is_primary = false;
            });
          }
        } else {
          contact[field] = input.value;
        }
      });
    });
  });
}

// ============================================================
// SAVE CURRENT STEP DATA
// ============================================================

function saveCurrentStepData() {
  switch (customerFormState.currentStep) {
    case 1:
      customerFormState.formData.name =
        document.getElementById("customerName")?.value || "";
      customerFormState.formData.display_name =
        document.getElementById("displayName")?.value || "";
      customerFormState.formData.customer_type =
        document.getElementById("customerType")?.value || "RETAIL";
      customerFormState.formData.email =
        document.getElementById("customerEmail")?.value || "";
      customerFormState.formData.phone =
        document.getElementById("customerPhone")?.value || "";
      customerFormState.formData.mobile =
        document.getElementById("customerMobile")?.value || "";
      customerFormState.formData.website =
        document.getElementById("customerWebsite")?.value || "";
      customerFormState.formData.gst_number =
        document.getElementById("gst Number")?.value || "";
      customerFormState.formData.pan_number =
        document.getElementById("panNumber")?.value || "";
      customerFormState.formData.tax_registration_number =
        document.getElementById("taxRegistration")?.value || "";
      break;

    case 4:
      customerFormState.formData.currency =
        document.getElementById("currency")?.value || "INR";
      customerFormState.formData.payment_terms =
        document.getElementById("paymentTerms")?.value || "NET_30";
      customerFormState.formData.credit_limit = parseFloat(
        document.getElementById("creditLimit")?.value || 0
      );
      customerFormState.formData.opening_balance = parseFloat(
        document.getElementById("openingBalance")?.value || 0
      );
      customerFormState.formData.opening_balance_date =
        document.getElementById("openingBalanceDate")?.value || null;
      customerFormState.formData.notes =
        document.getElementById("customerNotes")?.value || "";
      break;
  }
}

// ============================================================
// VALIDATION
// ============================================================

function validateCurrentStep() {
  switch (customerFormState.currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    default:
      return true;
  }
}

function validateStep1() {
  const nameInput = document.getElementById("customerName");
  const gstInput = document.getElementById("gstNumber");
  const panInput = document.getElementById("panNumber");

  let isValid = true;

  // Validate customer name
  if (!nameInput.value.trim()) {
    nameInput.classList.add("is-invalid");
    isValid = false;
  } else {
    nameInput.classList.remove("is-invalid");
  }

  // Validate GST if provided
  if (gstInput.value && gstInput.value.length !== 15) {
    Swal.fire(
      "Validation Error",
      "GST Number must be exactly 15 characters",
      "warning"
    );
    gstInput.focus();
    return false;
  }

  // Validate PAN if provided
  if (panInput.value && panInput.value.length !== 10) {
    Swal.fire(
      "Validation Error",
      "PAN Number must be exactly 10 characters",
      "warning"
    );
    panInput.focus();
    return false;
  }

  if (!isValid) {
    Swal.fire(
      "Validation Error",
      "Please fill in all required fields",
      "warning"
    );
  }

  return isValid;
}

function validateStep2() {
  // Addresses are optional, but if added, validate key fields
  const hasInvalidAddress = customerFormState.formData.addresses.some(
    (addr) => {
      return (
        addr.address_line1 && (!addr.city || !addr.state || !addr.postal_code)
      );
    }
  );

  if (hasInvalidAddress) {
    Swal.fire(
      "Validation Error",
      "Please complete all address fields or remove incomplete addresses",
      "warning"
    );
    return false;
  }

  return true;
}

function validateStep3() {
  // Contacts are optional, but if added, validate name
  const hasInvalidContact = customerFormState.formData.contacts.some(
    (contact) => {
      return !contact.name || contact.name.trim() === "";
    }
  );

  if (hasInvalidContact) {
    Swal.fire(
      "Validation Error",
      "Please provide names for all contacts or remove them",
      "warning"
    );
    return false;
  }

  return true;
}

function validateStep4() {
  // All fields in step 4 are optional or have defaults
  return true;
}

// ============================================================
// FORM SUBMISSION
// ============================================================

async function submitCustomerForm() {
  if (!validateCurrentStep()) {
    return;
  }

  saveCurrentStepData();

  // Prepare data for API
  const submitData = {
    name: customerFormState.formData.name,
    display_name:
      customerFormState.formData.display_name ||
      customerFormState.formData.name,
    customer_type: customerFormState.formData.customer_type,
    email: customerFormState.formData.email,
    phone: customerFormState.formData.phone,
    mobile: customerFormState.formData.mobile,
    website: customerFormState.formData.website,
    gst_number: customerFormState.formData.gst_number,
    pan_number: customerFormState.formData.pan_number,
    tax_registration_number: customerFormState.formData.tax_registration_number,
    currency: customerFormState.formData.currency,
    payment_terms: customerFormState.formData.payment_terms,
    credit_limit: customerFormState.formData.credit_limit,
    opening_balance: customerFormState.formData.opening_balance,
    opening_balance_date: customerFormState.formData.opening_balance_date,
    notes: customerFormState.formData.notes,
    addresses: customerFormState.formData.addresses.filter(
      (addr) => addr.address_line1
    ), // Only send complete addresses
    contacts: customerFormState.formData.contacts.filter(
      (contact) => contact.name
    ), // Only send contacts with names
  };

  try {
    // Show loading
    Swal.fire({
      title: "Saving Customer...",
      text: "Please wait",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    let response;
    if (customerFormState.isEditMode) {
      response = await axios.put(
        `/mango/customers/${customerFormState.customerId}`,
        submitData
      );
    } else {
      response = await axios.post("/mango/customers", submitData);
    }

    // Close loading
    Swal.close();

    // Show success
    await Swal.fire({
      icon: "success",
      title: "Success!",
      text: `Customer ${
        customerFormState.isEditMode ? "updated" : "created"
      } successfully`,
      timer: 2000,
      showConfirmButton: false,
    });

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("customerFormModal")
    );
    modal.hide();

    // Reload customer list
    if (typeof loadCustomers === "function") {
      loadCustomers();
    }
  } catch (error) {
    console.error("Error saving customer:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text:
        error.response?.data?.detail ||
        "Failed to save customer. Please try again.",
    });
  }
}

// ============================================================
// CUSTOM STYLES
// ============================================================

function addCustomerFormStyles() {
  if (document.getElementById("customerFormStyles")) return;

  const styles = `
        <style id="customerFormStyles">
            .progress-steps {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
            }
            
            .step {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                flex: 0 0 auto;
            }
            
            .step-number {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #e9ecef;
                color: #6c757d;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .step.active .step-number {
                background: var(--bs-primary);
                color: white;
                box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.2);
            }
            
            .step.completed .step-number {
                background: #28a745;
                color: white;
            }
            
            .step-label {
                font-size: 12px;
                color: #6c757d;
                font-weight: 500;
            }
            
            .step.active .step-label {
                color: var(--bs-primary);
                font-weight: 600;
            }
            
            .step.completed .step-label {
                color: #28a745;
            }
            
            .step-line {
                flex: 1;
                height: 2px;
                background: #dee2e6;
                margin: 0 10px;
                position: relative;
                top: -10px;
            }
            
            .step-content {
                animation: fadeIn 0.3s ease-in;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .required::after {
                content: " *";
                color: #dc3545;
            }
            
            .address-card, .contact-card {
                transition: all 0.2s;
            }
            
            .address-card:hover, .contact-card:hover {
                box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,0.1);
            }
        </style>
    `;

  document.head.insertAdjacentHTML("beforeend", styles);
}
