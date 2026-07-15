import { useState } from 'react'
import { useData } from '../App.jsx'
import { fmtTime, parseTime } from '../lib/gw2.js'

function SaveBar({ name }) {
  const { dirty, publish, exportJson, notify, ghConfigured } = useData()
  const data = useData()[name]
  if (!dirty[name]) return null
  return (
    <div className="flex items-center gap-2 flex-wrap bg-teal-deep/20 border border-teal/30 rounded-xl px-3 py-2 my-3">
      <span className="text-xs text-teal-light font-semibold mr-auto">
        Cambios locales sin publicar
      </span>
      <button
        className="btn btn-primary !py-1 text-sm"
        onClick={() =>
          ghConfigured ? publish(name) : notify('Configura GitHub en Ajustes primero', 'err')
        }
      >
        Guardar en GitHub
      </button>
      <button className="btn btn-ghost !py-1 text-sm" onClick={() => exportJson(name, data)}>
        Exportar JSON
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
        title="Click para editar (formato m:ss)"
        onClick={() => {
          setVal(boss.time == null ? '' : fmtTime(boss.time))
          setEditing(true)
        }}
      >
        {boss.time == null ? 'pendiente' : fmtTime(boss.time)}
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

function PlayerForm({ initial, onSave, onCancel }) {
  const [p, setP] = useState(
    initial || { id: '', name: '', mainRole: 'DPS', roles: [], bestClasses: [], mechanics: [], notes: '' }
  )
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))
  const csv = (v) => v.split(',').map((s) => s.trim()).filter(Boolean)
  return (
    <div className="card p-4 border-teal/50 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Nombre" value={p.name} onChange={(e) => set('name', e.target.value)} />
        <select className="input" value={p.mainRole} onChange={(e) => set('mainRole', e.target.value)}>
          {['Healer', 'Support DPS', 'DPS', 'Tank', 'Flex'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Mejores clases (coma: Druid, Firebrand…)"
          defaultValue={(p.bestClasses || []).join(', ')}
          onChange={(e) => set('bestClasses', csv(e.target.value))}
        />
        <input
          className="input"
          placeholder="Mecánicas fuertes (coma: kiting, tanking…)"
          defaultValue={(p.mechanics || []).join(', ')}
          onChange={(e) => set('mechanics', csv(e.target.value))}
        />
      </div>
      <input className="input w-full" placeholder="Notas" value={p.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      <div className="flex gap-2 justify-end">
        <button className="btn btn-ghost text-sm" onClick={onCancel}>Cancelar</button>
        <button
          className="btn btn-primary text-sm"
          onClick={() => {
            if (!p.name.trim()) return
            onSave({ ...p, id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') })
          }}
        >
          Guardar jugador
        </button>
      </div>
    </div>
  )
}

export default function Biblia() {
  const { wings, players, update } = useData()
  const [editingPlayer, setEditingPlayer] = useState(null) // null | 'new' | player.id

  const setBoss = (wingId, bossId, patch) => {
    const next = {
      ...wings,
      wings: wings.wings.map((w) =>
        w.id !== wingId
          ? w
          : { ...w, bosses: w.bosses.map((b) => (b.id === bossId ? { ...b, ...patch } : b)) }
      ),
    }
    update('wings', next)
  }

  const savePlayer = (p) => {
    const list = players.players.some((x) => x.id === p.id)
      ? players.players.map((x) => (x.id === p.id ? p : x))
      : [...players.players, p]
    update('players', { ...players, players: list })
    setEditingPlayer(null)
  }
  const deletePlayer = (id) =>
    update('players', { ...players, players: players.players.filter((p) => p.id !== id) })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">La Biblia</h1>
        <p className="text-sm text-silver/60">
          Baseline del equipo. Click en cualquier tiempo para editarlo. Los cambios se publican con
          el botón "Guardar en GitHub".
        </p>
      </div>

      {/* WINGS */}
      <section>
        <SaveBar name="wings" />
        <div className="grid md:grid-cols-2 gap-4">
          {wings.wings.map((w, wi) => {
            const total = w.bosses.reduce((s, b) => s + (b.time ?? 0), 0)
            return (
              <div key={w.id} className="card p-4 anim-in" style={{ animationDelay: `${wi * 0.04}s` }}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-cream">
                    <span className="text-teal-light mr-2">{w.short}</span>
                    {w.name}
                  </h3>
                  <span className={`chip ${w.type === 'raid' ? 'bg-teal-deep/40 text-teal-light' : 'bg-silver/10 text-silver/70'}`}>
                    {w.type}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {w.bosses.map((b) => (
                      <tr key={b.id} className="border-b border-teal-deep/15 last:border-0">
                        <td className="py-1.5">{b.name}</td>
                        <td className="py-1.5 text-center w-16 text-xs text-silver/50">
                          {b.li > 0 ? `${b.li} LI` : '—'}
                        </td>
                        <td className="py-1.5 text-right w-24">
                          <TimeCell boss={b} onChange={(t) => setBoss(w.id, b.id, { time: t })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-xs text-silver/50 mt-2">
                  total conocido <span className="text-cream font-bold">{fmtTime(total)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* JUGADORES */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl text-cream">Roster</h2>
          <button className="btn btn-primary text-sm" onClick={() => setEditingPlayer('new')}>
            + Agregar jugador
          </button>
        </div>
        <SaveBar name="players" />
        {editingPlayer === 'new' && (
          <div className="mb-4">
            <PlayerForm onSave={savePlayer} onCancel={() => setEditingPlayer(null)} />
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {players.players.map((p) =>
            editingPlayer === p.id ? (
              <PlayerForm key={p.id} initial={p} onSave={savePlayer} onCancel={() => setEditingPlayer(null)} />
            ) : (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-cream text-lg">{p.name}</div>
                    <span className="chip bg-teal-deep/40 text-teal-light mt-1">{p.mainRole}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditingPlayer(p.id)}>
                      Editar
                    </button>
                    <button className="btn btn-danger !px-2.5 !py-1 text-xs" onClick={() => deletePlayer(p.id)}>
                      ✕
                    </button>
                  </div>
                </div>
                {(p.bestClasses || []).length > 0 && (
                  <p className="text-sm mt-2">
                    <span className="text-silver/50">Clases:</span> {p.bestClasses.join(', ')}
                  </p>
                )}
                {(p.mechanics || []).length > 0 && (
                  <p className="text-sm">
                    <span className="text-silver/50">Mecánicas:</span> {p.mechanics.join(', ')}
                  </p>
                )}
                {p.notes && <p className="text-xs text-silver/50 mt-1.5">{p.notes}</p>}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}
