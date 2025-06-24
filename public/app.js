document.addEventListener("DOMContentLoaded", function () {
  // Elementos del DOM necesarios
  const cotizacionesList = document.getElementById("cotizacionesList");
  const presetsContainer = document.getElementById("presetsContainer");
  const newQuoteBtn = document.getElementById("newQuoteBtn");

  // Tabs y navegación
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  const TAB_TO_DOM = {
    new: "newQuoteTab",
    edit: "newQuoteTab",
    duplicate: "newQuoteTab",
    history: "historyTab",
    presets: "presetsTab",
  };

  // Estado de la aplicación
  let currentQuoteId = null;
  let isEditing = false;
  let pacientes = [];
  let categorias = [];
  let servicios = [];
  let currentFaseId = 0;
  let presets = []; // Asumiendo que los presets se cargan desde algún lugar

  // Inicialización
  init();

  async function init() {
    await cargarPacientes();
    await cargarCategorias();
    await cargarServicios();
    cargarCotizaciones();
    cargarPresets();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Navegación por tabs
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("data-tab");
        switchTab(tabId);
      });
    });

    // Botón nueva cotización
    newQuoteBtn.addEventListener("click", () => {
      nuevaCotizacion();
      switchTab("new", true);
    });

    // Nuevos listeners para el formulario de cotización
    document
      .getElementById("nuevoPacienteBtn")
      .addEventListener("click", toggleNuevoPacienteForm);
    document
      .getElementById("agregarFaseBtn")
      .addEventListener("click", agregarFase);
    document
      .getElementById("pacienteSelect")
      .addEventListener("change", handlePacienteSelectChange);
    document
      .getElementById("cotizacionForm")
      .addEventListener("submit", guardarCotizacion);
    document
      .getElementById("generatePdfBtn")
      .addEventListener("click", generarPDFDesdeFormulario);
    document
      .getElementById("sendEmailBtn")
      .addEventListener("click", enviarDesdeFormulario);
  }

  // Función principal de navegación
  function switchTab(view, { reset = false, skipLoad = false } = {}) {
    if (!TAB_TO_DOM[view]) view = "new";
    const destinoId = TAB_TO_DOM[view];

    // Ocultar todos los contenidos
    tabContents.forEach((sec) => {
      sec.style.display = "none";
      sec.classList.remove("active");
    });

    // Mostrar contenido seleccionado
    const destino = document.getElementById(destinoId);
    destino.style.display = "";
    destino.classList.add("active");

    // Resaltar tab activo
    const menuFocus = view === "edit" || view === "duplicate" ? "new" : view;
    tabs.forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-tab") === menuFocus
      );
    });

    // Cargar datos si es necesario
    if (!skipLoad) {
      if (view === "history") cargarCotizaciones();
      if (view === "presets") cargarPresets();
    }

    // Resetear formulario si se solicita
    if (reset) nuevaCotizacion();
  }

  function nuevaCotizacion() {
    currentQuoteId = null;
    isEditing = false;
    document.getElementById("quoteTitle").textContent = "Nueva Cotización";
    document.getElementById("cotizacionForm").reset();
    document.getElementById("nuevoPacienteForm").style.display = "none";
    document.getElementById("fasesContainer").innerHTML = "";
    currentFaseId = 0;

    switchTab("new");
  }

  // Cargar historial de cotizaciones
  async function cargarCotizaciones() {
    try {
      const response = await fetch("/api/cotizaciones");
      const cotizaciones = await response.json();

      cotizacionesList.innerHTML = "";

      if (cotizaciones.length === 0) {
        cotizacionesList.innerHTML = "<p>No hay cotizaciones guardadas aún</p>";
        return;
      }

      cotizaciones.sort(
        (a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
      );

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
        <td>${String(cotizacion.id).slice(-6)}</td>
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
            <button class="btn btn-sm btn-primary" title="Editar" onclick="editarCotizacion('${
              cotizacion.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-success" title="Descargar PDF" onclick="descargarPDF('${
              cotizacion.id
            }')">
              <i class="fas fa-file-pdf"></i>
            </button>
            <button class="btn btn-sm btn-warning" title="Enviar" onclick="enviarCotizacion('${
              cotizacion.id
            }')">
              <i class="fas fa-paper-plane"></i>
            </button>
            <button class="btn btn-sm btn-secondary" title="Duplicar" onclick="duplicarCotizacion('${
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

  // Cargar presets
  async function cargarPresets() {
    try {
      const response = await fetch("/api/presets");
      presets = await response.json();
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
          <div class="action-buttons">
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

  // Funciones para el nuevo formulario de cotización
  async function cargarPacientes() {
    try {
      const response = await fetch("/api/pacientes");
      pacientes = await response.json();
      actualizarSelectPacientes();
    } catch (error) {
      console.error("Error al cargar pacientes:", error);
    }
  }

  async function cargarCategorias() {
    try {
      const response = await fetch("/api/categorias");
      categorias = await response.json();
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  async function cargarServicios() {
    try {
      const response = await fetch("/api/servicios");
      servicios = await response.json();
    } catch (error) {
      console.error("Error al cargar servicios:", error);
    }
  }

  function actualizarSelectPacientes() {
    const select = document.getElementById("pacienteSelect");
    select.innerHTML = '<option value="">Buscar paciente existente...</option>';

    pacientes.forEach((paciente) => {
      const option = document.createElement("option");
      option.value = paciente.id;
      option.textContent = `${paciente.nombre} - ${
        paciente.correo || "Sin correo"
      }`;
      select.appendChild(option);
    });
  }

  function toggleNuevoPacienteForm() {
    const form = document.getElementById("nuevoPacienteForm");
    form.style.display = form.style.display === "none" ? "block" : "none";
    if (form.style.display === "block") {
      document.getElementById("pacienteSelect").value = "";
    }
  }

  function handlePacienteSelectChange(e) {
    if (e.target.value) {
      document.getElementById("nuevoPacienteForm").style.display = "none";
    }
  }

  function agregarFase() {
    currentFaseId++;
    const template = document.getElementById("faseTemplate");
    const clone = template.content.cloneNode(true);
    const faseCard = clone.querySelector(".fase-card");
    faseCard.dataset.faseId = currentFaseId;

    const faseNumero = faseCard.querySelector(".fase-numero");
    faseNumero.textContent = currentFaseId;

    // Llenar categorías en el select
    const categoriaSelect = faseCard.querySelector(".categoria-select");
    categorias.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria.id;
      option.textContent = categoria.nombre_categoria;
      categoriaSelect.appendChild(option);
    });

    // Evento para agregar servicio
    faseCard
      .querySelector(".agregar-servicio")
      .addEventListener("click", () => {
        agregarServicioAFase(faseCard);
      });

    // Evento para eliminar fase
    faseCard.querySelector(".remove-fase").addEventListener("click", () => {
      faseCard.remove();
      calcularTotalesGenerales();
    });

    document.getElementById("fasesContainer").appendChild(faseCard);
    agregarServicioAFase(faseCard);
  }

  function agregarServicioAFase(faseCard) {
    const template = document.getElementById("servicioTemplate");
    const clone = template.content.cloneNode(true);
    const servicioItem = clone.querySelector(".servicio-item");

    // Evento para eliminar servicio
    servicioItem
      .querySelector(".remove-servicio")
      .addEventListener("click", () => {
        servicioItem.remove();
        calcularTotalesFase(faseCard);
        calcularTotalesGenerales();
      });

    // Eventos para cálculos
    const cantidadInput = servicioItem.querySelector(".cantidad");
    const descuentoInput = servicioItem.querySelector(".descuento");

    const calcularServicio = () => {
      const precioUnitario =
        parseFloat(servicioItem.querySelector(".precio-unitario").value) || 0;
      const cantidad = parseInt(cantidadInput.value) || 1;
      const descuento = parseFloat(descuentoInput.value) || 0;

      const subtotal = precioUnitario * cantidad;
      const descuentoMonto = subtotal * (descuento / 100);
      const total = subtotal - descuentoMonto;

      servicioItem.querySelector(".total-servicio").value = total.toFixed(2);
      calcularTotalesFase(faseCard);
      calcularTotalesGenerales();
    };

    cantidadInput.addEventListener("change", calcularServicio);
    descuentoInput.addEventListener("change", calcularServicio);

    // Evento para cambio de categoría
    const categoriaSelect = servicioItem.querySelector(".categoria-select");
    categoriaSelect.addEventListener("change", (e) => {
      const servicioSelect = e.target
        .closest(".servicio-item")
        .querySelector(".servicio-select");
      actualizarServiciosSelect(e.target.value, servicioSelect);
    });

    // Evento para cambio de servicio
    const servicioSelect = servicioItem.querySelector(".servicio-select");
    servicioSelect.addEventListener("change", (e) => {
      const servicioId = e.target.value;
      const servicio = servicios.find((s) => s.id == servicioId);
      if (servicio) {
        servicioItem.querySelector(".precio-unitario").value =
          servicio.precio_neto.toFixed(2);
        calcularServicio();
      }
    });

    faseCard.querySelector(".servicios-container").appendChild(servicioItem);
  }

  function actualizarServiciosSelect(categoriaId, servicioSelect) {
    servicioSelect.innerHTML =
      '<option value="">Seleccionar servicio...</option>';
    servicioSelect.disabled = !categoriaId;

    if (categoriaId) {
      const serviciosCategoria = servicios.filter(
        (s) => s.categoria_id == categoriaId
      );
      serviciosCategoria.forEach((servicio) => {
        const option = document.createElement("option");
        option.value = servicio.id;
        option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
        servicioSelect.appendChild(option);
      });
    }
  }

  function calcularTotalesFase(faseCard) {
    let subtotal = 0;
    let descuentoTotal = 0;

    faseCard.querySelectorAll(".servicio-item").forEach((servicioItem) => {
      const precioUnitario =
        parseFloat(servicioItem.querySelector(".precio-unitario").value) || 0;
      const cantidad =
        parseInt(servicioItem.querySelector(".cantidad").value) || 1;
      const descuento =
        parseFloat(servicioItem.querySelector(".descuento").value) || 0;

      const subtotalServicio = precioUnitario * cantidad;
      const descuentoServicio = subtotalServicio * (descuento / 100);

      subtotal += subtotalServicio;
      descuentoTotal += descuentoServicio;
    });

    const total = subtotal - descuentoTotal;

    faseCard.querySelector(".fase-subtotal").textContent = `$${subtotal.toFixed(
      2
    )}`;
    faseCard.querySelector(
      ".fase-descuento"
    ).textContent = `$${descuentoTotal.toFixed(2)}`;
    faseCard.querySelector(
      ".fase-total-amount"
    ).textContent = `$${total.toFixed(2)}`;
  }

  function calcularTotalesGenerales() {
    let subtotal = 0;
    let descuentoTotal = 0;

    document.querySelectorAll(".fase-card").forEach((faseCard) => {
      const faseSubtotal =
        parseFloat(
          faseCard.querySelector(".fase-subtotal").textContent.replace("$", "")
        ) || 0;
      const faseDescuento =
        parseFloat(
          faseCard.querySelector(".fase-descuento").textContent.replace("$", "")
        ) || 0;

      subtotal += faseSubtotal;
      descuentoTotal += faseDescuento;
    });

    const total = subtotal - descuentoTotal;

    document.getElementById(
      "subtotal-cotizacion"
    ).textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById(
      "descuento-cotizacion"
    ).textContent = `$${descuentoTotal.toFixed(2)}`;
    document.getElementById("total-cotizacion").textContent = `$${total.toFixed(
      2
    )}`;
  }

  async function guardarCotizacion(e) {
    e.preventDefault();

    // Validar que haya al menos una fase con servicios
    const fases = document.querySelectorAll(".fase-card");
    if (fases.length === 0) {
      alert("Debe agregar al menos una fase con servicios");
      return;
    }

    // Obtener datos del paciente
    let pacienteId = document.getElementById("pacienteSelect").value;
    const nuevoPacienteForm = document.getElementById("nuevoPacienteForm");

    // Si es un nuevo paciente
    if (nuevoPacienteForm.style.display !== "none") {
      const nuevoPaciente = {
        nombre: document.getElementById("nombrePaciente").value,
        correo: document.getElementById("correoPaciente").value,
        telefono: document.getElementById("telefonoPaciente").value,
        direccion: document.getElementById("direccionPaciente").value,
      };

      if (!nuevoPaciente.nombre) {
        alert("El nombre del paciente es obligatorio");
        return;
      }

      try {
        const response = await fetch("/api/pacientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoPaciente),
        });

        const result = await response.json();
        pacienteId = result.id;
      } catch (error) {
        console.error("Error al guardar paciente:", error);
        alert("Error al guardar paciente");
        return;
      }
    }

    if (!pacienteId) {
      alert("Debe seleccionar o crear un paciente");
      return;
    }

    // Recolectar datos de la cotización
    const cotizacion = {
      id: currentQuoteId,
      paciente_id: pacienteId,
      observaciones: document.getElementById("observaciones").value,
      total: parseFloat(
        document.getElementById("total-cotizacion").textContent.replace("$", "")
      ),
      fases: [],
    };

    // Recolectar datos de las fases
    fases.forEach((faseCard) => {
      const fase = {
        numero_fase: parseInt(
          faseCard.querySelector(".fase-numero").textContent
        ),
        servicios: [],
      };

      faseCard.querySelectorAll(".servicio-item").forEach((servicioItem) => {
        const servicioId = servicioItem.querySelector(".servicio-select").value;
        if (servicioId) {
          fase.servicios.push({
            servicio_id: servicioId,
            cantidad:
              parseInt(servicioItem.querySelector(".cantidad").value) || 1,
            precio_unitario:
              parseFloat(
                servicioItem.querySelector(".precio-unitario").value
              ) || 0,
            descuento:
              parseFloat(servicioItem.querySelector(".descuento").value) || 0,
            total:
              parseFloat(servicioItem.querySelector(".total-servicio").value) ||
              0,
          });
        }
      });

      cotizacion.fases.push(fase);
    });

    // Enviar al servidor
    try {
      const url =
        isEditing && currentQuoteId
          ? `/api/cotizaciones/${currentQuoteId}`
          : "/api/cotizaciones";
      const method = isEditing && currentQuoteId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cotizacion),
      });

      if (!response.ok) throw new Error("Error al guardar cotización");

      const result = await response.json();
      alert("Cotización guardada exitosamente");
      switchTab("history");
      cargarCotizaciones();
    } catch (error) {
      console.error("Error al guardar cotización:", error);
      alert(`Error: ${error.message}`);
    }
  }

  async function generarPDFDesdeFormulario() {
    // Validar que haya al menos una fase con servicios
    const fases = document.querySelectorAll(".fase-card");
    if (fases.length === 0) {
      alert("Debe agregar al menos una fase con servicios para generar el PDF");
      return;
    }

    // Recolectar datos del formulario para el PDF
    const pacienteId = document.getElementById("pacienteSelect").value;
    let paciente = pacientes.find((p) => p.id == pacienteId);

    if (
      !paciente &&
      document.getElementById("nuevoPacienteForm").style.display !== "none"
    ) {
      paciente = {
        nombre: document.getElementById("nombrePaciente").value,
        correo: document.getElementById("correoPaciente").value,
        telefono: document.getElementById("telefonoPaciente").value,
        direccion: document.getElementById("direccionPaciente").value,
      };
    }

    if (!paciente) {
      alert("Debe seleccionar o crear un paciente");
      return;
    }

    const datosCotizacion = {
      paciente: paciente,
      observaciones: document.getElementById("observaciones").value,
      total: document.getElementById("total-cotizacion").textContent,
      fases: [],
    };

    fases.forEach((faseCard) => {
      const fase = {
        numero: faseCard.querySelector(".fase-numero").textContent,
        subtotal: faseCard.querySelector(".fase-subtotal").textContent,
        descuento: faseCard.querySelector(".fase-descuento").textContent,
        total: faseCard.querySelector(".fase-total-amount").textContent,
        servicios: [],
      };

      faseCard.querySelectorAll(".servicio-item").forEach((servicioItem) => {
        const servicioSelect = servicioItem.querySelector(".servicio-select");
        if (servicioSelect.value) {
          const servicio = servicios.find((s) => s.id == servicioSelect.value);
          fase.servicios.push({
            nombre: servicio.descripcion,
            cantidad: servicioItem.querySelector(".cantidad").value,
            precio: servicioItem.querySelector(".precio-unitario").value,
            descuento: servicioItem.querySelector(".descuento").value + "%",
            total: servicioItem.querySelector(".total-servicio").value,
          });
        }
      });

      datosCotizacion.fases.push(fase);
    });

    try {
      const res = await fetch("/api/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion: datosCotizacion }),
      });

      if (!res.ok) throw new Error("Error al generar PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cotizacion_${paciente.nombre.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert(`Error: ${error.message}`);
    }
  }

  async function enviarDesdeFormulario() {
    // Validar que haya al menos una fase con servicios
    const fases = document.querySelectorAll(".fase-card");
    if (fases.length === 0) {
      alert("Debe agregar al menos una fase con servicios para enviar");
      return;
    }

    const pacienteId = document.getElementById("pacienteSelect").value;
    let paciente = pacientes.find((p) => p.id == pacienteId);

    if (
      !paciente &&
      document.getElementById("nuevoPacienteForm").style.display !== "none"
    ) {
      paciente = {
        nombre: document.getElementById("nombrePaciente").value,
        correo: document.getElementById("correoPaciente").value,
        telefono: document.getElementById("telefonoPaciente").value,
        direccion: document.getElementById("direccionPaciente").value,
      };
    }

    if (!paciente) {
      alert("Debe seleccionar o crear un paciente");
      return;
    }

    if (!paciente.correo) {
      alert(
        "El paciente debe tener un correo electrónico para enviar la cotización"
      );
      return;
    }

    const confirmacion = confirm(
      `¿Enviar cotización a ${paciente.correo}?\n\n` +
        `Paciente: ${paciente.nombre}\n` +
        `Total: ${document.getElementById("total-cotizacion").textContent}`
    );

    if (confirmacion) {
      try {
        // Primero guardamos la cotización si no está guardada
        if (!currentQuoteId) {
          await guardarCotizacion(new Event("submit"));
          return; // El guardado recargará la página y podremos enviar después
        }

        // Si ya está guardada, procedemos a enviar
        const response = await fetch(
          `/api/cotizaciones/${currentQuoteId}/enviar`,
          {
            method: "POST",
          }
        );

        if (!response.ok) throw new Error("Error al enviar");

        alert(`Cotización enviada a ${paciente.correo}`);
        cargarCotizaciones();
      } catch (error) {
        console.error("Error al enviar:", error);
        alert(`Error: ${error.message}`);
      }
    }
  }

  // Funciones globales para acciones del historial
  window.usarPreset = function (presetId) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    currentQuoteId = null;
    isEditing = false;
    switchTab("new", true);

    // Aquí podrías implementar la carga de los servicios del preset en el formulario
    // dependiendo de cómo estén estructurados tus presets
  };

  window.editarCotizacion = async function (id) {
    try {
      const response = await fetch(`/api/cotizaciones/${id}`);
      const cotizacion = await response.json();

      if (!cotizacion) throw new Error("Cotización no encontrada");

      // Limpiar formulario
      document.getElementById("cotizacionForm").reset();
      document.getElementById("fasesContainer").innerHTML = "";
      currentFaseId = 0;

      // Establecer paciente
      document.getElementById("pacienteSelect").value = cotizacion.paciente_id;

      // Establecer observaciones
      document.getElementById("observaciones").value =
        cotizacion.observaciones || "";

      // Cargar fases y servicios
      if (cotizacion.fases && cotizacion.fases.length > 0) {
        cotizacion.fases.forEach((faseData) => {
          agregarFase();
          const faseCard = document.querySelector(
            `.fase-card[data-fase-id="${currentFaseId}"]`
          );
          const faseNumero = faseCard.querySelector(".fase-numero");
          faseNumero.textContent = faseData.numero_fase;

          if (faseData.servicios && faseData.servicios.length > 0) {
            faseData.servicios.forEach((servicioData) => {
              agregarServicioAFase(faseCard);
              const servicioItem = faseCard.querySelector(
                ".servicio-item:last-child"
              );

              // Buscar el servicio para obtener categoría y detalles
              const servicio = servicios.find(
                (s) => s.id == servicioData.servicio_id
              );
              if (servicio) {
                const categoriaSelect =
                  servicioItem.querySelector(".categoria-select");
                categoriaSelect.value = servicio.categoria_id;

                // Disparar evento change para cargar servicios
                const event = new Event("change");
                categoriaSelect.dispatchEvent(event);

                // Esperar un momento para que se carguen los servicios
                setTimeout(() => {
                  const servicioSelect =
                    servicioItem.querySelector(".servicio-select");
                  servicioSelect.value = servicioData.servicio_id;

                  // Disparar evento change para cargar precio
                  const servicioEvent = new Event("change");
                  servicioSelect.dispatchEvent(servicioEvent);

                  // Establecer cantidad y descuento
                  servicioItem.querySelector(".cantidad").value =
                    servicioData.cantidad;
                  servicioItem.querySelector(".descuento").value =
                    servicioData.descuento;

                  // Calcular totales
                  const calcularEvent = new Event("change");
                  servicioItem
                    .querySelector(".cantidad")
                    .dispatchEvent(calcularEvent);
                }, 100);
              }
            });
          }
        });
      }

      currentQuoteId = id;
      isEditing = true;
      document.getElementById("quoteTitle").textContent = "Editar Cotización";
      switchTab("new");
    } catch (error) {
      console.error("Error al editar:", error);
      alert(`Error: ${error.message}`);
    }
  };

  window.duplicarCotizacion = async function (id) {
    try {
      const response = await fetch(`/api/cotizaciones/${id}`);
      const original = await response.json();

      if (!original) throw new Error("Cotización no encontrada");

      // Limpiar formulario
      document.getElementById("cotizacionForm").reset();
      document.getElementById("fasesContainer").innerHTML = "";
      currentFaseId = 0;

      // Establecer paciente
      document.getElementById("pacienteSelect").value = original.paciente_id;

      // Establecer observaciones
      document.getElementById("observaciones").value =
        original.observaciones || "";

      // Cargar fases y servicios
      if (original.fases && original.fases.length > 0) {
        original.fases.forEach((faseData) => {
          agregarFase();
          const faseCard = document.querySelector(
            `.fase-card[data-fase-id="${currentFaseId}"]`
          );
          const faseNumero = faseCard.querySelector(".fase-numero");
          faseNumero.textContent = faseData.numero_fase;

          if (faseData.servicios && faseData.servicios.length > 0) {
            faseData.servicios.forEach((servicioData) => {
              agregarServicioAFase(faseCard);
              const servicioItem = faseCard.querySelector(
                ".servicio-item:last-child"
              );

              // Buscar el servicio para obtener categoría y detalles
              const servicio = servicios.find(
                (s) => s.id == servicioData.servicio_id
              );
              if (servicio) {
                const categoriaSelect =
                  servicioItem.querySelector(".categoria-select");
                categoriaSelect.value = servicio.categoria_id;

                // Disparar evento change para cargar servicios
                const event = new Event("change");
                categoriaSelect.dispatchEvent(event);

                // Esperar un momento para que se carguen los servicios
                setTimeout(() => {
                  const servicioSelect =
                    servicioItem.querySelector(".servicio-select");
                  servicioSelect.value = servicioData.servicio_id;

                  // Disparar evento change para cargar precio
                  const servicioEvent = new Event("change");
                  servicioSelect.dispatchEvent(servicioEvent);

                  // Establecer cantidad y descuento
                  servicioItem.querySelector(".cantidad").value =
                    servicioData.cantidad;
                  servicioItem.querySelector(".descuento").value =
                    servicioData.descuento;

                  // Calcular totales
                  const calcularEvent = new Event("change");
                  servicioItem
                    .querySelector(".cantidad")
                    .dispatchEvent(calcularEvent);
                }, 100);
              }
            });
          }
        });
      }

      currentQuoteId = null;
      isEditing = false;
      document.getElementById("quoteTitle").textContent = "Duplicar Cotización";
      switchTab("new");
    } catch (error) {
      console.error("Error al duplicar:", error);
      alert(`Error: ${error.message}`);
    }
  };

  window.descargarPDF = async function (id) {
    try {
      const response = await fetch(`/api/cotizaciones/${id}`);
      const cotizacion = await response.json();

      if (!cotizacion) throw new Error("Cotización no encontrada");

      const res = await fetch("/api/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion }),
      });

      if (!res.ok) throw new Error("Error al generar PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cotizacion_${cotizacion.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      alert(`Error: ${error.message}`);
    }
  };

  window.enviarCotizacion = async function (id) {
    try {
      const response = await fetch(`/api/cotizaciones/${id}`);
      const cotizacion = await response.json();

      if (!cotizacion) throw new Error("Cotización no encontrada");

      const confirmacion = confirm(
        `¿Enviar cotización a ${cotizacion.correo_paciente}?\n\n` +
          `Paciente: ${cotizacion.nombre_paciente}\n` +
          `Total: $${cotizacion.total_neto.toLocaleString("es-CO")}`
      );

      if (confirmacion) {
        const updateResponse = await fetch(`/api/cotizaciones/${id}/enviar`, {
          method: "POST",
        });

        if (!updateResponse.ok) throw new Error("Error al enviar");

        alert(`Cotización enviada a ${cotizacion.correo_paciente}`);
        cargarCotizaciones();
      }
    } catch (error) {
      console.error("Error al enviar:", error);
      alert(`Error: ${error.message}`);
    }
  };
});
