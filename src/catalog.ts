import type { Acabado, HerrajeAcabado, Linea, Pais, TierColor, TipologiaId, Montaje } from './types'
import { esColorMx } from './coloresMx'

/** grueso real de la pilastra en laminado compacto, en cm (12.7 mm) */
export const GRUESO_PILASTRA = 1.27

/**
 * Espesor del material de puertas, paneles y pilastras, en milímetros.
 * Superior 2.0 va en cara de 3 mm; LEEDER y Touchless en compacto de 12 mm.
 * El CIP deduce lo mismo de la columna Linea del CSV, así que esto tiene que
 * coincidir con lo que se emite ahí.
 */
export function espesorPorLinea(linea: Linea): number {
  return linea === 'SUPERIOR' ? 3 : 12
}

/** el arrastre de paneles cae a este paso */
export const SNAP_CM = 0.5

/** ancho mínimo de una cabina normal */
export const MIN_CABINA_CM = 62

/** ancho mínimo de una cabina accesible */
export const MIN_ACCESIBLE_CM = 150

export const PAISES: { id: Pais; nombre: string; nota: string }[] = [
  { id: 'CR', nombre: 'Costa Rica', nota: 'Los colores del catálogo, en stock' },
  { id: 'MX', nombre: 'México', nota: 'La lista de materia prima de la planta, con código' },
]

export function nombrePais(id: Pais): string {
  return PAISES.find((p) => p.id === id)?.nombre ?? id
}

export const LINEAS: { id: Linea; nombre: string; nota: string }[] = [
  { id: 'LEEDER', nombre: 'LEEDER', nota: 'Laminado compacto, la línea de siempre' },
  { id: 'SUPERIOR', nombre: 'Superior 2.0', nota: 'Estructura y perfil, tres acabados' },
  { id: 'TOUCHLESS', nombre: 'Touchless S3', nota: 'Sin contacto, altura del lugar' },
]

export interface Modelo {
  /** el código con el que la tabla de tarifas conoce al modelo */
  codigo: string
  nombre: string
}

/** modelos por línea, con los códigos que usa `tarifa_m2` */
export const MODELOS: Record<Linea, Modelo[]> = {
  LEEDER: [
    { codigo: 'ESTANDAR', nombre: 'Estándar' },
    { codigo: 'ESTANDAR170', nombre: 'Estándar 170' },
    { codigo: 'REFORZADO', nombre: 'Reforzado' },
    { codigo: 'REFORZADO170', nombre: 'Reforzado 170' },
    { codigo: 'IMPERIAL', nombre: 'Imperial' },
    { codigo: 'REGADERAS', nombre: 'Regaderas' },
    { codigo: 'KIDS', nombre: 'Kids' },
    { codigo: 'SCUDO', nombre: 'Scudo' },
    { codigo: 'COLGANTE', nombre: 'Colgante' },
  ],
  SUPERIOR: [
    { codigo: 'SUP_ESTANDAR', nombre: 'Estándar' },
    { codigo: 'SUP_ESTANDAR170', nombre: 'Estándar 170' },
    { codigo: 'SUP_REFORZADO', nombre: 'Reforzado' },
    { codigo: 'SUP_REFORZADO170', nombre: 'Reforzado 170' },
    { codigo: 'SUP_COLGANTE', nombre: 'Colgante' },
  ],
  TOUCHLESS: [{ codigo: 'TL_S3', nombre: 'Touchless S3' }],
}

export function modeloDe(linea: Linea, codigo: string): Modelo {
  return MODELOS[linea].find((m) => m.codigo === codigo) ?? MODELOS[linea][0]
}

/** el nombre que va al CSV y al cajetín */
export function nombreModelo(linea: Linea, codigo: string): string {
  return modeloDe(linea, codigo).nombre
}

/** los modelos reforzados llevan la pilastra a 210 */
export function esReforzado(codigo: string): boolean {
  return codigo.includes('REFORZADO')
}

export interface AlturasModelo {
  puerta: number
  panel: number
  pilastra: number
  mingitorio: number
}

/**
 * Altura de cada pieza, en cm, según el modelo. Es la tabla alturasPorModelo
 * del Constructor actual, que sale de la ficha LEEDER M1 y del BOM.
 *
 * La pieza se FABRICA a una sola altura, igual con zoclo que con patas: la
 * resta de 6 o de 10 cm se hace en planta al optimizar el corte, así que no
 * cambia la medida que va en la OC. Por eso hay una sola columna por familia.
 *
 * Verificadas contra el cotizador: ESTANDAR y REFORZADO PT70 = 150 y PI19 = 180;
 * IMPERIAL PI = 190; KIDS PT = 130 y PI = 150. SCUDO, COLGANTE y TL_S3 son
 * estimadas y falta confirmarlas con la ficha.
 */
