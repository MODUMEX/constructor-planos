import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export const LIBRO = path.join(
  os.homedir(),
  'OneDrive - Modumex Mamparas Sanitarias Finas SA DE CV',
  'Documentos', 'Odoo', 'Documentos para capacitaciones',
  'Fase 2 Módulo de Manufactura, Taller y Planos (MRP)',
  'BOM_Mamparas_Completo.xlsx',
)

function descomprimir(libro) {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'bom-odoo-'))
  // un .xlsx es un zip, pero Expand-Archive se niega por la extensión
  const ps = [
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    '[System.IO.Compression.ZipFile]::ExtractToDirectory(',
    `'${libro.replace(/'/g, "''")}', '${destino}')`,
  ].join(' ')
  execFileSync('powershell', ['-NoProfile', '-Command', ps])
  return destino
}

function textos(dir) {
  const xml = fs.readFileSync(path.join(dir, 'xl', 'sharedStrings.xml'), 'utf8')
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
}

function filas(dir, hoja, cadenas) {
  const xml = fs.readFileSync(path.join(dir, 'xl', 'worksheets', hoja), 'utf8')
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((f) => {
    const o = {}
    for (const c of f[1].matchAll(
      /<c r="([A-Z]+)\d+"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)?<\/c>/g,
    )) {
      const [, col, tipo, v, enLinea] = c
      o[col] = tipo === 's' ? cadenas[Number(v)] : (enLinea ?? v ?? '')
    }
    return o
  })
}

let cache = null

function leerTodo(libro) {
  if (cache) return cache
  if (!fs.existsSync(libro)) return null
  const dir = descomprimir(libro)
  try {
    const cadenas = textos(dir)
    cache = {
      variantes: filas(dir, 'sheet1.xml', cadenas).slice(1).map((f) => ({
        sku: f.A, nombre: f.B, linea: f.C, pieza: f.D, tamano: f.E,
      })),
      lineas: filas(dir, 'sheet2.xml', cadenas).slice(1).map((f) => ({
        sku: f.A, tipo: f.B, comp: f.C, desc: f.D, cant: Number(f.E), uni: f.F,
      })),
    }
    return cache
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** el índice de variantes de Odoo: 24 129 SKU con su línea, pieza y tamaño */
export function variantesOdoo(libro = LIBRO) {
  return leerTodo(libro)?.variantes ?? null
}

/** las líneas de BOM de cada SKU */
export function lineasBom(libro = LIBRO) {
  return leerTodo(libro)?.lineas ?? null
}
