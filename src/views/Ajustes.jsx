import { useState } from 'react'
import { getGithubCfg, setGithubCfg } from '../lib/store.js'
import { useData } from '../App.jsx'

export default function Ajustes() {
  const { notify } = useData()
  const [cfg, setCfg] = useState(getGithubCfg())
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="font-display text-3xl text-cream mb-1">Ajustes</h1>
        <p className="text-sm text-silver/60">
          Conexión a GitHub para publicar cambios desde la app. El token se guarda solo en este
          navegador.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Usuario/organización (owner)</span>
          <input className="input w-full mt-1" placeholder="ej. killproof" value={cfg.owner || ''} onChange={(e) => set('owner', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Repositorio</span>
          <input className="input w-full mt-1" placeholder="ej. kp-sales-tool" value={cfg.repo || ''} onChange={(e) => set('repo', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Branch</span>
          <input className="input w-full mt-1" placeholder="main" value={cfg.branch || 'main'} onChange={(e) => set('branch', e.target.value.trim())} />
        </label>
        <label className="block text-sm">
          <span className="text-silver/70 font-semibold">Token (fine-grained, permiso Contents: write)</span>
          <input className="input w-full mt-1" type="password" placeholder="github_pat_…" value={cfg.token || ''} onChange={(e) => set('token', e.target.value.trim())} />
        </label>
        <button
          className="btn btn-primary"
          onClick={() => {
            setGithubCfg(cfg)
            notify('Configuración guardada en este navegador')
          }}
        >
          Guardar configuración
        </button>
      </div>

      <div className="card p-5 text-sm text-silver/70 space-y-2">
        <h3 className="font-bold text-cream">¿Cómo genero el token?</h3>
        <p>1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</p>
        <p>2. Repository access: solo el repo de esta app.</p>
        <p>3. Permissions → Contents → Read and write. Nada más.</p>
        <p>4. Copia el token aquí. Cada editor usa el suyo; nunca lo compartas en Discord.</p>
      </div>
    </div>
  )
}
