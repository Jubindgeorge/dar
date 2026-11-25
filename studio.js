// studio.js - Service Entry Studio Logic updated for main package/service names
function studioLocalISODate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function openStudio(type, editRefCode = null) {
    state.activeEditingId = editRefCode || null;
    const openedDocument = editRefCode ? (state.documents || []).find(item => item.refCode === editRefCode) : null;
    state.activeEditingUpdatedAt = openedDocument?.updatedAt || '';
    const studioPanel = document.getElementById('tab-studio');
    if (studioPanel) studioPanel.classList.toggle('dar-edit-popup', !!editRefCode);
    switchTab('studio');
    const titleEl = document.getElementById('studio-mode-title');
    if (titleEl) titleEl.innerText = editRefCode ? `Edit ${type} - ${editRefCode}` : `Create New ${type}`;

    const docTypeEl = document.getElementById('st-doc-type');
    if (docTypeEl) { docTypeEl.value = type; docTypeEl.disabled = !!editRefCode; }

    const editRefEl = document.getElementById('st-ref-code');
    if (editRefEl) { editRefEl.value = editRefCode || ''; editRefEl.readOnly = !!editRefCode; }

    const dateEl = document.getElementById('st-created-date');
    if (dateEl) dateEl.value = studioLocalISODate();

    populateStudioInjectorSelect();
    populateStudioClientDropdown();
    state.selectedCompanyClientId = '';
    state.selectedStudioStaffId = '';

    if (editRefCode && state.documents) {
        const doc = state.documents.find(d => d.refCode === editRefCode);
        if (doc) {
            if (docTypeEl) docTypeEl.value = doc.type || type;
            if (editRefEl) editRefEl.value = doc.refCode || '';
            if (dateEl) dateEl.value = doc.transactionDate || doc.createdDate || studioLocalISODate();
            const branchEl = document.getElementById('st-branch-tag');
            if (branchEl) branchEl.value = doc.branchTag === 'staff' ? 'staff' : 'company';
            
            const expiryEl = document.getElementById('st-expiry-date');
            if (expiryEl) expiryEl.value = doc.visaExpiryDate || '';

            const clientSel = document.getElementById('st-client-selector');
            if (clientSel) clientSel.value = doc.companyName || doc.clientName || '';

            const clientNameInput = document.getElementById('st-client-name');
            if (clientNameInput) clientNameInput.value = doc.clientName || '';
            state.selectedCompanyClientId = doc.companyClientId || '';
            state.selectedStudioStaffId = doc.staffId || '';

            const compNameInput = document.getElementById('st-company-name');
            if (compNameInput) compNameInput.value = doc.companyName || '';

            const contactInput = document.getElementById('st-contact-person');
            if (contactInput) contactInput.value = doc.contactPerson || '';
            const notesInput = document.getElementById('st-notes');
            if (notesInput) notesInput.value = doc.notes || '';

            const govtInput = document.getElementById('st-govt-amt');
            if (govtInput) govtInput.value = doc.govtAmt ?? doc.govtFee ?? 0;

            const totalInput = document.getElementById('st-total-amt');
            if (totalInput) totalInput.value = doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount ?? 0;

            const processingInput = document.getElementById('st-processing-charges');
            if (processingInput) processingInput.value = doc.processingCharges ?? doc.processingCharge ?? 0;
            const discountInput = document.getElementById('st-discount-amt');
            if (discountInput) discountInput.value = doc.discountPercent ?? 0;
            const legacyDiscountInput = document.getElementById('st-legacy-discount-amt');
            if (legacyDiscountInput) legacyDiscountInput.value = doc.discountPercent == null ? (doc.discountAmount ?? doc.discountAmt ?? 0) : (doc.legacyDiscountAmount || 0);
            const advanceInput = document.getElementById('st-advance-amt');
            if (advanceInput) advanceInput.value = doc.advanceAmt ?? doc.advanceAmount ?? doc.advance ?? 0;

            const tbody = document.getElementById('st-spreadsheet-body');
            if (tbody) {
                const editItems = Array.isArray(doc.items) && doc.items.length ? doc.items : [{
                    packageName: doc.packageName || doc.serviceName || doc.title || 'Service Record',
                    serviceName: doc.packageName || doc.serviceName || doc.title || 'Service Record',
                    q: 1,
                    p: Number(doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount) || 0
                }];
                tbody.innerHTML = editItems.map((item, idx) => `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><input type="text" class="st-item-title" value="${escapeHtml(item.packageName || item.serviceName || item.title || item.d || '')}" placeholder="Service / Work title"></td>
                        <td><input type="text" class="st-item-description" value="${escapeHtml(item.description || '')}" placeholder="Description"></td>
                        <td style="text-align: center;"><input type="number" class="st-item-qty" value="${item.q || item.quantity || 1}" oninput="recalculateStudioTotals()"></td>
                        <td style="text-align: right;"><input type="number" class="st-item-price" value="${item.p || item.price || 0}" oninput="recalculateStudioTotals()"></td>
                        <td style="text-align: center;"><button type="button" onclick="this.closest('tr').remove(); recalculateStudioTotals();" class="btn btn-danger" style="padding: 4px 8px;">×</button></td>
                    </tr>
                `).join('');
            }
        }
    } else {
        const expiryEl = document.getElementById('st-expiry-date');
        if (expiryEl) expiryEl.value = '';
        const branchEl = document.getElementById('st-branch-tag');
        if (branchEl) branchEl.value = 'company';
        const clientSel = document.getElementById('st-client-selector');
        if (clientSel) clientSel.value = '';
        const clientNameInput = document.getElementById('st-client-name');
        if (clientNameInput) clientNameInput.value = '';
        const compNameInput = document.getElementById('st-company-name');
        if (compNameInput) compNameInput.value = '';
        const contactInput = document.getElementById('st-contact-person');
        if (contactInput) contactInput.value = '';
        const notesInput = document.getElementById('st-notes');
        if (notesInput) notesInput.value = '';
        const govtInput = document.getElementById('st-govt-amt');
        if (govtInput) govtInput.value = 0;
        const totalInput = document.getElementById('st-total-amt');
        if (totalInput) totalInput.value = 0;
        const processingInput = document.getElementById('st-processing-charges');
        if (processingInput) processingInput.value = 0;
        const discountInput = document.getElementById('st-discount-amt');
        if (discountInput) discountInput.value = 0;
        const legacyDiscountInput = document.getElementById('st-legacy-discount-amt');
        if (legacyDiscountInput) legacyDiscountInput.value = 0;
        const advanceInput = document.getElementById('st-advance-amt');
        if (advanceInput) advanceInput.value = 0;

        addStudioRow(false);
    }
    if (typeof populateCompanyClients === 'function') populateCompanyClients();
    populateStudioStaffDropdown();
    const staffSelect = document.getElementById('st-staff-selector');
    if (staffSelect) staffSelect.value = state.selectedStudioStaffId || '';
    recalculateStudioTotals();
}

