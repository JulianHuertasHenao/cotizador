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
app.delete("/api/categorias/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT id FROM Categorias WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error al buscar categoría:", err.message);
            return res
                .status(500)
                .json({ error: "Error interno al buscar categoría" });
        }
        if (!row) {
            return res.status(404).json({ error: "Categoría no encontrada" });
        }
        db.run("DELETE FROM Categorias WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("Error al eliminar categoría:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error interno al eliminar categoría" });
            }
            res.json({ message: "Categoría eliminada correctamente" });
        });
    });
});

app.put("/api/categorias/:id", (req, res) => {
    const { id } = req.params;
    const { name, descripcion } = req.body;

    db.run(
        `UPDATE Categorias SET nombre_categoria = ?, descripcion = ? WHERE id = ?`,
        [name, descripcion || null, id],
        function (err) {
            if (err) {
                console.error("Error al actualizar categoría:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error interno al actualizar categoría" });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ error: "Categoría no encontrada" });
            }
            res.json({
                id,
                nombre_categoria: name,
                descripcion: descripcion || null,
            });
        }
    );
});

app.post("/api/categorias", async (req, res) => {
    const { name, descripcion } = req.body;
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Categorias (nombre_categoria, descripcion) 
         VALUES (?, ?)`,
                [name, descripcion || null],
                function (err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
        res.status(201).json({
            id: result.lastID,
            nombre_categoria: name,
            descripcion: descripcion || null,
        });
    } catch (error) {
        console.error("Error al crear categoría:", error.message);

        // Manejar error de fase duplicada
        if (error.message.includes("UNIQUE constraint failed")) {
            return res
                .status(400)
                .json({ error: "El número de categoria ya existe" });
        }

        res.status(500).json({ error: "Error interno al crear categoria" });
    }
});
// Rutas para Fases
app.post("/api/fases", async (req, res) => {
    const { cotizacion_id, numero_fase, duracion_meses } = req.body;

    try {
        // Validaciones básicas
        if (!cotizacion_id || !numero_fase) {
            return res
                .status(400)
                .json({ error: "Faltan campos obligatorios" });
        }

        // Verificar si la cotización existe
        const cotizacion = await new Promise((resolve, reject) => {
            db.get(
                "SELECT id FROM Cotizaciones WHERE id = ?",
                [cotizacion_id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!cotizacion) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        // Insertar la nueva fase
        const result = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Fases (cotizacion_id, numero_fase, duracion_meses) 
         VALUES (?, ?, ?)`,
                [cotizacion_id, numero_fase, duracion_meses || 1],
                function (err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });

        res.status(201).json({
            id: result.lastID,
            cotizacion_id,
            numero_fase,
            duracion_meses: duracion_meses || 1,
        });
    } catch (error) {
        console.error("Error al crear fase:", error.message);

        // Manejar error de fase duplicada
        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({
                error: "El número de fase ya existe para esta cotización",
            });
        }

        res.status(500).json({ error: "Error interno al crear fase" });
    }
});

// Obtener fases por cotización
app.get("/api/cotizaciones/:id/fases", async (req, res) => {
    const { id } = req.params;

    try {
        const fases = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, numero_fase, duracion_meses 
         FROM Fases 
         WHERE cotizacion_id = ? 
         ORDER BY numero_fase`,
                [id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.json(fases);
    } catch (error) {
        console.error("Error al obtener fases:", error.message);
        res.status(500).json({ error: "Error interno al obtener fases" });
    }
});

// Actualizar una fase
app.put("/api/fases/:id", async (req, res) => {
    const { id } = req.params;
    const { numero_fase, duracion_meses } = req.body;

    try {
        // Validaciones
        if (!numero_fase && !duracion_meses) {
            return res.status(400).json({ error: "Nada que actualizar" });
        }

        // Obtener fase actual para validaciones
        const faseActual = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM Fases WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!faseActual) {
            return res.status(404).json({ error: "Fase no encontrada" });
        }

        // Actualizar
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE Fases 
         SET numero_fase = ?, duracion_meses = ?
         WHERE id = ?`,
                [
                    numero_fase !== undefined
                        ? numero_fase
                        : faseActual.numero_fase,
                    duracion_meses !== undefined
                        ? duracion_meses
                        : faseActual.duracion_meses,
                    id,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });

        res.json({
            id,
            numero_fase:
                numero_fase !== undefined
                    ? numero_fase
                    : faseActual.numero_fase,
            duracion_meses:
                duracion_meses !== undefined
                    ? duracion_meses
                    : faseActual.duracion_meses,
        });
    } catch (error) {
        console.error("Error al actualizar fase:", error.message);

        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({
                error: "El número de fase ya existe para esta cotización",
            });
        }

        res.status(500).json({ error: "Error interno al actualizar fase" });
    }
});

