document.addEventListener("DOMContentLoaded", function () {
    // Elementos del DOM necesarios
    const cotizacionesList = document.getElementById("cotizacionesList");
    const presetsContainer = document.getElementById("presetsContainer");
    const newQuoteBtn = document.getElementById("newQuoteBtn");
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");
    const TAB_TO_DOM = {
        new: "newQuoteTab",
        edit: "newQuoteTab",
        duplicate: "newQuoteTab",
        history: "historyTab",
        presets: "presetsTab",
    };
    let currentQuoteId = null;
    let isEditing = false;
    let pacientes = [];
    let categorias = [];
    let servicios = [];
    let currentFaseId = 0;
    let presets = [];

    // Inicialización
    init();
    async function init() {
        // Carga todo en paralelo y espera a que todo esté listo antes de inicializar selects y listeners
        await Promise.all([
            cargarPacientes(),
            cargarCategorias(),
            cargarServicios(),
        ]);
        inicializarPrimeraCategoria();
        cargarCotizaciones();
        cargarPresets();
        setupEventListeners();
        // Asegura que la barra de búsqueda de pacientes se inicialice después de cargar los datos
        setupPacienteSearchBar();
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

    function inicializarPrimeraCategoria() {
        // Inicializa la fila estática de categoría y sus eventos
        const categoriaSelect = document.querySelector(
            "#categoriaServiciosRow .categoria-unica-select"
        );
        const serviciosContainer = document.querySelector(
            "#categoriaServiciosRow .servicios-categorias-container"
        );
        if (categoriaSelect) {
            categoriaSelect.innerHTML =
                '<option value="">Seleccionar categoría...</option>';
            categorias.forEach((cat) => {
                const option = document.createElement("option");
                option.value = cat.id;
                option.textContent = cat.nombre_categoria;
                categoriaSelect.appendChild(option);
            });
            categoriaSelect.addEventListener("change", function () {
                serviciosContainer.innerHTML = "";
                if (this.value) {
                    agregarServicioEnCategoriasDinamico(
                        serviciosContainer,
                        this.value
                    );
                }
            });
            // Selecciona automáticamente la primera categoría si existe
            if (categorias.length > 0) {
                categoriaSelect.value = categorias[0].id;
                categoriaSelect.dispatchEvent(new Event("change"));
            }
        }
    }

    function agregarServicioInicialEnCategorias() {
        // Asegura que siempre haya al menos un servicio visible al cargar
        if (
            !document.querySelector(
                "#serviciosCategoriasContainer .servicio-item"
            )
        ) {
            agregarServicioEnCategorias();
        }
    }

    // Refactor: función genérica para agregar un servicio a un contenedor de servicios de categoría
    function agregarServicioEnCategoriasDinamico(
        serviciosContainer,
        categoriaId
    ) {
        const template = document.getElementById("servicioTemplate");
        if (!template) {
            console.error("No se encontró el template de servicio");
            return;
        }
        const clone = template.content.cloneNode(true);
        const servicioItem = clone.querySelector(".servicio-item");
        // Llenar servicios SOLO de la categoría seleccionada
        const servicioSelect = servicioItem.querySelector(".servicio-select");
        if (servicioSelect) {
            servicioSelect.innerHTML =
                '<option value="">Seleccionar servicio...</option>';
            const serviciosCategoria = servicios.filter(
                (s) => s.categoria_id == categoriaId
            );
            serviciosCategoria.forEach((servicio, idx) => {
                const option = document.createElement("option");
                option.value = servicio.id;
                option.textContent = `${servicio.codigo} - ${servicio.descripcion} ($${Number(servicio.precio_neto).toLocaleString('es-CO', {minimumFractionDigits: 2})})`;
                option.dataset.precio = servicio.precio_neto;
                servicioSelect.appendChild(option);
            });
            servicioSelect.addEventListener("change", () => {
                actualizarPrecioServicio(servicioItem);
                actualizarTotalCategorias();
            });
            // Selecciona automáticamente el primer servicio si existe
            if (serviciosCategoria.length > 0) {
                servicioSelect.value = serviciosCategoria[0].id;
                // Mostrar el precio unitario de una vez
                const precioUnitarioSpan = servicioItem.querySelector('.precio-unitario-servicio');
                if (precioUnitarioSpan) {
                    precioUnitarioSpan.textContent = `$${Number(serviciosCategoria[0].precio_neto).toLocaleString('es-CO', {minimumFractionDigits: 2})}`;
                }
                actualizarPrecioServicio(servicioItem);
            }
        }
        // Eventos de cantidad y descuento
        const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
        const descuentoInput = servicioItem.querySelector(
            ".descuento-servicio"
        );
        if (cantidadInput) {
            cantidadInput.addEventListener("input", () => {
                actualizarPrecioServicio(servicioItem);
                actualizarTotalCategorias();
            });
        }
        if (descuentoInput) {
            descuentoInput.addEventListener("input", () => {
                actualizarPrecioServicio(servicioItem);
                actualizarTotalCategorias();
            });
        }
        // Botón para agregar más servicios dentro de la misma categoría
        const agregarBtn = servicioItem.querySelector(".agregar-servicio");
        if (agregarBtn) {
            agregarBtn.addEventListener("click", () => {
                agregarServicioEnCategoriasDinamico(
                    serviciosContainer,
                    categoriaId
                );
            });
        }
        // Botón para eliminar servicio
        const removeBtn = servicioItem.querySelector(".remove-servicio");
        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                servicioItem.remove();
                actualizarTotalCategorias();
            });
        }
        serviciosContainer.appendChild(servicioItem);
        actualizarPrecioServicio(servicioItem);
        actualizarTotalCategorias();
    }

    // Cierre de la función principal y del archivo
    // --- Hacer visibles las variables globales fuera del bloque principal ---
    window.servicios = servicios;
    window.categorias = categorias;
    window.pacientes = pacientes;
    // Si necesitas exponer más funciones globales, agrégalas aquí.
});

