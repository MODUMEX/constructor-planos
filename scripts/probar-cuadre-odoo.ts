/**
 * Los dos caminos de la plata tienen que dar lo mismo.
 *
 * La cotización de pantalla sale de `bom(tramos, config)`; lo que se manda a
 * Odoo sale de `agrupar(piezasDeArea(area))`, pieza física por pieza física.
 * Si no dan igual, la app frena y no manda — y eso está bien, pero el aviso
 * decía solo CUÁNTO sobraba, no EN QUÉ, así que no había por dónde empezar.
 *
 * Esto arma proyectos y compara los dos caminos renglón por renglón.
 *
 *   npm run probar-cuadre-odoo
 */
import { crearTramos, bom } from '../src/modulacion'
import { agrupar, piezasDeArea } from '../src/exportar/piezas'
import { precioPieza } from '../src/tarifas'
import { tierDeColor } from '../src/catalog'
import type { Config, TipologiaId, Moneda } from '../src/types'

function cfg(claro: number, cantidad: number, tipologia: TipologiaId, modelo = 'ESTANDAR'): Config {
  return {
    tipologia, modelo, linea: 'LEEDER',
    claroCm: claro, profundidadCm: 150, cantidad, alturaCm: 200,
    puertaCm: 60, anchoPilastraCm: 24, orinales: 0, anchoOrinalCm: 60,
    montaje: 'PISO_HEADRAIL', color: 'BLANCO', acabado: 'Laminado Compacto',
    terminacion: 'ZOCLO', espesorMm: 12,
    mgAnchoCm: 45, mgAlturaCm: 120, mamparasMG: [],
  } as unknown as Config
}

let mal = 0

function comparar(nombre: string, tipologia: TipologiaId, claro: number, cant: number, moneda: Moneda, orinales = 0) {
  const config = { ...cfg(claro, cant, tipologia), orinales } as Config
  const tramos = crearTramos(tipologia, claro, cant, config, moneda === 'CRC' ? 'CR' : 'MX')
  const precios = { moneda, tipoCambio: moneda === 'CRC' ? 512 : 1, tarifas: undefined, pais: undefined }

  const pantalla = bom(tramos, config, precios)
  const totalPantalla = pantalla.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)

  const opciones = {
    modeloCodigo: config.modelo,
    tier: tierDeColor(config.color, precios.pais, config.linea, config.acabado),
    moneda: precios.moneda,
    tipoCambio: precios.tipoCambio,
    tarifas: precios.tarifas,
  }
  const area = { nombre: 'Área 1', tramos, config } as never
  const agrupadas = agrupar(piezasDeArea(area), config)
  const totalPiezas = agrupadas.reduce(
    (s, r) => s + r.cantidad * precioPieza({ familia: r.familia, anchoCm: r.anchoCm, altoCm: r.altoCm }, opciones),
    0,
  )

  const dif = totalPiezas - totalPantalla
  const bien = Math.abs(dif) <= 1
  if (!bien) mal++
  console.log(
    `${bien ? '✓' : '✕'} ${nombre.padEnd(38)} pantalla ${totalPantalla.toFixed(2).padStart(10)}` +
    `  piezas ${totalPiezas.toFixed(2).padStart(10)}  dif ${dif.toFixed(2).padStart(9)}`,
  )

  if (!bien) {
    // por familia y medida, que es el lenguaje común de los dos lados
    const porLado = new Map<string, { pantalla: number; piezas: number }>()
    const mete = (k: string, lado: 'pantalla' | 'piezas', v: number) => {
      if (!porLado.has(k)) porLado.set(k, { pantalla: 0, piezas: 0 })
      porLado.get(k)![lado] += v
    }
    for (const r of pantalla) mete(r.sku || r.descripcion, 'pantalla', r.cantidad * r.precioUnit)
    for (const r of agrupadas) {
      mete(r.sku, 'piezas', r.cantidad * precioPieza({ familia: r.familia, anchoCm: r.anchoCm, altoCm: r.altoCm }, opciones))
    }
    for (const [k, v] of porLado) {
      if (Math.abs(v.piezas - v.pantalla) <= 0.5) continue
      console.log(`      ${k.padEnd(30)} pantalla ${v.pantalla.toFixed(2).padStart(10)}  piezas ${v.piezas.toFixed(2).padStart(10)}`)
    }
  }
}

