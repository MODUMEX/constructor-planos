/**
 * Arma un ejemplo de las tres tipologías "variación panel" y lo deja en dos
 * archivos para poder mirarlo: el plano tal como se ve en pantalla y el PDF.
 *
 *   node scripts/empaquetar-prueba.mjs scripts/ejemplo-variacion.tsx .ejemplo.mjs && node .ejemplo.mjs
 *
 * No es una prueba: es para VER. Las medidas son las de la hoja de LEEDER —la
 * accesible de 204 × 180 y las cabinas de 135 de fondo— para poder comparar
 * contra el dibujo original.
 */
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorPlano from '../src/components/EditorPlano'
import { generarPDF } from '../src/exportar/pdf'
import { crearTramos, recesoDe } from '../src/modulacion'
import type { Area, Config, Proyecto, TipologiaId } from '../src/types'

const CLARO = 500
const CABINAS = 4

function config(tipologia: TipologiaId): Config {
  return {
    linea: 'LEEDER',
    modelo: 'M1',
    acabado: 'Laminado Compacto',
    color: 'Blanco',
    montaje: 'PISO_HEADRAIL',
    bisagra: '',
    cerrojo: '',
    herrajeAcabado: 'INOX',
    alturaCm: 180,
    profundidadCm: 135,
    anchoAccesibleCm: 204,
    profundidadAccesibleCm: 180,
    puertaAccesibleCm: 100,
    anchoPilastraCm: 24,
    espesorMm: 12,
    terminacion: 'ZOCLO',
    kap: false,
    orinales: 0,
    mgAlturaCm: 120,
    claroPedidoCm: CLARO,
    cabinasPedidas: CABINAS,
    tipologia,
  } as Config
}

function area(nombre: string, tipologia: TipologiaId): Area {
  const cfg = config(tipologia)
  return { id: 'a-' + tipologia, nombre, piso: '1', config: cfg, tramos: crearTramos(tipologia, CLARO, CABINAS, cfg) }
}

const LAS_TRES: [TipologiaId, string][] = [
  ['MR_PANEL_U', 'Tipo U + movilidad reducida · variación panel'],
  ['MR_PANEL_L', 'Tipo L + movilidad reducida · variación panel'],
  ['MR_PANEL_E', 'Tipo E + movilidad reducida · variación panel'],
]

const proyecto: Proyecto = {
  numero: '9001',
  paisFabricacion: 'CR',
  obra: 'Ejemplo variación panel',
  cliente: 'Modumex',
  ubicacion: 'San José, Costa Rica',
  distribuidor: 'Modumex',
  creadoPor: 'ejemplo',
  areas: LAS_TRES.map(([id, nombre]) => area(nombre, id)),
}

// ---------------------------------------------------------------- el plano
const bloques = proyecto.areas.map((a) => {
  const svg = renderToStaticMarkup(
    createElement(EditorPlano, {
      tramos: a.tramos,
      config: a.config,
      pais: 'CR',
      unidad: 'cm',
      verInodoros: true,
      verCotas: true,
      seleccion: null,
      onSeleccion: () => {},
      onCabinas: () => {},
      onPilastra: () => {},
      onPilastras: () => {},
      onPuerta: () => {},
      onTipoPuerta: () => {},
      onAnchoLibre: () => {},
      onPilastraPmr: () => {},
      onOrinal: () => {},
    } as never),
  )
  const t = a.tramos[0]
  const acc = t.cabinas[0]
  const resumen = [
    `claro ${t.claroCm} cm`,
    `accesible ${acc.anchoCm} × ${a.config.profundidadAccesibleCm} cm`,
    `cabinas ${a.config.profundidadCm} cm de fondo`,
    `receso ${recesoDe(a.config)} cm`,
    `pilastras ${(t.pilastras ?? []).join(' · ')}`,
    t.mensaje,
  ].filter(Boolean).join(' — ')
  return `<section><h2>${a.nombre}</h2><p>${resumen}</p><div class="plano">${svg}</div></section>`
})

writeFileSync(
  'ejemplo-variacion.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Variación panel</title>
<style>
  body { background:#0e1319; color:#e6ebf2; font-family:system-ui,sans-serif; margin:24px; }
  h1 { font-size:20px; } h2 { font-size:15px; margin:0 0 4px; }
  p { color:#93a0b3; font-size:12px; margin:0 0 10px; }
  section { margin-bottom:28px; }
  .plano { background:#131a22; border:1px solid #2a3442; border-radius:10px; padding:10px; }
  .plano svg { width:100%; height:auto; display:block; }
</style></head><body>
<h1>Variación panel — cómo queda en el plano</h1>
${bloques.join('\n')}
</body></html>`,
  'utf8',
)

// ------------------------------------------------------------------ el PDF
const doc = generarPDF(proyecto, '29/09/2026')
writeFileSync('ejemplo-variacion.pdf', Buffer.from(doc.output('arraybuffer')))

console.log('listo: ejemplo-variacion.html y ejemplo-variacion.pdf')
for (const a of proyecto.areas) {
  const t = a.tramos[0]
  console.log(
    `  ${a.nombre}\n    cabinas: ${t.cabinas.map((c) => `${c.tipo} ${c.anchoCm}`).join(' | ')}` +
    `\n    pilastras: ${(t.pilastras ?? []).join(' | ')}  ajuste: ${t.ajuste}`,
  )
}
