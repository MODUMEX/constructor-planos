import { crearTramos, anchoTotal, reajustarConPuertas, lugaresDe, ladoDePilastra, esEspacioLibre } from '../src/modulacion'
import { acumulado, centroPilastra, cuartoPmr } from '../src/geometria'
import type { Cabina, Config, Tramo } from '../src/types'

function cfg(extra: Partial<Config>): Config {
  return {
    tipologia: 'PMR', modelo: 'REFORZADO', linea: 'LEEDER',
    claroCm: 693, profundidadCm: 150, cantidad: 4, alturaCm: 200,
    puertaCm: 60, puertaAccesibleCm: 90, anchoAccesibleCm: 162,
    orinales: 3, anchoOrinalCm: 60, llevaAccesible: true,
    anchoPilastraCm: 24,
    ...extra,
  } as unknown as Config
}

function pintar(t: Tramo, config: Config, titulo: string) {
  console.log(`\n── ${titulo} ──`)
  console.log(`  claro ${t.claroCm}   piezas ${anchoTotal(t.cabinas).toFixed(1)}   ${t.mensaje ?? ''}`)
  const etiqueta = (c: Cabina) =>
    c.tipo === 'orinal' ? 'orinal' : c.tipo === 'accesible' ? 'PMR' : esEspacioLibre(c) ? 'LIBRE' : 'cabina'
  console.log('  lugares:  ' + t.cabinas.map((c, i) => `${i}·${etiqueta(c)} ${c.anchoCm}`).join('   '))
  const acu = acumulado(t.cabinas)
  const ac = [0, ...acu.slice(1), anchoTotal(t.cabinas)]
  const q = cuartoPmr(t, config)
  const lug = lugaresDe(t.cabinas)
  const filas = (t.pilastras ?? []).map((p, k) => {
    const lado = ladoDePilastra(lug, k, q ? q.indice : -1)
    const centro = centroPilastra(t, ac, k, p, q)
    return `  PL ${String(p).padStart(5)}  frontera ${k}  corte ${ac[k].toFixed(1).padStart(6)}  ${lado === 'mitades' ? 'CENTRAL' : `LATERAL(${lado})`}  centro ${centro.toFixed(1)}`
  })
  console.log(filas.join('\n'))
  console.log('  cadena:   ' + t.cabinas.map((c) => c.anchoCm.toFixed(1)).join(' | '))
}

function sinPuerta(t: Tramo, i: number): Cabina[] {
  return t.cabinas.map((c, k) => (k === i ? { ...c, puerta: { ...c.puerta, tipo: 'ninguna' as const } } : c))
}

// ── caso de Dayanna ───────────────────────────────────────────────────────
{
  const config = cfg({})
  const t = crearTramos('PMR', 693, 4, config, 'CR')[0]
  pintar(t, config, 'PMR 162 + 3 cabinas + 3 orinales, claro 693 · COMO ESTÁ HOY')
  const r = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162)
  if (!r) console.log('\n  ✗ no modula')
  else pintar({ ...t, ...r }, config, 'la cabina del MEDIO sin puerta → ESPACIO LIBRE')
}

// ── sin PMR: 4 cabinas entre muros, la 3ª sin puerta ──────────────────────
{
  const config = cfg({ tipologia: 'EN_LINEA', llevaAccesible: false, orinales: 0, cantidad: 4, claroCm: 400 })
  const t = crearTramos('EN_LINEA', 400, 4, config, 'CR')[0]
  pintar(t, config, '4 cabinas entre muros, claro 400 · COMO ESTÁ HOY')
  const r = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 2, false, 0)
  if (!r) console.log('\n  ✗ no modula')
  else pintar({ ...t, ...r }, config, 'la 3ª sin puerta → ESPACIO LIBRE')
}

// ── el hueco con medida escrita a mano ────────────────────────────────────
{
  const config = cfg({})
  const t = crearTramos('PMR', 693, 4, config, 'CR')[0]
  const conHueco = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162)
  if (conHueco) {
    const clavado = conHueco.cabinas.map((c, i) => (i === 2 ? { ...c, libreCm: 77 } : c))
    const r = reajustarConPuertas(clavado, t.claroCm, 1, false, 162)
    if (r) pintar({ ...t, ...r }, config, 'con el hueco ESCRITO en 77 cm (como el plano real)')
  }
}

// ── escribirle la medida a los cubículos con el hueco puesto ──────────────
{
  const config = cfg({})
  const t = crearTramos('PMR', 693, 4, config, 'CR')[0]
  const hueco = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162)
  if (hueco) {
    // la vendedora escribe 92 en las dos cabinas: se clavan sus pilastras
    const fijas = [null, 24, 24, 24, 24, null, null, null] as (number | null)[]
    const r = reajustarConPuertas(hueco.cabinas, t.claroCm, 1, false, 162, fijas)
    if (r) pintar({ ...t, ...r }, config, 'cubículos con pilastras escritas a mano (24) · el hueco se acomoda')
  }
}
