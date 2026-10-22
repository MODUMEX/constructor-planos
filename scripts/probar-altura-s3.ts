/**
 * Touchless S3 se fabrica en varias alturas y se eligen.
 *
 * La ficha de abril 2026 lo dice en su tabla: puertas y paneles laterales en
 * **150, 170 y 180**, pilastras siempre de **210**. La app tenía una sola
 * altura fija y por eso no había forma de pedir la de 150 —la que Syclick
 * vende como `RF`, contra el `RF170` del resto—.
 *
 * La pilastra NO se elige: la pone el modelo.
 *
 *   npm run probar-altura-s3
 */
import { crearTramos, bom } from '../src/modulacion'
import { piezasDeArea, agrupar } from '../src/exportar/piezas'
import { skuSyclick } from '../src/exportar/syclick'
import { alturasDeConfig, alturasElegibles, alturasDe } from '../src/catalog'
import type { Config } from '../src/types'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

function cfg(alturaPiezaCm?: number): Config {
  return {
    tipologia: 'RECTA_ENTRE_MUROS', modelo: 'TL_S3', linea: 'TOUCHLESS',
    claroCm: 300, profundidadCm: 150, cantidad: 3, alturaCm: 210,
    puertaCm: 60, anchoPilastraCm: 24, orinales: 0, anchoOrinalCm: 60,
    montaje: 'PISO_HEADRAIL', color: 'ALUMINA 2103', acabado: 'Laminado Compacto',
    terminacion: 'ZOCLO', espesorMm: 12, mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [],
    alturaPiezaCm,
  } as unknown as Config
}

console.log('— las tres alturas de la ficha')
ok(alturasElegibles('TL_S3').join(',') === '150,170,180', 'S3 ofrece 150, 170 y 180')
ok(alturasElegibles('REFORZADO').length === 0, 'en LEEDER no se elige: el 170 es otro modelo')

console.log('\n— la elegida manda sobre la del modelo, salvo en la pilastra')
for (const h of [150, 170, 180]) {
  const a = alturasDeConfig(cfg(h))
  ok(a.puerta === h && a.panel === h, `con ${h}: puerta y panel en ${h}`)
  ok(a.pilastra === alturasDe('TL_S3').pilastra, `  y la pilastra sigue en ${a.pilastra}`)
}

console.log('\n— sin elegir nada, manda la ficha del modelo (proyectos guardados de antes)')
{
  const a = alturasDeConfig(cfg(undefined))
  const f = alturasDe('TL_S3')
  ok(a.puerta === f.puerta && a.panel === f.panel, `queda en ${f.puerta}, como estaba`)
}

console.log('\n— la altura llega a las piezas y al SKU de Syclick')
for (const h of [150, 170, 180]) {
  const config = cfg(h)
  const tramos = crearTramos('RECTA_ENTRE_MUROS', 300, 3, config, 'MX')
  const piezas = piezasDeArea({ nombre: 'A', tramos, config } as never)
  const puertas = piezas.filter((p) => p.familia === 'PT')
  const paneles = piezas.filter((p) => p.familia === 'PN')
  const pilastras = piezas.filter((p) => p.familia === 'PL')
  ok(puertas.every((p) => p.altoCm === h), `con ${h}: las puertas salen de ${h}`)
  ok(paneles.every((p) => p.altoCm === h), `  los paneles también`)
  ok(pilastras.every((p) => p.altoCm === 210), `  y las pilastras de 210`)

  const esperado = h === 150 ? 'RF' : 'RF170'
  const skus = agrupar(piezas, config).map((r) => skuSyclick(r.familia, config, 3, r.regadera, r.altoCm))
  const puertaSku = skus.find((s) => s.includes('-PT-')) ?? ''
  ok(puertaSku === `L-S3-LC-${esperado}-PT-G1`, `  la puerta va con ${esperado} · ${puertaSku}`)
  const pilastraSku = skus.find((s) => s.includes('-PL-')) ?? ''
  ok(pilastraSku === 'L-S3-LC-RF170-PL-G1', `  y la pilastra de 210 siempre RF170 · ${pilastraSku}`)
}

console.log('\n— y la cotización cobra lo que mide: más alto, más plata')
{
  const precios = { moneda: 'USD' as const, tipoCambio: 1 }
  const total = (h: number) => {
    const config = cfg(h)
    const tramos = crearTramos('RECTA_ENTRE_MUROS', 300, 3, config, 'MX')
    return bom(tramos, config, precios).reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  }
  const t150 = total(150)
  const t170 = total(170)
  const t180 = total(180)
  ok(t150 < t170 && t170 < t180, `150 ${t150.toFixed(2)} < 170 ${t170.toFixed(2)} < 180 ${t180.toFixed(2)}`)
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
