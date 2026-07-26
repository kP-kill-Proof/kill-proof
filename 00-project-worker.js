/**
 * KP Sales Tool — shared storage worker
 *
 * Tiny Cloudflare Worker that lets the app save data everyone can see, with no
 * accounts and no passwords. It stores whole JSON documents by key and keeps
 * the last 20 versions of each one so nothing is ever lost by accident.
 *
 * Endpoints
 *   GET  /doc/plans         -> the stored document (404 if never saved)
 *   PUT  /doc/plans         -> saves the JSON body as the new version
 *   GET  /history/plans     -> list of the stored versions (newest first)
 *   GET  /history/plans/3   -> restores version #3 of that document
 *
 * Setup: bind a KV namespace called KP.
 */

const KEYS = ['plans', 'infallible', 'wings', 'players', 'comps', 'builds']
const MAX_VERSIONS = 20

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
  })

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })

    const url = new URL(request.url)
    const [, section, key, version] = url.pathname.split('/')

    if (!key || !KEYS.includes(key)) return json({ error: 'unknown document' }, 404)

    // ---- read ----
    if (request.method === 'GET') {
      if (section === 'doc') {
        const doc = await env.KP.get(`doc:${key}`)
        return doc ? new Response(doc, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } }) : json({ error: 'not saved yet' }, 404)
      }
      if (section === 'history') {
        const index = JSON.parse((await env.KP.get(`index:${key}`)) || '[]')
        if (version == null || version === '') return json(index)
        const stamp = index[Number(version)]?.at
        if (!stamp) return json({ error: 'no such version' }, 404)
        const old = await env.KP.get(`ver:${key}:${stamp}`)
        return old ? new Response(old, { headers: { 'Content-Type': 'application/json', ...cors } }) : json({ error: 'version gone' }, 404)
      }
      return json({ error: 'unknown route' }, 404)
    }

    // ---- write ----
    if (request.method === 'PUT' && section === 'doc') {
      let body
      try {
        body = await request.text()
        JSON.parse(body) // must be valid JSON, otherwise we would store garbage
      } catch {
        return json({ error: 'body is not valid JSON' }, 400)
      }
      if (body.length > 20 * 1024 * 1024) return json({ error: 'document too large' }, 413)

      const at = new Date().toISOString()
      await env.KP.put(`doc:${key}`, body)
      await env.KP.put(`ver:${key}:${at}`, body, { expirationTtl: 60 * 60 * 24 * 120 })

      const index = JSON.parse((await env.KP.get(`index:${key}`)) || '[]')
      index.unshift({ at, bytes: body.length })
      const dropped = index.splice(MAX_VERSIONS)
      await env.KP.put(`index:${key}`, JSON.stringify(index))
      for (const d of dropped) await env.KP.delete(`ver:${key}:${d.at}`)

      return json({ ok: true, at })
    }

    return json({ error: 'method not allowed' }, 405)
  },
}
