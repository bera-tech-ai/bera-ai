// Plugins/aitools.js — AI-powered text processing tools
// Commands: summarize, explain, improve, proofread, bullet, outline,
//           translate2, compare, define2, synonym, antonym,
//           eli5, rewrite, formal, casual, tweet, caption2,
//           essay, cover, email, reply2, code2eng, eng2code, debugcode,
//           sentiment, keyword, complete, expand

const axios = require('axios')

const handle = {}
handle.command = [
    'summarize', 'summary', 'tldr',
    'explain', 'explainit',
    'improve', 'enhance', 'bettertext',
    'proofread', 'grammar', 'spellcheck',
    'bullet', 'bulletpoints', 'listify',
    'outline', 'structure',
    'eli5', 'simplify',
    'rewrite', 'rephrase', 'paraphrase',
    'formal', 'formalize', 'professional',
    'casual', 'informaltext', 'friendlytext',
    'tweet', 'tweetit', 'totweet',
    'caption2', 'writecaption',
    'essay', 'writeessay',
    'cover', 'coverletter',
    'email', 'writeemail',
    'code2eng', 'codeexplain', 'whatdoesthisdo',
    'eng2code', 'writecodeinjs', 'codewrite',
    'debugcode', 'fixcode', 'whatsthebug',
    'sentiment', 'mood', 'tone',
    'keyword', 'keywords', 'keyphrase',
    'complete', 'autocomplete', 'continue',
    'expand', 'elaborate',
    'synonym', 'syn',
    'antonym', 'ant',
    'acronym',
    'nameai', 'namegenerator',
    'sloganai', 'slogangenerator',
    'bioai', 'writebio',
    'roasttext', 'comedyroast',
]
handle.tags = ['ai', 'writing', 'text', 'tools']
handle.help = [
    'summarize <text/url>  — Summarize content',
    'explain <topic>       — Explain something clearly',
    'improve <text>        — Improve writing quality',
    'proofread <text>      — Fix grammar & spelling',
    'bullet <text>         — Convert to bullet points',
    'eli5 <topic>          — Explain Like I\'m 5',
    'rewrite <text>        — Rephrase the text',
    'formal <text>         — Make text formal/professional',
    'casual <text>         — Make text casual/friendly',
    'tweet <text>          — Write a Twitter/X post',
    'caption2 <desc>       — Write an Instagram caption',
    'essay <topic>         — Write an essay outline',
    'cover <job>           — Write a cover letter',
    'email <topic>         — Write a professional email',
    'code2eng <code>       — Explain code in English',
    'eng2code <desc>       — Write JavaScript code',
    'debugcode <code>      — Find bugs in code',
    'sentiment <text>      — Analyze text sentiment/mood',
    'keyword <text>        — Extract keywords',
    'complete <text>       — Autocomplete the text',
    'expand <text>         — Expand and elaborate text',
    'synonym <word>        — Find synonyms',
    'antonym <word>        — Find antonyms',
    'acronym <letters>     — Generate acronym meaning',
    'nameai <desc>         — Generate brand/app names',
    'sloganai <brand>      — Generate slogans',
    'bioai <info>          — Write a bio',
]

// Chat with Bera's AI using the ChatBera system (fallback to built-in logic)
const askAI = async (prompt) => {
    // First try the bot's own AI endpoint if available
    try {
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
        }, {
            headers: { Authorization: 'Bearer ' + (process.env.OPENAI_API_KEY || '') },
            timeout: 15000
        })
        return res.data?.choices?.[0]?.message?.content?.trim()
    } catch {}

    // Fallback: try free alternatives
    try {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
        }, {
            headers: { Authorization: 'Bearer ' + (process.env.GROQ_API_KEY || '') },
            timeout: 12000
        })
        return res.data?.choices?.[0]?.message?.content?.trim()
    } catch {}

    // Fallback: try pollinations AI (free, no key needed)
    try {
        const encoded = encodeURIComponent(prompt)
        const res = await axios.get('https://text.pollinations.ai/' + encoded, { timeout: 10000 })
        if (typeof res.data === 'string' && res.data.length > 10) return res.data.slice(0, 1000)
    } catch {}

    return null
}

const EMOJI_MAP = {
    summarize: '📋', explain: '🧠', improve: '✨', proofread: '📝',
    bullet: '•', eli5: '👶', rewrite: '🔄', formal: '👔',
    casual: '😊', tweet: '🐦', caption2: '📸', essay: '📄',
    cover: '💼', email: '📧', code2eng: '💻', eng2code: '⌨️',
    debugcode: '🐛', sentiment: '😊', keyword: '🔑', complete: '✅',
    expand: '📖', synonym: '💬', antonym: '🔄', acronym: '🔤',
    nameai: '🏷️', sloganai: '📢', bioai: '👤',
}

