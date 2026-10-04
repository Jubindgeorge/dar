// ui.js

function safeSet(id, property, value) {
    const el = document.getElementById(id);
    if (el) {
        el[property] = value;
        return el;
    }
    return null;
}

function showCustomModal(title, message, actionsHtml) {
    safeSet('modal-title', 'innerText', title);
    safeSet('modal-message', 'innerText', message);
    
    const actionsEl = document.getElementById('modal-actions');
    if (actionsEl) {
        actionsEl.innerHTML = actionsHtml || `<button onclick="closeCustomModal()" class="btn btn-primary">OK</button>`;
    }
    
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCustomModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';
}

function autoTranslateToArabic(text) {
    if (!text) return '';
    if (typeof translationGlossary === 'undefined' || typeof phoneticMap === 'undefined') {
        return text;
    }
    let words = text.toLowerCase().trim().split(/\s+/);
    let translatedWords = words.map(word => {
        if (translationGlossary[word]) return translationGlossary[word];
        let res = '';
        for (let char of word) {
            res += phoneticMap[char] || char;
        }
        return res;
    });
    return translatedWords.join(' ');
}

// Bulletproof saveAsPDF that handles tainted canvas elements gracefully
function saveAsPDF() {
    const element = document.getElementById('a4-wrapper-element');
    if (!element) {
        alert('Preview container not found.');
        return;
    }

    if (typeof window.html2pdf !== 'undefined') {
        // Temporarily hide or remove images that cause CORS tainting if they are local files
        const images = element.querySelectorAll('img');
        images.forEach(img => {
            if (img.src && (img.src.startsWith('file://') || img.src.includes('logo white'))) {
                img.dataset.origSrc = img.src;
                img.removeAttribute('src'); // Remove source temporarily to prevent tainting
            }
        });

        const options = {
            margin:       0,
            filename:     `DarAlShams_Invoice_${Date.now()}.pdf`,
            image:        { type: 'png', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                allowTaint: true,
                logging: false, 
                letterRendering: true,
                windowWidth: 794 // Locks canvas width strictly to A4 specs
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().from(element).set(options).save().then(() => {
            // Restore image sources after download starts
            images.forEach(img => {
                if (img.dataset.origSrc) {
                    img.src = img.dataset.origSrc;
                }
            });
        }).catch(err => {
            console.error('html2pdf generation error:', err);
            // Restore images on error too
            images.forEach(img => {
                if (img.dataset.origSrc) {
                    img.src = img.dataset.origSrc;
                }
            });
            alert('PDF download failed. Opening print menu as fallback.');
            window.print();
        });
    } else {
        window.print();
    }
}
function closePreviewModal() {
    const modal = document.getElementById('document-preview-modal');
    if (modal) modal.style.display = 'none';
}

function openDocumentPreview(docData) {
    if (!docData) return;

    const isQuotation = docData.type === 'Quotation' || (docData.refCode && docData.refCode.startsWith('QTN'));
    
    // Header Title
    const titleElem = document.getElementById('p-doc-title');
    if (titleElem) {
        titleElem.innerHTML = isQuotation 
            ? 'QUOTATION / <span style="font-family: \'Amiri\', serif;">عرض سعر</span>' 
            : 'INVOICE / <span style="font-family: \'Amiri\', serif;">فاتورة</span>';
    }

    // Client Details
    const clientNameElem = document.getElementById('p-client-name');
    if (clientNameElem) {
        clientNameElem.innerText = docData.companyName || docData.clientName || 'N/A';
    }

    const clientArElem = document.getElementById('p-client-name-ar');
    if (clientArElem) {
        let arName = docData.nameAr || '';
        if (!arName && docData.companyName) {
            arName = autoTranslateToArabic(docData.companyName);
        }
        clientArElem.innerText = arName ? `السيد / ${arName}` : '';
    }

    // Reference & Date
    const docRefElem = document.getElementById('p-doc-ref');
    if (docRefElem) {
        docRefElem.innerText = `${isQuotation ? 'Quotation' : 'Invoice'} No: ${docData.refCode || '-'}`;
    }

    const createdDateElem = document.getElementById('p-created-date');
    if (createdDateElem) {
        createdDateElem.innerText = `Date: ${docData.createdDate || '-'}`;
    }

    // Table Content Rendering with Robust Total Calculation
    const tbody = document.getElementById('p-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        const items = docData.items || [];

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px; border-bottom: 1px solid #e2e8f0;">No line items found.</td></tr>`;
        } else {
            let totalAmt = 0;

            items.forEach((item, index) => {
                const tr = document.createElement('tr');
                
                // Robust property checking for quantity and pricing/amounts
                const qty = parseFloat(item.quantity || item.q || item.qty || 1);
                let unitPrice = parseFloat(item.price || item.p || item.rate || 0);
                let lineTotal = parseFloat(item.amount || item.total || 0);

                // If lineTotal wasn't provided directly, calculate from unit price & quantity
                if (lineTotal === 0 && unitPrice > 0) {
                    lineTotal = qty * unitPrice;
                } 
                // If unit price wasn't provided directly, calculate back from lineTotal & quantity
                else if (unitPrice === 0 && lineTotal > 0 && qty > 0) {
                    unitPrice = lineTotal / qty;
                }

                totalAmt += lineTotal;

                const description = item.description || item.desc || item.d || 'Service Record';
                const isEven = index % 2 === 1;
                const bgStyle = isEven ? 'background-color: #fdfbf7;' : 'background-color: #ffffff;';

                tr.style.cssText = `${bgStyle} line-height: 2.5;`;
                tr.innerHTML = `
                    <td style="text-align: center; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 10px 12px; color: #475569;">${index + 1}</td>
                    <td style="border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 10px 14px; color: #0f172a; font-weight: 500;">${description}</td>
                    <td style="text-align: center; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 10px 12px; color: #0f172a;">${qty}</td>
                    <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; color: #0f172a; font-weight: 600;">${lineTotal.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });

            // Accent Total Summary Row
            const totalTr = document.createElement('tr');
            totalTr.style.cssText = 'background: #f8fafc; font-weight: bold; line-height: 1.6;';
            totalTr.innerHTML = `
                <td colspan="3" style="text-align: right; border-top: 2px solid #b8860b; border-right: 1px solid #e2e8f0; padding: 12px 14px; color: #0f172a; font-size: 12.5px;">
                    Total Amount / <span style="font-family: 'Amiri', serif;">المبلغ الإجمالي</span> (AED)
                </td>
                <td style="text-align: right; border-top: 2px solid #b8860b; padding: 12px 14px; color: #b8860b; font-size: 14px; font-weight: 800;">
                    ${totalAmt.toFixed(2)}
                </td>
            `;
            tbody.appendChild(totalTr);
        }
    }

    // Show Modal
    const previewModal = document.getElementById('document-preview-modal');
    if (previewModal) previewModal.style.display = 'flex';
}

// Global Listener for Backdrop Modal Dismissals & Print helper bindings
document.addEventListener('DOMContentLoaded', () => {
    const previewModal = document.getElementById('document-preview-modal');
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreviewModal();
        });
    }

    const customModal = document.getElementById('custom-modal');
    if (customModal) {
        customModal.addEventListener('click', (e) => {
            if (e.target === customModal) closeCustomModal();
        });
    }
});