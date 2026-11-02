/**
 * El juego de herrajes que se enseña en pantalla.
 *
 * Son tres juegos y no uno por línea: el negro es el mismo para todas, el de
 * acero inoxidable de LEEDER lo monta también Touchless S3, y Superior 2.0
 * tiene piezas propias —bisagra de autorretorno y su escuadra U—.
 *
 * Touchless no lleva cerrojo, porque la puerta abre sin contacto. Tampoco lo
 * lleva ningún juego en las fotos: el cerrojo, el cerrojo con indicador y la
 * contra salieron de la tira.
 *
 *   npm run probar-herrajes
 */
import { fotosHerraje, faltanFotosHerraje, terminacionesDe } from '../src/renders'
import { herrajesDe } from '../src/catalog'
import { FOTOS_HERRAJES } from '../src/datos/herrajes'
import type { Linea } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const LINEAS: Linea[] = ['LEEDER', 'SUPERIOR', 'TOUCHLESS']

console.log('— ninguna línea se queda sin fotos')
for (const linea of LINEAS) {
  // los acabados que esa línea admite: Superior 2.0 no se pide en negro
  for (const { id: acabado } of herrajesDe(linea)) {
    ok(!faltanFotosHerraje(linea, acabado), `${linea} · ${acabado}: no sale el aviso de "faltan las fotos"`)
    // Superior 2.0 trae cuatro: sus escuadras F y T van en una sola foto
    const piezas = fotosHerraje(linea, acabado)
    ok(piezas.length >= 4, `  ${piezas.length} piezas: ${piezas.map((p) => p.pieza).join(', ')}`)
  }
}

console.log('\n— Touchless monta el juego de LEEDER, pieza por pieza')
{
  const tl = fotosHerraje('TOUCHLESS', 'INOX').map((f) => f.archivo)
  const leeder = fotosHerraje('LEEDER', 'INOX').map((f) => f.archivo)
  ok(tl.join('|') === leeder.join('|'), `las mismas ${tl.length} fotos que LEEDER`)
  ok(tl.every((a) => a.includes('leeder')), '  y son las de la carpeta de LEEDER')
  // Superior sí tiene las suyas: no se le prestan las de LEEDER
  const sup = fotosHerraje('SUPERIOR', 'INOX').map((f) => f.archivo)
  ok(sup.some((a) => a.includes('superior')), 'Superior 2.0 sigue con las suyas')
}

console.log('\n— el cerrojo no está en ningún juego')
for (const f of FOTOS_HERRAJES) {
  if (/cerrojo|contra/i.test(f.pieza)) { mal++; console.log(`✕ quedó ${f.pieza} en ${f.linea ?? 'todas'} · ${f.acabado}`) }
}
ok(true, `revisadas las ${FOTOS_HERRAJES.length} fotos del índice`)

console.log('\n— el zoclo y la pata no salen juntos: va la terminación elegida')
for (const linea of LINEAS) {
  for (const terminacion of terminacionesDe('INOX', linea)) {
    const piezas = fotosHerraje(linea, 'INOX', terminacion).map((p) => p.pieza.toLowerCase())
    const zoclos = piezas.filter((p) => p.includes('zoclo')).length
    const patas = piezas.filter((p) => p.includes('pata')).length
    ok(zoclos + patas === 1, `${linea} · ${terminacion}: una sola pieza de remate`)
    const esperada = terminacion === 'ZOCLO' ? zoclos : patas
    ok(esperada === 1, `  y es la que se eligió`)
  }
}

console.log('\n— el juego negro es el mismo para todas las líneas')
{
  const negros = LINEAS.filter((l) => l !== 'SUPERIOR').map((l) => fotosHerraje(l, 'NEGRO').map((f) => f.archivo).join('|'))
  ok(new Set(negros).size === 1, 'LEEDER y Touchless ven las mismas fotos negras')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
