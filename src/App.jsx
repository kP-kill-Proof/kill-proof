import { useEffect, useState, createContext, useContext } from 'react'
import { loadData, saveLocal, discardLocal, exportJson, saveToGithub, getGithubCfg } from './lib/store.js'
import SaleDay from './views/SaleDay.jsx'
import Bible from './views/Bible.jsx'
import Roster from './views/Roster.jsx'
import Events from './views/Events.jsx'
import Guidelines from './views/Guidelines.jsx'
import Settings from './views/Settings.jsx'

export const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

const TABS = [
  { id: 'sale', label: "Today's Sale" },
  { id: 'bible', label: 'Bible' },
  { id: 'roster', label: 'Roster' },
  { id: 'events', label: 'Events' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'settings', label: 'Settings' },
]

function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative w-11 h-11 shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-deep via-teal to-silver/60 opacity-80 blur-[1px]" />
        <div className="absolute inset-[3px] rounded-full bg-ink flex items-center justify-center">
          <span className="font-display text-cream text-sm leading-none">KP</span>
        </div>
      </div>
      <div className="leading-tight">
        <div className="font-display text-2xl text-cream tracking-wide drop-shadow-[0_2px_8px_rgba(79,179,212,0.35)]">
          KILL PROOF
        </div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-teal-light/80 -mt-0.5">Sales Tool</div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('sale')
  const [store, setStore] = useState({ wings: null, players: null, events: null })
  const [dirty, setDirty] = useState({})
  const [toast, setToast] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [w, p, e] = await Promise.all([loadData('wings'), loadData('players'), loadData('events')])
      setStore({ wings: w.data, players: p.data, events: e.data })
      setDirty({ wings: w.dirty, players: p.dirty, events: e.dirty })
    })()
  }, [])

  const notify = (msg, kind = 'ok') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3500)
  }

  const update = (name, data) => {
    setStore((s) => ({ ...s, [name]: data }))
    saveLocal(name, data)
    setDirty((d) => ({ ...d, [name]: true }))
  }

  const publish = async (name) => {
    try {
      await saveToGithub(name, store[name])
      discardLocal(name)
      setDirty((d) => ({ ...d, [name]: false }))
      notify(`${name}.json published — site updates in ~1 min`)
    } catch (e) {
      notify(e.message, 'err')
    }
  }

  const ctx = { ...store, dirty, update, publish, exportJson, notify, ghConfigured: !!getGithubCfg().token }

  return (
    <DataCtx.Provider value={ctx}>
      <div className="max-w-5xl mx-auto px-4 pb-24">
        <header className="pt-6 pb-4 flex flex-wrap items-center justify-between gap-4 anim-in">
          <Logo />
          <nav className="flex gap-1 bg-panel/70 border border-teal-deep/30 rounded-2xl p-1.5 backdrop-blur-sm overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-idle'}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {!store.wings ? (
          <div className="card p-10 text-center anim-in">Loading data…</div>
        ) : (
          <main key={tab} className="anim-in">
            {tab === 'sale' && <SaleDay />}
            {tab === 'bible' && <Bible />}
            {tab === 'roster' && <Roster />}
            {tab === 'events' && <Events />}
            {tab === 'guidelines' && <Guidelines />}
            {tab === 'settings' && <Settings />}
          </main>
        )}

        {toast && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl font-semibold shadow-2xl anim-in z-50 ${
              toast.kind === 'err' ? 'bg-danger text-cream' : 'bg-teal text-ink'
            }`}
          >
            {toast.msg}
                    </div>
        )}
      </div>
    </DataCtx.Provider>
  )
}
