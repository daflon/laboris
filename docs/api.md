---
layout: default
title: API Reference
---

# 🔌 API Reference

Base URL: `http://localhost:3000/api/v1`

---

## 📊 Dashboard

### GET /dashboard/stats

Retorna estatísticas gerais do sistema.

**Response:**
```json
{
  "serviceOrders": {
    "total": 150,
    "byStatus": {
      "open": 25,
      "approved": 30,
      "waiting_parts": 10,
      "completed": 45,
      "delivered": 35,
      "cancelled": 5
    }
  },
  "clients": { "total": 80 },
  "technicians": { "total": 5, "active": 4 },
  "equipment": { "total": 120 },
  "ranking": [
    { "id": 1, "name": "João Silva", "completed": 45 },
    { "id": 2, "name": "Maria Santos", "completed": 38 }
  ],
  "recentOrders": [...]
}
```

---

## 📋 Ordens de Serviço

### GET /service-orders

Lista todas as ordens de serviço.

**Query params:**
- `status` - Filtrar por status
- `client_id` - Filtrar por cliente
- `technician_id` - Filtrar por técnico
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 20)

### GET /service-orders/:id

Retorna uma OS específica com todos os relacionamentos.

### POST /service-orders

Cria nova ordem de serviço.

**Body:**
```json
{
  "client_id": 1,
  "equipment_id": 1,
  "technician_id": 1,
  "description": "Troca de escova",
  "items": [
    { "description": "Escova de carvão", "quantity": 2, "unit_price": 25.00 }
  ]
}
```

### PUT /service-orders/:id

Atualiza uma ordem de serviço.

### PATCH /service-orders/:id/status

Atualiza apenas o status da OS.

**Body:**
```json
{
  "status": "completed"
}
```

**Status válidos:** `open`, `approved`, `waiting_parts`, `completed`, `delivered`, `cancelled`

### POST /service-orders/:id/duplicate

Duplica uma ordem de serviço existente.

### DELETE /service-orders/:id

Exclui uma OS (requer PIN admin).

**Headers:**
```
X-Admin-Pin: 1234
```

---

## 📄 PDF

### GET /pdf/service-orders/:id/pdf

Gera PDF da ordem de serviço (2 vias em A4).

**Response:** `application/pdf`

---

## 👥 Clientes

### GET /clients

Lista todos os clientes.

**Query params:**
- `q` - Busca por nome, documento ou telefone
- `page`, `limit` - Paginação

### GET /clients/:id

Retorna cliente com equipamentos vinculados.

### POST /clients

Cria novo cliente.

**Body:**
```json
{
  "name": "João da Silva",
  "document": "123.456.789-00",
  "phone": "(11) 99999-9999",
  "email": "joao@email.com",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567"
}
```

### PUT /clients/:id

Atualiza cliente.

### DELETE /clients/:id

Exclui cliente (requer PIN admin).

---

## 🔧 Equipamentos

### GET /equipment

Lista todos os equipamentos.

**Query params:**
- `q` - Busca por tipo, marca, modelo, série ou cliente
- `client_id` - Filtrar por cliente

### GET /equipment/:id

Retorna equipamento específico.

### GET /equipment/:id/history

Retorna histórico de reparos (todas as OS do equipamento).

### POST /equipment

Cria novo equipamento.

**Body:**
```json
{
  "client_id": 1,
  "type": "Furadeira",
  "brand": "Bosch",
  "model": "GSB 13 RE",
  "serial_number": "ABC123456",
  "notes": "Ferramenta industrial"
}
```

### PUT /equipment/:id

Atualiza equipamento.

### DELETE /equipment/:id

Exclui equipamento (requer PIN admin).

---

## 👨‍🔧 Técnicos

### GET /technicians

Lista todos os técnicos.

**Query params:**
- `active` - Filtrar por status (true/false)
- `q` - Busca por nome ou especialidade

### GET /technicians/:id

Retorna técnico específico.

### POST /technicians

Cria novo técnico.

**Body:**
```json
{
  "name": "Carlos Ferreira",
  "phone": "(11) 98888-8888",
  "email": "carlos@email.com",
  "specialty": "Ferramentas elétricas portáteis",
  "active": true
}
```

### PUT /technicians/:id

Atualiza técnico.

### PATCH /technicians/:id/toggle-status

Alterna status ativo/inativo.

### DELETE /technicians/:id

Exclui técnico (requer PIN admin).

---

## ⚙️ Configurações da Empresa

### GET /company

Retorna configurações da empresa.

### PUT /company

Atualiza configurações.

**Body:**
```json
{
  "name": "Assistência Técnica XPTO",
  "document": "12.345.678/0001-90",
  "phone": "(11) 3333-3333",
  "whatsapp": "(11) 99999-9999",
  "email": "contato@xpto.com.br",
  "address": "Av. Principal, 500",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01000-000",
  "logo_url": "https://...",
  "header_text": "Especialistas em ferramentas elétricas",
  "footer_text": "Garantia de 90 dias",
  "default_warranty_days": 90,
  "admin_pin": "1234"
}
```

---

## 🔍 Busca Global

### GET /search?q=termo

Busca em clientes, OS e equipamentos.

**Response:**
```json
{
  "clients": [...],
  "serviceOrders": [...],
  "equipment": [...]
}
```

---

## 🔐 Admin

### POST /admin/verify-pin

Verifica PIN do administrador.

**Body:**
```json
{
  "pin": "1234"
}
```

### GET /admin/audit-logs

Lista logs de auditoria.

### POST /admin/audit-log

Registra ação no log de auditoria.

---

## ❌ Erros

Todos os erros seguem o formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Documento inválido",
    "details": { "field": "document" }
  }
}
```

**Códigos HTTP:**
- `200` - OK
- `201` - Criado
- `400` - Erro de validação
- `401` - Não autorizado
- `403` - Proibido (PIN inválido)
- `404` - Não encontrado
- `500` - Erro interno

---

[← Voltar](/)
