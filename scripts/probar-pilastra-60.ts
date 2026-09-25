/**
 * "No me deja mover la pl que está pegada al panel de 24 a 60".
 *
 * La tira de la captura: claro 693 · PMR 159 · dos cabinas de 114 · tres
 * orinales, con pilastras 24 · 60 · 24 y un hueco de 35.2 cm que la canaleta
 * no rellena. Reproduce el mismo llamado que hace onPilastras() al arrastrar.
 *
 *   npm run probar-pilastra-60
 */
import { modularConCatalogo } from '../src/modulacion'

let mal = 0

const CLARO = 693
const CABINAS = 6          // PMR + 2 baños + 3 orinales
const MUROS = 2            // muro a los dos lados
const PMR = 159

function mover(indice: number, anchoCm: number, yaFijas: (number | null)[] = []) {
  const extremo = indice === 0 || indice === CABINAS
  const clavadas = Array.from({ length: CABINAS + 1 }, (_, i) =>
    i === indice ? anchoCm : (yaFijas[i] ?? null),
  )
  return modularConCatalogo(
    CLARO, CABINAS, MUROS, false,
    {
      pilInterna: extremo ? undefined : anchoCm,
      pilExtremo: extremo ? anchoCm : undefined,
      pilastraIndice: indice,
      pilastras: clavadas,
      puerta: 60,
      puertaAccesible: 90,
    },
    {
      accesible: true,
      anchoAccesibleMinCm: PMR,
      cuartoPmrCm: PMR,
      mingitorios: 3,
      anchoOrinalCm: 90,
      cierreMingitorio: false,
      pais: 'CR',
    },
  )
}

const pintar = (etq: string, r: ReturnType<typeof mover>) => {
  if (!r) { console.log(`✕ ${etq}: el modulador devolvió NULL (la app descarta el cambio EN SILENCIO)`); return }
  const suma = r.cabinas.reduce((s, c) => s + c.anchoCm, 0)
  console.log(
    `${r.ajuste === 'falta' ? '⚠' : '✓'} ${etq}: pilastras ${(r.pilastras ?? []).join('·')} · ` +
    `cabinas ${r.cabinas.map((c) => c.anchoCm).join('·')} · suma ${suma.toFixed(1)} · ${r.ajuste} · ${r.mensaje ?? ''}`,
  )
}

console.log(`Claro ${CLARO} · PMR ${PMR} · ${CABINAS} cabinas\n`)

// Estado de partida: lo que el buscador arma solo
pintar('sin tocar nada        ', mover(1, 24))

console.log('\n── subir a 60 la pilastra de cada frontera')
for (let i = 0; i <= CABINAS; i++) pintar(`pilastra ${i} = 60     `, mover(i, 60))

console.log('\n── y con la del medio ya clavada en 60, como en la captura')
const conMedio: (number | null)[] = [null, null, 60, null, null, null, null]
pintar('pilastra 1 = 60       ', mover(1, 60, conMedio))
pintar('pilastra 3 = 60       ', mover(3, 60, conMedio))

// ── el mismo resto, pero SIN el cuarto PMR: separa quién se come el índice
console.log('\n── sub-tramo solo (534 cm, 5 cabinas, 1 muro): ¿respeta el índice?')
function moverResto(indice: number, anchoCm: number) {
  const extremo = indice === 0 || indice === 5
  const clavadas = Array.from({ length: 6 }, (_, i) => (i === indice ? anchoCm : null))
  return modularConCatalogo(
    534, 5, 1, false,
    { pilInterna: extremo ? undefined : anchoCm, pilExtremo: extremo ? anchoCm : undefined,
      pilastraIndice: indice, pilastras: clavadas, puerta: 60 },
    { accesible: false, mingitorios: 3, anchoOrinalCm: 90, pais: 'CR' },
  )
}
for (let i = 0; i <= 5; i++) {
  const r = moverResto(i, 60)
  const puesta = r?.pilastras?.[i]
  // De la frontera 3 en adelante NO hay pilastra: son las mamparas entre
  // orinales y la punta del campo. Que no se muevan es lo correcto.
  const esPilastra = i <= 2
  const bien = esPilastra ? puesta === 60 : puesta !== 60
  console.log(
    `${bien ? '✓' : '✕'} pedí 60 en ${i} → quedó ${puesta ?? '—'}` +
    `${esPilastra ? '' : '  (mampara/punta: no lleva pilastra)'} · ` +
    `pilastras ${(r?.pilastras ?? []).join('·')}`,
  )
  if (!bien) mal++
}
console.log(mal === 0 ? '\ntodas las pilastras obedecen el índice que se pide' : `\n${mal} posiciones mal`)
