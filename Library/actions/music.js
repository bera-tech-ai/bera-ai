const axios = require('axios')

const toUrl = (v) => {
    if (typeof v === 'string' && v.startsWith('http')) return v
    if (v && typeof v === 'object') {
        const inner = v.download || v.url || v.link || v.src || v.uri || v.mp3 ||
            v.hqDefault || v.high || v.medium || v.default
        if (typeof inner === 'string' && inner.startsWith('http')) return inner
        if (Array.isArray(v) && v.length) return toUrl(v[0])
    }
    return ''
}

const APISKEITH = 'https://apiskeith.top'
const OSTYADO = 'https://apis.ostyado.space'

const AUDIO_ENDPOINTS = [
    { base: APISKEITH, path: '/download/ytmp3' },
    { base: APISKEITH, path: '/download/dlmp3' },
    { base: OSTYADO,   path: '/api/downloader/mp3' },
    { base: APISKEITH, path: '/download/mp3' },
    { base: APISKEITH, path: '/download/yta' }
]

const searchYoutube = async (query) => {
    try {
        const res = await axios.get(`https://apiskeith.top/search/yts`, { params: { query }, timeout: 15000 })
        const results = res.data?.result || res.data?.results || res.data
        if (Array.isArray(results) && results.length > 0) return { success: true, results: results.slice(0, 5) }
        return { success: false, error: 'No results found' }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

const downloadAudio = async (videoUrl) => {
    for (const ep of AUDIO_ENDPOINTS) {
        try {
            const res = await axios.get(`${ep.base}${ep.path}`, {
                params: { url: videoUrl },
                timeout: 30000
            })
            const data = res.data
            if (data?.status === false || data?.success === false) continue
            const audioUrl = toUrl(data?.result) || toUrl(data?.url) ||
                toUrl(data?.audio) || toUrl(data?.download) || toUrl(data?.mp3)
            if (audioUrl) {
                const title = data?.result?.title || data?.title || ''
                return { success: true, url: audioUrl, title }
            }
        } catch { continue }
    }
    return { success: false, error: 'All download endpoints failed' }
}

const searchAndDownload = async (query) => {
    const search = await searchYoutube(query)
    if (!search.success) return { success: false, error: search.error }

    const top = search.results[0]
    const videoUrl = toUrl(top?.url) || toUrl(top?.link) ||
        (top?.id ? `https://youtube.com/watch?v=${top.id}` : '')

    if (!videoUrl) return { success: false, error: 'No video URL from search' }

    const dl = await downloadAudio(videoUrl)
    if (!dl.success) return { success: false, error: dl.error }

    const thumbnail = toUrl(top?.thumbnail) || toUrl(top?.image) || toUrl(top?.thumbnails) || ''
    const duration = typeof top?.duration === 'string' ? top.duration
        : (typeof top?.duration?.text === 'string' ? top.duration.text : '')
    const channel = top?.author?.name || top?.channel?.name ||
        (typeof top?.channel === 'string' ? top.channel : '') || top?.channelTitle || ''

    return {
        success: true,
        audioUrl: dl.url,
        title: top?.title || dl.title || query,
        channel: typeof channel === 'string' ? channel : '',
        duration,
        thumbnail
    }
}

module.exports = { searchYoutube, downloadAudio, searchAndDownload }
