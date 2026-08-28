import { jsPDF } from 'jspdf'
import type { Area, Proyecto } from '../types'
import {
  acumulado, cajaDelPlano, ESPESOR_MURO, marcosDe, PROF_ORINAL_CM, profundidadDeTramo, pt, type Marco,
} from '../geometria'
import { nombreHerraje, tipologia } from '../catalog'
import { anchoTotal } from '../modulacion'
import { agrupar, modeloParaCsv, nombreLinea, nombreSistema, piezasDeArea } from './piezas'
import { ALTO_ORINAL_CM, ALTO_WC_CM, ORINAL, WC } from '../assets/sanitarios'

/**
 * Plano en PDF: una hoja por área, con el dibujo a escala, las cotas
 * encadenadas, el cuadro de piezas a la derecha y el cajetín abajo.
 * Usa la misma geometría que la pantalla (src/geometria.ts), así que lo que
 * se ve en el editor es lo que sale impreso.
 */

const HOJA = { w: 279.4, h: 215.9 } // carta horizontal, en mm
const M = 8 // margen
const CAJETIN_H = 30
const PANEL_W = 74 // cuadro de piezas a la derecha

const TINTA = 25
const GRIS = 130
/** azul del logo, para las hojas de puerta */
const MARCA: [number, number, number] = [42, 76, 143]
/** gris azulado de las cotas: no compite con el azul de la marca */
const COTA: [number, number, number] = [74, 90, 114]
/** arco de barrido de la puerta */
const ARCO: [number, number, number] = [143, 163, 196]

interface Escala {
  k: number
  ox: number
  oy: number
}

function aHoja(e: Escala, p: { x: number; y: number }): [number, number] {
  return [e.ox + p.x * e.k, e.oy + p.y * e.k]
}

function texto(doc: jsPDF, s: string, x: number, y: number, opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; angle?: number; color?: number | [number, number, number] } = {}) {
  doc.setFontSize(opts.size ?? 7)
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  const c = opts.color ?? TINTA
  if (Array.isArray(c)) doc.setTextColor(c[0], c[1], c[2])
  else doc.setTextColor(c)
  doc.text(s, x, y, { align: opts.align ?? 'left', angle: opts.angle })
}

/** arco aproximado con segmentos: jsPDF no tiene primitiva de arco */
function arco(doc: jsPDF, cx: number, cy: number, r: number, desde: number, hasta: number) {
  const pasos = 14
  let px = cx + r * Math.cos(desde)
  let py = cy + r * Math.sin(desde)
  for (let i = 1; i <= pasos; i++) {
    const a = desde + ((hasta - desde) * i) / pasos
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    doc.line(px, py, x, y)
    px = x
    py = y
  }
}

