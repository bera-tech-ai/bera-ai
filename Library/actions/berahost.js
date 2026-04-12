/**
 * BeraHost Native API client
 * Auth: x-api-key header
 * Scopes: read | write | payments
 */
const axios = require('axios')

// API base — configurable via env, falls back to the documented URL
const BH_API  = (process.env.BERAHOST_API_URL || 'https://kingvon-bot-hosting.replit.app').replace(/\/$/, '') + '/api'
const getKey  = () => global.db?.data?.settings?.bhApiKey || process.env.BH_API_KEY || null

const bh = () => {
    const k = getKey()
    if (!k) throw new Error('NO_BH_KEY')
    return axios.create({
    baseURL: BH_API,
    headers: { 'x-api-key': k, 'Content-Type': 'application/json' },
    timeout: 30000
    })
}

const bhErr = (e) => e.response?.data?.error || e.response?.data?.message || e.message || 'Unknown error'

// ── DEPLOYMENTS ───────────────────────────────────────────────────────────────

const listDeployments = async () => {
    try {
        const r = await bh().get('/deployments')
        const deploys = r.data?.deployments || r.data || []
        return { success: true, deployments: deploys }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const deployBot = async (botId, sessionId, extraEnv = {}) => {
    try {
        const r = await bh().post('/deployments', {
            botId: Number(botId),
            envVars: { ...(sessionId != null ? { SESSION_ID: sessionId } : {}), ...extraEnv }
        })
        const d = r.data
        return { success: true, id: d.id, status: d.status, botId: d.botId, data: d }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getDeployment = async (id) => {
    try {
        const r = await bh().get(`/deployments/${id}`)
        return { success: true, deployment: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const deleteDeployment = async (id) => {
    try {
        await bh().delete(`/deployments/${id}`)
        return { success: true, output: `Deployment ${id} deleted` }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const startDeployment = async (id) => {
    try {
        const r = await bh().post(`/deployments/${id}/start`)
        return { success: true, output: `Deployment ${id} started`, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const stopDeployment = async (id) => {
    try {
        const r = await bh().post(`/deployments/${id}/stop`)
        return { success: true, output: `Deployment ${id} stopped`, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const updateEnv = async (id, envVars) => {
    try {
        const r = await bh().put(`/deployments/${id}/env`, { envVars })
        return { success: true, output: `Env vars updated for deployment ${id}`, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getDeploymentLogs = async (id) => {
    try {
        const r = await bh().get(`/deployments/${id}/logs`)
        const logs = r.data?.logs || r.data || ''
        return { success: true, logs: typeof logs === 'string' ? logs : JSON.stringify(logs) }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const exportLogs = async (id) => {
    try {
        const r = await bh().get('/deployments/' + id + '/logs/export')
        const logs = r.data?.logs || r.data || ''
        return { success: true, logs: typeof logs === 'string' ? logs : JSON.stringify(logs) }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getDeploymentMetrics = async (id) => {
    try {
        const r = await bh().get(`/deployments/${id}/metrics`)
        const m = r.data?.metrics || r.data || {}
        return {
            success: true,
            cpu:    m.cpu    ? (m.cpu * 100).toFixed(1) + '%' : 'N/A',
            ram:    m.memory ? ((m.memory / 1024 / 1024).toFixed(0) + ' MB') : 'N/A',
            uptime: m.uptime ? Math.floor(m.uptime / 60) + ' min' : 'N/A',
            status: m.status || 'unknown',
            data:   m
        }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

// ── POLL until running or failed ──────────────────────────────────────────────
const pollDeployment = async (id, maxWait = 120000, interval = 5000) => {
    const deadline = Date.now() + maxWait
    let status = 'starting'
    while ((status === 'starting' || status === 'installing') && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, interval))
        const d = await getDeployment(id)
        if (!d.success) break
        status = d.deployment?.status || 'unknown'
    }
    return getDeployment(id)
}

// ── COINS ─────────────────────────────────────────────────────────────────────

const getCoins = async () => {
    try {
        const r = await bh().get('/coins/balance')
        return { success: true, balance: r.data?.balance ?? r.data, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getTransactions = async () => {
    try {
        const r = await bh().get('/coins/transactions')
        return { success: true, transactions: r.data?.transactions || r.data || [] }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const claimDailyCoins = async () => {
    try {
        const r = await bh().post('/coins/daily-claim')
        return { success: true, output: r.data?.message || 'Daily coins claimed!', amount: r.data?.amount, balance: r.data?.balance, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const redeemVoucher = async (code) => {
    try {
        const r = await bh().post('/coins/redeem', { code })
        return { success: true, output: r.data?.message || 'Voucher redeemed!', data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

// ── PAYMENTS (M-Pesa) ─────────────────────────────────────────────────────────

const getPlans = async () => {
    try {
        const r = await bh().get('/payments/plans')
        return { success: true, plans: r.data?.plans || r.data || [] }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const initiateMpesa = async (phone, planId, amount) => {
    try {
        const r = await bh().post('/payments/initiate', { phone, planId, amount })
        return { success: true, output: r.data?.message || 'STK push sent!', paymentId: r.data?.id, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getPaymentStatus = async (id) => {
    try {
        const r = await bh().get(`/payments/status/${id}`)
        return { success: true, status: r.data?.status, data: r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getPaymentHistory = async () => {
    try {
        const r = await bh().get('/payments/history')
        return { success: true, history: r.data?.history || r.data || [] }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

// ── BOTS (public list) ────────────────────────────────────────────────────────

const listBots = async () => {
    try {
        const r = await bh().get('/bots')
        return { success: true, bots: r.data?.bots || r.data || [] }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

const getBot = async (id) => {
    try {
        const r = await bh().get(`/bots/${id}`)
        return { success: true, bot: r.data?.bot || r.data }
    } catch (e) { return { success: false, error: bhErr(e) } }
}

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────

const statusEmoji = (s) => {
    const m = { running: '🟢', starting: '🟡', installing: '🔵', stopped: '🔴', failed: '❌', unknown: '⚪' }
    return (m[s] || '⚪') + ' ' + (s || 'unknown')
}

const fmtDeploy = (d) => {
    if (!d) return 'No data'
    return [
        '🆔 ID: ' + d.id,
        '🤖 Bot: ' + (d.botId || d.bot_id || 'N/A'),
        '📊 Status: ' + statusEmoji(d.status),
        d.url  ? '🌐 URL: '  + d.url  : null,
        d.port ? '🔌 Port: ' + d.port : null
    ].filter(Boolean).join('\n')
}

// ── Poll deployment logs for WhatsApp pair code ───────────────────────────────
const pollForPairCode = async (id, maxWait = 180000, interval = 6000) => {
    const pairRegex = /\b([A-Z0-9]{4}[- ]?[A-Z0-9]{4})\b/
    const labelRegex = /(?:pair(?:ing)?\s*code|enter this code|your code)[:\s]+([A-Z0-9 -]{6,12})/i
    const deadline = Date.now() + maxWait
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, interval))
        const logsRes = await getDeploymentLogs(id)
        if (logsRes.success && logsRes.logs) {
            // Try labelled match first ("pairing code: XXXX-XXXX")
            const labelled = logsRes.logs.match(labelRegex)
            if (labelled) return { success: true, code: labelled[1].trim().replace(/\s+/,'-') }
            // Fallback: any standalone 8-char code on its own line
            const lines = logsRes.logs.split('\n')
            for (const line of lines.reverse()) {
                const m = line.match(pairRegex)
                if (m) return { success: true, code: m[1].replace(' ','-') }
            }
        }
    }
    return { success: false, error: 'Pair code not found in logs within timeout. Check .botlogs ' + id }
}

module.exports = {
    BH_API,
    listDeployments, deployBot, getDeployment, deleteDeployment,
    startDeployment, stopDeployment, updateEnv,
    getDeploymentLogs, exportLogs, getDeploymentMetrics, pollDeployment,
    getCoins, getTransactions, claimDailyCoins, redeemVoucher,
    getPlans, initiateMpesa, getPaymentStatus, getPaymentHistory,
    listBots, getBot,
    statusEmoji, fmtDeploy, pollForPairCode
}
