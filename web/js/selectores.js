// Campos de la frase que abren un panel: mes y año, frecuencia, lista de opciones.
import { el } from "./dom.js";
import { MESES, anioDe, nombre, periodo, textoMeses, cantidadMeses } from "./periodos.js";

// --- Panel flotante compartido ---------------------------------------------
const panel = el("div", { class: "panel", role: "dialog", hidden: "" });
let duenio = null;

function abrirPanel(boton, titulo, pintar) {
  if (duenio === boton) return cerrarPanel(true);
  cerrarPanel(false);
  if (!panel.isConnected) document.body.append(panel);
  duenio = boton;
  panel.setAttribute("aria-label", titulo);
  boton.setAttribute("aria-expanded", "true");
  panel.hidden = false;
  pintar();
  const r = boton.getBoundingClientRect();
  const izq = Math.min(Math.max(16, r.left), document.documentElement.clientWidth - panel.offsetWidth - 16);
  panel.style.left = izq + scrollX + "px";
  panel.style.top = r.bottom + scrollY + 8 + "px";
  (panel.querySelector('[aria-pressed="true"]') || panel.querySelector("button:not(:disabled)")).focus();
}

function cerrarPanel(devolverFoco) {
  if (!duenio) return;
  const b = duenio;
  duenio = null;
  panel.hidden = true;
  b.setAttribute("aria-expanded", "false");
  if (devolverFoco) b.focus();
}

document.addEventListener("pointerdown", (ev) => {
  if (duenio && !panel.contains(ev.target) && !duenio.contains(ev.target)) cerrarPanel(false);
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrarPanel(true); });
window.addEventListener("resize", () => cerrarPanel(false));

function prepararBoton(boton) {
  boton.setAttribute("aria-haspopup", "dialog");
  boton.setAttribute("aria-expanded", "false");
}

// --- Mes y año -----------------------------------------------------------------
// Grilla de meses con navegación por año. Tocando el año se ven todos los años
// para saltar directo. `atajos` es una lista opcional de {texto, valor} arriba de todo.
export function selectorMes(boton, { valor, min, max, etiqueta, atajos = [], alElegir }) {
  prepararBoton(boton);
  const mostrar = () => {
    boton.textContent = nombre(valor);
    boton.setAttribute("aria-label", etiqueta + ": " + nombre(valor));
  };
  const elegir = (p) => { valor = p; mostrar(); cerrarPanel(true); alElegir(p); };

  function filaAtajos() {
    const fila = el("div", { class: "panel__atajos" });
    for (const a of atajos) {
      const b = el("button", { type: "button", "aria-pressed": String(a.valor === valor) }, a.texto);
      b.disabled = a.valor < min || a.valor > max;
      b.addEventListener("click", () => elegir(a.valor));
      fila.append(b);
    }
    return atajos.length ? [fila] : [];
  }

  function pintarMeses(anio) {
    const prev = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año anterior" }, "‹");
    const next = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año siguiente" }, "›");
    const titulo = el("button", { type: "button", class: "panel__titulo-anio", "aria-label": "Elegir otro año, ahora " + anio }, String(anio));
    prev.disabled = anio <= anioDe(min);
    next.disabled = anio >= anioDe(max);
    prev.addEventListener("click", () => { pintarMeses(anio - 1); panel.querySelector(".panel__flecha").focus(); });
    next.addEventListener("click", () => { pintarMeses(anio + 1); panel.querySelectorAll(".panel__flecha")[1].focus(); });
    titulo.addEventListener("click", () => pintarAnios(anio));

    const grilla = el("div", { class: "panel__meses" });
    MESES.forEach((m, i) => {
      const p = periodo(anio, i + 1);
      const b = el("button", { type: "button", "aria-pressed": String(p === valor), "aria-label": nombre(p) }, m.slice(0, 3));
      b.disabled = p < min || p > max;
      b.addEventListener("click", () => elegir(p));
      grilla.append(b);
    });
    panel.replaceChildren(...filaAtajos(), el("div", { class: "panel__anio" }, prev, titulo, next), grilla);
  }

  function pintarAnios(actual) {
    const grilla = el("div", { class: "panel__anios" });
    for (let a = anioDe(min); a <= anioDe(max); a++) {
      const b = el("button", { type: "button", "aria-pressed": String(a === actual) }, String(a));
      b.addEventListener("click", () => {
        pintarMeses(a);
        panel.querySelector(".panel__meses button:not(:disabled)").focus();
      });
      grilla.append(b);
    }
    panel.replaceChildren(el("p", { class: "panel__titulo" }, "Elegí el año"), grilla);
    grilla.querySelector('[aria-pressed="true"]').focus();
  }

  boton.addEventListener("click", () => abrirPanel(boton, etiqueta, () => pintarMeses(anioDe(valor))));
  mostrar();
}