window.closeStudioEditor = function() {
    const panel = document.getElementById('tab-studio');
    const type = document.getElementById('st-doc-type')?.value || 'Invoice';
    if (panel) panel.classList.remove('dar-edit-popup');
    state.activeEditingId = null;
    switchTab(type === 'Quotation' ? 'quotations' : 'documents');
};

function populateStudioClientDropdown() {
    const sel = document.getElementById('st-client-selector');
    if (!sel) return;
    const unique = [];
    const seen = new Set();
    (state.clients || []).forEach(c => {
        const key = (c.companyName || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
        if (!key || seen.has(key)) return;
        seen.add(key); unique.push(c);
    });
    sel.innerHTML = `<option value="">-- Select Registered Company --</option>` +
        unique.map(c => `<option value="${escapeHtml(c.companyName)}">${escapeHtml(c.companyName)}${c.contactPerson ? ` (${escapeHtml(c.contactPerson)})` : ''}</option>`).join('');
}

function populateStudioInjectorSelect() {
    const sel = document.getElementById('st-service-injector');
    if (!sel) return;
    sel.innerHTML = `<option value="">-- Choose Preset Catalog --</option>` +
        (state.services || []).filter(Boolean).map(s => `<option value="${escapeHtml(s.id || '')}">${escapeHtml(s.title || 'Untitled Service')} (Govt: AED ${Number.isFinite(Number(s.govtAmt)) ? Number(s.govtAmt) : 0})</option>`).join('');
}

function normalizeStudioCompanyName(value) {
    return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function populateStudioStaffDropdown() {
    const select = document.getElementById('st-staff-selector');
    if (!select) return;
    const companyName = document.getElementById('st-company-name')?.value || '';
    const normalized = normalizeStudioCompanyName(companyName);
    const company = (state.clients || []).find(item => normalizeStudioCompanyName(item.companyName) === normalized);
    const staff = (state.staff || []).filter(item => normalized && ((company?.id && item.companyId === company.id) || normalizeStudioCompanyName(item.companyName) === normalized)).sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));
    select.innerHTML = '<option value="">-- No staff selected --</option>' + staff.map(item => {
        const code = item.staffCode || item.staffId || item.id || '';
        const label = [code, item.fullName || 'Unnamed staff'].filter(Boolean).join(' · ');
        return '<option value="' + escapeHtml(item.id || '') + '">' + escapeHtml(label) + '</option>';
    }).join('');
    if (state.selectedStudioStaffId && staff.some(item => item.id === state.selectedStudioStaffId)) select.value = state.selectedStudioStaffId;
    else if (state.selectedStudioStaffId) { state.selectedStudioStaffId = ''; select.value = ''; }
}

