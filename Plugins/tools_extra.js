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
            // GuerrillaMail — free, no auth, works from server environments
            const gRes = await axios.get('https://api.guerrillamail.com/ajax.php?f=get_email_address', { timeout: 15000 })
            const email = gRes.data?.email_addr
            const sidToken = gRes.data?.sid_token
            if (!email) throw new Error('No email generated')
            if (!global.db.data.tempmail) global.db.data.tempmail = {}
            global.db.data.tempmail[sender] = { email, sid_token: sidToken, created: Date.now() }
            await global.db.write()
            await react('✅')
            return reply(
                `╭══〘 *📧 TEMP EMAIL* 〙═⊷
` +
                `┃
` +
                `┃ *Your Email:*
` +
                `┃ ${email}
` +
                `┃
` +
                `┃❍ Use *${prefix}inbox* to check messages
` +
                `┃❍ Use *${prefix}delmail* to delete
` +
                `┃❍ Valid for 60 minutes
` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply('❌ Failed to create temp email: ' + e.message)
        }
    }

// ── INBOX ────────────────────────────────────────────────────────────
    if (['inbox', 'tempmailinbox', 'checkinbox'].includes(command)) {
        await react('⏳')
        const mailData = global.db?.data?.tempmail?.[sender]
        if (!mailData?.email) {
            await react('❌')
            return reply(`❌ No temp email found. Create one with *${prefix}tempmail* first.`)
        }
        try {
            const res = await axios.get(
                `https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${mailData.sid_token}`,
                { timeout: 15000 }
            )
            const messages = res.data?.list || []
            if (!messages.length) {
                await react('📭')
                return reply(`╭══〘 *📭 INBOX EMPTY* 〙═⊷
┃ ${mailData.email}
┃ No messages yet.
╰══════════════════⊷`)
            }
            const msgList = messages.slice(0, 5).map((msg, i) =>
                `┃ ${i+1}. From: ${msg.mail_from}
┃    Subject: ${msg.mail_subject}`
            ).join('
')
            await react('✅')
            return reply(
                `╭══〘 *📧 INBOX* 〙═⊷
` +
                `┃ Email: ${mailData.email}
` +
                `┃ Messages: ${messages.length}
┃
` +
                msgList + `
╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply('❌ Failed to check inbox: ' + e.message)
        }
    }


