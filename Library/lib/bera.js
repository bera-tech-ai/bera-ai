const axios = require('axios')
const config = require('../../Config')

const MAX_HISTORY = config.maxHistory || 20
const BASE_URL = 'https://apiskeith.top'

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

const AI_ENDPOINTS = [
    'https://apiskeith.top/ai/gpt4',
    'https://api.siputzx.my.id/api/ai/chatgpt',
    'https://api.ryzendesu.vip/api/ai/chatgpt',
    'https://bk9.fun/ai/gpt4',
    'https://api.vreden.my.id/api/openai',
]

const VISION_ENDPOINTS = [
    `https://apiskeith.top/ai/vision`,
    `https://api.siputzx.my.id/api/ai/gemini-vision`,
]

const cleanAnswer = (raw) => {
    let clean = String(raw).trim()
    clean = clean.replace(/^(Nick|ChatGPT|GPT|AI):\s*/i, '').trim()
    clean = clean.replace(/\bI'?m Nick\b/gi, "I'm Bera AI")
    clean = clean.replace(/\bNick AI\b/gi, 'Bera AI')
    clean = clean.replace(/keithkeizzah/gi, 'Bera Tech')
    return clean
}

const tryEndpoints = async (endpoints, paramsFn, timeout = 25000) => {
    let lastError = null
    for (const url of endpoints) {
        try {
            const res = await axios.get(url, { params: paramsFn(url), timeout })
            const data = res.data
            if (data?.status === false || data?.success === false) {
                lastError = new Error(data?.error || 'API returned failure')
                continue
            }
            const answer = data?.result || data?.reply || data?.message || data?.response || data?.answer || data?.text || data?.data
            if (!answer || typeof answer !== 'string') {
                lastError = new Error('Empty response')
                continue
            }
            return cleanAnswer(answer)
        } catch (e) {
            const status = e?.response?.status
            if (status === 404 || status === 403 || status === 500 || status === 502 || status === 503) {
                lastError = new Error(`Endpoint ${url} returned ${status}`)
                continue
            }
            lastError = e
        }
    }
    throw lastError || new Error('All AI endpoints failed')
}

const nickAi = async (userText, history = [], onAction = null, imageBuffer = null) => {
    // Custom endpoint override
    let customEndpoint = config.nickApiEndpoint
    if (customEndpoint && !customEndpoint.includes('/api/nick')) {
        AI_ENDPOINTS.unshift(customEndpoint)
    }

    if (imageBuffer) {
        const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
        return tryEndpoints(VISION_ENDPOINTS, (url) => ({
            image: imageBase64,
            q: userText || 'Describe and analyse this image in detail.'
        }))
    }

    const query = buildQuery(userText, history)
    return tryEndpoints(AI_ENDPOINTS, (url) => {
        // Different APIs use different param names
        if (url.includes('siputzx') || url.includes('ryzendesu') || url.includes('vreden')) {
            return { text: query, prompt: query }
        }
        return { q: query, prompt: query, text: query }
    })
}

module.exports = { nickAi, MAX_HISTORY }
