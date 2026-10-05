// Encounter plan: what WE do on a fight (comp + mechanic ownership + route),
// as opposed to comps.json which describes what the BOSS does.
// Shared by the Bible (full page, editable) and Today's Sale (compact, live).
import { useState } from 'react'
import { BuildChip, NotesText, lookupToken, resolveBuildIcon } from './icons.jsx'
import { ROLES, RoleChip, Field, BuildCombo, selCls } from './ui.jsx'
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
  might: ['might'],
  protection: ['protection', 'prot'],
  regeneration: ['regeneration', 'regen'],
  swiftness: ['swiftness', 'swift'],
  quickness: ['quickness', 'quick'],
  alacrity: ['alacrity', 'alac'],
}

// The minimum every comp has to cover, on every single fight.
// Quickness/Alacrity are deliberately NOT here: in 6-man a subgroup won't
// always have both, and that is fine.
export const BASELINE_REQUIRES = ['Vulnerability', 'Might', 'Protection', 'Regeneration', 'Swiftness']

// ---------------------------------------------------------------- coverage
// Everything a plan covers comes from two places: the duties the team wrote
// down, and what each build inherently provides (builds.json).
export function planCoverage(plan, buildsData) {
  const comp = plan?.comp || []
  const covered = new Set()
  const bySub = { 1: new Set(), 2: new Set() }
  // Kept apart from `covered` so the fight page can show two honest columns:
  // what the squad gets, and what actually lands on the boss.
  const boons = new Map()
  const condis = new Map()
  const addTo = (map, name, who) => {
    const k = name
    if (!map.has(k)) map.set(k, [])
    if (who && !map.get(k).includes(who)) map.get(k).push(who)
  }

  for (const r of comp) {
    // The build is the most useful label here when there is one; the role is the
    // fallback so a slot with no class picked still says who is responsible.
    const who = r.build || r.role2 || r.role
    for (const d of r.duties || []) covered.add(low(d))
    const info = resolveBuildInfo(r.build, buildsData)
    if (!info) continue
    for (const b of info.boons || []) {
      covered.add(low(b))
      bySub[r.sub]?.add(b)
      addTo(boons, b, who)
    }
    for (const c of info.condis || []) {
      covered.add(low(c))
      addTo(condis, c, who)
    }
  }

  const isCovered = (req) => {
    const n = low(req)
    const keys = SYNONYMS[n] || [n]
    for (const c of covered) for (const k of keys) if (c.includes(k)) return true
    return false
  }

  const requires = [...new Set([...BASELINE_REQUIRES, ...(plan?.requires || [])])]
  const notes = plan?.notes || plan?.mechanics || []

  return {
    covered,
    bySub,
    boons,
    condis,
    missingReq: requires.filter((r) => !isCovered(r)),
    okReq: requires.filter((r) => isCovered(r)),
    // a note pointing at a comp row that no longer exists lost its owner
    unassigned: notes.filter((m) => m.slot >= 0 && !comp[m.slot]),
    // the team itself flagged these as unresolved
    flagged: notes.filter((m) => AMBIGUOUS.test(m.note || '') || AMBIGUOUS.test(m.label || '')),
    unsure: comp.filter((r) => r.unsure),
  }
}

export function planIsEmpty(plan) {
  if (!plan) return true
  return !(plan.comp?.length || (plan.notes || plan.mechanics)?.length || plan.steps?.length || plan.maps?.length)
}

// ---------------------------------------------------------------- small bits
function DutyChip({ duty, label, icons }) {
  const url = lookupToken(duty, icons)
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-deep/30 border border-teal/30 text-[13px] text-cream/90">
      {url && <img src={url} alt="" className="w-4 h-4" />}
      {label || duty}
    </span>
  )
}

function rowLabel(r) {
  if (!r) return '—'
  return [r.role2 ? `${r.role} ${r.role2}` : r.role, r.build || null].filter(Boolean).join(' · ')
}

