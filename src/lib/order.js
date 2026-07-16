// Daily sale logic:
// 1) Daily bounties always in (2 LI each) unless discarded.
// 2) Fill with the most efficient raid bosses (1 LI) until the LI target.
//    Efficiency = fast kill time, with a bonus for bosses in wings we're already
//    visiting (less downtime: no wing swap, fewer class changes).
// 3) Final order is grouped by wing, and inside each wing bosses follow the
//    wing's natural encounter order (e.g. Soulless Horror -> River of Souls).

const SAME_WING_BONUS = 45

export function flattenBosses(wings) {
  const out = []
  for (const w of wings) for (const b of w.bosses) out.push({ ...b, wing: w })
  return out
}

export function buildSaleList({ wings, dailyIds, discarded, liTarget }) {
  const all = flattenBosses(wings)
  const isDiscarded = (id) => discarded.includes(id)

  const dailies = all
    .filter((b) => dailyIds.includes(b.id) && !isDiscarded(b.id))
    .map((b) => ({ ...b, isDaily: true, effLi: 2 }))

  let acc = dailies.reduce((s, b) => s + b.effLi, 0)
  const selected = [...dailies]
  const inWings = new Set(dailies.map((b) => b.wing.id))

  const pool = all.filter(
    (b) =>
      b.wing.type === 'raid' &&
      (b.li ?? 1) > 0 &&
      b.time != null &&
      !dailyIds.includes(b.id) &&
      !isDiscarded(b.id)
  )

  while (acc < liTarget && pool.length) {
    const remaining = pool.filter((b) => !selected.some((s) => s.id === b.id))
    if (!remaining.length) break
    let best = null
    let bestScore = Infinity
    for (const b of remaining) {
      const score = b.time - (inWings.has(b.wing.id) ? SAME_WING_BONUS : 0)
      if (score < bestScore) {
        bestScore = score
        best = b
      }
    }
    selected.push({ ...best, isDaily: false, effLi: best.li ?? 1 })
    inWings.add(best.wing.id)
    acc += best.li ?? 1
  }

  const byWing = new Map()
  for (const b of selected) {
    if (!byWing.has(b.wing.id)) byWing.set(b.wing.id, [])
    byWing.get(b.wing.id).push(b)
  }

  const wingSortKey = (wid) => {
    const items = byWing.get(wid)
    const hasDaily = items.some((b) => b.isDaily)
    const fastest = Math.min(...items.map((b) => b.time ?? Infinity))
    return [hasDaily ? 0 : 1, fastest]
  }

  const orderedWingIds = [...byWing.keys()].sort((a, z) => {
    const ka = wingSortKey(a)
    const kz = wingSortKey(z)
    return ka[0] - kz[0] || ka[1] - kz[1]
  })

  const list = []
  for (const wid of orderedWingIds) {
    const wing = wings.find((w) => w.id === wid)
    const naturalIndex = (b) => wing.bosses.findIndex((x) => x.id === b.id)
    list.push(...byWing.get(wid).sort((a, z) => naturalIndex(a) - naturalIndex(z)))
  }

  const totalLi = list.reduce((s, b) => s + b.effLi, 0)
  const totalTime = list.reduce((s, b) => s + (b.time ?? 0), 0)
  const hasUnknownTimes = list.some((b) => b.time == null)
  const wingCount = orderedWingIds.length
  return { list, totalLi, totalTime, hasUnknownTimes, wingCount, reached: totalLi >= liTarget }
}
