// Plugins/newpanels.js — Additional interactive button panels
// Commands: aipanel, mediapanel, converterPanel, gamepanel, funpanel, toolspanel,
//           profilepanel, texttoolspanel, statuspanel, grouppanel2, newcmds

const { sendButtons } = require('gifted-btns')

const handle = {}
handle.command = [
    'aipanel', 'aitools', 'aimenu',
    'mediapanel', 'dlpanel', 'downloadpanel',
    'converterpanel', 'convertmenu',
    'gamepanel', 'gamedashboard', 'playgames',
    'funpanel', 'funmenu', 'entertainment',
    'toolspanel', 'utilsmenu', 'utilities',
    'texttoolspanel', 'textmenu',
    'statuspanel', 'statusmenu',
    'grouppanel2', 'grouptools', 'grouputils',
    'newcmds', 'newcommands', 'whatsnew',
    'profilepanel', 'userpanel',
    'helpdesk', 'support',
    'allpanels', 'panellist',
]
handle.tags = ['panel', 'menu', 'buttons', 'ui']
handle.help = [
    'aipanel      — AI tools interactive panel',
    'mediapanel   — Media download button panel',
    'gamepanel    — Games panel (slots, rps, trivia)',
    'funpanel     — Fun commands panel',
    'toolspanel   — Utility tools panel',
    'texttoolspanel — Text manipulation panel',
    'statuspanel  — Status & story tools panel',
    'grouppanel2  — Group management tools panel',
    'profilepanel — User profile tools panel',
    'newcmds      — Show newly added commands',
    'allpanels    — List all available panels',
]

const p_ = global.prefix || '.'

