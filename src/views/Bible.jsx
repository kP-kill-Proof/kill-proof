import { useMemo, useState } from 'react'
import { useData } from '../App.jsx'
import { fmtTime } from '../lib/gw2.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'
import PlanView, { PLAN_STATUS, planCoverage, planIsEmpty } from '../lib/plan.jsx'

const PLANS_KEY = 'kp_plans_v1'
const loadPlanOv = () => {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY)) || {} } catch { return {} }
}
const savePlanOv = (ov) => {
  try { localStorage.setItem(PLANS_KEY, JSON.stringify(ov)); return true } catch { return false }
}

const EMPTY_PLAN = { status: 'draft', comp: [], notes: [], steps: [], maps: [], requires: ['Vulnerability'], decisions: [], rejected: [], gaps: [] }

function BossPage({ wing, boss, onBack }) {
  const { comps, icons, builds, players, plans } = useData()
  const k = comps.bosses?.[boss.id] || {}
  const [editing, setEditing] = useState(false)
  const [ovv, setOvv] = useState(0)
  const [msg, setMsg] = useState(null)
  const overrides = useMemo(() => loadPlanOv(), [ovv])
  const published = plans?.bosses?.[boss.id] || null
  const override = overrides[boss.id] || null
  const plan = override || published || EMPTY_PLAN

  const writePlan = (next) => {
    const all = loadPlanOv()
    all[boss.id] = next
    if (!savePlanOv(all)) { setMsg({ ok: false, text: 'No se pudo guardar: el almacenamiento del navegador está lleno (usa imágenes más chicas).' }); return }
    setOvv((v) => v + 1)
  }
  const resetPlan = () => {
    const all = loadPlanOv(); delete all[boss.id]; savePlanOv(all); setOvv((v) => v + 1); setEditing(false)
  }
  const exportPlan = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), bosses: { [boss.id]: plan } }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `kp-plan-${boss.id}.json`; a.click(); URL.revokeObjectURL(a.href)
  }
  const importPlan = (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const data = JSON.parse(r.result)
        const incoming = data.bosses?.[boss.id] || (data.comp ? data : null)
        if (!incoming) throw new Error('shape')
        writePlan(incoming)
        setMsg({ ok: true, text: 'Plan importado en este dispositivo.' })
      } catch { setMsg({ ok: false, text: 'Ese archivo no parece un plan de KP.' }) }
      setTimeout(() => setMsg(null), 6000)
    }
    r.readAsText(file)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn btn-ghost text-sm" onClick={onBack}>← {wing.short} · {wing.name}</button>
        <div className="flex items-center gap-2">
          <label className="btn btn-ghost text-xs cursor-pointer" title="Cargar un plan exportado por un compañero">
            ⬆ Import
            <input type="file" accept=".json,application/json" className="hidden" onChange={importPlan} />
          </label>
          {override && (
            <>
              <button className="btn btn-ghost text-xs" onClick={exportPlan} title="Descargar tu plan local para publicarlo">⬇ Export</button>
              <button className="btn btn-ghost text-xs" onClick={resetPlan}>Reset al publicado</button>
            </>
          )}
          <button className={`btn text-sm ${editing ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setEditing(!editing)}>
            {editing ? '✓ Listo' : '✎ Editar plan'}
          </button>
        </div>
      </div>
      {msg && (
        <div className={`text-xs px-3 py-2 rounded-xl border ${msg.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-danger/40 bg-danger/10 text-danger'}`}>{msg.text}</div>
      )}
      {override && (
        <div className="text-xs px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200">
          Este plan tiene ediciones locales guardadas <b>solo en este dispositivo</b>. Usá <b>Export</b> para publicarlo al squad.
        </div>
      )}

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
            <p className="text-sm text-silver/50">No comp defined yet.</p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <h2 className="font-display text-2xl text-cream mb-1">Nuestro plan</h2>
        <p className="text-xs text-silver/60 mb-3">
          Comp con rol secundario libre, notas de la pelea, ruta y decisiones del equipo. Todo editable. Today's Sale muestra esto mismo al abrir la pelea.
        </p>
      </div>
      <datalist id="kp-roster-names">
        {(players?.players || []).map((p) => (<option key={p.id} value={p.name.split('|')[0].trim()} />))}
      </datalist>
      <datalist id="kp-build-names">
        {[...(builds?.builds || [])].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (<option key={b.id} value={b.name} />))}
      </datalist>
      <PlanView
        plan={plan}
        icons={icons}
        builds={builds}
        players={players?.players || []}
        editing={editing}
        onChange={writePlan}
      />

    </div>
  )
}

export default function Bible() {
  const { wings, comps, plans, builds } = useData()
  const planOverrides = loadPlanOv()
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
                  <div className="text-xs text-silver/50 mt-0.5 flex flex-wrap gap-2 items-center">
                    {k?.profile && <span className="uppercase text-teal-light/80">{k.profile.dmg} · {k.profile.style}</span>}
                    {(() => {
                      const pl = planOverrides[b.id] || plans?.bosses?.[b.id]
                      if (!pl || planIsEmpty(pl)) return <span className="text-silver/40">sin plan</span>
                      const st = PLAN_STATUS[pl.status] || PLAN_STATUS.draft
                      const c = planCoverage(pl, builds)
                      const warns = c.missingReq.length + c.unassigned.length + c.flagged.length
                      return (
                        <>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                          <span>{pl.comp?.length || 0} slots</span>
                          {warns > 0 && <span className="text-danger/90 font-semibold">▲ {warns}</span>}
                          {planOverrides[b.id] && <span className="text-amber-300/90">editado local</span>}
                        </>
                      )
                    })()}
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
