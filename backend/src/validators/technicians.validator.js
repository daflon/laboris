const { z } = require('zod');

const createTechnicianSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  phone: z
    .string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .max(20)
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 11, {
      message: 'Telefone deve ter 10 ou 11 dígitos',
    }),
  specialty: z.string().max(200).optional().or(z.literal('')),
  active: z.boolean().optional().default(true),
});

const updateTechnicianSchema = createTechnicianSchema.partial();

module.exports = { createTechnicianSchema, updateTechnicianSchema };
