const axios = require('axios')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// ── Pollinations AI planner (replaces broken apiskeith.top) ──────────────────
const POLLINATIONS_URL = 'https://text.pollinations.ai/'

const PLAN_PROMPT = `You are Bera AI's action planner. Given a user task, return ONLY a strict JSON plan with no markdown, no explanation.

Available actions:
- shell: run terminal command          → args: { cmd: "..." }
- file_read: read a file               → args: { path: "..." }
- file_write: create/overwrite file    → args: { path: "...", content: "..." }
- js_eval: run JavaScript inline       → args: { code: "..." }
- search: web search                   → args: { query: "..." }
- git_clone: clone a github repo       → args: { url: "...", folder: "..." }
- git_push: commit+push repo           → args: { folder: "...", message: "..." }
- npm_install: install npm packages    → args: { packages: "express axios", cwd: "/path" }
- pm2_start: start process with pm2    → args: { script: "/path/index.js", name: "myapp" }
- pm2_stop: stop pm2 process           → args: { name: "myapp" }
- pm2_restart: restart pm2 process     → args: { name: "myapp" }
- pm2_logs: get pm2 logs               → args: { name: "myapp", lines: 50 }
- pm2_list: list all pm2 processes     → args: {}
- image_gen: generate an image         → args: { prompt: "..." }
- music: play a song                   → args: { query: "..." }
- npm_stats: npm package download stats→ args: { package: "express" }
- github_token: regenerate github token→ args: {}
- create_project: scaffold a new app   → args: { name: "stopwatch", type: "express", port: 3005, description: "..." }

Return ONLY valid JSON — no markdown:
{"plan":"one line summary","steps":[{"action":"shell","args":{"cmd":"ls"},"desc":"List files"}]}

Task: `

const SUMMARY_PROMPT = `You are Bera AI — a smart, helpful assistant. You just completed a task for the user. 
Summarize what was done in a clear, direct message. Use bullet points for multiple results. Be concise and specific.

Task: {task}
Steps executed:
{steps}

Reply naturally and helpfully:`

// ── Pollinations AI call ──────────────────────────────────────────────────────
const callPollinations = async (systemPrompt, userMsg, model = 'openai') => {
    try {
        const res = await axios.post(POLLINATIONS_URL, {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMsg }
            ],
            seed: Math.floor(Math.random() * 9999)
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://bera-ai.app',
                'Origin': 'https://bera-ai.app'
            },
            timeout: 45000,
            responseType: 'text'
        })
        return { success: true, text: typeof res.data === 'string' ? res.data.trim() : JSON.stringify(res.data) }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Shell executor ────────────────────────────────────────────────────────────
const runShell = (cmd, timeout = 30000) => new Promise(resolve => {
    exec(cmd, { timeout, maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
        const out = (stdout || '').trim() + (stderr ? '\n[stderr]: ' + stderr.trim() : '')
        resolve({ success: !err, output: out.slice(0, 3000) || (err ? err.message : 'done') })
    })
})

