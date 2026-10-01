import api from './api';

export interface Attachment {
  id: string;
  filename?: string;
  caption?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
  image_data?: string;
}

export interface AttachmentUpload {
  image_data: string;
  filename?: string;
  caption?: string;
}

const attachmentsService = {
  /**
   * Lista anexos de uma OS (sem os dados da imagem para performance)
   */
  async list(osId: string): Promise<Attachment[]> {
    const response = await api.get(`/service-orders/${osId}/attachments`);
    return response.data;
  },

  /**
   * Busca um anexo específico com a imagem completa
   */
  async get(osId: string, attachmentId: string): Promise<Attachment> {
    const response = await api.get(`/service-orders/${osId}/attachments/${attachmentId}`);
    return response.data;
  },

  /**
   * Busca todos os anexos com imagens (para exibição)
   */
  async listWithImages(osId: string): Promise<Attachment[]> {
    const response = await api.get(`/service-orders/${osId}/attachments-images`);
    return response.data;
  },

  /**
   * Upload de um novo anexo
   */
  async upload(osId: string, data: AttachmentUpload): Promise<Attachment> {
    const response = await api.post(`/service-orders/${osId}/attachments`, data);
    return response.data;
  },

  /**
   * Remove um anexo
   */
  async remove(osId: string, attachmentId: string): Promise<void> {
    await api.delete(`/service-orders/${osId}/attachments/${attachmentId}`);
  }
};

export default attachmentsService;
