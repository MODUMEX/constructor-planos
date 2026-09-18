import { jsPDF } from 'jspdf'
import type { Area, Cabina, Proyecto, Tramo } from '../types'
import {
  acumulado, anchoDeOrinal, cajaDelPlano, cuartoPmr, esMingitorio, ESPESOR_MURO, marcosDe,
  PROF_ORINAL_CM,
  profundidadDeDivisor,
  profundidadDeTramo,
  profundidadDelLugar, pt, SOBRA_MURO_CM,
  type Marco,
} from '../geometria'
import { alturasDe, nombreHerraje, tipologia } from '../catalog'
import { anchoTotal, arrancaElCuartoPmr, ladosDeCabina } from '../modulacion'
import { agrupar, modeloParaCsv, nombreLinea, nombreSistema, piezasDeArea } from './piezas'
import { ALTO_ORINAL_CM, ALTO_REGADERA_CM, ALTO_WC_CM, ORINAL, REGADERA, WC } from '../assets/sanitarios'
import { marcaDeAgua, ponerLogo, portada } from './portada'

/**
 * Plano en PDF: una portada que el cliente firma y después una hoja por área,
 * con el dibujo a escala, las cotas encadenadas, el cuadro de piezas a la
 * derecha y el cajetín abajo. Todas llevan el logo de marca de agua.
 * Usa la misma geometría que la pantalla (src/geometria.ts), así que lo que
 * se ve en el editor es lo que sale impreso.
 */

const HOJA = { w: 279.4, h: 215.9 } // carta horizontal, en mm
const M = 8 // margen
const CAJETIN_H = 30
const PANEL_W = 74 // cuadro de piezas a la derecha
/**
 * Aire entre la planta y el alzado, y espacio del rótulo debajo del piso, en
 * MILÍMETROS de hoja. En centímetros de dibujo quedaban cortos al achicar la
 * escala, y el rótulo terminaba encima del cajetín.
 */
const SEPARA_VISTAS_MM = 17
const ROTULO_MM = 12
/**
 * Alto del zoclo o de la pata al pie de la pilastra, en cm. Sale de la ficha
 * técnica: el alzado de LEEDER M1 lo acota como .10 m en los dos sistemas de
 * fijación a piso.
 */
const ALTO_BASE_CM = 10

const TINTA = 25
const GRIS = 130
/** azul del logo, para las hojas de puerta */
const MARCA: [number, number, number] = [42, 76, 143]
/** gris azulado de las cotas: no compite con el azul de la marca */
const COTA: [number, number, number] = [74, 90, 114]
/** la cota total va más oscura, para que se lea primero */
const TINTA_COTA: [number, number, number] = [25, 25, 25]
/** arco de barrido de la puerta */
const ARCO: [number, number, number] = [143, 163, 196]

/** a 45° abierta, la punta de la hoja cae a este factor del ancho en cada eje */
const ABIERTA_45 = Math.SQRT1_2

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

/**
 * Arco aproximado con segmentos: jsPDF no tiene primitiva de arco.
 *
 * Se barre SIEMPRE por el lado corto. Los ángulos salen de atan2, que va de
 * −180° a 180°, y un barrido que cruzaba esa costura daba la vuelta larga: una
 * puerta que abre 45° se dibujaba con un arco de 315°, casi la circunferencia
 * entera. Le pasaba a las que abren hacia adentro.
 */
function arco(doc: jsPDF, cx: number, cy: number, r: number, desde: number, hasta: number) {
  const pasos = 14
  let barrido = hasta - desde
  while (barrido > Math.PI) barrido -= 2 * Math.PI
  while (barrido < -Math.PI) barrido += 2 * Math.PI
  let px = cx + r * Math.cos(desde)
  let py = cy + r * Math.sin(desde)
  for (let i = 1; i <= pasos; i++) {
    const a = desde + (barrido * i) / pasos
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    doc.line(px, py, x, y)
    px = x
    py = y
  }
}

/** punta de flecha llena; `ang` es hacia dónde apunta, en radianes */
function flecha(doc: jsPDF, x: number, y: number, ang: number, tam = 1.5) {
  const abre = 0.26
  doc.triangle(
    x, y,
    x - tam * Math.cos(ang - abre), y - tam * Math.sin(ang - abre),
    x - tam * Math.cos(ang + abre), y - tam * Math.sin(ang + abre),
    'F',
  )
}

/**
 * Rayado a 45° dentro de un rectángulo, que es como se dibuja un muro cortado
 * en un plano de taller. Las líneas se recortan a mano al rectángulo en vez de
 * usar recorte del PDF, que jsPDF no maneja bien.
 */
function rayarRect(doc: jsPDF, x: number, y: number, w: number, h: number, paso = 1.3) {
  if (w <= 0 || h <= 0) return
  for (let d = -h; d < w; d += paso) {
    const t0 = Math.max(0, -d)
    const t1 = Math.min(h, w - d)
    if (t1 <= t0) continue
    doc.line(x + d + t0, y + t0, x + d + t1, y + t1)
  }
}

/** el muro: contorno y rayado, como en un plano de taller */
function muro(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(70)
  doc.setLineWidth(0.4)
  doc.rect(x, y, w, h, 'FD')
  doc.setLineWidth(0.13)
  doc.setDrawColor(140)
  rayarRect(doc, x, y, w, h)
  doc.setDrawColor(70)
  doc.setLineWidth(0.4)
  doc.rect(x, y, w, h)
}

/**
 * Una cota de plano: líneas de extensión que salen de la pieza, línea de cota
 * con flechas en las puntas y el número centrado encima. Si el tramo es muy
 * corto para que quepan las flechas, se dibujan por fuera apuntando hacia
 * adentro, como se hace a mano.
 */
