const axios = require('axios')

const getToken = () => process.env.GITHUB_TOKEN || ''

const gh = (endpoint, method = 'GET', data = null) => {
    const token = getToken()
    if (!token) return Promise.resolve({ error: 'No GitHub token set. Use psetghtoken <token> to set it.' })
    return axios({
        method,
        url: `https://api.github.com${endpoint}`,
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'NickBot'
        },
        data,
        timeout: 20000
    }).then(r => r.data).catch(e => ({ error: e.response?.data?.message || e.message }))
}

const getUser = () => gh('/user')

const listRepos = async () => {
    const data = await gh('/user/repos?per_page=30&sort=updated')
    if (data.error) return data
    return data.map(r => ({ name: r.name, private: r.private, url: r.html_url, updated: r.updated_at }))
}

const createRepo = (name, isPrivate = false, description = '') =>
    gh('/user/repos', 'POST', { name, private: isPrivate, description, auto_init: true })

const deleteRepo = async (owner, repo) => {
    const data = await gh(`/repos/${owner}/${repo}`, 'DELETE')
    return data === '' || data === undefined ? { success: true } : data
}

const getRepo = (owner, repo) => gh(`/repos/${owner}/${repo}`)

const createFile = async (owner, repo, filePath, content, message = 'Add file via Bera Bot') => {
    const encoded = Buffer.from(content).toString('base64')
    return gh(`/repos/${owner}/${repo}/contents/${filePath}`, 'PUT', {
        message,
        content: encoded
    })
}

const updateFile = async (owner, repo, filePath, content, sha, message = 'Update via Bera Bot') => {
    const encoded = Buffer.from(content).toString('base64')
    return gh(`/repos/${owner}/${repo}/contents/${filePath}`, 'PUT', {
        message,
        content: encoded,
        sha
    })
}

const getFile = (owner, repo, filePath) => gh(`/repos/${owner}/${repo}/contents/${filePath}`)

const listBranches = (owner, repo) => gh(`/repos/${owner}/${repo}/branches`)

const searchRepos = (query) => gh(`/search/repositories?q=${encodeURIComponent(query)}&per_page=5`)

module.exports = { getUser, listRepos, createRepo, deleteRepo, getRepo, createFile, updateFile, getFile, listBranches, searchRepos }
