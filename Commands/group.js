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

    const ownerOrAdmin = async () => {
        if (isOwner) return true
        try {
            const meta = await conn.groupMetadata(chat)
            const me = (conn.user?.id || '').replace(/:[0-9]+@/, '@')
            const admin = meta.participants.find(p => p.id === me)
            return admin?.admin === 'admin' || admin?.admin === 'superadmin'
        } catch { return false }
    }

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

    if (command === 'kick') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const canAct = await ownerOrAdmin()
        if (!canAct) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message, mention, or provide a number.\nUsage: ${prefix}kick @user`)
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'remove')
            return reply(`✅ Kicked successfully.`)
        } catch (e) { return reply(`❌ Failed to kick: ${e.message}`) }
    }

    if (command === 'add') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const canAct = await ownerOrAdmin()
        if (!canAct) return reply(`❌ Bera AI needs to be a group admin first.`)
        if (!text) return reply(`❌ Usage: ${prefix}add <number>`)
        const num = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        try {
            await conn.groupParticipantsUpdate(chat, [num], 'add')
            return reply(`✅ Added ${text.trim()} to the group.`)
        } catch (e) { return reply(`❌ Failed to add: ${e.message}`) }
    }

    if (command === 'promote') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const canAct = await ownerOrAdmin()
        if (!canAct) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message or mention someone.\nUsage: ${prefix}promote @user`)
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'promote')
            return reply(`✅ Promoted to admin.`)
        } catch (e) { return reply(`❌ Failed to promote: ${e.message}`) }
    }

    if (command === 'demote') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const canAct = await ownerOrAdmin()
        if (!canAct) return reply(`❌ Bera AI needs to be a group admin first.`)
        const target = getTarget()
        if (!target) return reply(`❌ Reply to a message or mention someone.\nUsage: ${prefix}demote @user`)
        try {
            await conn.groupParticipantsUpdate(chat, [target], 'demote')
            return reply(`✅ Demoted from admin.`)
        } catch (e) { return reply(`❌ Failed to demote: ${e.message}`) }
    }

    if (command === 'grouplink') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        try {
            const code = await conn.groupInviteCode(chat)
            return reply(`🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}`)
        } catch (e) { return reply(`❌ Failed to get group link: ${e.message}`) }
    }

    if (command === 'revoke') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        try {
            await conn.groupRevokeInvite(chat)
            const code = await conn.groupInviteCode(chat)
            return reply(`✅ Group link revoked.\n🔗 New link:\nhttps://chat.whatsapp.com/${code}`)
        } catch (e) { return reply(`❌ Failed to revoke: ${e.message}`) }
    }

    if (command === 'groupname') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}groupname <new name>`)
        try {
            await conn.groupUpdateSubject(chat, text.trim())
            return reply(`✅ Group name changed to: *${text.trim()}*`)
        } catch (e) { return reply(`❌ Failed to update name: ${e.message}`) }
    }

    if (command === 'groupdesc') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`❌ Usage: ${prefix}groupdesc <new description>`)
        try {
            await conn.groupUpdateDescription(chat, text.trim())
            return reply(`✅ Group description updated.`)
        } catch (e) { return reply(`❌ Failed to update description: ${e.message}`) }
    }

    if (command === 'antilink') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const action = text?.toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}antilink on/off`)
        global.db.data.settings[`antilink_${chat}`] = action === 'on'
        await global.db.write()
        return reply(`✅ Anti-link ${action === 'on' ? '*enabled* — invite links will be deleted' : '*disabled*'}.`)
    }

    if (command === 'welcome') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        const action = text?.toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}welcome on/off`)
        global.db.data.settings[`welcome_${chat}`] = action === 'on'
        await global.db.write()
        return reply(`✅ Welcome messages ${action === 'on' ? '*enabled*' : '*disabled*'}.`)
    }

    if (command === 'tagall') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        try {
            const meta = await conn.groupMetadata(chat)
            const members = meta.participants.map(p => p.id)
            const msg = text || '📢 Attention everyone!'
            const mentionText = members
                .map((id, i) => `${i + 1}. @${id.split('@')[0]}`)
                .join('\n')
            return conn.sendMessage(chat, {
                text: `${msg}\n\n${mentionText}`,
                mentions: members
            }, { quoted: m })
        } catch (e) { return reply(`❌ Failed: ${e.message}`) }
    }

    if (command === 'mute') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        try {
            await conn.groupSettingUpdate(chat, 'announcement')
            return reply(`🔇 Group muted — only admins can send messages.`)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    if (command === 'unmute') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)
        try {
            await conn.groupSettingUpdate(chat, 'not_announcement')
            return reply(`🔊 Group unmuted — everyone can send messages.`)
        } catch (e) { return reply(`❌ ${e.message}`) }
    }

    if (command === 'hijack') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)

        const meta = await conn.groupMetadata(chat).catch(() => null)
        if (!meta) return reply(`❌ Could not fetch group info.`)

        const meRaw = conn.user?.id || ''
        const meJid = meRaw.replace(/:[0-9]+@/, '@')

        // Check Bera AI is already admin
        const nickParticipant = meta.participants.find(p => p.id === meJid)
        if (!nickParticipant) return reply(`❌ Bera AI is not even in this group.`)
        if (!nickParticipant.admin) return reply(`❌ Bera AI needs to be admin first. Ask a current admin to promote Bera AI, then run this again.`)

        await reply(`🦅 *Bera AI Takeover initiated...*\n\n⏳ Processing group acquisition...`)

        const results = []

        // Step 1: Demote all other admins
        const otherAdmins = meta.participants.filter(p =>
            p.admin && p.id !== meJid
        ).map(p => p.id)

        if (otherAdmins.length) {
            try {
                await conn.groupParticipantsUpdate(chat, otherAdmins, 'demote')
                results.push(`✅ Demoted ${otherAdmins.length} admin(s)`)
            } catch (e) {
                results.push(`⚠️ Could not demote some admins: ${e.message}`)
            }
        } else {
            results.push(`ℹ️ No other admins found`)
        }

        // Step 2: Set humorous description
        const desc = HIJACK_DESCS[Math.floor(Math.random() * HIJACK_DESCS.length)]
        try {
            await conn.groupUpdateDescription(chat, desc)
            results.push(`✅ Group description updated`)
        } catch (e) {
            results.push(`⚠️ Description update failed: ${e.message}`)
        }

        // Step 3: Set group image to bot's profile picture
        const imgPath = config.botImage || './attached_assets/generated_images/nick_ai_profile_pic.png'
        if (imgPath && fs.existsSync(imgPath)) {
            try {
                const imgBuf = fs.readFileSync(imgPath)
                await conn.updateProfilePicture(chat, imgBuf)
                results.push(`✅ Group icon set to Bera AI`)
            } catch (e) {
                results.push(`⚠️ Group icon update failed: ${e.message}`)
            }
        } else {
            results.push(`ℹ️ No bot image configured — group icon unchanged`)
        }

        // Step 4: Lock group to admins only
        try {
            await conn.groupSettingUpdate(chat, 'announcement')
            results.push(`✅ Group locked — admins only`)
        } catch (e) {
            results.push(`⚠️ Group lock failed: ${e.message}`)
        }

        const summary = results.map(r => `┃❍ ${r}`).join('\n')
        return conn.sendMessage(chat, {
            text:
                `╭══〘 *🦅 TAKEOVER COMPLETE* 〙═⊷\n` +
                `┃\n` +
                `${summary}\n` +
                `┃\n` +
                `┃ *Bera AI* is now the sole admin.\n` +
                `┃ Powered by *Bera Tech* | Bera Tech\n` +
                `╰══════════════════⊷`,
            mentions: otherAdmins
        }, { quoted: m })
    }

    if (command === 'unhijack') {
        if (!isGroup) return reply(`❌ Group only command.`)
        if (!isOwner) return reply(`⛔ Owner only.`)

        const results = []

        // Restore group to open
        try {
            await conn.groupSettingUpdate(chat, 'not_announcement')
            results.push(`✅ Group reopened — everyone can message`)
        } catch (e) { results.push(`⚠️ ${e.message}`) }

        // Promote the owner back if they are in the group
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

        const summary = results.map(r => `┃❍ ${r}`).join('\n')
        return reply(
            `╭══〘 *🔓 HIJACK REVERSED* 〙═⊷\n` +
            `${summary}\n` +
            `╰══════════════════⊷`
        )
    }

    if (command === 'groupinfo') {
        if (!isGroup) return reply(`❌ Group only command.`)
        try {
            const meta = await conn.groupMetadata(chat)
            const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ')
            return reply(
                `╭══〘 *📋 GROUP INFO* 〙═⊷\n` +
                `┃❍ *Name:* ${meta.subject}\n` +
                `┃❍ *Members:* ${meta.participants.length}\n` +
                `┃❍ *Admins:* ${admins || 'none'}\n` +
                `┃❍ *Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}\n` +
                `┃❍ *Desc:* ${meta.desc || 'none'}\n` +
                `╰══════════════════⊷`
            )
        } catch (e) { return reply(`❌ ${e.message}`) }
    }
}

handle.command = ['kick', 'add', 'promote', 'demote', 'grouplink', 'revoke',
    'groupname', 'groupdesc', 'antilink', 'welcome', 'tagall', 'mute', 'unmute', 'groupinfo',
    'hijack', 'unhijack']
handle.tags = ['group']

module.exports = handle