export const ALTURAS_POR_MODELO: Record<string, AlturasModelo> = {
  ESTANDAR: { puerta: 150, panel: 150, pilastra: 180, mingitorio: 120 },
  ESTANDAR170: { puerta: 170, panel: 170, pilastra: 180, mingitorio: 120 },
  REFORZADO: { puerta: 150, panel: 150, pilastra: 210, mingitorio: 120 },
  REFORZADO170: { puerta: 170, panel: 170, pilastra: 210, mingitorio: 120 },
  IMPERIAL: { puerta: 180, panel: 180, pilastra: 190, mingitorio: 120 },
  REGADERAS: { puerta: 180, panel: 180, pilastra: 180, mingitorio: 120 },
  SCUDO: { puerta: 200, panel: 210, pilastra: 210, mingitorio: 120 },
  KIDS: { puerta: 130, panel: 130, pilastra: 150, mingitorio: 120 },
  COLGANTE: { puerta: 180, panel: 180, pilastra: 220, mingitorio: 120 },
  SUP_ESTANDAR: { puerta: 150, panel: 150, pilastra: 180, mingitorio: 120 },
  SUP_ESTANDAR170: { puerta: 170, panel: 170, pilastra: 180, mingitorio: 120 },
  SUP_REFORZADO: { puerta: 150, panel: 150, pilastra: 210, mingitorio: 120 },
  SUP_REFORZADO170: { puerta: 170, panel: 170, pilastra: 210, mingitorio: 120 },
  TL_S3: { puerta: 180, panel: 180, pilastra: 210, mingitorio: 120 },
}

/**
 * Correcciones que un administrador guardó en la nube. Se aplican encima de la
 * tabla de fábrica al entrar, así que el plano, el CSV y la cotización usan
 * todos la misma altura sin tener que pasarla de mano en mano.
 */
let alturasCorregidas: Record<string, AlturasModelo> | null = null

export function aplicarAlturas(tabla: Record<string, AlturasModelo> | null) {
  alturasCorregidas = tabla
}

/** las alturas del modelo; si es uno viejo o desconocido, las del estándar */
export function alturasDe(modelo: string): AlturasModelo {
  const codigo = (modelo || '').toUpperCase()
  return alturasCorregidas?.[codigo] ?? ALTURAS_POR_MODELO[codigo] ?? ALTURAS_POR_MODELO.ESTANDAR
}

/**
 * Acabados por línea, igual que `acabadosDeLinea()` del Constructor actual:
 * solo Superior 2.0 ofrece esmaltada y acero.
 */
export const ACABADOS: Record<Linea, Acabado[]> = {
  LEEDER: ['Laminado Compacto'],
  SUPERIOR: ['Laminado Compacto', 'Esmaltada Antigrafiti', 'Acero Inoxidable'],
  TOUCHLESS: ['Laminado Compacto'],
}

export interface Color {
  nombre: string
  /** cómo se llamaba antes; se muestra al lado para que nadie se confunda */
  nombreViejo?: string
  tier: TierColor
  /** color aproximado, para la muestra en pantalla */
  hex: string
  /** si está, el color solo existe en esas líneas */
  lineas?: Linea[]
  /** otros nombres con los que llega el mismo color (listas viejas, códigos) */
  alias?: string[]
  /** con el que se nombran los renders de mercadeo */
  slug: string
}

/**
 * Catálogo de colores, copiado tal cual del Constructor actual
 * (CATALOGO.colores), con su nombre viejo y sus alias. Los primeros son los
 * de línea, en stock; los dos últimos son de Superior 2.0.
 *
 * NEUTRAL OAK se quitó: no se ofrece en Costa Rica. México tiene su propia
 * lista de materia prima y no se toca desde aquí.
 */
