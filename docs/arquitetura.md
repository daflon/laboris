---
layout: default
title: Arquitetura
---

_Última sincronização: 29/07/2026_

# 🏗️ Arquitetura do Sistema

## Visão Geral

O OS Laboris é um sistema **SaaS multi-tenant** que segue arquitetura cliente-servidor com separação clara entre frontend e backend.

```
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│                 │  ◄──────────────►  │                 │
│    Frontend     │                    │     Backend     │
│   React + TS    │                    │  Node + Express │
│                 │                    │                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                │ Knex.js
                                                ▼
                                       ┌─────────────────┐
                                       │    Database     │
                                       │ PostgreSQL/Neon │
                                       └─────────────────┘
```

---

## 📁 Estrutura de Pastas

```
OS-Laboris/
├── backend/
│   ├── src/
│   │   ├── app.js               # Entry point Express
│   │   ├── controllers/         # Lógica HTTP (req/res)
│   │   ├── services/            # Regras de negócio
│   │   ├── repositories/        # Acesso a dados
│   │   ├── validators/          # Validação de entrada
│   │   ├── middlewares/         # Auth, errors, tenant, rate limit
│   │   │   ├── auth.js
│   │   │   ├── rateLimiter.middleware.js
│   │   │   └── pinRateLimit.middleware.js
│   │   ├── routes/              # Definição de rotas
│   │   │   ├── index.js
│   │   │   ├── auth.routes.js
│   │   │   ├── master.routes.js
│   │   │   ├── serviceOrders.routes.js
│   │   │   ├── pdf.routes.js
│   │   │   └── ...
│   │   ├── database/
│   │   │   ├── connection.js    # Pool de conexões
│   │   │   └── migrations/      # Schema do banco
│   │   └── utils/               # Helpers
│   ├── seed.js                  # Dados de teste
│   ├── seed-master.js           # Seed conta master
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA manifest
│   │   ├── sw.js                # Service Worker
│   │   └── icons/               # Ícones PWA
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Rotas
│   │   ├── index.css            # Design system (CSS vars)
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   ├── Layout.tsx
│   │   │   ├── PinModal.tsx
│   │   │   ├── LotePdfModal.tsx
│   │   │   └── ...
│   │   ├── pages/               # Telas
│   │   │   ├── Dashboard/
│   │   │   ├── ServiceOrders/
│   │   │   ├── Master/          # Painel super admin
│   │   │   ├── Financeiro/
│   │   │   └── ...
│   │   ├── services/            # API calls
│   │   ├── hooks/               # Custom hooks
│   │   │   └── useFormDraft.ts  # localStorage draft
│   │   └── utils/               # Helpers
│   └── package.json
│
├── docs/                        # Esta documentação
├── .github/workflows/
│   └── backup.yml               # Backup automático 2x/dia
└── .backups/                    # Backups locais
```

---

## 🔙 Backend

### Padrão de Camadas

```
Route
  │
  ▼
Middleware    ← Auth, Rate Limit, Tenant ID
  │
  ▼
Controller    ← Recebe HTTP request, valida, responde
  │
  ▼
Service       ← Regras de negócio, orquestração
  │
  ▼
Repository    ← Queries no banco de dados
  │
  ▼
Database
```

### Middlewares

| Middleware | Função |
|------------|--------|
| `authenticate` | Verifica JWT e extrai tenantId/userId |
| `superAdminOnly` | Restringe acesso ao painel Master |
| `apiLimiter` | Rate limiting geral (100 req/min) |
| `loginLimiter` | Rate limiting de login (5 req/min) |
| `sensitiveLimiter` | Rate limiting operações sensíveis |
| `errorHandler` | Captura erros e padroniza resposta |
| `validateRequest` | Valida body/params com schema |

### Rate Limiting

O sistema implementa rate limiting em múltiplas camadas:

```javascript
// Login - proteção contra brute force
loginLimiter: 5 req/min por IP+email

// API geral - proteção DDoS
apiLimiter: 100 req/min (super_admin isento)

// PIN - proteção com cooldown
5 tentativas em 5 minutos por tenant+IP
Após 5 falhas: bloqueio de 5 minutos
```

---

## 🔜 Frontend

