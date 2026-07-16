// Daily sale logic v3:
// Always match the LI target with the FASTEST possible set of bosses.
// - Daily bounties are worth 2 LI (any encounter), other raid bosses 1 LI.
// - Nothing is forced: if target is 1, the single fastest source of LI wins.
// - Exact optimization (0/1 knapsack over kill times, minimize total time
//   subject to totalLI >= target). Bosses without a known time are only
//   picked when the target is otherwise unreachable.
// - Final order is grouped by wing, natural encounter order inside each wing.

const UNKNOWN_TIME_COST = 10 * 60 * 60

export function flattenBosses(wings) {
  const out = []
  for (const w of wings) for (const b of w.bosses) out.push({ ...b, wing: w })
  return out
}

export function buildSaleList({ wings, dailyIds, discarded, liTarget }) {
  const all = flattenBosses(wings)
  const isDiscarded = (id) => discarded.includes(id)

  const candidates = []
  for (const b of all) {
    if (isDiscarded(b.id)) continue
    const isDaily = dailyIds.includes(b.id)
    // any boss with an explicit LI value is a valid option (raids and IBS strikes)
    const effLi = isDaily ? 2 : (b.li ?? (b.wing.type === 'raid' ? 1 : 0))
    if (effLi <= 0) continue
    candidates.push({ ...b, isDaily, effLi, cost: b.time ?? UNKNOWN_TIME_COST })
  }

  const T = Math.max(0, liTarget)
  let selected = []
  let reached = T === 0

  if (T > 0) {
    const dp = new Array(T + 1).fill(null)
    dp[0] = { t: 0, items: [] }
    for (const c of candidates) {
      for (let j = T; j >= 1; j--) {
        const prev = dp[Math.max(0, j - c.effLi)]
        if (prev && (!dp[j] || prev.t + c.cost < dp[j].t)) {
          dp[j] = { t: prev.t + c.cost, items: [...prev.items, c] }
        }
      }
    }
    if (dp[T]) {
      selected = dp[T].items
      reached = true
    } else {
      selected = candidates
      reached = false
    }
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
  return { list, totalLi, totalTime, hasUnknownTimes, wingCount, reached }
}
