/**
 * El ancho que se escribe arriba de una cabina MANDA.
 *
 * El caso de Dayanna del 23-nov-2026: claro 630 entre muros, siete cabinas con
 * puerta de 64, pilastras 24 · 19 · 24 · 35 · 24 · 24 · 24 · 15. La primera
 * cabina mide 97,5 —la pilastra a muro entera más la puerta más media de la
 * siguiente— y al escribirle 92 la app le devolvía 97,5:
 *
 *   *"no me respeta el tamaño que escribo arriba, por ejemplo pongo 92 y me lo
 *   cambia a 97.5, en lugar de adaptar el resto del claro o piezas para que
 *   calce"*
 *
 * Y tenía razón: con la puerta clavada en 64 y la pilastra a muro clavada en
 * 24, lo único que se movía era media pilastra de la frontera 1, que va de 9,5
 * en 9,5. Ninguna medida de catálogo cae en 92 por ese camino. Con las tres
 * piezas de la cabina en juego sí hay solución, y de sobra.
 *
 *   npm run probar-ancho-escrito
 */
import {
  anchoTotal, arrancaElCuartoPmr, piezasParaAncho, pilastrasParaAncho, reajustarConPuertas,
} from '../src/modulacion'
import { anchosPilastraEn, pilastrasDePunta } from '../src/modulador'
import { anchosPuerta, ANCHOS_PILASTRA, ANCHOS_PUERTA, ANCHOS_PUERTA_CR } from '../src/catalog'
import type { Cabina, Config, Tramo } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`  ${b ? '✓' : '✕'} ${t}`) }

const CLARO = 630
const PILASTRAS = [24, 19, 24, 35, 24, 24, 24, 15]
const PUERTA = 64

const config = {
  tipologia: 'RECTA_ENTRE_MUROS', modelo: 'ESTANDAR', linea: 'LEEDER',
  claroCm: CLARO, profundidadCm: 150, cantidad: 7, alturaCm: 150,
  puertaCm: PUERTA, anchoPilastraCm: 24, orinales: 0,
  montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
  terminacion: 'ZOCLO', espesorMm: 12,
} as unknown as Config

function cabina(anchoCm: number): Cabina {
  return {
    id: `c${anchoCm}-${Math.random().toString(36).slice(2, 7)}`,
    tipo: 'normal',
    anchoCm,
    profundidadCm: 150,
    puerta: { tipo: 'puerta', anchoCm: PUERTA, bisagra: 'izq', abreAdentro: false },
  } as unknown as Cabina
}

/** la tira de la pantalla de Dayanna, con las medidas de su captura */
function tira(): Tramo {
  const anchos = [97.5, 85.5, 93.5, 93.5, 88, 88, 91]
  return {
    id: 'tramo1',
    nombre: 'Baño',
    claroCm: CLARO,
    muroInicio: true,
    muroFin: true,
    cabinas: anchos.map(cabina),
    pilastras: [...PILASTRAS],
  } as unknown as Tramo
}

const anchoPil = (t: Tramo) => (k: number) => t.pilastras?.[k] ?? config.anchoPilastraCm

/** las mismas opciones que le pasa el editor */
function opciones(t: Tramo, cab: Cabina) {
  const n = t.cabinas.length
  const internas = anchosPilastraEn(false, config.modelo)
  return {
    pilastra: (k: number) =>
      k === 0 ? pilastrasDePunta(t.muroInicio)
        : k === n ? pilastrasDePunta(t.muroFin)
          : internas,
    puertas: cab.tipo === 'normal' && cab.puerta.tipo === 'puerta' ? anchosPuerta('CR', config.modelo) : [],
  }
}

function pedir(t: Tramo, indice: number, pedido: number) {
  return piezasParaAncho(t, indice, pedido, opciones(t, t.cabinas[indice]), anchoPil(t), arrancaElCuartoPmr(t, config))
}

console.log('\n1 · la cabina contra el muro: se pide 92 y sale 92')
{
  const t = tira()
  console.log(`    antes:  ${t.cabinas.map((c) => c.anchoCm).join(' | ')}`)
  console.log(`    piezas: pilastra ${PILASTRAS[0]} + puerta ${PUERTA} + media de ${PILASTRAS[1]} = ${PILASTRAS[0] + PUERTA + PILASTRAS[1] / 2}`)
  const plan = pedir(t, 0, 92)
  if (!plan) {
    ok(false, 'devolvió un plan')
  } else {
    console.log(`    plan:   pilastras ${plan.pilastras.map((p) => `${p.indice}→${p.anchoCm}`).join(' · ') || '(ninguna)'} · puerta ${plan.puertaCm ?? 'la misma'} · da ${plan.logradoCm}`)
    ok(plan.exacto, `da la medida exacta · ${plan.logradoCm}`)
    ok(plan.logradoCm === 92, `y la medida es la pedida · ${plan.logradoCm}`)
    // la cuenta a mano, para que no dependa de la función que se está probando
    const izq = plan.pilastras.find((p) => p.indice === 0)?.anchoCm ?? PILASTRAS[0]
    const der = plan.pilastras.find((p) => p.indice === 1)?.anchoCm ?? PILASTRAS[1]
    const puerta = plan.puertaCm ?? PUERTA
    ok(izq + puerta + der / 2 === 92, `a mano también: ${izq} + ${puerta} + ${der}/2`)
    ok(ANCHOS_PILASTRA.includes(izq) && ANCHOS_PILASTRA.includes(der), `las dos pilastras son de catálogo · ${izq} y ${der}`)
    ok([...ANCHOS_PUERTA, ...ANCHOS_PUERTA_CR].includes(puerta), `y la puerta también · ${puerta}`)
    ok(izq <= 24, `la pilastra a muro no se pasa de 24 · ${izq}`)
    ok(der >= 19, `y la central no baja de 19 · ${der}`)
  }
}

