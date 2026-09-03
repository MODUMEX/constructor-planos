/**
 * Genera un PDF y un CSV de muestra sin abrir el navegador.
 *   npm run muestra
 * Sirve para revisar el plano impreso y para probar el CSV en el CIP.
 */
import { writeFileSync } from 'node:fs'
import { generarPDF, nombreArchivoPDF } from '../src/exportar/pdf'
import { generarCSV, nombreArchivoCSV } from '../src/exportar/csv'
import { crearTramos, nuevoId } from '../src/modulacion'
import { espesorPorLinea } from '../src/catalog'
import type { Area, Config, Proyecto, TipologiaId } from '../src/types'

function config(tipologia: TipologiaId, linea: Config['linea'] = 'LEEDER'): Config {
  const superior = linea === 'SUPERIOR'
  return {
    linea,
    modelo: superior ? 'SUP_ESTANDAR' : 'ESTANDAR',
    acabado: 'Laminado Compacto',
    color: 'BLANCO',
    montaje: 'PISO_HEADRAIL',
    bisagra: 'GRAV',
    cerrojo: 'IND',
    herrajeAcabado: 'NEGRO',
    alturaCm: 150,
    profundidadCm: 150,
    anchoAccesibleCm: 150,
    anchoPilastraCm: 15,
    espesorMm: espesorPorLinea(linea),
    terminacion: 'ZOCLO',
    kap: false,
    orinales: 3,
    mgAlturaCm: 120,
    tipologia,
  }
}

function area(nombre: string, tipologia: TipologiaId, claro: number, cabinas: number, linea?: Config['linea']): Area {
  const cfg = config(tipologia, linea)
  return { id: nuevoId('area'), nombre, piso: 'Planta baja', config: cfg, tramos: crearTramos(tipologia, claro, cabinas, cfg) }
}

const proyecto: Proyecto = {
  numero: '1042',
  paisFabricacion: 'CR',
  obra: 'Torre Escazú',
  cliente: 'Constructora Volio',
  ubicacion: 'San José, Escazú',
  distribuidor: 'Modumex Costa Rica',
  creadoPor: 'Dayanna Lizano',
  areas: [
    area('Baño de hombres 101', 'RECTA_MURO_IZQ', 420, 4),
    area('Baño de mujeres 102', 'ESQUINA_IZQ', 420, 4),
    // esta va en Superior 2.0 para ver el espesor de 3 mm en el cajetín y en el CSV
    area('Baño de hombres 201', 'U_TRES_MUROS', 420, 4, 'SUPERIOR'),
    area('Orinales 101', 'ORINALES', 240, 4),
  ],
}

const salida = process.argv[2] ?? '.'
const pdf = generarPDF(proyecto, '15/8/2026')
const rutaPdf = `${salida}/${nombreArchivoPDF(proyecto)}`
writeFileSync(rutaPdf, Buffer.from(pdf.output('arraybuffer')))

const rutaCsv = `${salida}/${nombreArchivoCSV(proyecto)}`
writeFileSync(rutaCsv, '﻿' + generarCSV(proyecto), 'utf8')

console.log('PDF :', rutaPdf)
console.log('CSV :', rutaCsv)
