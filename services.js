// services.js
function renderServicesCatalog() {
    const wrapper = document.getElementById('services-cards-wrapper');
    if (!wrapper) return;

    if (!state.services || state.services.length === 0) {
        wrapper.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No service tariffs configured. Click "+ Create Package Entry" to add one.</p>`;
        return;
    }

    wrapper.innerHTML = state.services.map(s => {
        const items = s.items || [];
        const itemsTotal = items.reduce((acc, curr) => acc + ((parseFloat(curr.p) || 0) * (parseFloat(curr.q) || 1)), 0);
        const govt = parseFloat(s.govtAmt) || 0;
        const profit = itemsTotal - govt;

        return `
            <div class="service-card">
                <h4>
                    <span>${escapeHtml(s.title)}</span>
                    <div>
                        <button onclick="openServiceModal('${s.id}')" class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteServiceCatalog('${s.id}')" class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </h4>
                <div style="margin-bottom: 10px;">
                    ${items.map(i => `
                        <div class="service-item-row">
                            <span>${escapeHtml(i.d || 'Sub-item')}</span>
                            <strong>AED ${((parseFloat(i.p) || 0) * (parseFloat(i.q) || 1)).toFixed(2)}</strong>
                        </div>
                    `).join('')}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 8px;">
                    <div>Govt. Fees: <strong>AED ${govt.toFixed(2)}</strong></div>
                    <div style="color: var(--accent-green);">Net Profit: <strong>AED ${profit.toFixed(2)}</strong></div>
                </div>
                <div class="service-card-total">Package Total: AED ${itemsTotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

function openServiceModal(serviceId) {
    let srv = null;
    if (serviceId) {
        srv = state.services.find(s => s.id === serviceId);
    }

    document.getElementById('srv-modal-id').value = serviceId || '';
    document.getElementById('srv-input-title').value = srv ? srv.title : '';
    document.getElementById('srv-input-govt').value = srv ? (srv.govtAmt || 0) : 0;
    
    const container = document.getElementById('srv-modal-items-container');
    container.innerHTML = '';

    const items = srv && srv.items ? srv.items : [{ d: '', q: 1, p: 0 }];
    items.forEach(i => addSrvModalRow(i.d, i.q, i.p));

    recalculateSrvModalProfit();
    document.getElementById('service-modal').style.display = 'flex';
}

function closeServiceModal() {
    document.getElementById('service-modal').style.display = 'none';
}

function addSrvModalRow(d = '', q = 1, p = 0) {
    const container = document.getElementById('srv-modal-items-container');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
        <input type="text" placeholder="Description" class="srv-row-d" value="${escapeHtml(d)}" style="flex: 2;" oninput="recalculateSrvModalProfit()">
        <input type="number" placeholder="Qty" class="srv-row-q" value="${q}" style="width: 60px;" oninput="recalculateSrvModalProfit()">
        <input type="number" placeholder="Price" class="srv-row-p" value="${p}" style="width: 90px;" oninput="recalculateSrvModalProfit()">
        <button onclick="this.parentElement.remove(); recalculateSrvModalProfit();" class="btn btn-danger" style="padding: 4px 8px;">×</button>
    `;
    container.appendChild(row);
}

function recalculateSrvModalProfit() {
    const govt = parseFloat(document.getElementById('srv-input-govt').value) || 0;
    let total = 0;

    const rows = document.querySelectorAll('#srv-modal-items-container > div');
    rows.forEach(r => {
        const q = parseFloat(r.querySelector('.srv-row-q').value) || 0;
        const p = parseFloat(r.querySelector('.srv-row-p').value) || 0;
        total += (q * p);
    });

    const profit = total - govt;
    document.getElementById('srv-input-profit').value = `${profit.toFixed(2)} AED`;
}

function saveServiceModalData() {
    const id = document.getElementById('srv-modal-id').value || db.ref('services').push().key;
    const title = document.getElementById('srv-input-title').value.trim();
    const govtAmt = parseFloat(document.getElementById('srv-input-govt').value) || 0;

    if (!title) {
        showCustomModal('Warning', 'Please specify a service title.');
        return;
    }

    const items = [];
    const rows = document.querySelectorAll('#srv-modal-items-container > div');
    rows.forEach(r => {
        items.push({
            d: r.querySelector('.srv-row-d').value.trim(),
            q: parseFloat(r.querySelector('.srv-row-q').value) || 1,
            p: parseFloat(r.querySelector('.srv-row-p').value) || 0
        });
    });

    db.ref(`services/${id}`).set({ title, govtAmt, items }, (err) => {
        if (!err) closeServiceModal();
    });
}

function deleteServiceCatalog(id) {
    showCustomModal('Confirm Delete', 'Are you sure you want to remove this service catalog preset?', `
        <button onclick="closeCustomModal()" class="btn btn-secondary">Cancel</button>
        <button onclick="db.ref('services/${id}').remove(); closeCustomModal();" class="btn btn-danger">Delete</button>
    `);
}