function murosYPiezas(doc: jsPDF, area: Area, e: Escala, marcos: Marco[]) {
  const conEsquina = tipologia(area.config.tipologia).esquinaCompartida
  // el grueso de panel y pilastra sale del espesor del material: 3 mm en Superior, 12 en compacto
  const grueso = Math.max(area.config.espesorMm / 10, 0.3)

  area.tramos.forEach((tramo, ti) => {
    const m = marcos[ti]
    if (!m) return
    const largo = anchoTotal(tramo.cabinas)
    // un tramo de puros orinales se dibuja con el fondo de la mampara
    const prof = profundidadDeTramo(tramo, area.config.profundidadCm)
    const horizontal = Math.abs(m.ax) === 1
    const acum = acumulado(tramo.cabinas)

    // muro de fondo
    doc.setFillColor(214, 214, 214)
    doc.setDrawColor(90)
    doc.setLineWidth(0.35)
    const [mx, my] = aHoja(e, pt(m, 0, -ESPESOR_MURO))
    const [mx2, my2] = aHoja(e, pt(m, largo, 0))
    doc.rect(Math.min(mx, mx2), Math.min(my, my2), Math.abs(mx2 - mx) || ESPESOR_MURO * e.k, Math.abs(my2 - my) || ESPESOR_MURO * e.k, 'FD')

    const muroLateral = (u0: number, u1: number) => {
      const [ax, ay] = aHoja(e, pt(m, u0, -ESPESOR_MURO))
      const [bx, by] = aHoja(e, pt(m, u1, prof))
      doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay), 'FD')
    }
    if (tramo.muroInicio && !conEsquina) muroLateral(-ESPESOR_MURO, 0)
    if (tramo.muroFin && !conEsquina) muroLateral(largo, largo + ESPESOR_MURO)

    // línea de frente
    doc.setDrawColor(150)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([1.4, 1], 0)
    const [f0x, f0y] = aHoja(e, pt(m, 0, prof))
    const [f1x, f1y] = aHoja(e, pt(m, largo, prof))
    doc.line(f0x, f0y, f1x, f1y)
    doc.setLineDashPattern([], 0)

    // Pilastras vistas en planta. Van con SU ancho de pieza (10–85 cm según el
    // catálogo), no con el espesor del material: son dimensiones distintas.
    // Antes no se dibujaban en el PDF, así que el plano salía sin ellas.
    if (tramo.cabinas.length > 0) {
      const anchoPil = Math.max(area.config.anchoPilastraCm, grueso)
      const cortes = [0, ...acum.slice(1), largo]
      doc.setFillColor(120, 120, 120)
      doc.setDrawColor(70)
      doc.setLineWidth(0.25)
      cortes.forEach((u, k) => {
        // en los extremos se corre hacia adentro para no invadir el muro
        const centro = k === 0 ? u + anchoPil / 2 : k === cortes.length - 1 ? u - anchoPil / 2 : u
        const [ax, ay] = aHoja(e, pt(m, centro - anchoPil / 2, prof - grueso))
        const [bx, by] = aHoja(e, pt(m, centro + anchoPil / 2, prof))
        doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay), 'FD')
      })
    }

    tramo.cabinas.forEach((cab, i) => {
      const u0 = acum[i]
      const u1 = u0 + cab.anchoCm

      // panel divisor o cierre
      const esUltima = i === tramo.cabinas.length - 1
      const dibujarPanel = !esUltima || !tramo.muroFin
      if (dibujarPanel) {
        doc.setFillColor(TINTA, TINTA, TINTA)
        const [ax, ay] = aHoja(e, pt(m, u1 - grueso / 2, 0))
        const [bx, by] = aHoja(e, pt(m, u1 + grueso / 2, prof))
        doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.max(Math.abs(bx - ax), 0.5), Math.max(Math.abs(by - ay), 0.5), 'F')
      }
      if (i === 0 && !tramo.muroInicio) {
        doc.setFillColor(TINTA, TINTA, TINTA)
        const [ax, ay] = aHoja(e, pt(m, -grueso / 2, 0))
        const [bx, by] = aHoja(e, pt(m, grueso / 2, prof))
        doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.max(Math.abs(bx - ax), 0.5), Math.max(Math.abs(by - ay), 0.5), 'F')
      }

      // sanitario: el mismo dibujo del catálogo que se ve en pantalla
      if (cab.inodoro && cab.tipo !== 'regadera') {
        const dibujo = cab.tipo === 'orinal' ? ORINAL : WC
        const altoCm = cab.tipo === 'orinal' ? ALTO_ORINAL_CM : ALTO_WC_CM
        const anchoCm = (altoCm * dibujo.ancho) / dibujo.alto
        const [ax, ay] = aHoja(e, pt(m, (u0 + u1) / 2, 6))
        const w = anchoCm * e.k
        const h = altoCm * e.k
        // jsPDF gira alrededor de la esquina inferior izquierda, así que
        // el giro se hace a mano sobre el punto donde va apoyado al muro
        const giro = Math.atan2(m.py, m.px) - Math.PI / 2
        const cos = Math.cos(giro)
        const sen = Math.sin(giro)
        const dx = -w / 2
        const x = ax + dx * cos
        const y = ay + dx * sen
        doc.addImage(dibujo.src, 'PNG', x, y, w, h, undefined, 'FAST', (-giro * 180) / Math.PI)
      }
      if (cab.tipo === 'accesible' || cab.tipo === 'ambulatoria') {
        const [cx, cy] = aHoja(e, pt(m, (u0 + u1) / 2, prof * 0.78))
        texto(doc, cab.tipo === 'accesible' ? 'ACCESIBLE' : 'AMBULATORIA', cx, cy, { size: 5.5, align: 'center', color: GRIS })
      }

      // puerta: hoja a 45° y arco de barrido
      if (cab.puerta.tipo !== 'ninguna') {
        const pivU = cab.puerta.mano === 'der' ? u1 : u0
        const dir = cab.puerta.mano === 'der' ? -1 : 1
        const hoja = cab.puerta.anchoCm
        const afuera = cab.puerta.apertura === 'afuera'
        const vFin = afuera ? prof + hoja * 0.72 : prof - hoja * 0.72
        const [pxx, pyy] = aHoja(e, pt(m, pivU, prof))
        const [exx, eyy] = aHoja(e, pt(m, pivU + dir * hoja * 0.72, vFin))
        const [cxx, cyy] = aHoja(e, pt(m, pivU + dir * hoja, prof))

        doc.setDrawColor(ARCO[0], ARCO[1], ARCO[2])
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([1.2, 1], 0)
        const a0 = Math.atan2(cyy - pyy, cxx - pxx)
        const a1 = Math.atan2(eyy - pyy, exx - pxx)
        arco(doc, pxx, pyy, hoja * e.k, a0, a1)
        doc.setLineDashPattern([], 0)

        doc.setDrawColor(MARCA[0], MARCA[1], MARCA[2])
        doc.setLineWidth(0.7)
        doc.line(pxx, pyy, exx, eyy)
      }
    })

    // cotas por cabina y cota total
    const rot = horizontal ? 0 : m.ay > 0 ? -90 : 90
    doc.setDrawColor(COTA[0], COTA[1], COTA[2])
    doc.setLineWidth(0.2)
    tramo.cabinas.forEach((cab, i) => {
      const u0 = acum[i]
      const u1 = u0 + cab.anchoCm
      const [ix, iy] = aHoja(e, pt(m, u0, -ESPESOR_MURO - 13))
      const [fx, fy] = aHoja(e, pt(m, u1, -ESPESOR_MURO - 13))
      doc.line(ix, iy, fx, fy)
      const [tx, ty] = aHoja(e, pt(m, (u0 + u1) / 2, -ESPESOR_MURO - 17))
      texto(doc, String(cab.anchoCm), tx, ty, { size: 6.5, align: 'center', angle: rot, color: COTA })
    })
    const [tix, tiy] = aHoja(e, pt(m, 0, -ESPESOR_MURO - 30))
    const [tfx, tfy] = aHoja(e, pt(m, largo, -ESPESOR_MURO - 30))
    doc.setDrawColor(TINTA)
    doc.line(tix, tiy, tfx, tfy)
    const [ttx, tty] = aHoja(e, pt(m, largo / 2, -ESPESOR_MURO - 34))
    texto(doc, `${largo} cm`, ttx, tty, { size: 8, bold: true, align: 'center', angle: rot })
  })
}

