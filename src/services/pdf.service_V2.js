// services/pdf.service_V2.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ===== Helpers comunes =====
const THEME = {
  primary: "#247B97",
  secondary: "#E59CAF",
  accent: "#D6C39F",
  dark: "#1B1B1B",
  light: "#FFFFFF",
};
const PAGE = {
  size: "A4",
  margins: { top: 40, bottom: 40, left: 40, right: 40 },
};
const MARGIN = 40;
const FOOTER_H = 30;

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
function formatoFecha(fecha) {
  const opciones = { year: "numeric", month: "long", day: "numeric" };
  return new Date(fecha).toLocaleDateString("es-CO", opciones);
}
const imgSafe = (doc, p, x, y, opt) => {
  try {
    if (p) doc.image(p, x, y, opt);
  } catch (_) {}
};
const exists = (p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};
const setFont = (doc, name, size, color) =>
  doc.font(name).fontSize(size).fillColor(color);

// ===== Registro de fuentes =====
function registerFonts(doc) {
  const f = (name, file) =>
    doc.registerFont(name, path.join(__dirname, "fonts", file));
  f("Poppins-Regular", "PoppinsRegular-B2Bw.otf");
  f("Poppins-Bold", "PoppinsBold-GdJA.otf");
  f("OpenSans-Regular", "OpenSans-B9K8.ttf");
  f("OpenSans-Bold", "OpenSansBold-8wJJ.ttf");
}

// ===== Header / Footer =====
function renderFooter(doc) {
  doc
    .rect(0, doc.page.height - FOOTER_H, doc.page.width, FOOTER_H)
    .fill(THEME.secondary);
}

function renderHeader(doc, cotizacion, dims) {
  const { contentWidth } = dims;
  doc.y = doc.page.margins.top;

  // Logo principal (opcional)
  imgSafe(doc, cotizacion.logoPath, MARGIN, MARGIN, { width: 100 });

  // Logo pequeño (si existe)
  const smallLogo = path.join(
    __dirname,
    "..",
    "..",
    "public",
    "logo-sandra.png"
  );
  let titleX = MARGIN,
    titleY = MARGIN;
  if (exists(smallLogo)) {
    const w = 80,
      estimatedH = 24;
    imgSafe(doc, smallLogo, MARGIN, MARGIN, { width: w });
    titleX += w + 10;
    titleY += (estimatedH - 20) / 2;
  }

  // Título
  setFont(doc, "Poppins-Bold", 20, THEME.dark).text(
    "COTIZACIÓN DEL TRATAMIENTO",
    titleX,
    titleY,
    {
      width: contentWidth - (titleX - MARGIN),
    }
  );
  const titleBottom = doc.y;

  // Versión + línea
  const FECHA_DOC =
    cotizacion.fecha_creacion || cotizacion.fecha || new Date().toISOString();

  const versionText = `MV-F-001 VERSIÓN 01; ${formatoFecha(
    FECHA_DOC
  ).toUpperCase()}`;

  setFont(doc, "OpenSans-Regular", 10, THEME.dark);
  const lineH = doc.currentLineHeight();
  const textW = doc.widthOfString(versionText);
  const versionX = MARGIN + contentWidth - textW;
  const versionY = titleBottom + 10;
  const lineY = versionY + lineH / 2;

  doc
    .save()
    .lineWidth(2)
    .strokeColor(THEME.secondary)
    .moveTo(MARGIN, lineY)
    .lineTo(versionX - 30, lineY)
    .stroke()
    .restore();

  doc.text(versionText, versionX, versionY, { lineBreak: false });

  // Datos de la clínica / número
  const clinicY = versionY + lineH + 15;
  setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
    "Av. C. 127 #19A-28,\nBogotá D.C. Colombia\nEmail: spaortodoncia@hotmail.com\nwww.drasandraalarcon.com.co",
    MARGIN,
    clinicY
  );
  setFont(doc, "Poppins-Bold", 10, THEME.dark).text(
    `COTIZACIÓN MV-${cotizacion.numero}`,
    MARGIN,
    clinicY,
    {
      align: "right",
      width: contentWidth,
    }
  );
  setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
    `Bogotá, ${formatoFecha(FECHA_DOC)}`,
    MARGIN,
    doc.y + 4,
    {
      align: "right",
      width: contentWidth,
    }
  );

  // Doctora / Paciente / Documento
  const infoY = doc.y + 30;
  const labels = ["DOCTORA:", "PACIENTE:", "CORREO:"];
  const values = [
    cotizacion.doctora,
    cotizacion.nombre_paciente,
    cotizacion.correo ||
      cotizacion.correo_paciente ||
      cotizacion.correo ||
      cotizacion.email ||
      "",
  ];
  setFont(doc, "Poppins-Bold", 10, THEME.dark);
  const rowH = doc.currentLineHeight();
  labels.forEach((lbl, i) => {
    const y = infoY + i * rowH;
    doc.text(lbl, MARGIN, y);
    setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
      values[i] ?? "",
      MARGIN + 90,
      y
    );
    setFont(doc, "Poppins-Bold", 10, THEME.dark);
  });

  return infoY + labels.length * rowH + 20; // headerBottomY
}

