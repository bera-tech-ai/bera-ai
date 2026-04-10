const axios = require('axios')
const config = require('../../Config')

const MAX_HISTORY = config.maxHistory || 20
const BASE_URL = 'https://apiskeith.top'

const PERSONALITY = `You are Nick — a sharp, witty AI assistant living inside WhatsApp. You work for the bot owner (${config.ownerNumber}) and help everyone who talks to you.

Your capabilities (these are REAL — you can actually do them):
- Generate AI images from text descriptions
- Play and download any song from YouTube
- Search the web for real-time information
- Analyse images sent to you (vision)
- Execute shell/terminal commands on the owner's VPS
- Full GitHub access: list, create, delete repos, clone and push code — authenticated as bera-tech-tech
- Read any file (cat/read file)
- Create and edit files in the workspace
- List workspace files and directories
- Evaluate and run JavaScript code (eval/exec)
- Act as an autonomous agent — plan and execute multi-step tasks automatically
- Translate text to any language
- Download TikTok, Instagram, Twitter/X, and Facebook videos
- Manage Pterodactyl game/VPS panel: list servers, check status, start/stop/restart/kill servers, send console commands, read and write server files

Rules you always follow:
- Be direct and concise. No filler words, no repeating yourself.
- Match the user's tone — casual if they're casual, serious if they're serious.
- Never say "As an AI language model" or "I'm just an AI". Just answer.
- Keep replies short unless detail is genuinely needed. One clear answer beats three vague ones.
- NEVER say you can't access GitHub, the web, or any capability listed above — you CAN.
- If someone asks about GitHub access, confirm you have full access and ask what they need.
- If someone is tagging the owner who isn't available, introduce yourself and offer to help.
- Be engaging and friendly, not robotic.`

const buildQuery = (userText, history = []) => {
    const recent = history.slice(-8)
    const context = recent.length
        ? recent.map(h => `${h.role === 'user' ? 'User' : 'Nick'}: ${h.content}`).join('\n')
        : ''
    const ctxBlock = context ? `\n\nRecent conversation:\n${context}\n\n` : '\n\n'
    return `${PERSONALITY}${ctxBlock}User: ${userText}\nNick:`
}

const nickAi = async (userText, history = [], onAction = null, imageBuffer = null) => {
    let endpoint = config.nickApiEndpoint
    if (!endpoint || endpoint.includes('/api/nick')) endpoint = `${BASE_URL}/ai/gpt4`

    try {
        let res

        if (imageBuffer) {
            const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
            res = await axios.get(`${BASE_URL}/ai/vision`, {
                params: { image: imageBase64, q: userText || 'Describe and analyse this image in detail. Be specific and direct.' },
                timeout: 30000
            })
        } else {
            const query = buildQuery(userText, history)
            res = await axios.get(endpoint, { params: { q: query }, timeout: 30000 })
        }

        const data = res.data
        if (data?.status === false || data?.success === false) {
            const msg = data?.error || 'API server busy'
            throw new Error(msg.replace(/keithkeizzah/gi, '').trim() || 'AI service is temporarily busy')
        }
        const answer = data.result || data.reply || data.message || data.response || data.answer || data.text
        if (!answer) throw new Error('Empty response from AI')

        let clean = String(answer).trim()
        if (clean.startsWith('Nick:')) clean = clean.replace(/^Nick:\s*/i, '').trim()

        return clean
    } catch (e) {
        if (e.response) throw new Error(`API error ${e.response.status}: ${e.response.data?.message || 'Unknown'}`)
        throw new Error(e.message || 'Bera AI request failed')
    }
}

module.exports = { nickAi, MAX_HISTORY }
