const axios = require('axios')
const config = require('../Config')
const moment = require('moment-timezone')
const { makeSticker } = require('../Library/actions/sticker')
const { download, detectPlatform } = require('../Library/actions/downloader')

const hasImage = (msg) => msg && /image|sticker/.test(msg.mimetype || '')
const hasVideo = (msg) => msg && /video|gif/.test(msg.mimetype || '')

const getMediaBuffer = async (conn, msg) => {
    try {
        if (msg && msg.key && msg.message) {
            return await conn.downloadMediaMessage({ key: msg.key, message: msg.message })
        }
        return await conn.downloadMediaMessage(msg)
    } catch { return null }
}

const handle = async (m, { conn, text, reply, prefix, command, isOwner, sender, chat }) => {

    if (command === 'ping') {
        const start = Date.now()
        await reply('...')
        const ms = Date.now() - start
        return reply(`╭══〘 *⚡ PING* 〙═⊷\n┃❍ Response: *${ms}ms*\n╰══════════════════⊷`)
    }

    if (command === 'uptime') {
        const up = process.uptime()
        const h = Math.floor(up / 3600)
        const min = Math.floor((up % 3600) / 60)
        const sec = Math.floor(up % 60)
        return reply(`╭══〘 *⏱️ UPTIME* 〙═⊷\n┃❍ *${h}h ${min}m ${sec}s*\n╰══════════════════⊷`)
    }

    if (command === 'menu' || command === 'help' || command === 'start') {
        const time = moment().tz('Africa/Nairobi').format('HH:mm:ss')
        const date = moment().tz('Africa/Nairobi').format('dddd, DD MMM YYYY')
        const p = prefix
        return reply(
            `╭══〘 *🐻 ${config.botName.toUpperCase()} AI* 〙═⊷\n` +
            `┃❍ 🕐 ${time}\n` +
            `┃❍ 📅 ${date}\n` +
            `┃❍ Prefix: *${p}*  |  v2.0\n` +
            `┃\n` +
            `┃ *🤖 Bera AI*\n` +
            `┃❍ ${p}bera <msg> — Chat with Bera AI\n` +
            `┃❍ ${p}berareset — Clear AI memory\n` +
            `┃❍ ${p}berarmemory — View chat history\n` +
            `┃❍ ${p}beraforget — Wipe your history\n` +
            `┃\n` +
            `┃ *🎵 Music & Video*\n` +
            `┃❍ ${p}play <song> — Download & send audio\n` +
            `┃❍ ${p}video <title> — Download YouTube video\n` +
            `┃❍ ${p}spotify <song> — Spotify song download\n` +
            `┃\n` +
            `┃ *📥 Downloaders*\n` +
            `┃❍ ${p}dl <link> — TikTok/IG/Twitter/FB\n` +
            `┃❍ ${p}tiktok <link> — TikTok video\n` +
            `┃❍ ${p}ig <link> — Instagram media\n` +
            `┃❍ ${p}twitter <link> — Twitter/X video\n` +
            `┃❍ ${p}fb <link> — Facebook video\n` +
            `┃❍ ${p}ytv <link> — YouTube video (direct)\n` +
            `┃❍ ${p}gdrive <link> — Google Drive file\n` +
            `┃❍ ${p}mediafire <link> — MediaFire file\n` +
            `┃❍ ${p}apk <appname> — Download APK\n` +
            `┃❍ ${p}gitclone <repo> — Clone GitHub repo\n` +
            `┃\n` +
            `┃ *🎨 AI & Image*\n` +
            `┃❍ ${p}imagine <desc> — Generate AI image\n` +
            `┃❍ ${p}see — Analyse a sent/quoted image\n` +
            `┃❍ ${p}sticker — Image/GIF to sticker\n` +
            `┃❍ ${p}toimg — Sticker to image\n` +
            `┃❍ ${p}stealsticker — Steal quoted sticker\n` +
            `┃\n` +
            `┃ *🎨 Logo Makers*\n` +
            `┃❍ ${p}glowingtext <text>\n` +
            `┃❍ ${p}neontext <text>\n` +
            `┃❍ ${p}glitchtext <text>\n` +
            `┃❍ ${p}gradienttext <text>\n` +
            `┃❍ ${p}galaxytext <text>\n` +
            `┃❍ ${p}luxurytext <text>\n` +
            `┃❍ ${p}logomaker <text>\n` +
            `┃❍ ${p}cartoonstyle <text>\n` +
            `┃❍ ${p}ttp <text>\n` +
            `┃\n` +
            `┃ *🔍 Search & Info*\n` +
            `┃❍ ${p}search <query> — Web search\n` +
            `┃❍ ${p}weather <city> — Weather report\n` +
            `┃❍ ${p}define <word> — Dictionary\n` +
            `┃❍ ${p}tl <text> to <lang> — Translate\n` +
            `┃❍ ${p}lyrics <song> — Song lyrics\n` +
            `┃\n` +
            `┃ *📝 Notes*\n` +
            `┃❍ ${p}addnote <name> | <content>\n` +
            `┃❍ ${p}getnote <name>\n` +
            `┃❍ ${p}notes — List all notes\n` +
            `┃❍ ${p}delnote <name>\n` +
            `┃\n` +
            `┃ *📧 Temp Mail*\n` +
            `┃❍ ${p}tempmail — Create temp email\n` +
            `┃❍ ${p}inbox — Check inbox\n` +
            `┃❍ ${p}delmail — Delete temp mail\n` +
            `┃\n` +
            `┃ *📖 Religion*\n` +
            `┃❍ ${p}bible <reference> — Bible verse\n` +
            `┃❍ ${p}verse <reference> — Bible verse\n` +
            `┃\n` +
            `┃ *🔗 Tools*\n` +
            `┃❍ ${p}tinyurl <url> — Shorten URL\n` +
            `┃❍ ${p}qr <text> — Generate QR code\n` +
            `┃❍ ${p}calc <expr> — Calculator\n` +
            `┃❍ ${p}remind <time> <msg> — Set reminder\n` +
            `┃\n` +
            `┃ *🎲 Games*\n` +
            `┃❍ ${p}dice — Roll a dice\n` +
            `┃❍ ${p}diceduel @user — Dice duel\n` +
            `┃\n` +
            `┃ *⚽ Sports*\n` +
            `┃❍ ${p}livescore — Live football scores\n` +
            `┃❍ ${p}sportnews — Sport news\n` +
            `┃\n` +
            `┃ *🔑 Activation*\n` +
            `┃❍ ${p}activate <key>\n` +
            `┃❍ ${p}checkkey\n` +
            `┃\n` +
            (isOwner ?
                `┃ *👑 Owner Commands*\n` +
                `┃❍ ${p}genkey <num> <days>\n` +
                `┃❍ ${p}broadcast <msg>\n` +
                `┃❍ ${p}backup — Backup DB & session\n` +
                `┃❍ ${p}stats — Bot statistics\n` +
                `┃❍ ${p}ban / ${p}unban @user\n` +
                `┃❍ ${p}premium / ${p}depremium @user\n` +
                `┃❍ ${p}autoreply <kw> = <response>\n` +
                `┃❍ ${p}setprefix <new> — Change prefix\n` +
                `┃❍ ${p}setbotname <name>\n` +
                `┃❍ ${p}chatbot on/off\n` +
                `┃❍ ${p}listusers — All users\n` +
                `┃❍ ${p}schedule <time> <msg>\n` +
                `┃❍ ${p}resetlimit — Reset daily limits\n` +
                `┃\n` +
                `┃ *🚀 BeraHost*\n` +
                `┃❍ ${p}berahost bots — List bots\n` +
                `┃❍ ${p}berahost deploy <id> <session>\n` +
                `┃❍ ${p}berahost balance — Check coins\n` +
                `┃❍ ${p}berahost daily — Claim daily coins\n` +
                `┃❍ ${p}berahost plans — View plans\n` +
                `┃\n` +
                `┃ *🖥️ Pterodactyl (VPS)*\n` +
                `┃❍ ${p}servers — List servers\n` +
                `┃❍ ${p}status <id> — Server status\n` +
                `┃❍ ${p}start <id> / ${p}stop <id>\n` +
                `┃❍ ${p}restart <id> / ${p}kill <id>\n` +
                `┃❍ ${p}cmd <id> <command> — Run cmd\n` +
                `┃\n` +
                `┃ *👥 Group*\n` +
                `┃❍ ${p}kick / ${p}add / ${p}promote / ${p}demote\n` +
                `┃❍ ${p}grouplink / ${p}revoke\n` +
                `┃❍ ${p}tagall — Mention everyone\n` +
                `┃❍ ${p}mute / ${p}unmute\n` +
                `┃❍ ${p}antilink on/off\n` +
                `┃❍ ${p}welcome on/off\n` +
                `┃\n` +
                `┃ *⚙️ Automation*\n` +
                `┃❍ ${p}autostatusview on/off\n` +
                `┃❍ ${p}antilink on/off\n` +
                `┃❍ ${p}noprefix on/off\n` +
                ''
            : '') +
            `╰══════════════════⊷\n` +
            `_Type ${p}menu anytime to see this_`
        )
    }

    if (command === 'info') {
        return reply(
            `╭══〘 *🤖 BOT INFO* 〙═⊷\n` +
            `┃❍ *Name:* ${config.botName}\n` +
            `┃❍ *Version:* 2.0.0\n` +
            `┃❍ *Developer:* Bera Tech\n` +
            `┃❍ *Prefix:* ${prefix}\n` +
            `┃❍ *Platform:* WhatsApp\n` +
            `┃❍ *Framework:* Baileys (toxic-baileys)\n` +
            `╰══════════════════⊷`
        )
    }

    if (command === 'sticker' || command === 'stic' || command === 's') {
        const quoted = m.quoted
        const msgObj = quoted || m

        if (!hasImage(msgObj) && !hasVideo(msgObj)) {
            return reply(`❌ Send or quote an image/GIF with *${prefix}sticker*`)
        }

        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})

        const buf = await getMediaBuffer(conn, msgObj)
        if (!buf) return reply('❌ Failed to download media.')

        try {
            const packname = text?.split(';')[0]?.trim() || config.botName
            const author = text?.split(';')[1]?.trim() || 'Bera Tech'
            const sticker = await makeSticker(buf, { packname, author })
            await conn.sendMessage(m.chat, { sticker }, { quoted: m })
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ Sticker creation failed: ${e.message}`)
        }
    }

    if (command === 'toimg') {
        const quoted = m.quoted
        if (!quoted || !/sticker/.test(quoted.mimetype || '')) return reply('❌ Quote a sticker to convert.')
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        const buf = await getMediaBuffer(conn, quoted)
        if (!buf) return reply('❌ Failed to download sticker.')
        try {
            await conn.sendMessage(m.chat, { image: buf, caption: 'Here is your image!' }, { quoted: m })
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ Conversion failed: ${e.message}`)
        }
    }

    if (command === 'dl' || command === 'download') {
        const url = text?.trim()
        if (!url || !url.startsWith('http')) return reply(`❌ Usage: ${prefix}dl <link>`)
        const platform = detectPlatform(url)
        await conn.sendMessage(m.chat, { react: { text: '⬇️', key: m.key } }).catch(() => {})
        const result = await download(url)
        if (!result.success) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ Download failed: ${result.error}`)
        }
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        if (result.type === 'video') {
            return conn.sendMessage(m.chat, { video: { url: result.url }, caption: result.title || platform }, { quoted: m })
        }
        if (result.type === 'image') {
            return conn.sendMessage(m.chat, { image: { url: result.url }, caption: result.title || platform }, { quoted: m })
        }
        return conn.sendMessage(m.chat, { document: { url: result.url }, fileName: result.title || 'download', mimetype: 'application/octet-stream' }, { quoted: m })
    }

    if (command === 'berarmemory') {
        const hist = global.db?.data?.users?.[sender]?.nickHistory || []
        if (!hist.length) return reply('📭 No AI chat history found.')
        const preview = hist.slice(-6).map(h => `_${h.role === 'user' ? '👤' : '🤖'}_: ${h.content.slice(0, 100)}`).join('\n')
        return reply(`╭══〘 *🧠 BERA AI MEMORY* 〙═⊷\n${preview}\n╰══════════════════⊷\n_Last ${Math.min(hist.length, 6)} messages_`)
    }

    if (command === 'beraforget' || command === 'berareset') {
        if (global.db?.data?.users?.[sender]) {
            global.db.data.users[sender].nickHistory = []
            await global.db.write()
        }
        return reply('🗑️ Your Bera AI chat history has been cleared.')
    }

    if (command === 'setprefix') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setprefix <new prefix>`)
        const newPrefix = text.trim()[0]
        if (!global.db.data.settings) global.db.data.settings = {}
        global.db.data.settings.prefix = newPrefix
        await global.db.write()
        await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        return reply(`✅ Prefix changed to *${newPrefix}*`)
    }

    if (command === 'setendpoint') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setendpoint <url>`)
        config.nickApiEndpoint = text.trim()
        return reply(`✅ API endpoint updated to: ${text.trim()}`)
    }

    if (command === 'setbotpic' || command === 'setbotimage') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const quoted = m.quoted
        if (!quoted || !/image/.test(quoted.mimetype || '')) return reply('❌ Quote an image to set as bot pic.')
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        try {
            const buf = await getMediaBuffer(conn, quoted)
            if (!buf) return reply('❌ Failed to download image.')
            await conn.updateProfilePicture(conn.user.id, buf)
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
            return reply('✅ Bot profile picture updated!')
        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ Failed: ${e.message}`)
        }
    }

    if (command === 'setbotname') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setbotname <new name>`)
        try {
            await conn.updateProfileName(text.trim())
            config.botName = text.trim()
            await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})
            return reply(`✅ Bot name changed to *${text.trim()}*`)
        } catch (e) {
            return reply(`❌ Failed: ${e.message}`)
        }
    }

    if (command === 'myprofile') {
        const user = global.db?.data?.users?.[sender] || {}
        return reply(
            `╭══〘 *👤 MY PROFILE* 〙═⊷\n` +
            `┃❍ *Number:* +${sender.split('@')[0]}\n` +
            `┃❍ *Status:* ${user.premium ? '⭐ Premium' : '👤 Regular'}\n` +
            `┃❍ *Commands Used:* ${user.commandCount || 0}\n` +
            `┃❍ *Daily Limit Left:* ${user.premium ? 'Unlimited' : (user.limit || 10)}\n` +
            `┃❍ *Level:* ${user.level || 0}\n` +
            `┃❍ *EXP:* ${user.exp || 0}\n` +
            `╰══════════════════⊷`
        )
    }
}

handle.before = async (m, { conn }) => {
    try {
        const pending = global.db?.data?.pendingCreds
        if (!pending) return
        const jid = m.sender
        if (!pending[jid]) return
        const credMsg = pending[jid]
        delete global.db.data.pendingCreds[jid]
        await global.db.write()
        await conn.sendMessage(jid, { text: credMsg })
    } catch {}
}

handle.command = [
    'ping', 'menu', 'help', 'start', 'info',
    'sticker', 'stic', 's', 'toimg',
    'dl', 'download',
    'berarmemory', 'beraforget', 'berareset',
    'setprefix', 'setendpoint', 'setkey', 'myprofile',
    'setbotpic', 'setbotimage', 'setbotname',
    'uptime'
]
handle.tags = ['general']

module.exports = handle
