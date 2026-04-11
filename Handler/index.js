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

            // ── ChatBera mode: reply as the owner when activated ──────────────
            const chatberaOn = global.db?.data?.chatbera?.enabled?.[chat]
            if (chatberaOn && !m.fromMe && text) {
                const profile = global.db?.data?.chatbera?.profile
                if (profile?.systemPrompt && profile?.myMessages?.length) {
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
