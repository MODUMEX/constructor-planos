export type Linea = 'LEEDER' | 'SUPERIOR' | 'TOUCHLESS'

/** los tres acabados del catálogo; solo Superior 2.0 usa los dos últimos */
export type Acabado =
  | 'Laminado Compacto'
  | 'Esmaltada Antigrafiti'
  | 'Acero Inoxidable'
  // los dos de la lista de México: como el antigrafiti y el inoxidable, el
  // acabado ES el color, no hay lista aparte que elegir
  | 'Fórmica'
  | 'Arte'

/**
 * Acabado del juego de herrajes. Va en juego completo: negro es todo negro,
 * no se elige pieza por pieza.
 */
export type HerrajeAcabado = 'INOX' | 'NEGRO'

/** tier del color, que es lo que define su tarifa */
/**
 * El tier del color, que es lo que decide con qué $/m² se cobra.
 *
 * Costa Rica usa `linea` y `especial`; México parte el laminado compacto en
 * Grupo 1 (`linea`) y Grupo 2, y además tiene Fórmica y Arte. `aceroInox` y
 * `antigrafiti` son de la línea Superior 2.0 en los dos países.
 */
export type TierColor =
  | 'linea'
  | 'grupo2'
  | 'especial'
  | 'formica'
  | 'arte'
  | 'antigrafiti'
  | 'aceroInox'

export type Moneda = 'USD' | 'CRC' | 'MXN'

/**
 * País donde se fabrica. Manda sobre la lista de colores: Costa Rica trabaja
 * con los diez del catálogo y México con la lista de materia prima de la
 * planta, que va con código.
 */
export type Pais = 'CR' | 'MX'

export type Montaje = 'PISO_HEADRAIL' | 'PISO' | 'PISO_TECHO'

/**
 * Qué hay en cada cabina. 'vacia' es un hueco de la tira sin sanitario: se
 * fabrica igual —lleva sus paneles y su puerta— pero es la única que no lleva
 * sanitario dibujado. El tipo manda el dibujo: inodoro, regadera u orinal.
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
  /**
   * El ancho PEDIDO para un espacio libre —un lugar sin puerta—, en cm.
   *
   * Sin este dato el hueco se lleva todo lo que sobre del claro, que es lo
   * razonable cuando nadie lo midió. Pero el hueco casi siempre viene del plano
   * del arquitecto —una columna, un lavamanos, un paso— y entonces la medida la
   * pone el vendedor: acá queda clavada y son las PILASTRAS las que se
   * reacomodan para cerrar el claro, como en cualquier otra tira.
   */
  libreCm?: number
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
  /**
   * Posiciones de pilastra que el CLIENTE ya eligió a mano. Se respetan tal
   * cual en cada nueva modulación: solo se reacomodan las que no tocó. Así
   * puede armar 30 · 40 · 50 y no tres iguales.
   */
  pilastrasFijas?: number[]
}