### Estrutura de Componentes

```
src/
├── components/
│   ├── common/           # Button, Input, Modal, etc.
│   ├── layout/           # Header, Sidebar, BottomNav
│   └── features/         # Por domínio
│       ├── LotePdfModal.tsx
│       └── PinModal.tsx
├── pages/
│   ├── Dashboard/
│   ├── ServiceOrders/    # Lista, Form, Details
│   ├── Clients/
│   ├── Equipment/
│   ├── Technicians/
│   ├── Settings/
│   ├── Financeiro/
│   ├── Master/           # Painel Super Admin
│   │   ├── MasterDashboard.tsx
│   │   ├── CreateTenant.tsx
│   │   └── EditTenant.tsx
│   └── Login/
└── App.tsx
```

### Custom Hooks

| Hook | Função |
|------|--------|
| `useFormDraft` | Salva rascunho em localStorage, restaura em caso de perda |

### Responsividade

```
Desktop (>1024px)
├── Sidebar fixa à esquerda
├── Conteúdo expandido
└── Tabelas completas

Tablet (768-1024px)
├── Sidebar colapsável
├── Tabelas responsivas
└── Cards adaptados

Mobile (<768px)
├── Bottom navigation fixa
├── Tabelas com scroll horizontal
└── Formulários em coluna única
```

---

## 🗄️ Banco de Dados

### PostgreSQL (Neon)

O sistema usa **PostgreSQL** hospedado no **Neon** (serverless) em produção.

- Connection pooling automático
- SSL obrigatório
- Backups automáticos via GitHub Actions (2x/dia)

### Diagrama ER Completo

```
┌──────────────────┐
│     tenants      │
├──────────────────┤
│ id (PK)          │
│ name             │
│ slug (unique)    │
│ modules (JSON)   │
│ active           │
│ created_at       │
└────────┬─────────┘
         │
         │ tenant_id (FK em todas as tabelas)
         │
    ┌────┴────┬─────────────┬──────────────┬───────────────┐
    │         │             │              │               │
    ▼         ▼             ▼              ▼               ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────────┐
│ users  │ │ clients │ │technicians│ │ equipment  │ │ service_orders  │
├────────┤ ├─────────┤ ├──────────┤ ├────────────┤ ├─────────────────┤
│ id     │ │ id      │ │ id       │ │ id         │ │ id              │
│tenant_id│ │tenant_id│ │tenant_id │ │ tenant_id  │ │ tenant_id       │
│ name   │ │ name    │ │ name     │ │ client_id  │ │ order_number    │
│ email  │ │document │ │ phone    │ │ type       │ │ lote_numero     │
│password│ │ phone   │ │specialty │ │ brand      │ │ lote_sufixo     │
│ role   │ │ email   │ │ active   │ │ model      │ │ client_id       │
│ active │ │address_*│ │deleted_at│ │ serial     │ │ equipment_id    │
│last_login││deleted_at│ └──────────┘ │ deleted_at │ │ technician_id   │
└────────┘ └─────────┘               └────────────┘ │ status          │
                                                    │ reported_defect │
┌───────────────────┐                               │ diagnosis       │
│ company_settings  │                               │ payment_method  │
├───────────────────┤                               │ warranty_days   │
│ id (PK)           │                               │ entry_date      │
│ tenant_id (FK)    │◄──────────────────────────────│ completion_date │
│ name              │                               │ deleted_at      │
│ document          │                               └────────┬────────┘
│ phone/phone2      │                                        │
│ email             │                               ┌────────┴────────┐
│ address_*         │                               │                 │
│ logo_url (Base64) │                               ▼                 ▼
│ header_text       │                    ┌─────────────────┐  ┌─────────────────┐
│ footer_text       │                    │service_order_   │  │financial_entries│
│ admin_pin         │                    │     items       │  ├─────────────────┤
└───────────────────┘                    ├─────────────────┤  │ id              │
                                         │ id              │  │ tenant_id       │
┌───────────────────┐                    │service_order_id │  │ type            │
│   audit_logs      │                    │ quantity        │  │ description     │
├───────────────────┤                    │ description     │  │ amount          │
│ id                │                    │ unit_price      │  │ due_date        │
│ tenant_id         │                    └─────────────────┘  │ status          │
│ action            │                                         │service_order_id │
│ entity_type       │                                         └─────────────────┘
│ entity_id         │
│ description       │    ┌───────────────────┐    ┌───────────────────┐
│ performed_by      │    │ impersonate_logs  │    │   pin_attempts    │
│ details           │    ├───────────────────┤    ├───────────────────┤
│ created_at        │    │ id                │    │ id                │
└───────────────────┘    │ admin_id (FK)     │    │ tenant_id         │
                         │ tenant_id (FK)    │    │ ip_address        │
                         │ ip_address        │    │ success           │
                         │ started_at        │    │ attempted_at      │
                         │ ended_at          │    └───────────────────┘
                         │ actions_summary   │
                         └───────────────────┘
```

