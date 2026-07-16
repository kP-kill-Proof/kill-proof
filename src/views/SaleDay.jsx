import { useEffect, useMemo, useState } from 'react'
import { useData } from '../App.jsx'
import { fetchDailyBounties, matchBossId, msToReset, fmtCountdown, fmtTime } from '../lib/gw2.js'
import { buildSaleList } from '../lib/order.js'
import { suggestAssignments } from '../lib/assign.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'

const dayKey = () => 'kp_run_' + new Date().toISOString().slice(0, 10)

function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(dayKey())) || {}
  } catch {
    return {}
  }
}

function CompPanel({ boss, presentPlayers, icons, comps, overrides, setOverride }) {
  const comp = comps.bosses?.[boss.id]
  const suggestions = useMemo(
    () => suggestAssignments({ comp, players: presentPlayers }),
    [comp, presentPlayers]
  )
  if (!presentPlayers.length)
    return <p className="text-sm text-silver/50 px-2 py-3">Select today's squad above to see the comp.</p>

  const ov = overrides || {}
  function bestBuildFor(p, slot) {
    const c = (p.classes || []).find((x) => (slot.builds || []).some((b) => b.toLowerCase().includes((x.name || '').toLowerCase()) || (x.name || '').toLowerCase().includes(b.toLowerCase())))
    return c?.name || (slot.builds || [])[0] || 'DPS'
  }
  const assigned = suggestions.map((a, i) => {
    const forcedId = ov[i]
    if (!forcedId) return a
    const p = presentPlayers.find((x) => x.id === forcedId)
    return p ? { ...a, player: p, build: bestBuildFor(p, a.slot) } : a
  })

  return (
    <div className="mt-2 space-y-1.5 border-t border-teal-deep/30 pt-3">
      {assigned.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2.5 bg-ink/50 rounded-xl px-3 py-2 text-sm">
          <span className={`chip ${a.slot.role === 'Heal' ? 'bg-teal/25 text-teal-light' : a.slot.role === 'Support' ? 'bg-cream/15 text-cream' : 'bg-silver/10 text-silver'}`}>
            {a.slot.role}
          </span>
          <select
            className="input !py-0.5 !px-2 w-32 text-sm"
            value={a.player?.id || ''}
            onChange={(e) => setOverride(i, e.target.value)}
          >
            {presentPlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span className="font-semibold text-cream">
            <BuildChip name={a.build} icons={icons} />
          </span>
          {a.slot.notes && (
            <span className="text-silver/70 ml-auto text-xs sm:text-sm">
              <NotesText text={a.slot.notes} icons={icons} />
            </span>
          )}
        </div>
      ))}
      {!comp?.slots?.length && (
        <p className="text-xs text-silver/50">No comp defined in the Bible for this boss — showing default assignment by damage profile.</p>
      )}
    </div>
  )
}

