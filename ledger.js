// ledger.js - Harmonized with robust fallback mapping for totalAmount and advanceAmount


window.renderCompanyStaffLedger = function() {
    const tbody = document.getElementById('ledger-company-staff-tbody');
    if (!tbody) return;
    const companySelect = document.getElementById('ledger-staff-company');
    const companies = Array.isArray(state.clients) ? state.clients : [];
    if (companySelect) {
        const selected = companySelect.value || '';
        const options = '<option value="">All companies</option>' + companies
            .slice().sort((a,b)=>String(a.companyName||'').localeCompare(String(b.companyName||'')))
            .map(company=>'<option value="'+escapeHtml(company.id||'')+'">'+escapeHtml(company.companyName||'Unnamed company')+'</option>').join('');
        if (companySelect.innerHTML !== options) companySelect.innerHTML = options;
        companySelect.value = selected;
    }
    const selectedCompanyId = companySelect?.value || '';
    const query = String(document.getElementById('ledger-staff-search')?.value || '').trim().toLowerCase();
    const allStaff = Array.isArray(state.staff) ? state.staff : [];
    const rows = allStaff.filter(person => {
        const company = companies.find(item => item.id === person.companyId);
        const companyName = person.companyName || company?.companyName || '';
        const belongsToSelected = !selectedCompanyId ||
            person.companyId === selectedCompanyId ||
            (!person.companyId && String(companyName).toLowerCase() === String(companies.find(c=>c.id===selectedCompanyId)?.companyName||'').toLowerCase());
        const haystack = [person.staffCode,person.staffId,person.fullName,person.personNumber,person.labourCardNumber,person.passportNumber,person.nationality,person.designation,companyName].map(v=>String(v||'').toLowerCase()).join(' ');
        return belongsToSelected && (!query || haystack.includes(query));
    }).sort((a,b)=>String(a.fullName||'').localeCompare(String(b.fullName||'')));
    const count = document.getElementById('ledger-staff-count');
    if (count) count.textContent = rows.length + (rows.length === 1 ? ' staff' : ' staff');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No saved staff records found for this company or search.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(person => {
        const company = companies.find(item => item.id === person.companyId);
        return '<tr>' +
            '<td><strong>'+escapeHtml(person.staffCode || person.staffId || '-')+'</strong></td>' +
            '<td>'+escapeHtml(person.fullName || '-')+'</td>' +
            '<td>'+escapeHtml(person.companyName || company?.companyName || '-')+'</td>' +
            '<td>'+escapeHtml(person.personNumber || '-')+'</td>' +
            '<td>'+escapeHtml(person.nationality || '-')+'</td>' +
            '<td>'+escapeHtml(person.designation || '-')+'</td>' +
            '<td>'+escapeHtml(person.labourCardNumber || '-')+'</td>' +
            '<td>'+escapeHtml(person.labourCardExpiry || '-')+'</td>' +
            '<td>'+escapeHtml(person.passportNumber || '-')+'</td>' +
        '</tr>';
    }).join('');
};

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
        const totalVal = Number(getDarDocumentAmount(doc)) || 0;
        opt.textContent = `${doc.refCode} - ${doc.clientName || doc.companyName || 'Client'} [AED ${totalVal.toFixed(2)}] (${doc.companyName || 'General'})`;
        
        if (doc.refCode === currentSelected) opt.selected = true;
        select.appendChild(opt);
    });

    renderMonthlyExpensesTable();
    renderCompanyStaffLedger();
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

    doc.advanceAmount = Number(doc.advanceAmount ?? doc.advanceAmt ?? doc.advance ?? 0);
    doc.totalAmount = Number(getDarDocumentAmount(doc)) || 0;
    const paymentLogs = window.getDarDocumentPaymentLogs(doc);
    const logsTotal = paymentLogs.reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);
    const totalPaid = window.getDarDocumentPaidAmount(doc);
    const remaining = Math.max(0, doc.totalAmount - totalPaid);

    const invoiceDate = doc.transactionDate || doc.createdDate || doc.date || '';
    const docMonth = invoiceDate ? invoiceDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const monthlyExpenses = state.monthlyExpenses || [];
    const matchingExpenses = monthlyExpenses.filter(e => e.month === docMonth);
    const totalMonthExp = matchingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const totalInvoicesInMonth = (state.documents || []).filter(d => (d.transactionDate || d.createdDate || d.date || '').startsWith(docMonth)).length || 1;
    const expenseShare = totalMonthExp / totalInvoicesInMonth;

    const govtFee = Number(doc.govtFee ?? doc.govtAmt ?? 0);
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
        const displayedAdvanceAmount = doc.advanceIncludedInPaymentLogs === true ? 0 :
            (doc.advanceIncludedInPaymentLogs === false
                ? Math.max(0, Number(doc.paymentAdvanceBalance ?? doc.advanceAmount) || 0)
                : Math.max(0, doc.advanceAmount - logsTotal));
        if (displayedAdvanceAmount > 0) {
            allPayments.push({
                date: doc.transactionDate || doc.createdDate || 'Initial',
                amount: displayedAdvanceAmount,
                note: 'Advance Payment',
                isAdvance: true
            });
        }
        
        paymentLogs.forEach((log, originalIndex) => {
            allPayments.push({
                date: log.date || '-',
                amount: Number(log.amount || 0),
                note: [log.method, log.reference, log.note].filter(Boolean).join(' · ') || 'Direct Payment',
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
                            <td>${window.darFormatTableDate ? window.darFormatTableDate(pay.date) : pay.date}</td>
                            <td style="color: var(--accent-green); font-weight: bold;">AED ${pay.amount.toFixed(2)}</td>
                            <td><span class="badge" style="background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">Advance</span> ${pay.note}</td>
                            <td style="text-align: center;"><button onclick="promptEditAdvance()" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Edit Advance</button></td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML += `
                        <tr>
                            <td>${window.darFormatTableDate ? window.darFormatTableDate(pay.date) : pay.date}</td>
                            <td style="color: var(--accent-green); font-weight: bold;">AED ${pay.amount.toFixed(2)}</td>
                            <td>${pay.note}</td>
                            <td style="text-align: center;"><button onclick="editDarPaymentMethod('${doc.refCode}',${pay.index})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Change Method</button> <button onclick="deletePaymentLog('${doc.refCode}',${pay.index})" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button></td>
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

    const allDocs = state.documents || [];
    const ledgerFrom = document.getElementById('ledger-date-from')?.value || '';
    const ledgerTo = document.getElementById('ledger-date-to')?.value || '';
    const ledgerSearch = (document.getElementById('ledger-search')?.value || '').trim().toLowerCase();
    const financialDocs = allDocs.filter(doc => (doc.type || 'Invoice') !== 'Quotation');
    const docs = financialDocs.filter(doc => {
        const date = String(doc.transactionDate || doc.createdDate || doc.date || '').slice(0,10);
        const matchesDate = (!ledgerFrom || (date && date >= ledgerFrom)) && (!ledgerTo || (date && date <= ledgerTo));
        const matchesSearch = [doc.refCode, doc.clientName, doc.companyName, doc.packageName, doc.serviceName, doc.title].some(value => String(value || '').toLowerCase().includes(ledgerSearch));
        return matchesDate && matchesSearch;
    });
    const monthlyExpenses = state.monthlyExpenses || [];

    if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted);">No financial ledger records found.</td></tr>`;
        return;
    }

    docs.forEach(doc => {
        const invoiceDate = doc.transactionDate || doc.createdDate || doc.date || '';
        const docMonth = invoiceDate ? invoiceDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
        const matchingExpenses = monthlyExpenses.filter(e => e.month === docMonth);
        const totalMonthExp = matchingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const totalInvoicesInMonth = financialDocs.filter(d => (d.transactionDate || d.createdDate || d.date || '').startsWith(docMonth)).length || 1;
        const expenseShare = totalMonthExp / totalInvoicesInMonth;

        const govtFee = Number(doc.govtFee ?? doc.govtAmt ?? 0);
        const totalAmt = Number(getDarDocumentAmount(doc)) || 0;
        const totalPaid = window.getDarDocumentPaidAmount(doc);
        const balance = Math.max(0, totalAmt - totalPaid);
        const profit = totalAmt - govtFee - expenseShare;
        const clientLabel = escapeHtml(doc.clientName || doc.companyName || '-');

        tbody.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(doc.refCode || '')}</strong></td>
                <td>${window.darFormatTableDate ? window.darFormatTableDate(doc.transactionDate || doc.createdDate || doc.date) : (doc.createdDate || doc.date || '-')}</td>
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

    doc.advanceAmount = Number(doc.advanceAmount ?? doc.advanceAmt ?? doc.advance ?? 0);
    doc.totalAmount = Number(doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount ?? 0);
    const paymentLogs = window.getDarDocumentPaymentLogs(doc);
    const logsTotal = paymentLogs.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0);
    const totalPaid = window.getDarDocumentPaidAmount(doc);
    const remaining = Math.max(0, doc.totalAmount - totalPaid);
    const displayedAdvanceAmount = doc.advanceIncludedInPaymentLogs === true ? 0 :
        (doc.advanceIncludedInPaymentLogs === false
            ? Math.max(0, Number(doc.paymentAdvanceBalance ?? doc.advanceAmount) || 0)
            : Math.max(0, doc.advanceAmount - logsTotal));

    document.getElementById('p-doc-title').innerHTML = `PAYMENT STATUS STATEMENT / <span style="font-family: 'Amiri', serif;">كشف حساب الدفعات</span>`;
    document.getElementById('p-client-name').innerText = doc.clientName || doc.companyName || '-';
    document.getElementById('p-client-name-ar').innerText = doc.clientNameAr || '';
    document.getElementById('p-doc-ref').innerText = `Ref ID: ${doc.refCode}`;
    document.getElementById('p-created-date').innerText = `Date: ${new Date().toISOString().substring(0, 10)}`;

    const pTbody = document.getElementById('p-table-body');
    const advanceRow = displayedAdvanceAmount > 0
        ? '<tr><td colspan="2" style="padding:12px;border-bottom:1px solid #cbd5e1;">Advance Payment (' + escapeHtml(doc.createdDate || 'Initial') + ')</td><td colspan="2" style="padding:12px;text-align:right;color:#22c55e;font-weight:bold;border-bottom:1px solid #cbd5e1;">AED ' + displayedAdvanceAmount.toFixed(2) + '</td></tr>'
        : '';
    pTbody.innerHTML = `
        <tr>
            <td colspan="2" style="padding: 12px; font-weight: bold; border-bottom: 1px solid #cbd5e1;">Invoice Total Amount</td>
            <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold; color: #1c365d; border-bottom: 1px solid #cbd5e1;">AED ${doc.totalAmount.toFixed(2)}</td>
        </tr>
        ${advanceRow}
    `;

    paymentLogs.forEach((log, idx) => {
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

function transactDarDocument(refCode, update) {
    if (!db) return Promise.reject(new Error('Firebase is not connected.'));
    return new Promise((resolve, reject) => {
        db.ref('documents/' + refCode).transaction(update, (error, committed, snapshot) => {
            if (error) reject(error);
            else resolve({committed, snapshot});
        }, false);
    });
}

window.savePaymentLogData = async function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) return;
    const doc = (state.documents || []).find(d => d.refCode === select.value);
    if (!doc) return;
    const date = document.getElementById('pay-input-date').value;
    const amount = Number(document.getElementById('pay-input-amount').value);
    const note = document.getElementById('pay-input-note').value;
    if (!Number.isFinite(amount) || amount <= 0) { alert('Please enter a valid payment amount.'); return; }
    const payment = {date, transactionDate: date, amount, note, method: document.getElementById('pay-input-method')?.value || 'Other', reference: document.getElementById('pay-input-reference')?.value.trim() || '', createdAt: new Date().toISOString(), createdBy: firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown'};
    let validationError = '';
    try {
        const result = await transactDarDocument(doc.refCode, current => {
            if (!current) return;
            const total = Number(getDarDocumentAmount(current)) || 0;
            const paid = window.getDarDocumentPaidAmount(current);
            if (amount > Math.max(0, total - paid) + 0.005) {
                validationError = 'This payment is greater than the latest remaining balance. Refresh the invoice and try again.';
                return;
            }
            const logs = window.getDarDocumentPaymentLogs(current);
            let advanceIncluded = current.advanceIncludedInPaymentLogs;
            if (advanceIncluded == null) {
                const logged = logs.reduce((sum, entry) => sum + Math.max(0, Number(entry.amount) || 0), 0);
                // Keep the recognized legacy paid amount while separating only the
                // advance portion not already represented by historical log entries.
                current.paymentAdvanceBalance = Math.max(0, paid - logged);
                advanceIncluded = false;
            }
            logs.push(payment);
            current.paymentLogs = logs;
            current.advanceIncludedInPaymentLogs = advanceIncluded;
            current.updatedAt = new Date().toISOString();
            current.updatedBy = firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown';
            return current;
        });
        if (!result.committed) { alert(validationError || 'The invoice changed while saving. Refresh and retry.'); return; }
        Object.assign(doc, result.snapshot.val() || {});
        closeAddPaymentModal();
        renderAccountsLedgerDetail(doc.refCode);
        renderFullLedgerTableBody();
    } catch (error) {
        alert('Payment was not saved. Please retry after checking the connection.');
    }
};

window.editDarPaymentMethod = async function(refCode, index) {
    const doc = (state.documents || []).find(d => d.refCode === refCode);
    if (!doc) return;
    const selectedLogs = window.getDarDocumentPaymentLogs(doc);
    if (!Number.isInteger(index) || index < 0 || index >= selectedLogs.length) return;
    const targetFingerprint = JSON.stringify(selectedLogs[index]);
    const currentMethod = String(selectedLogs[index].method || 'Other');
    const allowed = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
    const answer = prompt('Change payment method to:\n1. Cash\n2. Bank Transfer\n3. Card\n4. Cheque\n5. Other\n\nEnter the method name:', currentMethod);
    if (answer === null) return;
    const method = allowed.find(value => value.toLowerCase() === answer.trim().toLowerCase());
    if (!method) { alert('Choose Cash, Bank Transfer, Card, Cheque, or Other.'); return; }
    if (method === currentMethod) return;
    if (!confirm('Update this saved payment method from "' + currentMethod + '" to "' + method + '"? The amount and invoice balance will remain unchanged.')) return;
    const actor = firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown';
    const changedAt = new Date().toISOString();
    try {
        const result = await transactDarDocument(refCode, current => {
            if (!current) return;
            const logs = window.getDarDocumentPaymentLogs(current);
            const currentIndex = logs.findIndex(entry => JSON.stringify(entry) === targetFingerprint);
            if (currentIndex < 0) return;
            const entry = logs[currentIndex];
            entry.methodHistory = Array.isArray(entry.methodHistory) ? entry.methodHistory : [];
            entry.methodHistory.push({from: String(entry.method || 'Other'), to: method, changedAt, changedBy: actor});
            entry.method = method;
            entry.updatedAt = changedAt;
            entry.updatedBy = actor;
            current.paymentLogs = logs;
            current.updatedAt = changedAt;
            current.updatedBy = actor;
            return current;
        });
        if (!result.committed) { alert('That payment entry changed or was removed by another user. Refresh the invoice and try again.'); return; }
        Object.assign(doc, result.snapshot.val() || {});
        renderAccountsLedgerDetail(refCode);
        renderFullLedgerTableBody();
        if (typeof window.renderFinanceCentre === 'function') window.renderFinanceCentre();
    } catch (error) {
        alert('Payment method was not changed. Please retry after checking the connection.');
    }
};

window.deletePaymentLog = async function(refCode, index) {
    const doc = (state.documents || []).find(d => d.refCode === refCode);
    if (!doc) return;
    const selectedLogs = window.getDarDocumentPaymentLogs(doc);
    if (!Number.isInteger(index) || index < 0 || index >= selectedLogs.length) return;
    const targetFingerprint = JSON.stringify(selectedLogs[index]);
    try {
        const result = await transactDarDocument(refCode, current => {
            if (!current) return;
            const logs = window.getDarDocumentPaymentLogs(current);
            const currentIndex = logs.findIndex(entry => JSON.stringify(entry) === targetFingerprint);
            if (currentIndex < 0) return;
            logs.splice(currentIndex, 1);
            current.paymentLogs = logs;
            current.updatedAt = new Date().toISOString();
            current.updatedBy = firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown';
            return current;
        });
        if (!result.committed) { alert('That payment entry changed or was removed by another user. Refresh the invoice.'); return; }
        Object.assign(doc, result.snapshot.val() || {});
        renderAccountsLedgerDetail(refCode);
        renderFullLedgerTableBody();
    } catch (error) {
        alert('Payment history was not changed because the update failed.');
    }
};

window.openMonthlyExpenseModal = function() {
    document.getElementById('exp-input-amount').value = '';
    document.getElementById('exp-input-title').value = '';
    const expenseDate = document.getElementById('exp-input-date');
    if (expenseDate) expenseDate.value = window.darDates ? window.darDates.todayISO() : new Date().toISOString().slice(0,10);
    document.getElementById('monthly-expense-modal').style.display = 'flex';
};

window.closeMonthlyExpenseModal = function() {
    document.getElementById('monthly-expense-modal').style.display = 'none';
};

window.saveMonthlyExpenseData = async function() {
    const month = document.getElementById('exp-input-month').value;
    const expenseDate = document.getElementById('exp-input-date')?.value || (window.darDates ? window.darDates.todayISO() : new Date().toISOString().slice(0,10));
    const title = document.getElementById('exp-input-title').value.trim();
    const amount = Number(document.getElementById('exp-input-amount').value);
    if (!title) { alert('Please enter an expense description.'); return; }
    if (!month) { alert('Please select the expense month.'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { alert('Please enter an expense amount greater than zero.'); return; }
    if (!db) { alert('Firebase is not connected. The expense was not saved.'); return; }
    const id = db.ref('monthlyExpenses').push().key;
    const expense = {id,month,date:expenseDate,transactionDate:expenseDate,title,amount,createdDate:expenseDate,updatedAt:new Date().toISOString(),updatedBy:firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown'};
    const {id:recordId,...patch} = expense;
    try {
        await saveStateToFirebase('monthlyExpenses', recordId, patch);
        state.monthlyExpenses = state.monthlyExpenses || [];
        const existingIndex = state.monthlyExpenses.findIndex(item => item.id === expense.id);
        if (existingIndex >= 0) state.monthlyExpenses[existingIndex] = expense;
        else state.monthlyExpenses.push(expense);
        closeMonthlyExpenseModal();
        renderMonthlyExpensesTable();
        renderFullLedgerTableBody();
    } catch (error) {
        alert('Expense was not saved. Please retry after checking the connection.');
    }
};

window.renderMonthlyExpensesTable = function() {
    const tbody = document.getElementById('monthly-expenses-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const expenseFrom = document.getElementById('expense-date-from')?.value || '';
    const expenseTo = document.getElementById('expense-date-to')?.value || '';
    const expenseSearch = (document.getElementById('expense-search')?.value || '').trim().toLowerCase();
    const expenses = (state.monthlyExpenses || []).filter(e => {
        const date = String(e.transactionDate || e.date || ((e.month || '') + '-01')).slice(0,10);
        const matchesDate = (!expenseFrom || (date && date >= expenseFrom)) && (!expenseTo || (date && date <= expenseTo));
        const matchesSearch = [e.title, e.month, e.date, e.amount].some(value => String(value ?? '').toLowerCase().includes(expenseSearch));
        return matchesDate && matchesSearch;
    }).slice().sort((a,b) => String(b.date || b.month || '').localeCompare(String(a.date || a.month || '')));
    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No monthly operating expenses added.</td></tr>`;
        return;
    }

    expenses.forEach(exp => {
        const originalIndex = (state.monthlyExpenses || []).indexOf(exp);
        tbody.innerHTML += `
            <tr>
                <td>${exp.date && window.darFormatTableDate ? window.darFormatTableDate(exp.date) : escapeHtml(exp.month)}</td>
                <td>${escapeHtml(exp.title)}</td>
                <td style="color: var(--accent-green);">AED ${Number(exp.amount).toFixed(2)}</td>
                <td style="text-align: center;"><button onclick="deleteMonthlyExpense(${originalIndex})" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button></td>
            </tr>
        `;
    });
};

window.deleteMonthlyExpense = async function(index) {
    const removed = state.monthlyExpenses?.[index];
    if (!removed) return;
    if (!removed.id) { alert('This expense has no saved record ID and cannot be safely moved to recovery.'); return; }
    try {
        await safeDeleteDarRecord('monthlyExpenses', removed.id);
        state.monthlyExpenses = state.monthlyExpenses.filter(item => item.id !== removed.id);
        renderMonthlyExpensesTable();
        renderFullLedgerTableBody();
    } catch (error) {
        // safeDeleteDarRecord already reports the failure and leaves the record intact.
    }
};

window.promptEditAdvance = async function() {
    const select = document.getElementById('acc-invoice-select');
    if (!select || !select.value) return;
    const doc = (state.documents || []).find(d => d.refCode === select.value);
    if (!doc) return;
    const currentAdv = doc.advanceAmount ?? doc.advanceAmt ?? doc.advance ?? 0;
    const newAdvance = prompt('Enter new Advance Payment amount (AED):', currentAdv);
    if (newAdvance === null || newAdvance.trim() === '' || !Number.isFinite(Number(newAdvance))) return;
    const value = Number(newAdvance);
    if (value < 0) { alert('Advance payment cannot be negative.'); return; }
    const total = Number(getDarDocumentAmount(doc)) || 0;
    const proposedPaid = window.getDarDocumentPaidAmount({...doc,advanceAmount:value,...(doc.advanceIncludedInPaymentLogs===false?{paymentAdvanceBalance:value}:{})});
    if (Math.max(value,proposedPaid) > total + 0.005) { alert('Advance and recorded payments cannot exceed the invoice total.'); return; }
    let validationError = '';
    try {
        const result = await transactDarDocument(doc.refCode, current => {
            if (!current) return;
            const totalNow = Number(getDarDocumentAmount(current)) || 0;
            const paidNow = window.getDarDocumentPaidAmount({...current,advanceAmount:value,...(current.advanceIncludedInPaymentLogs===false?{paymentAdvanceBalance:value}:{})});
            if (Math.max(value,paidNow) > totalNow + 0.005) {
                validationError = 'Advance and recorded payments cannot exceed the latest invoice total.';
                return;
            }
            current.advanceAmount = value;
            current.advanceAmt = value;
            if (current.advanceIncludedInPaymentLogs === false) current.paymentAdvanceBalance = value;
            current.updatedAt = new Date().toISOString();
            current.updatedBy = firebase.auth?.().currentUser?.email || firebase.auth?.().currentUser?.uid || 'Unknown';
            return current;
        });
        if (!result.committed) { alert(validationError || 'The invoice changed while saving. Refresh and retry.'); return; }
        Object.assign(doc, result.snapshot.val() || {});
        renderAccountsLedgerDetail(doc.refCode);
        renderFullLedgerTableBody();
    } catch (error) {
        alert('Advance payment was not updated. Please retry after checking the connection.');
    }
};

window.initAccountsLedgerView = window.initAccountsLedgerView || function () {
    if (typeof initFirebaseListeners === 'function') initFirebaseListeners();
    if (typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
};
