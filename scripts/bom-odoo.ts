import { ANCHOS_PILASTRA, MG_MEDIDAS, alturasDe, anchosPanel, anchosPuerta } from '../src/catalog'
import { COLORES_ODOO } from '../src/odoo/sku'
import { lineasBom, variantesOdoo } from './leer-bom-odoo.mjs'
import { escribirXlsx } from './escribir-xlsx.mjs'

/**
 * Arma el BOM de lo que a Odoo le falta usando las reglas del libro que ya
 * tiene cargado: cada variante nueva copia el despiece de su hermana —misma
 * línea, pieza, variante y color— y solo se le ajusta lo que depende de la
 * medida (el sólido en m², el tubo ornamental y el refuerzo en metros, y el
 * zoclo, que va por ancho de pilastra).
 *
 * Salen dos libros: uno con TODO y otro solo con lo que hay que subir.
 */

interface Variante { sku: string; nombre: string; linea: string; pieza: string; tamano: string }
interface Renglon { sku: string; tipo: string; comp: string; desc: string; cant: number; uni: string }

const idx = variantesOdoo() as Variante[] | null
const bom = lineasBom() as Renglon[] | null
if (!idx || !bom) {
  console.log('No encontré BOM_Mamparas_Completo.xlsx; no puedo armar nada.')
  process.exit(0)
}

/** los modelos del Constructor que le tocan a cada línea de Odoo */
const LINEAS: { pref: string; nombre: string; modelos: string[]; base?: string }[] = [
  { pref: 'STD', nombre: 'Estándar', modelos: ['ESTANDAR', 'ESTANDAR170'] },
  { pref: 'REF', nombre: 'Reforzado', modelos: ['REFORZADO', 'REFORZADO170'] },
  { pref: 'KID', nombre: 'Kids', modelos: ['KIDS'] },
  { pref: 'IMP', nombre: 'Imperial', modelos: ['IMPERIAL'] },
  { pref: 'SCU', nombre: 'Scudo', modelos: ['SCUDO'] },
  { pref: 'COL', nombre: 'Colgante', modelos: ['COLGANTE'] },
  { pref: 'REG', nombre: 'Regaderas', modelos: ['REGADERAS'], base: 'STD' },
  { pref: 'TCH', nombre: 'Touchless S3', modelos: ['TL_S3'], base: 'REF' },
]

const PIEZAS = { PT: 'Puerta', PN: 'Panel', PI: 'Pilastra', MG: 'Mingitorio' } as const
type Pz = keyof typeof PIEZAS

const cm = (n: number) => String(Math.round(n)).padStart(3, '0')
const metros = (n: number) => (Math.round(n) / 100).toFixed(2)

interface Parte { linea: string; pz: string; ancho: number; alto: number; vars: string; color: string }

/** parte un SKU de Odoo en sus pedazos */
function partir(sku: string): Parte {
  const p = sku.split('-')
  const [a, h] = p[2].split('x').map(Number)
  return { linea: p[0], pz: p[1], ancho: a, alto: h, vars: p.slice(3, -3).join('-'), color: p.slice(-3)[0] }
}

const yaEsta = new Set(idx.map((v) => v.sku))
const porSku = new Map<string, Renglon[]>()
for (const r of bom) {
  if (!porSku.has(r.sku)) porSku.set(r.sku, [])
  porSku.get(r.sku)!.push(r)
}

// el índice partido una sola vez: buscar hermana recorriendo 24 129 cadenas por
// cada variante nueva es lo que haría eterno esto
const partido = idx.map((v) => partir(v.sku))
const porGrupo = new Map<string, { sku: string; p: Parte }[]>()
partido.forEach((p, i) => {
  const clave = `${p.linea}|${p.pz}|${p.vars}|${p.color}`
  if (!porGrupo.has(clave)) porGrupo.set(clave, [])
  porGrupo.get(clave)!.push({ sku: idx[i].sku, p })
})

/** las variantes que el libro ya usa para esa línea y pieza */
function variantesDe(linea: string, pz: Pz): string[] {
  const vistas = new Set<string>()
  for (const p of partido) if (p.linea === linea && p.pz === pz) vistas.add(p.vars)
  return [...vistas]
}

