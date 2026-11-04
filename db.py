"""Persistencia en SQLite: suscriptores, contratos y el último IPC avisado."""

import sqlite3


class Base:
    def __init__(self, ruta: str):
        self._con = sqlite3.connect(ruta)
        self._con.row_factory = sqlite3.Row
        self._con.executescript("""
            CREATE TABLE IF NOT EXISTS suscriptores (chat_id INTEGER PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS contratos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                monto REAL NOT NULL,
                inicio TEXT NOT NULL,      -- AAAAMM desde el que rige el monto
                frecuencia INTEGER NOT NULL -- meses entre ajustes
            );
            CREATE TABLE IF NOT EXISTS estado (clave TEXT PRIMARY KEY, valor TEXT);
        """)

    def suscribir(self, chat_id: int):
        with self._con:
            self._con.execute("INSERT OR IGNORE INTO suscriptores VALUES (?)", (chat_id,))

    def desuscribir(self, chat_id: int):
        with self._con:
            self._con.execute("DELETE FROM suscriptores WHERE chat_id = ?", (chat_id,))
            self._con.execute("DELETE FROM contratos WHERE chat_id = ?", (chat_id,))

    def suscriptores(self) -> list[int]:
        return [f[0] for f in self._con.execute("SELECT chat_id FROM suscriptores")]

    def agregar_contrato(self, chat_id: int, monto: float, inicio: str, frecuencia: int) -> int:
        with self._con:
            cur = self._con.execute(
                "INSERT INTO contratos (chat_id, monto, inicio, frecuencia) VALUES (?, ?, ?, ?)",
                (chat_id, monto, inicio, frecuencia))
        return cur.lastrowid

    def actualizar_contrato(self, id_: int, monto: float, inicio: str):
        with self._con:
            self._con.execute("UPDATE contratos SET monto = ?, inicio = ? WHERE id = ?",
                              (monto, inicio, id_))

    def borrar_contrato(self, chat_id: int, id_: int) -> bool:
        with self._con:
            cur = self._con.execute("DELETE FROM contratos WHERE id = ? AND chat_id = ?",
                                    (id_, chat_id))
        return cur.rowcount > 0

    def contratos(self, chat_id: int | None = None) -> list[sqlite3.Row]:
        if chat_id is None:
            return self._con.execute("SELECT * FROM contratos").fetchall()
        return self._con.execute("SELECT * FROM contratos WHERE chat_id = ? ORDER BY id",
                                 (chat_id,)).fetchall()

    def leer_estado(self, clave: str) -> str | None:
        fila = self._con.execute("SELECT valor FROM estado WHERE clave = ?", (clave,)).fetchone()
        return fila[0] if fila else None

    def guardar_estado(self, clave: str, valor: str):
        with self._con:
            self._con.execute("INSERT OR REPLACE INTO estado VALUES (?, ?)", (clave, valor))
