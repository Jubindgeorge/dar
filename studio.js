// studio.js - Service Entry Studio Logic
function openStudio(type, editRefCode = null) {
    switchTab('studio');
    const titleEl = document.getElementById('studio-mode-title');
    if (titleEl) titleEl.innerText = editRefCode ? `Edit ${type} - ${editRefCode}` : `Create New ${type}`;

    const docTypeEl = document.getElementById('st-doc-type');
    if (docTypeEl) docTypeEl.value = type;

    const editRefEl = document.getElementById('st-ref-code');
    if (editRefEl) editRefEl.value = editRefCode || '';

    const dateEl = document.getElementById('st-created-date');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    populateStudioInjectorSelect();
    populateStudioClientDropdown();

    if (editRefCode && state.documents) {
        const doc = state.documents.find(d => d.refCode === editRefCode);
        if (doc) {
            if (docTypeEl) docTypeEl.value = doc.type || type;
            if (editRefEl) editRefEl.value = doc.refCode || '';
            if (dateEl) dateEl.value = doc.createdDate || new Date().toISOString().split('T')[0];
            
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
            if (govtInput) govtInput.value = doc.govtAmt || 0;

            const totalInput = document.getElementById('st-total-amt');
            if (totalInput) totalInput.value = doc.totalAmt || doc.total || 0;

            const advanceInput = document.getElementById('st-advance-amt');
            if (advanceInput) advanceInput.value = doc.advanceAmt || 0;

            const tbody = document.getElementById('st-spreadsheet-body');
            if (tbody && doc.items) {
                tbody.innerHTML = doc.items.map((item, idx) => `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><input type="text" class="st-item-desc" value="${item.d || item.description || ''}" placeholder="Service description"></td>
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
    sel.innerHTML = `<option value="">-- Select Registered Client --</option>` +
        (state.clients || []).map(c => `<option value="${c.companyName}">${c.companyName} (${c.contactPerson || 'N/A'})</option>`).join('');
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
        const clientInput = document.getElementById('st-client-name');
        if (clientInput) clientInput.value = client.companyName || '';
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
            <td><input type="text" class="st-item-desc" value="${item.d || ''}" placeholder="Service description"></td>
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
        <td><input type="text" class="st-item-desc" placeholder="Service description"></td>
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
    const createdDate = document.getElementById('st-created-date')?.value || new Date().toISOString().split('T')[0];
    const visaExpiryDate = document.getElementById('st-expiry-date')?.value || '';
    const clientName = document.getElementById('st-client-name')?.value.trim() || '';
    const companyName = document.getElementById('st-company-name')?.value.trim() || '';
    const contactPerson = document.getElementById('st-contact-person')?.value.trim() || '';
    const govtAmt = parseFloat(document.getElementById('st-govt-amt')?.value) || 0;
    const totalAmt = parseFloat(document.getElementById('st-total-amt')?.value) || 0;
    const advanceAmt = parseFloat(document.getElementById('st-advance-amt')?.value) || 0;

    if (!refCode) {
        const yearMonth = createdDate.slice(0, 7).replace('-', '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        refCode = `${type === 'Quotation' ? 'QTN' : 'INV'}-${yearMonth}-${randomNum}`;
    }

    const items = [];
    const rows = document.querySelectorAll('#st-spreadsheet-body tr');
    rows.forEach(row => {
        items.push({
            d: row.querySelector('.st-item-desc')?.value.trim() || 'Service Record',
            q: parseFloat(row.querySelector('.st-item-qty')?.value) || 1,
            p: parseFloat(row.querySelector('.st-item-price')?.value) || 0
        });
    });

    const payload = {
        refCode,
        type,
        clientName: clientName || companyName || 'Direct Client',
        companyName: companyName || clientName || 'Direct Client',
        contactPerson,
        createdDate,
        visaExpiryDate,
        govtAmt,
        advanceAmt,
        totalAmt,
        total: totalAmt,
        amount: totalAmt,
        items,
        branchTag: 'company'
    };

    db.ref(`documents/${refCode}`).set(payload, (err) => {
        if (!err) {
            if (typeof showCustomModal === 'function') {
                showCustomModal('Success', `Document ${refCode} successfully saved!`);
            }
            switchTab('documents');
        }
    });
}