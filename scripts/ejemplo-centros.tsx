/**
 * Arma el baño del plano FEDEX GUADALAJARA M1 de dos formas —repartido parejo y
 * modulado desde las descargas— y lo deja en un HTML y un PDF para poder mirarlo.
 *
 *   node scripts/empaquetar-prueba.mjs scripts/ejemplo-centros.tsx .ejcen.mjs && node .ejcen.mjs
 *
 * No es una prueba: es para VER la diferencia. Las medidas son las del plano de
 * agosto de 2026: claro de 4,49 m, cabina de movilidad reducida de 164 cm al
 * arranque y descargas a 2,13 · 3,08 · 4,03 del muro.
 */
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorPlano from '../src/components/EditorPlano'
import { generarPDF } from '../src/exportar/pdf'
import { descargasDe, tramoDesdeCentros } from '../src/descargas'
import { crearTramos } from '../src/modulacion'
import type { Area, Config, Proyecto, Tramo } from '../src/types'

const CLARO = 449
const CABINAS = 4
const CENTROS = [null, 213, 308, 403]

const config: Config = {
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
  anchoAccesibleCm: 164,
  profundidadAccesibleCm: 180,
  puertaAccesibleCm: 90,
  anchoPilastraCm: 24,
  espesorMm: 12,
  terminacion: 'ZOCLO',
  kap: false,
  orinales: 0,
  mgAlturaCm: 120,
  claroPedidoCm: CLARO,
  cabinasPedidas: CABINAS,
  usaCentrosCarga: true,
  tipologia: 'MR_PANEL_U',
} as Config

function conCentros(): Tramo {
  const t = crearTramos('MR_PANEL_U', CLARO, CABINAS, config)[0]
  return { ...t, centrosCm: CENTROS }
}

const parejo = conCentros()
const acomodado = (() => {
  const r = tramoDesdeCentros(parejo, config)
  if (!r) throw new Error('no moduló')
  return { ...parejo, cabinas: r.cabinas, pilastras: r.pilastras, ajuste: r.ajuste, mensaje: r.mensaje }
})()

function area(id: string, nombre: string, tramo: Tramo, cfg: Config = config): Area {
  return { id, nombre, piso: '1', config: cfg, tramos: [tramo] }
}

// ------------------------------------------------------- baños con orinales
// El campo de orinales no lleva puerta ni pilastra: entre dos va una mampara,
// así que el ancho de cada lugar sale DIRECTO de las descargas.
const CON_ORINALES: Config = {
  ...config,
  tipologia: 'RECTA_ENTRE_MUROS',
  anchoAccesibleCm: 150,
  profundidadAccesibleCm: undefined,
  orinales: 3,
  anchoOrinalCm: 60,
  claroPedidoCm: 500,
  cabinasPedidas: 2,
  usaCentrosCarga: true,
}

const mixto = (() => {
  const t = crearTramos('RECTA_ENTRE_MUROS', 500, 2, CON_ORINALES)[0]
  return { ...t, centrosCm: [50, 145, 250, 330, 420] }
})()

const mixtoAcomodado = (() => {
  const r = tramoDesdeCentros(mixto, CON_ORINALES)
  if (!r) throw new Error('el área con orinales no moduló')
  console.log('  orinales pedidos:', (r.anchosOrinal ?? []).join(' · '))
  return { ...mixto, cabinas: r.cabinas, pilastras: r.pilastras, ajuste: r.ajuste, mensaje: r.mensaje }
})()

const proyecto: Proyecto = {
  numero: '9002',
  paisFabricacion: 'MX',
  obra: 'FEDEX Guadalajara',
  cliente: 'Constructora HFC',
  ubicacion: 'Guadalajara, Jalisco, México',
  distribuidor: 'Modumex',
  creadoPor: 'ejemplo',
  areas: [
    area('a-parejo', 'Repartido parejo · las descargas no calzan', parejo),
    area('a-centros', 'Modulado desde los centros de carga', acomodado),
    area('a-orinales', 'Baños + orinales, todo desde los centros', mixtoAcomodado, CON_ORINALES),
  ],
}

const bloques = proyecto.areas.map((a) => {
  const svg = renderToStaticMarkup(
    createElement(EditorPlano, {
      tramos: a.tramos,
      config: a.config,
      pais: 'MX',
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
  const d = descargasDe(t, a.config)
  const resumen = [
    `claro ${t.claroCm} cm`,
    `cabinas ${t.cabinas.map((c) => c.anchoCm).join(' · ')}`,
    `pilastras ${(t.pilastras ?? []).join(' · ')}`,
    `puertas ${t.cabinas.map((c) => c.puerta.anchoCm).join(' · ')}`,
  ].join(' — ')
  const filas = d
    .map((x) => `cabina ${x.indice + 1}: descarga a ${x.realCm} cm — le queda ${x.izqCm} a la izquierda y ${x.derCm} a la derecha${x.aviso ? ' ⚠ ' + x.aviso : ''}`)
    .join('<br>')
  return `<section><h2>${a.nombre}</h2><p>${resumen}</p><p class="det">${filas}</p><div class="plano">${svg}</div></section>`
})

writeFileSync(
  'ejemplo-centros.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Centros de carga</title>
<style>
  body { background:#0e1319; color:#e6ebf2; font-family:system-ui,sans-serif; margin:24px; }
  h1 { font-size:20px; } h2 { font-size:15px; margin:0 0 4px; }
  p { color:#93a0b3; font-size:12px; margin:0 0 10px; }
  p.det { color:#c3cede; font-size:11px; line-height:1.6; }
  section { margin-bottom:28px; }
  .plano { background:#131a22; border:1px solid #2a3442; border-radius:10px; padding:10px; }
  .plano svg { width:100%; height:auto; display:block; }
</style></head><body>
<h1>Centros de carga — el baño del plano FEDEX Guadalajara M1</h1>
${bloques.join('\n')}
</body></html>`,
  'utf8',
)

const doc = generarPDF(proyecto, '30/09/2026')
writeFileSync('ejemplo-centros.pdf', Buffer.from(doc.output('arraybuffer')))

console.log('listo: ejemplo-centros.html y ejemplo-centros.pdf')
for (const a of proyecto.areas) {
  const t = a.tramos[0]
  console.log(`  ${a.nombre}`)
  console.log(`    cabinas: ${t.cabinas.map((c) => `${c.tipo} ${c.anchoCm}`).join(' | ')}`)
  console.log(`    pilastras: ${(t.pilastras ?? []).join(' | ')}   ajuste: ${t.ajuste}`)
  for (const d of descargasDe(t, a.config)) {
    console.log(`    descarga ${d.realCm}: izq ${d.izqCm} der ${d.derCm} desvío ${d.desvioCm}${d.aviso ? '  AVISO: ' + d.aviso : ''}`)
  }
}
