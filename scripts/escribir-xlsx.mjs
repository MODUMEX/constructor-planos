import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

/** Escribe un .xlsx sencillo (texto en línea, sin formato) sin depender de librerías. */

const esc = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function letra(i) {
  let s = ''
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s
  return s
}

function celda(ref, valor) {
  if (valor === null || valor === undefined || valor === '') return `<c r="${ref}"/>`
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"><v>${valor}</v></c>`
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`
}

function hojaXml(filas) {
  const cuerpo = filas.map((fila, f) =>
    `<row r="${f + 1}">${fila.map((v, c) => celda(letra(c) + (f + 1), v)).join('')}</row>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetData>${cuerpo}</sheetData></worksheet>`
}

/** hojas = [{ nombre, filas: [[...celdas]] }] */
export function escribirXlsx(destino, hojas) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'))
  fs.mkdirSync(path.join(tmp, '_rels'))
  fs.mkdirSync(path.join(tmp, 'xl', '_rels'), { recursive: true })
  fs.mkdirSync(path.join(tmp, 'xl', 'worksheets'), { recursive: true })

  const tipos = hojas.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  fs.writeFileSync(path.join(tmp, '[Content_Types].xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
    + `<Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + tipos + `</Types>`)

  fs.writeFileSync(path.join(tmp, '_rels', '.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
    + `</Relationships>`)

  fs.writeFileSync(path.join(tmp, 'xl', 'workbook.xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
    + ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`
    + hojas.map((h, i) => `<sheet name="${esc(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
    + `</sheets></workbook>`)

  fs.writeFileSync(path.join(tmp, 'xl', '_rels', 'workbook.xml.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `</Relationships>`)

  hojas.forEach((h, i) =>
    fs.writeFileSync(path.join(tmp, 'xl', 'worksheets', `sheet${i + 1}.xml`), hojaXml(h.filas)))

  // .NET quiere la ruta de Windows completa, con sus contrabarras
  const archivo = path.resolve(destino)
  fs.rmSync(archivo, { force: true })
  fs.mkdirSync(path.dirname(archivo), { recursive: true })
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tmp}', '${archivo.replace(/'/g, "''")}')`])
  fs.rmSync(tmp, { recursive: true, force: true })
  return archivo
}
