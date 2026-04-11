// Plugins/chatbera.js
// ChatBera — trained on Developer Bera's real chats (Carl Tech, Grace H, Marisel, iddahtelewa)
// 412 messages | Auto-initialises with prebuilt profile

const { parseExport, generateStyleReply, getPrebuiltProfile } = require('../Library/actions/chatbera')

async function ensurePrebuilt() {
    try {
        if (!global.db || !global.db.data) return
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

// Delay startup so global.db is ready before we access it
setTimeout(() => ensurePrebuilt(), 5000)

const handle = async (conn, m, { command, args, prefix, reply, isOwner }) => {

    // ── chatbera on/off/status ────────────────────────────────────────────
    if (command === 'chatbera') {
        if (!isOwner) return reply('❌ Owner only.')
        const arg = args[0]?.toLowerCase()

        if (!arg || arg === 'status') {
            const isOn = global.db?.data?.chatbera?.globalEnabled
            const profile = global.db?.data?.chatbera?.profile || {}
            return reply(
                '╭══〘 *🎭 CHATBERA STATUS* 〙═⊷\n' +
                `┃ Status: *${isOn ? '🟢 ON (all PMs)' : '🔴 OFF'}*\n` +
                `┃ Trained on: *${profile?.myMessages?.length || 412} messages*\n` +
                `┃ Turn on: *${prefix}chatbera on*\n` +
                `┃ Turn off: *${prefix}chatbera off*\n` +
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
                '╭══〘 *🎭 CHATBERA ON* 〙═⊷\n' +
                `┃ Replying as: *${profile?.myName || 'Developer Bera'}*\n` +
                `┃ Trained on: *${profile?.myMessages?.length || 412} messages*\n` +
                '┃ Status: 🟢 Active — all PMs\n' +
                '┃\n' +
                '┃ I will now reply to every\n' +
                '┃ message in your exact style.\n' +
                `┃ Turn off: *${prefix}chatbera off*\n` +
                '╰══════════════════⊷'
            )
        }

        if (arg === 'off') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.globalEnabled = false
            global.db.data.chatbera.enabled = {}
            await global.db.write()
            return reply(
                '╭══〘 *🎭 CHATBERA OFF* 〙═⊷\n' +
                '┃ Status: 🔴 Disabled\n' +
                '┃ No longer auto-replying.\n' +
                `┃ Turn on: *${prefix}chatbera on*\n` +
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
            return reply(`*Test Reply:*\n${result.reply}`)
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
            '╭══〘 *🧬 YOUR CHAT STYLE* 〙═⊷\n' +
            `┃ Name: *${profile.myName || 'Developer Bera'}*\n` +
            `┃ Messages trained: *${profile.myMessages?.length || 412}*\n` +
            `┃ Emoji rate: *${stats.emojiRate || '96%'}*\n` +
            `┃ Punctuation rate: *${stats.punctuationRate || '3%'}*\n` +
            `┃ Avg msg length: *${stats.avgLength || '12 words'}*\n` +
            `┃ Top words: *${(stats.topWords || ['mkuu','bana','naah','😂']).slice(0,4).join(', ')}*\n` +
            '╰══════════════════⊷'
        )
    }

    // ── trainbera ─────────────────────────────────────────────────────────
    if (command === 'trainbera') {
        if (!isOwner) return reply('❌ Owner only.')
        if (!m.quoted?.message) {
            return reply(
                '╭══〘 *📚 TRAIN CHATBERA* 〙═⊷\n' +
                '┃ Reply to an exported chat .txt file\n' +
                '┃ with this command to train me.\n' +
                '┃\n' +
                '┃ Or use the built-in prebuilt profile\n' +
                '┃ (already loaded — 412 real messages)\n' +
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
                `✅ *Training complete!*\n` +
                `📊 ${result.myMessages.length} messages from you extracted\n` +
                `🗓️ Date range: ${result.dateRange || 'N/A'}\n` +
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
