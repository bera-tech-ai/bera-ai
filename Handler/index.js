const config = require('../Config')
const { isAuthorized } = require('../Auth')
const { getUser } = require('../Database')
const fs = require('fs')
const path = require('path')

const commandFiles = ['general', 'bera', 'group', 'admin', 'media', 'pterodactyl']
const handlers = commandFiles.map(f => require(`../Commands/${f}`))

const loadPlugins = () => {
    const pluginDir = path.resolve('./Plugins')
    if (!fs.existsSync(pluginDir)) return
    const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js') && f !== 'example.js')
    for (const file of files) {
        try {
            const plugin = require(path.join(pluginDir, file))
            if (plugin && typeof plugin === 'function') {
                handlers.push(plugin)
                console.log(`[PLUGIN] Loaded: ${file}`)
            }
        } catch (e) {
            console.error(`[PLUGIN] Failed to load ${file}: ${e.message}`)
        }
    }
}
loadPlugins()

const buildCommandMap = () => {
    const map = new Map()
    for (const handler of handlers) {
        const cmds = Array.isArray(handler.command) ? handler.command : [handler.command].filter(Boolean)
        for (const cmd of cmds) {
            map.set(cmd.toLowerCase(), handler)
        }
    }
    return map
}

let commandMap = buildCommandMap()

const getPrefix = () => {
    try {
        const saved = global.db?.data?.settings?.prefix
        if (saved !== undefined && saved !== null && saved !== '') return saved
    } catch {}
    return config.prefix
}

const smsg = (conn, m) => {
    if (!m) return m
    const M = m.message
    if (!M) return m

    m.mtype = Object.keys(M).find(k => k !== 'messageContextInfo') || ''
    m.msg = M[m.mtype] || {}

    m.text = m.msg?.text || m.msg?.caption || m.msg?.conversation ||
        (m.mtype === 'conversation' ? M.conversation : '') || ''
    m.mimetype = m.msg?.mimetype || ''
    m.body = m.text

    if (m.msg?.contextInfo?.quotedMessage) {
        const q = m.msg.contextInfo.quotedMessage
        const qtype = Object.keys(q).find(k => k !== 'messageContextInfo') || ''
        const qSender = m.msg.contextInfo.participant || m.msg.contextInfo.remoteJid || m.key?.remoteJid || ''
        m.quoted = {
            id: m.msg.contextInfo.stanzaId,
            sender: qSender,
            text: q[qtype]?.text || q[qtype]?.caption || (qtype === 'conversation' ? q.conversation : '') || '',
            body: q[qtype]?.text || q[qtype]?.caption || (qtype === 'conversation' ? q.conversation : '') || '',
            mimetype: q[qtype]?.mimetype || '',
            mtype: qtype,
            message: q,
            key: {
                remoteJid: m.key?.remoteJid || '',
                id: m.msg.contextInfo.stanzaId || '',
                participant: qSender,
                fromMe: false
            }
        }
    } else {
        m.quoted = null
    }

    m.sender = m.key?.fromMe
        ? (conn.user?.id || '').replace(/:[0-9]+@/, '@')
        : (m.key?.participant || m.key?.remoteJid || '')

    m.chat = m.key?.remoteJid || ''
    m.fromMe = m.key?.fromMe || false
    m.isGroup = m.chat?.endsWith('@g.us') || false
    m.pushName = m.pushName || ''

    return m
}

const checkLimit = (user, isOwner) => {
    return { ok: true }
}

const checkAutoReply = async (conn, m, text) => {
    const autoReplies = global.db?.data?.settings?.autoReplies || {}
    const lower = text.toLowerCase()
    for (const [keyword, response] of Object.entries(autoReplies)) {
        if (lower.includes(keyword.toLowerCase())) {
            await conn.sendMessage(m.chat, { text: response }, { quoted: m })
            return true
        }
    }
    return false
}

// ── Anti-spam tracker (in-memory) ─────────────────────────────────────────
const spamTracker = new Map()
const spamWarned  = new Set()

const checkAntiSpam = async (conn, m, isOwner) => {
    if (!m.isGroup || isOwner || m.fromMe) return false
    const antispamOn = global.db?.data?.settings?.[`antispam_${m.chat}`]
    if (!antispamOn) return false

    const key = `${m.chat}:${m.sender}`
    const now = Date.now()
    const WINDOW = 5000
    const MAX    = 5

    const timestamps = (spamTracker.get(key) || []).filter(t => now - t < WINDOW)
    timestamps.push(now)
    spamTracker.set(key, timestamps)

    if (timestamps.length >= MAX) {
        const num = m.sender.split('@')[0]
        if (spamWarned.has(key)) {
            spamWarned.delete(key)
            spamTracker.delete(key)
            try {
                await conn.sendMessage(m.chat, {
                    text: `🚫 @${num} has been removed for spamming.`,
                    mentions: [m.sender]
                })
                await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            } catch {}
            return true
        } else {
            spamWarned.add(key)
            setTimeout(() => spamWarned.delete(key), 30000)
            try {
                await conn.sendMessage(m.chat, {
                    text: `⚠️ @${num} — *Slow down!* You're sending messages too fast.\nNext offence: auto-kick.`,
                    mentions: [m.sender]
                })
            } catch {}
        }
    }
    return false
}

// ── In-memory message cache for reaction triggers ─────────────────────────
const msgCache = new Map()
const CACHE_SIZE = 200

const cacheMessage = (m) => {
    if (!m?.key?.id) return
    msgCache.set(m.key.id, {
        text: m.text || '',
        sender: m.sender,
        chat: m.chat,
        hasImage: /image/.test(m.mimetype || ''),
        mimetype: m.mimetype || '',
        msg: m.msg,
        key: m.key,
        message: m.message
    })
    if (msgCache.size > CACHE_SIZE) {
        const oldest = msgCache.keys().next().value
        msgCache.delete(oldest)
    }
}

