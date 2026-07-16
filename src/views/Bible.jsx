import { useState } from 'react'
import { useData } from '../App.jsx'
import { fmtTime } from '../lib/gw2.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'

function BossPage({ wing, boss, onBack }) {
  const { comps, icons } = useData()
  const k = comps.bosses?.[boss.id] || {}

  return (
    <div className="space-y-5">
      <button className="btn btn-ghost text-sm" onClick={onBack}>← {wing.short} · {wing.name}</button>

      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cream">{boss.name}</h1>
          <div className="text-sm text-silver/60 mt-1 flex flex-wrap gap-2 items-center">
            <span>{wing.name}</span>
            <span>{boss.li > 0 ? `${boss.li} LI` : 'no LI'}</span>
            {boss.preEvent && (
              <span className="chip bg-danger/15 border border-danger/40 text-danger/90" title="Mandatory pre-event — time already included">pre-event</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-silver/50 uppercase tracking-wider">kill time</div>
          <div className={`font-bold tabular-nums text-xl ${boss.time == null ? 'text-danger/80' : 'text-cream'}`}>
            {boss.time == null ? 'pending' : fmtTime(boss.time)}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Damage profile</h2>
        <div className="flex gap-2">
          <span className="chip bg-teal-deep/40 text-teal-light uppercase">{k.profile?.dmg || 'any'}</span>
          <span className="chip bg-silver/10 text-silver uppercase">{k.profile?.style || 'sustained'}</span>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Mechanics to cover</h2>
        <ul className="space-y-1.5 text-sm">
          {(k.mechanics || []).map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-light shrink-0" />
              <NotesText text={m} icons={icons} />
            </li>
          ))}
          {(k.mechanics || []).length === 0 && <li className="text-silver/50">None documented yet.</li>}
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">Strategy</h2>
        <p className="text-sm"><NotesText text={k.strategy || '—'} icons={icons} /></p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-3">
          Ideal comp <span className="text-silver/50 normal-case">(priority order, flexible squad size)</span>
        </h2>
        <div className="space-y-2">
          {(k.slots || []).map((s, i) => (
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
          ))}
          {(k.slots || []).length === 0 && (
            <p className="text-sm text-silver/50">No comp defined yet — ask Herman/Claude to add it, or edit comps.json on GitHub.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-silver/40">
        Data is read-only in the app. Updates go through Claude or GitHub (public/data/*.json) and reach everyone in ~1 minute.
      </p>
    </div>
  )
}

export default function Bible() {
  const { wings, comps } = useData()
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
          Today's Sale follows these recommendations. Updates go through Claude or GitHub.
        </p>
      </div>

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
                  <div className="font-bold text-cream">
                    {b.name}
                    {b.preEvent && <span className="text-danger/70 text-xs font-normal ml-2" title="Mandatory pre-event included">+pre</span>}
                  </div>
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
