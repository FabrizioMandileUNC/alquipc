// Ayudas mínimas para armar y medir elementos.
import { parsearMonto, parsearMontoAR } from "./formato.js";

export const $ = (sel) => document.querySelector(sel);

export function el(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const h of hijos) e.append(h);
  return e;
}

export const reducirMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Los inputs de monto miden lo que tienen escrito, para que la frase no tenga huecos.
let medidor;
export function ajustarAncho(input) {
  if (!medidor) {
    medidor = el("span", { "aria-hidden": "true" });
    medidor.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0";
    document.body.append(medidor);
  }
  const cs = getComputedStyle(input);
  for (const prop of ["fontFamily", "fontSize", "fontWeight", "fontStretch", "letterSpacing", "fontVariantNumeric"]) {
    medidor.style[prop] = cs[prop];
  }
  medidor.textContent = input.value || input.placeholder;
  input.style.width = Math.ceil(medidor.getBoundingClientRect().width) + 2 + "px";
}

export const ajustarAnchos = () => document.querySelectorAll(".campo input").forEach(ajustarAncho);

// Escribe `n` con puntos de miles. Si el usuario está escribiendo decimales con coma,
// los respeta, y deja el cursor después del mismo dígito en el que estaba.
function escribirMonto(input, n, { decimalesEscritos = null } = {}) {
  const antes = input.value;
  const cursor = input.selectionStart ?? antes.length;
  const digitosAntes = antes.slice(0, cursor).replace(/\D/g, "").length;

  let texto = Math.trunc(n).toLocaleString("es-AR");
  if (decimalesEscritos !== null) texto += "," + decimalesEscritos;
  else if (n % 1) texto += "," + (n % 1).toFixed(2).slice(2);
  input.value = texto;

  if (document.activeElement !== input) return;
  let pos = 0;
  for (let vistos = 0; pos < texto.length && vistos < digitosAntes; pos++) if (/\d/.test(texto[pos])) vistos++;
  input.setSelectionRange(pos, pos);
}

// Pone un monto desde el código (URL, valor guardado).
export function ponerMonto(input, n) {
  if (Number.isFinite(n)) escribirMonto(input, n);
  ajustarAncho(input);
}

// Input de pesos con separador de miles mientras se escribe.
export function campoMonto(input, alCambiar) {
  input.addEventListener("input", (ev) => {
    const pegado = ev.inputType === "insertFromPaste" || ev.inputType === "insertFromDrop";
    let n = pegado ? parsearMonto(input.value) : parsearMontoAR(input.value);
    if (!isNaN(n)) {
      const coma = pegado ? null : input.value.match(/,(\d{0,2})\d*$/);
      escribirMonto(input, n, { decimalesEscritos: coma ? coma[1] : null });
      n = parsearMontoAR(input.value);
    } else if (!/\d/.test(input.value)) {
      input.value = "";
    }
    ajustarAncho(input);
    alCambiar(n);
  });
}