function actualizarPrecioServicio(servicioItem) {
    const servicioSelect = servicioItem.querySelector(".servicio-select");
    const precioSpan = servicioItem.querySelector(".precio-servicio");
    const precioUnitarioSpan = servicioItem.querySelector(".precio-unitario-servicio");
    const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
    const descuentoInput = servicioItem.querySelector(".descuento-servicio");
    let precio = 0;
    let cantidad = 1;
    let descuento = 0;
    if (servicioSelect && servicioSelect.value) {
        // Buscar el servicio en window.servicios si no está en el scope local
        let listaServicios = typeof servicios !== 'undefined' ? servicios : (window.servicios || []);
        const servicio = listaServicios.find((s) => String(s.id) === String(servicioSelect.value));
        if (servicio && typeof servicio.precio_neto !== 'undefined') {
            precio = Number(servicio.precio_neto);
        } else {
            // fallback: intenta leer del select
            const selectedOption = servicioSelect.options[servicioSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset && selectedOption.dataset.precio) {
                precio = Number(selectedOption.dataset.precio);
            }
        }
    }
    if (cantidadInput && !isNaN(parseInt(cantidadInput.value))) {
        cantidad = Math.max(1, parseInt(cantidadInput.value));
    }
    if (descuentoInput && !isNaN(parseFloat(descuentoInput.value))) {
        descuento = Math.max(
            0,
            Math.min(100, parseFloat(descuentoInput.value))
        );
    }
    let total = precio * cantidad;
    let totalConDescuento = total - (total * descuento) / 100;
    if (precioUnitarioSpan) {
        precioUnitarioSpan.textContent = precio ? `$${Number(precio).toLocaleString('es-CO', {minimumFractionDigits: 2})}` : '';
        precioUnitarioSpan.style.display = 'inline-block';
    } else {
        console.warn('No se encontró el span .precio-unitario-servicio en', servicioItem);
    }
    if (precioSpan) {
        precioSpan.textContent = `$${totalConDescuento.toFixed(2)}`;
        precioSpan.style.display = 'inline-block';
    } else {
        console.warn('No se encontró el span .precio-servicio en', servicioItem);
    }
}

