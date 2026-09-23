// <define:import.meta.env>
var define_import_meta_env_default = {};

// src/catalog.ts
var SNAP_CM = 0.5;
var MIN_ACCESIBLE_CM = 150;
var ANCHOS_PUERTA = [55, 60, 70, 75, 85, 90, 100];
var ANCHOS_PUERTA_CR = [62, 64, 92, 94];
function anchosPuerta(pais = "CR", modelo) {
  const todas = pais === "CR" ? [...ANCHOS_PUERTA, ...ANCHOS_PUERTA_CR] : ANCHOS_PUERTA;
  return unirAnchos(todas, especialesDe("PT", modelo));
}
var ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120];
var PANELES_HASTA_140 = [55, 60, 85, 90, 95, 100, 110, 120, 130, 135, 140];
var ANCHOS_PANEL = [...PANELES_HASTA_140, 150, 165, 180];
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
    id: "PMR",
    nombre: "Cuarto accesible + cabinas",
    descripcion: "Un cuarto accesible que toma todo el fondo del lugar, con su divisor, m\xE1s cabinas al lado.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "ORINALES",
    nombre: "Orinales, cierra con mampara",
    descripcion: "Tira de orinales contra una pared; el otro extremo lo cierra la mampara del \xFAltimo orinal.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: false, nombre: "Tira de orinales" }],
    esquinaCompartida: false,
    principal: 0
  },
  {
    id: "ORINALES_ENTRE_MUROS",
    nombre: "Orinales entre muros",
    descripcion: "Tira de orinales cerrada por pared en los dos extremos.",
    tramos: [{ orientacion: "horizontal", muroInicio: true, muroFin: true, nombre: "Tira de orinales" }],
    esquinaCompartida: false,
    principal: 0
  }
];
function esSoloOrinales(id) {
  return id === "ORINALES" || id === "ORINALES_ENTRE_MUROS";
}
function tipologia(id) {
  return TIPOLOGIAS.find((t) => t.id === id) ?? TIPOLOGIAS[0];
}
var especiales = [];
function especialesDe(familia, modelo) {
  if (!modelo) return [];
  const cod = modelo.toUpperCase();
  return especiales.filter((p) => p.familia === familia && p.modelo.toUpperCase() === cod);
}
function unirAnchos(base, extra) {
  const todos = /* @__PURE__ */ new Set([...base, ...extra.map((p) => p.anchoCm)]);
  return [...todos].sort((a, b) => a - b);
}

