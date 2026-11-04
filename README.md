# Alquipc

Calculadora de ajuste de alquiler por IPC, con los datos oficiales del INDEC.

**Usala en https://fabriziomandileunc.github.io/alquipc/**

Escribís cuánto pagás, desde qué mes y cada cuánto ajusta tu contrato, y te dice cuánto vas
a pagar en el próximo ajuste, con la inflación de cada mes que entra en la cuenta.

## Qué hace

- **Calculadora de alquiler.** Se completa como una frase: "Pago $450.000 por mes desde agosto
  de 2026 y el contrato ajusta cada 3 meses". Muestra el nuevo monto, cuánto sube, los meses de
  inflación usados y los próximos tres ajustes (estimados si el IPC todavía no salió). Si la
  fecha es vieja, aplica todos los ajustes que pasaron, uno detrás de otro.
- **Frecuencia y desfasaje a elección.** Ajustes cada 1 a 24 meses, con el IPC de dos meses
  antes del ajuste (lo habitual) o de un mes antes.
- **Compartir.** El cálculo queda en la dirección de la página
  (`?monto=450000&desde=2026-08&cada=3&ipc=2`), así que se puede mandar por WhatsApp o
  copiar el enlace. El navegador también lo recuerda para la próxima visita.
- **Inflación mes a mes.** Variación mensual, interanual y acumulada del año, y un gráfico de
  los últimos 24 meses.
- **Pesos de hoy.** Lleva un monto de un mes a otro: un depósito de garantía, una deuda o un
  precio viejo.

Funciona en el celular, con teclado y con lectores de pantalla, en modo claro y oscuro.

## Cómo se calcula

```
nuevo alquiler = alquiler actual × IPC(mes del ajuste − 2) ÷ IPC(mes de inicio − 2)
```

Se usan dos meses de desfasaje porque el INDEC publica cada IPC a mediados del mes siguiente:
al ajustar el 1 de noviembre, el último dato disponible es el de septiembre. Se usa el índice
de precios al consumidor nivel general, total nacional, base diciembre 2016 = 100.

Alquipc es una herramienta informativa: ante cualquier duda, lo que vale es lo que dice el contrato.

## Datos

La serie sale de la [API del INDEC](https://api.indec.gob.ar/v1/) (tabla `/ipc_nacional`) y
se guarda en `web/data/ipc.json`. La página lee solo ese archivo; nunca se conecta a la API.

Si la API falla o no hay token, `actualizar_datos` usa la serie pública de
[datos.gob.ar](https://datos.gob.ar/), que publica el mismo índice con unas semanas de demora.
Nunca reemplaza el archivo por una serie más corta, y no lo toca si no hay datos nuevos.

### Actualización automática

Todos los días a las 18:30 (hora argentina), GitHub Actions corre
`.github/workflows/actualizar-ipc.yml`. Si el INDEC publicó un IPC nuevo, actualiza
`web/data/ipc.json`, hace un commit y vuelve a publicar el sitio. Si algo falla, GitHub avisa
por mail. También se puede correr a mano desde la pestaña Actions ("Run workflow").

El sitio se publica en GitHub Pages con `.github/workflows/publicar.yml`, cada vez que cambia
algo en `web/`.

## Para desarrollar

Requiere Python 3.13. Todos los comandos se corren desde la raíz del proyecto.

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt    # en macOS o Linux: .venv/bin/pip
cp .env.example .env
```

Para usar la API del INDEC hace falta un token:

1. Registrate en https://api.indec.gob.ar y confirmá el mail con el código que te mandan.
2. Generá el token desde tu perfil (se muestra una sola vez).
3. Pegalo en `.env`, en la línea `INDEC_TOKEN=`.

`.env` está en `.gitignore`. Para la actualización automática, el mismo token va como secreto
del repositorio: `gh secret set INDEC_TOKEN` (pide el valor y lo guarda cifrado en GitHub).

| Para | Comando |
|---|---|
| Ver la página | `python -m http.server 8765 --directory web` y abrir http://localhost:8765 |
| Actualizar los datos | `python -m scripts.actualizar_datos` |
| Revisar qué trae la API | `python -m scripts.explorar` |
| Correr los tests | `python -m unittest discover -s tests -t .` |
| Levantar el bot de Telegram | `python -m bot.bot` |

La página usa módulos de JavaScript, así que hay que abrirla desde un servidor y no con doble clic.
No tiene dependencias ni paso de compilación.

### Estructura

```
web/                      La página (lo único que se publica)
  index.html
  css/styles.css
  js/
    main.js               Arranque: carga el IPC y engancha cada sección
    ipc.js                Serie del IPC, ajustes y estimaciones
    periodos.js           Meses AAAAMM y sus nombres
    formato.js            Pesos, porcentajes y lectura de montos
    dom.js                Ayudas de DOM e inputs de monto
    selectores.js         Paneles de mes, frecuencia y opciones
    estado.js             Datos de la calculadora en la URL y en el navegador
    anuncios.js           Línea para lectores de pantalla
    calculadora.js        Sección principal
    inflacion.js          Resumen y gráfico de inflación
    pesos-de-hoy.js       Sección "Pesos de hoy"
  data/ipc.json           Serie del IPC (la genera scripts/actualizar_datos.py)
alquipc/                  Paquete Python compartido
  indec.py                Cliente de la API del INDEC
  calculo.py              Cálculos de ajuste (misma lógica que web/js/ipc.js)
scripts/
  actualizar_datos.py     Baja el IPC y escribe web/data/ipc.json
  explorar.py             Muestra qué trae la API, para revisar los filtros
bot/                      Bot de Telegram (opcional)
tests/
.github/workflows/        Actualización diaria y publicación
```

La lógica de cálculo está dos veces, en `web/js/ipc.js` y en `alquipc/calculo.py`, y la lectura
de montos en `web/js/formato.js` y `calculo.py`. Si cambiás una, cambiá la otra.

### Bot de Telegram

Es opcional y no está desplegado. Avisa cuando sale el IPC y calcula el ajuste de cada
alquiler cargado. Necesita `TELEGRAM_TOKEN` (se pide a @BotFather con `/newbot`) e
`INDEC_TOKEN`. Comandos: `/nuevo`, `/alquileres`, `/borrar`, `/ipc`, `/actualizar`, `/baja`.
Funciona solo en chats privados, con hasta 10 alquileres por persona.

### Commits

En inglés, con el formato `[tipo] comentario simple`: `[feat]`, `[fix]`, `[refactor]`,
`[docs]`, `[chore]`. Por ejemplo, `[fix] keep caret position in amount input`.
