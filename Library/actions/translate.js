const axios = require('axios')

const LANGS = {
    english: 'English', en: 'English',
    spanish: 'Spanish', es: 'Spanish',
    french: 'French', fr: 'French',
    german: 'German', de: 'German',
    portuguese: 'Portuguese', pt: 'Portuguese',
    arabic: 'Arabic', ar: 'Arabic',
    swahili: 'Swahili', sw: 'Swahili',
    chinese: 'Chinese', zh: 'Chinese',
    japanese: 'Japanese', ja: 'Japanese',
    hindi: 'Hindi', hi: 'Hindi',
    russian: 'Russian', ru: 'Russian',
    italian: 'Italian', it: 'Italian',
    dutch: 'Dutch', nl: 'Dutch',
    korean: 'Korean', ko: 'Korean',
    turkish: 'Turkish', tr: 'Turkish',
    zulu: 'Zulu', zu: 'Zulu',
    hausa: 'Hausa', ha: 'Hausa',
    yoruba: 'Yoruba', yo: 'Yoruba',
    igbo: 'Igbo', ig: 'Igbo',
    amharic: 'Amharic', am: 'Amharic',
    somali: 'Somali', so: 'Somali',
}

const resolveLanguage = (lang) => {
    if (!lang) return null
    return LANGS[lang.toLowerCase()] || lang
}

const translate = async (text, targetLang) => {
    const resolved = resolveLanguage(targetLang) || targetLang
    try {
        const prompt = `Translate the following text to ${resolved}. Return ONLY the translated text with no explanation, no labels, no quotes:\n\n${text}`
        const res = await axios.get('https://apiskeith.top/ai/gpt4', {
            params: { q: prompt },
            timeout: 20000
        })
        const data = res.data
        if (data?.status === false || data?.success === false || typeof data?.error === 'string') {
            return { success: false, error: 'Translation service is busy. Try again in a moment.' }
        }
        const result = data?.result || data?.reply || data?.text || ''
        if (!result) return { success: false, error: 'No translation returned.' }
        return { success: true, result: result.trim(), from: 'Auto-detect', to: resolved }
    } catch (e) {
        return { success: false, error: 'Translation failed. Try again.' }
    }
}

module.exports = { translate, resolveLanguage, LANGS }