/** el catálogo que el Constructor puede pedir, línea por línea */
function catalogo(l: (typeof LINEAS)[number]): { pz: Pz; ancho: number; alto: number; vars: string }[] {
  const de = l.base ?? l.pref
  const salida: { pz: Pz; ancho: number; alto: number; vars: string }[] = []
  const altos = { PT: new Set<number>(), PN: new Set<number>(), PI: new Set<number>() }
  const anchosPn = new Set<number>()
  for (const m of l.modelos) {
    const a = alturasDe(m)
    altos.PT.add(a.puerta)
    altos.PN.add(a.panel)
    altos.PI.add(a.pilastra)
    for (const w of anchosPanel(m)) anchosPn.add(w)
  }
  const vp = variantesDe(de, 'PT')
  const vn = variantesDe(de, 'PN')
  const vi = variantesDe(de, 'PI')
  for (const alto of altos.PT) for (const ancho of anchosPuerta('CR')) for (const vars of vp)
    salida.push({ pz: 'PT', ancho, alto, vars })
  for (const alto of altos.PN) for (const ancho of anchosPn) for (const vars of vn)
    salida.push({ pz: 'PN', ancho, alto, vars })
  for (const alto of altos.PI) for (const ancho of ANCHOS_PILASTRA) for (const vars of vi)
    salida.push({ pz: 'PI', ancho, alto, vars })
  for (const mg of MG_MEDIDAS) salida.push({ pz: 'MG', ancho: mg.anchoCm, alto: mg.altoCm, vars: '' })
  return salida
}

/** la hermana de la que se copia: misma línea, pieza, variante y color */
function hermana(
  linea: string, pz: Pz, vars: string, color: string, alto: number, ancho: number,
): (Parte & { sku: string }) | null {
  const grupo = porGrupo.get(`${linea}|${pz}|${vars}|${color}`)
  if (!grupo) return null
  let mejor: { sku: string; p: Parte; d: number } | null = null
  for (const g of grupo) {
    // primero la que comparte el alto; si no hay, la de alto más cercano
    const d = Math.abs(g.p.alto - alto) * 1000 + Math.abs(g.p.ancho - ancho)
    if (!mejor || d < mejor.d) mejor = { ...g, d }
  }
  return mejor ? { ...mejor.p, sku: mejor.sku } : null
}

const NOMBRE_PZ: Record<Pz, string> = { PT: 'PUERTA', PN: 'PANEL', PI: 'PILASTRA', MG: 'MINGITORIO' }
const ETIQUETA: Record<string, string> = {
  DER: 'Derecha', IZQ: 'Izquierda', N: 'Normal', M: 'A muro',
  CEN: 'Central', LAT: 'Lateral', LATM: 'Lateral a muro', UNI: 'Unitario',
  COS: 'Costado', COSM: 'Costado a muro', INT: 'Intermedia', MUR: 'A muro',
  PATA: 'Pata', ZOC: 'Zoclo',
}

/**
 * El rótulo tal como lo escribe el libro: la puerta lleva las variantes
 * después de la medida, el panel la posición antes, y la pilastra la posición
 * antes y la terminación después.
 */
function rotulo(pz: string, ancho: number, alto: number, vars: string, color: string, linea: string): string {
  const [v0 = '', v1 = ''] = vars ? vars.split('-').map((v) => ETIQUETA[v] ?? v) : []
  const c = COLORES_ODOO.find((x) => x.codigo === color)
  const medida = `${metros(ancho)}x${metros(alto)}`
  const cuerpo = pz === 'PT' ? `${medida} ${v0} ${v1}`
    : pz === 'PI' ? `${v0} ${medida} ${v1}`
      : `${v0} ${medida}`
  const nombre = NOMBRE_PZ[pz as Pz] ?? 'ANTEPECHO'
  return `${nombre} ${cuerpo.replace(/[ ]+/g, ' ').trim()} · ${c?.nombre ?? color} · ${linea}`
}

/**
 * Prueba de que el rótulo se escribe igual que en el libro: si los 24 129
 * nombres de hoy no salen idénticos, los nuevos tampoco serían de fiar.
 */
function comprobarRotulos(): number {
  const NOMBRE_LINEA: Record<string, string> = {
    STD: 'Estándar', REF: 'Reforzado', KID: 'Kids', IMP: 'Imperial', SCU: 'Scudo', COL: 'Colgante',
  }
  let mal = 0
  for (const v of idx!) {
    const p = partir(v.sku)
    const mio = rotulo(p.pz, p.ancho, p.alto, p.vars, p.color, NOMBRE_LINEA[p.linea] ?? p.linea)
    if (mio !== v.nombre) {
      if (mal < 3) console.log(`  distinto: ${v.sku}
    libro: ${v.nombre}
    mío:   ${mio}`)
      mal += 1
    }
  }
  return mal
}

/**
 * Los electrónicos S3 que el CIP suma por puerta. Lo que va por ÁREA —fuente,
 * arneses de derivación— no entra acá: no es parte de una puerta.
 */