// ── NPM stats fetcher ─────────────────────────────────────────────────────────
const npmStats = async (pkg) => {
    try {
        const [weekly, monthly, info] = await Promise.all([
            axios.get(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`, { timeout: 10000 }),
            axios.get(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`, { timeout: 10000 }),
            axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, { timeout: 10000 })
        ])
        const latest = info.data['dist-tags']?.latest || 'unknown'
        const desc   = info.data.description || ''
        const author = info.data.author?.name || info.data.maintainers?.[0]?.name || 'unknown'
        return {
            success: true,
            pkg,
            weekly: weekly.data.downloads?.toLocaleString() || '0',
            monthly: monthly.data.downloads?.toLocaleString() || '0',
            version: latest,
            description: desc,
            author
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Group member resolver ─────────────────────────────────────────────────────
const resolveGroupMember = async (conn, chat, jidOrName) => {
    try {
        const meta = await conn.groupMetadata(chat)
        const participants = meta.participants || []
        // Match by JID or name (case-insensitive)
        const search = jidOrName.replace(/[@+]/g, '').toLowerCase()
        let found = participants.find(p =>
            p.id.replace(/@.+/, '').includes(search) ||
            (p.pushName || '').toLowerCase().includes(search)
        )
        if (!found) return { success: false, error: 'Member not found in this group' }
        return {
            success: true,
            jid: found.id,
            phone: found.id.replace(/@.+/, ''),
            name: found.pushName || 'Unknown',
            isAdmin: found.admin === 'admin' || found.admin === 'superadmin',
            isSuperAdmin: found.admin === 'superadmin'
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Project creator + PM2 launcher ────────────────────────────────────────────
const createProject = async (name, type = 'express', port = 3000, description = '') => {
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    const projDir  = `/tmp/projects/${safeName}`

    const steps = []
    // 1. Create dir
    let r = await runShell(`mkdir -p ${projDir}`)
    steps.push({ step: 'mkdir', ok: r.success, out: r.output })

    // 2. Create package.json
    const pkg = JSON.stringify({ name: safeName, version: '1.0.0', description, main: 'index.js', scripts: { start: 'node index.js' }, dependencies: { express: '*' } }, null, 2)
    fs.writeFileSync(`${projDir}/package.json`, pkg)
    steps.push({ step: 'package.json', ok: true, out: 'created' })

    // 3. Create main file based on type
    let mainCode = ''
    if (type === 'express' || type === 'web') {
        mainCode = `const express = require('express')
const app = express()
const PORT = ${port}

app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send(\`<!DOCTYPE html>
<html><head><title>${name}</title>
<style>
  body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#1a1a2e; color:#eee; }
  h1 { color:#e94560; }
  #display { font-size:4rem; font-weight:bold; color:#0f3460; background:#e94560; padding:20px 40px; border-radius:12px; margin:20px; }
  button { padding:12px 30px; margin:8px; border:none; border-radius:8px; font-size:1rem; cursor:pointer; background:#0f3460; color:#fff; }
  button:hover { background:#e94560; }
</style></head>
<body>
<h1>${name}</h1>
<div id="display">00:00:00</div>
<div>
  <button onclick="start()">Start</button>
  <button onclick="pause()">Pause</button>
  <button onclick="reset()">Reset</button>
</div>
<script>
  let t=0,running=false,interval;
  function fmt(n){return String(n).padStart(2,'0')}
  function tick(){t++;const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;document.getElementById('display').textContent=fmt(h)+':'+fmt(m)+':'+fmt(s)}
  function start(){if(!running){running=true;interval=setInterval(tick,1000)}}
  function pause(){running=false;clearInterval(interval)}
  function reset(){running=false;clearInterval(interval);t=0;document.getElementById('display').textContent='00:00:00'}
<\/script>
</body></html>\`)
})

app.listen(PORT, () => console.log(\`${name} running on port \${PORT}\`))
`
    } else {
        mainCode = `// ${name} — ${description || type}\nconst express = require('express')\nconst app = express()\napp.use(express.json())\napp.get('/', (req, res) => res.send('<h1>${name}</h1><p>${description}</p>'))\napp.listen(${port}, () => console.log('${name} on port ${port}'))\n`
    }
    fs.writeFileSync(`${projDir}/index.js`, mainCode)
    steps.push({ step: 'index.js', ok: true, out: 'created' })

    // 4. npm install
    r = await runShell(`cd ${projDir} && npm install --loglevel=error`, 60000)
    steps.push({ step: 'npm install', ok: r.success, out: r.output.slice(0, 200) })

    // 5. Start with pm2
    r = await runShell(`pm2 delete ${safeName} 2>/dev/null; pm2 start ${projDir}/index.js --name ${safeName}`)
    steps.push({ step: 'pm2 start', ok: r.success, out: r.output.slice(0, 300) })

    // 6. Get status
    const status = await runShell(`pm2 show ${safeName} | grep -E "status|uptime|restart|cpu|memory" | head -6`)
    steps.push({ step: 'pm2 status', ok: true, out: status.output })

    return { success: true, name: safeName, dir: projDir, port, steps }
}

// ── PM2 manager ───────────────────────────────────────────────────────────────
const pm2Manage = async (action, name) => {
    const cmds = {
        list:    'pm2 list',
        logs:    `pm2 logs ${name || ''} --lines 50 --nostream 2>&1 | tail -50`,
        start:   `pm2 start ${name}`,
        stop:    `pm2 stop ${name}`,
        restart: `pm2 restart ${name}`,
        delete:  `pm2 delete ${name}`,
        status:  `pm2 show ${name}`,
        save:    'pm2 save'
    }
    const cmd = cmds[action] || cmds.list
    return runShell(cmd, 20000)
}

// ── GitHub token regenerator ──────────────────────────────────────────────────
const githubTokenRegen = async (tokenInDB) => {
    try {
        const ghToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || tokenInDB
        if (!ghToken) return { success: false, error: 'No GitHub token configured' }

        // Get current user info
        const meRes = await axios.get('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${ghToken}`, 'User-Agent': 'Bera-AI' },
            timeout: 10000
        })
        const username = meRes.data.login

        // Create new token via GitHub API fine-grained PAT (v2021 approach)
        // Note: GitHub API doesn't support creating PATs via API directly (only OAuth apps)
        // Instead we show the user where to do it
        return {
            success: true,
            username,
            message: `Token is valid for *${username}*.\n\nTo generate a new GitHub token:\n1. Go to: https://github.com/settings/tokens/new\n2. Set expiry, select repo/workflow scopes\n3. Click Generate token\n4. Use *.setgithub <token>* to update it`,
            canAutoCreate: false
        }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── Agent planner (Pollinations AI) ──────────────────────────────────────────
const planTask = async (task) => {
    try {
        const result = await callPollinations('', PLAN_PROMPT + task)
        if (!result.success) return { success: false, error: result.error }
        const raw = result.text
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return { success: false, error: 'Could not parse plan from AI' }
        const plan = JSON.parse(jsonMatch[0])
        if (!plan.steps || !Array.isArray(plan.steps)) return { success: false, error: 'Invalid plan structure' }
        return { success: true, plan }
    } catch (e) {
        return { success: false, error: 'Plan failed: ' + e.message }
    }
}

// ── Step executor ─────────────────────────────────────────────────────────────
const executeStep = async (step, conn, chat, m) => {
    const { action, args, desc } = step
    try {
        switch (action) {
            case 'shell':
                return { ...await runShell(args.cmd, 45000), desc }

            case 'file_read': {
                const content = fs.existsSync(args.path) ? fs.readFileSync(args.path, 'utf8').slice(0, 3000) : 'File not found'
                return { success: true, output: content, desc }
            }

            case 'file_write':
                fs.mkdirSync(path.dirname(args.path), { recursive: true })
                fs.writeFileSync(args.path, args.content || '')
                return { success: true, output: `Written: ${args.path}`, desc }

            case 'js_eval': {
                const out = eval(args.code)
                return { success: true, output: String(out ?? 'done'), desc }
            }

            case 'npm_install':
                return { ...await runShell(`cd ${args.cwd || '.'} && npm install ${args.packages || ''} --loglevel=error`, 60000), desc }

            case 'pm2_start':
                return { ...await runShell(`pm2 start ${args.script} --name ${args.name}`), desc }
            case 'pm2_stop':
                return { ...await runShell(`pm2 stop ${args.name}`), desc }
            case 'pm2_restart':
                return { ...await runShell(`pm2 restart ${args.name}`), desc }
            case 'pm2_logs':
                return { ...await runShell(`pm2 logs ${args.name} --lines ${args.lines || 50} --nostream 2>&1 | tail -${args.lines || 50}`), desc }
            case 'pm2_list':
                return { ...await runShell('pm2 list'), desc }

            case 'create_project': {
                const r = await createProject(args.name, args.type || 'express', args.port || 3000, args.description || '')
                const summary = r.steps.map(s => `${s.ok ? '✅' : '❌'} ${s.step}: ${s.out}`).join('\n')
                return { success: r.success, output: `Project *${args.name}* created at ${r.dir}\nPort: ${r.port}\n\n${summary}`, desc }
            }

            case 'git_clone':
                return { ...await runShell(`git clone ${args.url} ${args.folder || ''} 2>&1`, 60000), desc }

            case 'git_push':
                return { ...await runShell(`cd ${args.folder} && git add . && git commit -m "${args.message || 'update'}" && git push 2>&1`, 30000), desc }

            case 'npm_stats': {
                const r = await npmStats(args.package)
                if (!r.success) return { success: false, output: r.error, desc }
                return { success: true, output: `${r.pkg} v${r.version}\nWeekly: ${r.weekly} | Monthly: ${r.monthly}\n${r.description}`, desc }
            }

            case 'github_token': {
                const r = await githubTokenRegen()
                return { success: r.success, output: r.message || r.error, desc }
            }

            case 'search': {
                const searchRes = await axios.get(`https://ddg-api.rasa.gg/search?q=${encodeURIComponent(args.query)}&max_results=3`, { timeout: 15000 })
                const results = searchRes.data?.results || searchRes.data || []
                const text = Array.isArray(results) ? results.slice(0, 3).map(r => `• ${r.title}: ${r.body || r.snippet || ''}`).join('\n') : String(results).slice(0, 500)
                return { success: true, output: text || 'No results', desc }
            }

            default:
                return { success: false, output: `Unknown action: ${action}`, desc }
        }
    } catch (e) {
        return { success: false, output: `Error: ${e.message}`, desc }
    }
}

// ── Summarize results ─────────────────────────────────────────────────────────
const summarizeResults = async (task, stepResults) => {
    try {
        const stepsText = stepResults.map((s, i) =>
            `Step ${i + 1} (${s.desc}): ${s.success ? 'SUCCESS' : 'FAILED'} — ${(s.output || '').slice(0, 300)}`
        ).join('\n')
        const prompt = SUMMARY_PROMPT.replace('{task}', task).replace('{steps}', stepsText)
        const result = await callPollinations('You are Bera AI — a smart, direct assistant.', prompt)
        return result.success ? result.text : 'Task completed.'
    } catch {
        return 'Task completed.'
    }
}

module.exports = { planTask, executeStep, summarizeResults, npmStats, resolveGroupMember, createProject, pm2Manage, githubTokenRegen, callPollinations }
