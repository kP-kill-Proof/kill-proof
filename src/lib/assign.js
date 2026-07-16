// Auto-assignment: match today's players to a boss comp following the Bible.
// Slots are priority-ordered; with N players, first N slots apply (extras become DPS).

const LEVEL_SCORE = { S: 3, A: 2, B: 1, C: 0 }

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function buildMatches(slotBuilds, className) {
  const cn = norm(className)
  if (!cn) return false
  return (slotBuilds || []).some((b) => {
    const bn = norm(b)
    return bn && (bn.includes(cn) || cn.includes(bn) || sharesSpec(bn, cn))
  })
}

const SPECS = ['chrono','firebrand','catalyst','mechanist','mecha','virtuoso','scourge','reaper','herald','scrapper','druid','deadeye','ritualist','amalgam','evoker','bladesworn','willbender','harbinger','vindicator','daredevil','berserker','specter','weaver','tempest','holosmith','soulbeast','mirage','renegade','untamed','dragonhunter','troubadour','paragon','antiquary','galeshot','conduit','luminary','spellbreaker']
function sharesSpec(a, b) {
  return SPECS.some((s) => a.includes(s) && b.includes(s))
}

function roleCompatible(slotRole, classRole) {
  if (!classRole) return false
  const r = norm(classRole)
  const s = norm(slotRole)
  if (s === 'heal') return r.includes('heal')
  if (s === 'support') return r.includes('support') || r.includes('heal') || r.includes('tank')
  if (s === 'dps') return r.includes('dps') || r.includes('flex')
  return r.includes(s)
}

function scorePlayerForSlot(player, slot, profile) {
  let best = { score: -1, build: null }
  const classes = player.classes || []
  for (const c of classes) {
    let score = 0
    if (roleCompatible(slot.role, c.role)) score += 4
    if (buildMatches(slot.builds, c.name)) score += 5
    score += LEVEL_SCORE[c.level] ?? 1
    if (score > best.score) best = { score, build: c.name }
  }
  // main role affinity even without listed classes
  let base = roleCompatible(slot.role, player.mainRole) ? 2 : 0
  if (classes.length === 0) best = { score: base, build: null }
  else best.score += base
  return best
}

export function defaultSlot(profile) {
  const dmg = profile?.dmg
  const build = dmg === 'condi' ? 'C DPS' : dmg === 'power' ? 'P DPS' : 'DPS'
  return { role: 'DPS', builds: [build], notes: '' }
}

export function suggestAssignments({ comp, players }) {
  const profile = comp?.profile
  const slots = [...(comp?.slots || [])]
  // no comp defined: still lead with a healer slot
  if (!slots.length && players.length) slots.push({ role: 'Heal', builds: [], notes: '' })
  while (slots.length < players.length) slots.push(defaultSlot(profile))
  const useSlots = slots.slice(0, Math.max(players.length, 0))

  const remaining = [...players]
  const result = []
  for (const slot of useSlots) {
    if (!remaining.length) break
    let bestP = null
    let bestScore = -Infinity
    let bestBuild = null
    for (const p of remaining) {
      const { score, build } = scorePlayerForSlot(p, slot, profile)
      if (score > bestScore) {
        bestScore = score
        bestP = p
        bestBuild = build
      }
    }
    remaining.splice(remaining.indexOf(bestP), 1)
    result.push({ slot, player: bestP, build: bestBuild || (slot.builds || [])[0] || 'DPS' })
  }
  return result
}
