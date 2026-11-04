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

  // Para meses sin publicar, el índice se proyecta con el promedio geométrico de los
  // últimos 3 meses.
  const ritmo = Math.pow(serie[ultimo] / serie[sumarMeses(ultimo, -3)], 1 / 3);
  function indice(p) {
    if (tiene(p)) return serie[p];
    let faltan = 0;
    for (let q = ultimo; q < p; q = sumarMeses(q, 1)) faltan++;
    return serie[ultimo] * Math.pow(ritmo, faltan);
  }
  const estimar = (monto, base, fin) => monto * indice(fin) / indice(base);

  // Los próximos `cuantos` ajustes después de `inicio`, marcando cuáles son estimados.
  function proyectar(monto, inicio, frecuencia, rezago, cuantos) {
    const lista = [];
    for (let i = 0; i < cuantos; i++) {
      const proximo = sumarMeses(inicio, frecuencia);
      const base = sumarMeses(inicio, -rezago), fin = sumarMeses(proximo, -rezago);
      monto = estimar(monto, base, fin);
      lista.push({ mes: proximo, monto, estimado: !tiene(fin) });
      inicio = proximo;
    }
    return lista;
  }

  return { serie, fuente, actualizado, periodos, primero, ultimo, tiene, variacion, actualizar, ajustes, estimar, proyectar };
}
