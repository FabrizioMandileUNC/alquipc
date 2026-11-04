// Períodos mensuales en formato AAAAMM ("202607") y sus nombres en castellano.

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function sumarMeses(p, n) {
  const t = Number(p.slice(0, 4)) * 12 + Number(p.slice(4)) - 1 + n;
  return String(Math.floor(t / 12)) + String((t % 12) + 1).padStart(2, "0");
}

export const anioDe = (p) => Number(p.slice(0, 4));
export const mesDe = (p) => MESES[Number(p.slice(4)) - 1];
export const nombre = (p) => mesDe(p) + " de " + p.slice(0, 4);
export const corto = (p) => mesDe(p).slice(0, 3) + " " + p.slice(2, 4);
export const periodo = (anio, mes) => anio + String(mes).padStart(2, "0");

// "cada mes" / "cada 3 meses"
export const textoMeses = (n) => (n === 1 ? "mes" : n + " meses");
// "1 mes" / "3 meses"
export const cantidadMeses = (n) => n + (n === 1 ? " mes" : " meses");
