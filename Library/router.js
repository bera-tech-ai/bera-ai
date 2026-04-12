const detectIntent = (text) => {
    if (!text) return 'chat'
    const t = text.toLowerCase().trim()

    // ── Menu / Help ─────────────────────────────────────────────────────────
    if (/\b(open|show|see|view|get|give|display)\b.{0,15}\b(menu|commands?|help|list)\b/.test(t) ||
        /\b(what('s| is| are)? (the )?commands?|what can you do|how (do i|to) use|available commands?)\b/.test(t) ||
        /^(menu|help|commands?|cmd list|command list|start|hi|hello|hey bera|hey bot)$/.test(t) ||
        /\b(bot (commands?|menu|help)|commands? list)\b/.test(t)) return 'menu'

    // ── NPM stats ────────────────────────────────────────────────────────────
    if (/\b(npm|node package)\b.{0,40}\b(downloads?|stats?|weekly|monthly|installs?)\b/.test(t) ||
        /\b(how many|weekly|monthly)\b.{0,30}\b(downloads?|installs?)\b.{0,30}\b(get|does|has)\b/.test(t) ||
        /\bnpm\b.{0,20}\b(package stats?|package info)\b/.test(t)) return 'npm_stats'

    // ── Group member lookup ───────────────────────────────────────────────────
    if (/\bwho\s+is\b.{0,30}(@\d+|@\w+)/.test(t) ||
        /\b(info|details?)\b.{0,15}(on|about|for)\b.{0,20}(@\d+|@\w+)/.test(t) ||
        /(@\d{10,})\b.{0,20}\b(who|name|info|admin|phone)\b/.test(t)) return 'group_lookup'

    // ── Group analyzer ───────────────────────────────────────────────────────
    if (/\b(analyze|analyse|stats?|statistics?|info|details?)\b.{0,20}\b(group|chat|this group)\b/.test(t) ||
        /\b(group)\b.{0,15}\b(stats?|members?|admins?|count|info|analytics?)\b/.test(t) ||
        /\bhow many (members?|people|users?)\b.{0,15}\b(in|are in)\b.{0,10}\b(group|here|this)\b/.test(t)) return 'group_analyze'

    // ── System info ──────────────────────────────────────────────────────────
    if (/\b(system|server|machine|vps|host)\b.{0,20}\b(info|status|stats?|resources?|usage|health)\b/.test(t) ||
        /\b(how much|current|check)\b.{0,15}\b(ram|memory|cpu|disk|storage|space)\b/.test(t) ||
        /\b(ram|cpu|disk|memory|uptime|load average)\b.{0,15}\b(usage|used|available|free|status|info)\b/.test(t) ||
        /\b(what'?s? (the )?(cpu|ram|disk|memory|system) (usage|status|load))\b/.test(t)) return 'system_info'

    // ── Port check ───────────────────────────────────────────────────────────
    if (/\b(port|check port|is port|what'?s? on port|what is on port)\b.{0,15}\d+/.test(t) ||
        /\b(is\s+)?\bport\s+\d+\b.{0,20}\b(open|closed|listening|running|used|available)\b/.test(t) ||
        /\bwhat'?s? (running|listening|on) (port|:)\s*\d+/.test(t)) return 'port_check'

    // ── Docker management ────────────────────────────────────────────────────
    if (/\bdocker\b/.test(t) ||
        /\b(containers?)\b.{0,15}\b(list|show|running|status|logs?|start|stop|restart)\b/.test(t) ||
        /\b(list|show|how many)\b.{0,15}\b(containers?)\b/.test(t)) return 'docker'

    // ── Cron management ──────────────────────────────────────────────────────
    if (/\bcron(tab|job|task|schedule)?\b/.test(t) ||
        /\b(schedule|add|remove|list)\b.{0,20}\b(cron|scheduled task|job|recurring)\b/.test(t) ||
        /\b(every|daily|weekly|hourly|at \d+)\b.{0,30}\b(run|execute|do|trigger)\b/.test(t)) return 'cron'

    // ── Process kill ─────────────────────────────────────────────────────────
    if (/\b(kill|terminate|end|destroy)\b.{0,20}\b(process|pid|proc)\b/.test(t) ||
        /\bkill\s+(pid\s+)?\d+\b/.test(t) ||
        /\bpkill\b/.test(t)) return 'process_kill'

    // ── HTTP request ─────────────────────────────────────────────────────────
    if (/^(get|post|put|patch|delete|curl)\s+https?:\/\//i.test(t) ||
        /\b(make|send|call|hit|fetch|request)\b.{0,20}\b(api|http|get|post|put|endpoint|request)\b.{0,30}https?:\/\//.test(t) ||
        /\b(api call|http request|rest call)\b/.test(t)) return 'http_request'

    // ── Code review ──────────────────────────────────────────────────────────
    if (/\b(review|check|audit|inspect|look at)\b.{0,20}\b(this code|my code|the code|code)\b/.test(t) ||
        /\bcode\b.{0,15}\b(review|quality|issues?|feedback)\b/.test(t)) return 'code_review'

    // ── Code explain ─────────────────────────────────────────────────────────
    if (/\b(explain|describe|what does|tell me about|how does|understand)\b.{0,30}\b(this code|this file|code|\.js|\.py|\.ts)\b/.test(t) ||
        /\b(explain|what is|describe)\b.{0,20}\b(file|script|function|module)\b/.test(t)) return 'code_explain'

    // ── Bug finder ───────────────────────────────────────────────────────────
    if (/\b(find|detect|identify|scan|check for)\b.{0,20}\b(bugs?|errors?|issues?|problems?|crashes?)\b/.test(t) ||
        /\b(debug|bugcheck|bug scan)\b/.test(t) ||
        /\bwhat'?s?\b.{0,10}\bwrong\b.{0,20}\b(with|in)\b.{0,20}\b(this|code|file|script)\b/.test(t)) return 'bug_finder'

    // ── Image generation ─────────────────────────────────────────────────────
    if (/\b(create|generate|make|draw|produce|paint|render)\b.{0,30}\b(image|picture|photo|art|illustration|logo)\b/.test(t) ||
        /\b(image|picture|photo)\b.{0,20}\b(of|showing|with)\b/.test(t)) return 'image_gen'

    // ── Music / Play ─────────────────────────────────────────────────────────
    if (/\b(play|send|find|search|get|download)\b.{0,20}\b(song|music|audio|track|beat|mp3)\b/.test(t) ||
        /\b(music|song|audio)\b.{0,20}\b(by|from|called|named)\b/.test(t) ||
        /^play\s+\S/.test(t)) return 'music'

    // ── Social Media Download ─────────────────────────────────────────────────
    if (/tiktok\.com|instagram\.com|instagr\.am|twitter\.com|x\.com\/.*\/status|fb\.watch/.test(t) ||
        /\b(download|dl|save)\b.{0,15}\b(tiktok|instagram|twitter|reel|tweet|video)\b/.test(t)) return 'download'

    // ── Translation ──────────────────────────────────────────────────────────
    if (/\b(translate|translation)\b.{0,30}\b(to|into|in)\b/.test(t) ||
        /\bin\s+(english|spanish|french|arabic|swahili|chinese|hindi|portuguese)\b/.test(t)) return 'translate'

    // ── Project creation ─────────────────────────────────────────────────────
    if (/\b(create|build|make|scaffold|setup|spin up|spin)\b.{0,30}\b(project|app|application|server|api|website)\b/.test(t) &&
        /\b(express|node|react|flask|fastapi|django|vue|port|pm2|http)\b/.test(t)) return 'project_create'

    // ── PM2 management ───────────────────────────────────────────────────────
    if (/\bpm2\b.{0,20}\b(list|ls|show|processes?|apps?|running)\b/.test(t) ||
        /\b(list|show|what)\b.{0,20}\bpm2\b/.test(t)) return 'pm2_list'
    if (/\bpm2\b.{0,20}\b(logs?)\b/.test(t) || /\b(logs?)\b.{0,10}\bpm2\b/.test(t)) return 'pm2_logs'
    if (/\b(stop|kill|pause|restart|reboot|start)\b.{0,20}\b(process|app|server|pm2)\b/.test(t) &&
        !/\b(pterodactyl|panel|docker|container)\b/.test(t)) return 'pm2_manage'

    // ── BeraHost / Pterodactyl ────────────────────────────────────────────────
    if (/\b(deploy|host|create|spin up|launch|start)\b.{0,30}\b(bot|server|instance|node)\b.{0,20}\b(berahost|panel|pterodactyl|hosting)\b/.test(t) ||
        /\b(berahost|pterodactyl)\b.{0,20}\b(deploy|create|new|list|show|status|stop|start|restart)\b/.test(t) ||
        /\b(deploy|host)\b.{0,20}\b(bot|server)\b/.test(t) && /\b(berahost|panel|lordeagle|pterodactyl)\b/.test(t)) return 'berahost_deploy'
    if (/\b(list|show|my)\b.{0,20}\b(hosted|running|deployed|active)\b.{0,15}\b(bots?|servers?|instances?)\b/.test(t) ||
        /\b(berahost|pterodactyl)\b.{0,15}\b(list|servers?|bots?|show)\b/.test(t)) return 'berahost_list'
    if (/\b(berahost|panel|pterodactyl)\b.{0,20}\b(start|stop|restart|kill)\b/.test(t) ||
        /\b(start|stop|restart)\b.{0,20}\b(my bot|my server|hosted bot|panel server)\b/.test(t)) return 'berahost_power'
    if (/\b(berahost|panel|server)\b.{0,15}\b(resources?|usage|ram|cpu|disk|memory)\b/.test(t)) return 'berahost_resources'

    // ── Usage stats ──────────────────────────────────────────────────────────
    if (/\b(bot\s+)?(usage|stats?|analytics?|statistics?)\b/.test(t) ||
        /\b(top (commands?|users?)|most (used|popular)|command count)\b/.test(t) ||
        /\b(how many (users?|commands?|messages?))\b.{0,20}\b(bot|handled|processed|used)\b/.test(t)) return 'usage_stats'

    // ── Log analyze ──────────────────────────────────────────────────────────
    if (/\b(analyze|analyse|check|read|scan)\b.{0,20}\b(logs?|log file|error log|crash log)\b/.test(t) ||
        /\b(what('s| is) (in|wrong with))\b.{0,15}\b(log|error log|crash)\b/.test(t)) return 'log_analyze'

    // ── Schedule message ─────────────────────────────────────────────────────
    if (/\b(schedule|send|remind|remind me|set reminder|remind (me|them)|send at|send in)\b.{0,30}\b(message|msg|text|reminder)\b/.test(t) ||
        /\b(in \d+ (minutes?|hours?|seconds?))\b.{0,20}\b(send|message|remind|notify)\b/.test(t)) return 'schedule_msg'

    // ── Broadcast ────────────────────────────────────────────────────────────
    if (/\b(broadcast|mass (send|message)|send to (all|everyone|multiple))\b/.test(t)) return 'broadcast'

    // ── Backup ───────────────────────────────────────────────────────────────
    if (/\b(backup|back up|zip|archive)\b.{0,20}\b(folder|directory|files?|project|repo)\b/.test(t)) return 'backup'

    // ── GitHub token ─────────────────────────────────────────────────────────
    if (/\b(regenerate|regen|refresh|renew|new|lost|replace)\b.{0,25}\b(github|gh)\b.{0,15}\b(token|pat|key)\b/.test(t) ||
        /\b(github|gh)\b.{0,15}\b(token|pat|key)\b.{0,25}\b(expired?|lost|broken|regen|new)\b/.test(t)) return 'github_token'

    // ── Git operations ───────────────────────────────────────────────────────
    if (/\b(git status|what changed|git diff|uncommitted|git log|recent commits?)\b/.test(t) ||
        /\b(show|check|view)\b.{0,15}\b(git status|changes?|diff|commits?)\b/.test(t)) return 'git_status'
    if (/git\s*clone\b|clone\s+(repo|this|the|https?|git@)/.test(t)) return 'git_clone'
    if (/git\s*push\b|push\s+(to|code|this|changes?|my)\b/.test(t)) return 'git_push'

    // ── GitHub ───────────────────────────────────────────────────────────────
    if (/\b(list|show|my)\b.{0,15}\b(repo|repos|repositories)\b/.test(t) ||
        /\b(create|make|new)\b.{0,10}\b(repo|repository)\b/.test(t) ||
        /\bgithub\b/.test(t)) return 'github'

    // ── JS Eval ──────────────────────────────────────────────────────────────
    if (/\b(eval|evaluate)\b.{0,20}\b(this|code|js|javascript|script|snippet)\b/.test(t) ||
        /\b(run|execute)\b.{0,20}\b(javascript|js|node|this code|this script)\b/.test(t)) return 'js_eval'

    // ── File operations ───────────────────────────────────────────────────────
    if (/^(cat|read|open|view|show)\s+\S+\.(js|ts|json|txt|py|md|sh)/.test(t) ||
        /\b(read|cat|view|show|open)\b.{0,20}\b(file|content|source)\b/.test(t)) return 'file_read'
    if (/\b(create|write|make|save)\b.{0,20}\b(file|script|\.js|\.txt|\.py|\.json)\b/.test(t) ||
        /\b(edit|update|modify|overwrite)\b.{0,20}\b(file)\b/.test(t)) return 'file_write'
    if (/^ls\b|^ls\s/.test(t) ||
        /\b(list|ls|show|what)\b.{0,15}\b(files?|directory|folder|workspace)\b/.test(t)) return 'file_list'

    // ── Shell ────────────────────────────────────────────────────────────────
    if (/\b(run|execute|exec|terminal|bash|shell|command)\b.{0,20}\b(this|command|script)\b/.test(t) ||
        /^(pwd|cd |mkdir|rm |echo |npm |node |git |pip |python |chmod |touch |mv |cp )/.test(t)) return 'shell'

    // ── Agent ────────────────────────────────────────────────────────────────
    if (/\b(agent|automate|do it all|handle everything|take care of|multi.?step|plan and execute)\b/.test(t)) return 'agent'

    // ── Web Search ───────────────────────────────────────────────────────────
    if (/\b(search|look up|find|google|what is|who is|latest|news|current|today)\b/.test(t) &&
        !/\b(song|music|repo|github|image|picture|file|docker|port|group)\b/.test(t)) return 'search'


    if (/\b(scrape|extract content|fetch content|read page)\b.{0,20}https?:\/\//.test(t)) return 'web_scrape'
    if (/\b(dns|nslookup|dig)\b.{0,20}\b(check|record|lookup|resolve)\b/.test(t) || /\b(check|resolve)\b.{0,10}\bdns\b/.test(t)) return 'dns_check'
    if (/\b(ssl|certificate|cert)\b.{0,20}\b(check|valid|expir|status)\b/.test(t)) return 'ssl_check'
    if (/\b(write|generate|create)\b.{0,20}\b(function|class|script|program|module|snippet)\b/.test(t) || /\b(generate|write)\b.{0,10}\b(js|python|bash|html|css|typescript)\b.{0,20}\b(code|script)\b/.test(t)) return 'code_gen'
    if (/\b(env|environment)\b.{0,20}\b(var|variable|key|set|get|list|delete)\b/.test(t) || /\b(set|get|list|delete)\b.{0,10}\b(env|\.env)\b/.test(t)) return 'env_manage'
    if (/\b(search|find|grep)\b.{0,25}\b(in|inside|across)\b.{0,15}\b(file|files|code|project)\b/.test(t)) return 'file_search'
    if (/\b(diff|compare)\b.{0,20}\b(file|between|two)\b/.test(t)) return 'file_diff'
    if (/\b(is|check|ping)\b.{0,20}\b(up|down|online|offline|alive)\b.{0,20}https?:\/\//.test(t)) return 'url_check'
    if (/\b(generate|create|make|give)\b.{0,15}\b(password|passphrase|token|secret)\b/.test(t) || /\b(random|secure)\b.{0,10}\bpassword\b/.test(t)) return 'password_gen'
    if (/\b(format|validate|minify|pretty.?print)\b.{0,15}\bjson\b/.test(t) || /\bjson\b.{0,15}\b(format|validate|minify|keys)\b/.test(t)) return 'json_tools'
    if (/\bping\b.{0,20}\b(\w+\.\w+|\d{1,3}\.\d{1,3})\b/.test(t)) return 'ping'
    if (/\bwhois\b/.test(t) || /\b(domain info|who owns)\b.{0,15}\bdomain\b/.test(t)) return 'whois'
    if (/\b(lookup|check|info)\b.{0,15}\b(ip|ip address)\b/.test(t) || /\bip\b.{0,10}\b(location|country|city|isp)\b/.test(t)) return 'ip_lookup'

    if (/\b(clone|redeploy|copy|duplicate)\b.{0,20}\b(bot|server)\b/.test(t) || /\bdeploy\s+(?:bot\s+)?[\w-]+\b/.test(t)) return 'bh_clone'
    if (/\b(file|files|read file|list files|file manager)\b.{0,20}\b(server|berahost)\b/.test(t)) return 'bh_files'
    if (/\b(my bots|my servers|list my servers|show my bots|owner servers)\b/.test(t)) return 'bh_owner_list'
    if (/\b(reinstall|fresh install|clean install)\b.{0,20}\b(server|bot)\b/.test(t)) return 'bh_reinstall'
    if (/\bsuspend\b.{0,20}\b(server|bot)\b/.test(t)) return 'bh_suspend'
    if (/\b(unsuspend|enable server|restore server)\b/.test(t)) return 'bh_unsuspend'
    if (/\b(upgrade|more ram|more cpu|increase ram)\b.{0,20}\b(server|bot)\b/.test(t)) return 'bh_upgrade'
    if (/\b(console command|run command|send command)\b.{0,20}\b(server|bot)\b/.test(t)) return 'bh_console'
    if (/\b(server logs|console output|server output)\b/.test(t)) return 'bh_logs'
    if (/\b(server (info|config|details)|show server|info of server)\b/.test(t)) return 'bh_server_info'
    if (/\b(setbhclientkey|set client key|pterodactyl client key)\b/.test(t)) return 'bh_set_client_key'

    return 'chat'
}

module.exports = { detectIntent }
