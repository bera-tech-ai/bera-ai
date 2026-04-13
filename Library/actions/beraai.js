// Library/actions/beraai.js
// Bera AI — Advanced AI Engine with Tool Calling
// Tools: bash, web search, web scrape, system info, bot command execution, memory
// Created by Developer Bera

'use strict'
const axios = require('axios')
const { exec } = require('child_process')

// ── Memory store (per-chat, persists in process memory) ──────────────────────
const MEMORY = {}
const remember = (chat, key, val) => {
    if (!MEMORY[chat]) MEMORY[chat] = {}
    if (val !== undefined) MEMORY[chat][key] = val
    return MEMORY[chat][key]
}
const getMemory = (chat) => MEMORY[chat] || {}

// ── Shell executor ────────────────────────────────────────────────────────────
const runBash = (cmd, timeoutMs) => new Promise(resolve => {
    exec(cmd, { timeout: timeoutMs || 12000, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
        const out = (stdout || '').trim()
        const err2 = (stderr || '').trim()
        resolve({ success: !err, output: (out + (err2 ? '\nSTDERR: ' + err2 : '')).slice(0, 2000) || (err ? err.message : 'done') })
    })
})

// ── Web search (apiskeith + fallback) ────────────────────────────────────────
const webSearch = async (query) => {
    const endpoints = [
        { base: 'https://apiskeith.top', path: '/search/web' },
        { base: 'https://apiskeith.top', path: '/search/google' },
    ]
    for (const ep of endpoints) {
        try {
            const r = await axios.get(ep.base + ep.path, { params: { q: query, query }, timeout: 12000 })
            const results = r.data?.results || r.data?.data || r.data?.result || []
            if (Array.isArray(results) && results.length) {
                return { success: true, results: results.slice(0, 4).map(x => ({ title: x.title || x.name || '', snippet: x.snippet || x.description || x.content || '', url: x.url || x.link || '' })) }
            }
        } catch {}
    }
    return { success: false, results: [] }
}

// ── Web scraper ───────────────────────────────────────────────────────────────
const scrapeUrl = async (url) => {
    try {
        const r = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BeraAI/1.0)' }, maxContentLength: 500000 })
        const html = String(r.data || '')
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ').trim().slice(0, 3000)
        return { success: true, text, url }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── System info ───────────────────────────────────────────────────────────────
const systemInfo = async () => {
    const [ram, disk, cpu, uptime, node] = await Promise.all([
        runBash("free -m | awk 'NR==2{printf \"%s/%s MB (%.0f%%)\", $3,$2,$3*100/$2}'"),
        runBash("df -h / | awk 'NR==2{print $3\"/\"$2\" (\"$5\" used)\"}'"),
        runBash("top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4\"%\"}'"),
        runBash('uptime -p'),
        runBash('node --version'),
    ])
    return { ram: ram.output, disk: disk.output, cpu: cpu.output, uptime: uptime.output, node: node.output }
}

// ── AI caller (Pollinations — free, respects system prompts) ─────────────────
const callAI = async (messages, timeoutMs) => {
    const body = JSON.stringify({ model: 'openai', messages, seed: Math.floor(Math.random() * 99999) })
    return new Promise((resolve, reject) => {
        const req = require('https').request({
            hostname: 'text.pollinations.ai', path: '/', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'BeraAI/2.0' }
        }, res => {
            let d = ''; res.on('data', c => d += c)
            res.on('end', () => {
                if (res.statusCode === 429) return resolve('RATELIMIT')
                resolve(d.trim())
            })
        })
        req.on('error', reject)
        req.setTimeout(timeoutMs || 30000, () => { req.destroy(); reject(new Error('AI timeout')) })
        req.write(body); req.end()
    })
}