const handleReaction = async (conn, reactionMsg) => {
    try {
        const rx = reactionMsg?.message?.reactionMessage
        if (!rx?.text) return

        const emoji    = rx.text
        const origId   = rx.key?.id
        const sender   = reactionMsg.key?.participant || reactionMsg.key?.remoteJid || ''
        const chat     = reactionMsg.key?.remoteJid || ''
        if (!origId || !sender || !chat) return

        const orig = msgCache.get(origId)
        if (!orig) return

        const { webSearch }              = require('../Library/actions/search')
        const { translate }              = require('../Library/actions/translate')
        const { generateImage }          = require('../Library/actions/imagegen')
        const { searchAndDownload }      = require('../Library/actions/music')
        const { analyzeImageFromBuffer } = require('../Library/actions/vision')

        const react = (e) => conn.sendMessage(chat, { react: { text: e, key: reactionMsg.key } }).catch(() => {})

        if (emoji === '🌐' && orig.text) {
            await react('⏳')
            const res = await translate(orig.text, 'English')
            if (res.success) {
                await conn.sendMessage(chat, { text: `🌐 *Translated:*\n\n${res.result}` }, { quoted: reactionMsg })
                await react('✅')
            } else await react('❌')

        } else if (emoji === '🎵' && orig.text) {
            await react('⏳')
            const res = await searchAndDownload(orig.text.slice(0, 100))
            if (res.success && res.audioUrl) {
                await conn.sendMessage(chat, {
                    audio: { url: res.audioUrl },
                    mimetype: 'audio/mp4',
                    ptt: false,
                    fileName: `${res.title || 'audio'}.mp3`
                }, { quoted: reactionMsg })
                await react('✅')
            } else await react('❌')

        } else if (emoji === '🎨' && orig.text) {
            await react('⏳')
            const res = await generateImage(orig.text.slice(0, 300))
            if (res.success) {
                const caption = `🎨 *${orig.text.slice(0, 80)}*`
                if (res.buffer) await conn.sendMessage(chat, { image: res.buffer, caption }, { quoted: reactionMsg })
                else if (res.url) await conn.sendMessage(chat, { image: { url: res.url }, caption }, { quoted: reactionMsg })
                await react('✅')
            } else await react('❌')

        } else if (emoji === '👁️' || emoji === '🔍') {
            if (orig.hasImage) {
                await react('⏳')
                try {
                    const buf = await conn.downloadMediaMessage({ key: orig.key, message: orig.message })
                    const res = await analyzeImageFromBuffer(buf, 'Describe and analyse this image in detail.')
                    if (res.success) {
                        await conn.sendMessage(chat, { text: `👁️ *Image Analysis:*\n\n${res.result}` }, { quoted: reactionMsg })
                        await react('✅')
                    } else await react('❌')
                } catch { await react('❌') }
            } else if (orig.text && emoji === '🔍') {
                await react('⏳')
                const res = await webSearch(orig.text.slice(0, 200))
                if (res.success) {
                    await conn.sendMessage(chat, { text: `🔍 *${orig.text.slice(0, 60)}*\n\n${res.result}` }, { quoted: reactionMsg })
                    await react('✅')
                } else await react('❌')
            }
        }
    } catch (e) {
        console.error('[REACTION]', e.message)
    }
}

const checkAntiLink = async (conn, m, text, isOwner) => {
    if (!m.isGroup) return false
    const hasLink = /chat\.whatsapp\.com\//i.test(text)
    if (!hasLink) return false
    const antilinkOn = global.db?.data?.settings?.[`antilink_${m.chat}`]
    if (!antilinkOn) return false
    if (isOwner) return false
    try {
        await conn.sendMessage(m.chat, { delete: m.key })
        await conn.sendMessage(m.chat, {
            text: `⚠️ @${m.sender.split('@')[0]} — Group links are not allowed here.`,
            mentions: [m.sender]
        })
    } catch {}
    return true
}

const handleGroupEvents = async (conn, event) => {
    try {
        const updates = event['group-participants.update']
        if (!updates) return
        for (const update of updates) {
            const { id: chat, participants, action } = update
            if (action !== 'add') continue
            const welcomeOn = global.db?.data?.settings?.[`welcome_${chat}`]
            if (!welcomeOn) continue
            for (const jid of participants) {
                const name = jid.split('@')[0]
                try {
                    const meta = await conn.groupMetadata(chat)
                    const customMsg = global.db?.data?.settings?.[`welcomemsg_${chat}`]
                    const msg = customMsg
                        ? customMsg.replace('{name}', `@${name}`).replace('{group}', meta.subject)
                        : `👋 Welcome @${name} to *${meta.subject}*!\n\nWe're glad to have you here. Feel free to introduce yourself!`
                    await conn.sendMessage(chat, { text: msg, mentions: [jid] })
                } catch {}
            }
        }
    } catch {}
}

// ── DB write debounce — batch writes instead of writing on every command ───
let dbWriteTimer = null
const debouncedDbWrite = () => {
    if (dbWriteTimer) clearTimeout(dbWriteTimer)
    dbWriteTimer = setTimeout(async () => {
        try { await global.db.write() } catch {}
    }, 2000)
}

