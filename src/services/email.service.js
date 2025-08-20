// src/services/email.service.js
const nodemailer = require("nodemailer");
const path = require("path");

const MAIL_FROM =
  process.env.MAIL_FROM ||
  `Sandra Alarcón Odontología <${
    process.env.SMTP_USER || process.env.MAIL_USER
  }>`;
const MAIL_HOST = process.env.MAIL_HOST || process.env.SMTP_HOST;
const MAIL_PORT = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
const MAIL_USER = process.env.MAIL_USER || process.env.SMTP_USER;
const MAIL_PASS = process.env.MAIL_PASS || process.env.SMTP_PASS;
const MAIL_SECURE =
  String(
    process.env.MAIL_SECURE || process.env.SMTP_SECURE || ""
  ).toLowerCase() === "true";
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || undefined;

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }
  return transporter;
}

/**
 * Enviar email real con adjuntos e imágenes inline (CID)
 */
async function enviarEmail({
  to,
  subject,
  text,
  html,
  pdfBuffer,
  filename = "cotizacion.pdf",
  inlineImages = [], // [{ path, cid, filename }]
}) {
  const t = getTransporter();

  const attachments = [];

  // Imágenes inline (logo)
  if (inlineImages && inlineImages.length) {
    for (const img of inlineImages) {
      if (!img) continue;
      attachments.push({
        filename: img.filename || path.basename(img.path),
        path: img.path,
        cid: img.cid, // 🔴 clave para inline
      });
    }
  }

  // PDF adjunto
  if (pdfBuffer && pdfBuffer.length) {
    attachments.push({ filename, content: pdfBuffer });
  }

  const mail = {
    from: MAIL_FROM || MAIL_USER, // << debe ser tu Gmail
    to,
    subject,
    text, // alternativo plano
    html, // versión HTML
    attachments,
    ...(MAIL_REPLY_TO ? { replyTo: MAIL_REPLY_TO } : {}),
    headers: {
      "X-Entity-Ref-ID": String(Date.now()), // cabecera “inocua” que ayuda a tracking
    },
  };

  const info = await t.sendMail(mail);
  return { success: true, message: "Email enviado", messageId: info.messageId };
}

module.exports = { enviarEmail };
