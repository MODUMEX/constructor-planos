import type { jsPDF } from 'jspdf'
import type { Area, Proyecto } from '../types'
import { alturasDe, nombreModelo } from '../catalog'
import { nombreLinea as nombreDeLinea } from './piezas'
import { LOGO_MODUMEX, LOGO_RELACION } from '../assets/logo'

/**
 * Portada del juego de planos, la misma que hace el Constructor viejo: el logo,
 * el título, el modelo en la banda amarilla, la descripción de lo que se va a
 * instalar y la columna de datos a la derecha con la firma de aprobación.
 *
 * Va como primera hoja y no lleva dibujo: es lo que el cliente firma.
 */

const AMARILLO: [number, number, number] = [247, 200, 70]
const TINTA = 25
const GRIS = 130
const MARCA: [number, number, number] = [26, 42, 74]

/** pinta el logo respetando su proporción; devuelve el alto que ocupó */
export function ponerLogo(doc: jsPDF, x: number, y: number, ancho: number): number {
  const alto = ancho / LOGO_RELACION
  doc.addImage(LOGO_MODUMEX, 'PNG', x, y, ancho, alto, undefined, 'FAST')
  return alto
}

/**
 * El logo enorme y muy claro detrás del dibujo, como el de los planos de
 * Bradley. Se dibuja ANTES que las piezas para que no las tape.
 *
 * La transparencia se pide por GState; si la versión de jsPDF no la tuviera,
 * se sale sin pintar nada en vez de dejar un logo opaco encima del plano.
 */
export function marcaDeAgua(doc: jsPDF, hoja: { w: number; h: number }) {
  const conGState = doc as unknown as {
    GState?: (o: { opacity: number }) => unknown
    setGState?: (g: unknown) => void
  }
  if (typeof conGState.GState !== 'function' || typeof conGState.setGState !== 'function') return

  const ancho = hoja.w * 0.52
  const alto = ancho / LOGO_RELACION
  try {
    conGState.setGState(conGState.GState({ opacity: 0.06 }))
    doc.addImage(LOGO_MODUMEX, 'PNG', (hoja.w - ancho) / 2, (hoja.h - alto) / 2, ancho, alto, undefined, 'FAST')
  } finally {
    // se vuelve a opaco SIEMPRE: si no, todo lo que se dibuje después sale pálido
    if (typeof conGState.GState === 'function') conGState.setGState(conGState.GState({ opacity: 1 }))
  }
}

function texto(
  doc: jsPDF,
  s: string,
  x: number,
  y: number,
  o: { size?: number; bold?: boolean; color?: number | [number, number, number]; align?: 'left' | 'right' } = {},
) {
  doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
  doc.setFontSize(o.size ?? 8)
  if (Array.isArray(o.color)) doc.setTextColor(...o.color)
  else doc.setTextColor(o.color ?? TINTA)
  doc.text(s, x, y, { align: o.align ?? 'left' })
}

/**
 * El párrafo que describe lo que se va a instalar. Sale de la configuración
 * del área, así que dice siempre lo que de verdad se está fabricando.
 */
function descripcion(area: Area): string[] {
  const c = area.config
  const a = alturasDe(c.modelo)
  const remate = c.terminacion === 'ZOCLO' ? 'zoclo de acero inoxidable' : 'patas de acero inoxidable'
  return [
    'Suministro e instalación de mamparas sanitarias de laminado compacto.',
    `Puertas y pilastras de ${c.espesorMm}mm de espesor y paneles laterales de ${c.espesorMm}mm.`,
    `Línea ${nombreDeLinea(c.linea)}, modelo ${nombreModelo(c.linea, c.modelo)},`,
    `fijación a piso con ${remate};`,
    `herrajes, bisagras y cerrojos de ${nombreHerrajeLargo(c.herrajeAcabado)}.`,
    `Pilastras de ${(a.pilastra / 100).toFixed(2)}m, puertas y paneles laterales de ${(a.puerta / 100).toFixed(2)}m de altura.`,
    `COLOR DE DIVISIONES: ${c.color}${c.colorCodigo ? ` (${c.colorCodigo})` : ''}`,
  ]
}

