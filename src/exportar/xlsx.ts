/**
 * Escritor de .xlsx, lo mínimo para armar un libro de varias hojas.
 *
 * No se agregó una librería a propósito: un xlsx es un zip con XML adentro y
 * acá solo hacen falta celdas de texto y de número, sin estilos ni fórmulas.
 * Las que hay —ExcelJS, SheetJS— pesan casi un mega y la app se descarga
 * entera en cada actualización, así que no vale la pena.
 *
 * El zip se escribe SIN comprimir (método 0, "store"). Es más grande, pero no
 * hace falta meter un deflate en el navegador y Excel lo abre igual.
 */

export interface HojaXlsx {
  /** el nombre de la pestaña; Excel no admite : \ / ? * [ ] ni más de 31 letras */
  nombre: string
  /** las celdas, por filas. `null` deja la celda vacía */
  filas: (string | number | null)[][]
}

const codificar = (s: string) => new TextEncoder().encode(s)

function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Excel no abre el archivo si va un carácter de control suelto
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

/** A, B, … Z, AA, AB … */
export function columna(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function hojaXml(hoja: HojaXlsx): string {
  const filas = hoja.filas
    .map((celdas, f) => {
      const cs = celdas
        .map((v, c) => {
          if (v === null || v === undefined || v === '') return ''
          const ref = `${columna(c)}${f + 1}`
          if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`
          // inline: así no hace falta la tabla de textos compartidos
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(String(v))}</t></is></c>`
        })
        .join('')
      return cs ? `<row r="${f + 1}">${cs}</row>` : ''
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${filas}</sheetData></worksheet>`
  )
}

/** el nombre de pestaña que Excel acepta */
function nombreDeHoja(n: string): string {
  return (n.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Hoja').slice(0, 31)
}

// ---------------------------------------------------------------- el zip

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface Entrada {
  nombre: string
  datos: Uint8Array
}

/** un zip sin comprimir, que es todo lo que necesita un xlsx */
function armarZip(entradas: Entrada[]): Uint8Array {
  const locales: Uint8Array[] = []
  const central: Uint8Array[] = []
  let desplazamiento = 0

  for (const e of entradas) {
    const nombre = codificar(e.nombre)
    const crc = crc32(e.datos)
    const n = e.datos.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0, true)
    local.setUint16(8, 0, true) // sin comprimir
    local.setUint16(10, 0, true)
    local.setUint16(12, 0, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, n, true)
    local.setUint32(22, n, true)
    local.setUint16(26, nombre.length, true)
    local.setUint16(28, 0, true)
    locales.push(new Uint8Array(local.buffer), nombre, e.datos)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true)
    dir.setUint16(6, 20, true)
    dir.setUint16(10, 0, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, n, true)
    dir.setUint32(24, n, true)
    dir.setUint16(28, nombre.length, true)
    dir.setUint32(42, desplazamiento, true)
    central.push(new Uint8Array(dir.buffer), nombre)

    desplazamiento += 30 + nombre.length + n
  }

  const largoCentral = central.reduce((s, b) => s + b.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, entradas.length, true)
  fin.setUint16(10, entradas.length, true)
  fin.setUint32(12, largoCentral, true)
  fin.setUint32(16, desplazamiento, true)

  const partes = [...locales, ...central, new Uint8Array(fin.buffer)]
  const total = partes.reduce((s, b) => s + b.length, 0)
  const salida = new Uint8Array(total)
  let p = 0
  for (const b of partes) {
    salida.set(b, p)
    p += b.length
  }
  return salida
}

/** arma el .xlsx con esas hojas, en ese orden */
export function libroXlsx(hojas: HojaXlsx[]): Uint8Array {
  const nombres = hojas.map((h) => nombreDeHoja(h.nombre))

  const tipos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    hojas
      .map(
        (_h, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '</Types>'

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'

  const libro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    nombres
      .map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('') +
    '</sheets></workbook>'

  const relsLibro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    hojas
      .map(
        (_h, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    '</Relationships>'

  return armarZip([
    { nombre: '[Content_Types].xml', datos: codificar(tipos) },
    { nombre: '_rels/.rels', datos: codificar(rels) },
    { nombre: 'xl/workbook.xml', datos: codificar(libro) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: codificar(relsLibro) },
    ...hojas.map((h, i) => ({
      nombre: `xl/worksheets/sheet${i + 1}.xml`,
      datos: codificar(hojaXml(h)),
    })),
  ])
}
