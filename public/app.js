function configurarBotonEliminar(servicioItem) {
    const removeBtn = servicioItem.querySelector(".remove-servicio");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            const serviceList = servicioItem.parentNode;
            const allServices = serviceList.querySelectorAll(".service-item");
            if (allServices.length > 1) {
                servicioItem.remove();
                actualizarTotalCategorias();
                const faseContainer = servicioItem.closest(".phase-container");
                if (faseContainer) calcularTotalesFase(faseContainer);
            } else {
                alert("Cada categoría debe tener al menos un servicio.");
            }
        });
    }
}

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
        let cantidad = parseInt(cantidadInput?.value || 1);
        let descuento = parseFloat(descuentoInput?.value || 0);

        if (isNaN(precio)) precio = 0;
        if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
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
// --- Función para enviar cotización al endpoint POST /api/cotizar ---
/*
async function enviarCotizacionAPI() {
    try {
        // Obtener id del paciente seleccionado
        const pacienteId = document.getElementById(
            "pacienteSearchInput"
        )?.value;
        if (!pacienteId) {
            alert("Debe seleccionar un paciente");
            return;
        }

        // Obtener precio total y descuento
        const totalEl = document.getElementById("total-cotizacion");
        const descuentoEl = document.getElementById("descuento-cotizacion");
        let total = 0;
        let descuento = 0;
        if (totalEl) {
            total =
                parseFloat(
                    totalEl.textContent
                        .replace("$", "")
                        .replace(/\./g, "")
                        .replace(",", ".")
                ) || 0;
        }
        if (descuentoEl) {
            // Puede venir en formato "$123,45" o "12,34%"
            let descText = descuentoEl.textContent
                .replace("$", "")
                .replace("%", "")
                .trim();
            descuento =
                parseFloat(descText.replace(/\./g, "").replace(",", ".")) || 0;
        }

        // Tomar solo el valor del campo con id 'observaciones' y meterlo en array si tiene valor
        let observaciones = [];
        const obs = document.getElementById("observaciones");
        if (obs && obs.value && obs.value.trim() !== "") {
            observaciones.push(obs.value.trim());
        }

        // Construir el body para el endpoint
        const body = {
            paciente_id: pacienteId,
            total: total,
            descuento: descuento,
            observaciones: observaciones,
        };

        // Llamar al endpoint POST /api/cotizar
        const response = await fetch("/api/cotizar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Error al cotizar: " + errorText);
        }

        const result = await response.json();
        alert(
            "Cotización enviada correctamente. ID: " + (result.id || "(sin id)")
        );
        return result;
    } catch (error) {
        alert(error.message);
    }
}
// Variable global para el total de la cotización
*/
function actualizarTotalCategorias() {
    let subtotal = 0;
    let totalDescuentos = 0;
    let total = 0;
    precioCotizacion = 0;

    document.querySelectorAll(".service-item").forEach((item) => {
        const precio =
            parseFloat(
                item.querySelector(".precio-unitario-servicio")?.value || 0
            ) || 0;
        const cantidad =
            parseInt(item.querySelector(".cantidad-servicio")?.value || 1) || 1;
        const descuento =
            parseFloat(item.querySelector(".descuento-servicio")?.value || 0) ||
            0;

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
            // Autollenar descripción y precio al seleccionar servicio
            const selectedId = servicioSelect.value;
            const servicio = servicios.find(
                (s) => String(s.id) === String(selectedId)
            );
            const descInput = servicioItem.querySelector(
                ".service-description"
            );
            const precioInput = servicioItem.querySelector(
                ".precio-unitario-servicio"
            );
            const subtitleInput =
                servicioItem.querySelector(".service-subtitle");

            if (servicio) {
                if (descInput) descInput.value = servicio.descripcion;
                if (precioInput) precioInput.value = servicio.precio_neto;
                if (subtitleInput) subtitleInput.value = servicio.subtitulo;
                servicioItem._servicioSeleccionadoAnterior = servicio.id;
            } else {
                if (descInput) descInput.value = "";
                if (precioInput) precioInput.value = "";
                if (subtitleInput) subtitleInput.value = "";
                servicioItem._servicioSeleccionadoAnterior = null;
            }

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
            agregarServicioEnCategoriasDinamico(
                serviciosContainer,
                categoriaId
            );
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
        const precioInput = servicioItem.querySelector(
            ".precio-unitario-servicio"
        );
        const cantidadInput = servicioItem.querySelector(".cantidad-servicio");
        const descuentoInput = servicioItem.querySelector(
            ".descuento-servicio"
        );

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

    let precio = parseFloat(precioUnitarioInput?.value || 0);
    let cantidad = parseInt(cantidadInput?.value || 1);
    let descuento = parseFloat(descuentoInput?.value || 0);

    if (isNaN(precio)) precio = 0;
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
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
    const subtitleInput = document.getElementById(
        `edit-service-subtitle-${id}`
    );
    const priceInput = document.getElementById(`edit-service-price-${id}`);
    const categoryInput = document.getElementById(
        `edit-service-category-${id}`
    );
    if (!codeInput || !descriptionInput || !priceInput || !categoryInput) {
        alert("Faltan campos para actualizar el servicio");
        return;
    }
    const codigo = codeInput.value.trim();
    const descripcion = descriptionInput.value.trim();
    const subtitulo = subtitleInput.value.trim();
    const precio_neto = parseFloat(priceInput.value);
    const categoria_id = parseInt(categoryInput.value);
    if (
        !codigo ||
        !descripcion ||
        !subtitulo ||
        isNaN(precio_neto) ||
        isNaN(categoria_id)
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
            }),
        });
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        const actualizado = await response.json();
        // Actualizar en la lista local
        const idx = servicios.findIndex((srv) => srv.id === id);
        if (idx !== -1) {
            servicios[idx] = actualizado;
        }
        updateServiceStats && updateServiceStats();
        if (typeof renderServiceTable === "function") renderServiceTable();
        showToast && showToast("Servicio actualizado correctamente");
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
        alert("ID de servicio no válido");
        return;
    }
    try {
        const response = await fetch(`/api/servicios/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        // Eliminar de la lista local
        servicios = servicios.filter((srv) => srv.id !== id);
        updateServiceStats && updateServiceStats();
        if (typeof renderServiceTable === "function") renderServiceTable();
        showToast && showToast("Servicio eliminado correctamente");
    } catch (error) {
        alert("Error al eliminar servicio: " + error.message);
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
    const filter = input.value.toLowerCase(); // Obtener el valor de búsqueda en minúsculas
    const serviceTable = document.getElementById("serviceTable");
    const serviceRows = serviceTable.getElementsByTagName("tr"); // Obtener todas las filas de la tabla

    // Recorrer todas las filas de la tabla de servicios
    for (let i = 1; i < serviceRows.length; i++) {
        const cells = serviceRows[i].getElementsByTagName("td");
        const descriptionCell = cells[2]; // La celda de "Descripción"

        // Si la descripción del servicio contiene el texto de búsqueda, mostrar la fila
        if (descriptionCell) {
            const textValue =
                descriptionCell.textContent || descriptionCell.innerText;
            if (textValue.toLowerCase().indexOf(filter) > -1) {
                serviceRows[i].style.display = ""; // Mostrar fila
            } else {
                serviceRows[i].style.display = "none"; // Ocultar fila
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
let lastAddedCategory = "";
let lastUpdatedCategory = "-";
let lastAddedService = "";
let editingCategoryId = null;
let editingServiceId = null;

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
                lastAddedCategory =
                    categorias[categorias.length - 1].nombre_categoria;
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
        const categoryEmptyState =
            document.getElementById("categoryEmptyState");
        const addCategoryForm = document.getElementById("addCategoryForm");
        const totalCategoriesEl = document.getElementById("totalCategories");
        const lastAddedCategoryEl =
            document.getElementById("lastAddedCategory");
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
            const subtitle = document
                .getElementById("serviceSubtitle")
                .value.trim();
            const price = parseFloat(
                document.getElementById("servicePrice").value
            );
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
                        const index = categorias.findIndex(
                            (cat) => cat.id === deleteId
                        );
                        if (index !== -1) {
                            const deletedName =
                                categorias[index].nombre_categoria;

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
                            showToast(
                                `Categoría "${deletedName}" eliminada exitosamente`
                            );

                            // Actualizar selects en el formulario de cotización
                            inicializarPrimeraCategoria();
                        }
                        closeDeleteModal();
                    } else if (deleteType === "service") {
                        await borrarServicio(deleteId);
                        inicializarPrimeraCategoria &&
                            inicializarPrimeraCategoria();
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
                    row.className =
                        "border-t hover:bg-light-gray transition-colors";

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
                    row.className =
                        "border-t hover:bg-light-gray transition-colors";

                    // Find category name
                    const category = categorias.find(
                        (cat) => cat.id === service.categoria_id
                    );
                    const categoryName = category
                        ? category.nombre_categoria
                        : "Desconocido";

                    // Siempre renderizar todos los botones, pero solo habilitar guardar/cancelar en modo edición
                    const isEditing = editingServiceId === service.id;
                    // Create category options HTML
                    let categoryOptionsHtml = "";
                    categorias.forEach((cat) => {
                        const selected =
                            cat.id === service.categoria_id ? "selected" : "";
                        categoryOptionsHtml += `<option value="${
                            cat.id
                        }" ${selected}>${escapeHtml(
                            cat.nombre_categoria
                        )}</option>`;
                    });

                    row.innerHTML = `
              <td class="py-3 px-4 text-dark">${service.id}</td>
              <td class="py-2 px-4">
                ${
                    isEditing
                        ? `<input type="text" class="input" id="edit-service-code-${
                              service.id
                          }" value="${escapeHtml(service.codigo)}">`
                        : `<span class="font-medium text-dark">${escapeHtml(
                              service.codigo
                          )}</span>`
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
                          : `<span class="text-dark">$${service.precio_neto.toFixed(
                                2
                            )}</span>`
                  }
                </div>
              </td>
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
</td>

            `;

                    serviceTableBody.appendChild(row);
                });

                // Add event listeners
                setupServiceTableEventListeners();
            }
        }

        // Función para filtrar la tabla de Categorías
        // Filtrar la tabla de Categorías

        function setupCategoryTableEventListeners() {
            // Add event listeners for edit mode
            // Delegación de eventos para evitar perder listeners tras renderizado
            const categoryTableBody =
                document.getElementById("categoryTableBody");
            if (categoryTableBody) {
                categoryTableBody.addEventListener("click", function (e) {
                    const btn = e.target.closest(".edit-category-btn");
                    if (btn) {
                        const id = parseInt(btn.getAttribute("data-id"));
                        console.log(`Editing category with ID: ${id}`);
                        startEditingCategory(id);
                    }
                });
            }

            // Add event listeners for save
            if (categoryTableBody) {
                // Delegación de eventos para los botones de guardar categoría
                categoryTableBody.addEventListener("click", function (e) {
                    const saveBtn = e.target.closest(".save-category-btn");
                    if (saveBtn) {
                        const id = parseInt(saveBtn.getAttribute("data-id"));
                        //console.log("clic en guardar con ID:", id); // ✅ para confirmar en consola
                        saveCategory(id);
                    }
                });
            }

            // Add event listeners for cancel edit
            document
                .querySelectorAll(".cancel-edit-category-btn")
                .forEach((btn) => {
                    btn.addEventListener("click", function () {
                        const id = parseInt(this.getAttribute("data-id"));
                        cancelEditCategory(id);
                    });
                });

            // Add event listeners for delete
            // Delegación de eventos para los botones de eliminar categoría
            if (categoryTableBody) {
                categoryTableBody.addEventListener("click", function (e) {
                    const btn = e.target.closest(".delete-category-btn");
                    if (btn) {
                        const id = parseInt(btn.getAttribute("data-id"));
                        openDeleteModal(id, "category");
                        //console.log(`Deleting category with ID: ${id}`);
                    }
                });
            }
        }

        function setupServiceTableEventListeners() {
            // Delegación de eventos para los botones de servicios
            const serviceTableBody =
                document.getElementById("serviceTableBody");
            if (serviceTableBody) {
                // Editar servicio
                serviceTableBody.addEventListener("click", function (e) {
                    const btn = e.target.closest(".edit-service-btn");
                    if (btn) {
                        const id = parseInt(btn.getAttribute("data-id"));
                        console.log(`Editing service with ID: ${id}`);
                        startEditingService(id);
                        // Habilitar los botones de confirmar y cancelar edición para este servicio
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
                    }
                });

                // Guardar servicio
                serviceTableBody.addEventListener("click", function (e) {
                    const saveBtn = e.target.closest(".save-service-btn");
                    if (saveBtn) {
                        const id = parseInt(saveBtn.getAttribute("data-id"));
                        console.log(`Saving service with ID: ${id}`);
                        actualizarServicio(id);
                    }
                });

                // Cancelar edición de servicio
                serviceTableBody.addEventListener("click", function (e) {
                    const cancelBtn = e.target.closest(
                        ".cancel-edit-service-btn"
                    );
                    if (cancelBtn) {
                        const id = parseInt(cancelBtn.getAttribute("data-id"));
                        console.log(`Cancel editing service with ID: ${id}`);
                        cancelEditService(id);
                    }
                });

                // Eliminar servicio
                serviceTableBody.addEventListener("click", function (e) {
                    const deleteBtn = e.target.closest(".delete-service-btn");
                    if (deleteBtn) {
                        const id = parseInt(deleteBtn.getAttribute("data-id"));
                        console.log(`Deleting service with ID: ${id}`);
                        openDeleteModal(id, "service");
                    }
                });
            }
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
                const nameInput = document.getElementById(
                    `edit-category-name-${id}`
                );
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
                const codeInput = document.getElementById(
                    `edit-service-code-${id}`
                );
                if (codeInput) codeInput.focus();
            }, 100);
        }

        // Save service changes
        function saveService(id) {
            const codeInput = document.getElementById(
                `edit-service-code-${id}`
            );
            const descriptionInput = document.getElementById(
                `edit-service-description-${id}`
            );
            const priceInput = document.getElementById(
                `edit-service-price-${id}`
            );
            const categoryInput = document.getElementById(
                `edit-service-category-${id}`
            );

            if (codeInput && descriptionInput && priceInput && categoryInput) {
                const code = codeInput.value.trim();
                const description = descriptionInput.value.trim();
                const price = parseFloat(priceInput.value);
                const categoryId = parseInt(categoryInput.value);

                if (
                    code &&
                    description &&
                    !isNaN(price) &&
                    !isNaN(categoryId)
                ) {
                    const index = servicios.findIndex((srv) => srv.id === id);
                    if (index !== -1) {
                        servicios[index].codigo = code;
                        servicios[index].descripcion = description;
                        servicios[index].precio_neto = price;
                        servicios[index].categoria_id = categoryId;

                        editingServiceId = null;
                        renderServiceTable();
                        updateServiceStats();
                        showToast(
                            `Servicio "${description}" actualizado exitosamente`
                        );

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
                    const confirmDeleteBtn =
                        document.getElementById("confirmDelete");
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
    }

    function inicializarPrimeraCategoria() {
        // Inicializa la fila estática de categoría y sus eventos
        const categoriaSelect = document.getElementById("categoriaUnicaSelect");
        const serviciosContainer = document.querySelector(
            "#no-phase-categories .servicios-categorias-container"
        );

        if (categoriaSelect) {
            categoriaSelect.innerHTML =
                '<option value="">Seleccionar categoría...</option>';

            // Llenar opciones de categorías con el formato mejorado
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

            // Handler para cambio de categoría
            categoriaSelect.addEventListener("change", function () {
                if (serviciosContainer) serviciosContainer.innerHTML = "";
                if (this.value && serviciosContainer) {
                    agregarServicioEnCategoriasDinamico(
                        serviciosContainer,
                        this.value
                    );
                }
            });

            // Handler para botón "Añadir Servicio" de la fila estática
            const addServiceBtn = document.querySelector(
                "#no-phase-categories .add-service-btn"
            );

            if (addServiceBtn) {
                addServiceBtn.addEventListener("click", function (e) {
                    //e.preventDefault();
                    if (categoriaSelect.value && serviciosContainer) {
                        agregarServicioEnCategoriasDinamico(
                            serviciosContainer,
                            categoriaSelect.value
                        );
                    }
                });
            }

            // Selecciona automáticamente la primera categoría si existe
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
        const categoriasContainer = document.getElementById(
            "categoriasContainer"
        );
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
        addListener(
            "agregarCategoriaBtn",
            "click",
            agregarCategoriaDeTratamiento
        );

        const cotizacionForm = document.getElementById("cotizacionForm");
        if (cotizacionForm) {
            cotizacionForm.addEventListener("submit", (e) => {
                //e.preventDefault();
                guardarCotizacion();
            });
        }

        addListener("generatePdfBtn", "click", generarPDFDesdeFormulario);
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

        // — 5) Inicializar la “primera categoría” en modo no-fase
        const firstCat = document.querySelector(
            "#no-phase-categories .category-group"
        );
        if (firstCat) {
            setupCategoryEvents(firstCat);
        }
        const firstSvc = document.querySelector(
            "#no-phase-categories .service-list"
        );
        if (firstSvc) {
            addNewService(firstSvc);
        }

        // — 6) Botón “Reset”
        const resetBtn = document.getElementById("reset-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                if (
                    confirm(
                        "¿Está seguro de que desea reiniciar el formulario?"
                    )
                ) {
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

        const noPhaseCategories = document.getElementById(
            "no-phase-categories"
        );

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
            .insertBefore(
                grid,
                document.getElementById("add-phase-btn").parentNode
            );
        return grid;
    }

    function setupPhase(phaseContainer, phasesGrid) {
        const phaseCount =
            phasesGrid.querySelectorAll(".phase-container:not(.hidden)")
                .length + 1;

        phaseContainer.querySelector(".phase-number-badge").textContent =
            phaseCount;
        phaseContainer.querySelector(".phase-number-text").textContent =
            phaseCount;

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
        const newCategory = phase
            .querySelector(".category-group")
            .cloneNode(true);

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
                const categories =
                    container.querySelectorAll(".category-group");
                if (categories.length > 1) {
                    if (
                        confirm(
                            "¿Eliminar esta categoría y todos sus servicios?"
                        )
                    ) {
                        category.remove();
                        actualizarTotalCategorias();
                    }
                } else {
                    alert(
                        "Cada tratamiento debe tener al menos una categoría."
                    );
                }
            });
        }

        // Botón añadir servicio
        const addServiceBtn = category.querySelector(".add-service-btn");
        if (addServiceBtn) {
            addServiceBtn.addEventListener("click", function () {
                const serviceList = category.querySelector(".service-list");
                addNewService(serviceList);
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

            // Evento: actualizar servicios al cambiar de categoría
            categorySelect.addEventListener("change", function () {
                const serviciosContainer =
                    category.querySelector(".service-list");
                if (serviciosContainer) {
                    serviciosContainer.innerHTML = "";
                    if (this.value) {
                        agregarServicioEnCategoriasDinamico(
                            serviciosContainer,
                            this.value
                        );
                    }
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
        const template = document.getElementById("service-template");
        const newService = template.content.cloneNode(true);
        const servicioItem = newService.querySelector(".service-item");

        configurarBotonEliminar(servicioItem);
        // Set up botón de eliminar servicio
        const removeBtn = servicioItem.querySelector(".remove-servicio");
        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                const allServices =
                    serviceList.querySelectorAll(".service-item");
                if (allServices.length > 1) {
                    servicioItem.remove();
                    actualizarTotalCategorias();
                } else {
                    alert("Cada categoría debe tener al menos un servicio.");
                }
            });
        }

        // Obtener categoría seleccionada
        const categorySelect = serviceList
            .closest(".category-group")
            ?.querySelector(".categoria-fase-select, .categoria-unica-select");
        const servicioSelect = servicioItem.querySelector(".servicio-select");

        // Llenar opciones de servicio
        if (categorySelect && servicioSelect) {
            servicioSelect.innerHTML =
                '<option value="">Seleccionar servicio...</option>';
            const serviciosCategoria = servicios.filter(
                (s) => String(s.categoria_id) === String(categorySelect.value)
            );

            serviciosCategoria.forEach((servicio) => {
                const option = document.createElement("option");
                option.value = servicio.id;
                option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
                option.setAttribute("data-precio", servicio.precio_neto);
                servicioSelect.appendChild(option);
            });

            // Evento: al seleccionar un servicio, llenar descripción y precio
            servicioSelect.addEventListener("change", () => {
                const selectedId = servicioSelect.value;
                const servicio = servicios.find(
                    (s) => String(s.id) === String(selectedId)
                );

                const descInput = servicioItem.querySelector(
                    ".service-description"
                );
                const precioInput = servicioItem.querySelector(
                    ".precio-unitario-servicio"
                );
                const subtitleInput =
                    servicioItem.querySelector(".service-subtitle");

                if (servicio) {
                    if (descInput) descInput.value = servicio.descripcion;
                    if (precioInput) precioInput.value = servicio.precio_neto;
                    if (subtitleInput)
                        subtitleInput.value = servicio.subtitulo || "";
                }

                actualizarPrecioServicio(servicioItem);
                actualizarTotalCategorias();
            });

            // Evento: si cambia la categoría, actualizar el select de servicios
            if (!categorySelect._listenerServicios) {
                categorySelect.addEventListener("change", function () {
                    servicioSelect.innerHTML =
                        '<option value="">Seleccionar servicio...</option>';
                    const serviciosCategoria = servicios.filter(
                        (s) => String(s.categoria_id) === String(this.value)
                    );
                    serviciosCategoria.forEach((servicio) => {
                        const option = document.createElement("option");
                        option.value = servicio.id;
                        option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
                        option.setAttribute(
                            "data-precio",
                            servicio.precio_neto
                        );
                        servicioSelect.appendChild(option);
                    });
                });
                categorySelect._listenerServicios = true;
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

        // Botón para duplicar servicio
        const agregarBtn = servicioItem.querySelector(".agregar-servicio");
        if (agregarBtn) {
            agregarBtn.addEventListener("click", () => {
                addNewService(serviceList);
            });
        }

        // Insertar servicio y aplicar valores por defecto
        serviceList.appendChild(servicioItem);
        setTimeout(() => {
            if (cantidadInput) cantidadInput.value = "1";
            if (descuentoInput) descuentoInput.value = "0";

            actualizarPrecioServicio(servicioItem);
            actualizarTotalCategorias();
        }, 10);
    }

    // Update subcategory options when category changes
    function updateSubcategoryOptions(
        categorySelect,
        subcategorySelect = null
    ) {
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
        const phases = document.querySelectorAll(
            ".phase-container:not(.hidden)"
        );
        phases.forEach((phase, index) => {
            const num = index + 1;
            phase.querySelector(".phase-number-badge").textContent = num;
            phase.querySelector(".phase-number-text").textContent = num;
        });
    }

    function checkEmptyPhases() {
        if (
            document.querySelectorAll(".phase-container:not(.hidden)")
                .length === 0
        ) {
            document
                .getElementById("no-phases-message")
                .classList.remove("hidden");
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
        const menuFocus =
            view === "edit" || view === "duplicate" ? "new" : view;
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
                    (p.nombre &&
                        p.nombre.toLowerCase().includes(filtroLower)) ||
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
            input.value = `${paciente.nombre} - ${
                paciente.correo || "Sin correo"
            }`;
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
            document.getElementById("nuevoPacienteForm").style.display =
                "block";

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
        const lastAddedCategoryEl =
            document.getElementById("lastAddedCategory");
        const lastUpdatedCategoryEl = document.getElementById(
            "lastUpdatedCategory"
        );
        if (totalCategoriesEl)
            totalCategoriesEl.textContent = categorias.length;
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

            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");

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
                if (typeof renderCategoryTable === "function")
                    renderCategoryTable();
                if (typeof renderServiceTable === "function")
                    renderServiceTable();
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

    /*
    async function guardarCategoria(name, descripcion) {
        if (!name) {
            alert("El nombre de la categoría es obligatorio");
            return;
        }
        try {
            const response = await fetch("/api/categorias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    descripcion: descripcion || null,
                }),
            });
            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");
            const nuevaCategoria = await response.json();
            categorias.push(nuevaCategoria);
            lastAddedCategory = nuevaCategoria.nombre_categoria;
            updateCategoryStats();
            showToast(
                `Categoría "${nuevaCategoria.nombre_categoria}" guardada correctamente`
            );
            // Renderizar tabla y dropdowns para reflejar el cambio
            if (typeof renderCategoryTable === "function")
                renderCategoryTable();
            if (typeof renderServiceTable === "function") renderServiceTable();
            if (typeof populateCategoryDropdowns === "function")
                populateCategoryDropdowns();
        } catch (error) {
            alert("Error al guardar categoría: " + error.message);
        }
    }
*/
    async function guardarCategoria(nombre, descripcion) {
        try {
            const response = await fetch("/api/categorias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre_categoria: nombre.trim(),
                    descripcion: descripcion.trim(),
                }),
            });

            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");

            const nuevaCategoria = await response.json();

            // Añadir a la lista local
            categorias.push(nuevaCategoria);
            lastAddedCategory = nuevaCategoria.nombre_categoria;

            // 🔹 Refrescar tabla y estadísticas
            renderCategoryTable();
            updateCategoryStats();
            populateCategoryDropdowns(); // actualizar selects de categoría
            inicializarPrimeraCategoria(); // si aplica al formulario de cotización

            showToast(
                `Categoría "${nuevaCategoria.nombre_categoria}" añadida correctamente`
            );

            // Resetear formulario
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
            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");
            categorias = categorias.filter((cat) => cat.id !== id);
            updateCategoryStats();
            showToast(`Categoría eliminada correctamente`);
        } catch (error) {
            alert("Error al eliminar categoría: " + error.message);
        }
    }
    /*
    async function guardarServicio(
        categoriaId,
        codigo,
        descripcion,
        subtitulo,
        precioNeto
    ) {
        if (
            !categoriaId ||
            !codigo ||
            !descripcion ||
            !precioNeto ||
            !subtitulo
        ) {
            alert("Todos los campos son obligatorios");
            return;
        }
        try {
            const response = await fetch(`/api/servicios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    codigo: codigo,
                    descripcion: descripcion,
                    subtitulo: subtitulo,
                    precio_neto: precioNeto,
                    categoria_id: categoriaId,
                }),
            });
            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");
            const nuevoServicio = await response.json();
            servicios.push(nuevoServicio);
            lastAddedService =
                nuevoServicio.nombre_servicio ||
                nuevoServicio.descripcion ||
                nuevoServicio.codigo ||
                nuevoServicio.subtitulo;
            updateServiceStats();
            showToast(
                `Servicio "${
                    nuevoServicio.nombre_servicio ||
                    nuevoServicio.descripcion ||
                    nuevoServicio.codigo ||
                    nuevoServicio.subtitulo
                }" guardado correctamente`
            );
            // Renderizar tabla y dropdowns para reflejar el cambio
            if (typeof renderServiceTable === "function") renderServiceTable();
            if (typeof populateServiceDropdowns === "function")
                populateServiceDropdowns();
        } catch (error) {
            alert("Error al guardar servicio: " + error.message);
        }
    }
