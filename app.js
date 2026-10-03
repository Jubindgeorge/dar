document.addEventListener('DOMContentLoaded', () => {
    if (typeof initFirebaseListeners === 'function') {
        initFirebaseListeners();
    }
});

function renderDashboardStats() {
    if (!state || !state.clients) return;
    
    document.getElementById('dash-client-count').innerText = state.clients.length;
    document.getElementById('dash-works-count').innerText = state.documents.length;

    let currentMonthStr = new Date().toISOString().slice(0, 7);
    let currentYearStr = new Date().getFullYear().toString();

    let monthlyTotal = 0;
    let annualTotal = 0;

    state.documents.forEach(doc => {
        let created = doc.createdDate || '';
        let itemsTotal = (doc.items || []).reduce((acc, curr) => acc + ((curr.p || 0) * (curr.q || 1)), 0);
        let total = parseFloat(doc.totalAmt) || itemsTotal;

        if (created.startsWith(currentMonthStr)) monthlyTotal += total;
        if (created.startsWith(currentYearStr)) annualTotal += total;
    });

    document.getElementById('dash-monthly-payout').innerText = `AED ${monthlyTotal.toFixed(2)}`;
    document.getElementById('dash-annual-payout').innerText = `AED ${annualTotal.toFixed(2)}`;
}

function renderClientsTable() {
    const tbody = document.getElementById('client-table-body');
    if (!tbody || !state) return;

    if (state.clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No corporate client accounts created.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.clients.map(cl => `
        <tr>
            <td><strong>${cl.companyName || '-'}</strong></td>
            <td style="text-align: right; font-family: 'Amiri', serif; font-size: 1rem; color: var(--primary);">${cl.nameAr || '-'}</td>
            <td>${cl.contactPerson || '-'}</td>
            <td style="text-align: center;">
                <button onclick="viewClientDetail('${cl.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Dossier</button>
                <button onclick="openClientModal('${cl.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteClientAccount('${cl.id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderWorksTable() {
    const tbody = document.getElementById('works-table-body');
    if (!tbody || !state) return;

    const companyMap = {};
    state.documents.forEach(doc => {
        let key = doc.companyName || 'Unassigned / Direct Clients';
        if (!companyMap[key]) companyMap[key] = [];
        companyMap[key].push(doc);
    });

    const keys = Object.keys(companyMap);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No company works folders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = keys.map(comp => `
        <tr>
            <td><strong>${comp}</strong></td>
            <td>${companyMap[comp].length} Records</td>
            <td style="text-align: center;">
                <button onclick="openWorksDetailView('${comp}')" class="btn btn-primary" style="padding: 4px 12px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Open Works Folder</button>
            </td>
        </tr>
    `).join('');
}

function renderDocumentsTable() {
    const tbody = document.getElementById('doc-table-body');
    if (!tbody || !state) return;

    const searchVal = (document.getElementById('doc-search-input')?.value || '').toLowerCase();
    
    let filtered = state.documents.filter(d => {
        return (d.refCode || '').toLowerCase().includes(searchVal) ||
               (d.clientName || '').toLowerCase().includes(searchVal) ||
               (d.companyName || '').toLowerCase().includes(searchVal);
    });

    let totalVolume = filtered.reduce((acc, curr) => acc + (parseFloat(curr.totalAmt) || 0), 0);
    if (document.getElementById('ledger-total-amount')) {
        document.getElementById('ledger-total-amount').innerText = `AED ${totalVolume.toFixed(2)}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No financial records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td style="text-align: center;"><input type="checkbox" class="doc-row-checkbox" value="${d.refCode}" onchange="updateBatchDeleteButtonState()"></td>
            <td><strong>${d.refCode}</strong></td>
            <td>${d.clientName || '-'}</td>
            <td>${d.companyName || '-'}</td>
            <td><span style="font-size: 0.75rem; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">${d.branchTag || 'company'}</span></td>
            <td>${(d.items || []).map(i => i.d).join(', ') || 'Service Record'}</td>
            <td style="text-align: center;">
                <button onclick="previewInvoiceDocument('${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i></button>
                <button onclick="openStudioForEdit('${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteSingleDocument('${d.refCode}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Preview Modal Loader Matching Reference Document Structure
function previewInvoiceDocument(refCode) {
    const doc = state.documents.find(d => d.refCode === refCode);
    if (!doc) return;

    const modalBody = document.getElementById('p-content-container');
    if (!modalBody) return;

    modalBody.innerHTML = generateReferenceDocHTML(doc, "INVOICE / فاتورة");
    document.getElementById('document-preview-modal').style.display = 'flex';
}
