"""Cliente mínimo de la API del INDEC (https://api.indec.gob.ar/v1/)."""

import httpx

from alquipc.calculo import validar_serie

BASE_URL = "https://api.indec.gob.ar/v1"

# Filtros PostgREST para la serie del índice nivel general, total nacional.
# Si la API cambia los nombres, correr `python -m scripts.explorar` y ajustar acá.
FILTROS_IPC_GENERAL = {
    "descripcion": "ilike.*nivel general*",
    "region": "ilike.*nacional*",
    "tipo_de_indicador": "ilike.*ndice*",
}


class IndecError(Exception):
    pass


class IndecClient:
    def __init__(self, token: str):
        self._http = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )

    async def consultar(self, tabla: str, **params) -> list[dict]:
        r = await self._http.get(f"/{tabla}", params=params)
        if r.status_code >= 400:
            raise IndecError(f"{tabla}: HTTP {r.status_code} {r.text[:200]}")
        return r.json()

    async def serie_ipc(self) -> dict[str, float]:
        """Índice IPC nivel general nacional, {AAAAMM: valor}."""
        filas = await self.consultar(
            "ipc_nacional", **FILTROS_IPC_GENERAL,
            select="periodo,valor", order="periodo", limit=1000,
        )
        serie = {}
        for fila in filas:
            if fila["valor"] is None:
                continue
            periodo = str(fila["periodo"])
            if periodo in serie:
                raise IndecError(f"Los filtros del IPC traen más de una fila para {periodo}")
            serie[periodo] = float(fila["valor"])
        try:
            return validar_serie(serie)
        except ValueError as e:
            raise IndecError(str(e)) from e

    async def cerrar(self):
        await self._http.aclose()
