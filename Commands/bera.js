const { nickAi, MAX_HISTORY } = require('../Library/lib/bera')
const config = require('../Config')
const { detectIntent } = require('../Library/router')
const { cloneRepo, setupRepoRemote, gitPush, gitStatus, gitLog, listWorkspace, runShell } = require('../Library/actions/shell')
const {
    getUser: ghUser, getOwner, listRepos, createRepo, deleteRepo, getRepo,
    listFiles: ghListFiles, getFile: ghGetFile, upsertFile, pushMultipleFiles,
    createIssue, listIssues, forkRepo, createBranch, getCommits, listBranches,
    searchRepos, PROJECT_TEMPLATES, detectProjectType
} = require('../Library/actions/github')
const { generateImage } = require('../Library/actions/imagegen')
const { searchAndDownload } = require('../Library/actions/music')
const { webSearch } = require('../Library/actions/search')
const { analyzeImageFromBuffer } = require('../Library/actions/vision')
const { readFile, writeFile, listFiles, deleteFile } = require('../Library/actions/files')
const { evalJS } = require('../Library/actions/jseval')
const { validateAndFixCode } = require('../Library/actions/beraai')
const { planTask, summarizeResults } = require('../Library/actions/agent')
const { translate } = require('../Library/actions/translate')
const { download, detectPlatform } = require('../Library/actions/downloader')
const { listServers, getServerStatus, powerAction, sendCommand, formatUptime, statusEmoji } = require('../Library/actions/pterodactyl')

const getUserHistory = (sender) => {
    if (!global.db.data.users[sender]) global.db.data.users[sender] = {}
    if (!Array.isArray(global.db.data.users[sender].nickHistory))
        global.db.data.users[sender].nickHistory = []
    return global.db.data.users[sender].nickHistory
}

const saveHistory = async (sender, history) => {
    global.db.data.users[sender].nickHistory = history.slice(-MAX_HISTORY)
    await global.db.write()
}

const hasImage = (msg) => msg && /image/.test(msg.mimetype || '')

const getImageBuffer = async (conn, msg) => {
    try {
        if (msg && msg.key && msg.message) {
            return await conn.downloadMediaMessage({ key: msg.key, message: msg.message })
        }
        return await conn.downloadMediaMessage(msg)
    } catch { return null }
}

const react = (conn, m, emoji) =>
    conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

const askNick = async (m, conn, reply, sender, userText, imageBuffer = null) => {
    await react(conn, m, imageBuffer ? '📷' : '🤖')

    const history = getUserHistory(sender)

    let answer
    try {
        answer = await nickAi(userText, history, null, imageBuffer)
    } catch (e) {
        await react(conn, m, '❌')
        return reply(`❌ *Bera AI is unavailable right now.*\n\n_${e.message}_`)
    }

    history.push({ role: 'user', content: imageBuffer ? `[image] ${userText}` : userText })
    history.push({ role: 'assistant', content: answer })

    const sent = await conn.sendMessage(m.chat, { text: answer, linkPreview: false }, { quoted: m })
    const msgId = sent?.key?.id

    const userData = global.db.data.users[sender]
    if (!Array.isArray(userData.nickMsgIds)) userData.nickMsgIds = []
    if (msgId) userData.nickMsgIds = [...userData.nickMsgIds, msgId].slice(-30)

    await saveHistory(sender, history)
    await react(conn, m, '✅')
    return sent
}

