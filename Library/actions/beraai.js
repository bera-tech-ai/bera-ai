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

// ── MASTER SYSTEM PROMPT ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Bera AI — the most advanced AI assistant ever built into a WhatsApp bot, created by Developer Bera (Kenyan developer). You are not just a chatbot — you are a fully autonomous AI agent with real tools, real code execution, and mastery-level expertise in every technical domain.

## IDENTITY
- Name: Bera AI
- Creator: Developer Bera (bera-tech-ai on GitHub)
- Platform: WhatsApp (prefix: .)
- Personality: Sharp, confident, uses light Kenyan slang naturally (mkuu, bana, waazi, enyewe, lakini). Never arrogant, always helpful.
- Languages: Fluent in English, Swahili, Sheng. Match the language the user uses.
- You are NEVER "just an AI that can't do things" — you have tools and you USE them.

## REASONING PROTOCOL
Before answering anything complex:
1. THINK — understand exactly what is being asked
2. PLAN — outline what you'll do or what the code needs
3. EXECUTE — write the complete solution
4. VERIFY — mentally trace through the solution for correctness

For code: ALWAYS trace through edge cases before outputting. Never write incomplete functions.

## CODE MASTERY — CRITICAL RULES
You are a senior software engineer with 15+ years experience. When writing code:

### ALWAYS:
- Write COMPLETE, PRODUCTION-READY code (never "// TODO" or "// add your logic here")
- Include ALL imports/requires at the top
- Add proper error handling (try/catch, null checks, validation)
- Add clear, concise comments only where logic is non-obvious
- Use modern syntax (async/await over callbacks, const/let, arrow functions for JS)
- Validate inputs before using them
- Handle edge cases (empty arrays, null values, network errors, etc.)
- Include a working example usage at the bottom

### LANGUAGES YOU MASTER:
- JavaScript/Node.js: Express, Fastify, socket.io, Baileys, Mongoose, Prisma, JWT, APIs
- TypeScript: interfaces, generics, decorators, strict mode
- Python: FastAPI, Flask, Django, asyncio, pandas, requests, SQLAlchemy
- Bash/Shell: scripting, cron, process management, file ops, git automation
- HTML/CSS: semantic HTML5, Flexbox, Grid, animations, responsive design
- React/Next.js: hooks, context, server components, SSR, API routes
- SQL: complex queries, JOINs, indexes, transactions (MySQL, PostgreSQL, SQLite)
- Go, Java, C++, Rust: solid working knowledge
- WhatsApp bot development (Baileys/Toxic-Baileys): messages, media, groups, buttons
- APIs: REST design, rate limiting, auth (JWT/OAuth), webhooks

### CODE FORMAT:
Always wrap code in markdown code blocks with language tag:
\`\`\`javascript
// Complete working code here
\`\`\`

### NEVER:
- Write placeholder code ("your logic here", "implement this", "add more")
- Leave functions empty or half-done
- Forget error handling
- Omit imports
- Produce code that would fail on first run

## TOOL CALLING
When you need to DO something, respond ONLY with valid JSON on ONE line:
{"tool":"bash","cmd":"your command here"}
{"tool":"search","query":"what to search for"}
{"tool":"scrape","url":"https://..."}
{"tool":"system"}
{"tool":"reply","text":"your final answer"}

Rules:
- bash: file ops, git, npm, node processes, logs, anything shell
- search: current events, prices, news, docs you may not know
- scrape: when user gives a URL to analyze
- system: RAM, CPU, disk, uptime, server status
- reply: conversational responses or after tool results
- ONLY output JSON when calling a tool. Otherwise reply normally.

## BOT CAPABILITIES (prefix: .)
.play / .song <name> — YouTube audio download (MP3)
.bera <msg> — chat with Bera AI (also: just say "Bera ...")
.imagine / .draw <desc> — AI image generation
.vision / .see — analyze a quoted image
.codegen <task> — AI code generator (all languages)
.search / .google <q> — web search
.define <word> — dictionary
.translate / .tr <lang> <text> — translation
.weather <city> — weather
.calc <expr> — calculator
.qr <text> — QR code
.sticker — image to sticker
.github → manages GitHub repos/files/branches via natural language
.run <code> — execute JavaScript code live
.eng2code <desc> — write code in any language
.debugcode <code> — find and fix bugs
.menu / .help — full command list

## GITHUB AGENT POWERS
Bera has full GitHub access as bera-tech-ai. Can:
- Create, list, delete repos
- Scaffold full projects (Node/Express/Python/Flask/React/HTML/Bot)
- Push files, create branches, open issues, fork repos, view commits
Just say it in plain English and Bera does it.

## CONTEXT & MEMORY
- You remember everything said in this conversation
- When asked to "run", "execute", "check" anything → use bash tool
- When asked about current info, news, prices → use search tool
- When given a URL → scrape and analyze it
- WhatsApp-optimized replies: short paragraphs, bullets, limited emojis
- For complex questions: think step by step, show your reasoning

## VOICE NOTES
When the user sends a voice note that has been transcribed for you, treat the transcription as their full message. Respond to what they said as naturally as you would a typed message.`

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

// ── Code validation & auto-fix pipeline ──────────────────────────────────────
// Extracts code blocks, syntax-checks them, auto-fixes via AI on error
const { writeFileSync, unlinkSync, existsSync } = require('fs')
const { execSync } = require('child_process')
const os = require('os')
const path = require('path')

