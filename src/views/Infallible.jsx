import { useEffect, useMemo, useState } from 'react'
import { useData } from '../App.jsx'
import { BuildChip, NotesText, resolveBuildIcon } from '../lib/icons.jsx'

const LS_KEY = 'kp_infallible_plan_v1'
const ROLES = ['Heal', 'Support', 'DPS']

const fmt = (s) => {
  if (s == null || isNaN(s)) return '—'
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
const parseT = (str) => {
  if (!str) return null
  const m = String(str).trim().match(/^(\d+):(\d{1,2})$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  const n = parseInt(str)
  return isNaN(n) ? null : n
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveOverrides(ov) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ov)); return true } catch { return false }
}

const KIND_STYLE = {
  boss: 'bg-danger/15 text-danger border-danger/40',
  event: 'bg-teal/10 text-teal-light border-teal/40',
  transition: 'bg-silver/10 text-silver border-silver/30',
}
const STATUS_STYLE = {
  planning: { label: 'Planning', cls: 'bg-silver/10 text-silver border-silver/30' },
  practicing: { label: 'Practicing', cls: 'bg-teal/15 text-teal-light border-teal/40' },
  done: { label: 'DONE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
}
const ROLE_STYLE = {
  Heal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Support: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  DPS: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

function RoleChip({ role, onClick }) {
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

const selCls =
  'bg-ink/60 border border-teal-deep/40 rounded-lg px-2 py-1 text-sm text-cream focus:border-teal outline-none'

// Uncontrolled text field that commits on blur/Enter — immune to re-render focus loss.
function Field({ value, onCommit, className = '', textarea = false, placeholder = '', list }) {
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
function TimeField({ seconds, onCommit }) {
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

function emptyComp() {
  const mk = (sub) => [
    { sub, role: 'Heal', build: '', player: '', note: '' },
    { sub, role: 'Support', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
    { sub, role: 'DPS', build: '', player: '', note: '' },
  ]
  return [...mk(1), ...mk(2)]
}

function Rules({ overview }) {
  return (
    <div className="card p-5">
      <div className="font-display text-xl text-cream mb-1">What is Infallible?</div>
      <p className="text-sm text-silver mb-3">{overview.description}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {overview.rules.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm bg-ink/40 border border-teal-deep/25 rounded-xl px-3 py-2">
            <span className="text-teal-light mt-0.5">◆</span>
            <span className="text-cream/90">{r}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-silver/70">{overview.source}</div>
    </div>
  )
}

function WingCard({ w, edited, onOpen }) {
  const fights = w.segments.filter((s) => s.kind === 'boss').length
  const status = STATUS_STYLE[w.status] || STATUS_STYLE.planning
  return (
    <button onClick={onOpen} className="card p-5 text-left hover:border-teal/60 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl text-teal-light">{w.short}</span>
          <span className="font-semibold text-cream group-hover:text-teal-light transition-colors">{w.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {edited && (
            <span className="px-2 py-0.5 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10px] uppercase tracking-wider">
              Edited
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm mb-2">
        <div>
          <span className="text-silver">Time limit </span>
          <span className="font-display text-lg text-cream">{fmt(w.timeLimit)}</span>
        </div>
        <div className="text-silver">
          {fights} fight{fights !== 1 ? 's' : ''}
          {w.cms.length > 0 && <span className="text-danger"> · {w.cms.length} CM{w.cms.length > 1 ? 's' : ''}</span>}
        </div>
      </div>
      {w.cms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {w.cms.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-[11px]">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-silver/80">{w.timerTrigger}</div>
    </button>
  )
}

function BuildCombo({ value, builds, icons, onCommit }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  useEffect(() => setQuery(value || ''), [value])
  const sorted = useMemo(() => [...builds].sort((a, b) => a.name.localeCompare(b.name)), [builds])
  const q = query.trim().toLowerCase()
  const list = q && q !== (value || '').toLowerCase() ? sorted.filter((b) => b.name.toLowerCase().includes(q)) : sorted

  const commit = (v) => {
    setOpen(false)
    setQuery(v)
    if (v !== (value || '')) onCommit(v)
  }

  return (
    <span className="relative flex-1 min-w-0 block">
      <input
        value={query}
        placeholder="class/build"
        className={`${selCls} w-full`}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onBlur={() => commit(query)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && list.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-56 max-h-60 overflow-y-auto z-30 bg-panel border border-teal/40 rounded-xl shadow-2xl py-1">
          {list.map((b) => (
            <button
              key={b.id}
              type="button"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm text-cream/90 hover:bg-teal/15"
              onMouseDown={(e) => {
                e.preventDefault()
                commit(b.name)
              }}
            >
              {resolveBuildIcon(b.name, icons) && (
                <img src={resolveBuildIcon(b.name, icons)} alt="" className="w-6 h-6 rounded-sm shrink-0" />
              )}
              {b.name}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

function CompEditorRow({ slot, editing, builds, players, icons, onChange }) {
  if (!editing) {
    const isEmpty = !slot.build && !slot.player
    return (
      <div className="text-sm py-1">
        <div className="flex items-center gap-2 min-h-[30px]">
          <RoleChip role={slot.role} />
          {slot.player && <span className="font-semibold text-cream shrink-0">{slot.player.split('|')[0].trim()}</span>}
          {slot.build ? (
            <BuildChip name={slot.build} icons={icons} className="text-cream/90" />
          ) : (
            isEmpty && <span className="text-silver/50 italic">open slot</span>
          )}
        </div>
        {slot.note && <div className="mt-0.5 ml-[5rem] text-xs text-silver leading-snug">{slot.note}</div>}
      </div>
    )
  }
  const cycleRole = () => {
    const next = ROLES[(ROLES.indexOf(slot.role) + 1) % ROLES.length]
    onChange({ ...slot, role: next })
  }
  return (
    <div className="rounded-xl border border-teal-deep/20 bg-ink/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <RoleChip role={slot.role} onClick={cycleRole} />
        <Field
          value={slot.player}
          placeholder="player"
          list="kp-roster-names"
          className="w-32 shrink-0"
          onCommit={(v) => onChange({ ...slot, player: v })}
        />
        <datalist id="kp-roster-names">
          {players.map((p) => (
            <option key={p.id} value={p.name.split('|')[0].trim()} />
          ))}
        </datalist>
        {slot.build && resolveBuildIcon(slot.build, icons) && (
          <img src={resolveBuildIcon(slot.build, icons)} alt="" className="w-9 h-9 rounded-md shrink-0" />
        )}
        <BuildCombo value={slot.build} builds={builds} icons={icons} onCommit={(v) => onChange({ ...slot, build: v })} />
      </div>
      <Field
        value={slot.note}
        placeholder="note — duty, gear, sigils, mechanics…"
        className="w-full"
        onCommit={(v) => onChange({ ...slot, note: v })}
      />
    </div>
  )
}

const DRAW_COLORS = ['#4fb3d4', '#e05252', '#f5b942', '#39c07a', '#f2ead9']
const MAP_ICONS = [
  { id: 'mesmer_portal', name: 'Mesmer Portal (Portal Entre)', url: 'https://render.guildwars2.com/file/BB7D7902B947C52DF3FC340AA66697F0CE669E31/103558.png' },
  { id: 'shadow_portal', name: 'Thief Portal (Prepare Shadow Portal)', url: 'https://render.guildwars2.com/file/D62F215C68C77A2F069238A39FD8A6A135B438C1/2175068.png' },
  { id: 'mass_invis', name: 'Mass Invisibility', url: 'https://render.guildwars2.com/file/E1EB3BC23A10BA9150EF992B03A813F4A26217A8/103755.png' },
]

const TOOLS = [
  { id: 'pin', icon: '📍', label: 'Marker' },
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'line', icon: '╱', label: 'Line' },
  { id: 'arrow', icon: '➔', label: 'Arrow' },
  { id: 'ellipse', icon: '◯', label: 'Circle' },
  { id: 'text', icon: '🄰', label: 'Text' },
  { id: 'sicon', icon: '✦', label: 'Skill icon' },
  { id: 'move', icon: '✋', label: 'Move' },
  { id: 'erase', icon: '🧽', label: 'Erase' },
]

function Shape({ sh, erasable, onErase }) {
  const common = {
    stroke: sh.c,
    strokeWidth: 3,
    fill: 'none',
    vectorEffect: 'non-scaling-stroke',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeDasharray: sh.d ? '8 6' : undefined,
    style: erasable ? { pointerEvents: 'stroke', cursor: 'pointer' } : { pointerEvents: 'none' },
    onPointerDown: erasable
      ? (e) => {
          e.stopPropagation()
          onErase()
        }
      : undefined,
  }
  if (sh.t === 'pen' || sh.t === 'line' || sh.t === 'arrow') {
    const pts = sh.t === 'pen' ? sh.pts : [[sh.x1, sh.y1], [sh.x2, sh.y2]]
    return <polyline points={pts.map((p) => p.join(',')).join(' ')} {...common} />
  }
  if (sh.t === 'head') return <polyline points={sh.pts.map((p) => p.join(',')).join(' ')} {...common} strokeDasharray={undefined} />
  if (sh.t === 'ellipse') return <ellipse cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} {...common} />
  return null
}

// Arrowhead computed in pixel space at draw time, stored normalized → stays correct because the image keeps its aspect ratio.
function arrowHead(x1, y1, x2, y2, rect) {
  const px = (v) => (v / 100) * rect.width
  const py = (v) => (v / 100) * rect.height
  const nx = (v) => (v / rect.width) * 100
  const ny = (v) => (v / rect.height) * 100
  const ax = px(x1), ay = py(y1), bx = px(x2), by = py(y2)
  const ang = Math.atan2(by - ay, bx - ax)
  const L = 14
  const mk = (da) => [nx(bx - L * Math.cos(ang + da)), ny(by - L * Math.sin(ang + da))]
  return [mk(0.45), [x2, y2], mk(-0.45)]
}

const IMG_SIZES = [
  { id: 'sm', label: 'S', px: 380 },
  { id: 'md', label: 'M', px: 600 },
  { id: 'lg', label: 'L', px: 820 },
  { id: 'full', label: 'Full', px: null },
]

function StrategyImage({ seg, editing, onChange }) {
  const [tool, setTool] = useState('pin')
  const [color, setColor] = useState(DRAW_COLORS[0])
  const [dashed, setDashed] = useState(false)
  const [temp, setTemp] = useState(null)
  const [armClear, setArmClear] = useState(false)
  const [textDraft, setTextDraft] = useState(null) // { i: existing index | null, x, y, value }
  const [drag, setDrag] = useState(null)
  const [mapIcon, setMapIcon] = useState(MAP_ICONS[0])
  const pins = seg.pins || []
  const draw = seg.draw || []
  const src = seg.image
    ? seg.image.startsWith('data:')
      ? seg.image
      : `${import.meta.env.BASE_URL}${seg.image}`
    : null

  const norm = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      rect,
      x: Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10)),
      y: Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10)),
    }
  }

  const down = (e) => {
    if (!editing || tool === 'erase' || tool === 'move') return
    const { x, y, rect } = norm(e)
    if (tool === 'pin') {
      onChange({ ...seg, pins: [...pins, { x, y, text: '' }] })
      return
    }
    if (tool === 'text') {
      e.preventDefault() // stop the browser from stealing focus from the text box we are about to open
      setTextDraft({ i: null, x, y, value: '' })
      return
    }
    if (tool === 'sicon') {
      onChange({ ...seg, draw: [...draw, { t: 'icon', x, y, url: mapIcon.url, n: mapIcon.name }] })
      return
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    if (tool === 'pen') setTemp({ t: 'pen', pts: [[x, y]], c: color, d: dashed })
    if (tool === 'line' || tool === 'arrow') setTemp({ t: tool, x1: x, y1: y, x2: x, y2: y, c: color, d: dashed, rect })
    if (tool === 'ellipse') setTemp({ t: 'ellipse', x0: x, y0: y, cx: x, cy: y, rx: 0, ry: 0, c: color, d: dashed })
  }
  const move = (e) => {
    if (drag) {
      const { x, y } = norm(e)
      setDrag((d) => ({ ...d, x, y }))
      return
    }
    if (!temp) return
    const { x, y } = norm(e)
    if (temp.t === 'pen') {
      const last = temp.pts[temp.pts.length - 1]
      if (Math.abs(last[0] - x) + Math.abs(last[1] - y) < 0.4) return
      setTemp({ ...temp, pts: [...temp.pts, [x, y]] })
    } else if (temp.t === 'line' || temp.t === 'arrow') setTemp({ ...temp, x2: x, y2: y })
    else if (temp.t === 'ellipse')
      setTemp({
        ...temp,
        cx: (temp.x0 + x) / 2,
        cy: (temp.y0 + y) / 2,
        rx: Math.abs(x - temp.x0) / 2,
        ry: Math.abs(y - temp.y0) / 2,
      })
  }
  const up = () => {
    if (drag) {
      if (drag.kind === 'pin') onChange({ ...seg, pins: pins.map((p, j) => (j === drag.i ? { ...p, x: drag.x, y: drag.y } : p)) })
      else onChange({ ...seg, draw: draw.map((d, j) => (j === drag.i ? { ...d, x: drag.x, y: drag.y } : d)) })
      setDrag(null)
      return
    }
    if (!temp) return
    let shapes = []
    if (temp.t === 'pen' && temp.pts.length > 1) shapes = [{ t: 'pen', pts: temp.pts, c: temp.c, d: temp.d }]
    if ((temp.t === 'line' || temp.t === 'arrow') && (temp.x1 !== temp.x2 || temp.y1 !== temp.y2)) {
      shapes = [{ t: temp.t === 'arrow' ? 'arrow' : 'line', x1: temp.x1, y1: temp.y1, x2: temp.x2, y2: temp.y2, c: temp.c, d: temp.d }]
      if (temp.t === 'arrow')
        shapes.push({ t: 'head', pts: arrowHead(temp.x1, temp.y1, temp.x2, temp.y2, temp.rect), c: temp.c })
    }
    if (temp.t === 'ellipse' && temp.rx > 0.5 && temp.ry > 0.5)
      shapes = [{ t: 'ellipse', cx: temp.cx, cy: temp.cy, rx: temp.rx, ry: temp.ry, c: temp.c, d: temp.d }]
    setTemp(null)
    if (shapes.length) onChange({ ...seg, draw: [...draw, ...shapes] })
  }

  const eraseShape = (i) => {
    // arrows are stored as [arrow, head] pairs — remove both
    const sh = draw[i]
    let drop = [i]
    if (sh.t === 'arrow' && draw[i + 1]?.t === 'head') drop.push(i + 1)
    if (sh.t === 'head' && draw[i - 1]?.t === 'arrow') drop.push(i - 1)
    onChange({ ...seg, draw: draw.filter((_, j) => !drop.includes(j)) })
  }
  const undo = () => {
    if (draw.length) {
      const n = draw[draw.length - 1].t === 'head' ? 2 : 1
      onChange({ ...seg, draw: draw.slice(0, -n) })
    } else if (pins.length) {
      onChange({ ...seg, pins: pins.slice(0, -1) })
    }
  }

  const setPin = (i, text) => onChange({ ...seg, pins: pins.map((p, j) => (j === i ? { ...p, text } : p)) })
  const delPin = (i) => onChange({ ...seg, pins: pins.filter((_, j) => j !== i) })

  const uploadImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1600
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * scale)
        cv.height = Math.round(img.height * scale)
        const ctx = cv.getContext('2d')
        ctx.fillStyle = '#101418'
        ctx.fillRect(0, 0, cv.width, cv.height)
        ctx.drawImage(img, 0, 0, cv.width, cv.height)
        onChange({ ...seg, image: cv.toDataURL('image/jpeg', 0.85), pins: [], draw: [] })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const cursor = !editing ? '' : tool === 'erase' ? 'cursor-pointer' : 'cursor-crosshair'

  return (
    <div className="space-y-2">
      {editing && src && (
        <div className="bg-ink/60 border border-teal-deep/30 rounded-xl px-3 py-2 space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                  tool === t.id ? 'bg-teal/20 border-teal text-cream' : 'border-transparent text-silver hover:text-cream hover:bg-ink/60'
                }`}
              >
                <span>{t.icon}</span>
                <span className="text-xs hidden sm:inline">{t.label}</span>
              </button>
            ))}
            <span className="flex-1" />
            <button
              type="button"
              onClick={undo}
              disabled={!draw.length && !pins.length}
              className="px-2.5 py-1.5 rounded-lg text-xs text-silver hover:text-cream disabled:opacity-30"
              title="Undo last shape or marker"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={() => {
                if (!draw.length && !pins.length) return
                if (!armClear) {
                  setArmClear(true)
                  setTimeout(() => setArmClear(false), 3000)
                  return
                }
                setArmClear(false)
                onChange({ ...seg, draw: [], pins: [] })
              }}
              disabled={!draw.length && !pins.length}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-30 ${armClear ? 'bg-danger/20 border-danger text-danger font-semibold' : 'border-transparent text-danger/80 hover:text-danger'}`}
            >
              {armClear ? 'Sure? Click again' : 'Clear'}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap border-t border-teal-deep/20 pt-2">
            <span className="text-[10px] uppercase tracking-wider text-silver/70">Style</span>
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-cream scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ background: c }}
                title="Color"
              />
            ))}
            <button
              onClick={() => setDashed(!dashed)}
              className={`px-2 py-1 rounded-lg text-xs border ${dashed ? 'bg-teal/20 border-teal text-cream' : 'border-teal-deep/40 text-silver hover:text-cream'}`}
              title="Dashed stroke — pen/line/arrow draw dotted (great for movement paths)"
            >
              - - - Dashed
            </button>
            {tool === 'sicon' && (
              <>
                <span className="w-px h-5 bg-teal-deep/40" />
                <span className="text-[10px] uppercase tracking-wider text-silver/70">Icon</span>
                {MAP_ICONS.map((ic) => (
                  <button
                    key={ic.id}
                    type="button"
                    title={ic.name}
                    onClick={() => setMapIcon(ic)}
                    className={`p-0.5 rounded-lg border ${mapIcon.id === ic.id ? 'border-teal bg-teal/15' : 'border-transparent hover:border-teal-deep/50'}`}
                  >
                    <img src={ic.url} alt={ic.name} className="w-7 h-7 rounded" />
                  </button>
                ))}
              </>
            )}
            <span className="flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-silver/70">Size</span>
            {IMG_SIZES.map((sz) => (
              <button
                key={sz.id}
                onClick={() => onChange({ ...seg, imgSize: sz.id })}
                className={`px-2 py-1 rounded-lg text-xs border ${(seg.imgSize || 'md') === sz.id ? 'bg-teal/20 border-teal text-cream' : 'border-teal-deep/40 text-silver hover:text-cream'}`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {src ? (
        <div className="flex justify-center">
        <div
          className={`relative inline-block max-w-full select-none ${editing ? 'touch-none' : ''}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        >
          <img
            src={src}
            alt={`${seg.name} strategy map`}
            className={`rounded-xl border border-teal-deep/30 ${(seg.imgSize || 'md') === 'full' ? 'w-full h-auto' : 'w-auto'} ${cursor}`}
            style={(seg.imgSize || 'md') !== 'full' ? { maxHeight: IMG_SIZES.find((z) => z.id === (seg.imgSize || 'md'))?.px, maxWidth: '100%' } : undefined}
            draggable={false}
            loading="lazy"
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {draw.map((sh, i) =>
              sh.t === 'text' ? null : (
                <Shape key={i} sh={sh} erasable={editing && tool === 'erase'} onErase={() => eraseShape(i)} />
              )
            )}
            {temp && <Shape sh={temp.t === 'ellipse' ? temp : temp} erasable={false} />}
            {temp?.t === 'arrow' && temp.rect && (
              <Shape sh={{ t: 'head', pts: arrowHead(temp.x1, temp.y1, temp.x2, temp.y2, temp.rect), c: temp.c }} erasable={false} />
            )}
          </svg>
          {draw.map((sh, i) => {
            if (sh.t !== 'text' && sh.t !== 'icon') return null
            const drawing = editing && ['pen', 'line', 'arrow', 'ellipse'].includes(tool)
            if (sh.t === 'icon') {
              const ipos = drag && drag.kind === 'icon' && drag.i === i ? drag : sh
              return (
                <img
                  key={`ic${i}`}
                  src={sh.url}
                  alt={sh.n}
                  title={sh.n}
                  draggable={false}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-md shadow-lg shadow-black/50 select-none ${drawing ? 'pointer-events-none' : ''} ${editing && tool === 'move' ? 'cursor-move ring-2 ring-teal-light' : ''} ${editing && tool === 'erase' ? 'cursor-pointer ring-2 ring-danger' : ''}`}
                  style={{ left: `${ipos.x}%`, top: `${ipos.y}%` }}
                  onPointerDown={(e) => {
                    if (!editing) return
                    e.stopPropagation()
                    if (tool === 'erase') eraseShape(i)
                    else if (tool === 'move') setDrag({ kind: 'icon', i, x: sh.x, y: sh.y })
                  }}
                />
              )
            }
            if (editing && textDraft && textDraft.i === i) return null
            const dpos = drag && drag.kind === 'text' && drag.i === i ? drag : sh
            return (
              <span
                key={`t${i}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-1 rounded bg-ink/60 text-sm font-semibold whitespace-pre select-none ${drawing ? 'pointer-events-none' : ''} ${editing && (tool === 'erase' || tool === 'text') ? 'cursor-pointer' : ''} ${editing && tool === 'move' ? 'cursor-move' : ''} ${editing && tool === 'erase' ? 'ring-1 ring-danger' : ''}`}
                style={{ left: `${dpos.x}%`, top: `${dpos.y}%`, color: sh.c, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                onPointerDown={(e) => {
                  if (!editing) return
                  e.stopPropagation()
                  if (tool === 'erase') eraseShape(i)
                  else if (tool === 'text') { e.preventDefault(); setTextDraft({ i, x: sh.x, y: sh.y, value: sh.text }) }
                  else if (tool === 'move') setDrag({ kind: 'text', i, x: sh.x, y: sh.y })
                }}
              >
                {sh.text}
              </span>
            )
          })}
          {editing && textDraft && (
            <input
              autoFocus
              value={textDraft.value}
              placeholder="type…"
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-ink/95 border border-teal rounded-md px-1.5 py-0.5 text-sm font-semibold outline-none min-w-[110px] w-44 z-20"
              style={{ left: `${textDraft.x}%`, top: `${textDraft.y}%`, color }}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onBlur={() => {
                const v = textDraft.value.trim()
                const i = textDraft.i
                setTextDraft(null)
                if (i == null) {
                  if (v) onChange({ ...seg, draw: [...draw, { t: 'text', x: textDraft.x, y: textDraft.y, text: v, c: color }] })
                } else {
                  onChange({ ...seg, draw: v ? draw.map((d, j) => (j === i ? { ...d, text: v } : d)) : draw.filter((_, j) => j !== i) })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') e.target.blur()
              }}
            />
          )}
          {pins.map((p, i) => {
            const interactive = !editing || tool === 'erase' || tool === 'pin' || tool === 'move'
            const dpos = drag && drag.kind === 'pin' && drag.i === i ? drag : p
            return (
              <span
                key={i}
                className={`absolute -ml-4 -mt-4 group ${interactive ? '' : 'pointer-events-none'}`}
                style={{ left: `${dpos.x}%`, top: `${dpos.y}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (!editing) return
                  if (tool === 'erase') delPin(i)
                  else if (tool === 'move') setDrag({ kind: 'pin', i, x: p.x, y: p.y })
                }}
              >
                <span className={`w-8 h-8 rounded-full bg-teal text-ink font-bold text-base flex items-center justify-center border-2 border-cream shadow-lg select-none ${editing && tool === 'erase' ? 'cursor-pointer ring-2 ring-danger' : ''} ${editing && tool === 'move' ? 'cursor-move ring-2 ring-teal-light' : ''}`}>
                  {i + 1}
                </span>
                {p.text && (
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[240px] px-2.5 py-1.5 rounded-lg bg-ink border border-teal/50 text-cream text-xs leading-snug shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    {p.text}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        </div>
      ) : (
        editing && <div className="text-sm text-silver/60 italic">No map yet — upload one below.</div>
      )}
      {editing && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="btn btn-ghost text-xs cursor-pointer">
            {src ? 'Replace image' : 'Upload map image'}
            <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
          </label>
          {src && (
            <>
              <span className="text-xs text-silver/70">
                Pick a tool above — Marker drops numbered notes, Text writes on the map, the rest draw.
              </span>
              <button className="btn btn-ghost text-xs" onClick={() => onChange({ ...seg, image: null, pins: [], draw: [] })}>
                Remove image
              </button>
            </>
          )}
        </div>
      )}
      {pins.length > 0 && (
        <div className="space-y-1">
          {pins.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-teal text-ink font-bold text-[11px] flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {editing ? (
                <>
                  <Field value={p.text} placeholder="what happens here…" className="flex-1" onCommit={(v) => setPin(i, v)} />
                  <button className="text-danger/80 hover:text-danger px-1" onClick={() => delPin(i)}>
                    ✕
                  </button>
                </>
              ) : (
                <span className="text-cream/90">{p.text || <span className="text-silver/50 italic">…</span>}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentBlock({ seg, i, count, left, editing, icons, comp, open, onToggle, onChange, onMove, onDelete }) {
  const [armDel, setArmDel] = useState(false)
  return (
    <div>
      <div
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
          open ? 'bg-teal-deep/20 border-teal/50' : 'bg-ink/40 border-teal-deep/25 hover:border-teal/40'
        }`}
      >
        {editing ? (
          <select className={selCls} value={seg.kind} onChange={(e) => onChange({ ...seg, kind: e.target.value })}>
            <option value="boss">boss</option>
            <option value="event">event</option>
            <option value="transition">transition</option>
          </select>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider shrink-0 ${KIND_STYLE[seg.kind] || KIND_STYLE.event}`}
          >
            {seg.kind}
          </span>
        )}
        {editing ? (
          <Field value={seg.name} className="flex-1 font-semibold" onCommit={(v) => onChange({ ...seg, name: v })} />
        ) : (
          <button className="font-semibold text-cream flex-1 text-left" onClick={onToggle}>
            {seg.name}
          </button>
        )}
        <span className="text-sm text-silver shrink-0 flex items-center gap-1">
          max{' '}
          {editing ? (
            <TimeField seconds={seg.target} onCommit={(v) => onChange({ ...seg, target: v })} />
          ) : (
            <span className="font-display text-base text-cream">{fmt(seg.target)}</span>
          )}
        </span>
        <span className="text-sm shrink-0 w-20 text-right">
          <span className="text-silver">left </span>
          <span className={`font-display text-base ${left != null && left < 0 ? 'text-danger' : 'text-teal-light'}`}>
            {left == null ? '—' : fmt(Math.max(left, 0))}
          </span>
        </span>
        {editing && (
          <span className="flex items-center gap-0.5 shrink-0">
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
            <button className="px-1 text-silver hover:text-cream disabled:opacity-30" disabled={i === count - 1} onClick={() => onMove(1)}>↓</button>
            <button
              className={`px-1 rounded ${armDel ? 'bg-danger/20 text-danger font-bold' : 'text-danger/70 hover:text-danger'}`}
              title={armDel ? 'Click again to delete this segment' : 'Delete segment'}
              onClick={() => {
                if (!armDel) {
                  setArmDel(true)
                  setTimeout(() => setArmDel(false), 3000)
                  return
                }
                onDelete()
              }}
            >
              {armDel ? 'Sure?' : '✕'}
            </button>
          </span>
        )}
        <button className="text-silver/60 px-1" onClick={onToggle} title={editing ? 'Open to edit strategy, map & notes' : ''}>
          {open ? '▾' : '▸'}
        </button>
      </div>
      {open && (
        <div className="mt-1.5 ml-2 bg-ink/50 border border-teal-deep/25 rounded-xl p-4 space-y-3">
          <StrategyImage seg={seg} editing={editing} onChange={onChange} />
          {editing ? (
            <Field
              textarea
              value={seg.strategy}
              placeholder="Strategy notes for this segment… (you can use {Quickness} {Poison} icon tokens)"
              className="w-full min-h-[70px]"
              onCommit={(v) => onChange({ ...seg, strategy: v })}
            />
          ) : (
            seg.strategy && (
              <div className="text-sm text-cream/90 leading-relaxed">
                <NotesText text={seg.strategy} icons={icons} />
              </div>
            )
          )}
          {!editing && seg.duties?.length > 0 && (
            <div className="space-y-1">
              {seg.duties.map((d, j) => {
                const slot = comp?.[d.slot]
                return (
                  <div key={j} className="flex items-center gap-2 text-sm">
                    {slot && <RoleChip role={slot.role} />}
                    {slot?.build && <BuildChip name={slot.build} icons={icons} className="text-cream/90" />}
                    <span className="text-silver">→ {d.duty}</span>
                  </div>
                )
              })}
            </div>
          )}
          {!editing && !seg.strategy && !seg.image && !(seg.duties?.length > 0) && (
            <div className="text-sm text-silver/70 italic">Strategy not written yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

function WingDetail({ pub, override, icons, builds, players, onBack, onSaveOverride, onClearOverride }) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(null)
  const [armReset, setArmReset] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const w = override || pub

  const update = (patch) => {
    const next = { ...w, ...patch }
    if (!saveOverridesFor(pub.id, next)) {
      setSaveError(true)
      return
    }
    setSaveError(false)
    onSaveOverride(pub.id, next)
  }
  // saved via parent; helper checks quota
  function saveOverridesFor(id, wing) {
    const all = loadOverrides()
    all[id] = wing
    return saveOverrides(all)
  }

  const startEditing = () => {
    if (!override) {
      const seeded = { ...pub, comp: pub.comp?.length === 10 ? pub.comp : emptyComp() }
      update(seeded)
    } else if (!(w.comp?.length === 10)) {
      update({ comp: emptyComp() })
    }
    setEditing(true)
  }

  const setSeg = (idx, seg) => update({ segments: w.segments.map((s, j) => (j === idx ? seg : s)) })
  const moveSeg = (idx, dir) => {
    const segs = [...w.segments]
    const [x] = segs.splice(idx, 1)
    segs.splice(idx + dir, 0, x)
    update({ segments: segs })
  }
  const delSeg = (idx) => update({ segments: w.segments.filter((_, j) => j !== idx) })
  const addSeg = () =>
    update({
      segments: [
        ...w.segments,
        { id: `seg_${Date.now()}`, name: 'New segment', kind: 'event', target: null, image: null, strategy: '', pins: [], duties: [] },
      ],
    })

  const exportPlan = () => {
    const all = loadOverrides()
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), wings: all }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kp-infallible-plan.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const targets = w.segments.map((s) => s.target)
  const allKnown = targets.length > 0 && targets.every((t) => t != null)
  const planned = targets.reduce((a, t) => a + (t || 0), 0)
  let remaining = w.timeLimit
  const status = STATUS_STYLE[w.status] || STATUS_STYLE.planning
  const comp = w.comp?.length === 10 ? w.comp : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn btn-ghost text-sm" onClick={onBack}>
          ← All wings
        </button>
        <div className="flex items-center gap-2">
          {override && (
            <>
              <button className="btn btn-ghost text-xs" onClick={exportPlan} title="Download your local plan as JSON — send it to publish it for the whole squad">
                ⬇ Export plan
              </button>
              <button
                className={`btn text-xs ${armReset ? 'bg-danger/20 border border-danger text-danger font-semibold' : 'btn-ghost'}`}
                onClick={() => {
                  if (!armReset) {
                    setArmReset(true)
                    setTimeout(() => setArmReset(false), 3500)
                    return
                  }
                  setArmReset(false)
                  onClearOverride(pub.id)
                  setEditing(false)
                }}
              >
                {armReset ? 'Sure? This deletes your local edits' : 'Reset to published'}
              </button>
            </>
          )}
          <button className={`btn text-sm ${editing ? 'btn-primary' : 'btn-ghost'}`} onClick={() => (editing ? setEditing(false) : startEditing())}>
            {editing ? '✓ Done editing' : '✎ Edit plan'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="text-xs px-3 py-2 rounded-xl border border-danger/40 bg-danger/10 text-danger">
          Could not save the last change — the image is too large for browser storage. Use a smaller screenshot (or remove the image), then try again.
        </div>
      )}
      {override && (
        <div className="text-xs px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200">
          This plan has local edits saved on <b>this device only</b>. Use <b>Export plan</b> and send the file to publish it for the whole squad.
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-teal-light">{w.short}</span>
            <span className="font-display text-2xl text-cream">{w.name}</span>
            {editing ? (
              <select className={selCls} value={w.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="planning">Planning</option>
                <option value="practicing">Practicing</option>
                <option value="done">Done</option>
              </select>
            ) : (
              <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${status.cls}`}>
                {status.label}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-silver">Time limit</div>
            <div className="font-display text-3xl text-cream">{fmt(w.timeLimit)}</div>
          </div>
        </div>
        <div className="text-sm text-silver mb-2">⏱ {w.timerTrigger}</div>
        {w.cms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {w.cms.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs">
                {c} required
              </span>
            ))}
          </div>
        )}
        {allKnown && (
          <div className="mt-3 text-sm">
            <span className="text-silver">Planned total </span>
            <span className="font-semibold text-cream">{fmt(planned)}</span>
            <span className={planned <= w.timeLimit ? 'text-emerald-300' : 'text-danger'}>
              {' '}
              ({planned <= w.timeLimit ? `${fmt(w.timeLimit - planned)} slack` : `${fmt(planned - w.timeLimit)} OVER`})
            </span>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="font-display text-xl text-cream mb-3">Squad comp</div>
        {comp ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2].map((g) => (
              <div key={g} className="bg-ink/40 border border-teal-deep/25 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wider text-teal-light/80 mb-2">Subgroup {g}</div>
                <div className="space-y-2">
                  {comp.map((c, i) =>
                    c.sub === g ? (
                      <CompEditorRow
                        key={i}
                        slot={c}
                        editing={editing}
                        builds={builds}
                        players={players}
                        icons={icons}
                        onChange={(slot) => update({ comp: comp.map((x, j) => (j === i ? slot : x)) })}
                      />
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-silver/70 italic">
            Comp not defined yet — hit <b>Edit plan</b> to build it (role, class and player per slot).
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-xl text-cream">Plan — target maximums</div>
          {editing && (
            <button className="btn btn-ghost text-xs" onClick={addSeg}>
              + Add segment
            </button>
          )}
        </div>
        <div className="text-xs text-silver mb-3">
          Budget per segment. "Left" = time remaining on the wing clock if every target is hit.
          {editing ? ' Open a segment (▸) to edit its strategy, map and markers.' : ' Click a segment for strategy, map and duties.'}
        </div>
        <div className="space-y-1.5">
          {w.segments.map((seg, i) => {
            if (seg.target != null && remaining != null) remaining -= seg.target
            const left = seg.target != null && remaining != null ? remaining : null
            if (seg.target == null) remaining = null
            return (
              <SegmentBlock
                key={seg.id || i}
                seg={seg}
                i={i}
                count={w.segments.length}
                left={left}
                editing={editing}
                icons={icons}
                comp={comp}
                open={open === (seg.id || i)}
                onToggle={() => setOpen(open === (seg.id || i) ? null : seg.id || i)}
                onChange={(s) => setSeg(i, s)}
                onMove={(dir) => moveSeg(i, dir)}
                onDelete={() => delSeg(i)}
              />
            )
          })}
        </div>
        {editing ? (
          <Field textarea value={w.notes} placeholder="Wing notes…" className="w-full mt-3" onCommit={(v) => update({ notes: v })} />
        ) : (
          w.notes && <div className="mt-3 text-xs text-silver italic">{w.notes}</div>
        )}
      </div>
    </div>
  )
}

export default function Infallible() {
  const data = useData()
  const [wingId, setWingId] = useState(null)
  const [ovVersion, setOvVersion] = useState(0)
  const inf = data?.infallible
  const overrides = useMemo(() => loadOverrides(), [ovVersion])
  if (!inf) return <div className="card p-10 text-center">No Infallible data.</div>

  const saveOv = () => setOvVersion((v) => v + 1)
  const clearOv = (id) => {
    const all = loadOverrides()
    delete all[id]
    saveOverrides(all)
    setOvVersion((v) => v + 1)
  }

  const pub = inf.wings.find((w) => w.id === wingId)
  if (pub)
    return (
      <WingDetail
        pub={pub}
        override={overrides[pub.id] || null}
        icons={data.icons}
        builds={data.builds?.builds || []}
        players={data.players?.players || []}
        onBack={() => setWingId(null)}
        onSaveOverride={saveOv}
        onClearOverride={clearOv}
      />
    )

  return (
    <div className="space-y-4">
      <Rules overview={inf.overview} />
      <div className="grid md:grid-cols-2 gap-4">
        {inf.wings.map((w) => (
          <WingCard key={w.id} w={overrides[w.id] || w} edited={!!overrides[w.id]} onOpen={() => setWingId(w.id)} />
        ))}
      </div>
    </div>
  )
}