function selectStudioStaff(staffId) {
    const staff = (state.staff || []).find(item => item.id === staffId);
    state.selectedStudioStaffId = staff ? staff.id : '';
    if (!staff) return;
    const companyInput = document.getElementById('st-company-name');
    if (companyInput && staff.companyName) companyInput.value = staff.companyName;
    const clientInput = document.getElementById('st-client-name');
    if (clientInput) clientInput.value = staff.fullName || '';
    const contactInput = document.getElementById('st-contact-person');
    if (contactInput) contactInput.value = '';
    const companyClientSelect = document.getElementById('st-company-client-selector');
    if (companyClientSelect) companyClientSelect.value = '';
    state.selectedCompanyClientId = '';
    populateStudioStaffDropdown();
    const select = document.getElementById('st-staff-selector');
    if (select) select.value = staff.id;
}
window.selectStudioStaff = selectStudioStaff;
function previewStudioCompanyMatches() {
    const input = document.getElementById('st-company-name');
    const target = document.getElementById('st-company-matches');
    if (!input || !target) return;
    if (typeof populateCompanyClients === 'function') populateCompanyClients();
    const query = normalizeStudioCompanyName(input.value);
    if (!query) { target.replaceChildren(); return; }
    const matches = (state.clients || []).filter(c => normalizeStudioCompanyName(c.companyName).includes(query)).slice(0, 6);
    target.replaceChildren();
    if (!matches.length) {
        const label = document.createElement('span');
        label.textContent = 'New company — no existing registration found. You may continue without registering.';
        target.appendChild(label);
        return;
    }
    matches.forEach(company => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding:8px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:4px';
        const title = document.createElement('div');
        title.textContent = company.companyName || '';
        const details = document.createElement('small');
        const count = (state.documents || []).filter(d => normalizeStudioCompanyName(d.companyName) === normalizeStudioCompanyName(company.companyName)).length;
        details.textContent = [company.nameAr, company.contactPerson, count + ' previous records'].filter(Boolean).join(' · ');
        const use = document.createElement('button');
        use.type = 'button';
        use.className = 'btn btn-secondary';
        use.textContent = 'Use This Company';
        use.style.cssText = 'margin:5px 5px 0 0;padding:5px 8px';
        use.onclick = () => { autofillStudioClient(company.companyName); target.replaceChildren(); };
        wrapper.append(title, details, document.createElement('div'), use);
        if (company.id && typeof viewClientDetail === 'function') {
            const view = document.createElement('button');
            view.type = 'button'; view.className = 'btn btn-secondary';
            view.textContent = 'View Previous Records';
            view.style.cssText = 'margin:5px 5px 0 0;padding:5px 8px';
            view.onclick = () => viewClientDetail(company.id);
            wrapper.appendChild(view);
        }
        target.appendChild(wrapper);
    });
}

function autofillStudioClient(companyName) {
    if (!companyName) return;
    const client = (state.clients || []).find(c => normalizeStudioCompanyName(c.companyName) === normalizeStudioCompanyName(companyName));
    if (client) {
        const compInput = document.getElementById('st-company-name');
        if (compInput) compInput.value = client.companyName || '';
        document.getElementById('st-company-matches')?.replaceChildren();
        populateStudioStaffDropdown();
        const contactInput = document.getElementById('st-contact-person');
        if (contactInput) contactInput.value = client.contactPerson || '';
        state.selectedCompanyClientId = '';
        if (typeof populateCompanyClients === 'function') populateCompanyClients();
    }
}

