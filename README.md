# Alquipc

Calculadora de ajuste de alquiler por IPC con datos oficiales del INDEC. Página estática en `web/`.

## Datos

`python actualizar_datos.py` baja la serie del IPC nivel general nacional y escribe `web/data/ipc.js`.

- Con `INDEC_TOKEN` en `.env` usa la [API del INDEC](https://api.indec.gob.ar/v1/) (`/ipc_nacional`).
  Correr antes `python explorar.py` para verificar los filtros de `indec.py`.
- Sin token usa la serie pública de datos.gob.ar, que tiene el mismo índice pero con unas semanas de demora.

El token nunca va a la página: solo lo usa el script.

## Ver la página

Abrí `web/index.html` en el navegador, o servila con `python -m http.server 8765 --directory web`.
Para publicarla alcanza con subir la carpeta `web/` a GitHub Pages, Netlify o Cloudflare Pages
y correr `actualizar_datos.py` cada vez que sale un IPC.

## Cálculo

Nuevo monto = monto × IPC(mes del ajuste − 2) / IPC(mes de inicio − 2). El rezago de 2 meses es
porque el IPC de un mes sale a mediados del siguiente; en la página se puede cambiar a 1 mes.
La lógica está en `web/app.js` y es la misma que `calculo.py` (tests: `python -m unittest test_calculo`).

## Bot de Telegram (opcional)

`bot.py` es la primera versión: avisa por Telegram cuando sale el IPC. Necesita `TELEGRAM_TOKEN`.
