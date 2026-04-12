const axios = require('axios')
const fs    = require('fs')
const path  = require('path')

const PANEL     = 'https://lordeagle.tech'
const APP_KEY   = 'ptla_E0B2js1bgA0R8tkVh2eudy0Mzoih9qNILddg9oVCjhx'
const NODE_ID   = 1
const EGG_ID    = 15
const OWNER_JID = '254116763755'

// Get client key from config (set via .setbhclientkey)
const getClientKey = () => {
    try {
        return global.db?.data?.settings?.bhClientKey || process.env.PTLC_KEY || null
    } catch { return null }
}

const pteroApp = axios.create({
    baseURL: `${PANEL}/api/application`,
    headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 30000
})

const pteroClient = (clientKey) => axios.create({
    baseURL: `${PANEL}/api/client`,
    headers: { 'Authorization': `Bearer ${clientKey || getClientKey()}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 30000
})

// ── List all servers ──────────────────────────────────────────────────────────
const listServers = async () => {
    try {
        const r = await pteroApp.get('/servers?include=egg,allocations&per_page=100')
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
                userId:  s.attributes.user
            }))
        }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Find server by name (fuzzy) ───────────────────────────────────────────────
const findServer = async (nameOrId) => {
    try {
        const list = await listServers()
        if (!list.success) return list
        const q = String(nameOrId).toLowerCase().trim()
        const srv = list.servers.find(s =>
            s.name.toLowerCase() === q ||
            s.name.toLowerCase().includes(q) ||
            String(s.id) === q ||
            s.uuid.startsWith(q)
        )
        if (!srv) return { success: false, error: `No server found matching "${nameOrId}"` }
        return { success: true, server: srv }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// backward-compat alias
const getServer = findServer

// ── Get full server config (vars, startup, etc.) ──────────────────────────────
const getServerConfig = async (nameOrId) => {
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const { id } = found.server

        const r = await pteroApp.get(`/servers/${id}?include=egg,allocations,variables`)
        const attrs = r.data?.attributes || {}
        const vars  = attrs.relationships?.variables?.data || []

        return {
            success:   true,
            id:        attrs.id,
            uuid:      attrs.uuid,
            name:      attrs.name,
            status:    attrs.status || 'running',
            limits:    attrs.limits,
            startup:   attrs.startup,
            environment: Object.fromEntries(vars.map(v => [v.attributes.env_variable, v.attributes.server_value])),
            docker_image: attrs.container?.image || ''
        }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── List servers belonging to a phone number ──────────────────────────────────
const listOwnerServers = async (phone) => {
    try {
        const clean = phone.replace(/\D/g, '')
        const list  = await listServers()
        if (!list.success) return list
        // Try to match by username (phone@berahost.com convention)
        const usersRes = await pteroApp.get(`/users?filter[email]=${clean}@berahost.com`)
        const user     = usersRes.data?.data?.[0]
        if (!user) return { success: false, error: `No BeraHost account found for ${phone}` }
        const uid      = user.attributes.id
        const owned    = list.servers.filter(s => s.userId === uid)
        return { success: true, phone: clean, userId: uid, servers: owned }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Server power action ───────────────────────────────────────────────────────
const serverPower = async (nameOrId, action) => {
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        await pteroApp.post(`/servers/${found.server.id}/power`, { signal: action })
        return { success: true, output: `✅ Server "${found.server.name}" → ${action} signal sent` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Get real-time resource usage ──────────────────────────────────────────────
const serverResources = async (nameOrId, clientKey) => {
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const uuid = found.server.uuid
        const key  = clientKey || getClientKey() || APP_KEY
        const r = await axios.get(`${PANEL}/api/client/servers/${uuid}/resources`, {
            headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
            timeout: 15000
        })
        const res = r.data?.attributes?.resources || {}
        return {
            success: true,
            name:    found.server.name,
            cpu:     (res.cpu_absolute || 0).toFixed(1) + '%',
            ram:     ((res.memory_bytes || 0) / 1024 / 1024).toFixed(0) + ' MB',
            disk:    ((res.disk_bytes || 0) / 1024 / 1024).toFixed(0) + ' MB',
            uptime:  Math.floor((res.uptime || 0) / 1000 / 60) + ' min',
            state:   r.data?.attributes?.current_state || 'unknown'
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Read file from server (needs client key) ──────────────────────────────────
const readServerFile = async (nameOrId, filePath, clientKey) => {
    const key = clientKey || getClientKey()
    if (!key) return { success: false, error: 'No client API key configured. Use .setbhclientkey <key> first.' }
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const uuid = found.server.uuid
        const r = await pteroClient(key).get(`/servers/${uuid}/files/contents`, { params: { file: filePath } })
        return { success: true, name: found.server.name, filePath, content: typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2) }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Write file to server (needs client key) ───────────────────────────────────
const writeServerFile = async (nameOrId, filePath, content, clientKey) => {
    const key = clientKey || getClientKey()
    if (!key) return { success: false, error: 'No client API key. Use .setbhclientkey <key> first.' }
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const uuid = found.server.uuid
        await pteroClient(key).post(`/servers/${uuid}/files/write`, content, {
            params: { file: filePath },
            headers: { 'Content-Type': 'text/plain' }
        })
        return { success: true, output: `✅ Written to ${filePath} on "${found.server.name}"` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── List files on a server ────────────────────────────────────────────────────
const listServerFiles = async (nameOrId, directory = '/', clientKey) => {
    const key = clientKey || getClientKey()
    if (!key) return { success: false, error: 'No client API key. Use .setbhclientkey <key> first.' }
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const uuid = found.server.uuid
        const r = await pteroClient(key).get(`/servers/${uuid}/files/list`, { params: { directory } })
        const files = (r.data?.data || []).map(f => ({
            name:     f.attributes.name,
            size:     (f.attributes.size / 1024).toFixed(1) + ' KB',
            modified: f.attributes.modified_at,
            isDir:    f.attributes.is_directory
        }))
        return { success: true, server: found.server.name, directory, files }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Get live console output from server ───────────────────────────────────────
const getServerLogs = async (nameOrId, clientKey) => {
    const key = clientKey || getClientKey()
    if (!key) return { success: false, error: 'No client API key. Use .setbhclientkey <key> first.' }
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        // Pterodactyl console uses websockets; get recent output from startup/status instead
        const uuid = found.server.uuid
        const r = await pteroClient(key).get(`/servers/${uuid}`)
        const attrs = r.data?.attributes || {}
        return {
            success: true,
            name:    found.server.name,
            output:  `Name: ${attrs.name}\nStatus: ${attrs.status}\nNode: ${attrs.node}\nAllocation: ${attrs.sftp_details?.ip || 'N/A'}:${attrs.sftp_details?.port || ''}`
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Send console command to server ────────────────────────────────────────────
const sendConsoleCommand = async (nameOrId, command, clientKey) => {
    const key = clientKey || getClientKey()
    if (!key) return { success: false, error: 'No client API key. Use .setbhclientkey <key> first.' }
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        const uuid = found.server.uuid
        await pteroClient(key).post(`/servers/${uuid}/command`, { command })
        return { success: true, output: `✅ Command sent to "${found.server.name}": ${command}` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Clone/redeploy a server by name (copies config, creates new server) ───────
const cloneServer = async (sourceName, newOwnerPhone, newName) => {
    try {
        // 1. Get full config of source server
        const cfg = await getServerConfig(sourceName)
        if (!cfg.success) return cfg

        const targetName = newName || cfg.name + '-clone'
        const ownerPhone = String(newOwnerPhone || '').replace(/\D/g, '')

        // 2. Find a free allocation
        const allocRes  = await pteroApp.get(`/nodes/${NODE_ID}/allocations`)
        const allocs    = allocRes.data?.data || []
        const freeAlloc = allocs.find(a => !a.attributes.assigned)
        if (!freeAlloc) return { success: false, error: 'No free port allocations on the node' }

        // 3. Get or create user for the new owner
        let userId = 1
        if (ownerPhone) {
            try {
                const ur = await pteroApp.get(`/users?filter[email]=${ownerPhone}@berahost.com`)
                const ue = ur.data?.data?.[0]
                if (ue) {
                    userId = ue.attributes.id
                } else {
                    const nu = await pteroApp.post('/users', {
                        email: ownerPhone + '@berahost.com', username: ownerPhone,
                        first_name: targetName, last_name: 'BeraHost',
                        password: Math.random().toString(36).slice(2,14) + 'Aa1!'
                    })
                    userId = nu.data?.attributes?.id || 1
                }
            } catch { userId = 1 }
        }

        // 4. Create the new server with source's config
        const env = { ...cfg.environment }
        if (ownerPhone) env.OWNER = ownerPhone

        const safeName  = targetName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40)
        const createRes = await pteroApp.post('/servers', {
            name:  safeName,
            user:  userId,
            egg:   EGG_ID,
            docker_image: cfg.docker_image || 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup: cfg.startup || 'npm install && node index.js',
            environment: env,
            limits:         cfg.limits || { memory: 512, swap: 0, disk: 2048, io: 500, cpu: 100 },
            feature_limits: { databases: 0, backups: 2, allocations: 1 },
            allocation:     { default: freeAlloc.attributes.id }
        })

        const srv  = createRes.data?.attributes
        if (!srv) return { success: false, error: 'Clone creation returned no data' }

        return {
            success: true,
            sourceServer: cfg.name,
            newServer: {
                id:   srv.id,
                uuid: srv.uuid,
                name: srv.name,
                port: freeAlloc.attributes.port
            },
            message:
                `✅ *Cloned from "${cfg.name}"*\n` +
                `🆔 New Server ID: ${srv.id}\n` +
                `📛 Name: ${srv.name}\n` +
                `🔌 Port: ${freeAlloc.attributes.port}\n` +
                `🌐 Panel: ${PANEL}\n` +
                `👤 Owner: ${ownerPhone || 'admin'}\n\n` +
                `⚠️ Session: The new server starts fresh — send your session backup or scan QR.`
        }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Deploy new bot from GitHub repo ──────────────────────────────────────────
const deployBot = async (botName, repoUrl, ownerPhone, ramMB = 512, diskMB = 2048, cpuPercent = 100) => {
    try {
        const allocRes   = await pteroApp.get(`/nodes/${NODE_ID}/allocations`)
        const allocs     = allocRes.data?.data || []
        const freeAlloc  = allocs.find(a => !a.attributes.assigned)
        if (!freeAlloc) return { success: false, error: 'No free port allocations on the node' }

        const allocationId = freeAlloc.attributes.id
        const port         = freeAlloc.attributes.port

        let userId = 1
        const phone = String(ownerPhone || '').replace(/\D/g, '')
        if (phone) {
            try {
                const ur = await pteroApp.get(`/users?filter[email]=${phone}@berahost.com`)
                const ue = ur.data?.data?.[0]
                if (ue) {
                    userId = ue.attributes.id
                } else {
                    const nu = await pteroApp.post('/users', {
                        email: phone + '@berahost.com', username: phone,
                        first_name: botName, last_name: 'BeraHost',
                        password: Math.random().toString(36).slice(2,14) + 'Aa1!'
                    })
                    userId = nu.data?.attributes?.id || 1
                }
            } catch { userId = 1 }
        }

        const safeName  = botName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40)
        const createRes = await pteroApp.post('/servers', {
            name: safeName,
            user: userId,
            egg:  EGG_ID,
            docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup: 'if [[ -d .git ]]; then git pull; fi; npm install --production; node index.js',
            environment: { GITHUB_REPO: repoUrl || '', BOT_NAME: botName, NODE_ENV: 'production', OWNER: phone },
            limits: { memory: ramMB, swap: 0, disk: diskMB, io: 500, cpu: cpuPercent },
            feature_limits: { databases: 0, backups: 2, allocations: 1 },
            allocation: { default: allocationId }
        })

        const srv = createRes.data?.attributes
        if (!srv) return { success: false, error: 'Server creation returned no data' }

        return {
            success: true,
            serverId: srv.id,
            uuid:     srv.uuid,
            name:     srv.name,
            port,
            panel:    PANEL,
            message:
                `✅ *${botName}* deployed!\n` +
                `🆔 Server ID: ${srv.id}\n🌐 Panel: ${PANEL}\n🔌 Port: ${port}\n` +
                `📦 Repo: ${repoUrl || 'none'}\n💾 RAM: ${ramMB}MB | CPU: ${cpuPercent}% | Disk: ${diskMB}MB`
        }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Delete server ─────────────────────────────────────────────────────────────
const deleteServer = async (nameOrId) => {
    try {
        const found = await findServer(nameOrId)
        if (!found.success) return found
        await pteroApp.delete(`/servers/${found.server.id}`)
        return { success: true, output: `✅ Server "${found.server.name}" (ID ${found.server.id}) deleted` }
    } catch (e) {
        return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message }
    }
}

// ── Suspend / unsuspend ───────────────────────────────────────────────────────
const suspendServer = async (nameOrId) => {
    const found = await findServer(nameOrId)
    if (!found.success) return found
    try { await pteroApp.post(`/servers/${found.server.id}/suspend`); return { success: true, output: `Suspended "${found.server.name}"` } }
    catch (e) { return { success: false, error: e.message } }
}
const unsuspendServer = async (nameOrId) => {
    const found = await findServer(nameOrId)
    if (!found.success) return found
    try { await pteroApp.post(`/servers/${found.server.id}/unsuspend`); return { success: true, output: `Unsuspended "${found.server.name}"` } }
    catch (e) { return { success: false, error: e.message } }
}

// ── Reinstall server (fresh start with same config) ───────────────────────────
const reinstallServer = async (nameOrId) => {
    const found = await findServer(nameOrId)
    if (!found.success) return found
    try {
        await pteroApp.post(`/servers/${found.server.id}/reinstall`)
        return { success: true, output: `✅ Reinstalling "${found.server.name}" — this wipes all files and reinstalls from the egg` }
    }
    catch (e) { return { success: false, error: e.message } }
}

// ── Update server resources ───────────────────────────────────────────────────
const updateResources = async (nameOrId, { ramMB, cpuPercent, diskMB } = {}) => {
    const found = await findServer(nameOrId)
    if (!found.success) return found
    try {
        const cur = await pteroApp.get(`/servers/${found.server.id}/build`)
        const b   = cur.data?.attributes || {}
        await pteroApp.patch(`/servers/${found.server.id}/build`, {
            allocation:       b.allocation || b.allocations?.default,
            memory:           ramMB        || b.limits?.memory || 512,
            disk:             diskMB       || b.limits?.disk   || 2048,
            cpu:              cpuPercent   || b.limits?.cpu    || 100,
            io:               b.limits?.io  || 500,
            swap:             0,
            feature_limits:   b.feature_limits || { databases: 0, backups: 2, allocations: 1 }
        })
        return { success: true, output: `✅ Resources updated for "${found.server.name}"` }
    } catch (e) { return { success: false, error: e.response?.data?.errors?.[0]?.detail || e.message } }
}

module.exports = {
    listServers, findServer, getServer, getServerConfig,
    listOwnerServers, serverPower, serverResources,
    readServerFile, writeServerFile, listServerFiles,
    getServerLogs, sendConsoleCommand,
    cloneServer, deployBot, deleteServer,
    suspendServer, unsuspendServer, reinstallServer, updateResources,
    PANEL
}
