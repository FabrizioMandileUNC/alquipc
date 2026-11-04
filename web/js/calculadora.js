// Sección principal: "Pago $X por mes desde M y el contrato ajusta cada N meses."
import { $, el, campoMonto, ponerMonto, reducirMovimiento } from "./dom.js";
import { enumerar, parsearMontoAR, pct, pesos } from "./formato.js";
import { mesDe, nombre, sumarMeses } from "./periodos.js";
import { selectorFrecuencia, selectorMes, selectorOpciones } from "./selectores.js";
import { anunciar } from "./anuncios.js";
import { leerEstado, guardarEstado, enlace } from "./estado.js";

export function iniciarCalculadora(ipc) {
  const monto = $("#monto");
  const salida = $("#resultado");
  const pista = $("#pista");

  // Por defecto, un inicio cuyo próximo ajuste trimestral ya se puede calcular.
  const estado = leerEstado({ monto: NaN, inicio: sumarMeses(ipc.ultimo, -1), frecuencia: 3, rezago: 2 }, ipc);
  const limitesInicio = () => [sumarMeses(ipc.primero, estado.rezago), sumarMeses(ipc.ultimo, estado.rezago)];
  let primeraVez = true;

  function calcular() {
    estado.monto = parsearMontoAR(monto.value);
    const r = resultado(ipc, estado);
    salida.replaceChildren(...r.nodos);
    guardarEstado(estado);
    anunciar(r.anuncio);
    // La marca del resaltador se dibuja una sola vez, con el primer resultado.
    const monto_ = salida.querySelector(".resultado__monto");
    if (monto_ && primeraVez && !reducirMovimiento()) { monto_.classList.add("entra"); primeraVez = false; }
  }
  const tocado = () => { pista.hidden = true; };

  ponerMonto(monto, estado.monto);
  campoMonto(monto, () => { tocado(); calcular(); });
  const inicio = selectorMes($("#inicio"), {
    valor: estado.inicio, min: limitesInicio()[0], max: limitesInicio()[1],
    etiqueta: "Mes desde el que pagás ese monto",
    alElegir: (p) => { estado.inicio = p; tocado(); calcular(); },
  });
  selectorFrecuencia($("#frecuencia"), {
    valor: estado.frecuencia,
    alElegir: (n) => { estado.frecuencia = n; tocado(); calcular(); },
  });
  selectorOpciones($("#rezago"), {
    valor: estado.rezago,
    titulo: "Qué IPC toma tu contrato",
    etiqueta: (o) => "IPC que toma el contrato: el de " + o.texto + " antes del ajuste",
    opciones: [
      { valor: 2, texto: "dos meses", ayuda: "Lo más común: al ajustar, el último IPC publicado es el de dos meses antes." },
      { valor: 1, texto: "un mes", ayuda: "Si tu contrato ajusta después de mitad de mes con el IPC recién salido." },
    ],
    alElegir: (v) => { estado.rezago = v; inicio.limites(...limitesInicio()); tocado(); calcular(); },
  });

  // Enter en el monto: en el celular, cierra el teclado y muestra el resultado.
  $("#form-alquiler").addEventListener("submit", (ev) => {
    ev.preventDefault();
    monto.blur();
    salida.scrollIntoView({ block: "nearest", behavior: reducirMovimiento() ? "auto" : "smooth" });
  });

  if (!isNaN(estado.monto)) tocado();
  calcular();
}

