const axios = require('axios')

const PANEL       = 'https://lordeagle.tech'
const APP_KEY     = 'ptla_E0B2js1bgA0R8tkVh2eudy0Mzoih9qNILddg9oVCjhx'
const NODE_ID     = 1
const EGG_ID      = 15
const OWNER_JID   = '254116763755'

const pteroApi = axios.create({
    baseURL: `${PANEL}/api/application`,
    headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 30000
})

const pteroClient = (serverKey) => axios.create({
    baseURL: `${PANEL}/api/client`,
    headers: { 'Authorization': `Bearer ${serverKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 20000
})

// ── List all servers ──────────────────────────────────────────────────────────
const listServers = async () => {
    try {
        const r = await pteroApi.get('/servers?include=egg,allocations')
        const servers = r.data?.data || []
        return {
            success: true,
            servers: servers.map(s => ({
                id:      s.attributes.id,
                uuid:    s.attributes.uuid,
                name:    s.attributes.name,
                status:  s.attributes.status || 'running',
                ram:     s.attributes.limits?.memory || 0,
                cpu:     s.attributes.limits?.cpu || 0,
                disk:    s.attributes.limits?.disk || 0,
            }))
        }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Get server info ───────────────────────────────────────────────────────────
const getServer = async (nameOrId) => {
    try {
        const list = await listServers()
        if (!list.success) return list
        const srv = list.servers.find(s =>
            s.name.toLowerCase().includes(nameOrId.toLowerCase()) ||
            String(s.id) === String(nameOrId) ||
            s.uuid.startsWith(nameOrId)
        )
        if (!srv) return { success: false, error: `No server found matching "${nameOrId}"` }
        return { success: true, server: srv }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Server power action (start/stop/restart/kill) ─────────────────────────────
const serverPower = async (serverId, action) => {
    try {
        await pteroApi.post(`/servers/${serverId}/power`, { signal: action })
        return { success: true, output: `Server ${action} signal sent` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Deploy new bot from GitHub repo ──────────────────────────────────────────
const deployBot = async (botName, repoUrl, ownerPhone, ramMB = 512, diskMB = 2048, cpuPercent = 100) => {
    try {
        // 1. Get available allocation
        const allocRes = await pteroApi.get(`/nodes/${NODE_ID}/allocations`)
        const allocs   = allocRes.data?.data || []
        const freeAlloc = allocs.find(a => !a.attributes.assigned)
        if (!freeAlloc) return { success: false, error: 'No free port allocations available on the node' }

        const allocationId = freeAlloc.attributes.id
        const port         = freeAlloc.attributes.port

        // 2. Get or create user (owner)
        let userId
        try {
            const usersRes = await pteroApi.get('/users?filter[email]=' + ownerPhone + '@berahost.com')
            const existing = usersRes.data?.data?.[0]
            if (existing) {
                userId = existing.attributes.id
            } else {
                const newUser = await pteroApi.post('/users', {
                    email:      ownerPhone + '@berahost.com',
                    username:   ownerPhone,
                    first_name: botName,
                    last_name:  'BeraHost',
                    password:   Math.random().toString(36).slice(2, 14) + 'Aa1!'
                })
                userId = newUser.data?.attributes?.id
            }
        } catch {
            userId = 1 // fallback to admin
        }

        // 3. Create server
        const safeName = botName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40)
        const createRes = await pteroApi.post('/servers', {
            name:         safeName,
            user:         userId,
            egg:          EGG_ID,
            docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup:      'if [[ -d .git ]]; then git pull; fi; npm install --production; node index.js',
            environment:  {
                GITHUB_REPO: repoUrl || '',
                BOT_NAME:    botName,
                NODE_ENV:    'production'
            },
            limits: { memory: ramMB, swap: 0, disk: diskMB, io: 500, cpu: cpuPercent },
            feature_limits: { databases: 0, backups: 2, allocations: 1 },
            allocation: { default: allocationId }
        })

        const srv = createRes.data?.attributes
        if (!srv) return { success: false, error: 'Server creation returned no data' }

        return {
            success: true,
            serverId:  srv.id,
            uuid:      srv.uuid,
            name:      srv.name,
            port,
            panel:     PANEL,
            repoUrl,
            message:
                `✅ *${botName}* deployed!\n` +
                `🆔 Server ID: ${srv.id}\n` +
                `🌐 Panel: ${PANEL}\n` +
                `🔌 Port: ${port}\n` +
                `📦 Repo: ${repoUrl || 'none'}\n` +
                `💾 RAM: ${ramMB}MB | CPU: ${cpuPercent}% | Disk: ${diskMB}MB`
        }
    } catch (e) {
        const msg = e.response?.data?.errors?.[0]?.detail || e.message
        return { success: false, error: msg }
    }
}

// ── Delete server ─────────────────────────────────────────────────────────────
const deleteServer = async (serverId) => {
    try {
        await pteroApi.delete(`/servers/${serverId}`)
        return { success: true, output: `Server ${serverId} deleted` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Get server resources (CPU/RAM usage) ──────────────────────────────────────
const serverResources = async (serverUuid) => {
    try {
        const r = await axios.get(`${PANEL}/api/client/servers/${serverUuid}/resources`, {
            headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Accept': 'application/json' },
            timeout: 15000
        })
        const res = r.data?.attributes?.resources || {}
        return {
            success: true,
            cpu:    (res.cpu_absolute || 0).toFixed(1) + '%',
            ram:    ((res.memory_bytes || 0) / 1024 / 1024).toFixed(0) + ' MB',
            disk:   ((res.disk_bytes || 0) / 1024 / 1024).toFixed(0) + ' MB',
            uptime: Math.floor((res.uptime || 0) / 1000 / 60) + ' min',
            state:  r.data?.attributes?.current_state || 'unknown'
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

module.exports = { listServers, getServer, serverPower, deployBot, deleteServer, serverResources, PANEL }
