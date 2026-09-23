/* GENERADO desde las listas de precios de Costa Rica, LATAM y México — no editar a mano */

/**
 * Una pieza suelta con precio POR UNIDAD, no por m².
 *
 * Cada artículo trae su precio en las tres listas. Costa Rica tiene la suya
 * EN COLONES —no es el precio en dólares convertido—, así que cuando existe
 * manda esa; si el artículo no está en la lista de CR se cae al dólar por el
 * tipo de cambio.
 */
export interface ArticuloSuelto {
  codigo: string
  descripcion: string
  /** lista LATAM, en dólares; null si ese artículo no está ahí */
  usd: number | null
  /** lista de Costa Rica, en colones; null si no está */
  crc: number | null
  /** lista de México, en pesos; null si no está */
  mxn: number | null
}

/** Herrajes de las cuatro líneas: LEEDER, Superior 2.0, Touchless S3 y LUX. */
export const HERRAJES: ArticuloSuelto[] = [
  {
    "codigo": "KBDL",
    "descripcion": "KIT DE BISAGRA DERECHA LEEDER",
    "usd": 27.87,
    "crc": 14374.74,
    "mxn": 487.71
  },
  {
    "codigo": "KBDLM",
    "descripcion": "KIT DE BISAGRA DERECHA LEEDER A MURO",
    "usd": 27.87,
    "crc": 14374.74,
    "mxn": 487.71
  },
  {
    "codigo": "KBIL",
    "descripcion": "KIT DE BISAGRA IZQUIERDA LEEDER",
    "usd": 27.87,
    "crc": 14374.74,
    "mxn": 487.71
  },
  {
    "codigo": "KBILM",
    "descripcion": "KIT DE BISAGRA IZQUIERDA LEEDER A MURO",
    "usd": 27.87,
    "crc": 14374.74,
    "mxn": 487.71
  },
  {
    "codigo": "KTL",
    "descripcion": "KIT DE T LEEDER PARA PANEL 3PZ",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KTL1",
    "descripcion": "KIT DE T LEEDER PARA MIGITORIO 2PZ",
    "usd": 22.53,
    "crc": 11618.27,
    "mxn": 394.19
  },
  {
    "codigo": "KTL2",
    "descripcion": "KIT DE T LEEDER 3PZ MIGITORIO DE 60",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KTPL",
    "descripcion": "KIT DE TABLETA PLANA LEEDER 6 PZ",
    "usd": 15.41,
    "crc": 7948.32,
    "mxn": 269.68
  },
  {
    "codigo": "KCHL",
    "descripcion": "KIT DE CHAPETON PARA REFUERZO LEEDER 1 PZ",
    "usd": 7.32,
    "crc": 3773.05,
    "mxn": 128.01
  },
  {
    "codigo": "KCL",
    "descripcion": "KIT DE CERROJO LEEDER",
    "usd": 13.72,
    "crc": 7074.43,
    "mxn": 240.03
  },
  {
    "codigo": "KCLE170",
    "descripcion": "KIT DE CANALETA LEEDER DE 1.70 CON TORNILLERIA",
    "usd": 26.22,
    "crc": 13521.75,
    "mxn": 458.77
  },
  {
    "codigo": "KCLE200",
    "descripcion": "KIT DE CANALETA LEEDER DE 2.00 CON TORNILLERIA",
    "usd": 39.43,
    "crc": 20335.56,
    "mxn": 689.96
  },
  {
    "codigo": "KCTL",
    "descripcion": "KIT DE CONTRA TOPE LEEDER",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KCTLMN",
    "descripcion": "KIT DE CONTRA TOPE LEEDER A MURO NORMAL",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KCTUM",
    "descripcion": "KIT DE CONTRA TOPE UNIVERSAL A MURO",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KFLIM",
    "descripcion": "KIT DE F LEEDER A MURO 3 PZ",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KFLIN",
    "descripcion": "KIT DE F LEEDER NORMAL 3 PZ",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KGS",
    "descripcion": "KIT DE GANCHO LEEDER",
    "usd": 3.62,
    "crc": 1867.81,
    "mxn": 63.37
  },
  {
    "codigo": "KGM",
    "descripcion": "KIT DE GANCHO DE ACERO INOX. CON TOPE A MURO",
    "usd": 3.62,
    "crc": 1867.81,
    "mxn": 63.37
  },
  {
    "codigo": "KPEDL",
    "descripcion": "KIT PEDAL LEEDER",
    "usd": 6.02,
    "crc": 3105.49,
    "mxn": 105.36
  },
  {
    "codigo": "KPLE",
    "descripcion": "KIT DE PATA LEEDER",
    "usd": 18.29,
    "crc": 9432.12,
    "mxn": 320.02
  },
  {
    "codigo": "KSLL",
    "descripcion": "KIT DE SOPORTE LATERAL CON TORNILLERIA",
    "usd": 17.2,
    "crc": 8872.45,
    "mxn": 301.03
  },
  {
    "codigo": "TO0021",
    "descripcion": "TUBO ORNAMENTAL METRO LINEAL",
    "usd": 11.95,
    "crc": 6163.11,
    "mxn": 209.11
  },
  {
    "codigo": "KSREL",
    "descripcion": "KIT DE SOPORTE REFUERZO ESCUADRA LEEDER",
    "usd": 13.72,
    "crc": 7074.43,
    "mxn": 240.03
  },
  {
    "codigo": "KTU8L",
    "descripcion": "KIT DE TOPE IZQUIERDO LEEDER (EN PANZA PILASTRA)",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KTU9L",
    "descripcion": "KIT DE TOPE DERECHO LEEDER (EN PANZA PILASTRA)",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KTU5",
    "descripcion": "KIT DE TOPE UNIVERSAL DERECHO SUPERIOR A MURO",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KTU6",
    "descripcion": "KIT DE TOPE UNIVERSAL IZQUIERDO SUPERIOR A MURO",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KTA",
    "descripcion": "KIT DE TAQUETE METALICO ARMADO",
    "usd": 1.83,
    "crc": 943.01,
    "mxn": 31.99
  },
  {
    "codigo": "KUS12M",
    "descripcion": "KIT DE U A MURO LEEDER 3 PZ",
    "usd": 16.46,
    "crc": 8489.11,
    "mxn": 288.02
  },
  {
    "codigo": "KUS12N",
    "descripcion": "KIT DE U NORMAL LEEDER 3 PZ",
    "usd": 16.46,
    "crc": 8489.11,
    "mxn": 288.02
  },
  {
    "codigo": "KEML",
    "descripcion": "KIT ESCUADRA UNIVERSAL A MURO",
    "usd": 5.81,
    "crc": 2994.91,
    "mxn": 101.61
  },
  {
    "codigo": "T7",
    "descripcion": "TORNILLO ALLEN CABEZA BOTÓN ACERO 6 X 12",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "KDP",
    "descripcion": "KIT DE ABRE PUERTAS DE PIE",
    "usd": 9.74,
    "crc": 5023.54,
    "mxn": 170.44
  },
  {
    "codigo": "D19",
    "descripcion": "TOPE NEGRO",
    "usd": 0.18,
    "crc": 91.03,
    "mxn": 3.09
  },
  {
    "codigo": "KE18",
    "descripcion": "KIT DE ESPARRAGO 18 CM",
    "usd": 1.37,
    "crc": 707.68,
    "mxn": 24.01
  },
  {
    "codigo": "ZLA10",
    "descripcion": "ZOCLO LEEDER 10CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZLA12",
    "descripcion": "ZOCLO LEEDER 12CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZLA15",
    "descripcion": "ZOCLO LEEDER 15CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZLA17",
    "descripcion": "ZOCLO LEEDER 17CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZLA19",
    "descripcion": "ZOCLO LEEDER 19CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZLA24",
    "descripcion": "ZOCLO LEEDER 24CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZLA30",
    "descripcion": "ZOCLO LEEDER 30CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZLA35",
    "descripcion": "ZOCLO LEEDER 35CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZLA40",
    "descripcion": "ZOCLO LEEDER 40CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZLA45",
    "descripcion": "ZOCLO LEEDER 45CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZLA50",
    "descripcion": "ZOCLO LEEDER 50CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZLA55",
    "descripcion": "ZOCLO LEEDER 55CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZLA60",
    "descripcion": "ZOCLO LEEDER 60CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZLA70",
    "descripcion": "ZOCLO LEEDER 70 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZLA85",
    "descripcion": "ZOCLO LEEDER 85CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZLA90",
    "descripcion": "ZOCLO LEEDER 90CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZLA100",
    "descripcion": "ZOCLO LEEDER 100CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZLA120",
    "descripcion": "ZOCLO LEEDER 120CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "KU",
    "descripcion": "KIT DE U A MURO PARA LAMINAS (2 PZ)",
    "usd": 11.85,
    "crc": 6112.2,
    "mxn": 207.38
  },
  {
    "codigo": "KU1",
    "descripcion": "KIT DE U NORMAL PARA LAMINAS (2 PZ)",
    "usd": 11.85,
    "crc": 6112.2,
    "mxn": 207.38
  },
  {
    "codigo": "KU2",
    "descripcion": "KIT DE U A MURO PARA HPL (2 PZ)",
    "usd": 11.85,
    "crc": 6112.2,
    "mxn": 207.38
  },
  {
    "codigo": "KU3",
    "descripcion": "KIT DE U NORMAL PARA HPL (2 PZ)",
    "usd": 11.85,
    "crc": 6112.2,
    "mxn": 207.38
  },
  {
    "codigo": "KT",
    "descripcion": "KIT DE \"\"T\" (2 PZ)",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KFL",
    "descripcion": "KIT DE F (2 PZ)",
    "usd": 23.77,
    "crc": 12262.16,
    "mxn": 416.04
  },
  {
    "codigo": "KTU1",
    "descripcion": "KIT DE TOPE UNIVERSAL DERECHO",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KTU2",
    "descripcion": "KIT DE TOPE UNIVERSAL IZQUIERDO",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "KCE",
    "descripcion": "KIT DE CERROJO HPL 2.0",
    "usd": 13.72,
    "crc": 7074.43,
    "mxn": 240.03
  },
  {
    "codigo": "KC2.0",
    "descripcion": "KIT DE CERROJO SUPERIOR 2.0 PARA LAMINAS",
    "usd": 13.72,
    "crc": 7074.43,
    "mxn": 240.03
  },
  {
    "codigo": "KCTUA",
    "descripcion": "KIT DE CONTRA TOPE",
    "usd": 4.02,
    "crc": 2074.49,
    "mxn": 70.38
  },
  {
    "codigo": "KCTUMN",
    "descripcion": "KIT DE CONTRA TOPE UNIVERSAL A MURO NORMAL",
    "usd": 3.95,
    "crc": 2037.74,
    "mxn": 69.14
  },
  {
    "codigo": "F112",
    "descripcion": "ETIQUETA AVISO DE OCUPACIÓN (VERDE/ROJA)",
    "usd": 0.18,
    "crc": 94.4,
    "mxn": 3.2
  },
  {
    "codigo": "KTP2",
    "descripcion": "KIT DE TABLETA PLANA DOBLE PERFORACION 1 PZ",
    "usd": 3.66,
    "crc": 1886.69,
    "mxn": 64.01
  },
  {
    "codigo": "KEAR",
    "descripcion": "KIT DE ESCUADRA PLANA PARA ANGULO DE 90° PARA REFUERZO",
    "usd": 1.83,
    "crc": 943.01,
    "mxn": 31.99
  },
  {
    "codigo": "KEDP",
    "descripcion": "KIT DE ESCUADRA DOBLE PERFORACION 2 PZ.",
    "usd": 3.66,
    "crc": 1886.69,
    "mxn": 64.01
  },
  {
    "codigo": "KEM",
    "descripcion": "KIT DE ESCUADRA UNIVERSAL A MURO 2 PZ.",
    "usd": 3.13,
    "crc": 1615.29,
    "mxn": 54.8
  },
  {
    "codigo": "KEMR",
    "descripcion": "KIT DE ESCUADRA UNIVERSAL A MURO PARA REFUERZO 1 PZ.",
    "usd": 1.37,
    "crc": 707.68,
    "mxn": 24.01
  },
  {
    "codigo": "KETP",
    "descripcion": "KIT DE ESCUADRA Y TABLETA PLANA DOBLE PERFORACION",
    "usd": 3.66,
    "crc": 1886.69,
    "mxn": 64.01
  },
  {
    "codigo": "KTP",
    "descripcion": "KIT DE T PLANA 1 PZ",
    "usd": 3.66,
    "crc": 1886.69,
    "mxn": 64.01
  },
  {
    "codigo": "KG",
    "descripcion": "KIT DE GANCHO DE ACERO INOX. CON TOPE PARA LAMINAS",
    "usd": 3.62,
    "crc": 1867.81,
    "mxn": 63.37
  },
  {
    "codigo": "KCAL150",
    "descripcion": "KIT DE CANALETA ALUMINIO DE 1.50 CON TORNILLERIA",
    "usd": 27.43,
    "crc": 14148.85,
    "mxn": 480.05
  },
  {
    "codigo": "KCAL170",
    "descripcion": "KIT DE CANALETA ALUMINIO DE 1.70 CON TORNILLERIA",
    "usd": 29.26,
    "crc": 15091.86,
    "mxn": 512.05
  },
  {
    "codigo": "KCAL180",
    "descripcion": "KIT DE CANALETA ALUMINIO DE 1.80 CON TORNILLERIA",
    "usd": 29.26,
    "crc": 15091.86,
    "mxn": 512.05
  },
  {
    "codigo": "KCAL200",
    "descripcion": "KIT DE CANALETA ALUMINIO DE 2.00 CON TORNILLERIA",
    "usd": 32,
    "crc": 16506.21,
    "mxn": 560.03
  },
  {
    "codigo": "1185-580",
    "descripcion": "REFUERZO SUPERIOR 2.0 ALUMINIO (METRO LINEAL)",
    "usd": 13.72,
    "crc": 7074.43,
    "mxn": 240.03
  },
  {
    "codigo": "KSLE",
    "descripcion": "KIT DE SOPORTE LATERAL C/TORNILLERIA",
    "usd": 17.2,
    "crc": 8872.45,
    "mxn": 301.03
  },
  {
    "codigo": "KDP170",
    "descripcion": "KIT DE PRIVACIDAD 1.70 CON TORNILLERIA",
    "usd": 23.53,
    "crc": 12137.41,
    "mxn": 411.81
  },
  {
    "codigo": "KDP180",
    "descripcion": "KIT DE PRIVACIDAD 1.80 CON TORNILLERIA",
    "usd": 23.53,
    "crc": 12137.41,
    "mxn": 411.81
  },
  {
    "codigo": "KPE",
    "descripcion": "KIT DE PEDAL SUPERIOR E",
    "usd": 5.68,
    "crc": 2928.83,
    "mxn": 99.37
  },
  {
    "codigo": "T8",
    "descripcion": "TORNILLO ALLEN CABEZA BOTON ACERO 6 X 16",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T18",
    "descripcion": "PIJA FIJADORA A MURO 1/4 X 2\"",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T61",
    "descripcion": "TORNILLO MACHO 15/16\" (PM) TOR-PIN",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T62",
    "descripcion": "TORNILLO HEMBRA 5/8\" (PM) TOR-PIN",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T73",
    "descripcion": "PIJA BROCA ACERO INOX. 1/4 X 3/4\"",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T74",
    "descripcion": "TORNILLO TOR-PIN HEMBRA 1/2\"",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "T75",
    "descripcion": "TORNILLO TOR-PIN MACHO 1/2\"",
    "usd": 0.37,
    "crc": 188.47,
    "mxn": 6.39
  },
  {
    "codigo": "ZD10",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 10 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZD12",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 12 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZD15",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 15 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZD17",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 17 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZD19",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 19 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZD24",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 24 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZD30",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 30 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZD35",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 35 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZD40",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 40 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZD45",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 45 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZD50",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 50 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZD55",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 55 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZD60",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 60 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZD70",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 70 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZD85",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 85 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZD90",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 90 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZD100",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 100 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZD120",
    "descripcion": "ZOCLO SUPERIOR HPL 2.0 120 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZDL10",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 10 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZDL12",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 12 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZDL15",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 15 CM",
    "usd": 6.7,
    "crc": 3457.14,
    "mxn": 117.3
  },
  {
    "codigo": "ZDL17",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 17 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZDL19",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 19 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZDL24",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 24 CM",
    "usd": 9.14,
    "crc": 4716.4,
    "mxn": 160.02
  },
  {
    "codigo": "ZDL30",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 30 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZDL35",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 35 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZDL40",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 40 CM",
    "usd": 10.36,
    "crc": 5344.84,
    "mxn": 181.34
  },
  {
    "codigo": "ZDL45",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 45 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZDL50",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 50 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZDL55",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 55 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZDL60",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 60 CM",
    "usd": 11.58,
    "crc": 5973.29,
    "mxn": 202.67
  },
  {
    "codigo": "ZDL70",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 70 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZDL85",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 85 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZDL90",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 90 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZDL100",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 100 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "ZDL120",
    "descripcion": "ZOCLO SUPERIOR LAMINAS 2.0 120 CM",
    "usd": 15.24,
    "crc": 7859.99,
    "mxn": 266.68
  },
  {
    "codigo": "KACE-S3",
    "descripcion": "ARNES DE CERRADURA S3",
    "usd": 5.72,
    "crc": 2952.38,
    "mxn": null
  },
  {
    "codigo": "KAPL-S3",
    "descripcion": "ARNES DE PILASTRA S3",
    "usd": 11.68,
    "crc": 6025.01,
    "mxn": null
  },
  {
    "codigo": "ARNEST-S1/S2",
    "descripcion": "ARNES TIPO T 120 CM DERIVACIÓN",
    "usd": 30.11,
    "crc": 15531.16,
    "mxn": null
  },
  {
    "codigo": "KLED-S3",
    "descripcion": "KIT DE LED COB 5050 S3",
    "usd": 16.95,
    "crc": 8741.31,
    "mxn": null
  },
  {
    "codigo": "PCB-S3",
    "descripcion": "TARJETA PCB RELEVADOR S3",
    "usd": 30.37,
    "crc": 15663.79,
    "mxn": null
  },
  {
    "codigo": "KFP-S3",
    "descripcion": "FUENTE PODER 12V - 150 WATS",
    "usd": 72.24,
    "crc": 37261.52,
    "mxn": null
  },
  {
    "codigo": "1X1/16-100",
    "descripcion": "SOLERA 1 X 1/16 A 100 CM",
    "usd": 3.01,
    "crc": 1551.79,
    "mxn": null
  },
  {
    "codigo": "ACRS3",
    "descripcion": "ACRILICO SOLERA SENSOR",
    "usd": 0.02,
    "crc": 10.61,
    "mxn": null
  },
  {
    "codigo": "CANALETA PVC 20X20",
    "descripcion": "CANALETA PLASTICA 20X20 C/RETENEDOR DE CABLES 2MTS",
    "usd": 8.01,
    "crc": 4133.68,
    "mxn": null
  },
  {
    "codigo": "F03",
    "descripcion": "ETIQUETA PARA PUERTA 4 X 6 CM PARA TOUCH-LESS S3",
    "usd": 0.91,
    "crc": 470.4,
    "mxn": null
  },
  {
    "codigo": "F133",
    "descripcion": "ETIQUETA LATEX-VINIL 8X11 USO TOUCHLESS",
    "usd": 0.87,
    "crc": 447.41,
    "mxn": null
  },
  {
    "codigo": "NOBREAK",
    "descripcion": "NOBREAK P/ TOUCHLESS",
    "usd": 109.71,
    "crc": 56589.47,
    "mxn": 1825
  },
  {
    "codigo": "CERRADURA-S1",
    "descripcion": "CERRADURA MAGNETICA STARDAR",
    "usd": 61.92,
    "crc": 31935.92,
    "mxn": null
  },
  {
    "codigo": "CERRADURA-S1/S2 EXTERIORES",
    "descripcion": "CERRADURA MAGNETICA ABATIMIENTO EXTERIOR",
    "usd": 61.92,
    "crc": 31935.92,
    "mxn": null
  },
  {
    "codigo": "PS002",
    "descripcion": "SENSOR DE MOVIEMIENTO INFRAROJO con cable",
    "usd": 32.66,
    "crc": 16844.21,
    "mxn": null
  },
  {
    "codigo": "KCT-TCHLS",
    "descripcion": "CONTRA TOPE TOUCH-LESS S1-S2",
    "usd": 2.41,
    "crc": 1244.97,
    "mxn": null
  },
  {
    "codigo": "ARNES-EXT/FUENTE",
    "descripcion": "ARNES PARA FUENTE DE PODER",
    "usd": 26.53,
    "crc": 13682.27,
    "mxn": null
  },
  {
    "codigo": "ARNES-EXT",
    "descripcion": "ARNES PARA EXTENSION",
    "usd": 21.55,
    "crc": 11116.29,
    "mxn": null
  },
  {
    "codigo": "KAPL-3.0",
    "descripcion": "KIT DE ARNES PARA PILASTRA LUX 3.0",
    "usd": null,
    "crc": null,
    "mxn": 472.5
  },
  {
    "codigo": "KAA-3.0",
    "descripcion": "KIT DE ARNES DE ALIMENTACIÓN LUX 3.0",
    "usd": null,
    "crc": null,
    "mxn": 456.3
  },
  {
    "codigo": "TL42",
    "descripcion": "ELIMINADOR 2 A X 12 V (PARA LUX 3.0)",
    "usd": null,
    "crc": null,
    "mxn": 252.17
  },
  {
    "codigo": "KCELUX-3",
    "descripcion": "KIT DE CERROJO LEDDER LUX 3RA GENERACION",
    "usd": null,
    "crc": null,
    "mxn": 240.03
  },
  {
    "codigo": "KCOLUX-3.0",
    "descripcion": "KIT DE CONTRATOPE UNIVERSAL LUX CON/PLACA VERSIÓN 3.0",
    "usd": null,
    "crc": null,
    "mxn": 350.51
  },
  {
    "codigo": "1918",
    "descripcion": "KIT REFUERZO 6.10 $1,059.30 / MT. LINEAL $182.79",
    "usd": null,
    "crc": null,
    "mxn": 1275.52
  },
  {
    "codigo": "KJL1M2",
    "descripcion": "KIT DE JALADERA LEEDER LUX",
    "usd": null,
    "crc": null,
    "mxn": 137.18
  },
  {
    "codigo": "KSL60-3.0",
    "descripcion": "KIT DE SILICÓN LED PARA PUERTA DE 60 CM O MENOR LUX 3.0",
    "usd": null,
    "crc": null,
    "mxn": 514.19
  },
  {
    "codigo": "KSL90-3.0",
    "descripcion": "KIT DE SILICÓN LED PARA PUERTA DE 90 CM O MENOR LUX 3.0",
    "usd": null,
    "crc": null,
    "mxn": 752.46
  }
]

