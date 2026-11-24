// services.js
function renderServicesCatalog() {
    const wrapper = document.getElementById('services-cards-wrapper');
    if (!wrapper) return;

    if (!Array.isArray(state.services) || state.services.length === 0) {
        wrapper.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No service tariffs configured. Click "+ Create Package Entry" to add one.</p>`;
        return;
    }

    wrapper.innerHTML = state.services.filter(Boolean).map(s => {
        const items = Array.isArray(s.items) ? s.items : [];
        const itemsTotal = items.reduce((acc, curr) => {
            const price = Number(curr?.p);
            const quantity = Number(curr?.q);
            return acc + ((Number.isFinite(price) ? price : 0) * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1));
        }, 0);
        const govtValue = Number(s.govtAmt);
        const govt = Number.isFinite(govtValue) && govtValue >= 0 ? govtValue : 0;
        const profit = itemsTotal - govt;
        const serviceId = escapeHtml(s.id || '');

        return `
            <div class="service-card">
                <h4>
                    <span>${escapeHtml(s.title || 'Untitled Service')}</span>
                    <div>
                        <button type="button" data-service-action="edit" data-service-id="${serviceId}" class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" data-service-action="delete" data-service-id="${serviceId}" class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </h4>
                <div style="margin-bottom: 10px;">
                    ${items.map(i => {
                        const price = Number(i?.p), quantity = Number(i?.q);
                        const lineTotal = (Number.isFinite(price) ? price : 0) * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
                        return `<div class="service-item-row"><span>${escapeHtml(i?.d || 'Sub-item')}</span><strong>AED ${lineTotal.toFixed(2)}</strong></div>`;
                    }).join('')}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 8px;">
                    <div>Govt. Fees: <strong>AED ${govt.toFixed(2)}</strong></div>
                    <div style="color: var(--accent-green);">Net Profit: <strong>AED ${profit.toFixed(2)}</strong></div>
                </div>
                <div class="service-card-total">Package Total: AED ${itemsTotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    wrapper.querySelectorAll('[data-service-action]').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.serviceId || '';
            if (!id) return;
            if (button.dataset.serviceAction === 'edit') openServiceModal(id);
            if (button.dataset.serviceAction === 'delete') deleteServiceCatalog(id);
        });
    });
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
    const quantity = Number(q), price = Number(p);
    row.innerHTML = `
        <input type="text" placeholder="Description" class="srv-row-d" value="${escapeHtml(d)}" style="flex: 2;" oninput="recalculateSrvModalProfit()">
        <input type="number" min="0.01" step="any" placeholder="Qty" class="srv-row-q" value="${Number.isFinite(quantity) && quantity > 0 ? quantity : 1}" style="width: 60px;" oninput="recalculateSrvModalProfit()">
        <input type="number" min="0" step="any" placeholder="Price" class="srv-row-p" value="${Number.isFinite(price) && price >= 0 ? price : 0}" style="width: 90px;" oninput="recalculateSrvModalProfit()">
        <button type="button" class="btn btn-danger" style="padding: 4px 8px;">×</button>
    `;
    row.querySelector('button').addEventListener('click', () => { row.remove(); recalculateSrvModalProfit(); });
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
    if (!db) { showCustomModal('Connection unavailable', 'Firebase is not connected. Service preset was not saved.'); return; }
    const id = document.getElementById('srv-modal-id').value || db.ref('services').push().key;
    const title = document.getElementById('srv-input-title').value.trim();
    const govtRaw = document.getElementById('srv-input-govt').value;
    const govtAmt = govtRaw === '' ? 0 : Number(govtRaw);

    if (!title || !Number.isFinite(govtAmt) || govtAmt < 0) {
        showCustomModal('Invalid service details', 'Enter a service title and a valid non-negative government fee.');
        return;
    }

    const items = [];
    const rows = document.querySelectorAll('#srv-modal-items-container > div');
    for (const r of rows) {
        const quantity = Number(r.querySelector('.srv-row-q').value);
        const price = Number(r.querySelector('.srv-row-p').value);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
            showCustomModal('Invalid service item', 'Each service item needs a quantity greater than zero and a non-negative price.');
            return;
        }
        items.push({d:r.querySelector('.srv-row-d').value.trim(),q:quantity,p:price});
    }

    db.ref(`services/${id}`).set({ title, govtAmt, items }, (err) => {
        if (err) { showCustomModal('Save failed', 'Service preset could not be saved. Check Firebase permissions and your connection.'); return; }
        closeServiceModal();
    });
}

function deleteServiceCatalog(id) {
    if (!id || !db) { showCustomModal('Connection unavailable', 'The service preset could not be identified or Firebase is unavailable.'); return; }
    showCustomModal('Confirm Delete', 'Are you sure you want to remove this service catalog preset?', `
        <button type="button" id="cancel-delete-service" class="btn btn-secondary">Cancel</button>
        <button type="button" id="confirm-delete-service" class="btn btn-danger">Delete</button>
    `);
    document.getElementById('cancel-delete-service')?.addEventListener('click', closeCustomModal);
    document.getElementById('confirm-delete-service')?.addEventListener('click', async () => {
        const button = document.getElementById('confirm-delete-service');
        if (button) button.disabled = true;
        try {
            await safeDeleteDarRecord('services', id);
            closeCustomModal();
        } catch (error) {
            if (button) button.disabled = false;
        }
    });
}