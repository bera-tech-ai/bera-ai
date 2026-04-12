// Bera AI — Auto Status View & Like Plugin
// Commands: .sv .sl .statusinfo

const handle = async (m, { conn, args, command, prefix, reply, isOwner } = {}) => {
    if (!global.db.data.settings) global.db.data.settings = {}
    const s = global.db.data.settings

    const card = () => {
        const viewOn = s.autoStatusView  || false
        const likeOn = s.autoStatusLike  || false
        const emoji  = s.statusLikeEmoji || '❤️'
        const vBar   = viewOn ? '▓▓▓▓▓▓▓▓▓▓' : '░░░░░░░░░░'
        const lBar   = likeOn ? '▓▓▓▓▓▓▓▓▓▓' : '░░░░░░░░░░'
        return (
            '╭══〘 *📊 STATUS SETTINGS* 〙═⊷\n' +
            '┃\n' +
            '┃  ' + (viewOn ? '🟢' : '🔴') + '  Auto View  [' + vBar + ']\n' +
            '┃  ' + (likeOn ? '🟢' : '🔴') + '  Auto Like  [' + lBar + ']\n' +
            '┃\n' +
            '┃ 👁️ Auto View: *' + (viewOn ? 'ON' : 'OFF') + '*\n' +
            '┃ ❤️  Auto Like: *' + (likeOn ? 'ON' : 'OFF') + '*\n' +
            '┃ 😍 React Emoji: *' + emoji + '*\n' +
            '┃\n' +
            '┃ *' + prefix + 'sv on/off*  —  toggle auto view\n' +
            '┃ *' + prefix + 'sl on/off*  —  toggle auto like\n' +
            '┃ *' + prefix + 'sl 😍*       —  set like emoji\n' +
            '╰══════════════════⊷'
        )
    }

    // .sv / .statusview — toggle auto-view
    if (['sv', 'statusview', 'autoview'].includes(command)) {
        if (!isOwner) return reply('❌ Owner only.')
        const arg = (args[0] || '').toLowerCase()
        const cur = s.autoStatusView || false
        s.autoStatusView = arg === 'on' ? true : arg === 'off' ? false : !cur
        await global.db.write()
        return reply(card())
    }

    // .sl / .statuslike — toggle auto-like, optionally set emoji
    if (['sl', 'statuslike', 'autolike'].includes(command)) {
        if (!isOwner) return reply('❌ Owner only.')
        const arg = (args[0] || '').toLowerCase()
        if (arg === 'on')        { s.autoStatusLike = true }
        else if (arg === 'off')  { s.autoStatusLike = false }
        else if (arg && !/^(on|off)$/.test(arg)) {
            s.statusLikeEmoji = args[0]
            s.autoStatusLike  = true
        } else {
            s.autoStatusLike = !(s.autoStatusLike || false)
        }
        await global.db.write()
        return reply(card())
    }

    // .statusinfo — show current status settings
    if (['statusinfo', 'sstatus', 'statussettings'].includes(command)) {
        if (!isOwner) return reply('❌ Owner only.')
        return reply(card())
    }
}

handle.command = ['sv', 'statusview', 'autoview', 'sl', 'statuslike', 'autolike', 'statusinfo', 'sstatus', 'statussettings']
handle.tags    = ['settings']
module.exports = handle
