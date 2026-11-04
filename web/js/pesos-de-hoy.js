// Sección "Pesos de hoy": lleva un monto viejo al último mes con IPC.
import { $, campoMonto } from "./dom.js";
import { parsearMonto, pct, pesos } from "./formato.js";
import { nombre, sumarMeses } from "./periodos.js";
import { selectorMes } from "./selectores.js";

export function iniciarPesosDeHoy(ipc) {
  const monto = $("#monto2"), salida = $("#resultado2"), detalle = $("#detalle2");
  let desde = sumarMeses(ipc.ultimo, -24);

  function actualizar() {
    const m = parsearMonto(monto.value);
    if (isNaN(m)) { salida.textContent = "…"; detalle.textContent = ""; return; }
    const hoy = ipc.actualizar(m, desde, ipc.ultimo);
    salida.textContent = pesos(hoy);
    detalle.textContent = "En pesos de " + nombre(ipc.ultimo) + ". Los precios subieron " + pct(hoy / m - 1) + " en ese período.";
  }

  campoMonto(monto, actualizar);
  selectorMes($("#desde2"), {
    valor: desde, min: ipc.primero, max: ipc.ultimo, etiqueta: "Mes del monto original",
    alElegir: (p) => { desde = p; actualizar(); },
  });
  $("#form-pesos").addEventListener("submit", (ev) => ev.preventDefault());
}
