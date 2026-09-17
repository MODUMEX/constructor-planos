import { jsPDF } from 'jspdf'
import type { Moneda, Proyecto, RenglonBOM } from '../types'
import { nombreModelo } from '../catalog'
import { marcaDeAgua, ponerLogo } from './portada'
import { nombreLinea } from './piezas'

/**
 * La cotización en PDF, para que el distribuidor se la lleve al cliente.
 *
 * Es carta vertical: el encabezado con el logo y los datos del proyecto, la
 * tabla de renglones —que se parte en las hojas que haga falta—, el resumen de
 * plata y las condiciones al pie.
 */

const HOJA = { w: 215.9, h: 279.4 } // carta vertical, en mm
const M = 16
const TINTA = 25
const GRIS = 130
const MARCA: [number, number, number] = [26, 42, 74]
const AMARILLO: [number, number, number] = [247, 200, 70]

export interface DatosCotizacion {
  renglones: RenglonBOM[]
  moneda: Moneda
  /** % de descuento del distribuidor; 0 si no tiene */
  descuentoPct: number
  ivaPct: number
  /** quién la emite, para el pie */
  vendedor: string
  /** validez en días; la cotización dice hasta cuándo vale */
  validezDias?: number
  /** número de la cotización si ya está guardada */
  numero?: string
  /** estado en la app: Pendiente / Enviada / Rechazada */
  estado?: string
}

export interface Totales {
  neto: number
  descuento: number
  gravable: number
  iva: number
  total: number
}

/** Los mismos números que muestra la pantalla, en un solo lugar. */
export function totalesDe(renglones: RenglonBOM[], descuentoPct: number, ivaPct: number): Totales {
  const neto = renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  const descuento = neto * (descuentoPct / 100)
  const gravable = neto - descuento
  const iva = gravable * (ivaPct / 100)
  return { neto, descuento, gravable, iva, total: gravable + iva }
}

/**
 * En pantalla el colón se escribe ₡, pero las fuentes que trae jsPDF son
 * WinAnsi y ahí ese signo no existe: salía un "¡". Se usa ¢, que sí está y es
 * lo que se pone en Costa Rica cuando el sistema no da el ₡.
 */
function plata(v: number, moneda: Moneda): string {
  const simbolo = moneda === 'CRC' ? '¢' : '$'
  return `${simbolo}${v.toLocaleString('es-CR', {
    minimumFractionDigits: moneda === 'CRC' ? 0 : 2,
    maximumFractionDigits: moneda === 'CRC' ? 0 : 2,
  })}`
}

const hoy = () =>
  new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })

function vence(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** corta un texto al ancho que se le diga, con puntos suspensivos */
function recortar(doc: jsPDF, texto: string, ancho: number): string {
  if (doc.getTextWidth(texto) <= ancho) return texto
  let t = texto
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > ancho) t = t.slice(0, -1)
  return `${t}…`
}

