// /public/pdf-actions.js
(function (root) {
  async function generarPDFDesdeFormulario() {
    try {
      const algunServicio = document.querySelector(
        ".service-item .servicio-select"
      );
      if (!algunServicio) {
        alert("Agrega al menos un servicio.");
        return;
      }

      const cotizacion = root.PDFPayload.armarPayloadPDFDesdeUI();

      const res = await fetch("/api/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion }),
      });
      if (!res.ok)
        throw new Error(await res.text().catch(() => "Error al generar PDF"));

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
    } catch (e) {
      console.error("Error al generar PDF:", e);
      alert("No se pudo generar el PDF.");
    }
  }

  // Caso 2: desde historial (payload armado en el servidor)
  async function descargarPDF(id) {
    try {
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
    } catch (e) {
      console.error("Error descargando PDF:", e);
      alert("No se pudo descargar el PDF.");
    }
  }

  // Exponerlas
  root.PDFActions = { generarPDFDesdeFormulario, descargarPDF };
  // Para mantener compatibilidad con tu tabla (onclick="descargarPDF(id)")
  root.descargarPDF = descargarPDF;
})(window);
