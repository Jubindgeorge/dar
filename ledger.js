// ledger.js - Harmonized with robust fallback mapping for totalAmount and advanceAmount

window.renderAccountsLedgerMaster = function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select) return;
    
    const currentSelected = select.value;
    select.innerHTML = '<option value="">-- Choose Invoice Reference --</option>';

    const docs = state.documents || [];
    docs.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.refCode;
        
        // Robust fallback mapping for totals
        const totalVal = Number(doc.totalAmount || doc.totalAmt || doc.total || doc.amount || 0);
        opt.textContent = `${doc.refCode} - ${doc.clientName || doc.companyName || 'Client'} [AED ${totalVal.toFixed(2)}] (${doc.companyName || 'General'})`;
        
        if (doc.refCode === currentSelected) opt.selected = true;
        select.appendChild(opt);
    });

    renderMonthlyExpensesTable();
    if (currentSelected) {
        renderAccountsLedgerDetail(currentSelected);
    } else if (docs.length > 0) {
        select.value = docs[0].refCode;
        renderAccountsLedgerDetail(docs[0].refCode);
    }

    renderFullLedgerTableBody();
};

window.renderAccountsLedgerDetail = function(refCode) {
    const doc = (state.documents || []).find(d => d.refCode === refCode);
    if (!doc) return;

    doc.advanceAmount = Number(doc.advanceAmount || doc.advance || 0);
    doc.totalAmount = Number(doc.totalAmount || doc.totalAmt || doc.total || doc.amount || 0);
    doc.paymentLogs = doc.paymentLogs || [];

    const logsTotal = doc.paymentLogs.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPaid = doc.advanceAmount + logsTotal;
    const remaining = Math.max(0, doc.totalAmount - totalPaid);

    const docMonth = doc.createdDate ? doc.createdDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const monthlyExpenses = state.monthlyExpenses || [];
    const matchingExpenses = monthlyExpenses.filter(e => e.month === docMonth);
    const totalMonthExp = matchingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const totalInvoicesInMonth = (state.documents || []).filter(d => (d.createdDate || '').startsWith(docMonth)).length || 1;
    const expenseShare = totalMonthExp / totalInvoicesInMonth;

    const govtFee = Number(doc.govtFee || 0);
    const calculatedProfit = doc.totalAmount - govtFee - expenseShare;

    // Update UI Summary Cards safely
    const cardTotal = document.getElementById('acc-card-total');
    const cardAdvance = document.getElementById('acc-card-advance');
    const cardPayments = document.getElementById('acc-card-payments');
    const cardRemaining = document.getElementById('acc-card-remaining');
    const cardProfit = document.getElementById('acc-card-profit');

    if (cardTotal) cardTotal.innerText = `AED ${doc.totalAmount.toFixed(2)}`;
    if (cardAdvance) cardAdvance.innerText = `AED ${doc.advanceAmount.toFixed(2)}`;
    if (cardPayments) cardPayments.innerText = `AED ${totalPaid.toFixed(2)}`;
    if (cardRemaining) cardRemaining.innerText = `AED ${remaining.toFixed(2)}`;
    if (cardProfit) cardProfit.innerText = `AED ${calculatedProfit.toFixed(2)}`;

    const tbody = document.getElementById('acc-payment-logs-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        
        let allPayments = [];
        if (doc.advanceAmount > 0) {
            allPayments.push({
                date: doc.createdDate || 'Initial',
                amount: doc.advanceAmount,
                note: 'Advance Payment',
                isAdvance: true
            });
        }
        
        doc.paymentLogs.forEach((log, originalIndex) => {
            allPayments.push({
                date: log.date || '-',
                amount: Number(log.amount || 0),
                note: log.note || 'Direct Payment',
                isAdvance: false,
                index: originalIndex
            });
        });

        allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (allPayments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No payment records found for this invoice.</td></tr>`;
        } else {
            allPayments.forEach((pay) => {
                if (pay.isAdvance) {
                    tbody.innerHTML += `
                        <tr>
                            <td>${pay.date}</td>
                            <td style="color: var(--accent-green); font-weight: bold;">AED ${pay.amount.toFixed(2)}</td>
                            <td><span class="badge" style="background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">Advance</span> ${pay.note}</td>
                            <td style="text-align: center;"><button onclick="promptEditAdvance()" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Edit Advance</button></td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML += `
                        <tr>
                            <td>${pay.date}</td>
                            <td style="color: var(--accent-green); font-weight: bold;">AED ${pay.amount.toFixed(2)}</td>
                            <td>${pay.note}</td>
                            <td style="text-align: center;"><button onclick="deletePaymentLog('${doc.refCode}',${pay.index})" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button></td>
                        </tr>
                    `;
                }
            });
        }
    }
};

