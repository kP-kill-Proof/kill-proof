// Lists the versions the shared store kept and restores one with a click.
// This is the safety net for "someone published something wrong over my work".
import { useEffect, useState } from 'react'
import { fetchHistory, fetchVersion, saveShared } from './sync.js'

const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)
const fmtWhen = (iso) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export default function HistoryPanel({ docKey, onRestored, onClose }) {
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetchHistory(docKey).then(setList)
  }, [docKey])

  const restore = async (i) => {
    setBusy(i)
    setErr(null)
    try {
      const doc = await fetchVersion(docKey, i)
      await saveShared(docKey, doc)
      onRestored?.(doc)
    } catch (e) {
      setErr(String(e.message || e))
    }
    setBusy(null)
  }

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-widest text-teal-light/80 font-bold">Saved versions</h3>
        <button className="btn btn-ghost text-xs" onClick={onClose}>Close</button>
      </div>
      <p className="text-xs text-silver/70">
        Every save is kept. If something got published over good work, restore it here — the newest is at the top.
      </p>
      {err && <div className="text-xs text-danger">{err}</div>}
      {list === null ? (
        <p className="text-sm text-silver/60">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-silver/60">Nothing has been saved to the squad yet.</p>
      ) : (
        <ul className="space-y-1">
          {list.map((v, i) => (
            <li key={v.at} className="flex items-center gap-3 text-sm bg-ink/40 border border-teal-deep/25 rounded-lg px-3 py-1.5">
              <span className="text-cream/90">{fmtWhen(v.at)}</span>
              <span className="text-silver/70 text-xs">{fmtBytes(v.bytes)}</span>
              {i === 0 && <span className="chip bg-teal/15 border border-teal/40 text-teal-light text-[10px]">live</span>}
              <button
                className="btn btn-ghost text-xs ml-auto"
                disabled={busy !== null}
                onClick={() => restore(i)}
              >
                {busy === i ? 'Restoring…' : 'Restore'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
