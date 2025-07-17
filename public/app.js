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

document.addEventListener("DOMContentLoaded", function () {
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

    // Sub Tab switching
    categoriesTab.addEventListener("click", function () {
      setActiveSubTab("categories");
    });

    servicesTab.addEventListener("click", function () {
      setActiveSubTab("services");
    });
    categoriesTab.classList.add("active");
    categoriesSection.classList.add("active");

    categoriesTab.addEventListener("click", function () {
      categoriesTab.classList.add("active");
      servicesTab.classList.remove("active");
      categoriesSection.classList.add("active");
      servicesSection.classList.remove("active");
    });

    servicesTab.addEventListener("click", function () {
      servicesTab.classList.add("active");
      categoriesTab.classList.remove("active");
      servicesSection.classList.add("active");
      categoriesSection.classList.remove("active");
    });

    // Set active sub tab
    function setActiveSubTab(tab) {
      // Remove active class from all sub tabs
      categoriesTab.classList.remove("sub-tab-active");
      servicesTab.classList.remove("sub-tab-active");

      // Hide all sub sections
      categoriesSection.classList.add("hidden");
      servicesSection.classList.add("hidden");

      // Set active tab and show corresponding section
      if (tab === "categories") {
        categoriesTab.classList.add("sub-tab-active");
        categoriesSection.classList.remove("hidden");
      } else if (tab === "services") {
        servicesTab.classList.add("sub-tab-active");
        servicesSection.classList.remove("hidden");
      }
    }

    // Add new category
    addCategoryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("categoryName").value.trim();
      const description = document
        .getElementById("categoryDescription")
        .value.trim();

      if (name && description) {
        const newCategory = {
          id: nextCategoryId++,
          nombre_categoria: name,
          descripcion: description,
        };

        categorias.push(newCategory);
        lastAddedCategory = name;
        renderCategoryTable();
        updateCategoryStats();
        populateCategoryDropdowns();
        showToast(`Categoría "${name}" añadida exitosamente`);

        // Clear form
        addCategoryForm.reset();

        // Actualizar selects en el formulario de cotización
        inicializarPrimeraCategoria();
      }
    });

    // Add new service
    addServiceForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const code = document.getElementById("serviceCode").value.trim();
      const description = document
        .getElementById("serviceDescription")
        .value.trim();
      const price = parseFloat(document.getElementById("servicePrice").value);
      const categoryId = parseInt(
        document.getElementById("serviceCategory").value
      );

      if (code && description && !isNaN(price) && !isNaN(categoryId)) {
        const newService = {
          id: nextServiceId++,
          codigo: code,
          descripcion: description,
          precio_neto: price,
          categoria_id: categoryId,
        };

        servicios.push(newService);
        lastAddedService = description;
        renderServiceTable();
        updateServiceStats();
        showToast(`Servicio "${description}" añadido exitosamente`);

        // Clear form
        addServiceForm.reset();

        // Actualizar selects en el formulario de cotización
        inicializarPrimeraCategoria();
      }
    });

    // Delete confirmation
    document
      .getElementById("confirmDelete")
      .addEventListener("click", function () {
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
          } else if (deleteType === "service") {
            const index = servicios.findIndex((srv) => srv.id === deleteId);
            if (index !== -1) {
              const deletedName = servicios[index].descripcion;
              servicios.splice(index, 1);
              renderServiceTable();
              updateServiceStats();
              showToast(`Servicio "${deletedName}" eliminado exitosamente`);

              // Actualizar selects en el formulario de cotización
              inicializarPrimeraCategoria();
            }
          }
          closeDeleteModal();
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

          if (editingServiceId === service.id) {
            // Render editable row
            row.classList.add("table-row-editing");

            // Create category options HTML
            let categoryOptionsHtml = "";
            categorias.forEach((cat) => {
              const selected =
                cat.id === service.categoria_id ? "selected" : "";
              categoryOptionsHtml += `<option value="${
                cat.id
              }" ${selected}>${escapeHtml(cat.nombre_categoria)}</option>`;
            });

            row.innerHTML = `
              <td class="py-3 px-4 text-dark">${service.id}</td>
              <td class="py-2 px-4">
                <input type="text" class="input" id="edit-service-code-${
                  service.id
                }" value="${escapeHtml(service.codigo)}">
              </td>
              <td class="py-2 px-4">
                <input type="text" class="input" id="edit-service-description-${
                  service.id
                }" value="${escapeHtml(service.descripcion)}">
              </td>
              <td class="py-2 px-4">
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              </div>
                  <input type="number" class="input pl-5" id="edit-service-price-${
                    service.id
                  }" value="${service.precio_neto}" min="0" step="0.01">
                </div>
              </td>
              <td class="py-2 px-4">
                <select class="input" id="edit-service-category-${service.id}">
                  ${categoryOptionsHtml}
                </select>
              </td>
              <td class="py-2 px-4">
                <div class="edit-controls flex justify-center">
                  <button class="btn btn-sm btn-success save-service-btn" data-id="${
                    service.id
                  }">
                    <i class="fas fa-check"></i>
                  </button>
                  <button class="btn btn-sm btn-gray cancel-edit-service-btn" data-id="${
                    service.id
                  }">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </td>
            `;
          } else {
            // Render normal row
            row.innerHTML = `
              <td class="py-3 px-4 text-dark">${service.id}</td>
              <td class="py-3 px-4 font-medium text-dark">${escapeHtml(
                service.codigo
              )}</td>
              <td class="py-3 px-4 text-dark">${escapeHtml(
                service.descripcion
              )}</td>
              <td class="py-3 px-4 text-dark">$${service.precio_neto.toFixed(
                2
              )}</td>
              <td class="py-3 px-4 text-dark">${escapeHtml(categoryName)}</td>
              <td class="py-2 px-4">
                <div class="flex justify-center space-x-2">
                  <button class="btn btn-sm btn-primary edit-service-btn" data-id="${
                    service.id
                  }">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-service-btn" data-id="${
                    service.id
                  }">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            `;
          }

          serviceTableBody.appendChild(row);
        });

        // Add event listeners
        setupServiceTableEventListeners();
      }
    }

    function setupCategoryTableEventListeners() {
      // Add event listeners for edit mode
      document.querySelectorAll(".edit-category-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          startEditingCategory(id);
        });
      });

      // Add event listeners for save
      document.querySelectorAll(".save-category-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          saveCategory(id);
        });
      });

      // Add event listeners for cancel edit
      document.querySelectorAll(".cancel-edit-category-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          cancelEditCategory(id);
        });
      });

      // Add event listeners for delete
      document.querySelectorAll(".delete-category-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          openDeleteModal(id, "category");
        });
      });
    }

    function setupServiceTableEventListeners() {
      // Add event listeners for edit mode
      document.querySelectorAll(".edit-service-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          startEditingService(id);
        });
      });

      // Add event listeners for save
      document.querySelectorAll(".save-service-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          saveService(id);
        });
      });

      // Add event listeners for cancel edit
      document.querySelectorAll(".cancel-edit-service-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          cancelEditService(id);
        });
      });

      // Add event listeners for delete
      document.querySelectorAll(".delete-service-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("data-id"));
          openDeleteModal(id, "service");
        });
      });
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
      const nameInput = document.getElementById(`edit-category-name-${id}`);
      const descriptionInput = document.getElementById(
        `edit-category-description-${id}`
      );

      if (nameInput && descriptionInput) {
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        if (name && description) {
          const index = categorias.findIndex((cat) => cat.id === id);
          if (index !== -1) {
            categorias[index].nombre_categoria = name;
            categorias[index].descripcion = description;
            lastUpdatedCategory = name;

            editingCategoryId = null;
            renderCategoryTable();
            renderServiceTable(); // Update service table to reflect category name changes
            updateCategoryStats();
            populateCategoryDropdowns();
            showToast(`Categoría "${name}" actualizada exitosamente`);

            // Actualizar selects en el formulario de cotización
            inicializarPrimeraCategoria();
          }
        }
      }
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
        }
      } else if (type === "service") {
        const service = servicios.find((srv) => srv.id === id);
        if (service) {
          deleteMessage.textContent = `¿Estás seguro de que quieres eliminar el servicio "${service.descripcion}"? Esta acción no se puede deshacer.`;
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
          agregarServicioEnCategoriasDinamico(serviciosContainer, this.value);
        }
      });

      // Handler para botón "Añadir Servicio" de la fila estática
      const addServiceBtn = document.querySelector(
        "#no-phase-categories .add-service-btn"
      );

      if (addServiceBtn) {
        addServiceBtn.addEventListener("click", function (e) {
          e.preventDefault();
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
        (s) => String(s.categoria_id) === String(categoriaId)
      );

      serviciosCategoria.forEach((servicio) => {
        const option = document.createElement("option");
        option.value = servicio.id;
        option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
        option.dataset.precio = servicio.precio_neto;
        servicioSelect.appendChild(option);
      });

      servicioSelect.addEventListener("change", () => {
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
        agregarServicioEnCategoriasDinamico(serviciosContainer, categoriaId);
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
  addListener("agregarFaseBtn", "click", addNewPhase());
  addListener("confirmacionFases", "click", togglePhases);
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
  const firstSvc = document.querySelector("#no-phase-categories .service-list");
  if (firstSvc) {
    addNewService(firstSvc);
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
  let phasesGrid = document.getElementById("phases-grid") || createPhasesGrid();

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

  phaseContainer.querySelector(".phase-number-badge").textContent = phaseCount;
  phaseContainer.querySelector(".phase-number-text").textContent = phaseCount;

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
  category

    .querySelector(".remove-category-btn")

    .addEventListener("click", function () {
      const container = category.parentNode;

      const categories = container.querySelectorAll(".category-group");

      if (categories.length > 1) {
        if (confirm("¿Eliminar esta categoría y todos sus servicios?")) {
          category.remove();
        }
      } else {
        alert("Cada tratamiento debe tener al menos una categoría.");
      }
    });

  category

    .querySelector(".add-service-btn")

    .addEventListener("click", function () {
      addNewService(category.querySelector(".service-list"));
    });

  // Set up category change handler to update subcategories

  const categorySelect =
    category.querySelector(".categoria-fase-select") ||
    category.querySelector(".categoria-unica-select");

  if (categorySelect) {
    categorySelect.addEventListener("change", function () {
      updateSubcategoryOptions(this);
    });
  }
}
// Add a new service to a service list
function addNewService(serviceList) {
  const template = document.getElementById("service-template");

  const newService = template.content.cloneNode(true);

  // Set up remove button

  newService

    .querySelector(".remove-servicio")

    .addEventListener("click", function () {
      const services = serviceList.querySelectorAll(".service-list");

      if (services.length > 1) {
        this.closest(".service-list").remove();
      } else {
        alert("Cada categoría debe tener al menos un servicio.");
      }
    });

  // Llenar servicios SOLO de la categoría seleccionada (para la fila estática)
  const categorySelect = serviceList
    .closest(".category-group")
    ?.querySelector(".categoria-fase-select, .categoria-unica-select");
  const servicioSelect = newService.querySelector(".servicio-select");
  if (categorySelect && servicioSelect) {
    servicioSelect.innerHTML =
      '<option value="">Seleccionar servicio...</option>';
    if (categorySelect.value) {
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
    }
    // Cuando cambie la categoría, actualizar el select de servicios
    if (!categorySelect._listenerServicios) {
      categorySelect.addEventListener("change", function () {
        servicioSelect.innerHTML =
          '<option value="">Seleccionar servicio...</option>';
        if (this.value) {
          const serviciosCategoria = servicios.filter(
            (s) => String(s.categoria_id) === String(this.value)
          );
          serviciosCategoria.forEach((servicio) => {
            const option = document.createElement("option");
            option.value = servicio.id;
            option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
            option.setAttribute("data-precio", servicio.precio_neto);
            servicioSelect.appendChild(option);
          });
        }
      });
      categorySelect._listenerServicios = true;
    }
  }

  serviceList.appendChild(newService);

  // Focus on the description field for quick entry

  setTimeout(() => {
    newService.querySelector(".service-description")?.focus();
  }, 10);
}
// Update subcategory options when category changes
function updateSubcategoryOptions(categorySelect, subcategorySelect = null) {
  const selectedCategory = categorySelect.value;

  const targetSelect =
    subcategorySelect ||
    categorySelect.closest(".service-list")?.querySelector(".servicio-select");

  if (!targetSelect) return;

  // Clear existing options except the first

  targetSelect.innerHTML = '<option value="">Seleccionar servicio...</option>';

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
  if (document.querySelectorAll(".phase-container:not(.hidden)").length === 0) {
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
    tab.classList.toggle("active", tab.getAttribute("data-tab") === menuFocus);
  });

  // Cargar datos si es necesario
  if (!skipLoad) {
    if (view === "history") cargarCotizaciones();
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
// Fin De pacientes

// Inicio --- Cotizaciones / quote tab ---

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
