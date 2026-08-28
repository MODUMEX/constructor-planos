/**
 * Tarifas por m² de respaldo, copiadas del Constructor actual con
 * `npm run tarifas`. Se usan cuando no hay Supabase; con la nube activa
 * las de la tabla `tarifa_m2` las reemplazan al entrar.
 *
 * Estructura: modelo → juego de tarifas → familia de pieza.
 * Los juegos son `linea` y `especiales` en dólares, con sus versiones
 * `lineaCRC`/`especialesCRC` en colones; los modelos `usdOnly` cotizan
 * en dólares y usan `lineaCR` para el precio de línea en Costa Rica.
 */
import type { TablaTarifas } from '../tarifas'

export const TARIFAS_BASE: TablaTarifas = {
  "ESTANDAR": {
    "linea": {
      "puerta": 232.29,
      "panel": 195.8,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 233.88,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 112870.21,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "ESTANDAR170": {
    "linea": {
      "puerta": 232.29,
      "panel": 195.8,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 233.88,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 112870.21,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "REFORZADO": {
    "linea": {
      "puerta": 232.29,
      "panel": 304.93,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 364.21,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 175781.05,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 209957.26,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "REFORZADO170": {
    "linea": {
      "puerta": 232.29,
      "panel": 304.93,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 364.21,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 175781.05,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 209957.26,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "IMPERIAL": {
    "linea": {
      "puerta": 232.29,
      "panel": 217.56,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 259.87,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 125414.21,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 149805.89,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "REGADERAS": {
    "linea": {
      "puerta": 232.29,
      "panel": 195.8,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 233.88,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 112870.21,
      "pilastra": 157403.47,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "KIDS": {
    "linea": {
      "puerta": 246.82,
      "panel": 208.04,
      "pilastra": 273.69,
      "mingitorio": 194.37
    },
    "especiales": {
      "puerta": 294.81,
      "panel": 248.51,
      "pilastra": 326.93,
      "mingitorio": 232.16
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 112870.21,
      "pilastra": 154690.42,
      "mingitorio": 131877.05
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89
    }
  },
  "SCUDO": {
    "linea": {
      "puerta": 232.29,
      "panel": 195.81,
      "pilastra": 304.93,
      "mingitorio": 228.66,
      "antepecho": 232.29
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 233.88,
      "pilastra": 364.21,
      "mingitorio": 273.13,
      "antepecho": 277.47
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89,
      "antepecho": 133914.42
    },
    "especialesCRC": {
      "puerta": 159956.63,
      "panel": 134827.37,
      "pilastra": 184766.11,
      "mingitorio": 157449.89,
      "antepecho": 159956.63
    }
  },
  "COLGANTE": {
    "linea": {
      "puerta": 232.29,
      "panel": 195.8,
      "pilastra": 268.34,
      "mingitorio": 228.66
    },
    "especiales": {
      "puerta": 277.47,
      "panel": 233.88,
      "pilastra": 320.52,
      "mingitorio": 273.13
    },
    "lineaCRC": {
      "puerta": 133914.42,
      "panel": 112870.21,
      "pilastra": 154690.42,
      "mingitorio": 131820.32
    },
    "especialesCRC": {
      "puerta": 168374.12,
      "panel": 141923.55,
      "pilastra": 194492.55,
      "mingitorio": 165736.09
    }
  },
  "TL_S3": {
    "linea": {
      "puerta": 369.26,
      "panel": 313.14,
      "pilastra": 268.34,
      "mingitorio": 363.66
    },
    "especiales": {
      "puerta": 438.73,
      "panel": 371.69,
      "pilastra": 320.52,
      "mingitorio": 432.04
    },
    "lineaCRC": {
      "puerta": 196159.89,
      "panel": 166269.89,
      "pilastra": 157403.47,
      "mingitorio": 193173.47
    },
    "especialesCRC": {
      "puerta": 262748.32,
      "panel": 214269.26,
      "pilastra": 184766.11,
      "mingitorio": 249059.26
    }
  },
  "SUP_ESTANDAR": {
    "usdOnly": true,
    "linea": {
      "puerta": 335.34,
      "panel": 282.66,
      "pilastra": 387.35,
      "mingitorio": 330.09
    },
    "lineaCR": {
      "puerta": 368.51,
      "panel": 310.62,
      "pilastra": 425.66,
      "mingitorio": 362.73
    },
    "especiales": {
      "puerta": 388.29,
      "panel": 327.29,
      "pilastra": 448.51,
      "mingitorio": 382.44
    },
    "aceroInox": {
      "puerta": 436.98,
      "panel": 382.47,
      "pilastra": 524.12,
      "mingitorio": 424.96
    },
    "antigrafiti": {
      "puerta": 316.63,
      "panel": 263.86,
      "pilastra": 351.81,
      "mingitorio": 293.18
    }
  },
  "SUP_ESTANDAR170": {
    "usdOnly": true,
    "linea": {
      "puerta": 335.34,
      "panel": 282.66,
      "pilastra": 387.35,
      "mingitorio": 330.09
    },
    "lineaCR": {
      "puerta": 368.51,
      "panel": 310.62,
      "pilastra": 425.66,
      "mingitorio": 362.73
    },
    "especiales": {
      "puerta": 388.29,
      "panel": 327.29,
      "pilastra": 448.51,
      "mingitorio": 382.44
    },
    "aceroInox": {
      "puerta": 436.98,
      "panel": 382.47,
      "pilastra": 524.12,
      "mingitorio": 424.96
    },
    "antigrafiti": {
      "puerta": 316.63,
      "panel": 263.86,
      "pilastra": 351.81,
      "mingitorio": 293.18
    }
  },
  "SUP_REFORZADO": {
    "usdOnly": true,
    "linea": {
      "puerta": 335.34,
      "panel": 440.17,
      "pilastra": 387.35,
      "mingitorio": 330.09
    },
    "lineaCR": {
      "puerta": 368.51,
      "panel": 483.7,
      "pilastra": 425.66,
      "mingitorio": 362.73
    },
    "especiales": {
      "puerta": 388.29,
      "panel": 509.69,
      "pilastra": 448.51,
      "mingitorio": 382.44
    },
    "aceroInox": {
      "puerta": 436.98,
      "panel": 537.41,
      "pilastra": 524.12,
      "mingitorio": 424.96
    },
    "antigrafiti": {
      "puerta": 316.63,
      "panel": 366.23,
      "pilastra": 351.81,
      "mingitorio": 293.18
    }
  },
  "SUP_REFORZADO170": {
    "usdOnly": true,
    "linea": {
      "puerta": 335.34,
      "panel": 440.17,
      "pilastra": 387.35,
      "mingitorio": 330.09
    },
    "lineaCR": {
      "puerta": 368.51,
      "panel": 483.7,
      "pilastra": 425.66,
      "mingitorio": 362.73
    },
    "especiales": {
      "puerta": 388.29,
      "panel": 509.69,
      "pilastra": 448.51,
      "mingitorio": 382.44
    },
    "aceroInox": {
      "puerta": 436.98,
      "panel": 537.41,
      "pilastra": 524.12,
      "mingitorio": 424.96
    },
    "antigrafiti": {
      "puerta": 316.63,
      "panel": 366.23,
      "pilastra": 351.81,
      "mingitorio": 293.18
    }
  },
  "SUP_COLGANTE": {
    "usdOnly": true,
    "linea": {
      "puerta": 335.34,
      "panel": 282.66,
      "pilastra": 387.35,
      "mingitorio": 330.09
    },
    "lineaCR": {
      "puerta": 368.51,
      "panel": 310.62,
      "pilastra": 425.66,
      "mingitorio": 362.73
    },
    "especiales": {
      "puerta": 388.29,
      "panel": 327.29,
      "pilastra": 448.51,
      "mingitorio": 382.44
    },
    "aceroInox": {
      "puerta": 436.98,
      "panel": 382.47,
      "pilastra": 524.12,
      "mingitorio": 424.96
    },
    "antigrafiti": {
      "puerta": 316.63,
      "panel": 263.86,
      "pilastra": 351.81,
      "mingitorio": 293.18
    }
  }
}
