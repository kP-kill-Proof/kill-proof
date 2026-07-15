import { useEffect, useState } from 'react'
import { renderMd } from '../lib/md.js'

export default function Guidelines() {
  const [html, setHtml] = useState('')
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/guidelines.md`)
      .then((r) => r.text())
      .then((t) => setHtml(renderMd(t)))
      .catch(() => setHtml('<p>No se pudo cargar la guía.</p>'))
  }, [])
  return (
    <div className="card p-6 md:p-8 anim-in">
      <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
