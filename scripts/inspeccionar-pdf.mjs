/**
 * Lee un PDF hecho con jsPDF (streams sin comprimir) y saca la lista de textos
 * con su posición, más un conteo de líneas y rectángulos por hoja.
 * Sirve para comprobar que el plano trae lo que debe y que nada se sale de la
 * hoja ni se mete en el cajetín.
 *   node scripts/inspeccionar-pdf.mjs ruta.pdf
 */
import { readFileSync } from 'node:fs'

const ruta = process.argv[2]
if (!ruta) {
  console.error('falta la ruta del PDF')
  process.exit(1)
}

const crudo = readFileSync(ruta).toString('latin1')

// cada hoja es un stream de contenido; los de las imágenes embebidas se saltan
const streams = [...crudo.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
  .map((m) => m[1])
  .filter((s) => s.includes('BT') || s.includes(' re\n'))
console.log(`Hojas: ${streams.length}`)

const PT_MM = 25.4 / 72
const HOJA = { w: 279.4, h: 215.9 }

streams.forEach((s, i) => {
  const textos = []
  // BT ... x y Td (texto) Tj ... ET
  const bloques = [...s.matchAll(/BT([\s\S]*?)ET/g)].map((m) => m[1])
  for (const b of bloques) {
    const pos = b.match(/(-?[\d.]+)\s+(-?[\d.]+)\s+Td/)
    const txt = b.match(/\((.*?)\)\s*Tj/)
    if (pos && txt) {
      const xPt = Number(pos[1])
      const yPt = Number(pos[2])
      textos.push({
        texto: txt[1],
        xMm: +(xPt * PT_MM).toFixed(1),
        // el PDF cuenta la y desde abajo; la paso a la de la hoja para comparar
        yMm: +((HOJA.h / PT_MM - yPt) * PT_MM).toFixed(1),
      })
    }
  }
  const lineas = (s.match(/ l\b/g) ?? []).length
  const rects = (s.match(/ re\b/g) ?? []).length
  const imagenes = (s.match(/\/I\d+ Do/g) ?? []).length

  console.log(`\n── Hoja ${i + 1}: ${textos.length} textos, ${lineas} líneas, ${rects} rectángulos, ${imagenes} sanitarios`)

  const fuera = textos.filter((t) => t.xMm < 0 || t.yMm < 0 || t.xMm > HOJA.w || t.yMm > HOJA.h)
  console.log(fuera.length ? `  ⚠ ${fuera.length} textos fuera de la hoja: ${fuera.map((t) => t.texto).join(', ')}` : '  ✓ todos los textos caen dentro de la hoja')

  // el cajetín ocupa la banda de abajo; el dibujo no debería entrar ahí
  const yCajetin = HOJA.h - 8 - 30
  const enCajetin = textos.filter((t) => t.yMm > yCajetin)
  const enDibujo = textos.filter((t) => t.yMm <= yCajetin)
  console.log(`  Cajetín: ${enCajetin.length} textos · Dibujo y cuadro: ${enDibujo.length} textos`)

  const cotas = enDibujo.filter((t) => /^[\d.]+( cm)?$/.test(t.texto))
  console.log(`  Cotas numéricas: ${cotas.length} → ${cotas.map((c) => c.texto).join('  ')}`)

  const etiquetas = enCajetin.filter((t) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t.texto)).map((t) => t.texto)
  console.log(`  En el cajetín: ${etiquetas.join(' | ')}`)
})
