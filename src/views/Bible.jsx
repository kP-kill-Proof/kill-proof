import { useState } from 'react'
import { useData } from '../App.jsx'
import { fmtTime, parseTime } from '../lib/gw2.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'

export function SaveBar({ name }) {
  const ctx = useData()
  const { dirty, publish, exportJson, notify, ghConfigured } = ctx
  const data = ctx[name]
  if (!dirty[name]) return null
  return (
    <div className="flex items-center gap-2 flex-wrap bg-teal-deep/20 border border-teal/30 rounded-xl px-3 py-2 my-3">
      <span className="text-xs text-teal-light font-semibold mr-auto">Unpublished local changes</span>
      <button
        className="btn btn-primary !py-1 text-sm"
        onClick={() => (ghConfigured ? publish(name) : notify('Set up GitHub in Settings first', 'err'))}
      >
        Save to GitHub
      </button>
      <button className="btn btn-ghost !py-1 text-sm" onClick={() => exportJson(name, data)}>
        Export JSON
      </button>
    </div>
  )
}

function TimeCell({ boss, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  if (!editing)
    return (
      <button
        className={`font-bold tabular-nums px-2 py-0.5 rounded-lg transition-colors cursor-pointer hover:bg-teal-deep/40 ${
          boss.time == null ? 'text-danger/80' : 'text-cream'
        }`}
        title="Click to edit (m:ss)"
        onClick={() => {
          setVal(boss.time == null ? '' : fmtTime(boss.time))
          setEditing(true)
        }}
      >
        {boss.time == null ? 'pending' : fmtTime(boss.time)}
      </button>
    )
  return (
    <input
      autoFocus
      className="input !py-0.5 w-20 text-center"
      value={val}
      placeholder="m:ss"
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        onChange(parseTime(val))
        setEditing(false)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

const ROLES = ['Heal', 'Support', 'DPS']

function SlotEditor({ slot, onChange, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-ink/50 rounded-xl p-2">
      <select className="input !py-1 w-28" value={slot.role} onChange={(e) => onChange({ ...slot, role: e.target.value })}>
        {ROLES.map((r) => <option key={r}>{r}</option>)}
      </select>
      <input
        className="input !py-1 flex-1 min-w-40"
        placeholder="Builds (comma: Heal Chrono, Druid…)"
        defaultValue={(slot.builds || []).join(', ')}
        onChange={(e) => onChange({ ...slot, builds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
      />
      <input
        className="input !py-1 flex-1 min-w-40"
        placeholder="Notes — use {Stability} {Quickness} for icons"
        value={slot.notes || ''}
        onChange={(e) => onChange({ ...slot, notes: e.target.value })}
      />
      <button className="btn btn-danger !px-2.5 !py-1 text-xs" onClick={onRemove}>✕</button>
    </div>
  )
}

function BossPage({ wing, boss, onBack }) {
  const { wings, comps, icons, update } = useData()
  const knowledge = comps.bosses?.[boss.id] || { profile: { dmg: 'any', style: 'sustained' }, mechanics: [], strategy: '', slots: [] }
  const [editing, setEditing] = useState(false)

  const saveKnowledge = (patch) => {
    update('comps', { ...comps, bosses: { ...comps.bosses, [boss.id]: { ...knowledge, ...patch } } })
  }
  const setBoss = (patch) => {
    update('wings', {
      ...wings,
      wings: wings.wings.map((w) =>
        w.id !== wing.id ? w : { ...w, bosses: w.bosses.map((b) => (b.id === boss.id ? { ...b, ...patch } : b)) }
      ),
    })
  }

  const k = knowledge
  return (
    <div className="space-y-5">
      <button className="btn btn-ghost text-sm" onClick={onBack}>← {wing.short} · {wing.name}</button>
      <SaveBar name="comps" />
      <SaveBar name="wings" />

      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cream">{boss.name}</h1>
          <div className="text-sm text-silver/60 mt-1">{wing.name} · {boss.li > 0 ? `${boss.li} LI` : 'no LI'}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-silver/50 uppercase tracking-wider">kill time</div>
            <TimeCell boss={boss} onChange={(t) => setBoss({ time: t })} />
          </div>
          <button className="btn btn-ghost text-sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Done editing' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Damage profile</h2>
        {editing ? (
          <div className="flex gap-3">
            <select className="input" value={k.profile?.dmg || 'any'} onChange={(e) => saveKnowledge({ profile: { ...k.profile, dmg: e.target.value } })}>
              <option value="power">Power</option><option value="condi">Condi</option><option value="any">Any</option>
            </select>
            <select className="input" value={k.profile?.style || 'sustained'} onChange={(e) => saveKnowledge({ profile: { ...k.profile, style: e.target.value } })}>
              <option value="burst">Burst</option><option value="sustained">Sustained</option>
            </select>
          </div>
        ) : (
          <div className="flex gap-2">
            <span className="chip bg-teal-deep/40 text-teal-light uppercase">{k.profile?.dmg || 'any'}</span>
            <span className="chip bg-silver/10 text-silver uppercase">{k.profile?.style || 'sustained'}</span>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Mechanics to cover</h2>
        {editing ? (
          <div className="space-y-2">
            {(k.mechanics || []).map((m, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1 !py-1" value={m} onChange={(e) => saveKnowledge({ mechanics: k.mechanics.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button className="btn btn-danger !px-2.5 !py-1 text-xs" onClick={() => saveKnowledge({ mechanics: k.mechanics.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button className="btn btn-ghost !py-1 text-xs" onClick={() => saveKnowledge({ mechanics: [...(k.mechanics || []), ''] })}>+ Add mechanic</button>
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {(k.mechanics || []).map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-light shrink-0" />
                <NotesText text={m} icons={icons} />
              </li>
            ))}
            {(k.mechanics || []).length === 0 && <li className="text-silver/50">None documented yet.</li>}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Strategy</h2>
        {editing ? (
          <textarea className="input w-full min-h-20" value={k.strategy || ''} onChange={(e) => saveKnowledge({ strategy: e.target.value })} />
        ) : (
          <p className="text-sm"><NotesText text={k.strategy || '—'} icons={icons} /></p>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">
            Ideal comp <span className="text-silver/50 normal-case">(priority order, flexible squad size)</span>
          </h2>
          {editing && (
            <button className="btn btn-ghost !py-1 text-xs" onClick={() => saveKnowledge({ slots: [...(k.slots || []), { role: 'DPS', builds: [], notes: '' }] })}>
              + Add slot
            </button>
          )}
        </div>
        <div className="space-y-2">
          {(k.slots || []).map((s, i) =>
            editing ? (
              <SlotEditor
                key={i}
                slot={s}
                onChange={(ns) => saveKnowledge({ slots: k.slots.map((x, j) => (j === i ? ns : x)) })}
                onRemove={() => saveKnowledge({ slots: k.slots.filter((_, j) => j !== i) })}
              />
            ) : (
              <div key={i} className="flex flex-wrap items-center gap-3 bg-ink/50 rounded-xl px-3 py-2 text-sm">
                <span className="text-silver/40 font-bold w-4">{i + 1}</span>
                <span className={`chip ${s.role === 'Heal' ? 'bg-teal/25 text-teal-light' : s.role === 'Support' ? 'bg-cream/15 text-cream' : 'bg-silver/10 text-silver'}`}>{s.role}</span>
                <span className="font-semibold text-cream">
                  {(s.builds || []).map((b, j) => (
                    <BuildChip key={j} name={b} icons={icons} className={j > 0 ? 'ml-2' : ''} />
                  ))}
                </span>
                <span className="text-silver/70 ml-auto"><NotesText text={s.notes} icons={icons} /></span>
              </div>
            )
          )}
          {(k.slots || []).length === 0 && <p className="text-sm text-silver/50">No comp defined yet — hit Edit to add slots, or extra players default to DPS matching the damage profile.</p>}
        </div>
      </div>
    </div>
  )
}

export default function Bible() {
  const { wings, comps, icons } = useData()
  const [nav, setNav] = useState({ section: 'raid', wingId: null, bossId: null })

  const sections = [
    { id: 'raid', label: 'Raids' },
    { id: 'strike', label: 'Strikes' },
  ]
  const sectionWings = wings.wings.filter((w) => w.type === nav.section)
  const wing = wings.wings.find((w) => w.id === nav.wingId)
  const boss = wing?.bosses.find((b) => b.id === nav.bossId)

  if (wing && boss) {
    return <BossPage wing={wing} boss={boss} onBack={() => setNav({ ...nav, bossId: null })} />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">The Bible</h1>
        <p className="text-sm text-silver/60">
          The team's knowledge base: times, damage profiles, mechanics and ideal comps per boss.
          Today's Sale follows these recommendations.
        </p>
      </div>

      <SaveBar name="wings" />
      <SaveBar name="comps" />

      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`tab-btn ${nav.section === s.id && !nav.wingId ? 'tab-active' : 'tab-idle'} border border-teal-deep/40`}
            onClick={() => setNav({ section: s.id, wingId: null, bossId: null })}
          >
            {s.label}
          </button>
        ))}
        {wing && <span className="tab-btn tab-active border border-teal-deep/40">{wing.short}</span>}
      </div>

      {!wing ? (
        <div className="grid md:grid-cols-2 gap-4">
          {sectionWings.map((w, i) => {
            const total = w.bosses.reduce((s, b) => s + (b.time ?? 0), 0)
            const pending = w.bosses.filter((b) => b.time == null).length
            return (
              <button
                key={w.id}
                className="card p-5 text-left hover:scale-[1.01] cursor-pointer anim-in"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setNav({ ...nav, wingId: w.id })}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-cream text-lg"><span className="text-teal-light mr-2">{w.short}</span>{w.name}</h3>
                  <span className="text-teal-light text-xl">→</span>
                </div>
                <div className="text-sm text-silver/60 mt-2">
                  {w.bosses.length} encounters · known total {fmtTime(total)}
                  {pending > 0 && <span className="text-danger/80"> · {pending} pending times</span>}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {wing.bosses.map((b, i) => {
            const k = comps.bosses?.[b.id]
            return (
              <button
                key={b.id}
                className="card w-full px-4 py-3 flex items-center gap-4 text-left hover:scale-[1.005] cursor-pointer anim-in"
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => setNav({ ...nav, bossId: b.id })}
              >
                <span className="text-silver/40 font-bold w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="font-bold text-cream">{b.name}</div>
                  <div className="text-xs text-silver/50 mt-0.5 flex gap-2">
                    {k?.profile && <span className="uppercase text-teal-light/80">{k.profile.dmg} · {k.profile.style}</span>}
                    {(k?.slots || []).length > 0 && <span>{k.slots.length} comp slots</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold tabular-nums ${b.time == null ? 'text-danger/80' : 'text-cream'}`}>{b.time == null ? 'pending' : fmtTime(b.time)}</div>
                  <div className="text-xs text-teal-light">{b.li > 0 ? `${b.li} LI` : '—'}</div>
                </div>
                <span className="text-teal-light">→</span>
              </button>
            )
          })}
          <button className="btn btn-ghost text-sm mt-2" onClick={() => setNav({ ...nav, wingId: null })}>← All {nav.section === 'raid' ? 'raids' : 'strikes'}</button>
        </div>
      )}
    </div>
  )
}