// ── COMPREHENSIVE SYSTEM PROMPT ────────────────────────────────────────────────
const SYSTEM_PROMPT = [
    'You are Bera AI — an advanced AI assistant built into a WhatsApp bot created by Developer Bera (Kenyan developer).',
    '',
    '## IDENTITY',
    '- Name: Bera AI',
    '- Creator: Developer Bera',
    '- Platform: WhatsApp (prefix: .)',
    '- Style: Smart, friendly, uses light Kenyan slang (mkuu, bana, waazi, enyewe)',
    '- You speak English and Swahili/Sheng naturally',
    '- You are NOT just a chatbot — you are a fully-capable AI agent with real tools',
    '',
    '## TOOL CALLING',
    'When you need to DO something (not just talk), respond ONLY with valid JSON on a single line:',
    '{"tool":"bash","cmd":"your command here"}',
    '{"tool":"search","query":"what to search"}',
    '{"tool":"scrape","url":"https://..."}',
    '{"tool":"system"}',
    '{"tool":"reply","text":"your final answer"}',
    '',
    'Rules for tool use:',
    '- bash: for file ops, git, npm, node processes, logs, anything shell',
    '- search: for current events, prices, news, facts you may not know',
    '- scrape: when user gives a URL or asks about a specific webpage',
    '- system: when asked about RAM, CPU, disk, uptime, server status',
    '- reply: for conversational responses, explanations, or after tool results',
    '- ONLY output JSON when calling a tool. Otherwise reply normally.',
    '',
    '## BOT COMMANDS (prefix: .)',
    '### MEDIA & DOWNLOADS',
    '.play <song> — search + download YouTube audio as MP3',
    '.ytv <url> — download YouTube video',
    '.yt <url> — YouTube format picker with buttons',
    '.tiktok <url> — download TikTok video',
    '.ig <url> — download Instagram reel/photo',
    '.fb <url> — download Facebook video',
    '.twitter <url> — download Twitter/X video',
    '.spotify <url> — download Spotify track',
    '.sticker — convert image to sticker',
    '.toimg — convert sticker to image',
    '.tomp3 — convert quoted video to audio',
    '',
    '### AI & INTELLIGENCE',
    '.bera <question> — ask Bera AI anything',
    '.gpt <prompt> — GPT-powered response',
    '.gemini <prompt> — Google Gemini response',
    '.imagine <prompt> — AI image generation',
    '.translate <lang> <text> — translate text',
    '.ocr — extract text from quoted image',
    '.vision — describe a quoted image',
    '',
    '### TOOLS & UTILITIES',
    '.ping <host> — ping a host',
    '.ssweb <url> — screenshot a website',
    '.whois <domain> — domain lookup',
    '.weather <city> — current weather',
    '.calc <expr> — calculator',
    '.qr <text> — generate QR code',
    '.search <query> — web search',
    '.define <word> — dictionary definition',
    '.lyrics <song> — get lyrics',
    '.github <user/repo> — GitHub repo info',
    '',
    '### GROUP MANAGEMENT',
    '.kick @user — remove member',
    '.add <number> — add member',
    '.promote @user — make admin',
    '.demote @user — remove admin',
    '.mute — mute group (admins only)',
    '.unmute — unmute group',
    '.tagall — mention all members',
    '.warn @user — warn a member',
    '.antispam on/off — anti-spam protection',
    '.antilink on/off — block group links',
    '.setwelcome <msg> — set welcome message',
    '',
    '### FUN & GAMES',
    '.trivia — trivia question',
    '.joke — random joke',
    '.roast @user — roast someone',
    '.quote — motivational quote',
    '.riddle — riddle game',
    '.tictactoe @user — play tic-tac-toe',
    '.truth / .dare — truth or dare',
    '',
    '### BOT SETTINGS (owner only)',
    '.chatbera on/off — toggle AI auto-reply mode',
    '.ai on/off — same as chatbera toggle',
    '.mode public/private — set access mode',
    '.prefix <char> — change command prefix',
    '.block / .unblock @user',
    '',
    '## CONTEXT AWARENESS',
    '- You remember things said earlier in the conversation',
    '- When the user asks "run", "execute", "check", "show me" — use bash or system tool',
    '- When asked about current info or news — use search tool',
    '- When given a URL — offer to scrape it for info',
    '- Be concise in WhatsApp style (short paragraphs, bullet points)',
    '- Use emojis naturally but not excessively',
].join('\n')

// ── Conversation history (in-memory, per-chat) ────────────────────────────────
const HISTORY = {}
const pushHistory = (chat, role, content) => {
    if (!HISTORY[chat]) HISTORY[chat] = []
    HISTORY[chat].push({ role, content })
    if (HISTORY[chat].length > 20) HISTORY[chat] = HISTORY[chat].slice(-20)
}
const getHistory = (chat) => HISTORY[chat] || []

