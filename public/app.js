function configurarBotonEliminar(servicioItem) {
  const removeBtn = servicioItem.querySelector(".remove-servicio");
  if (!removeBtn) return;

  removeBtn.addEventListener("click", () => {
    // Contenedor de LA MISMA CATEGORÍA:
    const categoryGroup = servicioItem.closest(".category-group");
    const serviciosContainer = categoryGroup?.querySelector(".service-list");
    if (!serviciosContainer) return;

    const itemsDeEstaCategoria =
      serviciosContainer.querySelectorAll(".service-item");

    if (itemsDeEstaCategoria.length > 1) {
      servicioItem.remove();

      // Recalcular totales de la fase (si existe) y globales
      const faseContainer = servicioItem.closest(".phase-container");
      if (faseContainer) calcularTotalesFase(faseContainer);
      actualizarTotalCategorias();
    } else {
      // ❗ Queda 1 solo en ESTA categoría → no permitir
      alert("Cada categoría debe tener al menos un servicio.");
    }
  });
}

//
let tipoItemSeq = 0;

function ensureTipoRadiosForItem(servicioItemEl) {
  const wrap = servicioItemEl.querySelector(".tipo-item-radios");
  if (!wrap) return;

  // name único por fila (para que cada grupo sea independiente)
  const unique = `tipo_item_item_${++tipoItemSeq}`;
  wrap.querySelectorAll('input[type="radio"]').forEach((r) => {
    r.name = unique;
  });

  // estado inicial y toggle visual
  servicioItemEl.dataset.tipo_item = "servicio";
  toggleMaterialFieldsForItem(servicioItemEl); // set inicial

  // listeners: al cambiar tipo -> guardar, refiltrar select y togglear campos extra
  wrap.querySelectorAll('input[type="radio"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      servicioItemEl.dataset.tipo_item = r.value || "servicio";
      toggleMaterialFieldsForItem(servicioItemEl);

      // Refiltra el select de este item según categoría + tipo actual
      const categoryGroup = servicioItemEl.closest(
        ".category-group, .phase-container"
      );
      const categoriaSelect = categoryGroup?.querySelector(
        ".categoria-unica-select, .categoria-fase-select"
      );
      const categoriaId = categoriaSelect?.value || "";
      if (categoriaId) {
        rellenarSelectServiciosDeItem(servicioItemEl, categoriaId);
      }
    });
  });
}

function getTipoFromItem(servicioItemEl) {
  return servicioItemEl?.dataset?.tipo_item || "servicio";
}

function toggleMaterialFieldsForItem(servicioItemEl) {
  const tipo = getTipoFromItem(servicioItemEl); // "servicio" | "material" | "adicional"
  const esMaterial = tipo === "material";

  const subtitulo = servicioItemEl.querySelector(".field-subtitulo");
  const marca = servicioItemEl.querySelector(".field-marca");
  const present = servicioItemEl.querySelector(".field-presentacion");

  // Mostrar/ocultar según el tipo
  if (subtitulo) subtitulo.style.display = esMaterial ? "none" : "";
  if (marca) {
    marca.style.display = esMaterial ? "" : "none";
    marca.required = esMaterial;
    marca.disabled = !esMaterial;
    if (!esMaterial) marca.value = "";
  }
  if (present) {
    present.style.display = esMaterial ? "" : "none";
    present.required = esMaterial;
    present.disabled = !esMaterial;
    if (!esMaterial) present.value = "";
  }

  // Actualiza el placeholder del select de este item
  const sel = servicioItemEl.querySelector(".servicio-select");
  if (sel) {
    const firstOpt = sel.querySelector('option[value=""]') || sel.options?.[0];
    if (firstOpt) {
      firstOpt.textContent = esMaterial
        ? "Seleccionar material..."
        : tipo === "adicional"
        ? "Seleccionar adicional..."
        : "Seleccionar servicio...";
    }
    if (!sel.value) sel.selectedIndex = 0;

    // Si usas Select2
    if (window.$ && window.jQuery && $(sel).data("select2")) {
      $(sel).find('option[value=""]').text(firstOpt.textContent);
      $(sel).trigger("change.select2");
    }
  }
}

