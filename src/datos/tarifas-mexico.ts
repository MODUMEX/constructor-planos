/* GENERADO desde "LISTA DE PRECIOS MÉXICO.xlsx" — no editar a mano */

import type { JuegoTarifas } from '../tarifas'

/**
 * Las tarifas de México, en pesos, como RESPALDO de la app.
 *
 * Es la misma tabla que carga `Supabase/27_tarifas_mexico.sql`: acá está para
 * que la app sepa cotizar antes de que lleguen las de la nube, igual que
 * `tarifas-base.ts` hace con Costa Rica. Lo que se edite en la pantalla
 * Precios pisa esto.
 *
 * Los juegos llevan el sufijo MXN para no pisar los de dólares. "linea" es el
 * Grupo 1 de la lista; los pares mayor/menor son el corte de 10 módulos.
 */
export const TARIFAS_MXN: Record<string, Record<string, JuegoTarifas>> =  {
  "COLGANTE": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 6564.56
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 7135.39
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 7841.08
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 8712.32
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 7928.21
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 8809.12
    }
  },
  "ESTANDAR": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 6564.56
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 7135.39
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 7841.08
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 8712.32
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 7928.21
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 8809.12
    },
    "arteMXN": {
      "puerta": 8339.47,
      "pilastra": 9632.78
    }
  },
  "ESTANDAR170": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 6564.56
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 7135.39
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 7841.08
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 8712.32
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 7928.21
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 8809.12
    },
    "arteMXN": {
      "puerta": 8339.47,
      "pilastra": 9632.78
    }
  },
  "IMPERIAL": {
    "lineaMXN": {
      "puerta": 6385.62,
      "panel": 5382.47,
      "mingitorio": 6285.53,
      "pilastra": 7375.91
    },
    "grupo2MXN": {
      "puerta": 6940.88,
      "panel": 5850.51,
      "mingitorio": 6832.08,
      "pilastra": 8017.29
    },
    "especialesMXN": {
      "puerta": 7627.35,
      "panel": 6429.11,
      "mingitorio": 7507.79,
      "pilastra": 8810.21
    },
    "especialesMenorMXN": {
      "puerta": 8474.82,
      "panel": 7143.44,
      "mingitorio": 8341.98,
      "pilastra": 9789.12
    },
    "formicaMXN": {
      "puerta": 7712.08,
      "panel": 6500.56,
      "mingitorio": 7591.2,
      "pilastra": 8908.11
    },
    "formicaMenorMXN": {
      "puerta": 8463.72,
      "panel": 7222.84,
      "mingitorio": 8434.66,
      "pilastra": 9897.89
    },
    "arteMXN": {
      "puerta": 9370.19,
      "pilastra": 10823.35
    }
  },
  "KIDS": {
    "lineaMXN": {
      "puerta": 6058.55,
      "panel": 5106.82,
      "mingitorio": 4770.88,
      "pilastra": 6718.18
    },
    "grupo2MXN": {
      "puerta": 6563.43,
      "panel": 5532.39,
      "mingitorio": 5168.46,
      "pilastra": 7278.02
    },
    "especialesMXN": {
      "puerta": 6708.74,
      "panel": 5653.98,
      "mingitorio": 5282.05,
      "pilastra": 7437.99
    },
    "especialesMenorMXN": {
      "puerta": 7454.15,
      "panel": 6282.19,
      "mingitorio": 5868.95,
      "pilastra": 8264.43
    },
    "formicaMXN": {
      "puerta": 7292.69,
      "panel": 6147.09,
      "mingitorio": 5742.74,
      "pilastra": 8086.68
    },
    "formicaMenorMXN": {
      "puerta": 8102.99,
      "panel": 6830.11,
      "mingitorio": 6380.81,
      "pilastra": 8985.2
    },
    "arteMXN": {
      "puerta": 8860.62,
      "pilastra": 9825.34
    }
  },
  "REFORZADO": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 7459.71
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 8108.38
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 8910.29
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 9900.33
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 9009.31
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 10010.34
    },
    "arteMXN": {
      "puerta": 8339.47,
      "pilastra": 10946.32
    }
  },
  "REFORZADO170": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 7459.71
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 8108.38
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 8910.29
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 9900.33
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 9009.31
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 10010.34
    },
    "arteMXN": {
      "puerta": 8339.47,
      "pilastra": 10946.32
    }
  },
  "REGADERAS": {
    "lineaMXN": {
      "puerta": 5683.2,
      "panel": 4790.4,
      "mingitorio": 5594.12,
      "pilastra": 6564.56
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "pilastra": 7135.39
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "pilastra": 7841.08
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "pilastra": 8712.32
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "pilastra": 7928.21
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "pilastra": 8809.12
    },
    "arteMXN": {
      "puerta": 8339.47,
      "pilastra": 9632.78
    }
  },
  "SCUDO": {
    "lineaMXN": {
      "puerta": 5702.21,
      "panel": 4806.42,
      "mingitorio": 5612.82,
      "antepecho": 4806.42,
      "pilastra": 7484.65
    },
    "grupo2MXN": {
      "puerta": 6177.39,
      "panel": 5206.95,
      "mingitorio": 6080.56,
      "antepecho": 5206.95,
      "pilastra": 8108.38
    },
    "especialesMXN": {
      "puerta": 6788.34,
      "panel": 5721.91,
      "mingitorio": 6681.94,
      "antepecho": 5721.91,
      "pilastra": 8910.29
    },
    "especialesMenorMXN": {
      "puerta": 7542.59,
      "panel": 6357.66,
      "mingitorio": 7424.37,
      "antepecho": 6357.66,
      "pilastra": 9900.33
    },
    "formicaMXN": {
      "puerta": 6863.76,
      "panel": 5785.49,
      "mingitorio": 6756.17,
      "antepecho": 5785.49,
      "pilastra": 9009.31
    },
    "formicaMenorMXN": {
      "puerta": 7626.39,
      "panel": 6428.33,
      "mingitorio": 7506.85,
      "antepecho": 6428.33,
      "pilastra": 10010.34
    },
    "arteMXN": {
      "puerta": 8339.47,
      "antepecho": 7029.39,
      "pilastra": 10946.32
    }
  },
  "SUP_COLGANTE": {
    "lineaMXN": {
      "puerta": 5868.52,
      "panel": 4946.6,
      "mingitorio": 5776.53,
      "pilastra": 6778.62
    },
    "grupo2MXN": {
      "puerta": 6448.92,
      "panel": 5435.81,
      "mingitorio": 6347.84,
      "pilastra": 7449.03
    },
    "especialesMXN": {
      "puerta": 6795.12,
      "panel": 5727.66,
      "mingitorio": 6692.78,
      "pilastra": 7848.89
    },
    "especialesMenorMXN": {
      "puerta": 7550.13,
      "panel": 6364.06,
      "mingitorio": 7436.42,
      "pilastra": 8720.98
    },
    "formicaMXN": {
      "puerta": 7165.46,
      "panel": 6039.78,
      "mingitorio": 7053.15,
      "pilastra": 8276.7
    },
    "formicaMenorMXN": {
      "puerta": 7961.62,
      "panel": 6710.86,
      "mingitorio": 7836.83,
      "pilastra": 9196.33
    },
    "aceroInoxMXN": {
      "puerta": 7647.11,
      "panel": 6693.16,
      "mingitorio": 7436.85,
      "pilastra": 9172.03
    },
    "antigrafitiMXN": {
      "puerta": 5541.09,
      "panel": 4617.56,
      "mingitorio": 5130.62,
      "pilastra": 6156.76
    }
  },
  "SUP_ESTANDAR": {
    "lineaMXN": {
      "puerta": 5868.52,
      "panel": 4946.6,
      "mingitorio": 5776.53,
      "pilastra": 6778.62
    },
    "grupo2MXN": {
      "puerta": 6448.92,
      "panel": 5435.81,
      "mingitorio": 6347.84,
      "pilastra": 7449.03
    },
    "especialesMXN": {
      "puerta": 6795.12,
      "panel": 5727.66,
      "mingitorio": 6692.78,
      "pilastra": 7848.89
    },
    "especialesMenorMXN": {
      "puerta": 7550.13,
      "panel": 6364.06,
      "mingitorio": 7436.42,
      "pilastra": 8720.98
    },
    "formicaMXN": {
      "puerta": 7165.46,
      "panel": 6039.78,
      "mingitorio": 7053.15,
      "pilastra": 8276.7
    },
    "formicaMenorMXN": {
      "puerta": 7961.62,
      "panel": 6710.86,
      "mingitorio": 7836.83,
      "pilastra": 9196.33
    },
    "aceroInoxMXN": {
      "puerta": 7647.11,
      "panel": 6693.16,
      "mingitorio": 7436.85,
      "pilastra": 9172.03
    },
    "antigrafitiMXN": {
      "puerta": 5541.09,
      "panel": 4617.56,
      "mingitorio": 5130.62,
      "pilastra": 6156.76
    }
  },
  "SUP_ESTANDAR170": {
    "lineaMXN": {
      "puerta": 5868.52,
      "panel": 4946.6,
      "mingitorio": 5776.53,
      "pilastra": 6778.62
    },
    "grupo2MXN": {
      "puerta": 6448.92,
      "panel": 5435.81,
      "mingitorio": 6347.84,
      "pilastra": 7449.03
    },
    "especialesMXN": {
      "puerta": 6795.12,
      "panel": 5727.66,
      "mingitorio": 6692.78,
      "pilastra": 7848.89
    },
    "especialesMenorMXN": {
      "puerta": 7550.13,
      "panel": 6364.06,
      "mingitorio": 7436.42,
      "pilastra": 8720.98
    },
    "formicaMXN": {
      "puerta": 7165.46,
      "panel": 6039.78,
      "mingitorio": 7053.15,
      "pilastra": 8276.7
    },
    "formicaMenorMXN": {
      "puerta": 7961.62,
      "panel": 6710.86,
      "mingitorio": 7836.83,
      "pilastra": 9196.33
    },
    "aceroInoxMXN": {
      "puerta": 7647.11,
      "panel": 6693.16,
      "mingitorio": 7436.85,
      "pilastra": 9172.03
    },
    "antigrafitiMXN": {
      "puerta": 5541.09,
      "panel": 4617.56,
      "mingitorio": 5130.62,
      "pilastra": 6156.76
    }
  },
  "SUP_REFORZADO": {
    "lineaMXN": {
      "puerta": 5868.52,
      "panel": 4946.6,
      "mingitorio": 5776.53,
      "pilastra": 7702.96
    },
    "grupo2MXN": {
      "puerta": 6448.92,
      "panel": 5435.81,
      "mingitorio": 6347.84,
      "pilastra": 8464.78
    },
    "especialesMXN": {
      "puerta": 6795.12,
      "panel": 5727.66,
      "mingitorio": 6692.78,
      "pilastra": 8919.61
    },
    "especialesMenorMXN": {
      "puerta": 7550.13,
      "panel": 6364.06,
      "mingitorio": 7436.42,
      "pilastra": 9910.67
    },
    "formicaMXN": {
      "puerta": 7165.46,
      "panel": 6039.78,
      "mingitorio": 7053.15,
      "pilastra": 9405.31
    },
    "formicaMenorMXN": {
      "puerta": 7961.62,
      "panel": 6710.86,
      "mingitorio": 7836.83,
      "pilastra": 10450.34
    },
    "aceroInoxMXN": {
      "puerta": 7647.11,
      "panel": 6693.16,
      "mingitorio": 7436.85,
      "pilastra": 9404.63
    },
    "antigrafitiMXN": {
      "puerta": 5541.09,
      "panel": 4617.56,
      "mingitorio": 5130.62,
      "pilastra": 6408.97
    }
  },
  "SUP_REFORZADO170": {
    "lineaMXN": {
      "puerta": 5868.52,
      "panel": 4946.6,
      "mingitorio": 5776.53,
      "pilastra": 7702.96
    },
    "grupo2MXN": {
      "puerta": 6448.92,
      "panel": 5435.81,
      "mingitorio": 6347.84,
      "pilastra": 8464.78
    },
    "especialesMXN": {
      "puerta": 6795.12,
      "panel": 5727.66,
      "mingitorio": 6692.78,
      "pilastra": 8919.61
    },
    "especialesMenorMXN": {
      "puerta": 7550.13,
      "panel": 6364.06,
      "mingitorio": 7436.42,
      "pilastra": 9910.67
    },
    "formicaMXN": {
      "puerta": 7165.46,
      "panel": 6039.78,
      "mingitorio": 7053.15,
      "pilastra": 9405.31
    },
    "formicaMenorMXN": {
      "puerta": 7961.62,
      "panel": 6710.86,
      "mingitorio": 7836.83,
      "pilastra": 10450.34
    },
    "aceroInoxMXN": {
      "puerta": 7647.11,
      "panel": 6693.16,
      "mingitorio": 7436.85,
      "pilastra": 9404.63
    },
    "antigrafitiMXN": {
      "puerta": 5541.09,
      "panel": 4617.56,
      "mingitorio": 5130.62,
      "pilastra": 6408.97
    }
  },
  "TL_S3": {
    "lineaMXN": {
      "puerta": 6462.04,
      "panel": 5479.97,
      "mingitorio": 6364.05,
      "pilastra": 8416.2
    },
    "grupo2MXN": {
      "puerta": 7005.65,
      "panel": 5938.17,
      "mingitorio": 6899.14,
      "pilastra": 9129.74
    },
    "especialesMXN": {
      "puerta": 7677.7,
      "panel": 6504.62,
      "mingitorio": 7560.66,
      "pilastra": 10011.85
    },
    "especialesMenorMXN": {
      "puerta": 8530.77,
      "panel": 7227.35,
      "mingitorio": 8400.72,
      "pilastra": 11124.27
    },
    "formicaMXN": {
      "puerta": 7784.05,
      "panel": 6597.96,
      "mingitorio": 7665.71,
      "pilastra": 10144.16
    },
    "formicaMenorMXN": {
      "puerta": 8648.95,
      "panel": 7331.06,
      "mingitorio": 8517.44,
      "pilastra": 11271.28
    },
    "arteMXN": {
      "puerta": 9383.95,
      "pilastra": 12251.47
    }
  }
}
