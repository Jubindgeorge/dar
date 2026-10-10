// config.js
const firebaseConfig = {
    apiKey: "AIzaSyCuejMSsX0dnJ09ajwADYrT7-Ow4VWLqGo",
    authDomain: "dar-al-shams.firebaseapp.com",
    databaseURL: "https://dar-al-shams-default-rtdb.firebaseio.com",
    projectId: "dar-al-shams",
    storageBucket: "dar-al-shams.firebasestorage.app",
    messagingSenderId: "511599651070",
    appId: "1:511599651070:web:cac6b0fe3ee622b97a5daf"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = typeof firebase !== 'undefined' ? firebase.database() : null;

// Translation Glossary for Arabic Auto-Generation
const translationGlossary = {
    "marketing": "التسويق", "services": "خدمات", "international": "العالمية",
    "trading": "التجارية", "management": "إدارة", "documents": "المستندات",
    "clearing": "تخليص", "commercial": "التجاري", "consultancy": "الاستشارات",
    "logistics": "اللوجستية", "general": "العامة", "technical": "الفنية",
    "burgeon": "برجون", "dar": "دار", "al": "ال", "shams": "الشمس",
    "alpha": "ألفا", "nexus": "نيكسوس", "global": "العالمية", "vertex": "فيرتكس"
};

const phoneticMap = {
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف', 'g': 'ج', 'h': 'ه', 'i': 'ي', 
    'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'o': 'و', 'p': 'ب', 'q': 'ق', 'r': 'ر', 
    's': 'س', 't': 'ت', 'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'اكس', 'y': 'ي', 'z': 'ز'
};

// Shared helpers: preserve existing database keys and legacy field names.
function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function saveStateToFirebase() {
    if (!db) {
        console.error('Firebase is not initialized; changes could not be saved.');
        if (typeof showCustomModal === 'function') showCustomModal('Connection unavailable', 'Firebase is not connected. Your changes were not saved.');
        return Promise.reject(new Error('Firebase is not initialized'));
    }
    const writes = [];
    // Update records by their existing keys; never replace entire collections.
    (state.clients || []).forEach(item => {
        if (item && item.id) { const copy = {...item}; delete copy.id; writes.push(db.ref(`clients/${item.id}`).update(copy)); }
    });
    (state.documents || []).forEach(item => {
        const key = item && (item.refCode || item.id);
        if (key) { const copy = {...item}; delete copy.id; writes.push(db.ref(`documents/${key}`).update(copy)); }
    });
    (state.monthlyExpenses || []).forEach(item => {
        if (!item) return;
        if (!item.id) item.id = db.ref('monthlyExpenses').push().key;
        const copy = {...item}; delete copy.id;
        writes.push(db.ref(`monthlyExpenses/${item.id}`).update(copy));
    });
    return Promise.all(writes).catch(error => {
        console.error('Firebase save failed:', error);
        if (typeof showCustomModal === 'function') showCustomModal('Save failed', 'Your changes could not be saved. Check your connection and Firebase permissions, then try again.');
        return false;
    });
}
