import { useData } from '../App.jsx'
import { BuildChip } from '../lib/icons.jsx'

const LEVEL_STYLE = {
  S: 'bg-cream/90 text-ink border-cream',
  A: 'bg-teal-light/25 text-teal-light border-teal-light/50',
  B: 'bg-teal-deep/40 text-silver border-teal-deep/60',
  C: 'bg-silver/10 text-silver/60 border-silver/30',
}

export default function Roster() {
  const { players, icons } = useData()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">Roster</h1>
        <p className="text-sm text-silver/60">
          Squad members: classes they play, roles and skill level. Comp generation uses this to put everyone where they perform best.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {players.players.map((p, i) => (
          <div key={p.id} className="card p-5 anim-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-cream text-lg">
                  {p.name}
                </div>
                <span className="chip bg-teal-deep/40 text-teal-light mt-1">{p.mainRole}</span>
              </div>
            </div>

            {(p.classes || []).length > 0 && (
              <div className="mt-3 space-y-1.5">
                {p.classes.map((c, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm">
                    <span className={`chip border ${LEVEL_STYLE[c.level] || LEVEL_STYLE.B}`}>{c.level}</span>
                    <span className="text-cream font-semibold"><BuildChip name={c.name} icons={icons} /></span>
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
        ))}
        {players.players.length === 0 && (
          <p className="text-sm text-silver/60">No players yet.</p>
        )}
      </div>
    </div>
  )
}
