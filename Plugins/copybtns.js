// Plugins/copybtns.js — Commands with Copy buttons + enhanced outputs
// Replaces/wraps existing commands with button UI where useful
// Commands: lyrics2, define2, tr2, weather2, calc2, qr2, ask2, sticker2, profile2, btns

const axios = require('axios')
const { sendBtn, sendList, sendUrlBtn } = require('../Library/actions/btns')
const { getBtnMode, setBtnMode, clearBtnMode } = require('../Library/actions/btnmode')

const handle = {}
handle.command = [
    // Button toggle
    'btns', 'buttonmode', 'togglebtns', 'btnmode', 'btntoggle',
    // Enhanced commands with copy buttons
    'lyrics2', 'getlyrics', 'lyricsbt',
    'define2', 'dict2', 'dictbt',
    'tr2', 'trans2', 'translatebt',
    'weather2', 'wbt', 'weatherbt',
    'calc2', 'calculatebt',
    'qr2', 'qrbt', 'qrcode2',
    'ask2', 'aibt', 'askbt',
    'sticker2', 'stickerbt',
    'profile2', 'pfpbt', 'wapfp2',
    'warn2', 'warnbt',
    'search2', 'searchbt', 'googlebt',
]
handle.tags  = ['utility', 'tools', 'buttons', 'copy']
handle.help  = [
    'btns           — Toggle button mode ON/OFF for this chat',
    'btns on/off    — Explicitly set button mode',
    'btns global on — Set for all chats (owner only)',
    'lyrics2 <song> — Lyrics with copy button',
    'define2 <word> — Dictionary with copy button',
    'tr2 <lang> <t> — Translate with copy + swap',
    'weather2 <city>— Weather with °C/°F toggle',
    'calc2 <expr>   — Calculator with copy result',
    'qr2 <text>     — QR code with download button',
    'ask2 <q>       — AI answer with copy + follow-up',
    'warn2 @user    — Warn with action buttons',
    'search2 <q>    — Search with link buttons',
]

// ── Ask AI helper ─────────────────────────────────────────────────────────────
const askAI = async (prompt) => {
    try {
        const encoded = encodeURIComponent(prompt.slice(0, 500))
        const res = await axios.get('https://text.pollinations.ai/' + encoded, { timeout: 12000 })
        if (typeof res.data === 'string' && res.data.length > 5) return res.data.slice(0, 800)
    } catch {}
    return null
}

// ── Lyrics helper ─────────────────────────────────────────────────────────────
const getLyrics = async (query) => {
    try {
        const res = await axios.get('https://some-random-api.com/lyrics?title=' + encodeURIComponent(query), { timeout: 8000 })
        return res.data
    } catch {}
    try {
        // Fallback: lyrics.ovh
        const parts = query.split(' ')
        const artist = parts[0], title = parts.slice(1).join(' ')
        const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 8000 })
        if (res.data?.lyrics) return { lyrics: res.data.lyrics, title, author: artist }
    } catch {}
    return null
}