// Eliminar una fase
app.delete("/api/fases/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar si la fase existe
        const fase = await new Promise((resolve, reject) => {
            db.get("SELECT id FROM Fases WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!fase) {
            return res.status(404).json({ error: "Fase no encontrada" });
        }

        // Eliminar (el CASCADE en la BD se encargará de los detalles relacionados)
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM Fases WHERE id = ?", [id], function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        res.json({ message: "Fase eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar fase:", error.message);
        res.status(500).json({ error: "Error interno al eliminar fase" });
    }
});
app.post("/api/servicios", (req, res) => {
    const { codigo, descripcion, precio_neto, categoria_id } = req.body;
    db.run(
        `INSERT INTO Servicios (codigo, descripcion, precio_neto, categoria_id) 
         VALUES (?, ?, ?, ?)`,
        [codigo, descripcion, precio_neto, categoria_id],
        function (err) {
            if (err) {
                console.error("Error al guardar servicio:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error al guardar servicio" });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});

app.put("/api/servicios/:id", (req, res) => {
    const { id } = req.params;
    const { codigo, descripcion, precio_neto, categoria_id } = req.body;
    db.run(
        `UPDATE Servicios 
         SET codigo = ?, descripcion = ?, precio_neto = ?, categoria_id = ? 
         WHERE id = ?`,
        [codigo, descripcion, precio_neto, categoria_id, id],
        function (err) {
            if (err) {
                console.error("Error al actualizar servicio:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error interno al actualizar servicio" });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ error: "Servicio no encontrado" });
            }
            res.json({
                id,
                codigo,
                descripcion,
                precio_neto,
                categoria_id,
            });
        }
    );
});

app.delete("/api/servicios/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT id FROM Servicios WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error al buscar servicio:", err.message);
            return res
                .status(500)
                .json({ error: "Error interno al buscar servicio" });
        }
        if (!row) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        db.run("DELETE FROM Servicios WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("Error al eliminar servicio:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error interno al eliminar servicio" });
            }
            res.json({ message: "Servicio eliminado correctamente" });
        });
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

// GET /api/categorias
// En tu server.js
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

// GET /api/servicios?categoria_id=#
app.get("/api/servicios", (req, res) => {
    const { categoria_id } = req.query;

    let query = `
        SELECT 
            id, 
            codigo, 
            descripcion, 
            precio_neto AS precio,
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
            precio_neto: servicio.precio,
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
    SELECT id, descripcion AS nombre, precio_neto AS precio
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

app.post("/api/fases", (req, res) => {
    const { cotizacion_id, numero_fase } = req.body;

    db.run(
        `INSERT INTO Fases (cotizacion_id, numero_fase) VALUES (?, ?)`,
        [cotizacion_id, numero_fase],
        function (err) {
            if (err) {
                console.error("Error al guardar fase:", err.message);
                return res.status(500).json({ error: "Error al guardar fase" });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
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

app.get("/api/cotizaciones/:id", (req, res) => {
    const cotizacionId = req.params.id;

    const queryCotizacion = `
    SELECT c.*, p.nombre AS paciente_nombre, p.correo, p.telefono, p.direccion
    FROM Cotizaciones c
    JOIN Pacientes p ON c.paciente_id = p.id
    WHERE c.id = ?
  `;

    const queryFases = `
    SELECT * FROM Fases WHERE cotizacion_id = ?
  `;

    const queryServicios = `
    SELECT dc.*, s.descripcion AS nombre_servicio, s.codigo, s.categoria_id
    FROM DetallesCotizacion dc
    JOIN Servicios s ON dc.servicio_id = s.id
    WHERE dc.cotizacion_id = ?
  `;

    // Paso 1: Obtener la cotización y el paciente
    db.get(queryCotizacion, [cotizacionId], (err, cotizacion) => {
        if (err) {
            console.error("Error al obtener cotización:", err.message);
            return res
                .status(500)
                .json({ error: "Error al obtener cotización" });
        }
        if (!cotizacion) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        // Paso 2: Obtener fases
        db.all(queryFases, [cotizacionId], (err, fases) => {
            if (err) {
                console.error("Error al obtener fases:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error al obtener fases" });
            }

            // Paso 3: Obtener servicios
            db.all(queryServicios, [cotizacionId], (err, servicios) => {
                if (err) {
                    console.error("Error al obtener servicios:", err.message);
                    return res
                        .status(500)
                        .json({ error: "Error al obtener servicios" });
                }

                // Organizar servicios dentro de cada fase
                const fasesConServicios = fases.map((fase) => {
                    const serviciosDeFase = servicios.filter(
                        (s) => s.fase_id === fase.id
                    );
                    return { ...fase, servicios: serviciosDeFase };
                });

                res.json({
                    cotizacion,
                    fases: fasesConServicios,
                });
            });
        });
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

app.post("/api/detalles-cotizacion", (req, res) => {
    const {
        cotizacion_id,
        fase_id,
        servicio_id,
        cantidad,
        precio_unitario,
        descuento,
        total,
    } = req.body;

    db.run(
        `INSERT INTO DetallesCotizacion (cotizacion_id, fase_id, servicio_id, cantidad, precio_unitario, descuento, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            cotizacion_id,
            fase_id,
            servicio_id,
            cantidad,
            precio_unitario,
            descuento,
            total,
        ],
        function (err) {
            if (err) {
                console.error("Error al guardar detalle:", err.message);
                return res
                    .status(500)
                    .json({ error: "Error al guardar detalle" });
            }
            res.status(201).json({ id: this.lastID });
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
