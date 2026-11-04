"""Baja la serie del IPC y la escribe en web/data/ipc.json para la página.

Usa la API del INDEC si hay INDEC_TOKEN en el entorno (o en .env). Si no hay token o la
API falla, usa la serie pública de datos.gob.ar, que publica el mismo índice con algunas
semanas de demora. Nunca reemplaza el archivo por una serie más corta que la que ya tiene.

Uso: python -m scripts.actualizar_datos
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

from alquipc.calculo import validar_serie
from alquipc.indec import IndecClient, IndecError

SALIDA = Path(__file__).resolve().parents[1] / "web" / "data" / "ipc.json"
SERIE_DATOS_GOB = "148.3_INIVELNAL_DICI_M_26"  # IPC nivel general nacional, base dic 2016


async def desde_indec(token: str) -> dict[str, float]:
    cliente = IndecClient(token)
    try:
        return await cliente.serie_ipc()
    finally:
        await cliente.cerrar()


def desde_datos_gob() -> dict[str, float]:
    r = httpx.get("https://apis.datos.gob.ar/series/api/series/",
                  params={"ids": SERIE_DATOS_GOB, "limit": 5000, "format": "json"}, timeout=30)
    r.raise_for_status()
    return {fecha[:4] + fecha[5:7]: valor for fecha, valor in r.json()["data"] if valor is not None}


def bajar_serie() -> tuple[dict[str, float], str]:
    token = os.getenv("INDEC_TOKEN")
    if token:
        try:
            return asyncio.run(desde_indec(token)), "API INDEC"
        except (IndecError, httpx.HTTPError, ValueError) as e:
            print(f"La API del INDEC falló ({e}); uso datos.gob.ar", file=sys.stderr)
    return validar_serie(desde_datos_gob()), "datos.gob.ar (INDEC)"


def largo_actual() -> int:
    try:
        return len(json.loads(SALIDA.read_text(encoding="utf-8"))["serie"])
    except (OSError, ValueError, KeyError):
        return 0


def main():
    load_dotenv()
    serie, fuente = bajar_serie()
    if len(serie) < largo_actual():
        sys.exit(f"{fuente} trajo {len(serie)} meses y el archivo ya tiene {largo_actual()}; no lo reemplazo.")
    datos = {
        "fuente": fuente,
        "actualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "serie": dict(sorted(serie.items())),
    }
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{fuente}: {len(serie)} meses, último {max(serie)} -> {SALIDA}")


if __name__ == "__main__":
    main()