export const COLORES: Color[] = [
  { nombre: 'INOX SATÍN', nombreViejo: 'Gris Metalic', tier: 'linea', hex: '#6E6F71', alias: ['GRIS METALIZADO MT 240', 'INOX SATIN', 'MT-240'], slug: 'inox-satin' },
  { nombre: 'GRIS', nombreViejo: 'Aluminak', tier: 'linea', hex: '#A8AAB0', alias: ['ALUMINA 2103', 'ALUMINAK', 'SL-210'], slug: 'gris' },
  { nombre: 'NEGRO', nombreViejo: 'Negro Std', tier: 'linea', hex: '#1B1B1D', alias: ['NEGRO EBANO 2110', 'SL-600'], slug: 'negro' },
  { nombre: 'BLANCO', nombreViejo: 'Whitec', tier: 'linea', hex: '#F4F4F0', alias: ['FASHION WHITE', 'WHITEC', 'SL-110'], slug: 'blanco' },
  { nombre: 'ÁMBAR WOOD', nombreViejo: 'Walnut', tier: 'linea', hex: '#A9743B', alias: ['MD-310'], slug: 'ambar-wood' },
  { nombre: 'NOGAL GRAFITO', nombreViejo: 'Skyline', tier: 'linea', hex: '#514A44', alias: ['MD-380'], slug: 'nogal-grafito' },
  { nombre: 'GRAFITO NOCTURNO', tier: 'linea', hex: '#2B2E33', alias: ['SL-510'], slug: 'grafito-nocturno' },
  { nombre: 'ESMALTADA ANTIGRAFITI', tier: 'antigrafiti', hex: '#3B3B3D', lineas: ['SUPERIOR'], alias: ['ANTIGRAFITI'], slug: 'esmaltada-antigrafiti' },
  { nombre: 'ACERO INOXIDABLE', tier: 'aceroInox', hex: '#C7CACE', lineas: ['SUPERIOR'], alias: ['ACERO INOX', 'INOXIDABLE'], slug: 'acero-inoxidable' },
]

/**
 * Los herrajes van en juego completo: si el cliente pide negro, todo el juego
 * es negro. No se elige pieza por pieza.
 */
export const HERRAJE_ACABADOS: { id: HerrajeAcabado; nombre: string; nota: string }[] = [
  { id: 'INOX', nombre: 'Acero inoxidable', nota: 'El juego de siempre, en inoxidable pulido' },
  { id: 'NEGRO', nombre: 'Negro', nota: 'Todo el juego en negro: bisagra, cerrojo, escuadras, patas y gancho' },
]

export function nombreHerraje(id: HerrajeAcabado): string {
  return HERRAJE_ACABADOS.find((h) => h.id === id)?.nombre ?? id
}

/** "INOX SATÍN (Gris Metalic)", el mismo rótulo que usa el Constructor */
export function etiquetaColor(c: Color): string {
  return c.nombreViejo ? `${c.nombre} (${c.nombreViejo})` : c.nombre
}

export function etiquetaTier(tier: TierColor): string {
  return { linea: 'Línea', especial: 'Especial', aceroInox: 'Acero Inox', antigrafiti: 'Antigrafiti' }[tier]
}

/**
 * Qué colores se pueden elegir, con la misma regla que
 * `coloresParaSeleccion()` del Constructor: el acabado manda en Superior,
 * y fuera de Superior nunca aparecen esmaltada ni acero.
 */
export function coloresPara(linea: Linea, acabado: Acabado): Color[] {
  const deLaLinea = COLORES.filter((c) => !c.lineas || c.lineas.includes(linea))
  if (linea === 'SUPERIOR') {
    if (acabado === 'Acero Inoxidable') return deLaLinea.filter((c) => c.tier === 'aceroInox')
    if (acabado === 'Esmaltada Antigrafiti') return deLaLinea.filter((c) => c.tier === 'antigrafiti')
  }
  return deLaLinea.filter((c) => c.tier === 'linea')
}

/** busca el color por su nombre, por el viejo o por cualquiera de sus alias */
export function buscarColor(nombre: string): Color | undefined {
  const n = (nombre || '').trim().toUpperCase()
  if (!n) return undefined
  return COLORES.find(
    (c) =>
      c.nombre.toUpperCase() === n ||
      (c.nombreViejo ?? '').toUpperCase() === n ||
      (c.alias ?? []).some((a) => a.toUpperCase() === n),
  )
}

export function tierDeColor(nombre: string, pais: Pais = 'CR'): TierColor {
  const delCatalogo = buscarColor(nombre)
  if (delCatalogo) return delCatalogo.tier
  // los de la lista de la planta de México son todos de línea
  if (pais === 'MX' && esColorMx(nombre)) return 'linea'
  // un color que no está en ninguna lista se cotiza como especial, igual que hoy
  return 'especial'
}

export function hexDeColor(nombre: string): string {
  return buscarColor(nombre)?.hex ?? '#8b98a8'
}

/**
 * Los tres montajes. Ya no se eligen en el paso 4 —quedó solo herrajes—, pero
 * la lista se conserva porque la modulación distingue PISO_TECHO en el SKU de
 * pilastra y PISO_HEADRAIL en el renglón del riel.
 */
