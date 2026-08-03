---
layout: default
title: API Reference
---

_Última sincronização: 03/08/2026_

# 🔌 API Reference

Base URL: `https://seu-dominio.com/api/v1`

Todas as rotas (exceto `/auth`) requerem autenticação JWT via header:
```
Authorization: Bearer <token>
```

---

## 🔐 Autenticação

### POST /auth/login

Autentica usuário e retorna token JWT.

**Rate Limit:** 5 requisições/minuto (por IP+email)

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "name": "Nome do Usuário",
      "email": "usuario@email.com",
      "role": "admin",
      "tenant_id": "uuid-do-tenant"
    }
  }
}
```

### GET /auth/me

Retorna dados do usuário logado.

### PUT /auth/change-password

Altera senha do usuário logado.

**Rate Limit:** 10 requisições/minuto (operação sensível)

**Body:**
```json
{
  "current_password": "senhaAtual",
  "new_password": "novaSenha"
}
```

---

## 📊 Dashboard

### GET /dashboard/stats

Retorna estatísticas do tenant incluindo alertas.

**Response:**
```json
{
  "success": true,
  "data": {
    "statuses": {
      "aberta": 9,
      "aprovada": 4,
      "aguardando_peca": 3,
      "concluida": 4,
      "entregue": 2
    },
    "orders_month": 12,
    "recent_orders": [...],
    "total_clients": 34,
    "tech_ranking": [
      { "name": "Fernando", "count": 4 },
      { "name": "Igor", "count": 2 }
    ],
    "alerts": {
      "old_orders": 4,
      "abandoned_equipment": 2
    }
  }
}
```

---

## 📋 Ordens de Serviço

### GET /service-orders

Lista ordens de serviço com paginação e filtros.

**Query params:**
| Param | Descrição |
|-------|-----------|
| `status` | Filtrar por status (aberta, aprovada/avisada, etc) |
| `filter` | Filtro especial: `old` (>30 dias) ou `abandoned` (>180 dias) |
| `search` | Busca por nº OS ou nome do cliente |
| `page` | Página (default: 1) |
| `limit` | Itens por página (default: 20) |

### GET /service-orders/:id

Retorna OS específica com itens, cliente, equipamento e dados do lote.

### POST /service-orders

Cria nova ordem de serviço.

**Body:**
```json
{
  "client_id": "uuid",
  "equipment_id": "uuid",
  "technician_id": "uuid",
  "status": "aberta",
  "reported_defect": "Não liga",
  "payment_method": "PIX",
  "warranty_days": 90,
  "entry_date": "2026-07-29",
  "items": [
    { "description": "Mão de obra", "quantity": 1, "unit_price": 80 }
  ]
}
```

### PUT /service-orders/:id

Atualiza ordem de serviço.

### PATCH /service-orders/:id/status

Atualiza apenas o status.

**Body:**
```json
{
  "status": "concluida"
}
```

**Status válidos:** `aberta`, `aprovada` (exibido como "Avisada"), `aguardando_peca`, `concluida`, `entregue`, `cancelada`

### POST /service-orders/:id/duplicate

Duplica uma OS existente (cria nova OS com mesmo cliente/equipamento).

### DELETE /service-orders/:id

Exclui OS (soft delete). Requer verificação de PIN.

---

## 📦 Lotes de OS

O sistema permite agrupar múltiplas OS do mesmo cliente em um lote.

### POST /service-orders/:id/add-to-lote

Adiciona novo equipamento ao lote de uma OS existente.

**Body:**
```json
{
  "equipment_id": "uuid-novo-equipamento",
  "technician_id": "uuid-tecnico",
  "reported_defect": "Defeito do novo equipamento",
  "items": [
    { "description": "Mão de obra", "quantity": 1, "unit_price": 50 }
  ]
}
```

**Response:** Nova OS criada com sufixo (ex: 0025-B)

---

## 📄 PDF

### GET /pdf/service-orders/:id/pdf

Gera PDF da ordem de serviço.

**Query params para lote:**
| Param | Descrição |
|-------|-----------|
| `lote` | `true` para gerar PDF do lote completo |
| `formato` | `individual` (padrão) ou `resumo` (consolidado) |
| `status` | Filtrar por status (ex: `concluida,entregue`) |
| `ids` | IDs específicos separados por vírgula |

**Exemplos:**
```
# PDF individual
GET /pdf/service-orders/:id/pdf