const TOUCHLESS_PUERTA: { comp: string; desc: string; cant: number; uni: string }[] = [
  { comp: 'KAPL-S3-V2', desc: 'Arnés de pilastra S3', cant: 1, uni: 'KIT' },
  { comp: '1X1/16-100', desc: 'Solera 1 x 1/16 a 100 cm (sensor)', cant: 1, uni: 'PZA' },
  { comp: 'ACRS3', desc: 'Acrílico solera sensor', cant: 1, uni: 'PZA' },
  { comp: 'ACRS3-V2', desc: 'Acrílico solera LED de ocupación', cant: 1, uni: 'PZA' },
  { comp: 'KCT-TCHLS', desc: 'Contra tope Touch-less S1-S2', cant: 1, uni: 'KIT' },
  { comp: 'KAP', desc: 'Kit de abrepuertas de pie', cant: 1, uni: 'KIT' },
  { comp: 'KJL1M2', desc: 'Jaladera Leeder corto M2', cant: 1, uni: 'KIT' },
  { comp: 'CERRADURA-S3', desc: 'Cerradura magnética', cant: 1, uni: 'KIT' },
  { comp: 'ARNES-EXT', desc: 'Arnés de extensión 100 cm', cant: 1, uni: 'KIT' },
  { comp: 'F03', desc: 'Etiqueta puerta Touch-less S1/S2', cant: 1, uni: 'PZA' },
  { comp: 'F04', desc: 'Etiqueta puerta QR Touch-less S1/S2', cant: 1, uni: 'PZA' },
  { comp: 'F05', desc: 'Etiqueta cerradura Touch-less S1/S2', cant: 1, uni: 'PZA' },
  { comp: 'T3', desc: 'Tornillo Allen 4x10', cant: 6, uni: 'PZA' },
]

/** el cerrojo y el contra tope de LEEDER los reemplaza el juego Touchless */
const TOUCHLESS_QUITA = new Set(['KCL', 'KCTL', 'KCTUM'])

const malos = comprobarRotulos()
console.log(malos === 0
  ? 'Rótulos: los 24 129 de hoy salen idénticos.'
  : `Rótulos: ${malos} no calzan con el libro.`)

const nuevasVariantes: Variante[] = []
const nuevasLineas: Renglon[] = []
const sinHermana: string[] = []

for (const l of LINEAS) {
  const de = l.base ?? l.pref
  for (const c of catalogo(l)) {
    for (const color of COLORES_ODOO) {
      const sku = [
        l.pref, c.pz, `${cm(c.ancho)}x${cm(c.alto)}`,
        ...(c.vars ? c.vars.split('-') : []),
        color.codigo, '12', color.acabado,
      ].join('-')
      if (yaEsta.has(sku)) continue
      const dp = hermana(de, c.pz, c.vars, color.codigo, c.alto, c.ancho)
      if (!dp) { sinHermana.push(sku); continue }
      const m2 = Number(((c.ancho / 100) * (c.alto / 100)).toFixed(6))

      const renglones: Renglon[] = []
      for (const r of porSku.get(dp.sku) ?? []) {
        // el sólido: mismo color, pero el área de la pieza nueva
        if (r.uni === 'm2') { renglones.push({ ...r, sku, cant: m2 }); continue }
        // el tubo ornamental y el refuerzo se miden en metros de la pieza
        if (r.uni === 'ML' && Math.abs(r.cant - dp.ancho / 100) < 0.005) {
          renglones.push({ ...r, sku, cant: Number((c.ancho / 100).toFixed(2)) })
          continue
        }
        if (r.uni === 'ML' && Math.abs(r.cant - dp.alto / 100) < 0.005) {
          renglones.push({ ...r, sku, cant: Number((c.alto / 100).toFixed(2)) })
          continue
        }
        // el zoclo va por el ancho de la pilastra
        if (r.comp.startsWith('ZLA')) {
          const a = Math.round(c.ancho)
          renglones.push({ ...r, sku, comp: `ZLA${a}`, desc: `Zoclo aluminio ${a}cm` })
          continue
        }
        if (l.pref === 'TCH' && TOUCHLESS_QUITA.has(r.comp)) continue
        renglones.push({ ...r, sku })
      }
      if (l.pref === 'TCH' && c.pz === 'PT') {
        for (const e of TOUCHLESS_PUERTA) renglones.push({ sku, tipo: 'Herraje', ...e })
      }

      nuevasVariantes.push({
        sku,
        nombre: rotulo(c.pz, c.ancho, c.alto, c.vars, color.codigo, l.nombre),
        linea: l.nombre,
        pieza: PIEZAS[c.pz],
        tamano: `${metros(c.ancho)}x${metros(c.alto)}`,
      })
      nuevasLineas.push(...renglones)
    }
  }
}

