// Serie del IPC y cálculos de ajuste. Misma lógica que alquipc/calculo.py.
import { sumarMeses } from "./periodos.js";

export async function cargarIPC(url = "data/ipc.json") {
  const r = await fetch(url);
  if (!r.ok) throw new Error("No se pudo leer " + url + " (HTTP " + r.status + ")");
  return crearIPC(await r.json());
}

export function crearIPC({ serie, fuente, actualizado }) {
  const periodos = Object.keys(serie).sort();
  const primero = periodos[0];
  const ultimo = periodos[periodos.length - 1];

  const tiene = (p) => p in serie;
  const variacion = (p) => serie[p] / serie[sumarMeses(p, -1)] - 1;
  // Lleva un monto del período `desde` al `hasta`.
  const actualizar = (monto, desde, hasta) => monto * serie[hasta] / serie[desde];

  // Ajustes ya calculables con datos publicados, encadenados desde `inicio`.
  // `rezago` es cuántos meses antes del ajuste se toma el índice.
  function ajustes(monto, inicio, frecuencia, rezago) {
    const lista = [];
    for (;;) {
      const proximo = sumarMeses(inicio, frecuencia);
      const base = sumarMeses(inicio, -rezago), fin = sumarMeses(proximo, -rezago);
      if (!tiene(base) || !tiene(fin)) return { lista, proximo, base, fin, monto };
      const nuevo = actualizar(monto, base, fin);
      lista.push({ mes: proximo, anterior: monto, monto: nuevo, base, fin });
      monto = nuevo;
      inicio = proximo;
    }
  }

  // Estimación para meses sin publicar: promedio geométrico de los últimos 3.
  function estimar(monto, base, fin) {
    const prom = Math.pow(serie[ultimo] / serie[sumarMeses(ultimo, -3)], 1 / 3);
    let faltan = 0;
    for (let p = ultimo; p < fin; p = sumarMeses(p, 1)) faltan++;
    return actualizar(monto, base, ultimo) * Math.pow(prom, faltan);
  }

  return { serie, fuente, actualizado, periodos, primero, ultimo, tiene, variacion, actualizar, ajustes, estimar };
}
