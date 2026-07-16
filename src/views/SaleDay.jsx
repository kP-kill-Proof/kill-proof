import { useEffect, useMemo, useState } from 'react'
import { useData } from '../App.jsx'
import { fetchDailyBounties, matchBossId, msToReset, fmtCountdown, fmtTime } from '../lib/gw2.js'
import { buildSaleList } from '../lib/order.js'
import { suggestAssignments } from '../lib/assign.js'
import { squadCoverage, KEY_BOONS } from '../lib/boons.js'
import { resolveBuildInfo } from '../lib/boons.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'

const dayKey = () => 'kp_run_' + new Date().toISOString().slice(0, 10)

function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(dayKey())) || {}
  } catch {
    return {}
  }
}

function BoonIcon({ name, icons, missing = false, size = 'w-6 h-6' }) {
  const url = icons?.boons?.[name] || icons?.conditions?.[name]
  if (missing)
    return (
      <span
        title={`${name} missing`}
        className={`${size} rounded-full border-2 border-dashed border-danger/70 flex items-center justify-center text-danger/80 text-[10px] font-black`}
      >
        {name[0]}
      </span>
    )
  if (url) return <img src={url} alt={name} title={name} className={`${size} rounded-sm`} loading="lazy" />
  return (
    <span title={name} className={`${size} rounded-full bg-teal-deep/50 flex items-center justify-center text-teal-light text-[10px] font-black`}>
      {name[0]}
    </span>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-silver/50">{label}</div>
      <div className="text-xl font-bold text-cream mt-0.5">{value}</div>
      {sub && <div className="text-xs text-silver/50">{sub}</div>}
    </div>
  )
}

