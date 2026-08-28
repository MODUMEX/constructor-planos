export type Linea = 'LEEDER' | 'SUPERIOR' | 'TOUCHLESS'

/** los tres acabados del catálogo; solo Superior 2.0 usa los dos últimos */
export type Acabado = 'Laminado Compacto' | 'Esmaltada Antigrafiti' | 'Acero Inoxidable'

/**
 * Acabado del juego de herrajes. Va en juego completo: negro es todo negro,
 * no se elige pieza por pieza.
 */
export type HerrajeAcabado = 'INOX' | 'NEGRO'

/** tier del color, que es lo que define su tarifa */
export type TierColor = 'linea' | 'antigrafiti' | 'aceroInox' | 'especial'

export type Moneda = 'USD' | 'CRC'

/**
 * País donde se fabrica. Manda sobre la lista de colores: Costa Rica trabaja
 * con los diez del catálogo y México con la lista de materia prima de la
 * planta, que va con código.
 */
export type Pais = 'CR' | 'MX'

export type Montaje = 'PISO_HEADRAIL' | 'PISO' | 'PISO_TECHO'

export type TipoCabina = 'normal' | 'accesible' | 'ambulatoria' | 'regadera' | 'orinal'

export type TipoPuerta = 'puerta' | 'cortina' | 'ninguna'

export type Apertura = 'adentro' | 'afuera'

export type Mano = 'izq' | 'der'

export interface Puerta {
  anchoCm: number
  apertura: Apertura
  mano: Mano
  tipo: TipoPuerta
}

export interface Cabina {
  id: string
  anchoCm: number
  tipo: TipoCabina
  puerta: Puerta
  inodoro: boolean
  /** panel divisor a la derecha de esta cabina */
  panel: {
    recorte: 'ninguno' | 'simple' | 'doble'
    refuerzoBarra: boolean
  }
}

export type Orientacion = 'horizontal' | 'vertical'

export interface Tramo {
  id: string
  nombre: string
  orientacion: Orientacion
  /** largo del muro disponible, en cm */
  claroCm: number
  muroInicio: boolean
  muroFin: boolean
  cabinas: Cabina[]
}

export type TipologiaId =
  | 'RECTA_ENTRE_MUROS'
  | 'RECTA_MURO_IZQ'
  | 'RECTA_MURO_DER'
  | 'ISLA'
  | 'ESQUINA_IZQ'
  | 'ESQUINA_DER'
  | 'NICHO_IZQ'
  | 'NICHO_DER'
  | 'U_TRES_MUROS'
  | 'PMR'
  | 'ORINALES'

export type Terminacion = 'ZOCLO' | 'PATAS'

export interface Config {
  linea: Linea
  modelo: string
  acabado: Acabado
  color: string
  /** código de materia prima; solo lo llevan los colores de México */
  colorCodigo?: string
  montaje: Montaje
  bisagra: string
  cerrojo: string
  /** acabado del juego completo de herrajes */
  herrajeAcabado: HerrajeAcabado
  alturaCm: number
  profundidadCm: number
  anchoAccesibleCm: number
  anchoPilastraCm: number
  /** espesor del material de PT, PN y PL, en mm: 3 en Superior, 12 en compacto */
  espesorMm: number
  terminacion: Terminacion
  kap: boolean
  orinales: number
  mgAlturaCm: number
  tipologia: TipologiaId
}

export interface Area {
  id: string
  nombre: string
  piso: string
  config: Config
  tramos: Tramo[]
}

export interface Proyecto {
  numero: string
  /** dónde se fabrica; define qué lista de colores se ofrece */
  paisFabricacion: Pais
  obra: string
  cliente: string
  ubicacion: string
  distribuidor: string
  creadoPor: string
  areas: Area[]
}

export interface RenglonBOM {
  sku: string
  descripcion: string
  tipo: string
  cantidad: number
  precioUnit: number
  /** true si el precio salió de la tabla de tarifas por m² */
  tarifaReal?: boolean
}
