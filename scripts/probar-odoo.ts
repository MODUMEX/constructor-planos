import { MODELOS, ANCHOS_PILASTRA, COLORES, alturasDe, anchosPanel, anchosPuerta, mgMedidas } from '../src/catalog'
import type { Config } from '../src/types'
import type { Familia, Pieza } from '../src/exportar/piezas'
import { esSku, skuOdoo } from '../src/odoo/sku'

/**
 * Cruza todo lo que el Constructor puede despiezar contra el índice real de
 * Odoo. No inventa: si el libro no está a mano, lo dice y se sale.
 */

const { variantesOdoo } = await import('./leer-bom-odoo.mjs')
const variantes = variantesOdoo()
if (!variantes) {
  console.log('No encontré BOM_Mamparas_Completo.xlsx; no puedo cruzar nada.')
  process.exit(0)
}
const enOdoo = new Set(variantes.map((v: { sku: string }) => v.sku))

function config(modelo: string, color: string, terminacion: 'PATAS' | 'ZOCLO'): Config {
  return { linea: 'LEEDER', modelo, color, terminacion } as unknown as Config
}

function pieza(familia: Familia, anchoCm: number, altoCm: number, subTipo: string): Pieza {
  return { familia, anchoCm, altoCm, subTipo, area: 'A' }
}

const SUBTIPOS: Record<Familia, string[]> = {
  PT: ['PTADER', 'PTAIZQ', 'PTADER-AM', 'PTAIZQ-AM'],
  PN: ['PNCEN', 'PNLAT'],
  PL: ['PLCEN', 'PLLAT', 'PLCOS', 'PLLATMUR', 'PLCOSMUR'],
  MG: ['MG120', 'MG150'],
}

let bien = 0
const fallas: string[] = []
const sinLinea = new Set<string>()
const sinColor = new Set<string>()

const modelos = MODELOS.LEEDER.map((m) => m.codigo)
const colores = COLORES.filter((c) => c.tier === 'linea').map((c) => c.nombre)

for (const modelo of modelos) {
  const alturas = alturasDe(modelo)
  for (const colorNombre of colores) {
    for (const terminacion of ['PATAS', 'ZOCLO'] as const) {
      const cfg = config(modelo, colorNombre, terminacion)
      const piezas: Pieza[] = []
      for (const a of anchosPuerta('CR'))
        for (const st of SUBTIPOS.PT) piezas.push(pieza('PT', a, alturas.puerta, st))
      for (const a of anchosPanel(modelo))
        for (const st of SUBTIPOS.PN) piezas.push(pieza('PN', a, alturas.panel, st))
      for (const a of ANCHOS_PILASTRA)
        for (const st of SUBTIPOS.PL) piezas.push(pieza('PL', a, alturas.pilastra, st))
      for (const mg of mgMedidas('LEEDER'))
        piezas.push(pieza('MG', mg.anchoCm, mg.altoCm, mg.altoCm >= 150 ? 'MG150' : 'MG120'))

      for (const p of piezas) {
        const t = skuOdoo(p, cfg)
        if (!esSku(t)) {
          if (t.falta.includes('línea')) sinLinea.add(modelo)
          else if (t.falta.includes('color')) sinColor.add(colorNombre)
          else fallas.push(`${modelo}/${colorNombre}/${p.familia}/${p.subTipo}: ${t.falta}`)
          continue
        }
        if (enOdoo.has(t.sku)) bien += 1
        else fallas.push(`${t.sku}  (${modelo} ${p.familia} ${p.anchoCm}x${p.altoCm} ${p.subTipo} ${colorNombre} ${terminacion})`)
      }
    }
  }
}

console.log(`SKU generados que Odoo sí tiene: ${bien}`)
console.log(`Modelos sin línea en Odoo: ${[...sinLinea].join(', ') || 'ninguno'}`)
console.log(`Colores sin equivalencia en Odoo: ${[...sinColor].join(', ') || 'ninguno'}`)
console.log(`Combinaciones que el Constructor puede pedir y Odoo NO tiene: ${fallas.length}`)

// las fallas se resumen por su causa, que es lo que hay que decidir
const porCausa = new Map<string, number>()
for (const f of fallas) {
  const m = f.match(/^([A-Z]{3})-([A-Z]{2})-(\d{3})x(\d{3})/)
  const causa = m ? `${m[1]}-${m[2]} ${Number(m[3])}x${Number(m[4])}` : f
  porCausa.set(causa, (porCausa.get(causa) ?? 0) + 1)
}
for (const [causa, n] of [...porCausa].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${causa}`)
}
