// Library/actions/btns.js — gifted-btns wrapper for Bera AI
// Supports toxic-baileys (and any Baileys fork ≥ 7.0.0-rc.2)
// Falls back to plain text if buttons fail (e.g. old WA client, group ban)

let _sendButtons, _sendInteractive
try {
    const gb = require('gifted-btns')
    _sendButtons   = gb.sendButtons
    _sendInteractive = gb.sendInteractiveMessage
} catch (e) {
    // gifted-btns not installed — graceful no-op
    _sendButtons   = null
    _sendInteractive = null
}

/**
 * sendBtn(conn, jid, opts)
 * opts = { title, text, footer, image, aimode, buttons: [...] }
 * buttons: array of { name, buttonParamsJson } — native flow format
 *          OR shorthand { id, text } → auto-converted to quick_reply
 *
 * Falls back to plain text reply if gifted-btns unavailable or fails.
 */
const sendBtn = async (conn, jid, opts = {}) => {
    if (!_sendButtons) return sendBtnFallback(conn, jid, opts)
    try {
        // Normalize shorthand buttons
        const buttons = (opts.buttons || []).map(b => {
            if (b.name) return b // already native-flow format
            // shorthand { id, text } → quick_reply
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: b.text || b.label || 'Option', id: b.id || b.text })
            }
        })
        await _sendButtons(conn, jid, { ...opts, buttons })
    } catch (e) {
        // Fallback on any error (banned interactive, old client, etc.)
        await sendBtnFallback(conn, jid, opts)
    }
}

/**
 * sendList(conn, jid, opts)
 * opts = { title, text, footer, buttonText, sections: [{ title, rows: [{ id, title, description }] }] }
 * Sends a single_select list (dropdown picker)
 */
const sendList = async (conn, jid, opts = {}) => {
    if (!_sendButtons) return sendListFallback(conn, jid, opts)
    try {
        const sections = opts.sections || []
        const btn = {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title: opts.buttonText || 'Choose',
                sections
            })
        }
        await _sendButtons(conn, jid, {
            title:  opts.title  || '',
            text:   opts.text   || '',
            footer: opts.footer || '',
            image:  opts.image  || undefined,
            buttons: [btn]
        })
    } catch (e) {
        await sendListFallback(conn, jid, opts)
    }
}

/**
 * sendUrlBtn(conn, jid, opts)
 * opts = { title, text, footer, url, urlText, copyCode, copyText, callNumber, callText, extraButtons }
 * Sends CTA URL, Copy and optional extra quick-reply buttons together
 */
const sendUrlBtn = async (conn, jid, opts = {}) => {
    if (!_sendButtons) return conn.sendMessage(jid, { text: (opts.text || '') + (opts.url ? '\\n' + opts.url : '') })
    try {
        const buttons = []
        if (opts.url) buttons.push({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: opts.urlText || '🔗 Open', url: opts.url, merchant_url: opts.url }) })
        if (opts.copyCode) buttons.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: opts.copyText || '📋 Copy', copy_code: opts.copyCode }) })
        if (opts.callNumber) buttons.push({ name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: opts.callText || '📞 Call', phone_number: opts.callNumber }) })
        if (opts.extraButtons) buttons.push(...(opts.extraButtons.map(b => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text || b.label, id: b.id }) }))))
        await _sendButtons(conn, jid, { title: opts.title || '', text: opts.text || '', footer: opts.footer || '', image: opts.image, buttons })
    } catch (e) {
        await conn.sendMessage(jid, { text: (opts.text || '') + (opts.url ? '\\n' + opts.url : '') })
    }
}

// ── Fallback plain-text renderers ─────────────────────────────────────────────
const sendBtnFallback = async (conn, jid, opts) => {
    const btns   = (opts.buttons || []).map((b, i) => {
        const label = b.text || b.label || (b.buttonParamsJson ? (() => { try { return JSON.parse(b.buttonParamsJson).display_text } catch { return 'Option' + (i+1) } })() : 'Option')
        return '  [' + (i+1) + '] ' + label
    }).join('\\n')
    const lines = []
    if (opts.title)  lines.push('*' + opts.title + '*')
    if (opts.text)   lines.push(opts.text)
    if (btns)        lines.push('\\n' + btns)
    if (opts.footer) lines.push('\\n_' + opts.footer + '_')
    await conn.sendMessage(jid, { text: lines.join('\\n') })
}

const sendListFallback = async (conn, jid, opts) => {
    const rows = (opts.sections || []).flatMap(s => s.rows || [])
    const lines = []
    if (opts.title)  lines.push('*' + opts.title + '*')
    if (opts.text)   lines.push(opts.text)
    rows.forEach((r, i) => lines.push('  [' + (i+1) + '] *' + r.title + '*' + (r.description ? ' — ' + r.description : '')))
    if (opts.footer) lines.push('\\n_' + opts.footer + '_')
    await conn.sendMessage(jid, { text: lines.join('\\n') })
}

module.exports = { sendBtn, sendList, sendUrlBtn }
