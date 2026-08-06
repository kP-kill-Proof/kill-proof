// Annotated strategy map: upload an image, drop numbered markers, draw
// pen/line/arrow/circle, write text labels and place skill / commander icons.
// Shared by the Infallible plans and the Bible encounter plans.
import { useState } from 'react'
import { Field, selCls } from './ui.jsx'

const DRAW_COLORS = ['#4fb3d4', '#e05252', '#f5b942', '#39c07a', '#f2ead9']
const B = import.meta.env.BASE_URL
export const MAP_ICONS = [
  { id: 'mesmer_portal', name: 'Mesmer Portal (Portal Entre)', url: 'https://render.guildwars2.com/file/BB7D7902B947C52DF3FC340AA66697F0CE669E31/103558.png' },
  { id: 'shadow_portal', name: 'Thief Portal (Prepare Shadow Portal)', url: 'https://render.guildwars2.com/file/D62F215C68C77A2F069238A39FD8A6A135B438C1/2175068.png' },
  { id: 'mass_invis', name: 'Mass Invisibility', url: 'https://render.guildwars2.com/file/E1EB3BC23A10BA9150EF992B03A813F4A26217A8/103755.png' },
  { id: 'mk_arrow', name: 'Marker 1 — Arrow', url: `${B}markers/Commander_arrow_marker.png` },
  { id: 'mk_circle', name: 'Marker 2 — Circle', url: `${B}markers/Commander_circle_marker.png` },
  { id: 'mk_heart', name: 'Marker 3 — Heart', url: `${B}markers/Commander_heart_marker.png` },
  { id: 'mk_square', name: 'Marker 4 — Square', url: `${B}markers/Commander_square_marker.png` },
  { id: 'mk_star', name: 'Marker 5 — Star', url: `${B}markers/Commander_star_marker.png` },
  { id: 'mk_spiral', name: 'Marker 6 — Spiral', url: `${B}markers/Commander_spiral_marker.png` },
  { id: 'mk_triangle', name: 'Marker 7 — Triangle', url: `${B}markers/Commander_triangle_marker.png` },
  { id: 'mk_x', name: 'Marker 8 — X', url: `${B}markers/Commander_x_marker.png` },
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

export const IMG_SIZES = [
  { id: 'sm', label: 'S', px: 380 },
  { id: 'md', label: 'M', px: 600 },
  { id: 'lg', label: 'L', px: 820 },
  { id: 'full', label: 'Full', px: null },
]

export function StrategyImage({ seg, editing, onChange }) {
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
      onChange({ ...seg, pins: [...pins, { x, y, text: '', c: color }] })
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
                <span
                  className={`w-8 h-8 rounded-full text-ink font-bold text-base flex items-center justify-center border-2 border-cream shadow-lg select-none ${editing && tool === 'erase' ? 'cursor-pointer ring-2 ring-danger' : ''} ${editing && tool === 'move' ? 'cursor-move ring-2 ring-teal-light' : ''}`}
                  style={{ background: p.c || '#4fb3d4' }}
                >
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
              <span
                className="w-5 h-5 rounded-full text-ink font-bold text-[11px] flex items-center justify-center shrink-0"
                style={{ background: p.c || '#4fb3d4' }}
              >
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

