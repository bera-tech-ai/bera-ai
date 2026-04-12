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
        const isPrivate = (global.db?.data?.settings?.mode || 'public') === 'private'
        const modeIcon = isPrivate ? '🔒 Private' : '🌐 Public'
        const bhKey = global.db?.data?.settings?.bhApiKey || process.env.BH_API_KEY
        const lines = [
            '╭══〘 *🐻 ' + config.botName.toUpperCase() + ' AI* 〙═⊷',
            '┃❍ 🕐 ' + time + '  |  📅 ' + date,
            '┃❍ ⚡ Prefix: *' + p + '*  |  Mode: *' + modeIcon + '*',
            '┃❍ 🖥️ BeraHost: ' + (bhKey ? '✅ Connected' : '❌ Not set — run ' + p + 'setbhkey'),
            '┃',
            '┃ *🤖 Bera AI — Natural Language*',
            '┃❍ ' + p + 'bera <message> — Chat with Bera AI',
            '┃❍ ' + p + 'chatbot on/off — Auto-reply mode',
            '┃❍ ' + p + 'tagreply on/off — AI replies when tagged',
            '┃❍ ' + p + 'berareset — Clear AI conversation memory',
            '┃❍ ' + p + 'beraforget — Wipe your AI history',
            '┃❍ ' + p + 'berarmemory — View current chat history',
            '┃',
            '┃ *🧠 Bera Agent — Smart Tools (Say it, no prefix)*',
            '┃❍ "scrape <url>" — Extract text from website',
            '┃❍ "check dns <domain>" — DNS record lookup',
            '┃❍ "ssl check <domain>" — SSL certificate info',
            '┃❍ "whois <domain>" — Domain WHOIS lookup',
            '┃❍ "ping <host>" — Ping any host',
            '┃❍ "ip lookup <ip>" — IP geolocation & ISP',
            '┃❍ "check url <url>" — URL safety check',
            '┃❍ "generate password <len>" — Strong password',
            '┃❍ "generate code <task>" — AI code generator',
            '┃❍ "format json <data>" — JSON validate & pretty',
            '┃❍ "search files <query>" — Search workspace files',
            '┃❍ "diff <file1> <file2>" — Compare two files',
            '┃❍ "set env <KEY> <val>" — Set environment variable',
            '┃❍ "auto commit" — Git commit all changes',
            '┃❍ "list repos / create repo / clone <url>" — GitHub',
            '┃',
            '┃ *🖥️ BeraHost — Bot Hosting*',
            '┃❍ ' + p + 'setbhkey bh_xxx — Save API key (FIRST!)',
            '┃❍ ' + p + 'bots — List deployable bot types',
            '┃❍ ' + p + 'deploy bot 1 <session> — Deploy Atassa-MD',
            '┃❍ ' + p + 'deploybera <phone> — Deploy Bera AI (pair code)',
            '┃❍ ' + p + 'deployments — List your deployments',
            '┃❍ ' + p + 'depinfo <id> — Deployment details',
            '┃❍ ' + p + 'startbot <id>  |  ' + p + 'stopbot <id>',
            '┃❍ ' + p + 'deletedeploy <id> — Remove deployment',
            '┃❍ ' + p + 'botlogs <id> — Live deployment logs',
            '┃❍ ' + p + 'botmetrics <id> — CPU / RAM / uptime',
            '┃❍ ' + p + 'updateenv <id> KEY=val — Update env vars',
            '┃❍ ' + p + 'coins — BeraHost coin balance',
            '┃❍ ' + p + 'claimcoins — Claim daily free coins',
            '┃❍ ' + p + 'transactions — Coin history',
            '┃❍ ' + p + 'redeem <code> — Redeem voucher',
            '┃❍ ' + p + 'plans — Hosting plans & prices',
            '┃❍ ' + p + 'mpesa <phone> <plan> — Pay via M-Pesa STK',
            '┃❍ ' + p + 'paystatus <id>  |  ' + p + 'payhistory',
            '┃❍ ' + p + 'bhhelp — Full BeraHost command list',
            '┃',
            '┃ *🎵 Music & Audio*',
            '┃❍ ' + p + 'play <song>  |  ' + p + 'song <title>',
            '┃❍ ' + p + 'spotify <song/link>  |  ' + p + 'sc <query>',
            '┃❍ ' + p + 'lyrics <song>  |  ' + p + 'yts <song>',
            '┃',
            '┃ *📥 Downloaders*',
            '┃❍ ' + p + 'tiktok <link>  |  ' + p + 'ttsearch <query>',
            '┃❍ ' + p + 'ig <link>  |  ' + p + 'twitter <link>',
            '┃❍ ' + p + 'ytv <link>  |  ' + p + 'fb <link>',
            '┃❍ ' + p + 'gdrive <link>  |  ' + p + 'mediafire <link>',
            '┃❍ ' + p + 'apk <app>  |  ' + p + 'dl <link>',
            '┃',
            '┃ *🔄 Converters & Media*',
            '┃❍ ' + p + 'sticker / ' + p + 's — Image/video → sticker',
            '┃❍ ' + p + 'toimg — Sticker → image  |  ' + p + 'stealsticker',
            '┃❍ ' + p + 'toaudio / ' + p + 'tomp3 — Video → audio',
            '┃❍ ' + p + 'toptt / ' + p + 'tovn — Audio → voice note',
            '┃❍ ' + p + 'tovideo / ' + p + 'togif — Media → video/GIF',
            '┃',
            '┃ *🎨 AI Image & Art*',
            '┃❍ ' + p + 'imagine <desc> — Generate AI image',
            '┃❍ ' + p + 'see — Analyse sent/quoted image',
            '┃❍ ' + p + 'ttp <text>  |  ' + p + 'glowingtext  |  ' + p + 'neontext',
            '┃❍ ' + p + 'glitchtext  |  ' + p + 'gradienttext  |  ' + p + 'galaxytext',
            '┃❍ ' + p + 'luxurytext  |  ' + p + 'logomaker  |  ' + p + 'cartoonstyle',
            '┃❍ ' + p + 'fancy <text>  |  ' + p + 'fancystyles  |  ' + p + 'ascii',
            '┃',
            '┃ *🔍 Search & Info*',
            '┃❍ ' + p + 'search / ' + p + 'google <query>  |  ' + p + 'imgsearch',
            '┃❍ ' + p + 'movie <title>  |  ' + p + 'weather <city>',
            '┃❍ ' + p + 'define <word>  |  ' + p + 'country <name>',
            '┃❍ ' + p + 'worldtime <city>  |  ' + p + 'currency <amt> <from> <to>',
            '┃❍ ' + p + 'ssweb <url> — Screenshot  |  ' + p + 'livescore',
            '┃❍ ' + p + 'bible <ref>  |  ' + p + 'sportnews',
            '┃',
            '┃ *🔒 Encode / Decode*',
            '┃❍ ' + p + 'tobinary / ' + p + 'frombinary',
            '┃❍ ' + p + 'tobase64 / ' + p + 'frombase64',
            '┃❍ ' + p + 'encrypt <js code> — Encrypt JavaScript',
            '┃',
            '┃ *🤖 AI Features*',
            '┃❍ ' + p + 'codegen <task>  |  ' + p + 'story <topic>',
            '┃❍ ' + p + 'dream <dream>  |  ' + p + 'rap <topic>',
            '┃❍ ' + p + 'roast <name>  |  ' + p + 'motivate <name>',
            '┃❍ ' + p + 'recipe <dish>  |  ' + p + 'riddle',
            '┃❍ ' + p + 'translate / ' + p + 'tr <lang> <text>',
            '┃',
            '┃ *📝 Notes & Tools*',
            '┃❍ ' + p + 'addnote <name> | <text>  |  ' + p + 'getnote <name>',
            '┃❍ ' + p + 'notes — List all  |  ' + p + 'delnote <name>',
            '┃❍ ' + p + 'tempmail  |  ' + p + 'inbox  |  ' + p + 'delmail',
            '┃',
            '┃ *🎲 Games & Fun*',
            '┃❍ ' + p + 'joke  |  ' + p + 'fact  |  ' + p + 'quote  |  ' + p + 'riddle',
            '┃❍ ' + p + '8ball <q>  |  ' + p + 'coinflip  |  ' + p + 'dice',
            '┃❍ ' + p + 'truth / ' + p + 'dare  |  ' + p + 'diceduel @user',
            '┃❍ ' + p + 'ship @user — Compatibility %',
            '┃',
            '┃ *🔗 Utilities*',
            '┃❍ ' + p + 'shorten <url>  |  ' + p + 'qr <text>  |  ' + p + 'calc <expr>',
            '┃❍ ' + p + 'password <len>  |  ' + p + 'uuid',
            '┃❍ ' + p + 'ping  |  ' + p + 'uptime  |  ' + p + 'myprofile',
            '┃',
            '┃ *📱 WhatsApp & GitHub*',
            '┃❍ ' + p + 'wacheck <num>  |  ' + p + 'wapfp <num>  |  ' + p + 'walink',
            '┃❍ ' + p + 'wagroups <topic>  |  ' + p + 'ghfollowers <user>',
            '┃❍ ' + p + 'workspace — Show cloned repos',
        ]
        if (isOwner) lines.push(
            '┃',
            '┃ *👥 Group Management (Owner)*',
            '┃❍ ' + p + 'kick / ' + p + 'add <number>  |  ' + p + 'delete (reply)',
            '┃❍ ' + p + 'promote / ' + p + 'demote @user',
            '┃❍ ' + p + 'tagall / ' + p + 'everyone / ' + p + 'hidetag / ' + p + 'tagadmins',
            '┃❍ ' + p + 'grouplink / ' + p + 'revoke / ' + p + 'groupname / ' + p + 'gcdesc',
            '┃❍ ' + p + 'mute / ' + p + 'unmute  |  ' + p + 'disapp on/off/1/7/90',
            '┃❍ ' + p + 'antilink / ' + p + 'antispam / ' + p + 'antibadwords',
            '┃❍ ' + p + 'welcome / ' + p + 'goodbye on/off',
            '┃',
            '┃ *🛡️ Admin Commands (Owner)*',
            '┃❍ ' + p + 'update — Pull latest from GitHub & restart',
            '┃❍ ' + p + 'reload — Hot-reload all commands & plugins',
            '┃❍ ' + p + 'eval <code> — Execute JavaScript code',
            '┃❍ ' + p + 'exec <cmd> — Run shell command',
            '┃❍ ' + p + 'broadcast <msg> — Send to all chats',
            '┃❍ ' + p + 'mode public/private — Bot access mode',
            '┃',
            '┃ *🐦‍🔥 Pterodactyl Panel (Owner)*',
            '┃❍ ' + p + 'ptlist / ' + p + 'servers — List panel servers',
            '┃❍ ' + p + 'ptstatus / ' + p + 'ptstart / ' + p + 'ptstop / ' + p + 'ptrestart',
            '┃❍ ' + p + 'ptkill  |  ' + p + 'ptcmd <srv> <cmd>',
            '┃❍ ' + p + 'ptfiles / ' + p + 'ptread / ' + p + 'ptwrite',
            '┃❍ ' + p + 'ptcreate <user> <plan>  |  ' + p + 'ptdelete',
            '┃❍ ' + p + 'ptcreds  |  ' + p + 'ptusers  |  ' + p + 'ptdeluser',
            '┃❍ ' + p + 'ptpromote / ' + p + 'ptdemote  |  ' + p + 'ptpurgeusers',
            '┃❍ ' + p + 'ptsuspend / ' + p + 'ptunsuspend  |  ' + p + 'ptnodes',
            '┃❍ ' + p + 'ptallservers  |  ' + p + 'ptdelserver  |  ' + p + 'pthelp'
        )
        lines.push(
            '┃',
            '┃ *⚙️ Settings*',
            '┃❍ ' + p + 'setprefix <char>  |  ' + p + 'setbotname <name>',
            '┃❍ ' + p + 'setbotpic (reply img)  |  ' + p + 'setendpoint <url>',
            '┃❍ ' + p + 'setbhkey bh_xxx — BeraHost API key',
            '┃❍ ' + p + 'myprofile — Your stats & command limits',
            '╰══════════════════⊷'
        )
        return reply(lines.join('\n'))
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
    'setprefix', 'setendpoint', 'myprofile',
    'setbotpic', 'setbotimage', 'setbotname',
    'uptime'
]
handle.tags = ['general']

module.exports = handle