// --- Frecuencia ----------------------------------------------------------------
// Valores comunes y un contador para el resto.
export function selectorFrecuencia(boton, { valor, alElegir }) {
  prepararBoton(boton);
  const COMUNES = [1, 2, 3, 4, 6, 12];
  const MAX = 24;
  const mostrar = () => {
    boton.textContent = textoMeses(valor);
    boton.setAttribute("aria-label", "Frecuencia de ajuste: cada " + textoMeses(valor));
  };
  const elegir = (n) => { valor = n; mostrar(); alElegir(n); };

  function pintar() {
    const opciones = el("div", { class: "panel__opciones" });
    for (const n of COMUNES) {
      const b = el("button", { type: "button", "aria-pressed": String(n === valor) }, cantidadMeses(n));
      b.addEventListener("click", () => { elegir(n); cerrarPanel(true); });
      opciones.append(b);
    }
    const menos = el("button", { type: "button", "aria-label": "Un mes menos" }, "−");
    const mas = el("button", { type: "button", "aria-label": "Un mes más" }, "+");
    const cuenta = el("output", { "aria-live": "polite" }, cantidadMeses(valor));
    const refrescar = () => {
      cuenta.textContent = cantidadMeses(valor);
      opciones.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(COMUNES[i] === valor)));
      menos.disabled = valor === 1;
      mas.disabled = valor === MAX;
    };
    const paso = (d) => { elegir(Math.min(MAX, Math.max(1, valor + d))); refrescar(); };
    menos.addEventListener("click", () => paso(-1));
    mas.addEventListener("click", () => paso(1));
    refrescar();
    panel.replaceChildren(
      el("p", { class: "panel__titulo" }, "Cada cuánto ajusta el contrato"),
      opciones,
      el("div", { class: "panel__otro" }, el("span", {}, "Otra cantidad"),
        el("div", { class: "panel__stepper" }, menos, cuenta, mas)),
    );
  }

  boton.addEventListener("click", () => abrirPanel(boton, "Frecuencia de ajuste", pintar));
  mostrar();
}

// --- Lista de opciones -----------------------------------------------------------
// Cada opción con una explicación corta debajo.
export function selectorOpciones(boton, { valor, titulo, opciones, alElegir }) {
  prepararBoton(boton);
  const mostrar = () => { boton.textContent = opciones.find((o) => o.valor === valor).texto; };

  function pintar() {
    const lista = el("div", { class: "panel__lista" });
    for (const o of opciones) {
      const b = el("button", { type: "button", "aria-pressed": String(o.valor === valor) }, o.texto, el("small", {}, o.ayuda));
      b.addEventListener("click", () => { valor = o.valor; mostrar(); cerrarPanel(true); alElegir(o.valor); });
      lista.append(b);
    }
    panel.replaceChildren(el("p", { class: "panel__titulo" }, titulo), lista);
  }

  boton.addEventListener("click", () => abrirPanel(boton, titulo, pintar));
  mostrar();
}
