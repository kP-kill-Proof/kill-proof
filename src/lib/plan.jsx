// Encounter plan: what WE do on a fight (comp + mechanic ownership + route),
// as opposed to comps.json which describes what the BOSS does.
// Shared by the Bible (full page, editable) and Today's Sale (compact, live).
import { useState } from 'react'
import { BuildChip, NotesText, lookupToken, resolveBuildIcon } from './icons.jsx'
import { ROLES, RoleChip, Field, selCls } from './ui.jsx'
import { StrategyImage } from './mapedit.jsx'
import { resolveBuildInfo } from './boons.js'

export const PLAN_STATUS = {
  draft: { label: 'Draft', cls: 'bg-silver/10 text-silver border-silver/30' },
  testing: { label: 'Testing', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/40' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
}

const low = (s) => (s || '').toLowerCase()
const AMBIGUOUS = /pendiente|sin resolver|ambig/i

// A requirement can be satisfied by differently-named duties: assigning MOA or
// the Fears IS covering CC, "Stab 1" IS Stability, and so on.
const SYNONYMS = {
  cc: ['cc', 'moa', 'fear', 'pull', 'push', 'breakbar', 'sanctuary', 'time warp'],
  vulnerability: ['vulnerability', 'vuln'],
  stability: ['stability', 'stab'],
  boonstrip: ['boonstrip', 'strip'],
  aegis: ['aegis'],
  quickness: ['quickness', 'quick'],
  alacrity: ['alacrity', 'alac'],
}

// ---------------------------------------------------------------- coverage
// Everything a plan covers comes from two places: the duties the team wrote
// down, and what each build inherently provides (builds.json).
export function planCoverage(plan, buildsData) {
  const comp = plan?.comp || []
  const covered = new Set()
  const bySub = { 1: new Set(), 2: new Set() }

  for (const r of comp) {
    for (const d of r.duties || []) covered.add(low(d))
    const info = resolveBuildInfo(r.build, buildsData)
    if (!info) continue
    for (const b of info.boons || []) {
      covered.add(low(b))
      bySub[r.sub]?.add(b)
    }
    for (const c of info.condis || []) covered.add(low(c))
  }

  const isCovered = (req) => {
    const n = low(req)
    const keys = SYNONYMS[n] || [n]
    for (const c of covered) for (const k of keys) if (c.includes(k)) return true
    return false
  }

  const requires = plan?.requires || []
  const mechanics = plan?.mechanics || []

  return {
    covered,
    bySub,
    missingReq: requires.filter((r) => !isCovered(r)),
    okReq: requires.filter((r) => isCovered(r)),
    // a mechanic pointing at a comp row that doesn't exist has no owner
    unassigned: mechanics.filter((m) => m.slot >= 0 && !comp[m.slot]),
    // the team itself flagged these as unresolved
    flagged: mechanics.filter((m) => AMBIGUOUS.test(m.note || '')),
    unsure: comp.filter((r) => r.unsure),
    missingBoons: {
      1: ['Quickness', 'Alacrity'].filter((b) => !bySub[1].has(b)),
      2: ['Quickness', 'Alacrity'].filter((b) => !bySub[2].has(b)),
    },
  }
}

export function planIsEmpty(plan) {
  if (!plan) return true
  return !(plan.comp?.length || plan.mechanics?.length || plan.steps?.length || plan.maps?.length)
}

// ---------------------------------------------------------------- small bits
function DutyChip({ duty, icons }) {
  const url = lookupToken(duty, icons)
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-deep/30 border border-teal/30 text-[11px] text-cream/90">
      {url && <img src={url} alt="" className="w-3.5 h-3.5" />}
      {duty}
    </span>
  )
}

function rowLabel(r) {
  if (!r) return '—'
  const who = r.player ? r.player.split('|')[0].trim() : null
  return [r.role, r.build || null, who].filter(Boolean).join(' · ')
}

