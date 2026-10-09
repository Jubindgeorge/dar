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
            
            setElementValue('st-expiry-date', doc.visaExpiryDate || '');
            setElementValue('st-client-selector', doc.companyName || doc.clientName || '');
            setElementValue('st-client-name', doc.clientName || '');
            setElementValue('st-company-name', doc.companyName || '');
            setElementValue('st-contact-person', doc.contactPerson || '');
            setElementValue('st-govt-amt', doc.govtAmt || 0);
            setElementValue('st-total-amt', doc.totalAmt || doc.total || 0);
            setElementValue('st-advance-amt', doc.advanceAmt || 0);

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
        setElementValue('st-expiry-date', '');
        setElementValue('st-client-selector', '');
        setElementValue('st-client-name', '');
        setElementValue('st-company-name', '');
        setElementValue('st-contact-person', '');
        setElementValue('st-govt-amt', 0);
        setElementValue('st-total-amt', 0);
        setElementValue('st-advance-amt', 0);

        addStudioRow(false);
    }
    recalculateStudioTotals();
}

function setElementValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
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
        setElementValue('st-company-name', client.companyName || '');
        setElementValue('st-client-name', client.companyName || '');
        setElementValue('st-contact-person', client.contactPerson || '');
    }
}

function injectServicePresetToItems() {
    const srvId = document.getElementById('st-service-injector')?.value;
    if (!srvId) return;
    const srv = (state.services || []).find(s => s.id === srvId);
    if (!srv) return;

    const tbody = document.getElementById('st-spreadsheet-body');
    if (tbody) tbody.dataset.packageName = srv.title;

    setElementValue('st-govt-amt', srv.govtAmt || 0);

    if (tbody) {
        tbody.innerHTML = (srv.items || []).map((item, idx) => `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><input type="text" class="st-item-desc" value="${item.d || ''}" placeholder="Service description"></td>
                <td style="text-align: center;"><input type="number" class="st-item-qty" value="${item.q || 1}" oninput="recalculateStudioTotals()"></td>
                <td style="text-align: right;"><input type="number" class="st-item-price" value="${item.p || 0}" oninput="recalculateStudioTotals()"></td>
                <td style="text-align: center;"><button type="button" onclick="this.closest('tr').remove(); recalculateStudioTotals();" class="btn btn-danger" style="padding: 4px 8px;">×</button></td>
            </tr>
        `).join('');
    }

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

    setElementValue('st-total-amt', sumTotal.toFixed(2));
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

    const tbody = document.getElementById('st-spreadsheet-body');
    const packageName = tbody?.dataset.packageName || '';

    const payload = {
        refCode,
        type,
        packageName,
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
