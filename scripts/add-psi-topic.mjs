// One-time transform: insert psi_topic and psi_topic_es after topic_es on every question line.
import { readFileSync, writeFileSync } from 'fs'

const FILE = new URL('../src/questions.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const PSI_MAP = {
  'Texas TDLR Laws & Regulations': { en: 'Licensing & Regulation',               es: 'Licencias y Regulaciones' },
  'Sanitation & Infection Control': { en: 'Infection Control',                    es: 'Control de Infecciones' },
  'Hair Care & Chemistry':          { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Scalp & Hair Disorders':         { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Chemical Services':              { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Coloring & Lightening':          { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Haircutting & Styling':          { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Anatomy & Physiology':           { en: 'Hair & Scalp Care',                    es: 'Cuidado del Cabello y Cuero Cabelludo' },
  'Nail Care':                      { en: 'Nail Care',                            es: 'Cuidado de Uñas' },
  'Skin Care & Anatomy':            { en: 'Skin Care',                            es: 'Cuidado de la Piel' },
}

let content = readFileSync(FILE, 'utf8')
let modifiedCount = 0

for (const [topic, psi] of Object.entries(PSI_MAP)) {
  // Match: topic: "TOPIC", topic_es: "ANY_ES_TEXT",
  // Insert psi_topic and psi_topic_es right after topic_es field
  const escaped = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `(topic: "${escaped}", topic_es: "[^"]*"),`,
    'g'
  )
  const replacement = `$1, psi_topic: "${psi.en}", psi_topic_es: "${psi.es}",`
  const before = content
  content = content.replace(re, replacement)
  const hits = (before.match(re) || []).length
  modifiedCount += hits
  console.log(`  ${topic} → ${psi.en} (${hits} questions)`)
}

writeFileSync(FILE, content, 'utf8')
console.log(`\nDone. Modified ${modifiedCount} questions.`)
