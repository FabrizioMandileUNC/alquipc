// Sección "Pesos de hoy": lleva un monto de un mes a otro con el IPC.
import { $, campoMonto } from "./dom.js";
import { parsearMontoAR, pct, pesos } from "./formato.js";
import { nombre, sumarMeses } from "./periodos.js";
import { selectorMes } from "./selectores.js";
import { anunciar } from "./anuncios.js";

const EJEMPLO = 100000;

export function iniciarPesosDeHoy(ipc) {
  const monto = $("#monto2"), salida = $("#resultado2"), detalle = $("#detalle2");
  let desde = sumarMeses(ipc.ultimo, -24);
  let hasta = ipc.ultimo;

  // Sin monto escrito, muestra el ejemplo del placeholder en gris para que se entienda.
  function actualizar() {
    const escrito = parsearMontoAR(monto.value);
    const m = isNaN(escrito) ? EJEMPLO : escrito;
    const final = ipc.actualizar(m, desde, hasta);
    salida.textContent = pesos(final);
    salida.classList.toggle("salida--ejemplo", isNaN(escrito));

    let texto;
    if (desde === hasta) texto = "Es el mismo mes, así que el monto no cambia.";
    else if (desde < hasta) texto = "Los precios subieron " + pct(final / m - 1) + " entre " + nombre(desde) + " y " + nombre(hasta) + ".";
    else texto = "Vas hacia atrás: en " + nombre(hasta) + " los precios eran " + pct(1 - final / m) + " más bajos que en " + nombre(desde) + ".";
    detalle.textContent = (isNaN(escrito) ? "Ejemplo con " + pesos(EJEMPLO) + ". Escribí tu monto para calcularlo. " : "") + texto;
    if (!isNaN(escrito)) anunciar(pesos(m) + " de " + nombre(desde) + " valen " + pesos(final) + " en " + nombre(hasta) + ".");
  }

  const haceAnios = (n) => ({ texto: n === 1 ? "Hace 1 año" : "Hace " + n + " años", valor: sumarMeses(ipc.ultimo, -12 * n) });

  campoMonto(monto, actualizar);
  selectorMes($("#desde2"), {
    valor: desde, min: ipc.primero, max: ipc.ultimo, etiqueta: "Mes del monto original",
    atajos: [haceAnios(1), haceAnios(2), haceAnios(5)],
    alElegir: (p) => { desde = p; actualizar(); },
  });
  selectorMes($("#hasta2"), {
    valor: hasta, min: ipc.primero, max: ipc.ultimo, etiqueta: "Mes al que querés llevarlo",
    atajos: [{ texto: "Último dato (" + nombre(ipc.ultimo) + ")", valor: ipc.ultimo }],
    alElegir: (p) => { hasta = p; actualizar(); },
  });
  $("#form-pesos").addEventListener("submit", (ev) => { ev.preventDefault(); monto.blur(); });
  actualizar();
}