function nombreHerrajeLargo(h: string): string {
  if (h === 'NEGRO') return 'acabado negro'
  if (h === 'INOX' || h === 'ACERO_INOX') return 'acero inoxidable'
  return 'acero inoxidable'
}

export function portada(
  doc: jsPDF,
  proyecto: Proyecto,
  area: Area,
  hoja: { w: number; h: number },
  margen: number,
  fecha: string,
  cajetinAlto: number,
) {
  const M = margen
  const c = area.config

  // marco de la hoja, igual que en los planos
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.7)
  doc.rect(M / 2, M / 2, hoja.w - M, hoja.h - M)

  // la columna de datos vive a la derecha; el resto es la parte "de lectura"
  const colX = hoja.w - M - 96
  doc.setLineWidth(0.4)
  doc.line(colX - 6, M / 2, colX - 6, hoja.h - M - cajetinAlto)

  // ---------- lado izquierdo ----------
  const altoLogo = ponerLogo(doc, M + 8, M + 6, 74)
  texto(doc, 'Mamparas Sanitarias Finas', M + 8, M + altoLogo + 22, { size: 8, color: GRIS })

  texto(doc, 'PLANO DE FABRICACIÓN', M + 8, M + altoLogo + 48, { size: 21, bold: true, color: MARCA })
  texto(doc, (proyecto.obra || 'Sin obra').toUpperCase(), M + 8, M + altoLogo + 60, { size: 12, bold: true })

  // banda amarilla con el modelo
  const bandaY = M + altoLogo + 68
  doc.setFillColor(...AMARILLO)
  doc.rect(M + 8, bandaY, colX - 6 - (M + 8) - 8, 13, 'F')
  texto(
    doc,
    `MODELO: ${nombreDeLinea(c.linea).toUpperCase()} ${nombreModelo(c.linea, c.modelo).toUpperCase()}`,
    M + 13,
    bandaY + 8.6,
    { size: 10.5, bold: true, color: MARCA },
  )

  texto(doc, 'DESCRIPCIÓN DEL MODELO A INSTALAR:', M + 8, bandaY + 26, { size: 8.6 })
  descripcion(area).forEach((linea, i) => {
    texto(doc, linea, M + 8, bandaY + 34 + i * 6.2, { size: 8.6 })
  })

  // ---------- columna de datos ----------
  const filas: [string, string][] = [
    ['N° PLANO:', proyecto.numero || '—'],
    ['OBRA:', proyecto.obra || '—'],
    ['UBICACIÓN OBRA:', proyecto.ubicacion || '—'],
    ['FECHA:', fecha],
    ['REVISIÓN:', '00'],
    ['CREADO POR:', proyecto.creadoPor || '—'],
    ['DISTRIBUIDOR:', proyecto.distribuidor || '—'],
    ['LÍNEA:', nombreDeLinea(c.linea)],
    ['MODELO:', nombreModelo(c.linea, c.modelo)],
    ['REMATE INFERIOR:', c.terminacion === 'ZOCLO' ? 'ZOCLO' : 'PATA'],
    ['ACABADO:', c.acabado],
    ['COLOR:', `${c.color}${c.colorCodigo ? ` (${c.colorCodigo})` : ''}`],
    ['ALTURA PILASTRA:', `${alturasDe(c.modelo).pilastra} cm`],
    ['KAP:', c.kap ? 'SÍ' : 'NO'],
  ]
  filas.forEach(([etiqueta, valor], i) => {
    const y = M + 12 + i * 9.4
    texto(doc, etiqueta, colX, y, { size: 7.4, bold: true, color: MARCA })
    texto(doc, valor, colX + 42, y, { size: 7.4 })
  })

  // firma
  const firmaY = hoja.h - M - cajetinAlto - 10
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.6)
  doc.line(colX, firmaY - 6, hoja.w - M - 4, firmaY - 6)
  texto(doc, 'FIRMA DE APROBACIÓN', colX, firmaY, { size: 8, bold: true })
}
