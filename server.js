// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const { generarPDF } = require("./src/services/pdf.service");
const db = require("./src/utils/db"); // Importamos la base de datos

// Configuración básica
app.use(cors());
app.use(express.json());
app.post("/api/prueba", (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Interfaz web
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/categorias", (req, res) => {
    const query = `SELECT id, nombre_categoria, descripcion FROM Categorias ORDER BY id`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener categorías:", err.message);
            return res
                .status(500)
                .json({ error: "Error interno al obtener categorías" });
        }
        res.json(rows);
    });
});

app.get("/api/servicios", (req, res) => {
    const { categoria_id } = req.query;

    let query = `
        SELECT 
            id, 
            codigo, 
            descripcion, 
            precio_neto,
            categoria_id
        FROM Servicios
    `;

    const params = [];

    if (categoria_id) {
        query += ` WHERE categoria_id = ?`;
        params.push(categoria_id);
    }

    query += ` ORDER BY codigo, descripcion`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Error al obtener servicios:", err.message);
            return res
                .status(500)
                .json({ error: "Error interno al obtener servicios" });
        }

        // Formatear respuesta para incluir todos los datos necesarios
        const serviciosFormateados = rows.map((servicio) => ({
            id: servicio.id,
            codigo: servicio.codigo,
            descripcion: servicio.descripcion,
            precio_neto: servicio.precio_neto,
            categoria_id: servicio.categoria_id,
        }));

        res.json(serviciosFormateados);
    });
});

// GET /api/servicios/search?q=blanqueamiento
app.get("/api/servicios/search", (req, res) => {
    const { q } = req.query;
    if (!q)
        return res
            .status(400)
            .json({ error: "Debe incluir un término de búsqueda" });

    const query = `
    SELECT id, descripcion AS nombre, precio_neto
    FROM Servicios
    WHERE descripcion LIKE ?
    ORDER BY descripcion
  `;
    const param = `%${q}%`;

    db.all(query, [param], (err, rows) => {
        if (err) {
            console.error("Error al buscar servicios:", err.message);
            return res
                .status(500)
                .json({ error: "Error interno al buscar servicios" });
        }
        res.json(rows);
    });
});

// Ruta para obtener todos los pacientes
app.get("/api/pacientes", (req, res) => {
    db.all("SELECT * FROM Pacientes", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Devuelve los pacientes
    });
});

// Ruta para crear un nuevo paciente
app.post("/api/pacientes", (req, res) => {
    const { nombre, correo, telefono, direccion } = req.body;
    db.run(
        "INSERT INTO Pacientes (nombre, correo, telefono, direccion) VALUES (?, ?, ?, ?)",
        [nombre, correo, telefono, direccion],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
                id: this.lastID,
                nombre,
                correo,
                telefono,
                direccion,
            });
        }
    );
});

// Ruta para obtener todas las cotizaciones
app.get("/api/cotizaciones", (req, res) => {
    db.all("SELECT * FROM Cotizaciones", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Ruta para crear una nueva cotización
app.post("/api/cotizaciones", (req, res) => {
    const { paciente_id, total, estado, descuento, total_con_descuento } =
        req.body;
    db.run(
        "INSERT INTO Cotizaciones (paciente_id, total, estado, descuento, total_con_descuento) VALUES (?, ?, ?, ?, ?)",
        [paciente_id, total, estado, descuento, total_con_descuento],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
                id: this.lastID,
                paciente_id,
                total,
                estado,
                descuento,
                total_con_descuento,
            });
        }
    );
});

// Ruta para actualizar una cotización
app.put("/api/cotizaciones/:id", (req, res) => {
    const { id } = req.params;
    const { paciente_id, total, estado, descuento, total_con_descuento } =
        req.body;

    // Actualizar la cotización en la base de datos
    db.run(
        "UPDATE Cotizaciones SET paciente_id = ?, total = ?, estado = ?, descuento = ?, total_con_descuento = ? WHERE id = ?",
        [paciente_id, total, estado, descuento, total_con_descuento, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Cotización actualizada correctamente" });
        }
    );
});

// Ruta para duplicar una cotización
app.post("/api/cotizaciones/duplicar/:id", (req, res) => {
    const { id } = req.params;

    // Obtener la cotización original
    db.get(
        "SELECT * FROM Cotizaciones WHERE id = ?",
        [id],
        (err, cotizacion) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!cotizacion) {
                return res
                    .status(404)
                    .json({ error: "Cotización no encontrada" });
            }

            // Crear nueva cotización con los mismos datos
            db.run(
                "INSERT INTO Cotizaciones (paciente_id, total, estado, descuento, total_con_descuento) VALUES (?, ?, ?, ?, ?)",
                [
                    cotizacion.paciente_id,
                    cotizacion.total,
                    "borrador", // Estado inicial
                    cotizacion.descuento,
                    cotizacion.total_con_descuento,
                ],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    const nuevaCotizacionId = this.lastID;

                    // Copiar los detalles de la cotización original (procedimientos, fases, etc.)
                    db.all(
                        "SELECT * FROM DetallesCotizacion WHERE cotizacion_id = ?",
                        [id],
                        (err, detalles) => {
                            if (err) {
                                return res
                                    .status(500)
                                    .json({ error: err.message });
                            }

                            detalles.forEach((detalle) => {
                                db.run(
                                    "INSERT INTO DetallesCotizacion (cotizacion_id, servicio_id, precio_unitario, cantidad, descuento) VALUES (?, ?, ?, ?, ?)",
                                    [
                                        nuevaCotizacionId,
                                        detalle.servicio_id,
                                        detalle.precio_unitario,
                                        detalle.cantidad,
                                        detalle.descuento,
                                    ]
                                );
                            });

                            res.status(201).json({
                                id: nuevaCotizacionId,
                                message: "Cotización duplicada correctamente",
                            });
                        }
                    );
                }
            );
        }
    );
});

app.post("/api/generar-pdf", async (req, res) => {
    try {
        const payload =
            typeof req.body.cotizacion === "string"
                ? JSON.parse(req.body.cotizacion)
                : req.body.cotizacion;

        const pdfBuffer = await generarPDF(payload);

        res.status(200)
            .set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=cotizacion_${payload.id}.pdf`,
                "Content-Length": pdfBuffer.length,
            })
            .end(pdfBuffer);
    } catch (err) {
        console.error("Error generando PDF:", err);
        res.status(500).json({ error: "Error generando PDF" });
    }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor prototipo corriendo en http://localhost:${PORT}`);
});
