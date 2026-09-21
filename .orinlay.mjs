// src/catalog.ts
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
var ANCHOS_PUERTA = [55, 60, 70, 75, 85, 90, 100];
var ANCHOS_PUERTA_CR = [62, 64, 92, 94];
function anchosPuerta(pais = "CR") {
  const todas = pais === "CR" ? [...ANCHOS_PUERTA, ...ANCHOS_PUERTA_CR] : ANCHOS_PUERTA;
  return [...todas].sort((a, b) => a - b);
}
var ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120];
var PANELES_HASTA_140 = [55, 60, 85, 90, 95, 100, 110, 120, 130, 135, 140];
var ANCHOS_PANEL = [...PANELES_HASTA_140, 150, 165, 180];
var MG_MEDIDAS = [
  { anchoCm: 45, altoCm: 120 },
  { anchoCm: 60, altoCm: 120 },
  { anchoCm: 60, altoCm: 150 }
];
var MG_SUPERIOR = [
  { anchoCm: 45, altoCm: 120 },
  { anchoCm: 60, altoCm: 150 }
];
function mgMedidas(linea) {
  return linea === "SUPERIOR" ? MG_SUPERIOR : MG_MEDIDAS;
}
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
    const base2 = [mejor.ae1, ...Array(internas).fill(mejor.api), mejor.ae2];
    for (let i = 0; i < base2.length; i++) if (clavadas[i]) base2[i] = clavadas[i];
    return base2;
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
    catalogoPuertas: anchosPuerta(extra?.pais ?? "CR"),
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
      Array.from({ length: cantidad }, (_, k2) => k2 >= cantidad - nMing),
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
    const base2 = snap(resto / normales);
    for (let i = 0; i < normales; i++) cabinas.push(nuevaCabina(base2));
    const sobra = snap(claroCm - anchoTotal(cabinas));
    const ultima = cabinas[cabinas.length - 1];
    ultima.anchoCm = snap(ultima.anchoCm + sobra);
    ultima.puerta.anchoCm = puertaSugerida(ultima.anchoCm);
  }
  return cabinas;
}
function ladosDeCabina(esOrinal, pilastra, i, arrancaElCuarto = false) {
  const n = esOrinal.length;
  const cierra = (k) => k > 0 && k < n && !esOrinal[k - 1] && esOrinal[k];
  const delCuarto = (k) => arrancaElCuarto && k === 1;
  const izq = i === 0 ? pilastra(0) : cierra(i) ? 0 : delCuarto(i) ? pilastra(i) : pilastra(i) / 2;
  const der = i === n - 1 ? pilastra(n) : cierra(i + 1) ? pilastra(i + 1) : delCuarto(i + 1) ? 0 : pilastra(i + 1) / 2;
  return { izq, der };
}
function fronteraDeOrinal(tramo, k) {
  const n = tramo.cabinas.length;
  if (k <= 0) return tramo.cabinas[0]?.tipo === "orinal";
  if (k >= n) return tramo.cabinas[n - 1]?.tipo === "orinal";
  return tramo.cabinas[k - 1]?.tipo === "orinal" && tramo.cabinas[k]?.tipo === "orinal";
}
function cierraConMingitorio(tramo) {
  const n = tramo.cabinas.length;
  if (n === 0 || tramo.muroFin) return false;
  if (tramo.cabinas[n - 1].tipo !== "orinal") return false;
  const ultima = tramo.pilastras?.[n];
  return ultima === void 0 || ultima <= GRUESO_MG_CM + 0.01;
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
    const claroOrinales = cant * anchoOrinal + Math.max(0, cant - 1) * GRUESO_MG_CM + (t.muroFin ? 0 : GRUESO_MG_CM) + (t.muroInicio ? 0 : GRUESO_MG_CM) + murosT;
    const claroTramo = soloOrinales ? claroOrinales : esPrincipal ? claroCm : LARGO_SECUNDARIO_CM;
    const base2 = {
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
        ...base2,
        cabinas: soloOrinales ? orinales(cant) : modular(claroTramo, cant, conAccesible && esPrincipal ? anchoAccesibleDe(config) : 0)
      };
    }
    return {
      ...base2,
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

// src/exportar/piezas.ts
function altoPilastra(config) {
  return alturasDe(config.modelo).pilastra;
}
function subTipoPuerta(cab, contraMuro) {
  const adentro = cab.puerta.apertura === "adentro";
  const mano = adentro ? cab.puerta.mano === "der" ? "izq" : "der" : cab.puerta.mano;
  const base2 = mano === "der" ? "PTADER" : "PTAIZQ";
  return adentro && contraMuro ? `${base2}-AM` : base2;
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
    const cierraMG = cierraConMingitorio(tramo);
    const llevaDivisor = cab.tipo === "orinal" ? tramo.cabinas[i + 1]?.tipo === "orinal" || esUltima && cierraMG : !esUltima || !tramo.muroFin;
    if (llevaDivisor) {
      if (cab.tipo === "orinal") {
        piezas.push({
          familia: "MG",
          anchoCm: config.mgAnchoCm ?? 60,
          altoCm: config.mgAlturaCm,
          subTipo: config.mgAlturaCm >= 150 ? "MG150" : "MG120",
          area
        });
      } else {
        const esDelCuarto = config.tipologia === "PMR" && cab.tipo === "accesible";
        piezas.push({
          familia: "PN",
          anchoCm: config.profundidadCm,
          altoCm: altoPanel,
          subTipo: esUltima || esDelCuarto ? "PNLAT" : "PNCEN",
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
    const arrancaElCuarto = config.tipologia === "PMR" && tramo.cabinas[0]?.tipo === "accesible";
    if (!omitirPilastraInicial && !fronteraDeOrinal(tramo, 0) && !arrancaElCuarto) {
      piezas.push({
        familia: "PL",
        anchoCm: anchoDe(0),
        altoCm: altoPil,
        subTipo: tramo.muroInicio ? "PLLATMUR" : "PLLAT",
        area
      });
    }
    for (let i = 0; i < n - 1; i++) {
      if (fronteraDeOrinal(tramo, i + 1)) continue;
      const cierraLaTira = tramo.cabinas[i].tipo !== "orinal" && tramo.cabinas[i + 1].tipo === "orinal";
      const salaDelCuarto = config.tipologia === "PMR" && tramo.cabinas[i].tipo === "accesible";
      piezas.push({
        familia: "PL",
        anchoCm: anchoDe(i + 1),
        altoCm: altoPil,
        subTipo: cierraLaTira || salaDelCuarto ? "PLLAT" : "PLCEN",
        area
      });
    }
    if (!fronteraDeOrinal(tramo, n)) {
      piezas.push({
        familia: "PL",
        anchoCm: anchoDe(n),
        altoCm: altoPil,
        subTipo: tramo.muroFin ? "PLLATMUR" : "PLLAT",
        area
      });
    }
  }
  return piezas;
}
function pilastraDelDivisor(area) {
  if (area.config.tipologia !== "PMR") return [];
  const salida = [];
  for (const tramo of area.tramos) {
    const cuarto = cuartoPmr(tramo, area.config);
    if (!cuarto || cuarto.pilastraCm <= 0) continue;
    salida.push({
      familia: "PL",
      anchoCm: cuarto.pilastraCm,
      altoCm: altoPilastra(area.config),
      subTipo: "PLLATMUR",
      area: area.nombre
    });
  }
  return salida;
}
function piezasDeArea(area) {
  const tipo = tipologia(area.config.tipologia);
  const piezas = area.tramos.flatMap(
    (t, i) => piezasDeTramo(t, area.config, area.nombre, tipo.esquinaCompartida && i !== tipo.principal)
  );
  piezas.push(...pilastraDelDivisor(area));
  const soloOrinales = esSoloOrinales(area.config.tipologia);
  const enLaTira = area.tramos.reduce(
    (t, tr) => t + tr.cabinas.filter((c) => c.tipo === "orinal").length,
    0
  );
  const divisores = soloOrinales || enLaTira > 0 ? 0 : Math.max(0, area.config.orinales - 1);
  for (let i = 0; i < divisores; i++) {
    piezas.push({
      familia: "MG",
      anchoCm: area.config.mgAnchoCm ?? 60,
      altoCm: area.config.mgAlturaCm,
      subTipo: area.config.mgAlturaCm >= 150 ? "MG150" : "MG120",
      area: area.nombre
    });
  }
  return piezas;
}

// scripts/probar-orinales-layouts.ts
var base = {
  linea: "LEEDER",
  modelo: "ESTANDAR",
  acabado: "Laminado Compacto",
  color: "BLANCO",
  montaje: "PISO_HEADRAIL",
  bisagra: "GRAV",
  cerrojo: "IND",
  herrajeAcabado: "INOX",
  alturaCm: 150,
  profundidadCm: 150,
  anchoAccesibleCm: 150,
  anchoPilastraCm: 16,
  espesorMm: 12,
  terminacion: "ZOCLO",
  kap: false,
  orinales: 0,
  mgAlturaCm: 120,
  mgAnchoCm: 60,
  tipologia: "ORINALES"
};
for (const tip of ["ORINALES", "ORINALES_ENTRE_MUROS"]) {
  for (const n of [3, 4]) {
    const config = { ...base, tipologia: tip };
    const tramos = crearTramos(tip, 240, n, config);
    const area = { id: "a", nombre: "Orinales", piso: "1", config, tramos };
    const piezas = piezasDeArea(area);
    const mg = piezas.filter((p) => p.familia === "MG");
    const otras = piezas.filter((p) => p.familia !== "MG");
    const cab = tramos[0].cabinas;
    console.log(`${tip} \xB7 ${n} orinales`);
    console.log(`  cabinas   : ${cab.length} (${[...new Set(cab.map((c) => c.tipo))].join(", ")})`);
    console.log(`  mamparas  : ${mg.length}  ${mg.length ? `(${mg[0].anchoCm}\xD7${mg[0].altoCm}, subTipo ${mg[0].subTipo})` : ""}`);
    console.log(`  esperadas : ${tip === "ORINALES" ? n : n - 1}`);
    console.log(`  otras     : ${otras.length ? otras.map((p) => p.familia).join(", ") : "\u2014 (sin paneles ni puertas)"}`);
    console.log(`  ${mg.length === (tip === "ORINALES" ? n : n - 1) ? "OK" : "NO CUADRA"}
`);
  }
}
console.log("medidas de mampara en LEEDER:", mgMedidas("LEEDER").map((m) => `${m.anchoCm}\xD7${m.altoCm}`).join(", "));
console.log("medidas de mampara en SUPERIOR:", mgMedidas("SUPERIOR").map((m) => `${m.anchoCm}\xD7${m.altoCm}`).join(", "));
