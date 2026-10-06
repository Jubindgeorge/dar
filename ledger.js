// ledger.js
function renderAccountsLedgerMaster() {
    populateInvoiceSelectOptions();
    renderMonthlyExpensesTable();
    renderFullAccountsLedgerTable();
    renderAccountsLedgerSummaryTotals();
    
    const sel = document.getElementById('acc-invoice-select');
    if (sel && sel.value) {
        renderAccountsLedgerDetail(sel.value);
    }
}

function populateInvoiceSelectOptions() {
    const sel = document.getElementById('acc-invoice-select');
    if (!sel) return;

    const currentVal = sel.value;
    if (!state.documents || state.documents.length === 0) {
        sel.innerHTML = `<option value="">-- No Invoices Available --</option>`;
        return;
    }

    sel.innerHTML = state.documents.map(d => `
        <option value="${d.refCode}">${d.refCode} - ${d.companyName || d.clientName || 'Direct Account'}</option>
    `).join('');

    if (currentVal && state.documents.some(d => d.refCode === currentVal)) {
        sel.value = currentVal;
    } else {
        sel.value = state.documents[0].refCode;
    }

    renderAccountsLedgerDetail(sel.value);
}

function renderMonthlyExpensesTable() {
    const tbody = document.getElementById('monthly-expenses-tbody');
    if (!tbody) return;

    if (!state.monthlyExpenses || state.monthlyExpenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No monthly operating expenses declared.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.monthlyExpenses.map(e => `
        <tr>
            <td><strong>${e.month}</strong></td>
            <td>${e.title}</td>
            <td>AED ${parseFloat(e.amount || 0).toFixed(2)}</td>
            <td style="text-align: center;">
                <button onclick="deleteMonthlyExpense('${e.id}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderFullAccountsLedgerTable() {
    const tbody = document.getElementById('acc-full-ledger-tbody');
    if (!tbody) return;

    if (!state.documents || state.documents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No transaction records logged.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.documents.map(d => {
        const total = parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
        const govt = parseFloat(d.govtAmt) || 0;
        const advance = parseFloat(d.advanceAmt) || 0;
        
        const payments = d.paymentLogs ? Object.values(d.paymentLogs).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
        const totalPaid = advance + payments;
        const balance = total - totalPaid;

        const docMonth = (d.createdDate || '').slice(0, 7);
        const monthDocs = state.documents.filter(doc => (doc.createdDate || '').startsWith(docMonth));
        const monthExpenses = state.monthlyExpenses ? state.monthlyExpenses.filter(e => e.month === docMonth).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
        const expenseShare = monthDocs.length > 0 ? (monthExpenses / monthDocs.length) : 0;

        const profit = total - govt - expenseShare;

        return `
            <tr>
                <td><strong>${d.refCode}</strong></td>
                <td>${d.clientName || d.companyName || '-'}</td>
                <td>AED ${govt.toFixed(2)}</td>
                <td>AED ${expenseShare.toFixed(2)}</td>
                <td><strong>AED ${total.toFixed(2)}</strong></td>
                <td style="color: var(--accent-green);">AED ${totalPaid.toFixed(2)}</td>
                <td style="color: ${balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">AED ${balance.toFixed(2)}</td>
                <td style="color: var(--primary); font-weight: bold;">AED ${profit.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

function renderAccountsLedgerDetail(refCode) {
    state.selectedDocRefForLedger = refCode;
    const doc = state.documents.find(d => d.refCode === refCode);
    if (!doc) return;

    const total = parseFloat(doc.totalAmt) || parseFloat(doc.total) || parseFloat(doc.amount) || 0;
    const advance = parseFloat(doc.advanceAmt) || 0;
    const govt = parseFloat(doc.govtAmt) || 0;

    const payments = doc.paymentLogs ? Object.values(doc.paymentLogs).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
    const totalPaid = advance + payments;
    const remaining = total - totalPaid;

    const docMonth = (doc.createdDate || '').slice(0, 7);
    const monthDocs = state.documents.filter(d => (d.createdDate || '').startsWith(docMonth));
    const monthExpenses = state.monthlyExpenses ? state.monthlyExpenses.filter(e => e.month === docMonth).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
    const expenseShare = monthDocs.length > 0 ? (monthExpenses / monthDocs.length) : 0;
    const profit = total - govt - expenseShare;

    document.getElementById('acc-card-total').innerText = `AED ${total.toFixed(2)}`;
    document.getElementById('acc-card-advance').innerText = `AED ${advance.toFixed(2)}`;
    document.getElementById('acc-card-payments').innerText = `AED ${payments.toFixed(2)}`;
    document.getElementById('acc-card-remaining').innerText = `AED ${remaining.toFixed(2)}`;
    document.getElementById('acc-card-profit').innerText = `AED ${profit.toFixed(2)}`;

    const tbody = document.getElementById('acc-payment-logs-tbody');
    if (!tbody) return;

    if (!doc.paymentLogs) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No payment logs recorded for this invoice.</td></tr>`;
        return;
    }

    const logKeys = Object.keys(doc.paymentLogs);
    tbody.innerHTML = logKeys.map(k => {
        const log = doc.paymentLogs[k];
        return `
            <tr>
                <td>${log.date || '-'}</td>
                <td>AED ${(parseFloat(log.amount) || 0).toFixed(2)}</td>
                <td>${log.note || '-'}</td>
                <td style="text-align: center;">
                    <button onclick="deletePaymentLog('${refCode}', '${k}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function openMonthlyExpenseModal() {
    document.getElementById('monthly-expense-modal').style.display = 'flex';
}

function closeMonthlyExpenseModal() {
    document.getElementById('monthly-expense-modal').style.display = 'none';
}

function saveMonthlyExpenseData() {
    const month = document.getElementById('exp-input-month').value;
    const title = document.getElementById('exp-input-title').value.trim();
    const amount = parseFloat(document.getElementById('exp-input-amount').value) || 0;

    if (!title || !month) {
        showCustomModal('Warning', 'Please fill in target month and title.');
        return;
    }

    db.ref('monthlyExpenses').push({ month, title, amount }, (err) => {
        if (!err) closeMonthlyExpenseModal();
    });
}

function deleteMonthlyExpense(id) {
    db.ref(`monthlyExpenses/${id}`).remove();
}

function promptEditAdvance() {
    const refCode = state.selectedDocRefForLedger;
    if (!refCode) return;
    const doc = state.documents.find(d => d.refCode === refCode);
    
    const newAdvance = prompt("Enter updated advance amount paid (AED):", doc ? doc.advanceAmt || 0 : 0);
    if (newAdvance !== null) {
        db.ref(`documents/${refCode}/advanceAmt`).set(parseFloat(newAdvance) || 0);
    }
}

function openAddPaymentModal() {
    document.getElementById('pay-input-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('pay-input-amount').value = '';
    document.getElementById('pay-input-note').value = '';
    document.getElementById('payment-modal').style.display = 'flex';
}

function closeAddPaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function savePaymentLogData() {
    const refCode = state.selectedDocRefForLedger;
    if (!refCode) return;

    const payload = {
        date: document.getElementById('pay-input-date').value,
        amount: parseFloat(document.getElementById('pay-input-amount').value) || 0,
        note: document.getElementById('pay-input-note').value.trim()
    };

    db.ref(`documents/${refCode}/paymentLogs`).push(payload, (err) => {
        if (!err) closeAddPaymentModal();
    });
}

function deletePaymentLog(refCode, logKey) {
    db.ref(`documents/${refCode}/paymentLogs/${logKey}`).remove();
}

function printPaymentStatusStatement() {
    const refCode = state.selectedDocRefForLedger;
    if (!refCode) return;
    previewInvoiceDocument(refCode);
}

function renderAccountsLedgerSummaryTotals() {
    const summaryContainer = document.getElementById('acc-ledger-summary-cards');
    if (!summaryContainer) return;

    if (!state.documents || state.documents.length === 0) {
        summaryContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted);">No records available for summary.</div>`;
        return;
    }

    let grandTotal = 0;
    let grandPaid = 0;
    let grandBalance = 0;
    let grandProfit = 0;
    let grandGovt = 0;

    state.documents.forEach(d => {
        const total = parseFloat(d.totalAmt) || parseFloat(d.total) || parseFloat(d.amount) || 0;
        const govt = parseFloat(d.govtAmt) || 0;
        const advance = parseFloat(d.advanceAmt) || 0;
        
        const payments = d.paymentLogs ? Object.values(d.paymentLogs).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
        const totalPaid = advance + payments;
        const balance = total - totalPaid;

        const docMonth = (d.createdDate || '').slice(0, 7);
        const monthDocs = state.documents.filter(doc => (doc.createdDate || '').startsWith(docMonth));
        const monthExpenses = state.monthlyExpenses ? state.monthlyExpenses.filter(e => e.month === docMonth).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
        const expenseShare = monthDocs.length > 0 ? (monthExpenses / monthDocs.length) : 0;

        const profit = total - govt - expenseShare;

        grandTotal += total;
        grandPaid += totalPaid;
        grandBalance += balance;
        grandProfit += profit;
        grandGovt += govt;
    });
}
