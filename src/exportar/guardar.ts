/**
 * Guardar un archivo desde los dos lados:
 *  · en la aplicación de escritorio abre el diálogo "Guardar como" de Windows
 *    y escribe el archivo donde el usuario diga;
 *  · en el navegador cae en la descarga de siempre.
 *
 * Los plugins de Tauri se cargan con import dinámico para que la versión web
 * no arrastre nada de escritorio en su bundle.
 */

export const enEscritorio = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface Filtro {
  nombre: string
  extensiones: string[]
}

async function guardarConDialogo(nombre: string, datos: Uint8Array, filtros: Filtro[]): Promise<string | null> {
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const ruta = await save({
    defaultPath: nombre,
    filters: filtros.map((f) => ({ name: f.nombre, extensions: f.extensiones })),
  })
  if (!ruta) return null
  await writeFile(ruta, datos)
  return ruta
}

function descargarEnNavegador(nombre: string, datos: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([datos], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** devuelve la ruta si se guardó en disco, o null si se descargó / se canceló */
export async function guardarArchivo(
  nombre: string,
  datos: Uint8Array,
  tipo: string,
  filtros: Filtro[],
): Promise<string | null> {
  if (enEscritorio()) return guardarConDialogo(nombre, datos, filtros)
  descargarEnNavegador(nombre, datos as BlobPart, tipo)
  return null
}

export const FILTRO_PDF: Filtro[] = [{ nombre: 'Plano en PDF', extensiones: ['pdf'] }]
export const FILTRO_CSV: Filtro[] = [{ nombre: 'Orden de compra para el CIP', extensiones: ['csv'] }]

/** el CIP y Excel leen el CSV con el BOM adelante */
export function csvABytes(texto: string): Uint8Array {
  return new TextEncoder().encode('﻿' + texto)
}
