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

document.addEventListener("DOMContentLoaded", function () {
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
          agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
        }
      });
      // Selecciona automáticamente la primera categoría si existe
      if (categorias.length > 0) {
        categoriaSelect.value = categorias[0].id;
        categoriaSelect.dispatchEvent(new Event("change"));
      }
    }
  }
});
function setupEventListeners() {
  // Función helper mejorada para agregar listeners
  const addListener = (selector, event, callback, isId = true) => {
    const element = isId
      ? document.getElementById(selector)
      : document.querySelector(selector);

    if (element) {
      element.addEventListener(event, callback);
    }
    // Silencioso cuando no encuentra elementos no críticos
  };

  // Listener para contenedor de categorías (solo si existe)
  const categoriasContainer = document.getElementById("categoriasContainer");
  if (categoriasContainer) {
    categoriasContainer.addEventListener("click", (e) => {
      if (e.target?.id === "agregarCategoriaBtn") {
        e.preventDefault();
        agregarCategoriaDeTratamiento();
      }
    });
  }

  // Tabs - versión silenciosa si no existen
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = tab.getAttribute("data-tab");
      tabId && switchTab(tabId);
    });
  });

  // Listeners para formularios (solo si existen los elementos)
  addListener("nuevoPacienteBtn", "click", toggleNuevoPacienteForm);
  addListener("guardarPacienteBtn", "click", guardarPaciente);
  addListener("agregarFaseBtn", "click", agregarFase);
  addListener("confirmacionFases", "click", activarFases);
  addListener("agregarCategoriaBtn", "click", agregarCategoriaDeTratamiento);

  const cotizacionForm = document.getElementById("cotizacionForm");
  if (cotizacionForm) {
    cotizacionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarCotizacion(e);
    });
  }

  addListener("generatePdfBtn", "click", generarPDFDesdeFormulario);
  addListener("sendEmailBtn", "click", enviarDesdeFormulario);

  // Configuración de la barra de búsqueda (solo si existe)
  setupPacienteSearchBar();
}

// Función principal de navegación
function switchTab(view, options = {}) {
  const { reset = false, skipLoad = false } = options;
  if (!TAB_TO_DOM[view]) view = "new";
  const destinoId = TAB_TO_DOM[view];

  // Ocultar todos los contenidos
  tabContents.forEach((sec) => {
    sec.style.display = "none";
    sec.classList.remove("active");
  });

  // Mostrar contenido seleccionado
  const destino = document.getElementById(destinoId);
  if (destino) {
    destino.style.display = "block";
    destino.classList.add("active");
  }

  // Resaltar tab activo
  const menuFocus = view === "edit" || view === "duplicate" ? "new" : view;
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.getAttribute("data-tab") === menuFocus);
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
}

// --- Búsqueda y selección de pacientes con barra de búsqueda ---
function setupPacienteSearchBar() {
  const input = document.getElementById("pacienteSearchInput");
  const results = document.getElementById("pacienteSearchResults");

  if (!input || !results) return;

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
    const div = document.createElement("div");
    div.className = "search-option new";
    div.textContent = `Escribir: \"${filtro}\"`;
    div.onclick = () => seleccionarNuevoPaciente(filtro);
    results.appendChild(div);
    results.style.display = "block";
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

function toggleNuevoPacienteForm() {
  const form = document.getElementById("nuevoPacienteForm");
  if (!form) {
    console.error("Formulario no encontrado");
    return;
  }

  if (form.style.display === "none" || !form.style.display) {
    form.style.display = "block";
  } else {
    form.style.display = "none";
  }
}

async function cargarPacientes() {
  try {
    const response = await fetch("/api/pacientes");
    pacientes = await response.json();
  } catch (error) {
    alert("Error al cargar pacientes");
  }
}

async function guardarPaciente() {
  const nombreInput = document.getElementById("nombrePaciente");
  const correoInput = document.getElementById("correoPaciente");
  const telefonoInput = document.getElementById("telefonoPaciente");

  if (!nombreInput || !correoInput || !telefonoInput) {
    alert("Error en el formulario. Por favor recarga la página.");
    return;
  }

  const nombre = nombreInput.value.trim();
  const correo = correoInput.value.trim();
  const telefono = telefonoInput.value.trim();

  if (!nombre) {
    alert("El nombre del paciente es obligatorio");
    return;
  }

  try {
    const response = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre,
        correo: correo || null,
        telefono: telefono || null,
      }),
    });

    if (!response.ok) throw new Error("Error en la respuesta del servidor");

    const nuevoPaciente = await response.json();

    document.getElementById("nuevoPacienteForm").style.display = "none";
    nombreInput.value = "";
    correoInput.value = "";
    telefonoInput.value = "";

    await cargarPacientes();
    seleccionarPaciente(nuevoPaciente);
    alert(`Paciente ${nombre} guardado correctamente`);
  } catch (error) {
    alert("Error al guardar paciente: " + error.message);
  }
}

