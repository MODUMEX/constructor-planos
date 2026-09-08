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

/**
 * Qué hay en cada cabina. 'vacia' es un hueco de la tira sin sanitario: se
 * fabrica igual —lleva sus paneles y su puerta— pero no se le dibuja inodoro.
 * Reemplaza a 'ambulatoria', que pedía 90 cm de ancho. Un proyecto viejo
 * guardado con ese valor abre y se dibuja, pero pasa a comportarse como una
 * cabina normal: pierde ese mínimo y su rótulo en el plano.
 */
export type TipoCabina = 'normal' | 'accesible' | 'vacia' | 'regadera' | 'orinal'

/**
 * Las regaderas también llevan puerta: la cortina no es una opción del
 * catálogo. Un proyecto viejo guardado con 'cortina' se dibuja como puerta.
 */
export type TipoPuerta = 'puerta' | 'ninguna'

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
  /**
   * Ancho de cada pilastra, en orden y en cm: son `cabinas.length + 1` piezas,
   * porque la tira es PILASTRA · PUERTA · PILASTRA · PUERTA … PILASTRA.
   * Salen del catálogo (familia PI), no son un ancho libre.
   *
   * Los proyectos guardados antes de esto no la traen: quien la lea debe
   * tolerar que falte y caer en el ancho único de la configuración.
   */
  pilastras?: number[]
  /** relleno contra la pared cuando las piezas quedan cortas por 5 cm o menos */
  canaletaCm?: number
  /**
   * Cómo cerró la tira contra el claro: 'exacto', 'canaleta' (falta relleno),
   * 'sobra' (queda un hueco que la canaleta no tapa) o 'falta' (las piezas se
   * pasan). Lo pone el buscador de modulación para poder avisarlo en pantalla.
   */
  ajuste?: 'exacto' | 'canaleta' | 'sobra' | 'falta'
  /** lo mismo, explicado para el vendedor */
  mensaje?: string
  /** cuando la cabina accesible no llegó al ancho pedido, por qué */
  avisoAccesible?: string
}

export type TipologiaId =
  | 'RECTA_ENTRE_MUROS'
  | 'RECTA_MURO_IZQ'
  | 'RECTA_MURO_DER'
  | 'ISLA'
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
  /**
   * La medida de puerta que pidió el cliente, en cm. La modulación gira en
   * torno a ella: si está puesta, las puertas NO se tocan y lo único que el
   * buscador mueve son las pilastras. Sin ella, elige también la puerta.
   */
  puertaCm?: number
  anchoPilastraCm: number
  /** espesor del material de PT, PN y PL, en mm: 3 en Superior, 12 en compacto */
  espesorMm: number
  terminacion: Terminacion
  kap: boolean
  /** si el área lleva cabina accesible. Los proyectos viejos no lo traen: ahí
   *  se deduce de la tipología, que es como se decidía antes. */
  llevaAccesible?: boolean
  orinales: number
  /** ancho de cada orinal, en cm; los proyectos viejos van con 60 */
  anchoOrinalCm?: number
  mgAlturaCm: number
  /** ancho de la mampara de mingitorio; la ficha da 45 y 60, y los viejos van con 60 */
  mgAnchoCm?: number
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
