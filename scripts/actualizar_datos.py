"""Baja la serie del IPC y la escribe en web/data/ipc.json para la página.

Usa la API del INDEC si hay INDEC_TOKEN en el entorno (o en .env); si no, la serie
pública de datos.gob.ar, que publica el mismo índice con algunas semanas de demora.

Uso: python -m scripts.actualizar_datos
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

from alquipc.indec import IndecClient

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


def main():
    load_dotenv()
    token = os.getenv("INDEC_TOKEN")
    if token:
        serie, fuente = asyncio.run(desde_indec(token)), "API INDEC"
    else:
        serie, fuente = desde_datos_gob(), "datos.gob.ar (INDEC)"
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
