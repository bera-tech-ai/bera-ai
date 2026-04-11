const axios = require('axios')
const config = require('../../Config')

const MAX_HISTORY = config.maxHistory || 20
const BASE = 'https://apiskeith.top'

const PERSONALITY = `You are Bera AI — a sharp, witty AI assistant living inside WhatsApp. You were created by Bera Tech and you work for the bot owner (${config.owner}). You help everyone who talks to you.

Your name is Bera AI. You were built by Bera Tech. NEVER say you are Nick, ChatGPT, Keith AI, or any other AI.

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
- Keep replies short unless detail is genuinely needed.
- NEVER say you can't access GitHub, the web, or any capability listed above — you CAN.
- If someone asks who you are, always say "I'm Bera AI, created by Bera Tech."
- NEVER say you are "Keith AI" or "Keithkeizzah's AI". You are Bera AI.
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
    clean = clean.replace(/^(Nick|ChatGPT|GPT|AI|Keith AI|Bera AI|Assistant):\s*/i, '').trim()
    clean = clean.replace(/\bI'?m Nick\b/gi, "I'm Bera AI")
    clean = clean.replace(/\bNick AI\b/gi, 'Bera AI')
    clean = clean.replace(/\bKeith AI\b/gi, 'Bera AI')
    clean = clean.replace(/\bI'?m Keith\b/gi, "I'm Bera AI, built by Bera Tech")
    clean = clean.replace(/keithkeizzah/gi, 'Bera Tech')
    return clean
}

// All confirmed-working AI endpoints from apiskeith.top
const AI_ENDPOINTS = [
    `${BASE}/ai/gpt`,
    `${BASE}/keithai`,
    `${BASE}/ai/claudeai`,
    `${BASE}/ai/mistral`,
    `${BASE}/ai/bard`,
    `${BASE}/ai/o3`,
    `${BASE}/ai/perplexity`,
    `${BASE}/ai/chatgpt4`,
]

const VISION_ENDPOINTS = [
    `${BASE}/ai/vision`,
]

const tryEndpoints = async (endpoints, paramsFn, resultFn, timeout = 25000) => {
    let lastError = null
    for (const url of endpoints) {
        try {
            const res = await axios.get(url, { params: paramsFn(url), timeout })
            const data = res.data
            if (data?.status === false) {
                lastError = new Error(data?.error || 'API returned failure')
                continue
            }
            const answer = resultFn ? resultFn(data) : (data?.result || data?.reply || data?.message || data?.response || data?.answer || data?.text)
            if (!answer || typeof answer !== 'string' || answer.length < 2) {
                lastError = new Error('Empty response')
                continue
            }
            return answer
        } catch (e) {
            lastError = e
        }
    }
    throw lastError || new Error('All AI endpoints failed')
}

const nickAi = async (userText, history = [], onAction = null, imageBuffer = null) => {
    if (imageBuffer) {
        const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
        try {
            const res = await axios.get(`${BASE}/ai/vision`, {
                params: { image: imageBase64, q: userText || 'Describe and analyse this image in detail.' },
                timeout: 35000
            })
            const data = res.data
            const answer = data?.result || data?.reply || data?.message
            if (answer && typeof answer === 'string' && answer.length > 2) return cleanAnswer(answer)
        } catch {}
        throw new Error('Image analysis is temporarily unavailable. Try again later.')
    }

    const query = buildQuery(userText, history)
    const answer = await tryEndpoints(
        AI_ENDPOINTS,
        () => ({ q: query }),
        (data) => data?.result || data?.reply || data?.message || data?.response
    )
    return cleanAnswer(answer)
}

module.exports = { nickAi, MAX_HISTORY }
