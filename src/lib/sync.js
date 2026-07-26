// Shared saving. The app reads the repo JSON as the baseline and, if a sync
// endpoint is configured, overlays whatever the squad has saved there.
// With no endpoint configured everything still works, just locally.

let CONFIG = null

export async function syncConfig() {
  if (CONFIG) return CONFIG
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/sync.json`, { cache: 'no-store' })
    CONFIG = r.ok ? await r.json() : { url: '' }
  } catch {
    CONFIG = { url: '' }
  }
  return CONFIG
}

export async function syncEnabled() {
  return !!(await syncConfig()).url
}

const base = async () => (await syncConfig()).url?.replace(/\/$/, '')

// Latest version saved by the squad, or null when nobody saved yet / no endpoint.
export async function fetchShared(key) {
  const b = await base()
  if (!b) return null
  try {
    const r = await fetch(`${b}/doc/${key}`, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// Publishes the document for everybody. Throws with a readable message on failure.
export async function saveShared(key, doc) {
  const b = await base()
  if (!b) throw new Error('Shared saving is not set up yet.')
  const r = await fetch(`${b}/doc/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    throw new Error(`Could not save (${r.status}). ${detail.slice(0, 120)}`)
  }
  return r.json().catch(() => ({ ok: true }))
}
