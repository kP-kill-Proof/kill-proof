// Read-only data layer. All shared data lives in the repo (public/data/*.json)
// and is edited exclusively via Claude or GitHub web — never from the app.
// This makes stale local copies impossible. Day state (checklist, roster of
// the day, discards) is separate and stays in the commander's browser.

export const DATA_FILES = {
  wings: 'data/wings.json',
  players: 'data/players.json',
  events: 'data/events.json',
  comps: 'data/comps.json',
  icons: 'data/icons.json',
  builds: 'data/builds.json',
}

// one-time cleanup of the old editing system's local overrides
export function purgeLegacyLocal() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('kp_data_') || k === 'kp_github_cfg')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

export async function loadData(name) {
  return fetch(`${import.meta.env.BASE_URL}${DATA_FILES[name]}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
}
