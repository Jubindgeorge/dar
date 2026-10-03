// Render Invoice Preview Modal
function openPreviewModal(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    document.getElementById('p-company-name').innerText = doc.companyName || '-';
    document.getElementById('p-client-name-ar').innerText = doc.nameAr || autoGenerateArabicProfile(doc.companyName || doc.clientName);
    document.getElementById('p-doc-ref').innerText = doc.ref || 'INV-2026-7002';
    document.getElementById('p-doc-date').innerText = doc.createdDate || '2026-07-07';

    let tbodyHtml = '';
    let items = doc.items || [];
    let totalAmt = 0;

    for (let i = 0; i < 12; i++) {
        if (i < items.length) {
            const item = items[i];
            const lineAmt = (Number(item.p) || 0) * (Number(item.q) || 1);
            totalAmt += lineAmt;
            tbodyHtml += `
                <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td>${item.d || ''}</td>
                    <td style="text-align: center;">${item.q || 1}</td>
                    <td style="text-align: right;">${lineAmt.toFixed(2)}</td>
                </tr>
            `;
        } else {
            tbodyHtml += `
                <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }
    }

    if (doc.govtFee && Number(doc.govtFee) > 0) {
        totalAmt += Number(doc.govtFee);
    }

    document.getElementById('p-items-body').innerHTML = tbodyHtml;
    document.getElementById('p-total-amount').innerText = totalAmt.toFixed(2);
    document.getElementById('document-preview-modal').style.display = 'flex';
}

// Render Quotation Tab View
function renderQuotationView() {
    const latestDoc = state.documents && state.documents.length > 0 ? state.documents[0] : null;
    
    const company = latestDoc ? latestDoc.companyName : 'BURGEON INTERNATIONAL MARKETING SERVICE';
    const arName = latestDoc ? (latestDoc.nameAr || autoGenerateArabicProfile(company)) : 'برجون العالمية التسويق سيرفيكي';
    const ref = latestDoc ? latestDoc.ref.replace('INV', 'QT') : 'QT-2026-7002';
    const date = latestDoc ? latestDoc.createdDate : '2026-07-07';

    document.getElementById('qt-company-display').innerText = company;
    document.getElementById('qt-client-ar-display').innerText = arName;
    document.getElementById('qt-ref-display').innerText = ref;
    document.getElementById('qt-date-display').innerText = date;

    let items = latestDoc && latestDoc.items ? latestDoc.items : [];
    let tbodyHtml = '';
    let totalAmt = 0;

    for (let i = 0; i < 12; i++) {
        if (i < items.length) {
            const item = items[i];
            const lineAmt = (Number(item.p) || 0) * (Number(item.q) || 1);
            totalAmt += lineAmt;
            tbodyHtml += `
                <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td>${item.d || ''}</td>
                    <td style="text-align: center;">${item.q || 1}</td>
                    <td style="text-align: right;">${lineAmt.toFixed(2)}</td>
                </tr>
            `;
        } else {
            tbodyHtml += `
                <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }
    }

    document.getElementById('quotation-items-body').innerHTML = tbodyHtml;
    document.getElementById('qt-grandtotal').innerText = totalAmt.toFixed(2);
}

// PDF Exporters for both preview modal & price quotation
function saveAsPDF() {
    exportSheetToPDF('a4-wrapper-element', document.getElementById('p-doc-ref').innerText);
}

function saveQuotationAsPDF() {
    exportSheetToPDF('quotation-card-wrapper-element', document.getElementById('qt-ref-display').innerText);
}

function exportSheetToPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    
    html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1200
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`${filename || 'Document'}.pdf`);
    });
}
