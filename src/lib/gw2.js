// API GW2: Daily Raid Bounties = categoría de achievements 475 (pública, sin key).
// Verificado 2026-07-15 contra el juego.

const CATEGORY_DAILY_RAID_BOUNTIES = 475

export async function fetchDailyBounties() {
  const cat = await fetch(
    `https://api.guildwars2.com/v2/achievements/categories/${CATEGORY_DAILY_RAID_BOUNTIES}`
  ).then((r) => {
    if (!r.ok) throw new Error('API GW2 no disponible')
    return r.json()
  })
  const ids = cat.achievements || []
  if (!ids.length) return []
  const achievements = await fetch(
    `https://api.guildwars2.com/v2/achievements?ids=${ids.join(',')}`
  ).then((r) => {
    if (!r.ok) throw new Error('API GW2 no disponible')
    return r.json()
  })
  // "Raid Bounty: Cairn" -> "Cairn"
  return achievements.map((a) => ({
    id: a.id,
    raw: a.name,
    boss: a.name.replace(/^Raid Bounty:\s*/i, '').trim(),
  }))
}

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

// Cruza el nombre del bounty con wings.json (nombre o alias)
export function matchBossId(bountyName, wings) {
  const target = norm(bountyName)
  for (const w of wings) {
    for (const b of w.bosses) {
      const names = [b.name, ...(b.aliases || [])]
      if (names.some((n) => norm(n) === target)) return b.id
    }
  }
  // segundo intento: contains
  for (const w of wings) {
    for (const b of w.bosses) {
      const names = [b.name, ...(b.aliases || [])]
      if (names.some((n) => norm(n).includes(target) || target.includes(norm(n)))) return b.id
    }
  }
  return null
}

// Milisegundos hasta el reset diario (00:00 UTC)
export function msToReset() {
  const now = new Date()
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  )
  return reset - now
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function fmtTime(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseTime(str) {
  if (!str || !str.trim()) return null
  const m = str.trim().match(/^(\d+):([0-5]?\d)$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  const n = parseInt(str)
  return Number.isFinite(n) ? n : null
}
