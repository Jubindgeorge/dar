// Ledger & Expense Management State
let monthlyExpenses = [
    { title: 'Office Rent - Downtown', amount: 5000 },
    { title: 'High-speed Internet & Telecom', amount: 600 },
    { title: 'Administrative Utilities', amount: 400 }
];

function renderLedgerView() {
    const expContainer = document.getElementById('expenses-list-container');
    expContainer.innerHTML = monthlyExpenses.map((e, idx) => `
        <div class="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-sm">
            <span class="text-slate-700 font-medium">${e.title}</span>
            <div class="flex items-center space-x-3">
                <span class="font-bold text-slate-900">AED ${e.amount.toLocaleString()}</span>
                <button onclick="removeMonthlyExpense(${idx})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join('');

    const financials = computeLedgerFinancials();
    document.getElementById('ledger-gross-revenue').innerText = `AED ${financials.grossRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('ledger-govt-fees').innerText = `AED ${financials.totalGovtFees.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('ledger-opex').innerText = `AED ${financials.totalOpex.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('ledger-net-profit').innerText = `AED ${financials.netProfit.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function addMonthlyExpense() {
    const title = document.getElementById('expense-title-input').value;
    const amount = Number(document.getElementById('expense-amount-input').value);
    if (!title || !amount) return alert('Please provide title and amount');

    monthlyExpenses.push({ title, amount });
    document.getElementById('expense-title-input').value = '';
    document.getElementById('expense-amount-input').value = '';
    renderLedgerView();
    showToast('Operating expense added');
}

function removeMonthlyExpense(idx) {
    monthlyExpenses.splice(idx, 1);
    renderLedgerView();
}

function computeLedgerFinancials() {
    const grossRevenue = state.documents.reduce((sum, d) => sum + Number(d.total || 0), 0);
    // Estimate government fee component (~40% average for document clearing services if not explicitly split)
    const totalGovtFees = grossRevenue * 0.40;
    const totalOpex = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = grossRevenue - totalGovtFees - totalOpex;

    return {
        grossRevenue,
        totalGovtFees,
        totalOpex,
        netProfit
    };
}
