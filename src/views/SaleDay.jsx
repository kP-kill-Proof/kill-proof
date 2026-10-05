import { useEffect, useMemo, useState } from 'react'
import { useData, useNav } from '../App.jsx'
import { fetchDailyBounties, matchBossId, msToReset, fmtCountdown, fmtTime } from '../lib/gw2.js'
import { buildSaleList } from '../lib/order.js'
import { suggestAssignments, bestBuildFor, normRole } from '../lib/assign.js'
import { squadCoverage, KEY_BOONS } from '../lib/boons.js'
import { resolveBuildInfo } from '../lib/boons.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'
import PlanView, { PLAN_STATUS, planCoverage, planIsEmpty } from '../lib/plan.jsx'

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

// Magnetite shards for the day. Two things are easy to get wrong and both are
// spelled out here: a daily encounter pays double LI but the SAME shards, and
// the weekly account cap (800) only applies to normal-mode shards — challenge
// mode shards land on top of it.
function ShardStat({ total = 0, cm = 0, cap = 800 }) {
  const over = total > cap
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-silver/50">Magnetite shards</div>
      <div className={`text-xl font-bold mt-0.5 ${over ? 'text-amber-300' : 'text-cream'}`}>
        {over ? cap : total}
        {cm > 0 && <span className="text-silver/50 font-normal text-base"> +{cm} CM</span>}
      </div>
      <div className={`text-xs ${over ? 'text-amber-300/90' : 'text-silver/50'}`}>
        {over
          ? `${total} earned, capped at ${cap}/week`
          : `per player · ${cap - total} left before the weekly cap`}
      </div>
    </div>
  )
}

const DAY_ROLES = ['Heal', 'Support', 'DPS']
const ROLE_CHIP = {
  Heal: 'bg-teal/25 text-teal-light border-teal/50',
  Support: 'bg-cream/15 text-cream border-cream/40',
  DPS: 'bg-silver/10 text-silver border-silver/30',
}

