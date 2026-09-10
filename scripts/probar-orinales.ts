/**
 * Comprueba que un área de solo orinales sale del buscador de modulación:
 * pilastra de catálogo contra el muro, mingitorio MG entre orinal y orinal y
 * uno más cerrando el extremo que no tiene muro.
 *   npx esbuild scripts/probar-orinales.ts --bundle --platform=node --format=esm --outfile=.orinales.mjs && node .orinales.mjs
 */
import { crearTramos, nuevoId } from '../src/modulacion'
import { piezasDeArea } from '../src/exportar/piezas'
import { espesorPorLinea } from '../src/catalog'
import type { Area, Config } from '../src/types'

const cfg: Config = {
  linea: 'LEEDER',
  modelo: 'ESTANDAR',
  acabado: 'Laminado Compacto',
  color: 'BLANCO',
  montaje: 'PISO_HEADRAIL',
  bisagra: 'GRAV',
  cerrojo: 'IND',
  herrajeAcabado: 'NEGRO',
  alturaCm: 150,
  profundidadCm: 150,
  anchoAccesibleCm: 150,
  anchoPilastraCm: 15,
  espesorMm: espesorPorLinea('LEEDER'),
  terminacion: 'ZOCLO',
  kap: false,
  orinales: 0,
  mgAlturaCm: 120,
  tipologia: 'ORINALES',
}

let fallas = 0
for (const n of [2, 3, 4, 5]) {
  const tramos = crearTramos('ORINALES', 0, n, cfg)
  const t = tramos[0]
  const area: Area = { id: nuevoId('area'), nombre: 'Orinales', piso: 'Planta baja', config: cfg, tramos }
  const piezas = piezasDeArea(area)
  const pl = piezas.filter((p) => p.familia === 'PL')
  const mg = piezas.filter((p) => p.familia === 'MG')
  const pn = piezas.filter((p) => p.familia === 'PN')

  console.log(`${n} orinales · claro ${t.claroCm.toFixed(2)} cm · pilastras [${(t.pilastras ?? []).join(', ')}]`)
  console.log(`  cabinas: ${t.cabinas.map((c) => `${c.tipo} ${c.anchoCm}`).join(', ')}`)
  console.log(`  PL: ${pl.map((p) => `${p.subTipo} ${p.anchoCm}`).join(', ') || '—'}`)
  console.log(`  MG: ${mg.length}   PN: ${pn.length}`)

  const problemas: string[] = []
  // La tira arranca contra muro y termina en un extremo abierto: ahí cierra con
  // mingitorio, no con pilastra. Queda una sola pilastra, la del muro.
  if (pl.length !== 1) problemas.push(`se esperaba 1 pilastra (la del muro), salieron ${pl.length}`)
  // N−1 mingitorios entre los orinales y 1 más cerrando el extremo sin muro
  if (mg.length !== n) problemas.push(`se esperaban ${n} mingitorios MG, salieron ${mg.length}`)
  if (pn.length !== 0) problemas.push(`los orinales no llevan panel de cabina, salieron ${pn.length}`)
  if (piezas.some((p) => p.familia === 'PT')) problemas.push('los orinales no llevan puerta')
  const catalogo = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120]
  for (const p of pl) if (!catalogo.includes(p.anchoCm)) problemas.push(`pilastra de ${p.anchoCm} cm no está en el catálogo`)

  if (problemas.length) {
    fallas += 1
    for (const p of problemas) console.log(`  ✗ ${p}`)
  } else {
    console.log('  → correcto')
  }
  console.log('')
}

console.log(fallas === 0 ? 'todos los casos correctos' : `${fallas} caso(s) con problemas`)
if (fallas) process.exit(1)
