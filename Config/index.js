const config = {
    botName: 'Bera',
    prefix: '.',
    owner: process.env.OWNER_NUMBER || '254717459770',
    nickApiEndpoint: process.env.NICK_API || 'https://apiskeith.top/ai/gpt4',
    nickApiKey: process.env.NICK_API_KEY || '',
    sessionDir: './session',
    dbPath: './Database/db.json',
    maxHistory: 20,
    readReceipts: true,
    publicMode: false,
    pterodactylUrl: process.env.PTERODACTYL_URL || '',
    pterodactylKey: process.env.PTERODACTYL_KEY || '',
    pterodactylAppKey: process.env.PTERODACTYL_APP_KEY || '',
    // Bot profile picture — set a URL or a local file path e.g. './assets/bot.jpg'
    botImage: process.env.BOT_IMAGE || './assets/bera-ai-profile.png',
}

module.exports = config