const PROMPTS = {
    summarize:   t => 'Summarize this in 3-5 clear sentences:\n\n' + t,
    explain:     t => 'Explain this clearly and concisely:\n\n' + t,
    improve:     t => 'Improve this text to be clearer, more engaging and better written. Return only the improved text:\n\n' + t,
    proofread:   t => 'Fix ALL grammar, spelling and punctuation errors in this text. Return only the corrected text:\n\n' + t,
    bullet:      t => 'Convert this into clear, concise bullet points:\n\n' + t,
    outline:     t => 'Create a structured outline for:\n\n' + t,
    eli5:        t => 'Explain this like I\'m 5 years old, very simply:\n\n' + t,
    rewrite:     t => 'Rephrase/rewrite this completely differently while keeping the same meaning:\n\n' + t,
    formal:      t => 'Rewrite this in formal, professional English:\n\n' + t,
    casual:      t => 'Rewrite this in casual, friendly, conversational English:\n\n' + t,
    tweet:       t => 'Write a compelling Twitter/X post about: ' + t + '\nMake it engaging, include 2-3 relevant hashtags, keep under 280 chars.',
    caption2:    t => 'Write a catchy Instagram caption for: ' + t + '\nInclude 5 relevant hashtags. Make it engaging.',
    essay:       t => 'Write a structured essay outline with intro, 3 body points, and conclusion for:\n\n' + t,
    cover:       t => 'Write a professional 3-paragraph cover letter for a ' + t + ' position.',
    email:       t => 'Write a professional email about:\n\n' + t,
    code2eng:    t => 'Explain what this code does in plain English, step by step:\n\n```\n' + t + '\n```',
    eng2code:    t => 'Write clean JavaScript code for:\n\n' + t + '\n\nOnly return the code, no explanation.',
    debugcode:   t => 'Find and explain any bugs or issues in this code:\n\n```\n' + t + '\n```',
    sentiment:   t => 'Analyze the sentiment and emotional tone of this text. Give: Sentiment (Positive/Negative/Neutral), Emotion, Confidence %, and a brief reason:\n\n' + t,
    keyword:     t => 'Extract the 5-8 most important keywords and key phrases from this text. List them with relevance scores:\n\n' + t,
    complete:    t => 'Continue and complete this text naturally:\n\n' + t,
    expand:      t => 'Expand and elaborate on this text, adding more detail and context:\n\n' + t,
    synonym:     t => 'Give 8-10 synonyms for the word: ' + t,
    antonym:     t => 'Give 5-8 antonyms for the word: ' + t,
    acronym:     t => 'Create a creative acronym meaning for the letters: ' + t.toUpperCase(),
    nameai:      t => 'Generate 8 creative, catchy names for: ' + t + '\nMake them memorable and brandable.',
    sloganai:    t => 'Generate 6 creative, punchy slogans for: ' + t,
    bioai:       t => 'Write a professional, engaging 3-sentence bio based on this info:\n\n' + t,
    roasttext:   t => 'Write a funny, savage but good-natured comedy roast of: ' + t + '\nKeep it playful, not mean-spirited.',
}

handle.all = async (m, { conn, command, args, prefix, reply } = {}) => {
    const chat = m.chat || m.key?.remoteJid
    const text = args.join(' ').trim()

    // Get the message to process (quoted or args)
    let input = text
    if (!input && m.quoted) {
        input = m.quoted.text || m.quoted.body || ''
    }

    // Map aliases to base commands
    const aliasMap = {
        summary: 'summarize', tldr: 'summarize',
        explainit: 'explain',
        enhance: 'improve', bettertext: 'improve',
        grammar: 'proofread', spellcheck: 'proofread',
        bulletpoints: 'bullet', listify: 'bullet',
        structure: 'outline',
        simplify: 'eli5',
        rephrase: 'rewrite', paraphrase: 'rewrite',
        formalize: 'formal', professional: 'formal',
        informaltext: 'casual', friendlytext: 'casual',
        tweetit: 'tweet', totweet: 'tweet',
        writecaption: 'caption2',
        writeessay: 'essay',
        coverletter: 'cover',
        writeemail: 'email',
        codeexplain: 'code2eng', whatdoesthisdo: 'code2eng',
        writecodeinjs: 'eng2code', codewrite: 'eng2code',
        fixcode: 'debugcode', whatsthebug: 'debugcode',
        mood: 'sentiment', tone: 'sentiment',
        keywords: 'keyword', keyphrase: 'keyword',
        autocomplete: 'complete', continue: 'complete',
        elaborate: 'expand',
        syn: 'synonym',
        ant: 'antonym',
        namegenerator: 'nameai',
        slogangenerator: 'sloganai',
        writebio: 'bioai',
        comedyroast: 'roasttext',
    }

    const cmd = aliasMap[command] || command

    if (!PROMPTS[cmd]) return // not our command

    if (!input) {
        const cmdNames = {
            summarize: 'text or URL', explain: 'a topic', improve: 'text',
            proofread: 'text', bullet: 'text', eli5: 'a topic',
            rewrite: 'text', formal: 'text', casual: 'text',
            tweet: 'a topic', caption2: 'a description', essay: 'a topic',
            cover: 'a job title', email: 'a topic', code2eng: 'your code',
            eng2code: 'what to code', debugcode: 'code to debug',
            sentiment: 'text', keyword: 'text', complete: 'text to continue',
            expand: 'text', synonym: 'a word', antonym: 'a word',
            acronym: 'letters', nameai: 'what to name', sloganai: 'a brand',
            bioai: 'your info', roasttext: 'who to roast'
        }
        return reply('❌ Provide ' + (cmdNames[cmd] || 'text') + '.\n\nUsage: ' + prefix + command + ' <' + (cmdNames[cmd] || 'text') + '>\n\nOr quote a message and run ' + prefix + command)
    }

    if (input.length > 3000) return reply('❌ Text too long. Max 3000 characters.')

    await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
    await reply('⏳ Processing with AI...')

    const prompt = PROMPTS[cmd](input)
    const result = await askAI(prompt)

    if (!result) {
        await conn.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {})
        return reply('❌ AI is unavailable right now. Try again later or check if an API key is configured.')
    }

    const emoji = EMOJI_MAP[cmd] || '🤖'
    const title = cmd.charAt(0).toUpperCase() + cmd.slice(1)

    await conn.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {})

    return reply(
        '╭══〘 *' + emoji + ' ' + title + '* 〙═⊷\n' +
        '┃\n' +
        result.split('\n').map(l => '┃ ' + l).join('\n') +
        '\n╰══════════════════⊷'
    )
}

module.exports = handle