function injectServicePresetToItems() {
    const srvId = document.getElementById('st-service-injector')?.value;
    if (!srvId) return;
    const srv = (state.services || []).find(s => s.id === srvId);
    if (!srv) return;

    const govtInput = document.getElementById('st-govt-amt');
    if (govtInput) govtInput.value = srv.govtAmt || 0;

    const tbody = document.getElementById('st-spreadsheet-body');
    if (!tbody) return;

    tbody.innerHTML = (srv.items || []).map((item, idx) => `
        <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td><input type="text" class="st-item-title" value="${escapeHtml(item.packageName || item.serviceName || item.title || item.d || '')}" placeholder="Service / Work title"></td>
            <td><input type="text" class="st-item-description" value="${escapeHtml(item.description || '')}" placeholder="Description"></td>
            <td style="text-align: center;"><input type="number" class="st-item-qty" value="${item.q || 1}" oninput="recalculateStudioTotals()"></td>
            <td style="text-align: right;"><input type="number" class="st-item-price" value="${item.p || 0}" oninput="recalculateStudioTotals()"></td>
            <td style="text-align: center;"><button type="button" onclick="this.closest('tr').remove(); recalculateStudioTotals();" class="btn btn-danger" style="padding: 4px 8px;">×</button></td>
        </tr>
    `).join('');

    recalculateStudioTotals();
}

