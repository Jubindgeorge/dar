/* Additive supplier and purchase register. This module does not post into or rewrite existing invoice/quotation ledgers. */
(function () {
    const clean = value => String(value == null ? '' : value).trim();
    const html = value => clean(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const byId = id => document.getElementById(id);
    state.suppliers = state.suppliers || [];
    state.purchases = state.purchases || [];

    function supplierName(id) { return (state.suppliers || []).find(s => s.id === id)?.name || ''; }
    function fillSupplierOptions(selectedId) {
        const select = byId('pu-supplier');
        if (!select) return;
        select.innerHTML = '<option value="">Select supplier</option>' + (state.suppliers || []).slice().sort((a,b)=>clean(a.name).localeCompare(clean(b.name))).map(s=>'<option value="'+html(s.id)+'">'+html(s.name)+'</option>').join('');
        select.value = selectedId || '';
    }
    window.refreshPurchaseSupplierOptions = function () { fillSupplierOptions(); };

    window.renderPurchases = function () {
        const body = byId('purchase-table-body');
        if (!body) return;
        const query = clean(byId('purchase-search')?.value).toLocaleLowerCase();
        const status = clean(byId('purchase-status-filter')?.value);
        const records = (state.purchases || []).filter(p => {
            const searchText = [supplierName(p.supplierId) || p.supplierName,p.reference,p.description,p.date].map(v=>clean(v).toLocaleLowerCase()).join(' ');
            return (!query || searchText.includes(query)) && (!status || p.paymentStatus === status);
        }).sort((a,b)=>clean(b.date).localeCompare(clean(a.date)));
        const total = records.reduce((sum,p)=>sum+(Number(p.amount)||0),0);
        if (byId('purchase-total-amount')) byId('purchase-total-amount').textContent = 'AED ' + total.toFixed(2);
        if (!records.length) { body.innerHTML = '<tr><td colspan="7" class="staff-empty">No purchase records found. Add a supplier and record the first purchase.</td></tr>'; return; }
        body.innerHTML = records.map(p=>'<tr><td>'+html(supplierName(p.supplierId)||p.supplierName||'-')+'</td><td><strong>'+html(p.reference||'-')+'</strong></td><td>'+html(p.date||'-')+'</td><td>'+html(p.description||'-')+'</td><td>AED '+(Number(p.amount)||0).toFixed(2)+'</td><td>'+html(p.paymentStatus||'Unpaid')+'</td><td><button type="button" class="btn btn-secondary" onclick="openPurchaseModal(\''+html(p.id)+'\')">Edit</button></td></tr>').join('');
        if (window.applyDarLanguage) window.applyDarLanguage();
    };

    window.openSupplierModal = function () {
        byId('supplier-modal-title').textContent = 'Add Supplier';
        byId('su-record-id').value = '';
        ['su-name','su-contact','su-phone','su-email'].forEach(id=>byId(id).value='');
        byId('supplier-modal').style.display = 'flex';
    };
    window.closeSupplierModal = function () { byId('supplier-modal').style.display = 'none'; };
    window.saveSupplier = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. Supplier was not saved.'); return; }
        const name = clean(byId('su-name').value);
        if (!name) { showCustomModal('Required field','Supplier Name is required.'); return; }
        const duplicate = (state.suppliers||[]).find(s=>clean(s.name).toLocaleLowerCase()===name.toLocaleLowerCase());
        if (duplicate) { closeSupplierModal(); showCustomModal('Supplier exists','A supplier with this name is already registered.'); return; }
        const id = db.ref('suppliers').push().key;
        const record = {name,contact:clean(byId('su-contact').value),phone:clean(byId('su-phone').value),email:clean(byId('su-email').value),createdAt:new Date().toISOString()};
        db.ref('suppliers/'+id).set(record,error=>{
            if(error){showCustomModal('Save failed','Supplier could not be saved. Check Firebase permissions and connection.');return;}
            state.suppliers.push({id,...record}); closeSupplierModal(); fillSupplierOptions(id); showCustomModal('Supplier Saved','Supplier was saved successfully.');
        });
    };

    window.openPurchaseModal = function (recordId) {
        const record = (state.purchases||[]).find(p=>p.id===recordId) || {};
        byId('purchase-modal-title').textContent = recordId ? 'Edit Purchase' : 'Record Purchase';
        byId('pu-record-id').value = recordId || '';
        fillSupplierOptions(record.supplierId || '');
        byId('pu-reference').value = record.reference || '';
        byId('pu-date').value = record.date || new Date().toISOString().slice(0,10);
        byId('pu-description').value = record.description || '';
        byId('pu-amount').value = record.amount ?? '';
        byId('pu-status').value = record.paymentStatus || 'Unpaid';
        byId('pu-notes').value = record.notes || '';
        byId('purchase-modal').style.display = 'flex';
    };
    window.closePurchaseModal = function () { byId('purchase-modal').style.display = 'none'; };
    window.savePurchase = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. Purchase was not saved.'); return; }
        const id = clean(byId('pu-record-id').value) || db.ref('purchases').push().key;
        const supplierId = clean(byId('pu-supplier').value);
        const reference = clean(byId('pu-reference').value);
        const date = clean(byId('pu-date').value);
        const amount = Number(byId('pu-amount').value);
        if (!supplierId || !reference || !date || byId('pu-amount').value === '' || !Number.isFinite(amount) || amount < 0) {
            showCustomModal('Required fields','Supplier, reference, date and a non-negative amount are required.'); return;
        }
        const record = {id,supplierId,supplierName:supplierName(supplierId),reference,date,description:clean(byId('pu-description').value),amount,paymentStatus:clean(byId('pu-status').value)||'Unpaid',notes:clean(byId('pu-notes').value),updatedAt:new Date().toISOString()};
        const payload={...record};delete payload.id;
        db.ref('purchases/'+id).update(payload,error=>{
            if(error){showCustomModal('Save failed','Purchase could not be saved. Check Firebase permissions and connection.');return;}
            const index=(state.purchases||[]).findIndex(p=>p.id===id);
            if(index>=0)state.purchases[index]=record;else state.purchases.push(record);
            closePurchaseModal();renderPurchases();showCustomModal('Purchase Saved','Purchase record saved. It is stored separately from invoice and quotation totals; no historical financial record was rewritten.');
        });
    };

    // Firebase listeners are registered by initFirebaseListeners only after the user is authorized.
})();
