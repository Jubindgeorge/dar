// studio.js - Complete Studio Editor & State Management Script

// 1. Render Dynamic Line Items Spreadsheet
function renderStudioSpreadsheetRows() {
    const tbody = document.getElementById('st-spreadsheet-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!state.currentStudioItems || state.currentStudioItems.length === 0) {
        state.currentStudioItems = [{ description: '', quantity: 1, price: 0, amount: 0 }];
    }

    state.currentStudioItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>
                <input type="text" class="form-control" value="${item.description || ''}" 
                    oninput="updateStudioItem(${index}, 'description', this.value)" 
                    placeholder="Work or Service Description">
            </td>
            <td>
                <input type="number" class="form-control text-center" value="${item.quantity ?? 1}" 
                    oninput="updateStudioItem(${index}, 'quantity', parseFloat(this.value) || 0)">
            </td>
            <td>
                <input type="number" class="form-control text-right" value="${item.price ?? 0}" 
                    oninput="updateStudioItem(${index}, 'price', parseFloat(this.value) || 0)">
            </td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="removeStudioRow(${index})" title="Remove Item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 2. Populate Service Presets Dropdown
function populateServiceInjectorDropdown() {
    const injectorSelect = document.getElementById('st-service-injector');
    if (!injectorSelect) return;

    injectorSelect.innerHTML = '<option value="">-- Choose Preset Catalog --</option>';
    
    const services = state.services || [];
    services.forEach((srv) => {
        const opt = document.createElement('option');
        opt.value = srv.id || srv.title;
        const govt = srv.govtAmt ?? srv.govtFee ?? 0;
        opt.textContent = `${srv.title} (Govt: AED ${govt})`;
        injectorSelect.appendChild(opt);
    });
}

// 3. Populate Client Selector Dropdown
function populateClientSelectorDropdown() {
    const clientSelect = document.getElementById('st-client-selector');
    if (!clientSelect) return;

    clientSelect.innerHTML = '<option value="">-- Select Registered Client --</option>';

    const clients = state.clients || [];
    clients.forEach((client) => {
        const opt = document.createElement('option');
        opt.value = client.id;
        opt.textContent = `${client.companyName || client.clientName} (${client.contactPerson || 'N/A'})`;
        clientSelect.appendChild(opt);
    });
}

// 4. Calculate and Recalculate Totals
function recalculateStudioTotals() {
    const itemsTotal = (state.currentStudioItems || []).reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + (qty * price);
    }, 0);

    const govtAmt = parseFloat(document.getElementById('st-govt-amt')?.value) || 0;
    const totalInput = document.getElementById('st-total-amt');
    
    if (totalInput) {
        totalInput.value = itemsTotal + govtAmt;
    }
}

// 5. Open Studio & Initialize View
function openStudio(type = 'Invoice', docId = null) {
    if (typeof state === 'undefined') {
        window.state = { currentStudioItems: [], services: [], clients: [], documents: [] };
    }

    state.currentStudioType = type; // 'Invoice' or 'Quotation'
    
    // Sync Switcher Dropdown UI
    const docTypeSelect = document.getElementById('st-doc-type');
    if (docTypeSelect) {
        docTypeSelect.value = type;
    }

    // Set view title
    const titleElem = document.getElementById('studio-mode-title');
    if (titleElem) {
        titleElem.textContent = `${type} Entry Studio`;
    }

    // Set document reference code
    const refCodeInput = document.getElementById('st-ref-code');
    if (refCodeInput && !docId) {
        const prefix = type === 'Quotation' ? 'QTN' : 'INV';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        refCodeInput.value = `${prefix}-${new Date().getFullYear()}-${randomNum}`;
    }

    // Default dates
    const today = new Date().toISOString().split('T')[0];
    const createdDateInput = document.getElementById('st-created-date');
    if (createdDateInput && !createdDateInput.value) {
        createdDateInput.value = today;
    }

    // Populate dropdown options
    populateServiceInjectorDropdown();
    populateClientSelectorDropdown();

    // Reset or load line items
    if (!docId && (!state.currentStudioItems || state.currentStudioItems.length === 0)) {
        state.currentStudioItems = [
            { description: '', quantity: 1, price: 0, amount: 0 }
        ];
    }

    renderStudioSpreadsheetRows();
    recalculateStudioTotals();

    // Switch view panel
    if (typeof switchTab === 'function') {
        switchTab('studio');
    }
}

// 6. Autofill Target Account Inputs when Client is Selected
function autofillStudioClient(clientId) {
    if (!clientId) return;

    const client = (state.clients || []).find((c) => c.id === clientId);
    if (!client) return;

    const nameInput = document.getElementById('st-client-name');
    const companyInput = document.getElementById('st-company-name');
    const contactInput = document.getElementById('st-contact-person');

    if (nameInput) nameInput.value = client.clientName || client.companyName || '';
    if (companyInput) companyInput.value = client.companyName || '';
    if (contactInput) contactInput.value = client.contactPerson || '';
}

