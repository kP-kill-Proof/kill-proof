import { useEffect, useMemo, useState } from 'react'
import { useData, useNav } from '../App.jsx'
import { BuildChip, NotesText, resolveBuildIcon } from '../lib/icons.jsx'
import { ROLES, ROLE_STYLE, RoleChip, Field, TimeField, BuildCombo, selCls } from '../lib/ui.jsx'
import { StrategyImage } from '../lib/mapedit.jsx'
import { fetchHistory, saveShared, syncEnabled } from '../lib/sync.js'
import HistoryPanel from '../lib/history.jsx'

const LS_KEY = 'kp_infallible_plan_v1'

const fmt = (s) => {
  if (s == null || isNaN(s)) return '—'
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
const parseT = (str) => {
  if (!str) return null
  const m = String(str).trim().match(/^(\d+):(\d{1,2})$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  const n = parseInt(str)
  return isNaN(n) ? null : n
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveOverrides(ov) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ov)); return true } catch { return false }
}

const KIND_STYLE = {
  boss: 'bg-danger/15 text-danger border-danger/40',
  event: 'bg-teal/10 text-teal-light border-teal/40',
  transition: 'bg-silver/10 text-silver border-silver/30',
}
const STATUS_STYLE = {
  planning: { label: 'Planning', cls: 'bg-silver/10 text-silver border-silver/30' },
  practicing: { label: 'Practicing', cls: 'bg-teal/15 text-teal-light border-teal/40' },
  done: { label: 'DONE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
}
function emptyComp() {
  const mk = (sub) => [
    { sub, role: 'Heal', build: '', player: '', note: '' },
    { sub, role: 'Support', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
  ]
  return [...mk(1), ...mk(2)]
}

function Rules({ overview }) {
  return (
    <div className="card p-5">
      <div className="font-display text-xl text-cream mb-1">What is Infallible?</div>
      <p className="text-sm text-silver mb-3">{overview.description}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {overview.rules.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm bg-ink/40 border border-teal-deep/25 rounded-xl px-3 py-2">
            <span className="text-teal-light mt-0.5">◆</span>
            <span className="text-cream/90">{r}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-silver/70">{overview.source}</div>
    </div>
  )
}

function WingCard({ w, edited, onOpen }) {
  const fights = w.segments.filter((s) => s.kind === 'boss').length
  const status = STATUS_STYLE[w.status] || STATUS_STYLE.planning
  return (
    <button onClick={onOpen} className="card p-5 text-left hover:border-teal/60 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl text-teal-light">{w.short}</span>
          <span className="font-semibold text-cream group-hover:text-teal-light transition-colors">{w.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {edited && (
            <span className="px-2 py-0.5 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10px] uppercase tracking-wider">
              Edited
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm mb-2">
        <div>
          <span className="text-silver">Time limit </span>
          <span className="font-display text-lg text-cream">{fmt(w.timeLimit)}</span>
        </div>
        <div className="text-silver">
          {fights} fight{fights !== 1 ? 's' : ''}
          {w.cms.length > 0 && <span className="text-danger"> · {w.cms.length} CM{w.cms.length > 1 ? 's' : ''}</span>}
        </div>
      </div>
      {w.cms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {w.cms.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-[11px]">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-silver/80">{w.timerTrigger}</div>
    </button>
  )
}

function CompEditorRow({ slot, editing, builds, players, icons, onChange }) {
  if (!editing) {
    const isEmpty = !slot.build && !slot.player
    return (
      <div className="text-sm py-1">
        <div className="flex items-center gap-2 min-h-[30px]">
          <RoleChip role={slot.role} />
          {slot.player && <span className="font-semibold text-cream shrink-0">{slot.player.split('|')[0].trim()}</span>}
          {slot.build ? (
            <BuildChip name={slot.build} icons={icons} className="text-cream/90" />
          ) : (
            isEmpty && <span className="text-silver/50 italic">open slot</span>
          )}
        </div>
        {slot.note && <div className="mt-0.5 ml-[5rem] text-xs text-silver leading-snug">{slot.note}</div>}
      </div>
    )
  }
  const cycleRole = () => {
    const next = ROLES[(ROLES.indexOf(slot.role) + 1) % ROLES.length]
    onChange({ ...slot, role: next })
  }
  return (
    <div className="rounded-xl border border-teal-deep/20 bg-ink/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <RoleChip role={slot.role} onClick={cycleRole} />
        <Field
          value={slot.player}
          placeholder="player"
          list="kp-roster-names"
          className="w-32 shrink-0"
          onCommit={(v) => onChange({ ...slot, player: v })}
        />
        <datalist id="kp-roster-names">
          {players.map((p) => (
            <option key={p.id} value={p.name.split('|')[0].trim()} />
          ))}
        </datalist>
        {slot.build && resolveBuildIcon(slot.build, icons) && (
          <img src={resolveBuildIcon(slot.build, icons)} alt="" className="w-9 h-9 rounded-md shrink-0" />
        )}
        <BuildCombo value={slot.build} builds={builds} icons={icons} onCommit={(v) => onChange({ ...slot, build: v })} />
      </div>
      <Field
        value={slot.note}
        placeholder="note — duty, gear, sigils, mechanics…"
        className="w-full"
        onCommit={(v) => onChange({ ...slot, note: v })}
      />
    </div>
  )
}

function SegmentBlock({ seg, i, count, left, editing, icons, comp, open, onToggle, onChange, onMove, onDelete }) {
  const [armDel, setArmDel] = useState(false)
  return (
    <div>
      <div
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
          open ? 'bg-teal-deep/20 border-teal/50' : 'bg-ink/40 border-teal-deep/25 hover:border-teal/40'
        }`}
      >
        {editing ? (
          <select className={selCls} value={seg.kind} onChange={(e) => onChange({ ...seg, kind: e.target.value })}>
            <option value="boss">boss</option>
            <option value="event">event</option>
            <option value="transition">transition</option>
          </select>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider shrink-0 ${KIND_STYLE[seg.kind] || KIND_STYLE.event}`}
          >
            {seg.kind}
          </span>
        )}
        {editing ? (
          <Field value={seg.name} className="flex-1 font-semibold" onCommit={(v) => onChange({ ...seg, name: v })} />
        ) : (
          <button className="font-semibold text-cream flex-1 text-left" onClick={onToggle}>
            {seg.name}
          </button>
        )}
        <span className="text-sm text-silver shrink-0 flex items-center gap-1">
          max{' '}
          {editing ? (
            <TimeField seconds={seg.target} onCommit={(v) => onChange({ ...seg, target: v })} />
          ) : (
            <span className="font-display text-base text-cream">{fmt(seg.target)}</span>
          )}
        </span>
        <span className="text-sm shrink-0 w-20 text-right">
          <span className="text-silver">left </span>
          <span className={`font-display text-base ${left != null && left < 0 ? 'text-danger' : 'text-teal-light'}`}>
            {left == null ? '—' : fmt(Math.max(left, 0))}
          </span>
        </span>
        {editing && (
          <span className="flex items-center gap-0.5 shrink-0">
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === count - 1} onClick={() => onMove(1)}>↓</button>
            <button
              className={`px-1 rounded ${armDel ? 'bg-danger/20 text-danger font-bold' : 'text-danger/70 hover:text-danger'}`}
              title={armDel ? 'Click again to delete this segment' : 'Delete segment'}
              onClick={() => {
                if (!armDel) {
                  setArmDel(true)
                  setTimeout(() => setArmDel(false), 3000)
                  return
                }
                onDelete()
              }}
            >
              {armDel ? 'Sure?' : '✕'}
            </button>
          </span>
        )}
        <button className="text-silver/60 px-1" onClick={onToggle} title={editing ? 'Open to edit strategy, map & notes' : ''}>
          {open ? '▾' : '▸'}
        </button>
      </div>
      {open && (
        <div className="mt-1.5 ml-2 bg-ink/50 border border-teal-deep/25 rounded-xl p-4 space-y-3">
          <StrategyImage seg={seg} editing={editing} onChange={onChange} />
          {editing ? (
            <Field
              textarea
              value={seg.strategy}
              placeholder="Strategy notes for this segment… (you can use {Quickness} {Poison} icon tokens)"
              className="w-full min-h-[70px]"
              onCommit={(v) => onChange({ ...seg, strategy: v })}
            />
          ) : (
            seg.strategy && (
              <div className="text-sm text-cream/90 leading-relaxed">
                <NotesText text={seg.strategy} icons={icons} />
              </div>
            )
          )}
          {!editing && seg.duties?.length > 0 && (
            <div className="space-y-1">
              {seg.duties.map((d, j) => {
                const slot = comp?.[d.slot]
                return (
                  <div key={j} className="flex items-center gap-2 text-sm">
                    {slot && <RoleChip role={slot.role} />}
                    {slot?.build && <BuildChip name={slot.build} icons={icons} className="text-cream/90" />}
                    <span className="text-silver">→ {d.duty}</span>
                  </div>
                )
              })}
            </div>
          )}
          {!editing && !seg.strategy && !seg.image && !(seg.duties?.length > 0) && (
            <div className="text-sm text-silver/70 italic">Strategy not written yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

function WingDetail({ pub, inf, override, icons, builds, players, onBack, onSaveOverride, onClearOverride }) {
  const { setDoc } = useNav()
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(null)
  const [armReset, setArmReset] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { syncEnabled().then(setCanShare) }, [])
  const [importMsg, setImportMsg] = useState(null)
  const w = override || pub

  const update = (patch) => {
    const next = { ...w, ...patch }
    if (!saveOverridesFor(pub.id, next)) {
      setSaveError(true)
      return
    }
    setSaveError(false)
    onSaveOverride(pub.id, next)
  }
  // saved via parent; helper checks quota
  function saveOverridesFor(id, wing) {
    const all = loadOverrides()
    all[id] = wing
    return saveOverrides(all)
  }

  const clearWing = () => {
    update({
      status: 'planning',
      comp: emptyComp(),
      segments: [],
      notes: '',
      timeLimit: w.timeLimit,
    })
  }

  const startEditing = () => {
    if (!override) {
      const seeded = { ...pub, comp: pub.comp?.length === 10 ? pub.comp : emptyComp() }
      update(seeded)
    } else if (!(w.comp?.length === 10)) {
      update({ comp: emptyComp() })
    }
    setEditing(true)
  }

  const setSeg = (idx, seg) => update({ segments: w.segments.map((s, j) => (j === idx ? seg : s)) })
  const moveSeg = (idx, dir) => {
    const segs = [...w.segments]
    const [x] = segs.splice(idx, 1)
    segs.splice(idx + dir, 0, x)
    update({ segments: segs })
  }
  const delSeg = (idx) => update({ segments: w.segments.filter((_, j) => j !== idx) })
  const addSeg = () =>
    update({
      segments: [
        ...w.segments,
        { id: `seg_${Date.now()}`, name: 'New segment', kind: 'event', target: null, image: null, strategy: '', pins: [], duties: [] },
      ],
    })

  const exportPlan = () => {
    const all = loadOverrides()
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), wings: all }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kp-infallible-plan.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const targets = w.segments.map((s) => s.target)
  const allKnown = targets.length > 0 && targets.every((t) => t != null)
  const planned = targets.reduce((a, t) => a + (t || 0), 0)
  let remaining = w.timeLimit
  const status = STATUS_STYLE[w.status] || STATUS_STYLE.planning
  const comp = w.comp?.length === 10 ? w.comp : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn btn-ghost text-sm" onClick={onBack}>
          ← All wings
        </button>
        <div className="flex items-center gap-2">
          <label className="btn btn-ghost text-xs cursor-pointer" title="Load a plan file exported by a teammate — it becomes your local plan">
            ⬆ Import plan
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const data = JSON.parse(reader.result)
                    const wings = data.wings || {}
                    const ids = Object.keys(wings)
                    if (!ids.length) throw new Error('no wings')
                    const all = loadOverrides()
                    ids.forEach((id) => (all[id] = wings[id]))
                    if (!saveOverrides(all)) throw new Error('storage full')
                    onSaveOverride()
                    setImportMsg({ ok: true, text: `Imported plan for ${ids.map((i) => i.toUpperCase()).join(', ')} — now your local plan on this device.` })
                  } catch (err) {
                    setImportMsg({ ok: false, text: `Could not import that file${String(err.message).includes('storage') ? ' — browser storage is full (use smaller map images)' : ' — it does not look like a KP Infallible plan export'}.` })
                  }
                  setTimeout(() => setImportMsg(null), 8000)
                }
                reader.readAsText(file)
              }}
            />
          </label>
          {override && (
            <>
              <button className="btn btn-ghost text-xs" onClick={exportPlan} title="Download this plan as a file">
                ⬇ Export plan
              </button>
              <button
                className={`btn text-xs ${armReset ? 'bg-danger/20 border border-danger text-danger font-semibold' : 'btn-ghost'}`}
                onClick={() => {
                  if (!armReset) {
                    setArmReset(true)
                    setTimeout(() => setArmReset(false), 3500)
                    return
                  }
                  setArmReset(false)
                  clearWing()
                }}
              >
                {armReset ? 'Sure? This wipes the whole plan' : '⌫ Clear plan'}
              </button>
            </>
          )}
          {canShare && (
            <button className="btn btn-ghost text-xs" onClick={() => setShowHistory(!showHistory)} title="Saved versions">
              ⟲ History
            </button>
          )}
          {canShare && (
            <button
              className="btn btn-primary text-xs"
              disabled={saving}
              title="Save this wing for everyone — they see it when they reload"
              onClick={async () => {
                setSaving(true)
                try {
                  const doc = JSON.parse(JSON.stringify(inf))
                  doc.wings = (doc.wings || []).map((x) => (x.id === pub.id ? w : x))

                  const size = JSON.stringify(doc).length
                  const hist = await fetchHistory('infallible')
                  if (hist[0] && size < hist[0].bytes * 0.6) {
                    const ok = window.confirm(
                      `This would replace the squad plans with a much smaller file (${Math.round(size / 1024)} KB vs ${Math.round(hist[0].bytes / 1024)} KB). Save anyway?`
                    )
                    if (!ok) {
                      setSaving(false)
                      return
                    }
                  }

                  await saveShared('infallible', doc)
                  setDoc('infallible', doc) // screen keeps showing what we just saved
                  onClearOverride(pub.id)
                  setEditing(false)
                } catch (e) {
                  alert(String(e.message || e))
                }
                setSaving(false)
              }}
            >
              {saving ? 'Saving…' : '☁ Save to squad'}
            </button>
          )}
          <button className={`btn text-sm ${editing ? 'btn-primary' : 'btn-ghost'}`} onClick={() => (editing ? setEditing(false) : startEditing())}>
            {editing ? '✓ Done editing' : '✎ Edit plan'}
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`text-xs px-3 py-2 rounded-xl border ${importMsg.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-danger/40 bg-danger/10 text-danger'}`}>
          {importMsg.text}
        </div>
      )}
      {showHistory && (
        <HistoryPanel
          docKey="infallible"
          onClose={() => setShowHistory(false)}
          onRestored={(doc) => {
            setDoc('infallible', doc)
            onClearOverride(pub.id)
            setShowHistory(false)
            setEditing(false)
          }}
        />
      )}
      {saveError && (
        <div className="text-xs px-3 py-2 rounded-xl border border-danger/40 bg-danger/10 text-danger">
          Could not save the last change — the image is too large for browser storage. Use a smaller screenshot (or remove the image), then try again.
        </div>
      )}
      {override && (
        <div className="text-xs px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200">
          This plan has local edits saved on <b>this device only</b>. Use <b>Export plan</b> and send the file to publish it for the whole squad.
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-teal-light">{w.short}</span>
            <span className="font-display text-2xl text-cream">{w.name}</span>
            {editing ? (
              <select className={selCls} value={w.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="planning">Planning</option>
                <option value="practicing">Practicing</option>
                <option value="done">Done</option>
              </select>
            ) : (
              <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${status.cls}`}>
                {status.label}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-silver">Time limit</div>
            <div className="font-display text-3xl text-cream">{fmt(w.timeLimit)}</div>
          </div>
        </div>
        <div className="text-sm text-silver mb-2">⏱ {w.timerTrigger}</div>
        {w.cms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {w.cms.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs">
                {c} required
              </span>
            ))}
          </div>
        )}
        {allKnown && (
          <div className="mt-3 text-sm">
            <span className="text-silver">Planned total </span>
            <span className="font-semibold text-cream">{fmt(planned)}</span>
            <span className={planned <= w.timeLimit ? 'text-emerald-300' : 'text-danger'}>
              {' '}
              ({planned <= w.timeLimit ? `${fmt(w.timeLimit - planned)} slack` : `${fmt(planned - w.timeLimit)} OVER`})
            </span>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="font-display text-xl text-cream mb-3">Squad comp</div>
        {comp ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2].map((g) => (
              <div key={g} className="bg-ink/40 border border-teal-deep/25 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wider text-teal-light/80 mb-2">Subgroup {g}</div>
                <div className="space-y-2">
                  {comp.map((c, i) =>
                    c.sub === g ? (
                      <CompEditorRow
                        key={i}
                        slot={c}
                        editing={editing}
                        builds={builds}
                        players={players}
                        icons={icons}
                        onChange={(slot) => update({ comp: comp.map((x, j) => (j === i ? slot : x)) })}
                      />
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-silver/70 italic">
            Comp not defined yet — hit <b>Edit plan</b> to build it (role, class and player per slot).
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-xl text-cream">Plan — target maximums</div>
          {editing && (
            <button className="btn btn-ghost text-xs" onClick={addSeg}>
              + Add segment
            </button>
          )}
        </div>
        <div className="text-xs text-silver mb-3">
          Budget per segment. "Left" = time remaining on the wing clock if every target is hit.
          {editing ? ' Open a segment (▸) to edit its strategy, map and markers.' : ' Click a segment for strategy, map and duties.'}
        </div>
        <div className="space-y-1.5">
          {w.segments.map((seg, i) => {
            if (seg.target != null && remaining != null) remaining -= seg.target
            const left = seg.target != null && remaining != null ? remaining : null
            if (seg.target == null) remaining = null
            return (
              <SegmentBlock
                key={seg.id || i}
                seg={seg}
                i={i}
                count={w.segments.length}
                left={left}
                editing={editing}
                icons={icons}
                comp={comp}
                open={open === (seg.id || i)}
                onToggle={() => setOpen(open === (seg.id || i) ? null : seg.id || i)}
                onChange={(s) => setSeg(i, s)}
                onMove={(dir) => moveSeg(i, dir)}
                onDelete={() => delSeg(i)}
              />
            )
          })}
        </div>
        {editing ? (
          <Field textarea value={w.notes} placeholder="Wing notes…" className="w-full mt-3" onCommit={(v) => update({ notes: v })} />
        ) : (
          w.notes && <div className="mt-3 text-xs text-silver italic">{w.notes}</div>
        )}
      </div>
    </div>
  )
}

export default function Infallible() {
  const data = useData()
  const [wingId, setWingId] = useState(null)
  const [ovVersion, setOvVersion] = useState(0)
  const inf = data?.infallible
  const overrides = useMemo(() => loadOverrides(), [ovVersion])
  if (!inf) return <div className="card p-10 text-center">No Infallible data.</div>

  const saveOv = () => setOvVersion((v) => v + 1)
  const clearOv = (id) => {
    const all = loadOverrides()
    delete all[id]
    saveOverrides(all)
    setOvVersion((v) => v + 1)
  }

  const pub = inf.wings.find((w) => w.id === wingId)
  if (pub)
    return (
      <WingDetail
        pub={pub}
        inf={inf}
        override={overrides[pub.id] || null}
        icons={data.icons}
        builds={data.builds?.builds || []}
        players={data.players?.players || []}
        onBack={() => setWingId(null)}
        onSaveOverride={saveOv}
        onClearOverride={clearOv}
      />
    )

  return (
    <div className="space-y-4">
      <Rules overview={inf.overview} />
      <div className="grid md:grid-cols-2 gap-4">
        {inf.wings.map((w) => (
          <WingCard key={w.id} w={overrides[w.id] || w} edited={!!overrides[w.id]} onOpen={() => setWingId(w.id)} />
        ))}
      </div>
    </div>
  )
}
