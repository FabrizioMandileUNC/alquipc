// Sección principal: "Pago $X por mes desde M y el contrato ajusta cada N meses."
import { $, el, campoMonto } from "./dom.js";
import { enumerar, parsearMonto, pct, pesos } from "./formato.js";
import { mesDe, nombre, sumarMeses } from "./periodos.js";
import { selectorFrecuencia, selectorMes, selectorOpciones } from "./selectores.js";

export function iniciarCalculadora(ipc) {
  const monto = $("#monto");
  const salida = $("#resultado");
  // Por defecto, un inicio cuyo próximo ajuste trimestral ya se puede calcular.
  const estado = { inicio: sumarMeses(ipc.ultimo, -1), frecuencia: 3, rezago: 2 };

  function calcular() {
    salida.replaceChildren(...resultado(ipc, parsearMonto(monto.value), estado));
  }

  campoMonto(monto, calcular);
  selectorMes($("#inicio"), {
    valor: estado.inicio, min: sumarMeses(ipc.primero, 1), max: sumarMeses(ipc.ultimo, 3),
    etiqueta: "Mes desde el que pagás ese monto",
    alElegir: (p) => { estado.inicio = p; calcular(); },
  });
  selectorFrecuencia($("#frecuencia"), {
    valor: estado.frecuencia,
    alElegir: (n) => { estado.frecuencia = n; calcular(); },
  });
  selectorOpciones($("#rezago"), {
    valor: estado.rezago,
    titulo: "Qué IPC toma tu contrato",
    opciones: [
      { valor: 2, texto: "dos meses", ayuda: "Lo más común: al ajustar, el último IPC publicado es el de dos meses antes." },
      { valor: 1, texto: "un mes", ayuda: "Si tu contrato ajusta después de mitad de mes con el IPC recién salido." },
    ],
    alElegir: (v) => { estado.rezago = v; calcular(); },
  });
  $("#form-alquiler").addEventListener("submit", (ev) => ev.preventDefault());
  calcular();
}

// Devuelve los nodos del bloque de resultado.
function resultado(ipc, m, { inicio, frecuencia, rezago }) {
  if (isNaN(m)) return [el("p", { class: "resultado__vacio" }, "Escribí cuánto pagás y acá aparece el nuevo monto.")];

  const base = sumarMeses(inicio, -rezago);
  if (base < ipc.primero) {
    return [el("p", { class: "resultado__error" }, "La serie del IPC empieza en " + nombre(ipc.primero) +
      ". Elegí " + nombre(sumarMeses(ipc.primero, rezago)) + " o una fecha posterior.")];
  }
  if (base > ipc.ultimo) {
    return [el("p", { class: "resultado__error" }, "Para " + nombre(inicio) +
      " todavía no hay IPC publicado. El último es el de " + nombre(ipc.ultimo) + ".")];
  }

  const r = ipc.ajustes(m, inicio, frecuencia, rezago);
  const nodos = [];
  let mensaje;

  if (r.lista.length) {
    const a = r.lista[r.lista.length - 1];
    const usados = [];
    for (let p = sumarMeses(a.base, 1); p <= a.fin; p = sumarMeses(p, 1)) usados.push(mesDe(p) + " (" + pct(ipc.variacion(p)) + ")");
    nodos.push(
      el("p", { class: "resultado__frase" }, "Desde " + nombre(a.mes) + " vas a pagar"),
      el("p", { class: "resultado__monto" }, pesos(a.monto)),
      el("p", { class: "resultado__detalle" },
        "Son " + pesos(a.monto - a.anterior) + " más que " + pesos(a.anterior) +
        ", un aumento de " + pct(a.monto / a.anterior - 1) + ". Sale de la inflación de " + enumerar(usados) + "."),
    );
    if (r.lista.length > 1) {
      const tabla = el("table", { class: "cadena" });
      tabla.append(el("tr", {}, el("td", {}, nombre(inicio)), el("td", {}, pesos(m))));
      for (const x of r.lista) tabla.append(el("tr", {}, el("td", {}, nombre(x.mes)), el("td", {}, pesos(x.monto))));
      nodos.push(el("p", { class: "resultado__detalle" },
        "Desde " + nombre(inicio) + " tu contrato tuvo " + r.lista.length + " ajustes:"), tabla);
    }
    nodos.push(el("p", { class: "resultado__detalle" },
      "El siguiente es en " + nombre(r.proximo) + " y se puede calcular cuando salga el IPC de " + nombre(r.fin) + "."));
    mensaje = "Mi alquiler pasa de " + pesos(a.anterior) + " a " + pesos(a.monto) +
      " desde " + nombre(a.mes) + ", un aumento de " + pct(a.monto / a.anterior - 1) + " por IPC.";
  } else {
    const est = ipc.estimar(r.monto, r.base, r.fin);
    nodos.push(
      el("p", { class: "resultado__frase" }, "Desde " + nombre(r.proximo) + " pagarías alrededor de"),
      el("p", { class: "resultado__monto" }, pesos(est)),
      el("p", { class: "resultado__detalle" },
        "Es una estimación: falta el IPC de " + nombre(r.fin) + ". Hasta que salga, usamos el promedio de los últimos tres meses."),
    );
    mensaje = "Mi alquiler pasaría a unos " + pesos(est) + " desde " + nombre(r.proximo) + ", estimado por IPC.";
  }

  nodos.push(acciones(mensaje + " Lo calculé en Alquipc."));
  return nodos;
}

function acciones(texto) {
  const wa = el("a", { href: "https://wa.me/?text=" + encodeURIComponent(texto), target: "_blank", rel: "noopener" }, "Mandar por WhatsApp");
  const copiar = el("button", { type: "button" }, "Copiar el resultado");
  copiar.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(texto); copiar.textContent = "Copiado"; }
    catch { copiar.textContent = "No se pudo copiar"; }
    setTimeout(() => (copiar.textContent = "Copiar el resultado"), 1800);
  });
  return el("div", { class: "acciones" }, wa, copiar);
}
