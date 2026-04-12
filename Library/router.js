const detectIntent = (text) => {
    if (!text) return 'chat'
    const t = text.toLowerCase().trim()

    // ── Menu / Help ─────────────────────────────────────────────────────────
    if (/\b(open|show|see|view|get|give|display)\b.{0,15}\b(menu|commands?|help|list)\b/.test(t) ||
        /\b(what('s| is| are)? (the )?commands?|what can you do|how (do i|to) use|available commands?)\b/.test(t) ||
        /^(menu|help|commands?|cmd list|command list|start|hi|hello|hey bera|hey bot)$/.test(t) ||
        /\b(bot (commands?|menu|help)|commands? list)\b/.test(t)) return 'menu'

    // ── NPM stats (before github to avoid conflict) ───────────────────────────
    if (/\b(npm|node package)\b.{0,40}\b(downloads?|stats?|weekly|monthly|installs?|popular|trending)\b/.test(t) ||
        /\b(how many|weekly|monthly)\b.{0,30}\b(downloads?|installs?)\b.{0,30}\b(get|does|has|have)\b/.test(t) ||
        /\bdownloads?\b.{0,20}\b(week|month|day)\b.{0,20}\bnpm\b/.test(t) ||
        /\bnpm\b.{0,20}\b(package stats?|package info|registry)\b/.test(t)) return 'npm_stats'

    // ── Group member lookup ───────────────────────────────────────────────────
    if (/\bwho\s+is\b.{0,30}(@\d+|@\w+)/.test(t) ||
        /\bwho'?s?\s+(this|that)\b.{0,20}(@\d+|@\w+)/.test(t) ||
        /\btell me\b.{0,20}\babout\b.{0,20}(@\d+|@\w+)/.test(t) ||
        /\binfo\b.{0,10}(on|about|for)\b.{0,20}(@\d+|@\w+)/.test(t) ||
        /(@\d{10,})\b.{0,20}\b(who|name|info|admin|phone|contact|number)\b/.test(t)) return 'group_lookup'

    // ── Image generation ─────────────────────────────────────────────────────
    if (/\b(create|generate|make|draw|produce|paint|render)\b.{0,30}\b(image|picture|photo|art|illustration|logo)\b/.test(t) ||
        /\b(image|picture|photo)\b.{0,20}\b(of|showing|with)\b/.test(t)) return 'image_gen'

    // ── Music / Play ─────────────────────────────────────────────────────────
    if (/\b(play|send|find|search|get|download)\b.{0,20}\b(song|music|audio|track|beat|mp3)\b/.test(t) ||
        /\b(music|song|audio)\b.{0,20}\b(by|from|called|named)\b/.test(t) ||
        /^play\s+\S/.test(t) ||
        /\b(play me|play some|send me|find me)\b.{0,30}\b(song|music|audio|by|from)/.test(t)) return 'music'

    // ── Social Media Download ─────────────────────────────────────────────────
    if (/tiktok\.com|instagram\.com|instagr\.am|twitter\.com|x\.com\/.*\/status|fb\.watch|facebook\.com\/.*\/videos/.test(t) ||
        /\b(download|dl|save)\b.{0,15}\b(tiktok|instagram|twitter|reel|tweet|video)\b/.test(t)) return 'download'

    // ── Translation ──────────────────────────────────────────────────────────
    if (/\b(translate|translation)\b.{0,30}\b(to|into|in)\b/.test(t) ||
        /\b(translate|translation)\b.{0,15}\b(this|it|text|message)\b/.test(t) ||
        /\bin\s+(english|spanish|french|arabic|swahili|chinese|hindi|portuguese|german|russian|japanese|yoruba|igbo|hausa|zulu|amharic|somali|italian|dutch|korean|turkish)\b/.test(t)) return 'translate'

    // ── Project creation ─────────────────────────────────────────────────────
    if (/\b(create|build|make|scaffold|setup|spin up|spin)\b.{0,30}\b(project|app|application|server|bot|api|website|web app)\b/.test(t) &&
        /\b(express|node|react|flask|fastapi|django|vue|svelte|port|pm2|http server)\b/.test(t)) return 'project_create'

    // ── PM2 management ───────────────────────────────────────────────────────
    if (/\bpm2\b.{0,20}\b(list|ls|show|processes?|apps?|running)\b/.test(t) ||
        /\b(list|show|what)\b.{0,20}\bpm2\b.{0,15}\b(processes?|apps?)\b/.test(t)) return 'pm2_list'

    if (/\bpm2\b.{0,20}\b(logs?|output|stdout)\b/.test(t) ||
        /\b(show|get|view)\b.{0,15}\b(logs?)\b.{0,20}\b(for|of|from)\b/.test(t) ||
        /\b(logs?)\b.{0,10}\bpm2\b/.test(t)) return 'pm2_logs'

    if (/\b(stop|kill|pause)\b.{0,20}\b(process|app|server|pm2|bot)\b/.test(t) && !/\b(pterodactyl|panel)\b/.test(t)) return 'pm2_manage'
    if (/\b(restart|reboot)\b.{0,20}\b(process|app|server|pm2)\b/.test(t) && !/\b(pterodactyl|panel)\b/.test(t)) return 'pm2_manage'
    if (/\b(start)\b.{0,20}\b(process|pm2)\b/.test(t) && !/\b(pterodactyl|panel)\b/.test(t)) return 'pm2_manage'

    // ── GitHub token ─────────────────────────────────────────────────────────
    if (/\b(regenerate|regen|refresh|renew|create|generate|new|lost|replace)\b.{0,25}\b(github|gh)\b.{0,15}\b(token|pat|key|access token)\b/.test(t) ||
        /\b(github|gh)\b.{0,15}\b(token|pat|key)\b.{0,25}\b(expired?|lost|broken|invalid|regenerate|regen|new)\b/.test(t)) return 'github_token'

    // ── Git ──────────────────────────────────────────────────────────────────
    if (/git\s*clone\b|clone\s+(repo|this|the|https?|git@)/.test(t)) return 'git_clone'
    if (/git\s*push\b|push\s+(to|code|this|changes?|my)\b/.test(t)) return 'git_push'

    // ── GitHub ───────────────────────────────────────────────────────────────
    if (/\b(list|show|my)\b.{0,15}\b(repo|repos|repositories)\b/.test(t) ||
        /\b(create|make|new)\b.{0,10}\b(repo|repository)\b/.test(t) ||
        /\b(delete|remove)\b.{0,10}\b(repo|repository)\b/.test(t) ||
        /\bgithub\b/.test(t) ||
        /\b(repo|repos|repository|repositories)\b/.test(t)) return 'github'

    // ── JS Eval ──────────────────────────────────────────────────────────────
    if (/\b(eval|evaluate)\b.{0,20}\b(this|code|js|javascript|script|snippet|expression)\b/.test(t) ||
        /\b(run|execute)\b.{0,20}\b(javascript|js|node|this code|this script)\b/.test(t) ||
        /\b(javascript|js)\b.{0,30}\b(this|code|snippet)\b/.test(t)) return 'js_eval'

    // ── File operations ───────────────────────────────────────────────────────
    if (/^(cat|read|open|view|show)\s+\S+\.(js|ts|json|txt|py|md|sh|env|html|css|yml|yaml|log)/.test(t) ||
        /\b(read|cat|view|show|open|display)\b.{0,20}\b(file|content|source)\b/.test(t)) return 'file_read'

    if (/\b(create|write|make|save)\b.{0,20}\b(file|script|\.js|\.txt|\.py|\.json|\.sh)\b/.test(t) ||
        /\b(edit|update|modify|overwrite|change)\b.{0,20}\b(file)\b/.test(t)) return 'file_write'

    if (/^ls\b|^ls\s/.test(t) ||
        /\b(list|ls|show|what)\b.{0,15}\b(files?|directory|folder|workspace|dirs?)\b/.test(t)) return 'file_list'

    // ── Shell ────────────────────────────────────────────────────────────────
    if (/\b(run|execute|exec|terminal|bash|shell|command|cmd)\b.{0,20}\b(this|command|script)\b/.test(t) ||
        /^(pwd|cd |mkdir|rm |echo |npm |node |git |pip |python |chmod |touch |mv |cp |cat |ls |ps |kill |curl |wget )/.test(t) ||
        /\b(ls|pwd|whoami|ps aux|cat |chmod |mkdir |rm |cp |mv |curl |wget )\b/.test(t)) return 'shell'

    // ── Agent ────────────────────────────────────────────────────────────────
    if (/\b(agent|automate|do it all|handle everything|take care of|step by step|multi.?step|do the following|plan and execute)\b/.test(t)) return 'agent'

    // ── Pterodactyl ──────────────────────────────────────────────────────────
    if (/\b(pterodactyl|panel|my server|vps panel|game server|hosting panel)\b/.test(t) ||
        /\b(start|stop|restart|kill)\b.{0,15}\b(server|vps|node|game)\b/.test(t) ||
        /\b(server\s+(status|resources|cpu|ram|memory|uptime))\b/.test(t)) return 'pterodactyl'

    // ── Web Search ───────────────────────────────────────────────────────────
    if (/\b(search|look up|find|google|what is|who is|latest|news|current|today)\b/.test(t) &&
        !/\b(song|music|repo|github|image|picture|file)\b/.test(t)) return 'search'

    return 'chat'
}

module.exports = { detectIntent }