function actualizarTotalCategorias() {
    // Suma todos los servicios de todas las filas de categorías
    let subtotal = 0;
    let totalDescuentos = 0;
    let total = 0;
    document
        .querySelectorAll(".servicios-categorias-container")
        .forEach((container) => {
            container.querySelectorAll(".servicio-item").forEach((item) => {
                const select = item.querySelector(".servicio-select");
                const cantidadInput = item.querySelector(".cantidad-servicio");
                const descuentoInput = item.querySelector(
                    ".descuento-servicio"
                );
                let precio = 0;
                let cantidad = 1;
                let descuento = 0;
                if (select && select.value) {
                    // Buscar el servicio en la lista global
                    const servicio = servicios.find(
                        (s) => String(s.id) === String(select.value)
                    );
                    if (servicio && typeof servicio.precio_neto !== 'undefined') {
                        precio = Number(servicio.precio_neto);
                    } else {
                        // fallback: intenta leer del select
                        const selectedOption = select.options[select.selectedIndex];
                        if (selectedOption && selectedOption.dataset && selectedOption.dataset.precio) {
                            precio = Number(selectedOption.dataset.precio);
                        }
                    }
                }
                if (cantidadInput && !isNaN(parseInt(cantidadInput.value))) {
                    cantidad = Math.max(1, parseInt(cantidadInput.value));
                }
                if (
                    descuentoInput &&
                    !isNaN(parseFloat(descuentoInput.value))
                ) {
                    descuento = Math.max(
                        0,
                        Math.min(100, parseFloat(descuentoInput.value))
                    );
                }
                let subtotalServicio = precio * cantidad;
                let descuentoServicio = subtotalServicio * (descuento / 100);
                let totalServicio = subtotalServicio - descuentoServicio;
                subtotal += subtotalServicio;
                totalDescuentos += descuentoServicio;
                total += totalServicio;
                // Mostrar el precio unitario y total en la fila de servicio
                const precioUnitarioSpan = item.querySelector('.precio-unitario-servicio');
                const precioTotalSpan = item.querySelector('.precio-servicio');
                if (precioUnitarioSpan) {
                    precioUnitarioSpan.textContent = precio ? `$${Number(precio).toLocaleString('es-CO', {minimumFractionDigits: 2})}` : '';
                    precioUnitarioSpan.style.display = 'inline-block';
                }
                if (precioTotalSpan) {
                    precioTotalSpan.textContent = `$${totalServicio.toLocaleString('es-CO', {minimumFractionDigits: 2})}`;
                    precioTotalSpan.style.display = 'inline-block';
                }
            });
        });
    document.getElementById(
        "subtotal-cotizacion"
    ).textContent = `$${subtotal.toLocaleString('es-CO', {minimumFractionDigits: 2})}`;
    document.getElementById(
        "descuento-cotizacion"
    ).textContent = `$${totalDescuentos.toLocaleString('es-CO', {minimumFractionDigits: 2})}`;
    document.getElementById("total-cotizacion").textContent = `$${total.toLocaleString('es-CO', {minimumFractionDigits: 2})}`;
}

function limpiarServiciosCategorias() {
    const cont = document.getElementById("serviciosCategoriasContainer");
    if (cont) cont.innerHTML = "";
}

