// Icon helpers: resolve build names -> spec icons, render {Token} notes with game icons.

const ALIASES = [
  ['chrono', 'Chronomancer'], ['firebrand', 'Firebrand'], ['fb', 'Firebrand'],
  ['catalyst', 'Catalyst'], ['cata', 'Catalyst'], ['mecha', 'Mechanist'], ['mech', 'Mechanist'],
  ['virtuoso', 'Virtuoso'], ['virt', 'Virtuoso'], ['scourge', 'Scourge'], ['reaper', 'Reaper'],
  ['herald', 'Herald'], ['scrapper', 'Scrapper'], ['scrp', 'Scrapper'], ['druid', 'Druid'],
  ['deadeye', 'Deadeye'], ['ritualist', 'Ritualist'], ['amalgam', 'Amalgam'], ['evoker', 'Evoker'],
  ['bladesworn', 'Bladesworn'], ['blsw', 'Bladesworn'], ['willbender', 'Willbender'], ['wb', 'Willbender'],
  ['harbinger', 'Harbinger'], ['harb', 'Harbinger'], ['vindicator', 'Vindicator'], ['vindi', 'Vindicator'],
  ['daredevil', 'Daredevil'], ['dar', 'Daredevil'], ['berserker', 'Berserker'], ['zerker', 'Berserker'],
  ['specter', 'Specter'], ['spect', 'Specter'], ['weaver', 'Weaver'], ['tempest', 'Tempest'],
  ['holosmith', 'Holosmith'], ['holo', 'Holosmith'], ['soulbeast', 'Soulbeast'], ['slb', 'Soulbeast'],
  ['mirage', 'Mirage'], ['renegade', 'Renegade'], ['untamed', 'Untamed'], ['dragonhunter', 'Dragonhunter'],
  ['troubadour', 'Troubadour'], ['paragon', 'Paragon'], ['antiquary', 'Antiquary'], ['galeshot', 'Galeshot'],
  ['conduit', 'Conduit'], ['luminary', 'Luminary'], ['spellbreaker', 'Spellbreaker'],
  // professions as fallback
  ['ele', '@Elementalist'], ['necro', '@Necromancer'], ['guardian', '@Guardian'], ['guard', '@Guardian'],
  ['engineer', '@Engineer'], ['engi', '@Engineer'], ['thief', '@Thief'], ['ranger', '@Ranger'],
  ['revenant', '@Revenant'], ['rev', '@Revenant'], ['mesmer', '@Mesmer'], ['warrior', '@Warrior'],
]

export function resolveBuildIcon(buildName, icons) {
  if (!buildName || !icons) return null
  const parts = buildName.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  for (const part of parts) {
    for (const [alias, target] of ALIASES) {
      if (part === alias) {
        if (target.startsWith('@')) return icons.professions?.[target.slice(1)] || null
        return icons.specializations?.[target]?.icon || null
      }
    }
  }
  // substring pass for compound names like "qcatalyst", "quickscrapper", "cwb"
  const joined = buildName.toLowerCase()
  for (const [alias, target] of ALIASES) {
    if (alias.length >= 4 && joined.includes(alias)) {
      if (target.startsWith('@')) return icons.professions?.[target.slice(1)] || null
      return icons.specializations?.[target]?.icon || null
    }
  }
  return null
}

export function BuildChip({ name, icons, className = '' }) {
  const icon = resolveBuildIcon(name, icons)
  if (!name) return null
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {icon && <img src={icon} alt="" className="w-5 h-5 rounded-sm" loading="lazy" />}
      <span>{name}</span>
    </span>
  )
}

export function lookupToken(token, icons) {
  if (!icons) return null
  return (
    icons.boons?.[token] ||
    icons.conditions?.[token] ||
    icons.misc?.[token] ||
    icons.runes?.[token] ||
    icons.sigils?.[token] ||
    null
  )
}

// Renders text with {Token} icon substitutions, e.g. "give {Stability} on greens"
export function NotesText({ text, icons }) {
  if (!text) return null
  const parts = String(text).split(/(\{[^}]+\})/g)
  return (
    <span>
      {parts.map((p, i) => {
        const m = p.match(/^\{([^}]+)\}$/)
        if (!m) return <span key={i}>{p}</span>
        const url = lookupToken(m[1], icons)
        return url ? (
          <img key={i} src={url} alt={m[1]} title={m[1]} className="inline w-4 h-4 mx-0.5 align-text-bottom" loading="lazy" />
        ) : (
          <span key={i} className="text-teal-light">{m[1]}</span>
        )
      })}
    </span>
  )
}