/** Re-llena el select de ESTE item usando (categoriaId + tipo_item del item) */
function rellenarSelectServiciosDeItem(servicioItemEl, categoriaId) {
  const servicioSelect = servicioItemEl.querySelector(".servicio-select");
  if (!servicioSelect) return;

  const previo = servicioSelect.value || "";
  servicioSelect.innerHTML =
    '<option value="">Seleccionar servicio...</option>';

  const tipoItem = getTipoFromItem(servicioItemEl);
  const lista = servicios.filter(
    (s) =>
      String(s.categoria_id) === String(categoriaId) &&
      String((s.tipo_item ?? s.tipo) || "servicio").toLowerCase() ===
        tipoItem.toLowerCase()
  );

  lista.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.codigo} - ${s.descripcion}`;
    opt.dataset.precio = s.precio_neto;
    servicioSelect.appendChild(opt);
  });

  if (previo && lista.some((s) => String(s.id) === String(previo))) {
    servicioSelect.value = previo;
  } else {
    servicioSelect.value = "";
  }
  servicioSelect.dispatchEvent(new Event("change"));
}
//

function calcularTotalesFase(faseContainer) {
  let subtotal = 0;
  let totalDescuento = 0;

  // Seleccionar todos los items de servicio dentro de la fase
  const servicioItems = faseContainer.querySelectorAll(".service-item");

  servicioItems.forEach((item) => {
    const precioInput = item.querySelector(".precio-unitario-servicio");
    const cantidadInput = item.querySelector(".cantidad-servicio");
    const descuentoInput = item.querySelector(".descuento-servicio");

    let precio = parseFloat(precioInput?.value || 0);
    let cantidad = parseInt(cantidadInput?.value || 0);
    let descuento = parseFloat(descuentoInput?.value || 0);

    if (isNaN(precio)) precio = 0;
    if (isNaN(cantidad) || cantidad < 1) cantidad = 0;
    if (isNaN(descuento)) descuento = 0;

    const subtotalServicio = precio * cantidad;
    const descuentoValor = subtotalServicio * (descuento / 100);
    const totalServicio = subtotalServicio - descuentoValor;

    subtotal += subtotalServicio;
    totalDescuento += descuentoValor;
  });

  const totalFase = subtotal - totalDescuento;

  // Actualizar en el DOM los valores de la fase
  const subtotalEl = faseContainer.querySelector(".fase-subtotal");
  const descuentoEl = faseContainer.querySelector(".fase-descuento");
  const totalEl = faseContainer.querySelector(".fase-total-amount");

  if (subtotalEl)
    subtotalEl.textContent = `$${subtotal.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  if (descuentoEl)
    descuentoEl.textContent = `$${totalDescuento.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  if (totalEl)
    totalEl.textContent = `$${totalFase.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
}

function actualizarTotalCategorias() {
  let subtotal = 0;
  let totalDescuentos = 0;
  let total = 0;
  precioCotizacion = 0;

  document.querySelectorAll(".service-item").forEach((item) => {
    const precio =
      parseFloat(item.querySelector(".precio-unitario-servicio")?.value || 0) ||
      0;
    const cantidad =
      parseInt(item.querySelector(".cantidad-servicio")?.value || 1) || 1;
    const descuento =
      parseFloat(item.querySelector(".descuento-servicio")?.value || 0) || 0;

    const subtotalServicio = precio * cantidad;
    const descuentoValor = subtotalServicio * (descuento / 100);
    const totalServicio = subtotalServicio - descuentoValor;

    subtotal += subtotalServicio;
    totalDescuentos += descuentoValor;
    total += totalServicio;

    const servicioSelect = item.querySelector(".servicio-select");
    if (servicioSelect && servicioSelect.value) {
      precioCotizacion += totalServicio;
    }
  });

  const subtotalEl = document.getElementById("subtotal-cotizacion");
  const descuentoEl = document.getElementById("descuento-cotizacion");
  const totalEl = document.getElementById("total-cotizacion");

  if (subtotalEl) {
    subtotalEl.textContent = `$${subtotal.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  }
  if (descuentoEl) {
    // ⬅️ ahora se muestra en dinero, no %
    descuentoEl.textContent = `$${totalDescuentos.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  }
  if (totalEl) {
    totalEl.textContent = `$${(subtotal - totalDescuentos).toLocaleString(
      "es-CO",
      { minimumFractionDigits: 2 }
    )}`;
  }
}

function agregarServicioEnCategoriasDinamico(serviciosContainer, categoriaId) {
  const template = document.getElementById("service-template");
  if (!template) {
    console.error("No se encontró el template de servicio");
    return;
  }
  const clone = template.content.cloneNode(true);
  const servicioItem = clone.querySelector(".service-item");

  //  Radios por ítem
  ensureTipoRadiosForItem(servicioItem);

  //  Rellenar options del select SEGÚN tipo (de esta fila) + categoria
  rellenarSelectServiciosDeItem(servicioItem, categoriaId);

  configurarBotonEliminar(servicioItem);

  // Llenar servicios SOLO de la categoría seleccionada
  const servicioSelect = servicioItem.querySelector(".servicio-select");
  if (servicioSelect) {
    servicioSelect.innerHTML =
      '<option value="">Seleccionar servicio...</option>';
    const serviciosCategoria = servicios.filter(
      (s) => String(s.categoria_id) === String(categoriaId)
    );

    serviciosCategoria.forEach((servicio) => {
      const option = document.createElement("option");
      option.value = servicio.id;
      option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
      option.dataset.precio = servicio.precio_neto;
      servicioSelect.appendChild(option);
    });

    // Guardar el id del servicio previamente seleccionado en el item
    servicioItem._servicioSeleccionadoAnterior = null;

    servicioSelect.addEventListener("change", () => {
      const selectedId = servicioSelect.value;
      const servicio = servicios.find(
        (s) => String(s.id) === String(selectedId)
      );
      const descInput = servicioItem.querySelector(".service-description");
      const precioInput = servicioItem.querySelector(
        ".precio-unitario-servicio"
      );
      const subtitleInput = servicioItem.querySelector(".field-subtitulo");
      const marcaInput = servicioItem.querySelector(".field-marca");
      const presInput = servicioItem.querySelector(".field-presentacion");

      if (servicio) {
        if (descInput) descInput.value = servicio.descripcion;
        if (precioInput) precioInput.value = servicio.precio_neto;
        if (subtitleInput) subtitleInput.value = servicio.subtitulo;

        const esMaterialFila =
          (servicioItem.dataset.tipo_item || "servicio") === "material";
        if (esMaterialFila) {
          if (marcaInput) marcaInput.value = servicio.marca ?? "";
          if (presInput) presInput.value = servicio.presentacion ?? "";
        } else {
          if (marcaInput) marcaInput.value = "";
          if (presInput) presInput.value = "";
        }

        // ✅ descuento inicial en 0
        const descuentoInput = servicioItem.querySelector(
          ".descuento-servicio"
        );
        if (descuentoInput && descuentoInput.value === "") {
          descuentoInput.value = 0;
        }

        servicioItem._servicioSeleccionadoAnterior = servicio.id;
      } else {
        // ✅ si selecciona "Seleccionar servicio..." limpiamos todo
        actualizarPrecioServicio(servicioItem);
        return; // 👈 paramos aquí para que no siga el cálculo con datos viejos
      }

      // ✅ calcular precio inicial al momento de seleccionar
      actualizarPrecioServicio(servicioItem);

      // Actualizar el total de fase
      const faseContainer = servicioItem.closest(".phase-container");
      if (faseContainer) {
        calcularTotalesFase(faseContainer); // Recalcular total de fase
      }
      actualizarTotalCategorias(); // Actualizar total global
    });
  }

  // Eventos de cantidad y descuento
  const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
  const descuentoInput = servicioItem.querySelector(".descuento-servicio");

  if (cantidadInput) {
    cantidadInput.addEventListener("input", () => {
      // Recalcular precio y total fase
      actualizarPrecioServicio(servicioItem);
      const faseContainer = servicioItem.closest(".phase-container");
      if (faseContainer) {
        calcularTotalesFase(faseContainer); // Recalcular total de fase
      }
      actualizarTotalCategorias(); // Actualizar total global
    });
  }

  if (descuentoInput) {
    descuentoInput.addEventListener("input", () => {
      // Recalcular precio y total fase
      actualizarPrecioServicio(servicioItem);
      const faseContainer = servicioItem.closest(".phase-container");
      if (faseContainer) {
        calcularTotalesFase(faseContainer); // Recalcular total de fase
      }
      actualizarTotalCategorias(); // Actualizar total global
    });
  }
  //evento de subtitlo

  // Botón para agregar más servicios dentro de la misma categoría
  const agregarBtn = servicioItem.querySelector(".agregar-servicio");
  if (agregarBtn) {
    agregarBtn.addEventListener("click", () => {
      agregarServicioEnCategoriasDinamico(serviciosContainer, categoriaId);
    });
  }

  // Botón para eliminar servicio
  //configurarBotonEliminar(servicioItem);

  serviciosContainer.appendChild(servicioItem);

  // Si hay servicios, seleccionar el primero automáticamente
  if (servicioSelect && servicioSelect.options.length > 1) {
    //  servicioSelect.selectedIndex = 1;
    //  servicioSelect.dispatchEvent(new Event("change"));
  } else {
    actualizarPrecioServicio(servicioItem);
    const faseContainer = servicioItem.closest(".phase-container");
    if (faseContainer) {
      calcularTotalesFase(faseContainer); // Recalcular total de fase
    }
    actualizarTotalCategorias(); // Actualizar total global
  }

  // Recálculo de total de fase al agregar servicio
  const faseContainer = servicioItem.closest(".phase-container");
  if (faseContainer) {
    const precioInput = servicioItem.querySelector(".precio-unitario-servicio");
    const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
    const descuentoInput = servicioItem.querySelector(".descuento-servicio");

    let precio = parseFloat(precioInput?.value || 0);
    let cantidad = parseInt(cantidadInput?.value || 1);
    let descuento = parseFloat(descuentoInput?.value || 0);

    if (isNaN(precio)) precio = 0;
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (isNaN(descuento)) descuento = 0;

    const totalServicio = precio * cantidad;
    const descuentoValor = totalServicio * (descuento / 100);
    const totalNeto = totalServicio - descuentoValor;

    // Tomar el total actual mostrado y sumarle este nuevo
    const totalEl = faseContainer.querySelector(".fase-total-amount");
    let totalFaseActual = 0;
    if (totalEl) {
      const current = totalEl.textContent
        .replace(/[$.,]/g, "")
        .replace(",", ".");
      totalFaseActual = parseFloat(current) || 0;
    }

    // Si el total está en 0, es el primer servicio → sobrescribe
    if (totalFaseActual === 0) {
      totalFaseActual = totalNeto;
    } else {
      totalFaseActual += totalNeto;
    }

    if (totalEl) {
      totalEl.textContent = `$${totalFaseActual.toLocaleString("es-CO", {
        minimumFractionDigits: 2,
      })}`;
    }
  }
}

function actualizarPrecioServicio(servicioItem) {
  const servicioSelect = servicioItem.querySelector(".servicio-select");
  const precioUnitarioInput = servicioItem.querySelector(
    ".precio-unitario-servicio"
  );
  const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
  const descuentoInput = servicioItem.querySelector(".descuento-servicio");
  const precioTotalSpan = servicioItem.querySelector(".precio-servicio");
  const descInput = servicioItem.querySelector(".service-description");
  const subtitleInput = servicioItem.querySelector(".field-subtitulo");

  // ✅ Si el usuario vuelve a "Seleccionar servicio..."
  if (!servicioSelect || !servicioSelect.value) {
    if (precioUnitarioInput) precioUnitarioInput.value = 0;
    if (cantidadInput) cantidadInput.value = ""; // 👈 lo dejamos vacío en UI
    if (descuentoInput) descuentoInput.value = 0;
    if (precioTotalSpan) precioTotalSpan.textContent = "$0";
    if (descInput) descInput.value = "";
    if (subtitleInput) subtitleInput.value = "";

    // recalcular totales globales
    const faseContainer = servicioItem.closest(".phase-container");
    if (faseContainer) calcularTotalesFase(faseContainer);
    actualizarTotalCategorias();

    return;
  }

  let precio = parseFloat(precioUnitarioInput?.value || 0);
  let cantidad = parseInt(cantidadInput?.value || 0);
  let descuento = parseFloat(descuentoInput?.value || 0);

  if (isNaN(precio)) precio = 0;
  if (isNaN(cantidad) || cantidad < 1) cantidad = 0;
  if (isNaN(descuento)) descuento = 0;

  const subtotal = precio * cantidad;
  const totalConDescuento = subtotal - (subtotal * descuento) / 100;

  // Mostrar total con descuento
  if (precioTotalSpan) {
    precioTotalSpan.textContent = `$${totalConDescuento.toLocaleString(
      "es-CO",
      {
        minimumFractionDigits: 0,
      }
    )}`;
    precioTotalSpan.style.display = "inline-block";
  }

  const faseContainer = servicioItem.closest(".phase-container");
  if (faseContainer) {
    calcularTotalesFase(faseContainer);
  }
  actualizarTotalCategorias();
}

async function actualizarServicio(id) {
  if (!id) {
    alert("ID de servicio no válido");
    return;
  }

  const codeInput = document.getElementById(`edit-service-code-${id}`);
  const descriptionInput = document.getElementById(
    `edit-service-description-${id}`
  );
  const subtitleInput = document.getElementById(`edit-service-subtitle-${id}`);
  const priceInput = document.getElementById(`edit-service-price-${id}`);
  const categoryInput = document.getElementById(`edit-service-category-${id}`);
  const tipoInput = document.getElementById(`edit-service-tipo-${id}`);
  const marcaInput = document.getElementById(`edit-service-marca-${id}`);
  const presentInput = document.getElementById(
    `edit-service-presentacion-${id}`
  );

  if (
    !codeInput ||
    !descriptionInput ||
    !subtitleInput ||
    !priceInput ||
    !categoryInput ||
    !tipoInput
  ) {
    alert("Faltan campos para actualizar el servicio");
    return;
  }

  const codigo = codeInput.value.trim();
  const descripcion = descriptionInput.value.trim();
  const subtitulo = subtitleInput.value.trim();
  const precio_neto = Number(priceInput.value);
  const categoria_id = Number(categoryInput.value);
  const tipo_item = (tipoInput.value || "servicio").trim();

  const esMaterial = tipo_item === "material";
  const marca = esMaterial ? (marcaInput?.value || "").trim() : null;
  const presentacion = esMaterial ? (presentInput?.value || "").trim() : null;

  if (
    !codigo ||
    !descripcion ||
    !subtitulo ||
    Number.isNaN(precio_neto) ||
    Number.isNaN(categoria_id)
  ) {
    alert("Todos los campos son obligatorios y deben ser válidos");
    return;
  }

  try {
    const response = await fetch(`/api/servicios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        descripcion,
        subtitulo,
        precio_neto,
        categoria_id,
        tipo_item,
        marca,
        presentacion,
      }),
    });
    if (!response.ok) throw new Error("Error en la respuesta del servidor");

    // Puede que la API no devuelva todos los campos
    let fromServer = {};
    try {
      fromServer = await response.json();
    } catch (_) {}

    // Actualiza el array local sin perder campos
    const idx = servicios.findIndex((s) => s.id === id);
    if (idx !== -1) {
      servicios[idx] = {
        ...servicios[idx], // lo que ya había
        ...fromServer, // lo que sí devolvió el servidor
        // fuerza los valores recién editados (por si la API no los incluyó)
        codigo,
        descripcion,
        subtitulo,
        precio_neto: Number(precio_neto) || 0,
        categoria_id: Number(categoria_id),
        tipo_item,
        marca,
        presentacion,
      };
    }

    // Sal del modo edición y repinta la tabla/estadísticas
    editingServiceId = null;
    if (typeof renderServiceTable === "function") renderServiceTable();
    if (typeof updateServiceStats === "function") updateServiceStats();

    // Si este servicio está seleccionado en el cotizador, refleja los cambios sin recargar
    document
      .querySelectorAll(".service-item .servicio-select")
      .forEach((sel) => {
        if (String(sel.value) === String(id)) {
          const item = sel.closest(".service-item");
          item
            .querySelector(".service-description")
            ?.setAttribute("value", descripcion);
          const descInput = item.querySelector(".service-description");
          if (descInput) descInput.value = descripcion;

          const subInput = item.querySelector(".field-subtitulo");
          if (subInput) subInput.value = subtitulo;

          const priceInp = item.querySelector(".precio-unitario-servicio");
          if (priceInp) {
            priceInp.value = Number(precio_neto) || 0;
            // recalcula totales visibles de ese item/fase
            if (typeof actualizarPrecioServicio === "function") {
              actualizarPrecioServicio(item);
            }
          }
        }
      });

    if (typeof showToast === "function")
      showToast("Servicio actualizado correctamente");
  } catch (error) {
    alert("Error al actualizar servicio: " + error.message);
  }
}

/**
 * Elimina un servicio por su ID usando la API y actualiza la lista local y la UI.
 * @param {number} id - ID del servicio a eliminar
 */
async function borrarServicio(id) {
  if (!id) {
    showToast("ID de servicio no válido");
    return;
  }
  try {
    const response = await fetch(`/api/servicios/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Error en la respuesta del servidor");

    servicios = servicios.filter((srv) => srv.id !== id);
    updateServiceStats && updateServiceStats();
    if (typeof renderServiceTable === "function") renderServiceTable();
    showToast("Servicio eliminado correctamente");
  } catch (error) {
    console.error("Error al eliminar servicio:", error);
    showToast("No se pudo eliminar el servicio");
  }
}

function filterCategoryTable() {
  const input = document.getElementById("categorySearchInput"); // Obtener la barra de búsqueda
  const filter = input.value.toLowerCase(); // Convertir el valor de búsqueda a minúsculas
  const categoryTable = document.getElementById("categoryTable"); // Obtener la tabla de categorías
  const categoryRows = categoryTable.getElementsByTagName("tr"); // Obtener todas las filas de la tabla

  // Recorrer todas las filas de la tabla de categorías
  for (let i = 1; i < categoryRows.length; i++) {
    const cells = categoryRows[i].getElementsByTagName("td");
    const nameCell = cells[1]; // La celda de "Nombre de Categoría"

    // Si la celda de "Nombre de Categoría" contiene el texto de búsqueda, mostrar la fila
    if (nameCell) {
      const textValue = nameCell.textContent || nameCell.innerText; // Obtener el texto de la celda
      if (textValue.toLowerCase().indexOf(filter) > -1) {
        categoryRows[i].style.display = ""; // Mostrar fila
      } else {
        categoryRows[i].style.display = "none"; // Ocultar fila
      }
    }
  }
}

// Función para filtrar la tabla de Servicios
function filterServiceTable() {
  const input = document.getElementById("serviceSearchInput");
  const filter = input.value.toLowerCase();
  const serviceTable = document.getElementById("serviceTable");
  const serviceRows = serviceTable.getElementsByTagName("tr");

  for (let i = 1; i < serviceRows.length; i++) {
    const cells = serviceRows[i].getElementsByTagName("td");
    const codeCell = cells[1]; // Código
    const categoryCell = cells[2]; // Categoría
    const subtitleCell = cells[3]; // Categoría
    const descriptionCell = cells[4]; // Descripción

    if (codeCell && descriptionCell && categoryCell && subtitleCell) {
      const codeText = codeCell.textContent || codeCell.innerText;
      const descText = descriptionCell.textContent || descriptionCell.innerText;
      const categoryText = categoryCell.textContent || categoryCell.innerText;
      const subtititleText = subtitleCell.textContet || subtitleCell.innerText;
      if (
        codeText.toLowerCase().includes(filter) ||
        descText.toLowerCase().includes(filter) ||
        categoryText.toLowerCase().includes(filter) ||
        subtititleText.toLowerCase().includes(filter)
      ) {
        serviceRows[i].style.display = "";
      } else {
        serviceRows[i].style.display = "none";
      }
    }
  }
}

// Elementos del DOM necesarios
const cotizacionesList = document.getElementById("cotizacionesList");
const dataManagementTab = document.getElementById("dataManagementTab");
const newQuoteBtn = document.getElementById("newQuoteBtn");
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

const TAB_TO_DOM = {
  new: "newQuoteTab",
  edit: "newQuoteTab",
  duplicate: "newQuoteTab",
  history: "historyTab",
  dataManagement: "dataManagement",
};
let currentQuoteId = null;
let isEditing = false;
let pacientes = [];
let categorias = [];
let servicios = [];
let currentFaseId = 0;

// Variables para gestión de datos
let nextCategoryId = 4;
let nextServiceId = 4;
let deleteId = null;
let deleteType = null; // 'category' or 'service'
let lastAddedCategory = "-";
let lastUpdatedCategory = "-";
let lastAddedService = "";
let editingCategoryId = null;
let editingServiceId = null;
// ⬇️ Pon estas banderas GLOBALES (una sola vez)
let serviceTableListenersBound = false;
let categoryTableListenersBound = false;

const rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", function () {
  // Inicialización
  init();

  async function init() {
    // Carga todo en paralelo y espera a que todo esté listo antes de inicializar selects y listeners
    await Promise.all([
      cargarPacientes(),
      cargarCategorias(),
      cargarServicios(),
    ]);
    // Inicializa la gestión de datos
    setupDataManagement();
    inicializarPrimeraCategoria();
    cargarCotizaciones();
    setupEventListeners();
    setupPhaseToggleAndButtons();
    // Asegura que la barra de búsqueda de pacientes se inicialice después de cargar los datos
    setupPacienteSearchBar();
  }

  async function cargarCategorias() {
    try {
      const response = await fetch("/api/categorias");
      categorias = await response.json();

      // Inicializar lastAddedCategory si hay categorías
      if (categorias.length > 0) {
        lastAddedCategory = categorias[categorias.length - 1].nombre_categoria;
        nextCategoryId = Math.max(...categorias.map((c) => c.id)) + 1;
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const target = tab.getAttribute("data-tab");
      // Ocultar todas las secciones
      tabContents.forEach((content) => {
        content.style.display = "none";
        content.classList.remove("active");
      });
      // Mostrar la sección correspondiente
      const destinoId = TAB_TO_DOM[target];
      const destino = document.getElementById(destinoId);
      if (destino) {
        destino.style.display = "block";
        destino.classList.add("active");
      }
      // Resaltar tab activo
      tabs.forEach((tab2) => tab2.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  async function cargarServicios() {
    try {
      const response = await fetch("/api/servicios");
      servicios = await response.json();

      // Inicializar lastAddedService si hay servicios
      if (servicios.length > 0) {
        lastAddedService = servicios[servicios.length - 1].descripcion;
        nextServiceId = Math.max(...servicios.map((s) => s.id)) + 1;
      }
    } catch (error) {
      console.error("Error al cargar servicios:", error);
    }
  }

  function setupDataManagement() {
    // DOM elements - Categories
    const categoryTableBody = document.getElementById("categoryTableBody");
    const categoryEmptyState = document.getElementById("categoryEmptyState");
    const addCategoryForm = document.getElementById("addCategoryForm");
    const totalCategoriesEl = document.getElementById("totalCategories");
    const lastAddedCategoryEl = document.getElementById("lastAddedCategory");
    const lastUpdatedCategoryEl = document.getElementById(
      "lastUpdatedCategory"
    );

    // DOM elements - Services
    const serviceTableBody = document.getElementById("serviceTableBody");
    const serviceEmptyState = document.getElementById("serviceEmptyState");
    const addServiceForm = document.getElementById("addServiceForm");
    const totalServicesEl = document.getElementById("totalServices");
    const averagePriceEl = document.getElementById("averagePrice");
    const lastAddedServiceEl = document.getElementById("lastAddedService");

    // DOM elements - Shared
    const deleteModal = document.getElementById("deleteModal");
    const deleteMessage = document.getElementById("deleteMessage");
    const toast = document.getElementById("toast");

    // Sub Tab elements
    const categoriesTab = document.getElementById("categoriesTab");
    const servicesTab = document.getElementById("servicesTab");
    const categoriesSection = document.getElementById("categoriesSection");
    const servicesSection = document.getElementById("servicesSection");

    // Initialize tables and stats
    renderCategoryTable();
    renderServiceTable();
    updateCategoryStats();
    updateServiceStats();
    populateCategoryDropdowns();

    // Sub Tab switching (ajustado y simplificado)
    function setActiveSubTab(tab) {
      if (tab === "categories") {
        categoriesTab.classList.add("active");
        servicesTab.classList.remove("active");
        categoriesSection.classList.remove("hidden");
        servicesSection.classList.add("hidden");
      } else if (tab === "services") {
        servicesTab.classList.add("active");
        categoriesTab.classList.remove("active");
        servicesSection.classList.remove("hidden");
        categoriesSection.classList.add("hidden");
      }
    }

    // Inicializar mostrando categorías
    setActiveSubTab("categories");

    categoriesTab.addEventListener("click", function (e) {
      e.preventDefault();
      setActiveSubTab("categories");
    });
    servicesTab.addEventListener("click", function (e) {
      e.preventDefault();
      setActiveSubTab("services");
    });
    addServiceForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const code = document.getElementById("serviceCode").value.trim();
      const description = document
        .getElementById("serviceDescription")
        .value.trim();
      const subtitle = document.getElementById("serviceSubtitle").value.trim();
      const price = parseFloat(document.getElementById("servicePrice").value);
      const categoryId = parseInt(
        document.getElementById("serviceCategory").value
      );
      console.log(
        `Adding service: ${code}, ${description}, ${subtitle}, ${price}, category ID: ${categoryId}`
      );
      guardarServicio(categoryId, code, description, subtitle, price);
    });

    // Add new category
    addCategoryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("categoryName").value.trim();
      const description = document
        .getElementById("categoryDescription")
        .value.trim();
      // console.log(`Adding category: ${name}, ${description}`);
      guardarCategoria(name, description);
    });

    // Delete confirmation
    document
      .getElementById("confirmDelete")
      .addEventListener("click", async function () {
        if (deleteId !== null && deleteType) {
          if (deleteType === "category") {
            const index = categorias.findIndex((cat) => cat.id === deleteId);
            if (index !== -1) {
              const deletedName = categorias[index].nombre_categoria;

              // Check if category is in use by any service
              const inUse = servicios.some(
                (service) => service.categoria_id === deleteId
              );

              if (inUse) {
                showToast(
                  `No se puede eliminar la categoría "${deletedName}" porque está en uso por servicios`
                );
                closeDeleteModal();
                return;
              }

              categorias.splice(index, 1);
              renderCategoryTable();
              updateCategoryStats();
              populateCategoryDropdowns();
              showToast(`Categoría "${deletedName}" eliminada exitosamente`);

              // Actualizar selects en el formulario de cotización
              inicializarPrimeraCategoria();
            }
            closeDeleteModal();
          } else if (deleteType === "service") {
            await borrarServicio(deleteId);
            inicializarPrimeraCategoria && inicializarPrimeraCategoria();
            closeDeleteModal();
          }
        }
      });

    // Cancel delete
    document
      .getElementById("cancelDelete")
      .addEventListener("click", closeDeleteModal);

    // Render category table function with inline editing
    function renderCategoryTable() {
      categoryTableBody.innerHTML = "";

      if (categorias.length === 0) {
        categoryEmptyState.classList.remove("hidden");
      } else {
        categoryEmptyState.classList.add("hidden");

        categorias.forEach((category) => {
          const row = document.createElement("tr");
          row.setAttribute("data-category-id", category.id);
          row.className = "border-t hover:bg-light-gray transition-colors";

          if (editingCategoryId === category.id) {
            // Render editable row
            row.classList.add("table-row-editing");
            row.innerHTML = `
              <td class="py-3 px-4 text-dark">${category.id}</td>
              <td class="py-2 px-4">
                <input type="text" class="input" id="edit-category-name-${
                  category.id
                }" value="${escapeHtml(category.nombre_categoria)}">
              </td>
              <td class="py-2 px-4">
                <input type="text" class="input" id="edit-category-description-${
                  category.id
                }" value="${escapeHtml(category.descripcion)}">
              </td>
              <td class="py-2 px-4">
                <div class="edit-controls flex justify-center">
                  <button class="btn btn-sm btn-success save-category-btn" data-id="${
                    category.id
                  }">
                    <i class="fas fa-check"></i>
                  </button>
                  <button class="btn btn-sm btn-gray cancel-edit-category-btn" data-id="${
                    category.id
                  }">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </td>
            `;
          } else {
            // Render normal row
            row.innerHTML = `
              <td class="py-3 px-4 text-dark">${category.id}</td>
              <td class="py-3 px-4 font-medium text-dark">${escapeHtml(
                category.nombre_categoria
              )}</td>
              <td class="py-3 px-4 text-dark">${escapeHtml(
                category.descripcion
              )}</td>
              <td class="py-2 px-4">
                <div class="flex justify-center space-x-2">
                  <button class="btn btn-sm btn-primary edit-category-btn" data-id="${
                    category.id
                  }">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-category-btn" data-id="${
                    category.id
                  }">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            `;
          }

          categoryTableBody.appendChild(row);
        });

        // Add event listeners
        setupCategoryTableEventListeners();
      }
    }

    // Render service table function with inline editing
    function renderServiceTable() {
      serviceTableBody.innerHTML = "";

      if (servicios.length === 0) {
        serviceEmptyState.classList.remove("hidden");
      } else {
        serviceEmptyState.classList.add("hidden");

        //const servicesToShow = servicios.slice(0, rowsPerPage);

        servicios.forEach((service) => {
          const row = document.createElement("tr");
          row.setAttribute("data-service-id", service.id);
          row.className = "border-t hover:bg-light-gray transition-colors";

          // Find category name
          const category = categorias.find(
            (cat) => cat.id === service.categoria_id
          );
          const categoryName = category
            ? category.nombre_categoria
            : "Desconocido";

          // Siempre renderizar todos los botones, pero solo habilitar guardar/cancelar en modo edición
          const isEditing = Number(editingServiceId) === Number(service.id);
          // Create category options HTML
          let categoryOptionsHtml = "";
          categorias.forEach((cat) => {
            const selected = cat.id === service.categoria_id ? "selected" : "";
            categoryOptionsHtml += `<option value="${
              cat.id
            }" ${selected}>${escapeHtml(cat.nombre_categoria)}</option>`;
          });

          // opciones de tipo
          const tipoActual = service.tipo_item || "servicio";
          const tipoOptions = `
            <option value="servicio" ${
              tipoActual === "servicio" ? "selected" : ""
            }>servicio</option>
            <option value="material" ${
              tipoActual === "material" ? "selected" : ""
            }>material</option>
            <option value="adicional" ${
              tipoActual === "adicional" ? "selected" : ""
            }>adicional</option>
          `;

          row.innerHTML = `
              <td class="py-2 px-4">
                ${
                  isEditing
                    ? `<input type="text" class="input" id="edit-service-code-${
                        service.id
                      }" value="${escapeHtml(service.codigo || "")}">`
                    : `<span class="font-medium text-dark">${escapeHtml(
                        service.codigo || ""
                      )}</span>`
                }
              </td>
              <td class="py-2 px-4">
                ${
                  isEditing
                    ? `<select class="input" id="edit-service-tipo-${service.id}">${tipoOptions}</select>`
                    : `<span class="text-dark">${escapeHtml(tipoActual)}</span>`
                }
              </td>
              <td class="py-2 px-4">
                ${
                  isEditing
                    ? `<select class="input" id="edit-service-category-${service.id}">${categoryOptionsHtml}</select>`
                    : `<span class="text-dark">${escapeHtml(
                        categoryName
                      )}</span>`
                }
              </td>
              
                <td class="py-2 px-4">
                  ${
                    isEditing
                      ? `
                        <div id="edit-extra-material-${
                          service.id
                        }" style="display:${
                          tipoActual === "material" ? "block" : "none"
                        }">
                          <input type="text" class="input mb-1" id="edit-service-marca-${
                            service.id
                          }" placeholder="Marca" value="${service.marca || ""}">
                          <input type="text" class="input" id="edit-service-presentacion-${
                            service.id
                          }" placeholder="Presentación" value="${
                          service.presentacion || ""
                        }">
                        </div>
                        <div id="edit-extra-material-placeholder-${
                          service.id
                        }" style="display:${
                          tipoActual === "material" ? "none" : "block"
                        };opacity:.7">
                          <small>Solo aplica para tipo "material".</small>
                        </div>
                      `
                      : `<span class="text-dark">${service.marca || "-"} / ${
                          service.presentacion || "-"
                        }</span>
                      `
                  }
                </td>
              
              <td class="py-2 px-4">
                ${
                  isEditing
                    ? `<input type="text" class="input" id="edit-service-subtitle-${
                        service.id
                      }" value="${escapeHtml(service.subtitulo)}">`
                    : `<span class="text-dark">${escapeHtml(
                        service.subtitulo
                      )}</span>`
                }
              </td>
              
              <td class="py-2 px-4">
                ${
                  isEditing
                    ? `<input type="text" class="input" id="edit-service-description-${
                        service.id
                      }" value="${escapeHtml(service.descripcion)}">`
                    : `<span class="text-dark">${escapeHtml(
                        service.descripcion
                      )}</span>`
                }
              </td>
              <td class="py-2 px-4">
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"></div>
    ${
      isEditing
        ? `<input type="number" class="input pl-5" id="edit-service-price-${service.id}" value="${service.precio_neto}" min="0" step="0.01">`
        : `<span class="text-dark">$${Number(service.precio_neto).toFixed(
            2
          )}</span>`
    }
  </div>
</td>
  <td class="py-2 px-4">
  <div class="flex justify-center space-x-2">
    ${
      isEditing
        ? `
          <button class="btn btn-sm btn-success save-service-btn" data-id="${service.id}">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-gray cancel-edit-service-btn" data-id="${service.id}">
            <i class="fas fa-times"></i>
          </button>
        `
        : `
          <button class="btn btn-sm btn-primary edit-service-btn" data-id="${service.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-service-btn" data-id="${service.id}">
            <i class="fas fa-trash"></i>
          </button>
        `
    }
  </div>
</td>`;

          serviceTableBody.appendChild(row);

          ////// para validar que material solo tenga marca y presentacion en edicion
          if (isEditing) {
            const selTipo = document.getElementById(
              `edit-service-tipo-${service.id}`
            );
            const box = document.getElementById(
              `edit-extra-material-${service.id}`
            );
            const ph = document.getElementById(
              `edit-extra-material-placeholder-${service.id}`
            );
            selTipo?.addEventListener("change", () => {
              const esMat = selTipo.value === "material";
              if (box) box.style.display = esMat ? "block" : "none";
              if (ph) ph.style.display = esMat ? "none" : "block";
              // opcional: limpiar marca/presentación si dejó de ser material
              if (!esMat) {
                const m = document.getElementById(
                  `edit-service-marca-${service.id}`
                );
                const p = document.getElementById(
                  `edit-service-presentacion-${service.id}`
                );
                if (m) m.value = "";
                if (p) p.value = "";
              }
            });
          }
          /////
        });

        // Add event listeners
        setupServiceTableEventListeners();
      }
    }

    // Función para filtrar la tabla de Categorías
    // Filtrar la tabla de Categorías

    function setupCategoryTableEventListeners() {
      const categoryTableBody = document.getElementById("categoryTableBody");
      if (!categoryTableBody || categoryTableListenersBound) return; // ❗ evita duplicados

      categoryTableBody.addEventListener("click", function (e) {
        const editBtn = e.target.closest(".edit-category-btn");
        if (editBtn) {
          const id = parseInt(editBtn.getAttribute("data-id"));
          console.log(`Editing category with ID: ${id}`);
          startEditingCategory(id);
          return;
        }

        const saveBtn = e.target.closest(".save-category-btn");
        if (saveBtn) {
          const id = parseInt(saveBtn.getAttribute("data-id"));
          saveCategory(id);
          return;
        }

        const cancelBtn = e.target.closest(".cancel-edit-category-btn");
        if (cancelBtn) {
          const id = parseInt(cancelBtn.getAttribute("data-id"));
          cancelEditCategory(id);
          return;
        }

        const deleteBtn = e.target.closest(".delete-category-btn");
        if (deleteBtn) {
          const id = parseInt(deleteBtn.getAttribute("data-id"));
          openDeleteModal(id, "category");
          return;
        }
      });

      categoryTableListenersBound = true; // ✅ marcado
    }

    function setupServiceTableEventListeners() {
      const serviceTableBody = document.getElementById("serviceTableBody");
      if (!serviceTableBody || serviceTableListenersBound) return; // ❗ evita duplicados

      serviceTableBody.addEventListener("click", function (e) {
        const editBtn = e.target.closest(".edit-service-btn");
        if (editBtn) {
          const id = parseInt(editBtn.getAttribute("data-id"));
          console.log(`Editing service with ID: ${id}`);
          startEditingService(id);
          // habilitar botones de guardar/cancelar tras entrar a edición
          setTimeout(() => {
            const saveBtn = document.querySelector(
              `.save-service-btn[data-id='${id}']`
            );
            const cancelBtn = document.querySelector(
              `.cancel-edit-service-btn[data-id='${id}']`
            );
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
          }, 50);
          return;
        }

        const saveBtn = e.target.closest(".save-service-btn");
        if (saveBtn) {
          const id = parseInt(saveBtn.getAttribute("data-id"));
          console.log(`Saving service with ID: ${id}`);
          actualizarServicio(id);
          return;
        }

        const cancelBtn = e.target.closest(".cancel-edit-service-btn");
        if (cancelBtn) {
          const id = parseInt(cancelBtn.getAttribute("data-id"));
          console.log(`Cancel editing service with ID: ${id}`);
          cancelEditService(id);
          return;
        }

        const deleteBtn = e.target.closest(".delete-service-btn");
        if (deleteBtn) {
          const id = parseInt(deleteBtn.getAttribute("data-id"));
          console.log(`Deleting service with ID: ${id}`);
          openDeleteModal(id, "service");
          return;
        }
      });

      serviceTableListenersBound = true; // ✅ marcado como “ya enlazado”
    }

    // Start editing a category
    function startEditingCategory(id) {
      // Cancel any existing edits first
      if (editingCategoryId !== null) {
        cancelEditCategory(editingCategoryId);
      }

      editingCategoryId = id;
      renderCategoryTable();

      // Focus on the name input
      setTimeout(() => {
        const nameInput = document.getElementById(`edit-category-name-${id}`);
        if (nameInput) nameInput.focus();
      }, 100);
    }

    // Save category changes
    function saveCategory(id) {
      const row = document.querySelector(
        `#categoryTableBody tr[data-category-id="${id}"]`
      );
      if (!row) return;

      const nameInput = document
        .getElementById(`edit-category-name-${id}`)
        .value.trim();
      const descInput = document
        .getElementById(`edit-category-description-${id}`)
        .value.trim();
      // console.log(`Saving category with ID: ${id}`);
      //console.log("estoy en save");
      //console.log(nameInput, descInput);
      if (!nameInput || !descInput) {
        alert("Por favor ingresa nombre y descripción.");
        return;
      }

      actualizarCategoria(id, nameInput, descInput);
      editingCategoryId = null;
      renderCategoryTable();
      updateCategoryStats();
    }

    // Cancel category editing
    function cancelEditCategory(id) {
      editingCategoryId = null;
      renderCategoryTable();
    }

    // Start editing a service
    function startEditingService(id) {
      // Cancel any existing edits first
      if (editingServiceId !== null) {
        cancelEditService(editingServiceId);
      }

      editingServiceId = id;
      renderServiceTable();

      // Focus on the code input
      setTimeout(() => {
        const codeInput = document.getElementById(`edit-service-code-${id}`);
        if (codeInput) codeInput.focus();
      }, 100);
    }

    // Save service changes
    function saveService(id) {
      const codeInput = document.getElementById(`edit-service-code-${id}`);
      const descriptionInput = document.getElementById(
        `edit-service-description-${id}`
      );
      const priceInput = document.getElementById(`edit-service-price-${id}`);
      const categoryInput = document.getElementById(
        `edit-service-category-${id}`
      );

      if (codeInput && descriptionInput && priceInput && categoryInput) {
        const code = codeInput.value.trim();
        const description = descriptionInput.value.trim();
        const price = parseFloat(priceInput.value);
        const categoryId = parseInt(categoryInput.value);

        if (code && description && !isNaN(price) && !isNaN(categoryId)) {
          const index = servicios.findIndex((srv) => srv.id === id);
          if (index !== -1) {
            servicios[index].codigo = code;
            servicios[index].descripcion = description;
            servicios[index].precio_neto = price;
            servicios[index].categoria_id = categoryId;

            editingServiceId = null;
            renderServiceTable();
            updateServiceStats();
            showToast(`Servicio "${description}" actualizado exitosamente`);

            // Actualizar selects en el formulario de cotización
            inicializarPrimeraCategoria();
          }
        }
      }
    }

    // Cancel service editing
    function cancelEditService(id) {
      editingServiceId = null;
      renderServiceTable();
    }

    // Populate category dropdowns
    function populateCategoryDropdowns() {
      const serviceCategory = document.getElementById("serviceCategory");

      // Clear existing options except the first one
      while (serviceCategory.options.length > 1) {
        serviceCategory.remove(1);
      }

      // Add category options
      categorias.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.nombre_categoria;
        serviceCategory.appendChild(option);
      });
    }

    // Open delete modal
    function openDeleteModal(id, type) {
      deleteId = id;
      deleteType = type;

      if (type === "category") {
        const category = categorias.find((cat) => cat.id === id);
        if (category) {
          deleteMessage.textContent = `¿Estás seguro de que quieres eliminar la categoría "${category.nombre_categoria}"? Esta acción no se puede deshacer.`;
          //console.log(`Deleting category with ID: ${id}`);
          // Asignar el handler al botón de confirmación
          const confirmDeleteBtn = document.getElementById("confirmDelete");
          if (confirmDeleteBtn) {
            confirmDeleteBtn.onclick = function () {
              borrarCategoria(id);
            };
          }
        }
      } else if (type === "service") {
        const service = servicios.find((srv) => srv.id === id);
        if (service) {
          deleteMessage.textContent = `¿Estás seguro de que quieres eliminar el servicio "${service.descripcion}"? Esta acción no se puede deshacer.`;
          console.log(`Deleting service with ID: ${id}`);
        }
      }

      deleteModal.classList.remove("hidden");
    }

    // Close delete modal
    function closeDeleteModal() {
      deleteModal.classList.add("hidden");
      deleteId = null;
      deleteType = null;
    }

    // Show toast notification
    function showToast(message) {
      const toastMessage = document.getElementById("toastMessage");
      toastMessage.textContent = message;

      toast.classList.remove("hidden");
      toast.classList.add("flex");
      setTimeout(() => {
        toast.classList.remove("flex");
        toast.classList.add("hidden");
      }, 3000);
    }

    // Update category statistics
    function updateCategoryStats() {
      totalCategoriesEl.textContent = categorias.length;
      lastAddedCategoryEl.textContent = lastAddedCategory || "-";
      lastUpdatedCategoryEl.textContent = lastUpdatedCategory || "-";
    }

    // Update service statistics
    function updateServiceStats() {
      totalServicesEl.textContent = servicios.length;
      lastAddedServiceEl.textContent = lastAddedService || "-";

      // Calculate average price
      if (servicios.length > 0) {
        const totalPrice = servicios.reduce(
          (sum, service) => sum + service.precio_neto,
          0
        );
        const average = totalPrice / servicios.length;
        averagePriceEl.textContent = `$${average.toFixed(2)}`;
      } else {
        averagePriceEl.textContent = "$0.00";
      }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    // al final de setupDataManagement(), después de declarar renderServiceTable, updateServiceStats, populateCategoryDropdowns, showToast, etc.
    window.renderServiceTable = renderServiceTable;
    window.updateServiceStats = updateServiceStats;
    window.populateCategoryDropdowns = populateCategoryDropdowns;
    window.showToast = showToast;
    window.renderCategoryTable = renderCategoryTable;
    window.updateCategoryStats = updateCategoryStats;
  }

  function inicializarPrimeraCategoria() {
    const categoriaSelect = document.getElementById("categoriaUnicaSelect");
    const serviciosContainer = document.querySelector(
      "#no-phase-categories .service-list"
    );

    if (categoriaSelect) {
      categoriaSelect.innerHTML =
        '<option value="">Seleccionar categoría...</option>';

      categorias.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent =
          "0" +
          cat.id +
          " - " +
          cat.nombre_categoria +
          (cat.descripcion ? " : " + cat.descripcion : "");
        categoriaSelect.appendChild(option);
      });

      // Cambio de categoría
      categoriaSelect.addEventListener("change", function () {
        if (serviciosContainer) serviciosContainer.innerHTML = "";
        if (this.value && serviciosContainer) {
          agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
        }
      });

      const addServiceBtn = document.querySelector(
        "#no-phase-categories .add-service-btn"
      );
      if (addServiceBtn && !addServiceBtn.dataset.bound) {
        addServiceBtn.dataset.bound = "1"; // evita doble binding
        addServiceBtn.addEventListener("click", () => {
          // usa el flujo unificado
          addNewService(serviciosContainer);
        });
      }

      if (categorias.length > 0) {
        categoriaSelect.value = categorias[0].id;
        categoriaSelect.dispatchEvent(new Event("change"));
      }
    }
  }

  // Función para agregar servicios dinámicamente (se mantiene exactamente igual)

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
    addListener("agregarFaseBtn", "click", addNewPhase());
    addListener("confirmacionFases", "click", togglePhases);
    addListener("agregarCategoriaBtn", "click", agregarCategoriaDeTratamiento);

    const cotizacionForm = document.getElementById("cotizacionForm");
    if (cotizacionForm) {
      cotizacionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await guardarCotizacion(e);
      });
    }

    /*
    addListener("generatePdfBtn", "click", generarPDFDesdeFormulario);
    */

    // dentro de setupEventListeners() en app.js
    addListener("generatePdfBtn", "click", () => {
      if (!window.PDFActions?.generarPDFDesdeFormulario) {
        console.error(
          "PDFActions no está cargado. Revisa el <script> de pdf-actions.js"
        );
        return;
      }
      PDFActions.generarPDFDesdeFormulario();
    });

    addListener("sendEmailBtn", "click", enviarDesdeFormulario);

    // Configuración de la barra de búsqueda (solo si existe)
    setupPacienteSearchBar();
  }

  function setupPhaseToggleAndButtons() {
    // — 1) Toggle de fases
    const phaseToggle = document.getElementById("use-phases");
    if (phaseToggle) {
      phaseToggle.addEventListener("change", function () {
        togglePhases(this.checked);
      });
      // Estado inicial
      togglePhases(false);
    }

    // — 2) Botón “Agregar primera fase”
    const addFirst = document.getElementById("add-first-phase-btn");
    if (addFirst) {
      addFirst.addEventListener("click", function () {
        addNewPhase();
        const msg = document.getElementById("no-phases-message");
        if (msg) msg.classList.add("hidden");
      });
    }

    // — 3) Botón “Agregar fase” genérico
    const addPhase = document.getElementById("add-phase-btn");
    if (addPhase) {
      addPhase.addEventListener("click", addNewPhase);
    }

    // — 4) Botón “Agregar categoría” (modo fase o no-fase)
    const addCat = document.getElementById("add-category-btn");
    if (addCat) {
      addCat.addEventListener("click", addNewCategory);
    }

    // — 6) Botón “Reset”
    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (confirm("¿Está seguro de que desea reiniciar el formulario?")) {
          window.location.reload();
        }
      });
    }

    // — 7) Botón “Generar cotización”
    const genBtn = document.getElementById("generate-quote-btn");
    if (genBtn) {
      genBtn.addEventListener("click", function () {
        alert("¡Plan de tratamiento generado!");
      });
    }
  }
  // Toggle phases on/off
  function togglePhases(usePhases) {
    const phasesContainer = document.getElementById("phases-container");

    const noPhaseCategories = document.getElementById("no-phase-categories");

    if (usePhases) {
      phasesContainer.classList.remove("hidden");

      noPhaseCategories.classList.add("hidden");
    } else {
      phasesContainer.classList.add("hidden");

      noPhaseCategories.classList.remove("hidden");
    }
  }
  // Función para añadir nuevas fases
  function addNewPhase() {
    const phasesContainer = document.getElementById("phases-container");
    const phaseTemplate = document.getElementById("phase-template");

    // Obtener o crear el grid
    let phasesGrid =
      document.getElementById("phases-grid") || createPhasesGrid();

    // Clonar plantilla
    const newPhase = phaseTemplate.content.cloneNode(true);
    const phaseContainer = newPhase.querySelector(".phase-container");
    phaseContainer.classList.remove("hidden");

    // Configurar fase
    setupPhase(phaseContainer, phasesGrid);

    // Añadir al grid
    phasesGrid.appendChild(phaseContainer);
    reorganizePhasesLayout();
  }

  function createPhasesGrid() {
    const grid = document.createElement("div");
    grid.id = "phases-grid";
    grid.className = "phases-grid";
    document
      .getElementById("phases-container")
      .insertBefore(grid, document.getElementById("add-phase-btn").parentNode);
    return grid;
  }

  function setupPhase(phaseContainer, phasesGrid) {
    const phaseCount =
      phasesGrid.querySelectorAll(".phase-container:not(.hidden)").length + 1;

    phaseContainer.querySelector(".phase-number-badge").textContent =
      phaseCount;
    phaseContainer.querySelector(".phase-number-text").textContent = phaseCount;

    // Asignar ID único y actualizar label
    const inputDuracion = phaseContainer.querySelector(".phase-duration");
    const labelDuracion = phaseContainer.querySelector(".duration-label");

    if (inputDuracion && labelDuracion) {
      const idUnico = `duracion-fase-${phaseCount}`;
      inputDuracion.id = idUnico;
      labelDuracion.setAttribute("for", idUnico);
    }
    // Asignar ID único y actualizar label de observaciones
    const inputObservaciones = phaseContainer.querySelector(
      ".observaciones-fases"
    );
    const labelObservaciones = phaseContainer.querySelector(
      "label[for^='observaciones-fases']"
    );

    if (inputObservaciones && labelObservaciones) {
      const idObservacion = `observaciones-fases-${phaseCount}`;
      inputObservaciones.id = idObservacion;
      labelObservaciones.setAttribute("for", idObservacion);
    }

    phaseContainer
      .querySelector(".remove-phase-btn")
      .addEventListener("click", function () {
        if (confirm("¿Eliminar esta fase y todos sus servicios?")) {
          phaseContainer.remove();
          updatePhaseNumbers();
          reorganizePhasesLayout();
          checkEmptyPhases();
        }
      });

    // Resto de configuración...
    const firstCategory = phaseContainer.querySelector(".category-group");
    setupCategoryEvents(firstCategory);
    addNewService(firstCategory.querySelector(".service-list"));

    document.getElementById("no-phases-message").classList.add("hidden");
    const addCatBtn = phaseContainer.querySelector(".add-category-btn");
    if (addCatBtn) {
      addCatBtn.addEventListener("click", () => {
        addNewCategoryToPhase(phaseContainer);
      });
    }
  }

  // Reorganizar el layout de las fases
  function reorganizePhasesLayout() {
    const phasesGrid = document.getElementById("phases-grid");
    if (!phasesGrid) return;

    const phases = Array.from(
      phasesGrid.querySelectorAll(".phase-container:not(.hidden)")
    );

    // Resetear estilos
    phases.forEach((phase) => {
      phase.style.gridColumn = "";
      phase.style.width = "";
    });

    // Caso especial para 1 fase
    if (phases.length === 1) {
      phases[0].style.gridColumn = "1 / -1";
      return;
    }

    // Organizar en pares
    for (let i = 0; i < phases.length; i += 2) {
      // Si es el último y el total es impar
      if (i === phases.length - 1 && phases.length % 2 !== 0) {
        phases[i].style.gridColumn = "1 / -1";
      } else {
        // Par de fases
        phases[i].style.gridColumn = "1";
        phases[i + 1].style.gridColumn = "2";
      }
    }
  }

  // Add a new category to a phase
  function addNewCategoryToPhase(phase) {
    const newCategory = phase.querySelector(".category-group").cloneNode(true);
    const addBtn = newCategory.querySelector(".add-service-btn");
    if (addBtn) addBtn.removeAttribute("data-bound");

    // Clear any existing services
    newCategory.querySelector(".service-list").innerHTML = "";

    setupCategoryEvents(newCategory);

    addNewService(newCategory.querySelector(".service-list"));

    phase.insertBefore(
      newCategory,

      phase.querySelector(".add-category-btn").parentNode
    );
  }
  // Add a new general category (non-phase)
  function addNewCategory() {
    const container = document.getElementById("no-phase-categories");

    const firstCategory = container.querySelector(".category-group");

    const newCategory = firstCategory.cloneNode(true);

    const addBtn = newCategory.querySelector(".add-service-btn");
    if (addBtn) addBtn.removeAttribute("data-bound");

    // Clear any existing services

    newCategory.querySelector(".service-list").innerHTML = "";

    setupCategoryEvents(newCategory);

    addNewService(newCategory.querySelector(".service-list"));

    container.appendChild(newCategory);
  }
  // Set up event listeners for a category
  function setupCategoryEvents(category) {
    // Botón eliminar categoría
    const removeBtn = category.querySelector(".remove-category-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        const container = category.parentNode;
        const categories = container.querySelectorAll(".category-group");
        if (categories.length > 1) {
          if (confirm("¿Eliminar esta categoría y todos sus servicios?")) {
            category.remove();
            actualizarTotalCategorias();
          }
        } else {
          alert("Cada tratamiento debe tener al menos una categoría.");
        }
      });
    }

    // Botón añadir servicio
    const addServiceBtn = category.querySelector(".add-service-btn");
    if (addServiceBtn && !addServiceBtn.dataset.bound) {
      addServiceBtn.dataset.bound = "1"; // ✅ evita doble listener
      addServiceBtn.addEventListener("click", function () {
        const serviceList = category.querySelector(".service-list");
        addNewService(serviceList); // ahora siempre usa el flujo unificado
      });
    }

    // Select de categoría
    const categorySelect =
      category.querySelector(".categoria-fase-select") ||
      category.querySelector(".categoria-unica-select");

    if (categorySelect) {
      // Llenar el select con las categorías reales
      categorySelect.innerHTML =
        '<option value="">Seleccionar categoría...</option>';
      categorias.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = `0${cat.id} - ${cat.nombre_categoria}${
          cat.descripcion ? " : " + cat.descripcion : ""
        }`;
        categorySelect.appendChild(option);
      });

      window.hayOrtodoncia = false;
      // Evento: actualizar servicios al cambiar de categoría
      categorySelect.addEventListener("change", function () {
        const serviciosContainer = category.querySelector(".service-list");
        if (serviciosContainer) {
          serviciosContainer.innerHTML = "";
          if (this.value) {
            agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
          }
        }
        //si hay ortodoncia/ortodoncia invisible seleccionado como categoria
        const selectedText =
          this.options[this.selectedIndex]?.textContent.toLowerCase() || "";
        if (selectedText.includes("ortodoncia")) {
          window.hayOrtodoncia = true;
        } else {
          window.hayOrtodoncia = false;
        }

        if (typeof actualizarUIOrtodoncia === "function") {
          actualizarUIOrtodoncia();
        }
      });

      // Autoselección
      if (categorias.length > 0 && !categorySelect.value) {
        categorySelect.value = categorias[0].id;
        categorySelect.dispatchEvent(new Event("change"));
      }
    }
  }

  // Add a new service to a service list
  function addNewService(serviceList) {
    const categorySelect = serviceList
      .closest(".category-group")
      ?.querySelector(".categoria-fase-select, .categoria-unica-select");
    const categoriaId = categorySelect?.value || "";
    if (!categoriaId) return;
    agregarServicioEnCategoriasDinamico(serviceList, categoriaId);
  }

  // Update subcategory options when category changes
  function updateSubcategoryOptions(categorySelect, subcategorySelect = null) {
    const selectedCategory = categorySelect.value;

    const targetSelect =
      subcategorySelect ||
      categorySelect
        .closest(".service-list")
        ?.querySelector(".servicio-select");

    if (!targetSelect) return;

    // Clear existing options except the first

    targetSelect.innerHTML =
      '<option value="">Seleccionar servicio...</option>';

    // Add subcategories based on category

    if (selectedCategory === "general-dentistry") {
      addSubcategoryOption(targetSelect, "assessments", "Evaluaciones");

      addSubcategoryOption(targetSelect, "hygiene", "Higiene");

      addSubcategoryOption(targetSelect, "resins", "Resinas");

      addSubcategoryOption(targetSelect, "fillings", "Empastes");

      addSubcategoryOption(targetSelect, "extractions", "Extracciones");
    } else if (selectedCategory === "cosmetic-dentistry") {
      addSubcategoryOption(targetSelect, "whitening", "Blanqueamiento");

      addSubcategoryOption(targetSelect, "veneers", "Carillas");

      addSubcategoryOption(targetSelect, "bonding", "Bonding");
    }
  }
  function addSubcategoryOption(select, value, text) {
    const option = document.createElement("option");

    option.value = value;

    option.textContent = text;

    select.appendChild(option);
  }
  function updatePhaseNumbers() {
    const phases = document.querySelectorAll(".phase-container:not(.hidden)");
    phases.forEach((phase, index) => {
      const num = index + 1;
      phase.querySelector(".phase-number-badge").textContent = num;
      phase.querySelector(".phase-number-text").textContent = num;
    });
  }

  function checkEmptyPhases() {
    if (
      document.querySelectorAll(".phase-container:not(.hidden)").length === 0
    ) {
      document.getElementById("no-phases-message").classList.remove("hidden");
    }
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
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-tab") === menuFocus
      );
    });

    // Cargar datos si es necesario
    if (!skipLoad) {
      if (view === "history") cargarCotizaciones();
    }

    // Resetear formulario si se solicita
    if (reset) {
      nuevaCotizacion();
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
        div.dataset.id = p.id; // ⬅️ asignar ID como atributo
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

    function seleccionarPaciente(paciente) {
      input.value = `${paciente.nombre} - ${paciente.correo || "Sin correo"}`;
      results.style.display = "none";
      document.getElementById("nuevoPacienteForm").style.display = "none";

      // 👉 Elimina input oculto anterior si existe
      document.getElementById("pacienteSelectIdHidden")?.remove();

      // 👉 Agrega input oculto con ID real
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

      // Asegúrate de eliminar ID previo si existía
      document.getElementById("pacienteSelectIdHidden")?.remove();

      // También rellenar el nombre del formulario de nuevo paciente
      document.getElementById("nombrePaciente").value = nombre;
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

  // --- Función global para actualizar estadísticas de categorías ---
  function updateCategoryStats() {
    const totalCategoriesEl = document.getElementById("totalCategories");
    const lastAddedCategoryEl = document.getElementById("lastAddedCategory");
    const lastUpdatedCategoryEl = document.getElementById(
      "lastUpdatedCategory"
    );
    if (totalCategoriesEl) totalCategoriesEl.textContent = categorias.length;
    if (lastAddedCategoryEl)
      lastAddedCategoryEl.textContent = lastAddedCategory || "-";
    if (lastUpdatedCategoryEl)
      lastUpdatedCategoryEl.textContent = lastUpdatedCategory || "-";
  }

  // --- Función global para mostrar notificaciones tipo toast ---
  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("flex");
    setTimeout(() => {
      toast.classList.remove("flex");
      toast.classList.add("hidden");
    }, 3000);
  }

  async function actualizarCategoria(id, name, descripcion) {
    if (!id || !name) {
      alert("ID o nombre de categoría no válido");
      return;
    }
    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          descripcion: descripcion || null,
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const updatedCategory = await response.json();
      const index = categorias.findIndex((cat) => cat.id == id); // usa == por si uno es string
      if (index !== -1) {
        categorias[index] = updatedCategory;
        lastUpdatedCategory = updatedCategory.nombre_categoria;
        updateCategoryStats();
        showToast(
          `Categoría "${updatedCategory.nombre_categoria}" actualizada correctamente`
        );
        // Renderizar tabla y dropdowns para reflejar el cambio
        if (typeof renderCategoryTable === "function") renderCategoryTable();
        if (typeof renderServiceTable === "function") renderServiceTable();
        if (typeof populateCategoryDropdowns === "function")
          populateCategoryDropdowns();
      }
    } catch (error) {
      alert("Error al actualizar categoría: " + error.message);
    }
  }

  async function safeJson(response) {
    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function guardarCategoria(name, descripcion) {
    try {
      const response = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          descripcion: descripcion.trim(),
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const nuevaCategoria = await response.json();

      categorias.push(nuevaCategoria);
      lastAddedCategory = nuevaCategoria.nombre_categoria;

      renderCategoryTable();
      updateCategoryStats();
      populateCategoryDropdowns();
      inicializarPrimeraCategoria();

      showToast(
        `Categoría "${nuevaCategoria.nombre_categoria}" añadida correctamente`
      );

      document.getElementById("addCategoryForm").reset();
    } catch (error) {
      alert("Error al guardar categoría: " + error.message);
    }
  }

  async function borrarCategoria(id) {
    if (!id) {
      alert("ID de categoría no válido");
      return;
    }
    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      categorias = categorias.filter((cat) => cat.id !== id);
      updateCategoryStats();
      showToast(`Categoría eliminada correctamente`);
    } catch (error) {
      alert("Error al eliminar categoría: " + error.message);
    }
  }

  /////
  //mostrar input marca y presentacion cuando se selecciona material
  document.querySelectorAll('input[name="tipo_item"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const esMaterial =
        document.querySelector('input[name="tipo_item"]:checked').value ===
        "material";
      document.getElementById("extra-material").style.display = esMaterial
        ? "block"
        : "none";
    });
  });

  async function guardarServicio(
    categoriaId,
    codigo,
    descripcion,
    subtitulo,
    precio,
    tipo_item,
    marca,
    presentacion
  ) {
    try {
      const tipoItem =
        document.querySelector('input[name="tipo_item"]:checked')?.value ||
        "servicio";
      const isMaterial = tipoItem === "material";
      const marcaVal = isMaterial
        ? (document.getElementById("serviceMarca")?.value || "").trim()
        : null;
      const presentacionVal = isMaterial
        ? (document.getElementById("servicePresentacion")?.value || "").trim()
        : null;

      const paylodad = {
        categoria_id: parseInt(categoriaId),
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        subtitulo: subtitulo.trim(),
        precio_neto: parseFloat(precio) || 0, // asegurar número
        tipo_item: tipoItem,
        marca: marcaVal,
        presentacion: presentacionVal,
      };
      console.log("payload que envio", paylodad);

      const response = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paylodad),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const nuevoServicio = await response.json();
      nuevoServicio.precio_neto = parseFloat(nuevoServicio.precio_neto) || 0;

      servicios.push(nuevoServicio);
      lastAddedService = nuevoServicio.descripcion;

      renderServiceTable();
      updateServiceStats();
      showToast(
        `Servicio "${nuevoServicio.descripcion}" añadido correctamente`
      );

      document.getElementById("addServiceForm").reset();

      // 🔹 Recargar página después de un pequeño delay para que se vea el toast
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      alert("Error al guardar servicio: " + error.message);
    }
  }

  async function guardarPaciente() {
    const nombreInput = document.getElementById("nombrePaciente");
    const correoInput = document.getElementById("correoPaciente");
    const telefonoInput = document.getElementById("telefonoPaciente");
    if (!nombreInput) {
      alert("El nombre del paciente es obligatorio");
      document.getElementById("nombrePaciente").focus();
      return; // Detiene la ejecución
    }

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

  function _extractIdFromLocationHeader(response) {
    const loc =
      response.headers.get("Location") || response.headers.get("location");
    if (!loc) return null;
    const m = loc.match(/\/(\d+)(?:\/)?$/);
    return m ? Number(m[1]) : null;
  }
  // ====== HELPERS CORREGIDOS (funcionan con tu HTML real) ======
  function getCategoriaIdFromCategoryGroup(catGroup) {
    // En tu HTML hay .categoria-unica-select (sin fases) y .categoria-fase-select (con fases)
    const sel = catGroup.querySelector(
      ".categoria-unica-select, .categoria-fase-select"
    );
    const v = Number(sel?.value);
    return Number.isNaN(v) ? null : v;
  }

  function collectServiciosFromCategoryGroup(catGroup) {
    const servicios = [];
    // Los servicios se renderizan dentro de .service-list
    catGroup.querySelectorAll(".service-list .service-item").forEach((item) => {
      const servicio_id = Number(item.querySelector(".servicio-select")?.value);
      if (!servicio_id) return; // ignora filas vacías

      const cantidad =
        Number(item.querySelector(".cantidad-servicio")?.value) || 1;
      const precio_unitario =
        Number(item.querySelector(".precio-unitario-servicio")?.value) || 0;
      const descuento =
        Number(item.querySelector(".descuento-servicio")?.value) || 0;

      const subtotal = +(precio_unitario * cantidad).toFixed(2);
      const total = +(subtotal - subtotal * (descuento / 100)).toFixed(2);

      servicios.push({
        servicio_id,
        cantidad,
        precio_unitario,
        descuento,
        subtotal,
        total,
      });
    });
    return servicios;
  }

  function collectNoPhaseCategoriasYServicios() {
    const categorias = [];
    // ✅ En sin fases el contenedor es #no-phase-categories y cada bloque es .category-group
    document
      .querySelectorAll("#no-phase-categories .category-group")
      .forEach((catGroup) => {
        const categoria_id = getCategoriaIdFromCategoryGroup(catGroup);
        const servicios = collectServiciosFromCategoryGroup(catGroup);
        if (categoria_id && servicios.length)
          categorias.push({ categoria_id, servicios });
      });
    return categorias;
  }

  function collectPhasesCategoriasYServicios() {
    const fases = [];
    // ✅ En con fases: cada fase es .phase-container y dentro hay varias .category-group
    document
      .querySelectorAll("#phases-container .phase-container")
      .forEach((phaseEl, index) => {
        const categorias = [];
        phaseEl.querySelectorAll(".category-group").forEach((catGroup) => {
          const categoria_id = getCategoriaIdFromCategoryGroup(catGroup);
          const servicios = collectServiciosFromCategoryGroup(catGroup);
          if (categoria_id && servicios.length)
            categorias.push({ categoria_id, servicios });
        });
        if (categorias.length)
          fases.push({ numero_fase: index + 1, categorias });
      });
    return fases;
  }

  function collectCotizacionEstructura() {
    // Usa el toggle real de tu UI
    const usarFases = !!document.getElementById("use-phases")?.checked;
    if (usarFases) {
      return {
        tipo: "con_fases",
        fases: collectPhasesCategoriasYServicios(),
      };
    }
    return {
      tipo: "sin_fases",
      categorias: collectNoPhaseCategoriasYServicios(),
    };
  }

  // Convierte la estructura capturada a items para guardar
  function flattenDetalleCotizacion(cotizacionId, estructura) {
    const items = [];
    if (!estructura) return items;

    const pushItem = (s) => {
      items.push({
        cotizacion_id: Number(cotizacionId),
        servicio_id: Number(s.servicio_id),
        cantidad: Number(s.cantidad) || 1,
        precio_unitario: Number(s.precio_unitario ?? s.precio) || 0,
        descuento: Number(s.descuento) || 0,
        total: Number(s.total) || 0,
      });
    };

    if (estructura.tipo === "sin_fases") {
      (estructura.categorias || []).forEach((cat) => {
        (cat.servicios || []).forEach(pushItem);
      });
    } else {
      (estructura.fases || []).forEach((f) => {
        (f.categorias || []).forEach((cat) => {
          (cat.servicios || []).forEach(pushItem);
        });
      });
    }
    return items;
  }

  // GUARDA detalle SOLO con el endpoint bulk /api/cotizaciones/detalle
  async function guardarDetalleCotizacion(
    cotizacionId,
    estructura /* sin phaseMap */
  ) {
    const items = flattenDetalleCotizacion(cotizacionId, estructura);
    window.COTIZACION_DETALLE_DEBUG = items; // debug
    if (!items.length) return;

    const resp = await fetch("/api/cotizaciones/detalle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cotizacion_id: Number(cotizacionId),
        items,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error("No se pudo guardar el detalle (bulk): " + txt);
    }
    console.log("Detalle guardado en CotizacionServicios (bulk).");
  }

  // Si NO hay fases, registra categorías usadas: fase_id = cotizacionId
  async function guardarCategoriasSinFasesEnFaseCategoria(
    cotizacionId,
    estructura
  ) {
    if (!estructura || estructura.tipo !== "sin_fases") return;

    // categorías únicas usadas en la cotización sin fases
    const setCats = new Set();
    (estructura.categorias || []).forEach((c) => {
      if (c?.categoria_id) setCats.add(Number(c.categoria_id));
    });
    const categoriasUnicas = Array.from(setCats);
    if (!categoriasUnicas.length) return;

    await Promise.all(
      categoriasUnicas.map((categoria_id) =>
        fetch("/api/fases/categoria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fase_id: Number(cotizacionId), // << requisito: usar id de cotización
            categoria_id: Number(categoria_id),
          }),
        })
      )
    );
    console.log(
      "FaseCategorias (sin fases) registrado con fase_id=cotizacionId."
    );
  }

  // ========================== GUARDAR COTIZACIÓN ==========================
  // ========================== GUARDAR COTIZACIÓN (actualizado) ==========================
  // ========================== GUARDAR COTIZACIÓN (orden final) ==========================

  // ---- Construye detalle desde FASES ----
  function buildDetalleItemsFromFases(fasesArr, cotizacionId) {
    const items = [];
    (fasesArr || []).forEach((f) => {
      (f.servicios || []).forEach((s) => {
        const servicio_id = Number(s.servicio_id);
        const cantidad = Number(s.cantidad) || 1;
        const precio_unit = Number(s.precio_unitario ?? s.precio) || 0;
        const descuento = Number(s.descuento) || 0;
        const total = Number(s.total) || 0;

        if (!servicio_id || Number.isNaN(servicio_id)) return; // filtra vacíos

        items.push({
          cotizacion_id: Number(cotizacionId),
          servicio_id,
          cantidad,
          precio_unitario: precio_unit,
          descuento,
          total,
        });
      });
    });
    return items;
  }

  // ---- Construye detalle SIN FASES (desde tu estructuraCS) ----
  function buildDetalleItemsFromNoFases(estructura, cotizacionId) {
    const items = [];
    (estructura?.categorias || []).forEach((c) => {
      (c.servicios || []).forEach((s) => {
        const servicio_id = Number(s.servicio_id);
        const cantidad = Number(s.cantidad) || 1;
        const precio_unit = Number(s.precio_unitario ?? s.precio) || 0;
        const descuento = Number(s.descuento) || 0;
        const total = Number(s.total) || 0;

        if (!servicio_id || Number.isNaN(servicio_id)) return; // filtra vacíos

        items.push({
          cotizacion_id: Number(cotizacionId),
          servicio_id,
          cantidad,
          precio_unitario: precio_unit,
          descuento,
          total,
        });
      });
    });
    return items;
  }

  // ---- Guarda detalle SOLO en /api/cotizaciones/detalle (bulk) ----
  async function guardarDetalleBulk(cotizacionId, items) {
    const payload = {
      cotizacion_id: Number(cotizacionId),
      items: (items || []).filter(Boolean),
    };

    // Validaciones previas (evita 400 del server)
    if (!payload.cotizacion_id) {
      throw new Error("cotizacion_id vacío al guardar detalle");
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      console.warn("Detalle vacío, no se envía a /api/cotizaciones/detalle");
      return; // no hay nada que guardar
    }

    // LOG de depuración
    console.log("POST /api/cotizaciones/detalle payload:", payload);

    const resp = await fetch("/api/cotizaciones/detalle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Respuesta del server (detalle bulk):", txt);
      throw new Error("No se pudo guardar el detalle (bulk): " + txt);
    }
    console.log("Detalle guardado en CotizacionServicios (bulk).");
  }

  async function ensurePlaceholderFase(cotizacionId) {
    // intenta con 1; si ya existiera, prueba 999 y 1001
    const candidatos = [1, 999, 1001];
    for (const numero_fase of candidatos) {
      const payload = {
        cotizacion_id: Number(cotizacionId),
        numero_fase,
        duracion_meses: 1,
        observaciones_fase: "auto: sin_fases",
      };
      const resp = await fetch("/api/fases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = await resp.json();
        return Number(data.id); // id de la Fase creada
      }

      const txt = await resp.text().catch(() => "");
      // si no es error de UNIQUE (número de fase repetido), corta y lanza
      if (!/UNIQUE|ya existe/i.test(txt)) {
        throw new Error("No se pudo crear la fase placeholder: " + txt);
      }
      // si fue UNIQUE, sigue probando con el siguiente número
    }
    throw new Error("No se pudo crear fase placeholder tras reintentos.");
  }

  async function guardarCotizacion(e) {
    try {
      if (e && typeof e.preventDefault === "function") e.preventDefault();

      // ====== 1) PACIENTE ======
      let pacienteId = document.querySelector("[name='paciente_id']")?.value;
      const nuevoPacienteForm = document.getElementById("nuevoPacienteForm");

      if (nuevoPacienteForm && nuevoPacienteForm.style.display !== "none") {
        const nuevoPaciente = {
          nombre: document.getElementById("nombrePaciente").value,
          correo: document.getElementById("correoPaciente").value,
          telefono: document.getElementById("telefonoPaciente").value,
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

          if (!response.ok) throw new Error(await response.text());
          const dataPaciente = await response.json();
          pacienteId = dataPaciente.id;

          // Asegura el hidden con el id del paciente
          let hidden = document.getElementById("pacienteSelectIdHidden");
          if (!hidden) {
            hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = "pacienteSelectIdHidden";
            hidden.name = "paciente_id";
            document
              .getElementById("pacienteSearchInput")
              .parentNode.appendChild(hidden);
          }
          hidden.value = pacienteId;
        } catch (err) {
          console.error("[Paciente] Error:", err);
          alert("Error al guardar paciente");
          return;
        }
      }

      if (!pacienteId) {
        alert("Debe seleccionar o crear un paciente");
        return;
      }

      // ====== 2) TOTALES ======
      const parseMoney = (txt) =>
        parseFloat(
          (txt || "")
            .replace(/\s/g, "")
            .replace("$", "")
            .replace(/\./g, "")
            .replace(",", ".")
        ) || 0;

      const subtotal = parseMoney(
        document.getElementById("subtotal-cotizacion")?.textContent
      );
      const descuentoDinero = parseMoney(
        document.getElementById("descuento-cotizacion")?.textContent
      );
      const totalConDescuento = parseMoney(
        document.getElementById("total-cotizacion")?.textContent
      );

      // Si quieres seguir guardando “descuento” como % en la tabla:
      const descuento = subtotal > 0 ? (descuentoDinero / subtotal) * 100 : 0;

      // === NUEVO: tomar "pago" del mismo builder del PDF (ya lo tienes)
      let pago = null;
      try {
        const payloadUI = window.PDFPayload.armarPayloadPDFDesdeUI();
        pago = payloadUI?.pago || null;
      } catch (_) {}

      ///
      const cotizacionSimplificada = {
        paciente_id: Number(pacienteId),
        total: subtotal,
        estado: "borrador",
        descuento: descuento, // hoy lo manejas como %
        total_con_descuento: totalConDescuento,
        // observaciones se setea más abajo

        // === NUEVO: totales fuertes y método de pago ===
        subtotal: subtotal,
        pago_metodo: pago?.metodo || null, // "unico" | "aplazado"
        pago_cuota_inicial: pago?.cuota_inicial ?? null,
        pago_numero_cuotas: pago?.numero_cuotas ?? null,
        pago_valor_cuota: pago?.valor_cuota ?? null,
        pago_valor_pagado: pago?.valor_pagado_a_la_fecha ?? null,
        pago_fase_higienica_incluida:
          typeof pago?.fase_higienica_incluida === "boolean"
            ? pago.fase_higienica_incluida
              ? 1
              : 0
            : null,
      };

      // ====== 3) FASES (recolección completa) ======
      const fases = [];
      document
        .querySelectorAll("#phases-container .phase-container")
        .forEach((faseEl, index) => {
          const duracionInput = faseEl.querySelector(".phase-duration");
          const duracion = duracionInput
            ? parseInt(duracionInput.value || "1")
            : 1;

          // Observaciones de la fase (únicas)
          const obsUnicas = Array.from(
            new Set(
              Array.from(faseEl.querySelectorAll(".observaciones-fases"))
                .map((i) => (i.value || "").trim())
                .filter((v) => v.length > 0)
            )
          );
          const observacion = obsUnicas.join(" | ");

          const categoriasSet = new Set();
          const servicios = [];

          faseEl.querySelectorAll(".service-item").forEach((item) => {
            const servicioId = item.querySelector(".servicio-select")?.value;
            if (!servicioId) return;

            const cantidad =
              parseInt(item.querySelector(".cantidad-servicio")?.value) || 1;
            const precio =
              parseFloat(
                item.querySelector(".precio-unitario-servicio")?.value
              ) || 0;
            const desc =
              parseFloat(item.querySelector(".descuento-servicio")?.value) || 0;

            const subtotalServicio = precio * cantidad;
            const total = subtotalServicio - (subtotalServicio * desc) / 100;

            // Categoría (select en header de la categoría)
            const catSel =
              item
                .closest(".category-group")
                ?.querySelector(".categoria-fase-select") || null;
            const categoriaId = catSel?.value;
            if (categoriaId) categoriasSet.add(Number(categoriaId));

            servicios.push({
              servicio_id: Number(servicioId),
              cantidad,
              precio_unitario: precio,
              descuento: desc,
              total,
            });
          });

          if (servicios.length > 0) {
            fases.push({
              numero_fase: index + 1,
              duracion,
              observacion,
              servicios,
              categorias: Array.from(categoriasSet),
            });
          }
        });

      // ====== 3.5) OBSERVACIONES según haya o no fases ======
      if (Array.isArray(fases) && fases.length > 0) {
        cotizacionSimplificada.observaciones = "hay fases";
      } else {
        const observacionesArray = [];
        const observacionesElements = document.querySelectorAll(
          "#no-phase-categories .observaciones-no-fase"
        );

        observacionesElements.forEach((obsEl) => {
          const texto = (obsEl.value || "").trim();
          observacionesArray.push(texto || " ");
        });

        cotizacionSimplificada.observaciones = observacionesArray.join(" | ");
      }

      // ====== CAPTURA ESTRUCTURA GLOBAL (para no-fases) ======
      const estructuraCS =
        typeof collectCotizacionEstructura === "function"
          ? collectCotizacionEstructura()
          : { tipo: "sin_fases", categorias: [] };
      window.COTIZACION_DEBUG = estructuraCS;
      console.log("COTIZACION_DEBUG:", estructuraCS);

      // ====== 4) GUARDAR COTIZACIÓN ======
      let currentId =
        typeof currentQuoteId !== "undefined" ? currentQuoteId : null;
      try {
        const url = currentId
          ? `/api/cotizaciones/${currentId}`
          : "/api/cotizaciones";
        const method = currentId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cotizacionSimplificada),
        });
        if (!response.ok) throw new Error(await response.text());

        const result = await response.json();
        currentId = result.id || currentId;
        if (typeof currentQuoteId !== "undefined") currentQuoteId = currentId;
      } catch (err) {
        console.error("[Cotización] Error:", err);
        alert("Error al guardar cotización");
        return;
      }

      // ====== Helpers locales ======
      const buildDetalleItemsFromFases = (fasesArr) => {
        const items = [];
        (fasesArr || []).forEach((f) => {
          (f.servicios || []).forEach((s) => {
            items.push({
              cotizacion_id: Number(currentId),
              servicio_id: Number(s.servicio_id),
              cantidad: Number(s.cantidad) || 1,
              precio_unitario: Number(s.precio_unitario) || 0,
              descuento: Number(s.descuento) || 0,
              total: Number(s.total) || 0,
            });
          });
        });
        return items;
      };

      const buildDetalleItemsFromNoFases = (estructura) => {
        const items = [];
        (estructura?.categorias || []).forEach((c) => {
          (c.servicios || []).forEach((s) => {
            items.push({
              cotizacion_id: Number(currentId),
              servicio_id: Number(s.servicio_id),
              cantidad: Number(s.cantidad) || 1,
              precio_unitario: Number(s.precio_unitario ?? s.precio) || 0,
              descuento: Number(s.descuento) || 0,
              total: Number(s.total) || 0,
            });
          });
        });
        return items;
      };

      const guardarDetallesUnoAUno = async (items) => {
        if (!items.length) return;
        // IMPORTANTE: tu tabla DetallesCotizacion NO tiene fase_id
        const results = await Promise.all(
          items.map((it) =>
            fetch("/api/cotizaciones/detalle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cotizacion_id: it.cotizacion_id,
                servicio_id: it.servicio_id,
                cantidad: it.cantidad,
                precio_unitario: it.precio_unitario,
                descuento: it.descuento,
                total: it.total,
              }),
            })
          )
        );
        const allOk = results.every((r) => r.ok);
        if (!allOk) {
          const fails = await Promise.all(
            results.map(async (r) => (r.ok ? null : await r.text()))
          );
          console.error("Fallas al guardar detalle:", fails);
          throw new Error("Alguno de los ítems del detalle no se guardó.");
        }
      };

      // ====== 5) FLUJO CON/SIN FASES ======
      if (Array.isArray(fases) && fases.length > 0) {
        // -------- CON FASES --------
        // 5.1 Crear fases + fase↔categoría
        const phaseIds = {};
        for (const fase of fases) {
          // Fase
          const respFase = await fetch("/api/fases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cotizacion_id: Number(currentId),
              numero_fase: Number(fase.numero_fase),
              duracion_meses: Number(fase.duracion) || 1,
              observaciones_fase: fase.observacion || null,
            }),
          });
          if (!respFase.ok) throw new Error(await respFase.text());
          const savedFase = await respFase.json();
          const faseId = Number(savedFase?.id);
          phaseIds[fase.numero_fase] = faseId;

          // FaseCategorias
          if (Array.isArray(fase.categorias) && fase.categorias.length) {
            const setCats = Array.from(
              new Set(fase.categorias.map(Number).filter(Boolean))
            );
            await Promise.all(
              setCats.map((categoria_id) =>
                fetch("/api/fases/categoria", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    fase_id: faseId,
                    categoria_id,
                  }),
                })
              )
            );
          }
        }

        // 5.2 Detalle (al final), desde fases
        // 5.2 Detalle (al final), desde fases
        const items = buildDetalleItemsFromFases(fases, currentId);
        window.COTIZACION_DETALLE_DEBUG = items; // debug
        await guardarDetalleBulk(currentId, items);
      } // -------- SIN FASES -------- // -------- SIN FASES --------
      else {
        // 5.1 Detalle primero (bulk ok)
        const items = buildDetalleItemsFromNoFases(estructuraCS, currentId);
        window.COTIZACION_DETALLE_DEBUG = items;
        await guardarDetalleBulk(currentId, items);

        // 5.2 Crear Fase "placeholder" con numero_fase ≠ 0
        const faseIdNF = await ensurePlaceholderFase(currentId);

        // 5.3 FaseCategorias: usar el id REAL de Fases (no el id de la cotización)
        const setCats = new Set();
        (estructuraCS.categorias || []).forEach((c) => {
          if (c?.categoria_id) setCats.add(Number(c.categoria_id));
        });
        const categoriasUnicas = Array.from(setCats);

        for (const categoria_id of categoriasUnicas) {
          const r = await fetch("/api/fases/categoria", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fase_id: faseIdNF,
              categoria_id,
            }),
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => "");
            throw new Error(
              `FaseCategorias fallo (fase_id=${faseIdNF}, cat=${categoria_id}): ${txt}`
            );
          }
        }
      }

      // ====== 6) UI — mostrar mensaje y luego ir a Historial ======
      // ====== 6) UI — mostrar mensaje y luego ir a Historial ======
      const goToHistory = () => {
        try {
          // Cerrar sólo backdrops de toasts/modales si quedaron abiertos.
          // (Nada de [data-overlay] o [data-backdrop] para no llevarnos partes del form)
          document
            .querySelectorAll(
              ".modal-backdrop, .toast-backdrop, .swal2-container"
            )
            .forEach((el) => {
              try {
                el.remove();
              } catch {}
            });
          document.querySelectorAll("dialog[open]").forEach((d) => {
            try {
              d.close();
            } catch {}
          });

          // Cambiar de pestaña a Historial sin tocar clases .hidden de tus paneles
          const hasHistoryTab =
            document.querySelector('[data-tab="history"]') ||
            document.getElementById("tab-history") ||
            document.querySelector('[href="#history"]');

          const tabKey = hasHistoryTab ? "history" : "historial";

          if (typeof switchTab === "function") {
            switchTab(tabKey, { reset: false }); // <- no dispares nuevaCotizacion() aquí
          } else {
            document
              .querySelector(
                `[data-tab="${tabKey}"], #tab-${tabKey}, [href="#${tabKey}"]`
              )
              ?.click();
          }

          // Recargar la tabla del historial si existe
          if (typeof cargarCotizaciones === "function") cargarCotizaciones();
        } catch (err) {
          console.error("[goToHistory] fallo:", err);
        }
      };

      try {
        if (typeof window.showToast === "function") {
          // No agregamos/quitamos clases al body; solo mostramos el toast
          window.showToast("Cotización guardada correctamente");
          setTimeout(goToHistory, 300);
          nuevaCotizacion();
        } else {
          alert("Cotización guardada correctamente");
          goToHistory();
          nuevaCotizacion();
        }
      } catch {
        goToHistory();
      }
    } catch (error) {
      console.error(error);
      alert("Error al guardar la cotización: " + error.message);
    }
  }

  function nuevaCotizacion() {
    currentQuoteId = null;
    isEditing = false;
    document.getElementById("quoteTitle").textContent = "Nueva Cotización";
    document.getElementById("cotizacionForm").reset();
    document.getElementById("nuevoPacienteForm").style.display = "none";
    document.getElementById("phases-container").innerHTML = "";
    currentFaseId = 0;

    switchTab("new");
  }

  function getBadgeClass(estado) {
    switch (String(estado || "").toLowerCase()) {
      case "generada":
        return "badge-primary";
      case "enviada":
        return "badge-success";
      case "aceptada":
        return "badge-primary";
      case "rechazada":
        return "badge-danger";
      case "borrador":
      default:
        return "badge-warning";
    }
  }

  function updateEstadoEnTabla(id, nuevoEstado) {
    const row = document.querySelector(
      `#cotizacionesList tr[data-cotizacion-id="${id}"]`
    );
    if (!row) return;
    const estadoCell = row.querySelector("td:nth-child(5)"); // tu tabla tiene Estado en la 5ª col
    if (!estadoCell) return;
    estadoCell.innerHTML = `<span class="badge ${getBadgeClass(
      nuevoEstado
    )}">${nuevoEstado}</span>`;
  }

  // Actualiza el estado de una cotización intentando un endpoint específico
  // y con fallback a un PATCH genérico si tu API no lo tiene.
  // /public/estado.js
  window.updateEstadoCotizacion = async function (id, nuevoEstado, opts = {}) {
    const { refreshRow = true, refreshTable = true } = opts;
    if (!id || !nuevoEstado) return;

    try {
      const r = await fetch(`/api/cotizaciones/${id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: String(nuevoEstado) }),
      });
      if (!r.ok)
        throw new Error(
          await r.text().catch(() => "No se pudo actualizar estado")
        );

      // ✅ Refresca la UI
      if (refreshRow) window.updateEstadoEnTabla?.(id, nuevoEstado);
      if (refreshTable) window.cargarCotizaciones?.();

      // Devuelve el nuevo estado por si quieres encadenar
      return { id, estado: nuevoEstado };
    } catch (err) {
      console.warn(`[updateEstadoCotizacion] error para id=${id}:`, err);
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
      <div class="categoria-info mt-2"></div>
    </div>
    <div class="col-md-8">
      <div class="form-group mb-2 d-flex align-items-center gap-2 flex-wrap servicios-categorias-container"></div>
    </div>
  `;

    // Llenar el select de categorías de forma asíncrona y SOLO insertar el row cuando esté listo
    const select = row.querySelector(".categoria-unica-select");
    (async () => {
      // Siempre recarga las categorías para evitar caché corrupto
      let categoriasData = [];
      try {
        const resp = await fetch("/api/categorias");
        categoriasData = await resp.json();
      } catch (e) {
        categoriasData = [];
      }
      // Si no hay categorías, muestra mensaje y no inserta el row
      if (!categoriasData || categoriasData.length === 0) {
        select.innerHTML =
          '<option value="">No hay categorías disponibles</option>';
        // Inserta el row igualmente para que el usuario vea el mensaje
        const btnAgregar = categoriasContainer.querySelector(
          "#agregarCategoriaBtn"
        );
        if (btnAgregar) {
          categoriasContainer.insertBefore(row, btnAgregar);
        } else {
          categoriasContainer.appendChild(row);
        }
        return;
      }
      // Actualiza la variable global si es necesario
      categorias = categoriasData;
      select.innerHTML = '<option value="">Seleccionar categoría...</option>';
      categorias.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nombre_categoria;
        select.appendChild(option);
      });
      // Inserta el row SOLO después de llenar el select
      const btnAgregar = categoriasContainer.querySelector(
        "#agregarCategoriaBtn"
      );
      if (btnAgregar) {
        categoriasContainer.insertBefore(row, btnAgregar);
      } else {
        categoriasContainer.appendChild(row);
      }
      // Selecciona automáticamente la primera categoría disponible
      if (categorias.length > 0) {
        select.value = categorias[0].id;
        select.dispatchEvent(new Event("change"));
      }
    })();
    // Evento de cambio de categoría (debe estar fuera del async para no duplicar listeners)
    select.addEventListener("change", async function () {
      const serviciosContainer = row.querySelector(
        ".servicios-categorias-container"
      );
      const categoriaInfoDiv = row.querySelector(".categoria-info");
      serviciosContainer.innerHTML = "";
      categoriaInfoDiv.innerHTML = "";
      if (this.value) {
        // Mostrar el nombre de la categoría
        const cat = categorias.find((c) => String(c.id) === String(this.value));
        if (cat) {
          categoriaInfoDiv.innerHTML = `<strong>Categoría:</strong> ${cat.nombre_categoria}`;
        }
        // Llamar al endpoint para obtener detalles de la categoría (si existe)
        try {
          const resp = await fetch(`/api/categorias/${this.value}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.descripcion) {
              categoriaInfoDiv.innerHTML += `<br><small>${data.descripcion}</small>`;
            }
          }
        } catch (err) {
          // Silencioso
        }
        agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
      }
    });
  }

  window.cargarCotizaciones = cargarCotizaciones;

  /*
  // /public/enviar.js (o el archivo donde ya tengas esta función)
  window.enviarDesdeFormulario = async function () {
    // 1) Construye/valida paciente como ya lo hacías:
    const pacienteId = document.getElementById("pacienteSelect")?.value;
    let paciente = (window.pacientes || []).find(
      (p) => String(p.id) === String(pacienteId)
    );

    const npForm = document.getElementById("nuevoPacienteForm");
    if (!paciente && npForm && npForm.style.display !== "none") {
      paciente = {
        nombre: document.getElementById("nombrePaciente")?.value,
        correo: document.getElementById("correoPaciente")?.value,
        telefono: document.getElementById("telefonoPaciente")?.value,
        direccion: document.getElementById("direccionPaciente")?.value,
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

    const ok = confirm(
      `¿Enviar cotización a ${paciente.correo}?\n\n` +
        `Paciente: ${paciente.nombre}\n` +
        `Total: ${
          document.getElementById("total-cotizacion")?.textContent || "-"
        }`
    );
    if (!ok) return;

    try {
      // Si no existe aún la cotización en BD, guárdala antes
      if (!window.currentQuoteId) {
        await window.guardarCotizacion?.(); // tu función existente
        return; // el guardado suele recargar/repintar; luego vuelves a intentar enviar
      }

      // Enviar en backend (este endpoint YA marca "enviada")
      const response = await fetch(
        `/api/cotizaciones/${window.currentQuoteId}/enviar`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Error al enviar");

      // Optimista: refresca celda y listado
      window.updateEstadoEnTabla?.(window.currentQuoteId, "enviada");
      window.cargarCotizaciones?.();

      alert(`Cotización enviada a ${paciente.correo}`);
    } catch (error) {
      console.error("Error al enviar:", error);
      alert(`Error: ${error.message}`);
    }
  };
  */

  //

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

      cotizaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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
      .map((cotizacion) => {
        const paciente = pacientes.find((p) => p.id === cotizacion.paciente_id);
        const nombrePaciente = paciente
          ? paciente.nombre
          : "Paciente no encontrado";

        return `
      <tr data-cotizacion-id="${cotizacion.id}">
        <td>${String(cotizacion.id).slice(-6)}</td>
        <td>${nombrePaciente}</td>
        <td>${new Date(cotizacion.fecha).toLocaleDateString()}</td>
        <td>$${
          cotizacion.total_con_descuento?.toLocaleString("es-CO", {
            minimumFractionDigits: 2,
          }) || "0.00"
        }</td>
        <td>
          <span class="badge ${getBadgeClass(cotizacion.estado)}">
            ${cotizacion.estado}
          </span>
        </td>
        <td>
          <div class="action-buttons.left">
            
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
          
          </div>
        </td>
      </tr>
    `;
      })
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
      servicios = (await response.json()).map((s) => ({
        ...s,
        id: Number(s.id),
        categoria_id: Number(s.categoria_id),
        precio_neto: Number(s.precio_neto),
      }));
    } catch (error) {
      console.error("Error al cargar servicios:", error);
    }
  }

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
          addNewPhase();
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
          addNewPhase();
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

  window.enviarCotizacion = async function (id) {
    if (!id) return;
    try {
      const resp = await fetch(`/api/cotizaciones/${id}`);
      if (!resp.ok)
        throw new Error(
          await resp.text().catch(() => "Cotización no encontrada")
        );
      const c = await resp.json();

      if (!c.correo_paciente) {
        alert(
          "El paciente de esta cotización no tiene correo en la base de datos."
        );
        return;
      }

      const total = Number(c.total_con_descuento ?? c.total ?? 0);
      const totalFmt = total.toLocaleString("es-CO", {
        minimumFractionDigits: 2,
      });

      const ok = confirm(
        `¿Enviar cotización a ${c.correo_paciente}?\n\n` +
          `Paciente: ${c.nombre_paciente || "(sin nombre)"}\n` +
          `Total: $${totalFmt}`
      );
      if (!ok) return;

      const res = await fetch(`/api/cotizaciones/${id}/enviar`, {
        method: "POST",
      });
      if (!res.ok)
        throw new Error(await res.text().catch(() => "Error al enviar"));

      window.updateEstadoEnTabla?.(id, "enviada");
      window.cargarCotizaciones?.();
      alert(`Cotización enviada a ${c.correo_paciente}`);
    } catch (e) {
      console.error("Error al enviar:", e);
      alert(`Error al enviar: ${e.message}`);
      window.cargarCotizaciones?.();
    }
  };

  // Fin Botones de accion final --- Cotizaciones / quote tab
});

// app.js o /public/historial.js (donde cargue en la vista del historial)
window.enviarCotizacion = async function (id) {
  if (!id) return;
  try {
    // UI optimista
    window.updateEstadoEnTabla?.(id, "enviada");

    const res = await fetch(`/api/cotizaciones/${id}/enviar`, {
      method: "POST",
    });
    if (!res.ok)
      throw new Error(await res.text().catch(() => "Error al enviar"));

    // Backend dejó estado = 'enviada'
    window.cargarCotizaciones?.();
    alert("Cotización enviada.");
  } catch (e) {
    console.error("Error al enviar:", e);
    alert("No se pudo enviar la cotización.");
    // Recupera la tabla para no dejar estado falso
    window.cargarCotizaciones?.();
  }
};

// === FUNCIONES DE CÁLCULO DE FASES ===

/* Duplicate calcularTotalesFase removed to fix syntax error. */

function calcularTotalesGenerales() {
  const fases = document.querySelectorAll(".phase-container:not(.hidden)");

  let subtotalGlobal = 0;
  let descuentoGlobal = 0;

  fases.forEach((fase) => {
    const subtotalEl = fase.querySelector(".fase-subtotal");
    const descuentoEl = fase.querySelector(".fase-descuento");

    // Eliminar $ y puntos de miles, cambiar coma decimal por punto
    const subtotal = subtotalEl
      ? parseFloat(
          subtotalEl.textContent
            .replace("$", "")
            .replace(/\./g, "")
            .replace(",", ".")
        ) || 0
      : 0;
    const descuento = descuentoEl
      ? parseFloat(
          descuentoEl.textContent
            .replace("$", "")
            .replace(/\./g, "")
            .replace(",", ".")
        ) || 0
      : 0;

    subtotalGlobal += subtotal;
    descuentoGlobal += descuento;
  });

  const totalGlobal = subtotalGlobal - descuentoGlobal;

  const subtotalEl = document.getElementById("subtotal-cotizacion");
  const descuentoEl = document.getElementById("descuento-cotizacion");
  const totalEl = document.getElementById("total-cotizacion");
  console.log("Descuento:", descuentoGlobal);
  if (subtotalEl)
    subtotalEl.textContent = `$${subtotalGlobal.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  if (descuentoEl)
    descuentoEl.textContent = `$${descuentoGlobal.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
  if (totalEl)
    totalEl.textContent = `$${totalGlobal.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
    })}`;
}