const ENC_IDX = ['SKU', 'Nombre del producto', 'Línea', 'Pieza', 'Tamaño (m)', 'm2', 'Atributos']
const ENC_BOM = ['SKU producto', 'Tipo', 'Componente (código)', 'Descripción componente', 'Cantidad', 'Unidad']

function filaIdx(v: Variante) {
  const [a, h] = v.tamano.split('x').map(Number)
  const p = partir(v.sku)
  return [
    v.sku, v.nombre, v.linea, v.pieza, v.tamano, Number((a * h).toFixed(6)),
    p.vars ? p.vars.split('-').map((x) => ETIQUETA[x] ?? x).join('/') : '',
  ]
}
const filaBom = (r: Renglon) => [r.sku, r.tipo, r.comp, r.desc, r.cant, r.uni]

const NOTAS = [
  ['Cómo se armó esto'],
  [],
  ['Cada variante nueva copia el BOM de su hermana del libro actual (misma línea, pieza, variante'],
  ['y color) y solo se le ajusta lo que depende de la medida: el sólido en m2, el tubo ornamental'],
  ['y el refuerzo en metros, y el zoclo, que va por ancho de pilastra.'],
  [],
  ['Prefijos de las dos líneas nuevas: cambialos si en Odoo se llaman distinto.'],
  ['REG = Regaderas (copia de Estándar; puerta y panel 1.80, pilastra 1.80)'],
  ['TCH = Touchless S3 (copia de Reforzado; puerta y panel 1.80, pilastra 2.10, más los electrónicos S3)'],
  [],
  ['Touchless: lo que NO se puede meter en el BOM de un producto'],
  ['KFP-S3 (fuente 24V) va 1 por AREA, +1 si el área pasa de 6 módulos.'],
  ['ARNES-EXT/FUENTE = KFP-S3 + una por puerta.'],
  ['ARNEST-S1/S2 (arnés tipo T) = techo(cubículos/3), +1 si pasa de 3.'],
  ['CANALETA PVC 20X20 = techo(metros de refuerzo / 2).'],
  ['Todos esos se agregan al pedido, no al producto.'],
  [],
  ['Touchless: la cerradura'],
  ['Va CERRADURA-S3 (magnética) porque el SKU no dice para qué lado abre la puerta.'],
  ['Las que abren hacia AFUERA llevan CERRADURA-S1/S2 y hay que cambiarlas en el pedido.'],
  [],
  ['Diferencias entre el libro actual y las reglas del Cálculo de Materiales (CIP)'],
  ['El CIP suma KPEDL (pedal) = KTA en zoclo; el libro no lo trae en ninguna línea.'],
  ['El CIP suma T7 = KTA o KPLE en Reforzado; el libro solo usa T7 en el perfil de Scudo.'],
  ['El CIP le dice 1918-610 al refuerzo de aluminio; el libro le dice REF-ALU.'],
  ['El CIP parte los kits U en KUS12M y KUS12N; el libro solo usa KUS12M.'],
  ['En Touchless el CIP usa KGNM (gancho normal + a muro); el libro parte KGS y KGM.'],
  ['Esas diferencias se dejaron como están en el libro para no mezclar dos criterios.'],
]

const salida = process.env.SALIDA_BOM ?? process.argv[2] ?? '.'
escribirXlsx(`${salida}/BOM_Mamparas_Nuevos.xlsx`, [
  { nombre: 'Variantes (índice)', filas: [ENC_IDX, ...nuevasVariantes.map(filaIdx)] },
  { nombre: 'BOM (líneas)', filas: [ENC_BOM, ...nuevasLineas.map(filaBom)] },
  { nombre: 'Notas', filas: NOTAS },
])
escribirXlsx(`${salida}/BOM_Mamparas_Completo_Actualizado.xlsx`, [
  { nombre: 'Variantes (índice)', filas: [ENC_IDX, ...idx.map(filaIdx), ...nuevasVariantes.map(filaIdx)] },
  { nombre: 'BOM (líneas)', filas: [ENC_BOM, ...bom.map(filaBom), ...nuevasLineas.map(filaBom)] },
  { nombre: 'Notas', filas: NOTAS },
])

console.log(`Variantes que ya tenía Odoo:  ${idx.length}`)
console.log(`Variantes nuevas:             ${nuevasVariantes.length}`)
console.log(`Líneas de BOM nuevas:         ${nuevasLineas.length}`)
console.log(`Sin hermana de dónde copiar:  ${sinHermana.length}`)
const porLinea = new Map<string, number>()
for (const v of nuevasVariantes) porLinea.set(v.linea, (porLinea.get(v.linea) ?? 0) + 1)
for (const [l, n] of [...porLinea].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${l}`)
if (sinHermana.length) console.log('ejemplos sin hermana:', sinHermana.slice(0, 5))
