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

  // ---- ordering ----
  // Inside a wing you can only chain CONTIGUOUS encounters. If selected bosses
  // have unselected encounters between them (e.g. River -> statues -> Dhuum),
  // split them into separate "runs": leave the wing, clear another one, and
  // re-enter directly at the later boss.
  const byWing = new Map()
  for (const b of selected) {
    if (!byWing.has(b.wing.id)) byWing.set(b.wing.id, [])
    byWing.get(b.wing.id).push(b)
  }

  const runs = []
  for (const wid of byWing.keys()) {
    const wing = wings.find((w) => w.id === wid)
    const idx = (b) => wing.bosses.findIndex((x) => x.id === b.id)
    const items = byWing.get(wid).sort((a, z) => idx(a) - idx(z))
    let cur = [items[0]]
    for (let i = 1; i < items.length; i++) {
      if (idx(items[i]) - idx(items[i - 1]) === 1) cur.push(items[i])
      else {
        runs.push(cur)
        cur = [items[i]]
      }
    }
    runs.push(cur)
  }

  const runKey = (r) => {
    const hasDaily = r.some((b) => b.isDaily)
    const fastest = Math.min(...r.map((b) => b.time ?? Infinity))
    return [hasDaily ? 0 : 1, fastest]
  }
  runs.sort((a, z) => {
    const ka = runKey(a)
    const kz = runKey(z)
    return ka[0] - kz[0] || ka[1] - kz[1]
  })

  // avoid two runs of the same wing back-to-back: interleave another wing
  for (let i = 1; i < runs.length; i++) {
    if (runs[i][0].wing.id === runs[i - 1][0].wing.id) {
      const j = runs.findIndex((r, k) => k > i && r[0].wing.id !== runs[i - 1][0].wing.id)
      if (j > i) {
        const [moved] = runs.splice(j, 1)
        runs.splice(i, 0, moved)
      }
    }
  }

  const list = runs.flat()
  const totalLi = list.reduce((s, b) => s + b.effLi, 0)
  const totalTime = list.reduce((s, b) => s + (b.time ?? 0), 0)
  const hasUnknownTimes = list.some((b) => b.time == null)
  const wingCount = byWing.size
  const visits = runs.length
  return { list, totalLi, totalTime, hasUnknownTimes, wingCount, visits, reached }
}
