const PDFDocument = require("pdfkit");

const generarPDF = async (cotizacion) => {
  return new Promise((resolve, reject) => {
    // Configurar documento en formato horizontal
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 50,
    });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Establecer márgenes y áreas útiles
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const centerX = doc.page.margins.left + pageWidth / 2;

    // --- ENCABEZADO ---
    doc.image("public/logo-sandra.png", 50, 40, { width: 60 });

    doc
      .fillColor("#2a9d8f")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Sandra Alarcón", doc.page.margins.left, 50);

    doc
      .fillColor("#264653")
      .font("Helvetica")
      .fontSize(12)
      .text("Odontología Especializada", doc.page.margins.left, 75);

    doc
      .fillColor("#000000")
      .text("Calle Dental 123, Consultorio 456", doc.page.margins.left, 90)
      .text("Tel: 601 1234567 | NIT: 123456789-0", doc.page.margins.left, 105);

    // Línea divisoria
    doc
      .moveTo(doc.page.margins.left, 125)
      .lineTo(doc.page.width - doc.page.margins.right, 125)
      .stroke();

    // --- TÍTULO ---

    doc
      .fontSize(16)
      .fillColor("#2a9d8f")
      .text(
        `COTIZACIÓN ODONTOLÓGICA #${cotizacion.id.slice(0, 8)}`,
        centerX,
        140,
        {
          align: "center",
        }
      );

    // --- DATOS DEL PACIENTE ---
    doc.fontSize(12).fillColor("#000000");

    // Organización en dos columnas
    const col1 = doc.page.margins.left;
    const col2 = doc.page.width / 2;

    doc.text(`Paciente: ${cotizacion.nombre_paciente}`, col1, 170);
    doc.text(`Correo: ${cotizacion.correo_paciente}`, col2, 170);
    doc.text(
      `Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString()}`,
      col1,
      190
    );
    doc.text(`Estado: ${cotizacion.estado.toUpperCase()}`, col2, 190);

    // --- TABLA DE PROCEDIMIENTOS ---
    const tableTop = 220;
    let y = tableTop;

    // Encabezados de tabla
    doc.font("Helvetica-Bold").fontSize(10);

    // Definir anchos de columnas para mejor ajuste
    const columns = [
      { name: "PROCEDIMIENTO", width: 200, x: col1 },
      { name: "PRECIO UNIT.", width: 90, x: col1 + 210, align: "right" },
      { name: "CANT.", width: 50, x: col1 + 300, align: "right" },
      { name: "DESCUENTO", width: 90, x: col1 + 350, align: "right" },
      { name: "TOTAL", width: 90, x: col1 + 440, align: "right" },
    ];

    // Dibujar encabezados
    columns.forEach((col) => {
      doc.text(col.name, col.x, y, {
        width: col.width,
        align: col.align || "left",
      });
    });

    y += 20;
    doc
      .moveTo(col1, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke();
    y += 10;

    // Procedimientos
    doc.font("Helvetica").fontSize(10);
    cotizacion.procedimientos.forEach((proc) => {
      const subtotal = proc.precio_unitario * (proc.cantidad || 1);
      let descuento = proc.descuento_individual || 0;

      if (proc.discount_type === "percent") {
        descuento = subtotal * (descuento / 100);
      }

      const total = subtotal - descuento;

      // Calcular altura necesaria para el nombre (puede ser multilínea)
      const procNameHeight = doc.heightOfString(proc.nombre_servicio, {
        width: columns[0].width,
      });

      // Verificar si necesitamos nueva página (raro en horizontal)
      if (y + procNameHeight > doc.page.height - 150) {
        doc.addPage({
          size: "A4",
          layout: "landscape",
          margin: 50,
        });
        y = 50;
      }

      // Dibujar fila
      doc.text(proc.nombre_servicio, columns[0].x, y, {
        width: columns[0].width,
      });

      doc.text(
        `$${proc.precio_unitario.toLocaleString("es-CO")}`,
        columns[1].x,
        y,
        {
          width: columns[1].width,
          align: columns[1].align,
        }
      );

      doc.text((proc.cantidad || 1).toString(), columns[2].x, y, {
        width: columns[2].width,
        align: columns[2].align,
      });

      doc.text(`$${descuento.toLocaleString("es-CO")}`, columns[3].x, y, {
        width: columns[3].width,
        align: columns[3].align,
      });

      doc.text(`$${total.toLocaleString("es-CO")}`, columns[4].x, y, {
        width: columns[4].width,
        align: columns[4].align,
      });

      y += Math.max(procNameHeight, 20); // Mínimo 20px de altura por fila
    });

    // --- TOTALES ---
    y += 10;
    doc
      .moveTo(col1, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke();
    y += 20;

    doc.font("Helvetica-Bold");
    doc.text("SUBTOTAL:", columns[3].x, y, {
      width: columns[3].width,
      align: columns[3].align,
    });
    doc.text(
      `$${cotizacion.total_bruto.toLocaleString("es-CO")}`,
      columns[4].x,
      y,
      {
        width: columns[4].width,
        align: columns[4].align,
      }
    );
    y += 20;

    doc.text("DESCUENTO TOTAL:", columns[3].x, y, {
      width: columns[3].width,
      align: columns[3].align,
    });
    doc.text(
      `$${cotizacion.total_descuento.toLocaleString("es-CO")}`,
      columns[4].x,
      y,
      {
        width: columns[4].width,
        align: columns[4].align,
      }
    );
    y += 20;

    doc.fontSize(12);
    doc.text("TOTAL A PAGAR:", columns[3].x, y, {
      width: columns[3].width,
      align: columns[3].align,
    });
    doc.text(
      `$${cotizacion.total_neto.toLocaleString("es-CO")}`,
      columns[4].x,
      y,
      {
        width: columns[4].width,
        align: columns[4].align,
      }
    );
    y += 30;

    // --- OBSERVACIONES ---
    if (cotizacion.observaciones) {
      doc.font("Helvetica").fontSize(10);
      doc.text("OBSERVACIONES:", col1, y);
      y += 15;

      const obsHeight = doc.heightOfString(cotizacion.observaciones, {
        width: pageWidth,
      });

      doc.text(cotizacion.observaciones, col1, y, {
        width: pageWidth,
      });

      y += obsHeight + 20;
    }

    // --- PIE DE PÁGINA ---
    // Asegurar que el pie de página esté en la primera página
    const maxY = doc.page.height - 100; // Límite inferior antes del pie
    if (y > maxY) {
      // Si el contenido está muy abajo, moverlo hacia arriba
      y = maxY - 50; // Ajustar posición hacia arriba
    }

    const footerY = doc.page.height - 50;
    doc.fontSize(10).fillColor("#2a9d8f");
    doc.text("Sandra Alarcón Odontología Especializada", centerX, footerY, {
      align: "center",
    });

    doc.fillColor("#000000");
    doc.text(
      "Esta cotización es válida por 15 días a partir de la fecha de emisión",
      centerX,
      footerY + 15,
      {
        align: "center",
      }
    );

    // --- FIRMA ---
    const signatureY = Math.min(y + 50, footerY - 30); // Asegurar espacio
    doc
      .moveTo(centerX - 100, signatureY)
      .lineTo(centerX + 100, signatureY)
      .stroke();

    doc.text("Firma del paciente o responsable", centerX, signatureY + 5, {
      align: "center",
    });

    doc.end();
  });
};

module.exports = { generarPDF };
