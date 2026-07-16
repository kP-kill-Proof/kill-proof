// Resolve build names against the builds.json catalog and compute squad coverage.

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function resolveBuildInfo(buildName, buildsData) {
  const list = buildsData?.builds || []
  const n = norm(buildName)
  if (!n) return null
  let best = null
  let bestScore = 0
  for (const b of list) {
    for (const a of b.aliases || []) {
      const an = norm(a)
      if (!an || an.length < 3) continue
      // exact > input-contains-alias > alias-contains-input (weakest, avoids
      // false hits like "cmecha" inside "alacmechanist")
      let score = 0
      if (an === n) score = 1000 + an.length
      else if (n.includes(an)) score = 100 + an.length
      else if (an.includes(n)) score = an.length
      if (score > bestScore) {
        best = b
        bestScore = score
      }
    }
  }
  return best
}

export const KEY_BOONS = ['Quickness', 'Alacrity', 'Might', 'Fury']

export function squadCoverage(assignments, buildsData) {
  const boons = new Set()
  const condis = new Set()
  for (const a of assignments) {
    const info = resolveBuildInfo(a.build, buildsData)
    if (!info) continue
    for (const b of info.boons || []) boons.add(b)
    for (const c of info.condis || []) condis.add(c)
  }
  const missing = KEY_BOONS.filter((b) => !boons.has(b))
  return { boons: [...boons], condis: [...condis], missing }
}
