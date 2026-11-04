// Formatos de números y textos para es-AR.

const pesosFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const MONTO_MAXIMO = 1e12;

export const pesos = (n) => pesosFmt.format(n);
export const pct = (fraccion) => pctFmt.format(fraccion * 100) + "%";

const enRango = (n) => (Number.isFinite(n) && n > 0 && n < MONTO_MAXIMO ? n : NaN);

// Monto escrito o pegado de cualquier lado: "450000", "$ 450.000", "450.000,50", "450000.50".
// Misma regla que normalizar_monto en alquipc/calculo.py: con punto y coma, el último es el
// decimal; con uno solo, es de miles si se repite o si lo siguen exactamente tres dígitos.
export function parsearMonto(texto) {
  const limpio = texto.replace(/[\s$]/g, "");
  if (!/^[\d.,]*\d[\d.,]*$/.test(limpio)) return NaN;
  let decimal = null;
  if (limpio.includes(".") && limpio.includes(",")) {
    decimal = limpio.lastIndexOf(",") > limpio.lastIndexOf(".") ? "," : ".";
  } else {
    const sep = limpio.includes(".") ? "." : ",";
    const partes = limpio.split(sep);
    if (partes.length === 2 && partes[1].length !== 3) decimal = sep;
  }
  let s = limpio;
  for (const m of [".", ","]) if (m !== decimal) s = s.split(m).join("");
  return enRango(Number(decimal ? s.replace(decimal, ".") : s));
}

// Monto en el formato del propio input (puntos de miles, coma decimal): mientras se
// escribe "4.5000" es 45000, no 4,5.
export function parsearMontoAR(texto) {
  const s = texto.replace(/[\s$.]/g, "").replace(",", ".");
  return /^\d+(\.\d*)?$/.test(s) ? enRango(Number(s)) : NaN;
}

// ["a", "b", "c"] -> "a, b y c"
export function enumerar(items) {
  return items.length > 1 ? items.slice(0, -1).join(", ") + " y " + items[items.length - 1] : items[0] || "";
}
