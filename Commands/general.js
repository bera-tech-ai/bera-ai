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
        return reply(
            `╭══〘 *🐻 ${config.botName.toUpperCase()} AI* 〙═⊷\n` +
            `┃❍ 🕐 ${time}\n` +
            `┃❍ 📅 ${date}\n` +
            `┃❍ ⚡ Prefix: *${p}*  |  Mode: *${modeIcon}*\n` +
            `┃\n` +
            `┃ *🤖 Bera AI (Natural Language)*\n` +
            `┃❍ ${p}bera <msg> — Chat with Bera AI\n` +
            `┃❍ ${p}berareset — Clear AI memory\n` +
            `┃❍ ${p}beraforget — Wipe your AI history\n` +
            `┃❍ ${p}berarmemory — View chat history\n` +
            `┃❍ ${p}chatbot on/off — Auto-chat mode\n` +
            `┃❍ ${p}tagreply on/off — AI replies to tags\n` +
            `┃\n` +
            `┃ *🎵 Music & Audio*\n` +
            `┃❍ ${p}play <song> — Download & send audio\n` +
            `┃❍ ${p}song <title> — Song search & play\n` +
            `┃❍ ${p}spotify <song> — Spotify audio download\n` +
            `┃❍ ${p}lyrics <song> — Get song lyrics\n` +
            `┃❍ ${p}yts <song> — YouTube search results\n` +
            `┃\n` +
            `┃ *📥 Downloaders*\n` +
            `┃❍ ${p}tiktok <link> — TikTok video\n` +
            `┃❍ ${p}ig <link> — Instagram media\n` +
            `┃❍ ${p}twitter <link> — Twitter/X video\n` +
            `┃❍ ${p}fb <link> — Facebook video\n` +
            `┃❍ ${p}ytv <link> — YouTube video\n` +
            `┃❍ ${p}spotify <link> — Spotify track\n` +
            `┃❍ ${p}gdrive <link> — Google Drive file\n` +
            `┃❍ ${p}mediafire <link> — MediaFire file\n` +
            `┃❍ ${p}apk <appname> — Download APK\n` +
            `┃❍ ${p}dl <link> — Auto-detect downloader\n` +
            `┃\n` +
            `┃ *🔄 Converters*\n` +
            `┃❍ ${p}toaudio / ${p}tomp3 — Video → audio\n` +
            `┃❍ ${p}toptt / ${p}tovn — Audio → voice note\n` +
            `┃❍ ${p}tovideo / ${p}togif — Media → video/GIF\n` +
            `┃❍ ${p}sticker / ${p}s — Image/video → sticker\n` +
            `┃❍ ${p}toimg — Sticker → image\n` +
            `┃❍ ${p}stealsticker — Steal quoted sticker\n` +
            `┃\n` +
            `┃ *🔒 Encoder / Decoder*\n` +
            `┃❍ ${p}tobinary <text> — Text → binary\n` +
            `┃❍ ${p}frombinary <bin> — Binary → text\n` +
            `┃❍ ${p}tobase64 <text> — Text → base64\n` +
            `┃❍ ${p}frombase64 <b64> — Base64 → text\n` +
            `┃\n` +
            `┃ *🎨 AI Image & Vision*\n` +
            `┃❍ ${p}imagine <desc> — Generate AI image\n` +
            `┃❍ ${p}see — Analyse sent/quoted image\n` +
            `┃\n` +
            `┃ *🎨 Logo & Text Art*\n` +
            `┃❍ ${p}ttp <text> — Text on image\n` +
            `┃❍ ${p}glowingtext <text>\n` +
            `┃❍ ${p}neontext <text>\n` +
            `┃❍ ${p}glitchtext <text>\n` +
            `┃❍ ${p}gradienttext <text>\n` +
            `┃❍ ${p}galaxytext <text>\n` +
            `┃❍ ${p}luxurytext <text>\n` +
            `┃❍ ${p}logomaker <text>\n` +
            `┃❍ ${p}cartoonstyle <text>\n` +
            `┃\n` +
            `┃ *🔍 Search & Info*\n` +
            `┃❍ ${p}search <query> — Web search\n` +
            `┃❍ ${p}google <query> — Google search\n` +
            `┃❍ ${p}ssweb <url> — Screenshot a website\n` +
            `┃❍ ${p}weather <city> — Live weather\n` +
            `┃❍ ${p}define <word> — Dictionary\n` +
            `┃❍ ${p}translate <text> to <lang> — Translate\n` +
            `┃\n` +
            `┃ *🌍 Info Commands*\n` +
            `┃❍ ${p}country <name> — Country info\n` +
            `┃❍ ${p}iplookup <ip> — IP address lookup\n` +
            `┃❍ ${p}worldtime <city> — Current time anywhere\n` +
            `┃❍ ${p}currency <amt> <from> <to> — Convert\n` +
            `┃\n` +
            `┃ *📝 Notes*\n` +
            `┃❍ ${p}addnote <name> | <content>\n` +
            `┃❍ ${p}getnote <name>\n` +
            `┃❍ ${p}notes — List all notes\n` +
            `┃❍ ${p}delnote <name> — Delete note\n` +
            `┃\n` +
            `┃ *📧 Temp Mail*\n` +
            `┃❍ ${p}tempmail — Create temp email\n` +
            `┃❍ ${p}inbox — Check inbox\n` +
            `┃❍ ${p}delmail — Delete temp mail\n` +
            `┃\n` +
            `┃ *📖 Bible*\n` +
            `┃❍ ${p}bible <ref> — Bible verse (e.g John 3:16)\n` +
            `┃\n` +
            `┃ *🎲 Games & Fun*\n` +
            `┃❍ ${p}joke — Random joke\n` +
            `┃❍ ${p}fact — Random fact\n` +
            `┃❍ ${p}quote — Inspirational quote\n` +
            `┃❍ ${p}8ball <question> — Magic 8 ball\n` +
            `┃❍ ${p}coinflip — Heads or tails\n` +
            `┃❍ ${p}truth / ${p}dare — Truth or dare\n` +
            `┃❍ ${p}ship @user — Compatibility %\n` +
            `┃❍ ${p}dice — Roll dice\n` +
            `┃❍ ${p}diceduel @user — Dice duel\n` +
            `┃\n` +
            `┃ *🔗 Utilities*\n` +
            `┃❍ ${p}shorten <url> — Shorten URL (TinyURL/Bitly)\n` +
            `┃❍ ${p}qr <text> — Generate QR code\n` +
            `┃❍ ${p}calc <expr> — Calculator\n` +
            `┃❍ ${p}password <length> — Strong password\n` +
            `┃❍ ${p}uuid — Generate UUID\n` +
            `┃❍ ${p}ip <address> — IP address lookup\n` +
            `┃❍ ${p}ping — Latency check\n` +
            `┃❍ ${p}uptime — Bot uptime\n` +
            `┃❍ ${p}myprofile — Your bot profile\n` +
            `┃\n` +
            `┃ *✨ Text & Style Tools*\n` +
            `┃❍ ${p}fancy <text> — Random fancy Unicode style\n` +
            `┃❍ ${p}fancystyles <text> — All 35 fancy styles\n` +
            `┃❍ ${p}ascii <text> — ASCII art generator\n` +
            `┃❍ ${p}tr <lang> <text> — Translate to any language\n` +
            `┃❍ ${p}encrypt <js code> — Encrypt JavaScript code\n` +
            `┃\n` +
            `┃ *📱 WhatsApp Tools*\n` +
            `┃❍ ${p}wacheck <number> — Check if number is on WhatsApp\n` +
            `┃❍ ${p}wapfp <number> — Download WhatsApp profile picture\n` +
            `┃❍ ${p}walink <number> [msg] — Create WhatsApp link\n` +
            `┃❍ ${p}wagroups <topic> — Search WhatsApp groups\n` +
            `┃\n` +
            `┃ *🔍 Search Commands*\n` +
            `┃❍ ${p}search <query> — Google/Brave web search\n` +
            `┃❍ ${p}imgsearch <query> — Image search\n` +
            `┃❍ ${p}yts <query> — YouTube search\n` +
            `┃❍ ${p}movie <title> — Movie info & details\n` +
            `┃❍ ${p}lyrics <song> — Song lyrics\n` +
            `┃❍ ${p}bible <ref> — Bible verse (e.g John 3:16)\n` +
            `┃❍ ${p}sc <query> — SoundCloud search\n` +
            `┃❍ ${p}ttsearch <query> — TikTok video search\n` +
            `┃❍ ${p}apk <app> — APK/app search\n` +
            `┃\n` +
            `┃ *🤖 AI-Powered*\n` +
            `┃❍ ${p}imagine <desc> — AI image generation\n` +
            `┃❍ ${p}codegen <task> — AI code generator\n` +
            `┃❍ ${p}dream <dream> — Dream interpretation\n` +
            `┃❍ ${p}story <topic> — AI short story\n` +
            `┃❍ ${p}rap <topic> — Rap bars\n` +
            `┃❍ ${p}riddle — Get a riddle\n` +
            `┃❍ ${p}recipe <dish> — Get a recipe\n` +
            `┃❍ ${p}roast <name> — Roast someone\n` +
            `┃❍ ${p}motivate <name> — Motivational message\n` +
            `┃❍ ${p}ghfollowers <user> — GitHub profile stats\n` +
            `┃\n` +
            `┃ *⚽ Sports*\n` +
            `┃❍ ${p}livescore — Live football scores\n` +
            `┃❍ ${p}sportnews — Sport news\n` +
            `┃\n` +
            `┃ *💻 GitHub (via Bera AI)*\n` +
            `┃❍ .bera list repos\n` +
            `┃❍ .bera create repo <name>\n` +
            `┃❍ .bera delete repo <name>\n` +
            `┃❍ .bera clone <github-url>\n` +
            `┃❍ .bera push my code\n` +
            `┃❍ ${p}workspace — Show cloned repos\n` +
            `┃\n` +
            (isOwner ?
            `┃ *👥 Group Management*\n` +
            `┃❍ ${p}kick / ${p}remove — Remove member\n` +
            `┃❍ ${p}add <number> — Add member\n` +
            `┃❍ ${p}promote / ${p}demote @user\n` +
            `┃❍ ${p}tagall / ${p}everyone / ${p}hidetag\n` +
            `┃❍ ${p}tagadmins — Mention only admins\n` +
            `┃❍ ${p}grouplink / ${p}revoke / ${p}resetlink\n` +
            `┃❍ ${p}groupname / ${p}gcdesc — Edit name/desc\n` +
            `┃❍ ${p}gcpp — Set group icon (reply to image)\n` +
            `┃❍ ${p}getgcpp — Download group profile pic\n` +
            `┃❍ ${p}delete — Delete message (reply to it)\n` +
            `┃❍ ${p}mute / ${p}unmute — Lock/unlock group\n` +
            `┃❍ ${p}disapp on/off/1/7/90 — Disappearing msgs\n` +
            `┃❍ ${p}onlyadmins / ${p}allusers — Info edit control\n` +
            `┃❍ ${p}antilink on/off — Block invite links\n` +
            `┃❍ ${p}antispam on/off — Auto-kick spammers\n` +
            `┃❍ ${p}antibadwords on/off — Block bad words\n` +
            `┃❍ ${p}badwords add/remove/list — Manage ban list\n` +
            `┃❍ ${p}antipromote / ${p}antidemote on/off\n` +
            `┃❍ ${p}welcome on/off — Welcome new members\n` +
            `┃❍ ${p}setwelcomemsg <msg> — Custom welcome\n` +
            `┃❍ ${p}setgoodbye <msg> — Goodbye message\n` +
            `┃❍ ${p}setgroupevents on/off — Join/leave alerts\n` +
            `┃❍ ${p}poll Q|Opt1|Opt2 — Create a poll\n` +
            `┃❍ ${p}groupinfo / ${p}admins / ${p}members\n` +
            `┃❍ ${p}accept / ${p}reject <number> — Join requests\n` +
            `┃❍ ${p}acceptall / ${p}rejectall / ${p}listrequests\n` +
            `┃❍ ${p}newgroup <name> — Create new group\n` +
            `┃❍ ${p}kickall — Remove all non-admins\n` +
            `┃❍ ${p}killgc — Terminate group (remove all + leave)\n` +
            `┃❍ ${p}leave — Bot leaves the group\n` +
            `┃❍ ${p}hijack / ${p}unhijack — Takeover/restore\n` +
            `┃\n` +
            `┃ *🎮 Games*\n` +
            `┃❍ ${p}games — All game commands\n` +
            `┃❍ ${p}joke / ${p}fact / ${p}quote\n` +
            `┃❍ ${p}8ball <question> / ${p}coinflip / ${p}roll\n` +
            `┃❍ ${p}truth / ${p}dare / ${p}ship @user\n` +
            `┃❍ ${p}trivia — Answer trivia question\n` +
            `┃❍ ${p}dice — Group dice game (join/roll/end)\n` +
            `┃❍ ${p}diceai — Play dice vs Bera AI\n` +
            `┃❍ ${p}ttt @user — TicTacToe challenge\n` +
            `┃❍ ${p}tttplay <1-9> — Place your mark\n` +
            `┃\n` +
            `┃ *📝 Notes*\n` +
            `┃❍ ${p}addnote <text> — Save a note\n` +
            `┃❍ ${p}notes — View all your notes\n` +
            `┃❍ ${p}getnote <num> / ${p}delnote <num>\n` +
            `┃❍ ${p}delallnotes — Clear all notes\n` +
            `┃\n` +
            `┃ *🌤️ Extra Tools*\n` +
            `┃❍ ${p}weather <city> — Live weather\n` +
            `┃❍ ${p}define <word> — Word definition\n` +
            `┃❍ ${p}ebase / ${p}dbase — Base64 encode/decode\n` +
            `┃❍ ${p}ebinary / ${p}debinary — Binary convert\n` +
            `┃❍ ${p}domaincheck <domain> — WHOIS lookup\n` +
            `┃❍ ${p}npm <package> — NPM package info\n` +
            `┃❍ ${p}emojimix 😀 🔥 — Mix two emojis\n` +
            `┃❍ ${p}sspc / ${p}ssphone <url> — Screenshot\n` +
            `┃\n` +
            `┃ *📧 Temp Email*\n` +
            `┃❍ ${p}tempmail — Generate disposable email\n` +
            `┃❍ ${p}tempinbox — Check temp inbox\n` +
            `┃❍ ${p}readmail <num> / ${p}delmail\n` +
            `┃\n` +
            `┃ *📤 Uploaders*\n` +
            `┃❍ ${p}catbox — Upload to Catbox (reply to file)\n` +
            `┃❍ ${p}githubcdn — Upload to GitHub CDN\n` +
            `┃\n` +
            `┃ *⚙️ My Config*\n` +
            `┃❍ ${p}setgitusername / ${p}setgittoken\n` +
            `┃❍ ${p}setbhkey / ${p}myconfig\n` +
            `┃\n` +
            `┃ *🚀 BeraHost (Deploy Bots)*\n` +
            `┃❍ ${p}berahost bots — List your bots\n` +
            `┃❍ ${p}berahost deploy beraai <num>\n` +
            `┃❍ ${p}berahost deploy atassa <session> <num>\n` +
            `┃❍ ${p}berahost balance — Coin balance\n` +
            `┃❍ ${p}berahost daily — Claim daily coins\n` +
            `┃❍ ${p}berahost plans — View hosting plans\n` +
            `┃\n` +
            `┃ *🖥️ Panel (Pterodactyl)*\n` +
            `┃❍ ${p}create <plan> <user>, <phone> — Create server\n` +
            `┃❍   Plans: 1gb, 2gb, 4gb, 6gb, 8gb, 10gb, unli, admin\n` +
            `┃❍ ${p}servers — List all servers\n` +
            `┃❍ ${p}ptstart / ${p}ptstop / ${p}ptrestart <id>\n` +
            `┃❍ ${p}ptcmd <id> <command> — Run cmd on server\n` +
            `┃❍ ${p}ptfiles <id> — List server files\n` +
            `┃❍ ${p}ptread <id> <path> — Read file\n` +
            `┃❍ ${p}ptcreds <id> — Get server creds\n` +
            `┃❍ ${p}ptdelete <id> — Delete server\n` +
            `┃\n` +
            `┃ *👑 Owner Settings*\n` +
            `┃❍ ${p}broadcast <msg> — Message all users\n` +
            `┃❍ ${p}ban / ${p}unban @user\n` +
            `┃❍ ${p}block / ${p}unblock <number>\n` +
            `┃❍ ${p}stats — Bot statistics\n` +
            `┃❍ ${p}backup — Backup database\n` +
            `┃❍ ${p}mode public/private — Access mode\n` +
            `┃❍ ${p}setprefix <new> — Change prefix\n` +
            `┃❍ ${p}setbotname <name> — Bot display name\n` +
            `┃❍ ${p}setbotpic — Change bot picture\n` +
            `┃❍ ${p}autotyping / ${p}autobio on/off\n` +
            `┃❍ ${p}noprefix — Toggle prefix requirement\n` +
            `┃❍ ${p}beraclone — Clone this bot\n` +
            `┃❍ ${p}setsudo @user — Add sudo user\n` +
            `┃❍ ${p}getsudo — List sudo users\n` +
            `┃❍ ${p}delsudo @user — Remove sudo user\n` +
            `┃❍ ${p}getpp <number> — Get profile picture\n` +
            `┃\n` +
            `┃ *🎭 ChatBera (Talk As You)*\n` +
            `┃❍ ${p}trainbera — Upload WhatsApp chat export\n` +
            `┃❍ ${p}chatbera on/off — Activate in this chat\n` +
            `┃❍ ${p}testbera <msg> — Test a reply in your style\n` +
            `┃❍ ${p}mystyle — View your texting style analysis\n` +
            `┃❍ ${p}clearstyle — Delete training data\n` +
            `┃ *💻 Shell & Eval (Owner)*\n` +
            `┃❍ ${p}$ <cmd> / ${p}bash <cmd> — Run shell command\n` +
            `┃❍ ${p}> <js> / ${p}eval <js> — Evaluate JavaScript\n` +
            `┃\n` : '') +
            `╰══════════════════⊷`
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
    'setprefix', 'setendpoint', 'myprofile',
    'setbotpic', 'setbotimage', 'setbotname',
    'uptime'
]
handle.tags = ['general']

module.exports = handle
