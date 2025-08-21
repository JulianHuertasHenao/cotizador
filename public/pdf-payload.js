// /public/pdf-payload.js
(function (root) {
  function armarPayloadPDFDesdeUI() {
    const int = (v, d = 0) => {
      const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
      return Number.isNaN(n) ? d : n;
    };
    const num = (v, d = 0) => {
      if (v == null) return d;
      const s = String(v)
        .replace(/\s/g, "")
        .replace("$", "")
        .replace(/\./g, "")
        .replace(",", ".");
      const n = parseFloat(s);
      return Number.isNaN(n) ? d : n;
    };
    const pad2 = (n) => String(n ?? "").padStart(2, "0");
    const normalizeObs = (str) =>
      String(str)
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join("\n");

    // --- Paciente ---
    const hiddenId =
      document.getElementById("pacienteSelectIdHidden")?.value || null;
    let nombrePaciente = "",
      correoPaciente = "";
    if (hiddenId) {
      const p = (window.pacientes || []).find(
        (x) => String(x.id) === String(hiddenId)
      );
      if (p) {
        nombrePaciente = p.nombre || "";
        correoPaciente = p.correo || "";
      }
    }
    const npForm = document.getElementById("nuevoPacienteForm");
    if ((npForm && npForm.style.display !== "none") || !hiddenId) {
      const n = document.getElementById("nombrePaciente")?.value?.trim();
      const c = document.getElementById("correoPaciente")?.value?.trim();
      if (n) nombrePaciente = n;
      if (c) correoPaciente = c;
    }
    if (!nombrePaciente) {
      const raw = document.getElementById("pacienteSearchInput")?.value || "";
      const cut = raw.split(" - ");
      if (cut[0]) nombrePaciente = cut[0].trim();
      if (!correoPaciente && cut[1]) correoPaciente = cut[1].trim();
    }

    const categorias = window.categorias || [];
    const servicios = window.servicios || [];
    const procedimientos = [];
    const observacionesFases = {};
    let observacionesGenerales = null;

    const usarFases = !!document.getElementById("use-phases")?.checked;

    if (usarFases) {
      // ============ CON FASES ============
      document
        .querySelectorAll("#phases-container .phase-container")
        .forEach((faseEl, idx) => {
          const numeroFase = int(
            faseEl.querySelector(".phase-number-text")?.textContent || idx + 1,
            idx + 1
          );
          const duracion = int(
            faseEl.querySelector(".phase-duration")?.value || 1,
            1
          );
          const durUnidad = duracion === 1 ? "mes" : "meses";

          const obsTokens = [];
          // Categorías dentro de la fase
          faseEl.querySelectorAll(".category-group").forEach((catEl) => {
            const catSel = catEl.querySelector(
              ".categoria-fase-select, .categoria-unica-select"
            );

            // — categoría (id + nombre) con fallback por el texto del option
            let categoriaId = catSel?.value ? int(catSel.value) : null;
            let catData =
              categorias.find((c) => String(c.id) === String(categoriaId)) ||
              null;
            if (!catData && catSel?.selectedOptions?.[0]) {
              const txt = catSel.selectedOptions[0].textContent || "";
              const m = txt.match(/^\s*0?(\d+)\s*-\s*([^:]+)/i);
              if (m) {
                categoriaId = int(m[1]);
                catData = { id: categoriaId, nombre_categoria: m[2].trim() };
              }
            }
            const espCod = catData ? pad2(catData.id) : "00";
            const espNom = catData ? catData.nombre_categoria : "SIN CATEGORÍA";

            // Observación de ESTA categoría (en fase)
            const obsCatRaw =
              catEl.querySelector(
                ".observaciones-fases, .observaciones-no-fase"
              )?.value ?? "";
            obsTokens.push(obsCatRaw.trim()); // incluimos vacíos para mantener posiciones

            // Servicios
            catEl
              .querySelectorAll(".service-list .service-item")
              .forEach((item) => {
                const svcSel = item.querySelector(".servicio-select");
                if (!svcSel || !svcSel.value) return;

                const svcData =
                  servicios.find(
                    (s) => String(s.id) === String(svcSel.value)
                  ) || null;
                const optTxt =
                  svcSel.options[svcSel.selectedIndex]?.textContent || "";
                const codeFromText = (optTxt.split(" - ")[0] || "").trim();

                const descUI =
                  item.querySelector(".service-description")?.value?.trim() ||
                  "";
                const subUI =
                  item.querySelector(".service-subtitle")?.value?.trim() || "";
                const cant = int(
                  item.querySelector(".cantidad-servicio")?.value || 1,
                  1
                );
                const dPct = num(
                  item.querySelector(".descuento-servicio")?.value || 0,
                  0
                );
                const pu = num(
                  item.querySelector(".precio-unitario-servicio")?.value ??
                    svcData?.precio_neto ??
                    0,
                  0
                );
                const subtotal = pu * cant;
                const total = subtotal - subtotal * (dPct / 100);

                procedimientos.push({
                  especialidad_codigo: espCod,
                  especialidad_nombre: espNom,
                  fase: String(numeroFase),
                  duracion: duracion,
                  duracion_unidad: durUnidad,
                  subcategoria_nombre: subUI || svcData?.subtitulo || "OTROS",
                  nombre_servicio: descUI || svcData?.descripcion || "Servicio",
                  unidad: String(cant),
                  codigo: svcData?.codigo ?? codeFromText ?? "",
                  precio_unitario: pu,
                  descuento: dPct > 0 ? `${dPct}%` : "N.A",
                  total: Math.round(total),
                });
              });
          });

          observacionesFases[String(numeroFase)] = obsTokens.join("|");
        });

      // En modo con fases no se envían observaciones_por_categoria
    } else {
      // ============ SIN FASES ============
      // NUEVO: matriz ordenada de observaciones por categoría, conservando posición e incluyendo vacías
      const obsPorCategoria = [];
      const obsList = []; // se mantiene para 'observaciones_generales' (solo no vacías)

      document
        .querySelectorAll("#no-phase-categories .category-group")
        .forEach((catEl, indexPos) => {
          const catSel = catEl.querySelector(
            ".categoria-unica-select, .categoria-fase-select"
          );

          // — categoría (id + nombre) con fallback por el texto del option
          let categoriaId = catSel?.value ? int(catSel.value) : null;
          let catData =
            categorias.find((c) => String(c.id) === String(categoriaId)) ||
            null;
          if (!catData && catSel?.selectedOptions?.[0]) {
            const txt = catSel.selectedOptions[0].textContent || "";
            const m = txt.match(/^\s*0?(\d+)\s*-\s*([^:]+)/i);
            if (m) {
              categoriaId = int(m[1]);
              catData = { id: categoriaId, nombre_categoria: m[2].trim() };
            }
          }
          const espCod = catData ? pad2(catData.id) : "00";
          const espNom = catData ? catData.nombre_categoria : "SIN CATEGORÍA";

          // Observación de esta categoría (puede ser vacía, pero se registra igual)
          const obsCatRaw =
            catEl.querySelector(".observaciones-no-fase")?.value ?? "";
          const obsCatNorm = normalizeObs(obsCatRaw);

          // Guardar fila de observación por categoría preservando orden
          obsPorCategoria.push({
            indice: indexPos + 1, // posición en la UI (1-based)
            categoria_id: categoriaId ?? null,
            especialidad_codigo: espCod,
            especialidad_nombre: espNom,
            observacion: obsCatNorm || "", // incluir aunque esté vacía
          });

          // Solo para 'observaciones_generales' guardamos las NO vacías
          if (obsCatNorm) obsList.push(obsCatNorm);

          // Servicios de esta categoría
          catEl
            .querySelectorAll(".service-list .service-item")
            .forEach((item) => {
              const svcSel = item.querySelector(".servicio-select");
              if (!svcSel || !svcSel.value) return;

              const svcData =
                servicios.find((s) => String(s.id) === String(svcSel.value)) ||
                null;
              const optTxt =
                svcSel.options[svcSel.selectedIndex]?.textContent || "";
              const codeFromText = (optTxt.split(" - ")[0] || "").trim();

              const descUI =
                item.querySelector(".service-description")?.value?.trim() || "";
              const subUI =
                item.querySelector(".service-subtitle")?.value?.trim() || "";
              const cant = int(
                item.querySelector(".cantidad-servicio")?.value || 1,
                1
              );
              const dPct = num(
                item.querySelector(".descuento-servicio")?.value || 0,
                0
              );
              const pu = num(
                item.querySelector(".precio-unitario-servicio")?.value ??
                  svcData?.precio_neto ??
                  0,
                0
              );
              const subtotal = pu * cant;
              const total = subtotal - subtotal * (dPct / 100);

              procedimientos.push({
                especialidad_codigo: espCod,
                especialidad_nombre: espNom,
                fase: "",
                duracion: null,
                duracion_unidad: null,
                subcategoria_nombre: subUI || svcData?.subtitulo || "OTROS",
                nombre_servicio: descUI || svcData?.descripcion || "Servicio",
                unidad: String(cant),
                codigo: svcData?.codigo ?? codeFromText ?? "",
                precio_unitario: pu,
                descuento: dPct > 0 ? `${dPct}%` : "N.A",
                total: Math.round(total),
              });
            });

          // Adjuntar el arreglo al scope para consumirlo luego en el retorno
          root.__obsPorCategoriaSinFase = obsPorCategoria;
        });

      if (Array.isArray(root.__obsPorCategoriaSinFase)) {
        // si no hay categorías, será undefined; si hay, ya quedó poblado (con o sin textos)
      }

      if (obsList.length) {
        // Mantiene compatibilidad: string global con solo las no vacías
        observacionesGenerales = normalizeObs(obsList.join("|"));
      }
    }

    // Totales visibles (opcionales)
    const parseMoney = (txt) => num(txt, 0);
    const subtotal = parseMoney(
      document.getElementById("subtotal-cotizacion")?.textContent
    );
    const descuentoDinero = parseMoney(
      document.getElementById("descuento-cotizacion")?.textContent
    );
    const totalNeto = parseMoney(
      document.getElementById("total-cotizacion")?.textContent
    );

    // Objeto final
    const payload = {
      numero: String(window.currentQuoteId || "BORRADOR"),
      fecha_creacion: new Date().toISOString(),
      doctora: "Dra. Sandra P. Alarcón G.",
      nombre_paciente: nombrePaciente || "(sin nombre)",
      correo_paciente: correoPaciente || "",
      observaciones_fases: Object.keys(observacionesFases).length
        ? observacionesFases
        : undefined,
      observaciones_generales: observacionesGenerales || undefined,
      procedimientos,
      agrupar_por_fase: !!document.getElementById("use-phases")?.checked,
      firma_paciente_fecha: null,
      _totales: {
        subtotal,
        descuento_dinero: descuentoDinero,
        total_neto: totalNeto,
      },
    };

    // Si NO hay fases, adjuntamos el arreglo ordenado de observaciones por categoría (incluye vacías)
    if (!usarFases) {
      const obsPorCat = Array.isArray(root.__obsPorCategoriaSinFase)
        ? root.__obsPorCategoriaSinFase
        : [];
      payload.observaciones_por_categoria = obsPorCat;
    }

    // ===== Método de pago (solo lo necesario para el PDF) =====
    const metodoSel =
      document.querySelector('input[name="pago-metodo"]:checked')?.value ||
      null;

    const pago = {};
    if (metodoSel) pago.metodo = metodoSel; // "unico" | "aplazado"

    const totalParaPago = Number.isFinite(totalNeto) ? totalNeto : 0;
    const esOrtodAplazado = !!(window.hayOrtodoncia && metodoSel === "aplazado");
    const numeroCuotas = parseInt(
      document.getElementById("pago-numero-cuotas")?.value,
      10
    );
    const valorCuotaUI = num(
      document.getElementById("pago-valor-cuota")?.value,
      null
    );


    
////
    const pagadoFecha = num(
      document.getElementById("pago-pagado-a-fecha")?.value,
      null
    );
    if (pagadoFecha != null) pago.valor_pagado_a_la_fecha = pagadoFecha;

    const fhSel = document.querySelector(
      'input[name="fase-higienica"]:checked'
    )?.value;
    if (fhSel === "si") pago.fase_higienica_incluida = true;
    if (fhSel === "no") pago.fase_higienica_incluida = false;

    if (Object.keys(pago).length) {
      payload.pago = pago;
    }
/////////
    if (esOrtodAplazado) {
        // 👇 NUEVO esquema para ortodoncia
      const cuota1 = Math.round(totalParaPago * 0.15);
      const cuota2 = Math.round(totalParaPago * 0.15);
      const mensual = (Number.isFinite(numeroCuotas) && numeroCuotas > 0)
        ? Math.floor((totalParaPago * 0.70) / numeroCuotas)
        : null;

      pago.tipo = "cuotas_ortodoncia";
      pago.cuota_inicial_1 = cuota1;
      pago.cuota_inicial_2 = cuota2;
      pago.porcentaje_inicial_total = 30; // 15% + 15%
      if (!Number.isNaN(numeroCuotas)) pago.numero_cuotas = numeroCuotas;

      pago.valor_cuota = (mensual != null) ? mensual : valorCuotaUI;
      // si el pipeline PDF espera pago.cuota_inicial única, mando el 30%)
      pago.cuota_inicial = cuota1 + cuota2;
    } else if (metodoSel === "aplazado") {
      const cuotaInicial = num(
        document.getElementById("pago-cuota-inicial")?.value,
        null
      );
      
      if (cuotaInicial != null) pago.cuota_inicial = cuotaInicial;

      const numeroCuotas = parseInt(
        document.getElementById("pago-numero-cuotas")?.value,
        10
      );
      if (!Number.isNaN(numeroCuotas)) pago.numero_cuotas = numeroCuotas;

      const valorCuota = num(
        document.getElementById("pago-valor-cuota")?.value,
        null
      );
      if (valorCuota != null) pago.valor_cuota = valorCuota;
    }


/////////////
    return payload;
  }

  root.PDFPayload = { armarPayloadPDFDesdeUI };
})(window);