function SquadPanel({ players, roster, setRoster, onDropSlot }) {
  const { icons } = useData()
  const [openSlot, setOpenSlot] = useState(null)
  const used = roster.filter(Boolean).map((r) => r.id)
  const available = players.filter((p) => !used.includes(p.id))
  const count = roster.filter(Boolean).length
  const mainToRole = (p) => (normRole(p?.mainRole) === 'heal' ? 'Heal' : normRole(p?.mainRole) === 'support' ? 'Support' : 'DPS')

  const setSlot = (i, val) => setRoster(roster.map((x, j) => (j === i ? val : x)))

  const renderSlot = (i) => {
    const entry = roster[i]
    if (!entry) {
      const isOpen = openSlot === i
      return (
        <div
          key={i}
          className={`rounded-2xl border-2 border-dashed min-h-36 p-3 transition-all ${
            isOpen
              ? 'border-teal-light/70 bg-ink/40'
              : 'border-teal-deep/40 hover:border-teal/70 cursor-pointer flex items-center justify-center'
          }`}
          onClick={() => !isOpen && setOpenSlot(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('text/plain')
            if (id) onDropSlot(id, i)
          }}
        >
          {isOpen ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-light/80">Pick player</span>
                <button
                  className="text-silver/50 hover:text-cream px-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenSlot(null)
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {available.map((p) => (
                  <button
                    key={p.id}
                    className="chip border border-teal-deep/50 text-silver hover:text-cream hover:border-teal-light cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSlot(i, { id: p.id, role: mainToRole(p) })
                      setOpenSlot(null)
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                {!available.length && <p className="text-xs text-silver/50">Everyone is already placed.</p>}
              </div>
            </div>
          ) : (
            <span className="text-3xl text-teal-deep/80 font-black select-none">+</span>
          )}
        </div>
      )
    }
    const p = players.find((x) => x.id === entry.id)
    if (!p)
      return (
        <div key={i} className="rounded-2xl border-2 border-dashed border-danger/40 min-h-36 flex items-center justify-center">
          <button className="text-xs text-danger/70 cursor-pointer" onClick={() => setSlot(i, null)}>unknown — clear</button>
        </div>
      )
    return (
      <div
        key={i}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
        className="card p-3 border-teal-light/50 min-h-36 flex flex-col cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="font-bold text-cream truncate" title={p.name}>
            {p.name}
          </div>
          <button
            className="text-danger/60 hover:text-danger font-black px-1 cursor-pointer"
            title="Empty this slot"
            onClick={() => setSlot(i, null)}
          >
            ✕
          </button>
        </div>
        <div className="mt-1.5 space-y-0.5 flex-1">
          {(p.classes || []).slice(0, 2).map((c, j) => (
            <div key={j} className="flex items-center gap-1.5 text-xs text-silver/70 [&_img]:w-4 [&_img]:h-4">
              <BuildChip name={c.name} icons={icons} />
              <span className="text-[10px] text-silver/40 font-bold">{c.level}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {DAY_ROLES.map((role) => (
            <button
              key={role}
              className={`text-[11px] font-bold rounded-md py-1.5 border transition-all cursor-pointer ${
                entry.role === role
                  ? (ROLE_CHIP[role] || '') + ' ring-1 ring-teal-light'
                  : 'border-teal-deep/40 text-silver/60 hover:text-cream hover:border-teal'
              }`}
              onClick={() => setSlot(i, { ...entry, role })}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="anim-in anim-in-1">
      <h2 className="text-[11px] uppercase tracking-widest text-teal-light/80 font-bold mb-2.5">
        Who's in today?{' '}
        <span className="text-silver/50 normal-case">({count}/10 — each row is a subgroup)</span>
      </h2>
      <div className="space-y-3">
        {[0, 1].map((g) => (
          <div key={g}>
            <div className="text-[10px] uppercase tracking-widest text-silver/40 font-bold mb-1.5">Subgroup {g + 1}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[0, 1, 2, 3, 4].map((k) => renderSlot(g * 5 + k))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BossDetail({ boss, prevBoss, presentPlayers, done, onToggleDone, onMoveToSubgroup }) {
  const { comps, icons, builds, plans } = useData()
  const { openBible } = useNav()
  const comp = comps.bosses?.[boss.id]
  const k = comp || {}

  // Same source as the Bible: the repo plan, no local copies.
  const plan = plans?.bosses?.[boss.id] || null
  const hasComp = !!plan?.comp?.length

  // Each of today's players takes the slot that matches the role they picked
  // for the day: a Heal takes the Heal slot, a Support the Support slot, and so
  // on. Classes are not assigned here — the Bible describes roles, not builds.
  const { assignees, leftover } = useMemo(() => {
    const out = []
    const pool = [...presentPlayers]
    for (const [i, r] of (plan?.comp || []).entries()) {
      const j = pool.findIndex((p) => p.dayRole === r.role)
      if (j >= 0) {
        out[i] = pool[j].name.split('|')[0].trim()
        pool.splice(j, 1)
      }
    }
    return { assignees: out, leftover: pool }
  }, [plan, presentPlayers])

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
            {boss.shards > 0 && (
              <span className="text-silver/70" title="Daily does not add shards, only LI">
                +{boss.shards} shards
                {boss.shardsCM ? <span className="text-silver/45"> (+{boss.shardsCM} CM)</span> : null}
              </span>
            )}
            {boss.preEvent && (
              <span className="chip bg-danger/15 border border-danger/40 text-danger/90" title="Mandatory pre-event — time already included">
                pre-event
              </span>
            )}
            {k.profile && (
              <span className="chip bg-teal-deep/40 text-teal-light uppercase">
                {(k.profile.tags || [k.profile.dmg, k.profile.style]).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <button onClick={onToggleDone} className="btn btn-primary text-sm">✓ Complete</button>
      </div>

      {hasComp ? (
        <div className="pt-4">
          <PlanView plan={plan} icons={icons} builds={builds} only="comp" assignees={assignees} />
          {presentPlayers.length > 0 && leftover.length > 0 && (
            <p className="text-sm text-amber-300/90 mt-3">
              No slot for today's role in this comp:{' '}
              {leftover.map((p) => `${p.name.split('|')[0].trim()} (${p.dayRole})`).join(', ')}
            </p>
          )}
          {!presentPlayers.length && (
            <p className="text-sm text-silver/50 mt-3">Pick today's squad above to see who takes each slot.</p>
          )}
        </div>
      ) : (
        <div className="py-4">
          <p className="text-sm text-silver/50">No comp for this fight in the Bible yet.</p>
        </div>
      )}
    </div>
  )
}

export default function SaleDay() {
  const { wings, players, icons } = useData()
  const run0 = loadRun()

  const mainToRole = (p) => (normRole(p?.mainRole) === 'heal' ? 'Heal' : normRole(p?.mainRole) === 'support' ? 'Support' : 'DPS')
  const SLOTS = 10
  const slotify = (r) => {
    const exists = (id) => (players?.players || []).some((p) => p.id === id)
    const arr = (r || [])
      .map((x) =>
        typeof x === 'string' ? { id: x, role: mainToRole((players?.players || []).find((p) => p.id === x)) } : x
      )
      .map((x) => (x && exists(x.id) ? x : null))
    if (arr.length === SLOTS) return arr.map((x) => x || null)
    const out = new Array(SLOTS).fill(null)
    arr.filter(Boolean).forEach((x, i) => {
      if (i < SLOTS) out[i] = x
    })
    return out
  }
  // Days saved before the default moved to 25 still carried the old 10; bump
  // them once (v2) and keep everything else about the day.
  const [liTargetStr, setLiTargetStr] = useState(
    run0.v === 2 ? run0.liTargetStr ?? '25' : run0.liTargetStr && run0.liTargetStr !== '10' ? run0.liTargetStr : '25'
  )
  const [discarded, setDiscarded] = useState(run0.discarded ?? [])
  // Encounters the commander has already accepted. Skipping one pins the rest so
  // only the gap it leaves gets re-solved.
  const [pinned, setPinned] = useState(run0.pinned ?? [])
  const [completed, setCompleted] = useState(run0.completed ?? [])
  // Fights killed today that were not in the plan, added by hand.
  const [extras, setExtras] = useState(run0.extras ?? [])
  const [adding, setAdding] = useState(false)
  const [roster, setRoster] = useState(() => slotify(run0.roster))
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
    localStorage.setItem(dayKey(), JSON.stringify({ v: 2, liTargetStr, discarded, completed, roster, pinned, extras }))
  }, [liTargetStr, discarded, completed, roster, pinned, extras])

  const dailyIds = (dailies || []).map((d) => d.bossId).filter(Boolean)

  const sale = useMemo(
    () => buildSaleList({ wings: wings.wings, dailyIds, discarded, liTarget, pinned, forced: completed }),
    [wings, dailies, discarded, liTarget, pinned, completed]
  )

  const presentPlayers = roster
    .map((r, i) => {
      if (!r) return null
      const p = (players?.players || []).find((x) => x.id === r.id)
      return p ? { ...p, dayRole: r.role, subgroup: i < 5 ? 1 : 2 } : null
    })
    .filter(Boolean)
  const liDone = sale.list.filter((b) => completed.includes(b.id)).reduce((s, b) => s + b.effLi, 0)
  const nextId = sale.list.find((b) => !completed.includes(b.id))?.id
  const pct = Math.min(100, Math.round((liDone / Math.max(1, sale.totalLi)) * 100))
  const visibleList = sale.list.filter((b) => !completed.includes(b.id))
  const selectedBoss = visibleList.find((b) => b.id === selected) || visibleList[0]

  // Whatever is in the run but not pinned is what the solver just swapped in to
  // cover the LI left behind by a skipped fight.
  const swappedIn = pinned.length ? sale.list.filter((b) => !pinned.includes(b.id)) : []

  const toggleDone = (id) => {
    if (completed.includes(id)) {
      setCompleted((c) => c.filter((x) => x !== id))
      setExtras((e) => e.filter((x) => x !== id)) // an added kill un-done simply goes away
    } else setCompleted((c) => [...c, id])
  }
  // Log a fight we killed that the plan did not have. It counts toward the
  // target, so the rest of the day shrinks to match.
  const addKill = (id) => {
    if (!id) return
    setDiscarded((d) => d.filter((x) => x !== id))
    setExtras((e) => (e.includes(id) ? e : [...e, id]))
    setCompleted((c) => (c.includes(id) ? c : [...c, id]))
    setAdding(false)
  }
  const skip = (id) => {
    // Pin everything else first, so only this fight's LI gets re-solved.
    setPinned(sale.list.filter((b) => b.id !== id).map((b) => b.id))
    setDiscarded((d) => [...d, id])
  }
  // Bringing a fight back means the day is worth planning again from scratch,
  // otherwise the pins would keep it out of the run forever.
  const restore = (id) => {
    setDiscarded((d) => d.filter((x) => x !== id))
    setPinned([])
  }
  const replan = () => setPinned([])
  const resetDay = () => {
    setCompleted([])
    setDiscarded([])
    setPinned([])
    setExtras([])
  }
  const slotIndexOf = (id) => roster.findIndex((r) => r && r.id === id)
  const dropOnSlot = (id, i) => {
    const from = slotIndexOf(id)
    if (from === -1 || from === i) return
    if (roster[i]) return // only empty slots accept drops — no swapping
    const next = [...roster]
    next[i] = next[from]
    next[from] = null
    setRoster(next)
  }
  const moveToSubgroup = (id, g) => {
    if (g !== 0 && g !== 1) return
    const from = slotIndexOf(id)
    if (from === -1) return
    if (from >= g * 5 && from < g * 5 + 5) return
    const base = g * 5
    for (let k = 0; k < 5; k++) {
      if (!roster[base + k]) {
        dropOnSlot(id, base + k)
        return
      }
    }
  }

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
              target {liTarget} · fastest set wins
            </div>
          )}
        </div>
        <Stat label="Est. total" value={fmtTime(sale.totalTime)} sub={sale.hasUnknownTimes ? '+ unknown times' : null} />
        <ShardStat total={sale.totalShards} cm={sale.shardsCM} cap={wings?.shardsWeeklyCap ?? 800} />
        <Stat
          label="Wings"
          value={sale.wingCount}
          sub={`${sale.visits ?? sale.wingCount} instance visit${(sale.visits ?? 1) === 1 ? '' : 's'}`}
        />
      </div>
      {liTarget > 0 && !sale.reached && (
        <p className="text-xs text-danger/80">Can't reach {liTarget} LI with the available bosses.</p>
      )}

      <SquadPanel players={players?.players || []} roster={roster} setRoster={setRoster} onDropSlot={dropOnSlot} />

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start anim-in anim-in-2">
        <div className="space-y-1.5">
          {liTarget === 0 && (
            <p className="text-sm text-silver/50 mb-2">Set an LI target to build the full run — showing dailies only.</p>
          )}
          {visibleList.map((b, i) => {
            const isNext = b.id === nextId
            const isSel = selectedBoss?.id === b.id
            const wingChanged = i === 0 || visibleList[i - 1].wing.id !== b.wing.id
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
                  className={`card px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all ${
                    isSel ? 'border-teal-light/80 bg-teal-deep/25' : ''
                  } ${isNext && !isSel ? 'glow-next' : ''}`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDone(b.id) }}
                    title="Mark completed"
                    className="w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center text-xs font-black transition-all cursor-pointer border-teal-deep/70 text-transparent hover:text-teal-light hover:border-teal-light"
                  >
                    ✓
                  </button>
                  <span className="text-silver/40 font-bold w-4 text-right text-sm shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="strike-name font-bold text-cream text-sm truncate block">
                      {b.name} {b.isDaily && <span className="text-cream/90">★</span>}
                      {b.preEvent && <span className="text-danger/70 text-xs font-normal ml-1" title="Mandatory pre-event included">+pre</span>}
                      {isNext && <span className="text-teal-light text-xs font-normal ml-1">next</span>}
                    </span>
                  </div>
                  <div className="text-right shrink-0 leading-tight">
                    <div className="font-bold text-cream tabular-nums text-sm">{fmtTime(b.time)}</div>
                    <div className="text-[11px] text-teal-light font-bold">+{b.effLi}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); skip(b.id) }}
                    title="Skip this fight — the next best one takes its place, the rest of the day stays as it is"
                    className="shrink-0 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border border-danger/40 text-danger/80 hover:text-cream hover:bg-danger/25 hover:border-danger cursor-pointer transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )
          })}

          <div className="pt-2">
            {adding ? (
              <select
                autoFocus
                className={`${'w-full rounded-xl bg-ink/70 border border-teal/50 px-3 py-2 text-sm text-cream'}`}
                defaultValue=""
                onChange={(e) => addKill(e.target.value)}
                onBlur={() => setAdding(false)}
              >
                <option value="" disabled>Which fight did we kill?</option>
                {wings.wings.map((w) => (
                  <optgroup key={w.id} label={`${w.short} · ${w.name}`}>
                    {w.bosses
                      .filter((b) => (b.li ?? 1) > 0 && !completed.includes(b.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}{dailyIds.includes(b.id) ? ' ★' : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <button
                className="w-full rounded-xl border border-dashed border-teal/40 py-2.5 text-sm font-semibold text-teal-light/90 hover:text-cream hover:border-teal-light cursor-pointer"
                onClick={() => setAdding(true)}
              >
                + Add a fight we killed
              </button>
            )}
          </div>

          {completed.length > 0 && (
            <div className="pt-3">
              <h3 className="text-[10px] uppercase tracking-widest text-teal-light/60 font-bold mb-1.5">Completed ({completed.length})</h3>
              <div className="flex flex-wrap gap-1.5">
                {completed.map((id) => {
                  const b = wings.wings.flatMap((w) => w.bosses).find((x) => x.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleDone(id)}
                      className="chip border border-teal/40 text-teal-light/80 hover:text-cream hover:border-teal-light cursor-pointer"
                      title="Click to move back to the run"
                    >
                      ✓ {b?.name || id}{extras.includes(id) ? ' · added' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {discarded.length > 0 && swappedIn.length > 0 && (
            <div className="pt-3 text-xs text-teal-light/90">
              Swapped in to cover the skipped {discarded.length === 1 ? 'fight' : 'fights'}:{' '}
              <span className="font-bold text-cream">{swappedIn.map((b) => b.name).join(', ')}</span>
              <button onClick={replan} className="ml-2 underline text-silver/50 hover:text-cream cursor-pointer">
                re-plan the whole day instead
              </button>
            </div>
          )}

          {discarded.length > 0 && (
            <div className="pt-3">
              <h3 className="text-[10px] uppercase tracking-widest text-silver/50 font-bold mb-1.5">Skipped</h3>
              <div className="flex flex-wrap gap-1.5">
                {discarded.map((id) => {
                  const b = wings.wings.flatMap((w) => w.bosses).find((x) => x.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => restore(id)}
                      className="chip border border-silver/30 text-silver/60 hover:text-cream hover:border-teal cursor-pointer"
                      title="Bring it back — the day gets planned again from scratch"
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
            prevBoss={(() => {
              const i = visibleList.findIndex((b) => b.id === selectedBoss.id)
              return i > 0 ? visibleList[i - 1] : null
            })()}
            presentPlayers={presentPlayers}
            done={completed.includes(selectedBoss.id)}
            onToggleDone={() => toggleDone(selectedBoss.id)}
            onMoveToSubgroup={moveToSubgroup}
          />
        ) : (
          <div className="card p-10 text-center text-silver/50">No bosses in today's run yet.</div>
        )}
      </div>
    </div>
  )
}