### Isolamento Multi-tenant

Todas as queries incluem filtro por `tenant_id`:

```javascript
// Repository pattern
async findAll(tenantId, params) {
  return db('service_orders')
    .where('tenant_id', tenantId)  // ← Isolamento
    .whereNull('deleted_at')
    // ...
}
```

O `tenant_id` é extraído do JWT no middleware de autenticação e injetado automaticamente em `req.tenantId`.

### Status de Ordem de Serviço

```
aberta ──► aprovada ──► aguardando_peca ──► concluida ──► entregue
  │                                                           
  └───────────────────────► cancelada
```

### Sistema de Lotes

OS podem ser agrupadas em lotes:
- `lote_numero`: Número do lote (igual ao order_number da primeira OS)
- `lote_sufixo`: Letra sequencial (A, B, C... Z)

```
Cliente traz 3 equipamentos:
  OS #0025-A (primeira, converte para lote)
  OS #0025-B (segunda, adiciona ao lote)
  OS #0025-C (terceira, adiciona ao lote)
```

---

## 📱 PWA

### Service Worker

O service worker (`public/sw.js`) implementa cache para funcionamento offline básico.

### Manifest

```json
{
  "name": "OS Laboris",
  "short_name": "OS Laboris",
  "display": "standalone",
  "background_color": "#1e293b",
  "theme_color": "#1e293b"
}
```

---

## 🔒 Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Autenticação** | JWT com tenant_id no payload |
| **Isolamento** | tenant_id obrigatório em todas as queries |
| **Rate Limiting** | express-rate-limit (login, API, PIN) |
| **PIN Admin** | Rate limit com cooldown (5 tentativas/5min) |
| **Impersonate** | Log de auditoria completo |
| **Banner Impersonate** | Barra visual laranja quando admin acessa como tenant |
| **SQL Injection** | Knex.js (parameterized queries) |
| **XSS** | React escapa por padrão |
| **CORS** | Configurado por ambiente |
| **Soft Delete** | Dados não são removidos, apenas marcados |
| **Audit Log** | Todas as exclusões são registradas |

### Tabela de Rate Limiting

| Operação | Limite | Escopo |
|----------|--------|--------|
| Login | 5/min | IP + email |
| Alteração de senha | 10/min | Usuário |
| Verificação de PIN | 5 em 5min | tenant + IP |
| API geral | 100/min | IP (super_admin isento) |

---

## 🚀 Deploy

### Produção (Render + Neon)

```
┌─────────────────┐     HTTPS      ┌─────────────────┐
│                 │  ◄──────────►  │     Render      │
│    Usuários     │                │  Web Service    │
│                 │                │ (unified build) │
└─────────────────┘                └────────┬────────┘
                                            │
                                            │ PostgreSQL
                                            ▼
                                   ┌─────────────────┐
                                   │      Neon       │
                                   │   (Serverless)  │
                                   └─────────────────┘
```

- **Frontend:** Build estático servido pelo Express
- **Backend:** Node.js no Render
- **Database:** PostgreSQL no Neon (free tier)
- **Anti-sleep:** UptimeRobot a cada 5 minutos
- **Backup:** GitHub Actions 2x/dia

### Desenvolvimento

- Backend: `npm run dev` (nodemon)
- Frontend: `npm run dev` (vite com proxy)
- DB: PostgreSQL local ou Neon (mesma string de conexão)

---

[← Voltar](/)
