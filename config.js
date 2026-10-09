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