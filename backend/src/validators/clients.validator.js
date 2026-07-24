const { z } = require('zod');
const { isValidDocument, cleanDocument } = require('../utils/cpfCnpj');

const createClientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  document: z
    .string()
    .max(18)
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? cleanDocument(val) : ''),
  phone: z
    .string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .max(20)
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 11, {
      message: 'Telefone deve ter 10 ou 11 dígitos',
    }),
  email: z.string().email('Email inválido').max(200).optional().or(z.literal('')),
  address_street: z.string().max(200).optional().or(z.literal('')),
  address_number: z.string().max(20).optional().or(z.literal('')),
  address_complement: z.string().max(100).optional().or(z.literal('')),
  address_neighborhood: z.string().max(100).optional().or(z.literal('')),
  address_city: z.string().max(100).optional().or(z.literal('')),
  address_state: z.string().length(2, 'UF deve ter 2 caracteres').optional().or(z.literal('')),
  address_zip: z
    .string()
    .max(8)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? val.replace(/\D/g, '') : val)),
});

const updateClientSchema = createClientSchema.partial();

module.exports = { createClientSchema, updateClientSchema };