function seleccionarPaciente(paciente) {
  const input = document.getElementById("pacienteSearchInput");
  input.value = `${paciente.nombre} - ${paciente.correo || "Sin correo"}`;
  document.getElementById("pacienteSearchResults").style.display = "none";
  document.getElementById("nuevoPacienteForm").style.display = "none";

  document.getElementById("pacienteSelectIdHidden")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.id = "pacienteSelectIdHidden";
  hidden.name = "paciente_id";
  hidden.value = paciente.id;
  input.parentNode.appendChild(hidden);
}
// Fin De pacientes

// Inicio --- Cotizaciones / quote tab ---
/*
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
    const serviciosContainer = row.querySelector(
      ".servicios-categorias-container"
    );
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
      parseFloat(servicioItem.querySelector(".precio-unitario").value) || 0;
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
function agregarFase() {
  const fasesContainer = document.getElementById("fasesContainer");
  if (!fasesContainer) return;

  const template = document.getElementById("faseTemplate");
  if (!template) return;

  const clone = template.content.cloneNode(true);
  const faseCard = clone.querySelector(".fase-card");
  if (!faseCard) return;

  // Numeración automática
  const faseNum = fasesContainer.querySelectorAll(".fase-card").length + 1;
  faseCard.querySelector(".fase-numero").textContent = faseNum;

  faseCard.querySelector(".remove-fase").addEventListener("click", () => {
    faseCard.remove();
    // Renumeración inmediata
    fasesContainer.querySelectorAll(".fase-card").forEach((f, i) => {
      f.querySelector(".fase-numero").textContent = i + 1;
    });
    calcularTotalesGenerales();
  });

  // Resto de la lógica...
  fasesContainer.appendChild(faseCard);
  agregarServicioAFase(faseCard);
}
function activarFases() {
  const fasesContainer = document.getElementById("fasesContainer");
  const divFases = document.getElementById("div-fases");
  const boton = document.getElementById("confirmacionFases");

  // Verificar que los elementos existen
  if (!fasesContainer || !divFases || !boton) {
    console.error("Elementos necesarios no encontrados");
    return;
  }

  // Determinar el estado actual (mejor que comparar solo con 'none')
  const fasesVisibles = window.getComputedStyle(divFases).display !== "none";

  // Alternar visibilidad
  if (fasesVisibles) {
    divFases.style.display = "none";
    boton.innerHTML = '<i class="fas fa-eye"></i> Activar fases';
    boton.classList.remove("btn-primary");
    boton.classList.add("btn-secondary");
  } else {
    divFases.style.display = "block";
    boton.innerHTML = '<i class="fas fa-eye-slash"></i> Desactivar fases';
    boton.classList.remove("btn-secondary");
    boton.classList.add("btn-primary");
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
      parseFloat(servicioItem.querySelector(".precio-unitario").value) || 0;
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
  try {
    // Verificar template
    const template = document.getElementById("servicioTemplate");
    if (!template) {
      throw new Error("No se encontró el template de servicio");
    }

    const clone = template.content.cloneNode(true);
    const servicioItem = clone.querySelector(".servicio-item");
    if (!servicioItem) {
      throw new Error("No se encontró el elemento .servicio-item");
    }

    // Verificar contenedor de servicios
    const serviciosContainer = faseCard.querySelector(".servicios-container");
    if (!serviciosContainer) {
      throw new Error("No se encontró el contenedor de servicios en la fase");
    }

    // Configurar eventos
    const removeBtn = servicioItem.querySelector(".remove-servicio");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        servicioItem.remove();
        calcularTotalesFase(faseCard);
        calcularTotalesGenerales();
      });
    }

    const agregarBtn = servicioItem.querySelector(".agregar-servicio");
    if (agregarBtn) {
      agregarBtn.addEventListener("click", () => {
        agregarServicioAFase(faseCard);
      });
    }

    // Configurar select de categorías si existe
    const categoriaSelect = servicioItem.querySelector(".categoria-select");
    if (categoriaSelect) {
      categoriaSelect.innerHTML =
        '<option value="">Seleccionar categoría...</option>';

      if (categorias && categorias.length > 0) {
        categorias.forEach((cat) => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.nombre_categoria;
          categoriaSelect.appendChild(option);
        });
      }

      categoriaSelect.addEventListener("change", function () {
        const servicioSelect =
          this.closest(".servicio-item").querySelector(".servicio-select");
        actualizarServiciosSelect(this.value, servicioSelect);
      });
    }

    // Configurar select de servicios
    const servicioSelect = servicioItem.querySelector(".servicio-select");
    if (servicioSelect) {
      servicioSelect.addEventListener("change", function () {
        const servicio = servicios.find((s) => s.id == this.value);
        if (servicio) {
          const precioInput =
            this.closest(".servicio-item").querySelector(".precio-unitario");
          if (precioInput) {
            precioInput.value = servicio.precio_neto.toFixed(2);
          }
        }
        calcularTotalesFase(faseCard);
      });
    }

    // Configurar eventos de cantidad y descuento
    const cantidadInput = servicioItem.querySelector(".cantidad");
    if (cantidadInput) {
      cantidadInput.addEventListener("input", () =>
        calcularTotalesFase(faseCard)
      );
    }

    const descuentoInput = servicioItem.querySelector(".descuento");
    if (descuentoInput) {
      descuentoInput.addEventListener("input", () =>
        calcularTotalesFase(faseCard)
      );
    }

    // Agregar al DOM
    serviciosContainer.appendChild(servicioItem);
    calcularTotalesFase(faseCard);
  } catch (error) {
    console.error("Error en agregarServicioAFase:", error);
    throw error; // Re-lanzar el error para manejo superior
  }
}
*/
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

