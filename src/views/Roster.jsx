import { useState } from 'react'
import { useData } from '../App.jsx'
import { SaveBar } from './Bible.jsx'

const ROLES = ['Healer', 'Support DPS', 'DPS', 'Tank', 'Flex']
const LEVELS = ['S', 'A', 'B', 'C']
const LEVEL_STYLE = {
  S: 'bg-cream/90 text-ink border-cream',
  A: 'bg-teal-light/25 text-teal-light border-teal-light/50',
  B: 'bg-teal-deep/40 text-silver border-teal-deep/60',
  C: 'bg-silver/10 text-silver/60 border-silver/30',
}

function ClassRow({ row, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        className="input flex-1 !py-1.5"
        placeholder="Class/spec (e.g. Druid, Firebrand…)"
        value={row.name}
        onChange={(e) => onChange({ ...row, name: e.target.value })}
      />
      <select
        className="input !py-1.5 w-36"
        value={row.role}
        onChange={(e) => onChange({ ...row, role: e.target.value })}
      >
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <select
        className="input !py-1.5 w-20"
        value={row.level}
        onChange={(e) => onChange({ ...row, level: e.target.value })}
        title="Skill level on this class"
      >
        {LEVELS.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <button className="btn btn-danger !px-2.5 !py-1 text-xs shrink-0" onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}

function PlayerForm({ initial, onSave, onCancel }) {
  const [p, setP] = useState(
    initial || { id: '', name: '', mainRole: 'DPS', classes: [], mechanics: [], notes: '' }
  )
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))
  const csv = (v) => v.split(',').map((s) => s.trim()).filter(Boolean)

  const setClass = (i, row) => set('classes', p.classes.map((c, j) => (j === i ? row : c)))
  const addClass = () => set('classes', [...p.classes, { name: '', role: 'DPS', level: 'A' }])
  const removeClass = (i) => set('classes', p.classes.filter((_, j) => j !== i))

  return (
    <div className="card p-5 border-teal/50 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-silver/60 font-semibold">Name</span>
          <input className="input w-full mt-1" placeholder="Player name" value={p.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="text-silver/60 font-semibold">Main role</span>
          <select className="input w-full mt-1" value={p.mainRole} onChange={(e) => set('mainRole', e.target.value)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-silver/60 font-semibold">Classes played</span>
          <button className="btn btn-ghost !py-1 text-xs" onClick={addClass}>
            + Add class
          </button>
        </div>
        <div className="space-y-2">
          {p.classes.map((c, i) => (
            <ClassRow key={i} row={c} onChange={(row) => setClass(i, row)} onRemove={() => removeClass(i)} />
          ))}
          {p.classes.length === 0 && (
            <p className="text-xs text-silver/50">No classes yet — add the specs this player performs best on.</p>
          )}
        </div>
      </div>

      <label className="text-sm block">
        <span className="text-silver/60 font-semibold">Strong mechanics (comma separated)</span>
        <input
          className="input w-full mt-1"
          placeholder="kiting, tanking, greens…"
          defaultValue={(p.mechanics || []).join(', ')}
          onChange={(e) => set('mechanics', csv(e.target.value))}
        />
      </label>
      <label className="text-sm block">
        <span className="text-silver/60 font-semibold">Notes</span>
        <input className="input w-full mt-1" placeholder="Availability, preferences…" value={p.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      </label>

      <div className="flex gap-2 justify-end">
        <button className="btn btn-ghost text-sm" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary text-sm"
          onClick={() => {
            if (!p.name.trim()) return
            onSave({
              ...p,
              classes: p.classes.filter((c) => c.name.trim()),
              id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            })
          }}
        >
          Save member
        </button>
      </div>
    </div>
  )
}

export default function Roster() {
  const { players, update } = useData()
  const [editing, setEditing] = useState(null) // null | 'new' | player.id

  const save = (p) => {
    const list = players.players.some((x) => x.id === p.id)
      ? players.players.map((x) => (x.id === p.id ? p : x))
      : [...players.players, p]
    update('players', { ...players, players: list })
    setEditing(null)
  }
  const remove = (id) =>
    update('players', { ...players, players: players.players.filter((p) => p.id !== id) })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-cream mb-1">Roster</h1>
          <p className="text-sm text-silver/60">
            Squad members: classes they play, roles and skill level. Comp generation will use this
            to put everyone where they perform best.
          </p>
        </div>
        <button className="btn btn-primary text-sm" onClick={() => setEditing('new')}>
          + Add member
        </button>
      </div>

      <SaveBar name="players" />

      {editing === 'new' && <PlayerForm onSave={save} onCancel={() => setEditing(null)} />}

      <div className="grid md:grid-cols-2 gap-4">
        {players.players.map((p, i) =>
          editing === p.id ? (
            <PlayerForm key={p.id} initial={p} onSave={save} onCancel={() => setEditing(null)} />
          ) : (
            <div key={p.id} className="card p-5 anim-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-cream text-lg">{p.name}</div>
                  <span className="chip bg-teal-deep/40 text-teal-light mt-1">{p.mainRole}</span>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditing(p.id)}>
                    Edit
                  </button>
                  <button className="btn btn-danger !px-2.5 !py-1 text-xs" onClick={() => remove(p.id)}>
                    ✕
                  </button>
                </div>
              </div>

              {(p.classes || []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {p.classes.map((c, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <span className={`chip border ${LEVEL_STYLE[c.level] || LEVEL_STYLE.B}`}>{c.level}</span>
                      <span className="text-cream font-semibold">{c.name}</span>
                      <span className="text-silver/50 text-xs">{c.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {(p.mechanics || []).length > 0 && (
                <p className="text-sm mt-3">
                  <span className="text-silver/50">Mechanics:</span> {p.mechanics.join(', ')}
                </p>
              )}
              {p.notes && <p className="text-xs text-silver/50 mt-1.5">{p.notes}</p>}
            </div>
          )
        )}
      </div>
    </div>
  )
}