function setupEventListeners() {
    // Navegación por tabs
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const tabId = tab.getAttribute("data-tab");
            switchTab(tabId);
        });
    });
    newQuoteBtn.addEventListener("click", () => {
        nuevaCotizacion();
        switchTab("new", true);
    });
    document
        .getElementById("nuevoPacienteBtn")
        .addEventListener("click", toggleNuevoPacienteForm);
    document
        .getElementById("agregarFaseBtn")
        .addEventListener("click", agregarFase);
    document
        .getElementById("cotizacionForm")
        .addEventListener("submit", guardarCotizacion);
    document
        .getElementById("generatePdfBtn")
        .addEventListener("click", generarPDFDesdeFormulario);
    document
        .getElementById("sendEmailBtn")
        .addEventListener("click", enviarDesdeFormulario);
    document
        .getElementById("guardarPacienteBtn")
        .addEventListener("click", guardarPaciente);
    // Listener robusto para el botón de activar/desactivar fases
    function bindFasesButtonListener() {
        const btnFases = document.getElementById("confirmacionFases");
        if (btnFases) {
            // Elimina listeners previos para evitar duplicados
            btnFases.replaceWith(btnFases.cloneNode(true));
            const btnFasesNuevo = document.getElementById("confirmacionFases");
            btnFasesNuevo.addEventListener("click", activarFases);
        }
    }
    // Asociar al cargar
    bindFasesButtonListener();
    // MutationObserver: si el botón aparece dinámicamente, asociar el listener
    const observerFasesBtn = new MutationObserver(() => {
        bindFasesButtonListener();
    });
    observerFasesBtn.observe(document.body, { childList: true, subtree: true });
    // Refuerzo: volver a asociar tras cada cambio de pestaña
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            setTimeout(bindFasesButtonListener, 100);
        });
    });
    // Delegación para el botón de agregar categoría (siempre funciona)
    document
        .getElementById("categoriasContainer")
        .addEventListener("click", function (e) {
            if (e.target.closest("#agregarCategoriaBtn")) {
                agregarCategoriaDeTratamiento();
            }
        });
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
    if (reset) {
        nuevaCotizacion();
        actualizarSelectCategorias();
    }

    // Si se cambia a la pestaña de nueva cotización, actualizar el selector de categorías
    if (view === "new") {
        setTimeout(actualizarSelectCategorias, 0);
    }
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
            cotizacionesList.innerHTML =
                "<p>No hay cotizaciones guardadas aún</p>";
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

function guardarPaciente() {
    const nombre = document.getElementById("nombrePaciente").value;
    const correo = document.getElementById("correoPaciente").value;
    const telefono = document.getElementById("telefonoPaciente").value;

    fetch("/api/pacientes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, correo, telefono }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.id) {
                alert("Paciente guardado correctamente con ID: " + data.id);
                // Aquí puedes limpiar el formulario o actualizar lista de pacientes si lo deseas
                toggleNuevoPacienteForm(); // Oculta el formulario
                cargarPacientes();
            } else {
                alert("Error al guardar paciente");
            }
        })
        .catch((err) => {
            console.error("Error al guardar paciente:", err);
        });
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
        // Inicializa Select2 solo después de cargar pacientes y poblar el select
        if (
            window.jQuery &&
            $("#pacienteSelect").length &&
            !$("#pacienteSelect").hasClass("select2-hidden-accessible")
        ) {
            $("#pacienteSelect").select2({
                placeholder: "Buscar paciente existente...",
                allowClear: true,
                width: "resolve",
                tags: true,
                language: {
                    inputTooShort: function () {
                        return "Escribe para buscar o crear";
                    },
                    noResults: function (params) {
                        if (params && params.term && params.term.length > 0) {
                            return (
                                "Presiona Enter para usar: <strong>" +
                                params.term +
                                "</strong>"
                            );
                        }
                        return "No se encontraron pacientes";
                    },
                },
                matcher: function (params, data) {
                    if ($.trim(params.term) === "") {
                        return data;
                    }
                    if (typeof data.text === "undefined") {
                        return null;
                    }
                    const term = params.term.toLowerCase();
                    const text = data.text.toLowerCase();
                    if (text.includes(term)) {
                        return data;
                    }
                    return null;
                },
                createTag: function (params) {
                    var exists = false;
                    $("#pacienteSelect option").each(function () {
                        if (
                            $(this).text().toLowerCase() ===
                            params.term.toLowerCase()
                        ) {
                            exists = true;
                            return false;
                        }
                    });
                    if (exists) return null;
                    return {
                        id: params.term,
                        text: params.term,
                        newOption: true,
                    };
                },
                templateResult: function (data) {
                    if (data.newOption) {
                        return $(
                            '<span><em>Escribir: "' +
                                data.text +
                                '"</em></span>'
                        );
                    }
                    return data.text;
                },
                templateSelection: function (data) {
                    return data.text;
                },
            });

            // Evento: si selecciona un "nuevo" texto, abrir formulario de nuevo paciente y rellenar nombre
            $("#pacienteSelect").on("select2:select", function (e) {
                var data = e.params.data;
                var esNuevo = data && data.newOption;
                if (esNuevo) {
                    document.getElementById("nuevoPacienteForm").style.display =
                        "block";
                    document.getElementById("nombrePaciente").value = data.text;
                    setTimeout(function () {
                        $("#pacienteSelect").val("").trigger("change");
                    }, 100);
                }
            });
        }
    } catch (error) {
        console.error("Error al cargar pacientes:", error);
    }
}

