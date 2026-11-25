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
    state.activeStaffProfileId = state.activeStaffProfileId || '';

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
        const companyKey = norm(name);
        if (!companyKey) return [];
        const saved = (state.companyClients || [])
            .filter(client => norm(client.companyName) === companyKey)
            .map(client => ({...client, source: 'saved'}));
        const seen = new Set(saved.map(client => norm(client.name)));
        const fromDocuments = (state.documents || [])
            .filter(doc => norm(doc.companyName) === companyKey && clean(doc.clientName))
            .map(doc => ({
                id: 'document-client:' + norm(doc.clientName),
                name: clean(doc.clientName),
                companyName: clean(doc.companyName),
                phone: clean(doc.contactPerson),
                email: clean(doc.email),
                source: 'document'
            }))
            .filter(client => {
                const key = norm(client.name);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        return [...saved, ...fromDocuments].sort((a, b) => clean(a.name).localeCompare(clean(b.name)));
    }
    function nextStaffCode(companyId, reserved) {
        const company = companyById(companyId);
        const companyName = company?.companyName || '';
        const used = new Set([...(state.staff || []).filter(item => item.companyId === companyId || (companyName && norm(item.companyName) === norm(companyName))).map(item => clean(item.staffCode || item.staffId)), ...(reserved || [])].map(norm));
        let sequence = 1;
        let candidate = '';
        do {
            candidate = 'STAFF-' + String(sequence).padStart(4, '0');
            sequence++;
        } while (used.has(norm(candidate)));
        return candidate;
    }
    function dueStatus(record) {
        const stored = clean(record.renewalStatus);
        const dates = [record.labourCardExpiry, record.visaExpiry, record.passportExpiry].filter(Boolean).map(value => {
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
        state.activeStaffProfileId = '';
        const filter = byId('staff-company-filter');
        if (filter) filter.value = state.activeStaffCompanyId;
        const importCompany = byId('staff-import-company');
        if (importCompany) importCompany.value = state.activeStaffCompanyId;
        renderStaffTable();
    };
    window.openStaffModalForSelectedCompany = function () {
        if (!state.activeStaffCompanyId) { showCustomModal('Select company first','Choose an existing company before adding staff.'); return; }
        const company = companyById(state.activeStaffCompanyId);
        openStaffModal('', {companyId:state.activeStaffCompanyId,companyName:company?.companyName || ''});
    };

    window.renderStaffTable = function () {
        populateStaffImportCompanies();
        const body = byId('staff-table-body');
        if (!body) return;
        const companyFilter = byId('staff-company-filter');
        if (companyFilter) {
            const selected = state.activeStaffCompanyId || companyFilter.value || '';
            const options = '<option value="">Select existing company</option>' + (state.clients || []).slice().sort((a,b)=>clean(a.companyName).localeCompare(clean(b.companyName))).map(c => '<option value="'+html(c.id)+'">'+html(c.companyName)+'</option>').join('');
            if (companyFilter.innerHTML !== options) companyFilter.innerHTML = options;
            companyFilter.value = selected;
        }
        const addButton = byId('staff-add-button');
        if (addButton) addButton.disabled = !state.activeStaffCompanyId;
        const importCompany = byId('staff-import-company');
        if (importCompany && state.activeStaffCompanyId) {
            importCompany.value = state.activeStaffCompanyId;
            if (typeof updateStaffImportAvailability === 'function') updateStaffImportAvailability();
        }
        const listView = byId('staff-list-view');
        const profileView = byId('staff-profile-view');
        if (state.activeStaffProfileId) {
            if (listView) listView.hidden = true;
            if (profileView) profileView.hidden = false;
            renderStaffProfile(state.activeStaffProfileId);
            return;
        }
        if (listView) listView.hidden = false;
        if (profileView) { profileView.hidden = true; profileView.innerHTML = ''; }
        const companyContext = byId('staff-company-context');
        if (companyContext) companyContext.textContent = state.activeStaffCompanyId ? ('Company: ' + companyNameById(state.activeStaffCompanyId)) : 'All companies';
        const search = norm(byId('staff-search')?.value);
        const renewal = clean(byId('staff-renewal-filter')?.value);
        const fromDate = clean(byId('staff-date-from')?.value);
        const toDate = clean(byId('staff-date-to')?.value);
        if (!state.activeStaffCompanyId) { body.innerHTML = '<tr><td colspan="9" class="staff-empty">Select an existing company above to view its staff records.</td></tr>'; return; }
        const records = (state.staff || []).filter(staff => {
            if (state.activeStaffCompanyId && staff.companyId !== state.activeStaffCompanyId && norm(staff.companyName) !== norm(companyNameById(state.activeStaffCompanyId))) return false;
            if (renewal && dueStatus(staff) !== renewal && clean(staff.renewalStatus) !== renewal) return false;
            const joined = window.darDates ? window.darDates.normalize(staff.joiningDate) : clean(staff.joiningDate).slice(0,10);
            if (fromDate && (!joined || joined < fromDate)) return false;
            if (toDate && (!joined || joined > toDate)) return false;
            const searchable = [staff.staffCode,staff.personNumber,staff.fullName,staff.companyName,staff.lastWorkDone,staff.passportNumber,staff.labourCardNumber].map(norm).join(' ');
            return !search || searchable.includes(search);
        }).sort((a,b)=>clean(b.joiningDate).localeCompare(clean(a.joiningDate)));
        if (!records.length) {
            body.innerHTML = '<tr><td colspan="9" class="staff-empty">No staff records found. Use “Add Staff” to create the first profile.</td></tr>';
            return;
        }
        body.innerHTML = records.map(staff => '<tr>'+
            '<td><strong>'+html(staff.staffCode || staff.staffId || '-')+'</strong></td>'+
            '<td>'+html(staff.fullName || '-')+(staff.personNumber ? '<small class="staff-person-number">Person Labour No: '+html(staff.personNumber)+'</small>' : '')+'</td>'+
            '<td>'+html(staff.companyName || companyNameById(staff.companyId) || '-')+'</td>'+
            '<td>'+html(staff.nationality || '-')+'</td>'+
            '<td>'+html(staff.labourCardNumber || '-')+'</td>'+
            '<td>'+html(staff.labourCardExpiry || '-')+'</td>'+
            '<td>'+html(staff.passportNumber || '-')+'</td>'+
            '<td>'+statusPill(dueStatus(staff))+'</td>'+
            '<td class="staff-actions"><button type="button" class="btn btn-primary" onclick="openStaffProfile(\\''+html(staff.id)+'\\')">View Profile</button></td>'+
            '</tr>').join('');
        if (window.applyDarLanguage) window.applyDarLanguage();
    };

    function documentsForStaff(staff) {
        const refs = new Set([...(Array.isArray(staff.linkedDocumentRefs) ? staff.linkedDocumentRefs : []), staff.linkedInvoiceRef].filter(Boolean));
        return (state.documents || []).filter(doc => doc.staffId === staff.id || (doc.staffCode && norm(doc.staffCode) === norm(staff.staffCode || staff.staffId)) || refs.has(doc.refCode)).sort((a,b)=>clean(b.transactionDate || b.createdDate).localeCompare(clean(a.transactionDate || a.createdDate)));
    }
    window.openStaffProfile = function (staffId) {
        const staff = (state.staff || []).find(item => item.id === staffId);
        if (!staff) { showCustomModal('Staff not found','This staff record could not be found. Refresh the staff list and try again.'); return; }
        state.activeStaffProfileId = staffId; renderStaffTable();
    };
    window.closeStaffProfile = function () { state.activeStaffProfileId = ''; renderStaffTable(); };
    window.renderStaffProfile = function (staffId) {
        const root = byId('staff-profile-view');
        const staff = (state.staff || []).find(item => item.id === staffId);
        if (!root || !staff) return;
        const docs = documentsForStaff(staff);
        const invoices = docs.filter(doc => norm(doc.type) === 'invoice');
        const quotations = docs.filter(doc => norm(doc.type) === 'quotation');
        const info = (label,value) => '<div class="staff-profile-field"><span>'+html(label)+'</span><strong>'+html(value || '-')+'</strong></div>';
        const rows = list => list.length ? list.map(doc => {
            const kind = norm(doc.type) === 'quotation' ? 'Quotation' : 'Invoice';
            const amount = Number(doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount) || 0;
            const date = doc.transactionDate || doc.createdDate || doc.createdAt || '';
            const ref = html(doc.refCode || '');
            return '<tr><td>'+ref+'</td><td>'+html(date)+'</td><td>'+html(doc.packageName || doc.serviceName || doc.title || '-')+'</td><td>AED '+amount.toFixed(2)+'</td><td>'+kind+'</td><td><button type="button" class="btn btn-secondary" onclick="previewInvoiceDocument(\\''+ref+'\\')">View / Print</button> <button type="button" class="btn btn-secondary" onclick="openStudio(\\''+kind+'\\',\\''+ref+'\\')">Edit</button></td></tr>';
        }).join('') : '<tr><td colspan="6" class="staff-empty">No linked documents yet.</td></tr>';
        root.innerHTML = '<div class="staff-profile-heading"><div><button type="button" class="btn btn-secondary" onclick="closeStaffProfile()">← Back to Staff List</button><h2>'+html(staff.fullName || 'Staff Profile')+'</h2><p class="dar-hint">'+html(staff.staffCode || staff.staffId || '')+' · '+html(staff.companyName || companyNameById(staff.companyId))+'</p></div><button type="button" class="btn btn-primary" onclick="openStaffModal(\\''+html(staff.id)+'\\')">Edit Staff Profile</button></div>' +
        '<div class="staff-profile-card"><h3>Personal & Employment Details</h3><div class="staff-profile-grid">'+info('Staff ID',staff.staffCode || staff.staffId)+info('Person Labour No.',staff.personNumber)+info('Full Name',staff.fullName)+info('Company',staff.companyName || companyNameById(staff.companyId))+info('Nationality',staff.nationality)+info('Designation',staff.designation)+info('Joining Date',staff.joiningDate)+info('Last Work Done',staff.lastWorkDone)+'</div></div>' +
        '<div class="staff-profile-card"><h3>Identity & Labour Details</h3><div class="staff-profile-grid">'+info('Passport Number',staff.passportNumber)+info('Passport Expiry',staff.passportExpiry)+info('Labour Card Number',staff.labourCardNumber)+info('Labour Card Expiry',staff.labourCardExpiry)+info('Visa Number',staff.visaNumber)+info('Visa Expiry',staff.visaExpiry)+info('Visa Status',staff.visaStatus)+info('Renewal Status',dueStatus(staff))+'</div></div>' +
        '<div class="staff-profile-card"><h3>Invoices <span class="staff-doc-count">'+invoices.length+'</span></h3><div class="table-responsive"><table class="data-table staff-table"><thead><tr><th>Invoice No.</th><th>Date</th><th>Service</th><th>Amount</th><th>Type</th><th>Actions</th></tr></thead><tbody>'+rows(invoices)+'</tbody></table></div></div>' +
        '<div class="staff-profile-card"><h3>Quotations <span class="staff-doc-count">'+quotations.length+'</span></h3><div class="table-responsive"><table class="data-table staff-table"><thead><tr><th>Quotation No.</th><th>Date</th><th>Service</th><th>Amount</th><th>Type</th><th>Actions</th></tr></thead><tbody>'+rows(quotations)+'</tbody></table></div></div>';
    };
    window.openStaffModalFromInvoice = function (refCode) {
        const doc = (state.documents || []).find(item => item.refCode === refCode);
        if (!doc) { showCustomModal('Invoice not found','The saved invoice could not be found in the current session.'); return; }
        window.openStaffModal('', {
            companyId: companyIdByName(doc.companyName),
            companyName: doc.companyName,
            fullName: doc.clientName,
            visaExpiry: doc.visaExpiryDate,
            linkedInvoiceRef: doc.refCode,
            lastWorkDone: doc.packageName || doc.serviceName || ''
        });
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
        companySelect.onchange = () => {
            if (!recordId) byId('sf-staff-code').value = nextStaffCode(companySelect.value);
        };
        byId('sf-staff-code').value = record.staffCode || record.staffId || defaults.staffCode || nextStaffCode(companyId);
        byId('sf-staff-code').readOnly = true;
        byId('sf-full-name').value = record.fullName || defaults.fullName || '';
        byId('sf-person-number').value = record.personNumber || '';
        byId('sf-nationality').value = record.nationality || '';
        byId('sf-designation').value = record.designation || '';
        byId('sf-last-work').value = record.lastWorkDone || defaults.lastWorkDone || '';
        byId('sf-passport').value = record.passportNumber || '';
        byId('sf-passport-expiry').value = record.passportExpiry || '';
        byId('sf-labour-card-number').value = record.labourCardNumber || '';
        byId('sf-labour-card-expiry').value = record.labourCardExpiry || '';
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
        const staffCode = clean(byId('sf-staff-code').value) || nextStaffCode(companyId);
        const duplicateCode = (state.staff || []).some(item => item.id !== id && (item.companyId === companyId || norm(item.companyName) === norm(companyName)) && norm(item.staffCode || item.staffId) === norm(staffCode));
        if (duplicateCode) { showCustomModal('Duplicate Staff ID','This Staff ID is already used by another employee in the selected company. Please use a unique company Staff ID.'); return; }
        const fullName = clean(byId('sf-full-name').value);
        if (!staffCode || !fullName || !companyId || !companyName) {
            showCustomModal('Required fields','Staff ID, Full Name and Company are required.'); return;
        }
        const linkedInvoiceRef = clean(byId('sf-linked-invoice').value);
        const previous = (state.staff || []).find(item => item.id === id) || {};
        const record = {
            ...previous, id, staffCode, staffId: staffCode, fullName, companyId, companyName,
            personNumber: clean(byId('sf-person-number').value),
            createdDate: previous.id ? (previous.createdDate || previous.createdAt || '') : (window.darDates ? window.darDates.todayISO() : new Date().toISOString().slice(0,10)),
            nationality: clean(byId('sf-nationality').value),
            designation: clean(byId('sf-designation').value),
            lastWorkDone: clean(byId('sf-last-work').value),
            labourCardNumber: clean(byId('sf-labour-card-number').value),
            labourCardExpiry: clean(byId('sf-labour-card-expiry').value),
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
            updatedAt: new Date().toISOString(),
            updatedBy: firebase.auth().currentUser?.email || firebase.auth().currentUser?.uid || 'Unknown'
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
        // Only a persisted company-client ID represents an actual link. A matching
        // display name (for example, from an old invoice) must not imply a saved link.
        const selected = clients.find(client => client.source === 'saved' && client.id === state.selectedCompanyClientId);
        select.value = selected ? selected.id : '';
    };
    window.selectCompanyClient = function (clientId) {
        const client = companyClientsFor(clean(byId('st-company-name')?.value)).find(item => item.id === clientId);
        state.selectedCompanyClientId = client && client.source === 'saved' ? client.id : '';
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

    // Bulk import: both Excel and PDF require one existing company selection.
    let staffImportRows = [];
    let staffImportCompanyId = '';
    const staffImportFields = {
        staffCode: ['staff id','staff code','employee id','employee code','id','code'],
        personNumber: ['person labour number','person labour no','person labour #','person number','person no','person #'],
        fullName: ['full name','staff name','employee name','person name','name'],
        nationality: ['nationality','country'],
        designation: ['designation','position','job title','occupation','job name'],
        cardType: ['card type','labour card type','labor card type','work permit type'],
        contractType: ['contract type'],
        labourCardNumber: ['labour card number','labor card number','card number','labour card no','labor card no'],
        labourCardExpiry: ['labour card expiry','labour card expiry date','card expiry','card expiry date'],
        lastWorkDone: ['last work done','work done','service','last service'],
        passportNumber: ['passport number','passport no','passport #','passport'],
        passportExpiry: ['passport expiry','passport expiry date','passport valid until'],
        visaNumber: ['visa number','visa no','visa #','visa'],
        visaExpiry: ['visa expiry','visa expiry date','visa valid until'],
        visaStatus: ['visa status'],
        renewalStatus: ['renewal status','status'],
        joiningDate: ['joining date','join date','date joined'],
        phone: ['contact number','phone number','mobile','phone'],
        email: ['email','email address'],
        documentReference: ['document reference','document url','secure url'],
        notes: ['notes','remarks']
    };
    const staffImportHeader = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    function mapStaffImportObject(source) {
        const normalized = {};
        Object.keys(source || {}).forEach(key => { normalized[staffImportHeader(key)] = source[key]; });
        const result = {};
        Object.entries(staffImportFields).forEach(([field, aliases]) => {
            const key = Object.keys(normalized).find(candidate => aliases.includes(candidate));
            if (key) result[field] = clean(normalized[key]);
        });
        return result;
    }
    function normalizeStaffImportDate(value) {
        if (value == null || value === '') return '';
        if (typeof value === 'number' && window.XLSX?.SSF) {
            const parsed = window.XLSX.SSF.parse_date_code(value);
            if (parsed) return [parsed.y,String(parsed.m).padStart(2,'0'),String(parsed.d).padStart(2,'0')].join('-');
        }
        const raw = clean(value);
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) { const p=raw.split('-'); return p[0]+'-'+p[1].padStart(2,'0')+'-'+p[2].padStart(2,'0'); }
        const match = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
        if (match) return match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0');
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0,10);
    }
    function staffImportRowsFromGrid(grid) {
        if (!grid || !grid.length) return [];
        const headers = grid[0].map(staffImportHeader);
        const aliases = Object.values(staffImportFields).flat();
        const matchedHeaders = headers.filter(header => aliases.includes(header));
        const mohreHeaders = ['person name','card type','job name','card number','contract type','passport number'];
        // MOHRE exports do not contain DAR's Staff ID / Full Name headings.
        // Accept a MOHRE-shaped table when at least one distinctive MOHRE heading exists.
        const hasMohreHeading = headers.some(header => mohreHeaders.includes(header));
        if (matchedHeaders.length < 2 && !hasMohreHeading) {
            throw new Error('Could not identify a staff table. Include recognised staff headings or MOHRE headings such as Person Name, Card Number or Passport Number.');
        }
        return grid.slice(1).filter(row => row.some(cell => clean(cell) !== '')).map(row => {
            const source = {}; headers.forEach((header,index) => { source[header] = row[index] == null ? '' : row[index]; });
            return mapStaffImportObject(source);
        });
    }
    async function parseStaffImportPdf(file) {
        if (!window.pdfjsLib) throw new Error('PDF reader could not load. Refresh the page and try again.');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        const pages = [];
        const allLines = [];
        for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();
            const items = (content.items || []).map(item => ({
                text:clean(item.str),
                x:Number(item.transform?.[4] || 0),
                y:Number(item.transform?.[5] || 0)
            })).filter(item=>item.text);
            pages.push(items);
            // Keep a readable stream for non-MOHRE staff PDFs.
            const visualLines=[];
            items.forEach(item=>{
                let line=visualLines.find(entry=>Math.abs(entry.y-item.y)<=3);
                if(!line){line={y:item.y,items:[]};visualLines.push(line);}
                line.items.push(item);
            });
            visualLines.sort((a,b)=>b.y-a.y).forEach(line=>{
                const value=line.items.sort((a,b)=>a.x-b.x).map(item=>item.text).join(' ').replace(/\s+/g,' ').trim();
                if(value)allLines.push(value);
            });
        }
        const combined=allLines.join(' ').toLowerCase();
        const looksMohre=/list\s+of\s+employees|establishment\s*(?:number|no\.? )|passport\s*(?:number|no\.? )|person\s*name|card\s*type|job\s*name|card\s*number|mohre/i.test(combined);
        if(looksMohre){
            // MOHRE PDF is a positioned table, not a sequence of pipe-delimited
            // records. Use the printed column geometry and passport-column anchors.
            // PDF.js coordinates use the same left-to-right x positions on every page.
            const passportPattern=/^[A-Z0-9]{6,12}$/i;
            const personPattern=/^\d{12,16}$/;
            const cardPattern=/^\d{8,10}$/;
            const datePattern=/^\d{1,2}\/\d{1,2}\/\d{4}$/;
            const latinText=(items)=>items.map(item=>item.text)
                .filter(value=>/[A-Za-z]/.test(value))
                .map(value=>value.replace(/[^A-Za-z0-9 .&'()\/-]/g,' ').replace(/\s+/g,' ').trim())
                .filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
            const records=[];
            const leadingPersonNumbers=[];
            pages.forEach((items,pageIndex)=>{
                const anchors=items.filter(item=>item.x<90 && passportPattern.test(item.text) &&
                    !/^RP/i.test(item.text))
                    .sort((a,b)=>b.y-a.y);
                if(!anchors.length)return;
                // A person number may be the first text on page 2 because the
                // employee's name/card row began at the bottom of page 1.
                if(pageIndex>0){
                    const firstY=anchors[0].y;
                    items.filter(item=>item.x>=85 && item.x<235 && item.y>firstY &&
                        personPattern.test(item.text)).forEach(item=>leadingPersonNumbers.push({recordIndex:records.length-1,number:item.text}));
                }
                anchors.forEach((anchor,index)=>{
                    const nextY=anchors[index+1]?.y ?? -Infinity;
                    const rowBottom=Math.max(nextY+2,anchor.y-35);
                    const inRow=items.filter(item=>item.y<=anchor.y+2 && item.y>rowBottom);
                    const inColumn=(min,max)=>inRow.filter(item=>item.x>=min && item.x<max);
                    const passport=anchor.text;
                    const nameItems=inColumn(85,235);
                    const personNumber=nameItems.find(item=>personPattern.test(item.text))?.text || '';
                    const fullName=latinText(nameItems.filter(item=>!personPattern.test(item.text)));
                    const cardItems=inColumn(470,535);
                    const cardNumber=cardItems.find(item=>cardPattern.test(item.text))?.text || '';
                    const expiry=cardItems.find(item=>datePattern.test(item.text))?.text || '';
                    const cardType=latinText(inColumn(230,350));
                    const designation=latinText(inColumn(350,425));
                    const nationality=latinText(inColumn(425,480)).toUpperCase();
                    const contractType=latinText(inColumn(535,595));
                    if(!fullName || !cardNumber || !expiry || !cardType) return;
                    records.push({
                        staffCode:'',personNumber,fullName,nationality,designation,
                        passportNumber:passport,labourCardNumber:cardNumber,
                        labourCardExpiry:normalizeStaffImportDate(expiry),
                        cardType,contractType,
                        visaNumber:'',visaExpiry:'',visaStatus:'',renewalStatus:'Pending'
                    });
                });
            });
            // Attach a page-leading orphan Person Labour No. to the last employee
            // from the preceding page, never to the first employee on this page.
            leadingPersonNumbers.forEach(carryover=>{
                const previous=records[carryover.recordIndex];
                if(previous && !previous.personNumber)previous.personNumber=carryover.number;
            });
            if(records.length){
                const declaredTotal=(combined.match(/total\s+number\s+of\s+employees\s*[:：]?\s*(\d+)/i)||[])[1];
                if(declaredTotal && Number(declaredTotal)!==records.length){
                    throw new Error('MOHRE employee rows were partially identified ('+records.length+' of '+declaredTotal+'). No records have been imported.');
                }
                return records;
            }
            // Retain support for text exports that explicitly contain pipe-separated columns.
            const pipeRows=[];
            let activePipe=[];
            allLines.forEach(line=>{
                if(/^\s*[A-Z0-9]{6,12}\s*\|/i.test(line)){
                    if(activePipe.length)pipeRows.push(activePipe.join(' '));
                    activePipe=[line];
                }else if(activePipe.length && line.includes('|'))activePipe.push(line);
            });
            if(activePipe.length)pipeRows.push(activePipe.join(' '));
            const pipeRecords=pipeRows.map(line=>{
                const fields=line.split('|').map(value=>clean(value)).filter(Boolean);
                const passport=fields[0]||'';
                const cardIndex=fields.findIndex(value=>/^\d{8,10}$/.test(value));
                const expiryIndex=fields.findIndex(value=>datePattern.test(value));
                const cardType=fields.find(value=>/WORK PERMIT/i.test(value))||'';
                if(!passportPattern.test(passport)||cardIndex<0||expiryIndex<0||!cardType)return null;
                const contractType=fields.find(value=>/^(LIMITED|UNLIMITED)$/i.test(value))||'';
                const nationalityIndex=fields.findIndex(value=>/^[A-Z ]{3,20}$/.test(value) && !/^(LIMITED|UNLIMITED)$/.test(value));
                const name=latinText([{text:fields.slice(1,fields.findIndex(value=>/WORK PERMIT/i.test(value))).join(' ')}]);
                const designation=fields.slice(fields.findIndex(value=>/WORK PERMIT/i.test(value))+1,nationalityIndex>=0?nationalityIndex:cardIndex).join(' ');
                return name?{staffCode:'',personNumber:fields.find(value=>personPattern.test(value))||'',fullName:name,nationality:nationalityIndex>=0?fields[nationalityIndex]:'',designation,passportNumber:passport,labourCardNumber:fields[cardIndex],labourCardExpiry:normalizeStaffImportDate(fields[expiryIndex]),cardType,contractType,visaNumber:'',visaExpiry:'',visaStatus:'',renewalStatus:'Pending'}:null;
            }).filter(Boolean);
            if(pipeRecords.length)return pipeRecords;
        }
        if(/staff id|employee id|full name|staff name|employee name/i.test(combined)){
            const headerIndex=allLines.findIndex(line=>/staff id|employee id|full name|staff name|employee name/i.test(line));
            if(headerIndex>=0){
                const rows=[allLines[headerIndex].split(/\s{2,}/)];
                allLines.slice(headerIndex+1).forEach(line=>rows.push(line.split(/\s{2,}/)));
                const parsed=staffImportRowsFromGrid(rows);
                if(parsed.length)return parsed;
            }
        }
        if(!allLines.length || !combined.trim()){
            throw new Error('This PDF contains no selectable text. It may be scanned or image-only; please use an OCR-enabled PDF or upload the original file for review.');
        }
        if(looksMohre)throw new Error('MOHRE headings were found, but the employee table could not be reliably read from its PDF column positions. No records were imported.');
        throw new Error('PDF text was found, but this file does not match a supported staff-import layout. Please use the MOHRE employee-list PDF or an Excel staff list.');
    }
    const staffImportMergeFields = [
        'personNumber','fullName','fullNameArabic','nationality','designation',
        'cardType','contractType','designationArabic','labourCardNumber','labourCardExpiry',
        'lastWorkDone','passportNumber','passportExpiry','visaNumber','visaExpiry','visaStatus',
        'renewalStatus','joiningDate','phone','email','documentReference','notes'
    ];
    const staffImportIdentityFields = ['staffCode','personNumber','labourCardNumber','passportNumber'];
    const staffImportStrongIdentityFields = ['personNumber','labourCardNumber','passportNumber'];
    function resolveStaffImportRow(row, companyStaff, claimedIds) {
        if (!row.fullName) return {status:'invalid',reason:'Missing full name'};
        const matches = new Set();
        staffImportStrongIdentityFields.forEach(field=>{
            const value=norm(row[field]);
            if (!value) return;
            companyStaff.forEach(existing=>{ const v=norm(existing[field]); if(v&&v===value)matches.add(existing.id); });
        });
        if(matches.size>1)return {status:'conflict',reason:'Person identifiers point to different staff records'};
        let existing=matches.size===1?companyStaff.find(item=>item.id===[...matches][0]):null;
        if(!existing&&matches.size===0){
            const sameName=companyStaff.filter(item=>norm(item.fullName)===norm(row.fullName));
            if(sameName.length===1)existing=sameName[0];
            else if(sameName.length>1)return {status:'conflict',reason:'More than one existing employee has this exact name'};
        }
        if(!existing&&matches.size===0&&norm(row.staffCode)){
            const codeMatches=companyStaff.filter(item=>norm(item.staffCode||item.staffId)===norm(row.staffCode));
            if(codeMatches.length>1)return {status:'conflict',reason:'Staff ID matches multiple records'};
            if(codeMatches.length===1){
                const candidate=codeMatches[0];
                const mismatch=staffImportStrongIdentityFields.some(field=>norm(row[field])&&norm(candidate[field])&&norm(row[field])!==norm(candidate[field]));
                if(mismatch)return {status:'conflict',reason:'Staff ID matches, but person identifiers belong to a different employee'};
                existing=candidate;
            }
        }
        if(existing){
            if(claimedIds.has(existing.id))return {status:'duplicate',reason:'Duplicate row in this import'};
            const changes={};
            staffImportMergeFields.forEach(field=>{const incoming=clean(row[field]);if(!incoming)return;const current=clean(existing[field]);if(norm(current)!==norm(incoming))changes[field]=incoming;});
            return {status:Object.keys(changes).length?'update':'same',existing,changes};
        }
        const incomingCode=norm(row.staffCode);
        if(incomingCode&&companyStaff.some(item=>norm(item.staffCode||item.staffId)===incomingCode))
            return {status:'conflict',reason:'Staff ID conflicts with an existing record whose person details do not match'};
        return {status:'new'};
    }
    function buildStaffImportPlan(rows, companyStaff) {
        const claimedIds=new Set(),seenIdentifiers=new Set();
        return rows.map(row=>{
            const identifiers=staffImportIdentityFields.map(field=>({field,value:norm(row[field])})).filter(item=>item.value);
            if(identifiers.some(item=>seenIdentifiers.has(item.field+'|'+item.value)))return {row,status:'duplicate',reason:'Duplicate identifier in this import'};
            identifiers.forEach(item=>seenIdentifiers.add(item.field+'|'+item.value));
            const result=resolveStaffImportRow(row,companyStaff,claimedIds);
            if(result.existing)claimedIds.add(result.existing.id);
            return {row,...result};
        });
    }
    function renderStaffImportPreview() {
        const panel = byId('staff-import-preview');
        const button = byId('staff-import-button');
        if (!panel) return;
        const companyStaff = (state.staff||[]).filter(row=>row.companyId===staffImportCompanyId || norm(row.companyName)===norm(companyNameById(staffImportCompanyId)));
        const plan=buildStaffImportPlan(staffImportRows,companyStaff);
        const counts=plan.reduce((acc,item)=>{acc[item.status]=(acc[item.status]||0)+1;return acc;},{});
        const labels={new:'New',update:'Update existing',same:'Already up to date',duplicate:'Duplicate in file',conflict:'Identifier conflict',invalid:'Missing full name'};
        const preview = plan.slice(0,30).map((item,index)=>{
            const row=item.row;
            return '<tr><td>'+ (index+1) +'</td><td>'+html(row.staffCode||item.existing?.staffCode||'Auto')+'</td><td>'+html(row.fullName||'—')+(row.personNumber?'<small class="staff-person-number">Person Labour No: '+html(row.personNumber)+'</small>':'')+'</td><td>'+html(row.nationality||'—')+'</td><td>'+html(row.passportNumber||'—')+'</td><td>'+html(row.labourCardNumber||'—')+'</td><td>'+html(row.labourCardExpiry||'—')+'</td><td>'+html(labels[item.status]||item.status)+(item.reason?' — '+html(item.reason):'')+'</td></tr>';
        }).join('');
        panel.hidden = false;
        panel.innerHTML = '<div class="staff-import-summary"><strong>'+staffImportRows.length+' rows detected</strong><span>'+ (counts.new||0)+' new · '+(counts.update||0)+' updates · '+(counts.same||0)+' unchanged · '+((counts.duplicate||0)+(counts.conflict||0)+(counts.invalid||0))+' skipped</span></div><div class="table-responsive"><table class="data-table"><thead><tr><th>#</th><th>Staff ID</th><th>Name / Person Labour No.</th><th>Nationality</th><th>Passport</th><th>Labour Card No.</th><th>Labour Card Expiry</th><th>Import action</th></tr></thead><tbody>'+preview+'</tbody></table></div>'+(staffImportRows.length>30?'<p class="dar-hint">Showing first 30 rows in preview.</p>':'');
        button.disabled = !plan.some(item=>item.status==='new'||item.status==='update') || !staffImportCompanyId;
    }
    window.updateStaffImportAvailability = function () {
        const companyId = clean(byId('staff-import-company')?.value);
        staffImportCompanyId = companyId;
        const selected = !!companyById(companyId);
        byId('staff-import-file').disabled = !selected;
        byId('staff-import-button').disabled = true;
        byId('staff-import-help').textContent = selected ? 'Selected company: '+companyNameById(companyId)+'. Choose an Excel or PDF staff list.' : 'Choose an existing company to enable file import.';
        staffImportRows = [];
        byId('staff-import-preview').hidden = true;
        byId('staff-import-preview').innerHTML = '';
        if (!selected) byId('staff-import-file').value = '';
    };
    window.previewStaffImportFile = async function (file) {
        const companyId = clean(byId('staff-import-company')?.value);
        if (!companyById(companyId)) { showCustomModal('Select company first','Choose an existing company before selecting an import file.'); return; }
        if (!file) return;
        const help = byId('staff-import-help');
        byId('staff-import-button').disabled = true;
        help.textContent = 'Reading '+file.name+'…';
        try {
            let rows;
            if (/\.pdf$/i.test(file.name)) rows = await parseStaffImportPdf(file);
            else if (/\.(xlsx|xls)$/i.test(file.name)) {
                if (!window.XLSX) throw new Error('Excel reader could not load. Refresh the page and try again.');
                const workbook = window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = staffImportRowsFromGrid(window.XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true}));
            } else throw new Error('Choose an .xlsx, .xls or .pdf file.');
            staffImportRows = rows.map(row=>({
                ...row,
                passportExpiry:normalizeStaffImportDate(row.passportExpiry),
                labourCardExpiry:normalizeStaffImportDate(row.labourCardExpiry),
                visaExpiry:normalizeStaffImportDate(row.visaExpiry),
                joiningDate:normalizeStaffImportDate(row.joiningDate)
            }));
            staffImportCompanyId = companyId;
            renderStaffImportPreview();
            help.textContent = 'Review the preview. Matching employees will be updated in place; unchanged rows will be skipped. Invoices and quotations will remain linked.';
        } catch (error) {
            staffImportRows=[]; byId('staff-import-preview').hidden=true;
            help.textContent = error.message || 'Could not read this file.';
            showCustomModal('Import could not be prepared',help.textContent);
        }
    };
    window.commitStaffImport = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. No staff were imported.'); return; }
        const company=companyById(staffImportCompanyId);
        if(!company||!staffImportRows.length){showCustomModal('Select company first','Choose an existing company and preview a file before importing.');return;}
        const companyStaff=(state.staff||[]).filter(row=>row.companyId===company.id||norm(row.companyName)===norm(company.companyName));
        const plan=buildStaffImportPlan(staffImportRows,companyStaff);
        const updates={},created=[],changed=[],timestamp=new Date().toISOString();
        const actor=firebase.auth().currentUser?.email||firebase.auth().currentUser?.uid||'Unknown';
        plan.forEach(item=>{
            if(['same','duplicate','conflict','invalid'].includes(item.status))return;
            if(item.status==='update'){
                const patch={...item.changes,updatedAt:timestamp,updatedBy:actor};delete patch.id;
                Object.entries(patch).forEach(([field,value])=>{updates['staff/'+item.existing.id+'/'+field]=value;});
                changed.push({id:item.existing.id,record:{...item.existing,...patch}});return;
            }
            const id=db.ref('staff').push().key;
            const requestedCode=clean(item.row.staffCode);
            const codeAlreadyUsed=code=>companyStaff.some(person=>norm(person.staffCode||person.staffId)===norm(code))||created.some(person=>norm(person.staffCode||person.staffId)===norm(code));
            const staffCode=requestedCode&&!codeAlreadyUsed(requestedCode)?requestedCode:nextStaffCode(company.id,created.map(record=>record.staffCode));
            const record={...item.row,id,staffCode,staffId:staffCode,companyId:company.id,companyName:company.companyName,
                createdDate:window.darDates?window.darDates.todayISO():timestamp.slice(0,10),updatedAt:timestamp,updatedBy:actor};
            const copy={...record};delete copy.id;updates['staff/'+id]=copy;created.push(record);
        });
        // Include unchanged imported employees too, since their saved documents may still need linking.
        const importedRecords=[...changed.map(item=>item.record),...plan.filter(item=>item.status==='same'&&item.existing).map(item=>item.existing),...created];
        const companyPeople=[...companyStaff.filter(person=>!changed.some(item=>item.id===person.id)),...changed.map(item=>item.record),...created];
        const linkedByStaff=new Map();
        (state.documents||[]).forEach(doc=>{
            if(!doc||!clean(doc.refCode)||norm(doc.companyName)!==norm(company.companyName))return;
            const documentNames=[doc.clientName,doc.staffName,doc.employeeName,doc.personName].map(norm).filter(Boolean);
            const matches=importedRecords.filter(person=>documentNames.includes(norm(person.fullName)));
            if(matches.length!==1)return;
            const person=matches[0];
            if(companyPeople.filter(candidate=>norm(candidate.fullName)===norm(person.fullName)).length!==1)return;
            if(doc.staffId&&doc.staffId!==person.id)return;
            const ref=clean(doc.refCode),metadata={staffId:person.id,staffCode:person.staffCode||person.staffId,staffName:person.fullName};
            if(doc.staffId===metadata.staffId&&doc.staffCode===metadata.staffCode&&doc.staffName===metadata.staffName)return;
            Object.entries(metadata).forEach(([field,value])=>{updates['documents/'+ref+'/'+field]=value;});
            const refs=linkedByStaff.get(person.id)||[];refs.push(ref);linkedByStaff.set(person.id,refs);
        });
        linkedByStaff.forEach((refs,id)=>{
            const person=importedRecords.find(item=>item.id===id);if(!person)return;
            const merged=[...new Set([...(Array.isArray(person.linkedDocumentRefs)?person.linkedDocumentRefs:[]),...refs])];
            updates['staff/'+id+'/linkedDocumentRefs']=merged;
            const invoice=(state.documents||[]).find(doc=>refs.includes(clean(doc.refCode))&&String(doc.type||'').toLowerCase()==='invoice');
            if(invoice&&!person.linkedInvoiceRef)updates['staff/'+id+'/linkedInvoiceRef']=invoice.refCode;
        });
        const unchanged=plan.filter(item=>item.status==='same').length;
        const skipped=plan.filter(item=>['duplicate','conflict','invalid'].includes(item.status)).length;
        const linkedDocuments=Array.from(linkedByStaff.values()).reduce((sum,refs)=>sum+refs.length,0);
        if(!Object.keys(updates).length){showCustomModal('Import completed',unchanged+' unchanged staff row(s) skipped; '+skipped+' duplicate, conflicting or incomplete row(s) skipped. No database changes were needed.');return;}
        byId('staff-import-button').disabled=true;
        db.ref().update(updates,error=>{
            if(error){byId('staff-import-button').disabled=false;showCustomModal('Import failed','Firebase could not save the staff changes. Existing staff records and linked documents were not intentionally deleted.');return;}
            state.staff=state.staff||[];
            changed.forEach(({id,record})=>{const index=state.staff.findIndex(item=>item.id===id);if(index>=0)state.staff[index]=record;});
            state.staff.push(...created);
            linkedByStaff.forEach((refs,id)=>{
                const person=state.staff.find(item=>item.id===id);
                if(!person)return;
                person.linkedDocumentRefs=[...new Set([...(Array.isArray(person.linkedDocumentRefs)?person.linkedDocumentRefs:[]),...refs])];
                const invoice=(state.documents||[]).find(doc=>refs.includes(clean(doc.refCode))&&String(doc.type||'').toLowerCase()==='invoice');
                if(invoice&&!person.linkedInvoiceRef)person.linkedInvoiceRef=invoice.refCode;
                refs.forEach(ref=>{
                    const doc=(state.documents||[]).find(item=>clean(item.refCode)===ref);
                    if(doc)Object.assign(doc,{staffId:person.id,staffCode:person.staffCode||person.staffId,staffName:person.fullName});
                });
            });
            renderStaffTable();
            staffImportRows=[];byId('staff-import-preview').hidden=true;byId('staff-import-file').value='';
            byId('staff-import-help').textContent='Imported '+created.length+' new and updated '+changed.length+' existing staff record(s) for '+company.companyName+'. Linked '+linkedDocuments+' existing invoice/quotation document(s).';
            showCustomModal('Import completed',created.length+' new · '+changed.length+' updated · '+unchanged+' unchanged/skipped · '+skipped+' duplicate/conflicting/incomplete skipped · '+linkedDocuments+' existing documents linked. Financial values and existing document records were preserved.');
        });
    };
    function populateStaffImportCompanies() {
        const select=byId('staff-import-company'); if(!select) return;
        const selected=select.value;
        const options='<option value="">Select existing company</option>'+(state.clients||[]).slice().sort((a,b)=>clean(a.companyName).localeCompare(clean(b.companyName))).map(company=>'<option value="'+html(company.id)+'">'+html(company.companyName)+'</option>').join('');
        if (select.innerHTML === options) return;
        select.innerHTML=options;
        select.value=selected;
        updateStaffImportAvailability();
    }

    // Firebase listeners are registered by initFirebaseListeners only after the user is authorized.

    document.addEventListener('DOMContentLoaded', () => {
        populateStaffImportCompanies();
        const companyInput = byId('st-company-name');
        if (companyInput) companyInput.addEventListener('input', () => { state.selectedCompanyClientId = ''; populateCompanyClients(); });
        const clientInput = byId('st-client-name');
        if (clientInput) clientInput.addEventListener('input', () => {
            const selected = (state.companyClients || []).find(client => client.id === state.selectedCompanyClientId);
            if (selected && clean(clientInput.value) !== clean(selected.name)) state.selectedCompanyClientId = '';
        });
    });
})();
