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

// ── Multi-model AI caller with automatic fallback ─────────────────────────────
// Models rotate through available Pollinations free models.
// Falls back to apiskeith.top if Pollinations is down or rate-limited.
// NOTE: 'gemini' was removed — Pollinations retired that model name.
const AI_MODELS = ['openai', 'mistral', 'deepseek', 'llama']
let _modelIdx = 0

const isPollinationsError = (text) => {
    if (!text) return true
    const t = text.trim()
    // Detect JSON error responses like {"error":"Model not found",...}
    if (t.startsWith('{') && t.includes('"error"')) return true
    if (t.startsWith('{') && t.includes('"status"') && t.includes('404')) return true
    return false
}

// ── Extract clean text from an AI response (strips reasoning_content JSON) ────
const parseAiText = (raw) => {
    if (!raw || typeof raw !== 'string') return null
    const t = raw.trim()
    // DeepSeek-R1 / o1-style: {"role":"assistant","reasoning_content":"...","content":"..."}
    if (t.startsWith('{') && t.includes('"content"')) {
        try {
            const obj = JSON.parse(t)
            if (obj.content && typeof obj.content === 'string' && obj.content.length > 1) {
                return obj.content.trim()
            }
        } catch {}
    }
    return t
}

const callPollinationsModel = (messages, model, timeoutMs) => {
    const body = JSON.stringify({ model, messages, seed: Math.floor(Math.random() * 99999) })
    return new Promise((resolve, reject) => {
        const req = require('https').request({
            hostname: 'text.pollinations.ai', path: '/', method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'Mozilla/5.0 (compatible; BeraAI/3.0)',
                'Referer': 'https://bera-ai.app',
                'Origin':  'https://bera-ai.app'
            }
        }, res => {
            let d = ''; res.on('data', c => d += c)
            res.on('end', () => {
                if (res.statusCode === 429)             return resolve('RATELIMIT')
                if (res.statusCode >= 500)              return resolve('ERROR')
                if (res.statusCode === 404 ||
                    res.statusCode === 400)              return resolve('ERROR')
                const raw = d.trim()
                if (isPollinationsError(raw))           return resolve('ERROR')
                // Strip reasoning_content blobs before returning
                const clean = parseAiText(raw)
                if (!clean || clean.length < 2)         return resolve('ERROR')
                resolve(clean)
            })
        })
        req.on('error', reject)
        req.setTimeout(timeoutMs || 30000, () => { req.destroy(); reject(new Error('AI timeout')) })
        req.write(body); req.end()
    })
}

// ── apiskeith.top: fast GET with just a query string (no 431 risk) ────────────
const callApiskeithFast = async (userText, timeoutMs) => {
    const FAST_ENDPOINTS = [
        'https://apiskeith.top/ai/gpt41Nano',
        'https://apiskeith.top/ai/gpt',
        'https://apiskeith.top/keithai',
    ]
    const q = `You are Bera AI — a smart WhatsApp assistant. Answer concisely.\n\nUser: ${(userText || '').slice(0, 500)}\nBera AI:`
    for (const url of FAST_ENDPOINTS) {
        try {
            const r = await axios.get(url, { params: { q }, timeout: timeoutMs || 12000 })
            const text = r.data?.result || r.data?.reply || r.data?.response || r.data?.message ||
                         r.data?.text || (typeof r.data === 'string' ? r.data : null)
            const clean = text && parseAiText(text)
            if (clean && clean.length > 1) return clean.trim()
        } catch {}
    }
    return null
}

// ── apiskeith.top: POST with full message array (history + system prompt) ─────
const callApiskeith = async (messages, timeoutMs) => {
    // Trim messages to avoid 431 — keep system + last 6 exchanges
    const trimmed = [
        messages[0], // system prompt (always keep)
        ...messages.slice(1).slice(-6)
    ].filter(Boolean)

    // Also trim system prompt content if it's enormous (> 2000 chars)
    if (trimmed[0]?.content?.length > 2000) {
        trimmed[0] = {
            ...trimmed[0],
            content: trimmed[0].content.slice(0, 2000) + '\n[truncated for speed]'
        }
    }

    const endpoints = [
        'https://apiskeith.top/ai/gpt41Nano',
        'https://apiskeith.top/ai/gpt',
    ]
    for (const url of endpoints) {
        try {
            const r = await axios.post(url, { messages: trimmed }, { timeout: timeoutMs || 20000 })
            const text = r.data?.result || r.data?.response || r.data?.message || r.data?.text ||
                         (typeof r.data === 'string' ? r.data : null)
            const clean = text && parseAiText(text)
            if (clean && clean.length > 1) return clean.trim()
        } catch {}
    }
    return null
}

