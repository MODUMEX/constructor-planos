/* GENERADO por scripts/importar-colores-mx.mjs — no editar a mano */

/** un color de la lista de materia prima de la planta de México */
export interface ColorMX {
  proveedor: string
  color: string
  /** como viene en la lista: 3mm, 6mm, 9mm, 12mm o EX2 */
  espesor: string
  /** el mismo espesor en número; null en EX2, que no es un espesor simple */
  espesorMm: number | null
  /** el tronco del código, sin el sufijo de la medida de lámina */
  codigoBase: string
  /** cada medida de lámina tiene su propio código y su propia nota */
  presentaciones: { codigo: string; medida: string; nota?: string }[]
  /** ya no se consigue: viene de los comentarios de la hoja */
  descontinuado?: boolean
  /** apartado para un cliente o de uso restringido; el texto dice para quién */
  reservado?: string
}

export const COLORES_MX: ColorMX[] = [
  {
    "proveedor": "Fundermax",
    "color": "PASTEL GREY",
    "espesor": "6mm",
    "espesorMm": 6,
    "presentaciones": [
      {
        "codigo": "0074-6-1",
        "medida": "4.10x 1.85"
      }
    ],
    "codigoBase": "0074-6-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Alumina",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2103-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2103-3-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Alumina",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2103-9",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2103-9"
  },
  {
    "proveedor": "Lamitech",
    "color": "Alumina",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2103-12",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2103-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "ATENAS EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "3176-12-2EX2",
        "medida": "4x10",
        "nota": "MARMOL"
      },
      {
        "codigo": "3176-12-2EX48",
        "medida": "4x8"
      }
    ],
    "codigoBase": "3176-12-2EX"
  },
  {
    "proveedor": "Lamitech",
    "color": "Carbon",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2192-12",
        "medida": "5x12",
        "nota": "Exclusivo Smart Fit"
      }
    ],
    "reservado": "Exclusivo Smart Fit",
    "codigoBase": "2192-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "Champaña metalizado",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "0220-3-1",
        "medida": "5x12"
      }
    ],
    "descontinuado": true,
    "codigoBase": "0220-3-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Champaña metalizado",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "0220-12",
        "medida": "5x12",
        "nota": "apartado para \"IDEFEY\""
      }
    ],
    "descontinuado": true,
    "reservado": "apartado para \"IDEFEY\"",
    "codigoBase": "0220-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "CONCRETE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "3127-12-2EX2",
        "medida": "4x10",
        "nota": "DISEÑO EXCLUSIVO"
      },
      {
        "codigo": "3127-12-3EX2",
        "medida": "4x8"
      }
    ],
    "reservado": "DISEÑO EXCLUSIVO",
    "codigoBase": "3127-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "DARK STEEL EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "2315-12-2EX2",
        "medida": "4x10"
      },
      {
        "codigo": "2315-12-3EX2",
        "medida": "4x8"
      }
    ],
    "codigoBase": "2315-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "Ebano",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2110-9-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2110-9-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Ebano",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2110-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2110-12-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Fashion White",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2125-9-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2125-9-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Fashion White",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2125-12",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2125-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "Grey Oak",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1829-12-1",
        "medida": "5x12",
        "nota": "Compra única"
      },
      {
        "codigo": "1829-12-2",
        "medida": "4x10",
        "nota": "Compra única"
      }
    ],
    "reservado": "Compra única",
    "codigoBase": "1829-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "Italian Walnut",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1513-12-1",
        "medida": "5x12",
        "nota": "Compra única"
      },
      {
        "codigo": "1513-12-2",
        "medida": "4x10",
        "nota": "Compra única"
      }
    ],
    "reservado": "Compra única",
    "codigoBase": "1513-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "ITALIAN WALNUT / CORE CAFE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "1513-12-2EX2",
        "medida": "4x10",
        "nota": "MADERA"
      },
      {
        "codigo": "1513-12-3EX2",
        "medida": "4x8"
      }
    ],
    "codigoBase": "1513-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "Lapizslasulli",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "0888-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "0888-3-1"
  },
  {
    "proveedor": "Lamitech",
    "color": "Metalized brush",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2047-3-2",
        "medida": "4x10"
      },
      {
        "codigo": "2047-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2047-3"
  },
  {
    "proveedor": "Lamitech",
    "color": "Metalized brush",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2047-12-3",
        "medida": "5x10"
      },
      {
        "codigo": "2047-12-2",
        "medida": "4x10"
      },
      {
        "codigo": "2047-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2047-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "ROBLE LINEAL / CORE CAFE EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "1467-12-2EX2",
        "medida": "4x10",
        "nota": "MADERA"
      },
      {
        "codigo": "1467-12-3EX2",
        "medida": "4x8"
      }
    ],
    "codigoBase": "1467-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "TIZIANO EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "3172-12-2EX2",
        "medida": "4x10",
        "nota": "MARMOL"
      },
      {
        "codigo": "3172-12-3EX2",
        "medida": "4x8"
      }
    ],
    "codigoBase": "3172-12"
  },
  {
    "proveedor": "Lamitech",
    "color": "VAINILLA EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "n/a",
        "medida": "4x8"
      }
    ],
    "codigoBase": "n/a"
  },
  {
    "proveedor": "Lamitech",
    "color": "VANILLA EX2",
    "espesor": "EX2",
    "espesorMm": null,
    "presentaciones": [
      {
        "codigo": "2109-12-2EX2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2109-12-2EX2"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Blanco",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1570-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1570-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Blanco",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1570-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1570-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Blanco Antiguo",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1572-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1572-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "CALCUTTA MARBLE",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "4925-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "4925-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "CATALINA",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "13092-12-1",
        "medida": "5x12",
        "nota": "Exclusivo BBVA"
      }
    ],
    "reservado": "Exclusivo BBVA",
    "codigoBase": "13092-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "DESIGNER WHITE",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "D354-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D354-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Frosty",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1573-12",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1573-12"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "GRAPHITE NEBULA",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "4623-3-1",
        "medida": "5x12",
        "nota": "Exclusivo FERCHEGAS"
      }
    ],
    "reservado": "Exclusivo FERCHEGAS",
    "codigoBase": "4623-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Grey Nebula",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "4622-3-1",
        "medida": "5x12"
      }
    ],
    "descontinuado": true,
    "codigoBase": "4622-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Grey Nebula",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "4622-12",
        "medida": "5x12"
      }
    ],
    "descontinuado": true,
    "codigoBase": "4622-12"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Holly Berry",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "D307-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D307-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Lapiz Blue",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "D417-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D417-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Natural Almond",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "D30-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D30-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Negro",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1595-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1595-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Negro",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1595-12",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1595-12"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Plantinum",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "D315-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D315-3-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Platinum",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "D315-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "D315-12-1"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Satin",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "4830-3-1",
        "medida": "5x12",
        "nota": "Exclusivo Liverpool"
      },
      {
        "codigo": "4830-3-2",
        "medida": "4x10",
        "nota": "Exclusivo Liverpool"
      }
    ],
    "reservado": "Exclusivo Liverpool",
    "codigoBase": "4830-3"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Satin",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "4830-12-2",
        "medida": "4x10"
      },
      {
        "codigo": "4830-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "4830-12"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Skyline Walnut",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "7964-3-1",
        "medida": "5x12",
        "nota": "Especificado planet fitness"
      },
      {
        "codigo": "7964-3-2",
        "medida": "4x10",
        "nota": "Especificado planet fitness"
      },
      {
        "codigo": "7964-3-3",
        "medida": "4x8"
      }
    ],
    "reservado": "Especificado planet fitness",
    "codigoBase": "7964-3"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Skyline Walnut",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "7964-12-1",
        "medida": "5x12",
        "nota": "Especificado planet fitness"
      },
      {
        "codigo": "7964-12-2",
        "medida": "4x10",
        "nota": "Especificado planet fitness"
      }
    ],
    "reservado": "Especificado planet fitness",
    "codigoBase": "7964-12"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Walnut Heights",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "7965-3-1",
        "medida": "5x12"
      },
      {
        "codigo": "7965-3-2",
        "medida": "4x10"
      },
      {
        "codigo": "7965-3-3",
        "medida": "4x8"
      }
    ],
    "codigoBase": "7965-3"
  },
  {
    "proveedor": "Ralph Wilson",
    "color": "Walnut Heights",
    "espesor": "12 mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "7965-12-1",
        "medida": "5x12"
      },
      {
        "codigo": "7965-12-2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "7965-12"
  },
  {
    "proveedor": "SUN +",
    "color": "ALUMINK 2104 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1050-3-1",
        "medida": "5x12",
        "nota": "No utilizar, solo con autorizacion"
      }
    ],
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "1050-3-1"
  },
  {
    "proveedor": "SUN +",
    "color": "BLANCO 1571 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1571-3-1",
        "medida": "5x12",
        "nota": "No utilizar, solo con autorizacion"
      }
    ],
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "1571-3-1"
  },
  {
    "proveedor": "SUN +",
    "color": "NEGRO 1597 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "809-3-1",
        "medida": "5x12",
        "nota": "No utilizar, solo con autorizacion"
      }
    ],
    "reservado": "No utilizar, solo con autorizacion",
    "codigoBase": "809-3-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "ALMENDRA Estándar",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "0921-12-1ST",
        "medida": "5x12"
      }
    ],
    "descontinuado": true,
    "codigoBase": "0921-12-1ST"
  },
  {
    "proveedor": "Tianrun",
    "color": "Aluminak",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2108-9-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2108-9-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "ALUMINAK 2108",
    "espesor": "6mm",
    "espesorMm": 6,
    "presentaciones": [
      {
        "codigo": "2108-6-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2108-6-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "Aluminak premium",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2108-3-1PR",
        "medida": "5x12"
      },
      {
        "codigo": "2108-3-3PR",
        "medida": "4x8",
        "nota": "DOORMEX"
      }
    ],
    "codigoBase": "2108-3"
  },
  {
    "proveedor": "Tianrun",
    "color": "Aluminak premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2108-12-1pr",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2108-12-1pr"
  },
  {
    "proveedor": "Tianrun",
    "color": "Aluminak PREMIUM",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2108-9-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2108-9-1PR"
  },
  {
    "proveedor": "Tianrun",
    "color": "BICOLOR alumina / negro grisaceo",
    "espesor": "6mm",
    "espesorMm": 6,
    "presentaciones": [
      {
        "codigo": "8002-6-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8002-6-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "Black premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1598-12-1pr",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1598-12-1pr"
  },
  {
    "proveedor": "Tianrun",
    "color": "BLUE 8011 PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "8011-3-1",
        "medida": "5x12",
        "nota": "color nuevo Tianrun"
      }
    ],
    "codigoBase": "8011-3-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "GRAFITO NOCTURNO 8002",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "8002-3-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8002-3-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "GRAFITO NOCTURNO 8002",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "8002-12-1",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8002-12-1"
  },
  {
    "proveedor": "Tianrun",
    "color": "Gris metalic ESTANDAR",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "2048-9-1st",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2048-9-1st"
  },
  {
    "proveedor": "Tianrun",
    "color": "Gris metalic ESTANDAR",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2048-12-1ST",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2048-12-1ST"
  },
  {
    "proveedor": "Tianrun",
    "color": "Gris metalic Premium",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2048-12-1pr",
        "medida": "5x12"
      },
      {
        "codigo": "2048-12-2pr",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2048-12"
  },
  {
    "proveedor": "Tianrun",
    "color": "Gris metalic PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2048-3-1PR",
        "medida": "5x12"
      },
      {
        "codigo": "2048-3-2PR",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2048-3"
  },
  {
    "proveedor": "Tianrun",
    "color": "MARMOL BLANCO COLOR CORE",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "7382-12-2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "7382-12-2"
  },
  {
    "proveedor": "Tianrun",
    "color": "Negro",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "1598-9-1ST",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1598-9-1ST"
  },
  {
    "proveedor": "Tianrun",
    "color": "Negro PREMIUM",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "1598-9-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1598-9-1PR"
  },
  {
    "proveedor": "Tianrun",
    "color": "NEGRO PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "1598-3-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1598-3-1PR"
  },
  {
    "proveedor": "Tianrun",
    "color": "SKYLINE PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2004-3-1",
        "medida": "5x12"
      },
      {
        "codigo": "2004-3-2",
        "medida": "4x10"
      },
      {
        "codigo": "2004-3-3",
        "medida": "4x8",
        "nota": "DOORMEX"
      }
    ],
    "codigoBase": "2004-3"
  },
  {
    "proveedor": "Tianrun",
    "color": "SKYLINE STD",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2004-12-1",
        "medida": "5x12"
      },
      {
        "codigo": "2004-12-2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2004-12"
  },
  {
    "proveedor": "Tianrun",
    "color": "WALNUT PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "2005-3-1",
        "medida": "5x12"
      },
      {
        "codigo": "2005-3-2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2005-3"
  },
  {
    "proveedor": "Tianrun",
    "color": "WALNUT STD",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2005-12-1",
        "medida": "5x12"
      },
      {
        "codigo": "2005-12-2",
        "medida": "4x10"
      }
    ],
    "codigoBase": "2005-12"
  },
  {
    "proveedor": "Tianrun",
    "color": "WHITEC PREMIUM",
    "espesor": "3mm",
    "espesorMm": 3,
    "presentaciones": [
      {
        "codigo": "8801-3-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8801-3-1PR"
  },
  {
    "proveedor": "Tianrun",
    "color": "Whitec Premium Quality",
    "espesor": "9mm",
    "espesorMm": 9,
    "presentaciones": [
      {
        "codigo": "8801-9-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8801-9-1PR"
  },
  {
    "proveedor": "Tianrun",
    "color": "WHITEC PREMIUM QUALITY",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "8801-12-1pr",
        "medida": "5x12"
      }
    ],
    "codigoBase": "8801-12-1pr"
  },
  {
    "proveedor": "Virgo",
    "color": "ALUMINAV V2106 PREMIUM",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "2106-12-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "2106-12-1PR"
  },
  {
    "proveedor": "Virgo",
    "color": "NEGRO 1599 PREMIUM",
    "espesor": "12mm",
    "espesorMm": 12,
    "presentaciones": [
      {
        "codigo": "1599-12-1PR",
        "medida": "5x12"
      }
    ],
    "codigoBase": "1599-12-1PR"
  }
]
