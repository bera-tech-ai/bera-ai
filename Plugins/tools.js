const axios = require('axios')

const BASE = 'https://apiskeith.top'

const handle = async (m, { conn, text, reply, prefix, command, sender, chat, args }) => {
    const react = (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {})

    // ── ASCII Art ────────────────────────────────────────────────────────────
    if (command === 'ascii') {
        if (!text) return reply(`❌ Usage: ${prefix}ascii <text>\nExample: ${prefix}ascii BERA`)
        await react('⏳')
        try {
            const res = await axios.get(`${BASE}/tools/ascii`, { params: { text }, timeout: 15000 })
            const data = res.data
            if (!data?.result && !data?.ascii) return reply('❌ Could not generate ASCII art. Try shorter text.')
            const art = data?.result || data?.ascii || ''
            await react('✅')
            return reply(`\`\`\`\n${art}\n\`\`\``)
        } catch {
            await react('❌')
            return reply('❌ ASCII art failed. Try again.')
        }
    }

    // ── URL Shortener ────────────────────────────────────────────────────────
    if (command === 'shorten' || command === 'short' || command === 'tinyurl') {
        if (!text) return reply(`❌ Usage: ${prefix}shorten <url>\nExample: ${prefix}shorten https://example.com`)
        const url = text.trim()
        if (!url.startsWith('http')) return reply('❌ Please provide a valid URL starting with http/https')
        await react('⏳')
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php`, {
                params: { url },
                timeout: 10000
            })
            const short = res.data?.trim()
            if (!short || !short.startsWith('http')) throw new Error('Bad response')
            await react('✅')
            return reply(
                `╭══〘 *🔗 URL SHORTENED* 〙═⊷\n` +
                `┃❍ Original: ${url.slice(0, 60)}...\n` +
                `┃❍ Short: *${short}*\n` +
                `╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply('❌ URL shortening failed. Try again.')
        }
    }

    // ── Fancy Text ───────────────────────────────────────────────────────────
    if (command === 'fancy') {
        if (!text) return reply(`❌ Usage: ${prefix}fancy <text>\nExample: ${prefix}fancy Bera AI`)
        await react('⏳')
        const styles = [
            // Unicode fancy text styles
            { name: 'Bold', fn: s => s.replace(/[A-Za-z]/g, c => String.fromCodePoint(c.charCodeAt(0) + (c >= 'a' ? 0x1D41A - 97 : 0x1D400 - 65))) },
            { name: 'Italic', fn: s => s.replace(/[A-Za-z]/g, c => String.fromCodePoint(c.charCodeAt(0) + (c >= 'a' ? 0x1D44E - 97 : 0x1D434 - 65))) },
            { name: 'Script', fn: s => s.replace(/[A-Za-z]/g, c => String.fromCodePoint(c.charCodeAt(0) + (c >= 'a' ? 0x1D4B6 - 97 : 0x1D49C - 65))) },
            { name: 'Double Struck', fn: s => s.replace(/[A-Za-z]/g, c => String.fromCodePoint(c.charCodeAt(0) + (c >= 'a' ? 0x1D552 - 97 : 0x1D538 - 65))) },
            { name: 'Monospace', fn: s => s.replace(/[A-Za-z0-9]/g, c => String.fromCodePoint(c.charCodeAt(0) + (c >= 'a' ? 0x1D670 - 97 : c >= 'A' ? 0x1D670 - 65 + 26 : 0x1D7F6 - 48))) },
        ]
        const chosen = styles[Math.floor(Math.random() * styles.length)]
        try {
            const fancy = chosen.fn(text)
            await react('✅')
            return reply(`╭══〘 *✨ FANCY TEXT* 〙═⊷\n┃❍ Style: *${chosen.name}*\n┃\n┃ ${fancy}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ Could not generate fancy text.')
        }
    }

    // ── Fancy Text Styles (show all) ─────────────────────────────────────────
    if (command === 'fancystyles' || command === 'textstyles') {
        if (!text) return reply(`❌ Usage: ${prefix}fancystyles <text>\nExample: ${prefix}fancystyles Hello`)
        await react('⏳')
        const map = (s, base_a, base_A) => s.replace(/[A-Za-z]/g, c => {
            const cp = c >= 'a' ? base_a + c.charCodeAt(0) - 97 : base_A + c.charCodeAt(0) - 65
            try { return String.fromCodePoint(cp) } catch { return c }
        })
        const styles = [
            ['Bold Serif',    map(text, 0x1D41A, 0x1D400)],
            ['Italic Serif',  map(text, 0x1D44E, 0x1D434)],
            ['Bold Italic',   map(text, 0x1D482, 0x1D468)],
            ['Script',        map(text, 0x1D4B6, 0x1D49C)],
            ['Fraktur',       map(text, 0x1D51E, 0x1D504)],
            ['Double Struck', map(text, 0x1D552, 0x1D538)],
            ['Sans',          map(text, 0x1D5BA, 0x1D5A0)],
            ['Sans Bold',     map(text, 0x1D5EE, 0x1D5D4)],
            ['Monospace',     map(text, 0x1D670, 0x1D656)],
            ['Circled',       text.split('').map(c => { const n = c.charCodeAt(0); if(n>=65&&n<=90) return String.fromCodePoint(0x24B6+n-65); if(n>=97&&n<=122) return String.fromCodePoint(0x24D0+n-97); return c; }).join('')],
        ]
        const lines = styles.map(([name, val]) => `┃❍ *${name}:* ${val}`).join('\n')
        await react('✅')
        return reply(`╭══〘 *✨ FANCY STYLES: ${text}* 〙═⊷\n${lines}\n╰══════════════════⊷`)
    }

    // ── WhatsApp Number Check ────────────────────────────────────────────────
    if (command === 'wacheck' || command === 'onwa' || command === 'checkwa') {
        if (!text) return reply(`❌ Usage: ${prefix}wacheck <number>\nExample: ${prefix}wacheck 254712345678`)
        const num = text.replace(/[^0-9]/g, '')
        if (num.length < 7) return reply('❌ Invalid number')
        await react('⏳')
        try {
            const [result] = await conn.onWhatsApp(num + '@s.whatsapp.net').catch(() => [])
            const exists = result?.exists ?? false
            await react(exists ? '✅' : '❌')
            return reply(
                `╭══〘 *📱 WA CHECK* 〙═⊷\n` +
                `┃❍ Number: +${num}\n` +
                `┃❍ WhatsApp: *${exists ? '✅ Active' : '❌ Not found'}*\n` +
                `╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply('❌ Check failed. Try again.')
        }
    }

    // ── Web Search (enhanced) ────────────────────────────────────────────────
    if (command === 'search' || command === 'websearch' || command === 'google') {
        if (!text) return reply(`❌ Usage: ${prefix}search <query>\nExample: ${prefix}search latest news Kenya`)
        await react('🔍')
        try {
            const res = await axios.get(`${BASE}/search/brave`, {
                params: { q: text },
                timeout: 20000
            })
            const data = res.data
            if (!data?.status) return reply(`❌ No results for: *${text}*`)
            const result = data?.result
            if (typeof result === 'string') {
                await react('✅')
                return reply(`🔍 *${text}*\n\n${result}`)
            }
            // Structured results
            const meta = result?.metadata
            const hits = result?.results?.slice(0, 4) || []
            if (!hits.length) return reply(`❌ No results for: *${text}*`)
            const lines = hits.map((r, i) =>
                `┃❍ *${i+1}. ${r.title || 'No title'}*\n┃   ${(r.description || r.snippet || '').slice(0, 100)}...\n┃   _${r.url || ''}_`
            ).join('\n┃\n')
            await react('✅')
            return reply(
                `╭══〘 *🔍 SEARCH: ${text.slice(0,30)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`
            )
        } catch {
            await react('❌')
            return reply(`❌ Search failed. Try again.`)
        }
    }

    // ── GitHub Followers ─────────────────────────────────────────────────────
    if (command === 'ghfollowers' || command === 'githubfollowers') {
        if (!text) return reply(`❌ Usage: ${prefix}ghfollowers <username>\nExample: ${prefix}ghfollowers octocat`)
        await react('⏳')
        try {
            const res = await axios.get(`https://api.github.com/users/${text.trim()}`, {
                headers: { 'User-Agent': 'BeraBot/2.0' },
                timeout: 10000
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
        const IMAGE_ENDPOINTS = [
            { base: BASE, path: '/ai/flux' },
            { base: BASE, path: '/ai/sdxl' },
            { base: BASE, path: '/ai/prodia' },
        ]
        for (const ep of IMAGE_ENDPOINTS) {
            try {
                const res = await axios.get(`${ep.base}${ep.path}`, {
                    params: { prompt: text, q: text },
                    timeout: 45000
                })
                const json = res.data
                if (json?.status === false) continue
                const urlVal = json?.result?.url || json?.result?.image || json?.result || json?.url || json?.image || json?.data
                const url = typeof urlVal === 'string' && urlVal.startsWith('http') ? urlVal : null
                if (url) {
                    await conn.sendMessage(chat, { image: { url }, caption: `🎨 *${text.slice(0, 80)}*` }, { quoted: m })
                    await react('✅')
                    return
                }
            } catch { continue }
        }
        // Fallback to pollinations image
        try {
            const encoded = encodeURIComponent(text)
            const url = `https://image.pollinations.ai/prompt/${encoded}`
            await conn.sendMessage(chat, { image: { url }, caption: `🎨 *${text.slice(0, 80)}*` }, { quoted: m })
            await react('✅')
        } catch {
            await react('❌')
            return reply('❌ Image generation failed. Try again.')
        }
    }

    // ── Translate (using Pollinations AI) ────────────────────────────────────
    if (command === 'tr' || command === 'trans') {
        if (!text) return reply(`❌ Usage: ${prefix}tr <language> <text>\nExample: ${prefix}tr french Hello how are you`)
        const [lang, ...rest] = args
        const msg = rest.join(' ')
        if (!msg) return reply(`❌ Usage: ${prefix}tr <language> <text>`)
        await react('⏳')
        try {
            const prompt = encodeURIComponent(`Translate to ${lang}: "${msg}". Reply with ONLY the translation.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 20000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('✅')
            return reply(`🌐 *Translated to ${lang}:*\n\n${result}`)
        } catch {
            await react('❌')
            return reply('❌ Translation failed. Try again.')
        }
    }

    // ── YouTube Search ───────────────────────────────────────────────────────
    if (command === 'ytsearch' || command === 'yts') {
        if (!text) return reply(`❌ Usage: ${prefix}yts <query>\nExample: ${prefix}yts Afrobeats 2025`)
        await react('🔍')
        try {
            const res = await axios.get(`${BASE}/search/yts`, {
                params: { query: text, q: text },
                timeout: 15000
            })
            const data = res.data
            const results = data?.result || data?.results || data?.data || []
            if (!Array.isArray(results) || !results.length) return reply(`❌ No results for: *${text}*`)
            const lines = results.slice(0, 5).map((r, i) =>
                `┃❍ *${i+1}.* ${r.title || r.name || 'Unknown'}\n┃   ⏱️ ${r.duration || 'N/A'} | 👁️ ${r.views || 'N/A'}\n┃   🔗 ${r.url || r.link || ''}`
            ).join('\n┃\n')
            await react('✅')
            return reply(`╭══〘 *🎵 YT: ${text.slice(0,25)}* 〙═⊷\n┃\n${lines}\n╰══════════════════⊷`)
        } catch {
            await react('❌')
            return reply('❌ YouTube search failed. Try again.')
        }
    }

    // ── Random Joke (enhanced) ───────────────────────────────────────────────
    if (command === 'roast') {
        if (!text) return reply(`❌ Usage: ${prefix}roast <name>\nExample: ${prefix}roast John`)
        await react('🔥')
        try {
            const prompt = encodeURIComponent(`Give a short funny roast for someone named ${text}. Be creative and funny, not mean. One sentence only.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 15000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('😂')
            return reply(`🔥 *Roasting ${text}:*\n\n_${result}_`)
        } catch {
            return reply('❌ Roast failed. The roast master is sleeping.')
        }
    }

    // ── AI Story Generator ───────────────────────────────────────────────────
    if (command === 'story' || command === 'generate') {
        if (!text) return reply(`❌ Usage: ${prefix}story <topic>\nExample: ${prefix}story a boy who found a magic phone`)
        await react('📖')
        try {
            const prompt = encodeURIComponent(`Write a very short and creative story (3-5 sentences) about: ${text}. Make it engaging.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 25000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('✅')
            return reply(`📖 *Story: ${text.slice(0,30)}*\n\n${result}`)
        } catch {
            await react('❌')
            return reply('❌ Story generation failed. Try again.')
        }
    }

    // ── Rap Battle ───────────────────────────────────────────────────────────
    if (command === 'rap') {
        if (!text) return reply(`❌ Usage: ${prefix}rap <topic>\nExample: ${prefix}rap bots vs humans`)
        await react('🎤')
        try {
            const prompt = encodeURIComponent(`Write 4 lines of rap about: ${text}. Make it rhyme and flow.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 20000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
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
            const prompt = encodeURIComponent('Give me one clever riddle. Format: "Riddle: [riddle]\nAnswer: [answer]"')
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 15000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('🧩')
            return reply(`🧩 *RIDDLE*\n\n${result}`)
        } catch {
            return reply('❌ No riddle available.')
        }
    }

    // ── Recipe Generator ─────────────────────────────────────────────────────
    if (command === 'recipe') {
        if (!text) return reply(`❌ Usage: ${prefix}recipe <dish>\nExample: ${prefix}recipe chicken stew`)
        await react('🍳')
        try {
            const prompt = encodeURIComponent(`Give a short recipe for ${text}. Format: Ingredients (as bullet list) then Steps (numbered). Keep it brief.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 25000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('✅')
            return reply(`🍳 *Recipe: ${text}*\n\n${result}`)
        } catch {
            return reply('❌ Recipe not found.')
        }
    }

    // ── Motivation Quote Generator ────────────────────────────────────────────
    if (command === 'motivate' || command === 'inspire') {
        await react('💪')
        const name = text || 'you'
        try {
            const prompt = encodeURIComponent(`Give one powerful motivational message addressed to ${name}. Make it personal and uplifting. One short paragraph.`)
            const res = await axios.get(`https://text.pollinations.ai/${prompt}`, { timeout: 15000 })
            const result = typeof res.data === 'string' ? res.data.trim() : null
            if (!result) throw new Error('no response')
            await react('💪')
            return reply(`💪 *For ${name}:*\n\n_${result}_`)
        } catch {
            return reply('❌ Could not generate motivation.')
        }
    }
}

handle.command = [
    'ascii',
    'shorten', 'short', 'tinyurl',
    'fancy', 'fancystyles', 'textstyles',
    'wacheck', 'onwa', 'checkwa',
    'search', 'websearch', 'google',
    'ghfollowers', 'githubfollowers',
    'imagine', 'aiimage', 'gen',
    'tr', 'trans',
    'ytsearch', 'yts',
    'roast', 'story', 'generate', 'rap', 'riddle',
    'recipe', 'motivate', 'inspire'
]
handle.tags = ['tools']

module.exports = handle