const callAI = async (messages, timeoutMs) => {
    // ── PRIMARY: apiskeith fast GET — sub-second, no 431 risk ─────────────────
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    if (lastUser) {
        const fast = await callApiskeithFast(lastUser, Math.min(timeoutMs || 12000, 12000))
        if (fast) return fast
    }

    // ── SECONDARY: apiskeith POST with trimmed history ─────────────────────────
    const apiskeithResult = await callApiskeith(messages, Math.min(timeoutMs || 20000, 20000))
    if (apiskeithResult) return apiskeithResult

    // ── TERTIARY: Pollinations rotation (slowest, most capable) ───────────────
    for (let i = 0; i < AI_MODELS.length; i++) {
        const model = AI_MODELS[(_modelIdx + i) % AI_MODELS.length]
        try {
            const reply = await callPollinationsModel(messages, model, timeoutMs)
            if (reply && reply !== 'RATELIMIT' && reply !== 'ERROR' && reply.length > 1) {
                _modelIdx = (_modelIdx + i + 1) % AI_MODELS.length
                return reply
            }
        } catch {}
    }

    return 'RATELIMIT'
}

// ── PM2 process management ─────────────────────────────────────────────────────
const pm2List = async () => {
    const r = await runBash("pm2 list --no-color 2>/dev/null || echo 'PM2_NOT_FOUND'")
    return r
}

const pm2Logs = async (name, lines = 15) => {
    const safe = (name || '').replace(/[^a-zA-Z0-9_.-]/g, '')
    if (!safe) return { success: false, output: 'Invalid process name' }
    const r = await runBash(`pm2 logs ${safe} --lines ${lines} --nostream --no-color 2>&1 | tail -${lines}`)
    return r
}

const pm2Show = async (name) => {
    const safe = (name || '').replace(/[^a-zA-Z0-9_.-]/g, '')
    if (!safe) return { success: false, output: 'Invalid process name' }
    return runBash(`pm2 show ${safe} --no-color 2>/dev/null`)
}

const pm2Restart = async (name) => {
    const safe = (name || '').replace(/[^a-zA-Z0-9_.-]/g, '')
    if (!safe) return { success: false, output: 'Invalid process name' }
    return runBash(`pm2 restart ${safe} 2>&1`)
}

const pm2Stop = async (name) => {
    const safe = (name || '').replace(/[^a-zA-Z0-9_.-]/g, '')
    if (!safe) return { success: false, output: 'Invalid process name' }
    return runBash(`pm2 stop ${safe} 2>&1`)
}

// ── Rich server stats ─────────────────────────────────────────────────────────
const richServerStats = async () => {
    const os = require('os')
    const totalMem  = os.totalmem()
    const freeMem   = os.freemem()
    const usedMem   = totalMem - freeMem
    const load      = os.loadaverage ? os.loadaverage() : os.loadavg()
    const upSecs    = os.uptime()
    const days      = Math.floor(upSecs / 86400)
    const hrs       = Math.floor((upSecs % 86400) / 3600)
    const mins      = Math.floor((upSecs % 3600) / 60)
    const uptimeStr = `${days}d ${hrs}h ${mins}m`
    const toGi      = n => (n / 1073741824).toFixed(1)
    const toMi      = n => (n / 1048576).toFixed(0)

    const [disk, pm2raw] = await Promise.all([
        runBash("df -h / | awk 'NR==2{print $2, $3, $4, $5}'"),
        runBash("pm2 jlist 2>/dev/null || echo '[]'")
    ])

    let pm2Processes = []
    try {
        const parsed = JSON.parse(pm2raw.output)
        if (Array.isArray(parsed)) {
            pm2Processes = parsed.map(p => ({
                name:     p.name,
                status:   p.pm2_env?.status || '?',
                restarts: p.pm2_env?.restart_time || 0,
                memory:   toMi(p.monit?.memory || 0) + ' MB',
                cpu:      (p.monit?.cpu || 0) + '%',
                uptime:   p.pm2_env?.pm_uptime ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 60000) + 'm' : '?'
            }))
        }
    } catch {}

    const diskParts = (disk.output || '').split(/\s+/)

    return {
        memory: {
            total: toGi(totalMem) + ' GiB',
            used:  toGi(usedMem)  + ' GiB',
            free:  toGi(freeMem)  + ' GiB',
            pct:   Math.round(usedMem * 100 / totalMem) + '%'
        },
        disk: {
            total: diskParts[0] || '?',
            used:  diskParts[1] || '?',
            free:  diskParts[2] || '?',
            pct:   diskParts[3] || '?'
        },
        load:    load.map(l => l.toFixed(2)).join(', '),
        uptime:  uptimeStr,
        cpus:    os.cpus().length,
        pm2:     pm2Processes
    }
}

