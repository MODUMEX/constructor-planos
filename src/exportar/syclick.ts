/**
 * El Excel que se sube a Syclick («Cotizar por Excel» / «Importar Excel»).
 *
 * Syclick no lee el CSV del CIP: pide su propia plantilla, con sus hojas y sus
 * SKU. El SKU se arma por partes y NO lleva la medida —esa va en columnas
 * aparte— ni el color, sino el GRUPO de color:
 *
 *     L  -  M1  -  LC  -  RF  -  PL  -  G1
 *     │     │      │      │      │      └─ grupo de color
 *     │     │      │      │      └──────── familia de la pieza
 *     │     │      │      └─────────────── modelo comercial
 *     │     │      └────────────────────── acabado
 *     │     └───────────────────────────── modelo
 *     └─────────────────────────────────── línea
 *
 * Los nombres de las hojas y de los encabezados son los de la plantilla y NO
 * se pueden tocar: el importador los busca por nombre.
 */
import type { Area, Config, Pais, Proyecto } from '../types'
import { MODELO_REGADERA, nombreModelo } from '../catalog'
import { grupoMx } from '../coloresMx'
import { agrupar, piezasDeArea } from './piezas'
import { libroXlsx, type HojaXlsx } from './xlsx'

/**
 * De cuántas cabinas para arriba un color especial cambia de SKU.
 *
 * Syclick parte "especial" y "fórmica" en MAYOR y MENOR a 10 módulos, y un
 * módulo es una CABINA (Dayanna, 12-oct-2026). Se cuentan las de TODA la
 * cotización, no las del área: es un precio por volumen.
 */
export const MODULOS_PARA_MAYOR = 10

const LINEA: Record<Config['linea'], string> = { LEEDER: 'L', SUPERIOR: 'S', TOUCHLESS: 'L' }
const MODELO: Record<Config['linea'], string> = { LEEDER: 'M1', SUPERIOR: '2', TOUCHLESS: 'S3' }

/** el modelo comercial, que es la cuarta parte del SKU */
const COMERCIAL: Record<string, string> = {
  ESTANDAR: 'ST',
  ESTANDAR170: 'ST170',
  REFORZADO: 'RF',
  REFORZADO170: 'RF170',
  IMPERIAL: 'IMP',
  REGADERAS: 'RG',
  KIDS: 'KD',
  SCUDO: 'SC',
  COLGANTE: 'CL',
  SUP_ESTANDAR: 'ST',
  SUP_ESTANDAR170: 'ST170',
  SUP_REFORZADO: 'RF',
  SUP_REFORZADO170: 'RF170',
  SUP_COLGANTE: 'CL',
  // Touchless es el Reforzado con los electrónicos S3: en Syclick es L-S3-LC-RF…
  // El sufijo lo decide la ALTURA de la pieza, ver `comercialDe`.
  TL_S3: 'RF',
}

/** la mampara de orinal se llama PM en Syclick */
const FAMILIA: Record<string, string> = { PL: 'PL', PN: 'PN', PT: 'PT', MG: 'PM' }

/** qué va en la columna Color de la hoja «Áreas» para cada grupo */
const COLOR_DEL_GRUPO: Record<string, string> = {
  CEM10: 'ESPECIAL MAYOR A 10 MODULOS',
  CEN10: 'ESPECIAL MENOR A 10 MODULOS',
  FM10: 'FORMICA MAYOR A 10 MODULOS',
  FN10: 'FORMICA MENOR A 10 MODULOS',
}

/** cuántas cabinas tiene la cotización entera */
export function cabinasDe(proyecto: Proyecto): number {
  return proyecto.areas.reduce(
    (n, a) => n + a.tramos.reduce((m, t) => m + t.cabinas.filter((c) => c.tipo !== 'orinal').length, 0),
    0,
  )
}

/**
 * El grupo de color del SKU.
 *
 * Cuando el acabado ES el color, el grupo sale de ahí. Si no, manda el grupo
 * de precio de México —el mismo `grupoMx` que ya usa la cotización— y lo que
 * no está en ninguno de los dos es ESPECIAL, partido por volumen.
 */
export function grupoSyclick(config: Config, cabinas: number): string {
  const mayor = cabinas >= MODULOS_PARA_MAYOR
  if (config.acabado === 'Acero Inoxidable') return 'AI'
  if (config.acabado === 'Esmaltada Antigrafiti') return 'EA'
  if (config.acabado === 'Fórmica') return mayor ? 'FM10' : 'FN10'
  const g = grupoMx(config.color, config.linea === 'TOUCHLESS' ? 'LEEDER' : config.linea)
  if (g === 1) return 'G1'
  if (g === 2) return 'G2'
  return mayor ? 'CEM10' : 'CEN10'
}

/**
 * El modelo comercial, que es la cuarta parte del SKU.
 *
 * En S3 hay dos: **RF** y **RF170**. El RF solo tiene la pieza de 150; todo
 * lo demás sale del RF170 (Dayanna, 21-oct-2026). Por eso acá no alcanza el
 * modelo del área: hace falta el alto de la pieza.
 */
function comercialDe(config: Config, altoCm: number | undefined, regadera: boolean): string {
  if (regadera) return COMERCIAL[MODELO_REGADERA]
  if (config.linea === 'TOUCHLESS') return altoCm === 150 ? 'RF' : 'RF170'
  return COMERCIAL[config.modelo] ?? 'ST'
}

