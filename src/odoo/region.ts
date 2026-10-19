import type { Moneda } from '../types'

/**
 * Si un proyecto puede irse a Odoo, y en qué moneda.
 *
 * A Odoo van **Costa Rica y el resto de LATAM**. México no: cotiza de su
 * propia lista, en pesos, por otro camino. Y sin región en la ficha no se
 * manda nada, porque de la región sale la moneda.
 *
 * Vive en su propio archivo, aparte del que habla con Odoo, por dos razones:
 * se puede probar sin levantar Vite —`enviar.ts` lee `import.meta.env`— y el
 * filtro que decide si una cotización sale o no es de las cosas que no pueden
 * romperse sin que nadie se entere.
 */
export function destinoOdoo(
  ficha: { nombre?: string; region?: string | null } | undefined | null,
  nombreGuardado?: string | null,
): { ok: true; moneda: Moneda } | { ok: false; mensaje: string } {
  const region = ficha?.region ?? null
  const quien = ficha?.nombre || nombreGuardado || 'sin distribuidor'
  if (region === 'Costa Rica') return { ok: true, moneda: 'CRC' }
  if (region === 'LATAM') return { ok: true, moneda: 'USD' }
  if (region === 'México') {
    return { ok: false, mensaje: `A Odoo no va México. "${quien}" cotiza de la lista de pesos.` }
  }
  return {
    ok: false,
    mensaje: `"${quien}" no tiene región en su ficha, y de la región sale a qué moneda se cotiza. ` +
      'Ponésela en Distribuidores y volvé a intentar.',
  }
}
