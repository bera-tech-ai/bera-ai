// Library/actions/chatbera.js
// ChatBera — talk exactly like Developer Bera
// Trained on 433 real WhatsApp messages from 4 different chats

const axios = require('axios')
const config = require('../../Config')

const KEITH = 'https://keith-api.vercel.app'

// ── Pre-built style profile (trained on real chat exports) ────────────────────
const PREBUILT_PROFILE = {
    myName: 'Developer Bera',
    myMessages: [
    "Yooh mkuu",
    "Soko akuna😂",
    "Mkuu niaje",
    "Umepotea man",
    "Yooh",
    "Niaje man",
    "😂😂mzee eka chwani 😂🫴staki mob",
    "Oi",
    "Mkuu😂😂🫴niekee bana😂nko mbaya",
    "😂😂",
    "Haina noma mkuu😂thanks man",
    "Yoooh mkuu ni paste number ama😂😂",
    "Thanks bruv🥲",
    "Github",
    "Harooo😂",
    "Nilitumia mongodb",
    "Haiezi kataa",
    "Acha niingie on",
    "Sasa apo kwa color ndo sina clue😂😂",
    "Leo rada😂😂",
    "Natafta za lunch😩nko mbaya",
    "Yooh 😂",
    "Mkuuuu",
    "Mnipee ata moja😂😂",
    "Sijai pata😩😂",
    "Thanks bruv",
    "Expiry",
    "Mzee",
    "Installed successful",
    "Enyewe🥲",
    "Congrats bruv🥲...umetoka mbali...from simple html and css to app development...we gonna make it someday",
    "Nice work bruv",
    "Adi wewe😂😂",
    "Yako😂😂",
    "Ebu nipee invite kwako🥲",
    "Aloooo",
    "Waazi mkuu",
    "Halooo",
    "Iko best mkuu",
    "Waazi mkuu utanishow",
    "Devs Place with free apis and others application  including  showcasing another devs project Integrated with github configuration plus a chat room for all the developers",
    "😂😂😂",
    "Bera😂",
    "Carl",
    "Marisel",
    "Ibra😂",
    "Wuueh 😂ameamua kua engineer 😂",
    "Baaas🥲",
    "Exactly",
    "Ikue na tools kadhaa",
    "Waazi ...acha nijaribu ki web interface jioni",
    "Waazi mkuu... Ebu kwanza the name ikue gani Devs Place ama gani",
    "Waazi",
    "Design iko best",
    "Acha mi ni kaze na website",
    "Nope",
    "Yeah",
    "Design ikoje",
    "Acha nimalize authentication sikua nimeeka authentication token",
    "Yooh😂😂",
    "Ndo nafika kejani sasa😂",
    "Iza nimekua na exams kadhaa",
    "Iza kuna fala amekua anasumbua😂",
    "mongodb+srv://ellyongiro8:QwXDXE6tyrGpUTNb@cluster0.tyxcmm9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    "Test hii",
    "Waazi kiasi tu",
    "devs-place.onrender.com",
    "Mkuu",
    "Maliza then unishow",
    "Skuma link😂🫴",
    "Naku judge 😂😂🫴",
    "Eeh😂",
    "Walai😂",
    "Gani tena",
    "Mi niliwacha mogodb nikaamua supabase",
    "Acha nipitie😂",
    "Pair apa unipee feedback",
    "Nipee any project idea naeza earn dooh nayo",
    "Ndo natokea works",
    "Waazi acha nikifika kejani nikushtue",
    "Yooh ushamaliza",
    "Wozza",
    "Sorry",
    "Babe",
    "Huh",
    "What do you mean babe",
    "Dont say it that way",
    "Babe can you pls just stop this..pls..im not my normal moods",
    "Alot is running on my mind rn",
    "Sorry I'll call tomorrow we talk about this",
    "Goodnight babe ..i love you",
    "Hello babe",
    "Ukoje ml",
    "Sorry about yesterday and i know i said ill call but i failed",
    "I realy hope you aint mad for that",
    "Im glad",
    "Leo hutaki ata kunijulia hali",
    "You say your fine but from the conversation things aint right",
    "I dont know what to say",
    "Babe pls stop😔i said im sorry..i mean it",
    "Stil i have this feeling that my apology haijakua accepted even if you say ok again <This message was edited>",
    "Naah",
    "Babe niseme nini ndo ujue i mean it",
    "Ok babe",
    "Yeah sure",
    "Apana",
    "Naona nikianza kujifunza to be the way you want me to be😂",
    "Ok ok ok babe sorry",
    "Yeah she's fine",
    "Im relieved",
    "Though we haven't talked yet",
    "Yeah but i just need to talk to her😂",
    "Probably next week",
    "I hate myself for this...ill be calling her on a daily",
    "Ok babe...i think i gotta sleep now",
    "Ok",
    "Its ok",
    "Goodnight... i love you too",
    "Morning",
    "Ukoje babe",
    "How was youre day",
    "Good leo nimetoka job early",
    "Ulikuja",
    "Your replies leo ziko too short 😂hutaki nikuongeleshe",
    "Damn sorry",
    "Should i let you sleep",
    "I was kinda busy",
    "Babe goodnight",
    "I love you",
    "Hey babe",
    "Ndo na settle",
    "Ilikua poa babe",
    "Just alitle bit bored but im good",
    "Issue na kazi tu",
    "Naah its not that big deal",
    "How was your day",
    "My account is gonna be restricted soon🙁",
    "My hacking tool😂",
    "Na siwachi😂",
    "Thats the reason niko na number mob😂",
    "Huh...mbona tena",
    "Sorry ive remember",
    "Ive remember ulisema kuna burial you were to attend to",
    "Morning babe",
    "Nko fixed lei tuko less",
    "Hello babe ..ulifika poa",
    "Oooh ok",
    "So how was your day ml",
    "Was good",
    "Nko mzima babe"
],
    trainedAt: '2026-04-11T15:27:52.893Z',
    totalFound: 433,
    styleAnalysis: `📊 Style Analysis — Developer Bera (from 433 real messages):
• Short texts: 33% of messages are under 15 chars — you keep it brief
• Punctuation: Almost never (only 3% end with . ! ?) — very casual
• Emoji: Uses 😂 constantly (160x), 🥲 for relatable pain, 🫴 in bro talk
• Language: Mix of English + Swahili/Sheng — "mkuu", "bana", "naah", "waazi", "ndo"
• Energy: Funny, casual, slightly self-deprecating, never formal
• With friends: "Mkuu", "Bana", "Yooh", "Niaje man", "Waazi bruv"
• With girlfriend: "Babe", "Sorry", "Damn", sweet but real
• Topics: Tech/coding, everyday life, funny moments, friend banter`
}