async function cargarCategorias() {
    try {
        const response = await fetch("/api/categorias");
        categorias = await response.json();
        actualizarSelectCategorias();
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

// El bloque anterior de inicialización Select2 se elimina y se integra en cargarPacientes().

// Actualiza las opciones del select y refresca Select2
function actualizarSelectPacientes(filtro = "") {
    const select = document.getElementById("pacienteSelect");
    const valorActual = $(select).val();
    // Limpiar opciones
    select.innerHTML = '<option value="">Buscar paciente existente...</option>';
    // Filtrar pacientes por nombre
    const pacientesFiltrados = filtro
        ? pacientes.filter(
              (p) =>
                  p.nombre &&
                  p.nombre.toLowerCase().includes(filtro.toLowerCase())
          )
        : pacientes;
    pacientesFiltrados.forEach((paciente) => {
        const option = document.createElement("option");
        option.value = paciente.id;
        // Incluye nombre y correo en el texto visible para que Select2 lo busque
        option.textContent = `${paciente.nombre} - ${
            paciente.correo || "Sin correo"
        }`;
        select.appendChild(option);
    });
    // Refrescar Select2
    if (window.jQuery && $(select).data("select2")) {
        $(select).trigger("change.select2");
    }
    // Restaurar selección si existe
    if (valorActual) $(select).val(valorActual).trigger("change");
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

    // Llenar categorías en el select usando la función centralizada
    const categoriaSelect = faseCard.querySelector(".categoria-select");
    if (categoriaSelect) {
        categoriaSelect.innerHTML =
            '<option value="">Seleccionar categoría...</option>';
        categorias.forEach((cat) => {
            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.nombre_categoria;
            categoriaSelect.appendChild(option);
        });
    }

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
function activarFases() {
    const div = document.getElementById("div-fases");
    const boton = document.getElementById("confirmacionFases");
    if (!div) {
        console.error('[Cotizador] No se encontró el div con id "div-fases". Verifica el HTML.');
        return;
    }
    if (!boton) {
        console.error('[Cotizador] No se encontró el botón con id "confirmacionFases".');
        return;
    }
    // Alternar clase y forzar display para máxima robustez
    const isActive = div.classList.contains('fases-activas');
    // Elimina cualquier mensaje previo
    const msgPrev = div.querySelector('.estado-fases-msg');
    if (msgPrev) msgPrev.remove();
    if (isActive) {
        div.classList.remove('fases-activas');
        div.style.display = 'none';
        boton.textContent = "Activar fases";
        div.setAttribute('data-estado-fases', 'oculto');
        const msg = document.createElement('div');
        msg.className = 'estado-fases-msg';
        msg.style.color = '#888';
        msg.style.fontSize = '0.95em';
        msg.textContent = 'Las fases están ocultas.';
        div.appendChild(msg);
        console.log('[Cotizador] Fases ocultas (display=none)');
    } else {
        div.classList.add('fases-activas');
        div.style.display = 'block';
        boton.textContent = "Desactivar fases";
        div.setAttribute('data-estado-fases', 'visible');
        const msg = document.createElement('div');
        msg.className = 'estado-fases-msg';
        msg.style.color = '#007bff';
        msg.style.fontSize = '0.95em';
        msg.textContent = 'Las fases están visibles.';
        div.appendChild(msg);
        console.log('[Cotizador] Fases visibles (display=block)');
    }
}
function agregarServicioIndependienteEnCategorias() {
    const template = document.getElementById("servicioTemplate");
    const clone = template.content.cloneNode(true);
    const servicioItem = clone.querySelector(".servicio-item");

    // Eventos
    servicioItem
        .querySelector(".remove-servicio")
        .addEventListener("click", () => {
            servicioItem.remove();
            calcularTotalesGenerales(); // sin fases
        });

    const cantidadInput = servicioItem.querySelector(".cantidad");
    const descuentoInput = servicioItem.querySelector(".descuento");

    const calcularServicio = () => {
        const precioUnitario =
            parseFloat(servicioItem.querySelector(".precio-unitario").value) ||
            0;
        const cantidad = parseInt(cantidadInput.value) || 1;
        const descuento = parseFloat(descuentoInput.value) || 0;

        const subtotal = precioUnitario * cantidad;
        const descuentoMonto = subtotal * (descuento / 100);
        const total = subtotal - descuentoMonto;

        servicioItem.querySelector(".total-servicio").value = total.toFixed(2);
        calcularTotalesGenerales();
    };

    cantidadInput.addEventListener("change", calcularServicio);
    descuentoInput.addEventListener("change", calcularServicio);

    const categoriaSelect = servicioItem.querySelector(".categoria-select");
    categoriaSelect.addEventListener("change", (e) => {
        const servicioSelect = e.target
            .closest(".servicio-item")
            .querySelector(".servicio-select");
        actualizarServiciosSelect(e.target.value, servicioSelect);
    });

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

    document.getElementById("categoriasContainer").appendChild(servicioItem);
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
            parseFloat(servicioItem.querySelector(".precio-unitario").value) ||
            0;
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
            parseFloat(servicioItem.querySelector(".precio-unitario").value) ||
            0;
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
                faseCard
                    .querySelector(".fase-subtotal")
                    .textContent.replace("$", "")
            ) || 0;
        const faseDescuento =
            parseFloat(
                faseCard
                    .querySelector(".fase-descuento")
                    .textContent.replace("$", "")
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
            document
                .getElementById("total-cotizacion")
                .textContent.replace("$", "")
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
            const servicioId =
                servicioItem.querySelector(".servicio-select").value;
            if (servicioId) {
                fase.servicios.push({
                    servicio_id: servicioId,
                    cantidad:
                        parseInt(
                            servicioItem.querySelector(".cantidad").value
                        ) || 1,
                    precio_unitario:
                        parseFloat(
                            servicioItem.querySelector(".precio-unitario").value
                        ) || 0,
                    descuento:
                        parseFloat(
                            servicioItem.querySelector(".descuento").value
                        ) || 0,
                    total:
                        parseFloat(
                            servicioItem.querySelector(".total-servicio").value
                        ) || 0,
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
        alert(
            "Debe agregar al menos una fase con servicios para generar el PDF"
        );
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
            const servicioSelect =
                servicioItem.querySelector(".servicio-select");
            if (servicioSelect.value) {
                const servicio = servicios.find(
                    (s) => s.id == servicioSelect.value
                );
                fase.servicios.push({
                    nombre: servicio.descripcion,
                    cantidad: servicioItem.querySelector(".cantidad").value,
                    precio: servicioItem.querySelector(".precio-unitario")
                        .value,
                    descuento:
                        servicioItem.querySelector(".descuento").value + "%",
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
        link.download = `cotizacion_${paciente.nombre.replace(
            /\s+/g,
            "_"
        )}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert(`Error: ${error.message}`);
    }
}
function agregarServicioLibre() {
    const template = document.getElementById("servicioTemplate");
    const clone = template.content.cloneNode(true);
    const servicioItem = clone.querySelector(".servicio-item");

    // Eliminar
    servicioItem
        .querySelector(".remove-servicio")
        .addEventListener("click", () => {
            servicioItem.remove();
            calcularTotalesGenerales();
        });

    // Cálculo
    const cantidadInput = servicioItem.querySelector(".cantidad");
    const descuentoInput = servicioItem.querySelector(".descuento");

    const calcularServicio = () => {
        const precioUnitario =
            parseFloat(servicioItem.querySelector(".precio-unitario").value) ||
            0;
        const cantidad = parseInt(cantidadInput.value) || 1;
        const descuento = parseFloat(descuentoInput.value) || 0;
        const subtotal = precioUnitario * cantidad;
        const descuentoMonto = subtotal * (descuento / 100);
        const total = subtotal - descuentoMonto;

        servicioItem.querySelector(".total-servicio").value = total.toFixed(2);
        calcularTotalesGenerales();
    };

    cantidadInput.addEventListener("change", calcularServicio);
    descuentoInput.addEventListener("change", calcularServicio);

    // Select de categorías
    const categoriaSelect = servicioItem.querySelector(".categoria-select");
    categoriaSelect.addEventListener("change", (e) => {
        const servicioSelect = e.target
            .closest(".servicio-item")
            .querySelector(".servicio-select");
        actualizarServiciosSelect(e.target.value, servicioSelect);
    });

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

    document
        .querySelector("#categoriasContainer .servicios-container")
        .appendChild(servicioItem);
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

// --- Búsqueda y selección de pacientes con barra de búsqueda ---
function setupPacienteSearchBar() {
    const input = document.getElementById("pacienteSearchInput");
    const results = document.getElementById("pacienteSearchResults");
    let currentResults = [];
    let selectedIndex = -1;

    function renderResults(filtro) {
        results.innerHTML = "";
        if (!filtro) {
            results.style.display = "none";
            return;
        }
        const filtroLower = filtro.toLowerCase();
        const encontrados = pacientes.filter(
            (p) =>
                (p.nombre && p.nombre.toLowerCase().includes(filtroLower)) ||
                (p.correo && p.correo.toLowerCase().includes(filtroLower))
        );
        currentResults = encontrados;
        selectedIndex = -1;
        if (encontrados.length === 0) {
            // Opción para crear nuevo paciente
            const div = document.createElement("div");
            div.className = "search-option new";
            div.textContent = `Escribir: \"${filtro}\"`;
            div.onclick = () => seleccionarNuevoPaciente(filtro);
            results.appendChild(div);
            results.style.display = "block";
            return;
        }
        encontrados.forEach((p, idx) => {
            const div = document.createElement("div");
            div.className = "search-option";
            div.textContent = `${p.nombre} - ${p.correo || "Sin correo"}`;
            div.onclick = () => seleccionarPaciente(p);
            results.appendChild(div);
        });
        // Opción para crear nuevo paciente aunque haya coincidencias
        const div = document.createElement("div");
        div.className = "search-option new";
        div.textContent = `Escribir: \"${filtro}\"`;
        div.onclick = () => seleccionarNuevoPaciente(filtro);
        results.appendChild(div);
        results.style.display = "block";
    }

    function seleccionarPaciente(paciente) {
        input.value = `${paciente.nombre} - ${paciente.correo || "Sin correo"}`;
        results.style.display = "none";
        document.getElementById("nuevoPacienteForm").style.display = "none";
        document.getElementById("pacienteSelectIdHidden")?.remove();
        // Crea un input hidden para el id seleccionado
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.id = "pacienteSelectIdHidden";
        hidden.name = "paciente_id";
        hidden.value = paciente.id;
        input.parentNode.appendChild(hidden);
    }

    function seleccionarNuevoPaciente(nombre) {
        input.value = nombre;
        results.style.display = "none";
        document.getElementById("nuevoPacienteForm").style.display = "block";
        document.getElementById("nombrePaciente").value = nombre;
        document.getElementById("pacienteSelectIdHidden")?.remove();
    }

    input.addEventListener("input", (e) => {
        renderResults(e.target.value);
    });
    input.addEventListener("focus", (e) => {
        if (e.target.value) renderResults(e.target.value);
    });
    input.addEventListener("blur", () => {
        setTimeout(() => {
            results.style.display = "none";
        }, 150);
    });
    // Navegación con teclado
    input.addEventListener("keydown", (e) => {
        const options = results.querySelectorAll(".search-option");
        if (!options.length) return;
        if (e.key === "ArrowDown") {
            selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
            options.forEach((opt, idx) =>
                opt.classList.toggle("active", idx === selectedIndex)
            );
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            selectedIndex = Math.max(selectedIndex - 1, 0);
            options.forEach((opt, idx) =>
                opt.classList.toggle("active", idx === selectedIndex)
            );
            e.preventDefault();
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0 && options[selectedIndex]) {
                options[selectedIndex].click();
                e.preventDefault();
            }
        }
    });
}

// Llama a esta función después de cargar pacientes y de inicializar el DOM
// Ya se llama dentro de init() tras cargar datos, así que no es necesario fuera del bloque principal

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
        document.getElementById("pacienteSelect").value =
            cotizacion.paciente_id;

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
                                    servicioItem.querySelector(
                                        ".servicio-select"
                                    );
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
                                    servicioItem.querySelector(
                                        ".servicio-select"
                                    );
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
        document.getElementById("quoteTitle").textContent =
            "Duplicar Cotización";
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
            const updateResponse = await fetch(
                `/api/cotizaciones/${id}/enviar`,
                {
                    method: "POST",
                }
            );

            if (!updateResponse.ok) throw new Error("Error al enviar");

            alert(`Cotización enviada a ${cotizacion.correo_paciente}`);
            cargarCotizaciones();
        }
    } catch (error) {
        console.error("Error al enviar:", error);
        alert(`Error: ${error.message}`);
    }
};

function agregarCategoriaDeTratamiento() {
    // Agrega una nueva fila dinámica de categoría (no la estática)
    const categoriasContainer = document.getElementById("categoriasContainer");
    const row = document.createElement("div");
    row.className = "row align-items-end mb-2 categoria-dinamica-row";
    row.innerHTML = `
        <div class="col-md-4">
            <div class="form-group mb-2">
                <select class="form-control categoria-unica-select">
                    <option value="">Seleccionar categoría...</option>
                </select>
            </div>
        </div>
        <div class="col-md-8">
            <div class="form-group mb-2 d-flex align-items-center gap-2 flex-wrap servicios-categorias-container"></div>
        </div>
    `;
    // Llenar el select de categorías
    const select = row.querySelector(".categoria-unica-select");
    categorias.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nombre_categoria;
        select.appendChild(option);
    });
    // Evento de cambio de categoría
    select.addEventListener("change", function () {
        const serviciosContainer = row.querySelector(".servicios-categorias-container");
        serviciosContainer.innerHTML = "";
        if (this.value) {
            agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
        }
    });
    // Selecciona automáticamente la primera categoría disponible
    if (categorias.length > 0) {
        select.value = categorias[0].id;
        select.dispatchEvent(new Event("change"));
    }
    // Buscar el botón de agregar categoría de forma robusta
    const btnAgregar = categoriasContainer.querySelector("#agregarCategoriaBtn");
    if (btnAgregar) {
        categoriasContainer.insertBefore(row, btnAgregar);
    } else {
        categoriasContainer.appendChild(row);
    }
}

function agregarServicioEnCategoriasDinamico(container, categoriaId) {
    const template = document.getElementById("servicioTemplate");
    if (!template) return;
    const clone = template.content.cloneNode(true);
    const servicioItem = clone.querySelector(".servicio-item");
    // Llenar servicios SOLO de la categoría seleccionada
    const servicioSelect = servicioItem.querySelector(".servicio-select");
    if (servicioSelect) {
        servicioSelect.innerHTML =
            '<option value="">Seleccionar servicio...</option>';
        servicios
            .filter((s) => s.categoria_id == categoriaId)
            .forEach((servicio) => {
                const option = document.createElement("option");
                option.value = servicio.id;
                option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
                option.setAttribute("data-precio", servicio.precio_neto);
                servicioSelect.appendChild(option);
            });
        servicioSelect.addEventListener("change", (e) => {
            actualizarPrecioServicio(servicioItem);
            actualizarTotalCategorias();
        });
    }
    // Eventos de cantidad y descuento
    const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
    const descuentoInput = servicioItem.querySelector(".descuento-servicio");
    if (cantidadInput) {
        cantidadInput.addEventListener("input", () => {
            actualizarPrecioServicio(servicioItem);
            actualizarTotalCategorias();
        });
    }
    if (descuentoInput) {
        descuentoInput.addEventListener("input", () => {
            actualizarPrecioServicio(servicioItem);
            actualizarTotalCategorias();
        });
    }
    // Botón para agregar más servicios dentro de la misma categoría
    const agregarBtn = servicioItem.querySelector(".agregar-servicio");
    if (agregarBtn) {
        agregarBtn.addEventListener("click", () => {
            agregarServicioEnCategoriasDinamico(container, categoriaId);
        });
    }
    // Botón para eliminar servicio
    const removeBtn = servicioItem.querySelector(".remove-servicio");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            servicioItem.remove();
            actualizarTotalCategorias();
        });
    }
    container.appendChild(servicioItem);
    actualizarPrecioServicio(servicioItem);
    actualizarTotalCategorias();
}
