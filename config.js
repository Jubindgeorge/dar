const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "dar-al-shams.firebaseapp.com",
    databaseURL: "https://dar-al-shams-default-rtdb.firebaseio.com",
    projectId: "dar-al-shams",
    storageBucket: "dar-al-shams.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const translationGlossary = {
    "trading": "للتجارة", "services": "للخدمات", "contracting": "للمقاولات",
    "general": "العامة", "clearing": "تخليص المعاملات"
};

const phoneticMap = {
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف', 'g': 'ج',
    'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن'
};