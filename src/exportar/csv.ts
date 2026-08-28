import type { Proyecto } from '../types'
import { agrupar, modeloParaCsv, nombreLinea, nombreSistema, piezasDeArea } from './piezas'

/**
 * CSV que consume el CIP (pestaña Capturar → "OC del Constructor").
 * El encabezado y el orden son los mismos que emite el Constructor actual:
 * el CIP busca las columnas por nombre, así que no se puede renombrar ninguna.
 *
 * `Herraje`, `Pais` y `CodigoColor` son las columnas nuevas y van al final. El
 * CIP resuelve las columnas con header.indexOf(nombre) y solo exige SKU,
 * Cantidad y SubTipo, así que las ignora sin romperse; quedan puestas para
 * cuando el CIP tenga los códigos del juego negro y la materia prima de México.
 */
export const CABECERA_CSV =
  'Codigo,Obra,Distribuidor,SKU,Cantidad,SubTipo,Orientacion,Area,Modelo,Sistema,Color,KAP,Linea,Acabado,Herraje,Pais,CodigoColor'

function celda(v: string | number): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function generarCSV(proyecto: Proyecto): string {
  const lineas: string[] = [CABECERA_CSV]

  for (const area of proyecto.areas) {
    const config = area.config
    const renglones = agrupar(piezasDeArea(area), config)
    for (const r of renglones) {
      lineas.push(
        [
          celda(proyecto.numero),
          celda(proyecto.obra),
          celda(proyecto.distribuidor),
          celda(r.sku),
          r.cantidad,
          celda(r.subTipo),
          celda(r.orientacion),
          celda(r.area),
          celda(modeloParaCsv(config)),
          celda(nombreSistema(config)),
          celda(config.color),
          config.kap ? 'SI' : 'NO',
          celda(nombreLinea(config.linea)),
          celda(config.acabado),
          celda(config.herrajeAcabado),
          celda(proyecto.paisFabricacion),
          celda(config.colorCodigo ?? ''),
        ].join(','),
      )
    }
  }

  return lineas.join('\n')
}

export function nombreArchivoCSV(proyecto: Proyecto): string {
  const obra = (proyecto.obra || 'proyecto').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '-')
  return `OC-${proyecto.numero}-${obra}.csv`
}

// el guardado del archivo vive en ./guardar.ts, que sirve para el navegador
// y para la aplicación de escritorio
