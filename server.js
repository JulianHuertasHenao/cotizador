const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const { generarPDF } = require("./src/services/pdf.service");
// Configuración básica
app.use(cors());
app.use(express.json());
app.post("/api/prueba", (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // Para parsear form data

// Interfaz web
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/presets", (req, res) => {
  res.json(presets);
});

app.post("/api/generar-pdf", async (req, res) => {
  try {
    // Soporta ambas formas:  body={ cotizacion: "{...}" }  o ya objeto
    const payload =
      typeof req.body.cotizacion === "string"
        ? JSON.parse(req.body.cotizacion)
        : req.body.cotizacion;

    const pdfBuffer = await generarPDF(payload);

    res
      .status(200)
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
console.log("🟢  Server file loaded:", __filename);

app.listen(PORT, () => {
  console.log(`Servidor prototipo corriendo en http://localhost:${PORT}`);
});

console.log(
  "📡 Rutas registradas:",
  app._router.stack
    .filter((r) => r.route)
    .map(
      (r) => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`
    )
);
