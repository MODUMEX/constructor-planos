import { jsPDF } from 'jspdf'
import type { Descuento, Moneda, Proyecto, RenglonBOM } from '../types'
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
  /** los renglones separados por área, para que se vea qué va a cada una */
  porArea?: { nombre: string; renglones: RenglonBOM[] }[]
  moneda: Moneda
  /** los descuentos en cascada, en orden */
  descuentos: Descuento[]
  /** para quién es la hoja; la del cliente no lleva el descuento del distribuidor */
  para?: 'distribuidor' | 'cliente'
  ivaPct: number
  /** quién la emite, para el pie */
  vendedor: string
  /** el logo del distribuidor como data URI; va al lado del de Modumex */
  logoDistribuidor?: string | null
  /** validez en días; la cotización dice hasta cuándo vale */
  validezDias?: number
  /** número de la cotización si ya está guardada */
  numero?: string
  /** estado en la app: Pendiente / Enviada / Rechazada */
  estado?: string
}

export interface PasoDescuento {
  etiqueta: string
  pct: number
  /** lo que se lleva ESTE descuento, ya sobre lo que dejó el anterior */
  monta: number
  /** con lo que queda el subtotal después de aplicarlo */
  subtotal: number
}

export interface Totales {
  neto: number
  /** cada descuento, en cascada, con lo que se llevó y lo que dejó */
  pasos: PasoDescuento[]
  /** la suma de todos los descuentos */
  descuento: number
  gravable: number
  iva: number
  total: number
}

/**
 * Los mismos números que muestra la pantalla, en un solo lugar.
 *
 * Los descuentos van EN CASCADA: cada uno se calcula sobre lo que dejó el
 * anterior, no sobre el neto. Un 5 % y otro 5 % sobre 100 dan 90,25, no 90.
 */
export function totalesDe(renglones: RenglonBOM[], descuentos: Descuento[], ivaPct: number): Totales {
  const neto = renglones.reduce((s, r) => s + r.cantidad * r.precioUnit, 0)
  const pasos: PasoDescuento[] = []
  let corriendo = neto
  for (const d of descuentos) {
    const pct = Number(d.pct) || 0
    if (pct <= 0) continue
    const monta = corriendo * (pct / 100)
    corriendo -= monta
    pasos.push({ etiqueta: d.etiqueta, pct, monta, subtotal: corriendo })
  }
  const gravable = corriendo
  const iva = gravable * (ivaPct / 100)
  return { neto, pasos, descuento: neto - gravable, gravable, iva, total: gravable + iva }
}

/** los descuentos que SÍ van en la hoja del cliente: todos menos el del distribuidor */
export function descuentosDelCliente(descuentos: Descuento[]): Descuento[] {
  return descuentos.filter((d) => d.origen !== 'distribuidor')
}

/** Las familias del cuadro resumen, en el orden en que se leen. */
const ORDEN_PIEZAS = ['Puerta', 'Panel', 'Pilastra', 'Mingitorio', 'Antepecho']

/**
 * Cuántas piezas lleva el pedido, por familia. Es la cuenta que se hace a mano
 * al final de cada cotización para saber qué se va a fabricar.
 */
export function resumenDePiezas(renglones: RenglonBOM[]): { tipo: string; cantidad: number }[] {
  const por = new Map<string, number>()
  for (const r of renglones) por.set(r.tipo, (por.get(r.tipo) ?? 0) + r.cantidad)
  const orden = (t: string) => {
    const i = ORDEN_PIEZAS.indexOf(t)
    return i < 0 ? ORDEN_PIEZAS.length : i
  }
  return [...por.entries()]
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => orden(a.tipo) - orden(b.tipo) || a.tipo.localeCompare(b.tipo))
}

/**
 * En pantalla el colón se escribe ₡, pero las fuentes que trae jsPDF son
 * WinAnsi y ahí ese signo no existe: salía un "¡". Se usa ¢, que sí está y es
 * lo que se pone en Costa Rica cuando el sistema no da el ₡.
 */
