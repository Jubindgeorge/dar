// translator.js
import { GoogleGenAI } from "@google/genai";

// Initialize Google GenAI client for browser (Uses user or default API key)
const apiKey = localStorage.getItem('gemini_api_key') || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

window.translateCompanyName = async function(englishName) {
    if (!englishName || !englishName.trim()) return '';
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following company or client name into official, professional Arabic business terminology used in UAE commercial registries. Return ONLY the translated Arabic text with no extra conversational remarks, explanations, or quotes: "${englishName}"`
        });
        const translated = response.text ? response.text.trim() : '';
        return translated;
    } catch (error) {
        console.error("Gemini Translation Error:", error);
        return '';
    }
};

window.batchUpdateAllArabicNames = async function() {
    if (!state.clients || state.clients.length === 0) return;
    for (let client of state.clients) {
        if (client.companyName && (!client.nameAr || client.nameAr === '')) {
            client.nameAr = await window.translateCompanyName(client.companyName);
        }
    }
    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    if (typeof renderClientsTable === 'function') renderClientsTable();
};