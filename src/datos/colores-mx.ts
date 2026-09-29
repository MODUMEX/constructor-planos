/* GENERADO por scripts/importar-colores-mx.mjs — no editar a mano */

/**
 * Un color de la lista de materia prima de la planta de México.
 *
 * De quién se compra el material, con qué código y en qué medida de lámina
 * llega NO están acá a propósito: son datos de adentro de Modumex y esto viaja
 * entero en la aplicación que usa el distribuidor. Lo único que sobrevive es el
 * `codigoBase`, porque es lo que el CSV le pasa al CIP para comprar.
 */
export interface ColorMX {
  color: string
  /** como viene en la lista: 3mm, 6mm, 9mm, 12mm o EX2 */
  espesor: string
  /** el mismo espesor en número; null en EX2, que no es un espesor simple */
  espesorMm: number | null
  /** el tronco del código de materia prima; solo se usa para el CSV del CIP */
  codigoBase: string
  /** ya no se consigue: viene de los comentarios de la hoja */
  descontinuado?: boolean
  /** apartado para un cliente o de uso restringido; el texto dice para quién */
  reservado?: string
}

export const COLORES_MX: ColorMX[] = [
  {
    "color": "PASTEL GREY",
    "espesor": "6mm",
    "espesorMm": 6,
    "codigoBase": "0074-6-1"
  },
  {
    "color": "Alumina",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2103-3-1"
  },
  {
    "color": "Alumina",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2103-9"
  },
  {
    "color": "Alumina",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2103-12"
  },
  {
    "color": "ATENAS EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "3176-12-2EX"
  },
  {
    "color": "Carbon",
    "espesor": "12mm",
    "espesorMm": 12,
    "reservado": "Exclusivo Smart Fit",
    "codigoBase": "2192-12"
  },
  {
    "color": "Champaña metalizado",
    "espesor": "3mm",
    "espesorMm": 3,
    "descontinuado": true,
    "codigoBase": "0220-3-1"
  },
  {
    "color": "Champaña metalizado",
    "espesor": "12mm",
    "espesorMm": 12,
    "descontinuado": true,
    "reservado": "apartado para \"IDEFEY\"",
    "codigoBase": "0220-12"
  },
  {
    "color": "CONCRETE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "reservado": "DISEÑO EXCLUSIVO",
    "codigoBase": "3127-12"
  },
  {
    "color": "DARK STEEL EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "2315-12"
  },
  {
    "color": "Ebano",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2110-9-1"
  },
  {
    "color": "Ebano",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2110-12-1"
  },
  {
    "color": "Fashion White",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2125-9-1"
  },
  {
    "color": "Fashion White",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2125-12"
  },
  {
    "color": "Grey Oak",
    "espesor": "12mm",
    "espesorMm": 12,
    "reservado": "Compra única",
    "codigoBase": "1829-12"
  },
  {
    "color": "Italian Walnut",
    "espesor": "12mm",
    "espesorMm": 12,
    "reservado": "Compra única",
    "codigoBase": "1513-12"
  },
  {
    "color": "ITALIAN WALNUT / CORE CAFE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "1513-12"
  },
  {
    "color": "Lapizslasulli",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "0888-3-1"
  },
  {
    "color": "Metalized brush",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2047-3"
  },
  {
    "color": "Metalized brush",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2047-12"
  },
  {
    "color": "ROBLE LINEAL / CORE CAFE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "1467-12"
  },
  {
    "color": "TIZIANO EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "3172-12"
  },
  {
    "color": "VAINILLA EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "n/a"
  },
  {
    "color": "VANILLA EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "codigoBase": "2109-12-2EX2"
  },
  {
    "color": "Blanco",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "1570-3-1"
  },
  {
    "color": "Blanco",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "1570-12-1"
  },
  {
    "color": "Blanco Antiguo",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "1572-3-1"
  },
  {
    "color": "CALCUTTA MARBLE",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "4925-12-1"
  },
  {
    "color": "CATALINA",
    "espesor": "12 mm",
    "espesorMm": 12,
    "reservado": "Exclusivo BBVA",
    "codigoBase": "13092-12-1"
  },
  {
    "color": "DESIGNER WHITE",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "D354-12-1"
  },
  {
    "color": "Frosty",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "1573-12"
  },
  {
    "color": "GRAPHITE NEBULA",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "Exclusivo FERCHEGAS",
    "codigoBase": "4623-3-1"
  },
  {
    "color": "Grey Nebula",
    "espesor": "3mm",
    "espesorMm": 3,
    "descontinuado": true,
    "codigoBase": "4622-3-1"
  },
  {
    "color": "Grey Nebula",
    "espesor": "12 mm",
    "espesorMm": 12,
    "descontinuado": true,
    "codigoBase": "4622-12"
  },
  {
    "color": "Holly Berry",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "D307-3-1"
  },
  {
    "color": "Lapiz Blue",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "D417-3-1"
  },
  {
    "color": "Natural Almond",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "D30-12-1"
  },
  {
    "color": "Negro",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "1595-3-1"
  },
  {
    "color": "Negro",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "1595-12"
  },
  {
    "color": "Plantinum",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "D315-3-1"
  },
  {
    "color": "Platinum",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "D315-12-1"
  },
  {
    "color": "Satin",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "Exclusivo Liverpool",
    "codigoBase": "4830-3"
  },
  {
    "color": "Satin",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "4830-12"
  },
  {
    "color": "Skyline Walnut",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "Especificado planet fitness",
    "codigoBase": "7964-3"
  },
  {
    "color": "Skyline Walnut",
    "espesor": "12 mm",
    "espesorMm": 12,
    "reservado": "Especificado planet fitness",
    "codigoBase": "7964-12"
  },
  {
    "color": "Walnut Heights",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "7965-3"
  },
  {
    "color": "Walnut Heights",
    "espesor": "12 mm",
    "espesorMm": 12,
    "codigoBase": "7965-12"
  },
  {
    "color": "ALUMINK 2104 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "1050-3-1"
  },
  {
    "color": "BLANCO 1571 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "1571-3-1"
  },
  {
    "color": "NEGRO 1597 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "809-3-1"
  },
  {
    "color": "ALMENDRA Estándar",
    "espesor": "12mm",
    "espesorMm": 12,
    "descontinuado": true,
    "codigoBase": "0921-12-1ST"
  },
  {
    "color": "Aluminak",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2108-9-1"
  },
  {
    "color": "ALUMINAK 2108",
    "espesor": "6mm",
    "espesorMm": 6,
    "codigoBase": "2108-6-1"
  },
  {
    "color": "Aluminak premium",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2108-3"
  },
  {
    "color": "Aluminak premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2108-12-1pr"
  },
  {
    "color": "Aluminak PREMIUM",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2108-9-1PR"
  },
  {
    "color": "BICOLOR alumina / negro grisaceo",
    "espesor": "6mm",
    "espesorMm": 6,
    "codigoBase": "8002-6-1"
  },
  {
    "color": "Black premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "1598-12-1pr"
  },
  {
    "color": "BLUE 8011 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "8011-3-1"
  },
  {
    "color": "GRAFITO NOCTURNO 8002",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "8002-3-1"
  },
  {
    "color": "GRAFITO NOCTURNO 8002",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "8002-12-1"
  },
  {
    "color": "Gris metalic ESTANDAR",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "2048-9-1st"
  },
  {
    "color": "Gris metalic ESTANDAR",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2048-12-1ST"
  },
  {
    "color": "Gris metalic Premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2048-12"
  },
  {
    "color": "Gris metalic PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2048-3"
  },
  {
    "color": "MARMOL BLANCO COLOR CORE",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "7382-12-2"
  },
  {
    "color": "Negro",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "1598-9-1ST"
  },
  {
    "color": "Negro PREMIUM",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "1598-9-1PR"
  },
  {
    "color": "NEGRO PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "1598-3-1PR"
  },
  {
    "color": "SKYLINE PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2004-3"
  },
  {
    "color": "SKYLINE STD",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2004-12"
  },
  {
    "color": "WALNUT PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "2005-3"
  },
  {
    "color": "WALNUT STD",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2005-12"
  },
  {
    "color": "WHITEC PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "codigoBase": "8801-3-1PR"
  },
  {
    "color": "Whitec Premium Quality",
    "espesor": "9mm",
    "espesorMm": 9,
    "codigoBase": "8801-9-1PR"
  },
  {
    "color": "WHITEC PREMIUM QUALITY",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "8801-12-1pr"
  },
  {
    "color": "ALUMINAV V2106 PREMIUM",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "2106-12-1PR"
  },
  {
    "color": "NEGRO 1599 PREMIUM",
    "espesor": "12mm",
    "espesorMm": 12,
    "codigoBase": "1599-12-1PR"
  }
]