export function CoveragePanel({ cov, compact = false }) {
  const hard = cov.missingReq.map((r) => `Nobody covers ${r}`)
  const soft = [
    ...cov.unassigned.map((m) => `"${m.label}" lost its owner`),
    ...cov.flagged.map((m) => `${m.label}${m.note ? `: ${m.note}` : ''}`),
  ]
  const warn = [...hard, ...soft]
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
          {hard.map((w, i) => (
            <li key={`h${i}`} className="text-xs text-danger/90 flex items-start gap-1.5">
              <span className="mt-[2px]">▲</span>
              <span>{w}</span>
            </li>
          ))}
          {soft.map((w, i) => (
            <li key={`s${i}`} className="text-xs text-amber-300/90 flex items-start gap-1.5">
              <span className="mt-[2px]">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const canon = (keys, s) => keys.find((k) => low(s) === low(k) || low(s).startsWith(low(k)))

// Everything the comp covers, pooled across the whole squad. Deliberately NOT
// split by subgroup: we run 6, so the healer sits apart and boons do not get
// delivered the traditional per-subgroup way.
function squadCoverage(plan, cov, icons) {
  const BOONS = Object.keys(icons?.boons || {})
  const CONDIS = Object.keys(icons?.conditions || {})
  const boons = new Set()
  const condis = new Set()
  const add = (name) => {
    const b = canon(BOONS, name)
    const c = canon(CONDIS, name)
    if (b) boons.add(b)
    else if (c) condis.add(c)
  }
  for (const [b] of cov.boons) add(b)
  for (const [c] of cov.condis) add(c)
  for (const r of plan?.comp || []) {
    for (const d of r.duties || []) add(d)
    for (const x of r.provides || []) add(typeof x === 'string' ? x : x.name)
  }
  return { BOONS, CONDIS, boons, condis }
}

// One icon per boon/condition, like an in-game buff bar. Dimmed means nobody in
// the plan is assigned to it; a red ring means it is one of the must-haves.
// A number only shows when the plan states one — never estimated.
function CoverageGrid({ title, names, on, values = {}, must = [], icons, kind }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-silver/60 font-bold mb-2">{title}</div>
      <div className="flex flex-wrap gap-x-2 gap-y-3">
        {names.map((n) => {
          const active = on.has(n)
          const missing = !active && must.some((m) => low(m) === low(n))
          const url = icons?.[kind]?.[n]
          const v = values[n]
          return (
            <div key={n} title={active ? n : `${n} — nobody assigned`} className="w-[68px] flex flex-col items-center gap-1">
              <div
                className={`relative w-12 h-12 rounded-lg flex items-center justify-center bg-ink/60 border ${
                  missing ? 'border-danger ring-2 ring-danger/60' : active ? 'border-teal/40' : 'border-teal-deep/20'
                }`}
              >
                {url && <img src={url} alt="" className={`w-9 h-9 ${active ? '' : 'opacity-25 grayscale'}`} />}
                {v && active && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 rounded bg-ink border border-cream/30 text-[11px] font-bold text-cream tabular-nums">
                    {v}
                  </span>
                )}
              </div>
              <span className={`text-[12px] text-center leading-tight ${missing ? 'text-danger' : active ? 'text-cream/90' : 'text-silver/35'}`}>{n}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// One phase of the fight: the HP window it covers, what we are trying to do in
// it, the ordered steps, and its own arena picture. The fight is split this way
// because this is the part that never changes when the meta does.
function PhaseBlock({ ph, i, editing, drawing, icons, onChange, onMap, onDelete, onMove, last }) {
  const steps = ph.steps || []
  const setSteps = (v) => onChange({ ...ph, steps: v })
  const range = [ph.from, ph.to].filter((x) => x != null)
  return (
    <div className="rounded-xl border border-teal-deep/25 bg-ink/40 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {editing ? (
          <>
            <Field value={ph.label} placeholder="phase name" className="w-48" onCommit={(v) => onChange({ ...ph, label: v })} />
            <Field value={ph.from ?? ''} placeholder="from %" className="w-20" onCommit={(v) => onChange({ ...ph, from: v === '' ? null : Number(v) })} />
            <span className="text-silver/40">→</span>
            <Field value={ph.to ?? ''} placeholder="to %" className="w-20" onCommit={(v) => onChange({ ...ph, to: v === '' ? null : Number(v) })} />
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={last} onClick={() => onMove(1)}>↓</button>
            <button className="px-1 text-danger/70 hover:text-danger ml-auto" onClick={onDelete}>✕</button>
          </>
        ) : (
          <>
            <span className="text-base uppercase tracking-[0.15em] text-teal-light font-bold">{ph.label || `Phase ${i + 1}`}</span>
            {ph.note && <span className="text-sm text-silver/70">{ph.note}</span>}
            {range.length === 2 && (
              <span className="px-2 py-0.5 rounded-md bg-teal-deep/30 text-[11px] text-silver/80 tabular-nums">
                {ph.from}% → {ph.to}%
              </span>
            )}
          </>
        )}
      </div>

      {editing ? (
        <Field
          value={ph.goal}
          placeholder="what are we trying to do in this phase?"
          className="w-full mb-2"
          onCommit={(v) => onChange({ ...ph, goal: v })}
        />
      ) : (
        ph.goal && <p className="text-[15px] text-cream/90 mb-2 leading-relaxed">{ph.goal}</p>
      )}

      <ol className="space-y-1.5">
        {steps.map((s, j) => (
          <li key={j} className="flex items-start gap-2 text-sm">
            <span className="w-6 h-6 shrink-0 rounded-full bg-teal-deep/50 border border-teal/40 text-teal-light text-xs font-bold flex items-center justify-center">
              {j + 1}
            </span>
            {editing ? (
              <>
                <Field value={s.who} placeholder="who" className="w-28 shrink-0" onCommit={(v) => setSteps(steps.map((x, k) => (k === j ? { ...x, who: v } : x)))} />
                <Field textarea value={s.text} placeholder="what happens / what we do" className="flex-1 min-h-[42px]" onCommit={(v) => setSteps(steps.map((x, k) => (k === j ? { ...x, text: v } : x)))} />
                <button className="px-1 text-danger/70 hover:text-danger" onClick={() => setSteps(steps.filter((_, k) => k !== j))}>✕</button>
              </>
            ) : (
              <span className="text-cream/90 leading-relaxed pt-0.5">
                {s.who && <span className="font-bold text-teal-light mr-1.5">{s.who}</span>}
                <NotesText text={s.text} icons={icons} />
              </span>
            )}
          </li>
        ))}
      </ol>
      {editing && (
        <button className="btn btn-ghost text-[11px] mt-2" onClick={() => setSteps([...steps, { who: '', text: '' }])}>
          + step
        </button>
      )}

      {(ph.map || editing || drawing) && (
        <div className="mt-3">
          {ph.map ? (
            <StrategyImage
              seg={ph.map}
              editing={editing || drawing}
              onChange={(next) => (editing ? onChange({ ...ph, map: next }) : onMap?.(next))}
            />
          ) : (
            <button
              className="btn btn-ghost text-sm"
              onClick={() => {
                const blank = { name: '', image: null, pins: [], draw: [], imgSize: 'lg' }
                editing ? onChange({ ...ph, map: blank }) : onMap?.(blank)
              }}
            >
              + add the arena image for this phase
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// A section defined at module level — defining it inside the view would make
// React remount the whole subtree on every keystroke (and jump scroll to top).
function Section({ title, children, right, compact }) {
  return (
    <div className={compact ? 'space-y-2' : 'card p-5'}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- comp
function CompRow({ r, i, who, editing, icons, builds, players, onChange, onDelete }) {
  const items = (r.duties || []).filter((x) => x && x.trim())
  const chips = items.filter((x) => x.length <= 26)
  const lines = items.filter((x) => x.length > 26)
  if (!editing) {
    const provides = (r.provides || []).map((x) => (typeof x === 'string' ? { name: x } : x))
    const title = r.title || [r.role2, r.role].filter(Boolean).join(' ')
    return (
      <div className="rounded-xl border border-teal-deep/45 bg-teal-deep/10 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <RoleChip role={r.role} />
          <span className="text-[17px] font-bold text-cream leading-tight">{title}</span>
          {who && <span className="ml-auto text-[15px] font-semibold text-teal-light">{who}</span>}
          {r.unsure && (
            <span className="chip bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px]" title="Needs confirming">
              confirm
            </span>
          )}
        </div>
        {/* Every slot always shows both blocks, so a missing one reads as
            "not defined yet" instead of silently disappearing. */}
        <div className="mt-2.5">
          <div className="text-[11px] uppercase tracking-widest text-silver/50 font-bold mb-1">Provides</div>
          {provides.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {provides.map((p, j) => (
                <DutyChip key={j} duty={p.name} label={p.value ? `${p.name} · ${p.value}` : p.name} icons={icons} />
              ))}
            </div>
          ) : (
            <span className="text-sm text-silver/35 italic">not defined yet</span>
          )}
        </div>
        <div className="mt-2.5">
          <div className="text-[11px] uppercase tracking-widest text-silver/50 font-bold mb-1">Responsibilities</div>
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((d, j) => (
                <DutyChip key={j} duty={d} icons={icons} />
              ))}
            </div>
          ) : (
            <span className="text-sm text-silver/35 italic">not defined yet</span>
          )}
        </div>
        {lines.map((t, j) => (
          <div key={j} className={`mt-2 text-[14px] leading-relaxed ${t.includes('⚙') ? 'text-amber-300/90' : 'text-silver/80'}`}>
            <NotesText text={t} icons={icons} />
          </div>
        ))}
      </div>
    )
  }
  const cycle = () => onChange({ ...r, role: ROLES[(ROLES.indexOf(r.role) + 1) % ROLES.length] })
  return (
    <div className="rounded-xl border border-teal-deep/20 bg-ink/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <RoleChip role={r.role} onClick={cycle} />
        <Field value={r.role2} placeholder="2nd role" className="w-28 shrink-0" onCommit={(v) => onChange({ ...r, role2: v })} />
        {r.build && resolveBuildIcon(r.build, icons) && <img src={resolveBuildIcon(r.build, icons)} alt="" className="w-8 h-8 rounded-md shrink-0" />}
        <BuildCombo value={r.build} builds={builds?.builds || []} icons={icons} className="flex-1" onCommit={(v) => onChange({ ...r, build: v })} />
        <button className="px-1 text-danger/70 hover:text-danger shrink-0" title="Remove slot" onClick={onDelete}>✕</button>
      </div>
      <Field
        value={r.purpose}
        placeholder="purpose of this slot — what it is here to do, no class names"
        className="w-full"
        onCommit={(v) => onChange({ ...r, purpose: v })}
      />
      <Field
        textarea
        value={items.join('\n')}
        placeholder=""
        className="w-full min-h-[64px]"
        onCommit={(v) => onChange({ ...r, duties: v.split('\n').map((x) => x.trim()).filter(Boolean) })}
      />
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
  onPhaseMap,
  imageStatus,
  // only="comp": just the squad composition and what it covers — used by
  // Today's Sale, which does not need the fight execution.
  only = null,
  // names of today's players, aligned with plan.comp, shown on each slot
  assignees = [],
}) {
  const [drawing, setDrawing] = useState(false)
  const cov = planCoverage(plan, builds)
  const comp = plan?.comp || []
  const notes = plan?.notes || plan?.mechanics || []
  const steps = plan?.steps || []
  const maps = plan?.maps || []
  const phases = plan?.phases || []
  const sq = squadCoverage(plan, cov, icons)
  const st = PLAN_STATUS[plan?.status] || PLAN_STATUS.draft

  const set = (patch) => onChange?.({ ...plan, ...patch })
  const setRow = (i, r) => set({ comp: comp.map((x, j) => (j === i ? r : x)) })
  const setNotes = (v) => set({ notes: v, mechanics: undefined })
  const setNote = (i, m) => setNotes(notes.map((x, j) => (j === i ? m : x)))
  const moveNote = (i, dir) => {
    const a = [...notes]
    const [x] = a.splice(i, 1)
    a.splice(i + dir, 0, x)
    setNotes(a)
  }
  const move = (arr, key, i, dir) => {
    const a = [...arr]
    const [x] = a.splice(i, 1)
    a.splice(i + dir, 0, x)
    set({ [key]: a })
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {/* ---- comp + what it covers, one single block ---- */}
      <Section
        compact={compact}
        title="Comp & coverage"
        right={
          editing && (
            <button
              className="btn btn-ghost text-xs"
              onClick={() => set({ comp: [...comp, { sub: comp.filter((r) => r.sub === 1).length <= comp.filter((r) => r.sub === 2).length ? 1 : 2, role: 'DPS', role2: '', build: '', duties: [] }] })}
            >
              + slot
            </button>
          )
        }
      >
        {comp.length === 0 ? (
          <p className="text-sm text-silver/50 italic">No comp defined yet.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {[1, 2].map((g) => (
              <div key={g} className="bg-ink/40 border border-teal-deep/25 rounded-xl px-4 py-3">
                <div className="mb-2 pb-2.5 border-b border-teal-deep/25">
                  {/* Title and count stay on their own line so neither can be
                      squeezed into wrapping by the boon list. */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm uppercase tracking-[0.15em] text-teal-light font-bold whitespace-nowrap">
                      Subgroup {g}
                    </span>
                    <span className="ml-auto text-xs text-silver/50 whitespace-nowrap shrink-0">
                      {comp.filter((r) => r.sub === g).length}{' '}
                      {comp.filter((r) => r.sub === g).length === 1 ? 'player' : 'players'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 pt-1">
                  {comp.map((r, i) =>
                    r.sub === g ? (
                      <CompRow
                        key={i}
                        r={r}
                        i={i}
                        who={assignees[i]}
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
                    onClick={() => set({ comp: [...comp, { sub: g, role: 'DPS', role2: '', build: '', duties: [] }] })}
                  >
                    + slot in subgroup {g}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!compact && (
          <div className="mt-5 pt-5 border-t border-teal-deep/25 space-y-5">
            <CoverageGrid title="Boons on the squad" names={sq.BOONS} on={sq.boons} values={plan?.values} must={BASELINE_REQUIRES} icons={icons} kind="boons" />
            <CoverageGrid title="Conditions on the boss" names={sq.CONDIS} on={sq.condis} values={plan?.values} must={BASELINE_REQUIRES} icons={icons} kind="conditions" />
          </div>
        )}
      </Section>

      {/* ---- phases ---- */}
      {!only && !compact && (phases.length > 0 || editing) && (
        <Section
          compact={compact}
          title="Phases & strategy"
          right={
            <div className="flex items-center gap-3">
              {imageStatus && <span className="text-xs text-silver/60">{imageStatus}</span>}
              {onPhaseMap && !editing && (
                <button className={`btn text-sm ${drawing ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDrawing(!drawing)}>
                  {drawing ? '✓ Done drawing' : '✎ Draw on the images'}
                </button>
              )}
              {editing && (
                <button
                  className="btn btn-ghost text-xs"
                  onClick={() => set({ phases: [...phases, { label: `Phase ${phases.length + 1}`, from: null, to: null, goal: '', steps: [] }] })}
                >
                  + phase
                </button>
              )}
            </div>
          }
        >
          {editing && (
            <p className="text-xs text-silver/60 mb-2">
              Split by what the boss does, not by who is playing what. This part stays true when the meta changes.
            </p>
          )}
          <div className="space-y-3">
            {phases.map((ph, i) => (
              <PhaseBlock
                key={i}
                ph={ph}
                i={i}
                last={i === phases.length - 1}
                editing={editing}
                drawing={drawing}
                icons={icons}
                onMap={(map) => onPhaseMap?.(ph.id ?? String(i), map)}
                onChange={(next) => set({ phases: phases.map((x, j) => (j === i ? next : x)) })}
                onDelete={() => set({ phases: phases.filter((_, j) => j !== i) })}
                onMove={(dir) => move(phases, 'phases', i, dir)}
              />
            ))}
            {phases.length === 0 && <p className="text-sm text-silver/50 italic">No phases defined yet.</p>}
          </div>
        </Section>
      )}

      {/* ---- fight notes ---- */}
      {/* Once a fight is split into phases, its notes live inside each phase.
          Fights not migrated yet keep showing their old notes so nothing is lost. */}
      {!only && (notes.length > 0 || editing) && phases.length === 0 && (
        <Section
          compact={compact}
          title="Fight notes"
          right={
            editing && (
              <button className="btn btn-ghost text-xs" onClick={() => setNotes([...notes, { label: '', slot: -1, note: '' }])}>
                + note
              </button>
            )
          }
        >
          {!compact && editing && (
            <p className="text-xs text-silver/60 mb-2">
              Free text — anything worth remembering for this fight. Assigning it to someone is optional.
            </p>
          )}
          <div className={editing ? 'space-y-2' : 'space-y-1'}>
            {notes.map((m, i) => {
              const owner = m.slot >= 0 ? comp[m.slot] : null
              const orphan = m.slot >= 0 && !owner
              const flagged = AMBIGUOUS.test(m.note || '') || AMBIGUOUS.test(m.label || '')
              if (editing) {
                return (
                  <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-teal-deep/20 bg-ink/30 p-2">
                    <Field value={m.label} placeholder="note — Agony 1 and 4, Green 1, cannon 3 then 1…" className="flex-1 min-w-[220px]" onCommit={(v) => setNote(i, { ...m, label: v })} />
                    <select className={selCls} value={m.slot} onChange={(e) => setNote(i, { ...m, slot: parseInt(e.target.value, 10) })}>
                      <option value={-1}>— nobody in particular —</option>
                      {comp.map((r, j) => (
                        <option key={j} value={j}>
                          {rowLabel(r)}
                        </option>
                      ))}
                    </select>
                    <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => moveNote(i, -1)}>↑</button>
                    <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === notes.length - 1} onClick={() => moveNote(i, 1)}>↓</button>
                    <button className="px-1 text-danger/70 hover:text-danger" onClick={() => setNotes(notes.filter((_, j) => j !== i))}>✕</button>
                  </div>
                )
              }
              const who = owner ? owner.build || owner.role : null
              const whoSub = owner ? (owner.role2 ? `${owner.role} · ${owner.role2}` : owner.role) : null
              return (
                <div
                  key={i}
                  className={`sm:grid sm:grid-cols-[1fr_auto] sm:items-start gap-x-4 gap-y-0.5 py-2 border-b border-teal-deep/15 last:border-0 ${flagged ? 'bg-amber-400/5' : ''}`}
                >
                  <div className={`text-[15px] ${flagged ? 'text-amber-200' : 'text-cream'}`}>
                    <NotesText text={m.label} icons={icons} />
                  </div>
                  <div className="text-right shrink-0 mt-1 sm:mt-0">
                    {who ? (
                      <>
                        <div className="text-[15px] font-bold text-teal-light">{who}</div>
                        <div className="text-[11px] text-silver/70">{whoSub}</div>
                      </>
                    ) : (
                      <span className="text-xs text-silver/40">{orphan ? 'owner removed' : 'everyone'}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {notes.length === 0 && <p className="text-sm text-silver/50 italic">No notes yet.</p>}
          </div>
        </Section>
      )}

      {/* ---- route / steps ---- */}
      {!only && (steps.length > 0 || maps.length > 0 || editing) && (
        <Section
          compact={compact}
          title="Route & strategy"
          right={
            <div className="flex items-center gap-2">
              {editing && (
                <>
                  <button className="btn btn-ghost text-xs" onClick={() => set({ steps: [...steps, { text: '' }] })}>+ step</button>
                  <button className="btn btn-ghost text-xs" onClick={() => set({ maps: [...maps, { name: '', image: null, pins: [], draw: [], imgSize: 'md' }] })}>+ map</button>
                </>
              )}
            </div>
          }
        >
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
                          <Field textarea value={s.text} placeholder="step…" className="flex-1 min-h-[42px]" onCommit={(v) => set({ steps: steps.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
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
                        <Field value={mp.name} placeholder="map name" className="w-56" onCommit={(v) => set({ maps: maps.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
                        <button className="px-1 text-danger/70 hover:text-danger ml-auto" onClick={() => set({ maps: maps.filter((_, j) => j !== i) })}>✕</button>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-cream">{mp.name || `Map ${i + 1}`}</span>
                    )}
                  </div>
                  <StrategyImage
                    seg={mp}
                    editing={editing}
                    onChange={(next) => set({ maps: maps.map((x, j) => (j === i ? next : x)) })}
                  />
                </div>
              ))}
          </div>
        </Section>
      )}

      {!only && !compact && ((plan?.gaps || []).length > 0 || editing) && (
        <Section
          compact={compact}
          title="Pending"
          right={editing && <button className="btn btn-ghost text-xs" onClick={() => set({ gaps: [...(plan?.gaps || []), ''] })}>+ item</button>}
        >
          {editing && (
            <p className="text-xs text-silver/60 mb-2">
              Anything still unresolved for this encounter: a missing player or class, something to test, a decision nobody made yet.
            </p>
          )}
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

    </div>
  )
}