function addStudioRow() {
    const tbody = document.getElementById('st-spreadsheet-body');
    if (!tbody) return;
    const rowCount = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align: center;">${rowCount}</td>
        <td><input type="text" class="st-item-title" placeholder="Service / Work title"></td>
        <td><input type="text" class="st-item-description" placeholder="Description"></td>
        <td style="text-align: center;"><input type="number" class="st-item-qty" value="1" oninput="recalculateStudioTotals()"></td>
        <td style="text-align: right;"><input type="number" class="st-item-price" value="0" oninput="recalculateStudioTotals()"></td>
        <td style="text-align: center;"><button type="button" onclick="this.closest('tr').remove(); recalculateStudioTotals();" class="btn btn-danger" style="padding: 4px 8px;">×</button></td>
    `;
    tbody.appendChild(tr);
    recalculateStudioTotals();
}

function recalculateStudioTotals() {
    const rows = document.querySelectorAll('#st-spreadsheet-body tr');
    let sumTotal = 0;
    rows.forEach((row, idx) => {
        row.cells[0].innerText = idx + 1;
        const q = parseFloat(row.querySelector('.st-item-qty')?.value) || 0;
        const p = parseFloat(row.querySelector('.st-item-price')?.value) || 0;
        sumTotal += (q * p);
    });

    const processing = Math.max(0, Number(document.getElementById('st-processing-charges')?.value) || 0);
    const discountPercent = Number(document.getElementById('st-discount-amt')?.value) || 0;
    const legacyDiscount = Math.max(0, Number(document.getElementById('st-legacy-discount-amt')?.value) || 0);
    const advance = Math.max(0, Number(document.getElementById('st-advance-amt')?.value) || 0);
    const discountValue = (sumTotal + processing) * discountPercent / 100 + legacyDiscount;
    const amountBeforeAdvance = Math.max(0, sumTotal + processing - discountValue);
    const discountPreview = document.getElementById('st-discount-preview');
    if (discountPreview) discountPreview.textContent = `Discount amount: AED ${discountValue.toFixed(2)}`;
    const totalInput = document.getElementById('st-total-amt');
    if (totalInput) totalInput.value = amountBeforeAdvance.toFixed(2);
    const finalInput = document.getElementById('st-final-amt');
    if (finalInput) finalInput.value = amountBeforeAdvance.toFixed(2);
}

function commitDocumentToMemory() {
    const type = document.getElementById('st-doc-type')?.value || 'Invoice';
    let refCode = document.getElementById('st-ref-code')?.value.trim();
    const createdDate = document.getElementById('st-created-date')?.value || studioLocalISODate();
    const visaExpiryDate = document.getElementById('st-expiry-date')?.value || '';
    const clientName = document.getElementById('st-client-name')?.value.trim() || '';
    const companyName = document.getElementById('st-company-name')?.value.trim() || '';
    const contactPerson = document.getElementById('st-contact-person')?.value.trim() || '';
    const notes = document.getElementById('st-notes')?.value.trim() || '';
    const govtAmt = parseFloat(document.getElementById('st-govt-amt')?.value) || 0;
    const rows = [...document.querySelectorAll('#st-spreadsheet-body tr')];
    if (!rows.length) {
        showCustomModal('Missing service', 'Add at least one service item before saving this document.');
        return;
    }
    const invalidRow = rows.some(row => {
        const qtyRaw = row.querySelector('.st-item-qty')?.value;
        const priceRaw = row.querySelector('.st-item-price')?.value;
        const qty = Number(qtyRaw);
        const price = Number(priceRaw);
        return qtyRaw === '' || priceRaw === '' || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0;
    });
    if (invalidRow) {
        showCustomModal('Invalid service item', 'Each service item must have a quantity greater than zero and a valid non-negative rate.');
        return;
    }
    const subtotalAmt = rows.reduce((sum, row) => {
        return sum + Number(row.querySelector('.st-item-qty').value) * Number(row.querySelector('.st-item-price').value);
    }, 0);
    const processingCharges = parseFloat(document.getElementById('st-processing-charges')?.value) || 0;
    const discountPercent = Number(document.getElementById('st-discount-amt')?.value) || 0;
    const legacyDiscountAmount = Math.max(0, Number(document.getElementById('st-legacy-discount-amt')?.value) || 0);
    const discountAmount = (subtotalAmt + processingCharges) * discountPercent / 100 + legacyDiscountAmount;
    const totalAmt = Math.max(0, subtotalAmt + processingCharges - discountAmount);
    const advanceAmt = parseFloat(document.getElementById('st-advance-amt')?.value) || 0;

    if (!db) {
        showCustomModal('Connection unavailable', 'Firebase is not connected. This document was not saved.');
        return;
    }
    if (!refCode) {
        const year = createdDate.slice(0, 4) || String(new Date().getFullYear());
        const prefix = type === 'Quotation' ? 'QTN' : 'DAS';
        const sequencePrefix = prefix + '-' + year + '-';
        let sequence = (state.documents || []).reduce((max, doc) => {
            const ref = String(doc.refCode || '');
            if (!ref.startsWith(sequencePrefix)) return max;
            const suffix = Number(ref.slice(sequencePrefix.length));
            return Number.isInteger(suffix) ? Math.max(max, suffix) : max;
        }, 0) + 1;
        refCode = sequencePrefix + String(sequence).padStart(4, '0');
        while ((state.documents || []).some(doc => doc.refCode === refCode) && sequence < 9999) {
            sequence++;
            refCode = sequencePrefix + String(sequence).padStart(4, '0');
        }
        if ((state.documents || []).some(doc => doc.refCode === refCode)) {
            showCustomModal('Reference generation failed', 'Please enter a unique document reference and try again.');
            return;
        }
    }
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(refCode)) {
        showCustomModal('Invalid reference', 'Use only letters, numbers, hyphens and underscores in the document reference.');
        return;
    }
    const existing = (state.documents || []).find(d => d.refCode === refCode);
    if (existing && state.activeEditingId !== refCode) {
        showCustomModal('Duplicate reference', `The reference ${refCode} already exists. Please use a unique reference.`);
        return;
    }
    if (state.activeEditingId && refCode !== state.activeEditingId) {
        showCustomModal('Reference locked', 'To preserve the original record ID, the reference cannot be changed while editing.');
        return;
    }
    if (![govtAmt, subtotalAmt, processingCharges, discountPercent, legacyDiscountAmount, discountAmount, totalAmt, advanceAmt].every(Number.isFinite) || [govtAmt, subtotalAmt, processingCharges, discountPercent, legacyDiscountAmount, discountAmount, totalAmt, advanceAmt].some(value => value < 0) || discountPercent > 100 || discountAmount > subtotalAmt + processingCharges) {
        showCustomModal('Invalid amounts', 'Amounts must be valid and non-negative. Discounts cannot exceed the subtotal plus processing charges.');
        return;
    }
    const previousDocumentForValidation = (state.documents || []).find(d => d.refCode === refCode);
    if (previousDocumentForValidation?.type === 'Quotation' && (Number(previousDocumentForValidation.invoicedAmount) || 0) > totalAmt + 0.005) {
        showCustomModal('Quotation balance protected', 'The quotation total cannot be reduced below the amount already invoiced.');
        return;
    }
    const previousAdvanceValue = Number(previousDocumentForValidation?.advanceAmount ?? previousDocumentForValidation?.advanceAmt ?? previousDocumentForValidation?.advance ?? 0) || 0;
    const advanceWasChanged = !!previousDocumentForValidation && Math.abs(previousAdvanceValue - advanceAmt) > 0.005;
    const proposedPaymentAdvanceBalance = previousDocumentForValidation?.advanceIncludedInPaymentLogs === false
        ? (advanceWasChanged ? advanceAmt : Number(previousDocumentForValidation.paymentAdvanceBalance ?? previousAdvanceValue) || 0)
        : undefined;
    const proposedPaid = previousDocumentForValidation && window.getDarDocumentPaidAmount
        ? window.getDarDocumentPaidAmount({...previousDocumentForValidation, advanceAmount:advanceAmt, ...(previousDocumentForValidation.advanceIncludedInPaymentLogs === false ? {paymentAdvanceBalance:proposedPaymentAdvanceBalance} : {})})
        : advanceAmt;
    if (Math.max(advanceAmt, proposedPaid) > totalAmt + 0.005) {
        showCustomModal('Payments exceed total', 'The invoice total cannot be less than the recorded advance and payments.');
        return;
    }
    if (advanceAmt > totalAmt) {
        showCustomModal('Advance exceeds total', 'The advance payment cannot be greater than the invoice total.');
        return;
    }

    const items = [];
    rows.forEach(row => {
        const rowTitle = row.querySelector('.st-item-title')?.value.trim() || 'Service Record';
        items.push({
            packageName: rowTitle,
            serviceName: rowTitle,
            title: rowTitle,
            description: row.querySelector('.st-item-description')?.value.trim() || '',
            q: parseFloat(row.querySelector('.st-item-qty')?.value) || 1,
            p: parseFloat(row.querySelector('.st-item-price')?.value) || 0
        });
    });

    const previousForStageEdit = (state.documents || []).find(d => d.refCode === refCode);
    if (previousForStageEdit?.sourceQuotationRef && totalAmt <= 0) {
        showCustomModal('Converted invoice total required', 'A progress or stage invoice linked to a quotation must keep a positive total.');
        return;
    }
    if (previousForStageEdit?.billingMode === 'stage' && previousForStageEdit.sourceQuotationRef) {
        const stageShape = list => JSON.stringify((Array.isArray(list) ? list : []).map(item => ({
            title: item.packageName || item.serviceName || item.title || '',
            description: item.description || ''
        })));
        if (stageShape(previousForStageEdit.items) !== stageShape(items)) {
            showCustomModal('Stage invoice items protected', 'Keep the service names and descriptions of a stage invoice unchanged. You may still adjust its quantity or rate.');
            return;
        }
    }

    const existingQuotation = (state.documents || []).find(d => d.refCode === refCode && d.type === 'Quotation');
    if (existingQuotation && Array.isArray(existingQuotation.invoicedStageIndexes) && existingQuotation.invoicedStageIndexes.length) {
        const signature = list => JSON.stringify((Array.isArray(list) ? list : []).map(item => ({
            title: item.packageName || item.serviceName || item.title || '',
            description: item.description || '',
            quantity: Number(item.q ?? item.quantity ?? 1),
            rate: Number(item.p ?? item.price ?? 0)
        })));
        if (signature(existingQuotation.items) !== signature(items)) {
            showCustomModal('Billed stages are locked', 'This quotation already has stage invoices. Keep its service rows unchanged so previous stage invoices remain correctly linked.');
            return;
        }
    }

    const selectedCatalogId = document.getElementById('st-service-injector')?.value;
    const selectedCatalog = (state.services || []).find(service => service.id === selectedCatalogId);
    const previousTitle = (state.documents || []).find(d => d.refCode === refCode);
    const mainPackageName = selectedCatalog?.title || previousTitle?.packageName || items[0]?.packageName || 'Service Record';

    // Preserve recorded payments when editing an invoice; never silently reset the ledger.
    const previousDocument = (state.documents || []).find(d => d.refCode === refCode);
    const auditUser = window.firebase?.auth?.().currentUser;
    const payload = {
        refCode,
        type,
        packageName: mainPackageName,
        serviceName: mainPackageName,
        title: mainPackageName,
        clientName: clientName || companyName || 'Direct Client',
        companyName: companyName || 'Direct Clients',
        contactPerson,
        notes,
        companyClientId: state.selectedCompanyClientId || '',
        staffId: state.selectedStudioStaffId || '',
        staffCode: (state.staff || []).find(item => item.id === state.selectedStudioStaffId)?.staffCode || (state.staff || []).find(item => item.id === state.selectedStudioStaffId)?.staffId || '',
        staffName: (state.staff || []).find(item => item.id === state.selectedStudioStaffId)?.fullName || '',
        personNumber: (state.staff || []).find(item => item.id === state.selectedStudioStaffId)?.personNumber || '',
        createdDate: previousDocument ? (previousDocument.createdDate || previousDocument.createdAt || '') : createdDate,
        transactionDate: createdDate,
        updatedAt: new Date().toISOString(),
        updatedBy: auditUser?.email || auditUser?.uid || 'Unknown',
        visaExpiryDate,
        govtAmt,
        govtFee: govtAmt,
        paymentBreakdownVersion: 1,
        subtotalAmount: subtotalAmt,
        subTotal: subtotalAmt,
        processingCharges,
        processingCharge: processingCharges,
        discountAmount,
        discountAmt: discountAmount,
        discountPercent,
        legacyDiscountAmount,
        advanceAmt,
        advanceAmount: advanceAmt,
        ...(previousDocument?.advanceIncludedInPaymentLogs === false ? {paymentAdvanceBalance:advanceWasChanged ? advanceAmt : (previousDocument.paymentAdvanceBalance ?? previousAdvanceValue)} : {}),
        totalAmount: totalAmt,
        totalAmt,
        total: totalAmt,
        amount: totalAmt,
        items,
        branchTag: state.selectedStudioStaffId || (companyName && !/^direct clients?$/i.test(companyName) && clientName && normalizeStudioCompanyName(companyName) !== normalizeStudioCompanyName(clientName)) ? 'staff' : 'company'
    };

    // Update the existing record in place. For converted invoices, atomically adjust
    // the source quotation's invoiced balance as well.
    const wasEditing = !!state.activeEditingId;
    const destinationTab = type === 'Quotation' ? 'quotations' : 'documents';
    const finishSave = async (err, committedDocuments = null) => {
        if (!err) {
            const previousStaffId = previousDocument?.staffId || '';
            const nextStaffId = payload.staffId || '';
            try {
                if (previousStaffId && previousStaffId !== nextStaffId) {
                    await db.ref('staff/' + previousStaffId).transaction(current => {
                        if (!current || current.linkedInvoiceRef !== refCode) return;
                        return { ...current, linkedInvoiceRef: '' };
                    });
                }
                if (nextStaffId) await db.ref('staff/' + nextStaffId).update({ linkedInvoiceRef: refCode });
                (state.staff || []).forEach(item => {
                    if (item.id === previousStaffId && previousStaffId !== nextStaffId && item.linkedInvoiceRef === refCode) item.linkedInvoiceRef = '';
                    if (item.id === nextStaffId) item.linkedInvoiceRef = refCode;
                });
            } catch (linkError) { console.error('Invoice saved, but staff back-link could not be synchronized:', linkError); }
            if (committedDocuments) {
                state.documents = Object.values(committedDocuments).filter(d => d && d.refCode);
            } else {
                const savedIndex = (state.documents || []).findIndex(d => d.refCode === refCode);
                if (savedIndex >= 0) state.documents[savedIndex] = { ...state.documents[savedIndex], ...payload };
                else { state.documents = state.documents || []; state.documents.push(payload); }
            }
            const studioPanel = document.getElementById('tab-studio');
            if (studioPanel) studioPanel.classList.remove('dar-edit-popup');
            if (wasEditing) switchTab(destinationTab);
            if (typeof renderQuotationTable === 'function') renderQuotationTable();
            if (typeof renderDocumentsTable === 'function') renderDocumentsTable();
            if (typeof showCustomModal === 'function') {
                const staffAction = payload.branchTag === 'staff' && typeof openStaffModalFromInvoice === 'function'
                    ? `<button type="button" class="btn btn-primary" onclick="closeCustomModal(); openStaffModalFromInvoice('${refCode}')">Complete Staff Details</button> `
                    : '';
                showCustomModal(wasEditing ? 'Document Updated' : 'Document Saved', `${type} ${refCode} ${wasEditing ? 'updated' : 'saved'} successfully. The original reference and payment history are retained.`, `${staffAction}<button type="button" class="btn btn-primary" onclick="closeCustomModal(); previewInvoiceDocument('${refCode}')">Preview / Print</button> <button type="button" class="btn btn-secondary" onclick="closeCustomModal(); openStudio('${type}')">Create Next</button> <button type="button" class="btn btn-secondary" onclick="closeCustomModal(); switchTab('${destinationTab}')">Back to ${type === 'Quotation' ? 'Quotations' : 'Invoices'}</button>`);
            }
            state.activeEditingId = null;
            state.activeEditingUpdatedAt = '';
        } else if (typeof showCustomModal === 'function') {
            showCustomModal('Save failed', err.message || 'The document could not be saved. Please check your connection and try again.');
        }
    };

    if (previousDocument?.sourceQuotationRef) {
        let saveConflict = '';
        const previousUpdatedAt = state.activeEditingUpdatedAt || previousDocument.updatedAt || '';
        db.ref('documents').transaction(current => {
            const docs = current && typeof current === 'object' ? current : {};
            const liveInvoice = docs[refCode];
            const sourceRef = previousDocument.sourceQuotationRef;
            const liveQuote = docs[sourceRef];
            if (!liveInvoice || !liveQuote || liveQuote.type !== 'Quotation') {
                saveConflict = 'The invoice or source quotation was removed. Refresh and retry.';
                return;
            }
            if (previousUpdatedAt && liveInvoice.updatedAt && liveInvoice.updatedAt !== previousUpdatedAt) {
                saveConflict = 'This invoice was changed by another user. Refresh it before editing again.';
                return;
            }
            const latestPaid = window.getDarDocumentPaidAmount({...liveInvoice,advanceAmount:advanceAmt,...(liveInvoice.advanceIncludedInPaymentLogs===false && advanceWasChanged?{paymentAdvanceBalance:advanceAmt}:{})});
            if (Math.max(advanceAmt,latestPaid) > totalAmt + 0.005) {
                saveConflict = 'The latest recorded payments exceed the new invoice total.';
                return;
            }
            const oldInvoiceTotal = Number(liveInvoice.totalAmount ?? liveInvoice.totalAmt ?? liveInvoice.total ?? liveInvoice.amount) || 0;
            const quoteTotal = Number(liveQuote.totalAmount ?? liveQuote.totalAmt ?? liveQuote.total ?? liveQuote.amount) || 0;
            const updatedInvoiced = Math.max(0, (Number(liveQuote.invoicedAmount) || 0) + totalAmt - oldInvoiceTotal);
            if (updatedInvoiced > quoteTotal + 0.005) {
                saveConflict = 'This edit would exceed the remaining amount on the source quotation.';
                return;
            }
            docs[refCode] = { ...liveInvoice, ...payload };
            docs[sourceRef] = {
                ...liveQuote,
                invoicedAmount: Math.round(updatedInvoiced * 100) / 100,
                conversionHistory: (Array.isArray(liveQuote.conversionHistory) ? liveQuote.conversionHistory : []).map(entry =>
                    entry.invoiceRef === refCode ? { ...entry, amount: totalAmt, updatedAt: new Date().toISOString() } : entry
                ),
                updatedAt: new Date().toISOString()
            };
            return docs;
        }, (err, committed, snapshot) => {
            if (err) { finishSave(err); return; }
            if (!committed) { finishSave(new Error(saveConflict || 'The document changed while saving. Refresh and retry.')); return; }
            finishSave(null, snapshot.val() || {});
        }, false);
    } else {
        let saveConflict = '';
        const previousUpdatedAt = state.activeEditingUpdatedAt || previousDocument?.updatedAt || '';
        db.ref(`documents/${refCode}`).transaction(liveDocument => {
            if (previousDocument && !liveDocument) {
                saveConflict = 'This document was removed by another user. Refresh before editing.';
                return;
            }
            if (!previousDocument && liveDocument) {
                saveConflict = 'This document reference already exists. Refresh and choose a new reference.';
                return;
            }
            if (liveDocument) {
                if (previousUpdatedAt && liveDocument.updatedAt && liveDocument.updatedAt !== previousUpdatedAt) {
                    saveConflict = 'This document was changed by another user. Refresh before editing again.';
                    return;
                }
                const latestPaid = window.getDarDocumentPaidAmount({...liveDocument,advanceAmount:advanceAmt,...(liveDocument.advanceIncludedInPaymentLogs===false && advanceWasChanged?{paymentAdvanceBalance:advanceAmt}:{})});
                if (Math.max(advanceAmt,latestPaid) > totalAmt + 0.005) {
                    saveConflict = 'The latest recorded payments exceed the new document total.';
                    return;
                }
                return {...liveDocument,...payload};
            }
            return payload;
        }, (err, committed, snapshot) => {
            if (err) { finishSave(err); return; }
            if (!committed) { finishSave(new Error(saveConflict || 'The document changed while saving. Refresh and retry.')); return; }
            const committedDocs = Object.fromEntries((state.documents || []).filter(item => item?.refCode).map(item => [item.refCode, item]));
            committedDocs[refCode] = snapshot.val();
            finishSave(null, committedDocs);
        }, false);
    }
}
