// app.js - Security-refactored; preserves existing global entry points

// Security helpers: never interpolate untrusted database values into executable HTML.
const appEscapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const appGetState = () => (typeof state !== 'undefined' && state && typeof state === 'object') ? state : { clients: [], documents: [] };
const appGetDb = () => (typeof db !== 'undefined' && db && typeof db.ref === 'function') ? db : null;
const appNotifyError = (message, error) => {
    console.error(message, error || '');
    if (typeof showCustomModal === 'function') showCustomModal('Error', message);
    else if (typeof alert === 'function') alert(message);
};
let appPendingDelete = null;

// Delegated handlers replace dynamically generated inline onclick/onchange code.
document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id || '';
    try {
        switch (action) {
            case 'view-client': window.viewClientDetail(id); break;
            case 'edit-client': window.openClientModal(id); break;
            case 'delete-client': window.deleteClientAccount(id); break;
            case 'open-company': window.openWorksDetailView(button.dataset.company || ''); break;
            case 'preview-document': await window.previewInvoiceDocument(id); break;
            case 'edit-document': if (typeof window.openStudio === 'function') window.openStudio('Invoice', id); break;
            case 'delete-document': window.deleteSingleDocument(id); break;
            case 'confirm-delete': await appExecutePendingDelete(); if (typeof window.closeCustomModal === 'function') window.closeCustomModal(); break;
            case 'cancel-delete': if (typeof window.closeCustomModal === 'function') window.closeCustomModal(); appPendingDelete = null; break;
        }
    } catch (error) { appNotifyError('The requested action failed. Please try again.', error); }
});
document.addEventListener('change', (event) => {
    if (event.target.matches('.doc-row-checkbox')) window.updateBatchDeleteButtonState();
});

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initFirebaseListeners === 'function') {
        initFirebaseListeners();
    }
});

window.exitWelcomeScreen = function() {
    const welcome = document.getElementById('welcome-screen');
    if (!welcome) return;
    welcome.style.opacity = '0';
    setTimeout(() => { 
        welcome.style.display = 'none'; 
        const auth = document.getElementById('auth-container');
        if (auth) auth.style.display = 'flex';
    }, 400);
};

window.handleLogin = function(e) {
    if (e) e.preventDefault();
    const auth = document.getElementById('auth-container'); if (auth) auth.style.display = 'none';
    const app = document.getElementById('app-container'); if (app) app.style.display = 'flex';
    switchTab('dashboard');
};

window.handleLogout = function() {
    const app = document.getElementById('app-container'); if (app) app.style.display = 'none';
    const auth = document.getElementById('auth-container'); if (auth) auth.style.display = 'flex';
};

window.toggleSidebar = function() {
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.toggle('sidebar-collapsed');
    }
};