export const MONTAJES: { id: Montaje; nombre: string; nota: string }[] = [
  { id: 'PISO_HEADRAIL', nombre: 'Piso con riel superior', nota: 'El estándar: pilastra a piso y riel de amarre arriba' },
  { id: 'PISO', nombre: 'Anclada a piso', nota: 'Sin riel superior, pilastra reforzada' },
  { id: 'PISO_TECHO', nombre: 'Piso a techo', nota: 'Pilastra corrida de piso a cielo' },
]

export const BISAGRAS = [
  { id: 'GRAV', nombre: 'Bisagra de gravedad', nota: 'Cierra sola, la de catálogo' },
  { id: 'INOX', nombre: 'Bisagra de acero inoxidable', nota: 'Servicio pesado' },
]

export const CERROJOS = [
  { id: 'IND', nombre: 'Cerrojo con indicador', nota: 'Muestra libre / ocupado' },
  { id: 'STD', nombre: 'Cerrojo estándar', nota: 'Pasador de canto' },
]

/**
 * Medidas que EXISTEN en el catálogo, en cm. Salieron de la tabla de piezas del
 * Constructor actual, que es la que fabrica: nada que no esté aquí se puede pedir.
 *
 * Ojo: antes esta app ofrecía puertas de 65, 80 y 95 cm, que no se fabrican.
 */
export const ANCHOS_PUERTA = [55, 60, 62, 64, 70, 75, 85, 90, 92, 94, 100]

/** anchos de pilastra (familia PI) */
export const ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120]

/** anchos de panel divisor (familia PN); es la profundidad de la cabina */
export const ANCHOS_PANEL = [55, 60, 85, 90, 95, 100, 110, 120, 130, 135, 140, 150, 165, 180]

/**
 * Canaleta (familia CN): la pieza de relleno contra la pared. Solo entra cuando
 * la suma de las piezas queda CORTA, y como máximo 5 cm. Si el hueco es mayor
 * falta material; si las piezas se pasan, no cabe (la canaleta no recorta).
 */
export const ANCHOS_CANALETA = [1, 2, 3, 4, 5]
export const CANALETA_MAX_CM = 5

/**
 * Ecuación de la modulación, tal como la usa el Constructor actual: cada muro
 * RESTA 1 cm (el herraje de fijación ocupa ~1 cm) y cada puerta SUMA 1,5 cm
 * (holgura de bisagra). Lo que las piezas deben sumar no es el claro pelado.
 */
export function claroAjustado(claroCm: number, murosPilastra: number, puertas: number): number {
  return claroCm - murosPilastra + 1.5 * puertas
}

/** la medida de catálogo más cercana que no se pasa de `max` */
export function medidaQueCabe(opciones: number[], max: number): number | null {
  const posibles = opciones.filter((a) => a <= max)
  return posibles.length ? posibles[posibles.length - 1] : null
}

/** una puerta necesita este margen contra el ancho de la cabina */
export const MARGEN_PUERTA_CM = 8

export function puertasPosibles(anchoCabinaCm: number): { ancho: number; cabe: boolean }[] {
  const max = anchoCabinaCm - MARGEN_PUERTA_CM
  return ANCHOS_PUERTA.map((ancho) => ({ ancho, cabe: ancho <= max }))
}

export interface Tipologia {
  id: TipologiaId
  nombre: string
  descripcion: string
  /** cuántos tramos de pared usa */
  tramos: { orientacion: 'horizontal' | 'vertical'; muroInicio: boolean; muroFin: boolean; nombre: string }[]
  esquinaCompartida: boolean
  /** índice del tramo que recibe el claro y la cantidad de cabinas que da el vendedor */
  principal: number
  nuevo?: boolean
}

/** largo con el que arranca un tramo secundario, después se ajusta arrastrando */
export const LARGO_SECUNDARIO_CM = 200

