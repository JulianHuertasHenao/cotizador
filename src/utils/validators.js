const Joi = require("joi");

const procedimientoSchema = Joi.object({
  nombre_servicio: Joi.string().required().min(3).max(100),
  precio_unitario: Joi.number().required().min(0),
  cantidad: Joi.number().integer().min(1).default(1),
  descuento_individual: Joi.number().min(0).default(0),
});

const cotizacionSchema = Joi.object({
  nombre_paciente: Joi.string().required().min(3).max(100),
  correo_paciente: Joi.string().required().email(),
  procedimientos: Joi.array().items(procedimientoSchema).min(1).required(),
  observaciones: Joi.string().allow("").max(500),
  estado: Joi.string()
    .valid("borrador", "enviada", "aceptada", "rechazada")
    .default("borrador"),
  firma_digital_base64: Joi.string().allow(""),
});

const validarCotizacion = (data) => {
  return cotizacionSchema.validate(data, { abortEarly: false });
};

module.exports = { validarCotizacion };
