// Studio Spreadsheet state
let studioItems = [
    { description: 'Trade License Renewal Professional Fees', qty: 1, price: 3500 }
];

function renderStudioItems() {
    const tbody = document.getElementById('studio-items-tbody');
    tbody.innerHTML = studioItems.map((item, idx) => `
        <tr class="border-b border-slate-50">
            <td class="py-2 px-2"><input type="text" value="${item.description}" oninput="updateStudioItem(${idx}, 'description', this.value)" class="w-full border rounded-lg px-2 py-1 text-sm outline-none"></td>
            <td class="py-2 px-2"><input type="number" value="${item.qty}" oninput="updateStudioItem(${idx}, 'qty', Number(this.value))" class="w-full border rounded-lg px-2 py-1 text-sm outline-none"></td>
            <td class="py-2 px-2"><input type="number" value="${item.price}" oninput="updateStudioItem(${idx}, 'price', Number(this.value))" class="w-full border rounded-lg px-2 py-1 text-sm outline-none"></td>
            <td class="py-2 px-2 font-bold text-slate-800">AED ${(item.qty * item.price).toLocaleString()}</td>
            <td class="py-2 px-2 text-center"><button onclick="removeStudioItem(${idx})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash-can"></i></button></td>
        </tr>
    `).join('');

    const grandTotal = studioItems.reduce((sum, i) => sum + (i.qty * i.price), 0);
    document.getElementById('studio-grand-total').innerText = `AED ${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function studioAddRow() {
    studioItems.push({ description: 'New Service Item', qty: 1, price: 0 });
    renderStudioItems();
}

function removeStudioItem(idx) {
    studioItems.splice(idx, 1);
    renderStudioItems();
}

function updateStudioItem(idx, field, val) {
    studioItems[idx][field] = val;
    renderStudioItems();
}

function renderStudioClientOptions() {
    const clientSelect = document.getElementById('studio-client-select');
    clientSelect.innerHTML = '<option value="">-- Choose Registered Client --</option>' + 
        state.clients.map(c => `<option value="${c.name}">${c.name} (${c.trn || 'No TRN'})</option>`).join('');

    const presetSelect = document.getElementById('studio-preset-select');
    presetSelect.innerHTML = '<option value="">-- Quick Inject Preset --</option>' + 
        state.services.map(s => `<option value="${s.id}">${s.name} (AED ${s.price})</option>`).join('');

    renderStudioItems();
}

function injectServicePresetToItems() {
    const presetId = document.getElementById('studio-preset-select').value;
    if (!presetId) return;
    const service = state.services.find(s => s.id === presetId);
    if (service) {
        studioItems.push({ description: service.name, qty: 1, price: service.price });
        renderStudioItems();
    }
}

function generatePDFDocument() {
    const clientName = document.getElementById('studio-client-select').value || 'Walk-in Client';
    const docType = document.getElementById('doc-type-select').value.toUpperCase();
    const refId = `DAS-2026-${Math.floor(100 + Math.random() * 900)}`;

    document.getElementById('pdf-doc-title').innerText = docType;
    document.getElementById('pdf-ref-no').innerText = `Ref: ${refId}`;
    document.getElementById('pdf-client-name').innerText = clientName;

    const subtotal = studioItems.reduce((sum, i) => sum + (i.qty * i.price), 0);
    document.getElementById('pdf-subtotal').innerText = subtotal.toLocaleString();
    document.getElementById('pdf-grand-total').innerText = `AED ${subtotal.toLocaleString()}`;

    const pdfTbody = document.getElementById('pdf-items-tbody');
    pdfTbody.innerHTML = studioItems.map(i => `
        <tr>
            <td class="py-2.5 px-3 text-slate-800">${i.description}</td>
            <td class="py-2.5 px-3 text-center text-slate-600">${i.qty}</td>
            <td class="py-2.5 px-3 text-right text-slate-600">${i.price.toLocaleString()}</td>
            <td class="py-2.5 px-3 text-right font-bold text-slate-900">${(i.qty * i.price).toLocaleString()}</td>
        </tr>
    `).join('');

    const element = document.getElementById('print-container');
    element.style.display = 'block';

    const opt = {
        margin:       0,
        filename:     `${refId}_${clientName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
        element.style.display = 'none';
        showToast('PDF Export Generated successfully');
    });
}

function saveDocumentToLedger() {
    const clientName = document.getElementById('studio-client-select').value || 'Walk-in Client';
    const docType = document.getElementById('doc-type-select').value;
    const total = studioItems.reduce((sum, i) => sum + (i.qty * i.price), 0);
    const refId = `DAS-2026-${Math.floor(100 + Math.random() * 900)}`;

    state.documents.push({
        id: refId,
        type: docType,
        clientName,
        service: studioItems[0]?.description || 'General Business Services',
        total,
        date: new Date().toISOString().split('T')[0],
        status: 'Completed'
    });

    showToast(`Document ${refId} saved to ledger successfully`);
    switchTab('dashboard');
}
