/**
 * El paso de Herrajes: el juego que se enseña en pantalla y el KAP.
 *
 * Son tres juegos y no uno por línea: el negro es el mismo para todas, el de
 * acero inoxidable de LEEDER lo monta también Touchless S3, y Superior 2.0
 * tiene piezas propias —bisagra de autorretorno y su escuadra U—.
 *
 * Touchless no lleva cerrojo, porque la puerta abre sin contacto, ni las
 * escuadras F y T. Tampoco hay cerrojo en ningún juego: el cerrojo, el de
 * indicador y la contra salieron de la tira de fotos.
 *
 * El KAP —el kit de abrepuertas de pie— en México es solo de Touchless; en
 * Costa Rica, por ahora, cualquier modelo lo puede pedir.
 *
 *   npm run probar-herrajes
 */
import { fotosHerraje, faltanFotosHerraje, terminacionesDe } from '../src/renders'
import { herrajesDe, llevaKap } from '../src/catalog'
import { generarCSV, CABECERA_CSV } from '../src/exportar/csv'
import { crearTramos } from '../src/modulacion'
import { FOTOS_HERRAJES } from '../src/datos/herrajes'
import type { Config, HerrajeAcabado, Linea, Pais, Proyecto } from '../src/types'

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

console.log('\n— Touchless monta el juego de LEEDER menos las escuadras F y T')
{
  const piezas = (l: Linea, a: HerrajeAcabado = 'INOX') => fotosHerraje(l, a).map((f) => f.pieza)
  const tl = piezas('TOUCHLESS')
  const leeder = piezas('LEEDER')
  const sinFT = leeder.filter((x) => !/^escuadra [ft]$/i.test(x))
  ok(tl.join('|') === sinFT.join('|'), `las ${tl.length} de LEEDER sin F ni T: ${tl.join(', ')}`)
  ok(!tl.some((x) => /^escuadra [ft]$/i.test(x)), '  no se coló ninguna de las dos')
  ok(leeder.includes('Escuadra F') && leeder.includes('Escuadra T'), '  y en LEEDER siguen estando')
  // el negro sale de la misma tira, así que ahí también se quitan
  ok(!piezas('TOUCHLESS', 'NEGRO').some((x) => /^escuadra [ft]$/i.test(x)), 'en negro tampoco van')
  ok(
    fotosHerraje('TOUCHLESS', 'INOX').every((f) => f.archivo.includes('leeder')),
    'las fotos salen de la carpeta de LEEDER',
  )
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

console.log('\n— el juego negro: el mismo para todas, salvo las dos de Touchless')
{
  const negro = (l: Linea) => fotosHerraje(l, 'NEGRO').map((f) => f.archivo)
  ok(negro('TOUCHLESS').every((a) => negro('LEEDER').includes(a)), 'Touchless no estrena ninguna foto negra')
  const quitadas = negro('LEEDER').filter((a) => !negro('TOUCHLESS').includes(a))
  ok(quitadas.length === 2, `le faltan las dos escuadras: ${quitadas.join(', ')}`)
  ok(quitadas.every((a) => /escuadra-[ft]/.test(a)), '  y son la F y la T')
}

console.log('\n— el KAP: en México solo Touchless, en Costa Rica cualquiera')
{
  ok(llevaKap('TOUCHLESS', 'MX'), 'México · Touchless S3: sí se pregunta')
  ok(!llevaKap('LEEDER', 'MX'), 'México · LEEDER: ni se pregunta')
  ok(!llevaKap('SUPERIOR', 'MX'), 'México · Superior 2.0: ni se pregunta')
  for (const linea of LINEAS) ok(llevaKap(linea, 'CR'), `Costa Rica · ${linea}: lo puede llevar`)
}

console.log('\n— y el CSV del CIP no manda un KAP que allá no existe')
{
  const csv = (linea: Linea, pais: Pais) => {
    const config = {
      tipologia: 'RECTA_ENTRE_MUROS', linea, modelo: linea === 'TOUCHLESS' ? 'TL_S3' : 'ESTANDAR',
      acabado: 'Laminado Compacto', color: 'BLANCO', montaje: 'PISO_HEADRAIL', bisagra: 'GRAV',
      herrajeAcabado: 'INOX', alturaCm: 210, profundidadCm: 150,
      anchoAccesibleCm: 150, puertaCm: 60, anchoPilastraCm: 24, espesorMm: 12,
      terminacion: 'ZOCLO', kap: true, orinales: 0, mgAlturaCm: 120, mgAnchoCm: 45, mamparasMG: [],
    } as unknown as Config
    const proyecto = {
      numero: '1', paisFabricacion: pais, obra: 'A', cliente: '', ubicacion: '',
      distribuidor: '', creadoPor: '',
      areas: [{ id: 'a1', nombre: 'A', piso: '', config, tramos: crearTramos('RECTA_ENTRE_MUROS', 300, 3, config, pais) }],
    } as unknown as Proyecto
    const col = CABECERA_CSV.split(',').indexOf('KAP')
    return generarCSV(proyecto).split('\n')[1].split(',')[col]
  }
  // el proyecto trae kap puesto en los cuatro casos: lo que cambia es si viaja
  ok(csv('TOUCHLESS', 'MX') === 'SI', 'México · Touchless: viaja SI')
  ok(csv('LEEDER', 'MX') === 'NO', 'México · LEEDER: viaja NO aunque venga puesto')
  ok(csv('LEEDER', 'CR') === 'SI', 'Costa Rica · LEEDER: viaja SI')
  ok(csv('TOUCHLESS', 'CR') === 'SI', 'Costa Rica · Touchless: viaja SI')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