handle.all = async (m, { conn, command, args, prefix, reply, isOwner, isAdmin, isGroup, sender } = {}) => {
    const chat = m.chat || m.key?.remoteJid
    const text = args.join(' ').trim()
    const p    = prefix

    // ── BTNS TOGGLE ──────────────────────────────────────────────────────────
    if (['btns','buttonmode','togglebtns','btnmode','btntoggle'].includes(command)) {
        const current   = getBtnMode(chat)
        const arg0      = args[0]?.toLowerCase()
        const isGlobal  = args.includes('global')

        if (!arg0 || arg0 === 'status') {
            // Show current status with toggle button
            const mode = getBtnMode(chat) ? '🟢 ON (Button Mode)' : '⚪ OFF (Plain Text)'
            const glb  = getBtnMode(null)  ? '🟢 ON' : '⚪ OFF'
            const body = `╭══〘 *⚙️ Button Mode Settings* 〙═⊷\n┃\n┃ This chat:    *${mode}*\n┃ Global:       *${glb}*\n┃\n┃ When ON:  Bot sends interactive\n┃             buttons for commands\n┃\n┃ When OFF: Bot sends clean plain\n┃             text (classic mode)\n╰══════════════════⊷`

            if (current) {
                return sendBtn(conn, chat, m, body, [
                    { id: p + 'btns off',    text: '🔴 Turn Buttons OFF (This Chat)' },
                    { id: p + 'btns on',     text: '🟢 Keep Buttons ON' },
                ])
            } else {
                return reply(body + '\n\n' + p + 'btns on — Turn buttons ON\n' + p + 'btns off — Turn buttons OFF')
            }
        }

        if (['on','enable','1','true'].includes(arg0)) {
            if (isGlobal) {
                if (!isOwner) return reply('⛔ Owner only for global toggle.')
                setBtnMode(null, true, true)
                return reply('✅ *Buttons globally ON* — All chats will now see button UI.')
            }
            setBtnMode(chat, true)
            return reply('✅ *Buttons ON* for this chat. All supported commands will now show button UI!')
        }

        if (['off','disable','0','false'].includes(arg0)) {
            if (isGlobal) {
                if (!isOwner) return reply('⛔ Owner only for global toggle.')
                setBtnMode(null, false, true)
                return reply('⚪ *Buttons globally OFF* — All chats will use plain text mode.')
            }
            setBtnMode(chat, false)
            return reply('⚪ *Buttons OFF* for this chat. All commands will show plain text (classic mode).')
        }

        if (['reset','default','clear'].includes(arg0)) {
            clearBtnMode(chat)
            return reply('🔄 Button mode reset to global default for this chat.')
        }

        // Toggle current state
        const newState = !current
        setBtnMode(chat, newState)
        return reply(newState
            ? '✅ *Buttons toggled ON!* Interactive UI is now active.'
            : '⚪ *Buttons toggled OFF!* Classic text mode activated.')
    }

    // ── LYRICS WITH COPY ─────────────────────────────────────────────────────
    if (['lyrics2','getlyrics','lyricsbt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'lyrics2 <artist> <song name>\n\nExample: ' + p + 'lyrics2 weeknd blinding lights')
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        const data = await getLyrics(text)
        if (!data?.lyrics) return reply('❌ Lyrics not found for: ' + text)

        const lyrics    = data.lyrics.slice(0, 1500)
        const songTitle = data.title || text
        const artist    = data.author || data.artist?.name || 'Unknown'
        const body      = `╭══〘 *🎵 ${songTitle}* 〙═⊷\n┃ *${artist}*\n┃\n${lyrics.split('\n').slice(0,20).map(l => '┃ ' + l).join('\n')}\n╰══════════════════⊷`

        if (getBtnMode(chat)) {
            return sendBtn(conn, chat, m, body, [
                { id: 'copy_lyrics_' + Date.now(), text: '📋 Copy Lyrics' },
                { id: p + 'lyrics2 ' + text,       text: '🔄 Reload Lyrics' },
                { id: p + 'yt ' + artist + ' ' + songTitle, text: '🎵 Download Song' },
            ])
        } else {
            return reply(body)
        }
    }

    // ── DEFINE WITH COPY ─────────────────────────────────────────────────────
    if (['define2','dict2','dictbt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'define2 <word>')
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        try {
            const res  = await axios.get('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(text), { timeout: 8000 })
            const data = res.data?.[0]
            const def  = data?.meanings?.[0]?.definitions?.[0]
            const pos  = data?.meanings?.[0]?.partOfSpeech || 'n/a'
            const ex   = def?.example || ''
            const body = `╭══〘 *📖 ${data.word}* 〙═⊷\n┃ Part of speech: ${pos}\n┃\n┃ *Definition:*\n┃ ${(def?.definition || 'No definition found').replace(/\n/g, '\n┃ ')}\n${ex ? '┃\n┃ *Example:*\n┃ "' + ex + '"' : ''}\n╰══════════════════⊷`

            if (getBtnMode(chat)) {
                return sendBtn(conn, chat, m, body, [
                    { id: 'copy_def_' + Date.now(), text: '📋 Copy Definition' },
                    { id: p + 'synonym ' + text,    text: '💬 Synonyms' },
                    { id: p + 'antonym ' + text,    text: '🔄 Antonyms' },
                ])
            } else {
                return reply(body)
            }
        } catch {
            return reply('❌ Word not found: *' + text + '*')
        }
    }

    // ── TRANSLATE WITH COPY ──────────────────────────────────────────────────
    if (['tr2','trans2','translatebt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'tr2 <lang> <text>\n\nExample: ' + p + 'tr2 pt Hello world')
        const lang  = args[0]
        const input = args.slice(1).join(' ')
        if (!input) return reply('❌ Provide text to translate. Example: ' + p + 'tr2 es Hello!')
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        try {
            const { translate } = require('@vitalets/google-translate-api')
            const result = await translate(input, { to: lang })
            const body   = `╭══〘 *🌐 Translation* 〙═⊷\n┃ From: ${result.from?.language?.iso || 'auto'} → To: ${lang}\n┃\n┃ *Original:*\n┃ ${input}\n┃\n┃ *Translated:*\n┃ ${result.text}\n╰══════════════════⊷`

            if (getBtnMode(chat)) {
                const swapLang = result.from?.language?.iso || 'en'
                return sendBtn(conn, chat, m, body, [
                    { id: 'copy_tr_' + Date.now(),              text: '📋 Copy Translation' },
                    { id: p + 'tr2 ' + swapLang + ' ' + result.text, text: '🔄 Swap Languages' },
                ])
            } else {
                return reply(body)
            }
        } catch {
            return reply('❌ Translation failed. Try: ' + p + 'tr <lang> <text>')
        }
    }

    // ── WEATHER WITH TOGGLE ──────────────────────────────────────────────────
    if (['weather2','wbt','weatherbt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'weather2 <city name>\n\nExample: ' + p + 'weather2 Lagos')
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        try {
            const res  = await axios.get('https://wttr.in/' + encodeURIComponent(text) + '?format=j1', { timeout: 8000 })
            const d    = res.data?.current_condition?.[0]
            const loc  = res.data?.nearest_area?.[0]
            const city = loc?.areaName?.[0]?.value || text
            const coun = loc?.country?.[0]?.value || ''
            const tempC = d?.temp_C || '?'
            const tempF = d?.temp_F || '?'
            const desc  = d?.weatherDesc?.[0]?.value || 'Unknown'
            const humid = d?.humidity || '?'
            const wind  = d?.windspeedKmph || '?'
            const feelsC = d?.FeelsLikeC || tempC
            const feelsF = d?.FeelsLikeF || tempF

            const bodyC = `╭══〘 *🌤️ ${city}, ${coun}* 〙═⊷\n┃ 🌡️ Temp:     *${tempC}°C* (${feelsC}°C feels)\n┃ 💧 Humidity: ${humid}%\n┃ 🌬️ Wind:     ${wind} km/h\n┃ ☁️ ${desc}\n┃ 📅 ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}\n╰══════════════════⊷`
            const bodyF = `╭══〘 *🌤️ ${city}, ${coun}* 〙═⊷\n┃ 🌡️ Temp:     *${tempF}°F* (${feelsF}°F feels)\n┃ 💧 Humidity: ${humid}%\n┃ 🌬️ Wind:     ${wind} km/h\n┃ ☁️ ${desc}\n┃ 📅 ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}\n╰══════════════════⊷`

            if (getBtnMode(chat)) {
                return sendBtn(conn, chat, m, bodyC, [
                    { id: 'copy_weather_' + city,        text: '📋 Copy Weather Info' },
                    { id: p + 'weather2 ' + text + ' F', text: '🌡️ Switch to °F' },
                    { id: p + 'weather2 ' + text,        text: '🔄 Refresh' },
                ])
            } else {
                return reply(bodyC + '\n\n' + bodyF)
            }
        } catch {
            return reply('❌ City not found: *' + text + '*\n\nTry: ' + p + 'weather2 Lagos')
        }
    }

    // ── CALCULATOR WITH COPY ─────────────────────────────────────────────────
    if (['calc2','calculatebt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'calc2 <expression>\n\nExamples:\n' + p + 'calc2 15% of 2500\n' + p + 'calc2 sqrt(144)\n' + p + 'calc2 2^10')

        // Safe eval
        let result
        try {
            const expr = text
                .replace(/x/gi, '*').replace(/÷/g, '/').replace(/\^/g, '**')
                .replace(/(\d+)%\s*of\s*(\d+)/gi, '($1/100)*$2')
                .replace(/(\d+)%/g, '($1/100)')
                .replace(/sqrt\(([^)]+)\)/g, (_, n) => Math.sqrt(eval(n)))
                .replace(/pi/gi, Math.PI)
                .replace(/e(?=[^a-z]|$)/gi, Math.E)
            // eslint-disable-next-line no-new-func
            result = new Function('return ' + expr)()
            if (typeof result !== 'number' || !isFinite(result)) throw new Error('Invalid')
        } catch {
            return reply('❌ Could not calculate: *' + text + '*\n\nCheck your expression and try again.')
        }

        const resultStr = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '')
        const body      = `╭══〘 *🔢 Calculator* 〙═⊷\n┃\n┃ Expression: *${text}*\n┃ Result:     *${resultStr}*\n╰══════════════════⊷`

        if (getBtnMode(chat)) {
            return sendBtn(conn, chat, m, body, [
                { id: 'copy_calc_' + resultStr, text: '📋 Copy Result (' + resultStr + ')' },
                { id: p + 'calc2 ',             text: '🔢 New Calculation' },
            ])
        } else {
            return reply(body)
        }
    }

    // ── QR CODE WITH DOWNLOAD ────────────────────────────────────────────────
    if (['qr2','qrbt','qrcode2'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'qr2 <text or URL>')
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(text)
        try {
            await conn.sendMessage(chat, {
                image:   { url: qrUrl },
                caption: `📱 *QR Code Generated*\n\n📝 Content:\n${text.slice(0, 200)}\n\n_Scan with any QR reader_`
            }, { quoted: m })

            if (getBtnMode(chat)) {
                return sendBtn(conn, chat, m, '╭══〘 *📱 QR Code Ready* 〙═⊷\n┃ Choose what to do:\n╰══════════════════⊷', [
                    { id: 'copy_qrtext_' + Date.now(), text: '📋 Copy QR Content/URL' },
                    { id: p + 'qr2 ' + text,          text: '🔄 Regenerate QR' },
                ])
            }
        } catch {
            return reply('❌ Failed to generate QR code.')
        }
    }

    // ── AI ANSWER WITH COPY + FOLLOW-UP ──────────────────────────────────────
    if (['ask2','aibt','askbt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'ask2 <question>')
        await reply('⏳ Asking Bera AI...')
        const answer = await askAI('Answer this concisely and clearly: ' + text)
        if (!answer) return reply('❌ AI unavailable. Try again.')

        const body = `╭══〘 *🧠 Bera AI* 〙═⊷\n┃ *Q:* ${text.slice(0,60)}${text.length>60?'...':''}\n┃\n${answer.split('\n').map(l => '┃ '+l).join('\n')}\n╰══════════════════⊷`

        if (getBtnMode(chat)) {
            return sendBtn(conn, chat, m, body, [
                { id: 'copy_ai_' + Date.now(),        text: '📋 Copy Answer' },
                { id: p + 'ask2 ' + text,             text: '🔄 Ask Again' },
                { id: p + 'ask2 ',                    text: '💬 Follow Up Question' },
            ])
        } else {
            return reply(body)
        }
    }

    // ── SEARCH WITH LINK BUTTONS ─────────────────────────────────────────────
    if (['search2','searchbt','googlebt'].includes(command)) {
        if (!text) return reply('❌ Usage: ' + p + 'search2 <query>')
        const googleUrl = 'https://www.google.com/search?q=' + encodeURIComponent(text)
        const bingUrl   = 'https://www.bing.com/search?q=' + encodeURIComponent(text)
        const ytUrl     = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(text)
        const body      = `╭══〘 *🔍 Search: ${text.slice(0,40)}* 〙═⊷\n┃ Open on your preferred platform:\n╰══════════════════⊷`

        if (getBtnMode(chat)) {
            return sendBtn(conn, chat, m, body, [
                { id: googleUrl, text: '🌐 Google Search' },
                { id: ytUrl,     text: '▶️ YouTube Results' },
                { id: bingUrl,   text: '🔵 Bing Search' },
            ])
        } else {
            return reply(body + '\n\n' + googleUrl)
        }
    }

    // ── WARN2 WITH ACTION BUTTONS ─────────────────────────────────────────────
    if (['warn2','warnbt'].includes(command)) {
        // Delegate to groupplus.js warn — just wrap the response with action buttons
        const mentioned = m.mentionedJid?.[0]
        const reason    = args.filter(a => !a.match(/@\d+/)).join(' ').trim() || 'No reason given'
        if (!mentioned) return reply('❌ Usage: ' + p + 'warn2 @user <reason>')

        // Use the global warn store from groupplus
        const warns    = global.beraWarns || (global.beraWarns = {})
        const key      = (m.chat || m.key?.remoteJid) + '_' + mentioned
        warns[key]     = (warns[key] || 0) + 1
        const count    = warns[key]

        const body = `⚠️ *Warning Issued*\n\n👤 User: @${mentioned.split('@')[0]}\n📝 Reason: ${reason}\n🔢 Warnings: ${count}/3\n${count >= 2 ? '\n⚡ ' + (3-count) + ' more warning = auto-kick!' : ''}`

        if (getBtnMode(chat)) {
            return sendBtn(conn, chat, m, body, [
                { id: 'warn_forgive_' + mentioned, text: '✅ Forgive (Remove Warning)' },
                { id: 'warn_kick_'    + mentioned, text: '⛔ Kick Now' },
                { id: 'warn_mute_'    + mentioned, text: '🔕 Mute 1 Hour' },
            ], { mentions: [mentioned] })
        } else {
            await conn.sendMessage(m.chat, { text: body, mentions: [mentioned] })
        }
    }
}

module.exports = handle