function plata(v: number, moneda: Moneda): string {
  // el peso y el dólar comparten el signo: el de México se escribe MX$ para
  // que no se confunda una cotización con la otra
  const simbolo = moneda === 'CRC' ? '¢' : moneda === 'MXN' ? 'MX$' : '$'
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

  // El logo del distribuidor va a la derecha del de Modumex, separado por una
  // rayita. Si la imagen viniera rota se sigue sin él: una cotización sin logo
  // se entiende, una que no se genera no.
  if (d.logoDistribuidor) {
    try {
      const prop = doc.getImageProperties(d.logoDistribuidor)
      const maxAlto = Math.max(altoLogo, 12)
      const maxAncho = 40
      const escala = Math.min(maxAncho / prop.width, maxAlto / prop.height)
      const w = prop.width * escala
      const h = prop.height * escala
      const x = M + 46 + 8
      doc.setDrawColor(210)
      doc.line(M + 46 + 4, M, M + 46 + 4, M + maxAlto)
      doc.addImage(d.logoDistribuidor, x, M + (maxAlto - h) / 2, w, h, undefined, 'FAST')
    } catch {
      // logo ilegible: se omite y la cotización sale igual
    }
  }

  let y = M + Math.max(altoLogo, 16) + 8

  doc.setTextColor(...MARCA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(d.para === 'distribuidor' ? 'COTIZACIÓN · DISTRIBUIDOR' : 'COTIZACIÓN', HOJA.w - M, M + 8, { align: 'right' })

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
  // la hoja del cliente no lleva el descuento del distribuidor: eso es lo que
  // el distribuidor COMPRA, no lo que le vende a su cliente
  const descuentos = d.para === 'cliente' ? descuentosDelCliente(d.descuentos) : d.descuentos
  const t = totalesDe(d.renglones, descuentos, d.ivaPct)

  // x de cada columna: las tres de plata van alineadas a la derecha
  const cols = [M + 2, M + 30, HOJA.w - M - 78, HOJA.w - M - 40, HOJA.w - M - 2]
  const anchoDesc = cols[2] - cols[1] - 16

  let hojaN = 1
  let y = encabezado(doc, proyecto, d, hojaN)
  y = tituloTabla(doc, y, cols)

  // el pie de plata ocupa lo suyo: la tabla no puede llegar hasta el borde
  const tope = HOJA.h - M - 62

  doc.setFont('helvetica', 'normal')

  const sitio = (alto: number) => {
    if (y + alto <= tope) return
    doc.addPage()
    hojaN += 1
    y = encabezado(doc, proyecto, d, hojaN)
    y = tituloTabla(doc, y, cols)
    doc.setFont('helvetica', 'normal')
  }

  /** una banda gris con el nombre del área, antes de sus renglones */
  const tituloArea = (nombre: string, renglones: RenglonBOM[]) => {
    // el título solo sirve si abajo entra al menos un renglón
    sitio(6 + 6)
    doc.setFillColor(236, 239, 244)
    doc.rect(M, y, HOJA.w - M * 2, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MARCA)
    doc.text(nombre.toUpperCase(), cols[0], y + 4.2)
    const suma = renglones.reduce((a, r) => a + r.cantidad * r.precioUnit, 0)
    doc.text(plata(suma, d.moneda), cols[4], y + 4.2, { align: 'right' })
    y += 6
    doc.setFont('helvetica', 'normal')
  }

  const fila = (r: RenglonBOM, i: number) => {
    sitio(6)
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

  // Con más de un área se separa por área, con su subtotal: es lo que se mira
  // para saber qué le toca a cada baño. Con una sola no hace falta el rótulo.
  const areas = (d.porArea ?? []).filter((a) => a.renglones.length > 0)
  if (areas.length > 1) {
    for (const a of areas) {
      tituloArea(a.nombre || 'Área', a.renglones)
      a.renglones.forEach(fila)
    }
  } else {
    d.renglones.forEach(fila)
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
  // cada descuento con lo que se lleva y con lo que deja: en cascada, el
  // segundo muerde lo que dejó el primero, así que el desglose importa
  for (const p of t.pasos) {
    // guion normal, no el signo menos largo: ese tampoco está en WinAnsi
    renglonPlata(`${p.etiqueta} ${p.pct}%`, `-${plata(p.monta, d.moneda)}`)
    renglonPlata('Subtotal', plata(p.subtotal, d.moneda))
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

  // ---------- cuántas piezas lleva el pedido ----------
  const piezas = resumenDePiezas(d.renglones)
  if (piezas.length > 0) {
    const altoCuadro = 7 + piezas.length * 5 + 3
    if (y + altoCuadro > HOJA.h - M - 34) {
      doc.addPage()
      hojaN += 1
      y = encabezado(doc, proyecto, d, hojaN)
    }
    const ancho = 74
    doc.setFillColor(...MARCA)
    doc.rect(M, y - 4, ancho, 7, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('PIEZAS DEL PEDIDO', M + 2, y + 0.8)
    let yp = y + 7
    for (const p of piezas) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(TINTA)
      doc.text(p.tipo, M + 2, yp)
      doc.setFont('helvetica', 'bold')
      doc.text(String(p.cantidad), M + ancho - 2, yp, { align: 'right' })
      yp += 5
    }
    doc.setDrawColor(210)
    doc.line(M, yp - 3.4, M + ancho, yp - 3.4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...MARCA)
    doc.text('Total de piezas', M + 2, yp)
    doc.text(String(piezas.reduce((a, p) => a + p.cantidad, 0)), M + ancho - 2, yp, { align: 'right' })
    y = yp + 9
  }

  // ---------- condiciones ----------
  doc.setTextColor(GRIS)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('CONDICIONES', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const condiciones = [
    `Precios en ${d.moneda === 'CRC' ? 'colones costarricenses' : d.moneda === 'MXN' ? 'pesos mexicanos' : 'dólares estadounidenses'}, IVA incluido en el total.`,
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

export function nombreArchivoCotizacion(
  proyecto: Proyecto,
  numero?: string,
  para?: 'distribuidor' | 'cliente',
): string {
  const limpio = (s: string) => s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  const partes = [
    'Cotizacion',
    para === 'distribuidor' ? 'Distribuidor' : para === 'cliente' ? 'Cliente' : '',
    limpio(numero || proyecto.numero || ''),
    limpio(proyecto.obra || ''),
  ].filter(Boolean)
  if (partes.length === 1) partes.push('proyecto')
  return partes.join('-') + '.pdf'
}
