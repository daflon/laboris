/**
 * Rotas de Anexos/Fotos para OS
 * - Upload de fotos em Base64
 * - Listagem e exclusão
 */

const { Router } = require('express');
const db = require('../database/connection');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Limite de anexos por OS
const MAX_ATTACHMENTS_PER_OS = 5;
// Tamanho máximo do Base64 (aproximadamente 2MB de imagem = ~2.7MB em Base64)
const MAX_BASE64_SIZE = 3 * 1024 * 1024; // 3MB

/**
 * GET /api/v1/service-orders/:osId/attachments
 * Lista todos os anexos de uma OS
 */
router.get('/service-orders/:osId/attachments', authenticate, async (req, res) => {
  try {
    const { osId } = req.params;
    const tenantId = req.user.tenant_id;

    // Verifica se a OS pertence ao tenant
    const os = await db('service_orders')
      .where({ id: osId, tenant_id: tenantId })
      .first();

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

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
 * GET /api/v1/service-orders/:osId/attachments/:attachmentId
 * Retorna um anexo específico com a imagem em Base64
 */
router.get('/service-orders/:osId/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { osId, attachmentId } = req.params;
    const tenantId = req.user.tenant_id;

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
 * POST /api/v1/service-orders/:osId/attachments
 * Upload de um novo anexo (foto em Base64)
 * Body: { image_data: "data:image/jpeg;base64,...", caption?: "Legenda", filename?: "foto.jpg" }
 */
router.post('/service-orders/:osId/attachments', authenticate, async (req, res) => {
  try {
    const { osId } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
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
    console.error('Erro ao criar anexo:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da foto' });
  }
});

/**
 * DELETE /api/v1/service-orders/:osId/attachments/:attachmentId
 * Remove um anexo
 */
router.delete('/service-orders/:osId/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { osId, attachmentId } = req.params;
    const tenantId = req.user.tenant_id;

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

/**
 * GET /api/v1/service-orders/:osId/attachments-images
 * Retorna todos os anexos COM as imagens (para o PDF)
 */
router.get('/service-orders/:osId/attachments-images', authenticate, async (req, res) => {
  try {
    const { osId } = req.params;
    const tenantId = req.user.tenant_id;

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

module.exports = router;
