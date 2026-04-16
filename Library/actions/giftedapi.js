const axios = require('axios')

const GT  = 'https://api.giftedtech.co.ke'
const KEY = 'gifted'

const gt = (path, params = {}, opts = {}) =>
    axios.get(`${GT}${path}`, {
        params: { apikey: KEY, ...params },
        timeout: opts.timeout || 30000,
        responseType: opts.binary ? 'arraybuffer' : 'json'
    }).then(r => r.data).catch(e => ({ success: false, error: e.response?.data?.error || e.message }))

// ── AI CHAT ───────────────────────────────────────────────────────────────────
const gtChat = (q, systemPrompt) =>
    gt('/api/ai/ai', systemPrompt ? { q, prompt: systemPrompt } : { q })
        .then(r => r.result || null)

// ── IMAGE GENERATION ──────────────────────────────────────────────────────────
const gtImage = async (prompt) => {
    for (const ep of ['/api/ai/fluximg', '/api/ai/deepimg', '/api/ai/txt2img', '/api/ai/magicstudio']) {
        const r = await gt(ep, { prompt })
        const url = r?.result || r?.url || r?.image
        if (url && String(url).startsWith('http')) return url
    }
    return null
}

// ── TRANSCRIPT ────────────────────────────────────────────────────────────────
const gtTranscript = (url) =>
    gt('/api/ai/transcript', { url }).then(r => r.result || null)

// ── LYRICS ───────────────────────────────────────────────────────────────────
const gtLyrics = (query) =>
    gt('/api/search/lyrics', { query }).then(r => r.result || null)

// ── DEFINE ───────────────────────────────────────────────────────────────────
const gtDefine = (term) =>
    gt('/api/search/define', { term }).then(r => r.result || null)

// ── DICTIONARY ───────────────────────────────────────────────────────────────
const gtDictionary = (word) =>
    gt('/api/search/dictionary', { word }).then(r => r.result || null)

// ── GOOGLE SEARCH ─────────────────────────────────────────────────────────────
const gtGoogle = (query) =>
    gt('/api/search/google', { query }).then(r => r.results || null)

// ── WIKIPEDIA ────────────────────────────────────────────────────────────────
const gtWiki = (title) =>
    gt('/api/search/wikimedia', { title }).then(r => r.results || null)

// ── WEATHER ──────────────────────────────────────────────────────────────────
const gtWeather = async (location) => {
    for (const key of ['city', 'q', 'location', 'query']) {
        const r = await gt('/api/search/weather', { [key]: location })
        if (r?.success !== false && r?.result) return r.result
    }
    return null
}

// ── SPOTIFY SEARCH ────────────────────────────────────────────────────────────
const gtSpotifySearch = (query) =>
    gt('/api/search/spotifysearch', { query }).then(r => r.results || null)

// ── SHAZAM ───────────────────────────────────────────────────────────────────
const gtShazam = (url) =>
    gt('/api/search/shazam', { url }).then(r => r.result || null)

// ── YOUTUBE MP3 ───────────────────────────────────────────────────────────────
const gtYtMp3 = (url) =>
    gt('/api/download/ytmp3', { url }).then(r => r.result || null)

// ── YOUTUBE MP4 ───────────────────────────────────────────────────────────────
const gtYtMp4 = (url, quality = '360p') =>
    gt('/api/download/ytmp4', { url, quality }).then(r => r.result || null)

// ── TIKTOK ───────────────────────────────────────────────────────────────────
const gtTikTok = (url) =>
    gt('/api/download/tiktok', { url }).then(r => r.result || null)

// ── INSTAGRAM ────────────────────────────────────────────────────────────────
const gtInstagram = (url) =>
    gt('/api/download/instadl', { url }).then(r => r.result || null)

// ── TWITTER ──────────────────────────────────────────────────────────────────
const gtTwitter = (url) =>
    gt('/api/download/twitter', { url }).then(r => r.result || null)

// ── SPOTIFY DL ───────────────────────────────────────────────────────────────
const gtSpotifyDl = (url) =>
    gt('/api/download/spotifydl', { url }).then(r => r.result || null)

// ── REMOVE BG ────────────────────────────────────────────────────────────────
const gtRemoveBg = (url) =>
    gt('/api/tools/removebgv2', { url }).then(r => r.result || r.url || null)

// ── CREATE QR ────────────────────────────────────────────────────────────────
const gtCreateQr = (text) =>
    gt('/api/tools/createqr', { url: text }).then(r => r.result || r.url || r.image || null)

// ── READ QR ──────────────────────────────────────────────────────────────────
const gtReadQr = (url) =>
    gt('/api/tools/readqr', { url }).then(r => r.result || null)

// ── SCREENSHOT WEBSITE (returns Buffer) ───────────────────────────────────────
const gtScreenshot = async (url) => {
    try {
        const r = await axios.get(`${GT}/api/tools/ssweb`, {
            params: { apikey: KEY, url },
            responseType: 'arraybuffer',
            timeout: 30000
        })
        return Buffer.from(r.data)
    } catch { return null }
}

// ── OCR ──────────────────────────────────────────────────────────────────────
const gtOcr = (url) =>
    gt('/api/tools/ocr', { url }).then(r => r.result || null)

// ── IMAGE UPSCALER ────────────────────────────────────────────────────────────
const gtUpscale = (url) =>
    gt('/api/tools/imageupscaler', { url, model: 'upscale' }).then(r => r.result || r.url || null)

// ── REMOVE WATERMARK ──────────────────────────────────────────────────────────
const gtRemoveWatermark = (url) =>
    gt('/api/tools/watermarkremover', { url }).then(r => r.result || r.url || null)

// ── FOOTBALL LIVE SCORES ──────────────────────────────────────────────────────
const gtLiveScore = () =>
    gt('/api/football/livescore').then(r => r.result || null)

// ── FOOTBALL PREDICTIONS ──────────────────────────────────────────────────────
const gtPredictions = () =>
    gt('/api/football/predictions').then(r => r.result || null)

// ── LEAGUE STANDINGS ──────────────────────────────────────────────────────────
const GT_LEAGUES = {
    epl: '/api/football/epl/standings',
    laliga: '/api/football/laliga/standings',
    ucl: '/api/football/ucl/standings',
    bundesliga: '/api/football/bundesliga/standings',
    seriea: '/api/football/seriea/standings',
    ligue1: '/api/football/ligue1/standings',
    euros: '/api/football/euros/standings',
}
const gtStandings = (league) =>
    gt(GT_LEAGUES[league] || GT_LEAGUES.epl).then(r => r.result || null)

// ── BIBLE ────────────────────────────────────────────────────────────────────
const gtBible = (verse) =>
    gt('/api/search/bible', { verse }).then(r => r.result || null)

// ── WALLPAPER ────────────────────────────────────────────────────────────────
const gtWallpaper = (query) =>
    gt('/api/search/wallpaper', { query }).then(r => r.results || null)

module.exports = {
    gt, gtChat, gtImage, gtTranscript,
    gtLyrics, gtDefine, gtDictionary,
    gtGoogle, gtWiki, gtWeather,
    gtSpotifySearch, gtShazam,
    gtYtMp3, gtYtMp4, gtTikTok, gtInstagram, gtTwitter, gtSpotifyDl,
    gtRemoveBg, gtCreateQr, gtReadQr, gtScreenshot, gtOcr, gtUpscale, gtRemoveWatermark,
    gtLiveScore, gtPredictions, gtStandings,
    gtBible, gtWallpaper,
    GT_LEAGUES
}