console.log('— tipologías rectas')
comparar('recta entre muros, 3 cabinas, USD', 'RECTA_ENTRE_MUROS', 300, 3, 'USD')
comparar('recta entre muros, 3 cabinas, CRC', 'RECTA_ENTRE_MUROS', 300, 3, 'CRC')
comparar('recta un muro, 4 cabinas, USD', 'RECTA_MURO_IZQ', 380, 4, 'USD')
comparar('isla, 3 cabinas, USD', 'ISLA', 290, 3, 'USD')

console.log('\n— con cabina de movilidad reducida')
comparar('PMR, 4 cabinas, USD', 'PMR', 450, 4, 'USD')
comparar('MR panel U, 4 cabinas, USD', 'MR_PANEL_U', 450, 4, 'USD')
comparar('MR panel L, 3 cabinas, USD', 'MR_PANEL_L', 400, 3, 'USD')

console.log('\n— con orinales')
comparar('recta + 2 orinales, USD', 'RECTA_ENTRE_MUROS', 500, 3, 'USD', 2)
comparar('orinales solos, USD', 'ORINALES', 300, 0, 'USD', 3)

console.log('\n— barrido: todas las tipologías × claros × cabinas × modelos × moneda')
{
  const tips: TipologiaId[] = [
    'RECTA_ENTRE_MUROS', 'RECTA_MURO_IZQ', 'RECTA_MURO_DER', 'ISLA',
    'PMR', 'MR_PANEL_E', 'MR_PANEL_L', 'MR_PANEL_U',
  ]
  let casos = 0
  let malos = 0
  for (const tip of tips) {
    for (const modelo of ['ESTANDAR', 'REFORZADO']) {
      for (const cant of [2, 3, 4, 5, 6]) {
        for (const claro of [250, 300, 350, 400, 450, 500, 600]) {
          for (const moneda of ['USD', 'CRC'] as Moneda[]) {
            const config = { ...cfg(claro, cant, tip), modelo } as Config
            let tramos
            try {
              tramos = crearTramos(tip, claro, cant, config, moneda === 'CRC' ? 'CR' : 'MX')
            } catch {
              continue
            }
            const precios = { moneda, tipoCambio: moneda === 'CRC' ? 512 : 1 }
            const pantalla = bom(tramos, config, precios).reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
            const op = {
              modeloCodigo: config.modelo,
              tier: tierDeColor(config.color, undefined, config.linea, config.acabado),
              moneda,
              tipoCambio: precios.tipoCambio,
              tarifas: undefined,
            }
            const pz = agrupar(piezasDeArea({ nombre: 'A', tramos, config } as never), config)
            const piezas = pz.reduce(
              (s, r) => s + r.cantidad * precioPieza({ familia: r.familia, anchoCm: r.anchoCm, altoCm: r.altoCm }, op),
              0,
            )
            casos++
            if (Math.abs(piezas - pantalla) > 1) {
              malos++
              if (malos <= 8) {
                console.log(
                  `  ✕ ${tip} ${modelo} claro ${claro} ×${cant} ${moneda}: ` +
                  `pantalla ${pantalla.toFixed(2)} piezas ${piezas.toFixed(2)} dif ${(piezas - pantalla).toFixed(2)}`,
                )
              }
            }
          }
        }
      }
    }
  }
  console.log(`  ${casos - malos} de ${casos} configuraciones cuadran`)
  if (malos) mal += 1
}

console.log(mal === 0 ? '\nLos dos caminos dan lo mismo.' : `\n${mal} caso(s) donde NO cuadran.`)
process.exit(mal === 0 ? 0 : 1)
