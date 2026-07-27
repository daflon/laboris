---
layout: default
title: Arquitetura
---

# 🏗️ Arquitetura do Sistema

## Visão Geral

O OS Laboris segue uma arquitetura **cliente-servidor** tradicional com separação clara entre frontend e backend.

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
                                       │ SQLite / Postgres│
                                       └─────────────────┘
```

---

## 📁 Estrutura de Pastas

```
OS-Laboris/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica HTTP (req/res)
│   │   ├── services/        # Regras de negócio
│   │   ├── repositories/    # Acesso a dados
│   │   ├── validators/      # Validação de entrada
│   │   ├── middlewares/     # Auth, errors, etc.
│   │   ├── routes/          # Definição de rotas
│   │   ├── database/
│   │   │   └── migrations/  # Schema do banco
│   │   └── utils/           # Helpers (PDF, etc.)
│   ├── seed.js              # Dados de teste
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js            # Service Worker
│   │   └── icons/           # Ícones do app
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas/telas
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Helpers
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── docs/                    # Esta documentação
└── README.md
```

---

## 🔙 Backend

### Padrão de Camadas

O backend segue o padrão **Controller → Service → Repository**:

```
Route
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

### Fluxo de uma Requisição

```javascript
// 1. Rota define endpoint
router.post('/clients', clientsController.create);

// 2. Controller valida e chama service
async create(req, res) {
  const validated = validateClient(req.body);
  const client = await clientsService.create(validated);
  res.status(201).json(client);
}

// 3. Service aplica regras de negócio
async create(data) {
  if (!isValidCPF(data.document)) throw new ValidationError();
  return clientsRepository.create(data);
}

// 4. Repository executa query
async create(data) {
  const [id] = await db('clients').insert(data);
  return this.findById(id);
}
```

### Middlewares

| Middleware | Função |
|------------|--------|
| `errorHandler` | Captura erros e padroniza resposta |
| `validateRequest` | Valida body/params com Joi ou similar |
| `auth` | Verifica JWT (quando aplicável) |
| `adminPin` | Verifica PIN para operações sensíveis |

---

## 🔜 Frontend

### Estrutura de Componentes

```
src/
├── components/
│   ├── common/           # Button, Input, Modal, etc.
│   ├── layout/           # Header, Sidebar, BottomNav
│   └── features/         # Componentes específicos por feature
│       ├── clients/
│       ├── service-orders/
│       └── ...
├── pages/                # Telas completas
│   ├── Dashboard.tsx
│   ├── Clients/
│   │   ├── ClientsList.tsx
│   │   ├── ClientForm.tsx
│   │   └── ClientDetails.tsx
│   └── ...
└── App.tsx               # Rotas e providers
```

### Estado e Data Fetching

- **React Query** ou **SWR** para cache de API
- **Context API** para estado global simples
- **Local state** para formulários

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
├── Tabelas viram cards
└── Menus em drawer
```

---

## 🗄️ Banco de Dados

### Diagrama ER

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   clients   │     │  service_orders │     │ technicians │
├─────────────┤     ├─────────────────┤     ├─────────────┤
│ id          │◄────│ client_id       │     │ id          │
│ name        │     │ equipment_id    │────►│ name        │
│ document    │     │ technician_id   │────►│ specialty   │
│ phone       │     │ order_number    │     │ active      │
│ email       │     │ status          │     └─────────────┘
│ address     │     │ description     │
└─────────────┘     │ total           │
       │            │ created_at      │
       │            └─────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────────┐
│  equipment  │     │  order_items    │
├─────────────┤     ├─────────────────┤
│ id          │     │ id              │
│ client_id   │     │ service_order_id│
│ type        │     │ description     │
│ brand       │     │ quantity        │
│ model       │     │ unit_price      │
│ serial      │     └─────────────────┘
└─────────────┘

┌─────────────────┐     ┌─────────────────┐
│ company_settings│     │   audit_logs    │
├─────────────────┤     ├─────────────────┤
│ id (singleton)  │     │ id              │
│ name            │     │ action          │
│ document        │     │ entity_type     │
│ phone           │     │ entity_id       │
│ logo_url        │     │ user_info       │
│ admin_pin       │     │ created_at      │
└─────────────────┘     └─────────────────┘
```

### Status de Ordem de Serviço

```
open ──► approved ──► waiting_parts ──► completed ──► delivered
  │                                                       
  └──────────────────► cancelled
```

---

## 📱 PWA

### Service Worker

```javascript
// sw.js - Estratégia de cache
self.addEventListener('fetch', (event) => {
  // Cache-first para assets estáticos
  // Network-first para API calls
});
```

### Manifest

```json
{
  "name": "OS Laboris",
  "short_name": "OS Laboris",
  "display": "standalone",
  "theme_color": "#1976d2",
  "icons": [...]
}
```

---

## 🔒 Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Autenticação** | JWT (quando multi-tenant) |
| **Validação** | Joi/Zod no backend |
| **SQL Injection** | Knex.js (parameterized queries) |
| **XSS** | React escapa por padrão |
| **CORS** | Configurado por ambiente |
| **PIN Admin** | Hash + rate limiting |

---

## 🚀 Deploy

### Desenvolvimento
- Backend: `npm run dev` (nodemon)
- Frontend: `npm run dev` (vite)
- DB: SQLite local

### Produção
- Backend: PM2 + PostgreSQL
- Frontend: Build estático (nginx/CDN)
- HTTPS obrigatório

---

[← Voltar](/)