// 7. Inject Selected Service Preset Items (Supports `d`, `q`, `p` keys from services.js)
function injectServicePresetToItems() {
    const injectorSelect = document.getElementById('st-service-injector');
    if (!injectorSelect) return;

    const selectedVal = injectorSelect.value;
    if (!selectedVal) return;

    // Find selected service from state array
    const service = (state.services || []).find((s) => 
        String(s.id) === String(selectedVal) || s.title === selectedVal || s.name === selectedVal
    );

    if (!service) {
        console.warn('Selected service preset not found in state:', selectedVal);
        return;
    }

    // Auto-populate Government Fee field
    const govtAmt = parseFloat(service.govtAmt ?? service.govtFee ?? service.govt_fee ?? 0) || 0;
    const govtInput = document.getElementById('st-govt-amt');
    if (govtInput) {
        govtInput.value = govtAmt;
    }

    // Resolve item breakdown array
    const rawItems = service.items || service.breakdown || service.services || service.serviceList || [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
        state.currentStudioItems = rawItems.map((item) => {
            const desc = item.d || item.description || item.title || item.name || 'Service Item';
            const qty = parseFloat(item.q ?? item.quantity ?? item.qty ?? 1) || 1;
            const price = parseFloat(item.p ?? item.price ?? item.amount ?? item.rate ?? 0) || 0;

            return {
                description: desc,
                quantity: qty,
                price: price,
                amount: qty * price
            };
        });
    } else {
        // Fallback: If service has no breakdown array
        const totalPrice = parseFloat(service.totalPrice || service.price || service.amount) || 0;
        state.currentStudioItems = [{
            description: service.title || service.name || 'Service Item',
            quantity: 1,
            price: totalPrice,
            amount: totalPrice
        }];
    }

    // Re-render table and update totals
    renderStudioSpreadsheetRows();
    recalculateStudioTotals();
}

// 8. Append Row
function addStudioRow(shouldRender = true) {
    if (!state.currentStudioItems) state.currentStudioItems = [];
    state.currentStudioItems.push({ description: '', quantity: 1, price: 0, amount: 0 });
    
    if (shouldRender) {
        renderStudioSpreadsheetRows();
    }
}

// 9. Remove Row
function removeStudioRow(index) {
    if (state.currentStudioItems.length <= 1) {
        state.currentStudioItems = [{ description: '', quantity: 1, price: 0, amount: 0 }];
    } else {
        state.currentStudioItems.splice(index, 1);
    }
    renderStudioSpreadsheetRows();
    recalculateStudioTotals();
}

// 10. Update Line Item Field
function updateStudioItem(index, field, value) {
    if (!state.currentStudioItems[index]) return;
    state.currentStudioItems[index][field] = value;
    
    if (field === 'quantity' || field === 'price') {
        const qty = parseFloat(state.currentStudioItems[index].quantity) || 0;
        const price = parseFloat(state.currentStudioItems[index].price) || 0;
        state.currentStudioItems[index].amount = qty * price;
    }
    
    recalculateStudioTotals();
}

// 11. Save Entry & Trigger Preview
function commitDocumentToMemory() {
    const type = state.currentStudioType || 'Invoice';
    const refCode = document.getElementById('st-ref-code').value || `${type.substring(0, 3).toUpperCase()}-001`;
    const clientName = document.getElementById('st-client-name').value || 'Unassigned Client';
    const companyName = document.getElementById('st-company-name').value || '';
    const contactPerson = document.getElementById('st-contact-person').value || '';
    const createdDate = document.getElementById('st-created-date').value || new Date().toISOString().split('T')[0];
    const expiryDate = document.getElementById('st-expiry-date').value || '';
    const govtAmt = parseFloat(document.getElementById('st-govt-amt').value) || 0;
    const totalAmt = parseFloat(document.getElementById('st-total-amt').value) || 0;
    const advanceAmt = parseFloat(document.getElementById('st-advance-amt').value) || 0;

    const docRecord = {
        id: refCode,
        refCode: refCode,
        type: type,
        clientName: clientName,
        companyName: companyName,
        contactPerson: contactPerson,
        createdDate: createdDate,
        expiryDate: expiryDate,
        govtAmt: govtAmt,
        totalAmt: totalAmt,
        advanceAmt: advanceAmt,
        items: [...state.currentStudioItems]
    };

    if (!state.documents) state.documents = [];
    const existingIndex = state.documents.findIndex(d => d.refCode === refCode);
    if (existingIndex >= 0) {
        state.documents[existingIndex] = docRecord;
    } else {
        state.documents.push(docRecord);
    }

    if (typeof openDocumentPreview === 'function') {
        openDocumentPreview(docRecord);
    } else {
        alert(`${type} created and saved successfully!`);
    }
}

// Switch document type directly from the Studio interface
function switchStudioDocType(newType) {
    state.currentStudioType = newType;
    
    // Update Mode Title Header
    const titleElem = document.getElementById('studio-mode-title');
    if (titleElem) {
        titleElem.textContent = `${newType} Entry Studio`;
    }

    // Regenerate Ref Code prefix if standard pattern is used
    const refCodeInput = document.getElementById('st-ref-code');
    if (refCodeInput) {
        const prefix = newType === 'Quotation' ? 'QTN' : 'INV';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        refCodeInput.value = `${prefix}-${new Date().getFullYear()}-${randomNum}`;
    }
}