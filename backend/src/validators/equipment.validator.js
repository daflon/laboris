const { z } = require('zod');

const createEquipmentSchema = z.object({
  client_id: z.string().min(1, 'ID do cliente é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório').max(100),
  brand: z.string().min(1, 'Marca é obrigatória').max(100),
  model: z.string().min(1, 'Modelo é obrigatório').max(100),
  serial_number: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const updateEquipmentSchema = createEquipmentSchema.partial().omit({ client_id: true });

module.exports = { createEquipmentSchema, updateEquipmentSchema };
