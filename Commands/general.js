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

    if (command === 'menu' || command === 'help') {
        const time = moment().tz('Africa/Nairobi').format('HH:mm:ss')
        const date = moment().tz('Africa/Nairobi').format('dddd, DD MMM YYYY')
        return reply(
            `╭══〘 *🤖 ${config.botName.toUpperCase()} BOT* 〙═⊷\n` +
            `┃❍ 🕐 ${time} | ${date}\n` +
            `┃❍ Prefix: *${prefix}*\n` +
            `┃\n` +
            `┃ *🤖 Bera AI*\n` +
            `┃❍ ${prefix}nick <msg> — Chat with Bera AI\n` +
            `┃❍ ${prefix}nickreset — Clear AI memory\n` +
            `┃❍ ${prefix}nickmemory — View your chat history\n` +
            `┃❍ ${prefix}nickforget — Wipe your history\n` +
            `┃\n` +
            `┃ *🎨 Media & Tools*\n` +
            `┃❍ ${prefix}sticker — Convert image to sticker\n` +
            `┃❍ ${prefix}dl <link> — Download TikTok/IG/Twitter\n` +
            `┃❍ ${prefix}imagine <desc> — Generate AI image\n` +
            `┃❍ ${prefix}play <song> — Download & send audio\n` +
            `┃❍ ${prefix}tl <text> to <lang> — Translate text\n` +
            `┃❍ ${prefix}see — Analyse a sent/quoted image\n` +
            `┃❍ ${prefix}search <query> — Web search\n` +
            `┃❍ ${prefix}remind 30m <msg> — Set a reminder\n` +
            `┃\n` +
            `┃ *🔑 Key*\n` +
            `┃❍ ${prefix}activate <key>\n` +
            `┃❍ ${prefix}checkkey\n` +
            `┃\n` +
            (isOwner ?
                `┃ *👑 Owner*\n` +
                `┃❍ ${prefix}genkey <num> <days>\n` +
                `┃❍ ${prefix}broadcast <msg>\n` +
                `┃❍ ${prefix}backup — Backup DB & session\n` +
                `┃❍ ${prefix}stats — Bot statistics\n` +
                `┃❍ ${prefix}ban / ${prefix}unban @user\n` +
                `┃❍ ${prefix}premium / ${prefix}depremium @user\n` +
                `┃❍ ${prefix}autoreply <kw> = <response>\n` +
                `┃❍ ${prefix}schedule <time> <msg>\n` +
                `┃❍ ${prefix}listusers — All users\n` +
                `┃❍ ${prefix}resetlimit — Reset daily limits\n` +
                `┃❍ ${prefix}chatbot on/off\n` +
                `┃❍ ${prefix}setprefix <new>\n` +
                `┃\n` +
                `┃ *👥 Group*\n` +
                `┃❍ ${prefix}kick / ${prefix}add / ${prefix}promote / ${prefix}demote\n` +
                `┃❍ ${prefix}grouplink / ${prefix}revoke\n` +
                `┃❍ ${prefix}tagall — Mention everyone\n` +
                `┃❍ ${prefix}mute / ${prefix}unmute\n` +
                `┃❍ ${prefix}antilink on/off\n` +
                `┃❍ ${prefix}welcome on/off\n` +
                `┃❍ ${prefix}groupinfo\n` +
                `┃\n` +
                `┃ *⚙️ Settings*\n` +
                `┃❍ ${prefix}noprefix on/off — Use commands without prefix\n` +
                `┃❍ ${prefix}setprefix <new> — Change prefix\n` +
                `┃\n` +
                `┃ *🤖 Automation*\n` +
                `┃❍ ${prefix}autostatusview on/off — Auto-view statuses\n` +
                `┃❍ ${prefix}autotyping on/off — Show typing indicator\n` +
                `┃❍ ${prefix}autobio on/off — Rotate bio hourly\n` +
                `┃❍ ${prefix}addbio <text> — Add a bio ({time} {date} etc)\n` +
                `┃❍ ${prefix}listbios — View all bios\n` +
                `┃❍ ${prefix}setbio <text> — Set bio instantly\n` +
                `┃❍ ${prefix}poststatus <text> — Post WhatsApp status\n` +
                `┃\n` +
                `┃ *🛡️ Group Moderation*\n` +
                `┃❍ ${prefix}hijack — Nick takes full control of group 😈\n` +
                `┃❍ ${prefix}unhijack — Restore group & promote owner back\n` +
                `┃❍ ${prefix}antispam on/off — Auto-kick spammers\n` +
                `┃\n` +
                `┃ *🛠️ Dev*\n` +
                `┃❍ ${prefix}nick clone <url>\n` +
                `┃❍ ${prefix}nick push <folder>\n` +
                `┃❍ ${prefix}nick list repos\n` +
                `┃❍ ${prefix}nick create repo <name>\n` +
                `┃❍ ${prefix}nick run <shell cmd>\n` +
                `┃❍ ${prefix}nick eval <js code>\n` +
                `┃❍ ${prefix}nick read <file>\n` +
                `┃❍ ${prefix}nick list files\n` +
                `┃❍ ${prefix}nick agent: <task>\n` +
                `┃\n`
                : '') +
            `┃ *⚙️ General*\n` +
            `┃❍ ${prefix}ping — Bot speed\n` +
            `┃❍ ${prefix}menu — This menu\n` +
            `┃❍ ${prefix}info — Bot info\n` +
            `╰══════════════════⊷`
        )
    }

    if (command === 'info') {
        const users = Object.keys(global.db?.data?.users || {}).length
        const cmds = global.db?.data?.stats?.totalCommands || 0
        return reply(
            `╭══〘 *🤖 BOT INFO* 〙═⊷\n` +
            `┃❍ *Name:* ${config.botName}\n` +
            `┃❍ *Prefix:* ${prefix}\n` +
            `┃❍ *Library:* toxic-baileys\n` +
            `┃❍ *AI Engine:* Bera AI by Bera Tech\n` +
            `┃❍ *Users:* ${users}\n` +
            `┃❍ *Commands Run:* ${cmds}\n` +
            `┃❍ *Version:* 2.0.0\n` +
            `╰══════════════════⊷`
        )
    }

    if (command === 'sticker' || command === 'stic' || command === 's') {
        const src = m.quoted || (hasImage(m) || hasVideo(m) ? m : null)
        if (!src) return reply(`❌ Send or quote an image/video with ${prefix}sticker`)
        const mime = src.mimetype || ''
        if (!hasImage(src) && !hasVideo(src)) return reply(`❌ Only images and videos can be converted to stickers.`)
        const reactMsg = await conn.sendMessage(chat, { react: { text: '🎨', key: m.key } }).catch(() => {})
        const buffer = await getMediaBuffer(conn, src)
        if (!buffer) return reply(`❌ Could not download media.`)
        const res = await makeSticker(buffer, mime)
        if (!res.success) return reply(`❌ Sticker failed: ${res.error}`)
        await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        return conn.sendMessage(chat, { sticker: res.buffer }, { quoted: m })
    }

    if (command === 'dl' || command === 'download') {
        const url = text?.trim()
        if (!url || !url.startsWith('http')) return reply(
            `❌ Provide a valid link.\n\nUsage: ${prefix}dl <link>\n\nSupported:\n• TikTok\n• Instagram Reels\n• Twitter/X\n• Facebook`
        )
        const platform = detectPlatform(url)
        await conn.sendMessage(chat, { react: { text: '⬇️', key: m.key } }).catch(() => {})
        const res = await download(url)
        if (!res.success) {
            await conn.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ ${res.error}`)
        }
        await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        const caption = `${res.platform || platform} · ${res.title || ''}${res.author ? ` · @${res.author}` : ''}`.trim()
        return conn.sendMessage(chat, {
            video: { url: res.videoUrl },
            caption,
            mimetype: 'video/mp4'
        }, { quoted: m })
    }

    if (command === 'nickmemory') {
        const user = global.db?.data?.users?.[sender]
        const history = user?.nickHistory || []
        if (!history.length) return reply(`📝 No conversation history yet. Start chatting with ${prefix}nick!`)
        const formatted = history.slice(-10).map((h, i) =>
            `${h.role === 'user' ? '👤' : '🤖'} ${h.content.slice(0, 100)}${h.content.length > 100 ? '...' : ''}`
        ).join('\n\n')
        return reply(`📝 *Your last ${Math.min(history.length, 10)} messages with Nick:*\n\n${formatted}`)
    }

    if (command === 'nickforget') {
        if (!global.db?.data?.users?.[sender]) return reply(`No history to clear.`)
        global.db.data.users[sender].nickHistory = []
        global.db.data.users[sender].nickMsgIds = []
        await global.db.write()
        return reply(`✅ Your conversation history with Nick has been wiped. Fresh start!`)
    }

    if (command === 'nickreset') {
        if (!global.db?.data?.users?.[sender]) return reply(`No history to clear.`)
        global.db.data.users[sender].nickHistory = []
        global.db.data.users[sender].nickMsgIds = []
        await global.db.write()
        return reply(`✅ Nick memory cleared.`)
    }

    if (command === 'setprefix') {
        if (!isOwner) return reply(`⛔ Owner only command.`)
        if (!text) return reply(`Usage: ${prefix}setprefix <new prefix>\nCurrent prefix: *${prefix}*`)
        const newPrefix = text.trim()
        if (newPrefix.length > 5) return reply(`❌ Prefix too long (max 5 characters).`)
        global.db.data.settings.prefix = newPrefix
        config.prefix = newPrefix
        await global.db.write()
        return reply(`✅ Prefix changed to *${newPrefix}*\nTry: *${newPrefix}menu*`)
    }

    if (command === 'setendpoint') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setendpoint <url>`)
        config.nickApiEndpoint = text.trim()
        return reply(`✅ Bera AI endpoint updated to:\n\`${text.trim()}\``)
    }

    if (command === 'setkey') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setkey <apikey>`)
        config.nickApiKey = text.trim()
        return reply(`✅ Nick API key updated.`)
    }

    if (command === 'setbotpic' || command === 'setbotimage') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const src = m.quoted && hasImage(m.quoted) ? m.quoted : (hasImage(m) ? m : null)
        const urlArg = text?.trim()
        if (!src && !urlArg) return reply(
            `❌ Send or quote an image with ${prefix}setbotpic\n\nOr provide a URL:\n${prefix}setbotpic https://example.com/pic.jpg`
        )
        await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
        let buffer
        try {
            if (src) {
                buffer = await getMediaBuffer(conn, src)
            } else {
                const res = await axios.get(urlArg, { responseType: 'arraybuffer', timeout: 15000 })
                buffer = Buffer.from(res.data)
            }
            if (!buffer) return reply(`❌ Could not download image.`)
            await conn.updateProfilePicture(conn.user.id, buffer)
            await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})
            return reply(`✅ Bot profile picture updated!`)
        } catch (e) {
            await conn.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return reply(`❌ Failed to update profile picture: ${e.message}`)
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

handle.command = ['ping', 'menu', 'help', 'info', 'sticker', 'stic', 's', 'dl', 'download',
    'nickmemory', 'nickforget', 'nickreset', 'setprefix', 'setendpoint', 'setkey', 'myprofile',
    'setbotpic', 'setbotimage', 'setbotname']
handle.tags = ['general']

module.exports = handle
