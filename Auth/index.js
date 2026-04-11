const crypto = require('crypto')
const config = require('../Config')

const generateKey = (phoneNumber, durationDays = 30) => {
    const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000
    const raw = `${phoneNumber}:${expiry}:${config.botName}`
    const hash = crypto.createHmac('sha256', config.botName + '_secret_salt')
        .update(raw)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase()
    const key = `BERA-${hash}`
    return { key, expiry, phoneNumber }
}

const registerKey = async (key, phoneNumber, durationDays = 30) => {
    const db = global.db
    const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000
    db.data.keys[key] = {
        phoneNumber,
        expiry,
        createdAt: Date.now(),
        active: true
    }
    await db.write()
    return { key, expiry, phoneNumber }
}

const validateKey = (key, phoneNumber) => {
    const db = global.db
    const entry = db.data.keys[key]
    if (!entry) return { valid: false, reason: 'Key not found' }
    if (!entry.active) return { valid: false, reason: 'Key has been revoked' }
    if (entry.phoneNumber !== phoneNumber) return { valid: false, reason: 'Key is not registered to your number' }
    if (Date.now() > entry.expiry) return { valid: false, reason: 'Key has expired' }
    return { valid: true, expiry: entry.expiry }
}

const revokeKey = async (key) => {
    const db = global.db
    if (!db.data.keys[key]) return false
    db.data.keys[key].active = false
    await db.write()
    return true
}

const extendKey = async (key, daysToAdd) => {
    const db = global.db
    const entry = db.data.keys[key]
    if (!entry) return false
    entry.expiry += daysToAdd * 24 * 60 * 60 * 1000
    entry.active = true
    await db.write()
    return true
}

const listKeys = () => {
    const db = global.db
    return Object.entries(db.data.keys).map(([key, data]) => ({ key, ...data }))
}

const isAuthorized = (sender) => {
    const db = global.db
    const phoneNumber = sender.split('@')[0].split(':')[0]
    const ownerNumber = config.owner.replace(/[^0-9]/g, '')
    if (phoneNumber === ownerNumber) return { authorized: true, isOwner: true }
    const activeKey = Object.entries(db.data.keys).find(([_, data]) => {
        return data.phoneNumber === phoneNumber &&
            data.active === true &&
            Date.now() < data.expiry
    })
    if (activeKey) return { authorized: true, isOwner: false }
    return { authorized: false, isOwner: false }
}

module.exports = { generateKey, registerKey, validateKey, revokeKey, extendKey, listKeys, isAuthorized }
