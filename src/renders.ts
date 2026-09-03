import { COLORES, buscarColor } from './catalog'
import { COLORES_FUERA_DE_CATALOGO, RENDERS } from './datos/renders'
import { FOTOS_HERRAJES } from './datos/herrajes'
import type { Acabado, HerrajeAcabado, Linea, Terminacion, TipoCabina } from './types'

/**
 * Busca el render que le corresponde a lo que el vendedor eligió. Las fotos son
 * las de mercadeo (marca de agua incluida), bajadas a tamaño de pantalla por
 * scripts/importar-renders.mjs.
 *
 * No todas las combinaciones tienen foto: Imperial no tiene render propio y
 * NEUTRAL OAK no vino en el paquete. En esos casos se devuelve la foto más
 * cercana marcada como `referencia`, para que en pantalla se pueda avisar que
 * la foto no es exactamente esa combinación.
 */

export interface Foto {
  archivo: string
  /** true si la foto no es de esa combinación exacta, sino la más parecida */
  referencia: boolean
  /** qué se cambió para encontrarla, para poder avisarlo en pantalla */
  nota?: string
}

function corto(acabado: Acabado): 'lam' | 'esm' | 'inox' {
  if (acabado === 'Acero Inoxidable') return 'inox'
  if (acabado === 'Esmaltada Antigrafiti') return 'esm'
  return 'lam'
}

/** el modelo tal como lo nombran las carpetas de los renders */
function modeloBase(modelo: string): string {
  return modelo.replace(/^SUP_/, '')
}

/**
 * La carpeta que le toca exactamente a esa elección. Los orinales y las
 * regaderas tienen su propio render, aunque en la tabla de tarifas no siempre
 * sean un modelo aparte.
 */
function claveNatural(modelo: string, cabina?: TipoCabina): string {
  if (cabina === 'orinal') return '__ORINAL'
  if (cabina === 'regadera') return '__REGADERA'
  const base = modeloBase(modelo)
  return base === 'REGADERAS' ? '__REGADERA' : base
}

function candidatosModelo(modelo: string, cabina?: TipoCabina): string[] {
  // Imperial no tiene render propio: es el estándar con tubing ornamental, así
  // que la foto del estándar entra como referencia
  return [...new Set([claveNatural(modelo, cabina), modeloBase(modelo), 'ESTANDAR'])]
}

/**
 * El slug que le toca exactamente a ese color, o undefined si el color no
 * tiene render propio: un color especial escrito a mano, o uno de la lista de
 * México que no está en el catálogo.
 */
function slugExacto(color: string, acabado: Acabado, slugColor?: string): string | undefined {
  if (corto(acabado) === 'inox') return 'acero-inoxidable'
  if (corto(acabado) === 'esm') return 'esmaltada-antigrafiti'
  return slugColor ?? buscarColor(color)?.slug
}

/** con qué se reemplaza cuando el color no tiene foto propia */
function coloresDeRespaldo(acabado: Acabado): string[] {
  if (corto(acabado) === 'inox') return ['acero-inoxidable']
  if (corto(acabado) === 'esm') return ['esmaltada-antigrafiti', 'esmalte-blanco', 'esmalte-beige']
  return COLORES.filter((c) => c.tier === 'linea').map((c) => c.slug)
}

export interface Consulta {
  linea: Linea
  modelo: string
  acabado: Acabado
  color: string
  cabina?: TipoCabina
  /** para los colores de México, que no están en el catálogo de Costa Rica */
  slugColor?: string
}

export function fotoDe({ linea, modelo, acabado, color, cabina, slugColor }: Consulta): Foto | null {
  const a = corto(acabado)
  const modelos = candidatosModelo(modelo, cabina)
  const exacto = slugExacto(color, acabado, slugColor)
  const colores = [...new Set([...(exacto ? [exacto] : []), ...coloresDeRespaldo(acabado)])]

  for (const [im, m] of modelos.entries()) {
    for (const [ic, c] of colores.entries()) {
      const archivo = RENDERS[`${linea}|${m}|${a}|${c}`]
      if (!archivo) continue
      // solo es la foto de verdad si el color tenía render propio y se usó
      const colorExacto = exacto !== undefined && ic === 0
      if (im === 0 && colorExacto) return { archivo, referencia: false }
      const notas: string[] = []
      if (im > 0) notas.push(`la foto es del modelo ${m.replace('__', '').toLowerCase()}`)
      if (!colorExacto) {
        const nombre = COLORES.find((x) => x.slug === c)?.nombre ?? c
        notas.push(`el color de la foto es ${nombre}`)
      }
      return { archivo, referencia: true, nota: notas.join(' y ') }
    }
  }
  return null
}

/** cuántas fotos hay, para poder decirlo en pantalla */
export const TOTAL_RENDERS = Object.keys(RENDERS).length

export { COLORES_FUERA_DE_CATALOGO }

/**
 * El juego de herrajes que le toca a esa línea. Las fotos negras no llevan
 * línea, porque son las mismas piezas en negro para todas; las de acero
 * inoxidable sí, porque Superior 2.0 tiene bisagra de autorretorno y su propia
 * escuadra U.
 */
export interface FotoHerraje {
  pieza: string
  archivo: string
  /** true si la foto es la del juego negro porque en ese acabado falta */
  prestada?: boolean
}

/** el zoclo y la pata son la misma pieza en dos versiones: va solo la elegida */
function esDeTerminacion(pieza: string, terminacion: Terminacion): boolean {
  const p = pieza.toLowerCase()
  return terminacion === 'ZOCLO' ? p.includes('zoclo') : p.includes('pata')
}

function esZocloOPata(pieza: string): boolean {
  return esDeTerminacion(pieza, 'ZOCLO') || esDeTerminacion(pieza, 'PATAS')
}

export function fotosHerraje(
  linea: Linea,
  acabado: HerrajeAcabado,
  terminacion: Terminacion = 'ZOCLO',
): FotoHerraje[] {
  const juego = FOTOS_HERRAJES.filter(
    (f) => f.acabado === acabado && (f.linea === undefined || f.linea === linea),
  )
  const comunes = juego.filter((f) => !esZocloOPata(f.pieza))
  const propia = juego.find((f) => esDeTerminacion(f.pieza, terminacion))
  if (propia) return [...comunes, { pieza: propia.pieza, archivo: propia.archivo }]
  // Falta la foto de esa terminación en este acabado (hoy: la pata en acero
  // inoxidable). Entra la del juego negro, avisando que es prestada.
  const negra = FOTOS_HERRAJES.find(
    (f) => f.acabado === 'NEGRO' && esDeTerminacion(f.pieza, terminacion),
  )
  if (!negra) return comunes
  return [...comunes, { pieza: negra.pieza, archivo: negra.archivo, prestada: true }]
}

/**
 * Terminaciones que se pueden pedir con ese juego de herrajes. El juego negro
 * no tiene zoclo: va siempre con pata.
 */
export function terminacionesDe(acabado: HerrajeAcabado): Terminacion[] {
  return acabado === 'NEGRO' ? ['PATAS'] : ['ZOCLO', 'PATAS']
}

/** true si todavía no llegaron las fotos de ese juego */
export function faltanFotosHerraje(linea: Linea, acabado: HerrajeAcabado): boolean {
  return fotosHerraje(linea, acabado).length === 0
}
