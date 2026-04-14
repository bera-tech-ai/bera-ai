const axios = require('axios')
const { sendButtons } = require('gifted-btns')
const { getBtnMode } = require('../Library/actions/btnmode')

const BASE = 'https://apiskeith.top'
const kget = (path, params, timeout = 15000) =>
    axios.get(BASE + path, { params, timeout, headers: { 'User-Agent': 'BeraBot/2.0' } })

// AI getter with gpt41Nano primary, gpt as fallback
const kgetAI = async (prompt, timeout = 20000) => {
    const AI_PATHS = ['/ai/gpt41Nano', '/ai/gpt']
    for (const aiPath of AI_PATHS) {
        try {
            const res = await axios.get(BASE + aiPath, { params: { q: prompt }, timeout, headers: { 'User-Agent': 'BeraBot/2.0' } })
            if (res.data?.result) return res
        } catch {}
    }
    return { data: { result: null } }
}

const handle = async (m, { conn, text, reply, prefix, command, sender, chat, args }) => {
    const react = (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {})

    // ── URL Shorteners ───────────────────────────────────────────────────────
    if (command === 'shorten' || command === 'tinyurl' || command === 'short') {
        if (!text) return reply(`❌ Usage: ${prefix}shorten <url>\nExample: ${prefix}shorten https://google.com`)
        if (!text.startsWith('http')) return reply('❌ Please provide a valid URL starting with http/https')
        await react('⏳')
        try {
            const res = await kget('/shortener/tinyurl', { url: text.trim() })
            const r = res.data?.result || res.data?.link
            if (!r) throw new Error('no result')
            await react('✅')
            return reply(`🔗 *URL Shortened:*\n\n*Short:* ${r}\n*Original:* ${text.slice(0,80)}`)
        } catch {
            // Fallback to bitly
            try {
                const res2 = await kget('/shortener/bitly', { url: text.trim() })
                const r2 = res2.data?.result || res2.data?.link
                if (!r2) throw new Error('no result')
                await react('✅')
                return reply(`🔗 *URL Shortened (Bitly):*\n\n*Short:* ${r2}\n*Original:* ${text.slice(0,80)}`)
            } catch {
                await react('❌')
                return reply('❌ URL shortening failed. Try again.')
            }
        }
    }

    // ── Fancy Text ───────────────────────────────────────────────────────────
    if (command === 'fancy') {
        if (!text) return reply(`❌ Usage: ${prefix}fancy <text>\nExample: ${prefix}fancy Bera AI`)
        await react('⏳')
        try {
            const res = await kget('/fancytext/random', { q: text })
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('✅')
            return reply(`✨ *Fancy Text:*\n\n${result}`)
        } catch {
            await react('❌')
            return reply('❌ Fancy text failed. Try again.')
        }
    }

    // ── All Fancy Styles ─────────────────────────────────────────────────────
    if (command === 'fancystyles' || command === 'textstyles') {
        if (!text) return reply(`❌ Usage: ${prefix}fancystyles <text>\nExample: ${prefix}fancystyles Hello`)
        await react('⏳')
        try {
            const res = await kget('/fancytext/styles', { q: text })
            const styles = res.data?.styles
            if (!styles || !Array.isArray(styles)) throw new Error('no styles')
            const lines = styles.slice(0, 20).map((s, i) =>
                `┃❍ *${s.name || ('Style ' + (i+1))}:* ${s.result || s.text || ''}`
            ).join('\n')
            await react('✅')
            return reply(`╭══〘 *✨ FANCY STYLES: ${text}* 〙═⊷\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ Could not fetch fancy styles.')
        }
    }

    // ── Translate ────────────────────────────────────────────────────────────
    if (command === 'tr' || command === 'trans' || command === 'translate') {
        if (!args.length || args.length < 2) return reply(`❌ Usage: ${prefix}tr <language> <text>\nExample: ${prefix}tr french Hello how are you`)
        const [lang, ...rest] = args
        const msg = rest.join(' ')
        if (!msg) return reply(`❌ Usage: ${prefix}tr <language> <text>`)
        await react('⏳')
        try {
            const res = await kget('/translate', { text: msg, to: lang })
            const data = res.data
            const translated = data?.result?.translatedText || data?.result?.translated || data?.result
            if (!translated || typeof translated !== 'string') throw new Error('no result')
            const originalLang = data?.result?.detectedLanguage || data?.result?.from || ''
            await react('✅')
            return reply(
                `╭══〘 *🌐 TRANSLATE* 〙═⊷\n` +
                `┃❍ From: *${originalLang || 'auto-detected'}*\n` +
                `┃❍ To: *${lang}*\n` +
                `┃\n` +
                `┃ _${msg}_\n` +
                `┃ ↓\n` +
                `┃ *${translated}*\n` +
                `╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply('❌ Translation failed. Try again.')
        }
    }

    // ── WhatsApp Number Check ────────────────────────────────────────────────
    if (command === 'wacheck' || command === 'onwa' || command === 'checkwa') {
        if (!text) return reply(`❌ Usage: ${prefix}wacheck <number>\nExample: ${prefix}wacheck 254712345678`)
        const num = text.replace(/[^0-9]/g, '')
        if (num.length < 7) return reply('❌ Invalid number. Include country code (e.g. 254712345678)')
        await react('⏳')
        try {
            const res = await kget('/onwhatsapp', { q: num })
            const data = res.data
            const exists = data?.result?.registered ?? data?.result?.exists ?? data?.result
            const existsBool = exists === true || exists === 'true' || exists === 1
            await react(existsBool ? '✅' : '❌')
            return reply(
                `╭══〘 *📱 WHATSAPP CHECK* 〙═⊷\n` +
                `┃❍ Number: *+${num}*\n` +
                `┃❍ Status: *${existsBool ? '✅ Active on WhatsApp' : '❌ Not found on WhatsApp'}*\n` +
                `╰══════════════════⊷`
            )
        } catch {
            // Fallback: use Baileys native
            try {
                const [result] = await conn.onWhatsApp(num + '@s.whatsapp.net').catch(() => [])
                const exists2 = result?.exists ?? false
                await react(exists2 ? '✅' : '❌')
                return reply(`╭══〘 *📱 WA CHECK* 〙═⊷\n┃❍ Number: *+${num}*\n┃❍ Status: *${exists2 ? '✅ Active' : '❌ Not found'}*\n╰══════════════════⊷`)
            } catch {
                await react('❌')
                return reply('❌ Check failed. Try again.')
            }
        }
    }

    // ── WhatsApp Profile Picture ─────────────────────────────────────────────
    if (command === 'wapfp' || command === 'waprofile' || command === 'profilepic') {
        if (!text) return reply(`❌ Usage: ${prefix}wapfp <number>\nExample: ${prefix}wapfp 254712345678`)
        const num = text.replace(/[^0-9]/g, '')
        await react('⏳')
        try {
            const res = await kget('/whatsapp/profile', { query: num }, 20000)
            const data = res.data
            const imgUrl = data?.result?.profile_pic || data?.result?.profilePicUrl || data?.result?.url || data?.result
            if (!imgUrl || typeof imgUrl !== 'string' || !imgUrl.startsWith('http')) throw new Error('no image url')
            await conn.sendMessage(chat, { image: { url: imgUrl }, caption: `📸 WhatsApp Profile Picture\n+${num}` }, { quoted: m })
            await react('✅')
        } catch {
            await react('❌')
            return reply('❌ Could not fetch profile picture. The number may be private or not on WhatsApp.')
        }
    }

    // ── WhatsApp Link Creator ────────────────────────────────────────────────
    if (command === 'walink' || command === 'wame') {
        const num = args[0]?.replace(/[^0-9]/g, '') || ''
        const msg = args.slice(1).join(' ') || text?.replace(/^\S+\s*/, '') || ''
        if (!num) return reply(`❌ Usage: ${prefix}walink <number> [message]\nExample: ${prefix}walink 254712345678 Hello!`)
        await react('⏳')
        try {
            const res = await kget('/tools/walink', { q: msg || 'Hello', number: num })
            const data = res.data
            const link = data?.result?.link || data?.result?.walink || data?.result
            if (!link || typeof link !== 'string') throw new Error('no result')
            await react('✅')
            return reply(`🔗 *WhatsApp Link:*\n\n${link}`)
        } catch {
            const fallback = `https://wa.me/${num}${msg ? '?text=' + encodeURIComponent(msg) : ''}`
            await react('✅')
            return reply(`🔗 *WhatsApp Link:*\n\n${fallback}`)
        }
    }

    // ── ASCII Art ────────────────────────────────────────────────────────────
    if (command === 'ascii') {
        if (!text) return reply(`❌ Usage: ${prefix}ascii <text>\nExample: ${prefix}ascii BERA`)
        await react('⏳')
        try {
            const res = await kget('/tools/ascii', { q: text }, 20000)
            const data = res.data
            const art = data?.result || data?.ascii
            if (!art || typeof art !== 'string') throw new Error('no result')
            await react('✅')
            return reply(`\`\`\`\n${art}\n\`\`\``)
        } catch {
            await react('❌')
            return reply('❌ ASCII art failed. Try shorter or different text.')
        }
    }

    // ── IP Lookup ────────────────────────────────────────────────────────────
    if (command === 'iplookup' || command === 'ip') {
        if (!text) return reply(`❌ Usage: ${prefix}ip <ip-address>\nExample: ${prefix}ip 8.8.8.8`)
        await react('⏳')
        try {
            const res = await kget('/ip/lookup', { q: text.trim() })
            const data = res.data
            const r = data?.result || data?.data
            if (!r) throw new Error('no result')
            const info = typeof r === 'object' ? r : { info: r }
            const lines = Object.entries(info).filter(([k,v]) => v && k !== 'status').map(([k,v]) => `┃❍ *${k}:* ${v}`).join('\n')
            await react('✅')
            return reply(`╭══〘 *🌐 IP LOOKUP: ${text.trim()}* 〙═⊷\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ IP lookup failed. Check the IP address.')
        }
    }

    // ── JS Encrypt ───────────────────────────────────────────────────────────
    if (command === 'jsencrypt' || command === 'encrypt') {
        if (!text) return reply(`❌ Usage: ${prefix}encrypt <javascript code>\nExample: ${prefix}encrypt console.log('hello')`)
        await react('⏳')
        try {
            const res = await kget('/tools/encrypt', { q: text })
            const data = res.data
            const result = data?.result || data?.encrypted
            if (!result) throw new Error('no result')
            await react('✅')
            return reply(`🔐 *Encrypted JS (Preemptive):*\n\n\`\`\`\n${result}\n\`\`\``)
        } catch {
            await react('❌')
            return reply('❌ Encryption failed.')
        }
    }

    // ── Web Search ───────────────────────────────────────────────────────────
    if (command === 'search' || command === 'websearch' || command === 'google') {
        if (!text) return reply(`❌ Usage: ${prefix}search <query>\nExample: ${prefix}search latest news Kenya`)
        await react('🔍')
        try {
            const res = await kget('/search/google', { q: text }, 20000)
            const data = res.data
            if (!data?.status && !data?.result) {
                // Fallback to brave
                const res2 = await kget('/search/brave', { q: text }, 20000)
                const d2 = res2.data
                if (!d2?.result) throw new Error('no results')
                const r = d2.result
                const hits = r?.results?.slice(0, 4) || []
                if (!hits.length) throw new Error('empty results')
                const lines = hits.map((h, i) =>
                    `┃❍ *${i+1}. ${(h.title||'').slice(0,50)}*\n┃   ${(h.description||h.snippet||'').slice(0,90)}`
                ).join('\n┃\n')
                await react('✅')
                return reply(`╭══〘 *🔍 ${text.slice(0,30)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
            }
            const r = data.result
            const hits = (r?.organic || r?.results || (Array.isArray(r) ? r : [])).slice(0, 4)
            if (!hits.length) throw new Error('empty results')
            const lines = hits.map((h, i) =>
                `┃❍ *${i+1}. ${(h.title||'').slice(0,50)}*\n┃   ${(h.snippet||h.description||'').slice(0,90)}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *🔍 ${text.slice(0,30)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ Search failed. Try again.')
        }
    }

    // ── Image Search ─────────────────────────────────────────────────────────
    if (command === 'imgsearch' || command === 'searchimage') {
        if (!text) return reply(`❌ Usage: ${prefix}imgsearch <query>\nExample: ${prefix}imgsearch sunset landscape`)
        await react('🔍')
        try {
            const res = await kget('/search/images', { q: text }, 20000)
            const data = res.data
            const images = data?.result || data?.results || data?.images || []
            const imgArr = Array.isArray(images) ? images : [images]
            const firstImg = imgArr[0]
            const imgUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url || firstImg?.link || firstImg?.src
            if (!imgUrl || !imgUrl.startsWith('http')) throw new Error('no image')
            await conn.sendMessage(chat, { image: { url: imgUrl }, caption: `🖼️ *${text}*` }, { quoted: m })
            await react('✅')
        } catch {
            await react('❌')
            return reply('❌ No images found for: *' + text + '*')
        }
    }

    // ── YouTube Search ───────────────────────────────────────────────────────
    if (command === 'ytsearch' || command === 'yts') {
        if (!text) return reply(`❌ Usage: ${prefix}yts <query>\nExample: ${prefix}yts Afrobeats 2025`)
        await react('🔍')
        try {
            const res = await kget('/search/yts', { q: text, query: text })
            const data = res.data
            const results = data?.result || []
            if (!Array.isArray(results) || !results.length) throw new Error('no results')
            const lines = results.slice(0, 5).map((r, i) =>
                `┃❍ *${i+1}.* ${(r.title||r.name||'Unknown').slice(0,55)}\n┃   ⏱️ ${r.duration||r.timestamp||'N/A'} | 👁️ ${r.views||'N/A'}\n┃   🔗 ${r.url||r.link||''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *🎵 YT: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ YouTube search failed. Try again.')
        }
    }

    // ── Lyrics Search ────────────────────────────────────────────────────────
    if (command === 'lyrics') {
        if (!text) return reply(`❌ Usage: ${prefix}lyrics <song title>\nExample: ${prefix}lyrics Blinding Lights`)
        await react('🎵')
        try {
            let res = await kget('/search/lyrics2', { q: text }, 20000).catch(() => null)
            if (!res?.data?.result) res = await kget('/search/lyrics3', { q: text }, 20000).catch(() => null)
            const data = res?.data
            const lyrics = data?.result?.lyrics || data?.result?.text || data?.result
            if (!lyrics || typeof lyrics !== 'string') throw new Error('not found')
            const title = data?.result?.title || data?.result?.song || text
            const artist = data?.result?.artist || ''
            await react('✅')
            return reply(`╭══〘 *🎵 ${title}${artist ? ' - ' + artist : ''}* 〙═⊷\n\n${lyrics.slice(0, 3000)}\n\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ Lyrics not found for: *' + text + '*')
        }
    }

    // ── Movie Search ─────────────────────────────────────────────────────────
    if (command === 'movie' || command === 'film') {
        if (!text) return reply(`❌ Usage: ${prefix}movie <title>\nExample: ${prefix}movie Avengers`)
        await react('🎬')
        try {
            const res = await kget('/search/movie', { q: text }, 20000)
            const data = res.data
            const results = data?.result || data?.results || []
            const r = Array.isArray(results) ? results[0] : results
            if (!r) throw new Error('not found')
            const info = typeof r === 'object' ? r : { info: r }
            await react('✅')
            const thumb = info.thumbnail || info.image || info.poster
            const msg =
                `╭══〘 *🎬 ${info.title || text}* 〙═⊷\n` +
                (info.year ? `┃❍ Year: *${info.year}*\n` : '') +
                (info.rating ? `┃❍ Rating: *${info.rating}*\n` : '') +
                (info.genre ? `┃❍ Genre: *${info.genre}*\n` : '') +
                (info.language ? `┃❍ Language: *${info.language}*\n` : '') +
                (info.duration ? `┃❍ Duration: *${info.duration}*\n` : '') +
                `┃\n` +
                (info.description || info.plot || info.synopsis ? `┃ ${(info.description || info.plot || info.synopsis || '').slice(0, 200)}\n` : '') +
                `╰══════════════════⊷`
            if (thumb && thumb.startsWith('http')) {
                return conn.sendMessage(chat, { image: { url: thumb }, caption: msg }, { quoted: m })
            }
            return reply(msg)
        } catch {
            await react('❌')
            return reply('❌ Movie not found: *' + text + '*')
        }
    }

    // ── Bible Verse ──────────────────────────────────────────────────────────
    if (command === 'bible' || command === 'verse') {
        if (!text) return reply(`❌ Usage: ${prefix}bible <reference>\nExample: ${prefix}bible John 3:16`)
        await react('📖')
        try {
            const res = await kget('/search/bible', { q: text }, 15000)
            const data = res.data
            const r = data?.result || data?.verse || data
            const verseText = r?.text || r?.content || r?.verse || (typeof r === 'string' ? r : null)
            if (!verseText) throw new Error('not found')
            await react('✅')
            return reply(
                `╭══〘 *📖 ${text}* 〙═⊷\n\n` +
                `_"${verseText}"_\n\n` +
                `— *${r.reference || r.book || text}*\n` +
                `╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply('❌ Verse not found: *' + text + '*')
        }
    }

    // ── SoundCloud Search ────────────────────────────────────────────────────
    if (command === 'soundcloud' || command === 'sc') {
        if (!text) return reply(`❌ Usage: ${prefix}sc <query>\nExample: ${prefix}sc lofi hip hop`)
        await react('🔍')
        try {
            const res = await kget('/search/soundcloud', { q: text }, 15000)
            const data = res.data
            const results = data?.result || data?.tracks || []
            const arr = Array.isArray(results) ? results : [results]
            if (!arr.length) throw new Error('no results')
            const lines = arr.slice(0, 4).map((r, i) =>
                `┃❍ *${i+1}.* ${(r.title||r.name||'Unknown').slice(0,50)}\n┃   👤 ${r.artist||r.user?.username||'N/A'} | 🔗 ${r.url||r.permalink||''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *🎵 SOUNDCLOUD: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ SoundCloud search failed.')
        }
    }

    // ── TikTok Search ────────────────────────────────────────────────────────
    if (command === 'ttsearch' || command === 'tiktoksearch') {
        if (!text) return reply(`❌ Usage: ${prefix}ttsearch <query>\nExample: ${prefix}ttsearch dance challenge`)
        await react('🔍')
        try {
            const res = await kget('/search/tiktoksearch', { q: text }, 20000)
            const data = res.data
            const results = data?.result || data?.videos || []
            const arr = Array.isArray(results) ? results : [results]
            if (!arr.length) throw new Error('no results')
            const lines = arr.slice(0, 4).map((r, i) =>
                `┃❍ *${i+1}.* ${(r.title||r.desc||'').slice(0,50)}\n┃   ❤️ ${r.likes||r.diggCount||'N/A'} | 👁️ ${r.views||r.playCount||'N/A'}\n┃   🔗 ${r.url||r.link||''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *🎵 TIKTOK: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ TikTok search failed.')
        }
    }

    // ── APK Search ───────────────────────────────────────────────────────────
    if (command === 'apk' || command === 'appsearch') {
        if (!text) return reply(`❌ Usage: ${prefix}apk <app name>\nExample: ${prefix}apk whatsapp`)
        await react('🔍')
        try {
            const res = await kget('/search/apk', { q: text }, 20000)
            const data = res.data
            const results = data?.result || data?.apps || []
            const arr = Array.isArray(results) ? results : [results]
            if (!arr.length) throw new Error('no results')
            const lines = arr.slice(0, 4).map((r, i) =>
                `┃❍ *${i+1}. ${(r.name||r.title||'Unknown').slice(0,40)}*\n┃   ⭐ ${r.rating||'N/A'} | 📦 ${r.size||'N/A'}\n┃   🔗 ${r.url||r.link||''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *📱 APK: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ APK search failed.')
        }
    }

    // ── WhatsApp Group Search ────────────────────────────────────────────────
    if (command === 'wagroups' || command === 'groupsearch') {
        if (!text) return reply(`❌ Usage: ${prefix}wagroups <topic>\nExample: ${prefix}wagroups tech Kenya`)
        await react('🔍')
        try {
            const res = await kget('/search/whatsappgroup', { q: text }, 20000)
            const data = res.data
            const results = data?.result || data?.groups || []
            const arr = Array.isArray(results) ? results : [results]
            if (!arr.length) throw new Error('no results')
            const lines = arr.slice(0, 5).map((r, i) =>
                `┃❍ *${i+1}. ${(r.name||r.subject||'Unknown').slice(0,40)}*\n┃   ${(r.description||'').slice(0,60)}\n┃   🔗 ${r.link||r.inviteLink||''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *👥 WA GROUPS: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ WA group search failed.')
        }
    }

    // ── Dream Analyzer ───────────────────────────────────────────────────────
    if (command === 'dream' || command === 'dreamanalyze') {
        if (!text) return reply(`❌ Usage: ${prefix}dream <your dream>\nExample: ${prefix}dream I was flying over clouds`)
        await react('🌙')
        try {
            const res = await kget('/ai/dreamanalyzer', { q: text }, 30000)
            const data = res.data
            const result = data?.result
            if (!result || typeof result !== 'string') throw new Error('no result')
            await react('✅')
            return reply(`🌙 *Dream Analysis:*\n\n${result}`)
        } catch {
            await react('❌')
            return reply('❌ Dream analysis failed. Try again.')
        }
    }

    // ── AI Code Generator ────────────────────────────────────────────────────
    if (command === 'codegen' || command === 'gencode') {
        if (!text) return reply(`❌ Usage: ${prefix}codegen <what to code>\nExample: ${prefix}codegen REST API in Node.js`)
        await react('💻')
        try {
            const res = await kget('/ai/codegen', { q: text }, 30000)
            const data = res.data
            let result = data?.result
            if (typeof result === 'object') result = result?.code || result?.output || JSON.stringify(result)
            if (!result || typeof result !== 'string') throw new Error('no result')
            await react('✅')
            const codeBody = `💻 *Generated Code:*\n\n\`\`\`\n${result.slice(0, 3500)}\n\`\`\``
            if (getBtnMode(chat)) {
                return sendButtons(conn, chat, {
                    title:   '💻 Code Generator',
                    text:    codeBody,
                    footer:  'Bera AI — CodeGen',
                    buttons: [
                        { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Copy Code', copy_code: result.slice(0, 2000) }) },
                    ]
                })
            }
            return reply(codeBody)
        } catch {
            await react('❌')
            return reply('❌ Code generation failed. Try again.')
        }
    }

    // ── GitHub User Info ─────────────────────────────────────────────────────
    if (command === 'ghfollowers' || command === 'githubuser') {
        if (!text) return reply(`❌ Usage: ${prefix}ghfollowers <username>\nExample: ${prefix}ghfollowers octocat`)
        await react('⏳')
        try {
            const res = await axios.get(`https://api.github.com/users/${text.trim()}`, {
                headers: { 'User-Agent': 'BeraBot/2.0' }, timeout: 10000
            })
            const u = res.data
            await react('✅')
            return reply(
                `╭══〘 *🐙 GITHUB: ${u.login}* 〙═⊷\n` +
                `┃❍ Name: *${u.name || 'N/A'}*\n` +
                `┃❍ Followers: *${u.followers}*\n` +
                `┃❍ Following: *${u.following}*\n` +
                `┃❍ Repos: *${u.public_repos}*\n` +
                `┃❍ Bio: ${u.bio || 'N/A'}\n` +
                `┃❍ URL: ${u.html_url}\n` +
                `╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply(`❌ GitHub user *${text}* not found.`)
        }
    }

    // ── AI Image Generation ──────────────────────────────────────────────────
    if (command === 'imagine' || command === 'aiimage' || command === 'gen') {
        if (!text) return reply(`❌ Usage: ${prefix}imagine <description>\nExample: ${prefix}imagine a cyberpunk city at night`)
        await react('🎨')
        try {
            const res = await kget('/ai/text2img', { q: text, prompt: text }, 45000)
            const data = res.data
            const result = data?.result
            const imgUrl = typeof result === 'string' && result.startsWith('http') ? result
                : result?.url || result?.image || result?.link
            if (imgUrl && imgUrl.startsWith('http')) {
                await conn.sendMessage(chat, { image: { url: imgUrl }, caption: `🎨 *${text.slice(0, 80)}*` }, { quoted: m })
                await react('✅')
                return
            }
            throw new Error('no image url')
        } catch {
            // Fallback to pollinations image only (it's free image generation, not text)
            try {
                const encoded = encodeURIComponent(text)
                const url = `https://image.pollinations.ai/prompt/${encoded}?nologo=true`
                await conn.sendMessage(chat, { image: { url }, caption: `🎨 *${text.slice(0, 80)}*` }, { quoted: m })
                await react('✅')
            } catch {
                await react('❌')
                return reply('❌ Image generation failed. Try again.')
            }
        }
    }

    // ── Roast ────────────────────────────────────────────────────────────────
    if (command === 'roast') {
        if (!text) return reply(`❌ Usage: ${prefix}roast <name>\nExample: ${prefix}roast John`)
        await react('🔥')
        try {
            const res = await kgetAI(`Give a short funny roast for someone named ${text}. Be creative and funny, not mean. One sentence only. No filler intro.`, 20000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('😂')
            return reply(`🔥 *Roasting ${text}:*\n\n_${result}_`)
        } catch {
            return reply('❌ Roast failed. The roast master is sleeping.')
        }
    }

    // ── Story Generator ──────────────────────────────────────────────────────
    if (command === 'story' || command === 'generate') {
        if (!text) return reply(`❌ Usage: ${prefix}story <topic>\nExample: ${prefix}story a boy who found a magic phone`)
        await react('📖')
        try {
            const res = await kgetAI(`Write a short creative story (3-5 sentences) about: ${text}. No filler intro, start immediately.`, 25000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('✅')
            return reply(`📖 *Story: ${text.slice(0,30)}*\n\n${result}`)
        } catch {
            await react('❌')
            return reply('❌ Story generation failed.')
        }
    }

    // ── Rap Bars ─────────────────────────────────────────────────────────────
    if (command === 'rap') {
        if (!text) return reply(`❌ Usage: ${prefix}rap <topic>\nExample: ${prefix}rap bots vs humans`)
        await react('🎤')
        try {
            const res = await kgetAI(`Write 4 lines of rap about: ${text}. Make it rhyme and flow. No intro text.`, 20000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('🎤')
            return reply(`🎤 *Rap: ${text.slice(0,30)}*\n\n_${result}_`)
        } catch {
            return reply('❌ Rap generation failed.')
        }
    }

    // ── Riddle ───────────────────────────────────────────────────────────────
    if (command === 'riddle') {
        await react('🧩')
        try {
            const res = await kgetAI('Give me one clever riddle. Format exactly as: Riddle: [riddle here]\nAnswer: [answer here]', 15000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('🧩')
            return reply(`🧩 *RIDDLE*\n\n${result}`)
        } catch {
            return reply('❌ No riddle available.')
        }
    }

    // ── Recipe ───────────────────────────────────────────────────────────────
    if (command === 'recipe') {
        if (!text) return reply(`❌ Usage: ${prefix}recipe <dish>\nExample: ${prefix}recipe chicken stew`)
        await react('🍳')
        try {
            const res = await kgetAI(`Give a short recipe for ${text}. List ingredients then numbered steps. Be brief.`, 25000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('✅')
            return reply(`🍳 *Recipe: ${text}*\n\n${result}`)
        } catch {
            return reply('❌ Recipe not found.')
        }
    }

    // ── Motivate ─────────────────────────────────────────────────────────────
    if (command === 'motivate' || command === 'inspire') {
        await react('💪')
        const name = text || 'you'
        try {
            const res = await kgetAI(`Give one powerful motivational message addressed to ${name}. Personal and uplifting. Short paragraph.`, 15000)
            const result = res.data?.result
            if (!result) throw new Error('no result')
            await react('💪')
            return reply(`💪 *For ${name}:*\n\n_${result}_`)
        } catch {
            return reply('❌ Could not generate motivation.')
        }
    }
}

handle.command = [
    'shorten', 'tinyurl', 'short',
    'fancy', 'fancystyles', 'textstyles',
    'tr', 'trans', 'translate',
    'wacheck', 'onwa', 'checkwa',
    'wapfp', 'waprofile', 'profilepic',
    'walink', 'wame',
    'ascii',
    'iplookup', 'ip',
    'jsencrypt', 'encrypt',
    'search', 'websearch', 'google',
    'imgsearch', 'searchimage',
    'ytsearch', 'yts',
    'lyrics',
    'movie', 'film',
    'bible', 'verse',
    'soundcloud', 'sc',
    'ttsearch', 'tiktoksearch',
    'apk', 'appsearch',
    'wagroups', 'groupsearch',
    'dream', 'dreamanalyze',
    'codegen', 'gencode',
    'ghfollowers', 'githubuser',
    'imagine', 'aiimage', 'gen',
    'roast', 'story', 'generate', 'rap', 'riddle',
    'recipe', 'motivate', 'inspire'
]
handle.tags = ['tools']

module.exports = handle