console.log('\n2 · la puerta se mueve lo menos posible: manda ella')
{
  const t = tira()
  const plan = pedir(t, 0, 92)
  // con 64 no hay solución exacta; la que menos mueve la puerta es la de 62
  ok(plan?.puertaCm === 62, `elige la puerta más parecida a la que había · ${plan?.puertaCm} en vez de 64`)
}

console.log('\n3 · pedir lo que ya mide no mueve ninguna pieza')
{
  const t = tira()
  const plan = pedir(t, 0, 97.5)
  ok(plan?.exacto === true, 'da exacto')
  ok(plan?.pilastras.length === 0, `y no toca ninguna pilastra · ${plan?.pilastras.length}`)
  ok(plan?.puertaCm === null, 'ni la puerta')
}

console.log('\n4 · una medida imposible se dice, no se cambia por lo bajo')
{
  const t = tira()
  // los cuerpos y las pilastras son enteros y la media pilastra va de 0,5 en
  // 0,5: un decimal así no lo puede dar ninguna combinación
  const plan = pedir(t, 2, 93.2)
  ok(plan !== null, 'devuelve plan igual')
  ok(plan?.exacto === false, 'avisa que no es exacto')
  ok(Math.abs((plan?.logradoCm ?? 0) - 93.2) <= 0.5, `y deja la más cercana · ${plan?.logradoCm}`)
}

console.log('\n5 · el camino viejo sigue igual: ni la puerta ni las puntas')
{
  const t = tira()
  const cambios = pilastrasParaAncho(t, 0, 92, anchosPilastraEn(false, config.modelo), anchoPil(t))
  ok(!cambios.some((c) => c.indice === 0), 'no toca la pilastra de punta')
  const der = cambios.find((c) => c.indice === 1)?.anchoCm ?? PILASTRAS[1]
  ok(24 + PUERTA + der / 2 === 97.5, `y por eso lo más cerca que llegaba era 97,5 · ${24 + PUERTA + der / 2}`)
}

console.log('\n6 · aplicado de punta a punta: la cabina queda en 92 y la tira se reacomoda')
{
  const t = tira()
  const plan = pedir(t, 0, 92)!
  const cabinas = plan.puertaCm == null
    ? t.cabinas
    : t.cabinas.map((c, i) => (i === 0 ? { ...c, puerta: { ...c.puerta, anchoCm: plan.puertaCm as number } } : c))
  const movidas = new Map(plan.pilastras.map((p) => [p.indice, p.anchoCm]))
  const elegidas = [...new Set([...movidas.keys(), 0, 1])]
  const fijas = Array.from({ length: cabinas.length + 1 }, (_, k) =>
    movidas.has(k) ? (movidas.get(k) as number) : elegidas.includes(k) ? (t.pilastras?.[k] ?? null) : null,
  )
  const r = reajustarConPuertas(
    cabinas, t.claroCm, 2, false, 0, fijas, t.pilastras, undefined, true,
    { inicio: true, fin: true }, true,
  )
  if (!r) {
    ok(false, 'la tira se vuelve a armar')
  } else {
    console.log(`    después: ${r.cabinas.map((c) => c.anchoCm).join(' | ')}`)
    console.log(`    pilastras ${r.pilastras.join(' · ')} · suma ${anchoTotal(r.cabinas).toFixed(1)} · ${r.mensaje}`)
    ok(r.cabinas[0].anchoCm === 92, `la cabina pedida mide 92 · ${r.cabinas[0].anchoCm}`)
    ok(r.pilastras[0] === (movidas.get(0) ?? PILASTRAS[0]), `la pilastra a muro quedó donde se la puso · ${r.pilastras[0]}`)
    ok(r.pilastras[1] === (movidas.get(1) ?? PILASTRAS[1]), `y la central también · ${r.pilastras[1]}`)
    ok(r.cabinas.length === 7, 'siguen siendo siete cabinas')
    ok(r.cabinas[0].puerta.anchoCm === (plan.puertaCm ?? PUERTA), 'la puerta de esa cabina es la del plan')
    ok(
      r.cabinas.slice(1).every((c) => c.puerta.anchoCm === PUERTA),
      'y las puertas de las OTRAS cabinas no se tocaron',
    )
  }
}

console.log('\n7 · y la medida escrita vale aunque la tira se pase del claro')
{
  // 120 no lo da ninguna combinación sin pasarse: lo que importa es que la
  // cabina quede en lo que se pidió y que el plano lo diga, no que se recorte
  const t = tira()
  const plan = pedir(t, 3, 120)
  ok(plan !== null, 'hay plan')
  if (plan) {
    const izq = plan.pilastras.find((p) => p.indice === 3)?.anchoCm ?? PILASTRAS[3]
    const der = plan.pilastras.find((p) => p.indice === 4)?.anchoCm ?? PILASTRAS[4]
    const puerta = plan.puertaCm ?? PUERTA
    console.log(`    media de ${izq} + puerta ${puerta} + media de ${der} = ${izq / 2 + puerta + der / 2}`)
    ok(plan.exacto, `llega a 120 · ${plan.logradoCm}`)
  }
}

console.log(mal === 0 ? '\nTodo cuadra.\n' : `\n${mal} caso(s) mal.\n`)
process.exit(mal === 0 ? 0 : 1)
