/**
 * Un ejemplo de cómo sale el Excel de Syclick, con un proyecto parecido a uno
 * de verdad: tres áreas, una con color de grupo, otra con color especial y
 * otra de Superior esmaltada, más orinales.
 *
 *   npm run ejemplo-syclick
 *
 * Deja `muestra-syclick.xlsx` en la raíz y además imprime las hojas en la
 * consola, que es lo que no se ve abriendo el archivo.
 */
import { writeFileSync } from 'node:fs'
import { crearTramos } from '../src/modulacion'
import { cabinasDe, generarSyclick } from '../src/exportar/syclick'
import { agrupar, piezasDeArea } from '../src/exportar/piezas'
import { nombreModelo } from '../src/catalog'
import { skuSyclick } from '../src/exportar/syclick'
import type { Area, Config, Proyecto, TipologiaId } from '../src/types'

function cfg(extra: Partial<Config> = {}): Config {
  return {
    linea: 'LEEDER', modelo: 'REFORZADO', acabado: 'Laminado Compacto', color: 'Alumina',
    montaje: 'PISO_HEADRAIL', bisagra: '', cerrojo: '', herrajeAcabado: 'INOX',
    alturaCm: 180, profundidadCm: 150, anchoAccesibleCm: 150, anchoPilastraCm: 24,
    espesorMm: 12, terminacion: 'ZOCLO', kap: false, orinales: 0, mgAlturaCm: 120,
    tipologia: 'RECTA_ENTRE_MUROS' as TipologiaId, ...extra,
  } as Config
}

function area(id: string, nombre: string, piso: string, config: Config, claro: number, cabinas: number): Area {
  return { id, nombre, piso, config, tramos: crearTramos(config.tipologia, claro, cabinas, config, 'MX') }
}

const proyecto: Proyecto = {
  numero: '1105',
  obra: 'Poder Judicial Cañas',
  cliente: 'EDIFICAR',
  ubicacion: 'Guanacaste',
  distribuidor: 'ALUMAS',
  creadoPor: 'Dayanna Lizano',
  paisFabricacion: 'MX',
  areas: [
    area('a1', 'Baño hombres planta baja', 'Planta baja', cfg(), 370, 4),
    area('a2', 'Baño mujeres planta baja', 'Planta baja',
      cfg({ modelo: 'ESTANDAR', color: 'Skyline Walnut', terminacion: 'PATAS' }), 300, 3),
    area('a3', 'Baño dirección', 'Planta alta',
      cfg({ linea: 'SUPERIOR', modelo: 'SUP_REFORZADO', color: 'Verde Bosque' }), 260, 2),
  ],
}

const bytes = generarSyclick(proyecto)
writeFileSync('muestra-syclick.xlsx', bytes)

const cabinas = cabinasDe(proyecto)
console.log(`\nProyecto ${proyecto.numero} · ${proyecto.obra} · ${cabinas} cabinas en total`)
console.log(`(de ${cabinas} depende si un color especial va MAYOR o MENOR a 10 módulos)\n`)

console.log('HOJA «Datos generales»')
console.log('  Nombre del cliente  | ' + proyecto.cliente)
console.log('  Nombre de la obra   | ' + proyecto.obra)
console.log('  Atención a          | ' + proyecto.distribuidor)

console.log('\nHOJA «Áreas»')
console.log('  ' + ['Área', 'Descripción', 'Amb.', 'Color', 'Color libre'].map((h, i) => h.padEnd([26, 34, 5, 30, 14][i])).join(''))
for (const a of proyecto.areas) {
  const c = a.config
  const sku = skuSyclick('PL', c, cabinas)
  const grupo = sku.split('-')[5]
  const etiqueta: Record<string, string> = {
    CEM10: 'ESPECIAL MAYOR A 10 MODULOS', CEN10: 'ESPECIAL MENOR A 10 MODULOS',
    FM10: 'FORMICA MAYOR A 10 MODULOS', FN10: 'FORMICA MENOR A 10 MODULOS',
  }
  const fijo = etiqueta[grupo]
  console.log('  ' + [
    a.nombre.padEnd(26),
    `${nombreModelo(c.linea, c.modelo)} · ${c.acabado}`.padEnd(34),
    '1'.padEnd(5),
    (fijo ?? (grupo === 'AI' ? '' : c.color.toUpperCase())).padEnd(30),
    fijo ? c.color : '',
  ].join(''))
}

console.log('\nHOJA «Captura»')
console.log('  ' + ['Área', 'SKU', 'Ancho', 'Alto', 'Remate', 'Cant.'].map((h, i) => h.padEnd([26, 24, 7, 6, 9, 6][i])).join(''))
for (const a of proyecto.areas) {
  const juntos = new Map<string, [string, number, number, string, number]>()
  for (const r of agrupar(piezasDeArea(a), a.config)) {
    const sku = skuSyclick(r.familia, a.config, cabinas)
    const rem = r.familia === 'PL' ? (a.config.terminacion === 'PATAS' ? 'PATA' : 'ZOCLO') : ''
    const clave = `${sku}|${r.anchoCm}|${r.altoCm}|${rem}`
    const ya = juntos.get(clave)
    if (ya) ya[4] += r.cantidad
    else juntos.set(clave, [sku, r.anchoCm, r.altoCm, rem, r.cantidad])
  }
  for (const [sku, ancho, alto, rem, cant] of juntos.values()) {
    console.log('  ' + [
      a.nombre.padEnd(26), sku.padEnd(24), String(ancho).padEnd(7),
      String(alto).padEnd(6), rem.padEnd(9), String(cant),
    ].join(''))
  }
}

console.log('\nHOJA «Otros productos»: vacía (los herrajes sueltos todavía no se mandan)\n')
console.log('Archivo escrito: muestra-syclick.xlsx')
