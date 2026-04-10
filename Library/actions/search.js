const axios = require('axios')

const BASE = 'https://apiskeith.top'

const isApiError = (data) => {
    return data?.status === false || data?.success === false || typeof data?.error === 'string'
}

const webSearch = async (query) => {
    try {
        const res = await axios.get(`${BASE}/ai/searchai`, { params: { query }, timeout: 20000 })
        const data = res.data
        if (isApiError(data)) return { success: false, error: 'Search service is busy. Try again in a moment.' }
        const result = data?.result || data?.answer || data?.response
        if (!result || typeof result !== 'string') return { success: false, error: 'No search results returned.' }
        return { success: true, result }
    } catch (e) {
        return { success: false, error: 'Search failed. Try again.' }
    }
}

const braveSearch = async (query) => {
    try {
        const res = await axios.get(`${BASE}/search/brave`, { params: { q: query }, timeout: 15000 })
        const data = res.data
        if (isApiError(data)) return { success: false, error: 'Search service is busy. Try again in a moment.' }
        const results = data?.result || data?.results || data
        if (Array.isArray(results) && results.length) return { success: true, results: results.slice(0, 4) }
        if (typeof data === 'string' && data.length > 10) return { success: true, result: data }
        return { success: false, error: 'No results found.' }
    } catch (e) {
        return { success: false, error: 'Search failed. Try again.' }
    }
}

module.exports = { webSearch, braveSearch }
