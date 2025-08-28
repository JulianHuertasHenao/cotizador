const fs = require("fs");
const path = require("path");
// test.js y pdf.service_V2.js están en el mismo directorio:
const { generarPDF } = require("./pdf.service_V2");

async function prueba() {
    const ejemplo = {
        // 👇 Toggle para desactivar el agrupado por fases
        agrupar_por_fase: false, // (equivale a group_by_phase: false)

        numero: "0003",
        fecha_creacion: new Date().toISOString(),
        doctora: "Dra. Sandra P. Alarcón G.",
        nombre_paciente: "Juan Pérez",
        correo_paciente: "juan.perez@email.com",

        // (Opcional en modo sin fases) Observaciones globales
        observaciones_generales:
            "Estas son observaciones generales de la cotización en modo sin fases.",

        // Método de pago (opcional, tal como lo tenías)
        pago: {
            metodo: "aplazado", // "unico" | "aplazado"
            cuota_inicial: 1_350_000,
            numero_cuotas: 24,
            valor_cuota: 131_250,
            valor_pagado_a_la_fecha: 2_000_000,
            fase_higienica_incluida: true,
        },

        // Si no pones observaciones_generales, el servicio combina estas y las muestra como una caja “Observaciones”
        observaciones_fases: {
            1: "Fase I: controles cada 15 días. Incluir fase higiénica si no está como ítem.",
            2: "Fase II – 1 mes después: blanqueamiento + resinas estéticas.",
            3: "Fase III – 6 meses después: ortodoncia (cuotas mensuales y reparaciones aparte).",
            4: "Fase IV: coronas con descuento aplicado sobre precio de lista.",
            5: "Fase V: endodoncia con procedimientos complementarios según evolución.",
        },

        procedimientos: [
            // ===== FASE 1 — ODONTOLOGÍA GENERAL =====
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
                subcategoria_nombre: "Fases Higiénicas",
                nombre_servicio: "Profilaxis",
                unidad: "1",
                codigo: "105",
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
                nombre_servicio: "Resina 1 superficie",
                unidad: "1",
                codigo: "108",
                precio_unitario: 150000,
                total: 150000,
            },

            // ===== FASE 2 — ODONTOLOGÍA ESTÉTICA =====
            {
                especialidad_codigo: "02",
                especialidad_nombre: "Odontología Estética",
                fase: "2",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Blanqueamiento",
                nombre_servicio: "Blanqueamiento Láser",
                unidad: "1",
                codigo: "201",
                precio_unitario: 650000,
                total: 650000,
            },
            {
                especialidad_codigo: "02",
                especialidad_nombre: "Odontología Estética",
                fase: "2",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Resinas Estéticas",
                nombre_servicio: "Carillas en resina",
                unidad: "1",
                codigo: "206",
                precio_unitario: 450000,
                total: 450000,
            },
            {
                especialidad_codigo: "02",
                especialidad_nombre: "Odontología Estética",
                fase: "2",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Diseños de Sonrisa",
                nombre_servicio:
                    "Diseño de Sonrisa (FH + Gingivectomía + Blanqueamiento + 6 bordes)",
                unidad: "1",
                codigo: "208",
                precio_unitario: 2500000,
                total: 2500000,
            },

            // ===== FASE 3 — ORTODONCIA =====
            {
                especialidad_codigo: "03",
                especialidad_nombre: "Ortodoncia",
                fase: "3",
                duracion: 6,
                duracion_unidad: "meses",
                subcategoria_nombre: "Ortodoncia Metálica MINI",
                nombre_servicio: "Ortodoncia metálica MINI",
                unidad: "1",
                codigo: "301",
                precio_unitario: 3800000,
                total: 3800000,
            },
            {
                especialidad_codigo: "03",
                especialidad_nombre: "Ortodoncia",
                fase: "3",
                duracion: 6,
                duracion_unidad: "meses",
                subcategoria_nombre: "Ortodoncia Metálica MINI",
                nombre_servicio: "Cuota inicial MINI",
                unidad: "1",
                codigo: "302",
                precio_unitario: 1140000,
                total: 1140000,
            },
            {
                especialidad_codigo: "03",
                especialidad_nombre: "Ortodoncia",
                fase: "3",
                duracion: 6,
                duracion_unidad: "meses",
                subcategoria_nombre: "Controles",
                nombre_servicio: "Control MINI",
                unidad: "1",
                codigo: "303",
                precio_unitario: 147777,
                total: 147777,
            },
            {
                especialidad_codigo: "03",
                especialidad_nombre: "Ortodoncia",
                fase: "3",
                duracion: 6,
                duracion_unidad: "meses",
                subcategoria_nombre: "Reparaciones",
                nombre_servicio: "Reparaciones",
                unidad: "1",
                codigo: "311",
                precio_unitario: 50000,
                total: 50000,
            },

            // ===== FASE 4 — REHABILITACIÓN ORAL =====
            {
                especialidad_codigo: "04",
                especialidad_nombre: "Rehabilitación Oral",
                fase: "4",
                duracion: 4,
                duracion_unidad: "meses",
                subcategoria_nombre: "Coronas",
                nombre_servicio: "Corona con cuello cerámico",
                unidad: "1",
                codigo: "404",
                precio_unitario: 1000000,
                descuento: "10%",
                total: 900000,
            },
            {
                especialidad_codigo: "04",
                especialidad_nombre: "Rehabilitación Oral",
                fase: "4",
                duracion: 4,
                duracion_unidad: "meses",
                subcategoria_nombre: "Coronas",
                nombre_servicio: "Corona metal porcelana",
                unidad: "1",
                codigo: "406",
                precio_unitario: 990000,
                descuento: "10%",
                total: 891000,
            },
            {
                especialidad_codigo: "04",
                especialidad_nombre: "Rehabilitación Oral",
                fase: "4",
                duracion: 4,
                duracion_unidad: "meses",
                subcategoria_nombre: "Prótesis Total",
                nombre_servicio: "Prótesis total (dientes en acrílico)",
                unidad: "1",
                codigo: "415",
                precio_unitario: 1300000,
                descuento: "10%",
                total: 1170000,
            },

            // ===== FASE 5 — ENDODONCIA =====
            {
                especialidad_codigo: "05",
                especialidad_nombre: "Endodoncia",
                fase: "5",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Procedimientos endodónticos",
                nombre_servicio: "Amputación o hemisección radicular",
                unidad: "1",
                codigo: "501",
                precio_unitario: 220000,
                descuento: "10%",
                total: 198000,
            },
            {
                especialidad_codigo: "05",
                especialidad_nombre: "Endodoncia",
                fase: "5",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Procedimientos endodónticos",
                nombre_servicio: "Cirugía apical (incluye MTA)",
                unidad: "1",
                codigo: "504",
                precio_unitario: 800000,
                descuento: "10%",
                total: 720000,
            },
            {
                especialidad_codigo: "05",
                especialidad_nombre: "Endodoncia",
                fase: "5",
                duracion: 1,
                duracion_unidad: "mes",
                subcategoria_nombre: "Procedimientos endodónticos",
                nombre_servicio: "Blanqueamiento diente no vital",
                unidad: "1",
                codigo: "518",
                precio_unitario: 300000,
                total: 300000,
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
