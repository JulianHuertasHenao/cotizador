const fs = require("fs");
const path = require("path");
// test.js y pdf.service_V2.js están en el mismo directorio:
const { generarPDF } = require("./pdf.service_V2");

async function prueba() {
  // Ejemplo con dos fases, dos especialidades y varias subcategorías
  const ejemplo = {
    numero: "0001",
    fecha_creacion: new Date().toISOString(),
    doctora: "Dra. Sandra P. Alarcón G.",
    nombre_paciente: "Juan Pérez",
    documento: "CC 12345678",
    procedimientos: [
      // Fase 1 → Odontología General
      {
        especialidad_codigo: "01",
        especialidad_nombre: "Odontología General",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Valoraciones",
        nombre_servicio: "Valoración",
        unidad: "1",
        codigo: "101",
        precio_unitario: 50000,
        total: 50000,
      },
      {
        especialidad_codigo: "01",
        especialidad_nombre: "Odontología General",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Urgencias",
        nombre_servicio: "Urgencias",
        unidad: "1",
        codigo: "103",
        precio_unitario: 100000,
        total: 100000,
      },
      {
        especialidad_codigo: "01",
        especialidad_nombre: "Odontología General",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Resinas",
        nombre_servicio: "Resina 4 superficies",
        unidad: "1",
        codigo: "111",
        precio_unitario: 480000,
        total: 480000,
      },

      // Fase 1 → Periodoncia
      {
        especialidad_codigo: "06",
        especialidad_nombre: "Periodoncia",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Periodoncia",
        nombre_servicio: "Alargamiento de corona",
        unidad: "1",
        codigo: "601",
        precio_unitario: 370000,
        descuento: "15%",
        total: 238000,
      },
      {
        especialidad_codigo: "06",
        especialidad_nombre: "Periodoncia",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Periodoncia",
        nombre_servicio: "Frenillectomía",
        unidad: "1",
        codigo: "602",
        precio_unitario: 350000,
        descuento: "10%",
        total: 270000,
      },
      {
        especialidad_codigo: "06",
        especialidad_nombre: "Periodoncia",
        fase: "1",
        duracion: 1,
        duracion_unidad: "mes",
        subcategoria_nombre: "Materiales de Osteosíntesis",
        nombre_servicio: "Hueso 0,5gr Cerabone Straumann",
        unidad: "1",
        codigo: "1",
        precio_unitario: 670000,
        total: 670000,
      },
    ],
  };

  try {
    await generarPDF(ejemplo);
    console.log("PDF generado correctamente.");
  } catch (err) {
    console.error("Error generando PDF de prueba:", err);
  }
}

prueba();