# PDF do lote inteiro (cada OS em uma página)
GET /pdf/service-orders/:id/pdf?lote=true

# PDF resumo do lote (documento consolidado)
GET /pdf/service-orders/:id/pdf?lote=true&formato=resumo

# PDF do lote apenas concluídas
GET /pdf/service-orders/:id/pdf?lote=true&status=concluida,entregue
```

**Response:** `application/pdf`

---

## 👥 Clientes

### GET /clients

Lista clientes com paginação e busca.

**Query params:**
- `search` - Busca por nome, documento ou telefone
- `page`, `limit` - Paginação

### GET /clients/:id

Retorna cliente com equipamentos vinculados.

### POST /clients

Cria novo cliente.

**Body:**
```json
{
  "name": "João da Silva",
  "document": "12345678900",
  "phone": "21999999999",
  "phone2": "2133333333",
  "email": "joao@email.com",
  "address_street": "Rua das Flores",
  "address_number": "123",
  "address_city": "Rio de Janeiro",
  "address_state": "RJ"
}
```

### PUT /clients/:id

Atualiza cliente.

### DELETE /clients/:id

Exclui cliente (soft delete). Requer verificação de PIN.

### GET /clients/:id/equipment

Lista equipamentos do cliente.

---

## 🔧 Equipamentos

### GET /equipment

Lista equipamentos com busca.

**Query params:**
- `search` - Busca por tipo, marca, modelo, série ou nome do cliente
- `client_id` - Filtrar por cliente

### GET /equipment/:id

Retorna equipamento específico.

### GET /equipment/:id/history

Retorna histórico de OS do equipamento.

### POST /equipment

Cria novo equipamento.

**Body:**
```json
{
  "client_id": "uuid",
  "type": "Furadeira",
  "brand": "Bosch",
  "model": "GSB 13 RE",
  "serial_number": "ABC123456"
}
```

### PUT /equipment/:id

Atualiza equipamento.

### DELETE /equipment/:id

Exclui equipamento (soft delete). Requer verificação de PIN.

---

## 👨‍🔧 Técnicos

### GET /technicians

Lista técnicos.

**Query params:**
- `active` - Filtrar por status (true/false)
- `search` - Busca por nome ou especialidade

### GET /technicians/:id

Retorna técnico específico.

### POST /technicians

Cria novo técnico.

**Body:**
```json
{
  "name": "Carlos Ferreira",
  "phone": "21988888888",
  "specialty": "Ferramentas elétricas portáteis",
  "active": true
}
```

### PUT /technicians/:id

Atualiza técnico.

### PATCH /technicians/:id/toggle

Alterna status ativo/inativo.

### DELETE /technicians/:id

Exclui técnico (soft delete). Requer verificação de PIN.

---

## ⚙️ Configurações da Empresa

### GET /company

Retorna configurações da empresa do tenant.

### PUT /company

Atualiza configurações.

**Body:**
```json
{
  "name": "Assistência Técnica XPTO",
  "document": "12345678000190",
  "phone": "2133333333",
  "phone2": "21999999999",
  "email": "contato@xpto.com.br",
  "address_street": "Av. Principal",
  "address_number": "500",
  "address_neighborhood": "Centro",
  "address_city": "Rio de Janeiro",
  "address_state": "RJ",
  "address_zip": "20000000",
  "logo_url": "data:image/png;base64,...",
  "header_text": "Especialistas em ferramentas elétricas",
  "footer_text": "Aviso legal...",
  "admin_pin": "1234"
}
```

**Nota:** `logo_url` aceita Base64 de imagens até 200KB.

---

## 🔍 Busca Global

### GET /search?q=termo

Busca em clientes, OS e equipamentos.

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [...],
    "service_orders": [...],
    "equipment": [...]
  }
}
```

---

## 🔐 Admin (Tenant)

### POST /admin/verify-pin

Verifica PIN do administrador para operações sensíveis.

**Rate Limit:** 5 tentativas em 5 minutos (por tenant+IP). Após 5 falhas, bloqueio de 5 minutos.

**Body:**
```json
{
  "pin": "1234"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "data": { "verified": true }
}
```

**Response (falha ou bloqueio):**
```json
{
  "success": false,
  "error": { "message": "Não foi possível validar. Tente novamente mais tarde." }
}
```

