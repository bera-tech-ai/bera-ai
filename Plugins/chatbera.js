// Plugins/chatbera.js
// ChatBera — trained on Developer Bera's real chats (Carl Tech, Grace H, Marisel, iddahtelewa)
// 412 messages | Auto-initialises with prebuilt profile

const { parseExport, generateStyleReply, getPrebuiltProfile } = require('../Library/actions/chatbera')

async function ensurePrebuilt() {
    try {
        if (!global.db.data.chatbera) global.db.data.chatbera = {}
        if (!global.db.data.chatbera.profile || !global.db.data.chatbera.profile.myMessages?.length) {
            const prebuilt = getPrebuiltProfile()
            global.db.data.chatbera.profile = prebuilt
            await global.db.write()
            console.log('[CHATBERA] Prebuilt profile loaded —', prebuilt.myMessages?.length, 'messages')
        }
    } catch (e) {
        console.error('[CHATBERA] ensurePrebuilt error:', e.message)
    }
}

ensurePrebuilt()

const handle = async (conn, m, { command, args, prefix, reply, isOwner }) => {
    const chat = m.chat

    // ── chatbera on/off ──────────────────────────────────────────────────
    if (command === 'chatbera') {
        if (!isOwner) return reply('❌ Owner only.')
        const arg = args[0]?.toLowerCase()

        if (!arg || arg === 'status') {
            const isOn = global.db?.data?.chatbera?.globalEnabled
            const profile = global.db?.data?.chatbera?.profile || {}
            return reply(
                '╭══〘 *🎭 CHATBERA STATUS* 〙═⊷
' +
                `┃ Status: *${isOn ? '🟢 ON (all PMs)' : '🔴 OFF'}*
` +
                `┃ Trained on: *${profile?.myMessages?.length || 412} messages*
` +
                `┃ Turn on: *${prefix}chatbera on*
` +
                `┃ Turn off: *${prefix}chatbera off*
` +
                '╰══════════════════⊷'
            )
        }

        if (arg === 'on') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.globalEnabled = true
            await global.db.write()
            await ensurePrebuilt()
            const profile = global.db.data.chatbera.profile || {}
            return reply(
                '╭══〘 *🎭 CHATBERA ON* 〙═⊷
' +
                `┃ Replying as: *${profile?.myName || 'Developer Bera'}*
` +
                `┃ Trained on: *${profile?.myMessages?.length || 412} messages*
` +
                '┃ Status: 🟢 Active — all PMs
' +
                '┃
' +
                '┃ I will now reply to every
' +
                '┃ message in your exact style.
' +
                `┃ Turn off: *${prefix}chatbera off*
` +
                '╰══════════════════⊷'
            )
        }

        if (arg === 'off') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.globalEnabled = false
            global.db.data.chatbera.enabled = {}
            await global.db.write()
            return reply(
                '╭══〘 *🎭 CHATBERA OFF* 〙═⊷
' +
                '┃ Status: 🔴 Disabled
' +
                '┃ No longer auto-replying.
' +
                `┃ Turn on: *${prefix}chatbera on*
` +
                '╰══════════════════⊷'
            )
        }

        return reply(`❓ Usage: *${prefix}chatbera on/off/status*`)
    }

    // ── testbera <message> ────────────────────────────────────────────────
    if (command === 'testbera') {
        if (!isOwner) return reply('❌ Owner only.')
        const testMsg = args.join(' ')
        if (!testMsg) return reply(`Usage: *${prefix}testbera Hello how are you*`)
        await ensurePrebuilt()
        const profile = global.db?.data?.chatbera?.profile
        reply('🤔 Generating reply as you...')
        const result = await generateStyleReply(testMsg, profile)
        if (result.success) {
            return reply(`*Test Reply:*
${result.reply}`)
        } else {
            return reply('❌ Failed to generate: ' + (result.error || 'unknown error'))
        }
    }

    // ── mystyle / chatstyle ───────────────────────────────────────────────
    if (command === 'mystyle' || command === 'chatstyle') {
        if (!isOwner) return reply('❌ Owner only.')
        await ensurePrebuilt()
        const profile = global.db?.data?.chatbera?.profile || {}
        const stats = profile.stats || {}
        return reply(
            '╭══〘 *🧬 YOUR CHAT STYLE* 〙═⊷
' +
            `┃ Name: *${profile.myName || 'Developer Bera'}*
` +
            `┃ Messages trained: *${profile.myMessages?.length || 412}*
` +
            `┃ Emoji rate: *${stats.emojiRate || '96%'}*
` +
            `┃ Punctuation rate: *${stats.punctuationRate || '3%'}*
` +
            `┃ Avg msg length: *${stats.avgLength || '12 words'}*
` +
            `┃ Top words: *${(stats.topWords || ['mkuu','bana','naah','😂']).slice(0,4).join(', ')}*
` +
            '╰══════════════════⊷'
        )
    }

    // ── trainbera ─────────────────────────────────────────────────────────
    if (command === 'trainbera') {
        if (!isOwner) return reply('❌ Owner only.')
        if (!m.quoted?.message) {
            return reply(
                '╭══〘 *📚 TRAIN CHATBERA* 〙═⊷
' +
                '┃ Reply to an exported chat .txt file
' +
                '┃ with this command to train me.
' +
                '┃
' +
                '┃ Or use the built-in prebuilt profile
' +
                `┃ (already loaded — 412 real messages)
` +
                '╰══════════════════⊷'
            )
        }
        try {
            reply('📖 Reading chat export...')
            const media = await conn.downloadMediaMessage(m.quoted)
            const text = media.toString('utf8')
            const myName = args[0] || 'Developer Bera'
            const result = parseExport(text, myName)
            if (!result.myMessages || result.myMessages.length < 5) {
                return reply('❌ Could not find enough messages. Make sure you exported the chat as .txt and reply to the file.')
            }
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.profile = result
            await global.db.write()
            return reply(
                `✅ *Training complete!*
` +
                `📊 ${result.myMessages.length} messages from you extracted
` +
                `🗓️ Date range: ${result.dateRange || 'N/A'}
` +
                `🔤 Your name used: ${myName}`
            )
        } catch (e) {
            return reply('❌ Error reading file: ' + e.message)
        }
    }

    // ── clearstyle / clearbera ─────────────────────────────────────────────
    if (command === 'clearstyle' || command === 'clearbera') {
        if (!isOwner) return reply('❌ Owner only.')
        if (global.db.data.chatbera) {
            delete global.db.data.chatbera.profile
            await global.db.write()
        }
        await ensurePrebuilt()
        return reply('🔄 Style reset to prebuilt profile (412 real messages from 4 chats).')
    }
}

handle.command = ['chatbera', 'trainbera', 'setmyname', 'mystyle', 'chatstyle', 'testbera', 'clearstyle', 'clearbera']
handle.tags = ['chatbera']

module.exports = handle