function cotaEntre(
  doc: jsPDF,
  e: Escala,
  m: Marco,
  u0: number,
  u1: number,
  vLinea: number,
  vPieza: number,
  etiqueta: string,
  o: { size?: number; bold?: boolean; color?: [number, number, number]; rot?: number; vTexto?: number } = {},
) {
  const color = o.color ?? COTA
  const [ax, ay] = aHoja(e, pt(m, u0, vLinea))
  const [bx, by] = aHoja(e, pt(m, u1, vLinea))
  const largoMm = Math.hypot(bx - ax, by - ay)
  if (largoMm < 0.6) return

  doc.setDrawColor(color[0], color[1], color[2])
  doc.setFillColor(color[0], color[1], color[2])

  // líneas de extensión: de la pieza hasta un poco más allá de la cota
  doc.setLineWidth(0.12)
  const masAlla = vLinea + (vLinea - vPieza) * 0.06
  for (const u of [u0, u1]) {
    const [px, py] = aHoja(e, pt(m, u, vPieza))
    const [qx, qy] = aHoja(e, pt(m, u, masAlla))
    doc.line(px, py, qx, qy)
  }

  // línea de cota
  doc.setLineWidth(0.22)
  const ang = Math.atan2(by - ay, bx - ax)
  const cabenAdentro = largoMm > 7
  if (cabenAdentro) {
    doc.line(ax, ay, bx, by)
    flecha(doc, ax, ay, ang + Math.PI)
    flecha(doc, bx, by, ang)
  } else {
    // el tramo no da: la línea se prolonga y las flechas van por fuera
    const dx = Math.cos(ang) * 4
    const dy = Math.sin(ang) * 4
    doc.line(ax - dx, ay - dy, bx + dx, by + dy)
    flecha(doc, ax, ay, ang)
    flecha(doc, bx, by, ang + Math.PI)
  }

  const [tx, ty] = aHoja(e, pt(m, (u0 + u1) / 2, o.vTexto ?? vLinea))
  texto(doc, etiqueta, tx, ty, {
    size: o.size ?? 6.2,
    bold: o.bold,
    align: 'center',
    angle: o.rot ?? 0,
    color,
  })
}

