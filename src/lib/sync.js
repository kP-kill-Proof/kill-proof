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
  let r
  try {
    r = await fetch(`${b}/doc/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
  } catch {
    throw new Error(
      'Could not reach the shared storage. The most common cause is the worker missing its KV binding (variable name KP).'
    )
  }
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    throw new Error(`Could not save (${r.status}). ${detail.slice(0, 120)}`)
  }
  return r.json().catch(() => ({ ok: true }))
}

// ---- version history (the worker keeps the last 20 saves of each document) ----
export async function fetchHistory(key) {
  const b = await base()
  if (!b) return []
  try {
    const r = await fetch(`${b}/history/${key}`, { cache: 'no-store' })
    return r.ok ? await r.json() : []
  } catch {
    return []
  }
}

export async function fetchVersion(key, index) {
  const b = await base()
  if (!b) throw new Error('Shared saving is not set up yet.')
  const r = await fetch(`${b}/history/${key}/${index}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Could not read that version (${r.status}).`)
  return r.json()
}
