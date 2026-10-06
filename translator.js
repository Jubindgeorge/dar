// translator.js - Standalone Global Version (No ES Module imports required)

const professionalArabicGlossary = {
    "invoice": "فاتورة ضريبية",
    "tax invoice": "فاتورة ضريبية",
    "quotation": "عرض سعر",
    "receipt": "سند قبض",
    "payment receipt": "سند قبض",
    "statement of account": "كشف حساب",
    "trade license": "رخصة تجارية",
    "license renewal": "تجديد الرخصة التجارية",
    "visa stamping": "تأشيرة اقامة",
    "employment visa": "تأشيرة عمل",
    "visit visa": "تأشيرة زيارة",
    "medical fitness test": "فحص اللياقة الطبية",
    "emirates id": "هوية الامارات",
    "ejari": "عقد إيجاري (إجاري)",
    "attestation": "تصديق",
    "translation": "ترجمة قانونية",
    "typing": "طباعة المعاملات",
    "pro services": "خدمات الطباعة والمعاملات الحكومية",
    "service charge": "رسوم الخدمة",
    "government fee": "رسوم حكومية",
    "typing fee": "رسوم طباعة",
    "service record": "سجل الخدمة",
    "consultation": "استشارة",
    "processing fee": "رسوم المعاملة",
    "urgent processing": "معاملة عاجلة",
    "document clearing": "تخليص مستندات",
    "total": "المجموع الكلي",
    "subtotal": "المجموع الفرعي",
    "vat": "ضريبة القيمة المضافة (5%)",
    "tax": "ضريبة",
    "advance": "دفعة مقدمة",
    "balance due": "المبلغ المستحق",
    "grand total": "الإجمالي النهائي"
};

async function autoTranslateToArabic(text) {
    if (!text) return '';
    const cleaned = text.toString().toLowerCase().trim();
    
    // 1. Check glossary
    if (professionalArabicGlossary[cleaned]) {
        return professionalArabicGlossary[cleaned];
    }
    
    for (const [key, val] of Object.entries(professionalArabicGlossary)) {
        if (cleaned.includes(key)) {
            return text.replace(new RegExp(key, 'gi'), val);
        }
    }

    // 2. Fallback to Gemini REST API or SDK if available globally
    try {
        if (typeof GoogleGenAI !== 'undefined') {
            const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6JkRhWjGB2-AxyzJIS_4HadUntkx8ksOcbi9biG7IcdiQ" });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate the following company name, business item, or service description into professional Gulf Arabic suitable for official invoices and quotations in the UAE. Return ONLY the translated Arabic text with no conversational filler, quotes, or markdown: "${text}"`,
            });
            return response.text ? response.text.trim() : text;
        }
    } catch (error) {
        console.error("Gemini translation error:", error);
    }

    return text;
}

// Bind to window so app_2.js and ui_2.js can call it directly
window.autoTranslateToArabic = autoTranslateToArabic;