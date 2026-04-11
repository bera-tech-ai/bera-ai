const fs = require('fs')
const config = require('../Config')

const HIJACK_DESCS = [
    `😈 This group has been officially acquired by Bera AI — Bera Tech's most dangerous bot. All former admins have been retired. Resistance is futile. 🤖`,
    `⚡ Bera AI has entered the chat and taken full control. This group is now property of Bera Tech. Your admins? Gone. Your freedom? Negotiable. 😂`,
    `🦅 Bera Tech sent Bera AI to handle things. The old admins tried to stop it. They failed. Welcome to the new management. 💼🤖`,
    `🚨 SYSTEM TAKEOVER 🚨 Bera AI (Bera Tech) has assumed full administrative control of this group. All previous admins have been peacefully removed. Have a nice day. 😁`,
    `👑 New boss unlocked: Bera AI by Bera Tech. The former admins have been given a well-deserved vacation. Permanently. 🏖️🤣`,
]

const handle = async (m, { conn, text, reply, prefix, command, sender, chat, isOwner, args }) => {
    const isGroup = m.isGroup
    const react = (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {})

    const isGroupAdmin = async () => {
        try {
            const meta = await conn.groupMetadata(chat)
            const me = (conn.user?.id || '').replace(/:[0-9]+@/, '@')
            const meParticipant = meta.participants.find(p => p.id === me)
            return meParticipant?.admin === 'admin' || meParticipant?.admin === 'superadmin'
        } catch { return false }
    }

    const isSenderAdmin = async () => {
        try {
            const meta = await conn.groupMetadata(chat)
            const p = meta.participants.find(p => p.id === sender)
            return p?.admin === 'admin' || p?.admin === 'superadmin'
        } catch { return false }
    }

    const ownerOrAdmin = async () => {
        if (isOwner) return true
        return isSenderAdmin()
    }

    const botIsAdmin = isGroupAdmin

    const getTarget = () => {
        if (m.quoted?.sender) return m.quoted.sender
        const mention = m.msg?.contextInfo?.mentionedJid?.[0]
        if (mention) return mention
        if (args[0]) {
            const num = args[0].replace(/[^0-9]/g, '')
            if (num.length > 5) return num + '@s.whatsapp.net'
        }
        return null
    }

    // ── KICK ────────────────────────────────────────────────────────────
    if (['kick', 'remove', 'removemember', 'rm'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message, mention, or provide a number.\nUsage: ${prefix}kick @user`)
        await react('⏳')
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'remove')
            await react('✅')
            return reply(`✅ Removed @${target.split('@')[0]} from the group.`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── ADD ─────────────────────────────────────────────────────────────
    if (command === 'add') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        if (!text) return reply(`❌ Usage: ${prefix}add <number>`)
        const num = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        await react('⏳')
        try {
            await conn.groupParticipantsUpdate(chat, [num], 'add')
            await react('✅')
            return reply(`✅ Added ${text.trim()} to the group.`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── PROMOTE ─────────────────────────────────────────────────────────
    if (command === 'promote') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message or mention someone.\nUsage: ${prefix}promote @user`)
        await react('⏳')
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'promote')
            await react('✅')
            return reply(`✅ @${target.split('@')[0]} promoted to admin. 👑`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── DEMOTE ──────────────────────────────────────────────────────────
    if (command === 'demote') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message or mention someone.\nUsage: ${prefix}demote @user`)
        await react('⏳')
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'demote')
            await react('✅')
            return reply(`✅ @${target.split('@')[0]} demoted from admin.`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── GROUP LINK ──────────────────────────────────────────────────────
    if (['grouplink', 'invitelink', 'getlink', 'link'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        try {
            const code = await conn.groupInviteCode(chat)
            return reply(`🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}`)
        } catch (e) { return reply(`❌ Failed: ${e.message}`) }
    }

    // ── REVOKE LINK ─────────────────────────────────────────────────────
    if (command === 'revoke') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        try {
            await conn.groupRevokeInvite(chat)
            const code = await conn.groupInviteCode(chat)
            return reply(`✅ Group link revoked.\n🔗 New link:\nhttps://chat.whatsapp.com/${code}`)
        } catch (e) { return reply(`❌ Failed: ${e.message}`) }
    }

    // ── GROUP NAME ──────────────────────────────────────────────────────
    if (['groupname', 'setgroupname', 'setgname', 'gname'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!text) return reply(`❌ Usage: ${prefix}groupname <new name>`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        await react('⏳')
        try {
            await conn.groupUpdateSubject(chat, text.trim())
            await react('✅')
            return reply(`✅ Group name changed to: *${text.trim()}*`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── GROUP DESC ──────────────────────────────────────────────────────
    if (['groupdesc', 'setgroupdesc', 'setdesc', 'gdesc'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!text) return reply(`❌ Usage: ${prefix}groupdesc <new description>`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        await react('⏳')
        try {
            await conn.groupUpdateDescription(chat, text.trim())
            await react('✅')
            return reply(`✅ Group description updated.`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── SET GROUP ICON ──────────────────────────────────────────────────
    if (['setgpic', 'setgroupicon', 'setgrouppp', 'grouppp'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        const quoted = m.quoted
        if (!quoted || !/image/.test(quoted.mimetype || '')) return reply(`❌ Reply to an image to set it as the group icon.`)
        await react('⏳')
        try {
            const buf = await conn.downloadMediaMessage({ key: quoted.key, message: quoted.message })
            await conn.updateProfilePicture(chat, buf)
            await react('✅')
            return reply(`✅ Group icon updated!`)
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── DELETE MESSAGE ───────────────────────────────────────────────────
    if (['delete', 'del', 'delmsg'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!m.quoted) return reply(`❌ Reply to a message to delete it.\nUsage: ${prefix}delete (reply to message)`)
        try {
            await conn.sendMessage(chat, { delete: { remoteJid: chat, fromMe: false, id: m.quoted.id, participant: m.quoted.sender } })
            return react('✅')
        } catch (e) { return reply(`❌ Failed: ${e.message}`) }
    }

    // ── ANTI-LINK ────────────────────────────────────────────────────────
    if (['antilink', 'nolink'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        const action = text?.toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}antilink on/off`)
        global.db.data.settings[`antilink_${chat}`] = action === 'on'
        await global.db.write()
        return reply(`✅ Anti-link ${action === 'on' ? '*enabled* — invite links will be deleted and user warned' : '*disabled*'}.`)
    }

    // ── WELCOME ──────────────────────────────────────────────────────────
    if (command === 'welcome') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        const action = text?.toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}welcome on/off`)
        global.db.data.settings[`welcome_${chat}`] = action === 'on'
        await global.db.write()
        return reply(`✅ Welcome messages ${action === 'on' ? '*enabled*' : '*disabled*'}.`)
    }

    // ── SET WELCOME MESSAGE ──────────────────────────────────────────────
    if (['setwelcomemsg', 'setwelcome', 'welcomemsg'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!text) return reply(`❌ Usage: ${prefix}setwelcomemsg <message>\nVariables: {name} = member name, {group} = group name`)
        global.db.data.settings[`welcomemsg_${chat}`] = text.trim()
        await global.db.write()
        return reply(`✅ Welcome message set!\nPreview:\n${text.trim().replace('{name}', '@NewMember').replace('{group}', 'This Group')}`)
    }

    // ── TAG ALL ──────────────────────────────────────────────────────────
    if (['tagall', 'everyone', 'all', 'mentionall'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        await react('⏳')
        try {
            const meta = await conn.groupMetadata(chat)
            const members = meta.participants.map(p => p.id)
            const msg = text || '📢 Attention everyone!'
            const mentionText = members.map((id, i) => `${i + 1}. @${id.split('@')[0]}`).join('\n')
            await conn.sendMessage(chat, { text: `${msg}\n\n${mentionText}`, mentions: members }, { quoted: m })
            await react('✅')
        } catch (e) { await react('❌'); return reply(`❌ Failed: ${e.message}`) }
    }

    // ── MUTE GROUP ───────────────────────────────────────────────────────
    if (['mute', 'closegroup', 'lock', 'lockgroup'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        try {
            await conn.groupSettingUpdate(chat, 'announcement')
            return reply(`🔇 Group locked — only admins can send messages.`)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    // ── UNMUTE GROUP ─────────────────────────────────────────────────────
    if (['unmute', 'opengroup', 'unlock', 'unlockgroup'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        try {
            await conn.groupSettingUpdate(chat, 'not_announcement')
            return reply(`🔊 Group unlocked — everyone can send messages.`)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    // ── GROUP SETTINGS (who can change group info) ───────────────────────
    if (['onlyadmins', 'allusers'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        try {
            const setting = command === 'onlyadmins' ? 'locked' : 'unlocked'
            await conn.groupSettingUpdate(chat, setting)
            return reply(command === 'onlyadmins'
                ? `🔒 Only admins can edit group info now.`
                : `🔓 All members can edit group info now.`)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    // ── POLL ─────────────────────────────────────────────────────────────
    if (['poll', 'vote'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!text) return reply(`❌ Usage: ${prefix}poll Question | Option1 | Option2 | Option3`)
        const parts = text.split('|').map(p => p.trim()).filter(Boolean)
        if (parts.length < 3) return reply(`❌ Need at least 2 options.\nUsage: ${prefix}poll Question | Option1 | Option2`)
        const question = parts[0]
        const options = parts.slice(1)
        try {
            await conn.sendMessage(chat, {
                poll: { name: question, values: options, selectableCount: 1 }
            }, { quoted: m })
        } catch (e) { return reply(`❌ Failed to create poll: ${e.message}`) }
    }

    // ── GROUP INFO ───────────────────────────────────────────────────────
    if (['groupinfo', 'ginfo', 'groupstats'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        await react('⏳')
        try {
            const meta = await conn.groupMetadata(chat)
            const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ') || 'none'
            const totalMembers = meta.participants.length
            const adminCount = meta.participants.filter(p => p.admin).length
            await react('✅')
            return reply(
                `╭══〘 *📋 GROUP INFO* 〙═⊷\n` +
                `┃❍ *Name:* ${meta.subject}\n` +
                `┃❍ *Members:* ${totalMembers}\n` +
                `┃❍ *Admins:* ${adminCount}\n` +
                `┃❍ *Admin List:* ${admins}\n` +
                `┃❍ *Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}\n` +
                `┃❍ *Restricted:* ${meta.restrict ? 'Yes (admins only)' : 'No'}\n` +
                `┃❍ *Desc:* ${meta.desc || 'none'}\n` +
                `╰══════════════════⊷`
            )
        } catch (e) { await react('❌'); return reply(`❌ ${e.message}`) }
    }

    // ── LIST ADMINS ──────────────────────────────────────────────────────
    if (['admins', 'listadmins', 'gadmins'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        try {
            const meta = await conn.groupMetadata(chat)
            const admins = meta.participants.filter(p => p.admin)
            if (!admins.length) return reply(`No admins found.`)
            const list = admins.map((p, i) => `${i + 1}. @${p.id.split('@')[0]} ${p.admin === 'superadmin' ? '👑' : '🛡️'}`).join('\n')
            return conn.sendMessage(chat, {
                text: `╭══〘 *👑 GROUP ADMINS* 〙═⊷\n${list}\n╰══════════════════⊷`,
                mentions: admins.map(p => p.id)
            }, { quoted: m })
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    // ── MEMBERS LIST ─────────────────────────────────────────────────────
    if (['members', 'listmembers', 'gmembers'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        await react('⏳')
        try {
            const meta = await conn.groupMetadata(chat)
            const members = meta.participants
            const list = members.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}${p.admin ? ' 🛡️' : ''}`).join('\n')
            await react('✅')
            return conn.sendMessage(chat, {
                text: `╭══〘 *👥 MEMBERS (${members.length})* 〙═⊷\n${list}\n╰══════════════════⊷`,
                mentions: members.map(p => p.id)
            }, { quoted: m })
        } catch (e) { await react('❌'); return reply(`❌ ${e.message}`) }
    }

    // ── LEAVE GROUP ──────────────────────────────────────────────────────
    if (['leave', 'leavegroup'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        await reply(`👋 Leaving group...`)
        try {
            await conn.groupLeave(chat)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    // ── KICK ALL (non-admins) ────────────────────────────────────────────
    if (['kickall', 'cleargroup'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!await botIsAdmin()) return reply(`❌ Bera AI needs to be a group admin first.`)
        await react('⏳')
        try {
            const meta = await conn.groupMetadata(chat)
            const me = (conn.user?.id || '').replace(/:[0-9]+@/, '@')
            const ownerJid = `${config.owner}@s.whatsapp.net`
            const toKick = meta.participants
                .filter(p => !p.admin && p.id !== me && p.id !== ownerJid)
                .map(p => p.id)
            if (!toKick.length) return reply(`No non-admin members to remove.`)
            // Kick in batches of 5
            for (let i = 0; i < toKick.length; i += 5) {
                await conn.groupParticipantsUpdate(chat, toKick.slice(i, i + 5), 'remove')
                await new Promise(r => setTimeout(r, 1000))
            }
            await react('✅')
            return reply(`✅ Removed ${toKick.length} non-admin members.`)
        } catch (e) { await react('❌'); return reply(`❌ ${e.message}`) }
    }

    // ── ANTI-SPAM ────────────────────────────────────────────────────────
    if (['antispam', 'antispamon', 'antispamoff'].includes(command)) {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!await ownerOrAdmin()) return reply(`⛔ Admins only.`)
        let action = text?.toLowerCase()
        if (command === 'antispamon') action = 'on'
        if (command === 'antispamoff') action = 'off'
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}antispam on/off`)
        global.db.data.settings[`antispam_${chat}`] = action === 'on'
        await global.db.write()
        return reply(`✅ Anti-spam ${action === 'on' ? '*enabled* — spammers will be warned then kicked' : '*disabled*'}.`)
    }

    // ── HIJACK ───────────────────────────────────────────────────────────
    if (command === 'hijack') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)

        const meta = await conn.groupMetadata(chat).catch(() => null)
        if (!meta) return reply(`❌ Could not fetch group info.`)

        const meRaw = conn.user?.id || ''
        const meJid = meRaw.replace(/:[0-9]+@/, '@')
        const nickParticipant = meta.participants.find(p => p.id === meJid)
        if (!nickParticipant) return reply(`❌ Bera AI is not even in this group.`)
        if (!nickParticipant.admin) return reply(`❌ Bera AI needs to be admin first. Ask a current admin to promote Bera AI, then run this again.`)

        await reply(`🦅 *Bera AI Takeover initiated...*\n\n⏳ Processing group acquisition...`)

        const results = []
        const otherAdmins = meta.participants.filter(p => p.admin && p.id !== meJid).map(p => p.id)

        if (otherAdmins.length) {
            try {
                await conn.groupParticipantsUpdate(chat, otherAdmins, 'demote')
                results.push(`✅ Demoted ${otherAdmins.length} admin(s)`)
            } catch (e) { results.push(`⚠️ Could not demote some admins: ${e.message}`) }
        } else {
            results.push(`ℹ️ No other admins found`)
        }

        const desc = HIJACK_DESCS[Math.floor(Math.random() * HIJACK_DESCS.length)]
        try {
            await conn.groupUpdateDescription(chat, desc)
            results.push(`✅ Group description updated`)
        } catch (e) { results.push(`⚠️ Description update failed: ${e.message}`) }

        const imgPath = config.botImage || './attached_assets/generated_images/nick_ai_profile_pic.png'
        if (imgPath && fs.existsSync(imgPath)) {
            try {
                const imgBuf = fs.readFileSync(imgPath)
                await conn.updateProfilePicture(chat, imgBuf)
                results.push(`✅ Group icon set to Bera AI`)
            } catch (e) { results.push(`⚠️ Group icon update failed: ${e.message}`) }
        }

        try {
            await conn.groupSettingUpdate(chat, 'announcement')
            results.push(`✅ Group locked — admins only`)
        } catch (e) { results.push(`⚠️ Group lock failed: ${e.message}`) }

        const summary = results.map(r => `┃❍ ${r}`).join('\n')
        return conn.sendMessage(chat, {
            text:
                `╭══〘 *🦅 TAKEOVER COMPLETE* 〙═⊷\n┃\n` +
                `${summary}\n┃\n` +
                `┃ *Bera AI* is now the sole admin.\n` +
                `┃ Powered by *Bera Tech*\n` +
                `╰══════════════════⊷`,
            mentions: otherAdmins
        }, { quoted: m })
    }

    // ── UNHIJACK ─────────────────────────────────────────────────────────
    if (command === 'unhijack') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)

        const results = []
        try {
            await conn.groupSettingUpdate(chat, 'not_announcement')
            results.push(`✅ Group reopened — everyone can message`)
        } catch (e) { results.push(`⚠️ ${e.message}`) }

        const ownerJid = `${config.owner}@s.whatsapp.net`
        try {
            const meta = await conn.groupMetadata(chat)
            const ownerInGroup = meta.participants.find(p => p.id === ownerJid)
            if (ownerInGroup && !ownerInGroup.admin) {
                await conn.groupParticipantsUpdate(chat, [ownerJid], 'promote')
                results.push(`✅ Owner promoted back to admin`)
            } else {
                results.push(`ℹ️ Owner already admin or not in group`)
            }
        } catch (e) { results.push(`⚠️ Owner restore: ${e.message}`) }

        return reply(
            `╭══〘 *🔓 HIJACK REVERSED* 〙═⊷\n` +
            results.map(r => `┃❍ ${r}`).join('\n') + `\n` +
            `╰══════════════════⊷`
        )
    }
}

handle.command = [
    // Kick
    'kick', 'remove', 'removemember', 'rm',
    // Add/promote/demote
    'add', 'promote', 'demote',
    // Links
    'grouplink', 'invitelink', 'getlink', 'link', 'revoke',
    // Group settings
    'groupname', 'setgroupname', 'setgname', 'gname',
    'groupdesc', 'setgroupdesc', 'setdesc', 'gdesc',
    'setgpic', 'setgroupicon', 'setgrouppp', 'grouppp',
    // Delete
    'delete', 'del', 'delmsg',
    // Anti-link
    'antilink', 'nolink',
    // Welcome
    'welcome', 'setwelcomemsg', 'setwelcome', 'welcomemsg',
    // Tag all
    'tagall', 'everyone', 'all', 'mentionall',
    // Mute/unmute
    'mute', 'closegroup', 'lock', 'lockgroup',
    'unmute', 'opengroup', 'unlock', 'unlockgroup',
    // Group settings
    'onlyadmins', 'allusers',
    // Poll
    'poll', 'vote',
    // Info
    'groupinfo', 'ginfo', 'groupstats',
    'admins', 'listadmins', 'gadmins',
    'members', 'listmembers', 'gmembers',
    // Leave/kick all
    'leave', 'leavegroup',
    'kickall', 'cleargroup',
    // Anti-spam
    'antispam', 'antispamon', 'antispamoff',
    // Hijack
    'hijack', 'unhijack',
]
handle.tags = ['group']

module.exports = handle
