/**
 * Las tres formas de reforzar una pilastra de punta grande, dibujadas.
 *
 *   node scripts/empaquetar-prueba.mjs scripts/ejemplo-soportes.tsx .ejsop.mjs && node .ejsop.mjs
 *
 * No es una prueba: es para VER que cada una se dibuje como en los planos de
 * Modumex —la costilla de canto, el refuerzo en diagonal a la pared y el
 * sándwich con su herraje en T—.
 */
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorPlano from '../src/components/EditorPlano'
import { generarPDF } from '../src/exportar/pdf'
import { crearTramos, soportesDe } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import type { Area, Config, Proyecto, Soporte, Tramo } from '../src/types'

const config: Config = {
  linea: 'LEEDER', modelo: 'REFORZADO', acabado: 'Laminado Compacto', color: 'Blanco',
  montaje: 'PISO_HEADRAIL', bisagra: '', cerrojo: '', herrajeAcabado: 'INOX',
  alturaCm: 200, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 24,
  espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
  claroPedidoCm: 370, cabinasPedidas: 3, tipologia: 'RECTA_MURO_IZQ', puertaCm: 60,
} as unknown as Config

const base = crearTramos('RECTA_MURO_IZQ', 370, 3, config, 'CR')[0]
/** la pilastra CONTRA EL MURO se agranda a 100 para que pida refuerzo */
const conPunta: Tramo = { ...base, pilastras: [100, 24, 24, 19] }

const CASOS: [Soporte, string][] = [
  ['costilla', 'Costilla de 19 — la que sale por defecto'],
  ['refuerzo', 'Refuerzo — la diagonal de la pilastra a la pared'],
  ['sandwich', 'Sándwich — segunda pilastra de 24 con herraje en T'],
]

function area(tipo: Soporte, nombre: string): Area {
  const t: Tramo = { ...conPunta, soportes: [tipo, null, null, null] }
  return { id: 'a-' + tipo, nombre, piso: '1', config, tramos: [t] }
}

const proyecto: Proyecto = {
  numero: '9003', paisFabricacion: 'CR', obra: 'Ejemplo de refuerzos',
  cliente: 'Modumex', ubicacion: 'San José', distribuidor: 'Modumex', creadoPor: 'ejemplo',
  areas: CASOS.map(([tipo, nombre]) => area(tipo, nombre)),
}

const bloques = proyecto.areas.map((a) => {
  const svg = renderToStaticMarkup(createElement(EditorPlano, {
    tramos: a.tramos, config: a.config, pais: 'CR', unidad: 'cm',
    verInodoros: true, verCotas: true, seleccion: null,
    onSeleccion: () => {}, onCabinas: () => {}, onPilastra: () => {}, onPilastras: () => {},
    onPuerta: () => {}, onTipoPuerta: () => {}, onAnchoLibre: () => {}, onPilastraPmr: () => {},
    onOrinal: () => {}, onLateralMr: () => {}, onSoporte: () => {},
  } as never))
  const s = soportesDe(a.tramos[0], a.config)[0]
  const pl = piezasDeArea(a).filter((p) => p.familia === 'PL').map((p) => `${p.subTipo} ${p.anchoCm}`)
  return `<section><h2>${a.nombre}</h2><p>pieza: ${s.anchoCm > 0 ? `${s.anchoCm} cm` : 'ninguna, va en los herrajes'} — despiece PL: ${pl.join(' · ')}</p><div class="plano">${svg}</div></section>`
})

writeFileSync('ejemplo-soportes.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Refuerzos</title>
<style>
  body { background:#0e1319; color:#e6ebf2; font-family:system-ui,sans-serif; margin:24px; }
  h1 { font-size:20px; } h2 { font-size:15px; margin:0 0 4px; }
  p { color:#93a0b3; font-size:12px; margin:0 0 10px; }
  section { margin-bottom:28px; }
  .plano { background:#131a22; border:1px solid #2a3442; border-radius:10px; padding:10px; }
  .plano svg { width:100%; height:auto; display:block; }
</style></head><body>
<h1>Refuerzo de una pilastra de punta de 100 cm</h1>
${bloques.join('\n')}
</body></html>`, 'utf8')

writeFileSync('ejemplo-soportes.pdf', Buffer.from(generarPDF(proyecto, '01/10/2026').output('arraybuffer')))
console.log('listo: ejemplo-soportes.html y ejemplo-soportes.pdf')