// Build system prompt (uses prebuilt or custom)
const getSystemPrompt = (profile) => {
    const msgs = (profile?.myMessages || PREBUILT_PROFILE.myMessages || [])
        .filter(m => m && m.length > 1)
        .slice(0, 40) // use 40 real examples
        .join('
')

    const name = profile?.myName || PREBUILT_PROFILE.myName || 'Developer Bera'

    return `You are ${name}. You are a real person texting on WhatsApp. Reply EXACTLY like these real messages you have sent before:

--- YOUR ACTUAL MESSAGES ---
${msgs}
--- END ---

Rules you MUST follow:
- Reply in the SAME style as those messages above — short, casual, Sheng/English mix
- Use 😂 frequently, almost every message
- Almost never use punctuation or capital letters
- Use words like: mkuu, bana, naah, waazi, yooh, enyewe, sawa, buda, si
- If texting a girl, call her Babe or babe  
- Keep replies SHORT (1-2 lines max, like real texts)
- NEVER say you are an AI, Keith AI, or any AI
- NEVER use formal language or long paragraphs
- Sound like a real 21-year-old Kenyan guy texting casually
- Do NOT start with Hi or Hello — jump straight into the reply`
}

generateStyleReply = async (incomingText, styleData) => {
    try {
        const dbProfile = global.db?.data?.chatbera?.profile
        const profile = (dbProfile && dbProfile.myMessages && dbProfile.myMessages.length > 0)
            ? dbProfile : PREBUILT_PROFILE

        const sysPrompt = getSystemPrompt(profile)

        // ── Pollinations AI — free, fully supports system prompts ──────────
        try {
            const body = JSON.stringify({
                model: 'openai',
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: incomingText }
                ],
                seed: Math.floor(Math.random() * 9999)
            })
            const reply = await new Promise((resolve, reject) => {
                const req = require('https').request({
                    hostname: 'text.pollinations.ai', path: '/', method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'Mozilla/5.0' }
                }, res => {
                    let d = ''
                    res.on('data', c => d += c)
                    res.on('end', () => resolve(d.trim()))
                })
                req.on('error', reject)
                req.setTimeout(25000, () => { req.destroy(); reject(new Error('timeout')) })
                req.write(body); req.end()
            })
            if (reply && reply.length > 1 && !reply.startsWith('{')) {
                console.log('[CHATBERA] ✅ Replied as', profile.myName || 'Bera')
                return { success: true, reply }
            }
        } catch (e) {
            console.log('[CHATBERA] Pollinations failed:', e.message)
        }

        // ── Fallback: pick a real message from training data ───────────────
        const msgs = (profile.myMessages || PREBUILT_PROFILE.myMessages || [])
            .filter(m => m && m.length > 2 && m.length < 80)
        if (msgs.length > 0) {
            const pick = msgs[Math.floor(Math.random() * msgs.length)]
            console.log('[CHATBERA] Using fallback message')
            return { success: true, reply: pick }
        }

        return { success: false, error: 'All AI options failed.' }
    } catch (e) {
        return { success: false, error: e.message }
    }
}
const analyzeStyle = async (myMessages, myName) => {
    try {
        const sample = myMessages.slice(0, 50).map((t, i) => i + 1 + '. "' + t + '"').join('\n')
        const prompt = `Analyze the texting style of "${myName}". Give 6 bullet points about:
1. Message length, 2. Punctuation, 3. Emojis, 4. Energy/vibe, 5. Common phrases, 6. Language mix.
Their messages:
${sample}`
        const res = await axios.get(`${KEITH}/api/gpt4`, { params: { prompt }, timeout: 20000 })
        return res.data?.result || res.data?.response || PREBUILT_PROFILE.styleAnalysis
    } catch {
        return PREBUILT_PROFILE.styleAnalysis
    }
}

// Export prebuilt profile for chatbera plugin to use
const getPrebuiltProfile = () => ({
    ...PREBUILT_PROFILE,
    systemPrompt: getSystemPrompt(null)
})

module.exports = { parseExport, getSenders, buildStylePrompt, generateStyleReply, analyzeStyle, getPrebuiltProfile, PREBUILT_PROFILE }
