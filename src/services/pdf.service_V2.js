// services/pdf.service_V2.js

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function formatoFecha(fecha) {
  const opciones = { year: "numeric", month: "long", day: "numeric" };
  return new Date(fecha).toLocaleDateString("es-CO", opciones);
}

const generarPDF = async (cotizacion) => {
  return new Promise((resolve, reject) => {
    try {
      // 1) Preparar documento y stream
      const fileName = `cotizacion-${cotizacion.numero}.pdf`;
      const filePath = path.join(__dirname, fileName);
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // 2) Registrar fuentes desde services/fonts
      doc.registerFont(
        "Poppins-Regular",
        path.join(__dirname, "fonts", "PoppinsRegular-B2Bw.otf")
      );
      doc.registerFont(
        "Poppins-Bold",
        path.join(__dirname, "fonts", "PoppinsBold-GdJA.otf")
      );
      doc.registerFont(
        "OpenSans-Regular",
        path.join(__dirname, "fonts", "OpenSans-B9K8.ttf")
      );
      doc.registerFont(
        "OpenSans-Bold",
        path.join(__dirname, "fonts", "OpenSansBold-8wJJ.ttf")
      );

      // 3) Paleta de colores
      const primaryColor = "#247B97"; // Teal
      const secondaryColor = "#E59CAF"; // Rosa coral
      const accentColor = "#D6C39F"; // Beige
      const darkText = "#1B1B1B";
      const lightText = "#FFFFFF";

      // --- 4) Logo y versión ---
      if (cotizacion.logoPath) {
        doc.image(cotizacion.logoPath, 40, 40, { width: 100 });
      }

      // --- 5) Logo pequeño y Título ajustado ---
      // Logo 50x50 a la izquierda del título
      const titleY = 80;
      const contentWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right; // 515
      const titleFontSize = 24; // reducido para no ocupar dos líneas
      const logoSmallPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "logo-sandra.png"
      );
      if (fs.existsSync(logoSmallPath)) {
        doc.image(logoSmallPath, 40, titleY, { width: 80, height: 70 });
      }
      // Título alineado a la derecha
      doc
        .font("Poppins-Bold")
        .fontSize(titleFontSize)
        .fillColor(darkText)
        .text("COTIZACIÓN DEL TRATAMIENTO", 40, titleY, {
          align: "right",
          width: contentWidth,
        });

      doc
        .font("OpenSans-Bold")
        .fontSize(12)
        .fillColor(darkText)
        .text("MV-F-001 VERSIÓN 01; 03 DE JULIO DE 2025", 40, 40);

      // Línea rosa bajo el título
      doc
        .rect(
          40,
          titleY + logoSmallPath ? 54 : titleY + titleFontSize + 6,
          contentWidth,
          4
        )
        .fill(secondaryColor);

      // --- 6) Info clínica (izq) + cotización (der) ---
      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .fillColor(darkText)
        .text(
          "Av. C. 127 #19A-28,\n" +
            "Bogotá D.C. Colombia\n" +
            "Email: spaortodoncia@hotmail.com\n" +
            "www.drasandraalarcon.com.co",
          40,
          150
        );

      doc
        .font("Poppins-Bold")
        .fontSize(14)
        .fillColor(darkText)
        .text(`COTIZACIÓN MV-${cotizacion.numero}`, 40, 150, {
          align: "right",
          width: contentWidth,
        });

      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .fillColor(darkText)
        .text(`Bogotá, ${formatoFecha(cotizacion.fecha_creacion)}`, 40, 166, {
          align: "right",
          width: contentWidth,
        });

      // --- 7) Datos doctora/paciente ---
      const dpY = 200;
      const dpLabels = ["DOCTORA:", "PACIENTE:", "DOCUMENTO:"];
      const dpValues = [
        cotizacion.doctora,
        cotizacion.nombre_paciente,
        cotizacion.documento,
      ];
      let dpX = 40;
      dpLabels.forEach((lbl, i) => {
        doc
          .font("Poppins-Bold")
          .fontSize(12)
          .fillColor(darkText)
          .text(lbl, dpX, dpY + i * 18);
        doc
          .font("OpenSans-Regular")
          .fontSize(12)
          .text(dpValues[i], dpX + 90, dpY + i * 18);
        dpX += 200;
      });

      // --- 8) Tabla por fases y especialidades sin espacios extras ---
      let y = dpY + 60;
      let totalGeneral = 0;

      // Agrupar por fase
      const fases = {};
      cotizacion.procedimientos.forEach((p) => {
        if (!fases[p.fase])
          fases[p.fase] = {
            duracion: p.duracion,
            unidad: p.duracion_unidad,
            items: [],
          };
        fases[p.fase].items.push(p);
      });

      Object.entries(fases).forEach(([faseKey, fase]) => {
        // Fase bar
        doc.rect(40, y, contentWidth, 28).fill(primaryColor);
        doc
          .font("Poppins-Bold")
          .fontSize(16)
          .fillColor(lightText)
          .text(`FASE ${faseKey}`, 40, y + 6, {
            width: contentWidth / 2,
            align: "center",
          });
        doc
          .font("OpenSans-Regular")
          .text(`${fase.duracion} ${fase.unidad}`, 40, y + 6, {
            width: contentWidth,
            align: "center",
          });
        y += 32;

        // Agrupar por especialidad
        const specs = {};
        fase.items.forEach((it) => {
          const key = `${it.especialidad_codigo}|${it.especialidad_nombre}`;
          if (!specs[key])
            specs[key] = {
              codigo: it.especialidad_codigo,
              nombre: it.especialidad_nombre,
              items: [],
            };
          specs[key].items.push(it);
        });

        Object.values(specs).forEach((spec) => {
          // Especialidad header
          doc.rect(40, y, contentWidth, 24).fill(darkText);
          doc
            .font("Poppins-Bold")
            .fontSize(13)
            .fillColor(lightText)
            .text(`${spec.codigo} - ${spec.nombre}`.toUpperCase(), 40, y + 5, {
              width: contentWidth,
              align: "center",
            });
          y += 28;

          // Subcategoría
          doc.rect(40, y, contentWidth, 20).fill(secondaryColor);
          doc
            .font("Poppins-Bold")
            .fontSize(12)
            .fillColor(lightText)
            .text(spec.nombre.toUpperCase(), 40, y + 5, {
              width: contentWidth,
              align: "center",
            });
          y += 24;

          // Encabezado tabla
          doc.rect(40, y, contentWidth, 28).fill(darkText);
          const cols = [
            { text: "CÓDIGO", width: 50, x: 40 },
            { text: "DESCRIPCIÓN", width: 200, x: 90 },
            { text: "UNDADES", width: 60, x: 300 },
            { text: "PRECIO NETO", width: 80, x: 360 },
            { text: "DESCUENTO", width: 60, x: 445 },
            { text: "TOTAL", width: 50, x: 505 },
          ];
          cols.forEach((col) => {
            doc
              .font("Poppins-Bold")
              .fontSize(11)
              .fillColor(lightText)
              .text(col.text, col.x, y + 7, {
                width: col.width,
                align: "center",
              });
          });
          y += 32;

          // Filas de servicios
          let subtotal = 0;
          spec.items.forEach((item, idx) => {
            if (idx % 2 === 0)
              doc.rect(40, y, contentWidth, 24).fill("#F9F9F9");
            const rowCols = [
              { value: item.codigo, width: 50, x: 40 },
              { value: item.nombre_servicio, width: 200, x: 90 },
              { value: item.unidad, width: 60, x: 300 },
              {
                value: `$ ${item.precio_unitario.toLocaleString("es-CO")}`,
                width: 80,
                x: 360,
              },
              { value: item.descuento || "N.A", width: 60, x: 445 },
              {
                value: `$ ${item.total.toLocaleString("es-CO")}`,
                width: 50,
                x: 505,
              },
            ];
            rowCols.forEach((col) => {
              doc
                .font("OpenSans-Regular")
                .fontSize(10)
                .fillColor(darkText)
                .text(col.value, col.x, y + 5, {
                  width: col.width,
                  align: "center",
                });
            });
            subtotal += item.total;
            y += 24;
          });

          // Total sección
          doc.rect(40, y, contentWidth, 28).fill(darkText);
          doc
            .font("Poppins-Bold")
            .fontSize(12)
            .fillColor(lightText)
            .text("TOTAL", 40, y + 7, {
              width: contentWidth - 60,
              align: "right",
            });
          doc.text(`$ ${subtotal.toLocaleString("es-CO")}`, 40, y + 7, {
            width: contentWidth,
            align: "center",
          });
          y += 32;
          totalGeneral += subtotal;
        });
      });

      // --- 9) Total General ---
      doc.rect(40, y, contentWidth, 32).fill(primaryColor);
      doc
        .font("Poppins-Bold")
        .fontSize(16)
        .fillColor(lightText)
        .text("TOTAL GENERAL", 40, y + 8, {
          width: contentWidth / 2,
          align: "center",
        })
        .text(`$ ${totalGeneral.toLocaleString("es-CO")}`, 40, y + 8, {
          width: contentWidth,
          align: "center",
        });
      y += 48;

      // --- 10) Nota beige ---
      doc.rect(40, y, contentWidth, 20).fill(accentColor);
      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .fillColor(darkText)
        .text(
          "NOTA: AQUI SE DEFINIRÁN LAS NOTAS QUE CONSIDEREN PERTINENTES EN SUS COTIZACIONES",
          40,
          y + 5,
          { width: contentWidth, align: "center" }
        );
      y += 36;

      // --- 11) Método de pago ---
      doc
        .font("Poppins-Bold")
        .fontSize(14)
        .fillColor(darkText)
        .text("MÉTODO DE PAGO", 40, y, {
          width: contentWidth,
          align: "center",
        });
      y += 24;
      doc.rect(40, y, 12, 12).stroke(darkText);
      doc
        .font("OpenSans-Regular")
        .fontSize(12)
        .text(" Pago único", 60, y - 1);
      y += 20;
      doc.rect(40, y, 12, 12).stroke(darkText);
      doc.text(" Pago aplazado en _____ cuotas", 60, y - 1);
      y += 36;

      // --- 12) Firmas ---
      const sigY = y;
      doc
        .font("Poppins-Bold")
        .fontSize(12)
        .fillColor(darkText)
        .text("SANDRA P. ALARCON G.", 40, sigY, {
          width: 200,
          align: "center",
        });
      // Espacio extra antes de la línea
      doc
        .moveTo(40, sigY + 30)
        .lineTo(240, sigY + 30)
        .stroke(darkText);
      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .text("Ortodoncista – Ortopedia Maxilar", 40, sigY + 34, {
          width: 200,
          align: "center",
        });

      doc
        .font("Poppins-Bold")
        .fontSize(12)
        .text("RECIBÍ Y APROBÉ:", 355, sigY, { width: 200, align: "center" });
      doc
        .moveTo(355, sigY + 30)
        .lineTo(555, sigY + 30)
        .stroke(darkText);
      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .text("Firma Paciente", 355, sigY + 34, {
          width: 200,
          align: "center",
        });

      // --- 13) Footer rosa ---
      doc
        .rect(0, doc.page.height - 30, doc.page.width, 30)
        .fill(secondaryColor);

      doc.end();
      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generarPDF };
