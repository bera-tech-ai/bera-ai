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

const SEARCH_ENDPOINTS = [
    `${APISKEITH}/search/yts`,
    `${APISKEITH}/search/youtube`,
    `${OSTYADO}/api/search/youtube`
]

const AUDIO_ENDPOINTS = [
    { base: APISKEITH, path: '/download/ytmp3', param: 'url' },
    { base: APISKEITH, path: '/download/dlmp3', param: 'url' },
    { base: OSTYADO,   path: '/api/downloader/mp3', param: 'url' },
    { base: APISKEITH, path: '/download/mp3', param: 'url' },
    { base: APISKEITH, path: '/download/yta', param: 'url' }
]

const VIDEO_ENDPOINTS = [
    { base: APISKEITH, path: '/download/ytmp4', param: 'url' },
    { base: APISKEITH, path: '/download/dlmp4', param: 'url' },
    { base: OSTYADO,   path: '/api/downloader/mp4', param: 'url' },
    { base: APISKEITH, path: '/download/ytv', param: 'url' }
]

const searchYoutube = async (query) => {
    for (const ep of SEARCH_ENDPOINTS) {
        try {
            const res = await axios.get(ep, { params: { query, q: query }, timeout: 15000 })
            const results = res.data?.result || res.data?.results || res.data?.data || res.data
            if (Array.isArray(results) && results.length > 0) {
                return { success: true, results: results.slice(0, 5) }
            }
        } catch { continue }
    }
    return { success: false, error: 'No YouTube results found for that query' }
}

const downloadAudio = async (videoUrl) => {
    for (const ep of AUDIO_ENDPOINTS) {
        try {
            const params = { [ep.param]: videoUrl }
            const res = await axios.get(`${ep.base}${ep.path}`, { params, timeout: 45000 })
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
    return { success: false, error: 'All audio download endpoints failed. Try again later.' }
}

const downloadVideo = async (videoUrl) => {
    for (const ep of VIDEO_ENDPOINTS) {
        try {
            const params = { [ep.param]: videoUrl }
            const res = await axios.get(`${ep.base}${ep.path}`, { params, timeout: 60000 })
            const data = res.data
            if (data?.status === false || data?.success === false) continue
            const videoUrl2 = toUrl(data?.result) || toUrl(data?.url) ||
                toUrl(data?.video) || toUrl(data?.download) || toUrl(data?.mp4)
            if (videoUrl2) {
                const title = data?.result?.title || data?.title || ''
                return { success: true, url: videoUrl2, title }
            }
        } catch { continue }
    }
    return { success: false, error: 'All video download endpoints failed. Try again later.' }
}

const searchAndDownload = async (query) => {
    const search = await searchYoutube(query)
    if (!search.success) return { success: false, error: search.error }

    const top = search.results[0]
    const videoUrl = toUrl(top?.url) || toUrl(top?.link) ||
        (top?.id ? `https://youtube.com/watch?v=${top.id}` : '')

    if (!videoUrl) return { success: false, error: 'Could not extract video URL from search result' }

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

const searchAndDownloadVideo = async (query) => {
    const search = await searchYoutube(query)
    if (!search.success) return { success: false, error: search.error }

    const top = search.results[0]
    const videoUrl = toUrl(top?.url) || toUrl(top?.link) ||
        (top?.id ? `https://youtube.com/watch?v=${top.id}` : '')

    if (!videoUrl) return { success: false, error: 'Could not extract video URL from search result' }

    const dl = await downloadVideo(videoUrl)
    if (!dl.success) return { success: false, error: dl.error }

    const thumbnail = toUrl(top?.thumbnail) || toUrl(top?.image) || toUrl(top?.thumbnails) || ''
    const duration = typeof top?.duration === 'string' ? top.duration
        : (typeof top?.duration?.text === 'string' ? top.duration.text : '')
    const channel = top?.author?.name || top?.channel?.name ||
        (typeof top?.channel === 'string' ? top.channel : '') || top?.channelTitle || ''

    return {
        success: true,
        videoUrl: dl.url,
        title: top?.title || dl.title || query,
        channel: typeof channel === 'string' ? channel : '',
        duration,
        thumbnail
    }
}

module.exports = { searchYoutube, downloadAudio, downloadVideo, searchAndDownload, searchAndDownloadVideo }
