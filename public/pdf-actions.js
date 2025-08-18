// /public/pdf-actions.js
(function (root) {
  // /public/pdf-actions.js
  async function generarPDFDesdeFormulario() {
    try {
      const algunServicio = document.querySelector(
        ".service-item .servicio-select"
      );
      if (!algunServicio) {
        alert("Agrega al menos un servicio.");
        return;
      }

      const cotizacion = window.PDFPayload.armarPayloadPDFDesdeUI();

      // Genera PDF (esto NO toca la BD)
      const res = await fetch("/api/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion }),
      });
      if (!res.ok)
        throw new Error(await res.text().catch(() => "Error al generar PDF"));

      // Descarga
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion_${(
        cotizacion.nombre_paciente || "paciente"
      ).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Si esta cotización ya existe en BD, actualiza estado a "generada"
      if (window.currentQuoteId) {
        try {
          await window.updateEstadoCotizacion(
            window.currentQuoteId,
            "generada"
          );
          // Optimista: refresca celda y/o listado
          window.updateEstadoEnTabla?.(window.currentQuoteId, "generada");
          window.cargarCotizaciones?.();
        } catch (e) {
          console.warn("No se pudo actualizar el estado a 'generada':", e);
        }
      } else {
        // Si aún es borrador sin guardar, no hay fila en BD que cambiar.
        console.info("PDF generado en modo borrador (sin ID en BD).");
      }
    } catch (e) {
      console.error("Error al generar PDF:", e);
      alert("No se pudo generar el PDF.");
    }
  }

  // Caso 2: desde historial (payload armado en el servidor)

  async function descargarPDF(id) {
    try {
      // UI optimista: pinta ya como "generada"
      window.updateEstadoEnTabla?.(id, "generada");

      const res = await fetch(`/api/cotizaciones/${id}/pdf`);
      if (!res.ok)
        throw new Error(await res.text().catch(() => "Error al generar PDF"));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion_${String(id).padStart(4, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // El backend ya marca "generada" si estaba en borrador.
      // Refresca el historial para ver el estado confirmado.
      window.cargarCotizaciones?.();
    } catch (e) {
      console.error("Error descargando PDF:", e);
      alert("No se pudo descargar el PDF.");
      // Opcional: re-cargar la tabla para no dejar un estado "optimista" incorrecto
      window.cargarCotizaciones?.();
    }
  }

  // Exponer
  window.PDFActions = { generarPDFDesdeFormulario, descargarPDF };
  window.descargarPDF = descargarPDF; // compatibilidad onclick en tabla

  // Exponerlas
  root.PDFActions = { generarPDFDesdeFormulario, descargarPDF };
  // Para mantener compatibilidad con tu tabla (onclick="descargarPDF(id)")
  root.descargarPDF = descargarPDF;
})(window);
