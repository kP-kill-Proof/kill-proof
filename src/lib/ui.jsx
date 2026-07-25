// Shared form primitives + role chip used by the plan editors.
import { useEffect, useState } from 'react'

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

