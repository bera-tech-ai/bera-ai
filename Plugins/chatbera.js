// Plugins/chatbera.js
// ChatBera — talks exactly like you when you're away

const { parseExport, getSenders, buildStylePrompt, generateStyleReply, analyzeStyle } = require('../Library/actions/chatbera')

const handle = async (m, { conn, text, reply, command, sender, chat, prefix, isOwner }) => {

    const react = (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {})

    // ── .chatbera on/off ──────────────────────────────────────────────────────
    if (command === 'chatbera') {
        if (!isOwner) return reply('❌ Only the bot owner can control ChatBera mode.')

        const arg = text?.trim().toLowerCase()

        if (arg === 'on') {
            const profile = global.db?.data?.chatbera?.profile
            if (!profile?.systemPrompt || !profile?.myMessages?.length) {
                return reply(
                    '⚠️ *No training data found!*\n\n' +
                    'First train the bot with your chat export:\n' +
                    '1️⃣ Open WhatsApp → chat with your girl/friend\n' +
                    '2️⃣ Tap ⋮ → More → Export chat → Without media\n' +
                    `3️⃣ Send the .txt file here and type *${prefix}trainbera*`
                )
            }
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.enabled = global.db.data.chatbera.enabled || {}
            global.db.data.chatbera.enabled[chat] = true
            await global.db.write()

            const name = profile.myName || 'you'
            return reply(
                `╭══〘 *🤖 CHATBERA ON* 〙═⊷\n` +
                `┃❍ I'm now replying as *${name}*\n` +
                `┃❍ Trained on *${profile.myMessages.length}* of your real messages\n` +
                `┃❍ Anyone messaging here gets a reply in your exact style\n` +
                `┃\n` +
                `┃ Turn off: *${prefix}chatbera off*\n` +
                `╰══════════════════⊷`
            )
        }

        if (arg === 'off') {
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.enabled = global.db.data.chatbera.enabled || {}
            global.db.data.chatbera.enabled[chat] = false
            await global.db.write()
            return reply('🔴 *ChatBera OFF* — bot will no longer reply as you in this chat.')
        }

        // Status check
        const isOn = global.db?.data?.chatbera?.enabled?.[chat]
        const profile = global.db?.data?.chatbera?.profile
        const trained = profile?.myMessages?.length || 0

        return reply(
            `╭══〘 *🤖 CHATBERA STATUS* 〙═⊷\n` +
            `┃❍ Status in this chat: *${isOn ? '🟢 ON' : '🔴 OFF'}*\n` +
            `┃❍ Trained on: *${trained} messages*\n` +
            `┃❍ Style name: *${profile?.myName || 'Not set'}*\n` +
            `┃\n` +
            `┃ *Commands:*\n` +
            `┃❍ ${prefix}chatbera on/off — Toggle in this chat\n` +
            `┃❍ ${prefix}trainbera — Upload chat export\n` +
            `┃❍ ${prefix}mystyle — See your style analysis\n` +
            `┃❍ ${prefix}testbera <message> — Test a reply\n` +
            `┃❍ ${prefix}clearstyle — Delete training data\n` +
            `╰══════════════════⊷`
        )
    }

    // ── .trainbera — upload a WhatsApp chat export .txt ───────────────────────
    if (command === 'trainbera') {
        if (!isOwner) return reply('❌ Only the bot owner can train ChatBera.')

        // Check for document/text file in quoted or current message
        const hasDoc = m.mtype === 'documentMessage' || m.mtype === 'documentWithCaptionMessage'
        const quotedDoc = m.quoted?.mtype === 'documentMessage'

        if (!hasDoc && !quotedDoc) {
            return reply(
                `╭══〘 *📚 TRAINBERA* 〙═⊷\n` +
                `┃\n` +
                `┃ Send your WhatsApp chat export and\n` +
                `┃ type *${prefix}trainbera* as the caption.\n` +
                `┃\n` +
                `┃ *How to export:*\n` +
                `┃ 1. Open the chat (your girl/friend)\n` +
                `┃ 2. Tap ⋮ → More → Export chat\n` +
                `┃ 3. Choose "Without media"\n` +
                `┃ 4. Send the .txt file here with\n` +
                `┃    .trainbera as the caption\n` +
                `┃\n` +
                `┃ The bot learns your texting style\n` +
                `┃ and replies as you when away!\n` +
                `╰══════════════════⊷`
            )
        }

        await react('⏳')
        await conn.sendMessage(chat, { text: '📖 Reading your chat export...' }, { quoted: m })

        try {
            // Download the document
            const msgToDownload = hasDoc ? m : m.quoted
            const buf = await conn.downloadMediaMessage(hasDoc ? m : {
                key: m.quoted.key,
                message: { documentMessage: m.quoted.message }
            })

            if (!buf) {
                await react('❌')
                return reply('❌ Could not download the file. Make sure you sent a .txt file.')
            }

            const fileContent = buf.toString('utf8')

            // Check it looks like a WhatsApp export
            if (!fileContent.includes(':') || fileContent.length < 100) {
                await react('❌')
                return reply('❌ This doesn\'t look like a WhatsApp chat export. Make sure to export as .txt')
            }

            // Detect senders
            const senders = getSenders(fileContent)
            if (senders.length < 2) {
                await react('❌')
                return reply('❌ Couldn\'t detect any contacts in this file. Export the correct chat.')
            }

            // Who are you in the chat?
            // Use the text after the command, or first sender if name provided
            let myName = text?.trim() || ''

            if (!myName) {
                // Ask user which name is theirs
                const senderList = senders.slice(0, 10).map((s, i) => `${i + 1}. ${s}`).join('\n')
                await global.db.write && null

                // Store file temporarily and ask user to pick their name
                if (!global.db.data.chatbera) global.db.data.chatbera = {}
                global.db.data.chatbera._pendingExport = fileContent
                global.db.data.chatbera._pendingSenders = senders
                await global.db.write()

                await react('❓')
                return reply(
                    `╭══〘 *📚 TRAINBERA* 〙═⊷\n` +
                    `┃ Chat export loaded!\n` +
                    `┃\n` +
                    `┃ *Who are you in this chat?*\n` +
                    `┃ Type your name as it appears:\n` +
                    `┃\n` +
                    `${senderList.split('\n').map(l => `┃ ${l}`).join('\n')}\n` +
                    `┃\n` +
                    `┃ Reply: *${prefix}setmyname <name>*\n` +
                    `╰══════════════════⊷`
                )
            }

            // Process with the given name
            await conn.sendMessage(chat, { text: `🔍 Finding your messages as "${myName}"...` }, { quoted: m })
            const { myMessages } = parseExport(fileContent, myName)

            if (myMessages.length < 10) {
                await react('❌')
                return reply(
                    `❌ Only found *${myMessages.length}* messages from "${myName}".\n` +
                    `That's not enough to learn your style.\n\n` +
                    `Make sure the name matches exactly. Try:\n` +
                    `*${prefix}trainbera ${senders[0]}* or *${prefix}trainbera ${senders[1] || 'YourName'}*\n\n` +
                    `Senders found: ${senders.slice(0,5).join(', ')}`
                )
            }

            await conn.sendMessage(chat, { text: `📊 Analysing your style from ${myMessages.length} messages...` }, { quoted: m })

            // Build style profile
            const systemPrompt = buildStylePrompt(myMessages, myName)

            // Run style analysis
            const styleAnalysis = await analyzeStyle(myMessages, myName)

            // Save to database
            if (!global.db.data.chatbera) global.db.data.chatbera = {}
            global.db.data.chatbera.profile = {
                myName,
                myMessages: myMessages.slice(0, 150), // store up to 150 examples
                systemPrompt,
                styleAnalysis,
                trainedAt: new Date().toISOString(),
                totalFound: myMessages.length
            }
            delete global.db.data.chatbera._pendingExport
            delete global.db.data.chatbera._pendingSenders
            await global.db.write()

            await react('✅')
            return reply(
                `╭══〘 *✅ CHATBERA TRAINED!* 〙═⊷\n` +
                `┃\n` +
                `┃ 📚 Name: *${myName}*\n` +
                `┃ 💬 Messages trained on: *${myMessages.length}*\n` +
                `┃\n` +
                `┃ *📝 Your texting style:*\n` +
                `${styleAnalysis.split('\n').slice(0,8).map(l => `┃ ${l}`).join('\n')}\n` +
                `┃\n` +
                `┃ Now activate: *${prefix}chatbera on*\n` +
                `╰══════════════════⊷`
            )
        } catch (e) {
            await react('❌')
            return reply(`❌ Error reading file: ${e.message}`)
        }
    }

    // ── .setmyname — set which name is you after upload ───────────────────────
    if (command === 'setmyname') {
        if (!isOwner) return reply('❌ Owner only.')
        const pending = global.db?.data?.chatbera?._pendingExport
        if (!pending) return reply(`❌ No pending export. Send your chat file first with *${prefix}trainbera*`)

        const myName = text?.trim()
        if (!myName) return reply(`❌ Usage: ${prefix}setmyname YourName`)

        await react('⏳')

        const { myMessages } = parseExport(pending, myName)
        if (myMessages.length < 10) {
            return reply(
                `❌ Only found ${myMessages.length} messages from "${myName}".\n` +
                `Names in chat: ${(global.db.data.chatbera._pendingSenders || []).join(', ')}`
            )
        }

        await conn.sendMessage(chat, { text: `📊 Analysing ${myMessages.length} messages as "${myName}"...` }, { quoted: m })

        const systemPrompt = buildStylePrompt(myMessages, myName)
        const styleAnalysis = await analyzeStyle(myMessages, myName)

        global.db.data.chatbera.profile = {
            myName,
            myMessages: myMessages.slice(0, 150),
            systemPrompt,
            styleAnalysis,
            trainedAt: new Date().toISOString(),
            totalFound: myMessages.length
        }
        delete global.db.data.chatbera._pendingExport
        delete global.db.data.chatbera._pendingSenders
        await global.db.write()

        await react('✅')
        return reply(
            `╭══〘 *✅ CHATBERA TRAINED!* 〙═⊷\n` +
            `┃ Name: *${myName}*\n` +
            `┃ Messages: *${myMessages.length}*\n` +
            `┃\n` +
            `┃ *Style summary:*\n` +
            `${styleAnalysis.split('\n').slice(0,8).map(l => `┃ ${l}`).join('\n')}\n` +
            `┃\n` +
            `┃ Activate: *${prefix}chatbera on*\n` +
            `╰══════════════════⊷`
        )
    }

    // ── .mystyle — view your current style analysis ───────────────────────────
    if (command === 'mystyle' || command === 'chatstyle') {
        const profile = global.db?.data?.chatbera?.profile
        if (!profile) return reply(`❌ No style data yet. Train first with *${prefix}trainbera*`)

        return reply(
            `╭══〘 *🪞 YOUR TEXTING STYLE* 〙═⊷\n` +
            `┃ Name: *${profile.myName}*\n` +
            `┃ Trained on: *${profile.myMessages.length} messages*\n` +
            `┃ Trained: ${new Date(profile.trainedAt).toLocaleDateString()}\n` +
            `┃\n` +
            `${(profile.styleAnalysis || 'No analysis available').split('\n').map(l => `┃ ${l}`).join('\n')}\n` +
            `╰══════════════════⊷`
        )
    }

    // ── .testbera — test a reply in your style ────────────────────────────────
    if (command === 'testbera') {
        const profile = global.db?.data?.chatbera?.profile
        if (!profile) return reply(`❌ No training data. Use *${prefix}trainbera* first.`)

        const testMsg = text?.trim()
        if (!testMsg) return reply(`❌ Usage: ${prefix}testbera <message to test>`)

        await react('⏳')
        await conn.sendMessage(chat, { text: `🎭 Generating reply as *${profile.myName}*...` }, { quoted: m })

        const result = await generateStyleReply(testMsg, profile)
        await react(result.success ? '✅' : '❌')

        if (!result.success) return reply(`❌ ${result.error}`)

        return reply(
            `╭══〘 *🎭 CHATBERA TEST* 〙═⊷\n` +
            `┃ *Incoming:* "${testMsg}"\n` +
            `┃\n` +
            `┃ *Reply as ${profile.myName}:*\n` +
            `┃ ${result.reply}\n` +
            `╰══════════════════⊷`
        )
    }

    // ── .clearstyle — wipe training data ─────────────────────────────────────
    if (command === 'clearstyle' || command === 'clearbera') {
        if (!isOwner) return reply('❌ Owner only.')
        if (!global.db.data.chatbera) return reply('Nothing to clear.')
        global.db.data.chatbera = {}
        await global.db.write()
        return reply('🗑️ ChatBera training data cleared. Bot will no longer reply as you.')
    }
}

handle.command = [
    'chatbera',
    'trainbera',
    'setmyname',
    'mystyle', 'chatstyle',
    'testbera',
    'clearstyle', 'clearbera'
]
handle.tags = ['chatbera']

module.exports = handle
