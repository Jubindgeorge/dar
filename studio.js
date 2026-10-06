// studio.js
function openStudio(type, editRefCode = null) {
    switchTab('studio');
    const titleEl = document.getElementById('studio-main-title');
    if (titleEl) titleEl.innerText = editRefCode ? `Edit ${type} - ${editRefCode}` : `Create New ${type}`;

    document.getElementById('studio-doc-type').value = type;
    document.getElementById('studio-edit-ref').value = editRefCode || '';

    if (editRefCode) {
        const doc = (state.documents || []).find(d => d.refCode === editRefCode);
        if (doc) {
            document.getElementById('studio-client-name').value = doc.clientName || '';
            document.getElementById('studio-company-select').value = doc.companyName || '';
            document.getElementById('studio-contact-person').value = doc.contactPerson || '';
            document.getElementById('studio-date').value = doc.createdDate || new Date().toISOString().split('T')[0];
            document.getElementById('studio-visa-expiry').value = doc.visaExpiryDate || '';
            document.getElementById('studio-govt-amt').value = doc.govtAmt || '';
            document.getElementById('studio-advance-amt').value = doc.advanceAmt || '';
            document.getElementById('studio-branch-tag').value = doc.branchTag || 'company';

            const tbody = document.getElementById('studio-items-tbody');
            if (tbody) {
                tbody.innerHTML = (doc.items || []).map((item, idx) => `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><input type="text" class="form-control s-item-desc" value="${item.d || item.description || ''}"></td>
                        <td><input type="number" class="form-control s-item-qty" value="${item.q || item.quantity || 1}" oninput="calculateStudioTotals()"></td>
                        <td><input type="number" class="form-control s-item-price" value="${item.p || item.price || 0}" oninput="calculateStudioTotals()"></td>
                        <td class="s-item-row-total" style="text-align: right; font-weight: bold;">0.00</td>
                        <td style="text-align: center;"><button type="button" onclick="removeStudioRow(this)" class="btn btn-danger" style="padding: 2px 6px;"><i class="fa-solid fa-trash"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } else {
        document.getElementById('studio-client-name').value = '';
        document.getElementById('studio-company-select').value = '';
        document.getElementById('studio-contact-person').value = '';
        document.getElementById('studio-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('studio-visa-expiry').value = '';
        document.getElementById('studio-govt-amt').value = '';
        document.getElementById('studio-advance-amt').value = '';
        document.getElementById('studio-branch-tag').value = 'company';

        const tbody = document.getElementById('studio-items-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td style="text-align: center;">1</td>
                    <td><input type="text" class="form-control s-item-desc" placeholder="Service description"></td>
                    <td><input type="number" class="form-control s-item-qty" value="1" oninput="calculateStudioTotals()"></td>
                    <td><input type="number" class="form-control s-item-price" value="0.00" oninput="calculateStudioTotals()"></td>
                    <td class="s-item-row-total" style="text-align: right; font-weight: bold;">0.00</td>
                    <td style="text-align: center;"><button type="button" onclick="removeStudioRow(this)" class="btn btn-danger" style="padding: 2px 6px;"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        }
    }

    populateStudioCompanyDropdown();
    calculateStudioTotals();
}

function populateStudioCompanyDropdown() {
    const sel = document.getElementById('studio-company-select');
    if (!sel) return;

    const current = sel.value;
    sel.innerHTML = `<option value="">-- Select Client / Company --</option>` + 
        (state.clients || []).map(c => `<option value="${c.companyName}">${c.companyName}</option>`).join('');
    sel.value = current;
}

function autofillStudioClient() {
    const companyName = document.getElementById('studio-company-select').value;
    const client = (state.clients || []).find(c => c.companyName === companyName);
    if (client) {
        document.getElementById('studio-contact-person').value = client.contactPerson || '';
    }
}

function addStudioRow() {
    const tbody = document.getElementById('studio-items-tbody');
    if (!tbody) return;

    const rowCount = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align: center;">${rowCount}</td>
        <td><input type="text" class="form-control s-item-desc" placeholder="Service description"></td>
        <td><input type="number" class="form-control s-item-qty" value="1" oninput="calculateStudioTotals()"></td>
        <td><input type="number" class="form-control s-item-price" value="0.00" oninput="calculateStudioTotals()"></td>
        <td class="s-item-row-total" style="text-align: right; font-weight: bold;">0.00</td>
        <td style="text-align: center;"><button type="button" onclick="removeStudioRow(this)" class="btn btn-danger" style="padding: 2px 6px;"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
    calculateStudioTotals();
}

function removeStudioRow(btn) {
    const tr = btn.closest('tr');
    tr.remove();
    calculateStudioTotals();
}

function calculateStudioTotals() {
    const rows = document.querySelectorAll('#studio-items-tbody tr');
    let grandTotal = 0;

    rows.forEach((row, idx) => {
        row.cells[0].innerText = idx + 1;
        const q = parseFloat(row.querySelector('.s-item-qty').value) || 0;
        const p = parseFloat(row.querySelector('.s-item-price').value) || 0;
        const rowTotal = q * p;
        row.querySelector('.s-item-row-total').innerText = rowTotal.toFixed(2);
        grandTotal += rowTotal;
    });

    const displayEl = document.getElementById('studio-grand-total-display');
    if (displayEl) displayEl.innerText = `AED ${grandTotal.toFixed(2)}`;
}

function saveStudioDocument() {
    const type = document.getElementById('studio-doc-type').value || 'Invoice';
    let editRef = document.getElementById('studio-edit-ref').value;

    const clientName = document.getElementById('studio-client-name').value.trim();
    const companyName = document.getElementById('studio-company-select').value.trim();
    const contactPerson = document.getElementById('studio-contact-person').value.trim();
    const createdDate = document.getElementById('studio-date').value || new Date().toISOString().split('T')[0];
    const visaExpiryDate = document.getElementById('studio-visa-expiry').value || '';
    const govtAmt = parseFloat(document.getElementById('studio-govt-amt').value) || 0;
    const advanceAmt = parseFloat(document.getElementById('studio-advance-amt').value) || 0;
    const branchTag = document.getElementById('studio-branch-tag').value || 'company';

    const rows = document.querySelectorAll('#studio-items-tbody tr');
    let items = [];
    let totalAmt = 0;

    rows.forEach(row => {
        const d = row.querySelector('.s-item-desc').value.trim();
        const q = parseFloat(row.querySelector('.s-item-qty').value) || 0;
        const p = parseFloat(row.querySelector('.s-item-price').value) || 0;
        const rowTotal = q * p;
        totalAmt += rowTotal;
        items.push({ d, q, p });
    });

    if (!editRef) {
        const yearMonth = createdDate.slice(0, 7).replace('-', '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        editRef = `INV-${yearMonth}-${randomNum}`;
    }

    const payload = {
        refCode: editRef,
        type,
        clientName,
        companyName,
        contactPerson,
        createdDate,
        visaExpiryDate,
        govtAmt,
        advanceAmt,
        branchTag,
        items,
        totalAmt,
        total: totalAmt,   // Added for backwards compatibility
        amount: totalAmt   // Added for backwards compatibility
    };

    db.ref(`documents/${editRef}`).set(payload, (err) => {
        if (!err) {
            if (typeof showCustomModal === 'function') {
                showCustomModal('Success', `Document ${editRef} saved successfully!`);
            }
            switchTab('documents');
        }
    });
}