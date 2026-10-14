// app.js - Harmonized with ledger.js properties and main service names
function localISODate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Strictly target only explicit package/service titles
function getWorkItemDescription(item) {
    if (!item || typeof item !== 'object') return '';
    return String(item.packageName || item.title || item.serviceName || '').trim();
}

function getDocumentWorkDescription(doc) {
    // Only check document-level package name or title; ignore descriptions entirely
    return String(doc?.packageName || doc?.title || doc?.serviceName || '').trim();
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
let darApprovalRef = null;
let darRequestRef = null;\nlet darNotificationsOpen = false;
let darAuthVersion = 0;

function setAuthStatus(message) {
    const el = document.getElementById('auth-status');
    if (el) el.textContent = message;
}
window.toggleSignup = function(show) {
    document.getElementById('signup-form').style.display = show ? 'flex' : 'none';
    document.getElementById('login-form').style.display = show ? 'none' : 'flex';
    setAuthStatus('');
};
function stopDarListeners() {
    if (darApprovalRef) { darApprovalRef.off(); darApprovalRef = null; }
    if (darRequestRef) { darRequestRef.off(); darRequestRef = null; }
    if (darListenersActive) {
        ['clients', 'documents', 'services', 'monthlyExpenses'].forEach(path => db.ref(path).off());
        darListenersActive = false;
    }
    const panel = document.getElementById('admin-approvals');
    if (panel) panel.style.display = 'none';
}
function setDarAccess(allowed) {
    const authPanel = document.getElementById('auth-container');
    const appPanel = document.getElementById('app-container');
    if (authPanel) authPanel.style.display = allowed ? 'none' : 'flex';
    if (appPanel) appPanel.style.display = allowed ? 'flex' : 'none';
    if (allowed && !darListenersActive) {
        darListenersActive = true;
        initFirebaseListeners();
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.style.display = 'none';
        switchTab('dashboard');
    }
}
window.toggleDarNotifications = function(force) {\n    const panel = document.getElementById('admin-approvals');\n    if (!panel || !firebase.auth().currentUser || !DAR_ALLOWED_UIDS.has(firebase.auth().currentUser.uid)) return;\n    darNotificationsOpen = typeof force === 'boolean' ? force : !darNotificationsOpen;\n    panel.style.display = darNotificationsOpen ? 'block' : 'none';\n};\nfunction showAdminApprovals() {
    const panel = document.getElementById('admin-approvals');
    const list = document.getElementById('approval-list');
    if (!panel || !list) return;
    panel.style.display = 'block';
    darRequestRef = db.ref('signupRequests');
    darRequestRef.on('value', async snapshot => {
        const requests = snapshot.val() || {};
        const approvals = (await db.ref('approvals').once('value')).val() || {};
        list.replaceChildren();
        const pending = Object.entries(requests).filter(([uid]) => approvals[uid] !== true);\n        const badge = document.getElementById('dar-notification-count');\n        if (badge) { badge.textContent = String(pending.length); badge.style.display = pending.length ? 'inline' : 'none'; }
        if (!pending.length) { list.textContent = 'No pending users.'; return; }
        pending.forEach(([uid, request]) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:10px 0;border-bottom:1px solid #94a3b8;overflow-wrap:anywhere;';
            const email = document.createElement('div');
            email.textContent = String(request.email || 'Unknown email');
            const approve = document.createElement('button');
            approve.type = 'button';
            approve.textContent = 'Approve full access';
            approve.className = 'btn btn-primary';
            approve.onclick = async () => {
                if (!confirm('Grant full financial-record access to ' + email.textContent + '?')) return;
                approve.disabled = true;
                try { await db.ref('approvals/' + uid).set(true); item.remove(); }
                catch (error) { alert('Approval failed: ' + error.message); approve.disabled = false; }
            };
            item.append(email, approve);
            list.appendChild(item);
        });
    }, error => { list.textContent = 'Could not load requests: ' + error.message; });
}
function initializeFirebaseLogin() {
    setDarAccess(false);
    firebase.auth().onAuthStateChanged(async user => {
        const version = ++darAuthVersion;
        stopDarListeners();
        setDarAccess(false);
        if (!user) {
            state.clients = []; state.documents = []; state.services = []; state.monthlyExpenses = [];
            return;
        }
        if (!user.emailVerified) {
            setAuthStatus('Verify your email address before signing in.');
            if (!darLoginInProgress) await firebase.auth().signOut();
            return;
        }
        try {
            await user.getIdToken(true);
            if (version !== darAuthVersion) return;
            if (DAR_ALLOWED_UIDS.has(user.uid)) {
                setDarAccess(true);
                showAdminApprovals();
                return;
            }
            darApprovalRef = db.ref('approvals/' + user.uid);
            darApprovalRef.on('value', snapshot => {
                if (version !== darAuthVersion) return;
                const approved = snapshot.val() === true;
                setDarAccess(approved);
                setAuthStatus(approved ? '' : 'Email verified. Waiting for an administrator to approve your account.');
                if (!approved && darListenersActive) {
                    ['clients', 'documents', 'services', 'monthlyExpenses'].forEach(path => db.ref(path).off());
                    darListenersActive = false;
                    state.clients = []; state.documents = []; state.services = []; state.monthlyExpenses = [];
                }
            }, error => setAuthStatus('Approval check failed: ' + error.message));
        } catch (error) {
            setAuthStatus('Could not verify access. Please sign in again.');
            console.error('DAR authorization failed:', error);
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
        await firebase.auth().setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
        document.getElementById('login-pin').value = '';
        if (!credential.user.emailVerified) {
            try {
                await credential.user.sendEmailVerification();
                setAuthStatus('Verification email sent. Check inbox/spam, verify, then sign in again.');
            } finally { await firebase.auth().signOut(); }
        } else {
            setAuthStatus('Checking account approval...');
        }
    } catch (error) {
        console.error('Login failed:', error.code);
        setAuthStatus('Sign-in failed. Check your email and password.');
    } finally { darLoginInProgress = false; }
};
window.handleSignup = async function(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (password.length < 8) { setAuthStatus('Use at least 8 password characters.'); return; }
    darLoginInProgress = true;
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        const credential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        document.getElementById('signup-password').value = '';
        await db.ref('signupRequests/' + credential.user.uid).set({
            email: credential.user.email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        await credential.user.sendEmailVerification();
        setAuthStatus('Account created. Verify your email, then sign in and wait for administrator approval.');
        await firebase.auth().signOut();
        window.toggleSignup(false);
        setAuthStatus('Account created. Check your email for verification, then sign in.');
    } catch (error) {
        console.error('Sign-up failed:', error.code);
        setAuthStatus('Sign-up incomplete: ' + error.message + '. If the account was created, sign in to retry verification.');
        if (firebase.auth().currentUser) await firebase.auth().signOut();
    } finally { darLoginInProgress = false; }
};
window.handleLogout = async function() {
    stopDarListeners();
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

function darDashboardAmount(record) {
    for (const value of [record.totalAmount, record.totalAmt, record.total, record.amount]) {
        if (value === undefined || value === null || value === '') continue;
        const parsed = Number(String(value).replace(/,/g, ''));
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}
function renderDashboardStats() {
    const documents = state.documents || [];
    const clients = state.clients || [];
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const sums = {month: 0, year: 0, business: 0, staff: 0, businessCount: 0, staffCount: 0};
    documents.forEach(doc => {
        const amount = darDashboardAmount(doc);
        const date = String(doc.createdDate || '');
        if (date.startsWith(month)) sums.month += amount;
        if (date.startsWith(year)) sums.year += amount;
        if (getAutomaticWorkBranch(doc) === 'staff') { sums.staff += amount; sums.staffCount++; }
        else { sums.business += amount; sums.businessCount++; }
    });
    const expenses = (state.monthlyExpenses || []).reduce((sum, entry) => {
        if (String(entry.month || '') !== month) return sum;
        const amount = Number(entry.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const currency = amount => 'AED ' + amount.toLocaleString('en-AE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    set('dash-client-count', String(clients.length));
    set('dash-works-count', String(documents.length));
    set('dash-monthly-payout', currency(sums.month));
    set('dash-annual-payout', currency(sums.year));
    set('dash-business-total', currency(sums.business));
    set('dash-staff-total', currency(sums.staff));
    set('dash-business-count', sums.businessCount + ' records');
    set('dash-staff-count', sums.staffCount + ' records');
    set('dash-month-expenses', currency(expenses));
    set('dash-month-net', currency(sums.month - expenses));
}

function normalizeCompanyFolderKey(value) {
    return String(value || 'Without Company').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function getAutomaticWorkBranch(doc) {
    const company = normalizeCompanyFolderKey(doc?.companyName || '');
    const client = normalizeCompanyFolderKey(doc?.clientName || '');
    if (!String(doc?.companyName || '').trim()) return 'unassigned';
    return client && company !== client ? 'staff' : 'company';
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
            <button onclick="safeDeleteDarRecord('clients', '${id}'); closeCustomModal();" class="btn btn-danger">Delete</button>
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

    const clientDocs = (state.documents || []).filter(d => normalizeCompanyFolderKey(d.companyName || 'Without Company') === normalizeCompanyFolderKey(client.companyName));
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
        const label = (doc.companyName || 'Without Company').trim();
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
    const companyWorks = allCompanyDocs.filter(d => getAutomaticWorkBranch(d) !== 'staff');
    const staffWorks = allCompanyDocs.filter(d => getAutomaticWorkBranch(d) === 'staff');

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

function getDarDocumentAmount(d) {
    const candidates = [d.totalAmount, d.totalAmt, d.total, d.amount];
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined || candidate === '') continue;
        const number = Number(String(candidate).replace(/,/g, ''));
        if (Number.isFinite(number)) return number;
    }
    return 0;
}
window.clearDocumentFilters = function() {
    for (const id of ['doc-search-input', 'doc-min-amount', 'doc-max-amount']) {
        const input = document.getElementById(id);
        if (input) input.value = '';
    }
    const branch = document.getElementById('doc-branch-filter');
    if (branch) branch.value = 'all';
    renderDocumentsTable();
};
function renderDocumentsTable() {
    const tbody = document.getElementById('doc-table-body');
    if (!tbody) return;

    const searchVal = (document.getElementById('doc-search-input')?.value || '').trim().toLowerCase();
    const branch = document.getElementById('doc-branch-filter')?.value || 'all';
    const minRaw = document.getElementById('doc-min-amount')?.value || '';
    const maxRaw = document.getElementById('doc-max-amount')?.value || '';
    const min = minRaw !== '' && Number.isFinite(Number(minRaw)) ? Math.max(0, Number(minRaw)) : null;
    const max = maxRaw !== '' && Number.isFinite(Number(maxRaw)) ? Math.max(0, Number(maxRaw)) : null;
    const all = state.documents || [];
    const filtered = all.filter(d => {
        const matchesText = [d.refCode, d.clientName, d.companyName]
            .some(value => String(value || '').toLowerCase().includes(searchVal));
        const matchesBranch = branch === 'all' ||
            (branch === 'staff' ? getAutomaticWorkBranch(d) === 'staff' : getAutomaticWorkBranch(d) !== 'staff');
        const amount = getDarDocumentAmount(d);
        return matchesText && matchesBranch &&
            (min === null || amount >= min) && (max === null || amount <= max);
    });
    const count = document.getElementById('doc-filter-count');
    if (count) count.textContent = filtered.length + ' of ' + all.length + ' records';
    const master = document.getElementById('th-select-all');
    if (master) master.checked = false;
    if (typeof updateBatchDeleteButtonState === 'function') updateBatchDeleteButtonState();

    let totalVolume = filtered.reduce((acc, curr) => {
        const amt = getDarDocumentAmount(curr);
        return acc + amt;
    }, 0);

    const ledgerTotal = document.getElementById('ledger-total-amount');
    if (ledgerTotal) {
        ledgerTotal.innerText = `AED ${totalVolume.toFixed(2)}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No financial records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const rowTotal = getDarDocumentAmount(d);
        return `
        <tr>
            <td style="text-align: center;"><input type="checkbox" class="doc-row-checkbox" value="${d.refCode}" onchange="updateBatchDeleteButtonState()"></td>
            <td><strong>${d.refCode}</strong></td>
            <td>${d.clientName || '-'}</td>
            <td>${d.companyName || '-'}</td>
            <td><span class="branch-badge ${d.branchTag === 'staff' ? 'branch-staff' : 'branch-company'}">${getAutomaticWorkBranch(d) === 'unassigned' ? 'Without Company' : getAutomaticWorkBranch(d) === 'staff' ? 'Staff Works' : 'Business Works'}</span></td>
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
            <button onclick="safeDeleteDarRecord('documents', '${refCode}'); closeCustomModal();" class="btn btn-danger">Delete</button>
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
    const keys = [...pendingBatchDeleteKeys];
    pendingBatchDeleteKeys = [];
    Promise.allSettled(keys.map(k => safeDeleteDarRecord('documents', k))).then(results => {
        if (results.some(result => result.status === 'rejected')) alert('Some records could not be deleted. Review the error and retry.');
    });
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

/* Data protection: snapshot export and reversible deletion.
   Publish matching Firebase rules before enabling delete/recover operations. */
const DAR_PROTECTED_COLLECTIONS = ['clients', 'documents', 'services', 'monthlyExpenses'];
function darSafeKey(value) {
    const key = String(value || '');
    if (!key || [...key].some(ch => '.#$[]/'.includes(ch) || ch.charCodeAt(0) === 92 || ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) throw new Error('Invalid record identifier');
    return key;
}
function darSignedInUser() {
    const user = firebase.auth().currentUser;
    if (!user || !user.emailVerified) throw new Error('Sign in with a verified account first.');
    return user;
}
function darDownloadJSON(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
window.exportDarBackup = async function() {
    try {
        const user = darSignedInUser();
        const data = {};
        for (const collection of DAR_PROTECTED_COLLECTIONS) {
            data[collection] = (await db.ref(collection).once('value')).val() || {};
        }
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        darDownloadJSON('dar-al-shams-backup-' + date + '.json', {
            format: 'dar-al-shams-backup-v1', exportedAt: new Date().toISOString(),
            exportedByUid: user.uid, data
        });
        alert('Backup downloaded. Keep the file in secure storage; it contains private business information.');
    } catch (error) {
        console.error('Backup failed:', error);
        alert('Backup failed: ' + error.message);
    }
};
window.safeDeleteDarRecord = async function(collection, key) {
    try {
        const user = darSignedInUser();
        if (!DAR_PROTECTED_COLLECTIONS.includes(collection)) throw new Error('Invalid collection');
        key = darSafeKey(key);
        const snapshot = await db.ref(collection + '/' + key).once('value');
        if (!snapshot.exists()) throw new Error('Record was already removed.');
        const id = db.ref('deletedRecords').push().key;
        const auditId = db.ref('activityLog').push().key;
        const updates = {};
        updates['deletedRecords/' + id] = {
            collection, recordKey: key, value: snapshot.val(),
            deletedBy: user.uid, deletedAt: firebase.database.ServerValue.TIMESTAMP
        };
        updates[collection + '/' + key] = null;
        updates['activityLog/' + auditId] = {
            action: 'delete', collection, recordKey: key, actorUid: user.uid,
            at: firebase.database.ServerValue.TIMESTAMP
        };
        await db.ref().update(updates);
        alert('Record moved to recovery. It can be restored from Data Protection.');
    } catch (error) {
        console.error('Safe deletion failed:', error);
        alert('Delete failed; record was not intentionally removed: ' + error.message);
        throw error;
    }
};
window.restoreDarRecord = async function(id) {
    try {
        const user = darSignedInUser();
        id = darSafeKey(id);
        const deleted = (await db.ref('deletedRecords/' + id).once('value')).val();
        if (!deleted || !DAR_PROTECTED_COLLECTIONS.includes(deleted.collection)) throw new Error('Recovery record unavailable');
        const key = darSafeKey(deleted.recordKey);
        const target = db.ref(deleted.collection + '/' + key);
        const exists = await target.once('value');
        if (exists.exists()) throw new Error('A record with this ID already exists. No data was overwritten.');
        const auditId = db.ref('activityLog').push().key;
        const updates = {};
        updates[deleted.collection + '/' + key] = deleted.value;
        updates['deletedRecords/' + id] = null;
        updates['activityLog/' + auditId] = {
            action: 'restore', collection: deleted.collection, recordKey: key,
            actorUid: user.uid, at: firebase.database.ServerValue.TIMESTAMP
        };
        await db.ref().update(updates);
        alert('Record restored.');
        window.showDarRecovery();
    } catch (error) {
        alert('Restore failed: ' + error.message);
    }
};
window.showDarRecovery = async function() {
    try {
        darSignedInUser();
        const snapshot = await db.ref('deletedRecords').limitToLast(40).once('value');
        const list = document.getElementById('dar-recovery-list');
        if (!list) return;
        list.replaceChildren();
        const entries = Object.entries(snapshot.val() || {}).reverse();
        if (!entries.length) { list.textContent = 'No deleted records.'; return; }
        entries.forEach(([id, record]) => {
            const row = document.createElement('div');
            row.style.cssText = 'margin:8px 0;padding:8px;border-bottom:1px solid #ccc;';
            const label = document.createElement('span');
            label.textContent = record.collection + ' / ' + record.recordKey + ' — ' + new Date(record.deletedAt).toLocaleString();
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = 'Restore'; button.className = 'btn btn-secondary';
            button.onclick = () => window.restoreDarRecord(id);
            row.append(label, document.createTextNode(' '), button);
            list.appendChild(row);
        });
    } catch (error) { alert('Recovery list unavailable: ' + error.message); }
};
window.showDarActivity = async function() {
    try {
        darSignedInUser();
        const snapshot = await db.ref('activityLog').limitToLast(30).once('value');
        const list = document.getElementById('dar-activity-list');
        if (!list) return;
        list.replaceChildren();
        const entries = Object.values(snapshot.val() || {}).reverse();
        if (!entries.length) { list.textContent = 'No recorded actions yet.'; return; }
        entries.forEach(record => {
            const line = document.createElement('div');
            line.style.cssText = 'padding:7px;border-bottom:1px solid #ccc;overflow-wrap:anywhere;';
            line.textContent = new Date(record.at).toLocaleString() + ' — ' + record.action +
                ' — ' + record.collection + '/' + record.recordKey + ' — UID: ' + record.actorUid;
            list.appendChild(line);
        });
    } catch (error) { alert('Activity history unavailable: ' + error.message); }
};
window.toggleDarProtection = function() {
    const panel = document.getElementById('dar-protection-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { window.showDarRecovery(); window.showDarActivity(); }
};