function actualizarPrecioServicio(servicioItem) {
  const servicioSelect = servicioItem.querySelector(".servicio-select");
  const precioSpan = servicioItem.querySelector(".precio-servicio");
  const precioUnitarioSpan = servicioItem.querySelector(
    ".precio-unitario-servicio"
  );
  const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
  const descuentoInput = servicioItem.querySelector(".descuento-servicio");
  let precio = 0;
  let cantidad = 1;
  let descuento = 0;
  if (servicioSelect && servicioSelect.value) {
    // Buscar el servicio en window.servicios si no está en el scope local
    let listaServicios =
      typeof servicios !== "undefined" ? servicios : window.servicios || [];
    const servicio = listaServicios.find(
      (s) => String(s.id) === String(servicioSelect.value)
    );
    if (servicio && typeof servicio.precio_neto !== "undefined") {
      precio = Number(servicio.precio_neto);
    } else {
      // fallback: intenta leer del select
      const selectedOption =
        servicioSelect.options[servicioSelect.selectedIndex];
      if (
        selectedOption &&
        selectedOption.dataset &&
        selectedOption.dataset.precio
      ) {
        precio = Number(selectedOption.dataset.precio);
      }
    }
  }
  if (cantidadInput && !isNaN(parseInt(cantidadInput.value))) {
    cantidad = Math.max(1, parseInt(cantidadInput.value));
  }
  if (descuentoInput && !isNaN(parseFloat(descuentoInput.value))) {
    descuento = Math.max(0, Math.min(100, parseFloat(descuentoInput.value)));
  }
  let total = precio * cantidad;
  let totalConDescuento = total - (total * descuento) / 100;
  if (precioUnitarioSpan) {
    precioUnitarioSpan.textContent = precio
      ? `$${Number(precio).toLocaleString("es-CO", {
          minimumFractionDigits: 2,
        })}`
      : "";
    precioUnitarioSpan.style.display = "inline-block";
  } else {
    console.warn(
      "No se encontró el span .precio-unitario-servicio en",
      servicioItem
    );
  }
  if (precioSpan) {
    precioSpan.textContent = `$${totalConDescuento.toFixed(2)}`;
    precioSpan.style.display = "inline-block";
  } else {
    console.warn("No se encontró el span .precio-servicio en", servicioItem);
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
        const descuentoInput = item.querySelector(".descuento-servicio");
        let precio = 0;
        let cantidad = 1;
        let descuento = 0;
        if (select && select.value) {
          // Buscar el servicio en la lista global
          const servicio = servicios.find(
            (s) => String(s.id) === String(select.value)
          );
          if (servicio && typeof servicio.precio_neto !== "undefined") {
            precio = Number(servicio.precio_neto);
          } else {
            // fallback: intenta leer del select
            const selectedOption = select.options[select.selectedIndex];
            if (
              selectedOption &&
              selectedOption.dataset &&
              selectedOption.dataset.precio
            ) {
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
        let subtotalServicio = precio * cantidad;
        let descuentoServicio = subtotalServicio * (descuento / 100);
        let totalServicio = subtotalServicio - descuentoServicio;
        subtotal += subtotalServicio;
        totalDescuentos += descuentoServicio;
        total += totalServicio;
        // Mostrar el precio unitario y total en la fila de servicio
        const precioUnitarioSpan = item.querySelector(
          ".precio-unitario-servicio"
        );
        const precioTotalSpan = item.querySelector(".precio-servicio");
        if (precioUnitarioSpan) {
          precioUnitarioSpan.textContent = precio
            ? `$${Number(precio).toLocaleString("es-CO", {
                minimumFractionDigits: 2,
              })}`
            : "";
          precioUnitarioSpan.style.display = "inline-block";
        }
        if (precioTotalSpan) {
          precioTotalSpan.textContent = `$${totalServicio.toLocaleString(
            "es-CO",
            { minimumFractionDigits: 2 }
          )}`;
          precioTotalSpan.style.display = "inline-block";
        }
      });
    });
  document.getElementById(
    "subtotal-cotizacion"
  ).textContent = `$${subtotal.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
  })}`;
  document.getElementById(
    "descuento-cotizacion"
  ).textContent = `$${totalDescuentos.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
  })}`;
  document.getElementById(
    "total-cotizacion"
  ).textContent = `$${total.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
  })}`;
}

