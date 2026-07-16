import { useEffect, useMemo, useState } from 'react'
import { useData } from '../App.jsx'
import { fetchDailyBounties, matchBossId, msToReset, fmtCountdown, fmtTime } from '../lib/gw2.js'
import { buildSaleList } from '../lib/order.js'

const dayKey = () => 'kp_run_' + new Date().toISOString().slice(0, 10)

function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(dayKey())) || {}
  } catch {
    return {}
  }
}

export default function SaleDay() {
  const { wings, players } = useData()
  const run0 = loadRun()

  const [liTarget, setLiTarget] = useState(run0.liTarget ?? 10)
  const [discarded, setDiscarded] = useState(run0.discarded ?? [])
  const [completed, setCompleted] = useState(run0.completed ?? [])
  const [roster, setRoster] = useState(run0.roster ?? [])
  const [dailies, setDailies] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [countdown, setCountdown] = useState(msToReset())

  useEffect(() => {
    const t = setInterval(() => setCountdown(msToReset()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchDailyBounties()
      .then((list) =>
        setDailies(list.map((d) => ({ ...d, bossId: matchBossId(d.boss, wings.wings) })))
      )
      .catch((e) => setApiError(e.message))
  }, [wings])

  useEffect(() => {
    localStorage.setItem(dayKey(), JSON.stringify({ liTarget, discarded, completed, roster }))
  }, [liTarget, discarded, completed, roster])

  const dailyIds = (dailies || []).map((d) => d.bossId).filter(Boolean)

  const sale = useMemo(
    () => buildSaleList({ wings: wings.wings, dailyIds, discarded, liTarget }),
    [wings, dailies, discarded, liTarget]
  )

  const liDone = sale.list.filter((b) => completed.includes(b.id)).reduce((s, b) => s + b.effLi, 0)
  const nextId = sale.list.find((b) => !completed.includes(b.id))?.id
  const pct = Math.min(100, Math.round((liDone / Math.max(1, sale.totalLi)) * 100))

  const toggleDone = (id) =>
    setCompleted((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const discard = (id) => setDiscarded((d) => [...d, id])
  const restore = (id) => setDiscarded((d) => d.filter((x) => x !== id))
  const togglePlayer = (id) =>
    setRoster((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))
  const resetDay = () => {
    setCompleted([])
    setDiscarded([])
  }

  const unmatched = (dailies || []).filter((d) => !d.bossId)

  return (
    <div className="space-y-5">
      {/* day header */}
      <div className="card p-5 flex flex-wrap items-center gap-6 justify-between anim-in">
        <div>
          <h1 className="font-display text-3xl text-cream">Today's Sale</h1>
          <p className="text-sm text-silver/70 mt-1">
            Daily reset in{' '}
            <span className="text-teal-light font-bold tabular-nums">{fmtCountdown(countdown)}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-silver/80">
            LI target
            <input
              type="number"
              min="1"
              className="input ml-2 w-20 text-center text-lg font-bold"
              value={liTarget}
              onChange={(e) => setLiTarget(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </label>
          <button className="btn btn-ghost text-sm" onClick={resetDay}>
            Reset day
          </button>
        </div>
      </div>

      {/* today's bounties */}
      <div className="card p-5 anim-in anim-in-1">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">
          Today's Daily Raid Bounties · 2 LI each
        </h2>
        {apiError && (
          <p className="text-danger/90 text-sm">
            Couldn't reach the GW2 API ({apiError}). Check your connection and reload.
          </p>
        )}
        {!dailies && !apiError && <p className="text-sm text-silver/60">Querying GW2 API…</p>}
        {dailies && (
          <div className="flex flex-wrap gap-2">
            {dailies.map((d) => (
              <span
                key={d.id}
                className={`chip border ${
                  d.bossId
                    ? 'bg-teal-deep/40 border-teal/50 text-cream'
                    : 'bg-danger/15 border-danger/50 text-danger'
                }`}
                title={d.bossId ? d.raw : 'Not found in the Bible — check name/alias'}
              >
                ★ {d.boss}
              </span>
            ))}
          </div>
        )}
        {unmatched.length > 0 && (
          <p className="text-xs text-danger/80 mt-2">
            {unmatched.length} bounty(ies) with no match in the Bible — add the boss or fix its
            alias in the Bible section.
          </p>
        )}
      </div>

      {/* roster picker */}
      <div className="card p-5 anim-in anim-in-2">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">
          Who's in today? <span className="text-silver/50 normal-case">({roster.length} selected)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {(players?.players || []).map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`chip border transition-all duration-200 cursor-pointer ${
                roster.includes(p.id)
                  ? 'bg-teal text-ink border-teal-light shadow-md shadow-teal/20'
                  : 'bg-transparent border-teal-deep/50 text-silver/70 hover:border-teal'
              }`}
            >
              {p.name}
              <span className="opacity-60 font-normal">· {p.mainRole}</span>
            </button>
          ))}
          {(players?.players || []).length === 0 && (
            <p className="text-sm text-silver/60">No players yet — add them in the Roster section.</p>
          )}
        </div>
      </div>

      {/* progress */}
      <div className="card p-5 anim-in anim-in-2">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-bold text-cream">
            {liDone} <span className="text-silver/60 font-normal">/ {sale.totalLi} LI</span>
          </span>
          <span className="text-sm text-silver/60">
            {sale.wingCount} wing{sale.wingCount === 1 ? '' : 's'} · est. total{' '}
            <span className="text-cream font-semibold">{fmtTime(sale.totalTime)}</span>
            {sale.hasUnknownTimes && ' (+ bosses without time)'}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: pct + '%' }} />
        </div>
        {!sale.reached && (
          <p className="text-xs text-danger/80 mt-2">
            Can't reach the {liTarget} LI target with the available bosses (missing times or too
            many discards).
          </p>
        )}
      </div>

      {/* ordered list, grouped by wing */}
      <div className="space-y-2.5">
        {sale.list.map((b, i) => {
          const done = completed.includes(b.id)
          const isNext = b.id === nextId
          const wingChanged = i === 0 || sale.list[i - 1].wing.id !== b.wing.id
          return (
            <div key={b.id}>
              {wingChanged && (
                <div className="flex items-center gap-3 mt-4 mb-2 anim-in">
                  <span className="text-xs font-black uppercase tracking-widest text-teal-light/90">
                    {b.wing.short} · {b.wing.name}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-teal-deep/60 to-transparent" />
                </div>
              )}
              <div
                className={`card px-4 py-3 flex items-center gap-4 anim-in ${done ? 'row-done' : ''} ${
                  isNext ? 'glow-next border-teal-light/70' : ''
                }`}
                style={{ animationDelay: `${0.03 * i}s` }}
              >
                <button
                  onClick={() => toggleDone(b.id)}
                  className={`w-7 h-7 rounded-lg border-2 shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 cursor-pointer ${
                    done
                      ? 'bg-teal border-teal text-ink'
                      : 'border-teal-deep/70 text-transparent hover:border-teal-light'
                  }`}
                >
                  ✓
                </button>
                <span className="text-silver/40 font-bold w-6 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="strike-name font-bold text-cream truncate">{b.name}</span>
                    {b.isDaily && (
                      <span className="chip bg-cream/90 text-ink border border-cream">★ DAILY</span>
                    )}
                    {isNext && !done && (
                      <span className="chip bg-teal-light/20 text-teal-light border border-teal-light/40">
                        next up
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-cream tabular-nums">{fmtTime(b.time)}</div>
                  <div className="text-xs text-teal-light font-bold">+{b.effLi} LI</div>
                </div>
                <button
                  onClick={() => discard(b.id)}
                  title="Discard — next best boss takes its place"
                  className="btn-danger btn !px-3 !py-1.5 text-sm shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* discarded */}
      {discarded.length > 0 && (
        <div className="card p-4 anim-in">
          <h3 className="text-xs uppercase tracking-widest text-silver/50 font-bold mb-2">
            Discarded today
          </h3>
          <div className="flex flex-wrap gap-2">
            {discarded.map((id) => {
              const b = wings.wings.flatMap((w) => w.bosses).find((x) => x.id === id)
              return (
                <button
                  key={id}
                  onClick={() => restore(id)}
                  className="chip border border-silver/30 text-silver/60 hover:text-cream hover:border-teal cursor-pointer"
                  title="Click to restore"
                >
                  ↩ {b?.name || id}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
