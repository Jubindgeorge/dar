// Application Global State
const state = {
    currentTab: 'dashboard',
    documents: [
        { id: 'DAS-2026-001', type: 'invoice', clientName: 'Al Barsha Trading LLC', service: 'Trade License Renewal', total: 4500, date: '2026-10-01', status: 'Completed' },
        { id: 'DAS-2026-002', type: 'quotation', clientName: 'Emirates Logistics', service: 'New Company Formation', total: 12500, date: '2026-10-04', status: 'Pending' }
    ],
    clients: [
        { id: 'C-01', name: 'Al Barsha Trading LLC', trn: '100293847500003', phone: '+971 50 123 4567', email: 'contact@albarsha.ae' },
        { id: 'C-02', name: 'Emirates Logistics', trn: '100987654300003', phone: '+971 55 987 6543', email: 'info@emirateslogistics.ae' }
    ],
    works: [
        { id: 'W-101', client: 'Al Barsha Trading LLC', service: 'Trade License Renewal', status: 'Completed', amount: 4500 },
        { id: 'W-102', client: 'Emirates Logistics', service: 'New Company Formation', status: 'In Progress', amount: 12500 }
    ],
    services: [
        { id: 'S-1', name: 'Trade License Renewal', price: 3500, govtFee: 2500 },
        { id: 'S-2', name: 'New Company Formation', price: 9500, govtFee: 6500 },
        { id: 'S-3', name: 'Visa Stamping & Emirates ID', price: 1800, govtFee: 1200 }
    ]
};

// Tab Router
function switchTab(tabId) {
    state.currentTab = tabId;
    const sections = ['dashboard', 'studio', 'works', 'clients', 'ledger', 'services'];
    
    sections.forEach(sec => {
        const el = document.getElementById(`view-${sec}`);
        const nav = document.getElementById(`nav-${sec}`);
        if (sec === tabId) {
            if (el) el.classList.remove('hidden');
            if (nav) {
                nav.className = 'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition bg-amber-500 text-slate-900 shadow-sm';
            }
        } else {
            if (el) el.classList.add('hidden');
            if (nav) {
                nav.className = 'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition hover:bg-slate-800 text-slate-300';
            }
        }
    });

    // Update Topbar Title
    const titles = {
        dashboard: 'Dashboard Overview',
        studio: 'Studio Invoice & Quotation Creator',
        works: 'Works & Case Directory',
        clients: 'Client Dossiers',
        ledger: 'Accounts & Profit Ledger',
        services: 'Service Catalog & Presets'
    };
    document.getElementById('topbar-title').innerText = titles[tabId] || 'Portal';

    // Trigger specific render hooks
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'studio') renderStudioClientOptions();
    if (tabId === 'works') renderWorksTable();
    if (tabId === 'clients') renderClientsGrid();
    if (tabId === 'ledger') renderLedgerView();
    if (tabId === 'services') renderServiceCatalog();
}

