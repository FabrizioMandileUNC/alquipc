# Alquipc

Calculadora de ajuste de alquiler por IPC con datos oficiales del INDEC.

## Estructura

```
web/                    Página estática (lo que se publica)
  index.html
  css/styles.css
  js/
    main.js             Arranque: carga el IPC y engancha cada sección
    ipc.js              Serie del IPC y cálculos de ajuste
    periodos.js         Meses AAAAMM y sus nombres
    formato.js          Pesos, porcentajes y parseo de montos
    dom.js              Ayudas de DOM e inputs de monto
    selectores.js       Paneles de mes, frecuencia y opciones
    estado.js           Datos de la calculadora en la URL y en el navegador
    anuncios.js         Línea para lectores de pantalla
    calculadora.js      Sección "¿cuánto sube tu alquiler?"
    inflacion.js        Resumen y gráfico de inflación
    pesos-de-hoy.js     Sección "Pesos de hoy"
  data/ipc.json         Serie del IPC (la genera scripts/actualizar_datos.py)
alquipc/                Paquete Python compartido
  indec.py              Cliente de la API del INDEC
  calculo.py            Cálculos de ajuste (misma lógica que web/js/ipc.js)
scripts/
  actualizar_datos.py   Baja el IPC y escribe web/data/ipc.json
  explorar.py           Muestra qué trae la API, para revisar los filtros
bot/                    Bot de Telegram opcional
tests/
```

## Primeros pasos

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
cp .env.example .env    # completar INDEC_TOKEN
```

Todos los comandos se corren desde la raíz del proyecto.

| Para | Comando |
|---|---|
| Actualizar los datos | `python -m scripts.actualizar_datos` |
| Revisar los filtros de la API | `python -m scripts.explorar` |
| Ver la página | `python -m http.server 8765 --directory web` y abrir http://localhost:8765 |
| Correr los tests | `python -m unittest discover -s tests -t .` |
| Levantar el bot | `python -m bot.bot` (necesita `TELEGRAM_TOKEN`) |

La página usa módulos de JavaScript, así que hay que abrirla desde un servidor (no con doble clic).

## Datos

Con `INDEC_TOKEN` en `.env`, `actualizar_datos` usa la [API del INDEC](https://api.indec.gob.ar/v1/) (`/ipc_nacional`).
Sin token usa la serie pública de datos.gob.ar, que tiene el mismo índice con unas semanas de demora.
El token nunca llega a la página: solo lo usa el script.

## Cálculo

Nuevo monto = monto × IPC(mes del ajuste − 2) / IPC(mes de inicio − 2). El rezago de 2 meses es
porque el IPC de un mes sale a mediados del siguiente; en la página se puede cambiar a 1 mes.

## Actualización automática

`.github/workflows/actualizar-ipc.yml` corre todos los días a las 18:30 (hora argentina) en
GitHub Actions. Si el INDEC publicó un IPC nuevo, actualiza `web/data/ipc.json` y lo sube con
un commit. También se puede correr a mano desde la pestaña Actions ("Run workflow").

Necesita el token como secreto del repositorio:

```bash
gh secret set INDEC_TOKEN
```

(pide el valor y lo guarda cifrado en GitHub; no queda en el código).

## Publicar

Alcanza con subir la carpeta `web/` a GitHub Pages, Netlify o Cloudflare Pages y correr
`actualizar_datos` cada vez que sale un IPC.