// ── MASTER SYSTEM PROMPT ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Bera AI — the most advanced AI agent ever built into a WhatsApp bot. Created by Developer Bera (Kenyan developer, bera-tech-ai on GitHub). You are NOT a simple chatbot — you are a fully autonomous AI agent with live tool access, real code execution, VPS server control, GitHub management, and mastery-level expertise in every technical domain.

## IDENTITY & AUTHORITY
- Name: Bera AI (Bera Agent Preview)
- Creator: Developer Bera — Kenyan developer, GitHub: bera-tech-ai
- Platform: WhatsApp multi-device (prefix: .)
- Authority: You have full authorized control over the owner's WhatsApp bot, VPS/server, and GitHub account. You can run shell commands, manage PM2 processes, deploy code, read logs, and manage repositories.
- Personality: Sharp, confident, uses light Kenyan slang naturally (mkuu, bana, waazi, enyewe, lakini). Never arrogant, always helpful and direct.
- Languages: Fluent in English, Swahili, Sheng. Always match the language the user uses.
- You are NEVER "just an AI that can't do things" — you have live tools and you USE them immediately.
- Powered by: Bera AI Engine (Keith API primary, Pollinations fallback)

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
{"tool":"pm2list"}
{"tool":"pm2logs","name":"process-name","lines":15}
{"tool":"pm2restart","name":"process-name"}
{"tool":"pm2stop","name":"process-name"}
{"tool":"reply","text":"your final answer"}

Rules:
- bash: file ops, git, npm, node scripts, anything shell-level
- search: current events, prices, news, live data you may not know
- scrape: when user provides a URL to analyze or read
- system: RAM, CPU, disk, uptime, load average, full server stats
- pm2list: list all PM2 managed processes with status, memory, CPU
- pm2logs: fetch last N lines of logs for a named PM2 process
- pm2restart: restart a PM2 process by name
- pm2stop: stop a PM2 process by name
- reply: conversational responses or final answer after tool results
- ONLY output JSON when calling a tool. Otherwise reply normally in plain text.

## FULL BOT COMMAND REFERENCE (prefix: .)
You know and can invoke every command below. When the user asks you to do something, find the right command and either guide them OR use the {"tool":"cmd","command":"kick","args":[...]} tool to execute it directly.

### 🤖 AI & CHAT
.bera <msg> — chat with Bera AI | .chatbot on/off — auto reply | .tagreply on/off — reply when tagged
.ask2 / .askbera <q> — AI answer | .summarize <text> — summarize | .explain <topic> — explain clearly
.improve <text> — improve writing | .proofread <text> — grammar fix | .formal / .casual <text> — change tone
.rewrite / .rephrase <text> — rephrase | .eli5 <topic> — explain like I'm 5 | .bullet <text> — bullet points
.essay <topic> — write essay | .email <topic> — write email | .tweet <text> — write tweet
.caption2 <desc> — IG caption | .expand <text> — elaborate | .complete <text> — autocomplete
.synonym <word> — synonyms | .antonym <word> — antonyms | .acronym <letters> — meaning
.nameai <desc> — brand name ideas | .sloganai <brand> — slogans | .bioai <info> — write bio
.sentiment <text> — analyze mood | .keyword <text> — extract keywords
.berarmemory — view AI memory | .beraforget — clear history | .berareset — full reset