export default function SaleDay() {
  const { wings, players, comps, icons, update, notify } = useData()
  const run0 = loadRun()

  const corePlayers = (players?.players || []).filter((p) => p.core).map((p) => p.id)
  const [liTargetStr, setLiTargetStr] = useState(run0.liTargetStr ?? '10')
  const [discarded, setDiscarded] = useState(run0.discarded ?? [])
  const [completed, setCompleted] = useState(run0.completed ?? [])
  const [roster, setRoster] = useState(run0.roster ?? corePlayers)
  const [assignOv, setAssignOv] = useState(run0.assignOv ?? {})
  const [expanded, setExpanded] = useState(null)
  const [dailies, setDailies] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [countdown, setCountdown] = useState(msToReset())

  const liTarget = Math.max(0, parseInt(liTargetStr) || 0)

  useEffect(() => {
    const t = setInterval(() => setCountdown(msToReset()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchDailyBounties()
      .then((list) => setDailies(list.map((d) => ({ ...d, bossId: matchBossId(d.boss, wings.wings) }))))
      .catch((e) => setApiError(e.message))
  }, [wings])

  useEffect(() => {
    localStorage.setItem(dayKey(), JSON.stringify({ liTargetStr, discarded, completed, roster, assignOv }))
  }, [liTargetStr, discarded, completed, roster, assignOv])

  const dailyIds = (dailies || []).map((d) => d.bossId).filter(Boolean)

  const sale = useMemo(
    () => buildSaleList({ wings: wings.wings, dailyIds, discarded, liTarget }),
    [wings, dailies, discarded, liTarget]
  )

  const presentPlayers = (players?.players || []).filter((p) => roster.includes(p.id))
  const liDone = sale.list.filter((b) => completed.includes(b.id)).reduce((s, b) => s + b.effLi, 0)
  const nextId = sale.list.find((b) => !completed.includes(b.id))?.id
  const pct = Math.min(100, Math.round((liDone / Math.max(1, sale.totalLi)) * 100))

  const toggleDone = (id) => setCompleted((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const discard = (id) => setDiscarded((d) => [...d, id])
  const restore = (id) => setDiscarded((d) => d.filter((x) => x !== id))
  const togglePlayer = (id) => setRoster((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))
  const resetDay = () => {
    setCompleted([])
    setDiscarded([])
    setAssignOv({})
  }
  const saveAsDefault = () => {
    update('players', {
      ...players,
      players: players.players.map((p) => ({ ...p, core: roster.includes(p.id) })),
    })
    notify('Default squad saved — publish players.json to share it')
  }
  const setOverride = (bossId) => (slotIdx, playerId) =>
    setAssignOv((o) => ({ ...o, [bossId]: { ...(o[bossId] || {}), [slotIdx]: playerId } }))

  const unmatched = (dailies || []).filter((d) => !d.bossId)

  return (
    <div className="space-y-5">
      <div className="card p-5 flex flex-wrap items-center gap-6 justify-between anim-in">
        <div>
          <h1 className="font-display text-3xl text-cream">Today's Sale</h1>
          <p className="text-sm text-silver/70 mt-1">
            Daily reset in <span className="text-teal-light font-bold tabular-nums">{fmtCountdown(countdown)}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-silver/80">
            LI target
            <input
              type="text"
              inputMode="numeric"
              placeholder="—"
              className="input ml-2 w-20 text-center text-lg font-bold"
              value={liTargetStr}
              onChange={(e) => setLiTargetStr(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </label>
          <button className="btn btn-ghost text-sm" onClick={resetDay}>Reset day</button>
        </div>
      </div>

      <div className="card p-5 anim-in anim-in-1">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">
          Today's Daily Raid Bounties · 2 LI each
        </h2>
        {apiError && <p className="text-danger/90 text-sm">Couldn't reach the GW2 API ({apiError}).</p>}
        {!dailies && !apiError && <p className="text-sm text-silver/60">Querying GW2 API…</p>}
        {dailies && (
          <div className="flex flex-wrap gap-2">
            {dailies.map((d) => (
              <span
                key={d.id}
                className={`chip border ${d.bossId ? 'bg-teal-deep/40 border-teal/50 text-cream' : 'bg-danger/15 border-danger/50 text-danger'}`}
                title={d.bossId ? d.raw : 'Not found in the Bible — check name/alias'}
              >
                ★ {d.boss}
              </span>
            ))}
          </div>
        )}
        {unmatched.length > 0 && (
          <p className="text-xs text-danger/80 mt-2">{unmatched.length} bounty(ies) with no match in the Bible.</p>
        )}
      </div>

      <div className="card p-5 anim-in anim-in-2">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">
            Who's in today? <span className="text-silver/50 normal-case">({roster.length} selected)</span>
          </h2>
          <button className="btn btn-ghost !py-1 text-xs" onClick={saveAsDefault}>Save as default squad</button>
        </div>
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
              {p.core && <span title="Default squad">★</span>}
            </button>
          ))}
          {(players?.players || []).length === 0 && (
            <p className="text-sm text-silver/60">No players yet — add them in the Roster section.</p>
          )}
        </div>
      </div>

      {liTarget > 0 ? (
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
              Can't reach {liTarget} LI with the available bosses (missing times or too many discards).
            </p>
          )}
        </div>
      ) : (
        <div className="card p-5 anim-in anim-in-2 text-sm text-silver/60">
          Set an LI target to build the full run — showing today's dailies only.
        </div>
      )}

      <div className="space-y-2.5">
        {sale.list.map((b, i) => {
          const done = completed.includes(b.id)
          const isNext = b.id === nextId
          const wingChanged = i === 0 || sale.list[i - 1].wing.id !== b.wing.id
          const isOpen = expanded === b.id
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
                className={`card px-4 py-3 anim-in ${done ? 'row-done' : ''} ${isNext ? 'glow-next border-teal-light/70' : ''}`}
                style={{ animationDelay: `${0.03 * i}s` }}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleDone(b.id)}
                    className={`w-7 h-7 rounded-lg border-2 shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 cursor-pointer ${
                      done ? 'bg-teal border-teal text-ink' : 'border-teal-deep/70 text-transparent hover:border-teal-light'
                    }`}
                  >
                    ✓
                  </button>
                  <span className="text-silver/40 font-bold w-6 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="strike-name font-bold text-cream truncate">{b.name}</span>
                      {b.isDaily && <span className="chip bg-cream/90 text-ink border border-cream">★ DAILY</span>}
                      {isNext && !done && (
                        <span className="chip bg-teal-light/20 text-teal-light border border-teal-light/40">next up</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-cream tabular-nums">{fmtTime(b.time)}</div>
                    <div className="text-xs text-teal-light font-bold">+{b.effLi} LI</div>
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    title="Show comp"
                    className={`btn btn-ghost !px-3 !py-1.5 text-sm shrink-0 ${isOpen ? 'border-teal text-cream' : ''}`}
                  >
                    {isOpen ? '▲' : '▼'} comp
                  </button>
                  <button
                    onClick={() => discard(b.id)}
                    title="Discard — next best boss takes its place"
                    className="btn-danger btn !px-3 !py-1.5 text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>
                {isOpen && (
                  <CompPanel
                    boss={b}
                    presentPlayers={presentPlayers}
                    icons={icons}
                    comps={comps}
                    overrides={assignOv[b.id]}
                    setOverride={setOverride(b.id)}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {discarded.length > 0 && (
        <div className="card p-4 anim-in">
          <h3 className="text-xs uppercase tracking-widest text-silver/50 font-bold mb-2">Discarded today</h3>
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
