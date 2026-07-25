// Shared form primitives + role chip used by the plan editors.
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveBuildIcon } from './icons.jsx'

export const ROLES = ['Heal', 'Support', 'DPS']

export const ROLE_STYLE = {
  Heal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Support: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  DPS: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

export function RoleChip({ role, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? 'Click to change role' : undefined}
      className={`inline-flex justify-center w-[4.5rem] shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${ROLE_STYLE[role] || ROLE_STYLE.DPS} ${onClick ? 'cursor-pointer hover:brightness-125' : ''}`}
    >
      {role}
    </button>
  )
}

export const selCls =
  'bg-ink/60 border border-teal-deep/40 rounded-lg px-2 py-1 text-sm text-cream focus:border-teal outline-none'


// Uncontrolled text field that commits on blur/Enter — immune to re-render focus loss.
export function Field({ value, onCommit, className = '', textarea = false, placeholder = '', list }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  const props = {
    value: v,
    placeholder,
    list,
    className: `${selCls} ${className}`,
    onChange: (e) => setV(e.target.value),
    onBlur: () => v !== (value ?? '') && onCommit(v),
    onKeyDown: textarea ? undefined : (e) => e.key === 'Enter' && e.target.blur(),
  }
  return textarea ? <textarea {...props} /> : <input {...props} />
}

// mm : ss editor — numbers only, commits on blur.
export function TimeField({ seconds, onCommit }) {
  const m = seconds != null ? Math.floor(seconds / 60) : ''
  const sec = seconds != null ? seconds % 60 : ''
  const commit = (mv, sv) => {
    if (mv === '' && sv === '') return onCommit(null)
    const mm = parseInt(mv || 0, 10)
    const ss = Math.min(parseInt(sv || 0, 10), 59)
    onCommit((isNaN(mm) ? 0 : mm) * 60 + (isNaN(ss) ? 0 : ss))
  }
  const num = 'w-12 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
  const [mv, setMv] = useState(String(m))
  const [sv, setSv] = useState(String(sec))
  useEffect(() => {
    setMv(String(m))
    setSv(String(sec))
  }, [m, sec])
  return (
    <span className="inline-flex items-center gap-0.5">
      <input
        type="number"
        min="0"
        inputMode="numeric"
        placeholder="min"
        value={mv}
        className={`${selCls} ${num}`}
        onChange={(e) => setMv(e.target.value)}
        onBlur={() => commit(mv, sv)}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      />
      <span className="text-silver font-bold">:</span>
      <input
        type="number"
        min="0"
        max="59"
        inputMode="numeric"
        placeholder="sec"
        value={sv}
        className={`${selCls} ${num}`}
        onChange={(e) => setSv(e.target.value)}
        onBlur={() => commit(mv, sv)}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      />
    </span>
  )
}



// Class/build picker: full list on focus, grouped by profession, filters as you
// type, and still accepts free text for anything not in the catalog.
export function BuildCombo({ value, builds = [], icons, onCommit, className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const [typed, setTyped] = useState(false)
  const box = useRef(null)
  useEffect(() => setQuery(value || ''), [value])

  const q = typed ? query.trim().toLowerCase() : ''
  const groups = useMemo(() => {
    const list = builds
      .filter((b) => !q || b.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    const by = new Map()
    for (const b of list) {
      const k = b.profession || 'Other'
      if (!by.has(k)) by.set(k, [])
      by.get(k).push(b)
    }
    return [...by.entries()].sort((a, b) => (a[0] === 'Any' ? -1 : b[0] === 'Any' ? 1 : a[0].localeCompare(b[0])))
  }, [builds, q])

  const commit = (v) => {
    setOpen(false)
    setTyped(false)
    setQuery(v)
    if (v !== (value || '')) onCommit(v)
  }

  return (
    <span className={`relative block min-w-0 ${className}`} ref={box}>
      <input
        value={query}
        placeholder="class / build"
        className={`${selCls} w-full pr-6`}
        onFocus={() => {
          setOpen(true)
          setTyped(false)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setTyped(true)
          setOpen(true)
        }}
        onBlur={() => commit(query)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') {
            setOpen(false)
            e.target.blur()
          }
        }}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-silver/50 text-[10px] pointer-events-none">▼</span>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 max-h-72 overflow-y-auto z-30 bg-panel border border-teal/40 rounded-xl shadow-2xl py-1">
          {groups.length === 0 && <div className="px-3 py-2 text-xs text-silver/60">No match — your text is kept as is.</div>}
          {groups.map(([prof, list]) => (
            <div key={prof}>
              <div className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-teal-light/70 font-bold">{prof}</div>
              {list.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-teal/15 ${b.name === value ? 'bg-teal/10 text-cream font-semibold' : 'text-cream/90'}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commit(b.name)
                  }}
                >
                  {resolveBuildIcon(b.name, icons) ? (
                    <img src={resolveBuildIcon(b.name, icons)} alt="" className="w-6 h-6 rounded-sm shrink-0" />
                  ) : (
                    <span className="w-6 h-6 shrink-0" />
                  )}
                  {b.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
