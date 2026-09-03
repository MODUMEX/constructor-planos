/**
 * Dibuja la regadera del catálogo y la deja embebida en src/assets/sanitarios.ts,
 * igual que el inodoro y el orinal: un PNG en base64 para que el plano salga
 * completo sin conexión y dentro de la aplicación de escritorio.
 *   node scripts/generar-regadera.mjs
 */
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

const W = 200, H = 340
const cobertura = new Float32Array(W * H)
const MUESTRAS = 3

function pintar(dentro) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let n = 0
      for (let sy = 0; sy < MUESTRAS; sy++) {
        for (let sx = 0; sx < MUESTRAS; sx++) {
          const px = x + (sx + 0.5) / MUESTRAS
          const py = y + (sy + 0.5) / MUESTRAS
          if (dentro(px, py)) n++
        }
      }
      if (n === 0) continue
      const v = n / (MUESTRAS * MUESTRAS)
      const i = y * W + x
      if (v > cobertura[i]) cobertura[i] = v
    }
  }
}

const barra = (x, y, w, h) => pintar((px, py) => px >= x && px <= x + w && py >= y && py <= y + h)

function marco(x, y, w, h, g) {
  barra(x, y, w, g)
  barra(x, y + h - g, w, g)
  barra(x, y, g, h)
  barra(x + w - g, y, g, h)
}

function anillo(cx, cy, r, g) {
  pintar((px, py) => {
    const d = Math.hypot(px - cx, py - cy)
    return Math.abs(d - r) <= g / 2
  })
}

function anilloOvalo(cx, cy, rx, ry, g) {
  pintar((px, py) => {
    const dx = (px - cx) / rx
    const dy = (py - cy) / ry
    const f = Math.sqrt(dx * dx + dy * dy)
    const d = (f - 1) * Math.min(rx, ry)
    return Math.abs(d) <= g / 2
  })
}

function segmento(x1, y1, x2, y2, g) {
  const vx = x2 - x1, vy = y2 - y1
  const largo2 = vx * vx + vy * vy
  pintar((px, py) => {
    let t = ((px - x1) * vx + (py - y1) * vy) / largo2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy)) <= g / 2
  })
}

// el soporte de pared con los dos resortes
marco(20, 40, 160, 112, 13)
for (const cx of [52, 148]) for (const cy of [62, 86, 110, 134]) anillo(cx, cy, 15, 9)

// el tubo: baja desde la pared, atraviesa el soporte y sigue hasta la regadera
barra(81, 6, 10, 246)
barra(109, 6, 10, 246)
segmento(86, 250, 79, 268, 10)
segmento(114, 250, 121, 268, 10)

// la piña, que es lo que se ve en planta
anilloOvalo(100, 296, 34, 40, 12)

const filas = []
for (let y = 0; y < H; y++) {
  const fila = Buffer.alloc(1 + W * 4)
  for (let x = 0; x < W; x++) {
    const a = Math.round(Math.min(1, cobertura[y * W + x]) * 255)
    fila[1 + x * 4 + 3] = a
  }
  filas.push(fila)
}
const crudo = Buffer.concat(filas)

const tablaCrc = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc(buf) {
  let c = 0xffffffff
  for (const b of buf) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const suma = Buffer.alloc(4)
  suma.writeUInt32BE(crc(cuerpo))
  return Buffer.concat([largo, cuerpo, suma])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  trozo('IHDR', ihdr),
  trozo('IDAT', deflateSync(crudo, { level: 9 })),
  trozo('IEND', Buffer.alloc(0)),
])

const NL = String.fromCharCode(10), CR = String.fromCharCode(13)
const f = 'src/assets/sanitarios.ts'
let s = readFileSync(f, 'utf8').split(CR + NL).join(NL)
const marca = 'export const REGADERA: Sanitario = {'
const bloque = [
  '/** la regadera va en la pared, igual que el fluxómetro del inodoro */',
  'export const ALTO_REGADERA_CM = 55',
  '',
  marca,
  '  ancho: ' + W + ',',
  '  alto: ' + H + ',',
  "  src: 'data:image/png;base64," + png.toString('base64') + "',",
  '}',
].join(NL)

const corte = s.indexOf('/** la regadera va en la pared')
s = (corte >= 0 ? s.slice(0, corte) : s.replace(/\s+$/, '') + NL + NL) + bloque + NL
writeFileSync(f, s)
console.log('regadera:', png.length, 'bytes')
