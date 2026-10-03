// Navigation & Routing Engine
function switchTab(tabId) {
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        li.classList.remove('active');
    });

    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) targetPanel.classList.add('active');

    const targetMenu = document.getElementById(`nav-${tabId}`);
    if (targetMenu) targetMenu.classList.add('active');

    if (tabId === 'dashboard' && typeof renderDashboardStats === 'function') renderDashboardStats();
    if (tabId === 'clients' && typeof renderClientsTable === 'function') renderClientsTable();
    if (tabId === 'works' && typeof renderWorksTable === 'function') renderWorksTable();
    if (tabId === 'documents' && typeof renderDocumentsTable === 'function') renderDocumentsTable();
    if (tabId === 'services-config' && typeof renderServicesCatalog === 'function') renderServicesCatalog();
    if (tabId === 'accounts-ledger' && typeof initAccountsLedgerView === 'function') initAccountsLedgerView();
    if (tabId === 'quotation') renderQuotationPanel();
}

// Embedded Standby Quotation Render
function renderQuotationPanel() {
    const activeRef = state.selectedDocRefForLedger || (state.documents[0] ? state.documents[0].refCode : null);
    if (!activeRef) return;

    const doc = state.documents.find(d => d.refCode === activeRef);
    if (!doc) return;

    const container = document.getElementById('quotation-panel-content');
    if (!container) return;

    container.innerHTML = generateReferenceDocHTML(doc, "QUOTATION / عرض سعر");
}

// Universal Template Generator Matching inv 7002.pdf Structure
function generateReferenceDocHTML(doc, docTypeTitle) {
    let items = doc.items ? [...doc.items] : [];
    
    // Fill to 12 rows for exact vertical layout alignment as reference document
    while (items.length < 12) {
        items.push({ d: '', q: '', p: 0, isEmpty: true });
    }

    let itemsTotal = (doc.items || []).reduce((acc, curr) => acc + ((parseFloat(curr.p) || 0) * (parseInt(curr.q) || 1)), 0);
    let govtAmt = parseFloat(doc.govtAmt) || 0;
    let grandTotal = parseFloat(doc.totalAmt) || (itemsTotal + govtAmt);

    let rowsHtml = items.map((item, idx) => `
        <tr style="height: 24px;">
            <td class="col-sno">${item.isEmpty ? '' : idx + 1}</td>
            <td class="col-desc">${item.d || ''}</td>
            <td class="col-qty">${item.isEmpty ? '' : (item.q || 1)}</td>
            <td class="col-amount">${item.isEmpty ? '' : ((parseFloat(item.p) || 0) * (parseInt(item.q) || 1)).toFixed(2)}</td>
        </tr>
    `).join('');

    let clientArabic = autoGenerateArabicProfile(doc.companyName || doc.clientName || '');

    return `
        <div class="reference-doc-container">
            <table class="ref-header-table">
                <tr>
                    <td style="width: 70%;">
                        <div class="ref-company-title-ar">دار الشمس لخدمات تخليص المعاملات</div>
                        <div class="ref-company-title-en">DAR AL SHAMS DOCUMENTS CLEARING SERVICES</div>
                        <div class="ref-company-sub">
                            Tel: +971 4 236 7006 | Office # 227, Dubai, UAE<br>
                            Email: info@daralshams.ae
                        </div>
                    </td>
                    <td style="width: 30%; text-align: right; vertical-align: middle;">
                        <div style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 11px; display: inline-block;">
                            DAR AL SHAMS<br>CLEARING SERVICES
                        </div>
                    </td>
                </tr>
            </table>

            <div class="ref-doc-type-banner">${docTypeTitle}</div>

            <div class="ref-meta-grid">
                <div class="ref-meta-left">
                    <div><strong>M/s:</strong> ${doc.companyName || doc.clientName || 'BURGEON INTERNATIONAL MARKETING SERVICE'}</div>
                    <div style="font-family: 'Amiri', serif; font-size: 13px; margin-top: 3px;"><strong>السيد /</strong> ${clientArabic}</div>
                </div>
                <div class="ref-meta-right">
                    <div><strong>No:</strong> ${doc.refCode || 'INV-2026-7002'}</div>
                    <div><strong>Date:</strong> ${doc.createdDate || '2026-07-07'}</div>
                </div>
            </div>

            <table class="ref-items-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">S.No</th>
                        <th style="text-align: left;">التفاصيل / Description</th>
                        <th style="width: 50px;">Qty</th>
                        <th style="width: 120px; text-align: right;">Amount (Dhs) / المبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr class="ref-total-row">
                        <td colspan="3" style="text-align: right; padding-right: 15px;">Total / مجموع (Dhs)</td>
                        <td class="col-amount" style="text-align: right;">${grandTotal.toFixed(2)}</td>
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

// Arabic Name Phonetic & Glossary Translator
function autoGenerateArabicProfile(englishText) {
    if (!englishText) return "";
    let cleanText = englishText.toLowerCase().trim();
    let words = cleanText.split(/\s+/);

    let translatedWords = words.map(word => {
        if (typeof translationGlossary !== 'undefined' && translationGlossary[word]) {
            return translationGlossary[word];
        }
        let converted = "";
        for (let char of word) {
            converted += (typeof phoneticMap !== 'undefined' && phoneticMap[char]) ? phoneticMap[char] : char;
        }
        return converted;
    });

    return translatedWords.join(" ");
}

// Modal & UI Utilities
function showNotification(title, message) {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-modal-backdrop';
    backdrop.innerHTML = `
        <div class="custom-modal-content">
            <h3 style="color: var(--primary); margin-bottom: 10px;">${title}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">${message}</p>
            <div class="custom-modal-actions">
                <button onclick="this.closest('.custom-modal-backdrop').remove()" class="btn btn-primary">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(backdrop);
}

function showConfirmDialog(title, message, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-modal-backdrop';
    backdrop.innerHTML = `
        <div class="custom-modal-content">
            <h3 style="color: var(--accent-red); margin-bottom: 10px;">${title}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">${message}</p>
            <div class="custom-modal-actions">
                <button class="btn btn-secondary cancel-btn">Cancel</button>
                <button class="btn btn-danger confirm-btn">Confirm</button>
            </div>
        </div>
    `;
    backdrop.querySelector('.cancel-btn').onclick = () => backdrop.remove();
    backdrop.querySelector('.confirm-btn').onclick = () => {
        backdrop.remove();
        onConfirm();
    };
    document.body.appendChild(backdrop);
}

function toggleSidebar() {
    document.getElementById('main-sidebar').classList.toggle('collapsed');
}
