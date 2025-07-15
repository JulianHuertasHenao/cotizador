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
      const margin = 40;
      const contentWidth = doc.page.width - margin * 2;

      // --- 4) Logo grande (opcional) ---
      if (cotizacion.logoPath) {
        doc.image(cotizacion.logoPath, margin, margin, { width: 100 });
      }

      // --- 5) Logo pequeño + Título + Versión con línea rosa en la misma fila ---
      const smallLogoPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "logo-sandra.png"
      );
      const hasSmallLogo = fs.existsSync(smallLogoPath);

      // 5.1) Dibuja el logo pequeñito y ajusta offsets si existe
      let titleX = margin;
      let titleY = margin;
      if (hasSmallLogo) {
        const img = doc.openImage(smallLogoPath);
        const logoW = 80;
        const logoH = img.height * (logoW / img.width);
        doc.image(img, margin, margin, { width: logoW });
        titleX += logoW + 10; // separa 10px del logo
        titleY += (logoH - 20) / 2; // centra el texto de 20pt en ese hueco
      }

      // 5.2) Título
      doc
        .font("Poppins-Bold")
        .fontSize(20)
        .fillColor(darkText)
        .text("COTIZACIÓN DEL TRATAMIENTO", titleX, titleY, {
          width: contentWidth - (titleX - margin),
        });

      const titleBottom = doc.y;
      const versionText = `MV-F-001 VERSIÓN 01; ${formatoFecha(
        cotizacion.fecha_creacion
      ).toUpperCase()}`;

      // 1) Configuramos fuente más pequeña
      doc.font("OpenSans-Regular").fontSize(10);

      // 2) Medimos altura y ancho de la línea de texto
      const lineHeight = doc.currentLineHeight();
      const textWidth = doc.widthOfString(versionText);

      // 3) Posiciones
      const versionX = margin + contentWidth - textWidth; // empieza aquí
      const versionY = titleBottom + 10; // 10px bajo el título

      // 4) Línea rosa fina, centrada verticalmente en el texto,
      //    que termina 5px antes del comienzo del texto
      const gap = 30;
      const lineY = versionY + lineHeight / 2; // mitad de altura
      const lineEndX = versionX - gap;

      doc
        .save()
        .lineWidth(2)
        .strokeColor(secondaryColor)
        .moveTo(margin, lineY)
        .lineTo(lineEndX, lineY)
        .stroke()
        .restore();

      // 5) Dibujamos el texto de versión SIN permitir salto de línea
      doc.fillColor(darkText).text(versionText, versionX, versionY, {
        lineBreak: false,
      });

      // --- 6) Info clínica (izq) + cotización (der) ---
      // Calculamos el Y de inicio 15px tras la línea de versión
      const section6Y = versionY + lineHeight + 15;

      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .fillColor(darkText)
        .text(
          "Av. C. 127 #19A-28,\n" +
            "Bogotá D.C. Colombia\n" +
            "Email: spaortodoncia@hotmail.com\n" +
            "www.drasandraalarcon.com.co",
          margin,
          section6Y
        );

      doc
        .font("Poppins-Bold")
        .fontSize(10)
        .fillColor(darkText)
        .text(`COTIZACIÓN MV-${cotizacion.numero}`, margin, section6Y, {
          align: "right",
          width: contentWidth,
        });

      // Para la fecha, aprovechamos doc.y que ya avanzó tras la dirección
      doc
        .font("OpenSans-Regular")
        .fontSize(10)
        .fillColor(darkText)
        .text(
          `Bogotá, ${formatoFecha(cotizacion.fecha_creacion)}`,
          margin,
          doc.y + 4, // un pelín abajo de la dirección
          {
            align: "right",
            width: contentWidth,
          }
        );

      // --- 7) Datos doctora/paciente ---
      // empezamos 15px tras donde quedó la fecha/dirección
      const section7Y = doc.y + 40;
      const labelX = margin; // 40px
      const valueX = margin + 90; // 130px

      const dpLabels = ["DOCTORA:", "PACIENTE:", "DOCUMENTO:"];
      const dpValues = [
        cotizacion.doctora,
        cotizacion.nombre_paciente,
        cotizacion.documento,
      ];

      // configuramos la fuente y medimos la altura de cada fila
      doc.font("Poppins-Bold").fontSize(10);
      const rowHeight = doc.currentLineHeight();

      dpLabels.forEach((lbl, i) => {
        const y = section7Y + i * rowHeight;
        doc.fillColor(darkText).text(lbl, labelX, y);
        doc.font("OpenSans-Regular").text(dpValues[i], valueX, y);
        // volvemos a bold antes de la siguiente iteración
        doc.font("Poppins-Bold");
      });

      // --- 8) Tabla por fases/secciones/categorías/servicios ---
      // partimos de doc.y y un pequeño margen
      let y = doc.y + 10;
      let totalGeneral = 0;

      // 1) Transformar cotizacion.procedimientos en la estructura deseada
      const phaseMap = {};
      cotizacion.procedimientos.forEach((p) => {
        // 1.1) Fase
        if (!phaseMap[p.fase]) {
          phaseMap[p.fase] = {
            duration: p.duracion,
            unit: p.duracion_unidad,
            sections: {},
          };
        }
        const ph = phaseMap[p.fase];

        // 1.2) Sección (especialidad)
        const secKey = `${p.especialidad_codigo}|${p.especialidad_nombre}`;
        if (!ph.sections[secKey]) {
          ph.sections[secKey] = {
            title: `${p.especialidad_codigo} – ${p.especialidad_nombre}`,
            categories: {},
          };
        }
        const sec = ph.sections[secKey];

        // 1.3) Categoría (subcategoría)
        const catName = p.subcategoria_nombre || "OTROS";
        if (!sec.categories[catName]) {
          sec.categories[catName] = [];
        }

        // 1.4) Servicio
        sec.categories[catName].push({
          code: p.codigo,
          desc: p.nombre_servicio,
          units: p.unidad,
          price: p.precio_unitario,
          discount: p.descuento || "N.A",
          total: p.total,
        });
      });

      // Convertimos mapas a arrays para iterar más cómodamente
      const phases = Object.entries(phaseMap).map(([phaseKey, ph]) => ({
        key: phaseKey,
        duration: ph.duration,
        unit: ph.unit,
        sections: Object.values(ph.sections).map((sec) => ({
          title: sec.title,
          categories: Object.entries(sec.categories).map(
            ([name, services]) => ({
              name,
              services,
            })
          ),
        })),
      }));

      // 2) Dibujar cada fase con su estructura
      phases.forEach((phase) => {
        // 2.1) Cabecera de fase
        doc.rect(margin, y, contentWidth, 28).fill(primaryColor);
        doc
          .font("Poppins-Bold")
          .fontSize(16)
          .fillColor(lightText)
          .text(`FASE ${phase.key}`, margin, y + 6, {
            width: contentWidth / 2,
            align: "center",
          });
        doc
          .font("OpenSans-Regular")
          .text(
            `${phase.duration} ${phase.unit}`,
            margin + contentWidth / 2,
            y + 6,
            {
              width: contentWidth / 2,
              align: "center",
            }
          );
        y += 32;

        // 2.2) Cada sección (especialidad)
        phase.sections.forEach((section) => {
          // 2.2.1) Título de la sección
          doc
            .font("OpenSans-Bold")
            .fontSize(12)
            .fillColor(darkText)
            .text(section.title.toUpperCase(), margin, y, {
              width: contentWidth,
              align: "center",
            });
          y += doc.currentLineHeight() + 4;

          // 2.2.2) Encabezado de tabla
          doc.rect(margin, y, contentWidth, 28).fill(darkText);
          const headerCols = [
            { text: "CÓDIGO", x: margin, width: 60 },
            { text: "DESCRIPCIÓN", x: margin + 60, width: 200 },
            { text: "UNIDADES", x: margin + 260, width: 60 },
            { text: "PRECIO NETO", x: margin + 320, width: 80 },
            { text: "DESCUENTO", x: margin + 400, width: 60 },
            { text: "TOTAL", x: margin + 460, width: 50 },
          ];
          headerCols.forEach((col) => {
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

          // 2.2.3) Cada categoría dentro de la sección
          section.categories.forEach((category) => {
            // barra rosa de categoría
            doc.rect(margin, y, contentWidth, 20).fill(secondaryColor);
            doc
              .font("Poppins-Bold")
              .fontSize(11)
              .fillColor(lightText)
              .text(category.name.toUpperCase(), margin, y + 5, {
                width: contentWidth,
                align: "center",
              });
            y += 24;

            // filas de servicios (beige en filas impares)
            category.services.forEach((svc, idx) => {
              if (idx % 2 === 1) {
                doc.rect(margin, y, contentWidth, 24).fill(accentColor);
              }
              const rowCols = [
                { value: svc.code, x: margin, width: 60 },
                { value: svc.desc, x: margin + 60, width: 200 },
                { value: svc.units, x: margin + 260, width: 60 },
                {
                  value: `$${svc.price.toLocaleString("es-CO")}`,
                  x: margin + 320,
                  width: 80,
                },
                { value: svc.discount, x: margin + 400, width: 60 },
                {
                  value: `$${svc.total.toLocaleString("es-CO")}`,
                  x: margin + 460,
                  width: 50,
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
              y += 24;
            });
          });

          // 2.2.4) Total de la sección (suma de todos sus services)
          const totalSection = section.categories
            .flatMap((c) => c.services)
            .reduce((sum, s) => sum + s.total, 0);
          doc.rect(margin, y, contentWidth, 28).fill(darkText);
          doc
            .font("Poppins-Bold")
            .fontSize(12)
            .fillColor(lightText)
            .text("TOTAL", margin, y + 7, {
              width: contentWidth - 60,
              align: "right",
            });
          doc.text(`$ ${totalSection.toLocaleString("es-CO")}`, margin, y + 7, {
            width: contentWidth,
            align: "center",
          });
          y += 32;
          totalGeneral += totalSection;
        });
      });

      // 3) Total general al final
      doc.rect(margin, y, contentWidth, 32).fill(primaryColor);
      doc
        .font("Poppins-Bold")
        .fontSize(16)
        .fillColor(lightText)
        .text("TOTAL GENERAL", margin, y + 8, {
          width: contentWidth / 2,
          align: "center",
        })
        .text(`$ ${totalGeneral.toLocaleString("es-CO")}`, margin, y + 8, {
          width: contentWidth,
          align: "center",
        });
      y += 48;

      // --- 9) Total General al final ---
      doc.rect(margin, y, contentWidth, 32).fill(primaryColor);
      doc
        .font("Poppins-Bold")
        .fontSize(16)
        .fillColor(lightText)
        .text("TOTAL GENERAL", margin, y + 8, {
          width: contentWidth / 2,
          align: "center",
        })
        .text(`$ ${totalGeneral.toLocaleString("es-CO")}`, margin, y + 8, {
          width: contentWidth,
          align: "center",
        });
      y += 48;

      // --- 10) Nota beige ---
      doc.rect(40, y, contentWidth, 20).fill(accentColor);
      doc
        .font("OpenSans-Bold")
        .fontSize(8)
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
          align: "left",
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
