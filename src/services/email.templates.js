// src/services/email.templates.js
function ahoraBogota() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
}
function saludoSegunHora() {
  const h = ahoraBogota().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const LOGO_CID = "clinic-logo";

function firmaDatos() {
  const name = process.env.CLINIC_NAME || "Clínica Odontológica";
  const addr = process.env.CLINIC_ADDRESS || "";
  const phone = process.env.CLINIC_PHONE || "";
  const mail = process.env.CLINIC_EMAIL || "";
  const web = process.env.CLINIC_WEBSITE || "";
  const slogan =
    process.env.CLINIC_SLOGAN || "¡Tu sonrisa en las mejores manos!";
  const cta = process.env.CLINIC_CTA || "¡Agenda tu cita hoy mismo!";

  // Texto plano
  const texto =
    "\n" +
    [
      name,
      slogan,
      addr ? `Visítanos en: ${addr}` : null,
      phone ? `Tel: ${phone}` : null,
      mail || null,
      web || null,
      cta,
    ]
      .filter(Boolean)
      .join("\n");

  // HTML con logo por CID
  const html = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px">
      <tr>
        <td style="vertical-align:top;padding-right:12px">
          ${
            process.env.MAIL_LOGO_FILE
              ? `<img src="cid:${LOGO_CID}" alt="${name}" style="display:block; max-width:160px; height:auto;" />`
              : ""
          }
        </td>
        <td style="vertical-align:top; font:14px/1.6 Arial,Helvetica,sans-serif; color:#222">
          <div style="font-weight:600">${name}</div>
          <div style="margin-top:4px">${slogan}</div>
          ${addr ? `<div><strong>Visítanos en:</strong> ${addr}</div>` : ""}
          ${
            phone
              ? `<div><strong>Tel:</strong> <a href="tel:${phone.replace(
                  /\s+/g,
                  ""
                )}">${phone}</a></div>`
              : ""
          }
          ${mail ? `<div><a href="mailto:${mail}">${mail}</a></div>` : ""}
          ${web ? `<div><a href="${web}">${web}</a></div>` : ""}
          <div style="margin-top:8px;"><em>${cta}</em></div>
        </td>
      </tr>
    </table>
  `.trim();

  return { texto, html, logoCid: process.env.MAIL_LOGO_FILE ? LOGO_CID : null };
}

function construirAsuntoYMensaje({ payload, numeroTexto }) {
  const saludo = saludoSegunHora();
  const paciente = payload.nombre_paciente || "Paciente";
  const total = Number(payload?._totales?.total_neto || 0).toLocaleString(
    "es-CO"
  );
  const asunto = `Cotización odontológica ${
    numeroTexto ? `#${numeroTexto}` : ""
  } – Sandra Alarcón`.trim();

  const { texto: firmaTexto, html: firmaHTML, logoCid } = firmaDatos();

  const cuerpoPlano = `${saludo} ${paciente},

Adjunto encontrará la cotización de los procedimientos recomendados por nuestro equipo.

Detalles:
- Número de cotización: ${numeroTexto || "Borrador"}
- Total: $${total}

Si tiene alguna pregunta, desea ajustar el plan o coordinar su cita, con gusto le atendemos por este medio.

Atentamente,
Sandra Alarcón Odontología Especializada${firmaTexto}`.trim();

  const cuerpoHTML = `
  <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#222;">
    <p>${saludo} ${paciente},</p>
    <p>Adjunto encontrará la <strong>cotización</strong> de los procedimientos recomendados por nuestro equipo.</p>
    <p><strong>Detalles:</strong><br/>
      Número de cotización: <strong>${numeroTexto || "Borrador"}</strong><br/>
      Total: <strong>$${total}</strong>
    </p>
    <p>Si tiene alguna pregunta, desea ajustar el plan o coordinar su cita, con gusto le atendemos por este medio.</p>
    <p>Atentamente,<br/>
    <strong>Sandra Alarcón Odontología Especializada</strong></p>
    ${firmaHTML}
  </div>`.trim();

  return { asunto, cuerpoPlano, cuerpoHTML, logoCid };
}

module.exports = { construirAsuntoYMensaje };