export type TipologiaId =
  | 'RECTA_ENTRE_MUROS'
  | 'RECTA_MURO_IZQ'
  | 'RECTA_MURO_DER'
  | 'ISLA'
  | 'PMR'
  | 'ORINALES'
  | 'ORINALES_ENTRE_MUROS'

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
   * La medida de puerta que pidió el cliente, en cm. No se captura en un campo
   * aparte: queda pedida cuando se elige una medida en el menú del plano. La
   * modulación gira en torno a ella: si está puesta, las puertas NO se tocan y
   * lo único que el buscador mueve son las pilastras.
   */
  puertaCm?: number
  /**
   * La medida pedida para la puerta de la cabina accesible, aparte de la de las
   * cabinas normales. Se guarda al elegirla en el menú del plano y sale de las
   * que la ficha marca como accesibles: 85, 90 y 100 cm.
   */
  puertaAccesibleCm?: number
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
  /**
   * El ancho pedido para CADA orinal, en orden y en cm. No tienen que medir
   * todos lo mismo: el cliente decide la medida de cada uno, igual que con las
   * pilastras. Los que queden vacíos salen del ancho general de arriba.
   *
   * En cuanto uno lleva medida pedida, los orinales dejan de ensancharse para
   * cerrar el claro: eso lo resuelven las pilastras.
   */
  anchosOrinalCm?: (number | null)[]
  mgAlturaCm: number
  /** ancho de la mampara de mingitorio; la ficha da 45 y 60, y los viejos van con 60 */
  mgAnchoCm?: number
  /**
   * La medida de CADA mampara, en orden, como "45x120". Lo que se cotiza y se
   * fabrica de un campo de orinales son las mamparas, no el hueco entre ellas:
   * por eso se eligen una por una y el ancho del orinal se deja en paz.
   *
   * La que quede vacía toma `mgAnchoCm` × `mgAlturaCm`, que siguen siendo la
   * medida general del área. Cuántas hay depende del layout: entre muros son
   * una menos que los orinales, y cerrando con mampara son una por orinal.
   */
  mamparasMG?: (string | null)[]

  // ---------- cuarto PMR ----------
  // El cuarto accesible no es una cabina más ancha: es un CUARTO, y se modula
  // en las dos direcciones. A lo ancho ocupa su propia medida sobre el claro;
  // a lo hondo llega hasta el fondo del lugar, no hasta el fondo de la cabina.
  // El divisor que lo separa de las cabinas es una tira modulada a lo largo de
  // esa profundidad: panel, la puerta del cuarto y el frente.

  /**
   * La profundidad del LUGAR, no la de la cabina. Es la pared contra la que
   * corre el divisor del cuarto. Los proyectos viejos no la traen: ahí se
   * arranca con la profundidad de cabina y el vendedor la corrige.
   */
  profundidadLugarCm?: number
  /** ancho del cuarto PMR; el Constructor viejo arranca en 162, entre 150 y 300 */
  anchoPmrCuartoCm?: number
  /** ancho del panel del divisor del cuarto; el resto de la profundidad es puerta y frente */
  anchoPanelDivisorPmrCm?: number
  /** cómo cierra el cuarto del lado opuesto al muro: con muro (P+) o con panel (PP) */
  cierrePmr?: 'muros' | 'panel'
  // ---------- lo que se pidió en el paso de medidas ----------
  // Van en la configuración porque son POR ÁREA: un proyecto tiene varias y
  // casi nunca miden lo mismo. Antes vivían en un estado suelto del paso 6, así
  // que al cambiar de área seguían los números de la anterior.

  /** el claro que dio el vendedor para esta área, en cm */
  claroPedidoCm?: number
  /** cuántas cabinas pidió para esta área */
  cabinasPedidas?: number
  tipologia: TipologiaId
}

export interface Area {
  id: string
  nombre: string
  piso: string
  config: Config
  tramos: Tramo[]
}

/**
 * Un descuento de la cotización. Se aplican EN CASCADA y en orden: cada uno
 * muerde lo que dejó el anterior, nunca el precio de lista. Dos del 5 % seguidos
 * no son un 10 %.
 *
 * El del distribuidor sale de su ficha y es el único que NO va en el PDF del
 * cliente: es lo que el distribuidor compra, no lo que vende.
 */
export interface Descuento {
  /** 'distribuidor' es el de la ficha; 'manual' los que se agregan a mano */
  origen: 'distribuidor' | 'manual'
  etiqueta: string
  pct: number
}

/**
 * Una pieza EXTRA de la cotización: lo que se agrega a mano y no sale de la
 * modulación. Las de familia se cobran por m² con las medidas que se le den;
 * el herraje y el grabado se cobran por unidad, de la lista de México.
 *
 * `precioUnit` es la salida para lo que no está en ninguna lista: si viene,
 * manda sobre el precio calculado.
 */
export interface Extra {
  tipo: 'puerta' | 'panel' | 'pilastra' | 'mingitorio' | 'herraje' | 'grabado'
  /** código del herraje o del grabado */
  codigo?: string
  descripcion?: string
  cantidad: number
  anchoCm?: number
  altoCm?: number
  precioUnit?: number
}

export interface Proyecto {
  numero: string
  /** piezas sueltas que se agregan a la cotización, fuera de la modulación */
  extras?: Extra[]
  /** los descuentos que se le agregaron a mano, en el orden en que se aplican */
  descuentos?: Descuento[]
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