/** encabezado de la hoja: logo, título y la banda con el modelo */
function encabezado(doc: jsPDF, proyecto: Proyecto, d: DatosCotizacion, hojaN: number): number {
  marcaDeAgua(doc, HOJA)

  const altoLogo = ponerLogo(doc, M, M, 46)
  let y = M + Math.max(altoLogo, 16) + 8

  doc.setTextColor(...MARCA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('COTIZACIÓN', HOJA.w - M, M + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS)
  const cabecera = [
    d.numero ? `N° ${d.numero}` : null,
    `Plano ${proyecto.numero || '—'}`,
    hoy(),
    hojaN > 1 ? `Hoja ${hojaN}` : null,
  ].filter(Boolean).join('  ·  ')
  doc.text(cabecera, HOJA.w - M, M + 14, { align: 'right' })

  if (hojaN > 1) return y

  // banda amarilla con la línea y el modelo, como la portada del plano
  const config = proyecto.areas[0]?.config
  if (config) {
    doc.setFillColor(...AMARILLO)
    doc.rect(M, y, HOJA.w - M * 2, 9, 'F')
    doc.setTextColor(TINTA)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(
      `${nombreLinea(config.linea)} · ${nombreModelo(config.linea, config.modelo)} · ${config.color}`,
      M + 4, y + 6.2,
    )
    y += 15
  }

  // los datos del proyecto en dos columnas
  const izquierda: [string, string][] = [
    ['Obra', proyecto.obra || '—'],
    ['Cliente', proyecto.cliente || '—'],
    ['Ubicación', proyecto.ubicacion || '—'],
  ]
  const derecha: [string, string][] = [
    ['Distribuidor', proyecto.distribuidor || '—'],
    ['Atendido por', d.vendedor || proyecto.creadoPor || '—'],
    ['Validez', `${d.validezDias ?? 30} días · hasta el ${vence(d.validezDias ?? 30)}`],
  ]
  const columna = (filas: [string, string][], x: number, ancho: number) => {
    let yy = y
    for (const [etiqueta, valor] of filas) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(GRIS)
      doc.text(etiqueta.toUpperCase(), x, yy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(TINTA)
      doc.text(recortar(doc, valor, ancho), x, yy + 4.6)
      yy += 11
    }
    return yy
  }
  const mitad = (HOJA.w - M * 2 - 8) / 2
  const finIzq = columna(izquierda, M, mitad)
  const finDer = columna(derecha, M + mitad + 8, mitad)
  return Math.max(finIzq, finDer) + 4
}

/** la fila de encabezados de la tabla; devuelve dónde sigue el cuerpo */
function tituloTabla(doc: jsPDF, y: number, cols: number[]): number {
  doc.setFillColor(...MARCA)
  doc.rect(M, y, HOJA.w - M * 2, 7, 'F')
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('CÓDIGO', cols[0], y + 4.8)
  doc.text('DESCRIPCIÓN', cols[1], y + 4.8)
  doc.text('CANT.', cols[2], y + 4.8, { align: 'right' })
  doc.text('UNITARIO', cols[3], y + 4.8, { align: 'right' })
  doc.text('TOTAL', cols[4], y + 4.8, { align: 'right' })
  return y + 7
}

export function generarCotizacionPDF(proyecto: Proyecto, d: DatosCotizacion): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const t = totalesDe(d.renglones, d.descuentoPct, d.ivaPct)

  // x de cada columna: las tres de plata van alineadas a la derecha
  const cols = [M + 2, M + 30, HOJA.w - M - 78, HOJA.w - M - 40, HOJA.w - M - 2]
  const anchoDesc = cols[2] - cols[1] - 16

  let hojaN = 1
  let y = encabezado(doc, proyecto, d, hojaN)
  y = tituloTabla(doc, y, cols)

  // el pie de plata ocupa lo suyo: la tabla no puede llegar hasta el borde
  const tope = HOJA.h - M - 62

  doc.setFont('helvetica', 'normal')
  for (const [i, r] of d.renglones.entries()) {
    if (y + 6 > tope) {
      doc.addPage()
      hojaN += 1
      y = encabezado(doc, proyecto, d, hojaN)
      y = tituloTabla(doc, y, cols)
      doc.setFont('helvetica', 'normal')
    }
    if (i % 2 === 1) {
      doc.setFillColor(246, 247, 250)
      doc.rect(M, y, HOJA.w - M * 2, 6, 'F')
    }
    doc.setFontSize(7.5)
    doc.setTextColor(GRIS)
    doc.text(r.sku, cols[0], y + 4.2)
    doc.setFontSize(8.5)
    doc.setTextColor(TINTA)
    doc.text(recortar(doc, r.descripcion, anchoDesc), cols[1], y + 4.2)
    doc.text(String(r.cantidad), cols[2], y + 4.2, { align: 'right' })
    doc.text(plata(r.precioUnit, d.moneda), cols[3], y + 4.2, { align: 'right' })
    doc.text(plata(r.cantidad * r.precioUnit, d.moneda), cols[4], y + 4.2, { align: 'right' })
    y += 6
  }

  doc.setDrawColor(210)
  doc.line(M, y, HOJA.w - M, y)
  y += 7

  // ---------- el resumen de plata, pegado a la derecha ----------
  const xEtiqueta = HOJA.w - M - 78
  const renglonPlata = (etiqueta: string, valor: string, fuerte = false) => {
    doc.setFont('helvetica', fuerte ? 'bold' : 'normal')
    doc.setFontSize(fuerte ? 10 : 9)
    doc.setTextColor(fuerte ? TINTA : GRIS)
    doc.text(etiqueta, xEtiqueta, y)
    doc.setTextColor(TINTA)
    doc.text(valor, HOJA.w - M - 2, y, { align: 'right' })
    y += fuerte ? 7 : 5.6
  }

  renglonPlata('Subtotal', plata(t.neto, d.moneda))
  // el descuento solo aparece si de verdad lo hay: un "0 %" confunde al cliente
  if (d.descuentoPct > 0) {
    // guion normal, no el signo menos largo: ese tampoco está en WinAnsi
    renglonPlata(`Descuento ${d.descuentoPct}%`, `-${plata(t.descuento, d.moneda)}`)
    renglonPlata('Subtotal con descuento', plata(t.gravable, d.moneda))
  }
  renglonPlata(`IVA ${d.ivaPct}%`, plata(t.iva, d.moneda))

  y += 1
  doc.setFillColor(...MARCA)
  doc.rect(xEtiqueta - 4, y - 5, HOJA.w - M - xEtiqueta + 2, 10, 'F')
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL', xEtiqueta, y + 1.8)
  doc.text(plata(t.total, d.moneda), HOJA.w - M - 2, y + 1.8, { align: 'right' })
  y += 14

  // ---------- condiciones ----------
  doc.setTextColor(GRIS)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('CONDICIONES', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const condiciones = [
    `Precios en ${d.moneda === 'CRC' ? 'colones costarricenses' : 'dólares estadounidenses'}, IVA incluido en el total.`,
    `Esta cotización vale ${d.validezDias ?? 30} días a partir de la fecha.`,
    'Los precios incluyen el herraje y el riel de amarre de las piezas cotizadas.',
    'No incluye instalación, obra civil, fletes ni permisos, salvo que se indique aparte.',
    'La fabricación arranca con la orden de compra y el plano aprobado y firmado.',
  ]
  let yc = y + 4
  for (const linea of condiciones) {
    doc.text(`·  ${linea}`, M, yc)
    yc += 4
  }

  // ---------- pie, igual en todas las hojas ----------
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setDrawColor(210)
    doc.line(M, HOJA.h - M - 9, HOJA.w - M, HOJA.h - M - 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(GRIS)
    doc.text(`Modumex · ${proyecto.obra || 'Cotización'}`, M, HOJA.h - M - 4)
    doc.text(`Hoja ${p} de ${paginas}`, HOJA.w - M, HOJA.h - M - 4, { align: 'right' })
  }

  return doc
}

export function nombreArchivoCotizacion(proyecto: Proyecto, numero?: string): string {
  const limpio = (s: string) => s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  const partes = ['Cotizacion', limpio(numero || proyecto.numero || ''), limpio(proyecto.obra || '')]
    .filter(Boolean)
  if (partes.length === 1) partes.push('proyecto')
  return partes.join('-') + '.pdf'
}