handle.all = async (m, { conn, command, args, prefix, reply, isOwner, isAdmin, isGroup, sender } = {}) => {
    const chat = m.chat || m.key?.remoteJid
    const p    = prefix || p_

    // ── AI PANEL ─────────────────────────────────────────────────────────────
    if (['aipanel','aitools','aimenu'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🧠 AI Tools Panel* 〙═⊷\n' +
            '┃ Bera AI-powered writing & creativity\n' +
            '┃\n' +
            '┃ Use these tools by typing the command\n' +
            '┃ or let Bera Agent do it naturally!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'summarize', text: '📋 Summarize Text' },
                { id: p + 'explain',   text: '🧠 Explain a Topic' },
                { id: p + 'improve',   text: '✨ Improve Writing' },
                { id: p + 'proofread', text: '📝 Proofread Text' },
                { id: p + 'imagine',   text: '🎨 Generate AI Image' },
                { id: p + 'roast',     text: '🔥 Roast Someone' },
                { id: p + 'formal',    text: '👔 Make Text Formal' },
                { id: p + 'eli5',      text: '👶 Explain Like I\'m 5' },
                { id: p + 'tweet',     text: '🐦 Write a Tweet' },
                { id: p + 'caption2',  text: '📸 Write IG Caption' },
            ]
            })
    }

    // ── MEDIA DOWNLOAD PANEL ─────────────────────────────────────────────────
    if (['mediapanel','dlpanel','downloadpanel'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *📥 Media Download Panel* 〙═⊷\n' +
            '┃ Download from any platform!\n' +
            '┃ Just type the command + URL\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'tiktok',    text: '🎵 TikTok Video' },
                { id: p + 'ig',        text: '📸 Instagram Post' },
                { id: p + 'ytv',       text: '▶️ YouTube Video' },
                { id: p + 'tomp3',     text: '🎵 YouTube Audio/MP3' },
                { id: p + 'twitter',   text: '🐦 Twitter/X Video' },
                { id: p + 'spotify',   text: '🎵 Spotify Track' },
                { id: p + 'fb',        text: '📘 Facebook Video' },
                { id: p + 'mediafire', text: '🔥 MediaFire File' },
                { id: p + 'gdrive',    text: '☁️ Google Drive File' },
                { id: p + 'ssweb',     text: '📸 Website Screenshot' },
            ]
            })
    }

    // ── CONVERTER PANEL ──────────────────────────────────────────────────────
    if (['converterpanel','convertmenu'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🔄 Converter Panel* 〙═⊷\n' +
            '┃ Convert media, text, and files!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'toaudio',  text: '🎵 Video → Audio' },
                { id: p + 'toptt',    text: '🎙️ Audio → Voice Note' },
                { id: p + 'togif',    text: '🎥 Video → GIF' },
                { id: p + 'tobinary', text: '💾 Text → Binary' },
                { id: p + 'tobase64', text: '📦 Text → Base64' },
                { id: p + 'base32',   text: '📦 Text → Base32' },
                { id: p + 'morse',    text: '📡 Text → Morse Code' },
                { id: p + 'qr',       text: '📱 Text → QR Code' },
                { id: p + 'tr',       text: '🌐 Translate Text' },
                { id: p + 'ascii',    text: '🎨 Text → ASCII Art' },
            ]
            })
    }

    // ── GAME PANEL ───────────────────────────────────────────────────────────
    if (['gamepanel','gamedashboard','playgames'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🎮 Games Panel* 〙═⊷\n' +
            '┃ Fun games to play in the chat!\n' +
            '┃\n' +
            '┃ Challenge friends & have fun 🎯\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'slots',    text: '🎰 Slot Machine' },
                { id: p + 'rps r',    text: '🪨 Rock Paper Scissors' },
                { id: p + 'ttt',      text: '❌⭕ TicTacToe' },
                { id: p + 'trivia',   text: '🧠 Trivia Quiz' },
                { id: p + 'dice',     text: '🎲 Dice Duel' },
                { id: p + 'coinflip', text: '🪙 Coin Flip' },
                { id: p + 'spinwheel',text: '🎡 Spin the Wheel' },
                { id: p + 'wyr',      text: '🤔 Would You Rather' },
                { id: p + 'truth',    text: '💚 Truth' },
                { id: p + 'dare',     text: '🔴 Dare' },
            ]
            })
    }

    // ── FUN PANEL ────────────────────────────────────────────────────────────
    if (['funpanel','funmenu','entertainment'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *😂 Fun Commands Panel* 〙═⊷\n' +
            '┃ Entertainment & laughs!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'meme',       text: '😂 Random Meme' },
                { id: p + 'joke',       text: '😄 Random Joke' },
                { id: p + 'dadjoke',    text: '👨 Dad Joke' },
                { id: p + 'cat',        text: '🐱 Cat Picture' },
                { id: p + 'dog',        text: '🐶 Dog Picture' },
                { id: p + 'nhie',       text: '🙋 Never Have I Ever' },
                { id: p + 'compliment', text: '💌 Get a Compliment' },
                { id: p + 'roastme',    text: '🔥 Get Roasted' },
                { id: p + 'shower',     text: '🚿 Shower Thought' },
                { id: p + 'confession', text: '🙈 Random Confession' },
            ]
            })
    }

    // ── TOOLS / UTILITY PANEL ────────────────────────────────────────────────
    if (['toolspanel','utilsmenu','utilities'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🔧 Utility Tools Panel* 〙═⊷\n' +
            '┃ Handy tools for everyday use!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'weather',    text: '🌤️ Weather Lookup' },
                { id: p + 'translate',  text: '🌐 Translate Text' },
                { id: p + 'iplookup',   text: '🌍 IP Lookup' },
                { id: p + 'qr',         text: '📱 QR Code Generator' },
                { id: p + 'calc',       text: '🔢 Calculator' },
                { id: p + 'uptime',     text: '⏱️ Bot Uptime' },
                { id: p + 'tempmail',   text: '📧 Temp Email' },
                { id: p + 'tinyurl',    text: '🔗 URL Shortener' },
                { id: p + 'define',     text: '📖 Dictionary' },
                { id: p + 'bmi',        text: '⚖️ BMI Calculator' },
            ]
            })
    }

    // ── TEXT TOOLS PANEL ─────────────────────────────────────────────────────
    if (['texttoolspanel','textmenu'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *📝 Text Tools Panel* 〙═⊷\n' +
            '┃ Transform your text in creative ways!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'bold',           text: '𝗕 Bold Font' },
                { id: p + 'italic',         text: '𝘐 Italic Font' },
                { id: p + 'smallcaps',      text: 'ꜱ Small Caps' },
                { id: p + 'vaporwave',      text: 'ａ Vaporwave/Aesthetic' },
                { id: p + 'reverse',        text: '🔄 Reverse Text' },
                { id: p + 'strikethrough',  text: '~~Strike~~ Through' },
                { id: p + 'clap',           text: '👏 Clap Text' },
                { id: p + 'zalgo',          text: '👾 Zalgo/Glitch' },
                { id: p + 'morse',          text: '📡 Morse Code' },
                { id: p + 'wordcount',      text: '📊 Word Counter' },
            ]
            })
    }

    // ── STATUS PANEL ─────────────────────────────────────────────────────────
    if (['statuspanel','statusmenu'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *📸 Status & Story Panel* 〙═⊷\n' +
            '┃ Auto-like, view, and post status!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'setsl on',       text: '❤️ Auto-Like ON' },
                { id: p + 'setsl off',      text: '💔 Auto-Like OFF' },
                { id: p + 'setsl random',   text: '🎲 Random Emoji Likes' },
                { id: p + 'gcstatus',       text: '📸 Post Group Story' },
                { id: p + 'gcstatuscolor',  text: '🎨 Colored Story' },
                { id: p + 'statustogroup',  text: '📢 Status → This Group' },
                { id: p + 'statustogroups', text: '📡 Status → All Groups' },
                { id: p + 'groupstatusinfo',text: '📖 How Group Status Works' },
            ]
            })
    }

    // ── GROUP TOOLS PANEL 2 ──────────────────────────────────────────────────
    if (['grouppanel2','grouptools','grouputils'].includes(command)) {
        if (!isGroup) return reply('❌ Use this inside a group.')
        return sendButtons(conn, chat, { text: '╭══〘 *👥 Group Tools Panel* 〙═⊷\n' +
            '┃ Advanced group management tools\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'hidetag',    text: '📢 Silent Tag All' },
                { id: p + 'tagall',     text: '📣 Tag All Members' },
                { id: p + 'tagadmins',  text: '👑 Tag Admins' },
                { id: p + 'listadmins', text: '📋 List Admins' },
                { id: p + 'grouplink',  text: '🔗 Get Invite Link' },
                { id: p + 'resetlink',  text: '🔄 Reset Link' },
                { id: p + 'groupstats', text: '📊 Group Statistics' },
                { id: p + 'muteall',    text: '🔇 Mute All' },
                { id: p + 'unmuteall',  text: '🔊 Unmute All' },
                { id: p + 'antilink on',text: '🛡️ Anti-Link ON' },
            ]
            })
    }

    // ── PROFILE PANEL ────────────────────────────────────────────────────────
    if (['profilepanel','userpanel'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *👤 Profile Tools Panel* 〙═⊷\n' +
            '┃ View and manage user information\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'wapfp',    text: '🖼️ Profile Picture' },
                { id: p + 'wacheck',  text: '✅ Check WhatsApp Number' },
                { id: p + 'walink',   text: '🔗 WhatsApp Link' },
                { id: p + 'iplookup', text: '🌍 IP Location Lookup' },
                { id: p + 'age',      text: '🎂 Age Calculator' },
                { id: p + 'bmi',      text: '⚖️ BMI Calculator' },
                { id: p + 'zodiac',   text: '⭐ Horoscope' },
                { id: p + 'bioai',    text: '✍️ Write My Bio (AI)' },
            ]
            })
    }

    // ── HELPDESK / SUPPORT ───────────────────────────────────────────────────
    if (['helpdesk','support'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🆘 Help & Support* 〙═⊷\n' +
            '┃ Need help? Use the buttons below!\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'menu',      text: '📋 Full Command Menu' },
                { id: p + 'quickhelp', text: '⚡ Quick Help' },
                { id: p + 'botinfo',   text: '🤖 Bot Info' },
                { id: p + 'allpanels', text: '🗂️ All Button Panels' },
                { id: p + 'newcmds',   text: '✨ What\'s New?' },
            ]
            })
    }

    // ── WHAT'S NEW ───────────────────────────────────────────────────────────
    if (['newcmds','newcommands','whatsnew'].includes(command)) {
        return reply(
            '╭══〘 *✨ What\'s New in Bera AI?* 〙═⊷\n' +
            '┃\n' +
            '┃ 🆕 *v3.1.0 — New Commands*\n' +
            '┃\n' +
            '┃ ── 📝 Text Tools ──\n' +
            '┃ bold, italic, smallcaps, vaporwave\n' +
            '┃ reverse, strikethrough, clap, zalgo\n' +
            '┃ wordcount, palindrome, hash, rot13\n' +
            '┃ morse, base32, remind, timer\n' +
            '┃\n' +
            '┃ ── 😂 Fun Commands ──\n' +
            '┃ meme, cat, dog, wyr, nhie\n' +
            '┃ dadjoke, slots, rps, compliment\n' +
            '┃ roastme, confession, horoscope\n' +
            '┃ bmi, age, randomnum, spinwheel\n' +
            '┃\n' +
            '┃ ── 🧠 AI Writing Tools ──\n' +
            '┃ summarize, explain, improve\n' +
            '┃ proofread, bullet, eli5, rewrite\n' +
            '┃ formal, casual, tweet, caption2\n' +
            '┃ essay, cover, email, synonym\n' +
            '┃ code2eng, eng2code, debugcode\n' +
            '┃ sentiment, keyword, nameai, bioai\n' +
            '┃\n' +
            '┃ ── 👥 Group Tools ──\n' +
            '┃ hidetag, tagall, tagadmins\n' +
            '┃ grouplink, resetlink, groupstats\n' +
            '┃ antidelete, antilink, antispam\n' +
            '┃ setwelcome, setbye, muteall\n' +
            '┃\n' +
            '┃ ── 🗂️ New Button Panels ──\n' +
            '┃ aipanel, mediapanel, gamepanel\n' +
            '┃ funpanel, toolspanel, texttoolspanel\n' +
            '┃ statuspanel, grouppanel2, profilepanel\n' +
            '┃\n' +
            '┃ ── 📸 Group Status / Stories ──\n' +
            '┃ gcstatus, gcstatuscolor\n' +
            '┃ statustogroup, statustogroups\n' +
            '┃ gstatusall, groupstatusinfo\n' +
            '┃\n' +
            '┃ Total new: *100+ commands* 🚀\n' +
            '╰══════════════════⊷'
        )
    }

    // ── ALL PANELS LIST ──────────────────────────────────────────────────────
    if (['allpanels','panellist'].includes(command)) {
        return sendButtons(conn, chat, { text: '╭══〘 *🗂️ All Button Panels* 〙═⊷\n' +
            '┃ Interactive panels with button UI\n' +
            '┃\n' +
            '┃ Select a panel to open:\n' +
            '╰══════════════════⊷',
            [
                { id: p + 'groupmenu',    text: '👥 Group Control Panel' },
                { id: p + 'adminpanel',   text: '👑 Admin Panel' },
                { id: p + 'memberpanel',  text: '🧑 Member Panel' },
                { id: p + 'aipanel',      text: '🧠 AI Tools Panel' },
                { id: p + 'mediapanel',   text: '📥 Media Download Panel' },
                { id: p + 'gamepanel',    text: '🎮 Games Panel' },
                { id: p + 'funpanel',     text: '😂 Fun Commands Panel' },
                { id: p + 'toolspanel',   text: '🔧 Utility Tools Panel' },
                { id: p + 'texttoolspanel',text: '📝 Text Tools Panel' },
                { id: p + 'statuspanel',  text: '📸 Status Panel' },
                { id: p + 'grouppanel2',  text: '👥 Group Tools Panel' },
                { id: p + 'bhpanel',      text: '☁️ BeraHost Panel' },
                { id: p + 'profilepanel', text: '👤 Profile Panel' },
                { id: p + 'settingspanel',text: '⚙️ Settings Panel' },
            ]
            })
    }
}

module.exports = handle