window.switchTab = function(tabId) {
    const allowedTabs = new Set(['dashboard', 'clients', 'works', 'works-detail', 'client-detail', 'services-config', 'documents', 'accounts-ledger', 'studio']);
    if (!allowedTabs.has(tabId)) return;
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');
    
    const menuBtn = document.querySelector(`.sidebar-menu li[data-target="${tabId}"]`);
    if (menuBtn) menuBtn.classList.add('active');

    const titles = {
        'dashboard': 'Dashboard Overview',
        'clients': 'Clients',
        'works': 'Works Directory',
        'works-detail': 'Company Works Branch Dossier',
        'client-detail': 'Client Specific Dossier',
        'services-config': 'Services & Tariffs Catalog',
        'documents': 'Financial Ledger & Records',
        'accounts-ledger': 'Accounts & Advance Ledger',
        'studio': 'Service Entry Studio'
    };
    const titleElem = document.getElementById('topbar-title');
    if (titleElem) titleElem.innerText = titles[tabId] || 'Portal Workspace';

    if (tabId === 'dashboard' && typeof renderDashboardStats === 'function') renderDashboardStats();
    if (tabId === 'clients' && typeof renderClientsTable === 'function') renderClientsTable();
    if (tabId === 'works' && typeof renderWorksTable === 'function') renderWorksTable();
    if (tabId === 'works-detail' && typeof renderWorksDetailView === 'function') renderWorksDetailView();
    if (tabId === 'services-config' && typeof renderServicesCatalog === 'function') renderServicesCatalog();
    if (tabId === 'documents' && typeof renderDocumentsTable === 'function') renderDocumentsTable();
    if (tabId === 'accounts-ledger' && typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
};

function renderDashboardStats() {
    const clientsCount = document.getElementById('dash-client-count');
    const worksCount = document.getElementById('dash-works-count');
    if (clientsCount) clientsCount.innerText = (appGetState().clients || []).length;
    if (worksCount) worksCount.innerText = (appGetState().documents || []).length;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearStr = String(now.getFullYear());

    let monthlyTotal = 0;
    let annualTotal = 0;

    (appGetState().documents || []).forEach(doc => {
        const created = String(doc.createdDate || '');
        let total = parseFloat(doc.totalAmount) || parseFloat(doc.totalAmt) || parseFloat(doc.total) || parseFloat(doc.amount) || 0;

        if (created.startsWith(currentMonthStr)) monthlyTotal += total;
        if (created.startsWith(currentYearStr)) annualTotal += total;
    });

    const monthlyPayout = document.getElementById('dash-monthly-payout');
    const annualPayout = document.getElementById('dash-annual-payout');
    if (monthlyPayout) monthlyPayout.innerText = `AED ${monthlyTotal.toFixed(2)}`;
    if (annualPayout) annualPayout.innerText = `AED ${annualTotal.toFixed(2)}`;
}

function renderClientsTable() {
    const tbody = document.getElementById('client-table-body');
    if (!tbody) return;

    if (!(appGetState().clients || []).length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No corporate client accounts found.</td></tr>`;
        return;
    }

    tbody.innerHTML = (appGetState().clients || []).map(cl => `
        <tr>
            <td><strong>${appEscapeHTML(cl.companyName || '-')}</strong></td>
            <td style="text-align: right; font-family: 'Amiri', serif; font-size: 1rem; color: var(--primary);">${appEscapeHTML(cl.nameAr || '-')}</td>
            <td>${appEscapeHTML(cl.contactPerson || '-')}</td>
            <td style="text-align: center;">
                <button data-action="view-client" data-id="${appEscapeHTML(cl.id)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Dossier</button>
                <button data-action="edit-client" data-id="${appEscapeHTML(cl.id)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                <button data-action="delete-client" data-id="${appEscapeHTML(cl.id)}" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.openClientModal = function(id) {
    let cl = null;
    if (id) cl = (appGetState().clients || []).find(c => c.id === id);

    const modal = document.getElementById('client-modal');
    const idInput = document.getElementById('cl-modal-id');
    const companyInput = document.getElementById('cl-input-company-name');
    const arabicInput = document.getElementById('cl-input-name-ar');
    const contactInput = document.getElementById('cl-input-contact-person');
    if (idInput) idInput.value = id || '';
    if (companyInput) companyInput.value = cl?.companyName || '';
    if (arabicInput) arabicInput.value = cl?.nameAr || '';
    if (contactInput) contactInput.value = cl?.contactPerson || '';
    if (modal) modal.style.display = 'flex';
};

window.closeClientModal = function() {
    const modal = document.getElementById('client-modal');
    if (modal) modal.style.display = 'none';
};

window.saveClientModalData = async function() {
    const database = appGetDb();
    if (!database) return appNotifyError('Database is unavailable. Please reload and try again.');
    const idField = document.getElementById('cl-modal-id');
    const id = (idField && idField.value) || database.ref('clients').push().key;
    if (!id) return appNotifyError('Unable to create a client record ID.');
    const companyName = (document.getElementById('cl-input-company-name')?.value || '').trim();
    let nameAr = (document.getElementById('cl-input-name-ar')?.value || '').trim();
    const contactPerson = (document.getElementById('cl-input-contact-person')?.value || '').trim();

    if (!companyName) {
        if (typeof showCustomModal === 'function') showCustomModal('Warning', 'Company Name is required.');
        return;
    }

    if (!nameAr && typeof autoTranslateToArabic === 'function') {
        nameAr = await autoTranslateToArabic(companyName);
    }

    try {
        await database.ref(`clients/${id}`).set({ companyName, nameAr, contactPerson });
        window.closeClientModal();
    } catch (error) { appNotifyError('Unable to save the client. Check your connection and permissions.', error); }
};

window.deleteClientAccount = function(id) {
    if (!id || typeof showCustomModal !== 'function') return;
    appPendingDelete = { type: 'client', id: String(id) };
    showCustomModal('Confirm Delete', 'Delete this client profile?', `
        <button type="button" data-action="cancel-delete" class="btn btn-secondary">Cancel</button>
        <button type="button" data-action="confirm-delete" class="btn btn-danger">Delete</button>
    `);
};

async function appExecutePendingDelete() {
    const pending = appPendingDelete;
    appPendingDelete = null;
    const database = appGetDb();
    if (!pending || !database) throw new Error('No pending action or database unavailable.');
    const safeId = String(pending.id);
    const validKey = (key) => typeof key === 'string' && key.length > 0 && !/[.#$\[\]\/]/.test(key);
    if (pending.type === 'client' && !validKey(safeId)) throw new Error('Invalid client key.');
    if (pending.type === 'document' && !validKey(safeId)) throw new Error('Invalid document key.');
    if (pending.type === 'client') await database.ref(`clients/${safeId}`).remove();
    else if (pending.type === 'document') await database.ref(`documents/${safeId}`).remove();
    else if (pending.type === 'documents') {
        const updates = {};
        pending.ids.forEach((key) => { if (validKey(String(key))) updates[`documents/${key}`] = null; });
        if (!Object.keys(updates).length) throw new Error('No valid document keys selected.');
        await database.ref().update(updates);
    }
}

window.viewClientDetail = function(clientId) {
    if (typeof state !== 'undefined') state.activeViewingClientId = clientId;
    const client = (appGetState().clients || []).find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('cd-client-name').innerText = client.companyName || '-';
    document.getElementById('cd-company-name').innerText = client.companyName || '-';
    document.getElementById('cd-contact-person').innerText = client.contactPerson || '-';
    document.getElementById('cd-name-ar').innerText = client.nameAr || '-';

    const clientDocs = (appGetState().documents || []).filter(d => d.companyName === client.companyName || d.clientName === client.companyName);
    const tbody = document.getElementById('client-detail-records-body');
    if (!tbody) return;
    
    if (clientDocs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No records linked to this account.</td></tr>`;
    } else {
        tbody.innerHTML = clientDocs.map(d => {
            const amt = parseFloat(d.totalAmount) || parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
            return `
                <tr>
                    <td><strong>${appEscapeHTML(d.refCode)}</strong></td>
                    <td>${appEscapeHTML((d.items || []).map(i => i.d).join(', ') || 'Service Record')}</td>
                    <td>${appEscapeHTML(d.visaExpiryDate || '-')}</td>
                    <td>AED ${amt.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button data-action="preview-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i> View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    switchTab('client-detail');
};

function renderWorksTable() {
    const tbody = document.getElementById('works-table-body');
    if (!tbody) return;

    const companyMap = {};
    (appGetState().documents || []).forEach(doc => {
        let key = doc.companyName || doc.clientName || 'Unassigned / Direct Clients';
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
            <td><strong>${appEscapeHTML(comp)}</strong></td>
            <td>${companyMap[comp].length} Invoices</td>
            <td style="text-align: center;">
                <button data-action="open-company" data-company="${appEscapeHTML(comp)}" class="btn btn-primary" style="padding: 4px 12px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Open Folder</button>
            </td>
        </tr>
    `).join('');
}

window.openWorksDetailView = function(companyName) {
    if (typeof state !== 'undefined') state.activeViewingCompanyWorksName = companyName;
    switchTab('works-detail');
};

window.switchWorksBranch = function(branch) {
    if (typeof state !== 'undefined') state.activeWorksBranch = branch;
    renderWorksDetailView();
};

function renderWorksDetailView() {
    const companyName = typeof state !== 'undefined' ? state.activeViewingCompanyWorksName : '';
    const titleEl = document.getElementById('works-detail-company-title');
    if (titleEl) titleEl.innerText = companyName || '-';

    const allCompanyDocs = (appGetState().documents || []).filter(d => (d.companyName || d.clientName || 'Unassigned / Direct Clients') === companyName);
    const companyWorks = allCompanyDocs.filter(d => d.branchTag !== 'staff');
    const staffWorks = allCompanyDocs.filter(d => d.branchTag === 'staff');

    const countCompany = document.getElementById('count-company-works');
    const countStaff = document.getElementById('count-staff-works');
    if (countCompany) countCompany.innerText = companyWorks.length;
    if (countStaff) countStaff.innerText = staffWorks.length;

    const activeDocs = (typeof state !== 'undefined' && state.activeWorksBranch === 'staff') ? staffWorks : companyWorks;
    const tbody = document.getElementById('works-detail-records-body');
    if (!tbody) return;

    if (activeDocs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No invoice records found in this branch.</td></tr>`;
        return;
    }

    tbody.innerHTML = activeDocs.map(d => {
        const amt = parseFloat(d.totalAmount) || parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
        return `
            <tr>
                <td><strong>${appEscapeHTML(d.refCode)}</strong></td>
                <td>${appEscapeHTML(d.clientName || '-')}</td>
                <td>${appEscapeHTML(d.companyName || '-')}</td>
                <td>${appEscapeHTML(d.contactPerson || '-')}</td>
              // Example table cell rendering for documents
<td>
    <strong>${doc.packageName || (doc.items && doc.items[0] ? doc.items[0].d : 'Service Record')}</strong>
    ${doc.packageName && doc.items && doc.items.length > 0 ? `<br><small style="color: var(--text-muted);">${doc.items.map(i => i.d).join(', ')}</small>` : ''}
</td>
                <td>AED ${amt.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button data-action="preview-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i></button>
                    <button data-action="edit-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDocumentsTable() {
    const tbody = document.getElementById('doc-table-body');
    if (!tbody) return;

    const searchVal = (document.getElementById('doc-search-input')?.value || '').toLowerCase();
    
    let filtered = (appGetState().documents || []).filter(d => {
        return (d.refCode || '').toLowerCase().includes(searchVal) ||
               (d.clientName || '').toLowerCase().includes(searchVal) ||
               (d.companyName || '').toLowerCase().includes(searchVal);
    });

    let totalVolume = filtered.reduce((acc, curr) => {
        const amt = parseFloat(curr.totalAmount) || parseFloat(curr.totalAmt) || parseFloat(curr.total) || parseFloat(curr.amount) || 0;
        return acc + amt;
    }, 0);

    const ledgerTotal = document.getElementById('ledger-total-amount');
    if (ledgerTotal) {
        ledgerTotal.innerText = `AED ${totalVolume.toFixed(2)}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No financial records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const rowTotal = parseFloat(d.totalAmount) || parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
        return `
        <tr>
            <td style="text-align: center;"><input type="checkbox" class="doc-row-checkbox" value="${appEscapeHTML(d.refCode)}"  ></td>
            <td><strong>${appEscapeHTML(d.refCode)}</strong></td>
            <td>${appEscapeHTML(d.clientName || '-')}</td>
            <td>${appEscapeHTML(d.companyName || '-')}</td>
            <td><span class="branch-badge ${d.branchTag === 'staff' ? 'branch-staff' : 'branch-company'}">${appEscapeHTML(d.branchTag || 'company')}</span></td>
            // Example table cell rendering for documents
<td>
    <strong>${doc.packageName || (doc.items && doc.items[0] ? doc.items[0].d : 'Service Record')}</strong>
    ${doc.packageName && doc.items && doc.items.length > 0 ? `<br><small style="color: var(--text-muted);">${doc.items.map(i => i.d).join(', ')}</small>` : ''}
</td>
            <td>AED ${rowTotal.toFixed(2)}</td>
            <td style="text-align: center;">
                <button data-action="preview-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i></button>
                <button data-action="edit-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                <button data-action="delete-document" data-id="${appEscapeHTML(d.refCode)}" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `;
    }).join('');
}

window.updateBatchDeleteButtonState = function() {
    const selected = document.querySelectorAll('.doc-row-checkbox:checked');
    const btn = document.getElementById('btn-batch-delete');
    if (btn) btn.disabled = selected.length === 0;
};

window.toggleSelectAllDocuments = function(master) {
    document.querySelectorAll('.doc-row-checkbox').forEach(cb => cb.checked = master.checked);
    updateBatchDeleteButtonState();
};

window.deleteSingleDocument = function(refCode) {
    if (!refCode || typeof showCustomModal !== 'function') return;
    appPendingDelete = { type: 'document', id: String(refCode) };
    showCustomModal('Confirm Delete', 'Delete this invoice entry?', `
        <button type="button" data-action="cancel-delete" class="btn btn-secondary">Cancel</button>
        <button type="button" data-action="confirm-delete" class="btn btn-danger">Delete</button>
    `);
};

window.deleteSelectedDocuments = function() {
    const ids = Array.from(document.querySelectorAll('.doc-row-checkbox:checked')).map(cb => cb.value).filter(Boolean);
    if (!ids.length || typeof showCustomModal !== 'function') return;
    appPendingDelete = { type: 'documents', ids };
    showCustomModal('Batch Delete', `Delete ${ids.length} selected entries?`, `
        <button type="button" data-action="cancel-delete" class="btn btn-secondary">Cancel</button>
        <button type="button" data-action="confirm-delete" class="btn btn-danger">Delete All</button>
    `);
};

function executeBatchDelete() {
    const ids = Array.from(document.querySelectorAll('.doc-row-checkbox:checked')).map(cb => cb.value).filter(Boolean);
    if (!ids.length) return;
    appPendingDelete = { type: 'documents', ids };
    return appExecutePendingDelete().catch(error => appNotifyError('Unable to delete selected records.', error));
}

window.previewInvoiceDocument = async function(refCode) {
    const doc = (appGetState().documents || []).find(d => d.refCode === refCode);
    if (!doc) return;

    const docRef = document.getElementById('p-doc-ref');
    const clientName = document.getElementById('p-client-name');
    const createdDate = document.getElementById('p-created-date');
    const clientNameAr = document.getElementById('p-client-name-ar');
    const docTitle = document.getElementById('p-doc-title');

    if (docTitle) {
        docTitle.replaceChildren(document.createTextNode(`${String(doc.type || 'INVOICE').toUpperCase()} / `));
        const arabicTitle = document.createElement('span');
        arabicTitle.style.fontFamily = "'Amiri', serif";
        arabicTitle.textContent = doc.type === 'Quotation' ? 'عرض سعر' : 'فاتورة';
        docTitle.appendChild(arabicTitle);
    }
    if (docRef) docRef.innerText = `Ref No: ${doc.refCode}`;
    
    const compName = doc.clientName || doc.companyName || 'N/A';
    if (clientName) clientName.innerText = compName;
    if (createdDate) createdDate.innerText = `Date: ${doc.createdDate || '-'}`;

    let arName = '';
    const matchedClient = (appGetState().clients || []).find(c => c.companyName === doc.companyName || c.companyName === doc.clientName);
    if (matchedClient) {
        arName = matchedClient.nameAr || '';
    }
    if (!arName && compName && typeof autoTranslateToArabic === 'function') {
        arName = await autoTranslateToArabic(compName);
    }

    if (clientNameAr) {
        clientNameAr.innerText = arName ? `السيد / ${arName}` : '';
    }

    const tbody = document.getElementById('p-table-body');
    if (tbody) {
        const items = doc.items || [];
        
        let docTotal = parseFloat(doc.totalAmount) || parseFloat(doc.totalAmt) || parseFloat(doc.total) || parseFloat(doc.amount) || parseFloat(doc.grandTotal) || 0;
        if (docTotal === 0 && items.length > 0) {
            docTotal = items.reduce((sum, item) => {
                const p = parseFloat(item.p || item.price) || 0;
                const q = parseFloat(item.q || item.quantity) || 1;
                return sum + (p * q);
            }, 0);
        }

        tbody.innerHTML = items.map((item, idx) => {
            const p = parseFloat(item.p || item.price) || 0;
            const q = parseFloat(item.q || item.quantity) || 1;
            return `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${appEscapeHTML(item.d || item.description || 'Service Record')}</td>
                    <td style="text-align: center;">${q}</td>
                    <td style="text-align: right;">${(p * q).toFixed(2)}</td>
                </tr>
            `;
        }).join('') + `
            <tr style="font-weight: bold; background: #f8fafc;">
                <td colspan="3" style="text-align: right;">Total Amount / المبلغ الإجمالي</td>
                <td style="text-align: right; color: #b58f46;">AED ${docTotal.toFixed(2)}</td>
            </tr>
        `;
    }

    const modal = document.getElementById('document-preview-modal');
    if (modal) modal.style.display = 'flex';
};

window.saveAsPDF = function() {
    const element = document.getElementById('a4-wrapper-element') || document.getElementById('document-preview-print-area');
    
    if (!element) {
        if (typeof showCustomModal === 'function') {
            showCustomModal('Error', 'Preview element not found for PDF export.');
        } else {
            alert('Preview element not found!');
        }
        return;
    }

    const invNoElement = document.getElementById('p-doc-ref');
    const invText = invNoElement ? invNoElement.innerText.trim() : 'Invoice';
    const cleanFilename = invText.replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';

    const opt = {
        margin:       [5, 5, 5, 5],
        filename:     cleanFilename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            letterRendering: true 
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().from(element).set(opt).save().catch(err => {
            console.error("PDF generation error:", err);
            alert("Failed to generate PDF. Check console for details.");
        });
    } else {
        alert("html2pdf library is not loaded properly.");
    }
};

window.closePreviewModal = function() {
    const modal = document.getElementById('document-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};