// Plugins/chatbera.js
// ChatBera — trained on Developer Bera's real chats (Carl Tech, Grace H, Marisel, iddahtelewa)
// 433 messages | Auto-initialises with prebuilt profile

const { parseExport, getSenders, buildStylePrompt, generateStyleReply, analyzeStyle, getPrebuiltProfile, PREBUILT_PROFILE } = require('../Library/actions/chatbera')

// Auto-load prebuilt profile into DB if not already there
const ensurePrebuilt = async () => {
    if (!global.db?.data?.chatbera?.profile?.myMessages?.length) {
        if (!global.db.data.chatbera) global.db.data.chatbera = {}
        global.db.data.chatbera.profile = getPrebuiltProfile()
        await global.db.write().catch(() => {})
    }
}

const handle = async (m, { conn, text, reply, command, sender, chat, prefix, isOwner }) => {
    const react = (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {})

    // Auto-load prebuilt on any chatbera command
    await ensurePrebuilt()

    // ── .chatbera on/off ──────────────────────────────────────────────────────
    if (command === 'chatbera') {
        if (!isOwner) return reply('❌ Only the bot owner can control ChatBera mode.')
        const arg = text?.trim().toLowerCase()

        if (arg === 'on') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            if (!global.db.data.chatbera.enabled) global.db.data.chatbera.enabled = {}
            global.db.data.chatbera.enabled[chat] = true
            await global.db.write()
            const profile = global.db.data.chatbera.profile
            return reply(
                '╭══〘 *🎭 CHATBERA ON* 〙═⊷\n' +
                '┃\n' +
                `┃ I\'m now replying as *${profile?.myName || 'Developer Bera'}*\n` +
                `┃ Trained on *${profile?.myMessages?.length || 412} real messages*\n` +
                '┃ from 4 different chats (Carl, Grace, Marisel, Iddah)\n' +
                '┃\n' +
                '┃ Anyone who messages here gets a reply\n' +
                '┃ in your exact texting style 🎭\n' +
                '┃\n' +
                `┃ Turn off: *${prefix}chatbera off*\n` +
                '╰══════════════════⊷'
            )
        }

        if (arg === 'off') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            if (!global.db.data.chatbera.enabled) global.db.data.chatbera.enabled = {}
            global.db.data.chatbera.enabled[chat] = false
            await global.db.write()
            return reply('🔴 *ChatBera OFF* — Bera is back to normal in this chat.')
        }

        if (arg === 'status' || !arg) {
            const isOn = global.db?.data?.chatbera?.enabled?.[chat]
            const profile = global.db?.data?.chatbera?.profile
            const allActive = Object.entries(global.db?.data?.chatbera?.enabled || {})
                .filter(([, v]) => v).map(([k]) => k.split('@')[0]).join(', ')

            return reply(
                '╭══〘 *🎭 CHATBERA STATUS* 〙═⊷\n' +
                `┃ This chat: *${isOn ? '🟢 ON' : '🔴 OFF'}*\n` +
                `┃ Name: *${profile?.myName || 'Developer Bera'}*\n` +
                `┃ Messages trained: *${profile?.myMessages?.length || 412}*\n` +
                `┃ Sources: Carl Tech, Grace H, Marisel, Iddah\n` +
                `┃ Active chats: ${allActive || 'none'}\n` +
                '┃\n' +
                '┃ *Commands:*\n' +
                `┃ ${prefix}chatbera on/off — Toggle\n` +
                `┃ ${prefix}testbera <msg> — Test a reply\n` +
                `┃ ${prefix}mystyle — View style analysis\n` +
                `┃ ${prefix}trainbera — Upload more chat exports\n` +
                '╰══════════════════⊷'
            )
        }
    }

    // ── .trainbera — upload additional chat export ────────────────────────────
    if (command === 'trainbera') {
        if (!isOwner) return reply('❌ Owner only.')
        const hasDoc = m.mtype === 'documentMessage' || m.mtype === 'documentWithCaptionMessage'
        const quotedDoc = m.quoted?.mtype === 'documentMessage'

        if (!hasDoc && !quotedDoc) {
            return reply(
                '╭══〘 *📚 TRAINBERA* 〙═⊷\n' +
                '┃\n' +
                '┃ ChatBera is already trained on your\n' +
                '┃ real chats with Carl, Grace, Marisel\n' +
                '┃ and Iddah (412 messages total).\n' +
                '┃\n' +
                '┃ To add MORE training data:\n' +
                '┃ Export another chat from WhatsApp\n' +
                '┃ (⋮ → More → Export chat → Without media)\n' +
                '┃ Then send the .txt file here with\n' +
                `┃ caption: *${prefix}trainbera YourName*\n` +
                '╰══════════════════⊷'
            )
        }

        await react('⏳')
        try {
            const buf = await conn.downloadMediaMessage(hasDoc ? m : {
                key: m.quoted.key,
                message: { documentMessage: m.quoted.message }
            })
            if (!buf) { await react('❌'); return reply('❌ Could not download file.') }

            const fileContent = buf.toString('utf8')
            const senders = getSenders(fileContent)
            const myName = text?.trim() || 'Developer Bera'
            const { myMessages } = parseExport(fileContent, myName)

            if (myMessages.length < 5) {
                await react('❌')
                return reply(`❌ Only found ${myMessages.length} messages from "${myName}".\nSenders found: ${senders.join(', ')}`)
            }

            await conn.sendMessage(chat, { text: `📊 Found ${myMessages.length} messages. Merging with existing training data...` }, { quoted: m })

            // Merge with existing
            const existing = global.db.data.chatbera.profile?.myMessages || []
            const merged = [...new Set([...existing, ...myMessages])].slice(0, 300)
            const newSystemPrompt = buildStylePrompt(merged, myName)

            global.db.data.chatbera.profile = {
                myName,
                myMessages: merged,
                systemPrompt: newSystemPrompt,
                styleAnalysis: global.db.data.chatbera.profile?.styleAnalysis || PREBUILT_PROFILE.styleAnalysis,
                trainedAt: new Date().toISOString(),
                totalFound: merged.length
            }
            await global.db.write()
            await react('✅')
            return reply(
                `✅ *Training updated!*\n` +
                `Added ${myMessages.length} new messages\n` +
                `Total training data: *${merged.length} messages*`
            )
        } catch (e) {
            await react('❌')
            return reply('❌ Error: ' + e.message)
        }
    }

    // ── .mystyle ──────────────────────────────────────────────────────────────
    if (command === 'mystyle' || command === 'chatstyle') {
        const profile = global.db?.data?.chatbera?.profile
        const analysis = profile?.styleAnalysis || PREBUILT_PROFILE.styleAnalysis
        return reply(
            '╭══〘 *🪞 YOUR TEXTING STYLE* 〙═⊷\n' +
            `┃ Name: *${profile?.myName || 'Developer Bera'}*\n` +
            `┃ Trained on: *${profile?.myMessages?.length || 412} messages*\n` +
            '┃ Sources: Carl Tech, Grace H, Marisel, Iddah\n' +
            '┃\n' +
            analysis.split('\n').map(l => '┃ ' + l).join('\n') + '\n' +
            '╰══════════════════⊷'
        )
    }

    // ── .testbera ──────────────────────────────────────────────────────────────
    if (command === 'testbera') {
        const testMsg = text?.trim()
        if (!testMsg) return reply(`❌ Usage: ${prefix}testbera <message>`)

        await react('⏳')
        const profile = global.db?.data?.chatbera?.profile
        await conn.sendMessage(chat, { text: `🎭 Generating reply as *${profile?.myName || 'Developer Bera'}*...` }, { quoted: m })

        const result = await generateStyleReply(testMsg, profile)
        await react(result.success ? '✅' : '❌')
        if (!result.success) return reply('❌ ' + result.error)

        return reply(
            '╭══〘 *🎭 CHATBERA TEST* 〙═⊷\n' +
            `┃ *Them:* "${testMsg}"\n` +
            '┃\n' +
            `┃ *${profile?.myName || 'Developer Bera'} (AI):* ${result.reply}\n` +
            '╰══════════════════⊷'
        )
    }

    // ── .clearstyle ───────────────────────────────────────────────────────────
    if (command === 'clearstyle' || command === 'clearbera') {
        if (!isOwner) return reply('❌ Owner only.')
        if (global.db.data.chatbera) {
            delete global.db.data.chatbera.profile
            await global.db.write()
        }
        // Reload prebuilt
        await ensurePrebuilt()
        return reply('🔄 Style reset to prebuilt profile (412 real messages from 4 chats).')
    }
}

handle.command = ['chatbera', 'trainbera', 'setmyname', 'mystyle', 'chatstyle', 'testbera', 'clearstyle', 'clearbera']
handle.tags = ['chatbera']

module.exports = handle
