// src/services/test.js
const fs = require("fs");
const path = require("path");
// Como test.js y pdf.service_V2.js están en el mismo directorio:
const { generarPDF } = require("./pdf.service_V2");

async function prueba() {
  // Define aquí un objeto de prueba que siga la misma estructura
  const ejemplo = {
    numero: "0001",
    fecha_creacion: new Date().toISOString(),
    doctora: "Dra. Sandra P. Alarcón G.",
    nombre_paciente: "Juan Pérez",
    documento: "CC 12345678",
    estado: "pendiente",
    procedimientos: [
      {
        especialidad_codigo: "101",
        especialidad_nombre: "Ortodoncia",
        fase: "1",
        duracion: 6,
        duracion_unidad: "meses",
        nombre_servicio: "Ajuste Bracket",
        unidad: "1",
        codigo: "BR-01",
        precio_unitario: 200000,
        total: 200000,
      },
      {
        especialidad_codigo: "102",
        especialidad_nombre: "Cirugía",
        fase: "1",
        duracion: 1,
        duracion_unidad: "proced.",
        nombre_servicio: "Extracción Dental",
        unidad: "1",
        codigo: "EX-02",
        precio_unitario: 150000,
        total: 150000,
      },
    ],
    total_neto: 350000,
  };

  try {
    const pdfBuffer = await generarPDF(ejemplo);
  } catch (err) {
    console.error("Error generando PDF de prueba:", err);
  }
}

prueba();
