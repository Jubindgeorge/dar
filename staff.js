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
        populateStaffImportCompanies();
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
        const fromDate = clean(byId('staff-date-from')?.value);
        const toDate = clean(byId('staff-date-to')?.value);
        const records = (state.staff || []).filter(staff => {
            if (state.activeStaffCompanyId && staff.companyId !== state.activeStaffCompanyId && norm(staff.companyName) !== norm(companyNameById(state.activeStaffCompanyId))) return false;
            if (renewal && dueStatus(staff) !== renewal && clean(staff.renewalStatus) !== renewal) return false;
            const joined = window.darDates ? window.darDates.normalize(staff.joiningDate) : clean(staff.joiningDate).slice(0,10);
            if (fromDate && (!joined || joined < fromDate)) return false;
            if (toDate && (!joined || joined > toDate)) return false;
            const searchable = [staff.staffCode,staff.fullName,staff.companyName,staff.lastWorkDone,staff.passportNumber,staff.visaNumber].map(norm).join(' ');
            return !search || searchable.includes(search);
        }).sort((a,b)=>clean(b.joiningDate).localeCompare(clean(a.joiningDate)));
        if (!records.length) {
            body.innerHTML = '<tr><td colspan="9" class="staff-empty">No staff records found. Use “Add Staff” to create the first profile.</td></tr>';
            return;
        }
        body.innerHTML = records.map(staff => '<tr>'+
            '<td><strong>'+html(staff.staffCode || staff.staffId || '-')+'</strong></td>'+
            '<td>'+html(staff.fullName || '-')+'</td>'+
            '<td>'+html(staff.companyName || companyNameById(staff.companyId) || '-')+'</td>'+
            '<td>'+html(staff.lastWorkDone || '-')+'</td>'+
            '<td>'+html(window.darFormatTableDate(staff.joiningDate))+'</td>'+
            '<td>'+html(staff.visaExpiry || '-')+'</td>'+
            '<td>'+html(staff.passportExpiry || '-')+'</td>'+
            '<td>'+statusPill(dueStatus(staff))+'</td>'+
            '<td class="staff-actions"><button type="button" class="btn btn-secondary" onclick="openStaffModal(\''+html(staff.id)+'\')">Edit</button> '+(staff.linkedInvoiceRef ? '<button type="button" class="btn btn-secondary" onclick="previewInvoiceDocument(\''+html(staff.linkedInvoiceRef)+'\')">Invoice</button>' : '')+'</td>'+
            '</tr>').join('');
        if (window.applyDarLanguage) window.applyDarLanguage();
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
            createdDate: previous.id ? (previous.createdDate || previous.createdAt || '') : (window.darDates ? window.darDates.todayISO() : new Date().toISOString().slice(0,10)),
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

    // Bulk import: both Excel and PDF require one existing company selection.
    let staffImportRows = [];
    let staffImportCompanyId = '';
    const staffImportFields = {
        staffCode: ['staff id','staff code','employee id','employee code','id','code'],
        fullName: ['full name','staff name','employee name','name'],
        nationality: ['nationality','country'],
        designation: ['designation','position','job title','occupation'],
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
        const headerCount = headers.filter(header => aliases.includes(header)).length;
        if (headerCount < 2) throw new Error('Could not identify a staff table. Include column headings such as Staff ID and Full Name.');
        return grid.slice(1).filter(row => row.some(cell => clean(cell) !== '')).map(row => {
            const source = {}; headers.forEach((header,index) => { source[header] = row[index] == null ? '' : row[index]; });
            return mapStaffImportObject(source);
        });
    }
    async function parseStaffImportPdf(file) {
        if (!window.pdfjsLib) throw new Error('PDF reader could not load. Refresh the page and try again.');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        const grids = [];
        for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();
            const lines = [];
            content.items.forEach(item => {
                const text = clean(item.str); if (!text) return;
                const y = Math.round(item.transform[5]);
                let line = lines.find(entry => Math.abs(entry.y-y)<=3);
                if (!line) { line={y,cells:[]}; lines.push(line); }
                line.cells.push({x:item.transform[4],text});
            });
            lines.sort((a,b)=>b.y-a.y).forEach(line=>line.cells.sort((a,b)=>a.x-b.x));
            const headerIndex = lines.findIndex(line => {
                const joined = line.cells.map(cell=>staffImportHeader(cell.text)).join(' ');
                return /staff id|employee id|full name|staff name|employee name/.test(joined);
            });
            if (headerIndex < 0) continue;
            const header = lines[headerIndex].cells;
            const rows = [header.map(cell=>cell.text)];
            lines.slice(headerIndex+1).forEach(line => {
                if (line.cells.length >= 2) rows.push(line.cells.map(cell=>cell.text));
            });
            grids.push(...staffImportRowsFromGrid(rows));
        }
        if (!grids.length) throw new Error('No readable staff table found in this PDF. Please use a text-based PDF with column headings and staff rows, or import an Excel file.');
        return grids;
    }
    function renderStaffImportPreview() {
        const panel = byId('staff-import-preview');
        const button = byId('staff-import-button');
        if (!panel) return;
        const valid = staffImportRows.filter(row=>row.staffCode && row.fullName);
        const invalid = staffImportRows.length-valid.length;
        const existingCodes = new Set((state.staff||[]).filter(row=>row.companyId===staffImportCompanyId || norm(row.companyName)===norm(companyNameById(staffImportCompanyId))).map(row=>norm(row.staffCode||row.staffId)));
        const seen = new Set();
        const duplicates = valid.filter(row=>{const code=norm(row.staffCode); if(existingCodes.has(code)||seen.has(code)) return true; seen.add(code); return false;}).length;
        const preview = staffImportRows.slice(0,30).map((row,index)=>'<tr><td>'+ (index+1) +'</td><td>'+html(row.staffCode||'—')+'</td><td>'+html(row.fullName||'—')+'</td><td>'+html(row.nationality||'—')+'</td><td>'+html(row.passportNumber||'—')+'</td><td>'+html(row.visaExpiry||'—')+'</td><td>'+html(!row.staffCode||!row.fullName?'Missing required field':existingCodes.has(norm(row.staffCode))?'Already exists':'Ready')+'</td></tr>').join('');
        panel.hidden = false;
        panel.innerHTML = '<div class="staff-import-summary"><strong>'+staffImportRows.length+' rows detected</strong><span>'+valid.length+' complete · '+invalid+' incomplete · '+duplicates+' duplicate(s)</span></div><div class="table-responsive"><table class="data-table"><thead><tr><th>#</th><th>Staff ID</th><th>Full Name</th><th>Nationality</th><th>Passport</th><th>Visa Expiry</th><th>Check</th></tr></thead><tbody>'+preview+'</tbody></table></div>'+(staffImportRows.length>30?'<p class="dar-hint">Showing first 30 rows in preview.</p>':'');
        button.disabled = !valid.length || !staffImportCompanyId;
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
                visaExpiry:normalizeStaffImportDate(row.visaExpiry),
                joiningDate:normalizeStaffImportDate(row.joiningDate)
            }));
            staffImportCompanyId = companyId;
            renderStaffImportPreview();
            help.textContent = 'Review the preview. All imported records will be assigned to '+companyNameById(companyId)+'.';
        } catch (error) {
            staffImportRows=[]; byId('staff-import-preview').hidden=true;
            help.textContent = error.message || 'Could not read this file.';
            showCustomModal('Import could not be prepared',help.textContent);
        }
    };
    window.commitStaffImport = function () {
        if (!db) { showCustomModal('Connection unavailable','Firebase is not connected. No staff were imported.'); return; }
        const company = companyById(staffImportCompanyId);
        if (!company || !staffImportRows.length) { showCustomModal('Select company first','Choose an existing company and preview a file before importing.'); return; }
        const valid = staffImportRows.filter(row=>row.staffCode && row.fullName);
        const existing = new Set((state.staff||[]).filter(row=>row.companyId===company.id || norm(row.companyName)===norm(company.companyName)).map(row=>norm(row.staffCode||row.staffId)));
        const batchSeen = new Set();
        const importable = valid.filter(row=>{
            const code=norm(row.staffCode);
            if (!code || existing.has(code) || batchSeen.has(code)) return false;
            batchSeen.add(code); return true;
        });
        if (!importable.length) { showCustomModal('Nothing to import','No new complete staff records were found. Existing or duplicate Staff IDs are skipped.'); return; }
        const updates = {};
        const created = [];
        const timestamp = new Date().toISOString();
        importable.forEach(row=>{
            const id=db.ref('staff').push().key;
            const record={
                id, staffCode:row.staffCode, staffId:row.staffCode, fullName:row.fullName,
                companyId:company.id, companyName:company.companyName,
                nationality:row.nationality||'', designation:row.designation||'',
                lastWorkDone:row.lastWorkDone||'', passportNumber:row.passportNumber||'',
                passportExpiry:row.passportExpiry||'', visaNumber:row.visaNumber||'',
                visaExpiry:row.visaExpiry||'', visaStatus:row.visaStatus||'',
                renewalStatus:row.renewalStatus||'Pending', joiningDate:row.joiningDate||'',
                phone:row.phone||'', email:row.email||'', documentReference:row.documentReference||'',
                notes:row.notes||'', linkedInvoiceRef:'', createdDate:window.darDates?window.darDates.todayISO():timestamp.slice(0,10),
                updatedAt:timestamp, updatedBy:firebase.auth().currentUser?.email||firebase.auth().currentUser?.uid||'Unknown'
            };
            const copy={...record}; delete copy.id; updates['staff/'+id]=copy; created.push(record);
        });
        byId('staff-import-button').disabled=true;
        db.ref().update(updates,error=>{
            if(error){byId('staff-import-button').disabled=false;showCustomModal('Import failed','Firebase could not save the staff records. No import confirmation was received.');return;}
            state.staff=state.staff||[]; state.staff.push(...created);
            renderStaffTable();
            staffImportRows=[]; byId('staff-import-preview').hidden=true; byId('staff-import-file').value='';
            byId('staff-import-help').textContent='Imported '+created.length+' staff record(s) for '+company.companyName+'.';
            showCustomModal('Import completed',created.length+' staff record(s) imported for '+company.companyName+'. Incomplete rows and duplicate Staff IDs were skipped.');
        });
    };
    function populateStaffImportCompanies() {
        const select=byId('staff-import-company'); if(!select) return;
        const selected=select.value;
        select.innerHTML='<option value="">Select existing company</option>'+(state.clients||[]).slice().sort((a,b)=>clean(a.companyName).localeCompare(clean(b.companyName))).map(company=>'<option value="'+html(company.id)+'">'+html(company.companyName)+'</option>').join('');
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