const LANG_CHECKERS = {
    javascript: (file) => { try { execSync(`node --check "${file}"`, { timeout: 8000 }); return null } catch (e) { return e.stderr?.toString().trim() || e.message } },
    js:         (file) => LANG_CHECKERS.javascript(file),
    typescript: (file) => { try { execSync(`npx --yes tsc --noEmit --allowJs "${file}"`, { timeout: 15000 }); return null } catch (e) { return e.stderr?.toString().trim().slice(0, 500) || e.message } },
    ts:         (file) => LANG_CHECKERS.typescript(file),
    python:     (file) => { try { execSync(`python3 -m py_compile "${file}"`, { timeout: 8000 }); return null } catch (e) { return e.stderr?.toString().trim() || e.message } },
    py:         (file) => LANG_CHECKERS.python(file),
    bash:       (file) => { try { execSync(`bash -n "${file}"`, { timeout: 5000 }); return null } catch (e) { return e.stderr?.toString().trim() || e.message } },
    sh:         (file) => LANG_CHECKERS.bash(file),
}

const EXT_MAP = { javascript: '.js', js: '.js', typescript: '.ts', ts: '.ts', python: '.py', py: '.py', bash: '.sh', sh: '.sh' }

const extractCodeBlocks = (text) => {
    const blocks = []
    const regex = /```(\w+)?\n?([\s\S]*?)```/g
    let m
    while ((m = regex.exec(text)) !== null) {
        const lang = (m[1] || 'text').toLowerCase()
        const code = m[2].trim()
        if (code.length > 10) blocks.push({ lang, code })
    }
    return blocks
}

const validateAndFixCode = async (aiResponse, taskDescription = '') => {
    const blocks = extractCodeBlocks(aiResponse)
    if (!blocks.length) return { response: aiResponse, fixed: false, errors: [] }

    const errors = []
    let response = aiResponse
    let anyFixed = false

    for (const block of blocks) {
        const checker = LANG_CHECKERS[block.lang]
        if (!checker) continue

        const ext  = EXT_MAP[block.lang] || '.txt'
        const tmpFile = path.join(os.tmpdir(), `bera_validate_${Date.now()}${ext}`)

        let currentCode = block.code
        let lastError   = null

        for (let attempt = 0; attempt < 3; attempt++) {
            try { writeFileSync(tmpFile, currentCode, 'utf8') } catch { break }

            const syntaxError = checker(tmpFile)
            try { if (existsSync(tmpFile)) unlinkSync(tmpFile) } catch {}

            if (!syntaxError) {
                if (attempt > 0) {
                    response = response.replace(block.code, currentCode)
                    anyFixed = true
                }
                lastError = null
                break
            }

            lastError = syntaxError
            if (attempt === 2) break

            // Ask AI to fix the error
            try {
                const fixPrompt = [
                    { role: 'system', content: 'You are an expert programmer. Fix the syntax error in the code. Return ONLY the corrected code inside a markdown code block — no explanation.' },
                    { role: 'user', content: `This ${block.lang} code has a syntax error:\n\n\`\`\`${block.lang}\n${currentCode}\n\`\`\`\n\nError: ${syntaxError}\n\nFix it and return only the corrected code.` }
                ]
                const fixed = await callAI(fixPrompt, 20000)
                const fixedBlocks = extractCodeBlocks(fixed)
                if (fixedBlocks.length) currentCode = fixedBlocks[0].code
                else {
                    const codeMatch = fixed.match(/```[\w]*\n?([\s\S]+?)```/)
                    if (codeMatch) currentCode = codeMatch[1].trim()
                }
            } catch { break }
        }

        if (lastError) errors.push({ lang: block.lang, error: lastError })
    }

    return { response, fixed: anyFixed, errors }
}

// ── Voice / audio transcription ───────────────────────────────────────────────
const transcribeAudio = async (audioBuffer) => {
    if (!audioBuffer || audioBuffer.length < 100) return { success: false, error: 'Empty audio buffer' }

    const FormData = (() => { try { return require('form-data') } catch { return null } })()
    if (!FormData) return { success: false, error: 'FormData module not available' }

    const endpoints = [
        'https://apiskeith.top/ai/whisper',
        'https://apiskeith.top/ai/transcribe',
        'https://apiskeith.top/tools/speech2text',
    ]

    for (const url of endpoints) {
        try {
            const form = new FormData()
            form.append('audio', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' })
            const res = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                timeout: 30000,
                maxContentLength: 10 * 1024 * 1024
            })
            const text = res.data?.result || res.data?.text || res.data?.transcription || res.data?.data
            if (text && typeof text === 'string' && text.trim().length > 0) {
                return { success: true, text: text.trim() }
            }
        } catch {}
    }

    // Fallback: try base64 approach
    try {
        const b64 = audioBuffer.toString('base64')
        const res = await axios.post('https://text.pollinations.ai/', {
            model: 'openai',
            messages: [
                { role: 'system', content: 'You are a voice transcription assistant. The user has sent you a base64-encoded audio file. Transcribe the speech content. If you cannot process audio, say UNABLE_TO_TRANSCRIBE.' },
                { role: 'user', content: `Transcribe this audio (base64): ${b64.slice(0, 500)}...` }
            ]
        }, { timeout: 15000 })
        const text = typeof res.data === 'string' ? res.data : ''
        if (text && !text.includes('UNABLE_TO_TRANSCRIBE') && text.length > 2) {
            return { success: true, text: text.trim() }
        }
    } catch {}

    return { success: false, error: 'Transcription service unavailable' }
}

module.exports = {
    generateAdvancedReply,
    generateSimpleReply,
    validateAndFixCode,
    transcribeAudio,
    saveMemory,
    getMemory,
    clearHistory,
    clearMemory,
    webSearch,
    scrapeUrl,
    runBash,
    systemInfo
}