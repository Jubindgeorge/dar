// state.js
let state = {
    clients: [],
    documents: [],
    services: [],
    monthlyExpenses: [],
    currentStudioMode: 'Invoice',
    currentStudioItems: [],
    activeEditingId: null,
    activeViewingClientId: null,
    activeViewingCompanyWorksName: null,
    activeWorksBranch: 'company'
};

function initFirebaseListeners() {
    if (!db) { console.error('Firebase database is unavailable. Check config.js and Firebase scripts.'); return; }

    db.ref('clients').on('value', snapshot => {
        const val = snapshot.val();
        state.clients = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderClientsTable === 'function') renderClientsTable();
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
    }, error => console.error('Firebase clients listener failed:', error));

    db.ref('documents').on('value', snapshot => {
        const val = snapshot.val();
        state.documents = val ? Object.keys(val).map(k => ({ refCode: k, ...val[k] })) : [];
        if (typeof renderDocumentsTable === 'function') renderDocumentsTable();
        if (typeof renderWorksTable === 'function') renderWorksTable();
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
        if (typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
    }, error => console.error('Firebase documents listener failed:', error));

    db.ref('services').on('value', snapshot => {
        const val = snapshot.val();
        state.services = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderServicesCatalog === 'function') renderServicesCatalog();
        if (typeof populateStudioInjectorSelect === 'function') populateStudioInjectorSelect();
    }, error => console.error('Firebase services listener failed:', error));

    db.ref('monthlyExpenses').on('value', snapshot => {
        const val = snapshot.val();
        state.monthlyExpenses = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderMonthlyExpensesTable === 'function') renderMonthlyExpensesTable();
        if (typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
    }, error => console.error('Firebase monthlyExpenses listener failed:', error));
}