/** la misma cota pero medida a lo hondo: sirve para la profundidad, al costado */
function cotaEnV(
  doc: jsPDF,
  e: Escala,
  m: Marco,
  v0: number,
  v1: number,
  uLinea: number,
  uPieza: number,
  etiqueta: string,
  o: { size?: number; bold?: boolean; color?: [number, number, number]; rot?: number; uTexto?: number } = {},
) {
  const color = o.color ?? COTA
  const [ax, ay] = aHoja(e, pt(m, uLinea, v0))
  const [bx, by] = aHoja(e, pt(m, uLinea, v1))
  if (Math.hypot(bx - ax, by - ay) < 0.6) return

  doc.setDrawColor(color[0], color[1], color[2])
  doc.setFillColor(color[0], color[1], color[2])
  doc.setLineWidth(0.12)
  for (const v of [v0, v1]) {
    const [px, py] = aHoja(e, pt(m, uPieza, v))
    const [qx, qy] = aHoja(e, pt(m, uLinea + (uLinea - uPieza) * 0.08, v))
    doc.line(px, py, qx, qy)
  }
  doc.setLineWidth(0.22)
  const ang = Math.atan2(by - ay, bx - ax)
  doc.line(ax, ay, bx, by)
  flecha(doc, ax, ay, ang + Math.PI)
  flecha(doc, bx, by, ang)

  const [tx, ty] = aHoja(e, pt(m, o.uTexto ?? uLinea, (v0 + v1) / 2))
  texto(doc, etiqueta, tx, ty, {
    size: o.size ?? 6.2,
    bold: o.bold,
    align: 'center',
    angle: (o.rot ?? 0) + 90,
    color,
  })
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
    // el cuarto accesible se dibuja hasta el fondo del lugar, no de la cabina
    const cuarto = cuartoPmr(tramo, area.config)
    const profIni = cuarto && cuarto.indice === 0 ? cuarto.profCm : prof
    const horizontal = Math.abs(m.ax) === 1
    const acum = acumulado(tramo.cabinas)

    // muro de fondo, rayado a 45° como en un plano de taller
    // el muro sobresale un poco de las piezas, para no terminar al ras
    const [mx, my] = aHoja(e, pt(m, -SOBRA_MURO_CM, -ESPESOR_MURO))
    const [mx2, my2] = aHoja(e, pt(m, largo + SOBRA_MURO_CM, 0))
    muro(
      doc,
      Math.min(mx, mx2),
      Math.min(my, my2),
      Math.abs(mx2 - mx) || ESPESOR_MURO * e.k,
      Math.abs(my2 - my) || ESPESOR_MURO * e.k,
    )

    // los muros laterales se corren al frente lo mismo que el de fondo se pasa
    // de las piezas, para que la pared no termine al ras de la cabina
    const muroLateral = (u0: number, u1: number) => {
      const [ax, ay] = aHoja(e, pt(m, u0, -ESPESOR_MURO))
      const [bx, by] = aHoja(e, pt(m, u1, profIni + SOBRA_MURO_CM))
      muro(doc, Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay))
    }
    if (tramo.muroInicio && !conEsquina) muroLateral(-ESPESOR_MURO, 0)
    if (tramo.muroFin && !conEsquina) muroLateral(largo, largo + ESPESOR_MURO)

    // línea de frente
    doc.setDrawColor(150)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([1.4, 1], 0)
    // la línea arranca DESPUÉS del cuarto accesible: adentro del cuarto no hay
    // frente de cabina, y dibujarla ahí hacía parecer que el cuarto estaba partido
    const [f0x, f0y] = aHoja(e, pt(m, cuarto ? cuarto.hastaCm : 0, prof))
    const [f1x, f1y] = aHoja(e, pt(m, largo, prof))
    doc.line(f0x, f0y, f1x, f1y)
    doc.setLineDashPattern([], 0)

    // Pilastras vistas en planta. Van con SU ancho de pieza (10–85 cm según el
    // catálogo), no con el espesor del material: son dimensiones distintas.
    // Antes no se dibujaban en el PDF, así que el plano salía sin ellas.
    if (tramo.cabinas.length > 0) {
      const cortes = [0, ...acum.slice(1), largo]
      doc.setFillColor(120, 120, 120)
      doc.setDrawColor(70)
      doc.setLineWidth(0.25)
      cortes.forEach((u, k) => {
        // en las fronteras de mingitorio no hay pilastra que dibujar
        if (esMingitorio(tramo, k)) return
        // cada pilastra con SU ancho de catálogo, el que eligió la modulación
        const anchoPil = Math.max(tramo.pilastras?.[k] ?? area.config.anchoPilastraCm, grueso)
        // en los extremos se corre hacia adentro para no invadir el muro
        // la lateral que cierra la tira de baños va entera adentro de la tira,
        // como las de punta: centrada se leería como una pilastra central
        const cierraLaTira = esMingitorio(tramo, k + 1) && !esMingitorio(tramo, k)
        const centro =
          k === 0 ? u + anchoPil / 2 : k === cortes.length - 1 || cierraLaTira ? u - anchoPil / 2 : u
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
      // en el cuarto accesible el panel de la derecha ES el divisor, que se
      // dibuja aparte y en piezas: si se dibujara acá taparía el hueco de la puerta
      const dibujarPanel = (!esUltima || !tramo.muroFin) && cuarto?.indice !== i
      if (dibujarPanel) {
        // entre dos orinales el divisor es una mampara, con su propio fondo
        const profDiv = profundidadDeDivisor(tramo, i, prof, area.config.mgAnchoCm)
        doc.setFillColor(TINTA, TINTA, TINTA)
        const [ax, ay] = aHoja(e, pt(m, u1 - grueso / 2, 0))
        const [bx, by] = aHoja(e, pt(m, u1 + grueso / 2, profDiv))
        doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.max(Math.abs(bx - ax), 0.5), Math.max(Math.abs(by - ay), 0.5), 'F')
      }
      if (i === 0 && !tramo.muroInicio) {
        doc.setFillColor(TINTA, TINTA, TINTA)
        const [ax, ay] = aHoja(e, pt(m, -grueso / 2, 0))
        const [bx, by] = aHoja(e, pt(m, grueso / 2, prof))
        doc.rect(Math.min(ax, bx), Math.min(ay, by), Math.max(Math.abs(bx - ax), 0.5), Math.max(Math.abs(by - ay), 0.5), 'F')
      }

      // sanitario: el mismo dibujo del catálogo que se ve en pantalla
      if (cab.tipo !== 'vacia') {
        const dibujo = cab.tipo === 'orinal' ? ORINAL : cab.tipo === 'regadera' ? REGADERA : WC
        const altoCm = cab.tipo === 'orinal' ? ALTO_ORINAL_CM : cab.tipo === 'regadera' ? ALTO_REGADERA_CM : ALTO_WC_CM
        const anchoCm = (altoCm * dibujo.ancho) / dibujo.alto
        const w = anchoCm * e.k
        const h = altoCm * e.k
        if (cuarto?.indice === i) {
          // En el cuarto accesible se entra por el COSTADO, así que el inodoro gira:
          // se apoya contra el muro de afuera y mira hacia la puerta del divisor.
          //
          // Girado, jsPDF pivotea sobre la esquina INFERIOR IZQUIERDA de la imagen y
          // en sentido antihorario, así que con 90° la pieza queda arriba y a la
          // izquierda del punto: hay que correrlo para dejarla apoyada contra el muro
          // y centrada en la profundidad del cuarto.
          const [wx, wy] = aHoja(e, pt(m, u0 + 6, cuarto.profCm / 2))
          doc.addImage(dibujo.src, 'PNG', wx + h, wy + w / 2 - h, w, h, undefined, 'FAST', 90)
        } else {
          const [ax, ay] = aHoja(e, pt(m, (u0 + u1) / 2, 6))
          // el giro se hace a mano sobre el punto donde va apoyado al muro
          const giro = Math.atan2(m.py, m.px) - Math.PI / 2
          const dx = -w / 2
          const x = ax + dx * Math.cos(giro)
          const y = ay + dx * Math.sin(giro)
          doc.addImage(dibujo.src, 'PNG', x, y, w, h, undefined, 'FAST', (-giro * 180) / Math.PI)
        }
      }
      if (cab.tipo === 'accesible' || cab.tipo === 'vacia') {
        // en el cuarto el rótulo va abajo, para no caer sobre el inodoro girado
        const [cx, cy] = aHoja(
          e,
          cuarto?.indice === i ? pt(m, (u0 + u1) / 2, cuarto.profCm * 0.9) : pt(m, (u0 + u1) / 2, prof * 0.78),
        )
        texto(doc, cab.tipo === 'accesible' ? 'ACCESIBLE' : 'VACÍA', cx, cy, { size: 5.5, align: 'center', color: GRIS })
      }

      // La puerta cuelga de la PILASTRA, no del límite de la cabina: ese límite
      // cae en el centro de la pilastra, así que hay que correrse hasta su cara.
      // Las de los extremos van enteras dentro de su cabina.
      const anchoPil = (j: number) => tramo.pilastras?.[j] ?? area.config.anchoPilastraCm
      // la puerta cuelga de la CARA de la pilastra: con la lateral que cierra la
      // tira hay que tomarla entera, o el pivote cae dentro de la pieza
      const { izq: caraIzq, der: caraDer } = ladosDeCabina(tramo.cabinas.map((x) => x.tipo === 'orinal'), anchoPil, i, arrancaElCuartoPmr(tramo, area.config))

      // puerta: hoja a 45° y arco de barrido. La del cuarto accesible no va acá:
      // va en su divisor, sobre la profundidad, porque al cuarto se entra por el costado.
      if (cab.puerta.tipo !== 'ninguna' && cuarto?.indice !== i) {
        const pivU = cab.puerta.mano === 'der' ? u1 - caraDer : u0 + caraIzq
        const dir = cab.puerta.mano === 'der' ? -1 : 1
        const hoja = cab.puerta.anchoCm
        const afuera = cab.puerta.apertura === 'afuera'
        const vFin = afuera ? prof + hoja * ABIERTA_45 : prof - hoja * ABIERTA_45
        const [pxx, pyy] = aHoja(e, pt(m, pivU, prof))
        const [exx, eyy] = aHoja(e, pt(m, pivU + dir * hoja * ABIERTA_45, vFin))
        const [cxx, cyy] = aHoja(e, pt(m, pivU + dir * hoja, prof))

        doc.setDrawColor(ARCO[0], ARCO[1], ARCO[2])
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([1.2, 1], 0)
        const a0 = Math.atan2(cyy - pyy, cxx - pxx)
        const a1 = Math.atan2(eyy - pyy, exx - pxx)
        arco(doc, pxx, pyy, hoja * e.k, a0, a1)
        doc.setLineDashPattern([], 0)

        doc.setDrawColor(MARCA[0], MARCA[1], MARCA[2])
        doc.setLineWidth(0.45)
        doc.line(pxx, pyy, exx, eyy)
      }
    })

    // ------------------------------------------------------------------
    // El cuarto accesible: llega hasta el fondo del LUGAR y lo cierra un
    // divisor modulado a lo largo de esa profundidad, con la puerta del
    // cuarto adentro. Es la misma geometría que se ve en pantalla.
    // ------------------------------------------------------------------
    if (cuarto) {
      // la pared opuesta del lugar, contra la que cierra el cuarto
      const [wx, wy] = aHoja(e, pt(m, cuarto.desdeCm - (tramo.muroInicio ? ESPESOR_MURO : 0), cuarto.profCm))
      const [wx2, wy2] = aHoja(e, pt(m, largo + SOBRA_MURO_CM, cuarto.profCm + ESPESOR_MURO))
      muro(doc, Math.min(wx, wx2), Math.min(wy, wy2), Math.abs(wx2 - wx), Math.abs(wy2 - wy))

      const u = cuarto.hastaCm
      for (const pieza of cuarto.divisor) {
        const largoPieza = pieza.hastaCm - pieza.desdeCm
        if (pieza.tipo === 'puerta') {
          // La puerta del cuarto abre hacia el pasillo, y cuelga de la PILASTRA
          // del divisor, que va después de ella. Una puerta no se cuelga nunca
          // de un panel: por eso el pivote es el extremo de la pilastra.
          const [pxx, pyy] = aHoja(e, pt(m, u, pieza.hastaCm))
          const [cxx, cyy] = aHoja(e, pt(m, u, pieza.desdeCm))
          const [exx, eyy] = aHoja(e, pt(m, u + largoPieza * ABIERTA_45, pieza.hastaCm - largoPieza * ABIERTA_45))
          doc.setDrawColor(ARCO[0], ARCO[1], ARCO[2])
          doc.setLineWidth(0.2)
          doc.setLineDashPattern([1.2, 1], 0)
          arco(doc, pxx, pyy, largoPieza * e.k, Math.atan2(cyy - pyy, cxx - pxx), Math.atan2(eyy - pyy, exx - pxx))
          doc.setLineDashPattern([], 0)
          doc.setDrawColor(MARCA[0], MARCA[1], MARCA[2])
          doc.setLineWidth(0.45)
          doc.line(pxx, pyy, exx, eyy)
        } else {
          doc.setFillColor(TINTA, TINTA, TINTA)
          const [ax, ay] = aHoja(e, pt(m, u - grueso / 2, pieza.desdeCm))
          const [bx, by] = aHoja(e, pt(m, u + grueso / 2, pieza.hastaCm))
          doc.rect(
            Math.min(ax, bx), Math.min(ay, by),
            Math.max(Math.abs(bx - ax), 0.5), Math.max(Math.abs(by - ay), 0.5), 'F',
          )
        }
        // la medida de cada pieza del divisor, girada a lo largo de la tira
        const [tx, ty] = aHoja(e, pt(m, u + 7, (pieza.desdeCm + pieza.hastaCm) / 2))
        texto(doc, String(largoPieza), tx, ty, {
          size: 5.5,
          align: 'center',
          angle: (horizontal ? 0 : m.ay > 0 ? -90 : 90) + 90,
          color: COTA,
        })
      }

      // el fondo del lugar, acotado al costado como la profundidad de cabina
      cotaEnV(doc, e, m, -ESPESOR_MURO, cuarto.profCm, -SOBRA_MURO_CM - 30, -SOBRA_MURO_CM - 18, `${cuarto.profCm}`, {
        size: 6.5,
        rot: horizontal ? 0 : m.ay > 0 ? -90 : 90,
        uTexto: -SOBRA_MURO_CM - 33,
      })
    }

    // cotas por cabina y cota total
    const rot = horizontal ? 0 : m.ay > 0 ? -90 : 90
    doc.setDrawColor(COTA[0], COTA[1], COTA[2])
    doc.setLineWidth(0.2)
    // la cadena de cabinas, cada una con sus flechas
    tramo.cabinas.forEach((cab, i) => {
      const u0 = acum[i]
      cotaEntre(doc, e, m, u0, u0 + cab.anchoCm, -ESPESOR_MURO - 13, -ESPESOR_MURO - 1, String(cab.anchoCm), {
        size: 6.5,
        rot,
        vTexto: -ESPESOR_MURO - 15,
      })
    })
    // Y la total: es el CLARO del proyecto, la medida de pared a pared, no la
    // suma de las piezas. La pantalla ya la mostraba así; el PDF ponía la suma,
    // que en una tira que calza justo da un par de centímetros más y hacía
    // dudar al instalador de la medida del muro.
    const claroCota = tramo.claroCm && tramo.claroCm > 0 ? tramo.claroCm : largo
    cotaEntre(doc, e, m, 0, largo, -ESPESOR_MURO - 27, -ESPESOR_MURO - 14, `${claroCota} cm`, {
      size: 8,
      bold: true,
      color: TINTA_COTA,
      rot,
      vTexto: -ESPESOR_MURO - 30,
    })

    // Cotas por PIEZA, al frente: pilastra y puerta en horizontal, panel girado
    // a lo largo de la pieza. Son las medidas que se fabrican, no el reparto.
    if (tramo.cabinas.length > 0) {
      const anchoPilDe = (j: number) => tramo.pilastras?.[j] ?? area.config.anchoPilastraCm
      const nCab = tramo.cabinas.length
      const cortes = [0, ...acum.slice(1), largo]

      // cada pilastra, acotada por su ancho real de pieza
      cortes.forEach((u, k) => {
        if (esMingitorio(tramo, k)) return
        const ancho = anchoPilDe(k)
        // la lateral que cierra la tira de baños va entera adentro de la tira,
        // como las de punta: centrada se leería como una pilastra central
        const cierraLaTira = esMingitorio(tramo, k + 1) && !esMingitorio(tramo, k)
        const centro =
          k === 0 ? u + ancho / 2 : k === cortes.length - 1 || cierraLaTira ? u - ancho / 2 : u
        cotaEntre(doc, e, m, centro - ancho / 2, centro + ancho / 2, prof - 9, prof - 1, String(ancho), {
          size: 5.5,
          rot,
          vTexto: prof - 11,
        })
      })

      // la profundidad, al costado, como el "TO FACE" de los planos de taller
      cotaEnV(doc, e, m, -ESPESOR_MURO, prof, -SOBRA_MURO_CM - 16, -SOBRA_MURO_CM - 2, `${prof}`, {
        size: 6.5,
        rot,
        uTexto: -SOBRA_MURO_CM - 19,
      })

      tramo.cabinas.forEach((cab, i) => {
        if (cuarto?.indice === i) return
        const u0 = acum[i]
        const u1 = u0 + cab.anchoCm
        const { izq, der } = ladosDeCabina(tramo.cabinas.map((x) => x.tipo === 'orinal'), anchoPilDe, i, arrancaElCuartoPmr(tramo, area.config))
        // El orinal no lleva puerta, pero sí tiene su medida, que NO es la de su
        // cabina: la cabina se lleva además media pilastra de cada lado.
        if (cab.tipo === 'orinal') {
          const libre = anchoDeOrinal(tramo, i, area.config.anchoPilastraCm)
          cotaEntre(doc, e, m, u0 + izq, u1 - der, prof - 20, prof - 12, String(libre), {
            size: 6,
            rot,
            vTexto: prof - 22,
          })
          return
        }
        if (cab.puerta.tipo === 'ninguna') return
        cotaEntre(doc, e, m, u0 + izq, u1 - der, prof - 20, prof - 12, String(cab.puerta.anchoCm), {
          size: 6,
          rot,
          vTexto: prof - 22,
        })

        // El divisor de la derecha, acotado a lo hondo. El mingitorio entre dos
        // orinales lleva su fondo —el que eligió el cliente, 45 o 60— con cota de
        // verdad, igual que las pilastras: antes salía como un número suelto.
        if (i < nCab - 1 && cuarto?.indice !== i) {
          const profDiv = profundidadDeDivisor(tramo, i, prof, area.config.mgAnchoCm)
          const esMg = esMingitorio(tramo, i + 1)
          if (esMg) {
            cotaEnV(doc, e, m, 0, profDiv, u1 + 9, u1, String(profDiv), {
              size: 5.5,
              rot,
              uTexto: u1 + 12,
            })
          } else {
            const [nx, ny] = aHoja(e, pt(m, u1 + 7, profDiv / 2))
            texto(doc, String(profDiv), nx, ny, { size: 5.5, align: 'center', angle: rot + 90, color: COTA })
          }
        }
      })

      // El mingitorio de cierre queda fuera del recorrido de cabinas, porque su
      // frontera es la punta de la tira. Sin esto era el único que se quedaba
      // sin su cota de fondo.
      if (esMingitorio(tramo, nCab) && !tramo.muroFin) {
        const fondoMg = area.config.mgAnchoCm ?? 60
        cotaEnV(doc, e, m, 0, fondoMg, largo + 9, largo, String(fondoMg), {
          size: 5.5,
          rot,
          uTexto: largo + 12,
        })
      }
    }
  })
}

