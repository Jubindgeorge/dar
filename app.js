// app.js - Harmonized with ledger.js properties and main service names
function localISODate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Strictly target only explicit package/service titles
function getWorkItemDescription(item) {
    if (!item || typeof item !== 'object') return '';
    return String(item.serviceName ?? item.title ?? item.packageName ?? '').trim();
}

function getDocumentWorkDescription(doc) {
    // Only check document-level package name or title; ignore descriptions entirely
    return String(doc?.serviceName ?? doc?.title ?? doc?.packageName ?? '').trim();
}

function workDescriptionCell(doc) {
    // Grab the document's main name first; if not found, grab only the first item's package title
    const mainTitle = getDocumentWorkDescription(doc);
    if (mainTitle) return escapeHtml(mainTitle);

    const items = Array.isArray(doc?.items) ? doc.items : [];
    if (items.length > 0) {
        const firstItemTitle = getWorkItemDescription(items[0]);
        if (firstItemTitle) return escapeHtml(firstItemTitle);
    }

    return 'Service Record';
}

document.addEventListener('DOMContentLoaded', () => {
    const expenseMonth = document.getElementById('exp-input-month');
    if (expenseMonth && !expenseMonth.value) expenseMonth.value = localISODate().slice(0, 7);
    initializeFirebaseLogin();
    const requestedTab = (window.location.hash || '').replace(/^#/, '');
    if (requestedTab && document.getElementById(`tab-${requestedTab}`)) switchTab(requestedTab);
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

const DAR_ALLOWED_UIDS = new Set(['DOoTyjTlQQWpW5Q4p6bZfgcyDYr2', '6J0fXWZkvpgIfw9lj4KH1D5Bh4u2']);
let darListenersActive = false;
let darLoginInProgress = false;

function initializeFirebaseLogin() {
    const authPanel = document.getElementById('auth-container');
    const appPanel = document.getElementById('app-container');
    if (appPanel) appPanel.style.display = 'none';
    firebase.auth().onAuthStateChanged(async user => {
        const allowed = !!user && DAR_ALLOWED_UIDS.has(user.uid) && user.emailVerified;
        if (authPanel) authPanel.style.display = allowed ? 'none' : 'flex';
        if (appPanel) appPanel.style.display = allowed ? 'flex' : 'none';
        if (allowed) {
            if (!darListenersActive) {
                darListenersActive = true;
                initFirebaseListeners();
            }
            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.style.display = 'none';
            switchTab('dashboard');
        } else {
            if (darListenersActive) {
                ['clients', 'documents', 'services', 'monthlyExpenses'].forEach(path => db.ref(path).off());
                darListenersActive = false;
            }
            state.clients = [];
            state.documents = [];
            state.services = [];
            state.monthlyExpenses = [];
            if (user && !darLoginInProgress) await firebase.auth().signOut();
        }
    });
}

window.handleLogin = async function(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pin').value;
    const remember = document.getElementById('remember-device')?.checked;
    darLoginInProgress = true;
    try {
        await firebase.auth().setPersistence(remember
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION);
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
        document.getElementById('login-pin').value = '';
        if (!DAR_ALLOWED_UIDS.has(credential.user.uid)) {
            await firebase.auth().signOut();
            alert('This account is not approved for DAR AL SHAMS.');
        } else if (!credential.user.emailVerified) {
            try {
                await credential.user.sendEmailVerification();
                alert('Verification email sent. Check your inbox and spam folder, then sign in again after verifying.');
            } catch (verificationError) {
                console.error('Verification email failed:', verificationError.code);
                alert('Could not send the verification email. Please try again later.');
            } finally {
                await firebase.auth().signOut();
            }
        }
    } catch (error) {
        console.error('Login failed:', error.code);
        alert('Sign-in failed. Check your credentials and Firebase settings.');
    } finally {
        darLoginInProgress = false;
    }
};

window.handleLogout = async function() {
    await firebase.auth().signOut();
};

function isDarMobileLayout() {
    return window.matchMedia('(max-width: 767px)').matches;
}
function syncDarMobileMenu() {
    const app = document.getElementById('app-container');
    const open = !!app && isDarMobileLayout() && app.classList.contains('mobile-menu-open');
    const backdrop = document.getElementById('dar-mobile-menu-backdrop');
    if (backdrop) backdrop.hidden = !open;
    const toggle = document.querySelector('.sidebar-toggle-btn');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
}
window.closeDarMobileMenu = function() {
    document.getElementById('app-container')?.classList.remove('mobile-menu-open');
    syncDarMobileMenu();
};
function toggleSidebar() {
    const app = document.getElementById('app-container');
    if (!app) return;
    if (isDarMobileLayout()) {
        app.classList.toggle('mobile-menu-open');
    } else {
        app.classList.toggle('sidebar-collapsed');
    }
    syncDarMobileMenu();
}
window.addEventListener('resize', () => {
    if (!isDarMobileLayout()) closeDarMobileMenu();
    else syncDarMobileMenu();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDarMobileMenu();
});

window.switchTab = function(tabId) {
    if (isDarMobileLayout()) closeDarMobileMenu();
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
        'works-detail': 'Business / Staff Works Folder',
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
    if (clientsCount) clientsCount.innerText = (state.clients || []).length;
    if (worksCount) worksCount.innerText = (state.documents || []).length;

    const now = new Date();
    let currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let currentYearStr = now.getFullYear().toString();

    let monthlyTotal = 0;
    let annualTotal = 0;

    (state.documents || []).forEach(doc => {
        let created = doc.createdDate || '';
        let total = parseFloat(doc.totalAmount) || parseFloat(doc.totalAmt) || parseFloat(doc.total) || parseFloat(doc.amount) || 0;

        if (created.startsWith(currentMonthStr)) monthlyTotal += total;
        if (created.startsWith(currentYearStr)) annualTotal += total;
    });

    const monthlyPayout = document.getElementById('dash-monthly-payout');
    const annualPayout = document.getElementById('dash-annual-payout');
    if (monthlyPayout) monthlyPayout.innerText = `AED ${monthlyTotal.toFixed(2)}`;
    if (annualPayout) annualPayout.innerText = `AED ${annualTotal.toFixed(2)}`;
}

function normalizeCompanyFolderKey(value) {
    return String(value || 'Direct Clients').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function renderClientsTable() {
    const tbody = document.getElementById('client-table-body');
    if (!tbody) return;

    if (!state.clients || state.clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No corporate client accounts found.</td></tr>`;
        return;
    }

    const uniqueClients = [];
    const seenCompanies = new Set();
    state.clients.forEach(cl => {
        const key = (cl.companyName || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
        if (!key || seenCompanies.has(key)) return;
        seenCompanies.add(key);
        uniqueClients.push(cl);
    });
    tbody.innerHTML = uniqueClients.map(cl => `
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

window.openClientModal = function(id) {
    let cl = null;
    if (id && state.clients) cl = state.clients.find(c => c.id === id);

    document.getElementById('cl-modal-id').value = id || '';
    document.getElementById('cl-input-company-name').value = cl ? cl.companyName : '';
    document.getElementById('cl-input-name-ar').value = cl ? cl.nameAr : '';
    document.getElementById('cl-input-contact-person').value = cl ? cl.contactPerson : '';
    document.getElementById('client-modal').style.display = 'flex';
};

window.closeClientModal = function() {
    document.getElementById('client-modal').style.display = 'none';
};

window.saveClientModalData = async function() {
    if (!db) { showCustomModal('Connection unavailable', 'Firebase is not connected. Client changes were not saved.'); return; }
    let id = document.getElementById('cl-modal-id').value || '';
    const companyName = document.getElementById('cl-input-company-name').value.trim();
    let nameAr = document.getElementById('cl-input-name-ar').value.trim();
    const contactPerson = document.getElementById('cl-input-contact-person').value.trim();
    if (!id && companyName) {
        const normalized = companyName.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
        const duplicate = (state.clients || []).find(c => (c.companyName || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim() === normalized);
        if (duplicate) id = duplicate.id;
    }
    if (!id) id = db.ref('clients').push().key;

    if (!companyName) {
        if (typeof showCustomModal === 'function') showCustomModal('Warning', 'Company Name is required.');
        return;
    }

    if (!nameAr && typeof autoTranslateToArabic === 'function') {
        try { nameAr = await autoTranslateToArabic(companyName); } catch (error) { console.warn('Arabic translation failed:', error); }
    }

    db.ref(`clients/${id}`).set({ companyName, nameAr, contactPerson }, (err) => {
        if (!err) { closeClientModal(); }
        else showCustomModal('Save failed', 'Client details could not be saved. Check Firebase permissions and your connection.');
    });
};

window.deleteClientAccount = function(id) {
    if (typeof showCustomModal === 'function') {
        showCustomModal('Confirm Delete', 'Delete this client profile?', `
            <button onclick="closeCustomModal()" class="btn btn-secondary">Cancel</button>
            <button onclick="db.ref('clients/${id}').remove(); closeCustomModal();" class="btn btn-danger">Delete</button>
        `);
    }
};

window.viewClientDetail = function(clientId) {
    state.activeViewingClientId = clientId;
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('cd-client-name').innerText = client.companyName || '-';
    document.getElementById('cd-company-name').innerText = client.companyName || '-';
    document.getElementById('cd-contact-person').innerText = client.contactPerson || '-';
    document.getElementById('cd-name-ar').innerText = client.nameAr || '-';

    const clientDocs = (state.documents || []).filter(d => normalizeCompanyFolderKey(d.companyName || 'Direct Clients') === normalizeCompanyFolderKey(client.companyName));
    const tbody = document.getElementById('client-detail-records-body');
    
    if (clientDocs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No records linked to this account.</td></tr>`;
    } else {
        tbody.innerHTML = clientDocs.map(d => {
            const amt = parseFloat(d.totalAmount) || parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
            return `
                <tr>
                    <td><strong>${d.refCode}</strong></td>
                    <td>${workDescriptionCell(d)}</td>
                    <td>${d.visaExpiryDate || '-'}</td>
                    <td>AED ${amt.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button onclick="previewInvoiceDocument('${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i> View</button>
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
    const companyLabels = {};
    (state.documents || []).forEach(doc => {
        const label = (doc.companyName || 'Direct Clients').trim();
        const key = normalizeCompanyFolderKey(label);
        if (!companyMap[key]) { companyMap[key] = []; companyLabels[key] = label; }
        companyMap[key].push(doc);
    });

    const keys = Object.keys(companyMap);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No company works folders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = keys.map(comp => `
        <tr>
            <td><strong>${escapeHtml(companyLabels[comp])}</strong></td>
            <td>${companyMap[comp].length} Invoices</td>
            <td style="text-align: center;">
                <button onclick="openWorksDetailView('${escapeHtml(companyLabels[comp]).replace(/'/g, '&#39;')}')" class="btn btn-primary" style="padding: 4px 12px; font-size: 0.75rem;"><i class="fa-solid fa-folder-open"></i> Open Folder</button>
            </td>
        </tr>
    `).join('');
}

window.openWorksDetailView = function(companyName) {
    state.activeViewingCompanyWorksName = companyName;
    switchTab('works-detail');
};

window.switchWorksBranch = function(branch) {
    state.activeWorksBranch = branch;
    renderWorksDetailView();
};

function renderWorksDetailView() {
    const companyName = state.activeViewingCompanyWorksName;
    const titleEl = document.getElementById('works-detail-company-title');
    if (titleEl) titleEl.innerText = companyName || '-';

    const allCompanyDocs = (state.documents || []).filter(d => normalizeCompanyFolderKey(d.companyName || 'Direct Clients') === normalizeCompanyFolderKey(companyName));
    const companyWorks = allCompanyDocs.filter(d => d.branchTag !== 'staff');
    const staffWorks = allCompanyDocs.filter(d => d.branchTag === 'staff');

    const countCompany = document.getElementById('count-company-works');
    const countStaff = document.getElementById('count-staff-works');
    if (countCompany) countCompany.innerText = companyWorks.length;
    if (countStaff) countStaff.innerText = staffWorks.length;

    const activeDocs = state.activeWorksBranch === 'staff' ? staffWorks : companyWorks;
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
                <td><strong>${d.refCode}</strong></td>
                <td>${d.clientName || '-'}</td>
                <td>${d.companyName || '-'}</td>
                <td>${d.contactPerson || '-'}</td>
                <td>${workDescriptionCell(d)}</td>
                <td>AED ${amt.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="previewInvoiceDocument('${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="openStudio('Invoice', '${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDocumentsTable() {
    const tbody = document.getElementById('doc-table-body');
    if (!tbody) return;

    const searchVal = (document.getElementById('doc-search-input')?.value || '').toLowerCase();
    
    let filtered = (state.documents || []).filter(d => {
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
            <td style="text-align: center;"><input type="checkbox" class="doc-row-checkbox" value="${d.refCode}" onchange="updateBatchDeleteButtonState()"></td>
            <td><strong>${d.refCode}</strong></td>
            <td>${d.clientName || '-'}</td>
            <td>${d.companyName || '-'}</td>
            <td><span class="branch-badge ${d.branchTag === 'staff' ? 'branch-staff' : 'branch-company'}">${d.branchTag === 'staff' ? 'Staff Works' : 'Business Works'}</span></td>
            <td>${workDescriptionCell(d)}</td>
            <td>AED ${rowTotal.toFixed(2)}</td>
            <td style="text-align: center;">
                <button onclick="previewInvoiceDocument('${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i></button>
                <button onclick="openStudio('Invoice', '${d.refCode}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteSingleDocument('${d.refCode}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
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
    if (typeof showCustomModal === 'function') {
        showCustomModal('Confirm Delete', `Delete entry ${refCode}?`, `
            <button onclick="closeCustomModal()" class="btn btn-secondary">Cancel</button>
            <button onclick="db.ref('documents/${refCode}').remove(); closeCustomModal();" class="btn btn-danger">Delete</button>
        `);
    }
};

let pendingBatchDeleteKeys = [];
window.deleteSelectedDocuments = function() {
    pendingBatchDeleteKeys = Array.from(document.querySelectorAll('.doc-row-checkbox:checked')).map(cb => cb.value);
    if (typeof showCustomModal === 'function') {
        showCustomModal('Batch Delete', `Delete ${pendingBatchDeleteKeys.length} selected entries?`, `
            <button onclick="closeCustomModal()" class="btn btn-secondary">Cancel</button>
            <button onclick="executeBatchDelete(); closeCustomModal();" class="btn btn-danger">Delete All</button>
        `);
    }
};

function executeBatchDelete() {
    pendingBatchDeleteKeys.forEach(k => db.ref(`documents/${k}`).remove());
    pendingBatchDeleteKeys = [];
}

window.previewInvoiceDocument = async function(refCode) {
    const doc = (state.documents || []).find(d => d.refCode === refCode);
    if (!doc) return;

    const docRef = document.getElementById('p-doc-ref');
    const clientName = document.getElementById('p-client-name');
    const companyNameEl = document.getElementById('p-company-name');
    const createdDate = document.getElementById('p-created-date');
    const clientNameAr = document.getElementById('p-client-name-ar');
    const docTitle = document.getElementById('p-doc-title');

    if (docTitle) {
        docTitle.innerHTML = `${(doc.type || 'INVOICE').toUpperCase()} / <span style="font-family: 'Amiri', serif;">${doc.type === 'Quotation' ? 'عرض سعر' : 'فاتورة'}</span>`;
    }
    if (docRef) docRef.innerText = `Ref No: ${doc.refCode}`;
    
    const compName = doc.clientName || doc.companyName || 'N/A';
    if (clientName) clientName.innerText = compName;
    if (companyNameEl) companyNameEl.innerText = doc.companyName || doc.clientName || '-';
    if (createdDate) createdDate.innerText = `Date: ${doc.createdDate || '-'}`;

    let arName = '';
    const matchedClient = (state.clients || []).find(c => c.companyName === doc.companyName || c.companyName === doc.clientName);
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

        const normalizedItems = items.length ? items : (getDocumentWorkDescription(doc) ? [{ serviceName: getDocumentWorkDescription(doc), q: 1, p: docTotal }] : []);
        tbody.innerHTML = normalizedItems.map((item, idx) => {
            const p = parseFloat(item.p ?? item.price) || 0;
            const q = parseFloat(item.q ?? item.quantity) || 1;
            return `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHtml(getWorkItemDescription(item) || 'Service Record')}</td>
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

// Export the existing invoice design as one correctly fitted A4 page.
// Capture the original desktop-width invoice, not the scaled mobile preview.
window.saveAsPDF = async function() {
    const element = document.getElementById('a4-wrapper-element') || document.getElementById('document-preview-print-area');
    if (!element || typeof html2canvas === 'undefined' || !window.jspdf?.jsPDF) {
        alert('PDF export is unavailable. Please reload the page and try again.');
        return;
    }
    const invText = document.getElementById('p-doc-ref')?.innerText.trim() || 'Invoice';
    const filename = invText.replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';
    try {
        await document.fonts?.ready;
        const canvas = await html2canvas(element, {
            scale: Math.min(2, window.devicePixelRatio || 2),
            useCORS: true, backgroundColor: '#ffffff', logging: false,
            windowWidth: Math.max(document.documentElement.clientWidth, 900),
            onclone: clonedDocument => {
                const copy = clonedDocument.getElementById(element.id);
                if (copy) {
                    copy.style.transform = 'none';
                    copy.style.width = '800px';
                    copy.style.maxWidth = '800px';
                    copy.style.margin = '0';
                }
            }
        });
        if (!canvas.width || !canvas.height) throw new Error('Empty invoice canvas');
        const pdf = new window.jspdf.jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        const margin = 5, pageW = 210 - margin * 2, pageH = 297 - margin * 2;
        const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
        const width = canvas.width * scale, height = canvas.height * scale;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', margin + (pageW-width)/2, margin, width, height);
        pdf.save(filename);
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('PDF generation failed. Please try again.');
    }
};

window.closePreviewModal = function() {
    const modal = document.getElementById('document-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};
