import { useState } from 'react'
import { useData } from '../App.jsx'

function EventForm({ initial, onSave, onCancel }) {
  const [e, setE] = useState(initial || { id: '', name: '', description: '', notes: '' })
  const set = (k, v) => setE((x) => ({ ...x, [k]: v }))
  return (
    <div className="card p-4 border-teal/50 space-y-3">
      <input className="input w-full" placeholder="Nombre del evento (ej. Fractal CMs)" value={e.name} onChange={(ev) => set('name', ev.target.value)} />
      <input className="input w-full" placeholder="Descripción" value={e.description} onChange={(ev) => set('description', ev.target.value)} />
      <input className="input w-full" placeholder="Notas (precio, requisitos, coordinación…)" value={e.notes} onChange={(ev) => set('notes', ev.target.value)} />
      <div className="flex gap-2 justify-end">
        <button className="btn btn-ghost text-sm" onClick={onCancel}>Cancelar</button>
        <button
          className="btn btn-primary text-sm"
          onClick={() => {
            if (!e.name.trim()) return
            onSave({ ...e, id: e.id || e.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') })
          }}
        >
          Guardar evento
        </button>
      </div>
    </div>
  )
}

export default function Eventos() {
  const { events, update, dirty, publish, exportJson, notify, ghConfigured } = useData()
  const [editing, setEditing] = useState(null)

  const save = (e) => {
    const list = events.events.some((x) => x.id === e.id)
      ? events.events.map((x) => (x.id === e.id ? e : x))
      : [...events.events, e]
    update('events', { ...events, events: list })
    setEditing(null)
  }
  const remove = (id) => update('events', { ...events, events: events.events.filter((e) => e.id !== id) })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-cream mb-1">Ventas por Evento</h1>
          <p className="text-sm text-silver/60">
            Fractals, achievements y encargos especiales — fuera de los runs de LI.
          </p>
        </div>
        <button className="btn btn-primary text-sm" onClick={() => setEditing('new')}>
          + Agregar evento
        </button>
      </div>

      {dirty.events && (
        <div className="flex items-center gap-2 flex-wrap bg-teal-deep/20 border border-teal/30 rounded-xl px-3 py-2">
          <span className="text-xs text-teal-light font-semibold mr-auto">Cambios locales sin publicar</span>
          <button
            className="btn btn-primary !py-1 text-sm"
            onClick={() => (ghConfigured ? publish('events') : notify('Configura GitHub en Ajustes primero', 'err'))}
          >
            Guardar en GitHub
          </button>
          <button className="btn btn-ghost !py-1 text-sm" onClick={() => exportJson('events', events)}>
            Exportar JSON
          </button>
        </div>
      )}

      {editing === 'new' && <EventForm onSave={save} onCancel={() => setEditing(null)} />}

      <div className="grid md:grid-cols-2 gap-4">
        {events.events.map((e, i) =>
          editing === e.id ? (
            <EventForm key={e.id} initial={e} onSave={save} onCancel={() => setEditing(null)} />
          ) : (
            <div key={e.id} className="card p-5 anim-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-cream text-lg">{e.name}</h3>
                <div className="flex gap-1.5 shrink-0">
                  <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditing(e.id)}>Editar</button>
                  <button className="btn btn-danger !px-2.5 !py-1 text-xs" onClick={() => remove(e.id)}>✕</button>
                </div>
              </div>
              <p className="text-sm mt-2">{e.description}</p>
              {e.notes && <p className="text-xs text-silver/50 mt-2">{e.notes}</p>}
            </div>
          )
        )}
      </div>
    </div>
  )
}
