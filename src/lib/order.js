// Lógica del orden del día:
// 1) Dailies primero (2 LI cada uno) — regla de oro: siempre se hacen.
// 2) Rellenar con los bosses de raid más rápidos (1 LI) hasta el LI objetivo.
// "Descartar" excluye un boss y entra el siguiente mejor.

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
    .sort((a, z) => (a.time ?? Infinity) - (z.time ?? Infinity))

  let acc = dailies.reduce((s, b) => s + b.effLi, 0)

  const fillers = []
  const candidates = all
    .filter(
      (b) =>
        b.wing.type === 'raid' &&
        (b.li ?? 1) > 0 &&
        b.time != null &&
        !dailyIds.includes(b.id) &&
        !isDiscarded(b.id)
    )
    .sort((a, z) => a.time - z.time)

  for (const b of candidates) {
    if (acc >= liTarget) break
    fillers.push({ ...b, isDaily: false, effLi: b.li ?? 1 })
    acc += b.li ?? 1
  }

  const list = [...dailies, ...fillers]
  const totalLi = list.reduce((s, b) => s + b.effLi, 0)
  const totalTime = list.reduce((s, b) => s + (b.time ?? 0), 0)
  const hasUnknownTimes = list.some((b) => b.time == null)
  return { list, totalLi, totalTime, hasUnknownTimes, reached: totalLi >= liTarget }
}
