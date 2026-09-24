/**
 * El caso real de Dayanna: claro 693 · PMR 159 · 92 · 77 libre · 92 · 3 orinales de 90.
 *
 * Reproduce lo que ella hace en pantalla, en orden: crear el área, quitarle la
 * puerta a la del medio y escribirle las medidas a las cabinas.
 *
 *   npm run probar-caso-693
 */
import {
  crearTramos, reajustarConPuertas, anchoTotal, esEspacioLibre,
  pilastrasParaAncho, arrancaElCuartoPmr,
} from '../src/modulacion'
import { anchoDeOrinal } from '../src/geometria'
import { PILASTRAS_INTERNAS } from '../src/modulador'
import { anchosPilastra } from '../src/catalog'
import type { Cabina, Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const config = {
  tipologia: 'PMR', modelo: 'REFORZADO', linea: 'LEEDER',
  claroCm: 693, profundidadCm: 150, profundidadLugarCm: 255, cantidad: 4, alturaCm: 200,
  puertaCm: 60, puertaAccesibleCm: 90, anchoAccesibleCm: 159, anchoPilastraCm: 24,
  orinales: 3, anchoOrinalCm: 90, montaje: 'PISO_HEADRAIL', color: 'BLANCO',
  acabado: 'Laminado Compacto', terminacion: 'ZOCLO', espesorMm: 12, llevaAccesible: true,
} as unknown as Config

const etiqueta = (c: Cabina) =>
  c.tipo === 'orinal' ? 'orinal' : c.tipo === 'accesible' ? 'PMR' : esEspacioLibre(c) ? 'LIBRE' : 'cabina'

function pintar(t: Tramo, titulo: string) {
  console.log(`\n── ${titulo}`)
  console.log(`   ${t.cabinas.map((c) => `${etiqueta(c)} ${c.anchoCm}`).join('  |  ')}`)
  console.log(`   pilastras ${(t.pilastras ?? []).join(' · ')}`)
  console.log(`   suma ${anchoTotal(t.cabinas).toFixed(1)} · claro ${t.claroCm} · ${t.mensaje ?? ''}`)
}

/** lo que hace la app cuando se toca algo con un hueco en la tira */
function repartir(t: Tramo, cabinas: Cabina[], cambios?: (number | null)[]): Tramo {
  const fijas = Array.from({ length: cabinas.length + 1 }, (_, k) => cambios?.[k] ?? t.pilastras?.[k] ?? null)
  const pedidos = cabinas.map((c) => (c.tipo === 'orinal' ? 90 : null))
  const r = reajustarConPuertas(cabinas, t.claroCm, 1, false, 159, fijas, t.pilastras, pedidos)
  return r ? { ...t, ...r } : t
}

/** lo que hace escribir una medida arriba de la cabina */
function escribirAncho(t: Tramo, indice: number, pedido: number): Tramo {
  const medidas = anchosPilastra(config.modelo).filter((a) => PILASTRAS_INTERNAS.includes(a))
  const anchoPil = (k: number) => t.pilastras?.[k] ?? config.anchoPilastraCm
  const cambios = pilastrasParaAncho(t, indice, pedido, medidas, anchoPil, arrancaElCuartoPmr(t, config))
  const lista: (number | null)[] = []
  for (const c of cambios) lista[c.indice] = c.anchoCm
  return repartir(t, t.cabinas, lista)
}

console.log('LO QUE ELLA QUIERE:   159 | 92 | 77 | 92 | 90 | 90 | 90')

let t = crearTramos('PMR', 693, 4, config, 'CR')[0]
pintar(t, 'al crear el área')

t = repartir(t, t.cabinas.map((c, i) => (i === 2 ? { ...c, puerta: { ...c.puerta, tipo: 'ninguna' as const } } : c)))
pintar(t, 'quitándole la puerta a la del medio')

t = escribirAncho(t, 1, 92)
pintar(t, 'escribiendo 92 en la primera cabina')

t = escribirAncho(t, 3, 92)
pintar(t, 'escribiendo 92 en la última cabina')

console.log('\n── cómo quedó contra lo que ella pidió')
const cadena = t.cabinas.map((c) => (c.tipo === 'orinal' ? anchoDeOrinal(t, t.cabinas.indexOf(c), config.anchoPilastraCm) : c.anchoCm))
console.log(`   ${cadena.map((x) => x.toFixed(1)).join(' | ')}`)
ok(t.cabinas[1].anchoCm === 92, 'la primera cabina mide 92 exacto')
ok(t.cabinas[3].anchoCm === 92, 'la última cabina mide 92 exacto')
// La suma de las CABINAS trae adentro el ajuste de herraje —medio centímetro
// por puerta y por muro—, así que se compara la cadena que se lee en el plano.
const suma = cadena.reduce((s, x) => s + x, 0)
ok(suma <= 693, `la cadena entra en el claro: ${suma.toFixed(1)} de 693`)
ok(t.ajuste !== 'falta', `el ajuste no es "falta": ${t.ajuste}`)

console.log('\n── y no crece al re-modular una y otra vez')
const antes = anchoTotal(t.cabinas)
for (let i = 0; i < 10; i++) t = repartir(t, t.cabinas)
ok(Math.abs(anchoTotal(t.cabinas) - antes) < 0.05, `tras 10 pasadas sigue en ${anchoTotal(t.cabinas).toFixed(1)}`)

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
