// Formatos de números y textos para es-AR.

const pesosFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const pesos = (n) => pesosFmt.format(n);
export const pct = (fraccion) => pctFmt.format(fraccion * 100) + "%";

// Acepta "450000", "$ 450.000", "450.000,50". Devuelve NaN si no es un monto positivo.
export function parsearMonto(texto) {
  const n = Number(texto.replace(/[^\d,]/g, "").replace(",", "."));
  return n > 0 ? n : NaN;
}

// ["a", "b", "c"] -> "a, b y c"
export function enumerar(items) {
  return items.length > 1 ? items.slice(0, -1).join(", ") + " y " + items[items.length - 1] : items[0] || "";
}
