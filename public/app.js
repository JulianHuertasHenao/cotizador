document.addEventListener("DOMContentLoaded", function () {
  // Elementos del DOM
  const cotizacionForm = document.getElementById("cotizacionForm");
  const procedimientosContainer = document.getElementById(
    "procedimientosContainer"
  );
  const agregarProcedimientoBtn = document.getElementById(
    "agregarProcedimiento"
  );
  const cotizacionesList = document.getElementById("cotizacionesList");
  const presetsContainer = document.getElementById("presetsContainer");
  const generatePdfBtn = document.getElementById("generatePdfBtn");
  const sendEmailBtn = document.getElementById("sendEmailBtn");
  const newQuoteBtn = document.getElementById("newQuoteBtn");

  // Elementos de totales
  const subtotalElement = document.getElementById("subtotal");
  const descuentoElement = document.getElementById("descuento");
  const totalElement = document.getElementById("total");

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  // Estado de la aplicación
  let currentQuoteId = null;
  let isEditing = false;
  let cotizacionesDB =
    JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];
  cargarCotizaciones();

  // Servicios odontológicos especializados
  const servicios = [
    { id: "1", nombre: "Consulta odontológica inicial", precio: 80000 },
    { id: "2", nombre: "Radiografía panorámica", precio: 120000 },
    { id: "3", nombre: "Limpieza dental profesional", precio: 150000 },
    { id: "4", nombre: "Blanqueamiento dental", precio: 350000 },
    { id: "5", nombre: "Carilla de porcelana (unidad)", precio: 600000 },
    { id: "6", nombre: "Corona dental", precio: 850000 },
    { id: "7", nombre: "Implante dental (incluye cirugía)", precio: 2500000 },
    { id: "8", nombre: "Ortodoncia metálica completa", precio: 4500000 },
    { id: "9", nombre: "Tratamiento de conducto", precio: 500000 },
    { id: "10", nombre: "Extracción dental simple", precio: 180000 },
    { id: "11", nombre: "Prótesis dental removible", precio: 1200000 },
    { id: "12", nombre: "Aplicación de flúor", precio: 70000 },
  ];

  // Plantillas/presets (simulados)

  const presets = [
    {
      id: "p1",
      nombre: "Chequeo Dental Completo",
      descripcion: "Incluye consulta inicial, radiografía y limpieza",
      procedimientos: [
        { servicioId: "1", cantidad: 1 },
        { servicioId: "2", cantidad: 1 },
        { servicioId: "3", cantidad: 1 },
      ],
    },
    {
      id: "p2",
      nombre: "Blanqueamiento Completo",
      descripcion: "Paquete completo de blanqueamiento dental",
      procedimientos: [
        { servicioId: "4", cantidad: 1 },
        { servicioId: "3", cantidad: 1 }, // Incluye limpieza previa
      ],
    },
    {
      id: "p3",
      nombre: "Rehabilitación Oral Básica",
      descripcion: "Para pacientes que requieren múltiples procedimientos",
      procedimientos: [
        { servicioId: "1", cantidad: 1 },
        { servicioId: "9", cantidad: 1 }, // Tratamiento de conducto
        { servicioId: "6", cantidad: 1 }, // Corona
        { servicioId: "3", cantidad: 1 }, // Limpieza
      ],
    },
    {
      id: "p4",
      nombre: "Ortodoncia Inicial",
      descripcion: "Paquete inicial de ortodoncia metálica",
      procedimientos: [
        { servicioId: "1", cantidad: 1 }, // Consulta
        { servicioId: "2", cantidad: 1 }, // Radiografía
        { servicioId: "8", cantidad: 1 }, // Ortodoncia completa
      ],
    },
  ];

  // Inicializar la aplicación
  init();

  function init() {
    // Cargar datos iniciales
    cargarCotizaciones();
    cargarPresets();

    // Agregar primer procedimiento por defecto
    agregarProcedimiento();

    // Configurar eventos
    setupEventListeners();
  }

  function setupEventListeners() {
    // Tabs
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("data-tab");
        switchTab(tabId);
      });
    });

    // Formulario
    agregarProcedimientoBtn.addEventListener("click", agregarProcedimiento);
    cotizacionForm.addEventListener("submit", guardarCotizacion);
    generatePdfBtn.addEventListener("click", generarPDF);
    sendEmailBtn.addEventListener("click", enviarCotizacion);
    newQuoteBtn.addEventListener("click", () => {
      nuevaCotizacion(); // limpia y crea un renglón vacío
      switchTab("new", true); // true = no recarga de nuevo
    });
  }

  /* =====  Tabla lógica → contenedor  ===== */
  const TAB_TO_DOM = {
    new: "newQuoteTab", // formulario en blanco
    edit: "newQuoteTab", // con datos cargados
    duplicate: "newQuoteTab", // con datos copiados
    history: "historyTab",
    presets: "presetsTab",
  };

  function switchTab(view, { reset = false, skipLoad = false } = {}) {
    /* 1. Normalizar vista solicitada */
    if (!TAB_TO_DOM[view]) view = "new";
    const destinoId = TAB_TO_DOM[view];

    /* 2. Apagar todas las secciones (display:none) y quitar .active */
    tabContents.forEach((sec) => {
      sec.style.display = "none";
      sec.classList.remove("active");
    });

    /* 3. Encender SOLO la sección destino */
    const destino = document.getElementById(destinoId);
    destino.style.display = ""; // deja que el CSS decida (block/flex…)
    destino.classList.add("active");

    /* 4. Pintar pestaña menú (edit / duplicate iluminan “new”) */
    const menuFocus = view === "edit" || view === "duplicate" ? "new" : view;
    tabs.forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-tab") === menuFocus
      );
    });

    /* 5. Cargas dinámicas */
    if (!skipLoad) {
      if (view === "history") cargarCotizaciones();
      if (view === "presets") cargarPresets();
    }
    /* 6. Reset de formulario SOLO cuando se pida explícitamente */
    if (reset) nuevaCotizacion();
  }

  function nuevaCotizacion() {
    // 1. Reiniciar estado
    currentQuoteId = null;
    isEditing = false;

    // 2. Actualizar título
    document.getElementById("quoteTitle").textContent = "Nueva Cotización";

    // 3. Limpiar formulario
    cotizacionForm.reset();

    // 4. Limpiar procedimientos y agregar uno nuevo
    procedimientosContainer.innerHTML = "";
    agregarProcedimiento();

    // 5. Calcular totales (para mostrar $0.00)
    calcularTotales();

    // 6. Cambiar a la pestaña "new" (FORZAR MOSTRAR EL FORMULARIO)
    switchTab("new");

    // 7. Asegurarse de que el contenedor esté visible [NUEVO]
    document.getElementById("newQuoteTab").classList.add("active"); // Forzar clase
    document.querySelector('.tab[data-tab="new"]').classList.add("active"); // Pestaña activa
  }

  function agregarProcedimiento(procedimientoData = null) {
    const procedimientoDiv = document.createElement("div");
    procedimientoDiv.className = "procedimiento-item";

    // Generar un ID único para este grupo de radios
    const radioGroupName = `discountType-${Date.now()}`;

    const servicioOptions = servicios
      .map(
        (s) =>
          `<option value="${s.id}" ${
            procedimientoData?.servicioId === s.id ? "selected" : ""
          }>${s.nombre} ($${s.precio.toLocaleString()})</option>`
      )
      .join("");

    procedimientoDiv.innerHTML = `
    <button class="remove-procedimiento" title="Eliminar procedimiento">&times;</button>
    
    <div class="form-group">
      <label>Servicio:</label>
      <select class="form-control servicioSelect" required>
        <option value="">Seleccione un servicio</option>
        ${servicioOptions}
      </select>
    </div>
    
    <div class="form-group">
      <label>Precio Unitario:</label>
      <input type="number" class="form-control precioUnitario" min="0" step="0.01" required
             value="${procedimientoData?.precio_unitario || ""}">
    </div>
    
    <div class="form-group">
      <label>Cantidad:</label>
      <input type="number" class="form-control cantidad" min="1" value="${
        procedimientoData?.cantidad || 1
      }">
    </div>
    
    <div class="form-group">
      <label>Descuento:</label>
      <input type="number" class="form-control descuento" min="0" 
             value="${
               procedimientoData?.descuento_individual || 0
             }" step="0.01">
      
      <div class="discount-options">
        <div class="discount-option">
          <input type="radio" name="${radioGroupName}" value="amount" ${
      !procedimientoData || procedimientoData.discount_type !== "percent"
        ? "checked"
        : ""
    }>
          <label>Monto fijo</label>
        </div>
        <div class="discount-option">
          <input type="radio" name="${radioGroupName}" value="percent" ${
      procedimientoData && procedimientoData.discount_type === "percent"
        ? "checked"
        : ""
    }>
          <label>Porcentaje</label>
        </div>
      </div>
    </div>
  `;

    procedimientosContainer.appendChild(procedimientoDiv);

    // Configurar eventos
    const select = procedimientoDiv.querySelector(".servicioSelect");
    const precioInput = procedimientoDiv.querySelector(".precioUnitario");
    const removeBtn = procedimientoDiv.querySelector(".remove-procedimiento");

    // Seleccionar servicio
    select.addEventListener("change", function () {
      if (this.value) {
        const selectedService = servicios.find((s) => s.id === this.value);
        precioInput.value = selectedService.precio;
      }
      calcularTotales();
    });

    // Eliminar procedimiento
    removeBtn.addEventListener("click", function () {
      if (document.querySelectorAll(".procedimiento-item").length > 1) {
        procedimientoDiv.remove();
        calcularTotales();
      } else {
        alert("Debe haber al menos un procedimiento");
      }
    });

    // Calcular totales cuando cambian los valores
    ["input", "change"].forEach((event) => {
      select.addEventListener(event, calcularTotales);
      precioInput.addEventListener(event, calcularTotales);
      procedimientoDiv
        .querySelector(".cantidad")
        .addEventListener(event, calcularTotales);
      procedimientoDiv
        .querySelector(".descuento")
        .addEventListener(event, calcularTotales);
      procedimientoDiv
        .querySelectorAll('input[type="radio"]')
        .forEach((radio) => {
          radio.addEventListener(event, calcularTotales);
        });
    });

    if (procedimientoData) {
      calcularTotales();
    }
  }

  // En app.js (frontend)
  function calcularTotales() {
    let subtotal = 0;
    let descuentoTotal = 0;

    document.querySelectorAll(".procedimiento-item").forEach((procDiv) => {
      const precio =
        parseFloat(procDiv.querySelector(".precioUnitario").value) || 0;
      const cantidad = parseInt(procDiv.querySelector(".cantidad").value) || 1;
      const descuentoValor =
        parseFloat(procDiv.querySelector(".descuento").value) || 0;
      const esPorcentaje = procDiv.querySelector(
        'input[type="radio"][value="percent"]'
      ).checked;

      const subtotalProcedimiento = precio * cantidad;
      subtotal += subtotalProcedimiento;

      // Calcular descuento (si es porcentaje o monto fijo)
      const descuento = esPorcentaje
        ? subtotalProcedimiento * (descuentoValor / 100) // % sobre el subtotal
        : descuentoValor; // Monto fijo

      descuentoTotal += descuento;
    });

    const total = subtotal - descuentoTotal;

    // Actualizar la UI
    subtotalElement.textContent = formatearMoneda(subtotal);
    descuentoElement.textContent = formatearMoneda(descuentoTotal);
    totalElement.textContent = formatearMoneda(total);

    return { subtotal, descuentoTotal, total };
  }

  // Función auxiliar para formato de moneda
  function formatearMoneda(valor) {
    return `$${valor.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  }

  async function guardarCotizacion(e) {
    e.preventDefault();

    // 1. Validación básica
    const nombrePaciente = document
      .getElementById("nombrePaciente")
      .value.trim();
    if (!nombrePaciente) {
      alert("El nombre del paciente es requerido");
      return;
    }

    // 2. Recoger datos del formulario
    const cotizacionData = {
      nombre_paciente: nombrePaciente,
      correo_paciente: document.getElementById("correoPaciente").value.trim(),
      observaciones: document.getElementById("observaciones").value.trim(),
      procedimientos: [],
      estado: "borrador",
      fecha_creacion: new Date().toISOString(),
    };

    // 3. Recoger procedimientos con validación
    let hayProcedimientosValidos = false;

    document.querySelectorAll(".procedimiento-item").forEach((procDiv) => {
      try {
        const servicioSelect = procDiv.querySelector(".servicioSelect");
        if (!servicioSelect || !servicioSelect.value) return; // Saltar si no hay servicio

        const servicio = servicios.find((s) => s.id === servicioSelect.value);
        if (!servicio) return;

        const precio =
          parseFloat(procDiv.querySelector(".precioUnitario").value) ||
          servicio.precio;
        const cantidad =
          parseInt(procDiv.querySelector(".cantidad").value) || 1;
        const descuento =
          parseFloat(procDiv.querySelector(".descuento").value) || 0;
        const discountType = procDiv.querySelector(
          'input[type="radio"]:checked'
        ).value;

        cotizacionData.procedimientos.push({
          nombre_servicio: servicio.nombre,
          precio_unitario: precio,
          cantidad: cantidad,
          descuento_individual: descuento,
          discount_type: discountType,
        });

        hayProcedimientosValidos = true;
      } catch (error) {
        console.error("Error procesando procedimiento:", error);
      }
    });

    if (!hayProcedimientosValidos) {
      alert("Debe agregar al menos un procedimiento válido");
      return;
    }

    // 4. Calcular totales (simulado)
    const { total_bruto, total_descuento, total_neto } = calcularTotalesObjeto(
      cotizacionData.procedimientos
    );
    cotizacionData.total_bruto = total_bruto;
    cotizacionData.total_descuento = total_descuento;
    cotizacionData.total_neto = total_neto;

    // 5. Guardado simulado
    try {
      if (isEditing && currentQuoteId) {
        // Actualizar cotización existente
        const index = cotizacionesDB.findIndex((c) => c.id === currentQuoteId);
        if (index !== -1) {
          cotizacionesDB[index] = {
            ...cotizacionesDB[index],
            ...cotizacionData,
          };
        } else {
          throw new Error("Cotización no encontrada para editar");
        }
      } else {
        // Nueva cotización
        const nuevaCotizacion = {
          id: "sim-" + Date.now(), // ID simulado
          ...cotizacionData,
        };
        cotizacionesDB.push(nuevaCotizacion);
        currentQuoteId = nuevaCotizacion.id;
        isEditing = true;
      }

      // 6. Feedback al usuario
      alert(
        `Cotización ${
          isEditing ? "actualizada" : "guardada"
        } correctamente (modo simulado)`
      );
      document.getElementById(
        "quoteTitle"
      ).textContent = `Editando Cotización #${currentQuoteId.slice(-6)}`; // Mostrar ID corto

      // 7. Actualizar lista y cambiar pestaña
      cargarCotizaciones();
      // Dentro del bloque try, después de actualizar cotizacionesDB:
      localStorage.setItem(
        "cotizacionesSimuladas",
        JSON.stringify(cotizacionesDB)
      );
      switchTab("history");
    } catch (error) {
      console.error("Error en guardado simulado:", error);
      alert(`Error al guardar: ${error.message}`);
    }
  }

  // Función auxiliar para calcular totales desde objeto
  function calcularTotalesObjeto(procedimientos) {
    let totalBruto = 0;
    let totalDescuento = 0;

    procedimientos.forEach((proc) => {
      const subtotal = proc.precio_unitario * proc.cantidad;
      totalBruto += subtotal;

      const descuento =
        proc.discount_type === "percent"
          ? subtotal * (proc.descuento_individual / 100)
          : proc.descuento_individual;

      totalDescuento += descuento;
    });

    return {
      total_bruto: totalBruto,
      total_descuento: totalDescuento,
      total_neto: totalBruto - totalDescuento,
    };
  }

  //Historial , aqui se muestra en la seccion historial lo que se guarda en nuevas cotizaciones
  async function cargarCotizaciones() {
    try {
      // Cargar desde localStorage en lugar de hacer fetch
      const cotizaciones =
        JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];

      cotizacionesList.innerHTML = "";

      if (cotizaciones.length === 0) {
        cotizacionesList.innerHTML = "<p>No hay cotizaciones guardadas aún</p>";
        return;
      }

      // Ordenar por fecha más reciente primero
      cotizaciones.sort(
        (a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
      );

      // Crear tabla de cotizaciones
      const table = document.createElement("table");
      table.className = "table";
      table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Paciente</th>
          <th>Fecha</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${cotizaciones
          .map(
            (cotizacion) => `
          <tr>
            <td>${cotizacion.id.slice(-6)}</td>
            <td>${cotizacion.nombre_paciente}</td>
            <td>${new Date(cotizacion.fecha_creacion).toLocaleDateString()}</td>
            <td>$${
              cotizacion.total_neto?.toLocaleString("es-CO", {
                minimumFractionDigits: 2,
              }) || "0.00"
            }</td>
            <td>
              <span class="badge ${getBadgeClass(cotizacion.estado)}">
                ${cotizacion.estado}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editarCotizacion('${
                  cotizacion.id
                }')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="descargarPDF('${
                  cotizacion.id
                }')">
                  <i class="fas fa-file-pdf"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="enviarCotizacion('${
                  cotizacion.id
                }')">
                  <i class="fas fa-paper-plane"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="duplicarCotizacion('${
                  cotizacion.id
                }')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;

      cotizacionesList.appendChild(table);
    } catch (error) {
      console.error("Error al cargar cotizaciones:", error);
      cotizacionesList.innerHTML = `
      <div class="alert alert-danger">
        Error al cargar cotizaciones: ${error.message}
      </div>
    `;
    }
  }

  function getBadgeClass(estado) {
    switch (estado) {
      case "enviada":
        return "badge-success";
      case "aceptada":
        return "badge-primary";
      case "rechazada":
        return "badge-danger";
      default:
        return "badge-warning";
    }
  }

  async function cargarPresets() {
    try {
      // En una app real, esto vendría de una API
      presetsContainer.innerHTML = "";

      if (presets.length === 0) {
        presetsContainer.innerHTML = "<p>No hay plantillas guardadas</p>";
        return;
      }

      presets.forEach((preset) => {
        const presetCard = document.createElement("div");
        presetCard.className = "preset-card";
        presetCard.innerHTML = `
          <div class="preset-name">${preset.nombre}</div>
          <div class="preset-desc">${preset.descripcion}</div>
          <div class="action-buttons" style="margin-top: 10px;">
            <button class="btn btn-sm btn-primary" onclick="usarPreset('${preset.id}')">
              <i class="fas fa-check"></i> Usar
            </button>
          </div>
        `;

        presetsContainer.appendChild(presetCard);
      });
    } catch (error) {
      console.error("Error:", error);
      presetsContainer.innerHTML =
        '<div class="alert alert-danger">Error al cargar plantillas</div>';
    }
  }

  async function generarPDF() {
    try {
      // Obtener datos básicos de validación
      const nombrePaciente = document
        .getElementById("nombrePaciente")
        .value.trim();
      if (!nombrePaciente) {
        alert("Debe ingresar al menos el nombre del paciente");
        return;
      }

      // Preparar objeto cotización según el caso
      const cotizacionData = {
        id: currentQuoteId || "temp-" + Date.now(),
        nombre_paciente: nombrePaciente,
        correo_paciente: document.getElementById("correoPaciente").value.trim(),
        observaciones: document.getElementById("observaciones").value.trim(),
        procedimientos: obtenerProcedimientosActuales(),
        fecha_creacion: new Date().toISOString(),
        estado: "borrador",
        ...calcularTotalesObjeto(obtenerProcedimientosActuales()),
      };

      // Llamar a la función de generación de PDF
      await generarYDescargarPDF(cotizacionData);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert(`Error al generar PDF: ${error.message}`);
    }
  }

  async function generarYDescargarPDF(cotizacion) {
    const res = await fetch("/api/generar-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotizacion }),
    });
    if (!res.ok) throw new Error("Error al generar PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // Descarga
    const link = document.createElement("a");
    link.href = url;
    link.download = `cotizacion_${cotizacion.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Función auxiliar para obtener los procedimientos actuales del formulario
  function obtenerProcedimientosActuales() {
    const procedimientos = [];

    document.querySelectorAll(".procedimiento-item").forEach((procDiv) => {
      const servicioSelect = procDiv.querySelector(".servicioSelect");
      const servicio = servicios.find((s) => s.id === servicioSelect.value);

      if (servicio) {
        const precio =
          parseFloat(procDiv.querySelector(".precioUnitario").value) ||
          servicio.precio;
        const cantidad =
          parseInt(procDiv.querySelector(".cantidad").value) || 1;
        const descuento =
          parseFloat(procDiv.querySelector(".descuento").value) || 0;
        const discountType = procDiv.querySelector(
          'input[type="radio"]:checked'
        ).value;

        procedimientos.push({
          nombre_servicio: servicio.nombre,
          precio_unitario: precio,
          cantidad: cantidad,
          descuento_individual: descuento,
          discount_type: discountType,
        });
      }
    });

    return procedimientos;
  }

  async function enviarCotizacion(quoteId = null) {
    const id = quoteId || currentQuoteId;
    if (!id) {
      alert("Primero guarde la cotización");
      return;
    }

    try {
      const response = await fetch(`/api/cotizaciones/${id}/enviar`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Cotización enviada a: ${result.emailSimulado.details.to}\n\n(Simulado - no se envió realmente)`
        );
        cargarCotizaciones();
      } else {
        alert(`Error: ${result.error || "No se pudo enviar la cotización"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al enviar la cotización");
    }
  }

  window.usarPreset = function (presetId) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    // Limpiar formulario
    currentQuoteId = null;
    isEditing = false;
    document.getElementById("quoteTitle").textContent = "Nueva Cotización";
    document.getElementById("nombrePaciente").value = "";
    document.getElementById("correoPaciente").value = "";
    document.getElementById("observaciones").value = "";
    procedimientosContainer.innerHTML = "";

    // Agregar procedimientos del preset
    preset.procedimientos.forEach((proc) => {
      const servicio = servicios.find((s) => s.id === proc.servicioId);
      if (servicio) {
        agregarProcedimiento({
          servicioId: servicio.id,
          precio_unitario: servicio.precio,
          cantidad: proc.cantidad,
          descuento_individual: 0,
        });
      }
    });

    switchTab("new");
  };

  ////
  //
  //
  // SECCION DE BOTONES DE ACCION
  ////
  //
  //

  window.descargarPDF = async function (id) {
    try {
      // Obtener cotización de localStorage
      const cotizaciones =
        JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];
      const cotizacion = cotizaciones.find((c) => c.id === id);

      if (!cotizacion) {
        throw new Error("Cotización no encontrada");
      }

      // Usar la misma función de generación
      await generarYDescargarPDF(cotizacion);
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      alert(`Error al descargar PDF: ${error.message}`);
    }
  };

  window.editarCotizacion = async function (id) {
    try {
      const cotizaciones =
        JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];
      const cotizacion = cotizaciones.find((c) => c.id === id);

      if (!cotizacion) {
        throw new Error("Cotización no encontrada en el historial");
      }

      // Configurar estado de edición
      currentQuoteId = id;
      isEditing = true;
      document.getElementById(
        "quoteTitle"
      ).textContent = `Editando Cotización #${id.slice(-6)}`;

      // Llenar datos básicos del formulario
      document.getElementById("nombrePaciente").value =
        cotizacion.nombre_paciente;
      document.getElementById("correoPaciente").value =
        cotizacion.correo_paciente;
      document.getElementById("observaciones").value =
        cotizacion.observaciones || "";

      // Limpiar y reconstruir procedimientos
      procedimientosContainer.innerHTML = "";
      cotizacion.procedimientos.forEach((proc) => {
        const servicio = servicios.find(
          (s) => s.nombre === proc.nombre_servicio
        );
        if (servicio) {
          agregarProcedimiento({
            servicioId: servicio.id,
            precio_unitario: proc.precio_unitario,
            cantidad: proc.cantidad,
            descuento_individual: proc.descuento_individual,
            discount_type: proc.discount_type || "amount",
          });
        }
      });

      // Calcular y mostrar totales
      calcularTotales();

      // Cambiar a pestaña new sin ejecutar acciones adicionales
      switchTab("new", true);

      // Forzar visualización del formulario
      document.getElementById("newQuoteTab").style.display = "block";
    } catch (error) {
      console.error("Error al editar cotización:", error);
      alert(`Error al editar: ${error.message}`);
    }
  };

  window.duplicarCotizacion = async function (id) {
    try {
      const cotizaciones =
        JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];
      const original = cotizaciones.find((c) => c.id === id);

      if (!original) {
        throw new Error("Cotización original no encontrada");
      }

      // Configurar estado como nueva cotización
      currentQuoteId = null;
      isEditing = false;
      document.getElementById("quoteTitle").textContent =
        "Nueva Cotización (Duplicado)";

      // Llenar datos básicos
      document.getElementById(
        "nombrePaciente"
      ).value = `${original.nombre_paciente} (Copia)`;
      document.getElementById("correoPaciente").value =
        original.correo_paciente;
      document.getElementById("observaciones").value =
        original.observaciones || "";

      // Limpiar y reconstruir procedimientos
      procedimientosContainer.innerHTML = "";
      original.procedimientos.forEach((proc) => {
        const servicio = servicios.find(
          (s) => s.nombre === proc.nombre_servicio
        );
        if (servicio) {
          agregarProcedimiento({
            servicioId: servicio.id,
            precio_unitario: proc.precio_unitario,
            cantidad: proc.cantidad,
            descuento_individual: proc.descuento_individual,
            discount_type: proc.discount_type || "amount",
          });
        }
      });

      // Calcular y mostrar totales
      calcularTotales();

      // Cambiar a pestaña new sin ejecutar acciones adicionales
      switchTab("new", true);

      // Forzar visualización del formulario
      document.getElementById("newQuoteTab").style.display = "block";
    } catch (error) {
      console.error("Error al duplicar cotización:", error);
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  window.enviarCotizacion = async function (id) {
    try {
      // Obtener cotización de localStorage
      const cotizaciones =
        JSON.parse(localStorage.getItem("cotizacionesSimuladas")) || [];
      const cotizacion = cotizaciones.find((c) => c.id === id);

      if (!cotizacion) {
        throw new Error("Cotización no encontrada");
      }

      // Simular envío (en un caso real harías una petición al servidor)
      const confirmacion = confirm(
        `¿Enviar cotización a ${cotizacion.correo_paciente}?\n\nPaciente: ${
          cotizacion.nombre_paciente
        }\nTotal: $${cotizacion.total_neto.toLocaleString("es-CO")}`
      );

      if (confirmacion) {
        // Actualizar estado en localStorage
        const updatedCotizaciones = cotizaciones.map((c) =>
          c.id === id ? { ...c, estado: "enviada" } : c
        );
        localStorage.setItem(
          "cotizacionesSimuladas",
          JSON.stringify(updatedCotizaciones)
        );

        // Actualizar UI
        cargarCotizaciones();
        alert(`Cotización enviada a ${cotizacion.correo_paciente} (simulado)`);
      }
    } catch (error) {
      console.error("Error al enviar cotización:", error);
      alert(`Error al enviar: ${error.message}`);
    }
  };
});