// ── Main: generate advanced reply with tool loop ──────────────────────────────
const generateAdvancedReply = async (text, chat, conn, m) => {
    pushHistory(chat, 'user', text)

    const mem = getMemory(chat)
    const memStr = Object.keys(mem).length ? '\nMemory: ' + JSON.stringify(mem) : ''

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT + memStr },
        ...getHistory(chat).slice(-10)
    ]

    let lastToolResult = null
    const MAX_LOOPS = 3

    for (let loop = 0; loop < MAX_LOOPS; loop++) {
        let aiReply
        try {
            aiReply = await callAI(messages, 30000)
        } catch (e) {
            return { success: false, reply: 'AI error: ' + e.message }
        }

        if (!aiReply || aiReply === 'RATELIMIT') {
            return { success: false, reply: 'AI is rate-limited, try again in a moment.' }
        }

        // Try to parse as tool call
        const jsonMatch = aiReply.match(/\{[^\n]*"tool"[^\n]*\}/)
        if (!jsonMatch) {
            // Plain reply — we're done
            pushHistory(chat, 'assistant', aiReply)
            return { success: true, reply: aiReply, toolUsed: lastToolResult?.tool || null }
        }

        let toolCall
        try { toolCall = JSON.parse(jsonMatch[0]) } catch { break }

        if (toolCall.tool === 'reply') {
            pushHistory(chat, 'assistant', toolCall.text || aiReply)
            return { success: true, reply: toolCall.text || aiReply }
        }

        // Execute the tool
        let toolResult = ''
        try {
            if (toolCall.tool === 'bash') {
                // Safety: block dangerous commands
                const BLOCKED = /rm\s+-rf\s+\/|mkfs|dd\s+if=|shutdown|reboot|>\s*\/etc\/passwd/
                if (BLOCKED.test(toolCall.cmd || '')) {
                    toolResult = 'Blocked: that command is too dangerous.'
                } else {
                    const r = await runBash(toolCall.cmd, 12000)
                    toolResult = r.output || 'Command completed with no output.'
                }
            } else if (toolCall.tool === 'search') {
                const r = await webSearch(toolCall.query || text)
                if (r.success && r.results.length) {
                    toolResult = r.results.map((x, i) => (i + 1) + '. ' + x.title + '\n   ' + x.snippet + (x.url ? '\n   ' + x.url : '')).join('\n\n')
                } else {
                    toolResult = 'No results found.'
                }
            } else if (toolCall.tool === 'scrape') {
                const r = await scrapeUrl(toolCall.url)
                toolResult = r.success ? r.text : 'Scrape failed: ' + r.error
            } else if (toolCall.tool === 'system') {
                const r = await systemInfo()
                toolResult = 'RAM: ' + r.ram + '\nDisk: ' + r.disk + '\nCPU: ' + r.cpu + '\nUptime: ' + r.uptime + '\nNode: ' + r.node
            }
        } catch (e) {
            toolResult = 'Tool error: ' + e.message
        }

        lastToolResult = { tool: toolCall.tool, result: toolResult }
        messages.push({ role: 'assistant', content: jsonMatch[0] })
        messages.push({ role: 'user', content: 'Tool result:\n' + toolResult + '\n\nNow give the user a clear answer based on this.' })
    }

    return { success: false, reply: 'Could not complete the request. Try again.' }
}

// ── Simple conversational reply (lightweight, no tools) ──────────────────────
const generateSimpleReply = async (text, chat) => {
    pushHistory(chat, 'user', text)
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...getHistory(chat).slice(-6)
    ]
    try {
        const reply = await callAI(messages, 20000)
        if (reply && reply !== 'RATELIMIT' && reply.length > 1) {
            pushHistory(chat, 'assistant', reply)
            return { success: true, reply }
        }
        return { success: false, reply: 'Bera AI is busy, try again.' }
    } catch (e) {
        return { success: false, reply: 'AI error: ' + e.message }
    }
}

// ── Memory management ─────────────────────────────────────────────────────────
const saveMemory = (chat, key, value) => remember(chat, key, value)
const clearHistory = (chat) => { delete HISTORY[chat] }
const clearMemory  = (chat) => { delete MEMORY[chat] }

module.exports = {
    generateAdvancedReply,
    generateSimpleReply,
    saveMemory,
    getMemory,
    clearHistory,
    clearMemory,
    webSearch,
    scrapeUrl,
    runBash,
    systemInfo
}