/** el SKU de Syclick para esa familia de pieza */
export function skuSyclick(
  familia: string,
  config: Config,
  cabinas: number,
  regadera = false,
  altoCm?: number,
): string {
  const acabado =
    config.acabado === 'Acero Inoxidable' ? 'A' : config.acabado === 'Esmaltada Antigrafiti' ? 'E' : 'LC'
  return [
    LINEA[config.linea],
    MODELO[config.linea],
    acabado,
    comercialDe(config, altoCm, regadera),
    FAMILIA[familia] ?? familia,
    grupoSyclick(config, cabinas),
  ].join('-')
}

/** PATA o ZOCLO; solo la pilastra lleva remate */
function remate(familia: string, config: Config): string {
  if (FAMILIA[familia] !== 'PL') return ''
  return config.terminacion === 'PATAS' ? 'PATA' : 'ZOCLO'
}

/** el nombre del área como lo va a ver Syclick; no se puede repetir */
function nombresUnicos(areas: Area[]): string[] {
  const usados = new Set<string>()
  return areas.map((a, i) => {
    const base = (a.nombre || `Área ${i + 1}`).slice(0, 100)
    let n = base
    let k = 2
    while (usados.has(n)) n = `${base.slice(0, 96)} (${k++})`
    usados.add(n)
    return n
  })
}

export function nombreArchivoSyclick(proyecto: Proyecto): string {
  const n = (proyecto.numero || 'sin-numero').replace(/[^\w.-]+/g, '-')
  return `Syclick-${n}.xlsx`
}

export function generarSyclick(proyecto: Proyecto, _pais: Pais = 'MX'): Uint8Array {
  const cabinas = cabinasDe(proyecto)
  const nombres = nombresUnicos(proyecto.areas)

  const generales: HojaXlsx = {
    nombre: 'Datos generales',
    filas: [
      ['Dato', 'Valor (opcional)'],
      ['Nombre del cliente', proyecto.cliente || ''],
      ['Nombre de la obra', proyecto.obra || ''],
      ['Atención a', proyecto.distribuidor || ''],
    ],
  }

  const areas: HojaXlsx = {
    nombre: 'Áreas',
    filas: [['Área', 'Descripción', 'Ambientes', 'Color', 'Color libre']],
  }
  const captura: HojaXlsx = {
    nombre: 'Captura',
    filas: [['Área', 'SKU', 'Ancho (cm)', 'Alto (cm)', 'Remate inferior', 'Cantidad']],
  }

  proyecto.areas.forEach((area, i) => {
    const config = area.config
    const grupo = grupoSyclick(config, cabinas)
    const fijo = COLOR_DEL_GRUPO[grupo]

    /**
     * Un área de Syclick es de UN SOLO modelo.
     *
     * En la plataforma el área lleva su línea, su modelo y su color, y de ahí
     * salen los SKU; no se pueden revolver. Así que un área del Constructor
     * que tenga cubículos de REGADERA se parte en dos: la de siempre con lo
     * normal y otra, "… · Regadera", con las piezas del cubículo. Es como lo
     * manda Sanimax a mano: en la cotización 103451 son tres áreas, y la del
     * medio es "MODULO REGADERA BAÑOS DORMITORIOS" con modelo REGADERAS.
     */
    const porModelo = new Map<string, { nombre: string; modelo: string; filas: Map<string, (string | number)[]> }>()
    const cajon = (esRegadera: boolean) => {
      const k = esRegadera ? 'RG' : 'ST'
      if (!porModelo.has(k)) {
        porModelo.set(k, {
          nombre: esRegadera ? `${nombres[i]} · Regadera`.slice(0, 100) : nombres[i],
          modelo: esRegadera ? MODELO_REGADERA : config.modelo,
          filas: new Map(),
        })
      }
      return porModelo.get(k)!
    }

    /**
     * Para Syclick dos renglones son el mismo cuando coinciden SKU, medida y
     * remate. El despiece los trae separados porque distingue cosas que acá no
     * viajan —una puerta izquierda de una derecha, una pilastra central de una
     * lateral—, y sin juntarlos la hoja salía con dos filas idénticas que la
     * plataforma suma igual pero que al leerlas parecen un error.
     */
    for (const r of agrupar(piezasDeArea(area), config)) {
      const caja = cajon(!!r.regadera)
      const sku = skuSyclick(r.familia, config, cabinas, r.regadera, r.altoCm)
      const rem = remate(r.familia, config)
      const clave = `${sku}|${r.anchoCm}|${r.altoCm}|${rem}`
      const ya = caja.filas.get(clave)
      if (ya) ya[5] = Number(ya[5]) + r.cantidad
      else caja.filas.set(clave, [caja.nombre, sku, r.anchoCm, r.altoCm, rem, r.cantidad])
    }

    // primero la de siempre y después la de regadera, como en la cotización
    for (const k of ['ST', 'RG']) {
      const caja = porModelo.get(k)
      if (!caja || !caja.filas.size) continue
      areas.filas.push([
        caja.nombre,
        // la descripción es obligatoria para las áreas nuevas
        `${nombreModelo(config.linea, caja.modelo)} · ${config.acabado}`,
        1,
        // con un color especial va la etiqueta del grupo y el color de verdad
        // viaja en «Color libre»; si no, el color tal cual
        fijo ?? (grupo === 'AI' ? '' : config.color.toUpperCase()),
        fijo ? config.color.slice(0, 60) : '',
      ])
      for (const fila of caja.filas.values()) captura.filas.push(fila)
    }
  })

  const otros: HojaXlsx = { nombre: 'Otros productos', filas: [['SKU', 'Cantidad']] }

  return libroXlsx([generales, areas, captura, otros])
}