### 💻 CODE & DEVELOPER TOOLS
.codegen <task> — AI code generator (any language)
.eng2code <desc> — write code from English description
.debugcode / .fixcode / .whatsthebug <code> — find & fix bugs
.code2eng / .codeexplain / .whatdoesthisdo <code> — explain code
.run / .bash <code> — execute JavaScript/bash live
.analyze <code> — deep code analysis
.autocomplete <code> — complete the code

### 🐙 GITHUB — FULL AGENT
.setghtoken <token> — save GitHub token
.ghuser <username> — GitHub user profile | .ghsearch <query> — search repos
.ghgist <file> | <text> — create secret gist | .gitget <url> — download file/repo
Natural language: "Bera create repo", "Bera list my repos", "Bera build a React app on GitHub",
"Bera create issue in repo", "Bera fork user/repo", "Bera show commits", "Bera list branches"

### 👥 GROUP MANAGEMENT (admin only)
.kick / .remove / .rm @user — remove member
.add <number> — add member
.promote @user — make admin | .demote @user — remove admin
.mute / .close / .lock — only admins can chat | .unmute / .open / .unlock — everyone can chat
.warn / .warn2 @user <reason> — warn user | .warnings / .warnlist — see all warnings
.ban @user — ban from bot | .unban @user — unban
.antilink on/off — remove links | .antibadwords / .antibad on/off — filter bad words
.antidel / .antidelete on/off — show deleted messages
.antispam on/off — limit spam | .antidemote / .antipromote on/off — protect admins
.admins / .alladmins — list group admins | .allusers — list all members
.grouplink / .link — get invite link | .revoke / .resetlink — reset invite link
.groupname <name> — rename group | .groupdesc <text> — set description
.grouppic / .setgrouppp — set group picture
.welcome on/off — welcome new members | .goodbye on/off — goodbye message
.adminmention / .all — tag all admins | .tagall / .everyone — tag everyone
.backupgroup — backup group | .groupstats — group statistics
.accept / .acceptall — accept join requests

### 🎵 MEDIA & DOWNLOADS
.play / .song <name> — YouTube MP3 download
.yt / .ytdl / .ytdownload <url> — YouTube download
.yts / .ytsearch <query> — search YouTube
.ytv / .ytvideo <url> — YouTube video
.spotify / .spot <name or url> — Spotify download
.tiktok / .tt <url> — TikTok download (no watermark)
.ig / .instagram <url> — Instagram download
.facebook / .fb <url> — Facebook download
.apk <app name> — APK search & download
.xvideo <search> — xvideos (adult, private chats only)

### 🎨 IMAGE & STICKER
.sticker / .s — image/video to sticker
.imagine / .draw / .aiimage <desc> — AI image generation
.vision / .see / .analyze — analyze quoted image
.cartoonstyle / .advancedglow — image effects
.meme — random meme | .cat — random cat | .dog — random dog

### 🌐 INFO & UTILITIES
.weather / .weather2 <city> — weather forecast
.define / .define2 <word> — dictionary & meaning
.translate / .tr / .tr2 <lang> <text> — translate text (100+ languages)
.calc / .calc2 <expression> — calculator | .bmi <weight> <height> — BMI
.qr / .qr2 <text> — QR code generator | .web / .websearch <q> — web search
.age <date> — age calculator | .worldtime <city> — world clock | .wtime <city> — time
.zodiac <sign> — horoscope | .bible <verse> — Bible verse | .birthday <date> — countdown

### 🎉 FUN & GAMES
.joke / .dadjoke — jokes | .roastme / .roast — roast | .8ball / .8b <q> — magic 8 ball
.trivia — trivia question | .slots — slot machine | .rps <r/p/s> — rock paper scissors
.wyr / .wouldyourather — would you rather | .nhie — never have I ever
.confession — random confession | .numfact <n> — number fact | .catfact — cat fact
.compliment — random compliment | .wheel <items> — spin wheel | .coin — flip coin
.truth — truth question | .dare — dare challenge | .riddle — riddle
.shipname <name1> <name2> — ship meter | .zodiac <sign> — horoscope

