// Script para eliminar la columna 'direccion' de la tabla Pacientes en SQLite
// Ejecuta este script UNA SOLA VEZ con: node migrate_remove_direccion.js

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./cotizador.db");

db.serialize(() => {
    db.run("PRAGMA foreign_keys=off;");

    db.run(`
    CREATE TABLE IF NOT EXISTS Pacientes_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT,
      telefono TEXT,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.run(`
    INSERT INTO Pacientes_temp (id, nombre, correo, telefono, fecha_registro)
    SELECT id, nombre, correo, telefono, fecha_registro FROM Pacientes;
  `);

    db.run("DROP TABLE Pacientes;");
    db.run("ALTER TABLE Pacientes_temp RENAME TO Pacientes;");
    db.run("PRAGMA foreign_keys=on;");

    console.log("Columna direccion eliminada de la tabla Pacientes.");
});

db.close();