// src/modulador.ts
var PILASTRAS_INTERNAS = ANCHOS_PILASTRA;
var PILASTRAS_EXTREMO = ANCHOS_PILASTRA.filter((a) => a <= 24);
var PILASTRA_INTERNA_AUTO_MAX = 50;
var INTERNAS_AUTO = PILASTRAS_INTERNAS.filter((a) => a <= PILASTRA_INTERNA_AUTO_MAX);
var PUERTA_PREFERIDA = 60;
var PENALIZA_PUERTA = 0.05;
var PENALIZA_PASARSE = 100;
var ANCHO_ORINAL = 60;
var GRUESO_MG = 1.27;
var PUERTA_ACCESIBLE_MIN = 85;
var PENALIZA_ACCESIBLE = 1;
function medidaCercana(opciones, cm) {
  return opciones.reduce((a, b) => Math.abs(b - cm) < Math.abs(a - cm) ? b : a, opciones[0]);
}
function holguraHueco(extremoAbierto, murosPilastra) {
  return extremoAbierto ? 5 : 0.5 * murosPilastra;
}
function cabe(diferencia, extremoAbierto, murosPilastra) {
  if (diferencia >= 0) return diferencia <= holguraHueco(extremoAbierto, murosPilastra);
  return -diferencia <= (extremoAbierto ? 5 : 0);
}
function modularTira(o) {
  const nEst = o.puertas;
  const nAcc = o.accesible ? 1 : 0;
  const nMing = o.mingitorios ?? 0;
  const cabinas = nEst + nAcc + nMing;
  if (cabinas < 1) return null;
  const conCabinas = nEst + nAcc > 0;
  const internas = conCabinas ? nEst + nAcc - 1 : 0;
  const objetivo = claroAjustado(o.claroCm, o.murosPilastra, nEst + nAcc);
  const dosMuros = o.murosPilastra >= 2;
  const anchoBaseOrinal = o.anchoOrinal && o.anchoOrinal > 0 ? o.anchoOrinal : ANCHO_ORINAL;
  const anchosOrinal = Array.from({ length: nMing }, (_, i) => {
    const pedido = o.anchosOrinal?.[i];
    return pedido && pedido > 0 ? pedido : anchoBaseOrinal;
  });
  const orinalesAMedida = anchosOrinal.some((_, i) => (o.anchosOrinal?.[i] ?? 0) > 0);
  const cierreMG = o.cierreMingitorio === true && nMing > 0;
  const grosorMG = Math.max(0, nMing - 1) * GRUESO_MG + (cierreMG ? GRUESO_MG : 0);
  const fijoMG = anchosOrinal.reduce((t, a) => t + a, 0) + grosorMG;
  const deCatalogo = o.catalogoPuertas && o.catalogoPuertas.length ? o.catalogoPuertas : ANCHOS_PUERTA;
  const puertas = o.puertaFija ? [o.puertaFija] : deCatalogo;
  const accDeCatalogo = deCatalogo.filter((a) => a >= PUERTA_ACCESIBLE_MIN);
  const puertasAcc = nAcc > 0 ? o.puertaAccesibleFija && accDeCatalogo.includes(o.puertaAccesibleFija) ? [o.puertaAccesibleFija] : accDeCatalogo : [0];
  const unaClavada = o.pilastraFijaIndice !== void 0 || (o.pilastrasFijas ?? []).some((v) => !!v);
  const opInternas = internas > 0 ? o.pilInternaFija && !unaClavada ? [o.pilInternaFija] : INTERNAS_AUTO : [0];
  const opExtremos = o.pilExtremoFija && !unaClavada ? [o.pilExtremoFija] : PILASTRAS_EXTREMO;
  const arranqueOrinal = nMing > 0 && !conCabinas;
  const opExtremo1 = arranqueOrinal ? [o.cierreMingitorioInicio ? GRUESO_MG : 0] : o.sinPilastraInicio ? [0] : opExtremos;
  const opExtremo2 = arranqueOrinal ? [cierreMG ? GRUESO_MG : 0] : opExtremos;
  const objetivoAcc = nAcc > 0 ? o.anchoAccesibleCm ?? 0 : 0;
  let mejor = null;
  let mejorCabe = null;
  for (const acc of puertasAcc.length ? puertasAcc : [0]) {
    for (const ap of nEst > 0 ? puertas : [0]) {
      for (const api of opInternas) {
        for (const ae1 of opExtremo1) {
          for (const ae2 of opExtremo2) {
            const total = nEst * ap + nAcc * acc + fijoMG + internas * api + ae1 + ae2;
            const dif = objetivo - total;
            const anchoAcc = nAcc > 0 ? ae1 + acc + (internas > 0 ? api / 2 : ae2) : 0;
            const score = Math.abs(dif) + (nEst > 0 ? Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA : 0) + (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0) + (nAcc > 0 && objetivoAcc > 0 ? Math.max(0, objetivoAcc - anchoAcc) * PENALIZA_ACCESIBLE : 0);
            const cand = { ap, acc, api, ae1, ae2, total, score, anchoAcc };
            if (!mejor || score < mejor.score) mejor = cand;
            if (total <= objetivo + (o.extremoAbierto ? 5 : 0) && (!mejorCabe || score < mejorCabe.score)) {
              mejorCabe = cand;
            }
          }
        }
      }
    }
  }
  if (mejorCabe) mejor = mejorCabe;
  if (!mejor) return null;
  const cuerpos = nEst * mejor.ap + nAcc * mejor.acc + fijoMG;
  const clavadas = Array(internas + 2).fill(null);
  const yaElegidas = o.pilastrasFijas ?? [];
  for (let i = 0; i < clavadas.length; i++) clavadas[i] = yaElegidas[i] ?? null;
  const iFija = o.pilastraFijaIndice;
  if (iFija !== void 0 && iFija >= 0 && iFija < clavadas.length) {
    clavadas[iFija] = (iFija === 0 || iFija === clavadas.length - 1 ? o.pilExtremoFija : o.pilInternaFija) ?? null;
  } else if (!yaElegidas.length && (o.pilInternaFija || o.pilExtremoFija)) {
    for (let i = 0; i < clavadas.length; i++) {
      const ext = i === 0 || i === clavadas.length - 1;
      clavadas[i] = (ext ? o.pilExtremoFija : o.pilInternaFija) ?? null;
    }
  }
  if (nAcc > 0 && objetivoAcc > 0 && clavadas[0] === null) clavadas[0] = mejor.ae1;
  if (arranqueOrinal) {
    clavadas[0] = o.cierreMingitorioInicio ? GRUESO_MG : 0;
    clavadas[clavadas.length - 1] = cierreMG ? GRUESO_MG : 0;
  }
  if (o.sinPilastraInicio) clavadas[0] = 0;
  const uniformeCalza = !unaClavada && cabe(objetivo - mejor.total, o.extremoAbierto, o.murosPilastra);
  const repartidas = uniformeCalza ? null : repartirPilastras(objetivo - cuerpos, internas, INTERNAS_AUTO, PILASTRAS_EXTREMO, clavadas);
  const pilastras = repartidas ?? (() => {
    const base = [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2];
    for (let i = 0; i < base.length; i++) if (clavadas[i]) base[i] = clavadas[i];
    return base;
  })();
  if (arranqueOrinal) {
    pilastras[0] = o.cierreMingitorioInicio ? GRUESO_MG : 0;
    pilastras[pilastras.length - 1] = cierreMG ? GRUESO_MG : 0;
  }
  if (o.sinPilastraInicio) pilastras[0] = 0;
  const totalReal = cuerpos + pilastras.reduce((x, y) => x + y, 0);
  const diferencia = objetivo - totalReal;
  const abs = Math.abs(diferencia);
  let ajuste;
  let mensaje;
  if (cabe(diferencia, o.extremoAbierto, o.murosPilastra)) {
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
  let anchoOrinal = anchoBaseOrinal;
  const anchosFinal = anchosOrinal.slice();
  let ajusteFinal = ajuste;
  let mensajeFinal = mensaje;
  let canaletaFinal = canaleta;
  if (nMing > 0 && diferencia > 0.5 && !orinalesAMedida) {
    anchoOrinal = anchoBaseOrinal + diferencia / nMing;
    for (let i = 0; i < anchosFinal.length; i++) anchosFinal[i] = anchoOrinal;
    ajusteFinal = "exacto";
    mensajeFinal = `Calza; los ${abs.toFixed(1)} cm de sobra se reparten entre los ${nMing} orinales`;
    canaletaFinal = null;
  }
  return {
    anchoPuerta: mejor.ap,
    anchoPilInterna: pilastras[1] ?? mejor.api,
    anchoPilExtremo1: pilastras[0],
    anchoPilExtremo2: pilastras[pilastras.length - 1],
    pilastras,
    total: totalReal,
    claroAjustado: objetivo,
    diferencia,
    ajuste: ajusteFinal,
    mensaje: mensajeFinal,
    canaleta: canaletaFinal,
    anchoPuertaAccesible: mejor.acc || null,
    anchoOrinal: nMing > 0 ? anchoOrinal : null,
    anchosOrinal: nMing > 0 ? anchosFinal : null,
    anchoCabinaAccesible: nAcc > 0 ? pilastras[0] + mejor.acc + (internas > 0 ? pilastras[1] / 2 : pilastras[pilastras.length - 1]) : null
  };
}
function ajustarPilastras(o) {
  const internas = Math.max(0, o.internas);
  const objetivo = claroAjustado(o.claroCm, o.murosPilastra, o.conPuerta);
  const cuerpos = o.cuerpos.reduce((s, x) => s + x, 0);
  const dosMuros = o.murosPilastra >= 2;
  const opInternas = internas > 0 ? INTERNAS_AUTO : [0];
  let mejor = null;
  let mejorCabe = null;
  for (const api of opInternas) {
    for (const ae1 of PILASTRAS_EXTREMO) {
      for (const ae2 of PILASTRAS_EXTREMO) {
        const total = cuerpos + internas * api + ae1 + ae2;
        const dif = objetivo - total;
        const score = o.huecoLibre ? total + (total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0) : Math.abs(dif) + (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0);
        const cand = { api, ae1, ae2, total, score };
        if (!mejor || score < mejor.score) mejor = cand;
        if (total <= objetivo + (o.extremoAbierto ? 5 : 0) && (!mejorCabe || score < mejorCabe.score)) {
          mejorCabe = cand;
        }
      }
    }
  }
  if (mejorCabe) mejor = mejorCabe;
  if (!mejor) return null;
  if (!o.huecoLibre && !cabe(objetivo - mejor.total, o.extremoAbierto, o.murosPilastra)) {
    const mezcla = repartirPilastras(
      objetivo - cuerpos,
      internas,
      INTERNAS_AUTO,
      PILASTRAS_EXTREMO,
      o.fijas
    );
    if (mezcla) {
      const total = cuerpos + mezcla.reduce((x, y) => x + y, 0);
      const dif = objetivo - total;
      const d = Math.abs(dif);
      if (cabe(dif, o.extremoAbierto, o.murosPilastra)) {
        return {
          pilastras: mezcla,
          total,
          claroAjustado: objetivo,
          diferencia: dif,
          ajuste: "exacto",
          mensaje: d > 0.05 ? `Calza; ${d.toFixed(1)} cm los absorbe la instalaci\xF3n` : "Calza exacto",
          canaleta: null
        };
      }
    }
  }
  const diferencia = objetivo - mejor.total;
  const abs = Math.abs(diferencia);
  let ajuste;
  let mensaje;
  if (o.huecoLibre && diferencia >= 0) {
    ajuste = "exacto";
    mensaje = abs > 0.5 ? `Calza; el espacio libre se lleva ${abs.toFixed(1)} cm` : "Calza exacto";
  } else if (cabe(diferencia, o.extremoAbierto, o.murosPilastra)) {
    ajuste = "exacto";
    mensaje = abs > 0.5 ? `Calza; ${abs.toFixed(1)} cm los absorbe la instalaci\xF3n` : "Calza exacto";
  } else if (diferencia > 0 && abs <= CANALETA_MAX_CM) {
    ajuste = "canaleta";
    mensaje = `Calza con canaleta de ${abs.toFixed(1)} cm (rellena el hueco)`;
  } else if (diferencia > 0) {
    ajuste = "sobra";
    mensaje = `Con esas puertas queda un hueco de ${abs.toFixed(1)} cm: m\xE1s de lo que rellena una canaleta`;
  } else {
    ajuste = "falta";
    mensaje = `Con esas puertas las piezas se pasan ${abs.toFixed(1)} cm del claro`;
  }
  const canaleta = ajuste === "canaleta" ? (() => {
    const ancho = Math.max(1, Math.min(CANALETA_MAX_CM, Math.ceil(abs)));
    return { anchoCm: ancho, codigo: `CN0${ancho}` };
  })() : null;
  return {
    pilastras: [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2],
    total: mejor.total,
    claroAjustado: objetivo,
    diferencia,
    ajuste,
    mensaje,
    canaleta
  };
}
var GRUESO_MG_PIEZA = GRUESO_MG;
function repartirPilastras(totalCm, internas, opcionesInternas = PILASTRAS_INTERNAS, opcionesExtremo = PILASTRAS_EXTREMO, fijas) {
  const posiciones = internas + 2;
  if (posiciones < 2) return null;
  const objetivo = Math.floor(totalCm + 1e-9);
  if (objetivo <= 0) return null;
  const sumaFija = (fijas ?? []).reduce((s, v, i) => v != null && i < posiciones ? s + v : s, 0);
  const libresInternas = internas - (fijas ?? []).filter((v, i) => v != null && i > 0 && i < posiciones - 1).length;
  const centro = libresInternas > 0 ? (objetivo - sumaFija - 2 * opcionesExtremo[0]) / libresInternas : 0;
  const internasOrden = [...opcionesInternas].sort((a, b) => Math.abs(a - centro) - Math.abs(b - centro));
  const extremosOrden = [...opcionesExtremo].sort((a, b) => a - b);
  for (let falta = 0; falta <= CANALETA_MAX_CM; falta++) {
    const meta = objetivo - falta;
    if (meta <= 0) break;
    for (let apertura = 1; apertura <= internasOrden.length; apertura++) {
      const permitidas = internasOrden.slice(0, apertura);
      const salida = armar(meta, posiciones, permitidas, extremosOrden, centro, fijas);
      if (salida) return salida;
    }
  }
  return null;
}
function armar(objetivo, posiciones, internas, extremos, centro, fijas) {
  const opciones = [];
  for (let i = 0; i < posiciones; i++) {
    const clavada = fijas?.[i];
    if (clavada != null) {
      opciones.push([clavada]);
      continue;
    }
    const esExtremo = i === 0 || i === posiciones - 1;
    opciones.push(esExtremo ? extremos : internas);
  }
  const alcanzable = Array.from({ length: posiciones + 1 }, () => /* @__PURE__ */ new Set());
  alcanzable[posiciones].add(0);
  for (let i = posiciones - 1; i >= 0; i--) {
    for (const resto of alcanzable[i + 1]) {
      for (const v of opciones[i]) {
        const s = resto + v;
        if (s <= objetivo) alcanzable[i].add(s);
      }
    }
  }
  if (!alcanzable[0].has(objetivo)) return null;
  const salida = [];
  let falta = objetivo;
  for (let i = 0; i < posiciones; i++) {
    const esExtremo = i === 0 || i === posiciones - 1;
    const meta = esExtremo ? extremos[0] : centro;
    const orden = [...opciones[i]].sort((a, b) => Math.abs(a - meta) - Math.abs(b - meta));
    const elegida = orden.find((v) => v <= falta && alcanzable[i + 1].has(falta - v));
    if (elegida === void 0) return null;
    salida.push(elegida);
    falta -= elegida;
  }
  return salida;
}

// src/datos/tarifas-base.ts
var TARIFAS_BASE = {
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
};

// src/datos/tarifas-mexico.ts
var TARIFAS_MXN = {
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
};

// src/entorno.ts
var url;
var llave;
try {
  url = define_import_meta_env_default.VITE_SUPABASE_URL;
  llave = define_import_meta_env_default.VITE_SUPABASE_ANON_KEY;
} catch {
}

// src/tarifas.ts
var TARIFAS_RESPALDO = (() => {
  const t = JSON.parse(JSON.stringify(TARIFAS_BASE));
  for (const [modelo, juegos] of Object.entries(TARIFAS_MXN)) {
    if (!t[modelo]) t[modelo] = {};
    for (const [juego, set] of Object.entries(juegos)) t[modelo][juego] = { ...set };
  }
  return t;
})();

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
function puertaSugerida(anchoCm, pais = "CR") {
  const lista = anchosPuerta(pais);
  const max = anchoCm - MARGEN_PUERTA_CM;
  const posibles = lista.filter((a) => a <= max);
  return posibles.length ? posibles[posibles.length - 1] : lista[0];
}
function nuevaCabina(anchoCm, tipo = "normal") {
  return {
    id: nuevoId("cab"),
    anchoCm: snap(anchoCm),
    tipo,
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
  const cuartoCm = extra?.cuartoPmrCm ?? 0;
  if (cuartoCm > 0) {
    const cuarto = nuevaCabina(cuartoCm, "accesible");
    if (fijar?.puertaAccesible) {
      cuarto.puerta = { ...cuarto.puerta, anchoCm: fijar.puertaAccesible };
    }
    const nResto = cantidad - 1;
    if (nResto <= 0) {
      return { cabinas: [cuarto], pilastras: [0, 0], canaletaCm: 0, ajuste: "exacto", mensaje: "Solo el cuarto" };
    }
    const corrida = (l) => l ? l.slice(1) : void 0;
    const delResto = modularConCatalogo(
      claroCm - cuartoCm,
      nResto,
      // del lado del cuarto no hay muro sino la pilastra que lo cierra
      Math.max(0, murosPilastra - 1),
      extremoAbierto,
      {
        ...fijar,
        puertaAccesible: void 0,
        pilastraIndice: fijar?.pilastraIndice != null ? fijar.pilastraIndice - 1 : void 0,
        pilastras: corrida(fijar?.pilastras)
      },
      {
        ...extra,
        accesible: false,
        anchoAccesibleMinCm: void 0,
        cuartoPmrCm: 0,
        // "sin pilastra al inicio" es del MURO del cuarto, no del arranque del
        // resto: ahí va justo la pilastra que cierra el cuarto. Sin esto quedaba
        // en cero y la tira arrancaba pegada al cuarto.
        sinPilastraInicio: false
      }
    );
    if (!delResto) return null;
    return {
      cabinas: [cuarto, ...delResto.cabinas],
      pilastras: [0, ...delResto.pilastras],
      canaletaCm: delResto.canaletaCm,
      ajuste: delResto.ajuste,
      mensaje: delResto.mensaje,
      avisoAccesible: claroCm - cuartoCm < 0 ? `El cuarto de ${cuartoCm} cm no cabe en un claro de ${claroCm}.` : void 0
    };
  }
  const conAcc = extra?.accesible === true;
  const nMing = extra?.mingitorios ?? 0;
  const anchoOrinal = extra?.anchoOrinalCm && extra.anchoOrinalCm > 0 ? extra.anchoOrinalCm : 60;
  const normales = cantidad - (conAcc ? 1 : 0) - nMing;
  if (normales < 0) return null;
  const m = modularTira({
    claroCm,
    puertas: normales,
    accesible: conAcc,
    mingitorios: nMing,
    anchoOrinal: extra?.anchoOrinalCm,
    anchosOrinal: extra?.anchosOrinalCm,
    cierreMingitorio: extra?.cierreMingitorio,
    cierreMingitorioInicio: extra?.cierreMingitorioInicio,
    sinPilastraInicio: extra?.sinPilastraInicio,
    catalogoPuertas: anchosPuerta(extra?.pais ?? "CR", extra?.modelo),
    anchoAccesibleCm: extra?.anchoAccesibleMinCm,
    murosPilastra,
    extremoAbierto,
    puertaFija: fijar?.puerta,
    puertaAccesibleFija: fijar?.puertaAccesible,
    pilInternaFija: fijar?.pilInterna,
    pilExtremoFija: fijar?.pilExtremo,
    pilastraFijaIndice: fijar?.pilastraIndice,
    // La lista del tramo trae una entrada por frontera, incluidas las de
    // mampara entre orinales, que no consumen pilastra: hay que comprimirla a
    // las posiciones que el buscador conoce.
    pilastrasFijas: fijar?.pilastras ? (() => {
      const salida = [fijar.pilastras[0]];
      for (let i = 1; i <= cantidad - 1; i++) {
        const delCampo = i >= cantidad - nMing;
        if (!delCampo) salida.push(fijar.pilastras[i]);
      }
      salida.push(fijar.pilastras[cantidad]);
      return salida;
    })() : void 0
  });
  if (!m) return null;
  const pilastras = [m.pilastras[0]];
  let k = 1;
  for (let i = 1; i <= cantidad - 1; i++) {
    const izqOrinal = i > cantidad - nMing;
    const derOrinal = i >= cantidad - nMing;
    if (izqOrinal && derOrinal) pilastras.push(GRUESO_MG_CM);
    else if (derOrinal) pilastras.push(m.pilastras[m.pilastras.length - 1]);
    else pilastras.push(m.pilastras[k++] ?? m.anchoPilInterna);
  }
  pilastras.push(
    nMing > 0 ? extra?.cierreMingitorio ? GRUESO_MG_CM : 0 : m.pilastras[m.pilastras.length - 1]
  );
  const cabinas = [];
  for (let i = 0; i < cantidad; i++) {
    const { izq, der } = ladosDeCabina(
      Array.from({ length: cantidad }, (_, k2) => ({ orinal: k2 >= cantidad - nMing, libre: false })),
      (k2) => pilastras[k2],
      i
    );
    const esAcc = conAcc && i === 0;
    const esOrinal = i >= cantidad - nMing;
    const puerta = esAcc ? m.anchoPuertaAccesible ?? m.anchoPuerta : m.anchoPuerta;
    const cuerpo = esOrinal ? m.anchosOrinal?.[i - (cantidad - nMing)] ?? m.anchoOrinal ?? anchoOrinal : puerta;
    const c = nuevaCabina(izq + cuerpo + der, esAcc ? "accesible" : esOrinal ? "orinal" : "normal");
    if (esOrinal) c.puerta = { ...c.puerta, tipo: "ninguna" };
    else c.puerta.anchoCm = puerta;
    cabinas.push(c);
  }
  const minAcc = extra?.anchoAccesibleMinCm ?? MIN_ACCESIBLE_CM;
  const anchoAcc = conAcc && cabinas[0] ? cabinas[0].anchoCm : 0;
  const avisoAccesible = conAcc && anchoAcc < minAcc - 0.5 ? `La cabina accesible queda de ${anchoAcc.toFixed(1)} cm y se pidi\xF3 de ${minAcc}: faltan ${(minAcc - anchoAcc).toFixed(1)} cm. Con las piezas del cat\xE1logo no da; ampli\xE1 el claro o baj\xE1 una cabina.` : void 0;
  return {
    cabinas,
    pilastras,
    canaletaCm: m.canaleta?.anchoCm ?? 0,
    ajuste: m.ajuste,
    mensaje: m.mensaje,
    avisoAccesible
  };
}
function anchoAccesibleDe(config) {
  if (config.tipologia === "PMR") return config.anchoPmrCuartoCm ?? 162;
  return config.anchoAccesibleCm;
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
function reajustarConPuertas(cabinas, claroCm, murosPilastra, extremoAbierto, cuartoPmrCm = 0, fijas) {
  const n = cabinas.length;
  if (n === 0) return null;
  if (cuartoPmrCm > 0 && cabinas[0]?.tipo === "accesible") {
    if (n === 1) {
      return { cabinas: [{ ...cabinas[0], anchoCm: cuartoPmrCm }], pilastras: [0, 0], canaletaCm: 0, ajuste: "exacto", mensaje: "Solo el cuarto" };
    }
    const resto = reajustarConPuertas(
      cabinas.slice(1),
      claroCm - cuartoPmrCm,
      Math.max(0, murosPilastra - 1),
      extremoAbierto,
      0,
      fijas ? fijas.slice(1) : void 0
    );
    if (!resto) return null;
    return {
      cabinas: [{ ...cabinas[0], anchoCm: cuartoPmrCm }, ...resto.cabinas],
      pilastras: [0, ...resto.pilastras],
      canaletaCm: resto.canaletaCm,
      ajuste: resto.ajuste,
      mensaje: resto.mensaje
    };
  }
  const lugares = lugaresDe(cabinas);
  const absorbe = (c) => esEspacioLibre(c) && !(c.libreCm && c.libreCm > 0);
  const libres = cabinas.filter(absorbe).length;
  const cuerpoDe = (c) => esEspacioLibre(c) ? c.libreCm ?? 0 : c.tipo === "orinal" ? c.anchoCm : c.puerta.anchoCm;
  const cuerpos = cabinas.map(cuerpoDe);
  const conPuerta = cabinas.filter((c) => c.tipo !== "orinal" && !esEspacioLibre(c)).length;
  let internas = 0;
  let grosorMG = 0;
  for (let i = 0; i < n - 1; i++) {
    if (cabinas[i].tipo === "orinal" && cabinas[i + 1].tipo === "orinal") grosorMG += GRUESO_MG_PIEZA;
    else internas += 1;
  }
  const r = ajustarPilastras({
    claroCm,
    cuerpos: [...cuerpos, grosorMG],
    conPuerta,
    internas,
    murosPilastra,
    extremoAbierto,
    huecoLibre: libres > 0
  });
  if (!r) return null;
  const pilastras = [r.pilastras[0]];
  let k = 1;
  for (let i = 0; i < n - 1; i++) {
    const entreOrinales = cabinas[i].tipo === "orinal" && cabinas[i + 1].tipo === "orinal";
    pilastras.push(entreOrinales ? GRUESO_MG_PIEZA : r.pilastras[k++]);
  }
  pilastras.push(r.pilastras[r.pilastras.length - 1]);
  if (libres > 0 && fijas) {
    for (let k2 = 0; k2 < pilastras.length; k2++) {
      const f = fijas[k2];
      if (f != null && f > 0 && !entreDosOrinales(lugares, k2)) pilastras[k2] = f;
    }
  }
  const nuevas = cabinas.map((c, i) => {
    const { izq, der } = ladosDeCabina(lugares, (k2) => pilastras[k2], i);
    return { ...c, anchoCm: izq + cuerpoDe(c) + der };
  });
  if (libres > 0) {
    const piezas = cuerpos.reduce((s, x) => s + x, 0) + pilastras.reduce((s, x) => s + x, 0);
    const sobra = Math.max(0, snap((r.claroAjustado - piezas) / libres));
    for (let i = 0; i < nuevas.length; i++) {
      if (absorbe(cabinas[i])) nuevas[i] = { ...nuevas[i], anchoCm: snap(nuevas[i].anchoCm + sobra) };
    }
  }
  return {
    cabinas: nuevas,
    pilastras,
    canaletaCm: r.canaleta?.anchoCm ?? 0,
    ajuste: r.ajuste,
    mensaje: r.mensaje
  };
}
function esEspacioLibre(c) {
  return c.tipo !== "orinal" && c.tipo !== "accesible" && c.puerta.tipo === "ninguna";
}
function entreDosOrinales(lugares, k) {
  return k > 0 && k < lugares.length && lugares[k - 1].orinal && lugares[k].orinal;
}
function lugaresDe(cabinas) {
  return cabinas.map((c) => ({ orinal: c.tipo === "orinal", libre: esEspacioLibre(c) }));
}
function ladoDePilastra(lugares, k, indiceCuarto = -1) {
  const n = lugares.length;
  if (k <= 0) return "der";
  if (k >= n) return "izq";
  if (!lugares[k - 1].orinal && lugares[k].orinal) return "izq";
  if (indiceCuarto >= 0 && k === indiceCuarto + 1) return "der";
  if (lugares[k - 1].libre && !lugares[k].libre) return "der";
  if (lugares[k].libre && !lugares[k - 1].libre) return "izq";
  return "mitades";
}
function ladosDeCabina(lugares, pilastra, i, arrancaElCuarto = false) {
  const cuarto = arrancaElCuarto ? 0 : -1;
  const lado = (k) => ladoDePilastra(lugares, k, cuarto);
  const dIzq = lado(i);
  const izq = dIzq === "der" ? pilastra(i) : dIzq === "izq" ? 0 : pilastra(i) / 2;
  const dDer = lado(i + 1);
  const der = dDer === "izq" ? pilastra(i + 1) : dDer === "der" ? 0 : pilastra(i + 1) / 2;
  return { izq, der };
}
function claroDeOrinales(cantidad, anchoOrinalCm, muroInicio, muroFin) {
  const muros = (muroInicio ? 1 : 0) + (muroFin ? 1 : 0);
  return cantidad * anchoOrinalCm + Math.max(0, cantidad - 1) * GRUESO_MG_CM + (muroFin ? 0 : GRUESO_MG_CM) + (muroInicio ? 0 : GRUESO_MG_CM) + muros;
}
function orinales(cantidad) {
  return Array.from({ length: Math.max(1, cantidad) }, () => {
    const c = nuevaCabina(60, "orinal");
    c.puerta = { ...c.puerta, tipo: "ninguna" };
    return c;
  });
}
function crearTramos(tipologiaId, claroCm, cantidad, config, pais = "CR") {
  const tipo = tipologia(tipologiaId);
  const conAccesible = tipologiaId === "PMR" || config.llevaAccesible === true;
  const soloOrinales = esSoloOrinales(tipologiaId);
  const nOrinales = soloOrinales ? 0 : Math.max(0, config.orinales ?? 0);
  return tipo.tramos.map((t, i) => {
    const esPrincipal = i === tipo.principal;
    const cant = esPrincipal ? cantidad : 2;
    const ming = esPrincipal ? nOrinales : 0;
    const total = cant + ming;
    const murosT = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0);
    const anchoOrinal = config.anchoOrinalCm && config.anchoOrinalCm > 0 ? config.anchoOrinalCm : 60;
    const claroOrinales = claroDeOrinales(cant, anchoOrinal, t.muroInicio, t.muroFin);
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
    const sinPilastraInicio = config.tipologia === "PMR" && conAccesible && esPrincipal;
    const murosConPilastra = Math.max(0, murosT - (sinPilastraInicio ? 1 : 0));
    const conCatalogo = modularConCatalogo(claroTramo, soloOrinales ? cant : total, murosConPilastra, muros < 2, { puerta: config.puertaCm, puertaAccesible: config.puertaAccesibleCm }, {
      modelo: config.modelo,
      accesible: conAccesible && esPrincipal,
      sinPilastraInicio,
      anchoAccesibleMinCm: anchoAccesibleDe(config),
      mingitorios: soloOrinales ? cant : ming,
      anchoOrinalCm: config.anchoOrinalCm,
      anchosOrinalCm: config.anchosOrinalCm,
      // si la tira termina en orinal y de ese lado no hay muro, cierra con mingitorio
      cierreMingitorio: !t.muroFin && (soloOrinales ? cant : ming) > 0,
      cierreMingitorioInicio: soloOrinales && !t.muroInicio,
      // el cuarto PMR se planta y solo se modula el resto
      cuartoPmrCm: sinPilastraInicio ? anchoAccesibleDe(config) : 0,
      pais
    });
    if (!conCatalogo) {
      return {
        ...base,
        cabinas: soloOrinales ? orinales(cant) : modular(claroTramo, cant, conAccesible && esPrincipal ? anchoAccesibleDe(config) : 0)
      };
    }
    return {
      ...base,
      cabinas: conCatalogo.cabinas,
      pilastras: conCatalogo.pilastras,
      canaletaCm: conCatalogo.canaletaCm,
      ajuste: conCatalogo.ajuste,
      mensaje: conCatalogo.mensaje,
      avisoAccesible: conCatalogo.avisoAccesible
    };
  });
}

// src/geometria.ts
function acumulado(cabinas) {
  const acum = [];
  let u = 0;
  for (const c of cabinas) {
    acum.push(u);
    u += c.anchoCm;
  }
  return acum;
}
function centroPilastra(tramo, cortes, k, ancho, cuarto) {
  const u = cortes[k];
  const lado = ladoDePilastra(lugaresDe(tramo.cabinas), k, cuarto ? cuarto.indice : -1);
  if (lado === "der") return u + ancho / 2;
  if (lado === "izq") return u - ancho / 2;
  return u;
}
function profundidadDelLugar(config) {
  return Math.max(config.profundidadLugarCm ?? config.profundidadCm, config.profundidadCm);
}
function cuartoPmr(tramo, config) {
  if (config.tipologia !== "PMR") return null;
  const i = tramo.cabinas.findIndex((c) => c.tipo === "accesible");
  if (i < 0) return null;
  const cab = tramo.cabinas[i];
  const desde = acumulado(tramo.cabinas)[i];
  const prof = profundidadDelLugar(config);
  const panel = config.profundidadCm;
  const puerta = Math.max(0, cab.puerta.anchoCm || config.puertaAccesibleCm || 90);
  const sobra = Math.round((prof - panel - puerta) * 10) / 10;
  const pilastra = sobra > 0 ? medidaCercana(ANCHOS_PILASTRA, sobra) : 0;
  const falta = Math.round((sobra - pilastra) * 10) / 10;
  const divisor = [];
  let v = 0;
  for (const [tipo, largo] of [["panel", panel], ["puerta", puerta], ["pilastra", pilastra]]) {
    if (largo <= 0) continue;
    divisor.push({ tipo, desdeCm: v, hastaCm: v + largo });
    v += largo;
  }
  return {
    indice: i,
    desdeCm: desde,
    hastaCm: desde + cab.anchoCm,
    anchoCm: cab.anchoCm,
    profCm: prof,
    profCabinasCm: config.profundidadCm,
    cierre: config.cierrePmr ?? "muros",
    divisor,
    pilastraCm: pilastra,
    aviso: avisoDelDivisor(prof, panel, puerta, pilastra, sobra, falta)
  };
}
function avisoDelDivisor(prof, panel, puerta, pilastra, sobra, falta) {
  if (sobra < 0) {
    return `El divisor se pasa ${(-sobra).toFixed(1)} cm del fondo: el panel de ${panel} y la puerta de ${puerta} suman m\xE1s que los ${prof} cm del lugar. Achic\xE1 la puerta o agrand\xE1 el fondo.`;
  }
  if (sobra === 0) {
    return `El divisor cierra justo con el panel y la puerta, sin pilastra contra el muro. Si la lleva, achic\xE1 la puerta.`;
  }
  if (pilastra === 0) {
    return `Sobran ${sobra.toFixed(1)} cm para la pilastra del divisor y la m\xE1s chica del cat\xE1logo es de ${ANCHOS_PILASTRA[0]} cm.`;
  }
  if (falta !== 0) {
    return `La pilastra del divisor qued\xF3 de ${pilastra} cm y el hueco es de ${sobra.toFixed(1)}: ${falta > 0 ? `faltan ${falta.toFixed(1)} cm` : `sobran ${(-falta).toFixed(1)} cm`}.`;
  }
  return null;
}

// scripts/probar-libre.ts
function cfg(extra) {
  return {
    tipologia: "PMR",
    modelo: "REFORZADO",
    linea: "LEEDER",
    claroCm: 693,
    profundidadCm: 150,
    cantidad: 4,
    alturaCm: 200,
    puertaCm: 60,
    puertaAccesibleCm: 90,
    anchoAccesibleCm: 162,
    orinales: 3,
    anchoOrinalCm: 60,
    llevaAccesible: true,
    anchoPilastraCm: 24,
    ...extra
  };
}
function pintar(t, config, titulo) {
  console.log(`
\u2500\u2500 ${titulo} \u2500\u2500`);
  console.log(`  claro ${t.claroCm}   piezas ${anchoTotal(t.cabinas).toFixed(1)}   ${t.mensaje ?? ""}`);
  const etiqueta = (c) => c.tipo === "orinal" ? "orinal" : c.tipo === "accesible" ? "PMR" : esEspacioLibre(c) ? "LIBRE" : "cabina";
  console.log("  lugares:  " + t.cabinas.map((c, i) => `${i}\xB7${etiqueta(c)} ${c.anchoCm}`).join("   "));
  const acu = acumulado(t.cabinas);
  const ac = [0, ...acu.slice(1), anchoTotal(t.cabinas)];
  const q = cuartoPmr(t, config);
  const lug = lugaresDe(t.cabinas);
  const filas = (t.pilastras ?? []).map((p, k) => {
    const lado = ladoDePilastra(lug, k, q ? q.indice : -1);
    const centro = centroPilastra(t, ac, k, p, q);
    return `  PL ${String(p).padStart(5)}  frontera ${k}  corte ${ac[k].toFixed(1).padStart(6)}  ${lado === "mitades" ? "CENTRAL" : `LATERAL(${lado})`}  centro ${centro.toFixed(1)}`;
  });
  console.log(filas.join("\n"));
  console.log("  cadena:   " + t.cabinas.map((c) => c.anchoCm.toFixed(1)).join(" | "));
}
function sinPuerta(t, i) {
  return t.cabinas.map((c, k) => k === i ? { ...c, puerta: { ...c.puerta, tipo: "ninguna" } } : c);
}
{
  const config = cfg({});
  const t = crearTramos("PMR", 693, 4, config, "CR")[0];
  pintar(t, config, "PMR 162 + 3 cabinas + 3 orinales, claro 693 \xB7 COMO EST\xC1 HOY");
  const r = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162);
  if (!r) console.log("\n  \u2717 no modula");
  else pintar({ ...t, ...r }, config, "la cabina del MEDIO sin puerta \u2192 ESPACIO LIBRE");
}
{
  const config = cfg({ tipologia: "EN_LINEA", llevaAccesible: false, orinales: 0, cantidad: 4, claroCm: 400 });
  const t = crearTramos("EN_LINEA", 400, 4, config, "CR")[0];
  pintar(t, config, "4 cabinas entre muros, claro 400 \xB7 COMO EST\xC1 HOY");
  const r = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 2, false, 0);
  if (!r) console.log("\n  \u2717 no modula");
  else pintar({ ...t, ...r }, config, "la 3\xAA sin puerta \u2192 ESPACIO LIBRE");
}
{
  const config = cfg({});
  const t = crearTramos("PMR", 693, 4, config, "CR")[0];
  const conHueco = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162);
  if (conHueco) {
    const clavado = conHueco.cabinas.map((c, i) => i === 2 ? { ...c, libreCm: 77 } : c);
    const r = reajustarConPuertas(clavado, t.claroCm, 1, false, 162);
    if (r) pintar({ ...t, ...r }, config, "con el hueco ESCRITO en 77 cm (como el plano real)");
  }
}
{
  const config = cfg({});
  const t = crearTramos("PMR", 693, 4, config, "CR")[0];
  const hueco = reajustarConPuertas(sinPuerta(t, 2), t.claroCm, 1, false, 162);
  if (hueco) {
    const fijas = [null, 24, 24, 24, 24, null, null, null];
    const r = reajustarConPuertas(hueco.cabinas, t.claroCm, 1, false, 162, fijas);
    if (r) pintar({ ...t, ...r }, config, "cub\xEDculos con pilastras escritas a mano (24) \xB7 el hueco se acomoda");
  }
}
