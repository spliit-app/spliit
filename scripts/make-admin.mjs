#!/usr/bin/env node

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
  console.error('Error: Please provide a user email address.')
  console.error('Usage: npm run make-admin <email>')
  process.exit(1)
}

let dbUrl = process.env.DATABASE_URL || 'file:./spliit.db'
let dbPath = dbUrl.replace(/^file:/, '')

// Handle host vs container paths gracefully
if (dbPath === '/data/spliit.db' && !fs.existsSync('/data')) {
  if (fs.existsSync('./spliit-data/spliit.db')) {
    dbPath = './spliit-data/spliit.db'
  } else if (fs.existsSync('./spliit.db')) {
    dbPath = './spliit.db'
  } else {
    dbPath = './spliit.db'
  }
}

const resolvedDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), dbPath)

try {
  const db = new Database(resolvedDbPath)

  const user = db
    .prepare('SELECT id, name, email, tier FROM User WHERE LOWER(email) = ?')
    .get(email)

  if (!user) {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO User (id, email, tier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    ).run(id, email, 'admin', now, now)

    console.log(
      `✅ Successfully pre-authorized user (${email}) as Administrator! When they log in via OAuth, they will immediately have Admin permissions.`,
    )
    process.exit(0)
  }

  if (user.tier === 'admin') {
    console.log(
      `User ${user.name || ''} (${user.email}) is already an Administrator.`,
    )
    process.exit(0)
  }

  db.prepare('UPDATE User SET tier = ? WHERE id = ?').run('admin', user.id)

  console.log(
    `✅ Successfully promoted user ${user.name || ''} (${user.email}) to Administrator tier!`,
  )
  process.exit(0)
} catch (err) {
  console.error('Error executing make-admin script:', err)
  process.exit(1)
}
