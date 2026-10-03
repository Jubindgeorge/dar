function switchTab(tabId) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));

    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) targetPanel.classList.add('active');

    const targetMenu = document.getElementById(`nav-${tabId}`);
    if (targetMenu) targetMenu.classList.add('active');

    if (tabId === 'quotation') renderQuotationPanel();
}

function renderQuotationPanel() {
    const activeRef = state.selectedDocRefForLedger || (state.documents[0] ? state.documents[0].refCode : null);
    if (!activeRef) return;

    const doc = state.documents.find(d => d.refCode === activeRef);
    if (!doc) return;

    const container = document.getElementById('quotation-panel-content');
    if (container) container.innerHTML = generateReferenceDocHTML(doc, "QUOTATION / عرض سعر");
}

function generateReferenceDocHTML(doc, docTypeTitle) {
    let items = doc.items ? [...doc.items] : [];
    while (items.length < 12) items.push({ d: '', q: '', p: 0, isEmpty: true });

    let itemsTotal = (doc.items || []).reduce((acc, curr) => acc + ((parseFloat(curr.p) || 0) * (parseInt(curr.q) || 1)), 0);
    let govtAmt = parseFloat(doc.govtAmt) || 0;
    let grandTotal = parseFloat(doc.totalAmt) || (itemsTotal + govtAmt);

    let rowsHtml = items.map((item, idx) => `
        <tr style="height: 24px;">
            <td style="text-align: center;">${item.isEmpty ? '' : idx + 1}</td>
            <td>${item.d || ''}</td>
            <td style="text-align: center;">${item.isEmpty ? '' : (item.q || 1)}</td>
            <td style="text-align: right;">${item.isEmpty ? '' : ((parseFloat(item.p) || 0) * (parseInt(item.q) || 1)).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <div class="reference-doc-container">
            <table class="ref-header-table">
                <tr>
                    <td style="width: 70%;">
                        <div class="ref-company-title-ar">دار الشمس لخدمات تخليص المعاملات</div>
                        <div class="ref-company-title-en">DAR AL SHAMS DOCUMENTS CLEARING SERVICES</div>
                        <div style="font-size: 11px;">Tel: +971 4 236 7006 | Office # 227, Dubai, UAE</div>
                    </td>
                    <td style="width: 30%; text-align: right;">
                        <div style="border: 2px solid #000; padding: 8px; text-align: center; font-weight: bold; font-size: 11px;">
                            DAR AL SHAMS<br>CLEARING SERVICES
                        </div>
                    </td>
                </tr>
            </table>

            <div class="ref-doc-type-banner">${docTypeTitle}</div>

            <div class="ref-meta-grid">
                <div><strong>M/s:</strong> ${doc.companyName || doc.clientName || 'BURGEON INTERNATIONAL'}</div>
                <div style="text-align: right;">
                    <div><strong>No:</strong> ${doc.refCode || 'INV-2026-7002'}</div>
                    <div><strong>Date:</strong> ${doc.createdDate || '2026-07-07'}</div>
                </div>
            </div>

            <table class="ref-items-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">S.No</th>
                        <th>التفاصيل / Description</th>
                        <th style="width: 50px;">Qty</th>
                        <th style="width: 120px; text-align: right;">Amount (Dhs) / المبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr class="ref-total-row">
                        <td colspan="3" style="text-align: right;">Total / مجموع (Dhs)</td>
                        <td style="text-align: right;">${grandTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="ref-signatures-grid">
                <div class="ref-signature-box">Receiver's Sign / توقيع المستلم</div>
                <div class="ref-signature-box">Authorized Signature / التوقيع المعتمد</div>
            </div>
        </div>
    `;
}