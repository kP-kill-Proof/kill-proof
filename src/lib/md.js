// Mini-renderizador de markdown (suficiente para guidelines.md: h1/h2, listas, tablas, negrita, código)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderMd(src) {
  const lines = src.split(/\r?\n/)
  const out = []
  let list = null // 'ul' | 'ol'
  let table = null

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }
  const closeTable = () => { if (table) { out.push('</tbody></table>'); table = null } }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (cells.every((c) => /^-+$/.test(c))) continue // separador
      if (!table) {
        closeList()
        table = { header: true }
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>')
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
      }
      continue
    }
    closeTable()

    let m
    if ((m = line.match(/^#{1}\s+(.*)/))) { closeList(); out.push(`<h1>${inline(m[1])}</h1>`); continue }
    if ((m = line.match(/^#{2,3}\s+(.*)/))) { closeList(); out.push(`<h2>${inline(m[1])}</h2>`); continue }
    if ((m = line.match(/^[-*]\s+(.*)/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' }
      out.push(`<li>${inline(m[1])}</li>`); continue
    }
    if ((m = line.match(/^\d+\.\s+(.*)/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol' }
      out.push(`<li>${inline(m[1])}</li>`); continue
    }
    closeList()
    if (line.trim() === '') continue
    out.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  closeTable()
  return out.join('\n')
}
