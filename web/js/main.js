// Arranque: carga el IPC y engancha cada sección de la página.
import { cargarIPC } from "./ipc.js";
import { $, ajustarAnchos } from "./dom.js";
import { iniciarCalculadora } from "./calculadora.js";
import { iniciarInflacion } from "./inflacion.js";
import { iniciarPesosDeHoy } from "./pesos-de-hoy.js";

try {
  const ipc = await cargarIPC();
  iniciarCalculadora(ipc);
  iniciarInflacion(ipc);
  iniciarPesosDeHoy(ipc);

  $("#fuente").textContent = ipc.fuente;
  $("#actualizado").textContent = new Date(ipc.actualizado)
    .toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  ajustarAnchos();
  document.fonts?.ready.then(ajustarAnchos);
  window.addEventListener("resize", ajustarAnchos);
} catch (e) {
  console.error(e);
  $("#resultado").textContent = "No pudimos cargar los datos del IPC. Probá recargar la página en un rato.";
}
