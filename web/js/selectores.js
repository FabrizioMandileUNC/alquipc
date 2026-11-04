// Campos de la frase que abren un panel: mes y año, frecuencia, lista de opciones.
import { el } from "./dom.js";
import { MESES, anioDe, nombre, periodo, textoMeses, cantidadMeses } from "./periodos.js";

// --- Panel flotante compartido ---------------------------------------------
// Se inserta justo después del botón que lo abre, así el orden del Tab sigue la frase.
const panel = el("div", { class: "panel", id: "panel-selector", role: "dialog", hidden: "" });
let duenio = null;

function abrirPanel(boton, titulo, pintar) {
  if (duenio === boton) return cerrarPanel(true);
  cerrarPanel(false);
  boton.after(panel);
  duenio = boton;
  panel.setAttribute("aria-label", titulo);
  boton.setAttribute("aria-expanded", "true");
  panel.hidden = false;
  pintar();
  ubicar(boton);
  (panel.querySelector('[tabindex="0"]') || panel.querySelector("button:not(:disabled)")).focus();
}

// Debajo del botón, o arriba si no entra. En pantallas chicas el CSS lo vuelve una hoja inferior.
function ubicar(boton) {
  const r = boton.getBoundingClientRect();
  const ancho = panel.offsetWidth, alto = panel.offsetHeight;
  const izq = Math.min(Math.max(16, r.left), document.documentElement.clientWidth - ancho - 16);
  const arriba = r.bottom + alto + 8 > innerHeight && r.top > alto + 8;
  panel.style.left = izq + scrollX + "px";
  panel.style.top = (arriba ? r.top - alto - 8 : r.bottom + 8) + scrollY + "px";
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
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && duenio) cerrarPanel(true); });
// Si el foco sale del panel hacia otro elemento (con Tab, por ejemplo), se cierra.
panel.addEventListener("focusout", (ev) => {
  if (duenio && ev.relatedTarget && !panel.contains(ev.relatedTarget) && ev.relatedTarget !== duenio) cerrarPanel(false);
});
// En el celular, abrir el teclado o esconder la barra del navegador cambia solo el alto.
let anchoVentana = innerWidth;
window.addEventListener("resize", () => {
  if (innerWidth !== anchoVentana) { anchoVentana = innerWidth; cerrarPanel(false); }
});

function prepararBoton(boton) {
  boton.setAttribute("aria-haspopup", "dialog");
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-controls", panel.id);
}

// Flechas, Inicio y Fin dentro de una grilla de botones. Solo uno queda en el orden
// del Tab; el resto se alcanza con las flechas.
function grillaNavegable(grilla, columnas, extra = {}) {
  const botones = () => [...grilla.querySelectorAll("button")];
  const activo = botones().find((b) => b.matches('[aria-current="date"], [aria-pressed="true"]') && !b.disabled)
    || botones().find((b) => !b.disabled);
  botones().forEach((b) => b.setAttribute("tabindex", b === activo ? "0" : "-1"));

  grilla.addEventListener("keydown", (ev) => {
    if (extra[ev.key]) { ev.preventDefault(); extra[ev.key](); return; }
    const lista = botones();
    const i = lista.indexOf(document.activeElement);
    if (i < 0) return;
    const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columnas, ArrowDown: columnas }[ev.key];
    let j = null;
    if (pasos) {
      for (let k = i + pasos; k >= 0 && k < lista.length; k += pasos) if (!lista[k].disabled) { j = k; break; }
    } else if (ev.key === "Home") {
      j = lista.findIndex((b) => !b.disabled);
    } else if (ev.key === "End") {
      j = lista.length - 1 - [...lista].reverse().findIndex((b) => !b.disabled);
    } else {
      return;
    }
    ev.preventDefault();
    if (j === null || j < 0) return;
    lista[i].setAttribute("tabindex", "-1");
    lista[j].setAttribute("tabindex", "0");
    lista[j].focus();
  });
  return grilla;
}