*/
    async function guardarServicio(
        categoriaId,
        codigo,
        descripcion,
        subtitulo,
        precio
    ) {
        try {
            const response = await fetch("/api/servicios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoria_id: parseInt(categoriaId),
                    codigo: codigo.trim(),
                    descripcion: descripcion.trim(),
                    subtitulo: subtitulo.trim(),
                    precio_neto: parseFloat(precio) || 0, // 🔹 siempre número
                }),
            });

            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");

            const nuevoServicio = await response.json();

            // 🔹 Asegurar que precio_neto sea número
            nuevoServicio.precio_neto =
                parseFloat(nuevoServicio.precio_neto) || 0;

            // Añadir a la lista local
            servicios.push(nuevoServicio);
            lastAddedService = nuevoServicio.descripcion;

            // Refrescar tabla y estadísticas sin recargar página
            renderServiceTable();
            updateServiceStats();
            showToast(
                `Servicio "${nuevoServicio.descripcion}" añadido correctamente`
            );

            // Resetear formulario
            document.getElementById("addServiceForm").reset();
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

            if (!response.ok)
                throw new Error("Error en la respuesta del servidor");

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
    // ⬇️ Reemplaza por completo tu función guardarCotizacion con esta versión
    /*
    async function guardarCotizacion() {
        //e.preventDefault();
        alert("Inicio: guardarCotizacion()");

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
                console.log("[Paciente] POST /api/pacientes", nuevoPaciente);
                const response = await fetch("/api/pacientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoPaciente),
                });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                pacienteId = result.id;

                // Inserta/actualiza hidden
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

                alert(`Paciente OK. ID=${pacienteId}`);
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
        const parsePercent = (txt) =>
            parseFloat(
                (txt || "")
                    .replace("%", "")
                    .replace(/\./g, "")
                    .replace(",", ".")
            ) || 0;

        const total = parseMoney(
            document.getElementById("total-cotizacion")?.textContent
        );
        const descuento = parsePercent(
            document.getElementById("descuento-cotizacion")?.textContent
        );
        const subtotal = parseMoney(
            document.getElementById("subtotal-cotizacion")?.textContent
        );
        const totalConDescuento = subtotal - (subtotal * descuento) / 100;

        const cotizacionSimplificada = {
            paciente_id: pacienteId,
            total: subtotal,
            estado: "borrador",
            descuento: descuento,
            total_con_descuento: totalConDescuento,
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

                // Observaciones: unir múltiples en una sola cadena
                const obsUnicas = Array.from(
                    new Set(
                        Array.from(
                            faseEl.querySelectorAll(".observaciones-fases")
                        )
                            .map((i) => (i.value || "").trim())
                            .filter((v) => v.length > 0)
                    )
                );
                const observacion = obsUnicas.join(", ");

                const categoriasSet = new Set();
                const servicios = [];

                faseEl.querySelectorAll(".service-item").forEach((item) => {
                    const servicioId =
                        item.querySelector(".servicio-select")?.value;
                    if (!servicioId) return;

                    const cantidad =
                        parseInt(
                            item.querySelector(".cantidad-servicio")?.value
                        ) || 1;
                    const precio =
                        parseFloat(
                            item.querySelector(".precio-unitario-servicio")
                                ?.value
                        ) || 0;
                    const desc =
                        parseFloat(
                            item.querySelector(".descuento-servicio")?.value
                        ) || 0;

                    const sub = precio * cantidad;
                    const total = sub - (sub * desc) / 100;

                    const catSelect = item
                        .closest(".category-group")
                        ?.querySelector(".categoria-fase-select");
                    const categoriaId = catSelect?.value;
                    if (
                        categoriaId != null &&
                        categoriaId !== "" &&
                        !Number.isNaN(Number(categoriaId))
                    ) {
                        categoriasSet.add(Number(categoriaId));
                    }

                    servicios.push({
                        servicio_id: Number(servicioId) || servicioId,
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

        // Debug antes de enviar
        alert(`Fases detectadas: ${fases.length}`);
        fases.forEach((f) =>
            alert(
                `Fase ${f.numero_fase} | dur=${
                    f.duracion
                } | cats=[${f.categorias.join(", ")}] | obs="${f.observacion}"`
            )
        );

        // ====== 4) GUARDAR COTIZACIÓN ======
        try {
            const url =
                typeof currentQuoteId !== "undefined" && currentQuoteId
                    ? `/api/cotizaciones/${currentQuoteId}`
                    : "/api/cotizaciones";
            const method =
                typeof currentQuoteId !== "undefined" && currentQuoteId
                    ? "PUT"
                    : "POST";

            console.log(
                "[Cotización] %s %s",
                method,
                url,
                cotizacionSimplificada
            );
            alert("Guardando cotización…");

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionSimplificada),
            });
            if (!response.ok) throw new Error(await response.text());

            const result = await response.json();
            if (typeof currentQuoteId !== "undefined")
                currentQuoteId = result.id || currentQuoteId;

            alert(
                `Cotización guardada. ID=${
                    result.id || currentQuoteId || "(no retornado)"
                }`
            );
        } catch (err) {
            console.error("[Cotización] Error:", err);
            alert("Error al guardar cotización");
            return;
        }

        // ====== 5) GUARDAR FASES (todas) + FASE↔CATEGORÍAS ======
        const faseOps = fases.map(async (fase) => {
            try {
                console.log(
                    `[Fase] POST /api/fases | fase=${fase.numero_fase}`,
                    fase
                );
                const respFase = await fetch("/api/fases", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cotizacion_id: currentQuoteId,
                        numero_fase: fase.numero_fase,
                        duracion_meses: fase.duracion,
                        observaciones_fase: fase.observacion,
                    }),
                });

                if (!respFase.ok) {
                    const t = await respFase.text();
                    throw new Error(`Fase ${fase.numero_fase} falló: ${t}`);
                }

                const savedFase = await respFase.json();
                const faseId = savedFase?.id;
                console.log(
                    `[Fase] OK fase ${fase.numero_fase} => id=${faseId}`
                );
                alert(
                    `Fase ${fase.numero_fase} guardada (id=${faseId ?? "?"})`
                );

                // Guardar FaseCategorias (una por cada categoría detectada)
                if (
                    Array.isArray(fase.categorias) &&
                    fase.categorias.length > 0
                ) {
                    const catOps = fase.categorias.map(async (categoriaId) => {
                        console.log(
                            `[FaseCategorias] POST /api/fases/categoria | fase_id=${faseId}, categoria_id=${categoriaId}`
                        );
                        const r = await fetch("/api/fases/categoria", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                fase_id: faseId,
                                categoria_id: categoriaId,
                            }),
                        });

                        const txt = await r.text();
                        if (!r.ok) {
                            throw new Error(
                                `fase=${faseId} cat=${categoriaId} => ${txt}`
                            );
                        }
                        console.log("[FaseCategorias] OK =>", txt);
                        return txt;
                    });

                    const catResults = await Promise.allSettled(catOps);
                    const erroresCat = catResults.filter(
                        (x) => x.status === "rejected"
                    );
                    if (erroresCat.length) {
                        console.warn(
                            `[FaseCategorias] Errores en fase ${fase.numero_fase}:`,
                            erroresCat
                        );
                        alert(
                            `⚠️ Errores asociando categorías en fase ${fase.numero_fase}. Ver consola.`
                        );
                    } else {
                        alert(
                            `Categorías asociadas en fase ${
                                fase.numero_fase
                            }: ${fase.categorias.join(", ")}`
                        );
                    }
                } else {
                    console.log(
                        `[FaseCategorias] Fase ${fase.numero_fase} sin categorías`
                    );
                }

                return { ok: true, fase: fase.numero_fase, id: faseId };
            } catch (e) {
                console.error(`[Fase] Error fase ${fase.numero_fase}:`, e);
                alert(
                    `❌ Error guardando fase ${fase.numero_fase}. Revisa consola.`
                );
                return { ok: false, fase: fase.numero_fase, error: e?.message };
            }
        });

        // Esperar a que terminen TODAS las fases (y sus categorías)
        const resultadosFases = await Promise.allSettled(faseOps);
        console.log("[Fases] Resultados:", resultadosFases);

        const fallos = resultadosFases.filter(
            (r) => r.status === "fulfilled" && r.value && r.value.ok === false
        );
        const rechazadas = resultadosFases.filter(
            (r) => r.status === "rejected"
        );

        if (fallos.length || rechazadas.length) {
            alert(
                "Proceso finalizado con errores en algunas fases. Revisa consola para detalles."
            );
        } else {
            alert("Proceso finalizado. Todas las fases procesadas.");
        }

        // ====== 6) UI (después de TODO)
        if (typeof switchTab === "function") switchTab("history");
        if (typeof cargarCotizaciones === "function") cargarCotizaciones();
    }
    */

    async function guardarCotizacion() {
        alert(
            "Inicio: guardarCotizacion() — se guardan fases y luego fase↔categoría"
        );

        // ===== 1) PACIENTE =====
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
                console.log("[Paciente] POST /api/pacientes", nuevoPaciente);
                const response = await fetch("/api/pacientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoPaciente),
                });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                pacienteId = result.id;

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

                alert(`Paciente OK. ID=${pacienteId}`);
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

        // ===== 2) TOTALES =====
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
        const descuento = parseMoney(
            document.getElementById("descuento-cotizacion")?.textContent
        ); // ⬅️ dinero
        const total_con_descuento = subtotal - descuento;

        const cotizacionSimplificada = {
            paciente_id: pacienteId,
            total: subtotal, // subtotal bruto
            estado: "borrador",
            descuento: descuento, // en dinero
            total_con_descuento: total_con_descuento,
        };

        // ===== 3) FASES (recolección) =====
        const fases = [];
        document
            .querySelectorAll("#phases-container .phase-container")
            .forEach((faseEl, index) => {
                const duracionInput = faseEl.querySelector(".phase-duration");
                const duracion = duracionInput
                    ? parseInt(duracionInput.value || "1")
                    : 1;

                // Observaciones: unir múltiples en una sola cadena
                const obsUnicas = Array.from(
                    new Set(
                        Array.from(
                            faseEl.querySelectorAll(".observaciones-fases")
                        )
                            .map((i) => (i.value || "").trim())
                            .filter((v) => v.length > 0)
                    )
                );
                const observacion = obsUnicas.join(", ");

                const categoriasSet = new Set();
                const servicios = [];

                faseEl.querySelectorAll(".service-item").forEach((item) => {
                    const servicioId =
                        item.querySelector(".servicio-select")?.value;
                    if (!servicioId) return;

                    const cantidad =
                        parseInt(
                            item.querySelector(".cantidad-servicio")?.value
                        ) || 1;
                    const precio =
                        parseFloat(
                            item.querySelector(".precio-unitario-servicio")
                                ?.value
                        ) || 0;
                    const desc =
                        parseFloat(
                            item.querySelector(".descuento-servicio")?.value
                        ) || 0;

                    const sub = precio * cantidad;
                    const total = sub - (sub * desc) / 100;

                    const catSelect = item
                        .closest(".category-group")
                        ?.querySelector(".categoria-fase-select");
                    const categoriaId = catSelect?.value;
                    if (
                        categoriaId != null &&
                        categoriaId !== "" &&
                        !Number.isNaN(Number(categoriaId))
                    ) {
                        categoriasSet.add(Number(categoriaId));
                    }

                    servicios.push({
                        servicio_id: Number(servicioId) || servicioId,
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

        // Preview categorías antes de enviar
        alert(`Fases detectadas: ${fases.length}`);
        fases.forEach((f) =>
            alert(
                `Fase ${f.numero_fase} | cats=[${f.categorias.join(
                    ", "
                )}] | obs="${f.observacion}"`
            )
        );

        // ===== 4) GUARDAR COTIZACIÓN =====
        try {
            const url =
                typeof currentQuoteId !== "undefined" && currentQuoteId
                    ? `/api/cotizaciones/${currentQuoteId}`
                    : "/api/cotizaciones";
            const method =
                typeof currentQuoteId !== "undefined" && currentQuoteId
                    ? "PUT"
                    : "POST";

            console.log(
                "[Cotización] %s %s",
                method,
                url,
                cotizacionSimplificada
            );
            alert("Guardando cotización…");

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionSimplificada),
            });
            if (!response.ok) throw new Error(await response.text());

            const result = await response.json();
            if (typeof currentQuoteId !== "undefined")
                currentQuoteId = result.id || currentQuoteId;
            alert(
                `Cotización guardada. ID=${
                    result.id || currentQuoteId || "(no retornado)"
                }`
            );
        } catch (err) {
            console.error("[Cotización] Error:", err);
            alert("Error al guardar cotización");
            return;
        }

        // ===== 5) GUARDAR TODAS LAS FASES (1er PASO) =====
        // Guardamos primero todas las fases y almacenamos sus IDs
        const mapaFaseId = new Map(); // numero_fase -> id devuelto por backend

        for (const fase of fases) {
            try {
                console.log(
                    `[Fase] POST /api/fases | fase=${fase.numero_fase}`,
                    fase
                );
                alert(`Guardando FASE ${fase.numero_fase}…`);
                const respFase = await fetch("/api/fases", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cotizacion_id: currentQuoteId,
                        numero_fase: fase.numero_fase,
                        duracion_meses: fase.duracion,
                        observaciones_fase: fase.observacion,
                    }),
                });

                const txt = await respFase.text();
                if (!respFase.ok)
                    throw new Error(`Fase ${fase.numero_fase} falló: ${txt}`);
                let savedFase;
                try {
                    savedFase = JSON.parse(txt);
                } catch {
                    savedFase = {};
                }

                const faseId = savedFase?.id;
                mapaFaseId.set(fase.numero_fase, faseId);
                console.log(
                    `[Fase] OK fase ${fase.numero_fase} => id=${faseId}`,
                    savedFase
                );
                alert(
                    `Fase ${fase.numero_fase} guardada (id=${faseId ?? "?"})`
                );
            } catch (e) {
                console.error(`[Fase] Error fase ${fase.numero_fase}:`, e);
                alert(
                    `❌ Error guardando fase ${fase.numero_fase}. Se omitirán sus categorías.`
                );
            }
        }

        // ===== 6) GUARDAR FASE↔CATEGORÍAS (2do PASO, DESPUÉS de fases) =====
        // Ahora recorremos de nuevo y asociamos categorías usando el ID real de cada fase
        for (const fase of fases) {
            const faseId = mapaFaseId.get(fase.numero_fase);
            if (!faseId) {
                console.warn(
                    `[FaseCategorias] Fase ${fase.numero_fase} sin ID. Saltando sus categorías.`
                );
                continue;
            }

            if (
                !Array.isArray(fase.categorias) ||
                fase.categorias.length === 0
            ) {
                console.log(
                    `[FaseCategorias] Fase ${fase.numero_fase} sin categorías.`
                );
                continue;
            }

            alert(
                `Asociando categorías de la FASE ${fase.numero_fase} (fase_id=${faseId})…`
            );

            for (const categoriaId of fase.categorias) {
                try {
                    console.log(
                        `[FaseCategorias] POST /api/fases/categoria | fase_id=${faseId}, categoria_id=${categoriaId}`
                    );
                    const r = await fetch("/api/fases/categoria", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            fase_id: faseId,
                            categoria_id: categoriaId,
                        }),
                    });

                    const bodyTxt = await r.text();
                    if (!r.ok) throw new Error(bodyTxt);
                    console.log("[FaseCategorias] OK =>", bodyTxt);
                    alert(`OK: fase=${faseId} ↔ categoría=${categoriaId}`);
                } catch (e) {
                    console.error(
                        `[FaseCategorias] Error fase=${faseId} cat=${categoriaId}:`,
                        e
                    );
                    alert(
                        `❌ Error asociando (fase=${faseId}, cat=${categoriaId}). Ver consola.`
                    );
                }
            }
        }

        // ===== 7) UI final =====
        alert("Proceso finalizado. Fases y categorías procesadas.");
        if (typeof switchTab === "function") switchTab("history");
        if (typeof cargarCotizaciones === "function") cargarCotizaciones();
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
        const categoriasContainer = document.getElementById(
            "categoriasContainer"
        );
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
            select.innerHTML =
                '<option value="">Seleccionar categoría...</option>';
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
                const cat = categorias.find(
                    (c) => String(c.id) === String(this.value)
                );
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
                agregarServicioEnCategoriasDinamico(
                    serviciosContainer,
                    this.value
                );
            }
        });
    }

    // Inicio Botones de accion final --- Cotizaciones / quote tab ---
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
            document.getElementById("nuevoPacienteForm").style.display !==
                "none"
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
                descuento:
                    faseCard.querySelector(".fase-descuento").textContent,
                total: faseCard.querySelector(".fase-total-amount").textContent,
                servicios: [],
            };

            faseCard
                .querySelectorAll(".servicio-item")
                .forEach((servicioItem) => {
                    const servicioSelect =
                        servicioItem.querySelector(".servicio-select");
                    if (servicioSelect.value) {
                        const servicio = servicios.find(
                            (s) => s.id == servicioSelect.value
                        );
                        fase.servicios.push({
                            nombre: servicio.descripcion,
                            cantidad:
                                servicioItem.querySelector(".cantidad").value,
                            precio: servicioItem.querySelector(
                                ".precio-unitario"
                            ).value,
                            descuento:
                                servicioItem.querySelector(".descuento").value +
                                "%",
                            total: servicioItem.querySelector(".total-servicio")
                                .value,
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
            document.getElementById("nuevoPacienteForm").style.display !==
                "none"
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
                `Total: ${
                    document.getElementById("total-cotizacion").textContent
                }`
        );

        if (confirmacion) {
            try {
                // Primero guardamos la cotización si no está guardada
                if (!currentQuoteId) {
                    await guardarCotizacion();
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

    //

    // calculo de totales

    function calcularTotalesGenerales() {
        try {
            let subtotal = 0;
            let descuentoTotal = 0;

            const fases = document.querySelectorAll(".fase-card");
            if (!fases || fases.length === 0) return;

            fases.forEach((faseCard) => {
                try {
                    const subtotalEl = faseCard.querySelector(".fase-subtotal");
                    const descuentoEl =
                        faseCard.querySelector(".fase-descuento");

                    const faseSubtotal = subtotalEl
                        ? parseFloat(subtotalEl.textContent.replace("$", "")) ||
                          0
                        : 0;
                    const faseDescuento = descuentoEl
                        ? parseFloat(
                              descuentoEl.textContent.replace("$", "")
                          ) || 0
                        : 0;

                    subtotal += faseSubtotal;
                    descuentoTotal += faseDescuento;
                } catch (error) {
                    console.error("Error calculando fase:", error);
                }
            });

            const total = subtotal - descuentoTotal;

            // Actualizar totales generales con verificaciones
            const subtotalGeneralEl = document.getElementById(
                "subtotal-cotizacion"
            );
            const descuentoGeneralEl = document.getElementById(
                "descuento-cotizacion"
            );
            const totalGeneralEl = document.getElementById("total-cotizacion");

            if (subtotalGeneralEl)
                subtotalGeneralEl.textContent = `$${subtotal.toFixed(2)}`;
            if (descuentoGeneralEl)
                descuentoGeneralEl.textContent = `$${descuentoTotal.toFixed(
                    2
                )}`;
            if (totalGeneralEl)
                totalGeneralEl.textContent = `$${total.toFixed(2)}`;
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
                cotizacionesList.innerHTML =
                    "<p>No hay cotizaciones guardadas aún</p>";
                return;
            }

            cotizaciones.sort(
                (a, b) =>
                    new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
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
        .map((cotizacion) => {
            const paciente = pacientes.find(
                (p) => p.id === cotizacion.paciente_id
            );
            const nombrePaciente = paciente
                ? paciente.nombre
                : "Paciente no encontrado";

            return `
      <tr>
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
          <div class="action-buttons">
            
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
            servicios = await response.json();
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
            document.getElementById("pacienteSelect").value =
                cotizacion.paciente_id;

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
                                    servicioItem.querySelector(
                                        ".categoria-select"
                                    );
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
                                    servicioSelect.value =
                                        servicioData.servicio_id;

                                    // Disparar evento change para cargar precio
                                    const servicioEvent = new Event("change");
                                    servicioSelect.dispatchEvent(servicioEvent);

                                    // Establecer cantidad y descuento
                                    servicioItem.querySelector(
                                        ".cantidad"
                                    ).value = servicioData.cantidad;
                                    servicioItem.querySelector(
                                        ".descuento"
                                    ).value = servicioData.descuento;

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
            document.getElementById("quoteTitle").textContent =
                "Editar Cotización";
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
            document.getElementById("pacienteSelect").value =
                original.paciente_id;

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
                                    servicioItem.querySelector(
                                        ".categoria-select"
                                    );
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
                                    servicioSelect.value =
                                        servicioData.servicio_id;

                                    // Disparar evento change para cargar precio
                                    const servicioEvent = new Event("change");
                                    servicioSelect.dispatchEvent(servicioEvent);

                                    // Establecer cantidad y descuento
                                    servicioItem.querySelector(
                                        ".cantidad"
                                    ).value = servicioData.cantidad;
                                    servicioItem.querySelector(
                                        ".descuento"
                                    ).value = servicioData.descuento;

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
    // Fin Botones de accion final --- Cotizaciones / quote tab
});

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