// ===== Tabla =====
class TablaPDF {
  constructor(doc, cfg) {
    this.doc = doc;
    this.cfg = cfg;
    this.y = cfg.startY ?? doc.y;
  }
  topY() {
    return this.cfg.getTopY
      ? this.cfg.getTopY()
      : this.cfg.headerBottomY || this.doc.y;
  }
  ensure(h) {
    const bottom = this.doc.page.height - this.cfg.footerHeight - 20;
    if (this.y + h > bottom) {
      this.doc.addPage();
      this.y = this.topY();
    }
  }
  addGap(rows = 1) {
    const h = rows * (this.cfg.rowMinH || 18);
    this.ensure(h);
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addHeader(text, fill, color, _ignore, rightText = "") {
    const { margin, contentWidth, fz } = this.cfg;
    const h = this.cfg.headerH || 24;
    this.ensure(h);
    this.doc.rect(margin, this.y, contentWidth, h).fill(fill);
    // Título
    setFont(this.doc, "Poppins-Bold", fz.phase ?? 14, color);
    const tH = this.doc.heightOfString(String(text), {
      width: contentWidth,
      align: "center",
    });
    this.doc.text(String(text), margin, this.y + (h - tH) / 2, {
      width: contentWidth,
      align: "center",
    });
    // Duración a la derecha
    if (rightText) {
      setFont(this.doc, "OpenSans-Bold", fz.duration ?? 11, color);
      const rightW = contentWidth - 10;
      const dH = this.doc.heightOfString(String(rightText), {
        width: rightW,
        align: "right",
      });
      this.doc.text(String(rightText), margin, this.y + (h - dH) / 2, {
        width: rightW,
        align: "right",
      });
    }
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addSectionTitle(text) {
    const { margin, contentWidth, fz } = this.cfg;
    const h = this.cfg.sectionH || 18;
    this.ensure(h);
    setFont(this.doc, "OpenSans-Bold", fz.section ?? 10, this.cfg.dark);
    const t = String(text ?? "").toUpperCase();
    const tH = this.doc.heightOfString(t, {
      width: contentWidth,
      align: "center",
    });
    this.doc.text(t, margin, this.y + (h - tH) / 2, {
      width: contentWidth,
      align: "center",
    });
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addSubheader(text, fill = null, color = this.cfg.dark) {
    const { margin, contentWidth, fz } = this.cfg;
    const h = this.cfg.categoryH || 16;
    this.ensure(h);
    if (fill) this.doc.rect(margin, this.y, contentWidth, h).fill(fill);
    setFont(this.doc, "OpenSans-Bold", fz.category ?? 10, color);
    const t = String(text ?? "").toUpperCase();
    const tH = this.doc.heightOfString(t, {
      width: contentWidth,
      align: "center",
    });
    this.doc.text(t, margin, this.y + (h - tH) / 2, {
      width: contentWidth,
      align: "center",
    });
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addColumnsHeader() {
    const { margin, contentWidth, columns, fz } = this.cfg;
    const h = this.cfg.columnsH || 16;
    this.ensure(h);
    this.doc.rect(margin, this.y, contentWidth, h).fill("#000");
    let x = margin;
    columns.forEach((c) => {
      setFont(this.doc, "OpenSans-Bold", fz.columns ?? 8.5, "#fff");
      const tH = this.doc.heightOfString(c.name, {
        width: c.width - 12,
        align: c.align || "left",
      });
      this.doc.text(c.name, x + 6, this.y + (h - tH) / 2, {
        width: c.width - 12,
        align: c.align || "left",
        lineBreak: false,
      });
      x += c.width;
    });
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addBarRow(fill, left, right, color = "#fff") {
    const { margin, contentWidth, fz } = this.cfg;
    const h = this.cfg.headerH || 24;
    this.ensure(h);
    this.doc.rect(margin, this.y, contentWidth, h).fill(fill);
    setFont(this.doc, "Poppins-Bold", fz.totalBar ?? 11.5, color);
    const leftW = contentWidth / 2 - 20;
    const lH = this.doc.heightOfString(String(left ?? ""), {
      width: leftW,
      align: "left",
    });
    this.doc.text(String(left ?? ""), margin + 10, this.y + (h - lH) / 2, {
      width: leftW,
      align: "left",
    });
    const rightW = contentWidth - 10;
    const rH = this.doc.heightOfString(String(right ?? ""), {
      width: rightW,
      align: "right",
    });
    this.doc.text(String(right ?? ""), margin, this.y + (h - rH) / 2, {
      width: rightW,
      align: "right",
    });
    this.y += h;
    this.doc.y = this.y;
    return this;
  }

  addRow(cells, odd = false) {
    const {
      margin,
      contentWidth,
      columns,
      accent,
      dark,
      rowMinH = 16,
      rowPad = 4,
      fz,
    } = this.cfg;
    const fs = fz.row ?? 8.5;
    const heights = cells.map((cell, i) => {
      const w = columns[i].width - rowPad * 2;
      setFont(this.doc, "OpenSans-Regular", fs, dark);
      const h = this.doc.heightOfString(String(cell.value ?? ""), {
        width: w,
        align: cell.align || columns[i].align || "left",
      });
      return Math.max(rowMinH, h + rowPad * 2);
    });
    const h = Math.max(...heights);
    this.ensure(h);
    if (odd)
      this.doc.rect(margin, this.y, contentWidth, h).fill(accent || "#d6c39f");

    let x = margin;
    cells.forEach((cell, i) => {
      const col = columns[i];
      const w = col.width - rowPad * 2;
      const tH = this.doc.heightOfString(String(cell.value ?? ""), {
        width: w,
        align: cell.align || col.align || "left",
      });
      setFont(this.doc, "OpenSans-Regular", fs, dark).text(
        String(cell.value ?? ""),
        x + rowPad,
        this.y + (h - tH) / 2,
        {
          width: w,
          align: cell.align || col.align || "left",
        }
      );
      x += col.width;
    });

    // Bordes verticales
    this.doc
      .save()
      .strokeColor(accent || "#d6c39f")
      .lineWidth(0.5);
    let vx = margin;
    for (let i = 0; i <= columns.length; i++) {
      this.doc
        .moveTo(vx, this.y)
        .lineTo(vx, this.y + h)
        .stroke();
      vx += i < columns.length ? columns[i].width : 0;
    }
    this.doc
      .moveTo(margin + contentWidth, this.y)
      .lineTo(margin + contentWidth, this.y + h)
      .stroke()
      .restore();

    this.y += h;
    this.doc.y = this.y;
    return this;
  }
}

// ===== Transformación de datos (procedimientos → fases/secciones/categorías) =====
function buildPhases(procedimientos = []) {
  const map = procedimientos.reduce((acc, p) => {
    const fase = String(p.fase ?? "");
    acc[fase] ||= {
      duration: p.duracion,
      unit: p.duracion_unidad,
      sections: {},
    };
    const ph = acc[fase];

    const secKey = `${p.especialidad_codigo}|${p.especialidad_nombre}`;
    ph.sections[secKey] ||= {
      title: `${p.especialidad_codigo} – ${p.especialidad_nombre}`,
      categories: {},
    };

    const cat = p.subcategoria_nombre || "OTROS";
    ph.sections[secKey].categories[cat] ||= [];
    ph.sections[secKey].categories[cat].push({
      code: p.codigo,
      desc: p.nombre_servicio,
      units: p.unidad ?? "",
      price: Number(p.precio_unitario || 0),
      discount: p.descuento ?? "N.A",
      total: Number(p.total || 0),
    });
    return acc;
  }, {});

  return Object.entries(map).map(([key, ph]) => ({
    key,
    duration: ph.duration,
    unit: ph.unit,
    sections: Object.values(ph.sections).map((sec) => ({
      title: sec.title,
      categories: Object.entries(sec.categories).map(([name, services]) => ({
        name,
        services,
      })),
    })),
  }));
}

// ===== Secciones sin fases (por especialidad -> categoría) =====
function buildSectionsNoPhase(procedimientos = []) {
  const map = procedimientos.reduce((acc, p) => {
    const secKey = `${p.especialidad_codigo}|${p.especialidad_nombre}`;
    acc[secKey] ||= {
      title: `${p.especialidad_codigo} – ${p.especialidad_nombre}`,
      categories: {},
    };
    const cat = p.subcategoria_nombre || "OTROS";
    acc[secKey].categories[cat] ||= [];
    acc[secKey].categories[cat].push({
      code: p.codigo,
      desc: p.nombre_servicio,
      units: p.unidad ?? "",
      price: Number(p.precio_unitario || 0),
      discount: p.descuento ?? "N.A",
      total: Number(p.total || 0),
    });
    return acc;
  }, {});

  // → [{ title, categories:[{ name, services:[] }, ...] }, ...]
  return Object.values(map).map((sec) => ({
    title: sec.title,
    categories: Object.entries(sec.categories).map(([name, services]) => ({
      name,
      services,
    })),
  }));
}

// ===== Servicio principal =====
const generarPDF = async (cotizacion) =>
  new Promise((resolve, reject) => {
    try {
      const fileName = `cotizacion-${cotizacion.numero}.pdf`;
      const filePath = path.join(__dirname, fileName);
      const doc = new PDFDocument(PAGE);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      registerFonts(doc);

      const contentWidth = doc.page.width - MARGIN * 2;
      let headerBottomY = renderHeader(doc, cotizacion, { contentWidth });
      renderFooter(doc);

      doc.on("pageAdded", () => {
        headerBottomY = renderHeader(doc, cotizacion, { contentWidth });
        renderFooter(doc);
      });

      const ensure = (h) => {
        const minY = headerBottomY + 10;
        if (doc.y < minY) doc.y = minY;
        const bottom = doc.page.height - FOOTER_H - 20;
        if (doc.y + h > bottom) {
          doc.addPage();
          doc.y = headerBottomY + 10;
        }
      };

      // ===== Tabla adaptable (con o sin fases) =====
      doc.y = headerBottomY;
      let totalGeneral = 0;

      const tabla = new TablaPDF(doc, {
        margin: MARGIN,
        startY: headerBottomY,
        contentWidth,
        footerHeight: FOOTER_H,
        getTopY: () => headerBottomY + 10,

        headerH: 22,
        categoryH: 16,
        sectionH: 16,
        columnsH: 16,
        rowMinH: 16,
        rowPad: 4,

        fz: {
          phase: 14,
          duration: 11,
          section: 10,
          category: 10,
          columns: 8.5,
          row: 8.5,
          totalBar: 11.5,
        },

        columns: [
          { name: "CÓDIGO", width: 55, align: "center" },
          { name: "DESCRIPCIÓN", width: 190, align: "left" },
          { name: "UNIDADES", width: 60, align: "center" },
          { name: "PRECIO NETO", width: 70, align: "right" },
          { name: "DESCUENTO", width: 80, align: "center" },
          { name: "TOTAL", width: 60, align: "right" },
        ],

        primary: THEME.primary,
        secondary: THEME.secondary,
        accent: THEME.accent,
        dark: THEME.dark,
        light: THEME.light,
      });

      // Si el toggle no viene, por defecto = true (se agrupa por fases)
      const agruparPorFase =
        (cotizacion.agrupar_por_fase ?? cotizacion.group_by_phase) !== false;

      // ---- MODO 1: AGRUPADO POR FASES (comportamiento actual) ----
      if (agruparPorFase) {
        const phases = buildPhases(cotizacion.procedimientos);
        const obsMap = cotizacion.observaciones_fases || {};

        phases.forEach((phase, idxPhase) => {
          tabla.addHeader(
            `FASE ${phase.key}`,
            THEME.primary,
            THEME.light,
            16,
            `${phase.duration ?? ""} ${phase.unit ?? ""}`
          );

          let totalPhase = 0;

          // Tokens de observaciones de esta fase, por posición de sección
          const obsStr = Array.isArray(obsMap)
            ? obsMap[Number(phase.key)]
            : obsMap[String(phase.key)];
          const obsTokens = String(obsStr || "")
            .split("|")
            .map((s) => s.trim());

          phase.sections.forEach((section, idxSection) => {
            tabla.addSectionTitle(section.title).addColumnsHeader();

            let totalSection = 0;

            section.categories.forEach((category) => {
              tabla.addSubheader(category.name, THEME.secondary, THEME.light);
              category.services.forEach((svc, i) => {
                tabla.addRow(
                  [
                    { value: svc.code, align: "center" },
                    { value: svc.desc, align: "left" },
                    { value: svc.units, align: "center" },
                    { value: money(svc.price), align: "right" },
                    { value: svc.discount, align: "center" },
                    { value: money(svc.total), align: "right" },
                  ],
                  i % 2 === 1
                );
                totalSection += Number(svc.total || 0);
              });
            });

            //tabla.addBarRow("#0f172a", "TOTAL SECCIÓN", money(totalSection));
            totalPhase += totalSection;

            // ---- Observación de ESTA SECCIÓN (por índice en obsTokens) ----
            const obsDeSeccion = obsTokens[idxSection];
            if (obsDeSeccion) {
              const PAD = 8;
              const title = `Observaciones Fase ${phase.key} — ${section.title}`;
              const hTitle = setFont(
                doc,
                "Poppins-Bold",
                10,
                THEME.dark
              ).heightOfString(title, { width: contentWidth - PAD * 2 });
              const hText = setFont(
                doc,
                "OpenSans-Regular",
                10,
                THEME.dark
              ).heightOfString(obsDeSeccion, { width: contentWidth - PAD * 2 });
              const boxH = PAD + hTitle + 4 + hText + PAD;

              ensure(boxH);
              const y0 = doc.y;

              doc
                .save()
                .lineWidth(1)
                .strokeColor(THEME.dark)
                .rect(MARGIN, y0, contentWidth, boxH)
                .stroke()
                .restore();

              setFont(doc, "Poppins-Bold", 10, THEME.dark).text(
                title,
                MARGIN + PAD,
                y0 + PAD,
                { width: contentWidth - PAD * 2 }
              );
              setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
                obsDeSeccion,
                MARGIN + PAD,
                y0 + PAD + hTitle + 4,
                {
                  width: contentWidth - PAD * 2,
                }
              );

              doc.y = y0 + boxH + 4;
              tabla.y = doc.y;
            }

            if (idxSection !== phase.sections.length - 1) tabla.addGap(0.25);
          });

          // total de la fase (una sola vez)
          tabla.addBarRow("#0f172a", "TOTAL", money(totalPhase));
          totalGeneral += totalPhase;

          if (idxPhase !== phases.length - 1) tabla.addGap(0.25);
        });

        // ---- MODO 2: SIN FASES (plano por especialidad/categoría) ----
      } else {
        let printedAnySectionObs = false;
        // helper para sacar el código "01", "07" del título "01 – ODONTOLOGIA..."
        const getCodeFromSectionTitle = (t) => {
          const m = String(t).match(/^\s*0?(\d+)/);
          return m ? m[1].padStart(2, "0") : null;
        };

        const obsArray = Array.isArray(cotizacion.observaciones_por_categoria)
          ? cotizacion.observaciones_por_categoria
          : null;

        // Fallback: si viene solo un string desde BD (ej: "1 |  | 3"), lo partimos por posición
        const obsTokensNoFase =
          !obsArray && typeof cotizacion.observaciones_generales === "string"
            ? cotizacion.observaciones_generales.split("|").map((s) => s.trim())
            : [];

        const sections = buildSectionsNoPhase(cotizacion.procedimientos);

        // Un header general para toda la tabla
        tabla.addHeader("TRATAMIENTOS", THEME.primary, THEME.light);

        sections.forEach((section, idx) => {
          tabla.addSectionTitle(section.title).addColumnsHeader();

          section.categories.forEach((category) => {
            tabla.addSubheader(category.name, THEME.secondary, THEME.light);

            category.services.forEach((svc, i) => {
              tabla.addRow(
                [
                  { value: svc.code, align: "center" },
                  { value: svc.desc, align: "left" },
                  { value: svc.units, align: "center" },
                  { value: money(svc.price), align: "right" },
                  { value: svc.discount, align: "center" },
                  { value: money(svc.total), align: "right" },
                ],
                i % 2 === 1
              );
              totalGeneral += Number(svc.total || 0);
            });
          });

          // Total por sección (opcional, queda bonito)
          const totalSection = section.categories
            .flatMap((c) => c.services)
            .reduce((s, it) => s + Number(it.total || 0), 0);
          tabla.addBarRow("#0f172a", "TOTAL SECCIÓN", money(totalSection));

          if (idx !== sections.length - 1) tabla.addGap(0.25);

          // --- Observación POR SECCIÓN (array del payload O fallback por índice) ---
          let obsDeEstaSeccion = null;

          if (obsArray) {
            const secCode = getCodeFromSectionTitle(section.title);
            obsDeEstaSeccion = obsArray.find(
              (o) => String(o?.especialidad_codigo).padStart(2, "0") === secCode
            )?.observacion;
          } else {
            // Fallback BD: mismo índice que la sección
            obsDeEstaSeccion = obsTokensNoFase[idx];
          }

          if (obsDeEstaSeccion && obsDeEstaSeccion.trim()) {
            printedAnySectionObs = true;

            const PAD = 8;
            const title = `Observaciones — ${section.title}`;
            const hTitle = setFont(
              doc,
              "Poppins-Bold",
              10,
              THEME.dark
            ).heightOfString(title, { width: contentWidth - PAD * 2 });
            const hText = setFont(
              doc,
              "OpenSans-Regular",
              10,
              THEME.dark
            ).heightOfString(obsDeEstaSeccion, {
              width: contentWidth - PAD * 2,
            });
            const boxH = PAD + hTitle + 4 + hText + PAD;

            ensure(boxH);
            const y0 = doc.y;

            doc
              .save()
              .lineWidth(1)
              .strokeColor(THEME.dark)
              .rect(MARGIN, y0, contentWidth, boxH)
              .stroke()
              .restore();

            setFont(doc, "Poppins-Bold", 10, THEME.dark).text(
              title,
              MARGIN + PAD,
              y0 + PAD,
              { width: contentWidth - PAD * 2 }
            );
            setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
              obsDeEstaSeccion,
              MARGIN + PAD,
              y0 + PAD + hTitle + 4,
              {
                width: contentWidth - PAD * 2,
              }
            );

            doc.y = y0 + boxH + 4;
            tabla.y = doc.y;
          }
        });

        // Observaciones globales solo si NO hubo por sección
        if (!printedAnySectionObs) {
          doc.y = Math.max(doc.y, tabla.y);
          const obsGlobal =
            cotizacion.observaciones_generales ??
            (() => {
              const src = cotizacion.observaciones_fases;
              if (!src) return null;
              const vals = Array.isArray(src) ? src : Object.values(src);
              const joined = vals.filter(Boolean).join("\n");
              return joined || null;
            })();

          if (obsGlobal) {
            const PAD = 8;
            const GAP_AFTER_BOX = 4;
            const title = "Observaciones";

            const hTitle = setFont(
              doc,
              "Poppins-Bold",
              10,
              THEME.dark
            ).heightOfString(title, { width: contentWidth - PAD * 2 });
            const hText = setFont(
              doc,
              "OpenSans-Regular",
              10,
              THEME.dark
            ).heightOfString(obsGlobal, { width: contentWidth - PAD * 2 });
            const boxH = PAD + hTitle + 4 + hText + PAD;

            ensure(boxH);
            const y0 = doc.y;

            doc
              .save()
              .lineWidth(1)
              .strokeColor(THEME.dark)
              .rect(MARGIN, y0, contentWidth, boxH)
              .stroke()
              .restore();

            setFont(doc, "Poppins-Bold", 10, THEME.dark).text(
              title,
              MARGIN + PAD,
              y0 + PAD,
              { width: contentWidth - PAD * 2 }
            );

            setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
              obsGlobal,
              MARGIN + PAD,
              y0 + PAD + hTitle + 4,
              { width: contentWidth - PAD * 2 }
            );

            doc.y = y0 + boxH + GAP_AFTER_BOX;
            tabla.y = doc.y;
          }
        }
      }

      // TOTAL GENERAL
      tabla.addBarRow(THEME.primary, "TOTAL GENERAL", money(totalGeneral));
      tabla.addGap(1);

      // ===== Método de pago =====

      (() => {
        const BOX = 12;
        const TITLE_GAP = 10;
        const LINE_H = 14;
        const CHECK_GAP = 8;

        const pago = cotizacion.pago || {};
        const metodo =
          pago.metodo ?? (pago.numero_cuotas > 0 ? "aplazado" : "unico");
        const fmt = (v) => `$ ${Number(v || 0).toLocaleString("es-CO")}`;

        // Detecta modalidad ortodoncia + aplazado
        const esOrtodApl = metodo === "aplazado" && (
          pago.tipo === "cuotas_ortodoncia" ||
          (pago.cuota_inicial_1 != null && pago.cuota_inicial_2 != null)
        );

        // <-- NUEVO: solo mostramos FH si es booleano (true/false)
        const showFH = typeof pago.fase_higienica_incluida === "boolean";

        const lines = [
          {
            type: "checkbox",
            text: " Pago único",
            checked: metodo === "unico",
          },
          pago.numero_cuotas != null
            ? {
                type: "checkbox",
                text: ` Pago aplazado en ${pago.numero_cuotas} cuotas:`,
                checked: metodo === "aplazado",
              }
            : null,
          pago.cuota_inicial != null
            ? {
                type: "text",
                text: `Cuota inicial: ${fmt(pago.cuota_inicial)}`,
              }
            : null,
            //si tiene cuotas 1 y 2
            pago.cuota_inicial_1 != null
            ? {
              type: "text",
              text: `Cuota 1 (15%): ${fmt(pago.cuota_inicial_1)}`,
            }
            :null,
            pago.cuota_inicial_2 != null
            ? {
              type: "text",
              text: `Cuota 2 (15%): ${fmt(pago.cuota_inicial_2)}`,
            }
            :null,
          pago.numero_cuotas != null && pago.valor_cuota != null
            ? {
                type: "text",
                text: `Cuotas mensuales: ${pago.numero_cuotas} x ${fmt(
                  pago.valor_cuota
                )}`,
              }
            : null,
          pago.valor_pagado_a_la_fecha != null
            ? {
                type: "text",
                text: `Pagado a la fecha: ${fmt(pago.valor_pagado_a_la_fecha)}`,
              }
            : null,
          // <-- NUEVO: se agrega solo si hay selección (sí/no)
          showFH ? { type: "fh" } : null,
        ].filter(Boolean);

        const hTitle = setFont(
          doc,
          "Poppins-Bold",
          14,
          THEME.dark
        ).heightOfString("MÉTODO DE PAGO", { width: contentWidth });
        const blockH = hTitle + TITLE_GAP + lines.length * LINE_H + 8;
        ensure(blockH);

        setFont(doc, "Poppins-Bold", 14, THEME.dark).text(
          "MÉTODO DE PAGO",
          MARGIN,
          doc.y,
          { width: contentWidth, align: "left" }
        );
        doc.y += TITLE_GAP;

        const drawCheck = (x, y, checked) => {
          doc.rect(x, y, BOX, BOX).stroke(THEME.dark);
          if (checked) {
            doc
              .moveTo(x + 2, y + BOX / 2)
              .lineTo(x + BOX / 2, y + BOX - 2)
              .lineTo(x + BOX - 2, y + 2)
              .stroke(THEME.dark);
          }
        };

        lines.forEach((row) => {
          const y0 = doc.y;
          if (row.type === "checkbox" && row.text) {
            drawCheck(MARGIN, y0, row.checked);
            setFont(doc, "OpenSans-Regular", 12, THEME.dark).text(
              row.text,
              MARGIN + BOX + CHECK_GAP,
              y0 - 1,
              {
                lineBreak: false,
                width: contentWidth - (BOX + CHECK_GAP),
              }
            );
            doc.y = y0 + LINE_H;
          } else if (row.type === "text" && row.text) {
            setFont(doc, "OpenSans-Regular", 12, THEME.dark).text(
              row.text,
              MARGIN,
              y0,
              { lineBreak: false, width: contentWidth }
            );
            doc.y = y0 + LINE_H;
          } else if (row.type === "fh") {
            const baseY = y0;
            const label = "Fase higiénica incluida:";
            setFont(doc, "OpenSans-Regular", 12, THEME.dark).text(
              label,
              MARGIN,
              baseY,
              { lineBreak: false }
            );
            const labelW = doc.widthOfString(label);

            const boxY = baseY + (LINE_H - BOX) / 2;
            const SP = CHECK_GAP * 2;

            const yesX = MARGIN + labelW + CHECK_GAP;
            drawCheck(yesX, boxY, pago.fase_higienica_incluida === true);
            setFont(doc, "OpenSans-Regular", 12, THEME.dark).text(
              "Sí",
              yesX + BOX + CHECK_GAP,
              baseY,
              { lineBreak: false }
            );
            const siW = doc.widthOfString("Sí");

            const noX = yesX + BOX + CHECK_GAP + siW + SP;
            drawCheck(noX, boxY, pago.fase_higienica_incluida === false);
            setFont(doc, "OpenSans-Regular", 12, THEME.dark).text(
              "No",
              noX + BOX + CHECK_GAP,
              baseY,
              { lineBreak: false }
            );

            doc.y = baseY + LINE_H;
          }
        });

        doc.moveDown(0.5);
        tabla.y = doc.y;
      })();

      // ===== Firmas (bloque atómico, tamaño fijo, autosalto) =====
      (() => {
        const GAP_BEFORE = 24; // espacio fijo encima del bloque de firmas
        const SIGN_H = 90; // altura fija del bloque de firmas

        // Siempre parte desde el final real del contenido previo
        doc.y = Math.max(doc.y, tabla.y);

        // Si no caben GAP + firmas completas, pasa a la siguiente página
        ensure(GAP_BEFORE + SIGN_H);

        // Aplica el espacio fijo arriba del bloque
        doc.y += GAP_BEFORE;

        const startY = doc.y; // ancla del bloque

        // === Firma doctora (izquierda) ===
        setFont(doc, "Poppins-Bold", 12, THEME.dark).text(
          "SANDRA P. ALARCON G.",
          MARGIN,
          startY,
          { width: 200, align: "center" }
        );
        doc
          .moveTo(MARGIN, startY + 30)
          .lineTo(MARGIN + 200, startY + 30)
          .stroke(THEME.dark);
        setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
          "Ortodoncista – Ortopedia Maxilar",
          MARGIN,
          startY + 34,
          { width: 200, align: "center" }
        );

        // === Firma paciente (derecha) ===
        const rightW = 200;
        const rightX = MARGIN + (doc.page.width - MARGIN * 2) - rightW; // alinear al borde derecho del contenido
        setFont(doc, "Poppins-Bold", 12, THEME.dark).text(
          "RECIBÍ Y APROBÉ:",
          rightX,
          startY,
          { width: rightW, align: "center" }
        );
        doc
          .moveTo(rightX, startY + 30)
          .lineTo(rightX + rightW, startY + 30)
          .stroke(THEME.dark);
        setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
          "Firma Paciente",
          rightX,
          startY + 34,
          { width: rightW, align: "center" }
        );

        // === Fecha bajo la firma del paciente (opcional) ===
        const fechaAprob = cotizacion.firma_paciente_fecha
          ? new Date(cotizacion.firma_paciente_fecha)
          : null;
        const fechaStr = fechaAprob
          ? `${String(fechaAprob.getDate()).padStart(2, "0")}/${String(
              fechaAprob.getMonth() + 1
            ).padStart(2, "0")}/${fechaAprob.getFullYear()}`
          : "____/____/_____";
        setFont(doc, "OpenSans-Regular", 10, THEME.dark).text(
          `Fecha: ${fechaStr}`,
          rightX,
          startY + 48,
          { width: rightW, align: "center" }
        );

        // Cierra el bloque: fija la altura y sincroniza cursores
        doc.y = startY + SIGN_H;
        tabla.y = doc.y;
      })();

      // ===== Cierre =====
      doc.end();
      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });

module.exports = { generarPDF };