/**
 * ALZADO: la tira vista de frente, debajo de la planta y a la misma escala, así
 * que cada pieza cae justo abajo de donde está en la planta.
 *
 * Es lo que la planta no puede mostrar: las ALTURAS. La pilastra llega al piso
 * y sube hasta su altura; la puerta y los paneles quedan colgados, con el hueco
 * de abajo que resulta de la diferencia entre las dos. En LEEDER Estándar eso
 * da 1.80 de pilastra, 1.50 de puerta y 0.30 de hueco, que es como viene en los
 * planos de obra.
 */
function alzado(doc: jsPDF, area: Area, e: Escala, tramo: Tramo, pisoY: number) {
  const n = tramo.cabinas.length
  if (n === 0) return
  const alturas = alturasDe(area.config.modelo)
  const hPilastra = alturas.pilastra
  const hPuerta = alturas.puerta
  /** lo que queda del piso a la puerta: la pilastra baja hasta el suelo y la puerta no */
  const hueco = Math.max(0, hPilastra - hPuerta)
  const largo = anchoTotal(tramo.cabinas)
  const acum = acumulado(tramo.cabinas)
  const anchoPil = (j: number) => tramo.pilastras?.[j] ?? area.config.anchoPilastraCm

  /** del alto en cm a la hoja: el piso es la base y se sube desde ahí */
  const aY = (h: number) => pisoY - h * e.k
  const aX = (u: number) => e.ox + u * e.k

  // línea de piso
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.5)
  doc.line(aX(-SOBRA_MURO_CM), pisoY, aX(largo + SOBRA_MURO_CM), pisoY)

  // pilastras: del piso hasta arriba, con el ancho de su pieza
  const cortes = [0, ...acum.slice(1), largo]
  doc.setFillColor(120, 120, 120)
  doc.setDrawColor(70)
  doc.setLineWidth(0.25)
  cortes.forEach((u: number, k: number) => {
    if (esMingitorio(tramo, k)) return
    const ancho = anchoPil(k)
    const cierraLaTira = esMingitorio(tramo, k + 1) && !esMingitorio(tramo, k)
    const centro =
      k === 0 ? u + ancho / 2 : k === cortes.length - 1 || cierraLaTira ? u - ancho / 2 : u
    doc.rect(aX(centro - ancho / 2), aY(hPilastra), ancho * e.k, hPilastra * e.k, 'FD')
    // el zoclo o la pata al pie, los 10 cm que acota la ficha
    const conZoclo = area.config.terminacion === 'ZOCLO'
    const anchoBase = conZoclo ? ancho : Math.min(ancho, 6)
    doc.setFillColor(200, 203, 208)
    doc.rect(
      aX(centro - anchoBase / 2),
      aY(ALTO_BASE_CM),
      anchoBase * e.k,
      ALTO_BASE_CM * e.k,
      'FD',
    )
    doc.setFillColor(120, 120, 120)
  })

  // puertas y mingitorios, colgados a la altura que les toca
  tramo.cabinas.forEach((cab: Cabina, i: number) => {
    const u0 = acum[i]
    const u1 = u0 + cab.anchoCm
    const { izq, der } = ladosDeCabina(tramo.cabinas.map((x: Cabina) => x.tipo === 'orinal'), anchoPil, i, arrancaElCuartoPmr(tramo, area.config))
    if (cab.tipo === 'orinal') return
    if (cab.puerta.tipo === 'ninguna') return
    doc.setFillColor(248, 249, 251)
    doc.setDrawColor(MARCA[0], MARCA[1], MARCA[2])
    doc.setLineWidth(0.35)
    const x = aX(u0 + izq)
    const w = (u1 - der - (u0 + izq)) * e.k
    doc.rect(x, aY(hPilastra), w, hPuerta * e.k, 'FD')
    // la manija, del lado que abre
    const lado = cab.puerta.mano === 'der' ? x + 3 : x + w - 3
    doc.setFillColor(MARCA[0], MARCA[1], MARCA[2])
    doc.circle(lado, aY(hPilastra - hPuerta / 2), 0.7, 'F')
  })

  /**
   * El mingitorio NO cuelga del tope de la pilastra: arranca a 30 cm del piso,
   * así que el de 150 termina a 180 y el de 120 termina a 150. Es la regla de
   * obra, la misma para cualquier modelo de cabina.
   */
  const mgAlto = area.config.mgAlturaCm
  const mgPiso = 30
  cortes.forEach((u: number, k: number) => {
    if (!esMingitorio(tramo, k)) return
    // contra la pared no hay pieza; el de cierre sin muro sí
    if (k === cortes.length - 1 && tramo.muroFin) return
    if (k === 0 && tramo.muroInicio) return
    const grueso = Math.max(area.config.espesorMm / 10, 0.3)
    doc.setFillColor(150, 150, 150)
    doc.rect(aX(u - grueso / 2), aY(mgPiso + mgAlto), Math.max(grueso * e.k, 0.6), mgAlto * e.k, 'F')
  })

  // ---------- cotas de ancho, arriba ----------
  // La misma cadena de piezas que lleva la planta. Se repite acá porque el
  // alzado se lee solo, como en los planos de obra.
  const yPiezas = aY(hPilastra) - 5
  const yTotal = yPiezas - 7
  cortes.forEach((u: number, k: number) => {
    if (esMingitorio(tramo, k)) return
    const ancho = anchoPil(k)
    const cierraLaTira = esMingitorio(tramo, k + 1) && !esMingitorio(tramo, k)
    const centro =
      k === 0 ? u + ancho / 2 : k === cortes.length - 1 || cierraLaTira ? u - ancho / 2 : u
    cotaAncho(doc, aX(centro - ancho / 2), aX(centro + ancho / 2), yPiezas, `${ancho}`)
  })
  tramo.cabinas.forEach((cab: Cabina, i: number) => {
    const u0 = acum[i]
    const u1 = u0 + cab.anchoCm
    const { izq, der } = ladosDeCabina(tramo.cabinas.map((x: Cabina) => x.tipo === 'orinal'), anchoPil, i, arrancaElCuartoPmr(tramo, area.config))
    const medida = cab.tipo === 'orinal' ? anchoDeOrinal(tramo, i, area.config.anchoPilastraCm) : cab.puerta.anchoCm
    if (cab.tipo !== 'orinal' && cab.puerta.tipo === 'ninguna') return
    cotaAncho(doc, aX(u0 + izq), aX(u1 - der), yPiezas, `${medida}`)
  })
  cotaAncho(doc, aX(0), aX(largo), yTotal, `${tramo.claroCm && tramo.claroCm > 0 ? tramo.claroCm : largo} cm`, true)

  // ---------- cotas de altura ----------
  // Van A LA PAR de los cubículos, no después del campo de orinales: es donde
  // se leen en los planos de obra. Solo la de la pilastra se corre hacia afuera.
  // Se separan en milímetros de hoja y no en centímetros de dibujo: en un plano
  // ancho la escala es chica y quedaban una encima de otra.
  const finBanos = (() => {
    const ultima = tramo.cabinas.map((c: Cabina) => c.tipo !== 'orinal').lastIndexOf(true)
    return ultima < 0 ? largo : acum[ultima] + tramo.cabinas[ultima].anchoCm
  })()
  const xCota = aX(finBanos) + 5
  cotaAlto(doc, e, xCota, pisoY, hPuerta + hueco, hueco, `${hPuerta}`)
  if (hueco > 0) cotaAlto(doc, e, xCota, pisoY, hueco, 0, `${hueco}`)
  cotaAlto(doc, e, aX(largo + SOBRA_MURO_CM) + 8, pisoY, hPilastra, 0, `${hPilastra}`)
  // los 10 cm del zoclo o de la pata, del otro lado para no encimarse
  cotaAlto(doc, e, aX(-SOBRA_MURO_CM) - 7, pisoY, ALTO_BASE_CM, 0, `${ALTO_BASE_CM}`)
  // Cada mingitorio con SUS dos medidas: el alto de la pieza y los 30 cm que
  // quedan del piso a su borde de abajo. Van una arriba de la otra en la misma
  // línea, así que se leen juntas.
  cortes.forEach((u: number, k: number) => {
    if (!esMingitorio(tramo, k)) return
    if (k === cortes.length - 1 && tramo.muroFin) return
    if (k === 0 && tramo.muroInicio) return
    cotaAlto(doc, e, aX(u) - 4, pisoY, mgPiso + mgAlto, mgPiso, `${mgAlto}`)
    cotaAlto(doc, e, aX(u) - 4, pisoY, mgPiso, 0, `${mgPiso}`)
  })

  const conZocloTxt = area.config.terminacion === 'ZOCLO' ? 'zoclo' : 'patas'
  // Un solo renglón: en dos, el de abajo se metía en el cajetín.
  texto(doc, `ALZADO  ·  fijación a piso con ${conZocloTxt}`, aX(largo / 2), pisoY + 8, {
    size: 7,
    bold: true,
    align: 'center',
    color: GRIS,
  })
}

