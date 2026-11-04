# Alquipc

Calculadora de ajuste de alquiler por IPC, con los datos oficiales del INDEC.

**Usala en https://fabriziomandileunc.github.io/alquipc/**

## Cómo se usa

Completás una frase con tus datos:

> Pago **$450.000** por mes desde **agosto de 2026** y el contrato ajusta cada **3 meses**.

y te dice cuánto vas a pagar desde el próximo ajuste, cuánto sube y con qué meses de inflación
se calculó. También muestra los próximos tres ajustes, estimados con la inflación de los últimos
meses.

- **Cambiá lo que está en amarillo** para poner tu monto, el mes y cada cuánto ajusta tu contrato.
- **Si pusiste una fecha vieja**, aplica todos los ajustes que pasaron y te dice cuánto deberías
  estar pagando hoy.
- **Compartí el resultado** por WhatsApp o copiá el enlace: abre el mismo cálculo.
- **Pesos de hoy** te dice cuánto vale hoy un monto de otra fecha, como un depósito de garantía
  o una deuda.

## Cómo se calcula

```
nuevo alquiler = alquiler actual × IPC del ajuste ÷ IPC del inicio
```

Se usa el IPC de dos meses antes de cada fecha, porque el INDEC publica cada índice a mediados
del mes siguiente: al ajustar el 1 de noviembre, el último dato disponible es el de septiembre.
Si tu contrato toma el IPC de un mes antes, lo podés cambiar debajo de la calculadora.

El índice es el IPC nivel general, total nacional, del INDEC. Se actualiza solo todos los días,
así que cuando sale un dato nuevo aparece en la página esa misma tarde.

## Aclaración

Alquipc es una herramienta informativa. Si tu contrato usa otro índice (como el ICL o Casa
Propia) este cálculo no aplica, y ante cualquier duda lo que vale es lo que dice el contrato.
