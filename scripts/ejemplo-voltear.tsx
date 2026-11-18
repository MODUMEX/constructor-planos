/**
 * El mismo baño dibujado de las dos formas: como siempre y VOLTEADO, con la
 * pared de fondo abajo y las cabinas mirando hacia arriba.
 *
 *   npm run ejemplo-voltear
 *
 * No es una prueba: es para VER que las dos salgan bien, porque voltear toca
 * los dos dibujantes —la pantalla y el PDF— y cada uno tiene su propia forma
 * de girar las cosas. Lo que hay que mirar en el PDF:
 *
 *   · el inodoro apoyado contra la pared de abajo y mirando hacia arriba,
 *     dentro de su cabina y no encima del muro;
 *   · el arco de la puerta barriendo hacia el mismo lado que la hoja;
 *   · las dos cadenas de cotas, la de las piezas y la del claro, una a cada
 *     lado del dibujo.
 *
 * Deja `ejemplo-voltear.pdf` y `ejemplo-voltear.html` al lado del proyecto.
 */
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorPlano from '../src/components/EditorPlano'
import { generarPDF } from '../src/exportar/pdf'
import { crearTramos, nuevoId } from '../src/modulacion'
import { espesorPorLinea } from '../src/catalog'
import type { Area, Config, Proyecto } from '../src/types'

const CLARO = 420
const CABINAS = 4

function cfg(muroAbajo: boolean): Config {
  return {
    linea: 'LEEDER', modelo: 'ESTANDAR', acabado: 'Laminado Compacto', color: 'BLANCO',
    montaje: 'PISO_HEADRAIL', bisagra: 'GRAV', herrajeAcabado: 'NEGRO',
    alturaCm: 150, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 15,
    espesorMm: espesorPorLinea('LEEDER'), terminacion: 'ZOCLO', kap: false,
    orinales: 0, mgAlturaCm: 120, tipologia: 'RECTA_MURO_IZQ', muroAbajo,
  } as Config
}

const areas: Area[] = [false, true].map((voltear) => {
  const c = cfg(voltear)
  return {
    id: nuevoId('area'),
    nombre: voltear ? 'Con la pared abajo' : 'Como siempre',
    piso: '1',
    config: c,
    tramos: crearTramos('RECTA_MURO_IZQ', CLARO, CABINAS, c),
  }
})

const proyecto: Proyecto = {
  numero: '9004', paisFabricacion: 'CR', obra: 'Voltear el plano', cliente: 'Interno',
  ubicacion: 'San José', distribuidor: 'Modumex', creadoPor: 'ejemplo', areas,
} as unknown as Proyecto

const doc = generarPDF(proyecto, '18/11/2026')
writeFileSync('ejemplo-voltear.pdf', Buffer.from(doc.output('arraybuffer')))

const bloques = areas.map((a) => {
  const svg = renderToStaticMarkup(
    createElement(EditorPlano, {
      tramos: a.tramos, config: a.config, pais: 'CR', unidad: 'cm',
      verInodoros: true, verCotas: true, seleccion: null,
      onSeleccion: () => {}, onCabinas: () => {}, onPilastra: () => {}, onPilastras: () => {},
      onPuerta: () => {}, onTipoPuerta: () => {}, onAnchoLibre: () => {},
      onPilastraPmr: () => {}, onOrinal: () => {},
    } as never),
  )
  return `<section><h2>${a.nombre}</h2><div class="plano">${svg}</div></section>`
})

writeFileSync(
  'ejemplo-voltear.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Voltear el plano</title>
<style>
  body { background:#0e1319; color:#e6ebf2; font-family:system-ui,sans-serif; margin:24px; }
  h2 { font-size:15px; margin:0 0 6px; }
  section { margin-bottom:28px; }
  .plano { background:#131a22; border:1px solid #2a3442; border-radius:10px; padding:10px; }
  .plano svg { width:100%; height:auto; display:block; }
</style></head><body>
<h1 style="font-size:20px">El mismo baño, derecho y volteado</h1>
${bloques.join('\n')}
</body></html>`,
  'utf8',
)

console.log('listo: ejemplo-voltear.pdf y ejemplo-voltear.html')
