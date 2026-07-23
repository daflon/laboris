const { z } = require('zod');

const VALID_STATUSES = ['aberta', 'aprovada', 'aguardando_peca', 'concluida', 'entregue', 'cancelada'];
const VALID_PAYMENTS = ['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Transferência', 'A combinar'];

const serviceOrderItemSchema = z.object({
  id: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  description: z.string().min(1, 'Descrição é obrigatória'),
  unit_price: z.union([z.number(), z.string()]).transform((val) => Number(val)),
});

const createServiceOrderSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  equipment_id: z.string().min(1, 'Equipamento é obrigatório'),
  technician_id: z.string().min(1, 'Técnico é obrigatório'),
  status: z.enum(VALID_STATUSES).optional().default('aberta'),
  reported_defect: z.string().optional().or(z.literal('')),
  diagnosis: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  payment_method: z.enum(VALID_PAYMENTS).optional().or(z.literal('')),
  warranty_days: z.number().int().min(0).optional().default(90),
  entry_date: z.string().optional(),
  completion_date: z.string().optional().or(z.literal('')),
  items: z.array(serviceOrderItemSchema).optional().default([]),
});

const updateServiceOrderSchema = createServiceOrderSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, { errorMap: () => ({ message: 'Status inválido' }) }),
});

module.exports = {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  updateStatusSchema,
  VALID_STATUSES,
  VALID_PAYMENTS,
};
