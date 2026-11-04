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
  const textoMeses = (n) => (n === 1 ? "mes" : n + " meses");
  const cantidadMeses = (n) => n + (n === 1 ? " mes" : " meses");

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

  // --- Montos: el input se ajusta al ancho de lo escrito ---------------------
  const medidor = el("span", { "aria-hidden": "true" });
  medidor.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0";
  document.body.append(medidor);

  function ajustarAncho(input) {
    const cs = getComputedStyle(input);
    for (const prop of ["fontFamily", "fontSize", "fontWeight", "fontStretch", "letterSpacing", "fontVariantNumeric"]) {
      medidor.style[prop] = cs[prop];
    }
    medidor.textContent = input.value || input.placeholder;
    input.style.width = Math.ceil(medidor.getBoundingClientRect().width) + 2 + "px";
  }
  const ajustarTodos = () => document.querySelectorAll(".campo input").forEach(ajustarAncho);

  function campoMonto(input, alCambiar) {
    input.addEventListener("input", () => {
      const n = parsearMonto(input.value);
      input.value = isNaN(n) ? "" : Math.round(n).toLocaleString("es-AR");
      ajustarAncho(input);
      alCambiar();
    });
  }

  // --- Panel flotante compartido por los campos que son botones ---------------
  const panel = el("div", { class: "panel", role: "dialog", hidden: "" });
  document.body.append(panel);
  let duenio = null;

  function abrirPanel(boton, titulo, pintar) {
    if (duenio === boton) return cerrarPanel(true);
    cerrarPanel(false);
    duenio = boton;
    panel.setAttribute("aria-label", titulo);
    boton.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    pintar();
    const r = boton.getBoundingClientRect();
    const ancho = panel.offsetWidth;
    const izq = Math.min(Math.max(16, r.left), document.documentElement.clientWidth - ancho - 16);
    panel.style.left = izq + scrollX + "px";
    panel.style.top = r.bottom + scrollY + 8 + "px";
    (panel.querySelector('[aria-pressed="true"]') || panel.querySelector("button:not(:disabled)")).focus();
  }

  function cerrarPanel(devolverFoco) {
    if (!duenio) return;
    const b = duenio;
    duenio = null;
    panel.hidden = true;
    b.setAttribute("aria-expanded", "false");
    if (devolverFoco) b.focus();
  }

  document.addEventListener("pointerdown", (ev) => {
    if (duenio && !panel.contains(ev.target) && !duenio.contains(ev.target)) cerrarPanel(false);
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrarPanel(true); });
  window.addEventListener("resize", () => cerrarPanel(false));

  function prepararBoton(boton) {
    boton.setAttribute("aria-haspopup", "dialog");
    boton.setAttribute("aria-expanded", "false");
  }

  // Mes y año: grilla de meses con navegación por año.
  function selectorMes(boton, { valor, min, max, etiqueta, alElegir }) {
    prepararBoton(boton);
    const mostrar = () => {
      boton.textContent = nombre(valor);
      boton.setAttribute("aria-label", etiqueta + ": " + nombre(valor));
    };

    function pintar(anio) {
      const prev = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año anterior" }, "‹");
      const next = el("button", { type: "button", class: "panel__flecha", "aria-label": "Año siguiente" }, "›");
      prev.disabled = anio <= Number(min.slice(0, 4));
      next.disabled = anio >= Number(max.slice(0, 4));
      prev.addEventListener("click", () => { pintar(anio - 1); panel.querySelector(".panel__flecha").focus(); });
      next.addEventListener("click", () => { pintar(anio + 1); panel.querySelectorAll(".panel__flecha")[1].focus(); });

      const grilla = el("div", { class: "panel__meses" });
      MESES.forEach((m, i) => {
        const p = anio + String(i + 1).padStart(2, "0");
        const b = el("button", { type: "button", "aria-pressed": String(p === valor), "aria-label": nombre(p) }, m.slice(0, 3));
        b.disabled = p < min || p > max;
        b.addEventListener("click", () => { valor = p; mostrar(); cerrarPanel(true); alElegir(p); });
        grilla.append(b);
      });
      panel.replaceChildren(el("div", { class: "panel__anio" }, prev, el("b", {}, String(anio)), next), grilla);
    }

    boton.addEventListener("click", () => abrirPanel(boton, etiqueta, () => pintar(Number(valor.slice(0, 4)))));
    mostrar();
  }

  // Cada cuántos meses ajusta: valores comunes y un contador para el resto.
  function selectorFrecuencia(boton, { valor, alElegir }) {
    prepararBoton(boton);
    const MAX = 24;
    const mostrar = () => {
      boton.textContent = textoMeses(valor);
      boton.setAttribute("aria-label", "Frecuencia de ajuste: cada " + textoMeses(valor));
    };
    const elegir = (n) => { valor = n; mostrar(); alElegir(n); };

    function pintar() {
      const opciones = el("div", { class: "panel__opciones" });
      for (const n of [1, 2, 3, 4, 6, 12]) {
        const b = el("button", { type: "button", "aria-pressed": String(n === valor) }, cantidadMeses(n));
        b.addEventListener("click", () => { elegir(n); cerrarPanel(true); });
        opciones.append(b);
      }
      const menos = el("button", { type: "button", "aria-label": "Un mes menos" }, "−");
      const mas = el("button", { type: "button", "aria-label": "Un mes más" }, "+");
      const cuenta = el("output", { "aria-live": "polite" }, cantidadMeses(valor));
      const paso = (d) => {
        const n = Math.min(MAX, Math.max(1, valor + d));
        if (n === valor) return;
        elegir(n);
        cuenta.textContent = cantidadMeses(n);
        opciones.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String([1, 2, 3, 4, 6, 12][i] === n)));
        menos.disabled = n === 1;
        mas.disabled = n === MAX;
      };
      menos.disabled = valor === 1;
      mas.disabled = valor === MAX;
      menos.addEventListener("click", () => paso(-1));
      mas.addEventListener("click", () => paso(1));
      panel.replaceChildren(
        el("p", { class: "panel__titulo" }, "Cada cuánto ajusta el contrato"),
        opciones,
        el("div", { class: "panel__otro" }, el("span", {}, "Otra cantidad"),
          el("div", { class: "panel__stepper" }, menos, cuenta, mas)),
      );
    }

    boton.addEventListener("click", () => abrirPanel(boton, "Frecuencia de ajuste", pintar));
    mostrar();
  }

  // Lista de opciones con una explicación corta debajo de cada una.
  function selectorOpciones(boton, { valor, titulo, opciones, alElegir }) {
    prepararBoton(boton);
    const actual = () => opciones.find((o) => o.valor === valor);
    const mostrar = () => { boton.textContent = actual().texto; };

    function pintar() {
      const lista = el("div", { class: "panel__lista" });
      for (const o of opciones) {
        const b = el("button", { type: "button", "aria-pressed": String(o.valor === valor) }, o.texto, el("small", {}, o.ayuda));
        b.addEventListener("click", () => { valor = o.valor; mostrar(); cerrarPanel(true); alElegir(o.valor); });
        lista.append(b);
      }
      panel.replaceChildren(el("p", { class: "panel__titulo" }, titulo), lista);
    }

    boton.addEventListener("click", () => abrirPanel(boton, titulo, pintar));
    mostrar();
  }

  // --- Calculadora de alquiler -----------------------------------------------
  const monto = $("#monto");
  const salida = $("#resultado");
  // Por defecto, un inicio cuyo próximo ajuste trimestral ya se puede calcular.
  const estado = { inicio: sumarMeses(ultimo, -1), frecuencia: 3, rezago: 2 };

  function calcular() {
    const m = parsearMonto(monto.value);
    const { inicio, frecuencia, rezago } = estado;
    salida.replaceChildren();

    if (isNaN(m)) {
      salida.append(el("p", { class: "resultado__vacio" }, "Escribí cuánto pagás y acá aparece el nuevo monto."));
      return;
    }
    const base = sumarMeses(inicio, -rezago);
    if (base < primero) {
      salida.append(el("p", { class: "resultado__error" },
        "La serie del IPC empieza en " + nombre(primero) + ". Elegí " + nombre(sumarMeses(primero, rezago)) + " o una fecha posterior."));
      return;
    }
    if (base > ultimo) {
      salida.append(el("p", { class: "resultado__error" },
        "Para " + nombre(inicio) + " todavía no hay IPC publicado. El último es el de " + nombre(ultimo) + "."));
      return;
    }

    const r = ajustes(m, inicio, frecuencia, rezago);
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

  campoMonto(monto, calcular);
  selectorMes($("#inicio"), {
    valor: estado.inicio, min: sumarMeses(primero, 1), max: sumarMeses(ultimo, 3),
    etiqueta: "Mes desde el que pagás ese monto",
    alElegir: (p) => { estado.inicio = p; calcular(); },
  });
  selectorFrecuencia($("#frecuencia"), {
    valor: estado.frecuencia,
    alElegir: (n) => { estado.frecuencia = n; calcular(); },
  });
  selectorOpciones($("#rezago"), {
    valor: estado.rezago,
    titulo: "Qué IPC toma tu contrato",
    opciones: [
      { valor: 2, texto: "dos meses", ayuda: "Lo más común: al ajustar, el último IPC publicado es el de dos meses antes." },
      { valor: 1, texto: "un mes", ayuda: "Si tu contrato ajusta después de mitad de mes con el IPC recién salido." },
    ],
    alElegir: (v) => { estado.rezago = v; calcular(); },
  });
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
  const monto2 = $("#monto2"), salida2 = $("#resultado2"), detalle2 = $("#detalle2");
  let desde2 = sumarMeses(ultimo, -24);

  function actualizarPesos() {
    const m = parsearMonto(monto2.value);
    if (isNaN(m)) { salida2.textContent = "…"; detalle2.textContent = ""; return; }
    const hoy = m * serie[ultimo] / serie[desde2];
    salida2.textContent = pesos.format(hoy);
    detalle2.textContent = "En pesos de " + nombre(ultimo) + ". Los precios subieron " + pct(hoy / m - 1) + " en ese período.";
  }
  campoMonto(monto2, actualizarPesos);
  selectorMes($("#desde2"), {
    valor: desde2, min: primero, max: ultimo, etiqueta: "Mes del monto original",
    alElegir: (p) => { desde2 = p; actualizarPesos(); },
  });
  $("#form-pesos").addEventListener("submit", (ev) => ev.preventDefault());

  // --- Pie y arranque ----------------------------------------------------------
  $("#fuente").textContent = datos.fuente;
  $("#actualizado").textContent = new Date(datos.actualizado).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  calcular();
  ajustarTodos();
  if (document.fonts) document.fonts.ready.then(ajustarTodos);
  window.addEventListener("resize", ajustarTodos);
})();
