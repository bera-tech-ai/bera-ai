// Library/actions/chatbera.js
// Parses WhatsApp chat exports and generates replies that sound exactly like the user

const axios = require('axios')
const config = require('../../Config')

const KEITH = 'https://keith-api.vercel.app'

// ── Parse exported WhatsApp .txt chat file ────────────────────────────────────
// WhatsApp export format:
// [DD/MM/YYYY, HH:MM:SS] Name: message
// OR: MM/DD/YY, HH:MM AM - Name: message
const parseExport = (fileContent, userName) => {
    const lines = fileContent.split('\n')
    const messages = []

    // Match both bracket and dash formats
    const lineRe = /^(?:\[[\d\/,: ]+\]\s*|[\d\/]+,\s*[\d:]+ [AP]M\s*-\s*)([^:]+):\s*(.+)$/

    let currentSender = null
    let currentMsg = ''

    for (const raw of lines) {
        const trimmed = raw.trim()
        if (!trimmed) continue

        const match = trimmed.match(lineRe)
        if (match) {
            // Save previous message
            if (currentSender && currentMsg.trim()) {
                messages.push({ sender: currentSender.trim(), text: currentMsg.trim() })
            }
            currentSender = match[1]
            currentMsg = match[2]
        } else {
            // Continuation of previous message
            if (currentSender) currentMsg += ' ' + trimmed
        }
    }
    // Save last
    if (currentSender && currentMsg.trim()) {
        messages.push({ sender: currentSender.trim(), text: currentMsg.trim() })
    }

    // Filter to only the user's messages
    const myMessages = messages.filter(m => {
        const s = m.sender.toLowerCase()
        const u = (userName || '').toLowerCase()
        return s === u || s.includes(u) || (userName && u.includes(s))
    }).map(m => m.text)
    .filter(t =>
        // Remove system messages and media placeholders
        !/<Media omitted>/.test(t) &&
        !/<image omitted>/.test(t) &&
        !/This message was deleted/.test(t) &&
        !/Messages and calls are end-to-end/.test(t) &&
        t.length > 1 && t.length < 300
    )
    .slice(0, 200) // Cap at 200 examples

    return { allMessages: messages, myMessages, senders: [...new Set(messages.map(m => m.sender))] }
}

// ── Detect all senders in the export ─────────────────────────────────────────
const getSenders = (fileContent) => {
    const lines = fileContent.split('\n')
    const senders = new Set()
    const lineRe = /^(?:\[[\d\/,: ]+\]\s*|[\d\/]+,\s*[\d:]+ [AP]M\s*-\s*)([^:]+):\s*/
    for (const line of lines) {
        const m = line.match(lineRe)
        if (m) senders.add(m[1].trim())
    }
    return [...senders].filter(s => !s.includes('Messages and calls'))
}

// ── Build system prompt from user's messages ──────────────────────────────────
const buildStylePrompt = (myMessages, myName) => {
    // Pick a diverse sample: first 20, middle 20, last 20
    const len = myMessages.length
    let sample = []
    if (len <= 60) {
        sample = myMessages
    } else {
        sample = [
            ...myMessages.slice(0, 20),
            ...myMessages.slice(Math.floor(len / 2) - 10, Math.floor(len / 2) + 10),
            ...myMessages.slice(-20)
        ]
    }

    const examples = sample.map((t, i) => `${i + 1}. "${t}"`).join('\n')

    return `You are acting as ${myName || 'the user'} in a WhatsApp conversation.

IMPORTANT RULES:
- Reply EXACTLY the way ${myName || 'the user'} texts — same vocabulary, same slang, same energy, same emoji patterns
- Match their message LENGTH — if they text short, text short; if they explain things, explain things
- Use the same punctuation style (or lack of it)
- Use the same emojis they use (or none if they don't)
- Sound casual and natural, NOT like an AI
- Never say you're an AI or bot
- Never say things the person would never say
- Reply in the SAME LANGUAGE they use

Here are real examples of how ${myName || 'the user'} texts:

${examples}

Now reply to the incoming message as ${myName || 'the user'} would — naturally and in character.`
}

// ── Generate a reply in the user's style ─────────────────────────────────────
const generateStyleReply = async (incomingText, styleData) => {
    try {
        const { systemPrompt, myMessages } = styleData
        if (!systemPrompt || !myMessages?.length) {
            return { success: false, error: 'No style profile found. Train first with .trainbera' }
        }

        // Use Keith API (Claude/GPT endpoint)
        const response = await axios.get(`${KEITH}/api/claude`, {
            params: {
                prompt: incomingText,
                system: systemPrompt
            },
            timeout: 25000
        })

        if (response.data?.result || response.data?.response || response.data?.message) {
            return {
                success: true,
                reply: response.data.result || response.data.response || response.data.message
            }
        }

        // Fallback to GPT endpoint
        const gptRes = await axios.get(`${KEITH}/api/gpt4`, {
            params: {
                prompt: `${systemPrompt}\n\nMessage to reply to: "${incomingText}"\n\nYour reply (as ${styleData.myName || 'the user'}):`,
            },
            timeout: 25000
        })

        if (gptRes.data?.result || gptRes.data?.response) {
            return {
                success: true,
                reply: gptRes.data.result || gptRes.data.response
            }
        }

        return { success: false, error: 'AI API unavailable' }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Analyze writing style into readable summary ───────────────────────────────
const analyzeStyle = async (myMessages, myName) => {
    try {
        const sample = myMessages.slice(0, 50).map((t, i) => `${i + 1}. "${t}"`).join('\n')
        const prompt = `Analyze the texting/messaging style of "${myName}" based on these real WhatsApp messages they sent:

${sample}

Give a SHORT analysis covering:
1. Message length (do they send short texts or long explanations?)
2. Punctuation style (do they use full stops, ellipsis, no punctuation?)
3. Emojis (which ones, how often, where?)
4. Energy/vibe (casual, funny, serious, romantic, etc.)
5. Common words or phrases they use
6. Language (do they mix languages?)

Keep it to 6-8 bullet points.`

        const res = await axios.get(`${KEITH}/api/gpt4`, {
            params: { prompt },
            timeout: 20000
        })

        return res.data?.result || res.data?.response || 'Style analysis unavailable'
    } catch {
        return 'Style analysis unavailable — but training data is saved!'
    }
}

module.exports = { parseExport, getSenders, buildStylePrompt, generateStyleReply, analyzeStyle }
