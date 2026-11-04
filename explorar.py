"""Muestra qué valores trae /ipc_nacional, para verificar los filtros de indec.py.

Uso: python explorar.py
"""

import asyncio
import os
from collections import Counter

from dotenv import load_dotenv

from indec import IndecClient


async def main():
    load_dotenv()
    cliente = IndecClient(os.environ["INDEC_TOKEN"])
    filas = await cliente.consultar("ipc_nacional", periodo="eq.201701", limit=1000)
    for col in ["clasificador", "nivel", "region", "tipo_de_indicador", "unidad_de_medida"]:
        print(f"\n{col}:")
        for valor, n in Counter(f[col] for f in filas).most_common(15):
            print(f"  {n:4}  {valor}")
    print("\nFilas que contienen 'general':")
    for f in filas:
        if "general" in (f["descripcion"] or "").lower():
            print(" ", {k: f[k] for k in ["codigo", "descripcion", "region", "tipo_de_indicador", "valor"]})
    serie = await cliente.serie_ipc()
    ultimo = max(serie)
    print(f"\nSerie con los filtros actuales: {len(serie)} meses, último {ultimo} = {serie[ultimo]}")
    await cliente.cerrar()


asyncio.run(main())