function cuadroDePiezas(doc: jsPDF, area: Area, x: number, y: number, w: number) {
  const renglones = agrupar(piezasDeArea(area), area.config).sort((a, b) => a.subTipo.localeCompare(b.subTipo))
  texto(doc, 'CUADRO DE PIEZAS', x, y, { size: 7, bold: true })
  let fila = y + 5
  doc.setDrawColor(180)
  doc.setLineWidth(0.2)
  doc.line(x, fila - 3, x + w, fila - 3)

  const cols = [x, x + 20, x + 46, x + w - 6]
  texto(doc, 'CÓDIGO', cols[0], fila, { size: 5.5, bold: true, color: GRIS })
  texto(doc, 'PIEZA', cols[1], fila, { size: 5.5, bold: true, color: GRIS })
  texto(doc, 'MEDIDA', cols[2], fila, { size: 5.5, bold: true, color: GRIS })
  texto(doc, 'CANT', cols[3], fila, { size: 5.5, bold: true, align: 'right', color: GRIS })
  fila += 1.5
  doc.line(x, fila, x + w, fila)
  fila += 4

  const nombre: Record<string, string> = { PT: 'Puerta', PN: 'Panel', PL: 'Pilastra', MG: 'Divisor orinal' }
  const esp = area.config.espesorMm
  for (const r of renglones) {
    texto(doc, r.subTipo, cols[0], fila, { size: 6 })
    // el espesor solo aplica a las piezas de material, no a los kits
    texto(doc, `${nombre[r.familia] ?? r.familia} ${esp}mm`, cols[1], fila, { size: 6 })
    texto(doc, `${r.anchoCm} × ${r.altoCm}`, cols[2], fila, { size: 6 })
    texto(doc, String(r.cantidad), cols[3], fila, { size: 6, align: 'right', bold: true })
    fila += 4.2
    if (fila > HOJA.h - CAJETIN_H - M - 6) break
  }

  const total = renglones.reduce((s, r) => s + r.cantidad, 0)
  doc.line(x, fila - 3, x + w, fila - 3)
  texto(doc, 'TOTAL DE PIEZAS', cols[0], fila + 1, { size: 6, bold: true })
  texto(doc, String(total), cols[3], fila + 1, { size: 6, bold: true, align: 'right' })

  // el juego de herrajes va completo en un solo acabado, así que se anota una vez
  texto(doc, 'HERRAJES', cols[0], fila + 7, { size: 5.5, bold: true, color: GRIS })
  texto(doc, `Juego completo en ${nombreHerraje(area.config.herrajeAcabado).toLowerCase()}`, cols[0], fila + 11, {
    size: 6,
  })
}

