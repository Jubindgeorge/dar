function openStudioForNew() {
    state.currentStudioItems = [];
    alert("Studio opened for creating a new document.");
}

function openStudioForEdit(refCode) {
    const doc = state.documents.find(d => d.refCode === refCode);
    if (!doc) return;
    state.currentStudioItems = doc.items ? [...doc.items] : [];
    alert("Editing Document: " + refCode);
}