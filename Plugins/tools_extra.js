// Plugins/tools_extra.js — Extra tools: weather, define, base64, binary, domain, npm, uploader
const axios = require('axios')
const https = require('https')

const BASE = 'https://apiskeith.top'

const kget = async (endpoint, params = {}, timeout = 20000) => {
    const res = await axios.get(BASE + endpoint, { params, timeout })
    return res.data
}

const handle = async (m, { conn, text, reply, prefix, command, sender, chat, isOwner, args }) => {
    const react = (e) => conn.sendMessage(chat, { react: { text: e, key: m.key } }).catch(() => {})

    // ── WEATHER ──────────────────────────────────────────────────────────
    if (['weather', 'w', 'forecast'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}weather <city>\nExample: ${prefix}weather Nairobi`)
        await react('⏳')
        try {
            // wttr.in is free and requires no API key
            const res = await axios.get(`https://wttr.in/${encodeURIComponent(text.trim())}?format=j1`, { timeout: 15000 })
            const d = res.data
            const cur = d.current_condition?.[0]
            const area = d.nearest_area?.[0]
            if (!cur) throw new Error('No data')
            const city = area?.areaName?.[0]?.value || text
            const country = area?.country?.[0]?.value || ''
            const temp = cur.temp_C
            const feels = cur.FeelsLikeC
            const desc = cur.weatherDesc?.[0]?.value || ''
            const humidity = cur.humidity
            const wind = cur.windspeedKmph
            const visibility = cur.visibility
            await react('✅')
            return reply(
                `╭══〘 *🌤️ WEATHER* 〙═⊷\n` +
                `┃❍ *Location:* ${city}, ${country}\n` +
                `┃❍ *Condition:* ${desc}\n` +
                `┃❍ *Temperature:* ${temp}°C\n` +
                `┃❍ *Feels Like:* ${feels}°C\n` +
                `┃❍ *Humidity:* ${humidity}%\n` +
                `┃❍ *Wind:* ${wind} km/h\n` +
                `┃❍ *Visibility:* ${visibility} km\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Could not get weather for *${text}*. Check the city name and try again.`)
        }
    }

    // ── DEFINE / DICTIONARY ───────────────────────────────────────────────
    if (['define', 'dict', 'dictionary', 'meaning'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}define <word>\nExample: ${prefix}define serendipity`)
        await react('⏳')
        try {
            const word = text.trim().split(' ')[0].toLowerCase()
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, { timeout: 15000 })
            const d = res.data?.[0]
            if (!d) throw new Error('Not found')
            const meanings = d.meanings?.slice(0, 2).map(m => {
                const defs = m.definitions?.slice(0, 2).map((def, i) => `  ${i+1}. ${def.definition}`).join('\n')
                return `*${m.partOfSpeech}:*\n${defs}`
            }).join('\n\n')
            const phonetic = d.phonetic || d.phonetics?.[0]?.text || ''
            await react('✅')
            return reply(
                `╭══〘 *📖 DEFINITION* 〙═⊷\n` +
                `┃❍ *Word:* ${d.word}\n` +
                `┃❍ *Phonetic:* ${phonetic || 'N/A'}\n` +
                `┃\n` +
                `${meanings}\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ No definition found for *${text.trim().split(' ')[0]}*.`)
        }
    }

    // ── BASE64 ENCODE ─────────────────────────────────────────────────────
    if (['ebase', 'base64encode', 'b64e', 'tobase64'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}ebase <text to encode>`)
        const encoded = Buffer.from(text.trim()).toString('base64')
        return reply(`╭══〘 *🔐 BASE64 ENCODE* 〙═⊷\n┃❍ *Input:* ${text.trim().slice(0, 50)}\n┃\n┃ *Result:*\n${encoded}\n╰══════════════════⊷`)
    }

    // ── BASE64 DECODE ─────────────────────────────────────────────────────
    if (['dbase', 'base64decode', 'b64d', 'frombase64'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}dbase <base64 string>`)
        try {
            const decoded = Buffer.from(text.trim(), 'base64').toString('utf8')
            return reply(`╭══〘 *🔓 BASE64 DECODE* 〙═⊷\n┃❍ *Input:* ${text.trim().slice(0, 50)}\n┃\n┃ *Result:*\n${decoded}\n╰══════════════════⊷`)
        } catch { return reply(`❌ Invalid Base64 string.`) }
    }

    // ── BINARY ENCODE ─────────────────────────────────────────────────────
    if (['ebinary', 'tobinary', 'texttobin'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}ebinary <text>`)
        const bin = text.trim().split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
        return reply(`╭══〘 *💻 BINARY ENCODE* 〙═⊷\n┃❍ *Input:* ${text.trim().slice(0, 40)}\n┃\n┃ *Binary:*\n${bin.slice(0, 500)}\n╰══════════════════⊷`)
    }

    // ── BINARY DECODE ─────────────────────────────────────────────────────
    if (['debinary', 'frombinary', 'bintotext'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}debinary <binary string>`)
        try {
            const parts = text.trim().split(/\s+/)
            const decoded = parts.map(b => String.fromCharCode(parseInt(b, 2))).join('')
            if (!decoded.trim()) throw new Error('Invalid binary')
            return reply(`╭══〘 *💻 BINARY DECODE* 〙═⊷\n┃❍ *Input:* ${text.trim().slice(0, 50)}\n┃\n┃ *Result:*\n${decoded}\n╰══════════════════⊷`)
        } catch { return reply(`❌ Invalid binary string. Use space-separated 8-bit groups.`) }
    }

    // ── DOMAIN CHECK ──────────────────────────────────────────────────────
    if (['domaincheck', 'domain', 'whois'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}domaincheck <domain>\nExample: ${prefix}domaincheck google.com`)
        await react('⏳')
        try {
            const domain = text.trim().replace(/^https?:\/\//, '').split('/')[0]
            const res = await axios.get(`https://api.domainsdb.info/v1/domains/search?domain=${domain}&zone=com`, { timeout: 15000 })
            const exists = res.data?.domains?.length > 0
            const data = res.data?.domains?.[0]
            await react('✅')
            return reply(
                `╭══〘 *🌐 DOMAIN INFO* 〙═⊷\n` +
                `┃❍ *Domain:* ${domain}\n` +
                `┃❍ *Status:* ${exists ? '✅ Registered' : '❌ Not found'}\n` +
                (data ? `┃❍ *Created:* ${data.create_date?.split('T')[0] || 'N/A'}\n┃❍ *Updated:* ${data.update_date?.split('T')[0] || 'N/A'}` : '') +
                `\n╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Could not check domain. Try again.`)
        }
    }

    // ── NPM SEARCH ────────────────────────────────────────────────────────
    if (['npm', 'npmsearch', 'npmpackage'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}npm <package name>\nExample: ${prefix}npm axios`)
        await react('⏳')
        try {
            const pkg = text.trim().split(' ')[0]
            const res = await axios.get(`https://registry.npmjs.org/${pkg}`, { timeout: 15000 })
            const d = res.data
            const latest = d['dist-tags']?.latest
            const ver = d.versions?.[latest]
            await react('✅')
            return reply(
                `╭══〘 *📦 NPM PACKAGE* 〙═⊷\n` +
                `┃❍ *Name:* ${d.name}\n` +
                `┃❍ *Version:* ${latest}\n` +
                `┃❍ *Description:* ${d.description || 'N/A'}\n` +
                `┃❍ *Author:* ${d.author?.name || ver?.author?.name || 'N/A'}\n` +
                `┃❍ *License:* ${ver?.license || 'N/A'}\n` +
                `┃❍ *Homepage:* ${d.homepage || 'N/A'}\n` +
                `┃❍ *Install:* npm install ${d.name}\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Package *${text.trim().split(' ')[0]}* not found on NPM.`)
        }
    }

    // ── TEMP MAIL ─────────────────────────────────────────────────────────
    if (['tempmail', 'tmpmail', 'disposablemail'].includes(command)) {
        await react('⏳')
        try {
            // Use 1secmail API (completely free)
            const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', { timeout: 15000 })
            const email = res.data?.[0]
            if (!email) throw new Error('No email generated')
            if (!global.db.data.tempmail) global.db.data.tempmail = {}
            global.db.data.tempmail[sender] = email
            await global.db.write()
            await react('✅')
            return reply(
                `╭══〘 *📧 TEMP EMAIL* 〙═⊷\n` +
                `┃\n` +
                `┃ *Your Email:*\n` +
                `┃ ${email}\n` +
                `┃\n` +
                `┃❍ Use ${prefix}tempinbox to check mail\n` +
                `┃❍ Use ${prefix}delmail to clear it\n` +
                `┃❍ Email expires after ~1 hour\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Failed to generate temp email. Try again.`)
        }
    }

    // ── TEMP INBOX ────────────────────────────────────────────────────────
    if (['tempinbox', 'checkinbox', 'inbox'].includes(command)) {
        const email = global.db?.data?.tempmail?.[sender]
        if (!email) return reply(`❌ You have no temp email. Generate one with ${prefix}tempmail`)
        await react('⏳')
        try {
            const [login, domain] = email.split('@')
            const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`, { timeout: 15000 })
            const msgs = res.data
            await react('✅')
            if (!msgs?.length) return reply(`📭 *Inbox Empty*\n\nEmail: ${email}\nNo messages yet. Check again in a moment.`)
            const list = msgs.slice(0, 5).map((msg, i) => `*${i+1}.* From: ${msg.from}\n   Subject: ${msg.subject}`).join('\n\n')
            return reply(
                `╭══〘 *📬 INBOX (${msgs.length})* 〙═⊷\n\n` +
                `Email: ${email}\n\n` +
                `${list}\n\n` +
                `Use ${prefix}readmail <number> to read\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Failed to check inbox.`)
        }
    }

    // ── READ MAIL ─────────────────────────────────────────────────────────
    if (['readmail', 'readmsg', 'openmail'].includes(command)) {
        const email = global.db?.data?.tempmail?.[sender]
        if (!email) return reply(`❌ You have no temp email. Generate one with ${prefix}tempmail`)
        const num = parseInt(text?.trim())
        if (isNaN(num) || num < 1) return reply(`❌ Usage: ${prefix}readmail <number>\nCheck inbox first with ${prefix}tempinbox`)
        await react('⏳')
        try {
            const [login, domain] = email.split('@')
            const msgs = (await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`, { timeout: 15000 })).data
            if (!msgs?.length) return reply(`📭 Inbox is empty.`)
            const msg = msgs[num - 1]
            if (!msg) return reply(`❌ No message #${num}. You have ${msgs.length} message(s).`)
            const full = (await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${msg.id}`, { timeout: 15000 })).data
            await react('✅')
            return reply(
                `╭══〘 *📧 EMAIL #${num}* 〙═⊷\n` +
                `┃❍ *From:* ${full.from}\n` +
                `┃❍ *Subject:* ${full.subject}\n` +
                `┃❍ *Date:* ${full.date}\n` +
                `┃\n` +
                `${(full.textBody || full.htmlBody?.replace(/<[^>]+>/g, '') || 'No text content').slice(0, 1000)}\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Failed to read mail.`)
        }
    }

    // ── DELETE TEMP MAIL ──────────────────────────────────────────────────
    if (['delmail', 'deletemail', 'clearmail'].includes(command)) {
        if (!global.db?.data?.tempmail?.[sender]) return reply(`❌ You have no temp email stored.`)
        const old = global.db.data.tempmail[sender]
        delete global.db.data.tempmail[sender]
        await global.db.write()
        return reply(`✅ Temp email *${old}* has been cleared.`)
    }

    // ── UPLOADER: CATBOX ──────────────────────────────────────────────────
    if (['catbox', 'uploadcatbox'].includes(command)) {
        const q = m.quoted
        if (!q?.mimetype) return reply(`❌ Reply to a file/image/video to upload it.\nUsage: ${prefix}catbox (reply to file)`)
        await react('⏳')
        try {
            const buf = await conn.downloadMediaMessage({ key: q.key, message: q.message })
            const FormData = require('form-data')
            const form = new FormData()
            form.append('reqtype', 'fileupload')
            form.append('fileToUpload', buf, { filename: 'upload', contentType: q.mimetype })
            const res = await axios.post('https://catbox.moe/user.php', form, { headers: form.getHeaders(), timeout: 60000 })
            await react('✅')
            return reply(`╭══〘 *📤 CATBOX UPLOAD* 〙═⊷\n┃❍ *URL:* ${res.data}\n┃❍ *File type:* ${q.mimetype}\n╰══════════════════⊷`)
        } catch (e) {
            await react('❌')
            return reply(`❌ Upload failed: ${e.message}`)
        }
    }

    // ── GITHUB CDN UPLOAD ─────────────────────────────────────────────────
    if (['githubcdn', 'ghupload', 'uploadgithub'].includes(command)) {
        const q = m.quoted
        if (!q?.mimetype) return reply(`❌ Reply to a file/image/video to upload.\nUsage: ${prefix}githubcdn (reply to file)`)
        const ghToken = global.db?.data?.settings?.githubToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN
        const ghUser = global.db?.data?.settings?.githubUsername || 'bera-tech-ai'
        if (!ghToken) return reply(`❌ Set your GitHub token first with ${prefix}setgittoken <token>`)
        await react('⏳')
        try {
            const buf = await conn.downloadMediaMessage({ key: q.key, message: q.message })
            const ext = q.mimetype.split('/')[1] || 'bin'
            const filename = `upload_${Date.now()}.${ext}`
            const b64 = buf.toString('base64')
            const res = await axios.put(
                `https://api.github.com/repos/${ghUser}/bera-cdn/contents/${filename}`,
                { message: `Upload ${filename}`, content: b64 },
                { headers: { Authorization: `Bearer ${ghToken}`, 'User-Agent': 'BeraAI' }, timeout: 30000 }
            )
            const url = res.data?.content?.download_url
            await react('✅')
            return reply(`╭══〘 *📤 GITHUB CDN UPLOAD* 〙═⊷\n┃❍ *URL:* ${url}\n┃❍ *File:* ${filename}\n╰══════════════════⊷`)
        } catch (e) {
            await react('❌')
            return reply(`❌ GitHub upload failed: ${e.message}`)
        }
    }

    // ── EMOJIMIX ──────────────────────────────────────────────────────────
    if (['emojimix', 'mixemoji', 'emojimerge'].includes(command)) {
        if (!text || !text.includes(' ')) return reply(`❌ Usage: ${prefix}emojimix <emoji1> <emoji2>\nExample: ${prefix}emojimix 😀 🔥`)
        await react('⏳')
        try {
            const parts = text.trim().split(/\s+/)
            const e1 = parts[0], e2 = parts[1]
            const c1 = e1.codePointAt(0)?.toString(16)
            const c2 = e2.codePointAt(0)?.toString(16)
            const url = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${c1}/u${c1}_u${c2}.png`
            await conn.sendMessage(chat, { image: { url }, caption: `✨ Emoji Mix: ${e1} + ${e2}` }, { quoted: m })
            await react('✅')
        } catch (e) {
            await react('❌')
            return reply(`❌ Could not mix those emojis. Try standard emojis like 😀 and 🔥`)
        }
    }

    // ── SCREENSHOT (website) ──────────────────────────────────────────────
    if (['sspc', 'ssweb', 'sstab', 'ssphone', 'screenshot', 'ss'].includes(command)) {
        if (!text) return reply(`❌ Usage: ${prefix}sspc <url>\nExample: ${prefix}sspc https://google.com`)
        const url = text.trim().startsWith('http') ? text.trim() : 'https://' + text.trim()
        await react('⏳')
        try {
            // Use screenshotmachine free tier
            const viewport = command === 'ssphone' ? '480x800' : command === 'sstab' ? '768x1024' : '1280x800'
            const ssUrl = `https://mini.s-shot.ru/${viewport}/JPEG/1000/Z100/?${encodeURIComponent(url)}`
            await conn.sendMessage(chat, { image: { url: ssUrl }, caption: `📸 Screenshot of ${url}` }, { quoted: m })
            await react('✅')
        } catch (e) {
            await react('❌')
            return reply(`❌ Screenshot failed: ${e.message}`)
        }
    }
}

handle.command = [
    // Weather
    'weather', 'w', 'forecast',
    // Dictionary
    'define', 'dict', 'dictionary', 'meaning',
    // Base64
    'ebase', 'base64encode', 'b64e', 'tobase64',
    'dbase', 'base64decode', 'b64d', 'frombase64',
    // Binary
    'ebinary', 'tobinary', 'texttobin',
    'debinary', 'frombinary', 'bintotext',
    // Domain
    'domaincheck', 'domain', 'whois',
    // NPM
    'npm', 'npmsearch', 'npmpackage',
    // Temp mail
    'tempmail', 'tmpmail', 'disposablemail',
    'tempinbox', 'checkinbox', 'inbox',
    'readmail', 'readmsg', 'openmail',
    'delmail', 'deletemail', 'clearmail',
    // Uploaders
    'catbox', 'uploadcatbox',
    'githubcdn', 'ghupload', 'uploadgithub',
    // Emoji mix
    'emojimix', 'mixemoji', 'emojimerge',
    // Screenshot
    'sspc', 'ssweb', 'sstab', 'ssphone', 'screenshot', 'ss',
]
handle.tags = ['tools']

module.exports = handle
