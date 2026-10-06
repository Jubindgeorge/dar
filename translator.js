// translator.js
import { GoogleGenAI } from "@google/genai";

window.translateCompanyName = async function(englishName) {
    if (!englishName || !englishName.trim()) return '';

    // 1. Ensure the key is saved in localStorage
    localStorage.setItem('gemini_api_key', 'AQ.Ab8RN6K8t67hkSiuqdM8rsYApg-Kfy27wH39AdR17r0i60IZ5Q');

    // 2. Fetch the API key properly using .getItem()
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (!apiKey) {
        console.error("Gemini API key is missing. Please set 'gemini_api_key' in localStorage.");
        return '';
    }

    try {
        // Initialize the client dynamically when the function runs
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Accurately translate and phonetically transliterate the following company name into official, professional Arabic business terminology used in UAE commercial registries (e.g., transliterate brand names accurately into Arabic letters and translate generic business terms appropriately). Return ONLY the final translated Arabic text with no extra conversational remarks, explanations, or quotes: "${englishName}"`
        });
        
        const translated = response && response.text ? response.text.trim() : '';
        return translated;
    } catch (error) {
        console.error("Gemini Translation Error:", error);
        return '';
    }
};

window.batchUpdateAllArabicNames = async function() {
    if (!state.clients || state.clients.length === 0) {
        console.warn("⚠️ No clients found in state to update.");
        return;
    }

    console.log(`🔄 Starting batch translation for ${state.clients.length} clients...`);
    let updatedCount = 0;

    for (let client of state.clients) {
        if (client.companyName && (!client.nameAr || client.nameAr === '')) {
            client.nameAr = await window.translateCompanyName(client.companyName);
            if (client.nameAr) updatedCount++;
        }
    }

    console.log(`✨ Batch update complete. Successfully updated ${updatedCount} names.`);

    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    if (typeof renderClientsTable === 'function') renderClientsTable();
};