export function CoveragePanel({ cov, compact = false }) {
  const warn = [
    ...cov.missingReq.map((r) => `${r} sin cubrir`),
    ...cov.unassigned.map((m) => `"${m.label}" sin dueño`),
    ...cov.flagged.map((m) => `"${m.label}": ${m.note}`),
    ...(cov.missingBoons[1].length ? [`Subgrupo 1 sin ${cov.missingBoons[1].join(' ni ')}`] : []),
    ...(cov.missingBoons[2].length ? [`Subgrupo 2 sin ${cov.missingBoons[2].join(' ni ')}`] : []),
  ]
  if (!warn.length && cov.okReq.length === 0) return null
  return (
    <div className={compact ? '' : 'card p-4'}>
      <div className="flex flex-wrap items-center gap-1.5">
        {cov.okReq.map((r) => (
          <span key={r} className="chip bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
            ✓ {r}
          </span>
        ))}
        {cov.missingReq.map((r) => (
          <span key={r} className="chip bg-danger/15 border border-danger/50 text-danger text-[11px] font-semibold">
            ✕ {r}
          </span>
        ))}
      </div>
      {warn.length > 0 && (
        <ul className="mt-2 space-y-1">
          {warn.map((w, i) => (
            <li key={i} className="text-xs text-danger/90 flex items-start gap-1.5">
              <span className="mt-[2px]">▲</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- comp
function CompRow({ r, i, editing, icons, builds, players, onChange, onDelete }) {
  if (!editing) {
    return (
      <div className="py-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <RoleChip role={r.role} />
          {r.player && <span className="font-semibold text-cream shrink-0">{r.player.split('|')[0].trim()}</span>}
          {r.build && <BuildChip name={r.build} icons={icons} className="text-cream/90" />}
          {r.unsure && (
            <span className="chip bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px]" title="Nombre sacado del transcript — confirmar">
              confirmar
            </span>
          )}
          {(r.duties || []).map((d, j) => (
            <DutyChip key={j} duty={d} icons={icons} />
          ))}
        </div>
        {(r.gear || r.alt || r.note) && (
          <div className="ml-[5rem] mt-0.5 space-y-0.5 text-xs">
            {r.gear && <div className="text-amber-300/90">⚙ {r.gear}</div>}
            {r.alt && <div className="text-silver">alt: {r.alt}</div>}
            {r.note && <div className="text-silver/80"><NotesText text={r.note} icons={icons} /></div>}
          </div>
        )}
      </div>
    )
  }
  const cycle = () => onChange({ ...r, role: ROLES[(ROLES.indexOf(r.role) + 1) % ROLES.length] })
  return (
    <div className="rounded-xl border border-teal-deep/20 bg-ink/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <RoleChip role={r.role} onClick={cycle} />
        <Field value={r.player} placeholder="player" list="kp-roster-names" className="w-28 shrink-0" onCommit={(v) => onChange({ ...r, player: v })} />
        {r.build && resolveBuildIcon(r.build, icons) && <img src={resolveBuildIcon(r.build, icons)} alt="" className="w-8 h-8 rounded-md shrink-0" />}
        <Field value={r.build} placeholder="class/build" list="kp-build-names" className="flex-1 min-w-0" onCommit={(v) => onChange({ ...r, build: v })} />
        <button className="px-1 text-danger/70 hover:text-danger shrink-0" title="Quitar slot" onClick={onDelete}>✕</button>
      </div>
      <Field
        value={(r.duties || []).join(', ')}
        placeholder="duties separadas por coma — Portal 1, MOA, Vulnerability…"
        className="w-full"
        onCommit={(v) => onChange({ ...r, duties: v.split(',').map((x) => x.trim()).filter(Boolean) })}
      />
      <div className="flex gap-1.5">
        <Field value={r.gear} placeholder="gear (1050 toughness…)" className="flex-1" onCommit={(v) => onChange({ ...r, gear: v })} />
        <Field value={r.alt} placeholder="build alternativa" className="flex-1" onCommit={(v) => onChange({ ...r, alt: v })} />
      </div>
      <Field value={r.note} placeholder="nota" className="w-full" onCommit={(v) => onChange({ ...r, note: v })} />
    </div>
  )
}

// ---------------------------------------------------------------- main view
export default function PlanView({
  plan,
  icons,
  builds,
  players = [],
  editing = false,
  compact = false,
  onChange,
}) {
  const [openMap, setOpenMap] = useState(compact ? null : 0)
  const [showRoute, setShowRoute] = useState(!compact)
  const cov = planCoverage(plan, builds)
  const comp = plan?.comp || []
  const mechanics = plan?.mechanics || []
  const steps = plan?.steps || []
  const maps = plan?.maps || []
  const st = PLAN_STATUS[plan?.status] || PLAN_STATUS.draft

  const set = (patch) => onChange?.({ ...plan, ...patch })
  const setRow = (i, r) => set({ comp: comp.map((x, j) => (j === i ? r : x)) })
  const setMech = (i, m) => set({ mechanics: mechanics.map((x, j) => (j === i ? m : x)) })
  const move = (arr, key, i, dir) => {
    const a = [...arr]
    const [x] = a.splice(i, 1)
    a.splice(i + dir, 0, x)
    set({ [key]: a })
  }

  const Section = ({ title, children, right }) => (
    <div className={compact ? 'space-y-2' : 'card p-5'}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <select className={selCls} value={plan?.status || 'draft'} onChange={(e) => set({ status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="testing">Testing</option>
              <option value="confirmed">Confirmed</option>
            </select>
          ) : (
            <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${st.cls}`}>{st.label}</span>
          )}
          <span className="text-xs text-silver/60">6-man · el comprador nunca cuenta</span>
        </div>
      )}

      <CoveragePanel cov={cov} compact={compact} />

      {/* ---- comp ---- */}
      <Section
        title="Comp"
        right={
          editing && (
            <button
              className="btn btn-ghost text-xs"
              onClick={() => set({ comp: [...comp, { sub: comp.filter((r) => r.sub === 1).length <= comp.filter((r) => r.sub === 2).length ? 1 : 2, role: 'DPS', build: '', player: '', duties: [] }] })}
            >
              + slot
            </button>
          )
        }
      >
        {comp.length === 0 ? (
          <p className="text-sm text-silver/50 italic">Sin comp definida todavía.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2].map((g) => (
              <div key={g} className="bg-ink/40 border border-teal-deep/25 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wider text-teal-light/80 mb-2">
                  Subgroup {g}
                  {cov.bySub[g].size > 0 && (
                    <span className="ml-2 normal-case text-silver/60">{[...cov.bySub[g]].join(' · ')}</span>
                  )}
                </div>
                <div className={editing ? 'space-y-2' : 'space-y-1'}>
                  {comp.map((r, i) =>
                    r.sub === g ? (
                      <CompRow
                        key={i}
                        r={r}
                        i={i}
                        editing={editing}
                        icons={icons}
                        builds={builds}
                        players={players}
                        onChange={(x) => setRow(i, x)}
                        onDelete={() => set({ comp: comp.filter((_, j) => j !== i) })}
                      />
                    ) : null
                  )}
                </div>
                {editing && (
                  <button
                    className="btn btn-ghost text-[11px] mt-2"
                    onClick={() => set({ comp: [...comp, { sub: g, role: 'DPS', build: '', player: '', duties: [] }] })}
                  >
                    + slot en subgroup {g}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ---- mechanic ownership ---- */}
      {(mechanics.length > 0 || editing) && (
        <Section
          title="Mecánicas — quién hace qué"
          right={
            editing && (
              <button className="btn btn-ghost text-xs" onClick={() => set({ mechanics: [...mechanics, { label: '', slot: -1, note: '', altLabel: '' }] })}>
                + mecánica
              </button>
            )
          }
        >
          <div className={editing ? 'space-y-2' : 'space-y-1'}>
            {mechanics.map((m, i) => {
              const owner = m.slot >= 0 ? comp[m.slot] : null
              const orphan = m.slot >= 0 && !owner
              const flagged = AMBIGUOUS.test(m.note || '')
              if (editing) {
                return (
                  <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-teal-deep/20 bg-ink/30 p-2">
                    <Field value={m.label} placeholder="mecánica (Agony 3, Green 1…)" className="w-52" onCommit={(v) => setMech(i, { ...m, label: v })} />
                    <Field value={m.altLabel} placeholder="alias (North)" className="w-24" onCommit={(v) => setMech(i, { ...m, altLabel: v })} />
                    <select className={selCls} value={m.slot} onChange={(e) => setMech(i, { ...m, slot: parseInt(e.target.value, 10) })}>
                      <option value={-1}>— todos —</option>
                      {comp.map((r, j) => (
                        <option key={j} value={j}>
                          {rowLabel(r)}
                        </option>
                      ))}
                    </select>
                    <Field value={m.note} placeholder="nota" className="flex-1 min-w-[120px]" onCommit={(v) => setMech(i, { ...m, note: v })} />
                    <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => move(mechanics, 'mechanics', i, -1)}>↑</button>
                    <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === mechanics.length - 1} onClick={() => move(mechanics, 'mechanics', i, 1)}>↓</button>
                    <button className="px-1 text-danger/70 hover:text-danger" onClick={() => set({ mechanics: mechanics.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                )
              }
              return (
                <div
                  key={i}
                  className={`flex flex-wrap items-center gap-2 text-sm rounded-lg px-2 py-1 ${orphan || flagged ? 'bg-danger/10 border border-danger/30' : ''}`}
                >
                  <span className="font-semibold text-cream min-w-[9rem]">
                    {m.label}
                    {m.altLabel && <span className="text-silver/60 font-normal"> ({m.altLabel})</span>}
                  </span>
                  <span className="text-teal-light">→</span>
                  {owner ? (
                    <span className="flex items-center gap-1.5">
                      <RoleChip role={owner.role} />
                      {owner.player && <span className="font-semibold text-cream">{owner.player.split('|')[0].trim()}</span>}
                      {owner.build && <BuildChip name={owner.build} icons={icons} className="text-cream/90" />}
                    </span>
                  ) : m.slot === -1 ? (
                    <span className="text-silver">todos</span>
                  ) : (
                    <span className="text-danger font-semibold">SIN DUEÑO</span>
                  )}
                  {m.note && (
                    <span className={`text-xs ${flagged ? 'text-danger' : 'text-silver'}`}>· {m.note}</span>
                  )}
                </div>
              )
            })}
            {mechanics.length === 0 && <p className="text-sm text-silver/50 italic">Nada asignado todavía.</p>}
          </div>
        </Section>
      )}

      {/* ---- route / steps ---- */}
      {(steps.length > 0 || maps.length > 0 || editing) && (
        <Section
          title="Ruta y estrategia"
          right={
            <div className="flex items-center gap-2">
              {editing && (
                <>
                  <button className="btn btn-ghost text-xs" onClick={() => set({ steps: [...steps, { text: '' }] })}>+ paso</button>
                  <button className="btn btn-ghost text-xs" onClick={() => set({ maps: [...maps, { name: 'Mapa', image: null, pins: [], draw: [], imgSize: 'md' }] })}>+ mapa</button>
                </>
              )}
              {compact && (steps.length > 0 || maps.length > 0) && (
                <button className="btn btn-ghost text-xs" onClick={() => setShowRoute(!showRoute)}>
                  {showRoute ? 'ocultar' : `ver (${steps.length} pasos${maps.length ? ` · ${maps.length} mapa${maps.length > 1 ? 's' : ''}` : ''})`}
                </button>
              )}
            </div>
          }
        >
          {(!compact || showRoute) && (
            <div className="space-y-3">
              {steps.length > 0 && (
                <ol className="space-y-1.5">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-teal-deep/50 border border-teal/40 text-teal-light text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {editing ? (
                        <>
                          <Field textarea value={s.text} placeholder="paso…" className="flex-1 min-h-[42px]" onCommit={(v) => set({ steps: steps.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
                          <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => move(steps, 'steps', i, -1)}>↑</button>
                          <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === steps.length - 1} onClick={() => move(steps, 'steps', i, 1)}>↓</button>
                          <button className="px-1 text-danger/70 hover:text-danger" onClick={() => set({ steps: steps.filter((_, j) => j !== i) })}>✕</button>
                        </>
                      ) : (
                        <span className="text-cream/90 leading-relaxed pt-0.5">
                          <NotesText text={s.text} icons={icons} />
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {maps.map((mp, i) => (
                <div key={i} className="rounded-xl border border-teal-deep/25 bg-ink/40 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {editing ? (
                      <>
                        <Field value={mp.name} placeholder="nombre del mapa" className="w-56" onCommit={(v) => set({ maps: maps.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
                        <button className="px-1 text-danger/70 hover:text-danger ml-auto" onClick={() => set({ maps: maps.filter((_, j) => j !== i) })}>✕</button>
                      </>
                    ) : (
                      <button className="text-sm font-semibold text-cream flex items-center gap-2" onClick={() => setOpenMap(openMap === i ? null : i)}>
                        <span className="text-teal-light">{openMap === i ? '▾' : '▸'}</span>
                        {mp.name || `Mapa ${i + 1}`}
                      </button>
                    )}
                  </div>
                  {(editing || openMap === i) && (
                    <StrategyImage
                      seg={mp}
                      editing={editing}
                      onChange={(next) => set({ maps: maps.map((x, j) => (j === i ? next : x)) })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ---- decisions / rejected / gaps ---- */}
      {!compact && (
        <div className="grid md:grid-cols-2 gap-4">
          <ListSection
            title="Decidido y por qué"
            items={plan?.decisions || []}
            editing={editing}
            tone="ok"
            onChange={(v) => set({ decisions: v })}
          />
          <ListSection
            title="Descartado y por qué"
            items={plan?.rejected || []}
            editing={editing}
            tone="bad"
            onChange={(v) => set({ rejected: v })}
          />
        </div>
      )}

      {!compact && ((plan?.gaps || []).length > 0 || editing) && (
        <Section
          title="Pendientes"
          right={editing && <button className="btn btn-ghost text-xs" onClick={() => set({ gaps: [...(plan?.gaps || []), ''] })}>+ pendiente</button>}
        >
          <ul className="space-y-1.5">
            {(plan?.gaps || []).map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-300 mt-[2px]">▲</span>
                {editing ? (
                  <>
                    <Field value={g} className="flex-1" onCommit={(v) => set({ gaps: (plan.gaps || []).map((x, j) => (j === i ? v : x)) })} />
                    <button className="px-1 text-danger/70 hover:text-danger" onClick={() => set({ gaps: plan.gaps.filter((_, j) => j !== i) })}>✕</button>
                  </>
                ) : (
                  <span className="text-cream/90">{g}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!compact && plan?.requires && (
        <div className="text-xs text-silver/50">
          {editing ? (
            <label className="flex items-center gap-2">
              Debe cubrir:
              <Field
                value={(plan.requires || []).join(', ')}
                className="flex-1"
                placeholder="Vulnerability, CC, Stability…"
                onCommit={(v) => set({ requires: v.split(',').map((x) => x.trim()).filter(Boolean) })}
              />
            </label>
          ) : (
            <>Debe cubrir: {plan.requires.join(' · ') || '—'}</>
          )}
        </div>
      )}
    </div>
  )
}

function ListSection({ title, items, editing, tone, onChange }) {
  if (!editing && items.length === 0) return null
  const color = tone === 'bad' ? 'text-danger/90' : 'text-emerald-300'
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">{title}</h2>
        {editing && (
          <button className="btn btn-ghost text-xs" onClick={() => onChange([...items, { what: '', why: '' }])}>
            +
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((it, i) =>
          editing ? (
            <li key={i} className="flex items-center gap-1.5">
              <Field value={it.what} placeholder="qué" className="flex-1" onCommit={(v) => onChange(items.map((x, j) => (j === i ? { ...x, what: v } : x)))} />
              <Field value={it.why} placeholder="por qué" className="flex-1" onCommit={(v) => onChange(items.map((x, j) => (j === i ? { ...x, why: v } : x)))} />
              <button className="px-1 text-danger/70 hover:text-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
            </li>
          ) : (
            <li key={i} className="text-sm">
              <span className={`font-semibold ${color}`}>{tone === 'bad' ? '✕' : '✓'} {it.what}</span>
              {it.why && <span className="text-silver"> — {it.why}</span>}
            </li>
          )
        )}
        {items.length === 0 && <li className="text-sm text-silver/50 italic">—</li>}
      </ul>
    </div>
  )
}
