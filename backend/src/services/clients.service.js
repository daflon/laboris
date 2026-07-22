const clientsRepository = require('../repositories/clients.repository');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const clientsService = {
  async create(data) {
    // Verifica se já existe cliente com mesmo documento
    const existing = await clientsRepository.findByDocument(data.document);
    if (existing) {
      throw new AppError('Já existe um cliente com este documento', 409, 'CONFLICT');
    }
    return clientsRepository.create(data);
  },

  async findAll(params) {
    return clientsRepository.findAll(params);
  },

  async findById(id) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    }
    return client;
  },

  async update(id, data) {
    // Verifica se cliente existe
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    }

    // Se está alterando documento, verifica duplicidade
    if (data.document && data.document !== client.document) {
      const existing = await clientsRepository.findByDocument(data.document);
      if (existing) {
        throw new AppError('Já existe um cliente com este documento', 409, 'CONFLICT');
      }
    }

    return clientsRepository.update(id, data);
  },

  async delete(id) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    }
    return clientsRepository.softDelete(id);
  },
};

module.exports = clientsService;
