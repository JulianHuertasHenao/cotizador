const sqlite3 = require("sqlite3").verbose();

// Crear y abrir la base de datos
const db = new sqlite3.Database("./cotizador.db", (err) => {
  if (err) {
    console.error("Error al abrir la base de datos: ", err.message);
  } else {
    console.log("Conexión a la base de datos SQLite establecida");
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de Pacientes
  db.run(`
    CREATE TABLE IF NOT EXISTS Pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT,
      telefono TEXT,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de Categorías
  db.run(`
    CREATE TABLE IF NOT EXISTS Categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_categoria TEXT NOT NULL,
      descripcion TEXT
    )
  `);

  // Tabla de Servicios
  db.run(`
    CREATE TABLE IF NOT EXISTS Servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      precio_neto REAL,
      categoria_id INTEGER,
      FOREIGN KEY(categoria_id) REFERENCES Categorias(id)
    )
  `);

  // Tabla de Cotizaciones
  db.run(`
    CREATE TABLE IF NOT EXISTS Cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total REAL,
      estado TEXT,
      descuento REAL,
      total_con_descuento REAL,
      FOREIGN KEY(paciente_id) REFERENCES Pacientes(id)
    )
  `);

  // Tabla de Fases
  db.run(`
    CREATE TABLE IF NOT EXISTS Fases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER,
      numero_fase INTEGER NOT NULL,  -- Fase 1, Fase 2, etc.
      duracion_meses INTEGER DEFAULT 1,
      FOREIGN KEY(cotizacion_id) REFERENCES Cotizaciones(id) ON DELETE CASCADE,
      UNIQUE(cotizacion_id, numero_fase)  -- Evita duplicar fases en una cotización
    )
  `);

  // Tabla intermedia FaseCategorias (relaciona fases con categorías)
  db.run(`
    CREATE TABLE IF NOT EXISTS FaseCategorias (
      fase_id INTEGER,
      categoria_id INTEGER,
      PRIMARY KEY(fase_id, categoria_id),
      FOREIGN KEY(fase_id) REFERENCES Fases(id) ON DELETE CASCADE,
      FOREIGN KEY(categoria_id) REFERENCES Categorias(id)
    )
  `);

  // Tabla de Detalles de Cotización
  db.run(`
    CREATE TABLE IF NOT EXISTS DetallesCotizacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER,
      fase_id INTEGER,  -- Relaciona el servicio con una fase específica de la cotización
      servicio_id INTEGER,  -- Relaciona el servicio con la tabla Servicios
      cantidad INTEGER DEFAULT 1,
      precio_unitario REAL,
      descuento REAL,             -- Descuento personalizado por servicio
      total REAL,
      FOREIGN KEY(cotizacion_id) REFERENCES Cotizaciones(id) ON DELETE CASCADE,
      FOREIGN KEY(fase_id) REFERENCES Fases(id) ON DELETE SET NULL,
      FOREIGN KEY(servicio_id) REFERENCES Servicios(id)
    )
  `);

  // Tabla de Plantillas
  db.run(`
    CREATE TABLE IF NOT EXISTS Plantillas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_plantilla TEXT,
      descripcion TEXT,
      servicios TEXT -- Aquí se pueden almacenar los servicios en formato JSON o como una lista de IDs
    )
  `);

  // Tabla de Historial de Cotizaciones
  db.run(`
    CREATE TABLE IF NOT EXISTS HistorialCotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estado TEXT,
      total REAL,
      FOREIGN KEY(cotizacion_id) REFERENCES Cotizaciones(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    ALTER TABLE Fases ADD COLUMN duracion_meses INTEGER DEFAULT 1;
    ALTER TABLE Cotizaciones ADD COLUMN observaciones TEXT;
  `);
});

module.exports = db; // Exportar para usarlo en otros archivos
