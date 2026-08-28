/**
 * Comprueba que el precio por pieza da lo mismo que la lista del Constructor.
 * Los valores esperados se leen del propio literal extraído, así que si alguien
 * cambia las tarifas el test sigue siendo válido.
 *   npm run probar-tarifas
 */
import { precioPieza, anchoCobradoPuerta } from '../src/tarifas'
import { TARIFAS_BASE } from '../src/datos/tarifas-base'

let fallos = 0

function revisar(caso: string, obtenido: number, esperado: number) {
  const ok = Math.abs(obtenido - esperado) < 0.01
  if (!ok) fallos++
  console.log(`${ok ? '✓' : '✕'} ${caso}: ${obtenido.toFixed(2)} (esperado ${esperado.toFixed(2)})`)
}

const t = (modelo: string, juego: string, familia: string): number =>
  (TARIFAS_BASE[modelo] as never as Record<string, Record<string, number>>)[juego][familia]

console.log('— puerta 95 × 150, ESTANDAR, color de línea, dólares')
revisar(
  'puerta 95',
  precioPieza({ familia: 'PT', anchoCm: 95, altoCm: 150 }, { modeloCodigo: 'ESTANDAR', tier: 'linea', moneda: 'USD', tipoCambio: 512 }),
  ((95 * 150) / 1e4) * t('ESTANDAR', 'linea', 'puerta'),
)

console.log('\n— la puerta de 92 se cobra como 100 (anchoCobradoPuerta)')
revisar('ancho cobrado de 92', anchoCobradoPuerta(92), 100)
revisar(
  'puerta 92',
  precioPieza({ familia: 'PT', anchoCm: 92, altoCm: 150 }, { modeloCodigo: 'ESTANDAR', tier: 'linea', moneda: 'USD', tipoCambio: 512 }),
  ((100 * 150) / 1e4) * t('ESTANDAR', 'linea', 'puerta'),
)

console.log('\n— color especial usa el juego "especiales"')
revisar(
  'panel especial',
  precioPieza({ familia: 'PN', anchoCm: 150, altoCm: 150 }, { modeloCodigo: 'ESTANDAR', tier: 'especial', moneda: 'USD', tipoCambio: 512 }),
  ((150 * 150) / 1e4) * t('ESTANDAR', 'especiales', 'panel'),
)

console.log('\n— en colones usa la columna en colones, no el tipo de cambio')
revisar(
  'panel en colones',
  precioPieza({ familia: 'PN', anchoCm: 150, altoCm: 150 }, { modeloCodigo: 'ESTANDAR', tier: 'linea', moneda: 'CRC', tipoCambio: 512 }),
  ((150 * 150) / 1e4) * t('ESTANDAR', 'lineaCRC', 'panel'),
)

console.log('\n— Superior es usdOnly: en colones convierte con el tipo de cambio y la tarifa lineaCR')
revisar(
  'pilastra Superior en colones',
  precioPieza({ familia: 'PL', anchoCm: 16, altoCm: 180 }, { modeloCodigo: 'SUP_REFORZADO', tier: 'linea', moneda: 'CRC', tipoCambio: 512 }),
  ((16 * 180) / 1e4) * t('SUP_REFORZADO', 'lineaCR', 'pilastra') * 512,
)
revisar(
  'pilastra Superior en dólares',
  precioPieza({ familia: 'PL', anchoCm: 16, altoCm: 180 }, { modeloCodigo: 'SUP_REFORZADO', tier: 'linea', moneda: 'USD', tipoCambio: 512 }),
  ((16 * 180) / 1e4) * t('SUP_REFORZADO', 'linea', 'pilastra'),
)

console.log('\n— un modelo que no existe cae en ESTANDAR, como en el Constructor')
revisar(
  'modelo inventado',
  precioPieza({ familia: 'PN', anchoCm: 150, altoCm: 150 }, { modeloCodigo: 'NO_EXISTE', tier: 'linea', moneda: 'USD', tipoCambio: 512 }),
  ((150 * 150) / 1e4) * t('ESTANDAR', 'linea', 'panel'),
)

console.log('\n— una tarifa de la nube pisa la de respaldo')
const conNube = JSON.parse(JSON.stringify(TARIFAS_BASE))
conNube.ESTANDAR.linea.panel = 999
revisar(
  'panel con tarifa nueva',
  precioPieza(
    { familia: 'PN', anchoCm: 100, altoCm: 100 },
    { modeloCodigo: 'ESTANDAR', tier: 'linea', moneda: 'USD', tipoCambio: 512, tarifas: conNube },
  ),
  1 * 999,
)

console.log(fallos === 0 ? '\nTodo cuadra.' : `\n${fallos} caso(s) mal.`)
process.exit(fallos === 0 ? 0 : 1)