/** una cota horizontal del alzado, entre dos puntos ya en la hoja */
function cotaAncho(doc: jsPDF, x0: number, x1: number, y: number, etiqueta: string, fuerte = false) {
  if (Math.abs(x1 - x0) < 0.6) return
  const color = fuerte ? TINTA_COTA : COTA
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setFillColor(color[0], color[1], color[2])
  doc.setLineWidth(0.22)
  doc.line(x0, y, x1, y)
  flecha(doc, x0, y, Math.PI)
  flecha(doc, x1, y, 0)
  texto(doc, etiqueta, (x0 + x1) / 2, y - 1.6, {
    size: fuerte ? 8 : 5.8,
    bold: fuerte,
    align: 'center',
    color,
  })
}

/** una cota vertical del alzado: de `desde` a `hasta` centímetros sobre el piso */
function cotaAlto(doc: jsPDF, e: Escala, x: number, pisoY: number, hasta: number, desde: number, etiqueta: string) {
  const y0 = pisoY - desde * e.k
  const y1 = pisoY - hasta * e.k
  if (Math.abs(y1 - y0) < 0.6) return
  doc.setDrawColor(COTA[0], COTA[1], COTA[2])
  doc.setFillColor(COTA[0], COTA[1], COTA[2])
  doc.setLineWidth(0.22)
  doc.line(x, y0, x, y1)
  flecha(doc, x, y0, Math.PI / 2)
  flecha(doc, x, y1, -Math.PI / 2)
  texto(doc, etiqueta, x - 1.5, (y0 + y1) / 2, { size: 6, align: 'center', angle: 90, color: COTA })
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

  const nombre: Record<string, string> = { PT: 'Puerta', PN: 'Panel', PL: 'Pilastra', MG: 'Mingitorio' }
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

  // La primera columna arranca corrida: el logo va a su izquierda, en su propio
  // hueco. Antes se pisaban.
  const SANGRIA_LOGO = 31
  const campo = (col: number, fila: number, etiqueta: string, valor: string, ancho: number) => {
    const cx = cols[col] + 3 + (col === 0 ? SANGRIA_LOGO : 0)
    const cy = y + 7 + fila * 8
    texto(doc, etiqueta, cx, cy - 3.4, { size: 4.8, color: GRIS })
    texto(doc, doc.splitTextToSize(valor || '—', ancho)[0], cx, cy, { size: 7.6, bold: fila === 0 })
  }

  campo(0, 0, 'OBRA', proyecto.obra, 88 - SANGRIA_LOGO)
  campo(0, 1, 'CLIENTE', proyecto.cliente, 88 - SANGRIA_LOGO)
  campo(0, 2, 'UBICACIÓN', proyecto.ubicacion, 88 - SANGRIA_LOGO)

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
  // el logo chico en su hueco de la izquierda, como en el Constructor viejo
  ponerLogo(doc, x + 3, y + CAJETIN_H / 2 - 2.3, 25)
}

