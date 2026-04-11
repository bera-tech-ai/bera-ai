const axios = require('axios')

const PLAN_PROMPT = `You are Bera AI's action planner. Given a task, break it into concrete steps and return ONLY valid JSON — no markdown, no explanation.

Available actions:
- shell: run a terminal command  → args: { cmd: "..." }
- file_read: read a file         → args: { path: "..." }
- file_write: create/write file  → args: { path: "...", content: "..." }
- js_eval: run JavaScript        → args: { code: "..." }
- search: web search             → args: { query: "..." }
- git_clone: clone a repo        → args: { url: "..." }
- git_push: push a repo          → args: { folder: "..." }
- image_gen: generate an image   → args: { prompt: "..." }
- music: play a song             → args: { query: "..." }

Return format (strict JSON):
{"plan":"one line summary","steps":[{"action":"shell","args":{"cmd":"ls"},"desc":"List files"}]}

Task: `

const SUMMARY_PROMPT = `You are Bera AI. You just completed an agent task. Summarize what was done in a friendly, concise message. Use bullet points if there are multiple results. Be direct.

Task: {task}
Steps executed:
{steps}

Respond naturally as Bera AI:`

const planTask = async (task) => {
    try {
        const res = await axios.get('https://apiskeith.top/ai/gpt4', {
            params: { q: PLAN_PROMPT + task },
            timeout: 30000
        })
        const raw = res.data?.result || res.data?.reply || res.data?.text || ''
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return { success: false, error: 'Could not parse plan from AI' }
        const plan = JSON.parse(jsonMatch[0])
        if (!plan.steps || !Array.isArray(plan.steps)) return { success: false, error: 'Invalid plan structure' }
        return { success: true, plan }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

const summarizeResults = async (task, stepResults) => {
    try {
        const stepsText = stepResults.map((s, i) =>
            `Step ${i + 1} (${s.desc}): ${s.success ? 'SUCCESS' : 'FAILED'} — ${s.output?.slice(0, 300) || 'no output'}`
        ).join('\n')

        const prompt = SUMMARY_PROMPT.replace('{task}', task).replace('{steps}', stepsText)
        const res = await axios.get('https://apiskeith.top/ai/gpt4', {
            params: { q: prompt },
            timeout: 20000
        })
        const raw = res.data?.result || res.data?.reply || res.data?.text || ''
        return raw.trim() || 'Task completed.'
    } catch {
        return 'Task completed.'
    }
}

module.exports = { planTask, summarizeResults }