// Dashboard Renderer
function renderDashboard() {
    const totalRev = state.documents.reduce((sum, d) => sum + Number(d.total), 0);
    document.getElementById('kpi-monthly-revenue').innerText = `AED ${totalRev.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('kpi-active-docs').innerText = state.documents.length;
    document.getElementById('kpi-total-clients').innerText = state.clients.length;

    // Net profit calculation via Ledger helper
    if (typeof computeLedgerFinancials === 'function') {
        const fin = computeLedgerFinancials();
        document.getElementById('kpi-net-profit').innerText = `AED ${fin.netProfit.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const tbody = document.getElementById('dashboard-activity-tbody');
    tbody.innerHTML = state.documents.map(d => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-semibold text-slate-800">${d.id}</td>
            <td class="py-3 px-4 text-slate-600">${d.clientName}</td>
            <td class="py-3 px-4 text-slate-600">${d.service}</td>
            <td class="py-3 px-4 font-bold text-slate-900">AED ${Number(d.total).toLocaleString()}</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">${d.status}</span></td>
        </tr>
    `).join('');
}

// Client Management Modals & Renderers
function renderClientsGrid() {
    const container = document.getElementById('clients-grid-container');
    container.innerHTML = state.clients.map(c => `
        <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div class="flex justify-between items-start">
                <h4 class="font-bold text-slate-800 text-base">${c.name}</h4>
                <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">${c.id}</span>
            </div>
            <p class="text-xs text-slate-500">TRN: ${c.trn || 'N/A'}</p>
            <p class="text-xs text-slate-600"><i class="fa-solid fa-phone mr-1.5 text-amber-500"></i> ${c.phone}</p>
            <p class="text-xs text-slate-600"><i class="fa-solid fa-envelope mr-1.5 text-amber-500"></i> ${c.email}</p>
        </div>
    `).join('');
}

function openNewClientModal() {
    showCustomModal(`
        <h3 class="font-bold text-lg text-slate-800">Add New Client</h3>
        <div class="space-y-3">
            <input type="text" id="modal-client-name" placeholder="Company Name" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="text" id="modal-client-trn" placeholder="TRN Number" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="text" id="modal-client-phone" placeholder="Phone Number" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="email" id="modal-client-email" placeholder="Email Address" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
        </div>
        <div class="flex space-x-3 pt-2">
            <button onclick="saveNewClient()" class="flex-1 bg-amber-500 text-slate-900 font-semibold py-2 rounded-xl text-sm">Save Client</button>
            <button onclick="closeCustomModal()" class="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-sm">Cancel</button>
        </div>
    `);
}

function saveNewClient() {
    const name = document.getElementById('modal-client-name').value;
    const trn = document.getElementById('modal-client-trn').value;
    const phone = document.getElementById('modal-client-phone').value;
    const email = document.getElementById('modal-client-email').value;
    if (!name) return alert('Please enter client name');
    state.clients.push({ id: `C-0${state.clients.length + 1}`, name, trn, phone, email });
    closeCustomModal();
    renderClientsGrid();
    showToast('Client added successfully');
}

// Works Directory Renderer
function renderWorksTable() {
    const tbody = document.getElementById('works-table-tbody');
    tbody.innerHTML = state.works.map(w => `
        <tr class="border-b border-slate-50 hover:bg-slate-50">
            <td class="py-3 px-4 font-semibold text-slate-800">${w.id}</td>
            <td class="py-3 px-4 text-slate-600">${w.client}</td>
            <td class="py-3 px-4 text-slate-600">${w.service}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">${w.status}</span></td>
            <td class="py-3 px-4 font-bold text-slate-900">AED ${Number(w.amount).toLocaleString()}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="updateWorkStatus('${w.id}')" class="text-xs text-indigo-600 font-semibold hover:underline">Toggle Status</button>
            </td>
        </tr>
    `).join('');
}

function openNewWorkModal() {
    const clientOpts = state.clients.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    showCustomModal(`
        <h3 class="font-bold text-lg text-slate-800">New Work Record</h3>
        <div class="space-y-3">
            <select id="mw-client" class="w-full border rounded-xl px-3 py-2 text-sm">${clientOpts}</select>
            <input type="text" id="mw-service" placeholder="Service Description" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="number" id="mw-amount" placeholder="Total Amount (AED)" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
        </div>
        <div class="flex space-x-3 pt-2">
            <button onclick="saveNewWork()" class="flex-1 bg-amber-500 text-slate-900 font-semibold py-2 rounded-xl text-sm">Save Work</button>
            <button onclick="closeCustomModal()" class="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-sm">Cancel</button>
        </div>
    `);
}

function saveNewWork() {
    const client = document.getElementById('mw-client').value;
    const service = document.getElementById('mw-service').value;
    const amount = Number(document.getElementById('mw-amount').value);
    if (!service || !amount) return alert('Fill all required fields');
    state.works.push({ id: `W-10${state.works.length + 1}`, client, service, status: 'In Progress', amount });
    closeCustomModal();
    renderWorksTable();
    showToast('Work record created');
}

function updateWorkStatus(id) {
    const work = state.works.find(w => w.id === id);
    if (work) {
        work.status = work.status === 'Completed' ? 'In Progress' : 'Completed';
        renderWorksTable();
        showToast('Work status updated');
    }
}

// Service Catalog Renderer
function renderServiceCatalog() {
    const container = document.getElementById('service-catalog-container');
    container.innerHTML = state.services.map(s => `
        <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
            <h4 class="font-bold text-slate-800">${s.name}</h4>
            <p class="text-xs text-slate-500 font-mono">ID: ${s.id}</p>
            <div class="flex justify-between text-sm pt-2 border-t">
                <span class="text-slate-500">Price: <strong class="text-slate-800">AED ${s.price}</strong></span>
                <span class="text-slate-500">Govt Fee: <strong class="text-rose-600">AED ${s.govtFee}</strong></span>
            </div>
        </div>
    `).join('');
}

function openNewServiceModal() {
    showCustomModal(`
        <h3 class="font-bold text-lg text-slate-800">Add Service Preset</h3>
        <div class="space-y-3">
            <input type="text" id="ms-name" placeholder="Service Name" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="number" id="ms-price" placeholder="Client Price (AED)" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
            <input type="number" id="ms-govt" placeholder="Government Fee (AED)" class="w-full border rounded-xl px-3 py-2 text-sm outline-none">
        </div>
        <div class="flex space-x-3 pt-2">
            <button onclick="saveNewService()" class="flex-1 bg-amber-500 text-slate-900 font-semibold py-2 rounded-xl text-sm">Save Preset</button>
            <button onclick="closeCustomModal()" class="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-sm">Cancel</button>
        </div>
    `);
}

function saveNewService() {
    const name = document.getElementById('ms-name').value;
    const price = Number(document.getElementById('ms-price').value);
    const govtFee = Number(document.getElementById('ms-govt').value);
    if (!name || !price) return alert('Enter name and price');
    state.services.push({ id: `S-${state.services.length + 1}`, name, price, govtFee });
    closeCustomModal();
    renderServiceCatalog();
    showToast('Service preset added');
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    switchTab('dashboard');
});
