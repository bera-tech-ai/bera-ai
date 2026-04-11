/**
 * Bera AI — Extra Commands Plugin
 * Covers: bible, shorteners, tempmail, logo makers, games, notes,
 *         media converters, sports, tools, and BeraHost deploy
 */
const axios = require('axios')
const config = require('../Config')
const fs = require('fs')
const path = require('path')

const BERAHOST_API = 'https://kingvon-bot-hosting.replit.app/api'
const BERAHOST_KEY = process.env.BERAHOST_API_KEY || ''
const APISKEITH = 'https://apiskeith.top'
const GIFTED_API = 'https://api.mauricegift.xyz'

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
const react = (conn, m, emoji) =>
    conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

// ─────────────────────────────────────────────
// Notes (in-memory + DB)
// ─────────────────────────────────────────────
const getNotes = (chat) => {
    if (!global.db.data.notes) global.db.data.notes = {}
    if (!global.db.data.notes[chat]) global.db.data.notes[chat] = {}
    return global.db.data.notes[chat]
}

// ─────────────────────────────────────────────
// Games state
// ─────────────────────────────────────────────
const diceGames = {}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────
const handle = async (m, { conn, text, reply, prefix, command, isOwner, sender, chat, isGroup }) => {

    // ── BIBLE ─────────────────────────────────
    if (command === 'bible' || command === 'verse') {
        if (!text) return reply(`📖 Usage: ${prefix}bible <book chapter:verse>\nExample: ${prefix}bible John 3:16`)
        await react(conn, m, '📖')
        try {
            const res = await axios.get(`${GIFTED_API}/api/bible`, { params: { q: text, apikey: process.env.GIFTED_API_KEY || '' }, timeout: 15000 })
            const d = res.data
            const verse = d?.result || d?.verse || d?.text || d?.data
            if (!verse) return reply('❌ Verse not found. Try format: John 3:16')
            const ref = d?.reference || text
            await react(conn, m, '✅')
            return reply(`📖 *${ref}*\n\n${verse}`)
        } catch (e) {
            // Fallback: Bible-api.com
            try {
                const q = text.replace(/\s+/g, '+')
                const r2 = await axios.get(`https://bible-api.com/${encodeURIComponent(text)}`, { timeout: 10000 })
                const d2 = r2.data
                if (d2?.text) {
                    await react(conn, m, '✅')
                    return reply(`📖 *${d2.reference || text}*\n\n${d2.text.trim()}`)
                }
            } catch {}
            await react(conn, m, '❌')
            return reply(`❌ Could not fetch verse: ${e.message}`)
        }
    }

    // ── SHORTENERS ────────────────────────────
    if (['tinyurl','shorturl','shortenurl','shorten'].includes(command)) {
        if (!text || !text.startsWith('http')) return reply(`🔗 Usage: ${prefix}tinyurl <url>`)
        await react(conn, m, '🔗')
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`, { timeout: 10000 })
            await react(conn, m, '✅')
            return reply(`🔗 *Shortened URL*\n\n*Original:* ${text}\n*Short:* ${res.data}`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Failed to shorten URL: ${e.message}`)
        }
    }

    // ── TEMP MAIL ─────────────────────────────
    if (command === 'tempmail') {
        await react(conn, m, '📧')
        try {
            const res = await axios.get(`${GIFTED_API}/api/tempmail?action=create`, { timeout: 15000 })
            const d = res.data
            const email = d?.result?.email || d?.email || d?.data?.email
            const token = d?.result?.token || d?.token || d?.data?.token || ''
            if (!email) return reply('❌ Could not create temp mail. Try again.')
            const userData = global.db.data.users[sender] || {}
            userData.tempMail = { email, token }
            global.db.data.users[sender] = userData
            await global.db.write()
            await react(conn, m, '✅')
            return reply(
                `╭══〘 *📧 TEMP MAIL* 〙═⊷\n` +
                `┃❍ *Email:* ${email}\n` +
                `┃❍ *Token:* ${token || 'N/A'}\n` +
                `┃\n` +
                `┃ Use ${prefix}inbox to check messages\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Temp mail error: ${e.message}`)
        }
    }

    if (command === 'inbox' || command === 'tempinbox' || command === 'readmail') {
        const userData = global.db.data.users[sender] || {}
        const mail = userData.tempMail
        if (!mail?.email) return reply(`❌ No temp mail found. Run ${prefix}tempmail first.`)
        await react(conn, m, '📬')
        try {
            const res = await axios.get(`${GIFTED_API}/api/tempmail?action=inbox&email=${encodeURIComponent(mail.email)}&token=${mail.token || ''}`, { timeout: 15000 })
            const msgs = res.data?.result || res.data?.messages || res.data?.data || []
            if (!msgs.length) {
                await react(conn, m, '✅')
                return reply(`📭 *Inbox Empty*\n\n*Email:* ${mail.email}\n\nNo messages yet.`)
            }
            const preview = msgs.slice(0, 3).map((msg, i) => {
                const from = msg.from || msg.sender || 'Unknown'
                const subj = msg.subject || 'No subject'
                const body = (msg.body || msg.text || msg.html || '').replace(/<[^>]+>/g,'').slice(0, 200)
                return `*${i+1}. ${subj}*\n_From: ${from}_\n${body}`
            }).join('\n\n─────────\n\n')
            await react(conn, m, '✅')
            return reply(`╭══〘 *📬 INBOX* 〙═⊷\n*Email:* ${mail.email}\n*Messages:* ${msgs.length}\n\n${preview}\n╰══════════════════⊷`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Could not read inbox: ${e.message}`)
        }
    }

    if (command === 'delmail' || command === 'deltempmail') {
        const userData = global.db.data.users[sender] || {}
        if (!userData.tempMail) return reply('❌ No temp mail to delete.')
        delete userData.tempMail
        global.db.data.users[sender] = userData
        await global.db.write()
        return reply('✅ Temp mail deleted.')
    }

    // ── LOGO MAKERS ───────────────────────────
    const logoCommands = {
        'glowingtext': 'glowingtext', 'neontext': 'neonglitch', 'glitchtext': 'glitchtext',
        'gradienttext': 'gradienttext', 'galaxytext': 'galaxystyle', 'luxurytext': 'luxurygold',
        'logomaker': 'logomaker', 'cartoonstyle': 'cartoonstyle', 'advancedglow': 'advancedglow',
        'writetext': 'writetext', 'typographytext': 'typographytext', 'ttp': 'ttp'
    }
    if (logoCommands[command]) {
        if (!text) return reply(`✏️ Usage: ${prefix}${command} <your text>`)
        await react(conn, m, '🎨')
        try {
            const ep = logoCommands[command]
            const res = await axios.get(`${GIFTED_API}/api/${ep}`, {
                params: { text, q: text, apikey: process.env.GIFTED_API_KEY || '' },
                timeout: 30000
            })
            const d = res.data
            const imgUrl = d?.result?.url || d?.url || d?.image || d?.result
            if (!imgUrl || typeof imgUrl !== 'string') return reply(`❌ Logo API returned no image.`)
            await react(conn, m, '✅')
            return conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: `🎨 *${command}*: ${text}` }, { quoted: m })
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Logo error: ${e.message}`)
        }
    }

    // ── NOTES ─────────────────────────────────
    if (command === 'addnote') {
        const parts = text?.split('|')
        if (!parts || parts.length < 2) return reply(`📝 Usage: ${prefix}addnote <name> | <content>`)
        const name = parts[0].trim().toLowerCase()
        const content = parts.slice(1).join('|').trim()
        const notes = getNotes(chat)
        notes[name] = { content, by: sender, at: Date.now() }
        global.db.data.notes[chat] = notes
        await global.db.write()
        await react(conn, m, '✅')
        return reply(`✅ Note *${name}* saved.`)
    }

    if (command === 'getnote' || command === 'note') {
        if (!text) return reply(`📝 Usage: ${prefix}getnote <name>`)
        const name = text.trim().toLowerCase()
        const notes = getNotes(chat)
        const note = notes[name]
        if (!note) return reply(`❌ Note *${name}* not found. Use ${prefix}notes to list all.`)
        return reply(`📝 *${name}*\n\n${note.content}`)
    }

    if (command === 'notes' || command === 'listnotes' || command === 'getnotes') {
        const notes = getNotes(chat)
        const keys = Object.keys(notes)
        if (!keys.length) return reply(`📝 No notes saved here. Use ${prefix}addnote name | content`)
        const list = keys.map((k, i) => `${i+1}. *${k}*`).join('\n')
        return reply(`╭══〘 *📝 NOTES* 〙═⊷\n${list}\n╰══════════════════⊷\n\nUse ${prefix}getnote <name> to read.`)
    }

    if (command === 'delnote' || command === 'deletenote') {
        if (!text) return reply(`📝 Usage: ${prefix}delnote <name>`)
        const name = text.trim().toLowerCase()
        const notes = getNotes(chat)
        if (!notes[name]) return reply(`❌ Note *${name}* not found.`)
        delete notes[name]
        global.db.data.notes[chat] = notes
        await global.db.write()
        return reply(`✅ Note *${name}* deleted.`)
    }

    if (command === 'delnotes' || command === 'clearallnotes' || command === 'delallnotes') {
        if (!isOwner && !isGroup) return reply('⛔ Admin/Owner only.')
        global.db.data.notes[chat] = {}
        await global.db.write()
        return reply('✅ All notes cleared.')
    }

    // ── DICE GAME ─────────────────────────────
    if (command === 'dice' || command === 'roll') {
        await react(conn, m, '🎲')
        const result = Math.floor(Math.random() * 6) + 1
        const dots = ['⚀','⚁','⚂','⚃','⚄','⚅']
        return reply(`🎲 You rolled: *${dots[result-1]}* (${result})`)
    }

    if (command === 'diceduel') {
        const targetMention = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        if (!targetMention) return reply(`🎲 Usage: ${prefix}diceduel @user\n_Challenge someone to a dice duel!_`)
        const r1 = Math.floor(Math.random() * 6) + 1
        const r2 = Math.floor(Math.random() * 6) + 1
        const you = sender.split('@')[0]
        const them = targetMention.split('@')[0]
        let result = ''
        if (r1 > r2) result = `🏆 +${you} wins!`
        else if (r2 > r1) result = `🏆 +${them} wins!`
        else result = `🤝 It's a tie!`
        return reply(`🎲 *Dice Duel!*\n\n+${you}: ${r1}\n+${them}: ${r2}\n\n${result}`)
    }

    // ── SPORTS ────────────────────────────────
    if (command === 'livescore' || command === 'scores') {
        await react(conn, m, '⚽')
        try {
            const res = await axios.get(`${GIFTED_API}/api/livescore`, { timeout: 15000 })
            const matches = res.data?.result || res.data?.data || res.data
            if (!Array.isArray(matches) || !matches.length) return reply('⚽ No live matches right now.')
            const lines = matches.slice(0, 8).map(m => {
                const home = m.home || m.homeTeam || m.team1 || ''
                const away = m.away || m.awayTeam || m.team2 || ''
                const score = m.score || `${m.homeScore || 0}-${m.awayScore || 0}`
                const time = m.time || m.minute || m.status || ''
                return `⚽ *${home}* ${score} *${away}* _${time}_`
            }).join('\n')
            await react(conn, m, '✅')
            return reply(`╭══〘 *⚽ LIVE SCORES* 〙═⊷\n${lines}\n╰══════════════════⊷`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Live score error: ${e.message}`)
        }
    }

    if (command === 'sportnews') {
        await react(conn, m, '📰')
        try {
            const q = text || 'football news today'
            const res = await axios.get(`${GIFTED_API}/api/news`, { params: { q }, timeout: 15000 })
            const items = res.data?.result || res.data?.data || res.data || []
            const list = (Array.isArray(items) ? items : []).slice(0, 5).map((n,i) => {
                const title = n.title || n.headline || ''
                const src = n.source || n.publisher || ''
                return `${i+1}. *${title}*${src ? '\n   _'+src+'_' : ''}`
            }).join('\n\n')
            await react(conn, m, '✅')
            return reply(`╭══〘 *📰 SPORT NEWS* 〙═⊷\n${list || 'No news found.'}\n╰══════════════════⊷`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Sports news error: ${e.message}`)
        }
    }

    // ── TOOLS ─────────────────────────────────
    if (command === 'define' || command === 'dict') {
        if (!text) return reply(`📖 Usage: ${prefix}define <word>`)
        await react(conn, m, '📖')
        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`, { timeout: 10000 })
            const entry = res.data?.[0]
            if (!entry) return reply('❌ Word not found.')
            const meanings = entry.meanings?.slice(0,2).map(m => {
                const defs = m.definitions?.slice(0,2).map((d,i) => `  ${i+1}. ${d.definition}`).join('\n') || ''
                return `*${m.partOfSpeech}*\n${defs}`
            }).join('\n\n') || ''
            await react(conn, m, '✅')
            return reply(`📖 *${entry.word}*\n\n${meanings}`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Dictionary error: ${e.message}`)
        }
    }

    if (command === 'weather') {
        if (!text) return reply(`🌦️ Usage: ${prefix}weather <city>`)
        await react(conn, m, '🌦️')
        try {
            const res = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=3`, { timeout: 10000 })
            await react(conn, m, '✅')
            return reply(`🌦️ *Weather*\n\n${res.data}`)
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Weather error: ${e.message}`)
        }
    }

    if (command === 'qr' || command === 'createqr' || command === 'qrcode') {
        if (!text) return reply(`📷 Usage: ${prefix}qr <text or url>`)
        await react(conn, m, '📷')
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`
        await react(conn, m, '✅')
        return conn.sendMessage(m.chat, { image: { url: qrUrl }, caption: `📷 QR Code for: ${text}` }, { quoted: m })
    }

    if (command === 'uptime') {
        const up = process.uptime()
        const h = Math.floor(up / 3600)
        const min = Math.floor((up % 3600) / 60)
        const sec = Math.floor(up % 60)
        return reply(`╭══〘 *⏱️ UPTIME* 〙═⊷\n┃❍ *${h}h ${min}m ${sec}s*\n╰══════════════════⊷`)
    }

    if (command === 'calc' || command === 'calculate') {
        if (!text) return reply(`🧮 Usage: ${prefix}calc <expression>\nExample: ${prefix}calc 2+2*5`)
        try {
            // Safe eval: only allow math
            const sanitized = text.replace(/[^0-9+\-*/().%\s]/g, '')
            if (!sanitized) return reply('❌ Invalid expression.')
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict"; return (' + sanitized + ')')()
            return reply(`🧮 ${sanitized} = *${result}*`)
        } catch {
            return reply('❌ Invalid math expression.')
        }
    }

    if (command === 'stealsticker' || command === 'sstic') {
        if (!m.quoted || !/sticker/.test(m.quoted.mimetype || '')) return reply('❌ Quote a sticker to steal it.')
        await react(conn, m, '😈')
        try {
            const buf = await conn.downloadMediaMessage({ key: m.quoted.key, message: m.quoted.message })
            await conn.sendMessage(m.chat, { sticker: buf }, { quoted: m })
            await react(conn, m, '✅')
        } catch (e) {
            await react(conn, m, '❌')
            return reply(`❌ Sticker steal failed: ${e.message}`)
        }
    }

    // ── BERAHOST DEPLOY ───────────────────────
    if (command === 'berahost' || command === 'deploy' || command === 'bhdeploy') {
        if (!isOwner) return reply('⛔ Owner only.')
        if (!BERAHOST_KEY) return reply('❌ BERAHOST_API_KEY not set. Add it to your environment secrets.')

        // Subcommands
        const args = (text || '').trim().split(/\s+/)
        const sub = args[0]?.toLowerCase()

        if (!sub || sub === 'help') {
            return reply(
                `╭══〘 *🚀 BERAHOST* 〙═⊷\n` +
                `┃ Commands:\n` +
                `┃❍ ${prefix}berahost bots — List your bots\n` +
                `┃❍ ${prefix}berahost deploy <botId> <session> — Deploy a bot\n` +
                `┃❍ ${prefix}berahost balance — Check your coins\n` +
                `┃❍ ${prefix}berahost daily — Claim daily coins\n` +
                `┃❍ ${prefix}berahost plans — View hosting plans\n` +
                `╰══════════════════⊷`
            )
        }

        if (sub === 'bots') {
            await react(conn, m, '🤖')
            try {
                const res = await axios.get(`${BERAHOST_API}/bots`, {
                    headers: { 'x-api-key': BERAHOST_KEY },
                    timeout: 15000
                })
                const bots = res.data?.bots || res.data?.data || res.data || []
                if (!bots.length) return reply('📋 No bots deployed yet.')
                const list = bots.map((b, i) => `${i+1}. *${b.name || b.id}* — ${b.status || 'unknown'}`).join('\n')
                await react(conn, m, '✅')
                return reply(`╭══〘 *🤖 YOUR BOTS* 〙═⊷\n${list}\n╰══════════════════⊷`)
            } catch (e) {
                await react(conn, m, '❌')
                return reply(`❌ BeraHost error: ${e.message}`)
            }
        }

        if (sub === 'deploy') {
            const botId = args[1]
            const session = args[2]
            if (!botId || !session) return reply(`❌ Usage: ${prefix}berahost deploy <botId> <sessionId>`)
            await react(conn, m, '🚀')
            try {
                const res = await axios.post(`${BERAHOST_API}/deployments`, {
                    botId,
                    SESSION_ID: session
                }, {
                    headers: { 'x-api-key': BERAHOST_KEY, 'Content-Type': 'application/json' },
                    timeout: 30000
                })
                const d = res.data
                await react(conn, m, '✅')
                return reply(
                    `╭══〘 *🚀 BOT DEPLOYED* 〙═⊷\n` +
                    `┃❍ *Bot ID:* ${botId}\n` +
                    `┃❍ *Status:* ${d.status || 'Deployed'}\n` +
                    `┃❍ *Message:* ${d.message || 'Success'}\n` +
                    `╰══════════════════⊷`
                )
            } catch (e) {
                await react(conn, m, '❌')
                const msg = e.response?.data?.message || e.message
                return reply(`❌ Deploy failed: ${msg}`)
            }
        }

        if (sub === 'balance') {
            await react(conn, m, '💰')
            try {
                const res = await axios.get(`${BERAHOST_API}/coins/balance`, {
                    headers: { 'x-api-key': BERAHOST_KEY },
                    timeout: 10000
                })
                const d = res.data
                await react(conn, m, '✅')
                return reply(`╭══〘 *💰 BERAHOST BALANCE* 〙═⊷\n┃❍ *Coins:* ${d.balance || d.coins || '0'}\n╰══════════════════⊷`)
            } catch (e) {
                await react(conn, m, '❌')
                return reply(`❌ Balance check failed: ${e.message}`)
            }
        }

        if (sub === 'daily') {
            await react(conn, m, '🎁')
            try {
                const res = await axios.post(`${BERAHOST_API}/coins/daily-claim`, {}, {
                    headers: { 'x-api-key': BERAHOST_KEY, 'Content-Type': 'application/json' },
                    timeout: 10000
                })
                const d = res.data
                await react(conn, m, '✅')
                return reply(`╭══〘 *🎁 DAILY COINS* 〙═⊷\n┃❍ *Claimed:* ${d.coins || d.amount || '?'} coins\n┃❍ *${d.message || 'See you tomorrow!'}*\n╰══════════════════⊷`)
            } catch (e) {
                await react(conn, m, '❌')
                const msg = e.response?.data?.message || e.message
                return reply(`❌ Daily claim failed: ${msg}`)
            }
        }

        if (sub === 'plans') {
            await react(conn, m, '📋')
            try {
                const res = await axios.get(`${BERAHOST_API}/payments/plans`, {
                    headers: { 'x-api-key': BERAHOST_KEY },
                    timeout: 10000
                })
                const plans = res.data?.plans || res.data?.data || res.data || []
                const list = (Array.isArray(plans) ? plans : []).map((p, i) =>
                    `${i+1}. *${p.name || p.id}* — ${p.price || p.cost || '?'} (${p.description || ''})`
                ).join('\n')
                await react(conn, m, '✅')
                return reply(`╭══〘 *📋 BERAHOST PLANS* 〙═⊷\n${list || 'No plans listed.'}\n╰══════════════════⊷`)
            } catch (e) {
                await react(conn, m, '❌')
                return reply(`❌ Plans error: ${e.message}`)
            }
        }

        return reply(`❌ Unknown subcommand. Use ${prefix}berahost help`)
    }
}

handle.command = [
    'bible','verse',
    'tinyurl','shorturl','shortenurl','shorten',
    'tempmail','inbox','tempinbox','readmail','delmail','deltempmail',
    'glowingtext','neontext','glitchtext','gradienttext','galaxytext','luxurytext',
    'logomaker','cartoonstyle','advancedglow','writetext','typographytext','ttp',
    'addnote','getnote','note','notes','listnotes','getnotes','delnote','deletenote','delnotes','clearallnotes','delallnotes',
    'dice','roll','diceduel',
    'livescore','scores','sportnews',
    'define','dict','weather','qr','createqr','qrcode','uptime','calc','calculate',
    'stealsticker','sstic',
    'berahost','deploy','bhdeploy'
]
handle.tags = ['extras']

module.exports = handle
