const { Router } = require('express');
const serviceOrdersController = require('../controllers/serviceOrders.controller');
const validateRequest = require('../middlewares/validateRequest');
const {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  updateStatusSchema,
} = require('../validators/serviceOrders.validator');
const db = require('../database/connection');

const router = Router();

// Limite de anexos por OS
const MAX_ATTACHMENTS_PER_OS = 5;
// Tamanho máximo do Base64 (aproximadamente 2MB de imagem = ~2.7MB em Base64)
const MAX_BASE64_SIZE = 3 * 1024 * 1024; // 3MB

router.post('/', validateRequest(createServiceOrderSchema), serviceOrdersController.create);
router.get('/', serviceOrdersController.findAll);
router.get('/:id', serviceOrdersController.findById);
router.post('/:id/duplicate', serviceOrdersController.duplicate);
router.post('/:id/add-to-lote', serviceOrdersController.addToLote);
router.put('/:id', validateRequest(updateServiceOrderSchema), serviceOrdersController.update);
router.patch('/:id/status', validateRequest(updateStatusSchema), serviceOrdersController.updateStatus);
router.delete('/:id', serviceOrdersController.delete);

// ========== ROTAS DE ANEXOS (FOTOS) ==========

/**
 * GET /api/v1/service-orders/:id/attachments
 * Lista todos os anexos de uma OS
 */
router.get('/:id/attachments', async (req, res) => {
  try {
    const { id: osId } = req.params;
    const tenantId = req.tenantId; // Vem do middleware authenticate

    const attachments = await db('os_attachments')
      .where({ service_order_id: osId, tenant_id: tenantId })
      .select('id', 'filename', 'caption', 'mime_type', 'size_bytes', 'created_at')
      .orderBy('created_at', 'asc');

    res.json(attachments);
  } catch (error) {
    console.error('Erro ao listar anexos:', error);
    res.status(500).json({ error: 'Erro ao listar anexos' });
  }
});

/**
 * GET /api/v1/service-orders/:id/attachments-images
 * Retorna todos os anexos COM as imagens (para exibição e PDF)
 */
router.get('/:id/attachments-images', async (req, res) => {
  try {
    const { id: osId } = req.params;
    const tenantId = req.tenantId; // Vem do middleware authenticate

    const attachments = await db('os_attachments')
      .where({ service_order_id: osId, tenant_id: tenantId })
      .select('id', 'image_data', 'filename', 'caption', 'mime_type')
      .orderBy('created_at', 'asc');

    res.json(attachments);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});

/**
 * GET /api/v1/service-orders/:id/attachments/:attachmentId
 * Retorna um anexo específico com a imagem em Base64
 */
router.get('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id: osId, attachmentId } = req.params;
    const tenantId = req.tenantId; // Vem do middleware authenticate

    const attachment = await db('os_attachments')
      .where({ 
        id: attachmentId, 
        service_order_id: osId, 
        tenant_id: tenantId 
      })
      .first();

    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    res.json(attachment);
  } catch (error) {
    console.error('Erro ao buscar anexo:', error);
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

/**
 * POST /api/v1/service-orders/:id/attachments
 * Upload de um novo anexo (foto em Base64)
 */
router.post('/:id/attachments', async (req, res) => {
  try {
    const { id: osId } = req.params;
    const tenantId = req.tenantId; // Vem do middleware authenticate
    const userId = req.user.userId; // userId, não id
    const { image_data, caption, filename } = req.body;

    // Validações
    if (!image_data) {
      return res.status(400).json({ error: 'image_data é obrigatório' });
    }

    // Verifica tamanho do Base64
    if (image_data.length > MAX_BASE64_SIZE) {
      return res.status(400).json({ error: 'Imagem muito grande. Máximo 2MB.' });
    }

    // Verifica se a OS pertence ao tenant
    const os = await db('service_orders')
      .where({ id: osId, tenant_id: tenantId })
      .first();

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    // Verifica limite de anexos
    const currentCount = await db('os_attachments')
      .where({ service_order_id: osId })
      .count('id as count')
      .first();

    if (parseInt(currentCount.count) >= MAX_ATTACHMENTS_PER_OS) {
      return res.status(400).json({ 
        error: `Limite de ${MAX_ATTACHMENTS_PER_OS} fotos por OS atingido` 
      });
    }

    // Extrai mime type do Base64
    let mimeType = 'image/jpeg';
    const mimeMatch = image_data.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    // Calcula tamanho aproximado em bytes
    const base64Data = image_data.replace(/^data:[^;]+;base64,/, '');
    const sizeBytes = Math.round((base64Data.length * 3) / 4);

    // Insere no banco
    const [attachment] = await db('os_attachments')
      .insert({
        service_order_id: osId,
        tenant_id: tenantId,
        image_data: image_data,
        filename: filename || `foto_${Date.now()}.jpg`,
        caption: caption || null,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        uploaded_by: userId
      })
      .returning(['id', 'filename', 'caption', 'mime_type', 'size_bytes', 'created_at']);

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Erro ao criar anexo:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload da foto' });
  }
});

/**
 * DELETE /api/v1/service-orders/:id/attachments/:attachmentId
 * Remove um anexo
 */
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id: osId, attachmentId } = req.params;
    const tenantId = req.tenantId; // Vem do middleware authenticate

    const deleted = await db('os_attachments')
      .where({ 
        id: attachmentId, 
        service_order_id: osId, 
        tenant_id: tenantId 
      })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    res.json({ message: 'Anexo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover anexo:', error);
    res.status(500).json({ error: 'Erro ao remover anexo' });
  }
});

module.exports = router;
