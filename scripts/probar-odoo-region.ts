/**
 * Quién puede mandar a Odoo y en qué moneda.
 *
 * A Odoo van **Costa Rica y el resto de LATAM**; México no, que cotiza de su
 * propia lista en pesos. Antes el filtro dejaba pasar solo Costa Rica, así que
 * ningún proyecto de LATAM se podía autorizar.
 *
 * Y el que rompía todo: el filtro buscaba la ficha por el NOMBRE guardado en
 * el proyecto. Ese nombre queda congelado el día que se guarda, y cuando
 * "DICOMA" se abrió en "DICOMA CR" y "DICOMA LATAM" dejó de calzar con nada,
 * así que ni los proyectos de Costa Rica pasaban. Ahora manda el id de la fila.
 *
 *   npx tsx scripts/probar-odoo-region.ts
 */
import { destinoOdoo } from '../src/odoo/region'

let mal = 0
const ok = (b: boolean, t: string) => { if (!b) mal++; console.log(`${b ? '✓' : '✕'} ${t}`) }

const cr = { distribuidorId: 1, nombre: 'DICOMA CR', region: 'Costa Rica' }
const latam = { distribuidorId: 2, nombre: 'DICOMA LATAM', region: 'LATAM' }
const mx = { distribuidorId: 3, nombre: 'Modumex México', region: 'México' }
const sinRegion = { distribuidorId: 4, nombre: 'DICOMA', region: null }

console.log('— a Odoo va Costa Rica y LATAM')
{
  const a = destinoOdoo(cr)
  ok(a.ok && a.moneda === 'CRC', 'Costa Rica pasa, en colones')
  const b = destinoOdoo(latam)
  ok(b.ok && b.moneda === 'USD', 'LATAM pasa, en dólares')
}

console.log('\n— México no, y se dice por qué')
{
  const r = destinoOdoo(mx)
  ok(!r.ok, 'México no pasa')
  ok(!r.ok && /pesos/i.test(r.mensaje), 'y el mensaje dice que cotiza de la lista de pesos')
  console.log(`   "${!r.ok ? r.mensaje : ''}"`)
}

console.log('\n— sin región no se manda, y el mensaje dice dónde arreglarlo')
{
  const r = destinoOdoo(sinRegion)
  ok(!r.ok, 'sin región no pasa')
  ok(!r.ok && /Distribuidores/.test(r.mensaje), 'y manda a la pantalla de Distribuidores')
  console.log(`   "${!r.ok ? r.mensaje : ''}"`)

  const sinFicha = destinoOdoo(undefined, 'DICOMA')
  ok(!sinFicha.ok && sinFicha.mensaje.includes('DICOMA'),
    'si no hay ficha, al menos se nombra al distribuidor guardado')
}

console.log('\n— el caso que rompía: el nombre guardado no calza con la ficha')
{
  // el proyecto se guardó cuando el distribuidor se llamaba "DICOMA" a secas
  const fichas = [cr, latam]
  const guardado = { distribuidor: 'DICOMA', distribuidorId: 1 }

  const porNombre = fichas.find((d) => d.nombre === guardado.distribuidor)
  ok(porNombre === undefined, 'buscar por nombre no encuentra la ficha (era el error)')
  ok(!destinoOdoo(porNombre, guardado.distribuidor).ok, 'y por eso ni Costa Rica pasaba')

  const porId = fichas.find((d) => Number(d.distribuidorId) === Number(guardado.distribuidorId))
  const r = destinoOdoo(porId, guardado.distribuidor)
  ok(r.ok && r.moneda === 'CRC', 'buscando por id sí encuentra: Costa Rica en colones')

  const guardadoLatam = { distribuidor: 'DICOMA', distribuidorId: 2 }
  const r2 = destinoOdoo(
    fichas.find((d) => Number(d.distribuidorId) === Number(guardadoLatam.distribuidorId)),
    guardadoLatam.distribuidor,
  )
  ok(r2.ok && r2.moneda === 'USD', 'y el mismo nombre con otro id sale como LATAM, en dólares')
}

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
