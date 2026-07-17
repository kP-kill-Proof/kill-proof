// Auto-assignment: match today's players to a boss comp.
// Players are NOT role-locked: each one picks the role they play TODAY
// (dayRole: Heal / Support / DPS) when added to the squad. That choice drives
// the assignment; their class list refines which build they run.

const LEVEL_SCORE = { S: 3, A: 2, B: 1, C: 0 }

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function normRole(r) {
  const n = norm(r)
  if (n.includes('heal')) return 'heal'
  if (n.includes('support')) return 'support'
  return 'dps'
}

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

export function bestBuildFor(player, slot) {
  const classes = player.classes || []
  // 1) class that matches the comp's suggested builds
  const byBuild = classes.find((c) => buildMatches(slot.builds, c.name))
  if (byBuild) return byBuild.name
  // 2) class whose role matches the role they play today
  const target = normRole(player.dayRole || slot.role)
  const byRole = classes
    .filter((c) => normRole(c.role) === target)
    .sort((a, z) => (LEVEL_SCORE[z.level] ?? 1) - (LEVEL_SCORE[a.level] ?? 1))[0]
  if (byRole) return byRole.name
  // 3) comp suggestion, then any class
  return (slot.builds || [])[0] || classes[0]?.name || 'DPS'
}

function scorePlayerForSlot(player, slot) {
  let score = 0
  // the role they chose for today dominates
  if (player.dayRole) {
    score += normRole(player.dayRole) === normRole(slot.role) ? 60 : -30
  }
  let bestClass = 0
  for (const c of player.classes || []) {
    let cs = 0
    if (normRole(c.role) === normRole(slot.role)) cs += 4
    if (buildMatches(slot.builds, c.name)) cs += 5
    cs += LEVEL_SCORE[c.level] ?? 1
    if (cs > bestClass) bestClass = cs
  }
  return score + bestClass
}

export function defaultSlot(profile) {
  const dmg = profile?.dmg
  const build = dmg === 'condi' ? 'C DPS' : dmg === 'power' ? 'P DPS' : 'DPS'
  return { role: 'DPS', builds: [build], notes: '' }
}

const ROLE_ORDER = { heal: 0, support: 1, dps: 2 }
const pretty = (r) => (normRole(r) === 'heal' ? 'Heal' : normRole(r) === 'support' ? 'Support' : 'DPS')

export function suggestAssignments({ comp, players }) {
  const profile = comp?.profile
  let slots
  if (comp?.slots?.length) {
    slots = [...comp.slots]
    while (slots.length < players.length) slots.push(defaultSlot(profile))
  } else {
    // no comp in the Bible: build slots from the roles people play today
    slots = [...players]
      .sort((a, z) => (ROLE_ORDER[normRole(a.dayRole)] ?? 2) - (ROLE_ORDER[normRole(z.dayRole)] ?? 2))
      .map((p) => ({ role: pretty(p.dayRole || 'DPS'), builds: [], notes: '' }))
  }
  const useSlots = slots.slice(0, Math.max(players.length, 0))

  const remaining = [...players]
  const result = []
  for (const slot of useSlots) {
    if (!remaining.length) break
    let bestP = null
    let bestScore = -Infinity
    for (const p of remaining) {
      const s = scorePlayerForSlot(p, slot)
      if (s > bestScore) {
        bestScore = s
        bestP = p
      }
    }
    remaining.splice(remaining.indexOf(bestP), 1)
    result.push({ slot, player: bestP, build: bestBuildFor(bestP, slot) })
  }
  return result
}
