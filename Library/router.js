const detectIntent = (text) => {
    if (!text) return 'chat'
    const t = text.toLowerCase().trim()

    if (/\b(create|generate|make|draw|produce|paint|render)\b.{0,30}\b(image|picture|photo|art|illustration|logo)\b/.test(t) ||
        /\b(image|picture|photo)\b.{0,20}\b(of|showing|with)\b/.test(t)) return 'image_gen'

    if (/\b(play|send|find|search|get|download)\b.{0,20}\b(song|music|audio|track|beat|mp3)\b/.test(t) ||
        /\b(music|song|audio)\b.{0,20}\b(by|from|called|named)\b/.test(t)) return 'music'

    if (/tiktok\.com|instagram\.com|instagr\.am|twitter\.com|x\.com\/.*\/status|fb\.watch|facebook\.com\/.*\/videos/.test(t) ||
        /\b(download|dl|save)\b.{0,15}\b(tiktok|instagram|twitter|reel|tweet|video)\b/.test(t)) return 'download'

    if (/\b(translate|translation)\b.{0,30}\b(to|into|in)\b/.test(t) ||
        /\b(translate|translation)\b.{0,15}\b(this|it|text|message)\b/.test(t) ||
        /\bin\s+(english|spanish|french|arabic|swahili|chinese|hindi|portuguese|german|russian|japanese|yoruba|igbo|hausa|zulu|amharic|somali|italian|dutch|korean|turkish)\b/.test(t)) return 'translate'

    if (/git\s*clone\b|clone\s+(repo|this|the|https?|git@)/.test(t)) return 'git_clone'

    if (/git\s*push\b|push\s+(to|code|this|changes?|my)\b/.test(t)) return 'git_push'

    if (/\b(list|show|my)\b.{0,15}\b(repo|repos|repositories)\b/.test(t) ||
        /\b(create|make|new)\b.{0,10}\b(repo|repository)\b/.test(t) ||
        /\b(delete|remove)\b.{0,10}\b(repo|repository)\b/.test(t) ||
        /\bgithub\b/.test(t) ||
        /\b(repo|repos|repository|repositories)\b/.test(t)) return 'github'

    if (/\b(eval|evaluate)\b.{0,20}\b(this|code|js|javascript|script|snippet|expression)\b/.test(t) ||
        /\b(run|execute)\b.{0,20}\b(javascript|js|node|this code|this script)\b/.test(t) ||
        /\b(javascript|js)\b.{0,30}\b(this|code|snippet)\b/.test(t)) return 'js_eval'

    if (/^(cat|read|open|view|show)\s+\S+\.(js|ts|json|txt|py|md|sh|env|html|css|yml|yaml|log)/.test(t) ||
        /\b(read|cat|view|show|open|display)\b.{0,20}\b(file|content|source)\b/.test(t)) return 'file_read'

    if (/\b(create|write|make|save)\b.{0,20}\b(file|script|\.js|\.txt|\.py|\.json|\.sh)\b/.test(t) ||
        /\b(edit|update|modify|overwrite|change)\b.{0,20}\b(file)\b/.test(t)) return 'file_write'

    if (/^ls\b|^ls\s/.test(t) ||
        /\b(list|ls|show|what)\b.{0,15}\b(files?|directory|folder|workspace|dirs?)\b/.test(t)) return 'file_list'

    if (/\b(run|execute|exec|terminal|bash|shell|command|cmd)\b.{0,20}\b(this|command|script)\b/.test(t) ||
        /^(pwd|cd |mkdir|echo |npm |node |git |pip |python |chmod |touch |mv |cp )/.test(t)) return 'shell'

    if (/\b(agent|automate|do it all|handle everything|take care of|step by step|multi.?step|do the following|plan and execute)\b/.test(t)) return 'agent'

    if (/\b(pterodactyl|panel|my server|vps panel|game server|hosting panel)\b/.test(t) ||
        /\b(start|stop|restart|kill)\b.{0,15}\b(server|vps|node|game)\b/.test(t) ||
        /\b(server\s+(status|resources|cpu|ram|memory|uptime))\b/.test(t)) return 'pterodactyl'

    if (/\b(search|look up|find|google|what is|who is|latest|news|current|today)\b/.test(t) &&
        !/\b(song|music|repo|github|image|picture|file)\b/.test(t)) return 'search'

    return 'chat'
}

module.exports = { detectIntent }
