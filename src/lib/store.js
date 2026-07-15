// Carga de datos: JSON base del repo + overrides locales (localStorage).
// Guardado global: GitHub Contents API (token del editor) o export manual.

const LS_PREFIX = 'kp_data_'
const GH_KEY = 'kp_github_cfg'

export const DATA_FILES = {
  wings: 'data/wings.json',
  players: 'data/players.json',
  events: 'data/events.json',
}

export async function loadData(name) {
  const local = localStorage.getItem(LS_PREFIX + name)
  const base = await fetch(`${import.meta.env.BASE_URL}${DATA_FILES[name]}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  if (local) {
    try {
      return { data: JSON.parse(local), dirty: true, base }
    } catch {
      /* corrupto → usar base */
    }
  }
  return { data: base, dirty: false, base }
}

export function saveLocal(name, data) {
  localStorage.setItem(LS_PREFIX + name, JSON.stringify(data))
}

export function discardLocal(name) {
  localStorage.removeItem(LS_PREFIX + name)
}

export function exportJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---- GitHub ----
export function getGithubCfg() {
  try {
    return JSON.parse(localStorage.getItem(GH_KEY)) || {}
  } catch {
    return {}
  }
}

export function setGithubCfg(cfg) {
  localStorage.setItem(GH_KEY, JSON.stringify(cfg))
}

function b64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

export async function saveToGithub(name, data) {
  const { owner, repo, branch = 'main', token } = getGithubCfg()
  if (!owner || !repo || !token) throw new Error('Configura GitHub en Ajustes primero.')
  // repo con package.json en la raíz → los datos viven en public/
  const path = `public/${DATA_FILES[name]}`
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  }
  // sha actual (si el archivo existe)
  let sha
  const cur = await fetch(`${api}?ref=${branch}`, { headers })
  if (cur.ok) sha = (await cur.json()).sha
  const body = {
    message: `Actualizar ${name}.json desde la app`,
    content: b64(JSON.stringify(data, null, 2)),
    branch,
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error ${res.status} guardando en GitHub`)
  }
  return true
}
