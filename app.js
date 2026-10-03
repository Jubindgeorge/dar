document.addEventListener('DOMContentLoaded', () => {
    initFirebaseListeners();
});

function previewInvoiceDocument(refCode) {
    const doc = state.documents.find(d => d.refCode === refCode);
    if (!doc) return;

    const modalBody = document.getElementById('p-content-container');
    if (modalBody) {
        modalBody.innerHTML = generateReferenceDocHTML(doc, "INVOICE / فاتورة");
        document.getElementById('document-preview-modal').style.display = 'flex';
    }
}