export const TIPOLOGIAS: Tipologia[] = [
  {
    id: 'RECTA_ENTRE_MUROS',
    nombre: 'Recta entre muros',
    descripcion: 'Una tira de cabinas que cierra contra pared a los dos lados.',
    tramos: [{ orientacion: 'horizontal', muroInicio: true, muroFin: true, nombre: 'Tira' }],
    esquinaCompartida: false,
    principal: 0,
  },
  {
    id: 'RECTA_MURO_IZQ',
    nombre: 'Recta con muro izquierdo',
    descripcion: 'Arranca contra pared y termina con panel de cierre.',
    tramos: [{ orientacion: 'horizontal', muroInicio: true, muroFin: false, nombre: 'Tira' }],
    esquinaCompartida: false,
    principal: 0,
  },
  {
    id: 'RECTA_MURO_DER',
    nombre: 'Recta con muro derecho',
    descripcion: 'Cierra con panel al inicio y contra pared al final.',
    tramos: [{ orientacion: 'horizontal', muroInicio: false, muroFin: true, nombre: 'Tira' }],
    esquinaCompartida: false,
    principal: 0,
  },
  {
    id: 'ISLA',
    nombre: 'Isla',
    descripcion: 'Sin muros laterales, cierra con panel a los dos lados.',
    tramos: [{ orientacion: 'horizontal', muroInicio: false, muroFin: false, nombre: 'Tira' }],
    esquinaCompartida: false,
    principal: 0,
  },
  {
    id: 'ESQUINA_IZQ',
    nombre: 'Esquina izquierda',
    descripcion: 'Dos tiras en ángulo que comparten la pilastra de la esquina.',
    tramos: [
      { orientacion: 'horizontal', muroInicio: true, muroFin: false, nombre: 'Tira sobre el muro de fondo' },
      { orientacion: 'vertical', muroInicio: true, muroFin: false, nombre: 'Tira sobre el muro izquierdo' },
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true,
  },
  {
    id: 'ESQUINA_DER',
    nombre: 'Esquina derecha',
    descripcion: 'La misma esquina, espejada hacia la derecha.',
    tramos: [
      { orientacion: 'horizontal', muroInicio: false, muroFin: true, nombre: 'Tira sobre el muro de fondo' },
      { orientacion: 'vertical', muroInicio: true, muroFin: false, nombre: 'Tira sobre el muro derecho' },
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true,
  },
  {
    id: 'NICHO_IZQ',
    nombre: 'Nicho izquierdo',
    descripcion: 'Alcoba: la tira se mete en un receso de pared con muros a los dos lados.',
    tramos: [
      { orientacion: 'vertical', muroInicio: true, muroFin: true, nombre: 'Tira dentro del nicho' },
      { orientacion: 'horizontal', muroInicio: false, muroFin: true, nombre: 'Tira sobre el muro de fondo' },
    ],
    esquinaCompartida: true,
    principal: 1,
    nuevo: true,
  },
  {
    id: 'NICHO_DER',
    nombre: 'Nicho derecho',
    descripcion: 'El mismo nicho, espejado.',
    tramos: [
      { orientacion: 'horizontal', muroInicio: true, muroFin: false, nombre: 'Tira sobre el muro de fondo' },
      { orientacion: 'vertical', muroInicio: true, muroFin: true, nombre: 'Tira dentro del nicho' },
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true,
  },
  {
    id: 'U_TRES_MUROS',
    nombre: 'U de tres muros',
    descripcion: 'Tres tiras: fondo y los dos costados, con las dos esquinas compartidas.',
    tramos: [
      { orientacion: 'vertical', muroInicio: true, muroFin: false, nombre: 'Costado izquierdo' },
      { orientacion: 'horizontal', muroInicio: true, muroFin: true, nombre: 'Tira de fondo' },
      { orientacion: 'vertical', muroInicio: true, muroFin: false, nombre: 'Costado derecho' },
    ],
    esquinaCompartida: true,
    principal: 1,
    nuevo: true,
  },
  {
    id: 'PMR',
    nombre: 'Cuarto accesible + cabinas',
    descripcion: 'Cabina accesible profunda cerrada con panel, más cabinas normales al lado.',
    tramos: [{ orientacion: 'horizontal', muroInicio: true, muroFin: false, nombre: 'Tira' }],
    esquinaCompartida: false,
    principal: 0,
  },
  {
    id: 'ORINALES',
    nombre: 'Solo orinales',
    descripcion: 'Área de orinales con divisores, sin cabinas.',
    tramos: [{ orientacion: 'horizontal', muroInicio: true, muroFin: false, nombre: 'Tira de orinales' }],
    esquinaCompartida: false,
    principal: 0,
  },
]

export function tipologia(id: TipologiaId): Tipologia {
  return TIPOLOGIAS.find((t) => t.id === id) ?? TIPOLOGIAS[0]
}

/**
 * Tarifa por m² según el tier del color, en dólares.
 * ATENCIÓN: estos valores son de ejemplo. Las tarifas buenas viven en la tabla
 * `tarifa_m2` de Supabase (por modelo, tier, moneda y familia) y hay que
 * leerlas de ahí antes de cotizarle a un cliente.
 */
export function tarifaM2(_acabado: Acabado, color: string): number {
  switch (tierDeColor(color)) {
    case 'aceroInox':
      return 268
    case 'antigrafiti':
      return 214
    case 'especial':
      return 198
    default:
      return 158
  }
}
