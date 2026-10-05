import { useEffect, useRef, useState } from 'react'
import { fetchShared, saveShared } from '../lib/sync.js'
import { useData } from '../App.jsx'
import { fmtTime } from '../lib/gw2.js'
import { BuildChip, NotesText } from '../lib/icons.jsx'
import PlanView, { PLAN_STATUS, planCoverage, planIsEmpty } from '../lib/plan.jsx'

const EMPTY_PLAN = { status: 'draft', comp: [], notes: [], steps: [], maps: [], requires: [], decisions: [], rejected: [], gaps: [] }

// Boss portrait from the official wiki. Wiki art comes in every aspect ratio, so
// it is cropped square from the top (where the face usually is). Encounters with
// no boss art get a plain tile with the initials instead of a broken image.
// Phase images are the one thing the squad edits from the page: drawing a fight
// is easier with a mouse than through Claude. They live in the shared store
// under the old "plans" key, which nothing reads anymore since the plan text
// moved to the repo; the "kind" tag keeps the two shapes from ever mixing.
const IMG_KEY = 'plans'
const IMG_KIND = 'bible-images'
const emptyImgDoc = () => ({ kind: IMG_KIND, bosses: {} })

function BossPortrait({ boss, size = 56 }) {
  const [bad, setBad] = useState(false)
  const initials = boss.name.split(/[\s/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
  const box = { width: size, height: size }
  if (!boss.portrait || bad) {
    return (
      <div style={box} className="shrink-0 rounded-xl bg-teal-deep/30 border border-teal-deep/50 flex items-center justify-center font-display text-teal-light/70" >
        <span style={{ fontSize: size * 0.34 }}>{initials}</span>
      </div>
    )
  }
  return (
    <img
      src={boss.portrait}
      alt=""
      loading="lazy"
      onError={() => setBad(true)}
      style={box}
      className="shrink-0 rounded-xl object-cover object-top border border-teal-deep/50 bg-ink"
    />
  )
}

function BossPage({ wing, boss, onBack }) {
  const { comps, icons, builds, players, plans } = useData()
  const k = comps.bosses?.[boss.id] || {}
  // Read-only, straight from the repo: every edit goes through Claude, so the
  // whole squad opens the same Bible with nobody pressing save and no local
  // copy quietly shadowing a newer deploy.
  const base = plans?.bosses?.[boss.id] || EMPTY_PLAN

  const [imgDoc, setImgDoc] = useState(emptyImgDoc)
  const [imgStatus, setImgStatus] = useState('')
  const timer = useRef(null)
  const pending = useRef({})
  useEffect(() => {
    fetchShared(IMG_KEY).then((d) => setImgDoc(d?.kind === IMG_KIND ? d : emptyImgDoc()))
    return () => clearTimeout(timer.current)
  }, [])

  const overlay = imgDoc.bosses?.[boss.id] || {}
  const plan = {
    ...base,
    phases: (base.phases || []).map((ph, i) => ({ ...ph, map: overlay[ph.id ?? String(i)] ?? ph.map })),
  }

  // Saves after a short pause so a drawing session is one write, not fifty.
  // Re-reads the stored copy first and only touches this fight, so two people
  // drawing different fights never overwrite each other.
  const onPhaseMap = (pid, map) => {
    setImgDoc((d) => ({ ...d, bosses: { ...d.bosses, [boss.id]: { ...(d.bosses?.[boss.id] || {}), [pid]: map } } }))
    pending.current[pid] = map
    setImgStatus('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const changes = pending.current
      pending.current = {}
      try {
        const latest = await fetchShared(IMG_KEY)
        const doc = latest?.kind === IMG_KIND ? latest : emptyImgDoc()
        doc.bosses = doc.bosses || {}
        doc.bosses[boss.id] = { ...(doc.bosses[boss.id] || {}), ...changes }
        doc.updated = new Date().toISOString()
        await saveShared(IMG_KEY, doc)
        setImgStatus('Saved for everyone')
      } catch (e) {
        setImgStatus(`Not saved: ${e.message || e}`)
      }
    }, 1200)
  }

  return (
    <div className="space-y-5">
      <button className="btn btn-ghost text-sm" onClick={onBack}>← {wing.short} · {wing.name}</button>

      {/* Title, damage profile and kill time in one block: they answer the same
          question — what is this fight and how do we hit it. LI belongs to
          Today's Sale; the Bible is about how we play, not what it pays. */}
      <div className="card p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex gap-5 items-start">
          <BossPortrait boss={boss} size={96} />
          <div className="min-w-0">
          <h1 className="font-display text-3xl text-cream">{boss.name}</h1>
          <div className="text-sm text-silver/60 mt-1 flex flex-wrap gap-2 items-center">
            <span>{wing.name}</span>
            {boss.preEvent && (
              <span className="chip bg-danger/15 border border-danger/40 text-danger/90" title="Mandatory pre-event — time already included">pre-event</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {(k.profile?.tags || [k.profile?.dmg || 'any', k.profile?.style || 'sustained']).map((t, i) => (
              <span key={t} className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide ${i === 0 ? 'bg-teal-deep/50 text-teal-light' : 'bg-silver/10 text-silver'}`}>
                {t}
              </span>
            ))}
          </div>
          {(k.profile?.notes || (k.profile?.note ? [k.profile.note] : [])).length > 0 && (
            <ul className="mt-3 space-y-1.5 max-w-3xl">
              {(k.profile.notes || [k.profile.note]).map((n, i) => (
                <li key={i} className="flex gap-2 text-[15px] text-cream/85 leading-relaxed">
                  <span className="text-teal-light mt-[1px]">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-silver/50 uppercase tracking-wider">kill time</div>
          <div className={`font-bold tabular-nums text-xl ${boss.time == null ? 'text-danger/80' : 'text-cream'}`}>
            {boss.time == null ? 'pending' : fmtTime(boss.time)}
          </div>
        </div>
      </div>
      <PlanView
        plan={plan}
        icons={icons}
        builds={builds}
        players={players?.players || []}
        editing={false}
        onPhaseMap={onPhaseMap}
        imageStatus={imgStatus}
      />

    </div>
  )
}

export default function Bible({ target }) {
  const { wings, comps, plans, builds } = useData()
  const [nav, setNav] = useState({ section: 'raid', wingId: null, bossId: null })

  useEffect(() => {
    if (!target?.bossId) return
    const w = wings.wings.find((x) => x.id === target.wingId)
    setNav({ section: w?.type === 'strike' ? 'strike' : 'raid', wingId: target.wingId, bossId: target.bossId })
  }, [target?.at])

  const sections = [
    { id: 'raid', label: 'Raids' },
    { id: 'strike', label: 'Strikes' },
  ]
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
          The team's knowledge base: times, damage profiles and our plan per encounter.
          Today's Sale follows these recommendations.
        </p>
      </div>

      {wing && (
        <button className="btn btn-ghost text-sm" onClick={() => setNav({ ...nav, wingId: null })}>← All wings</button>
      )}

      {!wing ? (
        <div className="space-y-6">
          {sections.map((sec) => (
            <div key={sec.id}>
              <h2 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold mb-2.5">{sec.label}</h2>
              <div className="space-y-3">
                {wings.wings.filter((w) => w.type === sec.id).map((w, i) => {
                  const total = w.bosses.reduce((s, b) => s + (b.time ?? 0), 0)
                  const pending = w.bosses.filter((b) => b.time == null).length
                  return (
                    <button
                      key={w.id}
                      className="card w-full p-5 text-left hover:scale-[1.005] cursor-pointer anim-in"
                      style={{ animationDelay: `${i * 0.03}s` }}
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
            </div>
          ))}
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
                <BossPortrait boss={b} size={56} />
                <div className="flex-1">
                  <div className="font-bold text-cream">
                    {b.name}
                    {b.preEvent && <span className="text-danger/70 text-xs font-normal ml-2" title="Mandatory pre-event included">+pre</span>}
                  </div>
                  <div className="text-xs text-silver/50 mt-0.5 flex flex-wrap gap-2 items-center">
                    {k?.profile && <span className="uppercase text-teal-light/80">{k.profile.dmg} · {k.profile.style}</span>}
                    {(() => {
                      const pl = plans?.bosses?.[b.id]
                      if (!pl || planIsEmpty(pl)) return <span className="text-silver/40">no plan</span>
                      const st = PLAN_STATUS[pl.status] || PLAN_STATUS.draft
                      const c = planCoverage(pl, builds)
                      const warns = c.missingReq.length + c.unassigned.length + c.flagged.length
                      return (
                        <>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                          <span>{pl.comp?.length || 0} slots</span>
                          {warns > 0 && <span className="text-danger/90 font-semibold">▲ {warns}</span>}
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
