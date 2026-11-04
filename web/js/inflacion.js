// Sección "Inflación mes a mes": resumen en una oración y gráfico de barras.
import { $, el } from "./dom.js";
import { pct } from "./formato.js";
import { corto, nombre, sumarMeses } from "./periodos.js";

const MESES_EN_GRAFICO = 24;

export function iniciarInflacion(ipc) {
  const { serie, ultimo } = ipc;

  const partes = [el("b", {}, "En " + nombre(ultimo) + " los precios subieron " + pct(ipc.variacion(ultimo)) + ".")];
  const haceUnAnio = sumarMeses(ultimo, -12), dic = (Number(ultimo.slice(0, 4)) - 1) + "12";
  if (ipc.tiene(haceUnAnio)) partes.push(" En los últimos doce meses, " + pct(serie[ultimo] / serie[haceUnAnio] - 1));
  if (ipc.tiene(dic) && ultimo.slice(4) !== "12") partes.push(", y en lo que va de " + ultimo.slice(0, 4) + ", " + pct(serie[ultimo] / serie[dic] - 1));
  partes.push(".");
  $("#resumen-ipc").replaceChildren(...partes);

  grafico(ipc, ipc.periodos.slice(-MESES_EN_GRAFICO));
}

// Un solo elemento con foco: las flechas recorren los meses, y con el dedo o el mouse
// alcanza con pasar por encima.
function grafico(ipc, meses) {
  const barras = $("#barras"), lectura = $("#lectura");
  const vars = meses.map(ipc.variacion);
  const max = Math.max(...vars);
  const iMax = vars.indexOf(max);
  const promedio = vars.reduce((a, b) => a + b, 0) / vars.length;
  const ultima = meses.length - 1;
  let activa = ultima;

  barras.setAttribute("role", "img");
  barras.setAttribute("tabindex", "0");
  barras.setAttribute("aria-label", "Inflación mensual de " + nombre(meses[0]) + " a " + nombre(meses[ultima]) +
    ". El pico fue " + pct(max) + " en " + nombre(meses[iMax]) + ". Usá las flechas para recorrer los meses.");

  const nodos = meses.map((p, i) => {
    const b = el("div", { class: "barra-mes" + (i === ultima ? " es-ultima" : "") });
    const alto = Math.max(0, vars[i] / max * 100) + "%";
    const valor = el("div", { class: "barra-mes__valor" });
    valor.style.height = alto;
    b.append(valor);
    if (i === ultima || i === iMax) {
      const dato = el("span", { class: "barra-mes__dato", "aria-hidden": "true" }, pct(vars[i]));
      dato.style.bottom = alto;
      b.append(dato);
    }
    if ((ultima - i) % 6 === 0) b.append(el("span", { class: "barra-mes__eje", "aria-hidden": "true" }, corto(p)));
    return b;
  });
  const referencia = el("div", { class: "grafico__promedio", "aria-hidden": "true" },
    el("span", {}, "promedio " + pct(promedio)));
  referencia.style.bottom = promedio / max * 100 + "%";
  barras.replaceChildren(...nodos, referencia);

  const leer = (i) => {
    nodos[activa].classList.remove("es-activa");
    activa = i;
    nodos[i].classList.add("es-activa");
    lectura.replaceChildren(el("b", {}, pct(vars[i])), " en " + nombre(meses[i]));
  };
  const indiceEn = (x) => {
    const r = barras.getBoundingClientRect();
    return Math.min(ultima, Math.max(0, Math.floor((x - r.left) / r.width * meses.length)));
  };

  barras.addEventListener("pointermove", (ev) => leer(indiceEn(ev.clientX)));
  barras.addEventListener("pointerdown", (ev) => leer(indiceEn(ev.clientX)));
  barras.addEventListener("pointerleave", () => leer(ultima));
  barras.addEventListener("keydown", (ev) => {
    const destino = { ArrowLeft: activa - 1, ArrowRight: activa + 1, Home: 0, End: ultima }[ev.key];
    if (destino === undefined) return;
    ev.preventDefault();
    leer(Math.min(ultima, Math.max(0, destino)));
  });
  leer(ultima);
}
