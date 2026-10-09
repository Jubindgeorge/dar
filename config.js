// config.js — Firebase client configuration is public by design.
// Protect data with Firebase Authentication and strict Realtime Database Security Rules.
// Never place Gemini/private service credentials in this file.
const firebaseConfig = {
    apiKey: "AIzaSyCuejMSsX0dnJ09ajwADYrT7-Ow4VWLqGo",
    authDomain: "dar-al-shams.firebaseapp.com",
    databaseURL: "https://dar-al-shams-default-rtdb.firebaseio.com",
    projectId: "dar-al-shams",
    storageBucket: "dar-al-shams.firebasestorage.app",
    messagingSenderId: "511599651070",
    appId: "1:511599651070:web:cac6b0fe3ee622b97a5daf"
};

let db = null;
if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    try {
        if (!Array.isArray(firebase.apps) || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        if (typeof firebase.database === 'function') db = firebase.database();
    } catch (error) {
        console.error('Firebase initialization failed. Check SDK order and project configuration.', error);
    }
}
if (!db) console.error('Firebase Realtime Database is unavailable. Load the Firebase compat SDK before config.js.');

// Translation glossary for existing local translation logic.
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
