// Ayudas mínimas para armar y medir elementos.
import { parsearMonto } from "./formato.js";

export const $ = (sel) => document.querySelector(sel);

export function el(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const h of hijos) e.append(h);
  return e;
}

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

// Input de pesos con separador de miles mientras se escribe.
export function campoMonto(input, alCambiar) {
  input.addEventListener("input", () => {
    const n = parsearMonto(input.value);
    input.value = isNaN(n) ? "" : Math.round(n).toLocaleString("es-AR");
    ajustarAncho(input);
    alCambiar(n);
  });
}
