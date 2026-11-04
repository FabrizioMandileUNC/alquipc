// Los datos de la calculadora viven en la URL (para compartir el cálculo) y en el
// navegador (para encontrarlos al volver). La URL gana sobre lo guardado.
const CLAVE = "alquipc:calculadora";

const PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; }
}

// Valida cada valor por separado: uno roto no tira abajo a los demás.
export function leerEstado(porDefecto, ipc) {
  const url = new URLSearchParams(location.search);
  const guardado = leerGuardado();
  const tomar = (clave) => url.get(clave) ?? guardado[clave];
  const estado = { ...porDefecto };

  const monto = Number(tomar("monto"));
  if (Number.isFinite(monto) && monto > 0 && monto < 1e12) estado.monto = monto;

  const desde = PERIODO.exec(String(tomar("desde") ?? ""));
  if (desde && desde[1] >= ipc.primero.slice(0, 4)) estado.inicio = desde[1] + desde[2];

  const cada = Number(tomar("cada"));
  if (Number.isInteger(cada) && cada >= 1 && cada <= 24) estado.frecuencia = cada;

  const rezago = Number(tomar("ipc"));
  if (rezago === 1 || rezago === 2) estado.rezago = rezago;
  return estado;
}

const aParams = (e) => new URLSearchParams({
  monto: String(e.monto),
  desde: e.inicio.slice(0, 4) + "-" + e.inicio.slice(4),
  cada: String(e.frecuencia),
  ipc: String(e.rezago),
});

export function guardarEstado(e) {
  if (isNaN(e.monto)) {
    history.replaceState(null, "", location.pathname + location.hash);
    return;
  }
  const params = aParams(e);
  history.replaceState(null, "", location.pathname + "?" + params + location.hash);
  try { localStorage.setItem(CLAVE, JSON.stringify(Object.fromEntries(params))); } catch { /* modo privado o lleno */ }
}

// El enlace para compartir: la dirección actual sin el #.
export const enlace = () => location.origin + location.pathname + location.search;