**Nota:** A mensagem de erro é genérica para não revelar se o PIN está errado ou se está bloqueado.

### POST /admin/audit-log

Registra ação no log de auditoria.

### GET /admin/audit-logs

Lista logs de auditoria do tenant.

---

## 💰 Financeiro

### GET /financeiro/resumo

Retorna resumo financeiro do mês.

### GET /financeiro/lancamentos

Lista lançamentos financeiros.

---

## 👑 Painel Master (Super Admin)

Rotas exclusivas para `role: super_admin`. Requerem autenticação.

### GET /master/stats

Estatísticas globais do sistema.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tenants": 2,
    "active_tenants": 2,
    "total_orders": 53,
    "total_clients": 34
  }
}
```

### GET /master/system-status

Status do sistema (DB, backup, deploy, métricas).

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "connected": true,
      "latency": 140,
      "error": null
    },
    "metrics": {
      "tenants": { "total": 2, "active": 2 },
      "orders": 53,
      "clients": 34,
      "equipments": 63,
      "technicians": 14
    },
    "backups": {
      "list": [...],
      "lastBackup": { "name": "backup_2026-07-29...", "date": "..." },
      "error": null
    },
    "deploy": {
      "healthy": true,
      "message": "API respondendo normalmente"
    },
    "timestamp": "2026-07-29T12:00:00.000Z"
  }
}
```

### GET /master/uptime-status

Status do UptimeRobot (se configurado).

**Response (configurado):**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "monitors": [
      {
        "id": 123,
        "name": "os-laboris.onrender.com",
        "url": "https://...",
        "status": "online",
        "uptime": { "allTime": "100.00", "last7Days": "100.00" },
        "responseTime": { "average": 168 },
        "logs": [...]
      }
    ],
    "summary": { "total": 1, "online": 1, "offline": 0 }
  }
}
```

### GET /master/tenants

Lista todos os tenants com estatísticas.

### POST /master/tenants

Cria novo tenant com usuário admin.

**Body:**
```json
{
  "name": "Nova Empresa",
  "slug": "nova-empresa",
  "email": "admin@novaempresa.com",
  "password": "senha123",
  "modules": ["os", "financeiro"]
}
```

### GET /master/tenants/:id

Detalhes do tenant.

### PUT /master/tenants/:id

Atualiza tenant.

**Body:**
```json
{
  "name": "Nome Atualizado",
  "modules": ["os", "financeiro"]
}
```

### PATCH /master/tenants/:id/toggle

Ativa/desativa tenant.

### PUT /master/tenants/:id/reset-password

Reseta senha de usuário do tenant.

**Body:**
```json
{
  "user_id": "uuid-do-usuario",
  "new_password": "novaSenha"
}
```

### POST /master/tenants/:id/impersonate

Inicia sessão de impersonate (acessar como tenant).

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-do-tenant",
    "tenant": { "id": "...", "name": "..." },
    "impersonateLogId": "uuid"
  }
}
```

### POST /master/impersonate/:logId/end

Encerra sessão de impersonate.

### GET /master/impersonate-logs

Lista histórico de sessões de impersonate.

### GET /master/audit-logs

Lista logs de auditoria de todos os tenants.

**Query params:**
- `tenant_id` - Filtrar por tenant
- `action` - Filtrar por tipo de ação
- `start_date`, `end_date` - Período
- `page`, `limit` - Paginação

---

## ❌ Erros

Todos os erros seguem o formato:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição do erro"
  }
}
```

**Códigos HTTP:**
| Código | Descrição |
|--------|-----------|
| `200` | OK |
| `201` | Criado |
| `400` | Erro de validação |
| `401` | Não autenticado |
| `403` | Não autorizado (PIN inválido, tenant inativo, rate limit) |
| `404` | Não encontrado |
| `429` | Rate limit excedido |
| `500` | Erro interno |

---

## 🛡️ Rate Limiting

| Endpoint | Limite | Observação |
|----------|--------|------------|
| `/auth/login` | 5/min | Por IP+email |
| `/auth/change-password` | 10/min | Operação sensível |
| `/admin/verify-pin` | 5 em 5min | Por tenant+IP, bloqueio após falhas |
| API geral | 100/min | Super admin isento |
| Rotas públicas | 30/min | Health check, etc |

---

[← Voltar](/)