/** el cajetín de la portada: sin área, y donde va la hoja dice "Portada" */
function cajetinPortada(doc: jsPDF, proyecto: Proyecto, fecha: string) {
  const y = HOJA.h - M - CAJETIN_H
  const x = M
  const w = HOJA.w - M * 2
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.5)
  doc.rect(x, y, w, CAJETIN_H)
  const cols = [x, x + 96, x + 168, x + 224, x + w]
  for (let i = 1; i < 4; i++) doc.line(cols[i], y, cols[i], y + CAJETIN_H)

  const SANGRIA_LOGO = 31
  const campo = (col: number, fila: number, etiqueta: string, valor: string) => {
    const cx = cols[col] + 3 + (col === 0 ? SANGRIA_LOGO : 0)
    const cy = y + 7 + fila * 8
    texto(doc, etiqueta, cx, cy - 3.4, { size: 4.8, color: GRIS })
    texto(doc, valor || '—', cx, cy, { size: 7.6, bold: fila === 0 })
  }
  campo(0, 0, 'OBRA', proyecto.obra)
  campo(0, 1, 'CLIENTE', proyecto.cliente)
  campo(0, 2, 'UBICACIÓN', proyecto.ubicacion)
  campo(1, 0, 'DISTRIBUIDOR', proyecto.distribuidor)
  campo(1, 1, 'ÁREAS', String(proyecto.areas.length))
  campo(2, 0, 'N° DE PLANO', proyecto.numero)
  campo(2, 1, 'DIBUJÓ', proyecto.creadoPor)
  campo(2, 2, 'FECHA', fecha)
  texto(doc, 'Portada', cols[3] + 3, y + 10, { size: 11, bold: true })
  texto(doc, 'Firma del cliente', cols[3] + 3, y + CAJETIN_H - 4, { size: 5.4, color: GRIS })
  ponerLogo(doc, x + 3, y + CAJETIN_H / 2 - 2.3, 25)
}

