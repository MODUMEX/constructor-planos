/**
 * Saca el texto de un PDF cualquiera (no solo los de jsPDF) con pdfjs.
 * Sirve para auditar planos hechos en CAD: rótulos, medidas y cuadro de piezas.
 *
 *   node scripts/leer-plano.mjs "ruta.pdf"          texto de todas las hojas
 *   node scripts/leer-plano.mjs "ruta.pdf" --resumen  solo lo que interesa
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const ruta = process.argv[2]
const soloResumen = process.argv.includes('--resumen')
if (!ruta) {
  console.error('falta la ruta del PDF')
  process.exit(1)
}

const doc = await getDocument({ url: ruta, useSystemFonts: true }).promise
const hojas = []
for (let n = 1; n <= doc.numPages; n++) {
  const pagina = await doc.getPage(n)
  const contenido = await pagina.getTextContent()
  hojas.push(contenido.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim())
}
if (!soloResumen) {
  hojas.forEach((t, i) => console.log(`--- hoja ${i + 1} ---\n${t}\n`))
} else {
  const todo = hojas.join(' ').toUpperCase()
  const tiene = (...palabras) => palabras.some((p) => todo.includes(p))
  console.log(
    JSON.stringify({
      hojas: hojas.length,
      caracteres: todo.length,
      mingitorio: tiene('MINGITORIO', 'URINARIO', 'ORINAL'),
      regadera: tiene('REGADERA', 'DUCHA'),
      accesible: tiene('DISCAPACIT', 'PMR', 'ACCESIBLE', 'MINUSV'),
      vestidor: tiene('VESTIDOR', 'LOCKER', 'CASILLER'),
      lavamanos: tiene('LAVAMANOS', 'LAVABO'),
      curva: tiene('CURVA', 'RADIO', 'CHAFLAN', 'CHAFLÁN'),
    }),
  )
}
