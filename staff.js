/* Company Staff & company-linked client workflows.
 * Additive only: staff and companyClients use separate Firebase nodes; invoice/quotation print markup is untouched.
 */
(function () {
    const clean = value => String(value == null ? '' : value).trim();
    const norm = value => clean(value).toLocaleLowerCase().replace(/\s+/g, ' ');
    const html = value => clean(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const byId = id => document.getElementById(id);

    state.staff = state.staff || [];
    state.companyClients = state.companyClients || [];
    state.activeStaffCompanyId = state.activeStaffCompanyId || '';
    state.selectedCompanyClientId = state.selectedCompanyClientId || '';

    function companyById(id) {
        return (state.clients || []).find(company => company.id === id);
    }
    function companyNameById(id) {
        return companyById(id)?.companyName || '';
    }
    function companyIdByName(name) {
        const company = (state.clients || []).find(c => norm(c.companyName) === norm(name));
        return company?.id || '';
    }
    function companyClientsFor(name) {
        return (state.companyClients || []).filter(client => norm(client.companyName) === norm(name));
    }
    function dueStatus(record) {
        const stored = clean(record.renewalStatus);
        const dates = [record.visaExpiry, record.passportExpiry].filter(Boolean).map(value => {
            const date = new Date(value + 'T00:00:00');
            return Number.isNaN(date.getTime()) ? null : Math.ceil((date.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
        }).filter(value => value !== null);
        if (dates.some(days => days < 0)) return 'Expired';
        if (dates.some(days => days <= 60) && stored !== 'Renewed') return 'Due Soon';
        return stored || 'Not Required';
    }
    function statusPill(status) {
        const color = status === 'Expired' ? '#fecaca' : status === 'Due Soon' || status === 'Pending' ? '#fde68a' : status === 'Renewed' ? '#bbf7d0' : '#cbd5e1';
        const ink = status === 'Expired' ? '#991b1b' : status === 'Due Soon' || status === 'Pending' ? '#92400e' : status === 'Renewed' ? '#166534' : '#334155';
        return '<span class="staff-status-pill" style="background:'+color+';color:'+ink+'">'+html(status)+'</span>';
    }

    window.openCompanyStaff = function (companyId) {
        state.activeStaffCompanyId = companyId || '';
        const filter = byId('staff-company-filter');
        if (filter) filter.value = state.activeStaffCompanyId;
        if (typeof switchTab === 'function') switchTab('staff');
        renderStaffTable();
    };
    window.setStaffCompanyFilter = function (companyId) {
        state.activeStaffCompanyId = companyId || '';
        renderStaffTable();
    };
    window.clearStaffCompanyFilter = function () {
        state.activeStaffCompanyId = '';
        const filter = byId('staff-company-filter');
        if (filter) filter.value = '';
        renderStaffTable();
    };

    window.renderStaffTable = function () {
        const body = byId('staff-table-body');
        if (!body) return;
        const companyFilter = byId('staff-company-filter');
        if (companyFilter) {
            const selected = state.activeStaffCompanyId || companyFilter.value || '';
            const options = '<option value="">All companies</option>' + (state.clients || []).slice().sort((a,b)=>clean(a.companyName).localeCompare(clean(b.companyName))).map(c => '<option value="'+html(c.id)+'">'+html(c.companyName)+'</option>').join('');
            if (companyFilter.innerHTML !== options) companyFilter.innerHTML = options;
            companyFilter.value = selected;
        }
        const companyContext = byId('staff-company-context');
        if (companyContext) companyContext.textContent = state.activeStaffCompanyId ? ('Company: ' + companyNameById(state.activeStaffCompanyId)) : 'All companies';
        const search = norm(byId('staff-search')?.value);
        const renewal = clean(byId('staff-renewal-filter')?.value);
        const records = (state.staff || []).filter(staff => {
            if (state.activeStaffCompanyId && staff.companyId !== state.activeStaffCompanyId && norm(staff.companyName) !== norm(companyNameById(state.activeStaffCompanyId))) return false;
            if (renewal && dueStatus(staff) !== renewal && clean(staff.renewalStatus) !== renewal) return false;
            const searchable = [staff.staffCode,staff.fullName,staff.companyName,staff.lastWorkDone,staff.passportNumber,staff.visaNumber].map(norm).join(' ');
            return !search || searchable.includes(search);
        }).sort((a,b)=>clean(a.fullName).localeCompare(clean(b.fullName)));
        if (!records.length) {
            body.innerHTML = '<tr><td colspan="8" class="staff-empty">No staff records found. Use “Add Staff” to create the first profile.</td></tr>';
            return;
        }
        body.innerHTML = records.map(staff => '<tr>'+
            '<td><strong>'+html(staff.staffCode || staff.staffId || '-')+'</strong></td>'+
            '<td>'+html(staff.fullName || '-')+'</td>'+
            '<td>'+html(staff.companyName || companyNameById(staff.companyId) || '-')+'</td>'+
            '<td>'+html(staff.lastWorkDone || '-')+'</td>'+
            '<td>'+html(staff.visaExpiry || '-')+'</td>'+
            '<td>'+html(staff.passportExpiry || '-')+'</td>'+
            '<td>'+statusPill(dueStatus(staff))+'</td>'+
            '<td class="staff-actions"><button type="button" class="btn btn-secondary" onclick="openStaffModal(\''+html(staff.id)+'\')">Edit</button> '+(staff.linkedInvoiceRef ? '<button type="button" class="btn btn-secondary" onclick="previewInvoiceDocument(\''+html(staff.linkedInvoiceRef)+'\')">Invoice</button>' : '')+'</td>'+
            '</tr>').join('');
    };

    window.openStaffModal = function (recordId, defaults) {
        const record = (state.staff || []).find(item => item.id === recordId) || {};
        defaults = defaults || {};
        byId('staff-modal-title').textContent = recordId ? 'Edit Staff Profile' : 'Add Staff Profile';
        byId('sf-record-id').value = recordId || '';
        byId('sf-linked-invoice').value = defaults.linkedInvoiceRef || record.linkedInvoiceRef || '';
        const companySelect = byId('sf-company');
        companySelect.innerHTML = '<option value="">Select company</option>' + (state.clients || []).map(c => '<option value="'+html(c.id)+'">'+html(c.companyName)+'</option>').join('');
        const companyId = record.companyId || defaults.companyId || companyIdByName(record.companyName || defaults.companyName || '');
        companySelect.value = companyId;
        byId('sf-staff-code').value = record.staffCode || record.staffId || defaults.staffCode || '';
        byId('sf-full-name').value = record.fullName || defaults.fullName || '';
        byId('sf-nationality').value = record.nationality || '';
        byId('sf-designation').value = record.designation || '';
        byId('sf-last-work').value = record.lastWorkDone || defaults.lastWorkDone || '';
        byId('sf-passport').value = record.passportNumber || '';
        byId('sf-passport-expiry').value = record.passportExpiry || '';
        byId('sf-visa-number').value = record.visaNumber || '';
        byId('sf-visa-expiry').value = record.visaExpiry || defaults.visaExpiry || '';
        byId('sf-visa-status').value = record.visaStatus || '';
        byId('sf-renewal-status').value = record.renewalStatus || 'Pending';
        byId('sf-joining-date').value = record.joiningDate || '';
        byId('sf-phone').value = record.phone || '';
        byId('sf-email').value = record.email || '';
        byId('sf-document-reference').value = record.documentReference || '';
        byId('sf-notes').value = record.notes || '';
        byId('staff-modal').style.display = 'flex';
    };
    window.closeStaffModal = function () { byId('staff-modal').style.display = 'none'; };

    window.saveStaffRecord = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. Staff details were not saved.'); return; }
        const id = clean(byId('sf-record-id').value) || db.ref('staff').push().key;
        const companyId = clean(byId('sf-company').value);
        const companyName = companyNameById(companyId);
        const staffCode = clean(byId('sf-staff-code').value);
        const fullName = clean(byId('sf-full-name').value);
        if (!staffCode || !fullName || !companyId || !companyName) {
            showCustomModal('Required fields','Staff ID, Full Name and Company are required.'); return;
        }
        const linkedInvoiceRef = clean(byId('sf-linked-invoice').value);
        const previous = (state.staff || []).find(item => item.id === id) || {};
        const record = {
            ...previous, id, staffCode, staffId: staffCode, fullName, companyId, companyName,
            nationality: clean(byId('sf-nationality').value),
            designation: clean(byId('sf-designation').value),
            lastWorkDone: clean(byId('sf-last-work').value),
            passportNumber: clean(byId('sf-passport').value),
            passportExpiry: clean(byId('sf-passport-expiry').value),
            visaNumber: clean(byId('sf-visa-number').value),
            visaExpiry: clean(byId('sf-visa-expiry').value),
            visaStatus: clean(byId('sf-visa-status').value),
            renewalStatus: clean(byId('sf-renewal-status').value),
            joiningDate: clean(byId('sf-joining-date').value),
            phone: clean(byId('sf-phone').value),
            email: clean(byId('sf-email').value),
            documentReference: clean(byId('sf-document-reference').value),
            notes: clean(byId('sf-notes').value),
            linkedInvoiceRef: linkedInvoiceRef || previous.linkedInvoiceRef || '',
            updatedAt: new Date().toISOString()
        };
        db.ref('staff/' + id).update((() => { const copy={...record}; delete copy.id; return copy; })(), error => {
            if (error) { showCustomModal('Save failed','Staff details could not be saved. Check Firebase permissions and connection.'); return; }
            const index = (state.staff || []).findIndex(item => item.id === id);
            if (index >= 0) state.staff[index] = record; else state.staff.push(record);
            const finish = () => { closeStaffModal(); renderStaffTable(); if (typeof showCustomModal === 'function') showCustomModal('Staff Saved','Staff profile saved successfully.'); };
            if (linkedInvoiceRef) {
                db.ref('documents/' + linkedInvoiceRef).update({staffId:id, staffCode, staffName:fullName, companyId, companyName}, invoiceError => {
                    if (invoiceError) console.warn('Staff saved but invoice link could not be updated:', invoiceError);
                    const invoice = (state.documents || []).find(d => d.refCode === linkedInvoiceRef);
                    if (invoice && !invoiceError) Object.assign(invoice,{staffId:id,staffCode,staffName:fullName,companyId,companyName});
                    finish();
                });
            } else finish();
        });
    };

    window.populateCompanyClients = function () {
        const select = byId('st-company-client-selector');
        if (!select) return;
        const companyName = clean(byId('st-company-name')?.value);
        const clients = companyClientsFor(companyName);
        const options = '<option value="">-- Select existing company client --</option>' + clients.map(client => '<option value="'+html(client.id)+'">'+html(client.name)+'</option>').join('');
        select.innerHTML = options;
        select.value = (state.selectedCompanyClientId && clients.some(client => client.id === state.selectedCompanyClientId)) ? state.selectedCompanyClientId : '';
    };
    window.selectCompanyClient = function (clientId) {
        const client = (state.companyClients || []).find(item => item.id === clientId);
        state.selectedCompanyClientId = client ? client.id : '';
        if (client) {
            byId('st-client-name').value = client.name || '';
            if (byId('st-contact-person') && !byId('st-contact-person').value) byId('st-contact-person').value = client.phone || '';
        }
    };
    window.openCompanyClientModal = function () {
        const companyName = clean(byId('st-company-name')?.value);
        if (!companyName) { showCustomModal('Select company first','Choose an existing company or enter the company name before adding its client.'); return; }
        byId('company-client-parent').textContent = 'Company: ' + companyName;
        byId('cc-input-name').value = clean(byId('st-client-name')?.value);
        byId('cc-input-phone').value = '';
        byId('cc-input-email').value = '';
        byId('company-client-modal').style.display = 'flex';
        byId('cc-input-name').focus();
    };
    window.closeCompanyClientModal = function () { byId('company-client-modal').style.display = 'none'; };
    window.saveCompanyClient = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. Client was not saved.'); return; }
        const companyName = clean(byId('st-company-name')?.value);
        const companyId = companyIdByName(companyName);
        const name = clean(byId('cc-input-name').value);
        if (!companyName || !name) { showCustomModal('Required fields','Company and Client Name are required.'); return; }
        const duplicate = (state.companyClients || []).find(item => norm(item.companyName) === norm(companyName) && norm(item.name) === norm(name));
        if (duplicate) {
            state.selectedCompanyClientId = duplicate.id;
            byId('st-client-name').value = duplicate.name;
            populateCompanyClients(); closeCompanyClientModal();
            showCustomModal('Client already exists','The existing client was selected for this company.');
            return;
        }
        const id = db.ref('companyClients').push().key;
        const record = {companyId, companyName, name, phone:clean(byId('cc-input-phone').value), email:clean(byId('cc-input-email').value), createdAt:new Date().toISOString()};
        db.ref('companyClients/' + id).set(record, error => {
            if (error) { showCustomModal('Save failed','Client could not be saved. Check Firebase permissions and connection.'); return; }
            record.id = id;
            state.companyClients = state.companyClients || []; state.companyClients.push(record);
            state.selectedCompanyClientId = id;
            byId('st-client-name').value = name;
            populateCompanyClients(); closeCompanyClientModal();
            showCustomModal('Client Saved','New client saved and linked to ' + companyName + '.');
        });
    };
    window.refreshStaffCompanyClients = function () { /* Reserved for dependent fields; all clients remain company-linked. */ };

    if (typeof db !== 'undefined' && db) {
        db.ref('staff').on('value', snapshot => {
            const value = snapshot.val();
            state.staff = value ? Object.keys(value).map(id => ({id, ...value[id]})) : [];
            renderStaffTable();
        }, error => console.error('Staff records could not be loaded:', error));
        db.ref('companyClients').on('value', snapshot => {
            const value = snapshot.val();
            state.companyClients = value ? Object.keys(value).map(id => ({id, ...value[id]})) : [];
            if (typeof populateCompanyClients === 'function') populateCompanyClients();
        }, error => console.error('Company-linked clients could not be loaded:', error));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const companyInput = byId('st-company-name');
        if (companyInput) companyInput.addEventListener('input', () => { state.selectedCompanyClientId = ''; populateCompanyClients(); });
        const clientInput = byId('st-client-name');
        if (clientInput) clientInput.addEventListener('input', () => {
            const selected = (state.companyClients || []).find(client => client.id === state.selectedCompanyClientId);
            if (selected && clean(clientInput.value) !== clean(selected.name)) state.selectedCompanyClientId = '';
        });
    });
})();