function cajetin(doc: jsPDF, proyecto: Proyecto, area: Area, hoja: number, hojas: number, fecha: string) {
  const y = HOJA.h - M - CAJETIN_H
  const x = M
  const w = HOJA.w - M * 2
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.5)
  doc.rect(x, y, w, CAJETIN_H)

  const cols = [x, x + 96, x + 168, x + 224, x + w]
  for (let i = 1; i < 4; i++) doc.line(cols[i], y, cols[i], y + CAJETIN_H)

  const campo = (col: number, fila: number, etiqueta: string, valor: string, ancho: number) => {
    const cx = cols[col] + 3
    const cy = y + 7 + fila * 8
    texto(doc, etiqueta, cx, cy - 3.4, { size: 4.8, color: GRIS })
    texto(doc, doc.splitTextToSize(valor || '—', ancho)[0], cx, cy, { size: 7.6, bold: fila === 0 })
  }

  campo(0, 0, 'OBRA', proyecto.obra, 88)
  campo(0, 1, 'CLIENTE', proyecto.cliente, 88)
  campo(0, 2, 'UBICACIÓN', proyecto.ubicacion, 88)

  campo(1, 0, 'ÁREA', area.nombre, 66)
  campo(1, 1, 'PISO', area.piso, 66)
  campo(1, 2, 'TIPOLOGÍA', tipologia(area.config.tipologia).nombre, 66)

  campo(2, 0, 'LÍNEA / MODELO', `${nombreLinea(area.config.linea)} · ${modeloParaCsv(area.config)}`, 52)
  // el código de materia prima solo lo llevan los colores de México
  const codigo = area.config.colorCodigo ? ` (${area.config.colorCodigo})` : ''
  campo(2, 1, 'ACABADO / COLOR', `${area.config.acabado} · ${area.config.color}${codigo}`, 52)
  // en un área de orinales el fondo que manda es el de la mampara, no el de la cabina
  const soloOrinales = area.tramos.every((t) => t.cabinas.length > 0 && t.cabinas.every((c) => c.tipo === 'orinal'))
  const profCajetin = soloOrinales ? PROF_ORINAL_CM : area.config.profundidadCm
  campo(
    2,
    2,
    'ESPESOR · ALTO · PROF · SISTEMA',
    `${area.config.espesorMm} mm · ${soloOrinales ? area.config.mgAlturaCm : area.config.alturaCm} · ${profCajetin} · ${nombreSistema(area.config)}`,
    52,
  )

  campo(3, 0, 'N° DE PLANO', proyecto.numero, 46)
  campo(3, 1, 'DIBUJÓ', proyecto.creadoPor, 46)
  campo(3, 2, 'FECHA / HOJA', `${fecha}  ·  ${hoja} de ${hojas}`, 46)

  texto(doc, 'GRUPO MODUMEX', cols[3] + 3, y + CAJETIN_H - 2.5, { size: 5.4, bold: true, color: GRIS })
}

export function generarPDF(proyecto: Proyecto, fecha = new Date().toLocaleDateString('es-CR')): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const areas = proyecto.areas.filter((a) => a.tramos.length > 0)
  const lista = areas.length ? areas : proyecto.areas

  lista.forEach((area, idx) => {
    if (idx > 0) doc.addPage()

    doc.setDrawColor(TINTA)
    doc.setLineWidth(0.7)
    doc.rect(M / 2, M / 2, HOJA.w - M, HOJA.h - M)

    const prof = area.config.profundidadCm
    const marcos = marcosDe(area.config.tipologia, area.tramos, prof)
    const caja = cajaDelPlano(area.tramos, marcos, prof, 46)

    const zonaW = HOJA.w - M * 2 - PANEL_W - 6
    const zonaH = HOJA.h - M * 2 - CAJETIN_H - 6
    const k = Math.min(zonaW / caja.w, zonaH / caja.h)
    const e: Escala = {
      k,
      ox: M + (zonaW - caja.w * k) / 2 - caja.x * k,
      oy: M + (zonaH - caja.h * k) / 2 - caja.y * k,
    }

    murosYPiezas(doc, area, e, marcos)
    cuadroDePiezas(doc, area, HOJA.w - M - PANEL_W, M + 6, PANEL_W)
    cajetin(doc, proyecto, area, idx + 1, lista.length, fecha)

    texto(doc, `ESCALA 1:${Math.round(10 / k)}`, M + 2, HOJA.h - M - CAJETIN_H - 2, { size: 5.5, color: GRIS })
  })

  return doc
}

export function nombreArchivoPDF(proyecto: Proyecto): string {
  const obra = (proyecto.obra || 'proyecto').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  return `Plano-${proyecto.numero}-${obra}.pdf`
}
