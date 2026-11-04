"""Cálculos de ajuste de alquiler por IPC. Funciones puras, sin red ni base de datos."""

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# Meses de rezago entre el índice usado y el mes del ajuste. El IPC de un mes se
# publica a mediados del mes siguiente, así que al ajustar el 1 de agosto el último
# dato disponible es el de junio. Es la convención de la mayoría de las calculadoras.
REZAGO = 2


def sumar_meses(periodo: str, n: int) -> str:
    """Suma n meses a un período AAAAMM."""
    total = int(periodo[:4]) * 12 + int(periodo[4:]) - 1 + n
    return f"{total // 12}{total % 12 + 1:02d}"


def nombre_periodo(periodo: str) -> str:
    return f"{MESES[int(periodo[4:]) - 1]} {periodo[:4]}"


def parsear_periodo(texto: str) -> str:
    """Convierte 'MM/AAAA' (o 'M/AAAA', 'MM-AAAA') en 'AAAAMM'."""
    partes = texto.strip().replace("-", "/").split("/")
    if len(partes) != 2:
        raise ValueError(texto)
    mes, anio = int(partes[0]), int(partes[1])
    if not 1 <= mes <= 12 or not 2000 <= anio <= 2100:
        raise ValueError(texto)
    return f"{anio}{mes:02d}"


def parsear_monto(texto: str) -> float:
    """Acepta '450000', '$ 450.000', '450.000,50'."""
    limpio = texto.strip().replace("$", "").replace(" ", "").replace(".", "").replace(",", ".")
    monto = float(limpio)
    if monto <= 0:
        raise ValueError(texto)
    return monto


def formatear_monto(monto: float) -> str:
    return "$ " + f"{monto:,.0f}".replace(",", ".")


def formatear_pct(fraccion: float) -> str:
    return f"{fraccion * 100:.1f}%".replace(".", ",")


def actualizar(monto: float, desde: str, hasta: str, serie: dict[str, float]) -> float:
    """Lleva un monto del período `desde` al `hasta` con el IPC (sin rezago)."""
    return monto * serie[hasta] / serie[desde]


def ajustes_pendientes(monto: float, inicio: str, frecuencia: int,
                       serie: dict[str, float]) -> list[tuple[str, float]]:
    """Ajustes que ya se pueden calcular con los datos publicados.

    `inicio` es el mes desde el que rige `monto`. Devuelve [(mes_del_ajuste, monto_nuevo)]
    en orden; puede haber varios si el contrato se cargó con una fecha vieja.
    """
    ajustes = []
    while True:
        proximo = sumar_meses(inicio, frecuencia)
        base, ultimo = sumar_meses(inicio, -REZAGO), sumar_meses(proximo, -REZAGO)
        if base not in serie or ultimo not in serie:
            return ajustes
        monto = monto * serie[ultimo] / serie[base]
        inicio = proximo
        ajustes.append((inicio, monto))


def resumen_ipc(serie: dict[str, float]) -> str:
    ultimo = max(serie)
    mensual = serie[ultimo] / serie[sumar_meses(ultimo, -1)] - 1
    lineas = [f"📊 IPC de {nombre_periodo(ultimo)}: {formatear_pct(mensual)} mensual"]
    hace_un_anio = sumar_meses(ultimo, -12)
    if hace_un_anio in serie:
        lineas.append(f"Interanual: {formatear_pct(serie[ultimo] / serie[hace_un_anio] - 1)}")
    diciembre = f"{int(ultimo[:4]) - 1}12"
    if diciembre in serie and ultimo[4:] != "12":
        lineas.append(f"Acumulado {ultimo[:4]}: {formatear_pct(serie[ultimo] / serie[diciembre] - 1)}")
    return "\n".join(lineas)