function limpiarServiciosCategorias() {
  const cont = document.getElementById("serviciosCategoriasContainer");
  if (cont) cont.innerHTML = "";
}

// Inicio Botones de accion final --- Cotizaciones / quote tab ---
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
      numero_fase: parseInt(faseCard.querySelector(".fase-numero").textContent),
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
            parseFloat(servicioItem.querySelector(".precio-unitario").value) ||
            0,
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

// calculo de totales

function calcularTotalesFase(faseCard) {
  try {
    let subtotal = 0;
    let descuentoTotal = 0;

    // Verificar que faseCard existe
    if (!faseCard) {
      throw new Error("Elemento faseCard no proporcionado");
    }

    const servicios = faseCard.querySelectorAll(".servicio-item");
    if (!servicios || servicios.length === 0) return;

    servicios.forEach((servicioItem) => {
      try {
        // Obtener elementos con verificaciones
        const precioUnitarioEl = servicioItem.querySelector(".precio-unitario");
        const cantidadEl = servicioItem.querySelector(".cantidad");
        const descuentoEl = servicioItem.querySelector(".descuento");

        // Valores por defecto si los elementos no existen
        const precioUnitario = precioUnitarioEl
          ? parseFloat(precioUnitarioEl.value) || 0
          : 0;
        const cantidad = cantidadEl ? parseInt(cantidadEl.value) || 1 : 1;
        const descuento = descuentoEl ? parseFloat(descuentoEl.value) || 0 : 0;

        const subtotalServicio = precioUnitario * cantidad;
        const descuentoServicio = subtotalServicio * (descuento / 100);

        subtotal += subtotalServicio;
        descuentoTotal += descuentoServicio;
      } catch (error) {
        console.error("Error calculando servicio:", error);
      }
    });

    const total = subtotal - descuentoTotal;

    // Actualizar totales de fase con verificaciones
    const subtotalEl = faseCard.querySelector(".fase-subtotal");
    const descuentoEl = faseCard.querySelector(".fase-descuento");
    const totalEl = faseCard.querySelector(".fase-total-amount");

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (descuentoEl) descuentoEl.textContent = `$${descuentoTotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  } catch (error) {
    console.error("Error en calcularTotalesFase:", error);
  }
}

function calcularTotalesGenerales() {
  try {
    let subtotal = 0;
    let descuentoTotal = 0;

    const fases = document.querySelectorAll(".fase-card");
    if (!fases || fases.length === 0) return;

    fases.forEach((faseCard) => {
      try {
        const subtotalEl = faseCard.querySelector(".fase-subtotal");
        const descuentoEl = faseCard.querySelector(".fase-descuento");

        const faseSubtotal = subtotalEl
          ? parseFloat(subtotalEl.textContent.replace("$", "")) || 0
          : 0;
        const faseDescuento = descuentoEl
          ? parseFloat(descuentoEl.textContent.replace("$", "")) || 0
          : 0;

        subtotal += faseSubtotal;
        descuentoTotal += faseDescuento;
      } catch (error) {
        console.error("Error calculando fase:", error);
      }
    });

    const total = subtotal - descuentoTotal;

    // Actualizar totales generales con verificaciones
    const subtotalGeneralEl = document.getElementById("subtotal-cotizacion");
    const descuentoGeneralEl = document.getElementById("descuento-cotizacion");
    const totalGeneralEl = document.getElementById("total-cotizacion");

    if (subtotalGeneralEl)
      subtotalGeneralEl.textContent = `$${subtotal.toFixed(2)}`;
    if (descuentoGeneralEl)
      descuentoGeneralEl.textContent = `$${descuentoTotal.toFixed(2)}`;
    if (totalGeneralEl) totalGeneralEl.textContent = `$${total.toFixed(2)}`;
  } catch (error) {
    console.error("Error en calcularTotalesGenerales:", error);
  }
}

// historial de cotizaciones
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
