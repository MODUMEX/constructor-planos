/**
 * El IVA de una cotización es el del DISTRIBUIDOR de esa cotización, no el de
 * quien la escribe. Caso real: DICOMA es LATAM y le salía el 13 % de Costa
 * Rica porque lo estaba cotizando una cuenta de Costa Rica.
 *
 *   npm run probar-iva
 */
import { descuentoDeDistribuidor, ivaDeDistribuidor } from '../src/distribuidores'
import {
  descuentosDelCliente, descuentosDelDistribuidor, totalesDe,
  type Descuento, type RenglonBOM,
} from '../src/exportar/cotizacion'
import { ivaDeRegion, IVA_CR, IVA_MX } from '../src/auth'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const ficha = (region: string | null, iva: number | null) =>
  ({ region, iva } as Parameters<typeof ivaDeDistribuidor>[0])

// ── el de la región cuando la ficha lo deja en blanco
ok(ivaDeRegion('LATAM') === 0, 'LATAM factura sin IVA')
ok(ivaDeRegion('México') === IVA_MX, `México ${IVA_MX} %`)
ok(ivaDeRegion('Costa Rica') === IVA_CR, `Costa Rica ${IVA_CR} %`)

// ── la ficha del distribuidor manda sobre la cuenta que cotiza
ok(ivaDeDistribuidor(ficha('LATAM', null), IVA_CR) === 0,
  'DICOMA (LATAM, IVA en blanco) cotizado desde Costa Rica → 0 %')
ok(ivaDeDistribuidor(ficha('Costa Rica', null), 0) === IVA_CR,
  'un distribuidor de Costa Rica cotizado desde LATAM → 13 %')
ok(ivaDeDistribuidor(ficha('México', null), IVA_CR) === IVA_MX,
  'uno de México cotizado desde Costa Rica → 16 %')

// ── lo escrito a mano manda, incluso el 0
ok(ivaDeDistribuidor(ficha('Costa Rica', 0), IVA_CR) === 0,
  'un 0 escrito a mano SÍ es 0, aunque sea de Costa Rica')
ok(ivaDeDistribuidor(ficha('LATAM', 13), IVA_CR) === 13,
  'un 13 escrito a mano manda sobre el 0 de LATAM')

// ── el caso que dio el error: la ficha quedó con el 13 de cuando era CR
ok(ivaDeDistribuidor(ficha('LATAM', 13), IVA_CR) !== 0,
  'OJO: pasar la ficha a LATAM no borra un IVA escrito antes; hay que dejarlo en blanco')

// ── sin distribuidor elegido todavía, vale el de la cuenta
ok(ivaDeDistribuidor(undefined, IVA_CR) === IVA_CR, 'sin distribuidor va el de la cuenta')
ok(ivaDeDistribuidor(null, 0) === 0, 'sin distribuidor y cuenta LATAM, 0')

// ── El descuento sale de la misma ficha, y solo lo ve el DISTRIBUIDOR
console.log('')
const fichaD = (descuento: number) => ({ descuento } as Parameters<typeof descuentoDeDistribuidor>[0])
ok(descuentoDeDistribuidor(fichaD(22), 0) === 22,
  'cotizando desde una cuenta sin descuento, vale el 22 % de la ficha')
ok(descuentoDeDistribuidor(undefined, 15) === 15, 'sin distribuidor elegido va el de la cuenta')

// La hoja del cliente NO lleva el del distribuidor; los extras sí, en cascada.
const lista: Descuento[] = [
  { origen: 'distribuidor', etiqueta: 'Descuento distribuidor', pct: 20 },
  { origen: 'propio', etiqueta: 'Descuento extra', pct: 10 },
]
const reng = [{ tipo: 'Puerta', codigo: 'PT60', medida: '60 x 180', cantidad: 1, precioUnit: 100 }] as RenglonBOM[]

const paraDist = totalesDe(reng, lista, 13)
const paraCli = totalesDe(reng, descuentosDelCliente(lista), 13)

ok(paraDist.pasos.length === 2, 'el distribuidor ve los DOS descuentos desglosados')
ok(paraDist.pasos[0].etiqueta === 'Descuento distribuidor', 'y el suyo sale con su nombre y su monto')
ok(paraDist.gravable === 72, 'el distribuidor paga 100 x 0.80 x 0.90 = 72')

ok(paraCli.pasos.length === 1, 'el cliente ve solo el extra')
ok(paraCli.pasos[0].etiqueta === 'Descuento extra', 'y es el que se escribió a mano')
ok(paraCli.gravable === 90, 'el cliente paga 100 x 0.90 = 90, sin el del distribuidor')
ok(paraCli.gravable > paraDist.gravable, 'el cliente siempre paga más que el distribuidor')

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)

// ── Quién pone cada extra decide en qué hoja sale
console.log('')
const conQuien: Descuento[] = [
  { origen: 'distribuidor', etiqueta: 'Descuento distribuidor', pct: 20 },
  { origen: 'manual', etiqueta: 'Apoyo Modumex', pct: 5, quienLoPone: 'Modumex' },
  { origen: 'manual', etiqueta: 'Lo pone el distribuidor', pct: 6, quienLoPone: 'Distribuidor' },
]
const hojaDist = totalesDe(reng, descuentosDelDistribuidor(conQuien), 0)
const hojaCli = totalesDe(reng, descuentosDelCliente(conQuien), 0)

ok(hojaDist.pasos.length === 2, 'el distribuidor ve su descuento y el que pone Modumex')
ok(!hojaDist.pasos.some((p) => p.etiqueta === 'Lo pone el distribuidor'),
  'y NO ve el que pone él: sale de su margen')
ok(Math.abs(hojaDist.gravable - 76) < 0.001, 'paga 100 x 0.80 x 0.95 = 76')

ok(hojaCli.pasos.length === 2, 'el cliente ve los DOS extras, en cascada')
ok(!hojaCli.pasos.some((p) => p.origen === 'distribuidor'), 'y no ve el de la ficha')
ok(Math.abs(hojaCli.gravable - 89.3) < 0.001, 'paga 100 x 0.95 x 0.94 = 89.30')

ok(hojaCli.gravable > hojaDist.gravable, 'el margen del distribuidor sigue siendo positivo')

// Sin marcar quién lo pone, se toma como de Modumex (lo de antes no cambia)
const viejo: Descuento[] = [{ origen: 'manual', etiqueta: 'Extra viejo', pct: 10 }]
ok(descuentosDelDistribuidor(viejo).length === 1,
  'un extra guardado antes, sin marca, sigue contando para el distribuidor')

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)
process.exit(mal ? 1 : 0)
