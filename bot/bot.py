"""Bot de Telegram que avisa cuando sale el IPC y calcula el ajuste de tu alquiler."""

import logging
import os

import httpx
from dotenv import load_dotenv
from telegram import ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.error import Forbidden, TelegramError
from telegram.ext import (AIORateLimiter, Application, CommandHandler, ContextTypes,
                          ConversationHandler, MessageHandler, filters)

from alquipc import calculo as c
from alquipc.indec import IndecClient, IndecError
from bot.db import Base

load_dotenv()
logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("bot")

INTERVALO_CHEQUEO = int(os.getenv("INTERVALO_CHEQUEO_MIN", "30")) * 60
db = Base(os.getenv("DB_PATH", "bot.db"))
indec = IndecClient(os.environ["INDEC_TOKEN"])

MONTO, INICIO, FRECUENCIA = range(3)
MAX_CONTRATOS = 10
# Los contratos se guardan por chat: en un grupo cualquiera podría borrarlos.
PRIVADO = filters.ChatType.PRIVATE

AYUDA = (
    "Te aviso cada vez que el INDEC publica el IPC y te calculo cuánto sube tu alquiler.\n\n"
    "/nuevo – cargar un alquiler\n"
    "/alquileres – ver tus alquileres y el próximo ajuste\n"
    "/borrar <n> – borrar un alquiler\n"
    "/ipc – último dato de inflación\n"
    "/actualizar <monto> <MM/AAAA> – llevar un monto a pesos de hoy\n"
    "/baja – dejar de recibir avisos"
)


def serie(ctx: ContextTypes.DEFAULT_TYPE) -> dict[str, float] | None:
    return ctx.bot_data.get("serie")


def describir_contrato(fila, serie_ipc: dict[str, float] | None) -> str:
    proximo = c.sumar_meses(fila["inicio"], fila["frecuencia"])
    texto = (f"#{fila['id']}: {c.formatear_monto(fila['monto'])} desde {c.nombre_periodo(fila['inicio'])}, "
             f"ajuste cada {c.texto_meses(fila['frecuencia'])}.\n"
             f"   Próximo ajuste: {c.nombre_periodo(proximo)}")
    dato_necesario = c.sumar_meses(proximo, -c.REZAGO)
    if serie_ipc and dato_necesario not in serie_ipc:
        texto += f" (falta el IPC de {c.nombre_periodo(dato_necesario)})"
    return texto


# --- Comandos ---------------------------------------------------------------

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    db.suscribir(update.effective_chat.id)
    await update.message.reply_text("¡Hola! 👋 " + AYUDA)


