import unittest

from alquipc import calculo as c


class TestCalculo(unittest.TestCase):
    # Índices inventados: +10% por mes desde 202601 (100) a 202606.
    SERIE = {f"2026{m:02d}": 100 * 1.1 ** (m - 1) for m in range(1, 7)}

    def test_sumar_meses(self):
        self.assertEqual(c.sumar_meses("202611", 2), "202701")
        self.assertEqual(c.sumar_meses("202601", -2), "202511")
        self.assertEqual(c.sumar_meses("202612", 0), "202612")

    def test_parseos(self):
        self.assertEqual(c.parsear_periodo("5/2026"), "202605")
        self.assertEqual(c.parsear_periodo("05-2026"), "202605")
        self.assertEqual(c.parsear_monto("$ 450.000"), 450000)
        self.assertEqual(c.parsear_monto("450.000,50"), 450000.5)
        with self.assertRaises(ValueError):
            c.parsear_periodo("13/2026")

    def test_formatos(self):
        self.assertEqual(c.formatear_monto(1234567.4), "$ 1.234.567")
        self.assertEqual(c.formatear_pct(0.019), "1,9%")

    def test_ajuste_trimestral_usa_rezago(self):
        # Rige desde marzo, ajuste en junio: usa IPC abril / IPC enero = 3 meses de +10%.
        ajustes = c.ajustes_pendientes(1000, "202603", 3, self.SERIE)
        self.assertEqual(len(ajustes), 1)
        mes, monto = ajustes[0]
        self.assertEqual(mes, "202606")
        self.assertAlmostEqual(monto, 1331)

    def test_sin_datos_no_ajusta(self):
        # Ajuste en septiembre necesita el IPC de julio, que no está.
        self.assertEqual(c.ajustes_pendientes(1000, "202606", 3, self.SERIE), [])

    def test_varios_ajustes_atrasados(self):
        ajustes = c.ajustes_pendientes(1000, "202603", 1, self.SERIE)
        self.assertEqual([m for m, _ in ajustes], ["202604", "202605", "202606", "202607", "202608"])
        self.assertAlmostEqual(ajustes[-1][1], 1000 * 1.1 ** 5)


if __name__ == "__main__":
    unittest.main()
