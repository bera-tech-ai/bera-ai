const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const os = require('os')

const handle = async (m, { conn, text, reply, prefix, command, sender, chat, isOwner, args }) => {

    if (command === 'broadcast') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}broadcast <message>`)
        const users = Object.keys(global.db.data.users || {})
        if (!users.length) return reply(`❌ No users in database yet.`)
        let sent = 0, failed = 0
        await reply(`📢 Broadcasting to ${users.length} users...`)
        for (const jid of users) {
            if (jid.includes('@newsletter')) continue
            try {
                await conn.sendMessage(jid, { text: `📢 *Bera Broadcast*\n\n${text}` })
                sent++
                await new Promise(r => setTimeout(r, 1000))
            } catch { failed++ }
        }
        return reply(`✅ Broadcast done!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`)
    }

    if (command === 'backup') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        await reply(`📦 Creating backup...`)
        try {
            const tmpPath = path.join(os.tmpdir(), `nick_backup_${Date.now()}.zip`)
            await new Promise((resolve, reject) => {
                const out = fs.createWriteStream(tmpPath)
                const archive = archiver('zip', { zlib: { level: 9 } })
                out.on('close', resolve)
                archive.on('error', reject)
                archive.pipe(out)
                archive.file('./Database/db.json', { name: 'db.json' })
                if (fs.existsSync('./session/creds.json')) {
                    archive.file('./session/creds.json', { name: 'session/creds.json' })
                }
                archive.finalize()
            })
            const buffer = fs.readFileSync(tmpPath)
            fs.unlink(tmpPath, () => {})
            await conn.sendMessage(chat, {
                document: buffer,
                mimetype: 'application/zip',
                fileName: `nick_backup_${new Date().toISOString().slice(0, 10)}.zip`,
                caption: `✅ Backup ready — contains db.json and session credentials.`
            }, { quoted: m })
        } catch (e) {
            return reply(`❌ Backup failed: ${e.message}`)
        }
    }

    if (command === 'stats') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const users = global.db.data.users || {}
        const settings = global.db.data.settings || {}
        const userCount = Object.keys(users).filter(j => !j.includes('@newsletter')).length
        const premiumCount = Object.values(users).filter(u => u.premium).length
        const bannedCount = Object.values(users).filter(u => u.banned).length
        const totalCmds = global.db.data.stats?.totalCommands || 0
        const topUsers = Object.entries(users)
            .filter(([jid]) => !jid.includes('@newsletter'))
            .map(([jid, u]) => ({ jid, cmds: u.commandCount || 0 }))
            .sort((a, b) => b.cmds - a.cmds)
            .slice(0, 3)
            .map((u, i) => `┃❍ ${i + 1}. +${u.jid.split('@')[0]} (${u.cmds} cmds)`)
            .join('\n')
        return reply(
            `╭══〘 *📊 BOT STATS* 〙═⊷\n` +
            `┃❍ *Total Users:* ${userCount}\n` +
            `┃❍ *Premium:* ${premiumCount}\n` +
            `┃❍ *Banned:* ${bannedCount}\n` +
            `┃❍ *Commands Run:* ${totalCmds}\n` +
            `┃\n` +
            `┃ *🏆 Top Users:*\n` +
            (topUsers || '┃❍ No data yet') + `\n` +
            `╰══════════════════⊷`
        )
    }

    if (command === 'ban') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const target = m.quoted?.sender || m.msg?.contextInfo?.mentionedJid?.[0]
        if (!target) return reply(`❌ Reply to a message or mention someone.`)
        if (!global.db.data.users[target]) global.db.data.users[target] = {}
        global.db.data.users[target].banned = true
        await global.db.write()
        return reply(`✅ Banned +${target.split('@')[0]}. They can no longer use Bera AI.`)
    }

    if (command === 'unban') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const target = m.quoted?.sender || m.msg?.contextInfo?.mentionedJid?.[0]
        if (!target) return reply(`❌ Reply to a message or mention someone.`)
        if (global.db.data.users[target]) global.db.data.users[target].banned = false
        await global.db.write()
        return reply(`✅ Unbanned +${target.split('@')[0]}.`)
    }

    if (command === 'premium') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const target = m.quoted?.sender || m.msg?.contextInfo?.mentionedJid?.[0]
        if (!target) return reply(`❌ Reply to a message or mention someone.`)
        if (!global.db.data.users[target]) global.db.data.users[target] = {}
        global.db.data.users[target].premium = true
        global.db.data.users[target].limit = 9999
        await global.db.write()
        return reply(`⭐ +${target.split('@')[0]} is now premium — unlimited access.`)
    }

    if (command === 'depremium') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const target = m.quoted?.sender || m.msg?.contextInfo?.mentionedJid?.[0]
        if (!target) return reply(`❌ Reply to a message or mention someone.`)
        if (global.db.data.users[target]) {
            global.db.data.users[target].premium = false
            global.db.data.users[target].limit = 10
        }
        await global.db.write()
        return reply(`✅ Removed premium from +${target.split('@')[0]}.`)
    }

    if (command === 'autoreply') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const settings = global.db.data.settings
        if (!settings.autoReplies) settings.autoReplies = {}

        if (!text || text === 'list') {
            const all = settings.autoReplies
            const entries = Object.entries(all)
            if (!entries.length) return reply(`📝 No auto-replies set.\n\nUsage:\n${prefix}autoreply <keyword> = <response>\n${prefix}autoreply delete <keyword>`)
            const list = entries.map(([k, v]) => `• *${k}* → ${v}`).join('\n')
            return reply(`📝 *Auto-Replies (${entries.length}):*\n\n${list}`)
        }

        if (text.toLowerCase().startsWith('delete ')) {
            const kw = text.slice(7).trim().toLowerCase()
            if (!settings.autoReplies[kw]) return reply(`❌ No auto-reply for "${kw}"`)
            delete settings.autoReplies[kw]
            await global.db.write()
            return reply(`✅ Deleted auto-reply for "*${kw}*"`)
        }

        if (text.includes('=')) {
            const [keyword, ...responseParts] = text.split('=')
            const kw = keyword.trim().toLowerCase()
            const response = responseParts.join('=').trim()
            if (!kw || !response) return reply(`❌ Usage: ${prefix}autoreply <keyword> = <response>`)
            settings.autoReplies[kw] = response
            await global.db.write()
            return reply(`✅ Auto-reply set:\n*"${kw}"* → ${response}`)
        }

        return reply(`Usage:\n${prefix}autoreply <keyword> = <response>\n${prefix}autoreply delete <keyword>\n${prefix}autoreply list`)
    }

    if (command === 'schedule') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(
            `⏰ *Schedule a message*\n\nUsage: ${prefix}schedule <time> <message>\n\nExamples:\n${prefix}schedule 30s Good morning!\n${prefix}schedule 5m Meeting in 5 minutes!\n${prefix}schedule 2h Time for a break!\n\nView scheduled: ${prefix}schedule list\nCancel: ${prefix}schedule cancel <id>`
        )

        if (text.toLowerCase() === 'list') {
            const schedules = global.db.data.settings.schedules || []
            if (!schedules.length) return reply(`⏰ No scheduled messages.`)
            const list = schedules.map(s => {
                const remaining = Math.max(0, s.runAt - Date.now())
                const mins = Math.round(remaining / 60000)
                return `• [${s.id}] "${s.message.slice(0, 30)}..." in ~${mins}m`
            }).join('\n')
            return reply(`⏰ *Scheduled Messages:*\n\n${list}`)
        }

        if (text.toLowerCase().startsWith('cancel ')) {
            const id = text.slice(7).trim()
            const schedules = global.db.data.settings.schedules || []
            const idx = schedules.findIndex(s => s.id === id)
            if (idx === -1) return reply(`❌ No scheduled message with id "${id}"`)
            schedules.splice(idx, 1)
            global.db.data.settings.schedules = schedules
            await global.db.write()
            return reply(`✅ Cancelled scheduled message ${id}.`)
        }

        const match = text.match(/^(\d+)(s|m|h|d)\s+(.+)/i)
        if (!match) return reply(`❌ Format: ${prefix}schedule <time> <message>\nExamples: 30s, 5m, 2h, 1d`)
        const [, amount, unit, message] = match
        const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit.toLowerCase()] * parseInt(amount)
        if (ms > 86400000 * 7) return reply(`❌ Max schedule time is 7 days.`)

        const id = Math.random().toString(36).slice(2, 7).toUpperCase()
        const runAt = Date.now() + ms
        if (!global.db.data.settings.schedules) global.db.data.settings.schedules = []
        global.db.data.settings.schedules.push({ id, chat, message, runAt, sender })
        await global.db.write()

        setTimeout(async () => {
            try {
                await conn.sendMessage(chat, { text: `⏰ *Scheduled Message:*\n\n${message}` })
                global.db.data.settings.schedules = (global.db.data.settings.schedules || []).filter(s => s.id !== id)
                await global.db.write()
            } catch {}
        }, ms)

        const timeLabel = `${amount}${unit}`
        return reply(`✅ Scheduled! [${id}]\nMessage will send in *${timeLabel}*.\nCancel with: ${prefix}schedule cancel ${id}`)
    }

    if (command === 'noprefix') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const toggle = args[0]?.toLowerCase()
        if (!toggle || !['on', 'off'].includes(toggle)) {
            const current = global.db.data.settings?.noPrefix ? 'ON' : 'OFF'
            return reply(
                `❌ Usage: ${prefix}noprefix on/off\n\n` +
                `Current status: *${current}*\n\n` +
                `When ON, commands work without any prefix.\n` +
                `Example: just type *play Burna Boy* instead of *${prefix}play Burna Boy*`
            )
        }
        global.db.data.settings.noPrefix = toggle === 'on'
        await global.db.write()
        if (toggle === 'on') {
            return reply(
                `✅ *No-prefix mode ON*\n\n` +
                `Commands now work without *${prefix}*\n` +
                `• Type *play Burna Boy* instead of *${prefix}play Burna Boy*\n` +
                `• Type *imagine a lion* instead of *${prefix}imagine a lion*\n` +
                `• Type *menu* instead of *${prefix}menu*\n\n` +
                `_Prefix still works too — both modes active._`
            )
        }
        return reply(`✅ *No-prefix mode OFF*\nPrefix *${prefix}* is required again.`)
    }

    if (command === 'autostatusview' || command === 'statusview') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const toggle = args[0]?.toLowerCase()
        if (!toggle || !['on', 'off'].includes(toggle)) return reply(`❌ Usage: ${prefix}autostatusview on/off`)
        global.db.data.settings.autoStatusView = toggle === 'on'
        await global.db.write()
        return reply(`👁️ Auto status view *${toggle.toUpperCase()}*.\nNick will ${toggle === 'on' ? 'automatically view' : 'no longer view'} all WhatsApp statuses.`)
    }

    if (command === 'autotyping') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const toggle = args[0]?.toLowerCase()
        if (!toggle || !['on', 'off'].includes(toggle)) return reply(`❌ Usage: ${prefix}autotyping on/off`)
        global.db.data.settings.autoTyping = toggle === 'on'
        await global.db.write()
        return reply(`⌨️ Auto typing indicator *${toggle.toUpperCase()}*.\nNick will ${toggle === 'on' ? 'show typing...' : 'no longer show typing...'} while processing commands.`)
    }

    if (command === 'autobio') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const toggle = args[0]?.toLowerCase()
        if (!toggle || !['on', 'off'].includes(toggle)) return reply(`❌ Usage: ${prefix}autobio on/off`)
        global.db.data.settings.autobio = toggle === 'on'
        await global.db.write()
        const bios = global.db.data.settings.bios || []
        if (toggle === 'on' && !bios.length) return reply(`⚠️ Auto-bio turned ON but no bios set.\n\nAdd bios with:\n${prefix}addbio <text>\n\nVariables: {time} {date} {users} {commands} {botname}`)
        return reply(`📝 Auto bio *${toggle.toUpperCase()}*. Rotates every hour.\n\nBios set: ${bios.length}`)
    }

    if (command === 'addbio') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(
            `❌ Usage: ${prefix}addbio <bio text>\n\n` +
            `Variables you can use:\n` +
            `• {time} — current time\n` +
            `• {date} — current date\n` +
            `• {users} — total bot users\n` +
            `• {commands} — total commands run\n` +
            `• {botname} — bot name\n\n` +
            `Example: ${prefix}addbio 🤖 Bera AI | {users} users | {time}`
        )
        if (!global.db.data.settings.bios) global.db.data.settings.bios = []
        if (global.db.data.settings.bios.length >= 10) return reply(`❌ Max 10 bios. Remove some with ${prefix}clearbio <number>`)
        global.db.data.settings.bios.push(text.trim())
        await global.db.write()
        return reply(`✅ Bio added (#${global.db.data.settings.bios.length}):\n_"${text.trim()}"_`)
    }

    if (command === 'setbio') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setbio <bio text>`)
        try {
            await conn.updateProfileStatus(text.trim())
            return reply(`✅ Bio updated to:\n_"${text.trim()}"_`)
        } catch (e) {
            return reply(`❌ Failed: ${e.message}`)
        }
    }

    if (command === 'listbios') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const bios = global.db.data.settings?.bios || []
        const autoOn = global.db.data.settings?.autobio
        if (!bios.length) return reply(`📭 No bios set. Add with ${prefix}addbio <text>`)
        const list = bios.map((b, i) => `${i + 1}. _"${b}"_`).join('\n')
        return reply(`📝 *Auto-Bio List* (${autoOn ? '🟢 ON' : '🔴 OFF'}):\n\n${list}\n\nRotates every hour.`)
    }

    if (command === 'clearbio') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (args[0]) {
            const idx = parseInt(args[0]) - 1
            const bios = global.db.data.settings.bios || []
            if (isNaN(idx) || idx < 0 || idx >= bios.length) return reply(`❌ Invalid number. Use ${prefix}listbios to see the list.`)
            const removed = bios.splice(idx, 1)[0]
            global.db.data.settings.bios = bios
            await global.db.write()
            return reply(`✅ Removed bio #${idx + 1}:\n_"${removed}"_`)
        }
        global.db.data.settings.bios = []
        global.db.data.settings.currentBioIndex = 0
        await global.db.write()
        return reply(`✅ All bios cleared.`)
    }

    if (command === 'cleandb') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const users = global.db.data.users
        const before = Object.keys(users).length
        const kept = {}
        let removed = 0
        for (const [jid, u] of Object.entries(users)) {
            const hasActivity = u.commandCount > 0 || u.premium || u.banned ||
                jid === `${require('../Config').owner.replace(/[^0-9]/g, '')}@s.whatsapp.net`
            if (hasActivity) {
                kept[jid] = u
            } else {
                removed++
            }
        }
        global.db.data.users = kept
        await global.db.write()
        return reply(`🧹 *DB Cleaned*\n\n┃❍ Before: ${before} entries\n┃❍ Removed: ${removed} inactive users\n┃❍ Kept: ${Object.keys(kept).length} active users`)
    }

    if (command === 'listusers') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const users = Object.entries(global.db.data.users || {})
            .filter(([jid]) => !jid.includes('@newsletter'))
        if (!users.length) return reply(`No users yet.`)
        const list = users.slice(0, 30).map(([jid, u]) =>
            `${u.premium ? '⭐' : u.banned ? '🔴' : '👤'} +${jid.split('@')[0]}`
        ).join('\n')
        return reply(`*Users (${users.length} total, showing 30):*\n\n${list}`)
    }

    if (command === 'resetlimit') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const target = m.quoted?.sender || m.msg?.contextInfo?.mentionedJid?.[0]
        if (target) {
            if (!global.db.data.users[target]) return reply(`❌ User not found.`)
            global.db.data.users[target].limit = 10
            global.db.data.users[target].limitReset = ''
            await global.db.write()
            return reply(`✅ Reset limit for +${target.split('@')[0]}`)
        }
        for (const jid of Object.keys(global.db.data.users || {})) {
            global.db.data.users[jid].limit = 10
            global.db.data.users[jid].limitReset = ''
        }
        await global.db.write()
        return reply(`✅ Reset daily limits for all users.`)
    }
    if (command === 'mode') {
        if (!isOwner) return reply('⛔ Owner only.')
        const modeInput = text?.trim().toLowerCase()
        if (!modeInput || !['public','private'].includes(modeInput)) {
            const current = global.db?.data?.settings?.mode || 'public'
            return reply(
                `╭══〘 *⚙️ BOT MODE* 〙═⊷\n` +
                `┃❍ Current: *${current.toUpperCase()}*\n` +
                `┃❍ Usage: .mode public\n` +
                `┃❍         .mode private\n` +
                `┃\n` +
                `┃ 🌐 Public — Everyone can use the bot\n` +
                `┃ 🔒 Private — Only owner can use the bot\n` +
                `╰══════════════════⊷`
            )
        }
        if (!global.db.data.settings) global.db.data.settings = {}
        global.db.data.settings.mode = modeInput
        await global.db.write()
        const icon = modeInput === 'public' ? '🌐' : '🔒'
        return reply(
            `╭══〘 *⚙️ BOT MODE CHANGED* 〙═⊷\n` +
            `┃❍ Mode: *${icon} ${modeInput.toUpperCase()}*\n` +
            `┃❍ ${modeInput === 'public' ? 'Everyone can now use the bot.' : 'Only you (owner) can use the bot now.'}` +
            `\n╰══════════════════⊷`
        )
    }
}

handle.command = ['broadcast', 'backup', 'stats', 'ban', 'unban', 'premium', 'depremium',
    'autoreply', 'schedule', 'listusers', 'resetlimit', 'cleandb', 'mode',
    'autostatusview', 'statusview', 'autotyping', 'autobio',
    'addbio', 'setbio', 'listbios', 'clearbio', 'noprefix']
handle.tags = ['admin']

module.exports = handle
