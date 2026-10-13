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

function showFirebaseReadError(collection, error) {
    console.error('Firebase ' + collection + ' listener failed:', error);
    const message = error && error.code === 'PERMISSION_DENIED'
        ? 'Firebase denied access to ' + collection + '. Verify the published database rules allow your signed-in UID and verified email.'
        : 'Unable to load ' + collection + '. Check your internet connection and Firebase configuration.';
    if (typeof showCustomModal === 'function') showCustomModal('Records not loaded', message);
    else alert(message);
}

function initFirebaseListeners() {
    if (!db) { console.error('Firebase database is unavailable. Check config.js and Firebase scripts.'); return; }

    db.ref('clients').on('value', snapshot => {
        const val = snapshot.val();
        state.clients = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderClientsTable === 'function') renderClientsTable();
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
    }, error => showFirebaseReadError('clients', error));

    db.ref('documents').on('value', snapshot => {
        const val = snapshot.val();
        state.documents = val ? Object.keys(val).map(k => ({ refCode: k, ...val[k] })) : [];
        if (typeof renderDocumentsTable === 'function') renderDocumentsTable();
        if (typeof renderWorksTable === 'function') renderWorksTable();
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
        if (typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
    }, error => showFirebaseReadError('documents', error));

    db.ref('services').on('value', snapshot => {
        const val = snapshot.val();
        state.services = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderServicesCatalog === 'function') renderServicesCatalog();
        if (typeof populateStudioInjectorSelect === 'function') populateStudioInjectorSelect();
    }, error => showFirebaseReadError('services', error));

    db.ref('monthlyExpenses').on('value', snapshot => {
        const val = snapshot.val();
        state.monthlyExpenses = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderMonthlyExpensesTable === 'function') renderMonthlyExpensesTable();
        if (typeof renderAccountsLedgerMaster === 'function') renderAccountsLedgerMaster();
    }, error => showFirebaseReadError('monthlyExpenses', error));
}