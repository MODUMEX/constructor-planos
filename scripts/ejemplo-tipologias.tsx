/**
 * Dibuja las tarjetas de TODAS las tipologías en un HTML, para poder mirarlas
 * sin abrir la app.
 *
 *   node scripts/empaquetar-prueba.mjs scripts/ejemplo-tipologias.tsx .ejtip.mjs && node .ejtip.mjs
 *
 * No es una prueba: es para VER que cada esquema diga lo que tiene que decir
 * —dónde va el claro, dónde la profundidad, de qué pieza cuelga cada puerta y
 * cuánto abre—.
 */
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PreviewTipologia from '../src/components/PreviewTipologia'
import { TIPOLOGIAS } from '../src/catalog'

const tarjetas = TIPOLOGIAS.map((t) => {
  const svg = renderToStaticMarkup(createElement(PreviewTipologia, { id: t.id, size: 300 }))
  return `<figure><div class="esquema">${svg}</div><figcaption><b>${t.nombre}</b><span>${t.id}</span></figcaption></figure>`
}).join('\n')

writeFileSync(
  'ejemplo-tipologias.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tipologías</title>
<style>
  body { background:#0e1319; color:#e6ebf2; font-family:system-ui,sans-serif; margin:24px; }
  h1 { font-size:20px; }
  .grilla { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; }
  figure { margin:0; background:#131a22; border:1px solid #2a3442; border-radius:12px; overflow:hidden; }
  .esquema { background:#fff; padding:8px; }
  .esquema svg { width:100%; height:auto; display:block; }
  figcaption { padding:10px 12px; display:flex; flex-direction:column; gap:3px; }
  figcaption b { font-size:13px; }
  figcaption span { font-size:11px; color:#8b9bb0; }
</style></head><body>
<h1>Tipologías — cómo quedan las tarjetas</h1>
<div class="grilla">
${tarjetas}
</div>
</body></html>`,
  'utf8',
)

console.log(`listo: ejemplo-tipologias.html (${TIPOLOGIAS.length} tarjetas)`)