const handleMessage = async (conn, rawMsg) => {
    try {
        const m = smsg(conn, rawMsg)
        if (!m || !m.message) return

        // Handle reaction messages separately
        if (m.mtype === 'reactionMessage') {
            handleReaction(conn, rawMsg).catch(() => {})
            return
        }

        const prefix = getPrefix()
        const noPrefix = global.db?.data?.settings?.noPrefix || false
        const rawText = m.text?.trim() || ''

        // fromMe guard
        if (m.fromMe) {
            const firstWord = rawText.split(/\s+/)[0].toLowerCase()
            const noPrefixHit = noPrefix && commandMap.has(firstWord)
            if (!rawText.startsWith(prefix) && !noPrefixHit) return
        }

        if (!m.text?.trim() && !m.mimetype) return

        // Cache for reaction triggers
        cacheMessage(m)

        const sender = m.sender
        const chat = m.chat

        const { authorized, isOwner } = isAuthorized(sender)

        const existingUser = global.db?.data?.users?.[sender]
        if (existingUser?.banned) return

        const text = m.text?.trim() || ''

        // Command detection
        let isCmd, command, args, body
        if (text.startsWith(prefix) && prefix !== '') {
            isCmd = true
            command = text.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase()
            body    = text.slice(prefix.length + command.length).trim()
            args    = body.split(/\s+/).filter(Boolean)
        } else if (noPrefix && text) {
            const firstWord = text.split(/\s+/)[0].toLowerCase()
            if (commandMap.has(firstWord)) {
                isCmd   = true
                command = firstWord
                body    = text.slice(firstWord.length).trim()
                args    = body.split(/\s+/).filter(Boolean)
            } else {
                isCmd = false; command = ''; args = []; body = ''
            }
        } else {
            isCmd = false; command = ''; args = []; body = ''
        }

        // ── NON-COMMAND: only do lightweight group checks, then exit ──────
        if (!isCmd) {
            // Anti-spam only for group messages
            if (m.isGroup) {
                const spammed = await checkAntiSpam(conn, m, isOwner)
                if (spammed) return
                await checkAntiLink(conn, m, text, isOwner)
            }
            // Auto-reply (DM and group)
            // Auto-reply (DM and group)
            await checkAutoReply(conn, m, text)


            // ── GitHub Download — natural language + bare URL ─────────────────
            // Fires when message contains a github.com link + download intent
            const ghUrlMatch = text && text.match(/https?:\/\/github\.com\/[\w.\-]+\/[\w.\-]+(?:\/[^\s]*)*/i)
            const ghDownloadIntent = text && /\b(download|get|send|fetch|grab|zip|clone|dl)\b/i.test(text)
            if (ghUrlMatch && (ghDownloadIntent || /github\.com\/[\w.\-]+\/[\w.\-]+\/blob\//.test(text))) {
                const ghUrl = ghUrlMatch[0]
                const isFile = ghUrl.includes('/blob/')
                try {
                    await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } })
                    const makeReq = (urlStr) => new Promise((resolve, reject) => {
                        const u = new URL(urlStr)
                        const req = require('https').request({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Bera-AI' } }, res => {
                            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) return resolve(makeReq(res.headers.location))
                            if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode))
                            const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks)))
                        })
                        req.on('error', reject); req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')) }); req.end()
                    })
                    let buf, fileName, mimetype, caption
                    if (isFile) {
                        const rawUrl = ghUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
                        fileName = rawUrl.split('/').pop()
                        buf = await makeReq(rawUrl)
                        mimetype = 'application/octet-stream'
                        caption = '📄 *' + fileName + '*\n🔗 ' + ghUrl
                    } else {
                        const parts = ghUrl.replace('https://github.com/', '').split('/')
                        const owner = parts[0]; const repo = (parts[1] || '').replace('.git', '')
                        if (!owner || !repo) throw new Error('Invalid repo URL')
                        const branch = parts[3] || 'main'
                        const zipUrl = 'https://github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip'
                        fileName = repo + '.zip'; mimetype = 'application/zip'
                        buf = await makeReq(zipUrl)
                        caption = '📦 *' + owner + '/' + repo + '* (' + branch + ')\n📏 ' + (buf.length / 1024).toFixed(1) + ' KB\n🔗 ' + ghUrl
                    }
                    await conn.sendMessage(chat, { react: { text: '✅', key: m.key } })
                    await conn.sendMessage(chat, { document: buf, fileName, mimetype, caption }, { quoted: m })
                } catch (e) {
                    await conn.sendMessage(chat, { react: { text: '❌', key: m.key } })
                    await conn.sendMessage(chat, { text: '❌ Download failed: ' + e.message }, { quoted: m })
                }
                return
            }
            // ═══════════════════════════════════════════════════════════════
            // BERA AGENT — Full Intent Router (fires before ChatBera)
            // ═══════════════════════════════════════════════════════════════
            if (!m.fromMe && text) {
                const { detectIntent } = require('../Library/router')
                const intent = detectIntent(text)
                const agent  = require('../Library/actions/agent')
                const react  = (e) => conn.sendMessage(chat, { react: { text: e, key: m.key } }).catch(() => {})
                const reply  = (t) => conn.sendMessage(chat, { text: String(t) }, { quoted: m })
                const fmt    = (lines) => lines.split('\n').slice(0, 30).map(l => '┃ ' + l.slice(0, 90)).join('\n')


                // ─────────────────────────────────────────────────────────────────




                if (intent === 'bh_clone') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const words = text.split(/\s+/)
                    const skipWords = ['clone','redeploy','copy','duplicate','deploy','bot','server','for','as','named','called','to']
                    const nameCandidate = words.find(w => !skipWords.includes(w.toLowerCase()) && w.length > 2 && /^[a-zA-Z0-9-]+$/.test(w))
                    const phoneMatch = text.match(/(\d{6,15})/)
                    const newNameMatch = text.match(/(?:as|to)\s+([\w-]+)/i)
                    if (!nameCandidate) { await reply('Usage: deploy bot atassa  or  clone server atassa for 254712345678'); return }
                    await react('🔄'); await reply('Cloning server "' + nameCandidate + '"...')
                    const r = await bh.cloneServer(nameCandidate, phoneMatch ? phoneMatch[1] : null, newNameMatch ? newNameMatch[1] : null)
                    if (r.success) {
                        await react('✅')
                        await reply('SUCCESS\n' + r.message)
                        if (phoneMatch) {
                            await conn.sendMessage(phoneMatch[1] + '@s.whatsapp.net', { text: 'YOUR BOT IS READY!\n' + r.message + '\nPanel: ' + bh.PANEL }).catch(()=>{})
                        }
                    } else { await react('❌'); await reply('Clone failed: ' + r.error) }
                    return
                }

                if (intent === 'bh_files') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const onMatch  = text.match(/(?:on|from|in)\s+(?:server\s+)?([\w-]+)/i)
                    const fileMatch = text.match(/(?:read|cat|get)\s+([\w/.~-]+\.\w+)/i)
                    const dirMatch  = text.match(/(?:ls|list|dir)\s+([\w/.~-]+)/i)
                    if (!onMatch) { await reply('Usage: list files on server atassa  or  read session/creds.json on atassa'); return }
                    const srvName = onMatch[1]
                    await react('📁')
                    if (fileMatch) {
                        const r = await bh.readServerFile(srvName, fileMatch[1])
                        await reply(r.success ? r.content.slice(0,3000) : 'Error: ' + r.error)
                    } else {
                        const dir = dirMatch ? dirMatch[1] : '/'
                        const r   = await bh.listServerFiles(srvName, dir)
                        if (r.success) { await reply(r.files.map(f=>(f.isDir?'📁 ':'📄 ')+f.name+' ('+f.size+')').join('\n').slice(0,2000)) }
                        else { await reply('Error: ' + r.error) }
                    }
                    return
                }

                if (intent === 'bh_owner_list') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const pm = text.match(/(\d{6,15})/)
                    await react('📋')
                    const r = pm ? await bh.listOwnerServers(pm[1]) : await bh.listServers()
                    if (r.success) {
                        const srvs = r.servers || []
                        const rows = srvs.map(s => s.id + ' | ' + s.name + ' | ' + s.ram + 'MB').join('\n')
                        await reply('Servers (' + srvs.length + '):\n' + (rows || 'None found'))
                    } else { await reply('Error: ' + r.error) }
                    return
                }

                if (intent === 'bh_reinstall') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm = text.match(/(?:reinstall|clean install)\s+(?:server\s+)?([\w-]+)/i) || text.match(/server\s+([\w-]+)/i)
                    if (!nm) { await reply('Usage: reinstall server atassa'); return }
                    await react('🔧')
                    const r = await bh.reinstallServer(nm[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }

                if (intent === 'bh_suspend') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm = text.match(/(?:suspend|disable|freeze)\s+(?:server\s+)?([\w-]+)/i)
                    if (!nm) { await reply('Usage: suspend server atassa'); return }
                    await react('🚫')
                    const r = await bh.suspendServer(nm[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }

                if (intent === 'bh_unsuspend') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm = text.match(/(?:unsuspend|enable|restore)\s+(?:server\s+)?([\w-]+)/i)
                    if (!nm) { await reply('Usage: unsuspend server atassa'); return }
                    await react('✅')
                    const r = await bh.unsuspendServer(nm[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }

                if (intent === 'bh_upgrade') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm   = text.match(/(?:server|bot)\s+([\w-]+)/i)
                    const ram  = text.match(/(\d{3,5})\s*mb?\s*ram/i)
                    const cpu  = text.match(/(\d{1,4})\s*%?\s*cpu/i)
                    const disk = text.match(/(\d{3,6})\s*mb?\s*disk/i)
                    if (!nm) { await reply('Usage: upgrade server atassa 1024MB RAM 200% CPU'); return }
                    await react('⬆️')
                    const r = await bh.updateResources(nm[1], { ramMB: ram?parseInt(ram[1]):undefined, cpuPercent: cpu?parseInt(cpu[1]):undefined, diskMB: disk?parseInt(disk[1]):undefined })
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }

                if (intent === 'bh_console') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm = text.match(/(?:on|in)\s+(?:server\s+)?([\w-]+)/i)
                    const cm = text.match(/(?:run|send|command)\s+"([^"]+)"/i) || text.match(/(?:run|send|command)\s+([^\s].+)$/i)
                    if (!nm || !cm) { await reply('Usage: run command "npm restart" on server atassa'); return }
                    await react('💻')
                    const r = await bh.sendConsoleCommand(nm[1], cm[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }

                if (intent === 'bh_server_info') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bh = require('../Library/actions/berahost')
                    const nm = text.match(/(?:server|bot|info|details|config)\s+([\w-]+)/i)
                    if (!nm) { await reply('Usage: server info atassa'); return }
                    await react('ℹ️')
                    const r = await bh.getServerConfig(nm[1])
                    if (r.success) {
                        const envStr = Object.entries(r.environment||{}).slice(0,8).map(([k,v])=>k+'='+(v||'').toString().slice(0,30)).join('\n')
                        await reply(r.name + ' (ID '+r.id+')\nStatus: ' + r.status + '\nRAM: ' + r.limits?.memory + 'MB | CPU: ' + r.limits?.cpu + '% | Disk: ' + r.limits?.disk + 'MB\n\nENV:\n' + envStr)
                    } else { await reply('Error: ' + r.error) }
                    return
                }

                if (intent === 'bh_set_client_key') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const km = text.match(/ptlc_[\w]+/)
                    if (!km) { await reply('Usage: setbhclientkey ptlc_yourKey\n\nGet it from: https://lordeagle.tech/account/api'); return }
                    if (!global.db.data.settings) global.db.data.settings = {}
                    global.db.data.settings.bhClientKey = km[0]
                    await global.db.write()
                    await reply('BeraHost client key saved! File manager + console commands are now unlocked.')
                    return
                }
                if (intent === 'bh_deploy') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const botM = text.match(/\b(\d+)\b/)
                    const sessM = text.match(/([A-Za-z][A-Za-z0-9_~:;.]{8,})/)
                    if (!botM || !sessM) { await reply('Usage: deploy bot 1 Gifted~yourSession'); return }
                    await react('🚀'); await reply('Deploying bot ' + botM[1] + '...')
                    const dr = await bhr.deployBot(botM[1], sessM[1])
                    if (!dr.success) { await react('❌'); await reply('Deploy failed: ' + dr.error); return }
                    await reply('Deployment ' + dr.id + ' started — polling...')
                    const fin = await bhr.pollDeployment(dr.id)
                    const dep = fin.deployment || {}
                    await react(dep.status === 'running' ? '✅' : '⚠️')
                    await reply(bhr.fmtDeploy(dep))
                    return
                }
                if (intent === 'bh_list_deploys') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    await react('📋')
                    const r = await bhr.listDeployments()
                    if (!r.success) { await reply('Error: ' + r.error); return }
                    const rows = r.deployments.map((d,i) => (i+1) + '. ID ' + d.id + ' | ' + bhr.statusEmoji(d.status)).join('\n')
                    await reply('My Deployments:\n' + (rows || 'None'))
                    return
                }
                if (intent === 'bh_start_deploy') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const idM = text.match(/\b(\d+)\b/)
                    if (!idM) { await reply('Usage: start deployment 5'); return }
                    await react('▶️')
                    const r = await bhr.startDeployment(idM[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_stop_deploy') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const idM = text.match(/\b(\d+)\b/)
                    if (!idM) { await reply('Usage: stop deployment 5'); return }
                    await react('⏹️')
                    const r = await bhr.stopDeployment(idM[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_get_logs') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const idM = text.match(/\b(\d+)\b/)
                    if (!idM) { await reply('Usage: logs for deployment 5'); return }
                    await react('📄')
                    const r = await bhr.getDeploymentLogs(idM[1])
                    await reply(r.success ? (r.logs||'No logs yet').slice(-3000) : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_get_metrics') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const idM = text.match(/\b(\d+)\b/)
                    if (!idM) { await reply('Usage: metrics for deployment 5'); return }
                    await react('📊')
                    const r = await bhr.getDeploymentMetrics(idM[1])
                    await reply(r.success ? 'CPU: '+r.cpu+'\nRAM: '+r.ram+'\nUptime: '+r.uptime : 'Error: '+r.error)
                    return
                }
                if (intent === 'bh_del_deploy') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    const idM = text.match(/\b(\d+)\b/)
                    if (!idM) { await reply('Usage: delete deployment 5'); return }
                    await react('🗑️')
                    const r = await bhr.deleteDeployment(idM[1])
                    await reply(r.success ? r.output : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_coins') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    await react('🪙')
                    const r = await bhr.getCoins()
                    await reply(r.success ? '🪙 Balance: ' + r.balance + ' coins' : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_claim_coins') {
                    if (!isOwner) { await reply('Owner only.'); return }
                    const bhr = require('../Library/actions/berahost')
                    await react('🪙')
                    const r = await bhr.claimDailyCoins()
                    await reply(r.success ? '✅ ' + r.output : 'Error: ' + r.error)
                    return
                }
                if (intent === 'bh_plans') {
                    const bhr = require('../Library/actions/berahost')
                    await react('📦')
                    const r = await bhr.getPlans()
                    if (!r.success) { await reply('Error: ' + r.error); return }
                    const rows = r.plans.map(p => (p.id||'?') + '. ' + (p.label||p.name||'?') + ' — ' + (p.price||p.cost||'?')).join('\n')
                    await reply('BeraHost Plans:\n' + rows)
                    return
                }
                if (intent === 'bh_list_bots') {
                    const bhr = require('../Library/actions/berahost')
                    await react('🤖')
                    const r = await bhr.listBots()
                    if (!r.success) { await reply('Error: ' + r.error); return }
                    const rows = r.bots.map(b => b.id + '. ' + (b.name||'Bot '+b.id)).join('\n')
                    await reply('Available Bots:\n' + (rows || 'None listed'))
                    return
                }


                // ── NPM stats ───────────────────────────────────────────────
                if (intent === 'npm_stats') {
                    const pkgMatch =
                        text.match(/downloads?\s+(?:does\s+|for\s+)?([\w@][\w./\-@]+)/i) ||
                        text.match(/(?:npm|package)\s+([\w@][\w./\-@]+)/i) ||
                        text.match(/\b([\w-]+)\b\s+(?:npm|package)/i)
                    const pkg = pkgMatch ? pkgMatch[1] : null
                    if (pkg && pkg.length > 1) {
                        await react('📦')
                        const r = await agent.npmStats(pkg)
                        if (r.success) {
                            await reply(`╭══〘 *📦 NPM: ${r.pkg}* 〙═⊷\n┃ Version: *v${r.version}* | Author: ${r.author}\n┃\n┃ 📅 Weekly:  *${r.weekly}*\n┃ 📆 Monthly: *${r.monthly}*\n┃\n${r.description ? '┃ 📝 ' + r.description + '\n' : ''}┃ 🔗 npmjs.com/package/${r.pkg}\n╰══════════════════⊷`)
                        } else {
                            await reply(`❌ npm stats failed for *${pkg}*: ${r.error}`)
                        }
                        return
                    }
                }

                // ── Group member lookup ──────────────────────────────────────
                if (intent === 'group_lookup' && m.isGroup) {
                    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
                    const targetJid = mentioned[0]
                    if (targetJid) {
                        await react('🔍')
                        try {
                            const meta   = await conn.groupMetadata(chat)
                            const member = meta.participants.find(p => p.id === targetJid)
                            if (member) {
                                const phone = member.id.replace(/@.+/, '')
                                const role  = member.admin === 'superadmin' ? '👑 Super Admin' : member.admin === 'admin' ? '🛡️ Admin' : '👤 Member'
                                await reply(`╭══〘 *🔍 MEMBER INFO* 〙═⊷\n┃ Name: *${member.pushName || 'Unknown'}*\n┃ Phone: +${phone}\n┃ Role: ${role}\n┃ JID: ${member.id}\n┃ WhatsApp: wa.me/${phone}\n╰══════════════════⊷`)
                            } else {
                                await reply('❌ That user is not in this group.')
                            }
                        } catch (e) { await reply('❌ Could not fetch group info: ' + e.message) }
                        return
                    }
                }

                // ── Group analyzer ───────────────────────────────────────────
                if (intent === 'group_analyze' && m.isGroup) {
                    await react('📊')
                    const r = await agent.groupAnalyzer(conn, chat)
                    if (r.success) {
                        await reply(
                            `╭══〘 *📊 GROUP STATS* 〙═⊷\n` +
                            `┃ 📛 Name: *${r.name}*\n` +
                            `┃ 👥 Members: *${r.total}* (${r.admins} admins, ${r.members} members)\n` +
                            `┃ 📅 Created: ${r.created}\n` +
                            `┃\n` +
                            `┃ 🛡️ Admins: ${r.adminList.slice(0,5).join(', ')}\n` +
                            (r.description ? `┃ 📝 ${r.description.slice(0, 100)}\n` : '') +
                            `╰══════════════════⊷`
                        )
                    } else {
                        await reply('❌ ' + r.error)
                    }
                    return
                }

                // ── System info ──────────────────────────────────────────────
                if (intent === 'system_info') {
                    await react('🖥️')
                    const r = await agent.systemInfo()
                    if (r.success) {
                        await reply(
                            `╭══〘 *🖥️ SYSTEM STATUS* 〙═⊷\n` +
                            `┃ 🧠 RAM:      ${r.ram}\n` +
                            `┃ ⚡ CPU:      ${r.cpu}\n` +
                            `┃ 💾 Disk:     ${r.disk}\n` +
                            `┃ ⏱️ Uptime:   ${r.uptime}\n` +
                            `┃ 🔄 Processes: ${r.processes}\n` +
                            `╰══════════════════⊷`
                        )
                    } else { await reply('❌ ' + r.error) }
                    return
                }

                // ── Port check ───────────────────────────────────────────────
                if (intent === 'port_check') {
                    const portMatch = text.match(/\b(\d{2,5})\b/)
                    if (portMatch) {
                        await react('🔌')
                        const r = await agent.portCheck(portMatch[1])
                        await reply(
                            `╭══〘 *🔌 PORT ${r.port}* 〙═⊷\n` +
                            `┃ Status: ${r.open ? '🟢 *OPEN / LISTENING*' : '🔴 *CLOSED / NOT IN USE*'}\n` +
                            `┃\n${fmt(r.info)}\n` +
                            `╰══════════════════⊷`
                        )
                        return
                    }
                }

                // ── Docker management ────────────────────────────────────────
                if (intent === 'docker') {
                    const actionMatch = text.match(/\b(list|ls|logs?|start|stop|restart|remove|rm|stats?|images?|all)\b/i)
                    const nameMatch   = text.match(/\b(?:logs?|start|stop|restart|remove|rm)\s+([\w-]+)/i)
                    const action = actionMatch ? actionMatch[1].toLowerCase().replace('ls','list').replace(/^image.*/,'images').replace(/^stat.*/,'stats') : 'list'
                    const name = nameMatch ? nameMatch[1] : null
                    await react('🐳')
                    const r = await agent.dockerManage(action, name)
                    await reply(
                        `╭══〘 *🐳 DOCKER: ${action.toUpperCase()}* 〙═⊷\n` +
                        `${fmt(r.output || 'No output')}\n` +
                        `╰══════════════════⊷`
                    )
                    return
                }

                // ── Cron management ──────────────────────────────────────────
                if (intent === 'cron') {
                    const actionMatch = text.match(/\b(list|add|clear|remove|show)\b/i)
                    const action = actionMatch ? actionMatch[1].toLowerCase() : 'list'
                    await react('⏰')
                    if (action === 'list' || action === 'show') {
                        const r = await agent.cronManage('list')
                        await reply(`╭══〘 *⏰ CRON JOBS* 〙═⊷\n${fmt(r.output)}\n╰══════════════════⊷`)
                    } else if (action === 'clear') {
                        const r = await agent.cronManage('clear')
                        await reply('✅ All cron jobs cleared.')
                    } else {
                        await reply('❓ Cron usage:\n• *show cron jobs*\n• *clear cron jobs*\n• *add cron: 0 2 * * * /path/script.sh*')
                    }
                    return
                }

                // ── Process kill ─────────────────────────────────────────────
                if (intent === 'process_kill') {
                    const pidMatch  = text.match(/\b(\d+)\b/)
                    const nameMatch = text.match(/\bkill\b\s+([\w-]+)/i)
                    const target = pidMatch ? pidMatch[1] : (nameMatch ? nameMatch[1] : null)
                    if (!target) { await reply('❓ Usage: *kill process <name>* or *kill pid 1234*'); return }
                    await react('💀')
                    const r = await agent.processKill(target)
                    await reply(`${r.success ? '✅' : '❌'} Process ${target}: ${r.output}`)
                    return
                }

                // ── HTTP request ─────────────────────────────────────────────
                if (intent === 'http_request') {
                    const methodMatch = text.match(/\b(GET|POST|PUT|PATCH|DELETE|CURL)\b/i)
                    const urlMatch    = text.match(/https?:\/\/[^\s]+/)
                    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET'
                    const url    = urlMatch ? urlMatch[0] : null
                    if (!url) { await reply('❓ Usage: *GET https://api.example.com/data*'); return }
                    await react('🌐')
                    await reply(`⏳ ${method} ${url}...`)
                    const r = await agent.httpRequest(method, url)
                    await reply(
                        `╭══〘 *🌐 HTTP ${method}* 〙═⊷\n` +
                        `┃ URL: ${url.slice(0,60)}\n┃\n` +
                        `${fmt(r.output || 'no response')}\n` +
                        `╰══════════════════⊷`
                    )
                    return
                }

                // ── Code review ──────────────────────────────────────────────
                if (intent === 'code_review') {
                    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
                    const code   = quoted?.conversation || quoted?.extendedTextMessage?.text || text.replace(/^.{0,50}review/i,'').trim()
                    if (!code || code.length < 10) { await reply('❓ Quote the code you want reviewed or paste it after: *review this code: ...*'); return }
                    await react('🔍')
                    await reply('🔍 Reviewing code...')
                    const r = await agent.codeReview(code)
                    await reply(`╭══〘 *🔍 CODE REVIEW* 〙═⊷\n\n${r.success ? r.text : '❌ ' + r.error}\n╰══════════════════⊷`)
                    return
                }

                // ── Code explain ─────────────────────────────────────────────
                if (intent === 'code_explain') {
                    const fileMatch = text.match(/\b([\w/]+\.\w+)\b/)
                    const fileName  = fileMatch ? fileMatch[1] : ''
                    const quoted    = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
                    let code = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
                    if (!code && fileName) {
                        const { runShell } = agent
                        const r = await runShell(`cat ${fileName} 2>/dev/null | head -100`)
                        code = r.output
                    }
                    if (!code) { await reply('❓ Quote the code or mention a file name: *explain Library/router.js*'); return }
                    await react('📖')
                    await reply('📖 Analyzing code...')
                    const r = await agent.codeExplain(code, fileName)
                    await reply(`╭══〘 *📖 CODE EXPLANATION* 〙═⊷\n\n${r.success ? r.text : '❌ ' + r.error}\n╰══════════════════⊷`)
                    return
                }

                // ── Bug finder ───────────────────────────────────────────────
                if (intent === 'bug_finder') {
                    const fileMatch = text.match(/\b([\w/]+\.\w+)\b/)
                    const fileName  = fileMatch ? fileMatch[1] : ''
                    const quoted    = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
                    let code = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
                    if (!code && fileName) {
                        const r = await agent.runShell(`cat ${fileName} 2>/dev/null | head -150`)
                        code = r.output
                    }
                    if (!code) { await reply('❓ Quote the code or say the file: *find bugs in index.js*'); return }
                    await react('🐛')
                    await reply('🐛 Scanning for bugs...')
                    const r = await agent.bugFinder(code, fileName)
                    await reply(`╭══〘 *🐛 BUG REPORT* 〙═⊷\n\n${r.success ? r.text : '❌ ' + r.error}\n╰══════════════════⊷`)
                    return
                }

                // ── Git status ───────────────────────────────────────────────
                if (intent === 'git_status') {
                    const folderMatch = text.match(/\b(?:in|for|on)\s+([\w/.-]+)\b/)
                    const folder = folderMatch ? folderMatch[1] : '.'
                    await react('📁')
                    const r = await agent.gitStatus(folder)
                    await reply(`╭══〘 *📁 GIT STATUS* 〙═⊷\n${fmt(r.output)}\n╰══════════════════⊷`)
                    return
                }

                // ── PM2 list ─────────────────────────────────────────────────
                if (intent === 'pm2_list') {
                    await react('⚙️')
                    const r = await agent.pm2Manage('list', null)
                    await reply(`╭══〘 *⚙️ PM2 PROCESSES* 〙═⊷\n${fmt(r.output || 'No processes')}\n╰══════════════════⊷`)
                    return
                }

                // ── PM2 logs ─────────────────────────────────────────────────
                if (intent === 'pm2_logs') {
                    const nm = text.match(/\blogs?\b.{0,20}\bfor\b\s+([\w-]+)/i) || text.match(/\b([\w-]+)\b.{0,10}\blogs?\b/i)
                    const procName = nm ? nm[1] : null
                    await react('📋')
                    const r = await agent.pm2Manage('logs', procName)
                    const lines = (r.output || 'No logs').split('\n').slice(-25).join('\n')
                    await reply(`╭══〘 *📋 PM2 LOGS${procName ? ': ' + procName : ''}* 〙═⊷\n${fmt(lines)}\n╰══════════════════⊷`)
                    return
                }

                // ── PM2 manage ───────────────────────────────────────────────
                if (intent === 'pm2_manage') {
                    const act  = (text.match(/\b(stop|start|restart|reboot|kill|delete)\b/i)||[])[1]?.toLowerCase()
                    const name = (text.match(/\b(?:stop|start|restart|kill|delete)\s+([\w-]+)/i)||[])[1]
                    if (!name) { await reply('❓ Which process? e.g. *restart bera-ai*'); return }
                    await react('⚙️')
                    const r = await agent.pm2Manage(act === 'reboot' ? 'restart' : (act || 'restart'), name)
                    await reply(`${r.success ? '✅' : '❌'} PM2 *${act?.toUpperCase()}* → ${name}\n${r.output.slice(0,300)}`)
                    return
                }

                // ── Project creation ─────────────────────────────────────────
                if (intent === 'project_create') {
                    const nm    = (text.match(/\b(?:project|app|called|named?)\s+([\w-]+)/i) || text.match(/\bcreate\s+(?:a\s+)?(?:new\s+)?([\w-]+)\s+(?:project|app)/i) || [])[1] || 'myapp'
                    const port  = parseInt((text.match(/\bport\s+(\d{2,5})\b/i)||[])[1] || '3000')
                    const type  = ((text.match(/\b(express|react|vue|flask|fastapi|next|node)\b/i)||[])[1] || 'express').toLowerCase()
                    await react('🏗️')
                    await reply(`🏗️ Creating *${nm}* (${type}, port ${port})...`)
                    const r = await agent.createProject(nm, type, port, text.slice(0,100))
                    if (r.success) {
                        await react('✅')
                        await reply(`╭══〘 *🚀 PROJECT READY* 〙═⊷\n┃ Name: *${r.name}*\n┃ Port: *${r.port}*\n┃ Dir: ${r.dir}\n┃\n┃ ${r.steps.map(s=>`${s.ok?'✅':'❌'} ${s.step}`).join(' | ')}\n┃\n┃ 📋 Logs: say "pm2 logs ${r.name}"\n┃ 🔄 Restart: say "restart ${r.name}"\n╰══════════════════⊷`)
                    } else {
                        await react('❌')
                        await reply('❌ Project creation failed.')
                    }
                    return
                }

                // ── Usage stats ──────────────────────────────────────────────
                if (intent === 'usage_stats') {
                    await react('📊')
                    const r = agent.usageStats()
                    if (r.success) {
                        await reply(
                            `╭══〘 *📊 BOT STATS* 〙═⊷\n` +
                            `┃ Total commands: *${r.total}*\n` +
                            `┃ Unique users:   *${r.users}*\n` +
                            `┃\n` +
                            (r.topCmds.length  ? `┃ 🏆 Top commands:\n┃  ${r.topCmds.join('\n┃  ')}\n┃\n` : '') +
                            (r.topUsers.length ? `┃ 👑 Top users:\n┃  ${r.topUsers.join('\n┃  ')}\n` : '') +
                            `╰══════════════════⊷`
                        )
                    } else { await reply('❌ ' + r.error) }
                    return
                }

                // ── Log analyze ──────────────────────────────────────────────
                if (intent === 'log_analyze') {
                    const fileMatch = text.match(/\b([\w/.]+\.log)\b/i)
                    const logFile   = fileMatch ? fileMatch[1] : null
                    const quoted    = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
                    let logContent  = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
                    if (!logContent && logFile) {
                        const r = await agent.runShell(`cat ${logFile} 2>/dev/null | tail -100`)
                        logContent = r.output
                    }
                    if (!logContent) { await reply('❓ Quote the logs or say the log file path: *analyze error.log*'); return }
                    await react('🔎')
                    await reply('🔎 Analyzing logs...')
                    const r = await agent.errorLogAnalyze(logContent)
                    await reply(`╭══〘 *🔎 LOG ANALYSIS* 〙═⊷\n\n${r.success ? r.text : '❌ ' + r.error}\n╰══════════════════⊷`)
                    return
                }

                // ── Backup ───────────────────────────────────────────────────
                if (intent === 'backup') {
                    const folderMatch = text.match(/\b(?:backup|zip|archive)\s+([\w/.~-]+)/i)
                    const folder = folderMatch ? folderMatch[1] : '/tmp/projects'
                    await react('💾')
                    await reply(`💾 Backing up *${folder}*...`)
                    const r = await agent.backupToGithub(folder)
                    await reply(`${r.success ? '✅' : '❌'} ${r.output}`)
                    return
                }

                // ── Schedule message ─────────────────────────────────────────
                if (intent === 'schedule_msg') {
                    const minMatch = text.match(/\bin\s+(\d+)\s+(minute|min|hour|hr|second|sec)/i)
                    if (!minMatch) { await reply('❓ Usage: *in 30 minutes send "reminder message"*'); return }
                    const amount = parseInt(minMatch[1])
                    const unit   = minMatch[2].toLowerCase()
                    const ms     = unit.startsWith('h') ? amount*3600000 : unit.startsWith('s') ? amount*1000 : amount*60000
                    const msgMatch = text.match(/["']([^"']+)["']/) || text.match(/send\s+(.+)$/i)
                    const msg = msgMatch ? msgMatch[1] : 'Reminder!'
                    await react('⏰')
                    const r = agent.scheduleMessage(conn, chat, `⏰ *Scheduled Reminder:*\n${msg}`, ms)
                    await reply(`✅ Scheduled: "${msg.slice(0,50)}" in *${amount} ${unit}${amount>1?'s':''}*`)
                    return
                }

                // ── BeraHost: deploy new bot ──────────────────────────────────
                if (intent === 'berahost_deploy') {
                    const { deployBot } = require('../Library/actions/berahost')
                    const nameMatch = text.match(/\b(?:deploy|host|create|called|named?)\s+([\w-]+)/i)
                    const repoMatch = text.match(/https?:\/\/github\.com\/[^\s]+/)
                    const ramMatch  = text.match(/(\d+)\s*(mb|ram|memory)/i)
                    const botName = nameMatch ? nameMatch[1] : 'new-bot'
                    const repoUrl = repoMatch ? repoMatch[0] : ''
                    const ram     = ramMatch  ? parseInt(ramMatch[1]) : 512
                    await react('🚀')
                    await reply(`🚀 Deploying *${botName}* on BeraHost...${repoUrl ? '\n📦 Repo: ' + repoUrl : ''}`)
                    const r = await deployBot(botName, repoUrl, sender.replace(/@.+/,''), ram)
                    await react(r.success ? '✅' : '❌')
                    await reply(r.success ? r.message : `❌ Deploy failed: ${r.error}`)
                    return
                }

                // ── BeraHost: list servers ────────────────────────────────────
                if (intent === 'berahost_list') {
                    const { listServers } = require('../Library/actions/berahost')
                    await react('🌐')
                    const r = await listServers()
                    if (r.success) {
                        const srvList = r.servers.length
                            ? r.servers.map((s,i) => `┃ ${i+1}. *${s.name}* | ${s.status} | RAM:${s.ram}MB CPU:${s.cpu}%`).join('\n')
                            : '┃ No servers found'
                        await reply(`╭══〘 *🌐 BERAHOST SERVERS* 〙═⊷\n┃ Total: ${r.servers.length}\n┃\n${srvList}\n╰══════════════════⊷`)
                    } else {
                        await reply(`❌ Could not list servers: ${r.error}`)
                    }
                    return
                }

                // ── BeraHost: power action ────────────────────────────────────
                if (intent === 'berahost_power') {
                    const { getServer, serverPower } = require('../Library/actions/berahost')
                    const actMatch  = text.match(/\b(start|stop|restart|kill)\b/i)
                    const nameMatch = text.match(/\b(?:start|stop|restart|kill)\b\s+([\w-]+)/i)
                    const action = actMatch  ? actMatch[1].toLowerCase()  : 'restart'
                    const name   = nameMatch ? nameMatch[1] : null
                    if (!name) { await reply('❓ Which server? e.g. *restart my-bot on berahost*'); return }
                    await react('⚙️')
                    const found = await getServer(name)
                    if (!found.success) { await reply(`❌ ${found.error}`); return }
                    const r = await serverPower(found.server.id, action)
                    await reply(`${r.success ? '✅' : '❌'} *${action.toUpperCase()}* → ${found.server.name}\n${r.output || r.error || ''}`)
                    return
                }

                // ── BeraHost: resources ───────────────────────────────────────
                if (intent === 'berahost_resources') {
                    const { listServers, serverResources } = require('../Library/actions/berahost')
                    await react('📊')
                    const list = await listServers()
                    if (!list.success || !list.servers.length) { await reply(`❌ No servers found or panel unreachable`); return }
                    const rows = await Promise.all(list.servers.slice(0,5).map(async s => {
                        const res = await serverResources(s.uuid)
                        return res.success
                            ? `┃ *${s.name}*: ${res.state} | CPU:${res.cpu} RAM:${res.ram} Up:${res.uptime}`
                            : `┃ *${s.name}*: unreachable`
                    }))
                    await reply(`╭══〘 *📊 SERVER RESOURCES* 〙═⊷\n${rows.join('\n')}\n╰══════════════════⊷`)
                    return
                }

                // ── GitHub token ─────────────────────────────────────────────
                if (intent === 'github_token') {
                    await react('🔑')
                    const r = await agent.githubTokenRegen(global.db?.data?.github?.token)
                    await reply(r.success
                        ? `╭══〘 *🔑 GITHUB TOKEN* 〙═⊷\n┃ Account: *${r.username}*\n┃ Status: ✅ Active\n┃\n┃ ${r.message.replace(/\n/g,'\n┃ ')}\n╰══════════════════⊷`
                        : `❌ GitHub token error: ${r.error}`)
                    return
                }

                // ── Git status ───────────────────────────────────────────────
                if (intent === 'git_status') {
                    const folder = (text.match(/\b(?:in|for|on)\s+([\w/.~-]+)\b/)||[])[1] || '.'
                    await react('📁')
                    const r = await agent.gitStatus(folder)
                    await reply(`╭══〘 *📁 GIT STATUS* 〙═⊷\n${fmt(r.output)}\n╰══════════════════⊷`)
                    return
                }
            }
            // ═══════════════════════════════════════════════════════════════

            // ── ChatBera mode: reply as the owner when activated ──────────────
            // ChatBera: global mode OR per-chat mode
            const chatberaGlobal = global.db?.data?.chatbera?.globalEnabled
            const chatberaChat   = global.db?.data?.chatbera?.enabled?.[chat]
            const chatberaOn = chatberaGlobal || chatberaChat
            // Skip if message is from a group (PMs only) unless group mode enabled
            const chatberaGroupOk = global.db?.data?.chatbera?.groupEnabled || false
            if (chatberaOn && !m.fromMe && text && (!m.isGroup || chatberaGroupOk)) {
                console.log('[CHATBERA] 🔥 Triggered for msg:', text.slice(0, 30), '| from:', sender)
                let profile = global.db?.data?.chatbera?.profile
                // Always load prebuilt if profile missing or incomplete
                if (!profile || !profile.myMessages?.length) {
                    const { getPrebuiltProfile } = require('../Library/actions/chatbera')
                    profile = getPrebuiltProfile()
                }
                if (!profile.systemPrompt) {
                    const { getPrebuiltProfile } = require('../Library/actions/chatbera')
                    profile.systemPrompt = getPrebuiltProfile().systemPrompt
                }
                if (profile?.myMessages?.length) {
                    try {
                        const { generateStyleReply } = require('../Library/actions/chatbera')
                        conn.sendPresenceUpdate('composing', chat).catch(() => {})
                        await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000))
                        const result = await generateStyleReply(text, profile)
                        if (result.success && result.reply) {
                            await conn.sendMessage(chat, { text: result.reply }, { quoted: m })
                        }
                        conn.sendPresenceUpdate('paused', chat).catch(() => {})
                    } catch (e) {
                        console.error('[CHATBERA]', e.message)
                    }
                }
            }

            return  // ← FAST EXIT: no handler loops for non-commands
        }

        // ── COMMAND PATH ──────────────────────────────────────────────────
        const handler = commandMap.get(command)
        if (!handler) return

        if (!authorized) {
            return conn.sendMessage(chat, {
                text:
                    `╭══〘 *🔒 PRIVATE MODE* 〙═⊷\n` +
                    `┃❍ Bera AI is currently in private mode.\n` +
                    `┃❍ Only the owner can use the bot right now.\n` +
                    `╰══════════════════⊷`
            }, { quoted: m })
        }

        const user = getUser(sender)
        checkLimit(user, isOwner)

        user.commandCount = (user.commandCount || 0) + 1
        if (!global.db.data.stats) global.db.data.stats = { totalCommands: 0 }
        global.db.data.stats.totalCommands = (global.db.data.stats.totalCommands || 0) + 1
        debouncedDbWrite()  // batch DB writes — much faster than awaiting every time

        const ctx = {
            conn,
            m,
            text: body,
            args,
            command,
            sender,
            chat,
            prefix,
            isOwner,
            isAuthorized: authorized,
            reply: (txt) => conn.sendMessage(chat, { text: String(txt) }, { quoted: m }),
        }

        if (global.db?.data?.settings?.autoTyping !== false) {
            conn.sendPresenceUpdate('composing', chat).catch(() => {})
        }

        await handler(m, ctx)

        if (global.db?.data?.settings?.autoTyping !== false) {
            conn.sendPresenceUpdate('paused', chat).catch(() => {})
        }

    } catch (e) {
        console.error('[HANDLER ERROR]', e.message)
        console.error(e.stack?.split('\n').slice(0, 5).join('\n'))
    }
}

module.exports = { handleMessage, handleGroupEvents, handleReaction }
