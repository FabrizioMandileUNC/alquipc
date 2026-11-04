// Arranque: carga el IPC y engancha cada sección de la página. Si una sección falla,
// las demás siguen andando.
import { cargarIPC } from "./ipc.js";
import { $, ajustarAnchos } from "./dom.js";
import { pct } from "./formato.js";
import { nombre } from "./periodos.js";
import { iniciarCalculadora } from "./calculadora.js";
import { iniciarInflacion } from "./inflacion.js";
import { iniciarPesosDeHoy } from "./pesos-de-hoy.js";

const SECCIONES = [
  [iniciarCalculadora, "#resultado", "No pudimos armar la calculadora. Probá recargar la página."],
  [iniciarInflacion, "#resumen-ipc", "No pudimos mostrar la inflación de los últimos meses."],
  [iniciarPesosDeHoy, "#detalle2", "No pudimos armar esta calculadora. Probá recargar la página."],
];

function mostrarError(selector, texto) {
  const nodo = $(selector);
  nodo.textContent = texto;
  nodo.classList.add("error-seccion");
}

let ipc;
try {
  ipc = await cargarIPC();
} catch (e) {
  console.error(e);
  for (const [, selector] of SECCIONES) {
    mostrarError(selector, "No pudimos cargar los datos del IPC. Probá recargar la página en un rato.");
  }
  document.querySelectorAll("button.campo").forEach((b) => { b.disabled = true; });
}

if (ipc) {
  for (const [iniciar, selector, texto] of SECCIONES) {
    try { iniciar(ipc); } catch (e) { console.error(e); mostrarError(selector, texto); }
  }
  $("#dato-ipc").textContent = "Último dato publicado: IPC de " + nombre(ipc.ultimo) + ", " + pct(ipc.variacion(ipc.ultimo)) + ".";
  $("#fuente").textContent = ipc.fuente;
  $("#actualizado").textContent = new Date(ipc.actualizado)
    .toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  ajustarAnchos();
  document.fonts?.ready.then(ajustarAnchos);
  window.addEventListener("resize", ajustarAnchos);
}
