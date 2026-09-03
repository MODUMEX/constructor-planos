// src/catalog.ts
function espesorPorLinea(linea) {
  return linea === "SUPERIOR" ? 3 : 12;
}
var SNAP_CM = 0.5;
var MIN_ACCESIBLE_CM = 150;
var ALTURAS_POR_MODELO = {
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
  TL_S3: { puerta: 180, panel: 180, pilastra: 210, mingitorio: 120 }
};
var alturasCorregidas = null;
function alturasDe(modelo) {
  const codigo = (modelo || "").toUpperCase();
  return alturasCorregidas?.[codigo] ?? ALTURAS_POR_MODELO[codigo] ?? ALTURAS_POR_MODELO.ESTANDAR;
}
var ANCHOS_PUERTA = [55, 60, 62, 64, 70, 75, 85, 90, 92, 94, 100];
var ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120];
var CANALETA_MAX_CM = 5;
function claroAjustado(claroCm, murosPilastra, puertas) {
  return claroCm - murosPilastra + 1.5 * puertas;
}
var MARGEN_PUERTA_CM = 8;
var LARGO_SECUNDARIO_CM = 200;
var TIPOLOGIAS = [
  {
    id: "RECTA_ENTRE_MUROS",
    nombre: "Recta entre muros",
    descripcion: "Una tira de cabinas que cierra contra pared a los dos lados.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: true, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "RECTA_MURO_IZQ",
    nombre: "Recta con muro izquierdo",
    descripcion: "Arranca contra pared y termina con panel de cierre.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "RECTA_MURO_DER",
    nombre: "Recta con muro derecho",
    descripcion: "Cierra con panel al inicio y contra pared al final.",
    tramos: [{ orientacion: "horizontal", muroInicio: false, muroFin: true, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "ISLA",
    nombre: "Isla",
    descripcion: "Sin muros laterales, cierra con panel a los dos lados.",
    tramos: [{ orientacion: "horizontal", muroInicio: false, muroFin: false, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "ESQUINA_IZQ",
    nombre: "Esquina izquierda",
    descripcion: "Dos tiras en \xE1ngulo que comparten la pilastra de la esquina.",
    tramos: [
      { orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira sobre el muro de fondo" },
      { orientacion: "vertical", muroInicio: true, muroFin: false, nombre: "Tira sobre el muro izquierdo" }
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true
  },
  {
    id: "ESQUINA_DER",
    nombre: "Esquina derecha",
    descripcion: "La misma esquina, espejada hacia la derecha.",
    tramos: [
      { orientacion: "horizontal", muroInicio: false, muroFin: true, nombre: "Tira sobre el muro de fondo" },
      { orientacion: "vertical", muroInicio: true, muroFin: false, nombre: "Tira sobre el muro derecho" }
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true
  },
  {
    id: "NICHO_IZQ",
    nombre: "Nicho izquierdo",
    descripcion: "Alcoba: la tira se mete en un receso de pared con muros a los dos lados.",
    tramos: [
      { orientacion: "vertical", muroInicio: true, muroFin: true, nombre: "Tira dentro del nicho" },
      { orientacion: "horizontal", muroInicio: false, muroFin: true, nombre: "Tira sobre el muro de fondo" }
    ],
    esquinaCompartida: true,
    principal: 1,
    nuevo: true
  },
  {
    id: "NICHO_DER",
    nombre: "Nicho derecho",
    descripcion: "El mismo nicho, espejado.",
    tramos: [
      { orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira sobre el muro de fondo" },
      { orientacion: "vertical", muroInicio: true, muroFin: true, nombre: "Tira dentro del nicho" }
    ],
    esquinaCompartida: true,
    principal: 0,
    nuevo: true
  },
  {
    id: "U_TRES_MUROS",
    nombre: "U de tres muros",
    descripcion: "Tres tiras: fondo y los dos costados, con las dos esquinas compartidas.",
    tramos: [
      { orientacion: "vertical", muroInicio: true, muroFin: false, nombre: "Costado izquierdo" },
      { orientacion: "horizontal", muroInicio: true, muroFin: true, nombre: "Tira de fondo" },
      { orientacion: "vertical", muroInicio: true, muroFin: false, nombre: "Costado derecho" }
    ],
    esquinaCompartida: true,
    principal: 1,
    nuevo: true
  },
  {
    id: "PMR",
    nombre: "Cuarto accesible + cabinas",
    descripcion: "Cabina accesible profunda cerrada con panel, m\xE1s cabinas normales al lado.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "ORINALES",
    nombre: "Solo orinales",
    descripcion: "\xC1rea de orinales con divisores, sin cabinas.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira de orinales" }],
    esquinaCompartida: false,
    principal: 0
  }
];
function tipologia(id) {
  return TIPOLOGIAS.find((t) => t.id === id) ?? TIPOLOGIAS[0];
}

// src/modulador.ts
var PILASTRAS_INTERNAS = ANCHOS_PILASTRA.filter((a) => a >= 24);
var PILASTRAS_EXTREMO = ANCHOS_PILASTRA.filter((a) => a <= 24);
var PUERTA_PREFERIDA = 60;
var PENALIZA_PUERTA = 0.05;
var PENALIZA_PASARSE = 100;
var ANCHO_ORINAL = 60;
var GRUESO_MG = 1.27;
var PUERTA_ACCESIBLE_MIN = 85;
function modularTira(o) {
  const nEst = o.puertas;
  const nAcc = o.accesible ? 1 : 0;
  const nMing = o.mingitorios ?? 0;
  const cabinas = nEst + nAcc + nMing;
  if (cabinas < 1) return null;
  const internas = Math.max(0, cabinas - 1 - Math.max(0, nMing - 1));
  const objetivo = claroAjustado(o.claroCm, o.murosPilastra, nEst + nAcc);
  const dosMuros = o.murosPilastra >= 2;
  const grosorMG = Math.max(0, nMing - 1) * GRUESO_MG;
  const fijoMG = nMing * ANCHO_ORINAL + grosorMG;
  const puertas = o.puertaFija ? [o.puertaFija] : ANCHOS_PUERTA;
  const puertasAcc = nAcc > 0 ? ANCHOS_PUERTA.filter((a) => a >= PUERTA_ACCESIBLE_MIN) : [0];
  const opInternas = internas > 0 ? o.pilInternaFija ? [o.pilInternaFija] : PILASTRAS_INTERNAS : [0];
  const opExtremos = o.pilExtremoFija ? [o.pilExtremoFija] : PILASTRAS_EXTREMO;
  let mejor = null;
  for (const acc of puertasAcc.length ? puertasAcc : [0]) {
    for (const ap of nEst > 0 ? puertas : [0]) {
      for (const api of opInternas) {
        for (const ae1 of opExtremos) {
          for (const ae2 of opExtremos) {
            const total = nEst * ap + nAcc * acc + fijoMG + internas * api + ae1 + ae2;
            const dif = objetivo - total;
            const score = Math.abs(dif) + (nEst > 0 ? Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA : 0) + (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0);
            if (!mejor || score < mejor.score) mejor = { ap, acc, api, ae1, ae2, total, score };
          }
        }
      }
    }
  }
  if (!mejor) return null;
  const diferencia = objetivo - mejor.total;
  const abs = Math.abs(diferencia);
  const tolerancia = o.extremoAbierto ? 5 : 0.5 * o.murosPilastra;
  let ajuste;
  let mensaje;
  if (abs <= tolerancia) {
    ajuste = "exacto";
    mensaje = abs > 0.5 ? `Calza; ${abs.toFixed(1)} cm los absorbe la instalaci\xF3n` : "Calza exacto";
  } else if (diferencia > 0 && abs <= CANALETA_MAX_CM) {
    ajuste = "canaleta";
    mensaje = `Calza con canaleta de ${abs.toFixed(1)} cm (rellena el hueco)`;
  } else if (diferencia > 0) {
    ajuste = "sobra";
    mensaje = `Falta material: hueco de ${abs.toFixed(1)} cm, m\xE1s de lo que rellena una canaleta`;
  } else {
    ajuste = "falta";
    mensaje = `Las piezas se pasan ${abs.toFixed(1)} cm: la canaleta rellena, no recorta. Reduce una pieza`;
  }
  const canaleta = ajuste === "canaleta" ? (() => {
    const ancho = Math.max(1, Math.min(CANALETA_MAX_CM, Math.ceil(abs)));
    return { anchoCm: ancho, codigo: `CN0${ancho}` };
  })() : null;
  let anchoOrinal = ANCHO_ORINAL;
  let ajusteFinal = ajuste;
  let mensajeFinal = mensaje;
  let canaletaFinal = canaleta;
  if (nMing > 0 && diferencia > 0.5) {
    anchoOrinal = ANCHO_ORINAL + diferencia / nMing;
    ajusteFinal = "exacto";
    mensajeFinal = `Calza; los ${abs.toFixed(1)} cm de sobra se reparten entre los ${nMing} orinales`;
    canaletaFinal = null;
  }
  const pilastras = [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2];
  return {
    anchoPuerta: mejor.ap,
    anchoPilInterna: mejor.api,
    anchoPilExtremo1: mejor.ae1,
    anchoPilExtremo2: mejor.ae2,
    pilastras,
    total: mejor.total,
    claroAjustado: objetivo,
    diferencia,
    ajuste: ajusteFinal,
    mensaje: mensajeFinal,
    canaleta: canaletaFinal,
    anchoPuertaAccesible: mejor.acc || null,
    anchoOrinal: nMing > 0 ? anchoOrinal : null
  };
}

// src/entorno.ts
var url;
var llave;
try {
  url = import.meta.env.VITE_SUPABASE_URL;
  llave = import.meta.env.VITE_SUPABASE_ANON_KEY;
} catch {
}

// src/modulacion.ts
var seq = 0;
function nuevoId(prefijo) {
  seq += 1;
  return `${prefijo}-${seq}`;
}
var GRUESO_MG_CM = 1.27;
function snap(valor) {
  return Math.round(valor / SNAP_CM) * SNAP_CM;
}
function puertaSugerida(anchoCm) {
  const max = anchoCm - MARGEN_PUERTA_CM;
  const posibles = ANCHOS_PUERTA.filter((a) => a <= max);
  return posibles.length ? posibles[posibles.length - 1] : ANCHOS_PUERTA[0];
}
function nuevaCabina(anchoCm, tipo = "normal") {
  return {
    id: nuevoId("cab"),
    anchoCm: snap(anchoCm),
    tipo,
    inodoro: true,
    puerta: {
      anchoCm: puertaSugerida(anchoCm),
      apertura: anchoCm < 135 ? "afuera" : "adentro",
      mano: "der",
      tipo: "puerta"
    },
    panel: { recorte: "ninguno", refuerzoBarra: false }
  };
}
function anchoTotal(cabinas) {
  return cabinas.reduce((s, c) => s + c.anchoCm, 0);
}
function modularConCatalogo(claroCm, cantidad, murosPilastra, extremoAbierto, fijar, extra) {
  const conAcc = extra?.accesible === true;
  const nMing = extra?.mingitorios ?? 0;
  const normales = cantidad - (conAcc ? 1 : 0) - nMing;
  if (normales < 0) return null;
  const m = modularTira({
    claroCm,
    puertas: normales,
    accesible: conAcc,
    mingitorios: nMing,
    murosPilastra,
    extremoAbierto,
    puertaFija: fijar?.puerta,
    pilInternaFija: fijar?.pilInterna,
    pilExtremoFija: fijar?.pilExtremo
  });
  if (!m) return null;
  const pilastras = [m.pilastras[0]];
  for (let i = 1; i <= cantidad - 1; i++) {
    const izqOrinal = i > cantidad - 1 - nMing;
    const derOrinal = i >= cantidad - nMing;
    pilastras.push(izqOrinal && derOrinal ? GRUESO_MG_CM : m.anchoPilInterna);
  }
  pilastras.push(m.pilastras[m.pilastras.length - 1]);
  const cabinas = [];
  for (let i = 0; i < cantidad; i++) {
    const izq = i === 0 ? pilastras[0] : pilastras[i] / 2;
    const der = i === cantidad - 1 ? pilastras[cantidad] : pilastras[i + 1] / 2;
    const esAcc = conAcc && i === 0;
    const esOrinal = i >= cantidad - nMing;
    const puerta = esAcc ? m.anchoPuertaAccesible ?? m.anchoPuerta : m.anchoPuerta;
    const cuerpo = esOrinal ? m.anchoOrinal ?? 60 : puerta;
    const c = nuevaCabina(izq + cuerpo + der, esAcc ? "accesible" : esOrinal ? "orinal" : "normal");
    if (esOrinal) c.puerta = { ...c.puerta, tipo: "ninguna" };
    else c.puerta.anchoCm = puerta;
    cabinas.push(c);
  }
  const minAcc = extra?.anchoAccesibleMinCm ?? MIN_ACCESIBLE_CM;
  if (conAcc && cabinas[0] && cabinas[0].anchoCm < minAcc) return null;
  return { cabinas, pilastras, canaletaCm: m.canaleta?.anchoCm ?? 0 };
}
function modular(claroCm, cantidad, anchoAccesibleCm = 0) {
  if (cantidad <= 0) return [];
  const conAccesible = anchoAccesibleCm > 0;
  const resto = conAccesible ? claroCm - anchoAccesibleCm : claroCm;
  const normales = conAccesible ? cantidad - 1 : cantidad;
  const cabinas = [];
  if (conAccesible) cabinas.push(nuevaCabina(anchoAccesibleCm, "accesible"));
  if (normales > 0) {
    const base = snap(resto / normales);
    for (let i = 0; i < normales; i++) cabinas.push(nuevaCabina(base));
    const sobra = snap(claroCm - anchoTotal(cabinas));
    const ultima = cabinas[cabinas.length - 1];
    ultima.anchoCm = snap(ultima.anchoCm + sobra);
    ultima.puerta.anchoCm = puertaSugerida(ultima.anchoCm);
  }
  return cabinas;
}
function orinales(cantidad) {
  return Array.from({ length: Math.max(1, cantidad) }, () => {
    const c = nuevaCabina(60, "orinal");
    c.puerta = { ...c.puerta, tipo: "ninguna" };
    return c;
  });
}
function crearTramos(tipologiaId, claroCm, cantidad, config) {
  const tipo = tipologia(tipologiaId);
  const conAccesible = tipologiaId === "PMR";
  const soloOrinales = tipologiaId === "ORINALES";
  return tipo.tramos.map((t, i) => {
    const esPrincipal = i === tipo.principal;
    const cant = esPrincipal ? cantidad : 2;
    const murosT = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0);
    const claroOrinales = cant * 60 + Math.max(0, cant - 1) * GRUESO_MG_CM + 2 * 10 + murosT;
    const claroTramo = soloOrinales ? claroOrinales : esPrincipal ? claroCm : LARGO_SECUNDARIO_CM;
    const base = {
      id: nuevoId("tramo"),
      nombre: t.nombre,
      orientacion: t.orientacion,
      claroCm: claroTramo,
      muroInicio: t.muroInicio,
      muroFin: t.muroFin
    };
    const muros = murosT;
    const conCatalogo = modularConCatalogo(claroTramo, cant, muros, muros < 2, void 0, {
      accesible: conAccesible && esPrincipal,
      mingitorios: soloOrinales ? cant : 0
    });
    if (!conCatalogo) {
      return {
        ...base,
        cabinas: soloOrinales ? orinales(cant) : modular(claroTramo, cant, conAccesible && esPrincipal ? config.anchoAccesibleCm : 0)
      };
    }
    return {
      ...base,
      cabinas: conCatalogo.cabinas,
      pilastras: conCatalogo.pilastras,
      canaletaCm: conCatalogo.canaletaCm
    };
  });
}

// src/exportar/piezas.ts
function altoPilastra(config) {
  return alturasDe(config.modelo).pilastra;
}
function subTipoPuerta(cab, contraMuro) {
  const adentro = cab.puerta.apertura === "adentro";
  const mano = adentro ? cab.puerta.mano === "der" ? "izq" : "der" : cab.puerta.mano;
  const base = mano === "der" ? "PTADER" : "PTAIZQ";
  return adentro && contraMuro ? `${base}-AM` : base;
}
function piezasDeTramo(tramo, config, area, omitirPilastraInicial = false) {
  const piezas = [];
  const n = tramo.cabinas.length;
  const alturas = alturasDe(config.modelo);
  const alto = alturas.puerta;
  const altoPanel = alturas.panel;
  const altoPil = altoPilastra(config);
  tramo.cabinas.forEach((cab, i) => {
    const contraMuro = i === 0 && tramo.muroInicio || i === n - 1 && tramo.muroFin;
    if (cab.puerta.tipo === "puerta" && cab.tipo !== "orinal") {
      piezas.push({
        familia: "PT",
        anchoCm: cab.puerta.anchoCm,
        altoCm: alto,
        subTipo: subTipoPuerta(cab, contraMuro),
        area
      });
    }
    const esUltima = i === n - 1;
    const llevaDivisor = cab.tipo === "orinal" ? tramo.cabinas[i + 1]?.tipo === "orinal" : !esUltima || !tramo.muroFin;
    if (llevaDivisor) {
      if (cab.tipo === "orinal") {
        piezas.push({
          familia: "MG",
          anchoCm: 60,
          altoCm: config.mgAlturaCm,
          subTipo: config.mgAlturaCm >= 150 ? "MG150" : "MG120",
          area
        });
      } else {
        piezas.push({
          familia: "PN",
          anchoCm: config.profundidadCm,
          altoCm: altoPanel,
          subTipo: esUltima ? "PNLAT" : "PNCEN",
          area
        });
      }
    }
  });
  if (n > 0 && !tramo.muroInicio) {
    piezas.push({ familia: "PN", anchoCm: config.profundidadCm, altoCm: altoPanel, subTipo: "PNLAT", area });
  }
  if (n > 0) {
    const anchoDe = (i) => tramo.pilastras?.[i] ?? config.anchoPilastraCm;
    if (!omitirPilastraInicial) {
      piezas.push({
        familia: "PL",
        anchoCm: anchoDe(0),
        altoCm: altoPil,
        subTipo: tramo.muroInicio ? "PLLATMUR" : "PLLAT",
        area
      });
    }
    for (let i = 0; i < n - 1; i++) {
      const entreOrinales = tramo.cabinas[i].tipo === "orinal" && tramo.cabinas[i + 1].tipo === "orinal";
      if (entreOrinales) continue;
      piezas.push({ familia: "PL", anchoCm: anchoDe(i + 1), altoCm: altoPil, subTipo: "PLCEN", area });
    }
    piezas.push({
      familia: "PL",
      anchoCm: anchoDe(n),
      altoCm: altoPil,
      subTipo: tramo.muroFin ? "PLLATMUR" : "PLLAT",
      area
    });
  }
  return piezas;
}
function piezasDeArea(area) {
  const tipo = tipologia(area.config.tipologia);
  const piezas = area.tramos.flatMap(
    (t, i) => piezasDeTramo(t, area.config, area.nombre, tipo.esquinaCompartida && i !== tipo.principal)
  );
  const soloOrinales = area.config.tipologia === "ORINALES";
  const divisores = soloOrinales ? 0 : Math.max(0, area.config.orinales - 1);
  for (let i = 0; i < divisores; i++) {
    piezas.push({
      familia: "MG",
      anchoCm: 60,
      altoCm: area.config.mgAlturaCm,
      subTipo: area.config.mgAlturaCm >= 150 ? "MG150" : "MG120",
      area: area.nombre
    });
  }
  return piezas;
}

// scripts/probar-orinales.ts
var cfg = {
  linea: "LEEDER",
  modelo: "ESTANDAR",
  acabado: "Laminado Compacto",
  color: "BLANCO",
  montaje: "PISO_HEADRAIL",
  bisagra: "GRAV",
  cerrojo: "IND",
  herrajeAcabado: "NEGRO",
  alturaCm: 150,
  profundidadCm: 150,
  anchoAccesibleCm: 150,
  anchoPilastraCm: 15,
  espesorMm: espesorPorLinea("LEEDER"),
  terminacion: "ZOCLO",
  kap: false,
  orinales: 0,
  mgAlturaCm: 120,
  tipologia: "ORINALES"
};
var fallas = 0;
for (const n of [2, 3, 4, 5]) {
  const tramos = crearTramos("ORINALES", 0, n, cfg);
  const t = tramos[0];
  const area = { id: nuevoId("area"), nombre: "Orinales", piso: "Planta baja", config: cfg, tramos };
  const piezas = piezasDeArea(area);
  const pl = piezas.filter((p) => p.familia === "PL");
  const mg = piezas.filter((p) => p.familia === "MG");
  const pn = piezas.filter((p) => p.familia === "PN");
  console.log(`${n} orinales \xB7 claro ${t.claroCm.toFixed(2)} cm \xB7 pilastras [${(t.pilastras ?? []).join(", ")}]`);
  console.log(`  cabinas: ${t.cabinas.map((c) => `${c.tipo} ${c.anchoCm}`).join(", ")}`);
  console.log(`  PL: ${pl.map((p) => `${p.subTipo} ${p.anchoCm}`).join(", ") || "\u2014"}`);
  console.log(`  MG: ${mg.length}   PN: ${pn.length}`);
  const problemas = [];
  if (pl.length !== 2) problemas.push(`se esperaban 2 pilastras (una por extremo), salieron ${pl.length}`);
  if (mg.length !== n - 1) problemas.push(`se esperaban ${n - 1} mamparas MG, salieron ${mg.length}`);
  if (pn.length !== 0) problemas.push(`los orinales no llevan panel de cabina, salieron ${pn.length}`);
  if (piezas.some((p) => p.familia === "PT")) problemas.push("los orinales no llevan puerta");
  const catalogo = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120];
  for (const p of pl) if (!catalogo.includes(p.anchoCm)) problemas.push(`pilastra de ${p.anchoCm} cm no est\xE1 en el cat\xE1logo`);
  if (problemas.length) {
    fallas += 1;
    for (const p of problemas) console.log(`  \u2717 ${p}`);
  } else {
    console.log("  \u2192 correcto");
  }
  console.log("");
}
console.log(fallas === 0 ? "todos los casos correctos" : `${fallas} caso(s) con problemas`);
if (fallas) process.exit(1);
