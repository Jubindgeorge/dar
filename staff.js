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
    function nextStaffCode(reserved) {
        const used = new Set([...(state.staff || []).map(item => clean(item.staffCode || item.staffId)), ...(reserved || [])].map(norm));
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
            const searchable = [staff.staffCode,staff.personNumber,staff.fullName,staff.companyName,staff.lastWorkDone,staff.passportNumber,staff.labourCardNumber].map(norm).join(' ');
            return !search || searchable.includes(search);
        }).sort((a,b)=>clean(b.joiningDate).localeCompare(clean(a.joiningDate)));
        if (!records.length) {
            body.innerHTML = '<tr><td colspan="9" class="staff-empty">No staff records found. Use “Add Staff” to create the first profile.</td></tr>';
            return;
        }
        body.innerHTML = records.map(staff => '<tr>'+
            '<td><strong>'+html(staff.staffCode || staff.staffId || '-')+'</strong></td>'+
            '<td>'+html(staff.fullName || '-')+(staff.personNumber ? '<small class="staff-person-number">Person No: '+html(staff.personNumber)+'</small>' : '')+'</td>'+
            '<td>'+html(staff.companyName || companyNameById(staff.companyId) || '-')+'</td>'+
            '<td>'+html(staff.nationality || '-')+'</td>'+
            '<td>'+html(staff.labourCardNumber || '-')+'</td>'+
            '<td>'+html(staff.labourCardExpiry || '-')+'</td>'+
            '<td>'+html(staff.passportNumber || '-')+'</td>'+
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
        byId('sf-staff-code').value = record.staffCode || record.staffId || defaults.staffCode || nextStaffCode();
        byId('sf-staff-code').readOnly = true;
        byId('sf-full-name').value = record.fullName || defaults.fullName || '';
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
        const staffCode = clean(byId('sf-staff-code').value) || nextStaffCode();
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
        const allLines = [];
        const allRows = [];
        for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();
            const lines = [];
            content.items.forEach(item => {
                const value = clean(item.str);
                if (!value) return;
                const x = Number(item.transform?.[4] || 0);
                const y = Number(item.transform?.[5] || 0);
                // PDF text fragments on one visual row can have slightly different baselines.
                let line = lines.find(entry => Math.abs(entry.y-y)<=5.5);
                if (!line) { line={y,cells:[]}; lines.push(line); }
                line.cells.push({x,text:value});
            });
            lines.sort((a,b)=>b.y-a.y).forEach(line=>{
                line.cells.sort((a,b)=>a.x-b.x);
                const rowText = line.cells.map(cell=>cell.text).join(' ').replace(/\s+/g,' ').trim();
                if (rowText) {
                    allLines.push(rowText);
                    allRows.push(rowText);
                }
            });
        }
        const combined = allLines.join(' ').toLowerCase();
        const looksMohre = /list\s+of\s+employees|establishment\s*(?:number|no\.? )|passport\s*(?:number|no\.? )|person\s*name|card\s*type|job\s*name|card\s*number|mohre/i.test(combined);
        if (looksMohre) {
            // Parse MOHRE reports by their most reliable anchors: Labour Card Number
            // immediately followed by its expiry date. A report record may span many
            // PDF text lines, and the Person Number may appear before OR after the
            // passport/name block. Repeated page headers are skipped using the last
            // "Passport Number" heading before each card anchor.
            const mohreTokens = allLines.join(' ').split(/\\s+/).map(value=>clean(value)).filter(Boolean);
            const mohreDate = /^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/;
            const mohreCardType = /^(NEW|RENEW|RENEWAL|PRE|REPLACEMENT)$/i;
            const mohreLatin = value => clean(value).replace(/[^A-Za-z0-9 .'-]/g,'').replace(/\\s+/g,' ').trim();
            const mohreCardAnchors = [];
            mohreTokens.forEach((token,index)=>{
                if (/^\\d{8,10}$/.test(token) && mohreDate.test(mohreTokens[index+1] || '')) mohreCardAnchors.push(index);
            });
            const mohreRecords = [];
            let previousExpiryIndex = -1;
            mohreCardAnchors.forEach(cardIndex=>{
                const segmentStart = previousExpiryIndex + 1;
                const segment = mohreTokens.slice(segmentStart,cardIndex);
                const cardExpiry = mohreTokens[cardIndex+1];
                previousExpiryIndex = cardIndex+1;
                if (!segment.length) return;
                const typeOffset = segment.findIndex(token=>mohreCardType.test(token));
                if (typeOffset < 0) return;
                // Ignore page/report/establishment headers by starting after the
                // last repeated Passport Number heading in this employee segment.
                let passportHeading = -1;
                for (let i=0;i<typeOffset;i++) {
                    const heading=segment[i].toLowerCase();
                    if (heading==='passport number') passportHeading=i;
                    else if (heading==='passport' && segment[i+1]?.toLowerCase().startsWith('number')) passportHeading=i+1;
                }
                const searchStart = passportHeading >= 0 ? passportHeading+1 : 0;
                const personOffsets = [];
                segment.forEach((token,index)=>{ if (/^\\d{12,16}$/.test(token)) personOffsets.push(index); });
                const personOffset = personOffsets.length ? personOffsets[0] : -1;
                const passportCandidates = [];
                for (let i=searchStart;i<typeOffset;i++) {
                    const token=segment[i];
                    if (/^RP\\d+AE$/i.test(token)) continue;
                    if (/^[A-Z0-9]{6,12}$/i.test(token) && ((/[A-Z]/i.test(token) && /\\d/.test(token)) || /^\\d{6,12}$/.test(token))) {
                        if (!/^\\d{12,16}$/.test(token)) passportCandidates.push(i);
                    }
                }
                if (!passportCandidates.length) return;
                // If the Person Number is before the passport (as on page 2),
                // choose the first passport after it. Otherwise use the first
                // passport candidate in the record (including numeric-only IDs).
                const passportOffset = personOffset >= searchStart
                    ? (passportCandidates.find(i=>i>personOffset) ?? passportCandidates[0])
                    : passportCandidates[0];
                const personNumber = personOffset >= 0 ? segment[personOffset] : '';
                const nameEnd = personOffset > passportOffset ? personOffset : typeOffset;
                const fullName = mohreLatin(segment.slice(passportOffset+1,nameEnd)
                    .filter(token=>!/^(ELECTRONIC|WORK|PERMIT|APPROVAL)$/i.test(token))
                    .filter(token=>!/^\\d{12,16}$/.test(token)).join(' '));
                if (!fullName || !/[A-Za-z]/.test(fullName)) return;
                // Card type descriptions end at the word PERMIT; designation follows.
                let permitEnd = typeOffset;
                for (let i=typeOffset+1;i<segment.length;i++) {
                    if (segment[i].toUpperCase()==='PERMIT') { permitEnd=i; break; }
                }
                const nationalityCandidates = [];
                for (let i=permitEnd+1;i<segment.length;i++) {
                    if (/[A-Za-z]/.test(segment[i]) && !/^\\d+$/.test(segment[i])) nationalityCandidates.push(i);
                }
                if (!nationalityCandidates.length) return;
                let nationalityStart = nationalityCandidates[nationalityCandidates.length-1];
                if (segment[nationalityStart].toUpperCase()==='LANKA' &&
                    nationalityStart>0 && segment[nationalityStart-1].toUpperCase()==='SRI') nationalityStart--;
                const nationality = mohreLatin(segment.slice(nationalityStart,
                    nationalityCandidates[nationalityCandidates.length-1]+1).join(' ')).toUpperCase();
                const designation = mohreLatin(segment.slice(permitEnd+1,nationalityStart).join(' '));
                mohreRecords.push({
                    staffCode:'',
                    personNumber,
                    fullName,
                    nationality,
                    designation,
                    passportNumber:segment[passportOffset],
                    labourCardNumber:mohreTokens[cardIndex],
                    labourCardExpiry:normalizeStaffImportDate(cardExpiry),
                    // This report is not the separate visa-details import.
                    visaNumber:'', visaExpiry:'', visaStatus:'', renewalStatus:'Pending'
                });
            });
            if (mohreRecords.length) return mohreRecords;
        }
            // First parse each visual PDF row independently. The previous parser flattened
            // every page into one token stream, so wrapped headers/rows and numeric passports
            // could shift the boundaries and make every employee disappear.
            const rowDatePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            const rowCardTypePattern = /^(NEW|RENEW|RENEWAL|PRE|REPLACEMENT)$/i;
            const rowLatin = value => clean(value).replace(/[^A-Za-z0-9 .'-]/g,'').replace(/\s+/g,' ').trim();
            const rowRecords = [];
            allRows.forEach(rowText => {
                const tokens = rowText.split(/\s+/).map(value=>value.trim()).filter(Boolean);
                const cardIndex = tokens.findIndex((token,index)=>/^\d{8,10}$/.test(token) && rowDatePattern.test(tokens[index+1] || ''));
                if (cardIndex < 2) return;
                const expiry = tokens[cardIndex+1];
                const beforeCard = tokens.slice(0,cardIndex);
                const personIndex = beforeCard.findIndex(token=>/^\d{12,16}$/.test(token));
                const passportStart = personIndex >= 0 ? personIndex+1 : 0;
                const passportIndex = beforeCard.findIndex((token,index)=>index>=passportStart &&
                    (/^[A-Z0-9]{6,12}$/i.test(token) && (/[A-Z]/i.test(token) && /\d/.test(token) || /^\d{6,12}$/.test(token))) &&
                    !/^\d{12,16}$/.test(token));
                if (passportIndex < 0 || passportIndex >= cardIndex) return;
                const typeIndex = tokens.findIndex((token,index)=>index>passportIndex && index<cardIndex && rowCardTypePattern.test(token));
                const nationalityEnd = cardIndex;
                let nationalityStart = nationalityEnd-1;
                if (nationalityStart>passportIndex && tokens[nationalityStart].toUpperCase()==='LANKA' &&
                    tokens[nationalityStart-1]?.toUpperCase()==='SRI') nationalityStart--;
                const nationality = rowLatin(tokens.slice(nationalityStart,nationalityEnd).join(' ')).toUpperCase();
                if (!nationality || !/[A-Z]/.test(nationality)) return;
                const nameEnd = typeIndex>passportIndex ? typeIndex : nationalityStart;
                const name = rowLatin(tokens.slice(passportIndex+1,nameEnd)
                    .filter(token=>!/^\d{12,16}$/.test(token) && !/^PERMIT$/i.test(token)).join(' '));
                if (!name || !/[A-Za-z]/.test(name)) return;
                const designationStart = typeIndex>0 ? typeIndex+1 : nameEnd;
                const designation = rowLatin(tokens.slice(designationStart,nationalityStart).join(' '));
                rowRecords.push({
                    staffCode:'',
                    personNumber:personIndex>=0 ? tokens[personIndex] : '',
                    fullName:name,
                    nationality,
                    designation,
                    passportNumber:tokens[passportIndex],
                    labourCardNumber:tokens[cardIndex],
                    labourCardExpiry:normalizeStaffImportDate(expiry),
                    visaNumber:'', visaExpiry:'', visaStatus:'', renewalStatus:'Pending'
                });
            });
            if (rowRecords.length) return rowRecords;
            // Fallback to the token-stream parser for PDFs whose rows are split vertically.
            // Use passport numbers as record anchors. Do not depend on a fixed nationality
            // list: MOHRE reports contain many nationalities and that list caused valid rows
            // to be silently dropped.
            const flat = allLines.join(' ').split(/\s+/).map(value=>value.trim()).filter(Boolean);
            const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            const cardTypePattern = /^(NEW|RENEW|RENEWAL|PRE|REPLACEMENT)$/i;
            const latin = value => clean(value).replace(/[^A-Za-z0-9 .'-]/g,'').replace(/\s+/g,' ').trim();
            const isPassport = value => /^[A-Z0-9]{6,12}$/i.test(value) && /[A-Z]/i.test(value) && /\d/.test(value);
            const isNumericPassport = (value,index) => /^\d{6,12}$/.test(value) &&
                // A labour-card number is followed by its expiry date in this report.
                // Exclude that pattern, but allow numeric passports with or without
                // a separate Person Number immediately before them.
                !datePattern.test(flat[index+1] || '') &&
                !datePattern.test(flat[index+2] || '');
            const passportIndexes = [];
            flat.forEach((token,index)=>{
                if (isPassport(token) || isNumericPassport(token,index)) passportIndexes.push(index);
            });
            const records = [];
            passportIndexes.forEach((index,recordIndex)=>{
                const nextIndex = passportIndexes[recordIndex+1] ?? flat.length;
                const segment = flat.slice(index,nextIndex);
                if (segment.length < 5) return;
                const cardNumberIndex = segment.findIndex((token,pos)=>pos>0 && /^\d{8,10}$/.test(token));
                if (cardNumberIndex < 0) return;
                const expiryIndex = segment.findIndex((token,pos)=>pos>cardNumberIndex && datePattern.test(token));
                if (expiryIndex < 0) return;
                const typeIndex = segment.findIndex((token,pos)=>pos>0 && pos<cardNumberIndex && cardTypePattern.test(token));
                // Person number is a separate MOHRE identifier, not a visa/permit field.
                const beforePassport = flat.slice(Math.max(0,index-4),index);
                const personNumber = beforePassport.slice().reverse().find(token=>/^\d{12,16}$/.test(token)) || '';
                // Nationality is the final alphabetic field before card number; do not use
                // a fixed country list because MOHRE reports include many nationalities.
                const nationalityTokens = segment.slice(1,cardNumberIndex)
                    .map((token,pos)=>({token,pos:pos+1}))
                    .filter(item=>/[A-Za-z]/.test(item.token) && !/^\d+$/.test(item.token));
                if (!nationalityTokens.length) return;
                const lastNationality = nationalityTokens[nationalityTokens.length-1];
                const isSriLanka = lastNationality.token.toUpperCase()==='LANKA' && nationalityTokens.length>1 && nationalityTokens[nationalityTokens.length-2].token.toUpperCase()==='SRI';
                const nationality = isSriLanka ? 'SRI LANKA' : latin(lastNationality.token).toUpperCase();
                const nationalityStart = isSriLanka ? nationalityTokens[nationalityTokens.length-2].pos : lastNationality.pos;
                const nameEnd = typeIndex > 1 ? typeIndex : nationalityStart;
                const name = segment.slice(1,nameEnd)
                    .filter(token=>!/^\d{12,16}$/.test(token) && !/^PERMIT$/i.test(token))
                    .map(latin).filter(token=>/[A-Za-z]/.test(token)).join(' ').replace(/\s+/g,' ').trim();
                if (!name) return;
                const designationStart = typeIndex > 0 ? typeIndex+1 : nameEnd;
                const designation = segment.slice(designationStart,nationalityStart)
                    .map(latin).filter(token=>/[A-Za-z]/.test(token)).join(' ').replace(/\s+/g,' ').trim();
                const expiry = segment[expiryIndex];
                records.push({
                    staffCode:'', personNumber, fullName:name, nationality,
                    designation,
                    passportNumber:segment[0],
                    labourCardNumber:segment[cardNumberIndex],
                    labourCardExpiry:normalizeStaffImportDate(expiry),
                    // MOHRE employee-list PDF is not the visa import. Keep visa fields empty.
                    visaNumber:'', visaExpiry:'', visaStatus:'', renewalStatus:'Pending'
                });
            });
            if (records.length) return records;
        }
        // Generic employee-list PDFs remain supported when they have explicit staff/name headings.
        if (/staff id|employee id|full name|staff name|employee name/.test(combined)) {
            const headerIndex = allLines.findIndex(line=>/staff id|employee id|full name|staff name|employee name/i.test(line));
            if (headerIndex >= 0) {
                const rows = [allLines[headerIndex].split(/\s{2,}/)];
                allLines.slice(headerIndex+1).forEach(line=>rows.push(line.split(/\s{2,}/)));
                const parsed = staffImportRowsFromGrid(rows);
                if (parsed.length) return parsed;
            }
        }
        if (!allLines.length || !combined.trim()) {
            throw new Error('This PDF contains no selectable text. It may be scanned or image-only; please use an OCR-enabled PDF or upload the original file for review.');
        }
        if (looksMohre) {
            throw new Error('MOHRE headings were detected, but employee rows could not be identified. The PDF text layout needs a parser adjustment. Please upload the original PDF for verification.');
        }
        throw new Error('PDF text was found, but this file does not match a supported staff-import layout. Please use the MOHRE employee-list PDF or upload the original file for review.');
    }
    function renderStaffImportPreview() {
        const panel = byId('staff-import-preview');
        const button = byId('staff-import-button');
        if (!panel) return;
        const valid = staffImportRows.filter(row=>row.fullName);
        const invalid = staffImportRows.length-valid.length;
        const companyStaff = (state.staff||[]).filter(row=>row.companyId===staffImportCompanyId || norm(row.companyName)===norm(companyNameById(staffImportCompanyId)));
        const existingCodes = new Set(companyStaff.map(row=>norm(row.staffCode||row.staffId)));
        const existingCards = new Set(companyStaff.map(row=>norm(row.labourCardNumber)).filter(Boolean));
        const existingPassports = new Set(companyStaff.map(row=>norm(row.passportNumber)).filter(Boolean));
        const seen = new Set();
        const duplicates = valid.filter(row=>{
            const card=norm(row.labourCardNumber), passport=norm(row.passportNumber);
            const key=card || passport;
            if ((card && existingCards.has(card)) || (passport && existingPassports.has(passport)) || (key && seen.has(key))) return true;
            if (key) seen.add(key);
            return false;
        }).length;
        const preview = staffImportRows.slice(0,30).map((row,index)=>'<tr><td>'+ (index+1) +'</td><td>'+html(row.staffCode||'Auto')+'</td><td>'+html(row.fullName||'—')+(row.personNumber?'<small class="staff-person-number">Person No: '+html(row.personNumber)+'</small>':'')+'</td><td>'+html(row.nationality||'—')+'</td><td>'+html(row.passportNumber||'—')+'</td><td>'+html(row.labourCardNumber||'—')+'</td><td>'+html(row.labourCardExpiry||'—')+'</td><td>'+html(!row.fullName?'Missing full name':(row.labourCardNumber&&existingCards.has(norm(row.labourCardNumber)))||(row.passportNumber&&existingPassports.has(norm(row.passportNumber)))?'Already exists':'Ready')+'</td></tr>').join('');
        panel.hidden = false;
        panel.innerHTML = '<div class="staff-import-summary"><strong>'+staffImportRows.length+' rows detected</strong><span>'+valid.length+' complete · '+invalid+' incomplete · '+duplicates+' duplicate(s)</span></div><div class="table-responsive"><table class="data-table"><thead><tr><th>#</th><th>Staff ID</th><th>Name / Person No.</th><th>Nationality</th><th>Passport</th><th>Labour Card No.</th><th>Labour Card Expiry</th><th>Check</th></tr></thead><tbody>'+preview+'</tbody></table></div>'+(staffImportRows.length>30?'<p class="dar-hint">Showing first 30 rows in preview.</p>':'');
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
                labourCardExpiry:normalizeStaffImportDate(row.labourCardExpiry),
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
        const valid = staffImportRows.filter(row=>row.fullName);
        const companyStaff = (state.staff||[]).filter(row=>row.companyId===company.id || norm(row.companyName)===norm(company.companyName));
        const existing = new Set(companyStaff.map(row=>norm(row.staffCode||row.staffId)));
        const existingCards = new Set(companyStaff.map(row=>norm(row.labourCardNumber)).filter(Boolean));
        const existingPassports = new Set(companyStaff.map(row=>norm(row.passportNumber)).filter(Boolean));
        const batchSeen = new Set();
        const generatedCodes = [];
        const importable = valid.filter(row=>{
            const card=norm(row.labourCardNumber), passport=norm(row.passportNumber);
            const key=card || passport;
            if ((card && existingCards.has(card)) || (passport && existingPassports.has(passport)) || (key && batchSeen.has(key))) return false;
            if (key) batchSeen.add(key);
            return true;
        });
        if (!importable.length) { showCustomModal('Nothing to import','No new complete staff records were found. Existing labour-card numbers or passport numbers are skipped.'); return; }
        const updates = {};
        const created = [];
        const timestamp = new Date().toISOString();
        importable.forEach(row=>{
            const id=db.ref('staff').push().key;
            const generatedStaffCode=nextStaffCode(generatedCodes);
            generatedCodes.push(generatedStaffCode);
            const record={
                id, staffCode:generatedStaffCode, staffId:generatedStaffCode, fullName:row.fullName,
                companyId:company.id, companyName:company.companyName,
                personNumber:row.personNumber||'', nationality:row.nationality||'', designation:row.designation||'',
                labourCardNumber:row.labourCardNumber||'', labourCardExpiry:row.labourCardExpiry||'',
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
