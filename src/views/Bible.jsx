import { useState } from 'react'
import { useData } from '../App.jsx'
import { fmtTime, parseTime } from '../lib/gw2.js'

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
        onClick={() =>
          ghConfigured ? publish(name) : notify('Set up GitHub in Settings first', 'err')
        }
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

export default function Bible() {
  const { wings, update } = useData()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">The Bible</h1>
        <p className="text-sm text-silver/60">
          Team baseline. Click any time to edit it. Publish with "Save to GitHub" so the whole
          squad sees it.
        </p>
      </div>

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
                known total <span className="text-cream font-bold">{fmtTime(total)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
