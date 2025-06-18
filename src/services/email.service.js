const enviarEmail = async ({ to, subject, text, pdfBuffer }) => {
  // Simulamos un envío de email
  console.log("Simulando envío de email:");
  console.log(`Para: ${to}`);
  console.log(`Asunto: ${subject}`);
  console.log(`Contenido: ${text}`);
  console.log(`PDF generado (tamaño): ${pdfBuffer.length} bytes`);

  return {
    success: true,
    simulated: true,
    message: "Email simulado enviado correctamente",
    details: {
      to,
      subject,
      pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
    },
  };
};

module.exports = { enviarEmail };