// Arma el bloque de resultado y la frase que se anuncia a lectores de pantalla.
function resultado(ipc, estado) {
  const { monto: m, inicio, frecuencia, rezago } = estado;
  if (isNaN(m)) {
    return { nodos: [el("p", { class: "resultado__vacio" }, "Escribí cuánto pagás y acá aparece el nuevo monto.")], anuncio: "" };
  }

  const base = sumarMeses(inicio, -rezago);
  if (base < ipc.primero || base > ipc.ultimo) {
    const texto = base < ipc.primero
      ? "La serie del IPC empieza en " + nombre(ipc.primero) + ". Elegí " + nombre(sumarMeses(ipc.primero, rezago)) + " o una fecha posterior."
      : "Para " + nombre(inicio) + " todavía no hay IPC publicado. El último es el de " + nombre(ipc.ultimo) + ".";
    return { nodos: [el("p", { class: "resultado__error" }, texto)], anuncio: texto };
  }

  const r = ipc.ajustes(m, inicio, frecuencia, rezago);
  const nodos = [];
  let mensaje, anuncio, desde, actual;

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
    if (r.lista.length > 1) nodos.push(tablaAjustes(inicio, m, r.lista));
    anuncio = "Desde " + nombre(a.mes) + " vas a pagar " + pesos(a.monto) + ", un aumento de " + pct(a.monto / a.anterior - 1) + ".";
    mensaje = "Mi alquiler pasa de " + pesos(a.anterior) + " a " + pesos(a.monto) +
      " desde " + nombre(a.mes) + ", un aumento de " + pct(a.monto / a.anterior - 1) + " por IPC.";
    [desde, actual] = [a.mes, a.monto];
  } else {
    const est = ipc.estimar(r.monto, r.base, r.fin);
    nodos.push(
      el("p", { class: "resultado__frase" }, "Desde " + nombre(r.proximo) + " pagarías alrededor de"),
      el("p", { class: "resultado__monto resultado__monto--estimado" }, pesos(est)),
      el("p", { class: "resultado__detalle" },
        "Es una estimación: falta el IPC de " + nombre(r.fin) + ". Hasta que salga, usamos el promedio de los últimos tres meses."),
    );
    anuncio = "Estimación: desde " + nombre(r.proximo) + " pagarías alrededor de " + pesos(est) + ".";
    mensaje = "Mi alquiler pasaría a unos " + pesos(est) + " desde " + nombre(r.proximo) + ", estimado por IPC.";
    [desde, actual] = [r.proximo, est];
  }

  nodos.push(proximos(ipc.proyectar(actual, desde, frecuencia, rezago, 3)));
  nodos.push(acciones(mensaje));
  return { nodos, anuncio };
}

function tablaAjustes(inicio, monto, lista) {
  const tabla = el("table", { class: "cadena" },
    el("caption", {}, "Desde " + nombre(inicio) + " tu contrato tuvo " + lista.length + " ajustes"),
    el("tr", {}, el("th", { scope: "col" }, "Desde"), el("th", { scope: "col" }, "Pagás")),
    el("tr", {}, el("td", {}, nombre(inicio)), el("td", {}, pesos(monto))));
  for (const x of lista) tabla.append(el("tr", {}, el("td", {}, nombre(x.mes)), el("td", {}, pesos(x.monto))));
  return tabla;
}

// Lo que viene, para poder planificar. Los que dependen de IPC sin publicar van marcados.
function proximos(lista) {
  const tabla = el("table", { class: "proximos" },
    el("caption", {}, "Los próximos ajustes, si la inflación sigue como en los últimos tres meses"));
  for (const x of lista) {
    tabla.append(el("tr", {},
      el("th", { scope: "row" }, nombre(x.mes)),
      el("td", {}, (x.estimado ? "alrededor de " : "") + pesos(x.monto))));
  }
  return tabla;
}

function acciones(mensaje) {
  const url = enlace();
  const texto = mensaje + " Lo calculé en Alquipc: " + url;
  const botones = [el("a", { href: "https://wa.me/?text=" + encodeURIComponent(texto), target: "_blank", rel: "noopener noreferrer" }, "Mandar por WhatsApp")];

  if (navigator.share) {
    const compartir = el("button", { type: "button" }, "Compartir");
    compartir.addEventListener("click", () => navigator.share({ title: "Alquipc", text: mensaje, url }).catch(() => {}));
    botones.push(compartir);
  }
  const copiar = el("button", { type: "button" }, "Copiar");
  copiar.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(texto);
      copiar.textContent = "Copiado";
      anunciar("Copiado el resultado con el enlace.");
    } catch {
      copiar.textContent = "No se pudo copiar";
    }
    setTimeout(() => (copiar.textContent = "Copiar"), 1800);
  });
  botones.push(copiar);
  return el("div", { class: "acciones" }, ...botones);
}