export function generarPDF(proyecto: Proyecto, fecha = new Date().toLocaleDateString('es-CR')): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const areas = proyecto.areas.filter((a) => a.tramos.length > 0)
  const lista = areas.length ? areas : proyecto.areas

  // La portada va primero y toma los datos de la primera área: la línea, el
  // modelo y el color son del proyecto, no cambian de un área a otra.
  // la portada va limpia: es la hoja que se firma, y la marca de agua le
  // ensuciaba la descripción. El logo grande ya está arriba a la izquierda.
  portada(doc, proyecto, lista[0], HOJA, M, fecha, CAJETIN_H)
  cajetinPortada(doc, proyecto, fecha)

  lista.forEach((area, idx) => {
    doc.addPage()
    marcaDeAgua(doc, HOJA)

    doc.setDrawColor(TINTA)
    doc.setLineWidth(0.7)
    doc.rect(M / 2, M / 2, HOJA.w - M, HOJA.h - M)

    const prof = area.config.profundidadCm
    const marcos = marcosDe(area.tramos)
    // el cuarto PMR llega más hondo que las cabinas: hay que encuadrarlo también
    const profPmr = area.config.tipologia === 'PMR' ? profundidadDelLugar(area.config) : 0
    const caja = cajaDelPlano(area.tramos, marcos, prof, 46, profPmr)

    const zonaW = HOJA.w - M * 2 - PANEL_W - 6
    const zonaH = HOJA.h - M * 2 - CAJETIN_H - 6

    // Debajo de la planta va el ALZADO, a la MISMA escala, así que cada pieza
    // cae justo abajo de donde está arriba. Las dos vistas tienen que caber en
    // la hoja, así que la escala sale del alto de las dos juntas.
    const tramoPrincipal = area.tramos[tipologia(area.config.tipologia).principal]
    const conAlzado = !!tramoPrincipal && tramoPrincipal.cabinas.length > 0
    const hPilastra = alturasDe(area.config.modelo).pilastra
    // lo que ocupan las dos vistas en cm, y aparte lo que ocupan en mm el aire
    // entre ellas y el rótulo de abajo
    const altoDibujo = caja.h + (conAlzado ? hPilastra : 0)
    const altoFijo = conAlzado ? SEPARA_VISTAS_MM + ROTULO_MM : 0
    const k = Math.min(zonaW / caja.w, (zonaH - altoFijo) / altoDibujo)
    const arriba = M + (zonaH - (altoDibujo * k + altoFijo)) / 2
    const e: Escala = {
      k,
      ox: M + (zonaW - caja.w * k) / 2 - caja.x * k,
      oy: arriba - caja.y * k,
    }

    murosYPiezas(doc, area, e, marcos)
    if (conAlzado) {
      const piso = arriba + caja.h * k + SEPARA_VISTAS_MM + hPilastra * k
      alzado(doc, area, e, tramoPrincipal, piso)
    }
    cuadroDePiezas(doc, area, HOJA.w - M - PANEL_W, M + 6, PANEL_W)
    cajetin(doc, proyecto, area, idx + 1, lista.length, fecha)

    texto(doc, `ESCALA 1:${Math.round(10 / k)}`, M + 2, HOJA.h - M - CAJETIN_H - 2, { size: 5.5, color: GRIS })
  })

  return doc
}

/**
 * El nombre del archivo. Los pedazos vacíos NO dejan su guión: un proyecto sin
 * número ni obra daba "Plano--proyecto.pdf", con el guión doble en medio.
 */
export function nombreArchivoPDF(proyecto: Proyecto): string {
  const limpio = (s: string) => s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  const partes = ['Plano', limpio(proyecto.numero || ''), limpio(proyecto.obra || '')].filter(Boolean)
  if (partes.length === 1) partes.push('proyecto')
  return partes.join('-') + '.pdf'
}