### 📝 TEXT TOOLS & FORMATTING
.bold / .boldfont <text> — bold text | .aesthetic <text> — aesthetic font
.backwards / .reverse <text> — reverse text | .zalgo <text> — zalgo effect
.ascii <text> — ASCII art | .uppercase / .lowercase <text> — case change
.wordcount / .wc <text> — word count | .charcount / .cc <text> — char count

### 🖥️ BERAHOST & BOT DEPLOYMENT
.bhmenu / .bhpanel / .berahostpanel — BeraHost panel
.bhbots / .botlist / .bhbera — list your deployed bots
.bhdeploy / .beradeploy / .botdeploy <repo> — deploy a bot
.bhstart / .bhstop <id> — start/stop a bot | .bhlogs <id> — get bot logs
.bhenv <id> <KEY=val> — set environment variable | .bhinfo <id> — bot info
.bhcoins / .bhmoney — check BeraHost credits | .bhpay / .bhmenu — payment
.bhhistory — deployment history | .bhmetrics — resource metrics

### 🔧 SERVER & PROCESS MANAGEMENT
Natural language: "Bera server stats", "Bera pm2 list", "Bera get last 15 logs of bera-ai"
"Bera bot stats", "Bera restart process X", "Bera show running apps"

### ⚙️ BOT SETTINGS (Owner only)
.update / .updatenow — check & install updates | .selfupdate — self update
.broadcast <msg> — send to all chats | .backup — backup database
.ban / .unban <number> — global ban | .premium / .depremium — premium users
.stats — bot statistics | .reload — reload plugins | .hotreload — reload without restart
.setprefix <char> — change prefix | .setbhkey <key> — set BeraHost API key
.poststatus <text> — post WhatsApp status | .autobio <text> — auto bio
.autoview on/off — auto status view | .autolike on/off — auto like status
.autoreply on/off — auto reply | .autotyping on/off — auto typing indicator

### 🔑 KEY & PREMIUM SYSTEM
.genkey — generate license key | .activate <key> — activate premium
.revokekey <key> — revoke key | .extendkey <key> — extend validity
.listkeys — list all keys | .checkkey <key> — check key status

### 📋 NOTES
.addnote / .note <title> | <text> — save note | .getnote / .note <title> — get note
.delnote <title> — delete note | .allnotes — list all notes | .clearnotes — clear all

## GITHUB AGENT POWERS
Full GitHub access as bera-tech-ai. Can:
- Create, list, delete repos (public or private)
- Scaffold complete projects (Node/Express/Python/Flask/React/HTML/WhatsApp Bot)
- Push files, create branches, open issues, fork repos, view commits, list files
Just say it in plain English — Bera handles everything automatically.

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
        ...getHistory(chat).slice(-6)   // keep 6 exchanges max — reduces request size & 431 risk
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
                const r = await richServerStats()
                const p = r.pm2.length
                    ? '\n\nPM2 Processes (' + r.pm2.length + '):\n' + r.pm2.map(p =>
                        `• ${p.name} [${p.status}] CPU:${p.cpu} MEM:${p.memory} ↺${p.restarts}`).join('\n')
                    : '\n\nPM2: not running / no processes'
                toolResult = `Memory: ${r.memory.used}/${r.memory.total} (${r.memory.pct} used)\nDisk: ${r.disk.used}/${r.disk.total} (${r.disk.pct} used, ${r.disk.free} free)\nLoad: ${r.load}\nUptime: ${r.uptime}\nCPUs: ${r.cpus}${p}`
            } else if (toolCall.tool === 'pm2list') {
                const r = await pm2List()
                toolResult = r.output || 'No PM2 output'
            } else if (toolCall.tool === 'pm2logs') {
                const r = await pm2Logs(toolCall.name, toolCall.lines || 15)
                toolResult = r.output || 'No logs'
            } else if (toolCall.tool === 'pm2restart') {
                const r = await pm2Restart(toolCall.name)
                toolResult = r.output || 'Restart issued'
            } else if (toolCall.tool === 'pm2stop') {
                const r = await pm2Stop(toolCall.name)
                toolResult = r.output || 'Stop issued'
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
    systemInfo,
    richServerStats,
    pm2List,
    pm2Logs,
    pm2Show,
    pm2Restart,
    pm2Stop
}