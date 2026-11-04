// Sección "Inflación mes a mes": resumen en una oración y gráfico de barras.
import { $, el } from "./dom.js";
import { pct } from "./formato.js";
import { corto, nombre, sumarMeses } from "./periodos.js";

export function iniciarInflacion(ipc) {
  const { serie, ultimo } = ipc;

  const partes = [el("b", {}, "En " + nombre(ultimo) + " los precios subieron " + pct(ipc.variacion(ultimo)) + ".")];
  const haceUnAnio = sumarMeses(ultimo, -12), dic = (Number(ultimo.slice(0, 4)) - 1) + "12";
  if (ipc.tiene(haceUnAnio)) partes.push(" En los últimos doce meses, " + pct(serie[ultimo] / serie[haceUnAnio] - 1));
  if (ipc.tiene(dic) && ultimo.slice(4) !== "12") partes.push(", y en lo que va de " + ultimo.slice(0, 4) + ", " + pct(serie[ultimo] / serie[dic] - 1));
  partes.push(".");
  $("#resumen-ipc").append(...partes);

  const barras = $("#barras"), lectura = $("#lectura");
  const ultimos = ipc.periodos.slice(-24);
  const vars = ultimos.map(ipc.variacion);
  const max = Math.max(...vars);
  const leer = (i) => lectura.replaceChildren(el("b", {}, pct(vars[i])), " en " + nombre(ultimos[i]));

  ultimos.forEach((p, i) => {
    const b = el("div", { class: "barra-mes" + (i === ultimos.length - 1 ? " es-ultima" : ""), role: "listitem", tabindex: "0",
      "aria-label": nombre(p) + ": " + pct(vars[i]) });
    b.append(el("div", { class: "barra-mes__valor", style: "height:" + Math.max(0, vars[i] / max * 100) + "%" }));
    if ((ultimos.length - 1 - i) % 6 === 0) b.append(el("span", { class: "barra-mes__eje" }, corto(p)));
    b.addEventListener("mouseenter", () => leer(i));
    b.addEventListener("focus", () => leer(i));
    barras.append(b);
  });
  barras.addEventListener("mouseleave", () => leer(ultimos.length - 1));
  leer(ultimos.length - 1);
}
