/**
 * El IVA de una cotización es el del DISTRIBUIDOR de esa cotización, no el de
 * quien la escribe. Caso real: DICOMA es LATAM y le salía el 13 % de Costa
 * Rica porque lo estaba cotizando una cuenta de Costa Rica.
 *
 *   npm run probar-iva
 */
import { ivaDeDistribuidor } from '../src/distribuidores'
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

console.log(mal === 0 ? '\ntodo correcto' : `\n${mal} fallas`)
process.exit(mal ? 1 : 0)
