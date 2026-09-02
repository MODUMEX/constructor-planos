// src/catalog.ts
var ANCHOS_PUERTA = [55, 60, 62, 64, 70, 75, 85, 90, 92, 94, 100];
var ANCHOS_PILASTRA = [10, 12, 15, 17, 19, 24, 30, 35, 40, 45, 50, 55, 60, 70, 85, 90, 100, 120];
var CANALETA_MAX_CM = 5;
function claroAjustado(claroCm, murosPilastra, puertas) {
  return claroCm - murosPilastra + 1.5 * puertas;
}

// src/modulador.ts
var PILASTRAS_INTERNAS = ANCHOS_PILASTRA.filter((a) => a >= 24);
var PILASTRAS_EXTREMO = ANCHOS_PILASTRA.filter((a) => a <= 24);
var PUERTA_PREFERIDA = 60;
var PENALIZA_PUERTA = 0.05;
var PENALIZA_PASARSE = 100;
function modularTira(o) {
  const n = o.puertas;
  if (n < 1) return null;
  const internas = n - 1;
  const objetivo = claroAjustado(o.claroCm, o.murosPilastra, n);
  const dosMuros = o.murosPilastra >= 2;
  const puertas = o.puertaFija ? [o.puertaFija] : ANCHOS_PUERTA;
  const opInternas = internas > 0 ? PILASTRAS_INTERNAS : [0];
  let mejor = null;
  for (const ap of puertas) {
    for (const api of opInternas) {
      for (const ae1 of PILASTRAS_EXTREMO) {
        for (const ae2 of PILASTRAS_EXTREMO) {
          const total = n * ap + internas * api + ae1 + ae2;
          const dif = objetivo - total;
          const score = Math.abs(dif) + Math.abs(ap - PUERTA_PREFERIDA) * PENALIZA_PUERTA + (dosMuros && total > objetivo ? (total - objetivo) * PENALIZA_PASARSE : 0);
          if (!mejor || score < mejor.score) mejor = { ap, api, ae1, ae2, total, score };
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
    ajuste,
    mensaje,
    canaleta
  };
}

// scripts/probar-modulador.ts
var CASOS = [
  {
    nombre: "CERVECER\xCDA 23446 \xB7 Hombres (1 muro)",
    puertas: 2,
    murosPilastra: 1,
    esperado: { puerta: 60, pilastras: [24, 24, 12] }
  },
  {
    nombre: "CERVECER\xCDA 23446 \xB7 Mujeres (2 muros)",
    puertas: 3,
    murosPilastra: 2,
    esperado: { puerta: 60, pilastras: [30, 30, 17, 15] }
  }
];
var suma = (a) => a.reduce((s, x) => s + x, 0);
var ordenado = (a) => [...a].sort((x, y) => y - x).join(",");
var bien = 0;
for (const c of CASOS) {
  const totalReal = c.esperado.puerta * c.puertas + suma(c.esperado.pilastras);
  const claroCm = totalReal + c.murosPilastra - 1.5 * c.puertas;
  const r = modularTira({ claroCm, puertas: c.puertas, murosPilastra: c.murosPilastra });
  console.log(`
${c.nombre}`);
  console.log(`  claro deducido:  ${claroCm} cm`);
  console.log(`  esperado:        PT${c.esperado.puerta} \xD7 ${c.puertas} + PI ${c.esperado.pilastras.join(", ")}  = ${totalReal}`);
  if (!r) {
    console.log("  obtenido:        (sin soluci\xF3n)");
    continue;
  }
  console.log(`  obtenido:        PT${r.anchoPuerta} \xD7 ${c.puertas} + PI ${r.pilastras.join(", ")}  = ${r.total}`);
  console.log(`  ajuste:          ${r.mensaje}`);
  const puertaOk = r.anchoPuerta === c.esperado.puerta;
  const pilOk = ordenado(r.pilastras) === ordenado(c.esperado.pilastras);
  const totalOk = r.total === totalReal;
  if (puertaOk && pilOk && totalOk) {
    bien++;
    console.log("  \u2192 REPRODUCE el despiece");
  } else {
    const fallas = [
      !puertaOk ? "puerta" : "",
      !pilOk ? `pilastras (esperadas ${ordenado(c.esperado.pilastras)}, salieron ${ordenado(r.pilastras)})` : "",
      !totalOk ? `total (${totalReal} vs ${r.total})` : ""
    ].filter(Boolean);
    console.log("  \u2192 NO reproduce: " + fallas.join(" \xB7 "));
  }
}
console.log(`
${bien} de ${CASOS.length} casos reproducidos`);
