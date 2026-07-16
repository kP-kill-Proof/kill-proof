import { useState } from 'react'
import { getGithubCfg, setGithubCfg } from '../lib/store.js'
import { useData } from '../App.jsx'

export default function Settings() {
  const { notify } = useData()
  const [cfg, setCfg] = useState(getGithubCfg())
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">Settings</h1>
        <p className="text-sm text-silver/60">
          GitHub connection to publish changes from the app. The token is stored only in this
          browser.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Owner (user/org)</span>
          <input className="input w-full mt-1" placeholder="e.g. HermanGz" value={cfg.owner || ''} onChange={(e) => set('owner', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Repository</span>
          <input className="input w-full mt-1" placeholder="e.g. kp-sales-tool" value={cfg.repo || ''} onChange={(e) => set('repo', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Branch</span>
          <input className="input w-full mt-1" placeholder="main" value={cfg.branch || 'main'} onChange={(e) => set('branch', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Token (fine-grained, Contents: write)</span>
          <input className="input w-full mt-1" type="password" placeholder="github_pat_…" value={cfg.token || ''} onChange={(e) => set('token', e.target.value.trim())} />
        </label>
        <button
          className="btn btn-primary"
          onClick={() => {
            setGithubCfg(cfg)
            notify('Settings saved in this browser')
          }}
        >
          Save settings
        </button>
      </div>

      <div className="card p-5 text-sm text-silver/70 space-y-2">
        <h3 className="font-bold text-cream">How do I create the token?</h3>
        <p>1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</p>
        <p>2. Repository access: only this app's repo.</p>
        <p>3. Permissions → Contents → Read and write. Nothing else.</p>
        <p>4. Paste the token here. Each editor uses their own; never share it on Discord.</p>
      </div>
    </div>
  )
}
