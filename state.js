const state = {
    clients: [],
    documents: [],
    services: [],
    monthlyExpenses: [],
    selectedCompanyForWorks: null,
    selectedDocRefForLedger: null,
    currentStudioItems: []
};

function initFirebaseListeners() {
    db.ref('clients').on('value', snapshot => {
        const val = snapshot.val();
        state.clients = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
        if (typeof renderClientsTable === 'function') renderClientsTable();
    });

    db.ref('documents').on('value', snapshot => {
        const val = snapshot.val();
        state.documents = val ? Object.keys(val).map(k => ({ refCode: k, ...val[k] })) : [];
        if (typeof renderDocumentsTable === 'function') renderDocumentsTable();
    });

    db.ref('services').on('value', snapshot => {
        const val = snapshot.val();
        state.services = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
    });
}