async def baja(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    db.desuscribir(update.effective_chat.id)
    await update.message.reply_text("Listo, no te mando más avisos y borré tus alquileres. /start para volver.")


async def ipc(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    s = serie(ctx)
    if not s:
        await update.message.reply_text("Todavía no pude bajar los datos del INDEC, probá en un rato.")
        return
    await update.message.reply_text(c.resumen_ipc(s))


async def actualizar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    s = serie(ctx)
    try:
        monto, desde = c.parsear_monto(ctx.args[0]), c.parsear_periodo(ctx.args[1])
    except (IndexError, ValueError):
        await update.message.reply_text("Uso: /actualizar 100000 01/2023")
        return
    if not s or desde not in s:
        await update.message.reply_text("No tengo IPC para ese mes (la serie arranca en diciembre 2016).")
        return
    ultimo = max(s)
    nuevo = c.actualizar(monto, desde, ultimo, s)
    await update.message.reply_text(
        f"{c.formatear_monto(monto)} de {c.nombre_periodo(desde)} equivalen a "
        f"{c.formatear_monto(nuevo)} de {c.nombre_periodo(ultimo)} "
        f"(inflación del período: {c.formatear_pct(nuevo / monto - 1)}).")


async def alquileres(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    filas = db.contratos(update.effective_chat.id)
    if not filas:
        await update.message.reply_text("No tenés alquileres cargados. Usá /nuevo.")
        return
    await update.message.reply_text("\n\n".join(describir_contrato(f, serie(ctx)) for f in filas))


async def borrar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        id_ = int(ctx.args[0].lstrip("#"))
    except (IndexError, ValueError):
        await update.message.reply_text("Uso: /borrar 3 (el número sale en /alquileres)")
        return
    ok = db.borrar_contrato(update.effective_chat.id, id_)
    await update.message.reply_text("Borrado." if ok else "No encontré ese alquiler.")


# --- Alta de alquiler (conversación) ----------------------------------------

async def nuevo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    db.suscribir(update.effective_chat.id)
    if len(db.contratos(update.effective_chat.id)) >= MAX_CONTRATOS:
        await update.message.reply_text(
            f"Ya tenés {MAX_CONTRATOS} alquileres cargados. Borrá alguno con /borrar para sumar otro.")
        return ConversationHandler.END
    await update.message.reply_text("¿Cuánto pagás hoy de alquiler? (ej: 450000)")
    return MONTO


async def recibir_monto(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        ctx.user_data["monto"] = c.parsear_monto(update.message.text)
    except ValueError:
        await update.message.reply_text("No entendí el monto, mandá solo el número (ej: 450000).")
        return MONTO
    await update.message.reply_text("¿Desde qué mes pagás ese monto? (MM/AAAA, ej: 05/2026)")
    return INICIO


async def recibir_inicio(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        inicio = c.parsear_periodo(update.message.text)
    except ValueError:
        await update.message.reply_text("Mandalo como MM/AAAA, por ejemplo 05/2026.")
        return INICIO
    s = serie(ctx)
    if s and c.sumar_meses(inicio, -c.REZAGO) < min(s):
        primero = c.sumar_meses(min(s), c.REZAGO)
        await update.message.reply_text(
            f"La serie del IPC arranca en {c.nombre_periodo(min(s))}, así que el mes más viejo que "
            f"puedo usar es {c.nombre_periodo(primero)}. Mandá esa fecha o una posterior.")
        return INICIO
    ctx.user_data["inicio"] = inicio
    teclado = ReplyKeyboardMarkup([["3", "4", "6", "12"]], one_time_keyboard=True, resize_keyboard=True)
    await update.message.reply_text("¿Cada cuántos meses se ajusta?", reply_markup=teclado)
    return FRECUENCIA


async def recibir_frecuencia(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        frecuencia = int(update.message.text.strip())
        if not 1 <= frecuencia <= 24:
            raise ValueError
    except ValueError:
        await update.message.reply_text("Mandá un número de meses, ej: 3.")
        return FRECUENCIA

    monto, inicio = ctx.user_data.pop("monto"), ctx.user_data.pop("inicio")
    respuesta = ""
    s = serie(ctx)
    if s:
        # Si cargó una fecha vieja, lo ponemos al día con los IPC ya publicados.
        ajustes = c.ajustes_pendientes(monto, inicio, frecuencia, s)
        if ajustes:
            inicio, monto = ajustes[-1]
            respuesta += ("Con los IPC ya publicados, tu alquiler debería ser "
                          f"{c.formatear_monto(monto)} desde {c.nombre_periodo(inicio)}.\n\n")
    id_ = db.agregar_contrato(update.effective_chat.id, monto, inicio, frecuencia)
    fila = next(f for f in db.contratos(update.effective_chat.id) if f["id"] == id_)
    respuesta += "✅ Guardado:\n" + describir_contrato(fila, s) + "\n\nTe aviso cuando salga el dato."
    await update.message.reply_text(respuesta, reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


async def cancelar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    ctx.user_data.clear()
    await update.message.reply_text("Cancelado.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


# --- Chequeo periódico del INDEC --------------------------------------------

async def enviar(ctx: ContextTypes.DEFAULT_TYPE, chat_id: int, texto: str):
    # Un chat que falla no puede cortar el aviso al resto.
    try:
        await ctx.bot.send_message(chat_id, texto)
    except Forbidden:
        log.info("El chat %s bloqueó el bot, lo doy de baja", chat_id)
        db.desuscribir(chat_id)
    except TelegramError as e:
        log.warning("No pude escribirle al chat %s: %s", chat_id, e)


async def chequear_ipc(ctx: ContextTypes.DEFAULT_TYPE):
    try:
        s = await indec.serie_ipc()
    except (IndecError, httpx.HTTPError, ValueError, KeyError) as e:
        log.warning("No pude leer el IPC: %s", e)
        return
    ctx.bot_data["serie"] = s
    ultimo, avisado = max(s), db.leer_estado("ultimo_periodo")
    if avisado is None:
        # Primera corrida: no avisamos un dato que ya era viejo.
        db.guardar_estado("ultimo_periodo", ultimo)
        return
    if ultimo <= avisado:
        return
    log.info("Nuevo IPC: %s", ultimo)

    for chat_id in db.suscriptores():
        await enviar(ctx, chat_id, "🆕 Salió el IPC\n" + c.resumen_ipc(s))

    for fila in db.contratos():
        ajustes = c.ajustes_pendientes(fila["monto"], fila["inicio"], fila["frecuencia"], s)
        if not ajustes:
            continue
        mes, monto = ajustes[-1]
        db.actualizar_contrato(fila["id"], monto, mes)
        await enviar(ctx, fila["chat_id"],
                     f"🏠 Alquiler #{fila['id']}: desde {c.nombre_periodo(mes)} pasa de "
                     f"{c.formatear_monto(fila['monto'])} a {c.formatear_monto(monto)} "
                     f"({c.formatear_variacion(monto / fila['monto'] - 1)}).")

    # Recién ahora: si algo se cortó antes, el próximo chequeo vuelve a intentar.
    # Los contratos ya ajustados no se repiten porque cambió su mes de inicio.
    db.guardar_estado("ultimo_periodo", ultimo)


async def al_cerrar(app: Application):
    await indec.cerrar()


def main():
    app = (Application.builder().token(os.environ["TELEGRAM_TOKEN"])
           .rate_limiter(AIORateLimiter()).post_shutdown(al_cerrar).build())
    texto = PRIVADO & filters.TEXT & ~filters.COMMAND
    app.add_handler(ConversationHandler(
        entry_points=[CommandHandler("nuevo", nuevo, filters=PRIVADO)],
        states={
            MONTO: [MessageHandler(texto, recibir_monto)],
            INICIO: [MessageHandler(texto, recibir_inicio)],
            FRECUENCIA: [MessageHandler(texto, recibir_frecuencia)],
        },
        fallbacks=[CommandHandler("cancelar", cancelar, filters=PRIVADO)],
        allow_reentry=True,
        conversation_timeout=15 * 60,
    ))
    for nombre, handler in [("start", start), ("help", start), ("baja", baja), ("ipc", ipc),
                            ("actualizar", actualizar), ("alquileres", alquileres), ("borrar", borrar)]:
        app.add_handler(CommandHandler(nombre, handler, filters=PRIVADO))
    app.job_queue.run_repeating(chequear_ipc, interval=INTERVALO_CHEQUEO, first=1)
    app.run_polling()


if __name__ == "__main__":
    main()
