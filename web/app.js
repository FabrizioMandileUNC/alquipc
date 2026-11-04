// Alquipc: cálculos de ajuste por IPC. Misma lógica que calculo.py.
(function () {
  "use strict";

  const datos = window.IPC;
  const serie = datos.serie;
  const periodos = Object.keys(serie).sort();
  const ultimo = periodos[periodos.length - 1];
  const primero = periodos[0];

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const pctFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const $ = (sel) => document.querySelector(sel);
  const pct = (f) => pctFmt.format(f * 100) + "%";

  function sumarMeses(p, n) {
    const t = Number(p.slice(0, 4)) * 12 + Number(p.slice(4)) - 1 + n;
    return String(Math.floor(t / 12)) + String((t % 12) + 1).padStart(2, "0");
  }
  const mesDe = (p) => MESES[Number(p.slice(4)) - 1];
  const nombre = (p) => mesDe(p) + " de " + p.slice(0, 4);
  const corto = (p) => mesDe(p).slice(0, 3) + " " + p.slice(2, 4);
  const variacion = (p) => serie[p] / serie[sumarMeses(p, -1)] - 1;

  function parsearMonto(texto) {
    const n = Number(texto.replace(/[^\d,]/g, "").replace(",", "."));
    return n > 0 ? n : NaN;
  }

  // "junio (1,9%), julio (2,1%) y agosto (1,7%)"
  function enumerar(items) {
    return items.length > 1 ? items.slice(0, -1).join(", ") + " y " + items[items.length - 1] : items[0] || "";
  }

  // Ajustes ya calculables con datos publicados, encadenados desde `inicio`.
  function ajustes(monto, inicio, frecuencia, rezago) {
    const lista = [];
    for (;;) {
      const proximo = sumarMeses(inicio, frecuencia);
      const base = sumarMeses(inicio, -rezago), fin = sumarMeses(proximo, -rezago);
      if (!(base in serie) || !(fin in serie)) return { lista, proximo, base, fin, monto };
      const nuevo = monto * serie[fin] / serie[base];
      lista.push({ mes: proximo, anterior: monto, monto: nuevo, base, fin });
      monto = nuevo;
      inicio = proximo;
    }
  }

  // Estimación para meses sin publicar: promedio geométrico de los últimos 3.
  function estimar(monto, base, fin) {
    const prom = Math.pow(serie[ultimo] / serie[sumarMeses(ultimo, -3)], 1 / 3);
    let faltan = 0;
    for (let p = ultimo; p < fin; p = sumarMeses(p, 1)) faltan++;
    return monto * (serie[ultimo] / serie[base]) * Math.pow(prom, faltan);
  }

  function el(tag, attrs, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    for (const h of hijos) e.append(h);
    return e;
  }

  // --- Campos que se ajustan al ancho de su contenido ------------------------
  const medidor = el("span", { "aria-hidden": "true" });
  medidor.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0";
  document.body.append(medidor);

  function ajustarAncho(campo) {
    const cs = getComputedStyle(campo);
    for (const prop of ["fontFamily", "fontSize", "fontWeight", "fontStretch", "letterSpacing", "fontVariantNumeric"]) {
      medidor.style[prop] = cs[prop];
    }
    medidor.textContent = campo.tagName === "SELECT"
      ? campo.options[campo.selectedIndex].text
      : (campo.value || campo.placeholder);
    campo.style.width = Math.ceil(medidor.getBoundingClientRect().width) + 2 + "px";
  }
  const campos = () => document.querySelectorAll(".campo input, select.campo");
  const ajustarTodos = () => campos().forEach(ajustarAncho);

  function llenarFecha(selMes, selAnio, hastaAnio, valor) {
    MESES.forEach((m, i) => selMes.append(el("option", { value: String(i + 1).padStart(2, "0") }, m)));
    for (let a = 2017; a <= hastaAnio; a++) selAnio.append(el("option", { value: String(a) }, String(a)));
    selMes.value = valor.slice(4);
    selAnio.value = valor.slice(0, 4);
  }

  function formatearMiles(input) {
    const n = parsearMonto(input.value);
    input.value = isNaN(n) ? "" : Math.round(n).toLocaleString("es-AR");
  }

  // --- Calculadora de alquiler -----------------------------------------------
  const monto = $("#monto"), mes = $("#mes"), anio = $("#anio");
  const frecuencia = $("#frecuencia"), rezago = $("#rezago");
  const salida = $("#resultado");

  // Por defecto, un inicio cuyo próximo ajuste trimestral ya se puede calcular.
  llenarFecha(mes, anio, Number(sumarMeses(ultimo, 3).slice(0, 4)), sumarMeses(ultimo, -1));

  function calcular() {
    const m = parsearMonto(monto.value);
    const inicio = anio.value + mes.value;
    const rz = Number(rezago.value);
    salida.replaceChildren();

    if (isNaN(m)) {
      salida.append(el("p", { class: "resultado__vacio" }, "Escribí cuánto pagás y acá aparece el nuevo monto."));
      return;
    }
    const base = sumarMeses(inicio, -rz);
    if (base < primero) {
      salida.append(el("p", { class: "resultado__error" },
        "La serie del IPC empieza en " + nombre(primero) + ". Elegí " + nombre(sumarMeses(primero, rz)) + " o una fecha posterior."));
      return;
    }
    if (base > ultimo) {
      salida.append(el("p", { class: "resultado__error" },
        "Para " + nombre(inicio) + " todavía no hay IPC publicado. El último es el de " + nombre(ultimo) + "."));
      return;
    }

    const r = ajustes(m, inicio, Number(frecuencia.value), rz);
    let mensaje;

    if (r.lista.length) {
      const a = r.lista[r.lista.length - 1];
      const usados = [];
      for (let p = sumarMeses(a.base, 1); p <= a.fin; p = sumarMeses(p, 1)) usados.push(mesDe(p) + " (" + pct(variacion(p)) + ")");
      salida.append(
        el("p", { class: "resultado__frase" }, "Desde " + nombre(a.mes) + " vas a pagar"),
        el("p", { class: "resultado__monto" }, pesos.format(a.monto)),
        el("p", { class: "resultado__detalle" },
          "Son " + pesos.format(a.monto - a.anterior) + " más que " + pesos.format(a.anterior) +
          ", un aumento de " + pct(a.monto / a.anterior - 1) + ". Sale de la inflación de " + enumerar(usados) + "."),
      );
      if (r.lista.length > 1) {
        const tabla = el("table", { class: "cadena" });
        tabla.append(el("tr", {}, el("td", {}, nombre(inicio)), el("td", {}, pesos.format(m))));
        for (const x of r.lista) tabla.append(el("tr", {}, el("td", {}, nombre(x.mes)), el("td", {}, pesos.format(x.monto))));
        salida.append(el("p", { class: "resultado__detalle" },
          "Desde " + nombre(inicio) + " tu contrato tuvo " + r.lista.length + " ajustes:"), tabla);
      }
      salida.append(el("p", { class: "resultado__detalle" },
        "El siguiente es en " + nombre(r.proximo) + " y se puede calcular cuando salga el IPC de " + nombre(r.fin) + "."));
      mensaje = "Mi alquiler pasa de " + pesos.format(a.anterior) + " a " + pesos.format(a.monto) +
        " desde " + nombre(a.mes) + ", un aumento de " + pct(a.monto / a.anterior - 1) + " por IPC.";
    } else {
      const est = estimar(r.monto, r.base, r.fin);
      salida.append(
        el("p", { class: "resultado__frase" }, "Desde " + nombre(r.proximo) + " pagarías alrededor de"),
        el("p", { class: "resultado__monto" }, pesos.format(est)),
        el("p", { class: "resultado__detalle" },
          "Es una estimación: falta el IPC de " + nombre(r.fin) + ". Hasta que salga, usamos el promedio de los últimos tres meses."),
      );
      mensaje = "Mi alquiler pasaría a unos " + pesos.format(est) + " desde " + nombre(r.proximo) + ", estimado por IPC.";
    }

    const texto = mensaje + " Lo calculé en Alquipc.";
    const wa = el("a", { href: "https://wa.me/?text=" + encodeURIComponent(texto), target: "_blank", rel: "noopener" }, "Mandar por WhatsApp");
    const copiar = el("button", { type: "button" }, "Copiar el resultado");
    copiar.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(texto); copiar.textContent = "Copiado"; }
      catch { copiar.textContent = "No se pudo copiar"; }
      setTimeout(() => (copiar.textContent = "Copiar el resultado"), 1800);
    });
    salida.append(el("div", { class: "acciones" }, wa, copiar));
  }

  monto.addEventListener("input", () => { formatearMiles(monto); ajustarAncho(monto); calcular(); });
  for (const s of [mes, anio, frecuencia, rezago]) s.addEventListener("change", () => { ajustarAncho(s); calcular(); });
  $("#form-alquiler").addEventListener("submit", (ev) => ev.preventDefault());

  // --- Resumen y gráfico -------------------------------------------------------
  const resumen = $("#resumen-ipc");
  const partes = [el("b", {}, "En " + nombre(ultimo) + " los precios subieron " + pct(variacion(ultimo)) + ".")];
  const haceUnAnio = sumarMeses(ultimo, -12), dic = (Number(ultimo.slice(0, 4)) - 1) + "12";
  if (haceUnAnio in serie) partes.push(" En los últimos doce meses, " + pct(serie[ultimo] / serie[haceUnAnio] - 1));
  if (dic in serie && ultimo.slice(4) !== "12") partes.push(", y en lo que va de " + ultimo.slice(0, 4) + ", " + pct(serie[ultimo] / serie[dic] - 1));
  partes.push(".");
  resumen.append(...partes);

  const barras = $("#barras"), lectura = $("#lectura");
  const ultimos = periodos.slice(-24);
  const vars = ultimos.map(variacion);
  const max = Math.max(...vars);
  const leer = (i) => lectura.replaceChildren(el("b", {}, pct(vars[i])), " en " + nombre(ultimos[i]));
  ultimos.forEach((p, i) => {
    const b = el("div", { class: "barra-mes" + (i === ultimos.length - 1 ? " es-ultima" : ""), role: "listitem", tabindex: "0",
      "aria-label": nombre(p) + ": " + pct(vars[i]) });
    b.append(el("div", { class: "barra-mes__valor", style: "height:" + Math.max(0, vars[i] / max * 100) + "%" }));
    if ((ultimos.length - 1 - i) % 6 === 0) b.append(el("span", { class: "barra-mes__eje" }, corto(p)));
    b.addEventListener("mouseenter", () => leer(i));
    b.addEventListener("focus", () => leer(i));
    barras.append(b);
  });
  barras.addEventListener("mouseleave", () => leer(ultimos.length - 1));
  leer(ultimos.length - 1);

  // --- Pesos de hoy ------------------------------------------------------------
  const monto2 = $("#monto2"), mes2 = $("#mes2"), anio2 = $("#anio2");
  const salida2 = $("#resultado2"), detalle2 = $("#detalle2");
  llenarFecha(mes2, anio2, Number(ultimo.slice(0, 4)), sumarMeses(ultimo, -24));

  function actualizarPesos() {
    const m = parsearMonto(monto2.value);
    const desde = anio2.value + mes2.value;
    if (isNaN(m)) { salida2.textContent = "…"; detalle2.textContent = ""; return; }
    if (!(desde in serie)) {
      salida2.textContent = "…";
      detalle2.textContent = "Elegí un mes entre " + nombre(primero) + " y " + nombre(ultimo) + ".";
      return;
    }
    const hoy = m * serie[ultimo] / serie[desde];
    salida2.textContent = pesos.format(hoy);
    detalle2.textContent = "En pesos de " + nombre(ultimo) + ". Los precios subieron " + pct(hoy / m - 1) + " en ese período.";
  }
  monto2.addEventListener("input", () => { formatearMiles(monto2); ajustarAncho(monto2); actualizarPesos(); });
  for (const s of [mes2, anio2]) s.addEventListener("change", () => { ajustarAncho(s); actualizarPesos(); });
  $("#form-pesos").addEventListener("submit", (ev) => ev.preventDefault());

  // --- Pie y arranque ----------------------------------------------------------
  $("#fuente").textContent = datos.fuente;
  $("#actualizado").textContent = new Date(datos.actualizado).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  calcular();
  ajustarTodos();
  if (document.fonts) document.fonts.ready.then(ajustarTodos);
  window.addEventListener("resize", ajustarTodos);
})();
