// studio.js - Service Entry Studio Logic updated for main package/service names
function studioLocalISODate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function openStudio(type, editRefCode = null) {
    state.activeEditingId = editRefCode || null;
    switchTab('studio');
    const titleEl = document.getElementById('studio-mode-title');
    if (titleEl) titleEl.innerText = editRefCode ? `Edit ${type} - ${editRefCode}` : `Create New ${type}`;

    const docTypeEl = document.getElementById('st-doc-type');
    if (docTypeEl) docTypeEl.value = type;

    const editRefEl = document.getElementById('st-ref-code');
    if (editRefEl) editRefEl.value = editRefCode || '';

    const dateEl = document.getElementById('st-created-date');
    if (dateEl) dateEl.value = studioLocalISODate();

    populateStudioInjectorSelect();
    populateStudioClientDropdown();

    if (editRefCode && state.documents) {
        const doc = state.documents.find(d => d.refCode === editRefCode);
        if (doc) {
            if (docTypeEl) docTypeEl.value = doc.type || type;
            if (editRefEl) editRefEl.value = doc.refCode || '';
            if (dateEl) dateEl.value = doc.createdDate || studioLocalISODate();
            const branchEl = document.getElementById('st-branch-tag');
            if (branchEl) branchEl.value = doc.branchTag === 'staff' ? 'staff' : 'company';
            
            const expiryEl = document.getElementById('st-expiry-date');
            if (expiryEl) expiryEl.value = doc.visaExpiryDate || '';

            const clientSel = document.getElementById('st-client-selector');
            if (clientSel) clientSel.value = doc.companyName || doc.clientName || '';

            const clientNameInput = document.getElementById('st-client-name');
            if (clientNameInput) clientNameInput.value = doc.clientName || '';

            const compNameInput = document.getElementById('st-company-name');
            if (compNameInput) compNameInput.value = doc.companyName || '';

            const contactInput = document.getElementById('st-contact-person');
            if (contactInput) contactInput.value = doc.contactPerson || '';

            const govtInput = document.getElementById('st-govt-amt');
            if (govtInput) govtInput.value = doc.govtAmt ?? doc.govtFee ?? 0;

            const totalInput = document.getElementById('st-total-amt');
            if (totalInput) totalInput.value = doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount ?? 0;

            const advanceInput = document.getElementById('st-advance-amt');
            if (advanceInput) advanceInput.value = doc.advanceAmt ?? doc.advanceAmount ?? doc.advance ?? 0;

            const tbody = document.getElementById('st-spreadsheet-body');
            if (tbody && doc.items) {
                tbody.innerHTML = doc.items.map((item, idx) => `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><input type="text" class="st-item-title" value="${escapeHtml(item.packageName || item.serviceName || item.title || item.d || '')}" placeholder="Service / Package name"></td>
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
        const govtInput = document.getElementById('st-govt-amt');
        if (govtInput) govtInput.value = 0;
        const totalInput = document.getElementById('st-total-amt');
        if (totalInput) totalInput.value = 0;
        const advanceInput = document.getElementById('st-advance-amt');
        if (advanceInput) advanceInput.value = 0;

        addStudioRow(false);
    }
    recalculateStudioTotals();
}

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
        (state.services || []).map(s => `<option value="${s.id}">${s.title} (Govt: AED ${s.govtAmt || 0})</option>`).join('');
}

function autofillStudioClient(companyName) {
    if (!companyName) return;
    const client = (state.clients || []).find(c => c.companyName === companyName);
    if (client) {
        const compInput = document.getElementById('st-company-name');
        if (compInput) compInput.value = client.companyName || '';
        const contactInput = document.getElementById('st-contact-person');
        if (contactInput) contactInput.value = client.contactPerson || '';
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
            <td><input type="text" class="st-item-title" value="${escapeHtml(item.packageName || item.serviceName || item.title || item.d || '')}" placeholder="Service / Package name"></td>
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
        <td><input type="text" class="st-item-title" placeholder="Service / Package name"></td>
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

    const totalInput = document.getElementById('st-total-amt');
    if (totalInput) totalInput.value = sumTotal.toFixed(2);
}

function commitDocumentToMemory() {
    const type = document.getElementById('st-doc-type')?.value || 'Invoice';
    let refCode = document.getElementById('st-ref-code')?.value.trim();
    const createdDate = document.getElementById('st-created-date')?.value || studioLocalISODate();
    const visaExpiryDate = document.getElementById('st-expiry-date')?.value || '';
    const clientName = document.getElementById('st-client-name')?.value.trim() || '';
    const companyName = document.getElementById('st-company-name')?.value.trim() || '';
    const contactPerson = document.getElementById('st-contact-person')?.value.trim() || '';
    const govtAmt = parseFloat(document.getElementById('st-govt-amt')?.value) || 0;
    const totalAmt = parseFloat(document.getElementById('st-total-amt')?.value) || 0;
    const advanceAmt = parseFloat(document.getElementById('st-advance-amt')?.value) || 0;

    if (!db) {
        showCustomModal('Connection unavailable', 'Firebase is not connected. This document was not saved.');
        return;
    }
    if (!refCode) {
        const yearMonth = createdDate.slice(0, 7).replace('-', '');
        let attempts = 0;
        do {
            refCode = `${type === 'Quotation' ? 'QTN' : 'INV'}-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
            attempts++;
        } while ((state.documents || []).some(d => d.refCode === refCode) && attempts < 30);
        if ((state.documents || []).some(d => d.refCode === refCode)) {
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
    if (![govtAmt, totalAmt, advanceAmt].every(Number.isFinite) || govtAmt < 0 || totalAmt < 0 || advanceAmt < 0) {
        showCustomModal('Invalid amounts', 'Amounts cannot be negative. Please check the government fee, total and advance fields.');
        return;
    }
    if (advanceAmt > totalAmt) {
        showCustomModal('Advance exceeds total', 'The advance payment cannot be greater than the invoice total.');
        return;
    }

    const items = [];
    const rows = document.querySelectorAll('#st-spreadsheet-body tr');
    rows.forEach(row => {
        const rowTitle = row.querySelector('.st-item-title')?.value.trim() || 'Service Record';
        items.push({
            packageName: rowTitle,
            serviceName: rowTitle,
            title: rowTitle,
            q: parseFloat(row.querySelector('.st-item-qty')?.value) || 1,
            p: parseFloat(row.querySelector('.st-item-price')?.value) || 0
        });
    });

    const mainPackageName = items[0]?.packageName || 'Service Record';

    const payload = {
        refCode,
        type,
        packageName: mainPackageName,
        serviceName: mainPackageName,
        title: mainPackageName,
        clientName: clientName || companyName || 'Direct Client',
        companyName: companyName || 'Direct Clients',
        contactPerson,
        createdDate,
        visaExpiryDate,
        govtAmt,
        govtFee: govtAmt,
        advanceAmt,
        advanceAmount: advanceAmt,
        totalAmount: totalAmt,
        totalAmt,
        total: totalAmt,
        amount: totalAmt,
        items,
        branchTag: document.getElementById('st-branch-tag')?.value === 'staff' ? 'staff' : 'company'
    };

    db.ref(`documents/${refCode}`).set(payload, (err) => {
        if (!err) {
            if (typeof showCustomModal === 'function') {
                showCustomModal('Success', `Document ${refCode} successfully saved!`);
            }
            state.activeEditingId = null;
            switchTab('documents');
        } else if (typeof showCustomModal === 'function') {
            showCustomModal('Save failed', 'The document could not be saved. Please check your connection and try again.');
        }
    });
}