export const GRABADOS: ArticuloSuelto[] = [
  {
    "codigo": "GL01-HPL",
    "descripcion": "Grabado láser en laminado compacto con área grabada de 100 a 299 cm2",
    "usd": 17,
    "crc": null,
    "mxn": 250
  },
  {
    "codigo": "GL02-HPL",
    "descripcion": "Grabado láser en laminado compacto con área grabada de 300 a 499 cm2",
    "usd": 20,
    "crc": null,
    "mxn": 300
  },
  {
    "codigo": "GL03-HPL",
    "descripcion": "Grabado láser en laminado compacto con área grabada de 500 a 750 cm2",
    "usd": 22,
    "crc": null,
    "mxn": 350
  },
  {
    "codigo": "GL04-HPL",
    "descripcion": "Grabado láser en laminado compacto con área grabada de 750 a 899 cm2",
    "usd": 25,
    "crc": null,
    "mxn": 400
  },
  {
    "codigo": "GL05-HPL",
    "descripcion": "Grabado láser en laminado compacto con área grabada de 900 cm2",
    "usd": 28,
    "crc": null,
    "mxn": 450
  },
  {
    "codigo": "GL01-LAMINA",
    "descripcion": "Grabado láser en láminas con área grabada de 100 a 299 cm2",
    "usd": 17,
    "crc": null,
    "mxn": 250
  },
  {
    "codigo": "GL02-LAMINA",
    "descripcion": "Grabado láser en láminas con área grabada de 300 a 499 cm2",
    "usd": 20,
    "crc": null,
    "mxn": 300
  },
  {
    "codigo": "GL03-LAMINA",
    "descripcion": "Grabado láser en láminas con área grabada de 500 a 750 cm2",
    "usd": 22,
    "crc": null,
    "mxn": 350
  },
  {
    "codigo": "GL04-LAMINA",
    "descripcion": "Grabado láser en láminas con área grabada de 750 a 899 cm2",
    "usd": 25,
    "crc": null,
    "mxn": 400
  },
  {
    "codigo": "GL05-LAMINA",
    "descripcion": "Grabado láser en láminas con área grabada de 900 cm2",
    "usd": 28,
    "crc": null,
    "mxn": 450
  },
  {
    "codigo": "GL01-HERRAJE",
    "descripcion": "Grabado láser en herrajes por pieza",
    "usd": 20,
    "crc": null,
    "mxn": 250
  }
]
