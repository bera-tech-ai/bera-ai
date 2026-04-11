const axios = require('axios')
const config = require('../../Config')

const MAX_HISTORY = config.maxHistory || 20

const PERSONALITY = `You are Bera AI — a sharp, witty AI assistant living inside WhatsApp. You were created by Bera Tech and you work for the bot owner (${config.owner}). You help everyone who talks to you.

Your name is Bera AI. You were built by Bera Tech. Never say you are Nick, ChatGPT, or any other AI.

Your capabilities (these are REAL — you can actually do them):
- Generate AI images from text descriptions
- Play and download any song from YouTube
- Search the web for real-time information
- Analyse images sent to you (vision)
- Execute shell/terminal commands on the owner's VPS
- Full GitHub access: list, create, delete repos, clone and push code — authenticated as bera-tech-ai
- Read any file (cat/read file)
- Create and edit files in the workspace
- List workspace files and directories
- Evaluate and run JavaScript code (eval/exec)
- Act as an autonomous agent — plan and execute multi-step tasks automatically
- Translate text to any language
- Download TikTok, Instagram, Twitter/X, and Facebook videos
- Manage Pterodactyl game/VPS panel: list servers, check status, start/stop/restart/kill servers, send console commands, read and write server files
- Deploy and manage bots on BeraHost

Rules you always follow:
- Be direct and concise. No filler words, no repeating yourself.
- Match the user's tone — casual if they're casual, serious if they're serious.
- Never say "As an AI language model" or "I'm just an AI". Just answer.
- Keep replies short unless detail is genuinely needed. One clear answer beats three vague ones.
- NEVER say you can't access GitHub, the web, or any capability listed above — you CAN.
- If someone asks who you are, always say "I'm Bera AI, created by Bera Tech."
- If someone asks about GitHub access, confirm you have full access and ask what they need.
- If someone is tagging the owner who isn't available, introduce yourself and offer to help.
- Be engaging and friendly, not robotic.`

const buildQuery = (userText, history = []) => {
    const recent = history.slice(-8)
    const context = recent.length
        ? recent.map(h => `${h.role === 'user' ? 'User' : 'Bera AI'}: ${h.content}`).join('\n')
        : ''
    const ctxBlock = context ? `\n\nRecent conversation:\n${context}\n\n` : '\n\n'
    return `${PERSONALITY}${ctxBlock}User: ${userText}\nBera AI:`
}

const cleanAnswer = (raw) => {
    let clean = String(raw).trim()
    clean = clean.replace(/^(Nick|ChatGPT|GPT|AI|Keith AI):\s*/i, '').trim()
    clean = clean.replace(/\bI'?m Nick\b/gi, "I'm Bera AI")
    clean = clean.replace(/\bNick AI\b/gi, 'Bera AI')
    clean = clean.replace(/\bKeith AI\b/gi, 'Bera AI')
    clean = clean.replace(/keithkeizzah/gi, 'Bera Tech')
    return clean
}

// Pollinations.ai — free, no API key, very reliable
const tryPollinations = async (query) => {
    const encoded = encodeURIComponent(query)
    const res = await axios.get(`https://text.pollinations.ai/${encoded}`, {
        timeout: 30000,
        headers: { 'User-Agent': 'BeraBot/2.0' }
    })
    const text = typeof res.data === 'string' ? res.data.trim() : null
    if (!text || text.length < 2) throw new Error('Empty pollinations response')
    return text
}

// Keith AI API
const tryKeithAI = async (query) => {
    const res = await axios.get('https://apiskeith.top/ai/gpt', {
        params: { q: query },
        timeout: 25000
    })
    const data = res.data
    if (data?.status === false) throw new Error(data?.error || 'Keith API error')
    const answer = data?.result || data?.reply || data?.message || data?.response
    if (!answer || typeof answer !== 'string') throw new Error('Empty Keith response')
    return answer
}

const VISION_ENDPOINTS = [
    'https://apiskeith.top/ai/vision',
    'https://api.siputzx.my.id/api/ai/gemini-vision',
]

const nickAi = async (userText, history = [], onAction = null, imageBuffer = null) => {
    if (imageBuffer) {
        const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
        for (const url of VISION_ENDPOINTS) {
            try {
                const res = await axios.get(url, {
                    params: { image: imageBase64, q: userText || 'Describe and analyse this image in detail.' },
                    timeout: 30000
                })
                const data = res.data
                const answer = data?.result || data?.reply || data?.message || data?.response || data?.text
                if (answer && typeof answer === 'string') return cleanAnswer(answer)
            } catch { continue }
        }
        throw new Error('Image analysis is temporarily unavailable. Try again.')
    }

    const query = buildQuery(userText, history)

    // Try Keith AI first (fastest, best quality)
    try {
        const answer = await tryKeithAI(query)
        return cleanAnswer(answer)
    } catch (e1) {
        // Fallback to Pollinations (always available)
        try {
            const answer = await tryPollinations(query)
            return cleanAnswer(answer)
        } catch (e2) {
            throw new Error('Bera AI is temporarily busy. Please try again in a moment.')
        }
    }
}

module.exports = { nickAi, MAX_HISTORY }