window.renderFullLedgerTableBody = function() {
    const tbody = document.getElementById('acc-full-ledger-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const docs = state.documents || [];
    const monthlyExpenses = state.monthlyExpenses || [];

    if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No financial ledger records found.</td></tr>`;
        return;
    }

    docs.forEach(doc => {
        const docMonth = doc.createdDate ? doc.createdDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
        const matchingExpenses = monthlyExpenses.filter(e => e.month === docMonth);
        const totalMonthExp = matchingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const totalInvoicesInMonth = docs.filter(d => (d.createdDate || '').startsWith(docMonth)).length || 1;
        const expenseShare = totalMonthExp / totalInvoicesInMonth;

        const govtFee = Number(doc.govtFee || 0);
        const totalAmt = Number(doc.totalAmount || doc.totalAmt || doc.total || doc.amount || 0);
        const advance = Number(doc.advanceAmount || doc.advance || 0);
        const logsTotal = (doc.paymentLogs || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalPaid = advance + logsTotal;
        const balance = Math.max(0, totalAmt - totalPaid);
        const profit = totalAmt - govtFee - expenseShare;
        const clientLabel = doc.clientName || doc.companyName || '-';

        tbody.innerHTML += `
            <tr>
                <td><strong>${doc.refCode}</strong></td>
                <td>${clientLabel}</td>
                <td>AED ${govtFee.toFixed(2)}</td>
                <td>AED ${expenseShare.toFixed(2)}</td>
                <td style="font-weight: bold; color: var(--primary);">AED ${totalAmt.toFixed(2)}</td>
                <td style="color: var(--accent-green);">AED ${totalPaid.toFixed(2)}</td>
                <td style="color: var(--accent-red);">AED ${balance.toFixed(2)}</td>
                <td style="font-weight: bold;">AED ${profit.toFixed(2)}</td>
            </tr>
        `;
    });
};

window.printPaymentStatusStatement = function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) {
        alert("Please select a valid invoice reference first.");
        return;
    }

    const doc = (state.documents || []).find(d => d.refCode === select.value);
    if (!doc) return;

    doc.advanceAmount = Number(doc.advanceAmount || doc.advance || 0);
    doc.totalAmount = Number(doc.totalAmount || doc.totalAmt || doc.total || doc.amount || 0);
    doc.paymentLogs = doc.paymentLogs || [];

    const totalPaid = doc.advanceAmount + doc.paymentLogs.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = Math.max(0, doc.totalAmount - totalPaid);

    document.getElementById('p-doc-title').innerHTML = `PAYMENT STATUS STATEMENT / <span style="font-family: 'Amiri', serif;">كشف حساب الدفعات</span>`;
    document.getElementById('p-client-name').innerText = doc.clientName || doc.companyName || '-';
    document.getElementById('p-client-name-ar').innerText = doc.clientNameAr || '';
    document.getElementById('p-doc-ref').innerText = `Ref ID: ${doc.refCode}`;
    document.getElementById('p-created-date').innerText = `Date: ${new Date().toISOString().substring(0, 10)}`;

    const pTbody = document.getElementById('p-table-body');
    pTbody.innerHTML = `
        <tr>
            <td colspan="2" style="padding: 12px; font-weight: bold; border-bottom: 1px solid #cbd5e1;">Invoice Total Amount</td>
            <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold; color: #1c365d; border-bottom: 1px solid #cbd5e1;">AED ${doc.totalAmount.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 12px; border-bottom: 1px solid #cbd5e1;">Advance Payment (${doc.createdDate || 'Initial'})</td>
            <td colspan="2" style="padding: 12px; text-align: right; color: #22c55e; font-weight: bold; border-bottom: 1px solid #cbd5e1;">AED ${doc.advanceAmount.toFixed(2)}</td>
        </tr>
    `;

    doc.paymentLogs.forEach((log, idx) => {
        pTbody.innerHTML += `
            <tr>
                <td colspan="2" style="padding: 12px; border-bottom: 1px solid #cbd5e1;">Payment Log #${idx + 1} (${log.date}) - ${log.note || 'Direct'}</td>
                <td colspan="2" style="padding: 12px; text-align: right; color: #22c55e; border-bottom: 1px solid #cbd5e1;">AED ${Number(log.amount).toFixed(2)}</td>
            </tr>
        `;
    });

    pTbody.innerHTML += `
        <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="2" style="padding: 14px; border-top: 2px solid #b8860b;">Total Paid to Date</td>
            <td colspan="2" style="padding: 14px; text-align: right; color: #22c55e; border-top: 2px solid #b8860b;">AED ${totalPaid.toFixed(2)}</td>
        </tr>
        <tr style="background: #fef2f2; font-weight: bold;">
            <td colspan="2" style="padding: 14px; border-top: 1px solid #f87171;">Remaining Balance Due</td>
            <td colspan="2" style="padding: 14px; text-align: right; color: #ef4444; border-top: 1px solid #f87171;">AED ${remaining.toFixed(2)}</td>
        </tr>
    `;

    document.getElementById('document-preview-modal').style.display = 'flex';
};

window.openAddPaymentModal = function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) {
        alert("Please select an invoice reference first.");
        return;
    }
    document.getElementById('pay-input-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('pay-input-amount').value = '';
    document.getElementById('pay-input-note').value = '';
    document.getElementById('payment-modal').style.display = 'flex';
};

window.closeAddPaymentModal = function() {
    document.getElementById('payment-modal').style.display = 'none';
};

window.savePaymentLogData = function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) return;

    const doc = (state.documents || []).find(d => d.refCode === select.value);
    if (!doc) return;

    const date = document.getElementById('pay-input-date').value;
    const amount = Number(document.getElementById('pay-input-amount').value);
    const note = document.getElementById('pay-input-note').value;

    if (!amount || amount <= 0) {
        alert("Please enter a valid payment amount.");
        return;
    }

    doc.paymentLogs = doc.paymentLogs || [];
    doc.paymentLogs.push({ date, amount, note });

    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    closeAddPaymentModal();
    renderAccountsLedgerDetail(doc.refCode);
    renderFullLedgerTableBody();
};

window.deletePaymentLog = function(refCode, index) {
    const doc = (state.documents || []).find(d => d.refCode === refCode);
    if (!doc || !doc.paymentLogs) return;

    doc.paymentLogs.splice(index, 1);
    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    renderAccountsLedgerDetail(refCode);
    renderFullLedgerTableBody();
};

window.openMonthlyExpenseModal = function() {
    document.getElementById('exp-input-amount').value = '';
    document.getElementById('exp-input-title').value = '';
    document.getElementById('monthly-expense-modal').style.display = 'flex';
};

window.closeMonthlyExpenseModal = function() {
    document.getElementById('monthly-expense-modal').style.display = 'none';
};

window.saveMonthlyExpenseData = function() {
    const month = document.getElementById('exp-input-month').value;
    const title = document.getElementById('exp-input-title').value;
    const amount = Number(document.getElementById('exp-input-amount').value);

    if (!title || !amount) {
        alert("Please fill in all expense fields.");
        return;
    }

    state.monthlyExpenses = state.monthlyExpenses || [];
    state.monthlyExpenses.push({ month, title, amount });

    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    closeMonthlyExpenseModal();
    renderMonthlyExpensesTable();
    renderFullLedgerTableBody();
};

window.renderMonthlyExpensesTable = function() {
    const tbody = document.getElementById('monthly-expenses-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const expenses = state.monthlyExpenses || [];
    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No monthly operating expenses added.</td></tr>`;
        return;
    }

    expenses.forEach((exp, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${exp.month}</td>
                <td>${exp.title}</td>
                <td style="color: var(--accent-green);">AED ${Number(exp.amount).toFixed(2)}</td>
                <td style="text-align: center;"><button onclick="deleteMonthlyExpense(${index})" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button></td>
            </tr>
        `;
    });
};

window.deleteMonthlyExpense = function(index) {
    if (state.monthlyExpenses) {
        state.monthlyExpenses.splice(index, 1);
        if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
        renderMonthlyExpensesTable();
        renderFullLedgerTableBody();
    }
};

window.promptEditAdvance = function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) return;

    const doc = (state.documents || []).find(d => d.refCode === select.value);
    if (!doc) return;

    const currentAdv = doc.advanceAmount || doc.advance || 0;
    const newAdvance = prompt("Enter new Advance Payment amount (AED):", currentAdv);
    if (newAdvance !== null && !isNaN(newAdvance)) {
        doc.advanceAmount = Number(newAdvance);
        if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
        renderAccountsLedgerDetail(doc.refCode);
        renderFullLedgerTableBody();
    }
};