// /public/email-actions.js
(function (root) {
  // Click del botón principal de envío (el que tienes con id="sendEmailBtn")
  async function enviarDesdeFormulario() {
    try {
      // Si ya existe en BD, reutiliza tu flujo por ID
      if (window.currentQuoteId) {
        await window.enviarCotizacion(window.currentQuoteId);
        return;
      }

      // Arma payload desde la UI (borrador)
      const cotizacion = window.PDFPayload.armarPayloadPDFDesdeUI();
      const to = (cotizacion.correo_paciente || "").trim();

      if (!to) {
        alert("Debes ingresar el correo del paciente antes de enviar.");
        return;
      }

      // Validar que exista al menos 1 procedimiento
      if (
        !Array.isArray(cotizacion.procedimientos) ||
        cotizacion.procedimientos.length === 0
      ) {
        alert("Agrega al menos un servicio antes de enviar.");
        return;
      }

      const totalNeto = cotizacion?._totales?.total_neto ?? 0;

      const confirmar = confirm(
        `¿Enviar cotización a ${to}?\n\n` +
          `Paciente: ${cotizacion.nombre_paciente || "(sin nombre)"}\n` +
          `Total: $${Number(totalNeto).toLocaleString("es-CO")}`
      );
      if (!confirmar) return;

      // POST al backend para generar PDF en memoria y enviar
      const res = await fetch("/api/cotizaciones/enviar-borrador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "No se pudo enviar el correo.");
      }

      const data = await res.json();
      alert(`Listo: ${data.message || "Correo enviado"}`);
      // No hay estado en BD porque es borrador; solo feedback al usuario.
    } catch (err) {
      console.error("Error enviando desde formulario:", err);
      alert("Ocurrió un error enviando la cotización.");
    }
  }

  // Exponer para tu addListener existente
  root.enviarDesdeFormulario = enviarDesdeFormulario;
})(window);
