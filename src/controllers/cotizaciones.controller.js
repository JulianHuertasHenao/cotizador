const db = require("../utils/db");

// Obtener todas las cotizaciones
const getCotizaciones = (req, res) => {
    db.all(
        "SELECT * FROM Cotizaciones ORDER BY fecha DESC",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
};

// Obtener una cotización por su ID
const getCotizacionById = (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM Cotizaciones WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row);
    });
};

// Crear una nueva cotización
const createCotizacion = (req, res) => {
    const { paciente_id, total, estado, descuento, total_con_descuento } =
        req.body;

    db.run(
        "INSERT INTO Cotizaciones (paciente_id, total, estado, descuento, total_con_descuento) VALUES (?, ?, ?, ?, ?)",
        [paciente_id, total, estado, descuento, total_con_descuento],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
};

// Actualizar una cotización existente
const updateCotizacion = (req, res) => {
    const { id } = req.params;
    const { paciente_id, total, estado, descuento, total_con_descuento } =
        req.body;

    db.run(
        "UPDATE Cotizaciones SET paciente_id = ?, total = ?, estado = ?, descuento = ?, total_con_descuento = ? WHERE id = ?",
        [paciente_id, total, estado, descuento, total_con_descuento, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(200).json({ message: "Cotización actualizada" });
        }
    );
};

// Eliminar una cotización
const deleteCotizacion = (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM Cotizaciones WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: "Cotización eliminada" });
    });
};

// Crear un nuevo paciente
const createPaciente = (req, res) => {
    const { nombre, correo, telefono, direccion } = req.body;

    db.run(
        "INSERT INTO Pacientes (nombre, correo, telefono, direccion) VALUES (?, ?, ?, ?)",
        [nombre, correo, telefono, direccion],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
};

module.exports = {
    getCotizaciones,
    getCotizacionById,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion,
    createPaciente,
};
