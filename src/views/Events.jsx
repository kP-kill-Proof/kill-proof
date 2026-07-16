import { useData } from '../App.jsx'

export default function Events() {
  const { events } = useData()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">Event Sales</h1>
        <p className="text-sm text-silver/60">
          Fractals, achievements and special orders — outside the LI runs. To add or update events,
          ask Herman/Claude or edit events.json on GitHub.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {events.events.map((e, i) => (
          <div key={e.id} className="card p-5 anim-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <h3 className="font-bold text-cream text-lg">{e.name}</h3>
            <p className="text-sm mt-2">{e.description}</p>
            {e.notes && <p className="text-xs text-silver/50 mt-2">{e.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