function BossDetail({ boss, presentPlayers, done, onToggleDone, onDiscard, overrides, setOverride }) {
  const { comps, icons, builds } = useData()
  const comp = comps.bosses?.[boss.id]
  const k = comp || {}

  const suggestions = useMemo(
    () => suggestAssignments({ comp, players: presentPlayers }),
    [comp, presentPlayers]
  )
  const ov = overrides || {}
  const bestBuildFor = (p, slot) => {
    const c = (p.classes || []).find((x) =>
      (slot.builds || []).some(
        (b) => b.toLowerCase().includes((x.name || '').toLowerCase()) || (x.name || '').toLowerCase().includes(b.toLowerCase())
      )
    )
    return c?.name || (slot.builds || [])[0] || 'DPS'
  }
  const assigned = suggestions.map((a, i) => {
    const forcedId = ov[i]
    if (!forcedId) return a
    const p = presentPlayers.find((x) => x.id === forcedId)
    return p ? { ...a, player: p, build: bestBuildFor(p, a.slot) } : a
  })

  const coverage = useMemo(() => squadCoverage(assigned, builds), [assigned, builds])

  return (
    <div className="card p-5 lg:sticky lg:top-4 anim-in">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-teal-deep/30">
        <div>
          <h2 className="font-display text-3xl text-cream flex items-center gap-3">
            {boss.name}
            {boss.isDaily && <span className="chip bg-cream/90 text-ink border border-cream">★ DAILY</span>}
          </h2>
          <div className="text-sm text-silver/60 mt-1 flex flex-wrap gap-2 items-center">
            <span>{boss.wing.short} · {boss.wing.name}</span>
            <span className="text-cream font-bold tabular-nums">{fmtTime(boss.time)}</span>
            <span className="text-teal-light font-bold">+{boss.effLi} LI</span>
            {k.profile && (
              <span className="chip bg-teal-deep/40 text-teal-light uppercase">{k.profile.dmg} · {k.profile.style}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleDone}
            className={`btn text-sm ${done ? 'btn-primary' : 'btn-ghost'}`}
          >
            {done ? '✓ Done' : 'Mark done'}
          </button>
          <button onClick={onDiscard} className="btn btn-danger text-sm">✕ Discard</button>
        </div>
      </div>

      {(k.mechanics || []).length > 0 && (
        <div className="py-4 border-b border-teal-deep/30">
          <h3 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold mb-2">Mechanics</h3>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {k.mechanics.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-light shrink-0" />
                <NotesText text={m} icons={icons} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="py-4">
        <h3 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold mb-3">Comp</h3>
        {!presentPlayers.length ? (
          <p className="text-sm text-silver/50">Select today's squad to see assignments.</p>
        ) : (
          <div className="space-y-2">
            {assigned.map((a, i) => {
              const info = resolveBuildInfo(a.build, builds)
              return (
                <div key={i} className="flex flex-wrap items-center gap-3 bg-ink/60 border border-teal-deep/30 rounded-xl px-4 py-2.5">
                  <span className={`chip !text-sm !px-3 !py-1 ${a.slot.role === 'Heal' ? 'bg-teal/25 text-teal-light' : a.slot.role === 'Support' ? 'bg-cream/15 text-cream' : 'bg-silver/10 text-silver'}`}>
                    {a.slot.role}
                  </span>
                  <select
                    className="input !py-1 w-32 text-base font-semibold"
                    value={a.player?.id || ''}
                    onChange={(e) => setOverride(i, e.target.value)}
                  >
                    {presentPlayers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <span className="font-bold text-cream text-base [&_img]:w-7 [&_img]:h-7">
                    <BuildChip name={a.build} icons={icons} />
                  </span>
                  <span className="flex gap-1 items-center">
                    {(info?.boons || []).slice(0, 3).map((b) => (
                      <BoonIcon key={b} name={b} icons={icons} size="w-5 h-5" />
                    ))}
                  </span>
                  {a.slot.notes && (
                    <span className="w-full sm:w-auto sm:ml-auto text-sm text-cream/90 bg-teal-deep/20 border border-teal-deep/40 rounded-lg px-3 py-1.5">
                      <span className="text-teal-light font-black uppercase text-[10px] tracking-wider mr-2">Duty</span>
                      <NotesText text={a.slot.notes} icons={icons} />
                    </span>
                  )}
                </div>
              )
            })}
            {!comp?.slots?.length && (
              <p className="text-xs text-silver/50">
                No comp defined in the Bible yet — default assignment shown. Define it in Bible → {boss.name} → Edit.
              </p>
            )}
          </div>
        )}
      </div>

      {presentPlayers.length > 0 && (
        <div className="pt-4 border-t border-teal-deep/30 flex flex-wrap gap-8">
          <div>
            <h3 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold mb-2">Squad boons</h3>
            <div className="flex gap-1.5 items-center">
              {KEY_BOONS.map((b) =>
                coverage.missing.includes(b) ? (
                  <BoonIcon key={b} name={b} icons={icons} missing />
                ) : (
                  <BoonIcon key={b} name={b} icons={icons} />
                )
              )}
              {coverage.boons.filter((b) => !KEY_BOONS.includes(b)).map((b) => (
                <BoonIcon key={b} name={b} icons={icons} />
              ))}
            </div>
            {coverage.missing.length > 0 && (
              <p className="text-xs text-danger/80 mt-1.5">Missing: {coverage.missing.join(', ')}</p>
            )}
          </div>
          <div>
            <h3 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold mb-2">Condis on boss</h3>
            <div className="flex gap-1.5 items-center">
              {coverage.condis.length ? (
                coverage.condis.map((c) => <BoonIcon key={c} name={c} icons={icons} />)
              ) : (
                <span className="text-xs text-silver/50">—</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SaleDay() {
  const { wings, players, icons, update, notify } = useData()
  const run0 = loadRun()

  const corePlayers = (players?.players || []).filter((p) => p.core).map((p) => p.id)
  const [liTargetStr, setLiTargetStr] = useState(run0.liTargetStr ?? '10')
  const [discarded, setDiscarded] = useState(run0.discarded ?? [])
  const [completed, setCompleted] = useState(run0.completed ?? [])
  const [roster, setRoster] = useState(run0.roster ?? corePlayers)
  const [assignOv, setAssignOv] = useState(run0.assignOv ?? {})
  const [selected, setSelected] = useState(null)
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
  const selectedBoss = sale.list.find((b) => b.id === selected) || sale.list.find((b) => b.id === nextId) || sale.list[0]

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
      <div className="flex flex-wrap items-center justify-between gap-4 anim-in">
        <div>
          <h1 className="font-display text-3xl text-cream">Today's Sale</h1>
          <p className="text-sm text-silver/70">
            Daily reset in <span className="text-teal-light font-bold tabular-nums">{fmtCountdown(countdown)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {dailies && (
            <div className="flex flex-wrap gap-1.5">
              {dailies.map((d) => (
                <span
                  key={d.id}
                  className={`chip border ${d.bossId ? 'bg-teal-deep/40 border-teal/50 text-cream' : 'bg-danger/15 border-danger/50 text-danger'}`}
                  title={d.bossId ? `${d.raw} · 2 LI` : 'Not found in the Bible — check name/alias'}
                >
                  ★ {d.boss}
                </span>
              ))}
            </div>
          )}
          {apiError && <span className="text-danger/90 text-sm">GW2 API unreachable</span>}
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
      {unmatched.length > 0 && (
        <p className="text-xs text-danger/80">{unmatched.length} bounty(ies) with no match in the Bible.</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-in anim-in-1">
        <div className="card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-silver/50">LI progress</div>
          <div className="text-xl font-bold text-cream mt-0.5">
            {liDone} <span className="text-silver/50 font-normal">/ {sale.totalLi}</span>
          </div>
          <div className="progress-track !h-1.5 mt-1.5">
            <div className="progress-fill" style={{ width: pct + '%' }} />
          </div>
          {liTarget > 0 && (
            <div className="text-[11px] text-silver/50 mt-1">
              target {liTarget} · dailies always included
            </div>
          )}
        </div>
        <Stat label="Est. total" value={fmtTime(sale.totalTime)} sub={sale.hasUnknownTimes ? '+ unknown times' : null} />
        <Stat label="Wings" value={sale.wingCount} sub="grouped to cut downtime" />
        <Stat label="Squad" value={`${roster.length} in`} sub={presentPlayers.map((p) => p.name).join(', ') || '—'} />
      </div>
      {liTarget > 0 && !sale.reached && (
        <p className="text-xs text-danger/80">Can't reach {liTarget} LI with the available bosses.</p>
      )}

      <div className="card p-4 anim-in anim-in-1">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <h2 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold">Who's in today?</h2>
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

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start anim-in anim-in-2">
        <div className="space-y-1.5">
          {liTarget === 0 && (
            <p className="text-sm text-silver/50 mb-2">Set an LI target to build the full run — showing dailies only.</p>
          )}
          {sale.list.map((b, i) => {
            const done = completed.includes(b.id)
            const isNext = b.id === nextId
            const isSel = selectedBoss?.id === b.id
            const wingChanged = i === 0 || sale.list[i - 1].wing.id !== b.wing.id
            return (
              <div key={b.id}>
                {wingChanged && (
                  <div className="flex items-center gap-2 mt-3 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-light/90">
                      {b.wing.short} · {b.wing.name}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-teal-deep/60 to-transparent" />
                  </div>
                )}
                <div
                  onClick={() => setSelected(b.id)}
                  className={`card px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all ${done ? 'row-done' : ''} ${
                    isSel ? 'border-teal-light/80 bg-teal-deep/25' : ''
                  } ${isNext && !isSel ? 'glow-next' : ''}`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDone(b.id) }}
                    className={`w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                      done ? 'bg-teal border-teal text-ink' : 'border-teal-deep/70 text-transparent hover:border-teal-light'
                    }`}
                  >
                    ✓
                  </button>
                  <span className="text-silver/40 font-bold w-4 text-right text-sm shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="strike-name font-bold text-cream text-sm truncate block">
                      {b.name} {b.isDaily && <span className="text-cream/90">★</span>}
                      {isNext && !done && <span className="text-teal-light text-xs font-normal ml-1">next</span>}
                    </span>
                  </div>
                  <div className="text-right shrink-0 leading-tight">
                    <div className="font-bold text-cream tabular-nums text-sm">{fmtTime(b.time)}</div>
                    <div className="text-[11px] text-teal-light font-bold">+{b.effLi}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); discard(b.id) }}
                    title="Discard — next best boss takes its place"
                    className="text-danger/60 hover:text-danger text-sm font-black shrink-0 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}

          {discarded.length > 0 && (
            <div className="pt-3">
              <h3 className="text-[10px] uppercase tracking-widest text-silver/50 font-bold mb-1.5">Discarded</h3>
              <div className="flex flex-wrap gap-1.5">
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

        {selectedBoss ? (
          <BossDetail
            key={selectedBoss.id}
            boss={selectedBoss}
            presentPlayers={presentPlayers}
            done={completed.includes(selectedBoss.id)}
            onToggleDone={() => toggleDone(selectedBoss.id)}
            onDiscard={() => discard(selectedBoss.id)}
            overrides={assignOv[selectedBoss.id]}
            setOverride={setOverride(selectedBoss.id)}
          />
        ) : (
          <div className="card p-10 text-center text-silver/50">No bosses in today's run yet.</div>
        )}
      </div>
    </div>
  )
}