// --- Mes y año -----------------------------------------------------------------
// Grilla de meses con navegación por año. Tocando el año se ven todos los años para
// saltar directo. `atajos` es una lista opcional de {texto, valor} arriba de todo.
// Devuelve un objeto para cambiar los límites después (por ejemplo, si cambia el rezago).
export function selectorMes(boton, { valor, min, max, etiqueta, atajos = [], alElegir }) {
  prepararBoton(boton);
  const mostrar = () => {
    boton.textContent = nombre(valor);
    boton.setAttribute("aria-label", etiqueta + ": " + nombre(valor));
  };
  const elegir = (p) => { valor = p; mostrar(); cerrarPanel(true); alElegir(p); };

  function filaAtajos() {
    if (!atajos.length) return [];
    const fila = el("div", { class: "panel__atajos" });
    for (const a of atajos) {
      const b = el("button", { type: "button", "aria-pressed": String(a.valor === valor) }, a.texto);
      b.disabled = a.valor < min || a.valor > max;
      b.addEventListener("click", () => elegir(a.valor));
      fila.append(b);
    }
    return [fila];
  }

  function pintarMeses(anio, enfocar = null) {
    const prev = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año anterior" }, "‹");
    const next = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año siguiente" }, "›");
    const titulo = el("button", { type: "button", class: "panel__titulo-anio", "aria-label": "Elegir otro año, ahora " + anio }, String(anio));
    prev.disabled = anio <= anioDe(min);
    next.disabled = anio >= anioDe(max);
    prev.addEventListener("click", () => pintarMeses(anio - 1, "prev"));
    next.addEventListener("click", () => pintarMeses(anio + 1, "next"));
    titulo.addEventListener("click", () => pintarAnios(anio));

    const grilla = el("div", { class: "panel__meses", role: "group", "aria-label": "Meses de " + anio });
    MESES.forEach((m, i) => {
      const p = periodo(anio, i + 1);
      const b = el("button", { type: "button", "aria-label": nombre(p) }, m.slice(0, 3));
      if (p === valor) b.setAttribute("aria-current", "date");
      b.disabled = p < min || p > max;
      b.addEventListener("click", () => elegir(p));
      grilla.append(b);
    });
    const cambiarAnio = (d) => {
      const a = anio + d;
      if (a >= anioDe(min) && a <= anioDe(max)) pintarMeses(a, "grilla");
    };
    grillaNavegable(grilla, 3, { PageUp: () => cambiarAnio(-1), PageDown: () => cambiarAnio(1) });
    panel.replaceChildren(...filaAtajos(), el("div", { class: "panel__anio" }, prev, titulo, next), grilla);

    // Al llegar al primer o último año la flecha se deshabilita: el foco pasa al título.
    if (enfocar === "prev") (prev.disabled ? titulo : prev).focus();
    if (enfocar === "next") (next.disabled ? titulo : next).focus();
    if (enfocar === "grilla") grilla.querySelector('[tabindex="0"]').focus();
  }

  function pintarAnios(actual) {
    const grilla = el("div", { class: "panel__anios", role: "group", "aria-label": "Años" });
    for (let a = anioDe(min); a <= anioDe(max); a++) {
      const b = el("button", { type: "button", "aria-pressed": String(a === actual) }, String(a));
      b.addEventListener("click", () => pintarMeses(a, "grilla"));
      grilla.append(b);
    }
    grillaNavegable(grilla, 4);
    panel.replaceChildren(el("p", { class: "panel__titulo" }, "Elegí el año"), grilla);
    grilla.querySelector('[tabindex="0"]').focus();
  }

  boton.addEventListener("click", () => abrirPanel(boton, etiqueta, () => pintarMeses(anioDe(valor))));
  mostrar();
  return {
    limites(nuevoMin, nuevoMax) { min = nuevoMin; max = nuevoMax; },
  };
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
    const opciones = el("div", { class: "panel__opciones", role: "group", "aria-label": "Frecuencias comunes" });
    for (const n of COMUNES) {
      const b = el("button", { type: "button", "aria-pressed": String(n === valor) }, cantidadMeses(n));
      b.addEventListener("click", () => { elegir(n); cerrarPanel(true); });
      opciones.append(b);
    }
    grillaNavegable(opciones, 3);
    const menos = el("button", { type: "button", "aria-label": "Un mes menos" }, "−");
    const mas = el("button", { type: "button", "aria-label": "Un mes más" }, "+");
    const cuenta = el("output", { "aria-live": "polite" }, cantidadMeses(valor));
    const refrescar = () => {
      cuenta.textContent = cantidadMeses(valor);
      opciones.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(COMUNES[i] === valor)));
      menos.disabled = valor === 1;
      mas.disabled = valor === MAX;
    };
    // Si el botón con foco se deshabilita (llegó a 1 o a 24), el foco pasa al otro.
    const paso = (d, otro) => {
      elegir(Math.min(MAX, Math.max(1, valor + d)));
      refrescar();
      if (document.activeElement.disabled || !panel.contains(document.activeElement)) otro.focus();
    };
    menos.addEventListener("click", () => paso(-1, mas));
    mas.addEventListener("click", () => paso(1, menos));
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
export function selectorOpciones(boton, { valor, titulo, etiqueta, opciones, alElegir }) {
  prepararBoton(boton);
  const mostrar = () => {
    const o = opciones.find((x) => x.valor === valor);
    boton.textContent = o.texto;
    boton.setAttribute("aria-label", etiqueta(o));
  };

  function pintar() {
    const lista = el("div", { class: "panel__lista", role: "group", "aria-label": titulo });
    for (const o of opciones) {
      const b = el("button", { type: "button", "aria-pressed": String(o.valor === valor) }, o.texto, el("small", {}, o.ayuda));
      b.addEventListener("click", () => { valor = o.valor; mostrar(); cerrarPanel(true); alElegir(o.valor); });
      lista.append(b);
    }
    grillaNavegable(lista, 1);
    panel.replaceChildren(el("p", { class: "panel__titulo" }, titulo), lista);
  }

  boton.addEventListener("click", () => abrirPanel(boton, titulo, pintar));
  mostrar();
}
