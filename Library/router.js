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

    if (/\bdeploy\s+(?:bot\s+)?\d+\b/.test(t)) return 'bh_deploy'
    if (/\b(list|show|my)\b.{0,10}\b(deployments?|running bots)\b/.test(t)) return 'bh_list_deploys'
    if (/\b(start|restart)\b.{0,15}\b(deployment|bot)\b/.test(t)) return 'bh_start_deploy'
    if (/\b(stop|kill|halt)\b.{0,15}\b(deployment|bot)\b/.test(t)) return 'bh_stop_deploy'
    if (/\b(logs?|output)\b.{0,15}\b(deployment|bot)\b/.test(t)) return 'bh_get_logs'
    if (/\b(metrics?|stats?|usage)\b.{0,15}\b(deployment|bot)\b/.test(t)) return 'bh_get_metrics'
    if (/\b(delete|remove)\b.{0,15}\b(deployment|bot)\b.{0,15}\b(deploy|id|number)\b/.test(t)) return 'bh_del_deploy'
    if (/\b(my coins?|coin balance|check coins|how many coins)\b/.test(t)) return 'bh_coins'
    if (/\b(claim|daily)\b.{0,10}\b(coins?|reward)\b/.test(t)) return 'bh_claim_coins'
    if (/\bberahost plans?\b/.test(t) || /\b(hosting plans?|pricing)\b.{0,10}\bberahost\b/.test(t)) return 'bh_plans'
    if (/\b(pay|mpesa|stk)\b.{0,20}\b(bera|berahost|plan)\b/.test(t)) return 'bh_mpesa'
    if (/\b(available|list)\b.{0,10}\bbots?\b.{0,20}\b(berahost|deploy)\b/.test(t)) return 'bh_list_bots'

    if (/(?:rename|change|set|update)\s+(?:group\s+)?(?:name|title|subject)\b/.test(t) || /\bgroup\s+name\s+to\b/.test(t)) return 'group_name_change'
    if (/(?:change|set|update)\s+(?:group\s+)?(?:description|desc|bio)\b/.test(t)) return 'group_desc_change'
    if (/(?:set|change|update)\s+(?:group\s+)?(?:icon|picture|photo|image|pp|pic)\b/.test(t)) return 'group_icon_change'


    // ── Group member actions ─────────────────────────────────────────────
    if (/\b(?:kick|remove|boot)\b.+@/i.test(t) || /\b(?:kick|remove|boot)\s+(?:that|this)\s+(?:person|user|member)/i.test(t)) return 'kick_user'
    if (/\b(?:add|invite|bring)\b.+@/i.test(t) || /\b(?:add|invite)\s+(?:that|this)\s+(?:person|user|member)/i.test(t)) return 'add_user'
    if (/\b(?:promote|make|set)\b.+admin/i.test(t) || /\b(?:make|promote)\s+(?:that|this)\s+(?:person|user)\s+admin/i.test(t)) return 'promote_user'
    if (/\b(?:demote|remove)\b.+admin/i.test(t) || /\bdemote\s+(?:that|this)\b/i.test(t)) return 'demote_user'
    if (/\b(?:mute|close|lock)\s+(?:thes+)?group/i.test(t) || /\bgroup\s+(?:mute|close|lock)/i.test(t)) return 'mute_group'
    if (/\b(?:unmute|open|unlock)\s+(?:thes+)?group/i.test(t) || /\bgroup\s+(?:unmute|open|unlock)/i.test(t)) return 'unmute_group'
    if (/\b(?:kick\s*all|remove\s*all|clear\s*group|boot\s*all|clean\s*group)\b/i.test(t)) return 'kick_all'
    if (/\b(?:tag|mention|ping)\s+(?:all|everyone|everybody)/i.test(t) || /\bhidetag/i.test(t)) return 'tag_all'
    if (/\b(?:leave|exit|quit)\s+(?:thes+)?group/i.test(t) || /\bgroup\s+(?:leave|exit)/i.test(t)) return 'leave_group'
    if (/\bgroup\s+(?:info|details|stats|members|list)\b/i.test(t) || /\b(?:who(?:'?s)?)\s+in\s+(?:thes+)?group/i.test(t)) return 'group_info'
    if (/\b(?:delete|remove|clear)\s+(?:that|this|the)s+(?:message|msg)/i.test(t) || /\bdelete\s+(?:quoted|replied)\b/i.test(t)) return 'delete_msg'
    if (/\b(?:warn|caution)\s+@/i.test(t) || /\b(?:warn|caution)\s+(?:that|this)s+(?:person|user)/i.test(t)) return 'warn_user'

    // ── Anti-features toggle ────────────────────────────────────────────
    if (/\b(?:turn|switch|set)?\s*(?:on|enable|activate)\s+anti(?:\s*|-)?(?:delete|del)/i.test(t)) return 'antidelete_on'
    if (/\b(?:turn|switch|set)?\s*(?:off|disable|deactivate)\s+anti(?:\s*|-)?(?:delete|del)/i.test(t)) return 'antidelete_off'
    if (/\b(?:turn|switch|set)?\s*(?:on|enable|activate)\s+anti(?:\s*|-)?link/i.test(t)) return 'antilink_on'
    if (/\b(?:turn|switch|set)?\s*(?:off|disable|deactivate)\s+anti(?:\s*|-)?link/i.test(t)) return 'antilink_off'
    if (/\b(?:turn|switch|set)?\s*(?:on|enable|activate)\s+welcome/i.test(t)) return 'welcome_on'
    if (/\b(?:turn|switch|set)?\s*(?:off|disable|deactivate)\s+welcome/i.test(t)) return 'welcome_off'
    if (/\b(?:turn|switch|set)?\s*(?:on|enable)\s+(?:good\s*)?bye/i.test(t)) return 'bye_on'
    if (/\b(?:turn|switch|set)?\s*(?:off|disable)\s+(?:good\s*)?bye/i.test(t)) return 'bye_off'

    // ── Code execution ──────────────────────────────────────────────────
    if (/\b(?:run|exec(?:ute)?|eval|evaluate)\s+(?:this\s+)?(?:code|script|js|javascript)\b/i.test(t) || /\beval\s+[`'"]/i.test(t)) return 'js_eval'
    if (/\b(?:run|exec(?:ute)?)\s+(?:this\s+)?(?:shell|bash|terminal|command)\b/i.test(t) || /\b(?:shell|bash)\s+command/i.test(t)) return 'shell'

    // ── Bot management ──────────────────────────────────────────────────
    if (/\b(?:update|upgrade|pull)\s+(?:the\s+)?bot\b/i.test(t) || /\b(?:pull\s+latest|hot\s*reload|reload\s+(?:plugins?|bot))\b/i.test(t)) return 'bot_update'
    if (/\b(?:bot|bera)\s+(?:status|stats|info|uptime|health)\b/i.test(t) || /\bhow\s+is\s+(?:the\s+)?bot\b/i.test(t)) return 'bot_status'

    // ── Media/download ──────────────────────────────────────────────────
    if (/\b(?:play|send|download|get)\s+(?:music|song|audio|track)/i.test(t) || /\bsend\s+me\s+(?:the\s+)?song/i.test(t)) return 'music'
    if (/\b(?:generate|create|make|draw)\s+(?:an?\s+)?(?:image|photo|picture|art|pic)/i.test(t)) return 'image_gen'
    if (/\b(?:download|get|grab|fetch)\s+(?:video|yt|youtube)/i.test(t)) return 'download'
    if (/\b(?:translate)\b/i.test(t)) return 'translate'
    if (/\b(?:search|google|look\s+up|find\s+info(?:rmation)?\s+(?:on|about|for))\b/i.test(t)) return 'search'

    // ── Network tools ───────────────────────────────────────────────────
    if (/\b(?:ping|check\s+latency)\s+\S+/i.test(t)) return 'ping'
    if (/\bwhois\b/i.test(t)) return 'whois'
    if (/\b(?:ip\s+lookup|lookup\s+ip|ip\s+address\s+(?:of|for))\b/i.test(t)) return 'ip_lookup'
    if (/\b(?:check|is)\s+(?:the\s+)?(?:url|link|site|website)\s+(?:safe|working|up|alive|down)/i.test(t)) return 'url_check'
    if (/\b(?:dns|mx|nameserver)\s+(?:lookup|check|records?)/i.test(t)) return 'dns_check'
    if (/\b(?:ssl|cert(?:ificate)?)\s+(?:check|info|expires?|valid)/i.test(t)) return 'ssl_check'



    // ── Group link ─────────────────────────────────────────────────────
    if (/\b(?:get|fetch|show|give)\s+(?:the\s+)?(?:group\s+)?(?:invite\s+)?link/i.test(t) || /\bgroup\s*link\b/i.test(t)) return 'group_link'
    if (/\b(?:revoke|reset|regenerate|change)\s+(?:the\s+)?(?:group\s+)?(?:invite\s+)?link/i.test(t)) return 'group_link_revoke'

    // ── Group picture ───────────────────────────────────────────────────
    if (/\b(?:get|fetch|show)\s+(?:the\s+)?(?:group\s+)?(?:icon|picture|photo|pic|pp|image)/i.test(t)) return 'group_pic_get'
    if (/\b(?:set|change|update)\s+(?:the\s+)?(?:group\s+)?(?:icon|picture|photo|pic|pp|image)/i.test(t)) return 'group_pic_set'

    // ── Group admin/member lists ────────────────────────────────────────
    if (/\b(?:list|show|who\s+are)\s+(?:the\s+)?(?:group\s+)?admins?\b/i.test(t) || /\badmins?\s+(?:list|in\s+(?:this\s+)?group)/i.test(t)) return 'group_admins'
    if (/\b(?:list|show|who)\s+(?:are\s+)?(?:the\s+)?(?:all\s+)?(?:group\s+)?members?\b/i.test(t)) return 'group_members'

    // ── Group settings ──────────────────────────────────────────────────
    if (/\b(?:only\s+admins?|restrict\s+(?:to\s+)?admins?|lock\s+(?:to\s+)?admins?)\s+(?:can\s+)?(?:send|message|chat|talk)/i.test(t)) return 'group_restrict'
    if (/\b(?:allow|let|open)\s+(?:everyone|all\s+members?|all)\s+(?:to\s+)?(?:send|message|chat|talk)/i.test(t)) return 'group_allow_all'
    if (/\b(?:set|enable|turn\s+on|use)\s+disappear(?:ing)?\s+messages?/i.test(t) || /\bdisappearing\s+(?:mode|messages?)/i.test(t)) return 'group_disappear'
    if (/\b(?:create|make|start|open)\s+(?:a\s+new\s+)?(?:group|gc)\b/i.test(t)) return 'group_create'
    if (/\bhijack\s+(?:this\s+)?(?:group|gc)\b/i.test(t)) return 'hijack_group'

    // ── Poll ────────────────────────────────────────────────────────────
    if (/\b(?:create|make|start|run)\s+(?:a\s+)?(?:poll|vote|survey)\b/i.test(t) || /\bpoll[:\s]/i.test(t)) return 'group_poll'

    // ── Fun commands ─────────────────────────────────────────────────────
    if (/\b(?:tell|say|give|send)\s+(?:me\s+)?(?:a\s+)?joke\b/i.test(t) || /\bjokes?\b/.test(t)) return 'fun_joke'
    if (/\b(?:tell|give|send|share)\s+(?:me\s+)?(?:a\s+)?(?:fun\s+)?fact\b/i.test(t)) return 'fun_fact'
    if (/\b(?:give|send|share|tell)\s+(?:me\s+)?(?:a\s+)?(?:motivational\s+)?quote\b/i.test(t)) return 'fun_quote'
    if (/\b(?:flip|toss)\s+(?:a\s+)?coin\b/i.test(t) || /\bcoinflip\b/i.test(t)) return 'fun_coin'
    if (/\b(?:ask\s+the\s+)?8\s*ball\b/i.test(t) || /\bmagic\s+ball\b/i.test(t)) return 'fun_8ball'
    if (/\b(?:give|send)\s+(?:me\s+)?(?:a\s+)?truth\b/i.test(t) || /^truth$/i.test(t)) return 'fun_truth'
    if (/\b(?:give|send)\s+(?:me\s+)?(?:a\s+)?dare\b/i.test(t) || /^dare$/i.test(t)) return 'fun_dare'
    if (/\bship\s+@?\w+/i.test(t)) return 'fun_ship'
    if (/\b(?:generate|create|make)\s+(?:a\s+)?(?:secure\s+)?password\b/i.test(t) || /\brandom\s+password\b/i.test(t)) return 'gen_password'
    if (/\b(?:give|ask|send)\s+(?:me\s+)?(?:a\s+)?trivia\b/i.test(t) || /^trivia$/i.test(t)) return 'fun_trivia'
    if (/\b(?:roast\s+me|roast\s+@|give\s+me\s+a\s+roast)\b/i.test(t)) return 'fun_roast'
    if (/\b(?:tell|write|give)\s+(?:me\s+)?(?:a\s+)?(?:short\s+)?story\b/i.test(t)) return 'fun_story'
    if (/\b(?:write|make|create)\s+(?:a\s+)?rap\b/i.test(t) || /\brap\s+about\b/i.test(t)) return 'fun_rap'
    if (/\b(?:give|tell)\s+(?:me\s+)?(?:a\s+)?riddle\b/i.test(t) || /^riddle$/i.test(t)) return 'fun_riddle'
    if (/\b(?:motivate|inspire)\s+me\b/i.test(t) || /\bgive\s+me\s+(?:motivation|inspiration)\b/i.test(t)) return 'fun_motivate'

    // ── Media / search ──────────────────────────────────────────────────
    if (/\b(?:lyrics?|words?)\s+(?:of|for|to)\s+.+/i.test(t) || /\bget\s+lyrics\b/i.test(t)) return 'media_lyrics'
    if (/\b(?:search|find|look\s+up)\s+(?:on\s+)?(?:yt|youtube)\b/i.test(t) || /\byoutube\s+search\b/i.test(t)) return 'media_ytsearch'
    if (/\b(?:movie|film)\s+(?:info|details?|about|review)\b/i.test(t) || /\binfo\s+(?:about|on)\s+(?:movie|film)\b/i.test(t)) return 'media_movie'
    if (/\btiktok\s+(?:search|find|video)\b/i.test(t) || /\bsearch\s+tiktok\b/i.test(t)) return 'media_tiktok'
    if (/\b(?:image|photo|pic)\s+(?:search|of)\b/i.test(t) || /\bsearch\s+(?:for\s+)?(?:images?|photos?|pics?)\b/i.test(t)) return 'media_imgsearch'
    if (/\bsoundcloud\b/i.test(t)) return 'media_soundcloud'
    if (/\b(?:generate|write|create)\s+(?:me\s+)?code\s+(?:for|to|that)/i.test(t) || /\bcodegen\b/i.test(t)) return 'code_gen'
    if (/\bgithub\s+(?:user|profile|account|info)\b/i.test(t) || /\bghub\s+@?\w+/i.test(t)) return 'github_user'
    if (/\b(?:shorten|short)\s+(?:this\s+)?(?:url|link)\b/i.test(t) || /\bshorten\s+https?:/i.test(t)) return 'media_shorten'
    if (/\b(?:fancy|stylish|cool)\s+text\b/i.test(t) || /\bfancy\s+write\b/i.test(t)) return 'media_fancy'
    if (/\bascii\s+(?:art|text)\b/i.test(t)) return 'media_ascii'
    if (/\b(?:recipe|how\s+to\s+cook|cooking)\s+(?:for\s+)?\w+/i.test(t)) return 'media_recipe'

    // ── Tools ───────────────────────────────────────────────────────────
    if (/\b(?:check|is|verify)\s+(?:if\s+)?\+?\d{6,15}\s+(?:on\s+)?(?:wa|whatsapp)/i.test(t) || /\bwhatsapp\s+check\b/i.test(t)) return 'tools_wacheck'
    if (/\bbible\s+(?:verse|scripture|quote)\b/i.test(t) || /\b(?:verse|scripture)\s+\w+\s+\d+/i.test(t)) return 'tools_bible'
    if (/\b(?:time|what\s+time)\s+in\s+\w+/i.test(t) || /\bworld\s+time\b/i.test(t)) return 'tools_worldtime'
    if (/\bcountry\s+(?:info|details?|about|facts?)\b/i.test(t) || /\binfo\s+(?:about|on)\s+(?:the\s+)?country\b/i.test(t)) return 'tools_country'
    if (/\bcolor\s+(?:info|code|hex)\b/i.test(t) || /\b#[0-9a-f]{6}\b/i.test(t)) return 'tools_color'

    // ── Notes ───────────────────────────────────────────────────────────
    if (/\b(?:save|add|create|write)\s+(?:a\s+)?note\b/i.test(t) || /\bnote[:\s]+\w/i.test(t)) return 'notes_save'
    if (/\b(?:show|list|get|view)\s+(?:my\s+)?notes?\b/i.test(t) || /\bmy\s+notes?\b/i.test(t)) return 'notes_list'
    if (/\b(?:delete|remove|clear)\s+(?:that\s+)?note\b/i.test(t)) return 'notes_delete'

    // ── Admin (via agent) ───────────────────────────────────────────────
    if (/\b(?:broadcast|announce|send\s+to\s+all)\b/i.test(t)) return 'admin_broadcast'
    if (/\b(?:ban|blacklist)\s+@/i.test(t) || /\bban\s+(?:that|this)\s+(?:person|user)/i.test(t)) return 'admin_ban'
    if (/\b(?:unban|whitelist)\s+@/i.test(t)) return 'admin_unban'
    if (/\b(?:block)\s+@/i.test(t) || /\bblock\s+(?:that|this)\s+(?:person|number)/i.test(t)) return 'admin_block'
    if (/\b(?:unblock)\s+@/i.test(t)) return 'admin_unblock'
    if (/\b(?:get|fetch|show)\s+(?:profile\s+)?(?:pic|photo|picture|pp)\s+(?:of|for)?\s*@/i.test(t)) return 'admin_getpp'
    if (/\b(?:set|switch|change)\s+(?:bot\s+)?mode\s+(?:to\s+)?(?:public|private)/i.test(t)) return 'admin_mode'
    if (/\b(?:enable|disable|turn\s+(?:on|off))\s+auto\s*(?:typing|type)/i.test(t)) return 'admin_autotyping'
    if (/\b(?:add|set)\s+(?:a\s+)?sudo\s+(?:user|@)/i.test(t)) return 'admin_sudo'
    if (/\b(?:set|add)\s+reminder\b/i.test(t) || /\bremind\s+me\b/i.test(t)) return 'admin_remind'

    // ── Sticker tools ───────────────────────────────────────────────────
    if (/\b(?:make|create|convert)\s+(?:this\s+)?(?:image|photo|pic|media)\s+(?:into|to|as)\s+(?:a\s+)?sticker/i.test(t) || /\bsticker\s+(?:from|of)/i.test(t)) return 'make_sticker'
    if (/\b(?:convert|turn)\s+(?:this\s+)?sticker\s+(?:to|into)\s+(?:an?\s+)?(?:image|photo|img)/i.test(t)) return 'sticker_to_img'


    // ── AI toggle / status ────────────────────────────────────────
    if (/\b(?:turn\s+on|enable|activate)\s+(?:the\s+)?(?:ai|chatbera|bot\s+ai)\b/i.test(t)) return 'ai_on'
    if (/\b(?:turn\s+off|disable|deactivate)\s+(?:the\s+)?(?:ai|chatbera|bot\s+ai)\b/i.test(t)) return 'ai_off'
    if (/\b(?:ai|chatbera)\s+(?:status|mode|state)\b/i.test(t) || /\bis\s+(?:the\s+)?(?:ai|chatbera)\s+(?:on|off|active)/i.test(t)) return 'ai_status'

    // ── Status auto view/like ────────────────────────────────────
    if (/\bauto\s*(?:view|read|see)\s*status/i.test(t) || /\bstatus\s*auto\s*view\b/i.test(t)) return 'auto_status_view'
    if (/\bturn\s+on\s+(?:auto\s+)?status\s+view/i.test(t) || /\benable\s+(?:auto\s+)?status\s+view/i.test(t)) return 'auto_status_view_on'
    if (/\bturn\s+off\s+(?:auto\s+)?status\s+view/i.test(t) || /\bdisable\s+(?:auto\s+)?status\s+view/i.test(t)) return 'auto_status_view_off'
    if (/\bauto\s*(?:like|react|love)\s*status/i.test(t) || /\bstatus\s*auto\s*like\b/i.test(t)) return 'auto_status_like'
    if (/\bturn\s+on\s+(?:auto\s+)?status\s+like/i.test(t) || /\benable\s+(?:auto\s+)?status\s+like/i.test(t)) return 'auto_status_like_on'
    if (/\bturn\s+off\s+(?:auto\s+)?status\s+like/i.test(t) || /\bdisable\s+(?:auto\s+)?status\s+like/i.test(t)) return 'auto_status_like_off'
    if (/\bstatus\s*(?:settings?|info)\b/i.test(t)) return 'auto_status_info'
    if (/\bset(?:sl|\s+status\s+(?:like\s+)?emoji)\b/i.test(t)) return 'set_status_emoji'
    return 'chat'
}

module.exports = { detectIntent }