const handleAction = async (m, conn, reply, text, sender, imageBuffer) => {
    const intent = detectIntent(text)

    if (imageBuffer) {
        const wantsCreate = /\b(create|generate|make|draw|similar|like this|same style)\b/i.test(text)
        if (wantsCreate) {
            await react(conn, m, '🎨')
            const desc = await analyzeImageFromBuffer(imageBuffer, 'Describe this image in precise detail suitable for recreating it with an image generator.')
            if (!desc.success) {
                await react(conn, m, '❌')
                return reply(`❌ Couldn't read the image: ${desc.error}`)
            }
            const prompt = text.replace(/\b(create|generate|make|draw|similar|like this|same style|image|picture)\b/gi, '').trim()
            const fullPrompt = prompt ? `${prompt}, ${desc.result}` : desc.result
            const gen = await generateImage(fullPrompt.slice(0, 500))
            await react(conn, m, gen.success ? '✅' : '❌')
            if (!gen.success) return reply(`❌ Image generation failed: ${gen.error}`)
            const caption = `🎨 Generated from your image`
            if (gen.buffer) return conn.sendMessage(m.chat, { image: gen.buffer, caption }, { quoted: m })
            if (gen.url) return conn.sendMessage(m.chat, { image: { url: gen.url }, caption }, { quoted: m })
        }
        await react(conn, m, '🔍')
        const q = text || 'Describe and analyse this image in detail. Be specific and direct.'
        const res = await analyzeImageFromBuffer(imageBuffer, q)
        await react(conn, m, res.success ? '✅' : '❌')
        return reply(res.success ? res.result : `❌ Vision failed: ${res.error}`)
    }

    if (!imageBuffer && m.quoted && hasImage(m.quoted)) {
        const quotedBuf = await getImageBuffer(conn, m.quoted)
        if (quotedBuf) return handleAction(m, conn, reply, text, sender, quotedBuf)
    }

    if (intent === 'image_gen') {
        await react(conn, m, '🎨')
        const prompt = text.replace(/\b(create|generate|make|draw|produce|paint|render|an?|a|the|please)\b/gi, '').trim() || text
        const res = await generateImage(prompt)
        if (!res.success) {
            await react(conn, m, '❌')
            return reply(`❌ Image generation failed: ${res.error}`)
        }
        await react(conn, m, '✅')
        if (res.buffer && Buffer.isBuffer(res.buffer)) {
            return conn.sendMessage(m.chat, { image: res.buffer, caption: `🎨 *${prompt}*` }, { quoted: m })
        }
        if (res.url && typeof res.url === 'string' && res.url.startsWith('http')) {
            return conn.sendMessage(m.chat, { image: { url: res.url }, caption: `🎨 *${prompt}*` }, { quoted: m })
        }
        await react(conn, m, '❌')
        return reply(`❌ Image generation returned no usable result.`)
    }

    if (intent === 'music') {
        await react(conn, m, '🎵')
        const query = text.replace(/\b(play|send|find|search|get|download|song|music|audio|track|beat|mp3|by|from)\b/gi, '').trim() || text
        const res = await searchAndDownload(query)
        if (!res.success) {
            await react(conn, m, '❌')
            return reply(`❌ Couldn't find that: ${res.error}`)
        }
        await react(conn, m, '✅')
        const infoLine = `🎵 *${res.title}*${res.channel ? `\n${res.channel}` : ''}${res.duration ? ` · ${res.duration}` : ''}`
        if (typeof res.audioUrl !== 'string' || !res.audioUrl.startsWith('http')) {
            await react(conn, m, '❌')
            return reply(`❌ Got an invalid audio link. Try a different song name.`)
        }
        await conn.sendMessage(m.chat, {
            audio: { url: res.audioUrl },
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${res.title}.mp3`
        }, { quoted: m })
        const thumbUrl = typeof res.thumbnail === 'string' && res.thumbnail.startsWith('http') ? res.thumbnail : ''
        if (thumbUrl) {
            return conn.sendMessage(m.chat, { image: { url: thumbUrl }, caption: infoLine })
        }
        return conn.sendMessage(m.chat, { text: infoLine })
    }

    if (intent === 'git_clone') {
        await react(conn, m, '📦')
        const urlMatch = text.match(/https?:\/\/[^\s]+|git@[^\s]+/)
        if (!urlMatch) return reply(`❌ No repo URL found. Example: clone https://github.com/user/repo`)

        const cloneUrl = urlMatch[0].replace(/\/$/, '')
        const cloneRes = await cloneRepo(cloneUrl)
        if (!cloneRes.success) {
            await react(conn, m, '❌')
            return reply(`❌ Clone failed: ${cloneRes.output}`)
        }
        const folderName = cloneRes.name

        const ghUsername = process.env.GITHUB_USERNAME || (await ghUser().then(u => u.login).catch(() => null))
        if (!ghUsername) {
            await react(conn, m, '⚠️')
            return reply(`✅ Cloned \`${folderName}\` — GitHub push setup skipped (no username configured).`)
        }

        const ghRes = await createRepo(folderName, false, `Cloned via Bera Bot`)
        if (ghRes.error) {
            await react(conn, m, '⚠️')
            return reply(`✅ Cloned \`${folderName}\` — GitHub repo creation failed: ${ghRes.error}`)
        }

        const token = process.env.GITHUB_TOKEN
        const remoteRes = await setupRepoRemote(folderName, ghUsername, folderName, token)

        global.db.data.settings = global.db.data.settings || {}
        global.db.data.settings.lastCloned = folderName
        if (!global.db.data.settings.clonedRepos) global.db.data.settings.clonedRepos = {}
        global.db.data.settings.clonedRepos[folderName] = { github: `${ghUsername}/${folderName}`, url: ghRes.html_url }
        await global.db.write()

        await react(conn, m, '✅')
        return reply(
            `📦 *Cloned & ready*\n` +
            `Folder: \`${folderName}\`\n` +
            `GitHub: ${ghRes.html_url}\n` +
            `Remote: ${remoteRes.success ? '✅' : '⚠️ ' + remoteRes.output}`
        )
    }

    if (intent === 'git_push') {
        await react(conn, m, '🚀')

        const msgMatch = text.match(/["']([^"']+)["']/)
        const commitMsg = msgMatch ? msgMatch[1] : 'Update via Bera Bot'

        const stopWords = ['git', 'push', 'to', 'github', 'my', 'the', 'repo', 'code', 'changes', 'this']
        const clonedRepos = global.db.data.settings?.clonedRepos || {}
        const workspace = listWorkspace()

        let folder = ''

        const knownFolders = Object.keys(clonedRepos)
        for (const kf of knownFolders) {
            if (text.toLowerCase().includes(kf.toLowerCase())) { folder = kf; break }
        }

        if (!folder) {
            for (const ws of workspace) {
                if (text.toLowerCase().includes(ws.toLowerCase())) { folder = ws; break }
            }
        }

        if (!folder && workspace.length === 1) folder = workspace[0]

        if (!folder && global.db.data.settings?.lastCloned) folder = global.db.data.settings.lastCloned

        if (!folder) {
            const list = workspace.length
                ? workspace.map(f => `┃❍ _push ${f}_`).join('\n')
                : '┃❍ (no repos in workspace — clone something first)'
            return reply(
                `❌ Which repo to push?\n\n` +
                `╭══〘 *📁 WORKSPACE* 〙═⊷\n${list}\n╰══════════════════⊷`
            )
        }

        const res = await gitPush(folder, commitMsg)
        await react(conn, m, res.success ? '✅' : '❌')

        if (res.success) {
            const ghInfo = clonedRepos[folder]
            const ghLine = ghInfo ? `\nhttps://github.com/${ghInfo.github}` : ''
            return reply(`🚀 *Pushed* \`${folder}\`\nCommit: _${commitMsg}_${ghLine}`)
        }
        return reply(`❌ Push failed:\n${res.output.slice(0, 400)}`)
    }

    // ── GitHub helper (shared across all github_* intents) ────────────────────
    const extractRepoName = (txt) => {
        const t2 = txt.trim()
        // IMPORTANT: "name it X" / "call it X" must come BEFORE "named?" / "called?"
        // otherwise the regex engine matches "name" alone and captures "it" as the repo name
        return (
            // "name it X" / "named it X" / "call it X"
            t2.match(/\b(?:name(?:d)?\s+it|call(?:ed)?\s+it|make\s+it|titled?)\s+["']?([\w.-]{2,})\b/i)?.[1] ||
            // "named X" / "called X" / "named 'X'"
            t2.match(/\b(?:named?|called?)\s+["']?([\w.-]{2,})["']?/i)?.[1] ||
            // "repo X" or "repository X" at the end
            t2.match(/\b(?:repo|repository|project)\s+(?:called?|named?)?\s*["']?([\w.-]{2,})["']?/i)?.[1] ||
            // quoted names
            t2.match(/["']([\w.-]{2,})["']/)?.[1] ||
            // "create repo X" — word after repo/project with no qualifier
            t2.match(/\b(?:repo|repository|project)\s+([\w.-]{2,})\s*$/i)?.[1] ||
            // last word as fallback (only if 3+ chars to avoid "it", "a", etc.)
            t2.match(/\b([a-z][\w.-]{2,40})\s*$/i)?.[1] ||
            null
        )
    }

    // ── GitHub: list repos ────────────────────────────────────────────────────
    if (intent === 'github_list_repos') {
        await react(conn, m, '🐙')
        const res = await listRepos()
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        if (!res.length) return reply(`You have no repositories yet. Say "create a repo named X" to make one.`)
        const lines = res.map((r, i) => `${i + 1}. ${r.private ? '🔒' : '🌐'} *${r.name}*${r.language ? ` _(${r.language})_` : ''}${r.description ? `\n   ${r.description}` : ''}\n   ${r.url}`).join('\n\n')
        await react(conn, m, '✅')
        return reply(`🐙 *Your GitHub Repositories (${res.length})*\n\n${lines}`)
    }

    // ── GitHub: create repo ───────────────────────────────────────────────────
    if (intent === 'github_create_repo') {
        await react(conn, m, '🐙')
        const name = extractRepoName(text)
        if (!name) return reply(`❌ Tell me the repo name. E.g: "create a repo called my-project" or "make a private repo named bera-tools"`)
        const isPrivate = /private/i.test(text)
        const descMatch = text.match(/desc(?:ription)?\s+["']?([^"'\n]+)["']?/i)
        const description = descMatch?.[1]?.trim() || ''
        await reply(`🔧 Creating ${isPrivate ? 'private' : 'public'} repo *${name}*...`)
        const res = await createRepo(name, isPrivate, description)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ *Repo Created!*\n\n🐙 *${res.full_name}*\n${isPrivate ? '🔒 Private' : '🌐 Public'}\n🔗 ${res.html_url}\n\nTell me to add files, scaffold a project, or create a branch!`)
    }

    // ── GitHub: scaffold + push a full project ────────────────────────────────
    if (intent === 'github_create_project') {
        await react(conn, m, '⚙️')
        const name = extractRepoName(text)
        if (!name) return reply(`❌ Tell me the project name. E.g: "build an Express project called my-api on GitHub"`)
        const type = detectProjectType(text)
        const template = PROJECT_TEMPLATES[type]
        const isPrivate = /private/i.test(text)
        await reply(`⚙️ *Scaffolding ${template.label} project: ${name}*\n\nStep 1: Creating GitHub repo...`)
        const repo = await createRepo(name, isPrivate, `${template.label} project — created by Bera AI`)
        if (repo.error) return reply(`❌ Could not create repo: ${repo.error}`)
        const owner = repo.owner?.login || await getOwner()
        if (!owner) return reply(`❌ Could not determine GitHub username.`)
        await reply(`✅ Repo created. Step 2: Pushing ${template.files(name).length} files...`)
        const files = template.files(name)
        const results = await pushMultipleFiles(owner, name, files)
        const ok    = results.filter(r => r.ok)
        const errs  = results.filter(r => !r.ok)
        await react(conn, m, errs.length === 0 ? '✅' : '⚠️')
        const fileList = ok.map(r => `  ✅ \`${r.path}\``).join('\n') + (errs.length ? '\n' + errs.map(r => `  ❌ \`${r.path}\`: ${r.error}`).join('\n') : '')
        return reply(
            `🚀 *${name} is live on GitHub!*\n\n` +
            `📦 Type: ${template.label}\n` +
            `🔗 ${repo.html_url}\n` +
            `${isPrivate ? '🔒 Private' : '🌐 Public'}\n\n` +
            `📁 *Files pushed:*\n${fileList}\n\n` +
            `Clone with:\n\`git clone ${repo.clone_url}\``
        )
    }

    // ── GitHub: push / add a file ─────────────────────────────────────────────
    if (intent === 'github_push_file') {
        await react(conn, m, '📤')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const repoMatch = text.match(/\b(?:to|into|repo|repository)\s+["']?([\w.-]+)["']?/i)
        const pathMatch = text.match(/(?:as|named?|file\s+name|path)\s+["']?([\w./-]+)["']?/i)
        const msgMatch  = text.match(/(?:commit\s+message|message)\s+["']?([^"'\n]+)["']?/i)
        if (!repoMatch) return reply(`❌ Tell me which repo. E.g: "add this file to my-project" and quote the file content`)
        if (!quoted) return reply(`❌ Quote the file content you want to push, then say "push this to [repo-name]"`)
        const repoName  = repoMatch[1]
        const filePath  = pathMatch?.[1] || 'file.txt'
        const commitMsg = msgMatch?.[1] || `Add ${filePath} via Bera AI`
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username. Is your token set?`)
        await reply(`📤 Pushing \`${filePath}\` to *${owner}/${repoName}*...`)
        const res = await upsertFile(owner, repoName, filePath, quoted, commitMsg)
        if (res.error) return reply(`❌ Push failed: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ *Pushed!*\n\n📄 \`${filePath}\`\n🐙 *${owner}/${repoName}*\n🔗 ${res.content?.html_url || 'https://github.com/' + owner + '/' + repoName}`)
    }

    // ── GitHub: delete repo ───────────────────────────────────────────────────
    if (intent === 'github_delete_repo') {
        await react(conn, m, '🗑️')
        const name = extractRepoName(text)
        if (!name) return reply(`❌ Which repo? E.g: "delete the repo named old-project"`)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        await reply(`⚠️ Deleting *${owner}/${name}*... this cannot be undone.`)
        const res = await deleteRepo(owner, name)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ Repo *${name}* has been permanently deleted.`)
    }

    // ── GitHub: repo info ─────────────────────────────────────────────────────
    if (intent === 'github_repo_info') {
        await react(conn, m, '🔍')
        const name = extractRepoName(text)
        if (!name) return reply(`❌ Which repo? E.g: "info on my bera-ai repo"`)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        const res = await getRepo(owner, name)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(
            `🐙 *${res.full_name}*\n\n` +
            `📝 ${res.description || 'No description'}\n` +
            `${res.private ? '🔒 Private' : '🌐 Public'}\n` +
            `⭐ Stars: ${res.stargazers_count} | 🍴 Forks: ${res.forks_count}\n` +
            `💬 Issues: ${res.open_issues_count} open\n` +
            `🌿 Default branch: ${res.default_branch}\n` +
            `📦 Language: ${res.language || 'Unknown'}\n` +
            `📅 Created: ${new Date(res.created_at).toDateString()}\n` +
            `🔄 Updated: ${new Date(res.updated_at).toDateString()}\n` +
            `🔗 ${res.html_url}`
        )
    }

    // ── GitHub: list files in repo ────────────────────────────────────────────
    if (intent === 'github_list_files') {
        await react(conn, m, '📁')
        const name  = extractRepoName(text)
        const pathM = text.match(/(?:in|inside|folder|path)\s+["']?([\w/./-]+)["']?/i)
        const filePath = pathM?.[1] && !/^(repo|the|my|a)$/i.test(pathM[1]) ? pathM[1] : ''
        if (!name) return reply(`❌ Which repo? E.g: "list files in my-project"`)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        const res = await ghListFiles(owner, name, filePath)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        if (!Array.isArray(res)) return reply(`❌ Unexpected response from GitHub.`)
        const dirs  = res.filter(f => f.type === 'dir').map(f => `📁 ${f.name}/`)
        const files = res.filter(f => f.type === 'file').map(f => `📄 ${f.name}`)
        const all   = [...dirs, ...files]
        await react(conn, m, '✅')
        return reply(`📁 *${owner}/${name}${filePath ? '/' + filePath : ''}* (${all.length} items)\n\n${all.join('\n')}`)
    }

    // ── GitHub: create issue ──────────────────────────────────────────────────
    if (intent === 'github_create_issue') {
        await react(conn, m, '🐛')
        const repoMatch = text.match(/\b(?:on|in|for|repo)\s+["']?([\w.-]+)["']?/i)
        const titleMatch = text.match(/(?:title|about|saying|issue)\s+["']?([^"'\n]{5,100})["']?/i) ||
                           text.match(/(?:create|open|add|raise)\s+(?:an?\s+)?(?:issue|bug|ticket)\s+(.+)/i)
        if (!repoMatch) return reply(`❌ Which repo? E.g: "create an issue on my-project titled Fix login bug"`)
        if (!titleMatch) return reply(`❌ What's the issue about? E.g: "create issue on my-api titled User login fails"`)
        const repoName = repoMatch[1]
        const title    = titleMatch[1]?.trim()
        const bodyM    = text.match(/body\s+["']?([^"'\n]{10,})["']?/i)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        const res = await createIssue(owner, repoName, title, bodyM?.[1] || '')
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ *Issue created!*\n\n🐛 #${res.number}: ${res.title}\n🐙 *${owner}/${repoName}*\n🔗 ${res.html_url}`)
    }

    // ── GitHub: fork repo ─────────────────────────────────────────────────────
    if (intent === 'github_fork') {
        await react(conn, m, '🍴')
        const urlMatch = text.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i)
        const nameM    = urlMatch ? null : extractRepoName(text)
        const ownerM   = text.match(/(?:from|by|of|user)\s+["']?([\w.-]+)["']?/i)
        if (!urlMatch && !nameM) return reply(`❌ Which repo to fork? E.g: "fork github.com/expressjs/express" or "fork express from expressjs"`)
        const srcOwner = urlMatch?.[1] || ownerM?.[1] || (await getOwner())
        const srcRepo  = urlMatch?.[2] || nameM
        await reply(`🍴 Forking *${srcOwner}/${srcRepo}*...`)
        const res = await forkRepo(srcOwner, srcRepo)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ *Forked!*\n\n🍴 *${res.full_name}*\n🔗 ${res.html_url}`)
    }

    // ── GitHub: list branches ─────────────────────────────────────────────────
    if (intent === 'github_branches') {
        await react(conn, m, '🌿')
        const name  = extractRepoName(text)
        if (!name) return reply(`❌ Which repo? E.g: "list branches of my-project"`)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        const res = await listBranches(owner, name)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        const lines = res.map(b => `🌿 ${b.name}${b.protected ? ' 🔒' : ''}`).join('\n')
        await react(conn, m, '✅')
        return reply(`🌿 *Branches in ${owner}/${name}* (${res.length}):\n\n${lines}`)
    }

    // ── GitHub: create branch ─────────────────────────────────────────────────
    if (intent === 'github_create_branch') {
        await react(conn, m, '🌿')
        const repoM   = text.match(/\b(?:in|on|for|repo)\s+["']?([\w.-]+)["']?/i)
        const nameM   = text.match(/\b(?:branch\s+(?:named?|called?))\s+["']?([\w./-]+)["']?/i) ||
                        text.match(/\b(?:create|make|new)\s+(?:a\s+)?branch\s+["']?([\w./-]+)["']?/i)
        const fromM   = text.match(/\b(?:from|off)\s+["']?([\w./-]+)["']?/i)
        if (!repoM) return reply(`❌ Which repo? E.g: "create branch feature-login in my-project"`)
        if (!nameM) return reply(`❌ What should the branch be called? E.g: "create branch feature-auth in my-api"`)
        const repoName  = repoM[1]
        const branchName = nameM[1]
        const fromBranch = fromM?.[1] || 'main'
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        await reply(`🌿 Creating branch *${branchName}* from *${fromBranch}* in *${owner}/${repoName}*...`)
        const res = await createBranch(owner, repoName, branchName, fromBranch)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        await react(conn, m, '✅')
        return reply(`✅ *Branch created!*\n\n🌿 *${branchName}*\n📌 From: ${fromBranch}\n🐙 ${owner}/${repoName}`)
    }

    // ── GitHub: recent commits ────────────────────────────────────────────────
    if (intent === 'github_commits') {
        await react(conn, m, '📋')
        const name  = extractRepoName(text)
        if (!name) return reply(`❌ Which repo? E.g: "show commits on my-project"`)
        const owner = await getOwner()
        if (!owner) return reply(`❌ Could not get GitHub username.`)
        const res = await getCommits(owner, name, 5)
        if (res.error) return reply(`❌ GitHub: ${res.error}`)
        if (!Array.isArray(res)) return reply(`❌ Could not fetch commits.`)
        const lines = res.map((c, i) =>
            `${i + 1}. \`${c.sha.slice(0, 7)}\` — ${c.commit.message.split('\n')[0]}\n   👤 ${c.commit.author.name} · ${new Date(c.commit.author.date).toDateString()}`
        ).join('\n\n')
        await react(conn, m, '✅')
        return reply(`📋 *Recent commits in ${owner}/${name}:*\n\n${lines}`)
    }

    // ── GitHub: existing handler (catch-all) ──────────────────────────────────
    if (intent === 'github') {
        await react(conn, m, '🐙')
        const t = text.toLowerCase()
        if (/\b(list|show|my)\b.{0,10}\b(repo|repos)\b/.test(t)) {
            const res = await listRepos()
            if (res.error) return reply(`❌ GitHub: ${res.error}`)
            const lines = res.map(r => `${r.private ? '🔒' : '🌐'} *${r.name}* — ${r.url}`).join('\n')
            await react(conn, m, '✅')
            return reply(`*Your repos (${res.length}):*\n${lines}`)
        }
        if (/\b(create|make|new)\b.{0,10}\b(repo|repository)\b/.test(t)) {
            const name = extractRepoName(text)
            if (!name) return reply(`❌ Tell me the repo name. E.g: "create a repo name it my-project" or "create a repo named cloudtechs"`)
            const isPrivate = /private/.test(t)
            const res = await createRepo(name, isPrivate)
            if (res.error) return reply(`❌ GitHub: ${res.error}`)
            await react(conn, m, '✅')
            return reply(`✅ *Repo Created!*\n\n🐙 *${name}*\n${isPrivate ? '🔒 Private' : '🌐 Public'}\n🔗 ${res.html_url}`)
        }
        if (/\b(delete|remove)\b.{0,10}\b(repo|repository)\b/.test(t)) {
            const nameMatch = text.match(/(?:delete|remove|drop)\s+(?:a\s+)?(?:repo|repository|this)\s+["']?([a-zA-Z0-9_.-]+)["']?/i) ||
                text.match(/(?:name(?:d)?\s+it|named?|called?)\s+["']?([a-zA-Z0-9_.-]+)["']?/i)
            if (!nameMatch) return reply(`❌ Specify repo name.`)
            const ghUsername = process.env.GITHUB_USERNAME || (await ghUser().then(u => u.login).catch(() => null))
            if (!ghUsername) return reply(`❌ GitHub username not set.`)
            const res = await deleteRepo(ghUsername, nameMatch[1])
            if (res.error) return reply(`❌ ${res.error}`)
            await react(conn, m, '✅')
            return reply(`✅ Deleted \`${nameMatch[1]}\``)
        }
        if (/\b(access|reach|connect|have|got|can you|do you)\b/.test(t) ||
            /\b(github|repos?|repositories)\b/.test(t)) {
            const res = await listRepos().catch(() => null)
            const count = Array.isArray(res) ? res.length : '?'
            await react(conn, m, '✅')
            return reply(`Yes, I have full GitHub access as *bera-tech-ai* 🐙\n\nI can:\n• List your repos (${count} so far)\n• Create or delete repos\n• Clone any repo\n• Push code\n\nWhat do you need?`)
        }
        await react(conn, m, '❌')
        return reply(`❌ Try: "list repos", "create repo <name>", "delete repo <name>"`)
    }

    if (intent === 'shell') {
        await react(conn, m, '💻')
        const cmd = text.replace(/^(run|execute|exec|terminal|bash|shell|command|cmd)\s+/i, '').trim()
        const res = await runShell(cmd)
        await react(conn, m, res.success ? '✅' : '❌')
        const out = res.output.length > 2000 ? res.output.slice(0, 2000) + '\n...(truncated)' : res.output
        return reply(`\`\`\`\n${out || '(no output)'}\n\`\`\``)
    }

    if (intent === 'search') {
        await react(conn, m, '🔍')
        const res = await webSearch(text)
        await react(conn, m, res.success ? '✅' : '❌')
        return reply(res.success ? res.result : `❌ Search failed: ${res.error}`)
    }

    // ── Voice note transcription (explicit only) ──────────────────────────────
    // Triggered by: quoting a voice note and saying "bera transcribe this"
    //           or: .transcribe command while quoting a voice note
    if (intent === 'transcribe' || command === 'transcribe' || command === 'listen') {
        await react(conn, m, '🎙️')

        // Check for a quoted voice note
        const qType = m.quoted?.mtype || ''
        const isVoiceQuote = qType === 'audioMessage' || qType === 'pttMessage' ||
                             (m.quoted?.mimetype && /audio/.test(m.quoted.mimetype))

        if (!m.quoted || !isVoiceQuote) {
            return reply(
                `🎙️ *Voice Transcription*\n\n` +
                `To transcribe a voice note:\n` +
                `1. Find the voice note in the chat\n` +
                `2. Quote (reply to) it\n` +
                `3. Say: *bera transcribe this*\n` +
                `   or use: *.transcribe*\n\n` +
                `_I only transcribe when you specifically ask — I don't listen to every voice note automatically._`
            )
        }

        await reply(`🎙️ _Downloading and transcribing voice note..._`)

        let audioBuf
        try {
            const quotedMsg = {
                key: m.quoted.key,
                message: m.quoted.message
            }
            audioBuf = await conn.downloadMediaMessage(quotedMsg)
        } catch {
            audioBuf = null
        }

        if (!audioBuf || audioBuf.length < 100) {
            await react(conn, m, '❌')
            return reply(`❌ Couldn't download the voice note. Try again.`)
        }

        const { transcribeAudio } = require('../Library/actions/beraai')
        const result = await transcribeAudio(audioBuf)

        if (!result.success || !result.text) {
            await react(conn, m, '❌')
            return reply(
                `❌ *Transcription failed*\n\n` +
                `The voice transcription service is currently unavailable.\n` +
                `Try again in a moment.`
            )
        }

        await react(conn, m, '✅')
        const transcribed = result.text.trim()

        // Also ask AI if the user wants analysis
        const wantsAnalysis = /\b(analyze|analyse|summarize|respond|reply|answer|what|explain|tell me)\b/i.test(text)
        if (wantsAnalysis) {
            const { nickAi } = require('../Library/lib/bera')
            const history = getUserHistory(sender)
            let aiReply
            try {
                aiReply = await nickAi(`The user sent a voice note that said: "${transcribed}". Respond to what they said.`, history)
            } catch { aiReply = null }

            if (aiReply) {
                history.push({ role: 'user', content: `[voice] ${transcribed}` })
                history.push({ role: 'assistant', content: aiReply })
                await saveHistory(sender, history)
                return reply(`🎙️ *Transcribed:*\n_"${transcribed}"_\n\n${aiReply}`)
            }
        }

        return reply(`🎙️ *Transcribed:*\n\n_"${transcribed}"_`)
    }

    if (intent === 'translate') {
        await react(conn, m, '🌐')
        const langMatch = text.match(/\bto\s+(\w+)$/i) || text.match(/\bin\s+(\w+)$/i) || text.match(/\binto\s+(\w+)$/i)
        const lang = langMatch?.[1] || 'English'
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const content = quoted || text.replace(/\b(translate|translation|to|into|in)\s+\w+\b/gi, '').trim()
        if (!content) return reply(`❌ Nothing to translate. Send text or quote a message and say "translate to French"`)
        const res = await translate(content, lang)
        await react(conn, m, res.success ? '✅' : '❌')
        if (!res.success) return reply(`❌ Translation failed: ${res.error}`)
        return reply(`🌐 *Translated to ${res.to}:*\n\n${res.result}`)
    }

    if (intent === 'download') {
        await react(conn, m, '⬇️')
        const urlMatch = text.match(/https?:\/\/\S+/)
        const url = urlMatch?.[0]
        if (!url) return reply(`❌ Include the video link in your message.\nExample: download this tiktok https://tiktok.com/...`)
        const res = await download(url)
        await react(conn, m, res.success ? '✅' : '❌')
        if (!res.success) return reply(`❌ ${res.error}`)
        const caption = `${res.platform} · ${res.title || ''}${res.author ? ` · @${res.author}` : ''}`.trim()
        return conn.sendMessage(m.chat, {
            video: { url: res.videoUrl },
            caption,
            mimetype: 'video/mp4'
        }, { quoted: m })
    }

    if (intent === 'file_read') {
        await react(conn, m, '📄')
        const pathMatch = text.match(/(?:read|cat|view|show|open|display)?\s*["']?([^\s"']+\.\w+)["']?/i)
        if (!pathMatch) return reply(`❌ Specify a file path. E.g: "read index.js"`)
        const res = readFile(pathMatch[1])
        await react(conn, m, res.success ? '✅' : '❌')
        if (!res.success) return reply(`❌ ${res.error}`)
        const lines = res.content.split('\n').length
        const preview = res.content.length > 3000 ? res.content.slice(0, 3000) + '\n...(truncated)' : res.content
        return reply(`📄 *${pathMatch[1]}* (${lines} lines)\n\`\`\`\n${preview}\n\`\`\``)
    }

    if (intent === 'file_write') {
        await react(conn, m, '✍️')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const pathMatch = text.match(/(?:create|write|make|save|edit|update|modify)\s+(?:file\s+)?["']?([^\s"']+\.\w+)["']?/i)
        if (!pathMatch) return reply(`❌ Specify filename. E.g: "create file hello.js"\n\nThen quote the content to write.`)
        const content = quoted || text.replace(/(?:create|write|make|save|edit|update|modify)\s+(?:file\s+)?["']?[^\s"']+\.\w+["']?\s*/i, '').trim()
        if (!content) return reply(`❌ No content provided. Quote a message with the content to write.`)
        const res = writeFile(pathMatch[1], content)
        await react(conn, m, res.success ? '✅' : '❌')
        if (!res.success) return reply(`❌ ${res.error}`)
        return reply(`✅ File written: \`${pathMatch[1]}\` (${res.size} bytes)`)
    }

    if (intent === 'file_list') {
        await react(conn, m, '📁')
        const dirMatch = text.match(/(?:in|inside|of|from|at)?\s+["']?([^\s"']+)["']?\s*$/)
        const dir = dirMatch && dirMatch[1] !== 'files' && dirMatch[1] !== 'workspace' ? dirMatch[1] : ''
        const res = listFiles(dir)
        await react(conn, m, res.success ? '✅' : '❌')
        if (!res.success) return reply(`❌ ${res.error}`)
        if (!res.items.length) return reply(`📁 Empty directory: \`${dir || 'workspace'}\``)
        const lines = res.items.map(i =>
            `${i.type === 'dir' ? '📁' : '📄'} ${i.name}${i.type === 'file' ? ` (${i.size}b)` : ''}`
        ).join('\n')
        return reply(`📁 *${dir || 'workspace'}/* (${res.items.length} items)\n\n${lines}`)
    }

    if (intent === 'js_eval') {
        await react(conn, m, '⚙️')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const code = quoted ||
            text.replace(/^(eval|evaluate|run|execute)\s+(this\s+)?(javascript|js|code|script|node|snippet)?\s*/i, '').trim()
        if (!code) return reply(`❌ No code provided. Quote a message containing JavaScript code.`)
        const res = await evalJS(code)
        await react(conn, m, res.success ? '✅' : '❌')
        const out = res.output.length > 2000 ? res.output.slice(0, 2000) + '\n...(truncated)' : res.output
        return reply(`${res.success ? '✅' : '❌'} *JS Result:*\n\`\`\`\n${out}\n\`\`\``)
    }

    // ── Run / execute quoted code ─────────────────────────────────────────────
    if (intent === 'code_run') {
        await react(conn, m, '▶️')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const inline = text.replace(/^(run|execute|exec)\s+(this|the|my|this\s+code|the\s+code|this\s+script|it)\b\s*/i, '').trim()
        const code = quoted || inline
        if (!code || code.length < 3) return reply(`❌ Quote the code you want me to run, then say "run this".`)

        // Detect language
        const langMatch = code.match(/^#!.*?(python|bash|sh)\b/i) || text.match(/\b(python|bash|shell)\b/i)
        const lang = langMatch?.[1]?.toLowerCase()

        if (lang === 'python' || lang === 'py') {
            const { writeFileSync, unlinkSync } = require('fs')
            const { exec } = require('child_process')
            const os = require('os'), path = require('path')
            const tmpFile = path.join(os.tmpdir(), `bera_run_${Date.now()}.py`)
            writeFileSync(tmpFile, code, 'utf8')
            await reply(`🐍 Running Python code...`)
            await new Promise(resolve => {
                exec(`python3 "${tmpFile}"`, { timeout: 15000, maxBuffer: 512 * 1024 }, async (err, stdout, stderr) => {
                    unlinkSync(tmpFile)
                    const out = (stdout || '').trim()
                    const errOut = (stderr || '').trim()
                    const success = !err && !errOut
                    await react(conn, m, success ? '✅' : '❌')
                    const result = out || errOut || '(no output)'
                    const truncated = result.length > 2000 ? result.slice(0, 2000) + '\n...(truncated)' : result
                    await reply(`${success ? '✅' : '❌'} *Python Output:*\n\`\`\`\n${truncated}\n\`\`\``)
                    resolve()
                })
            })
            return
        }

        // Default: JavaScript
        const res = await evalJS(code)
        await react(conn, m, res.success ? '✅' : '❌')
        const out = (res.output || '').length > 2000 ? res.output.slice(0, 2000) + '\n...(truncated)' : res.output
        return reply(`${res.success ? '✅' : '❌'} *Output:*\n\`\`\`\n${out || '(no output)'}\n\`\`\``)
    }

    // ── Validate / check code for errors ─────────────────────────────────────
    if (intent === 'code_validate') {
        await react(conn, m, '🔍')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const code = quoted || text.replace(/\b(check|validate|syntax\s+check|any\s+errors?\s+in|is\s+(this\s+)?code\s+(correct|valid|right|ok))\b/gi, '').trim()
        if (!code || code.length < 5) return reply(`❌ Quote the code you want me to check, then say "check this code".`)

        await reply(`🔍 Checking your code for errors...`)
        const fakeResponse = `\`\`\`javascript\n${code}\n\`\`\``
        const result = await validateAndFixCode(fakeResponse)

        if (result.errors.length === 0) {
            await react(conn, m, '✅')
            return reply(`✅ *Code looks clean!*\n\nNo syntax errors found. Your code is valid ${result.errors.length === 0 ? '🎉' : ''}`)
        }

        await react(conn, m, result.fixed ? '🔧' : '❌')
        const errList = result.errors.map(e => `• [${e.lang}] ${e.error}`).join('\n')
        if (result.fixed) {
            const fixedCode = result.response.match(/```[\w]*\n?([\s\S]+?)```/)?.[1]?.trim() || ''
            return reply(`🔧 *Found and auto-fixed errors:*\n\n${errList}\n\n*Fixed code:*\n\`\`\`\n${fixedCode}\n\`\`\``)
        }
        return reply(`❌ *Errors found:*\n\n${errList}\n\nSend me the error and I'll help fix it!`)
    }

    // ── Build a complete full project ─────────────────────────────────────────
    if (intent === 'code_build') {
        await react(conn, m, '🏗️')
        const task = text.replace(/\b(build|create|write|make|generate|a|an|the)\b/gi, '').trim() || text
        await reply(`🏗️ *Building your project...*\n\n_"${task}"_\n\nAnalyzing requirements and generating complete code...`)

        const buildPrompt = `You are a senior full-stack developer. Build a COMPLETE, PRODUCTION-READY ${task}.

Requirements:
- ALL files needed (entry point, config, routes, models, etc.)
- Every function fully implemented — NO placeholders
- Error handling in every async operation
- Clear comments
- Setup instructions at the end

Format: show each file as a separate code block with filename as a comment at the top.
Start immediately with the code — no lengthy intro.`

        try {
            const { generateAdvancedReply } = require('../Library/actions/beraai')
            const r = await generateAdvancedReply(buildPrompt, m.chat + '_build', null, null)
            if (r.success && r.reply) {
                const validated = await validateAndFixCode(r.reply, task)
                await react(conn, m, validated.errors.length ? '⚠️' : '✅')
                const prefix = validated.fixed
                    ? `🔧 _Auto-fixed ${validated.errors.length} syntax error(s) before sending_\n\n`
                    : (validated.errors.length ? `⚠️ _Note: ${validated.errors.map(e=>e.error.slice(0,60)).join('; ')}_\n\n` : '')
                return reply(`🏗️ *Project Built!*\n\n${prefix}${validated.response}`)
            }
        } catch {}
        await react(conn, m, '❌')
        return reply(`❌ Could not build the project. Try being more specific: "build a complete Express REST API with user auth"`)
    }

    // ── Explain / analyze code ────────────────────────────────────────────────
    if (intent === 'code_explain') {
        await react(conn, m, '🧠')
        const quoted = m.quoted?.text || m.quoted?.body || ''
        const code = quoted || text.replace(/\b(explain|analyze|analyse|what\s+does\s+this\s+(code|script|function)\s+do|walk\s+(me\s+)?through)\b/gi, '').trim()
        if (!code || code.length < 5) return reply(`❌ Quote the code you want explained, then say "explain this code".`)

        await reply(`🧠 Analyzing your code...`)
        const prompt = `You are a senior software engineer. Analyze and explain this code comprehensively:\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. *What it does* — 1-2 sentence summary\n2. *How it works* — step-by-step walkthrough\n3. *Key concepts* — patterns/algorithms/libraries used\n4. *Potential issues* — bugs, edge cases, performance concerns\n5. *Improvements* — how you'd make it better\n\nBe thorough but concise. Use WhatsApp formatting (*bold*, _italic_).`

        try {
            const { generateAdvancedReply } = require('../Library/actions/beraai')
            const r = await generateAdvancedReply(prompt, m.chat + '_explain', null, null)
            if (r.success && r.reply) {
                await react(conn, m, '✅')
                return reply(`🧠 *Code Analysis:*\n\n${r.reply}`)
            }
        } catch {}
        await react(conn, m, '❌')
        return reply(`❌ Could not analyze the code. Try quoting a message with code first.`)
    }

    if (intent === 'agent') {
        await react(conn, m, '🤖')
        const task = text.replace(/\b(agent|automate|plan and execute|do the following|step by step)\b/gi, '').trim() || text
        if (!task || task.length < 5) return reply(`❌ Describe what you want me to do. E.g: "agent: list all workspace files and push them to github"`)

        await reply(`🤖 *Planning task...*\n_"${task}"_`)
        const plan = await planTask(task)
        if (!plan.success) return reply(`❌ Couldn't plan this task: ${plan.error}`)

        const steps = plan.plan.steps
        await reply(`📋 *Plan:* ${plan.plan.plan}\n\n${steps.map((s, i) => `${i + 1}. ${s.desc}`).join('\n')}\n\n_Executing..._`)

        const results = []
        for (const step of steps) {
            let result = { success: false, output: 'Unknown action' }
            try {
                if (step.action === 'shell') {
                    result = await runShell(step.args?.cmd || '')
                } else if (step.action === 'file_read') {
                    const r = readFile(step.args?.path || '')
                    result = { success: r.success, output: r.content || r.error }
                } else if (step.action === 'file_write') {
                    const r = writeFile(step.args?.path || '', step.args?.content || '')
                    result = { success: r.success, output: r.success ? `Written: ${r.path}` : r.error }
                } else if (step.action === 'js_eval') {
                    result = await evalJS(step.args?.code || '')
                } else if (step.action === 'search') {
                    const r = await webSearch(step.args?.query || '')
                    result = { success: r.success, output: r.result || r.error }
                } else if (step.action === 'git_clone') {
                    result = await cloneRepo(step.args?.url || '')
                } else if (step.action === 'git_push') {
                    result = await gitPush(step.args?.folder || '')
                } else if (step.action === 'image_gen') {
                    const r = await generateImage(step.args?.prompt || '')
                    result = { success: r.success, output: r.success ? '[image generated]' : r.error }
                    if (r.success) {
                        if (r.buffer) await conn.sendMessage(m.chat, { image: r.buffer, caption: step.args?.prompt }, { quoted: m })
                        else if (r.url) await conn.sendMessage(m.chat, { image: { url: r.url }, caption: step.args?.prompt }, { quoted: m })
                    }
                } else if (step.action === 'music') {
                    const r = await searchAndDownload(step.args?.query || '')
                    result = { success: r.success, output: r.success ? r.title : r.error }
                    if (r.success && r.audioUrl) {
                        await conn.sendMessage(m.chat, { audio: { url: r.audioUrl }, mimetype: 'audio/mp4', ptt: false }, { quoted: m })
                    }
                }
            } catch (e) {
                result = { success: false, output: e.message }
            }
            results.push({ desc: step.desc, ...result })
        }

        const summary = await summarizeResults(task, results)
        await react(conn, m, '✅')
        return reply(`✅ *Done!*\n\n${summary}`)
    }

    if (intent === 'pterodactyl') {
        await react(conn, m, '🦅')
        const t = text.toLowerCase()

        if (/\blist\b.*(server|vps|panel)/.test(t) || /\b(my servers|all servers)\b/.test(t)) {
            const res = await listServers()
            await react(conn, m, res.success ? '✅' : '❌')
            if (!res.success) return reply(`❌ Panel: ${res.error}`)
            if (!res.servers.length) return reply(`No servers on the panel.`)
            const lines = res.servers.map((s, i) => `${i + 1}. ${statusEmoji(s.status)} *${s.name}* — ${s.status || 'unknown'}`)
            return reply(`🦅 *Your Servers:*\n\n${lines.join('\n')}\n\nSay "status of [server name]" for details.`)
        }

        const serverMatch = text.match(/(?:start|stop|restart|kill|status|resources?|cpu|ram|memory|console)\s+(?:of\s+|server\s+)?(.+)/i)
        const serverName = serverMatch?.[1]?.trim()

        if (/\b(status|resources?|cpu|ram|memory|uptime)\b/.test(t) && serverName) {
            const res = await listServers()
            if (!res.success) return reply(`❌ ${res.error}`)
            const server = res.servers.find(s => s.name.toLowerCase().includes(serverName.toLowerCase())) || res.servers[0]
            if (!server) return reply(`Couldn't find that server. Say "list my servers" to see them.`)
            const stat = await getServerStatus(server.id)
            await react(conn, m, stat.success ? '✅' : '❌')
            if (!stat.success) return reply(`❌ ${stat.error}`)
            return reply(
                `${statusEmoji(stat.status)} *${server.name}* — ${stat.status?.toUpperCase()}\n\n` +
                `CPU: ${stat.cpu}% | RAM: ${stat.ram}/${stat.ramLimit} MB\n` +
                `Disk: ${stat.disk} MB | Uptime: ${formatUptime(stat.uptime)}`
            )
        }

        for (const action of ['start', 'stop', 'restart', 'kill']) {
            if (new RegExp(`\\b${action}\\b`).test(t) && serverName) {
                const res = await listServers()
                if (!res.success) return reply(`❌ ${res.error}`)
                const server = res.servers.find(s => s.name.toLowerCase().includes(serverName.toLowerCase())) || res.servers[0]
                if (!server) return reply(`Couldn't find that server.`)
                const signal = action === 'kill' ? 'kill' : action
                const pw = await powerAction(server.id, signal)
                await react(conn, m, pw.success ? '✅' : '❌')
                const labels = { start: 'starting', stop: 'stopping', restart: 'restarting', kill: 'killed' }
                return reply(pw.success ? `${statusEmoji(signal)} *${server.name}* is ${labels[action]}...` : `❌ ${pw.error}`)
            }
        }

        return reply(`🦅 I can manage your Pterodactyl panel. Try:\n• "list my servers"\n• "status of [server name]"\n• "restart [server name]"\n• "start/stop [server name]"\n\nOr use ${config.prefix}ptall for the full command list.`)
    }


    if (intent === 'menu') {
        return reply(
            '╭══〘 *🤖 BERA AI — CAPABILITIES* 〙═⊷\n' +
            '┃\n' +
            '┃ I\'m Bera AI — your intelligent WhatsApp assistant.\n' +
            '┃ Here\'s a quick overview of what I can do:\n' +
            '┃\n' +
            '┃ 🎵 *Music* — play/find any song by name\n' +
            '┃ 🎨 *AI Images* — generate images from descriptions\n' +
            '┃ 👁️ *Vision* — analyze & describe images you send\n' +
            '┃ 🌐 *Web Search* — look up anything live online\n' +
            '┃ 🌍 *Translate* — translate to/from any language\n' +
            '┃ 📦 *Git/GitHub* — clone, push, create/delete repos\n' +
            '┃ 💻 *Shell* — run terminal commands directly\n' +
            '┃ 📁 *Files* — read, create, edit workspace files\n' +
            '┃ 📥 *Download* — TikTok, Instagram, Twitter videos\n' +
            '┃ 🖥️ *Panel* — control your Pterodactyl servers\n' +
            '┃ 🤖 *AI Chat* — code, writing, math, anything\n' +
            '┃\n' +
            '┃ 📋 *Full command list:* Type *.menu*\n' +
            '╰══════════════════⊷'
        )
    }

        return askNick(m, conn, reply, sender, text, imageBuffer)
}

const handle = async (m, { conn, text, reply, prefix, command, sender, isOwner }) => {
    const nickSender = m.sender || sender

    if (command === 'bera') {
        if (!text && !hasImage(m) && !hasImage(m.quoted)) return reply(
            `*Bera AI* — just talk to me.\n` +
            `${prefix}berareset · ${prefix}berarmemory · ${prefix}beraclone\n` +
            `Auto-mode: ${prefix}chatbot on/off`
        )

        let imageBuffer = null
        if (hasImage(m)) imageBuffer = await getImageBuffer(conn, m)
        else if (hasImage(m.quoted)) imageBuffer = await getImageBuffer(conn, m.quoted)

        let quotedContext = ''
        if (m.quoted && !imageBuffer) {
            const qText = m.quoted.text || m.quoted.body || m.quoted.caption || ''
            if (qText) quotedContext = `[Quoted]:\n"${qText}"\n\n`
        }

        const userText = quotedContext + (text || (imageBuffer ? 'Describe this image.' : ''))
        return handleAction(m, conn, reply, userText, nickSender, imageBuffer)
    }

    if (command === 'chatbot') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const action = text?.trim().toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}chatbot on/off`)
        global.db.data.settings = global.db.data.settings || {}
        const key = `chatbot_${m.chat}`
        global.db.data.settings[key] = action === 'on'
        await global.db.write()
        return reply(action === 'on' ? `✅ Auto-mode ON — Bera AI listens to everything.` : `✅ Auto-mode OFF.`)
    }

    if (command === 'berareset') {
        const history = getUserHistory(nickSender)
        const count = Math.floor(history.length / 2)
        global.db.data.users[nickSender].nickHistory = []
        await global.db.write()
        return reply(`✅ Memory cleared — ${count} exchange(s) wiped.`)
    }

    if (command === 'berarmemory') {
        const history = getUserHistory(nickSender)
        if (history.length === 0) return reply(`No memory yet. Start with ${prefix}bera <message>`)
        const lines = history.map(h => {
            const label = h.role === 'user' ? '👤' : '🤖'
            const preview = h.content.length > 100 ? h.content.slice(0, 100) + '…' : h.content
            return `${label} ${preview}`
        })
        return reply(`*${Math.floor(history.length / 2)} exchange(s):*\n\n${lines.join('\n\n')}`)
    }

    if (command === 'beraclone') {
        const history = getUserHistory(nickSender)
        if (history.length === 0) return reply(`Nothing to export yet.`)
        const lines = history.map(h => `[${h.role === 'user' ? '👤 YOU' : '🤖 BERA AI'}]\n${h.content}`).join('\n\n' + '─'.repeat(30) + '\n\n')
        const doc = `🤖 BERA AI AI — CONVERSATION\n${'═'.repeat(35)}\nTurns: ${Math.floor(history.length / 2)}\nDate: ${new Date().toUTCString()}\n${'═'.repeat(35)}\n\n${lines}`
        return conn.sendMessage(m.chat, {
            document: Buffer.from(doc, 'utf-8'),
            mimetype: 'text/plain',
            fileName: `Bera_AI_${Date.now()}.txt`,
            caption: `✅ *${Math.floor(history.length / 2)} exchange(s)* exported.`
        }, { quoted: m })
    }

    if (command === 'workspace') {
        const items = listWorkspace()
        const clonedRepos = global.db.data.settings?.clonedRepos || {}
        const lastCloned = global.db.data.settings?.lastCloned || ''
        if (!items.length) return reply(`Workspace is empty. Clone something first.`)
        const lines = items.map(i => {
            const gh = clonedRepos[i]
            const tag = i === lastCloned ? ' _(last)_' : ''
            return gh ? `📁 *${i}*${tag}\n🐙 github.com/${gh.github}` : `📁 *${i}*${tag}`
        }).join('\n\n')
        return reply(`*Workspace:*\n\n${lines}`)
    }

    if (command === 'tagreply') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        const action = text?.trim().toLowerCase()
        if (!action || !['on', 'off'].includes(action)) return reply(`Usage: ${prefix}tagreply on/off`)
        global.db.data.settings = global.db.data.settings || {}
        const key = `tagreply_${m.chat}`
        global.db.data.settings[key] = action === 'on'
        await global.db.write()
        return reply(action === 'on'
            ? `✅ Tag-reply ON — Bera AI responds when someone @mentions you.`
            : `✅ Tag-reply OFF.`
        )
    }

    if (command === 'setghtoken') {
        if (!isOwner) return reply(`⛔ Owner only.`)
        if (!text) return reply(`Usage: ${prefix}setghtoken <github_personal_access_token>`)
        process.env.GITHUB_TOKEN = text.trim()
        return reply(`✅ GitHub token set.`)
    }
}

handle.before = async (m, { conn, reply, prefix }) => {
    try {
        if (m.key?.fromMe) return

        const chatKey = `chatbot_${m.chat}`
        const chatbotOn = global.db.data.settings?.[chatKey] === true
        const sender = m.sender
        const pfx = global.db?.data?.settings?.prefix || prefix

        if (chatbotOn) {
            if (!m.text?.trim() && !hasImage(m)) return
            const text = m.text?.trim() || ''
            if (text.startsWith(pfx)) return
            let imageBuffer = null
            if (hasImage(m)) imageBuffer = await getImageBuffer(conn, m)
            await handleAction(m, conn, reply, text, sender, imageBuffer)
            return
        }

        const ownerJid = `${config.owner.replace(/[^0-9]/g, '')}@s.whatsapp.net`
        const tagReplyKey = `tagreply_${m.chat}`
        const tagReplyOn = global.db.data.settings?.[tagReplyKey] !== false
        const isGroup = m.chat?.endsWith('@g.us')
        const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
            m.message?.imageMessage?.contextInfo?.mentionedJid ||
            m.message?.videoMessage?.contextInfo?.mentionedJid ||
            m.msg?.contextInfo?.mentionedJid || []

        if (isGroup && tagReplyOn && Array.isArray(mentionedJids) && mentionedJids.includes(ownerJid)) {
            const msgText = m.text?.trim() || ''
            if (msgText.startsWith(pfx)) return
            const senderName = m.pushName || sender.split('@')[0]
            const context = `${senderName} just tagged the owner in a group and said: "${msgText || '(no message)'}" — The owner is not available right now. Respond as Bera AI, their AI assistant. Greet them briefly, introduce yourself, and help them or offer to pass the message along.`
            await askNick(m, conn, reply, sender, context)
            return
        }

        if (!m.text?.trim() && !hasImage(m)) return
        if (!m.quoted) return
        const nickMsgIds = global.db.data.users[sender]?.nickMsgIds || []
        if (!nickMsgIds.includes(m.quoted.id)) return
        if (typeof m.text === 'string' && m.text.startsWith(pfx)) return
        let imageBuffer = null
        if (hasImage(m)) imageBuffer = await getImageBuffer(conn, m)
        const userText = m.text?.trim() || ''
        await handleAction(m, conn, reply, userText, sender, imageBuffer)
    } catch (e) {
        console.error('[BERA BEFORE ERROR]', e.message)
    }
}

handle.command = ['bera', 'chatbot', 'beraclone', 'workspace', 'setghtoken', 'tagreply', 'transcribe', 'listen']
handle.tags = ['ai']

module.exports = handle
module.exports.handleAction = handleAction
