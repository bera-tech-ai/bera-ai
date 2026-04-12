// Plugins/buttons.js — Interactive button-powered commands (gifted-btns)
// Commands: groupmenu, memberpanel, adminpanel, vote, searchbtn, bhpanel, quickhelp, botinfo, waresult

const { sendBtn, sendList, sendUrlBtn } = require('../Library/actions/btns')

const handle = {}
handle.command = ['groupmenu', 'gctrl', 'grouppanel',
                  'memberpanel', 'memberctrl', 'minfo',
                  'adminpanel', 'ctrlpanel', 'controlpanel',
                  'vote', 'quickvote', 'poll2',
                  'bhpanel', 'berahostpanel', 'bhmenu',
                  'quickhelp', 'qhelp', 'helpmenu',
                  'botinfo', 'berainfo',
                  'searchbtn', 'qsearch',
                  'settingspanel', 'settingsmenu', 'settings',
                  'togglepanel', 'togglemenu',
                  'deploylist', 'deplist', 'mybotslist']

handle.tags    = ['buttons', 'interactive', 'panel', 'group', 'fun', 'tools']
handle.help    = ['groupmenu', 'vote <Q;A;B>', 'bhpanel', 'quickhelp', 'botinfo']

handle.all = async (m, { conn, command, args, prefix, reply, isOwner, isAdmin, isGroup, sender } = {}) => {
    const chat = m.chat || m.key?.remoteJid
    const p    = prefix
    const cfg  = global.db?.data?.settings || {}

    // ── .groupmenu / .gctrl ───────────────────────────────────────────────────
    if (['groupmenu', 'gctrl', 'grouppanel'].includes(command)) {
        if (!isGroup) return reply('❌ This command is for groups only.')
        let meta = {}
        try { meta = await conn.groupMetadata(chat) } catch {}
        const name     = meta.subject || 'This Group'
        const members  = (meta.participants || []).length
        const admins   = (meta.participants || []).filter(p2 => p2.admin).length
        const announce = meta.announce ? '🔒 Locked' : '🔓 Open'
        const ephemeral= meta.ephemeralDuration ? meta.ephemeralDuration / 86400 + 'd' : 'Off'

        await sendBtn(conn, chat, {
            title:  '👥 ' + name,
            text:   '📊 *Members:* ' + members + '  |  👑 *Admins:* ' + admins + '\\n'
                  + '🔒 *Chat:* ' + announce + '  |  ⏳ *Disappear:* ' + ephemeral + '\\n\\n'
                  + 'Tap a button to manage the group:',
            footer: 'Bera AI — Group Manager',
            buttons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🔒 Lock Chat',        id: prefix + 'mute' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🔓 Unlock Chat',      id: prefix + 'unmute' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📊 Group Info',       id: prefix + 'groupinfo' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👑 List Admins',      id: prefix + 'admins' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👥 All Members',      id: prefix + 'members' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🔗 Group Link',       id: prefix + 'link' }) },
            ]
        })
    }

    // ── .memberpanel @user ────────────────────────────────────────────────────
    else if (['memberpanel', 'memberctrl', 'minfo'].includes(command)) {
        if (!isGroup) return reply('❌ Groups only.')
        if (!isAdmin && !isOwner) return reply('⛔ Admin only.')
        const mentioned = m.mentionedJid?.[0] || (m.quoted?.sender)
        if (!mentioned) return reply('❌ Tag a member: ' + p + 'memberpanel @user')
        let meta = {}
        try { meta = await conn.groupMetadata(chat) } catch {}
        const part = (meta.participants || []).find(x => x.id === mentioned)
        const role = part?.admin === 'superadmin' ? '👑 Super Admin' : part?.admin ? '🛡️ Admin' : '👤 Member'
        const numDisplay = '+' + mentioned.split('@')[0]

        await sendBtn(conn, chat, {
            title:  '👤 Member Panel',
            text:   '📱 *Number:* ' + numDisplay + '\\n'
                  + '🏷️ *Role:* ' + role + '\\n\\n'
                  + 'Choose an action for this member:',
            footer: 'Bera AI — Member Control',
            buttons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🦶 Kick',       id: prefix + 'kick @' + mentioned.split('@')[0] }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⬆️ Promote',    id: prefix + 'promote @' + mentioned.split('@')[0] }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⬇️ Demote',     id: prefix + 'demote @' + mentioned.split('@')[0] }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⛔ Ban',         id: prefix + 'ban @' + mentioned.split('@')[0] }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🖼️ Get Pic',    id: prefix + 'getpp @' + mentioned.split('@')[0] }) },
            ]
        })
    }

    // ── .adminpanel ───────────────────────────────────────────────────────────
    else if (['adminpanel', 'ctrlpanel', 'controlpanel'].includes(command)) {
        if (!isOwner) return reply('⛔ Owner only.')
        const aiOn    = cfg.chatberaEnabled  ? '✅ ON' : '❌ OFF'
        const cbotOn  = cfg.chatbot          ? '✅ ON' : '❌ OFF'
        const svOn    = cfg.autoStatusView   ? '✅ ON' : '❌ OFF'
        const slOn    = cfg.autoStatusLike   ? '✅ ON' : '❌ OFF'
        const typingOn= cfg.autotyping       ? '✅ ON' : '❌ OFF'
        const modeStr = cfg.mode === 'private' ? '🔒 Private' : '🌐 Public'

        await sendBtn(conn, chat, {
            title:  '⚙️ Bera AI Control Panel',
            text:   '🤖 *AI Mode:*      ' + aiOn    + '\\n'
                  + '💬 *Chatbot:*      ' + cbotOn  + '\\n'
                  + '👁️ *Status View:* ' + svOn    + '\\n'
                  + '❤️ *Status Like:* ' + slOn    + '\\n'
                  + '⌨️ *Auto Typing:* ' + typingOn + '\\n'
                  + '🌐 *Mode:*         ' + modeStr + '\\n\\n'
                  + 'Tap to toggle:',
            footer: 'Bera AI Admin Panel',
            buttons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🤖 Toggle AI',          id: prefix + 'ai' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💬 Toggle Chatbot',     id: prefix + 'chatbot' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👁️ Toggle Status View', id: prefix + 'sv' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '❤️ Toggle Status Like', id: prefix + 'sl' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📊 View Bot Stats',     id: prefix + 'stats' }) },
            ]
        })
    }

    // ── .vote Q;A;B;C ─────────────────────────────────────────────────────────
    else if (['vote', 'quickvote', 'poll2'].includes(command)) {
        const input = args.join(' ')
        const parts = input.split(/[;,|]+/).map(x => x.trim()).filter(Boolean)
        if (parts.length < 2) return reply('❌ Usage: ' + p + 'vote Question; Option A; Option B; Option C')
        const question = parts[0]
        const options  = parts.slice(1, 7) // max 6 options (WhatsApp button limit)
        const EMOJIS   = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣']
        const buttons  = options.map((opt, i) => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: EMOJIS[i] + ' ' + opt, id: 'vote_' + i + '_' + opt.slice(0,10) })
        }))

        await sendBtn(conn, chat, {
            title:  '🗳️ VOTE',
            text:   '*' + question + '*\\n\\nTap your choice below:',
            footer: 'Powered by Bera AI',
            buttons
        })
    }

    // ── .bhpanel — BeraHost control panel ────────────────────────────────────
    else if (['bhpanel', 'berahostpanel', 'bhmenu'].includes(command)) {
        let balText = 'Run ' + p + 'setbhkey first'
        try {
            const bh = require('../Library/actions/berahost')
            const r  = await bh.getCoins()
            if (r.success) balText = '🪙 ' + r.coins + ' coins'
        } catch {}
        const bhKey = cfg.bhApiKey || process.env.BH_API_KEY

        await sendBtn(conn, chat, {
            title:  '🖥️ BeraHost Panel',
            text:   '💰 *Balance:* ' + balText + '\\n'
                  + '🔑 *API Key:* ' + (bhKey ? '✅ Connected' : '❌ Not set') + '\\n\\n'
                  + 'What would you like to do?',
            footer: 'BeraHost — Bot Hosting Platform',
            buttons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🤖 My Deployments',   id: prefix + 'deployments' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📦 View Plans',       id: prefix + 'plans' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🪙 Claim Daily',      id: prefix + 'claimcoins' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💳 Pay via M-Pesa',   id: prefix + 'mpesa' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📜 Full BH Help',     id: prefix + 'bhhelp' }) },
            ]
        })
    }

    // ── .quickhelp — navigate menu via list ───────────────────────────────────
    else if (['quickhelp', 'qhelp', 'helpmenu'].includes(command)) {
        await sendList(conn, chat, {
            title:      '🐻 Bera AI — Help Menu',
            text:       'Select a category to view its commands:',
            footer:     'Bera AI v2.0',
            buttonText: '📋 Select Category',
            sections: [{
                title: '🗂️ Categories',
                rows: [
                    { id: prefix + 'menu',        title: '📋 Full Menu',          description: 'View all commands' },
                    { id: prefix + 'groupmenu',   title: '👥 Group Manager',      description: 'Group management panel' },
                    { id: prefix + 'bhpanel',     title: '🖥️ BeraHost Panel',    description: 'Bot hosting controls' },
                    { id: prefix + 'adminpanel',  title: '⚙️ Admin Panel',        description: 'Toggle bot settings' },
                    { id: prefix + 'bera hi',     title: '🤖 Chat with Bera AI',  description: 'Start AI conversation' },
                    { id: prefix + 'statusinfo',  title: '👁️ Status Settings',   description: 'Auto view & like config' },
                    { id: prefix + 'ping',        title: '⚡ Ping',               description: 'Check bot response time' },
                    { id: prefix + 'uptime',      title: '🕐 Uptime',             description: 'How long bot has been running' },
                ]
            }]
        })
    }

    // ── .botinfo — interactive bot info card ──────────────────────────────────
    else if (['botinfo', 'berainfo'].includes(command)) {
        const config2 = require('../Config')
        const bhKey   = cfg.bhApiKey || process.env.BH_API_KEY
        const upMs    = process.uptime() * 1000
        const h = Math.floor(upMs/3600000), mn = Math.floor((upMs%3600000)/60000)
        const upStr   = h + 'h ' + mn + 'm'

        await sendUrlBtn(conn, chat, {
            title:   '🐻 Bera AI Bot',
            text:    '🤖 *Bot:* ' + (config2.botName || 'Bera AI') + '\\n'
                   + '⚡ *Prefix:* *' + p + '*\\n'
                   + '🌐 *Mode:* ' + (cfg.mode === 'private' ? '🔒 Private' : '🌐 Public') + '\\n'
                   + '⏱️ *Uptime:* ' + upStr + '\\n'
                   + '🖥️ *BeraHost:* ' + (bhKey ? '✅ Connected' : '❌ Not set') + '\\n'
                   + '📦 *Runtime:* Node.js ' + process.version + '\\n'
                   + '💾 *RAM:* ' + Math.round(process.memoryUsage().heapUsed/1048576) + ' MB used',
            footer:  'Bera AI — WhatsApp Bot',
            url:     'https://kingvon-bot-hosting.replit.app',
            urlText: '🖥️ BeraHost Site',
            extraButtons: [
                { id: prefix + 'menu',   text: '📋 View Menu' },
                { id: prefix + 'ping',   text: '⚡ Ping Bot' },
            ]
        })
    }

    // ── .searchbtn <query> — web search with result buttons ───────────────────
    else if (['searchbtn', 'qsearch'].includes(command)) {
        const q = args.join(' ')
        if (!q) return reply('❌ Usage: ' + p + 'searchbtn <query>')
        const encoded = encodeURIComponent(q)
        await sendUrlBtn(conn, chat, {
            title:   '🔍 Search: ' + q,
            text:    'Tap to open your search results for:\\n*' + q + '*',
            footer:  'Bera AI — Quick Search',
            url:     'https://www.google.com/search?q=' + encoded,
            urlText: '🌐 Google Search',
            copyCode:q,
            copyText:'📋 Copy Query',
            extraButtons: [
                { id: prefix + 'search ' + q,      text: '🔍 Bera Search' },
                { id: prefix + 'imgsearch ' + q,   text: '🖼️ Image Search' },
            ]
        })
    }

    // ── .settingspanel — full toggle panel ───────────────────────────────────
    else if (['settingspanel', 'settingsmenu', 'settings'].includes(command)) {
        const on  = v => v ? '✅' : '❌'
        const rows = [
            { id: prefix + 'ai',              title: '🤖 ChatBera AI',        description: 'Currently: ' + on(cfg.chatberaEnabled) },
            { id: prefix + 'chatbot',         title: '💬 Chatbot Mode',       description: 'Currently: ' + on(cfg.chatbot) },
            { id: prefix + 'sv',              title: '👁️ Auto Status View',  description: 'Currently: ' + on(cfg.autoStatusView) },
            { id: prefix + 'sl',              title: '❤️ Auto Status Like',  description: 'Currently: ' + on(cfg.autoStatusLike) },
            { id: prefix + 'autotyping',      title: '⌨️ Auto Typing',       description: 'Currently: ' + on(cfg.autotyping) },
            { id: prefix + 'autobio on',      title: '📝 Auto Bio Rotation', description: 'Currently: ' + on(cfg.autobio) },
            { id: prefix + 'noprefix',        title: '🔑 No-Prefix Mode',    description: 'Currently: ' + on(cfg.noprefix) },
            { id: prefix + 'mode',            title: '🌐 Bot Mode',          description: 'Currently: ' + (cfg.mode || 'public') },
            { id: prefix + 'tagreply on',     title: '🏷️ Tag Reply',         description: 'Currently: ' + on(cfg.tagreply) },
        ]
        await sendList(conn, chat, {
            title:      '⚙️ Bot Settings Panel',
            text:       'Select a setting to toggle it:',
            footer:     'Bera AI Settings',
            buttonText: '⚙️ Choose Setting',
            sections: [{ title: 'Bot Settings', rows }]
        })
    }

    // ── .deploylist — list my deployments as a selectable list ───────────────
    else if (['deploylist', 'deplist', 'mybotslist'].includes(command)) {
        let rows = []
        try {
            const bh = require('../Library/actions/berahost')
            const r  = await bh.listDeployments()
            if (r.success && r.deployments?.length) {
                rows = r.deployments.map(d => ({
                    id:          prefix + 'depinfo ' + d.id,
                    title:       '🤖 ' + (d.name || d.botType || d.id),
                    description: 'Status: ' + (d.status || 'unknown') + ' | ' + (d.id || '')
                }))
            }
        } catch {}
        if (!rows.length) return reply('❌ No deployments found. Use ' + p + 'deploy to create one.')

        await sendList(conn, chat, {
            title:      '🤖 My Deployments',
            text:       'Select a deployment to view its details:',
            footer:     'BeraHost — Bot Hosting',
            buttonText: '🤖 Select Bot',
            sections: [{ title: 'Active Bots', rows }]
        })
    }
}

module.exports = handle
