---
layout: default
title: Manual Completo
---

_Última sincronização: 29/07/2026_

# 📖 Manual Completo — OS Laboris

**Sistema SaaS Multi-tenant de Gestão de Ordens de Serviço para Assistência Técnica de Ferramentas Elétricas**

Versão: 1.0 | Última atualização: Julho 2026

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Modelo de Dados](#3-modelo-de-dados)
4. [Autenticação e Multi-tenancy](#4-autenticação-e-multi-tenancy)
5. [Módulos do Sistema](#5-módulos-do-sistema)
6. [Funcionalidades Especiais](#6-funcionalidades-especiais)
7. [Interface do Usuário](#7-interface-do-usuário)
8. [API Reference](#8-api-reference)
9. [Integrações](#9-integrações)
10. [Infraestrutura e Deploy](#10-infraestrutura-e-deploy)
11. [Segurança](#11-segurança)
12. [Acessibilidade (WCAG)](#12-acessibilidade-wcag)
13. [Guia de Uso](#13-guia-de-uso)

---

## 1. Visão Geral

### 1.1 O que é o OS Laboris?

O **OS Laboris** é um sistema SaaS (Software as a Service) multi-tenant desenvolvido para oficinas de assistência técnica de ferramentas elétricas. Permite gerenciar todo o ciclo de vida de uma ordem de serviço, desde a entrada do equipamento até a entrega ao cliente.

### 1.2 Público-Alvo

- Oficinas de reparo de ferramentas elétricas (furadeiras, esmerilhadeiras, serras, etc.)
- Assistências técnicas autorizadas
- Prestadores de serviço de manutenção de equipamentos

### 1.3 Principais Características

| Característica | Descrição |
|----------------|-----------|
| **Multi-tenant** | Cada empresa tem seu ambiente isolado |
| **PWA** | Instalável como app em celulares |
| **Responsivo** | Funciona em desktop, tablet e celular |
| **PDF Profissional** | Geração de orçamentos para impressão |
| **WhatsApp** | Envio de mensagens automáticas para clientes |
| **White-label** | Personalizável com logo e dados da empresa |

### 1.4 Stack Tecnológica

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Vite + React Router + React Query  │
└─────────────────────────────────────────────────────────────┘
                              │
                        REST API (JSON)
                              │
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│      Node.js 20 + Express + Knex.js + PDFKit + JWT          │
└─────────────────────────────────────────────────────────────┘
                              │
                           Knex.js
                              │
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│              PostgreSQL (Neon - Serverless)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura Técnica

### 2.1 Estrutura de Diretórios

```
OS-Laboris/
├── backend/
│   ├── src/
│   │   ├── app.js                 # Configuração Express
│   │   ├── server.js              # Entry point
│   │   ├── controllers/           # Handlers HTTP
│   │   │   ├── clients.controller.js
│   │   │   ├── equipment.controller.js
│   │   │   ├── serviceOrders.controller.js
│   │   │   ├── technicians.controller.js
│   │   │   └── companySettings.controller.js
│   │   ├── services/              # Lógica de negócio
│   │   ├── repositories/          # Acesso ao banco
│   │   ├── middlewares/           # Auth, errors, tenant
│   │   ├── routes/                # Definição de rotas
│   │   │   ├── index.js
│   │   │   ├── auth.routes.js
│   │   │   ├── clients.routes.js
│   │   │   ├── master.routes.js
│   │   │   └── pdf.routes.js
│   │   ├── database/
│   │   │   ├── connection.js      # Pool de conexões
│   │   │   └── migrations/        # Schema do banco
│   │   └── utils/
│   ├── knexfile.js                # Configuração Knex
│   ├── seed.js                    # Dados de teste
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                  # Service Worker
│   │   └── icons/                 # Ícones PWA
│   ├── src/
│   │   ├── main.tsx               # Entry point
│   │   ├── App.tsx                # Rotas
│   │   ├── index.css              # Estilos globais
│   │   ├── components/            # Componentes reutilizáveis
│   │   │   ├── Layout.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── GlobalSearch.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── QuickClientModal.tsx
│   │   │   ├── QuickEquipmentModal.tsx
│   │   │   ├── LotePdfModal.tsx
│   │   │   └── PinModal.tsx
│   │   ├── pages/                 # Telas
│   │   │   ├── Dashboard/
│   │   │   ├── Clients/
│   │   │   ├── Equipment/
│   │   │   ├── ServiceOrders/
│   │   │   ├── Technicians/
│   │   │   ├── Settings/
│   │   │   ├── Financeiro/
│   │   │   ├── Master/
│   │   │   └── Login/
│   │   ├── services/              # Chamadas à API
│   │   ├── hooks/                 # Custom hooks
│   │   └── utils/                 # Funções auxiliares
│   ├── vite.config.ts
│   └── package.json
│
├── docs/                          # Documentação
│   ├── index.md
│   ├── arquitetura.md
│   ├── api.md
│   ├── instalacao.md
│   ├── roadmap.md
│   ├── manual-completo.md
│   └── ui-screens-map.svg
│
├── .github/
│   └── workflows/
│       └── backup.yml             # Backup automático
│
└── .backups/                      # Backups locais
```

### 2.2 Padrão de Camadas (Backend)

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Router    │  Define endpoints e middlewares
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Controller  │  Valida request, formata response
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Service    │  Regras de negócio, validações complexas
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Repository  │  Queries SQL via Knex.js
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Database   │  PostgreSQL
└─────────────┘
```

### 2.3 Fluxo de Dados (Frontend)

```
User Action (click, submit)
         │
         ▼
┌─────────────────┐
│  React Component│  Estado local, handlers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service Layer  │  api.get(), api.post()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Axios + JWT   │  Headers, interceptors
└────────┬────────┘
         │
    HTTP Request
         │
         ▼
    Backend API
```

---

## 3. Modelo de Dados


### 3.1 Diagrama Entidade-Relacionamento

```
┌──────────────┐         ┌──────────────────────┐         ┌──────────────┐
│   tenants    │         │        users         │         │  technicians │
├──────────────┤         ├──────────────────────┤         ├──────────────┤
│ id (PK)      │◄────────│ tenant_id (FK)       │         │ id (PK)      │
│ name         │         │ id (PK)              │         │ tenant_id(FK)│
│ slug         │         │ name                 │         │ name         │
│ status       │         │ email                │         │ specialty    │
│ plan         │         │ password_hash        │         │ phone        │
│ created_at   │         │ role (admin/user)    │         │ active       │
└──────────────┘         │ created_at           │         │ deleted_at   │
       │                 └──────────────────────┘         └──────────────┘
       │                                                         │
       │         ┌──────────────────────┐                       │
       │         │       clients        │                       │
       │         ├──────────────────────┤                       │
       └────────►│ tenant_id (FK)       │                       │
                 │ id (PK)              │                       │
                 │ name                 │                       │
                 │ document (CPF/CNPJ)  │                       │
                 │ phone                │                       │
                 │ phone2               │                       │
                 │ email                │                       │
                 │ deleted_at           │                       │
                 └──────────┬───────────┘                       │
                            │                                   │
        ┌───────────────────┴───────────────────┐              │
        │                                       │              │
        ▼                                       ▼              │
┌──────────────────────┐              ┌──────────────────────┐ │
│     equipment        │              │   service_orders     │ │
├──────────────────────┤              ├──────────────────────┤ │
│ id (PK)              │◄─────────────│ equipment_id (FK)    │ │
│ tenant_id (FK)       │              │ client_id (FK)       │─┘
│ client_id (FK)       │              │ technician_id (FK)   │◄─┘
│ type                 │              │ id (PK)              │
│ brand                │              │ tenant_id (FK)       │
│ model                │              │ order_number         │
│ serial_number        │              │ lote_numero          │
│ deleted_at           │              │ lote_sufixo (A-Z)    │
└──────────────────────┘              │ status               │
                                      │ reported_defect      │
                                      │ diagnosis            │
                                      │ notes                │
                                      │ payment_method       │
                                      │ warranty_days        │
                                      │ entry_date           │
                                      │ completion_date      │
                                      │ deleted_at           │
                                      └──────────┬───────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────┐
                                      │  service_order_items │
                                      ├──────────────────────┤
                                      │ id (PK)              │
                                      │ service_order_id(FK) │
                                      │ quantity             │
                                      │ description          │
                                      │ unit_price           │
                                      └──────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│  company_settings    │              │    audit_logs        │
├──────────────────────┤              ├──────────────────────┤
│ id (PK)              │              │ id (PK)              │
│ tenant_id (FK)       │              │ tenant_id (FK)       │
│ name                 │              │ user_id              │
│ document             │              │ action               │
│ phone                │              │ entity_type          │
│ phone2               │              │ entity_id            │
│ email                │              │ details (JSON)       │
│ address_*            │              │ created_at           │
│ logo_url (Base64)    │              └──────────────────────┘
│ header_text          │
│ footer_text          │
│ admin_pin            │
└──────────────────────┘
```

### 3.2 Tabelas Detalhadas

#### tenants
Representa cada empresa/cliente do SaaS.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| name | VARCHAR(255) | Nome da empresa |
| slug | VARCHAR(100) | Identificador único para URL |
| status | ENUM | active, inactive, trial |
| plan | ENUM | basic, pro, enterprise |
| created_at | TIMESTAMP | Data de criação |

#### users
Usuários do sistema (login).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| tenant_id | UUID | FK para tenant |
| name | VARCHAR(255) | Nome completo |
| email | VARCHAR(255) | Email (único por tenant) |
| password_hash | VARCHAR(255) | Senha com bcrypt |
| role | ENUM | super_admin, admin, user |

#### clients
Clientes da oficina (donos dos equipamentos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| tenant_id | UUID | Isolamento multi-tenant |
| name | VARCHAR(255) | Nome do cliente |
| document | VARCHAR(18) | CPF ou CNPJ formatado |
| phone | VARCHAR(15) | Telefone principal |
| phone2 | VARCHAR(15) | Telefone secundário |
| email | VARCHAR(255) | Email |
| deleted_at | TIMESTAMP | Soft delete |

#### equipment
Equipamentos/máquinas cadastradas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| tenant_id | UUID | Isolamento multi-tenant |
| client_id | UUID | FK para dono do equipamento |
| type | VARCHAR(100) | Tipo (Furadeira, Serra, etc.) |
| brand | VARCHAR(100) | Marca (Bosch, Makita, etc.) |
| model | VARCHAR(100) | Modelo |
| serial_number | VARCHAR(100) | Número de série |

#### service_orders
Ordens de serviço (coração do sistema).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| tenant_id | UUID | Isolamento multi-tenant |
| order_number | INTEGER | Número sequencial por tenant |
| lote_numero | INTEGER | Número do lote (se agrupada) |
| lote_sufixo | CHAR(1) | Sufixo A-Z (se agrupada) |
| client_id | UUID | FK para cliente |
| equipment_id | UUID | FK para equipamento |
| technician_id | UUID | FK para técnico |
| status | ENUM | Estado atual |
| reported_defect | TEXT | Defeito relatado pelo cliente |
| diagnosis | TEXT | Diagnóstico técnico |
| notes | TEXT | Observações |
| payment_method | VARCHAR(50) | Forma de pagamento |
| warranty_days | INTEGER | Dias de garantia (default: 90) |
| entry_date | DATE | Data de entrada |
| completion_date | DATE | Data de conclusão |

**Status possíveis:**
- `aberta` - Recém criada
- `aprovada` - Cliente aprovou orçamento
- `aguardando_peca` - Aguardando peça de reposição
- `concluida` - Serviço finalizado
- `entregue` - Equipamento entregue ao cliente
- `cancelada` - OS cancelada

#### service_order_items
Itens da OS (serviços e peças).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| service_order_id | UUID | FK para OS |
| quantity | INTEGER | Quantidade |
| description | VARCHAR(255) | Descrição do item |
| unit_price | DECIMAL(10,2) | Valor unitário |

---

## 4. Autenticação e Multi-tenancy

### 4.1 Fluxo de Autenticação

```
┌─────────────┐     POST /auth/login      ┌─────────────┐
│   Cliente   │  ─────────────────────►   │   Backend   │
│  (Browser)  │   { email, password }     │             │
└─────────────┘                           └──────┬──────┘
                                                 │
                                    1. Busca user pelo email
                                    2. Verifica senha (bcrypt)
                                    3. Gera JWT com payload:
                                       { userId, tenantId, role }
                                                 │
┌─────────────┐     200 OK + JWT          ┌──────┴──────┐
│   Cliente   │  ◄─────────────────────   │   Backend   │
│  (Browser)  │   { token, user }         │             │
└─────────────┘                           └─────────────┘
       │
       │  Armazena token em localStorage
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Todas as requisições incluem:                          │
│  Authorization: Bearer <token>                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Estrutura do JWT

```json
{
  "userId": "uuid-do-usuario",
  "tenantId": "uuid-do-tenant",
  "role": "admin",
  "iat": 1719849600,
  "exp": 1719936000
}
```

### 4.3 Middleware de Autenticação

```javascript
// middlewares/auth.middleware.js
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

### 4.4 Isolamento Multi-tenant

Todas as queries incluem filtro por `tenant_id`:

```javascript
// repositories/clients.repository.js
async findAll(tenantId, { search, page, limit }) {
  return db('clients')
    .where('tenant_id', tenantId)  // ← Isolamento
    .whereNull('deleted_at')
    .modify((qb) => {
      if (search) {
        qb.where('name', 'ilike', `%${search}%`);
      }
    })
    .limit(limit)
    .offset((page - 1) * limit);
}
```

### 4.5 Roles e Permissões

| Role | Descrição | Permissões |
|------|-----------|------------|
| `super_admin` | Administrador global | Acesso ao painel Master, gerencia todos os tenants |
| `admin` | Admin do tenant | Todas as funcionalidades do tenant, configurações |
| `user` | Usuário comum | CRUD básico, sem acesso a configurações |

---

## 5. Módulos do Sistema


### 5.1 Dashboard

**Rota:** `/`

O Dashboard é a tela inicial após login, apresentando uma visão geral do negócio.

**Componentes:**
- **Cards de Status:** Contadores clicáveis por status de OS
  - Abertas (azul)
  - Aprovadas (âmbar)
  - Aguardando Peça (violeta)
  - Concluídas (verde)
  - Entregues (índigo)
- **Alertas de Atenção:** Banners clicáveis que filtram a listagem
  - ⏰ OS paradas há mais de 30 dias (amarelo)
  - ⚠️ Equipamentos há mais de 180 dias (vermelho) - Lei PL 2545/22
- **Ranking de Técnicos:** Top 3 técnicos com mais OS concluídas (gamificação 🥇🥈🥉)
- **Últimas OS:** Lista das 5 últimas ordens criadas

**Dados exibidos:**
```javascript
{
  stats: {
    total: 127,
    aberta: 23,
    aprovada: 12,
    aguardando_peca: 5,
    concluida: 45,
    entregue: 40,
    cancelada: 2
  },
  technicianRanking: [
    { name: "Carlos", count: 45, percentage: 100 },
    { name: "João", count: 38, percentage: 84 },
    { name: "Pedro", count: 25, percentage: 55 }
  ],
  recentOrders: [...]
}
```

---

### 5.2 Clientes

**Rotas:**
- `/clientes` - Lista
- `/clientes/novo` - Cadastro
- `/clientes/:id` - Detalhes
- `/clientes/:id/editar` - Edição

**Campos:**
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| name | string | ✅ | min: 2 chars |
| document | string | ❌ | CPF (11 dígitos) ou CNPJ (14 dígitos) com verificador |
| phone | string | ❌ | Formato (XX) XXXXX-XXXX |
| phone2 | string | ❌ | Formato (XX) XXXXX-XXXX |
| email | string | ❌ | Formato de email válido |

**Funcionalidades:**
- Busca por nome, documento ou telefone
- Paginação (10 por página)
- Soft delete (com confirmação por PIN)
- Visualização de equipamentos vinculados
- Histórico de OS do cliente

---

### 5.3 Equipamentos

**Rotas:**
- `/equipamentos` - Lista
- `/equipamentos/novo` - Cadastro
- `/equipamentos/:id` - Histórico
- `/equipamentos/:id/editar` - Edição

**Campos:**
| Campo | Tipo | Obrigatório | Exemplo |
|-------|------|-------------|---------|
| type | string | ✅ | Furadeira, Serra Circular |
| brand | string | ✅ | Bosch, Makita, Dewalt |
| model | string | ❌ | GSB 13 RE |
| serial_number | string | ❌ | ABC123456 |
| client_id | UUID | ✅ | FK para dono |

**Funcionalidades:**
- Busca por tipo, marca, modelo ou nº série
- Histórico completo de reparos (timeline)
- Identificação do cliente proprietário
- Vinculação automática em OS

---

### 5.4 Técnicos

**Rotas:**
- `/tecnicos` - Lista
- `/tecnicos/novo` - Cadastro
- `/tecnicos/:id/editar` - Edição

**Campos:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | string | ✅ |
| specialty | string | ❌ |
| phone | string | ❌ |
| active | boolean | ✅ (default: true) |

**Funcionalidades:**
- Toggle ativo/inativo
- Filtro por status
- Aparece no ranking do dashboard
- Selecionável ao criar OS

---

### 5.5 Ordens de Serviço

**Rotas:**
- `/os` - Lista
- `/os/nova` - Cadastro
- `/os/:id` - Detalhes
- `/os/:id/editar` - Edição
- `/os/:id/adicionar-lote` - Adicionar equipamento ao lote
- `/os?filter=old` - Lista filtrada: OS > 30 dias
- `/os?filter=abandoned` - Lista filtrada: Equipamentos > 180 dias

**Indicadores visuais na listagem:**
- ⏰ Ícone ao lado do número: OS parada há mais de 30 dias
- `LOTE` Badge azul: OS faz parte de um lote

**Campos principais:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| order_number | int | Auto | Sequencial por tenant |
| client_id | UUID | ✅ | Cliente |
| equipment_id | UUID | ✅ | Equipamento |
| technician_id | UUID | ❌ | Técnico responsável |
| status | enum | ✅ | Estado atual |
| reported_defect | text | ❌ | Defeito relatado |
| diagnosis | text | ❌ | Parecer técnico |
| notes | text | ❌ | Observações internas |
| payment_method | string | ❌ | Forma de pagamento |
| warranty_days | int | ✅ | Default: 90 |
| entry_date | date | ✅ | Data de entrada |
| items | array | ❌ | Serviços e peças |

**Formas de Pagamento:**
- Dinheiro
- PIX
- Cartão Crédito
- Cartão Débito
- Transferência
- A combinar

**Fluxo de Status:**
```
  ┌─────────┐
  │ ABERTA  │
  └────┬────┘
       │ Cliente aprova
       ▼
  ┌──────────┐
  │ APROVADA │
  └────┬─────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌────────────────┐
│ CONCLUÍDA   │   │ AG. PEÇA       │
└──────┬──────┘   └───────┬────────┘
       │                  │
       │                  │ Peça chegou
       │◄─────────────────┘
       │
       ▼
  ┌───────────┐
  │ ENTREGUE  │
  └───────────┘

(Qualquer status pode ir para CANCELADA)
```

---

### 5.6 Sistema de Lotes

O sistema de lotes permite agrupar múltiplas OS quando um cliente traz vários equipamentos de uma vez.

**Estrutura:**
- `lote_numero`: Número do lote (igual ao order_number da primeira OS)
- `lote_sufixo`: Letra sequencial (A, B, C...)

**Exemplo:**
```
Cliente traz 3 equipamentos:
- OS #0025-A: Esmerilhadeira Dewalt
- OS #0025-B: Plaina HLT DX36
- OS #0025-C: Martelo Bosch GSH 11e

Todas compartilham lote_numero = 25
```

**Funcionalidades:**
- Badge "LOTE" na listagem
- Banner azul nos detalhes mostrando todos os itens
- Navegação rápida entre itens do lote
- "Adicionar ao Lote" - botão para incluir novo equipamento
- PDF individual ou PDF do lote completo
- PDF Resumo: documento consolidado com tabela e valor total

---

### 5.7 Configurações da Empresa

**Rota:** `/configuracoes`

**Campos:**
| Campo | Descrição |
|-------|-----------|
| name | Nome da empresa |
| document | CNPJ |
| phone | Telefone principal |
| phone2 | Telefone secundário |
| email | Email de contato |
| address_* | Endereço completo |
| logo_url | Logo em Base64 (até 200KB) |
| header_text | Texto no cabeçalho do PDF |
| footer_text | Aviso legal no PDF |
| admin_pin | PIN para exclusões |

**Upload de Logo:**
- Aceita JPG, PNG, WebP
- Limite: 200KB
- Armazenado como Base64
- Exibido na sidebar e no PDF

---

### 5.8 Financeiro

**Rota:** `/financeiro`

Módulo de controle financeiro básico.

**Funcionalidades:**
- Resumo mensal de faturamento
- Contador de OS concluídas
- Cálculo de ticket médio
- Gráfico de faturamento (planejado)

**Cálculo automático:**
OS com status `concluida` ou `entregue` gera lançamento financeiro.

---

### 5.9 Painel Master (Super Admin)

**Rota:** `/master` (apenas role: super_admin)

**Funcionalidades:**

1. **Status do Sistema:**
   - Banco de Dados (Neon): Status e latência
   - Backup (GitHub): Último backup e tamanho
   - Deploy (Render): Status do serviço

2. **Métricas Globais:**
   - Total de tenants
   - Total de usuários
   - Total de OS em todo o sistema

3. **Gestão de Tenants:**
   - Lista de todos os tenants
   - Criar novo tenant
   - Editar tenant existente
   - Ativar/desativar tenant
   - Impersonate (acessar como tenant)

**Criar Tenant:**
```javascript
{
  name: "Nome da Empresa",
  slug: "empresa-exemplo",
  adminEmail: "admin@empresa.com",
  adminPassword: "senhaInicial",
  plan: "basic",
  status: "active"
}
```

---

## 6. Funcionalidades Especiais


### 6.1 Geração de PDF

O sistema gera PDFs profissionais para impressão usando **PDFKit**.

**Formatos disponíveis:**

1. **PDF Individual:** Uma OS por página (2 vias para corte)
2. **PDF do Lote (Individual):** Múltiplas OS, uma página por equipamento
3. **PDF do Lote (Resumo):** Documento consolidado com tabela e valor total

**Layout do PDF Individual:**
```
┌─────────────────────────────────────────────────────┐
│  [LOGO]   NOME DA EMPRESA                           │
│           Telefones | Endereço                      │
│           Texto do cabeçalho                        │
├─────────────────────────────────────────────────────┤
│  ORÇAMENTO Nº #0025-A              DATA: 28/07/2026 │
├─────────────────────────────────────────────────────┤
│  CLIENTE: Nome do Cliente          TEL: (21) 99999  │
│  DOC: 123.456.789-00                                │
│  MÁQUINA: Furadeira - Bosch GSB 13  Nº SÉRIE: ABC   │
│  SITUAÇÃO: Carvão travado por sujeira               │
│  DIAGNÓSTICO: Necessita limpeza e troca de carvão   │
├─────────────────────────────────────────────────────┤
│  (Aviso legal dos 180 dias)                         │
├─────────────────────────────────────────────────────┤
│  QTD │ PARECER TÉCNICO                      │ VALOR │
│  1   │ Troca de carvão                      │ R$ 30 │
│  1   │ Mão de obra                          │ R$ 50 │
├─────────────────────────────────────────────────────┤
│                            VALOR TOTAL: R$ 80,00    │
│  Pagamento: PIX | Garantia: 90 dias | Téc: Carlos   │
├─────────────────────────────────────────────────────┤
│  ________________          ________________          │
│  Assinatura Cliente        Assinatura Técnico       │
└─────────────────────────────────────────────────────┘
- - - - - - - - - - LINHA DE CORTE - - - - - - - - - -
┌─────────────────────────────────────────────────────┐
│                    (2ª VIA - IGUAL)                 │
└─────────────────────────────────────────────────────┘
```

**PDF Resumo do Lote:**
```
┌─────────────────────────────────────────────────────┐
│  [LOGO]   NOME DA EMPRESA                           │
│           Telefones | Endereço                      │
├─────────────────────────────────────────────────────┤
│            RESUMO DO LOTE #0025                     │
├─────────────────────────────────────────────────────┤
│  CLIENTE: Rodrigo Reis                              │
│  DOCUMENTO: 123.456.789-00    TELEFONE: (21) 97361  │
│  DATA: 28/07/2026             ITENS DO LOTE: 3      │
├─────────────────────────────────────────────────────┤
│  OS     │ EQUIPAMENTO         │ DIAGNÓSTICO │ VALOR │
│  0025-A │ Esmerilh. Dewalt    │ Sujeira     │ R$ 50 │
│  0025-B │ Plaina HLT DX36     │ Acúmulo pó  │ R$ 60 │
│  0025-C │ Martelo Bosch 11e   │ Não bate    │ R$ 80 │
├─────────────────────────────────────────────────────┤
│                          VALOR TOTAL: R$ 190,00     │
├─────────────────────────────────────────────────────┤
│  DETALHAMENTO POR EQUIPAMENTO:                      │
│  OS #0025-A - Dewalt DW4120:                        │
│    • 1x Mão de obra - R$ 50,00                      │
│  OS #0025-B - HLT DX36:                             │
│    • 1x Mão de obra - R$ 30,00                      │
│    • 1x Limpeza - R$ 30,00                          │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  (Aviso legal dos 180 dias)                         │
├─────────────────────────────────────────────────────┤
│  ________________          ________________          │
│  Assinatura Cliente        Assinatura Responsável   │
└─────────────────────────────────────────────────────┘
```

---

### 6.2 Integração WhatsApp

O botão WhatsApp gera uma mensagem pré-formatada e abre o WhatsApp Web/App.

**Mensagem gerada:**
```
Olá, *Rodrigo Reis*! 👋

Segue informação sobre sua OS:

📋 *OS #0025-A*
🔧 Equipamento: Esmerilhadeira Dewalt DW4120
📌 Status: *Concluída*

❌ *Defeito Relatado:*
Carvão travado por sujeira

✅ *Diagnóstico:*
Limpeza realizada, carvão substituído

📝 *Orçamento Detalhado:*
• Troca de carvão - *R$ 30,00*
• Mão de obra - *R$ 50,00*

💰 *VALOR TOTAL: R$ 80,00*

💳 Pagamento: PIX
🛡️ Garantia: 90 dias

_Mediante a realização ou não do serviço, a máquina deverá 
ser retirada no prazo de 180 dias (PL 2545/22)._
```

**Implementação:**
```javascript
const phone = order.client_phone.replace(/\D/g, '');
const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;
const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
window.open(url, '_blank');
```

---

### 6.3 Busca Global

Atalho: `Ctrl+K` ou clique no campo de busca no header.

**Busca em:**
- Clientes (nome, documento, telefone)
- Ordens de Serviço (número, diagnóstico)
- Equipamentos (tipo, marca, modelo, série)

**Resultados agrupados por categoria** com destaque do termo buscado.

---

### 6.4 PIN de Segurança

Operações destrutivas requerem PIN do administrador:
- Exclusão de clientes
- Exclusão de equipamentos
- Exclusão de OS
- Exclusão de técnicos

**Configuração:** Em "Configurações da Empresa" > "PIN do Administrador"

---

### 6.5 Duplicar OS

Cria uma cópia da OS atual com:
- Novo número sequencial
- Mesmo cliente e equipamento
- Status: aberta
- Itens copiados

Útil para serviços recorrentes no mesmo equipamento.

---

### 6.6 Histórico de Equipamento

Timeline completa de todos os serviços realizados em um equipamento:
- Data de cada OS
- Status
- Diagnóstico
- Valor
- Técnico responsável

---

### 6.7 Backup Automático

**GitHub Actions** executa backup 2x por dia (8h e 20h BRT):

```yaml
# .github/workflows/backup.yml
name: Database Backup
on:
  schedule:
    - cron: '0 11,23 * * *'  # 8h e 20h BRT
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Backup database
        run: |
          pg_dump $DATABASE_URL | gzip > backup.sql.gz
      - name: Commit backup
        run: |
          git add .backups/
          git commit -m "backup: $(date)"
          git push
```

**Retenção:** 30 dias (backups antigos são removidos automaticamente)

---

## 7. Interface do Usuário

### 7.1 Design System

**Cores principais:**
```css
--primary: #2563eb;      /* Azul - ações principais */
--secondary: #64748b;    /* Cinza - secundário */
--success: #059669;      /* Verde - sucesso, concluído */
--warning: #d97706;      /* Âmbar - atenção, aprovado */
--danger: #dc2626;       /* Vermelho - perigo, cancelado */
--purple: #7c3aed;       /* Violeta - aguardando peça */
--indigo: #4f46e5;       /* Índigo - entregue */
```

**Cores de status:**
| Status | Cor | Hex |
|--------|-----|-----|
| Aberta | Azul | #2563eb |
| Aprovada | Âmbar | #d97706 |
| Aguardando Peça | Violeta | #7c3aed |
| Concluída | Verde | #059669 |
| Entregue | Índigo | #4f46e5 |
| Cancelada | Vermelho | #dc2626 |

**Tipografia:**
- Fonte: Inter (Google Fonts)
- Pesos: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

**Espaçamento:**
- Base: 4px
- Escala: 4, 8, 12, 16, 24, 32, 48, 64

### 7.2 Componentes

| Componente | Uso |
|------------|-----|
| `PageHeader` | Título + botões de ação no topo |
| `SearchInput` | Campo de busca com ícone |
| `ConfirmModal` | Diálogo de confirmação |
| `PinModal` | Solicitação de PIN |
| `QuickClientModal` | Cadastro rápido de cliente |
| `QuickEquipmentModal` | Cadastro rápido de equipamento |
| `LotePdfModal` | Seleção de formato e itens para PDF do lote |
| `GlobalSearch` | Busca global (Ctrl+K) |

### 7.3 Responsividade

**Breakpoints:**
```css
/* Mobile */
@media (max-width: 767px) { ... }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

**Adaptações mobile:**
- Sidebar vira bottom tab bar
- Tabelas viram cards
- Formulários em coluna única
- Botões ocupam largura total

---

## 8. API Reference


### 8.1 Autenticação

#### POST /api/v1/auth/login
Autentica usuário e retorna JWT.

**Request:**
```json
{
  "email": "usuario@empresa.com",
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
      "email": "usuario@empresa.com",
      "role": "admin"
    },
    "tenant": {
      "id": "uuid",
      "name": "Nome da Empresa",
      "slug": "empresa"
    }
  }
}
```

---

### 8.2 Clientes

#### GET /api/v1/clients
Lista clientes com paginação e busca.

**Query params:**
- `search` - Busca por nome, documento ou telefone
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 10)

#### GET /api/v1/clients/:id
Retorna cliente por ID.

#### POST /api/v1/clients
Cria novo cliente.

**Body:**
```json
{
  "name": "João Silva",
  "document": "123.456.789-00",
  "phone": "(21) 99999-1234",
  "email": "joao@email.com"
}
```

#### PUT /api/v1/clients/:id
Atualiza cliente.

#### DELETE /api/v1/clients/:id
Soft delete do cliente (requer PIN).

**Headers:**
```
X-Admin-Pin: 1234
```

---

### 8.3 Equipamentos

#### GET /api/v1/equipment
Lista equipamentos.

**Query params:**
- `search` - Busca por tipo, marca, modelo ou série
- `client_id` - Filtrar por cliente

#### GET /api/v1/equipment/:id
Retorna equipamento.

#### GET /api/v1/equipment/:id/history
Retorna histórico de OS do equipamento.

#### POST /api/v1/equipment
Cria equipamento.

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

---

### 8.4 Técnicos

#### GET /api/v1/technicians
Lista técnicos.

**Query params:**
- `active` - Filtrar por status (true/false)

#### POST /api/v1/technicians
Cria técnico.

#### PUT /api/v1/technicians/:id
Atualiza técnico.

#### PATCH /api/v1/technicians/:id/toggle-active
Alterna status ativo/inativo.

---

### 8.5 Ordens de Serviço

#### GET /api/v1/service-orders
Lista OS com filtros.

**Query params:**
- `search` - Busca por número ou cliente
- `status` - Filtrar por status
- `page`, `limit` - Paginação

#### GET /api/v1/service-orders/:id
Retorna OS com dados relacionados.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": 25,
    "lote_numero": 25,
    "lote_sufixo": "A",
    "status": "concluida",
    "client_name": "Rodrigo Reis",
    "client_phone": "(21) 97361-8236",
    "equipment_type": "Esmerilhadeira",
    "equipment_brand": "Dewalt",
    "equipment_model": "DW4120",
    "technician_name": "Carlos",
    "reported_defect": "Carvão travado",
    "diagnosis": "Limpeza realizada",
    "items": [
      { "quantity": 1, "description": "Mão de obra", "unit_price": 50 }
    ],
    "lote_items": [
      { "id": "uuid", "lote_sufixo": "B", "status": "aberta", ... },
      { "id": "uuid", "lote_sufixo": "C", "status": "concluida", ... }
    ]
  }
}
```

#### POST /api/v1/service-orders
Cria nova OS.

**Body:**
```json
{
  "client_id": "uuid",
  "equipment_id": "uuid",
  "technician_id": "uuid",
  "reported_defect": "Descrição do defeito",
  "entry_date": "2026-07-28",
  "items": [
    { "quantity": 1, "description": "Mão de obra", "unit_price": 50 }
  ]
}
```

#### PATCH /api/v1/service-orders/:id/status
Atualiza status da OS.

**Body:**
```json
{
  "status": "concluida"
}
```

#### POST /api/v1/service-orders/:id/duplicate
Duplica a OS.

#### POST /api/v1/service-orders/:id/add-to-lote
Adiciona novo equipamento ao lote da OS.

**Body:**
```json
{
  "equipment_id": "uuid",
  "technician_id": "uuid",
  "reported_defect": "Defeito do novo equipamento"
}
```

---

### 8.6 PDF

#### GET /api/v1/pdf/service-orders/:id/pdf
Gera PDF da OS.

**Query params:**
- `lote=true` - Incluir todas as OS do lote
- `formato=individual|resumo` - Formato do PDF
- `status=concluida,entregue` - Filtrar por status
- `ids=uuid1,uuid2` - IDs específicos

**Response:** `application/pdf`

---

### 8.7 Configurações

#### GET /api/v1/company-settings
Retorna configurações da empresa.

#### PUT /api/v1/company-settings
Atualiza configurações.

**Body:**
```json
{
  "name": "Eletrotécnica São Miguel",
  "phone": "(21) 97567-3028",
  "logo_url": "data:image/png;base64,...",
  "footer_text": "Aviso legal...",
  "admin_pin": "1234"
}
```

---

### 8.8 Dashboard

#### GET /api/v1/dashboard/stats
Retorna estatísticas do dashboard.

---

### 8.9 Master (Super Admin)

#### GET /api/v1/master/tenants
Lista todos os tenants.

#### POST /api/v1/master/tenants
Cria novo tenant.

#### PUT /api/v1/master/tenants/:id
Atualiza tenant.

#### GET /api/v1/master/status
Retorna status do sistema (DB, backup, deploy).

#### POST /api/v1/master/impersonate/:tenantId
Gera token para acessar como tenant.

---

## 9. Integrações

### 9.1 WhatsApp (wa.me)

Integração via URL scheme do WhatsApp:
```
https://wa.me/{telefone}?text={mensagem_codificada}
```

Não requer API paga, funciona via redirecionamento.

### 9.2 Web Share API (Mobile)

Para compartilhar PDF no celular:
```javascript
if (navigator.canShare && navigator.canShare({ files: [file] })) {
  await navigator.share({
    title: 'OS #0025',
    text: 'Ordem de Serviço',
    files: [file]
  });
}
```

### 9.3 GitHub API (Backups)

Consulta status dos backups via API pública do GitHub:
```
GET https://api.github.com/repos/{owner}/{repo}/actions/runs
```

---

## 10. Infraestrutura e Deploy

### 10.1 Ambiente de Desenvolvimento

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configurar variáveis
npm run migrate       # Criar tabelas
npm run seed          # Dados de teste
npm run dev           # Inicia em localhost:3000

# Frontend
cd frontend
npm install
npm run dev           # Inicia em localhost:5173
```

### 10.2 Variáveis de Ambiente

**Backend (.env):**
```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa

# Admin
MASTER_EMAIL=admin@oslaboris.com
MASTER_PASSWORD=senha-master
```

### 10.3 Deploy (Render)

O sistema está deployado no **Render** como Web Service.

**Configuração:**
- **Build Command:** `cd frontend && npm install && npm run build && cd ../backend && npm install`
- **Start Command:** `cd backend && npm start`
- **Root Directory:** `/`
- **Environment:** Node.js 20

**Variáveis no Render:**
- `DATABASE_URL` - String de conexão Neon
- `JWT_SECRET` - Chave secreta
- `NODE_ENV=production`

### 10.4 Banco de Dados (Neon)

PostgreSQL serverless na **Neon.tech** (plano gratuito).

**Características:**
- Auto-suspend após 5 min de inatividade
- 0.5 GB de storage
- Conexão via SSL obrigatória

### 10.5 Anti-Sleep (UptimeRobot)

Serviço gratuito que faz ping a cada 5 minutos para evitar que o Render adormeça.

---

## 11. Segurança

### 11.1 Autenticação

- JWT com expiração de 24h
- Senha hashada com bcrypt (salt rounds: 10)
- Token armazenado em localStorage
- Rascunho de formulário salvo localmente para prevenir perda de dados

### 11.2 Autorização

- Middleware verifica JWT em todas as rotas protegidas
- Middleware de tenant isola dados por tenant_id
- Role-based access control (RBAC)

### 11.3 Validação

- Validação de entrada em todos os endpoints
- Sanitização de dados
- Validação de CPF/CNPJ com dígitos verificadores

### 11.4 SQL Injection

- Knex.js usa queries parametrizadas
- Nunca concatena strings em queries

### 11.5 XSS

- React escapa HTML por padrão
- Não usa `dangerouslySetInnerHTML`

### 11.6 CORS

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### 11.7 PIN Administrativo

- Operações destrutivas requerem PIN
- PIN hashado no banco
- Rate limiting: 5 tentativas por combinação tenant+IP
- Cooldown de 5 minutos após bloqueio
- Mensagem genérica não revela se é bloqueio ou PIN errado

**Tabela de controle:**
```sql
CREATE TABLE pin_attempts (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  ip_address VARCHAR(45),
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP,
  blocked_until TIMESTAMP
);
```

### 11.8 Impersonate (Auditoria)

Quando um super_admin acessa como outro tenant:

- Log registrado na tabela `impersonate_logs`
- Banner laranja fixo no topo da página
- Impossível descartar o banner
- Botão para encerrar sessão de impersonate

**Dados registrados:**
```sql
CREATE TABLE impersonate_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  ip_address VARCHAR(45),
  actions_summary TEXT
);
```

### 11.9 Rascunho de Formulário (Draft)

Para evitar perda de dados quando token JWT expira:

- Formulário de OS salva automaticamente a cada 2 segundos
- Dados armazenados em localStorage
- Ao reabrir formulário, banner oferece restaurar ou descartar
- Rascunho limpo após salvar com sucesso

**Hook:**
```typescript
const { hasDraft, saveDraft, clearDraft } = useFormDraft({
  key: 'os_new',
  initialData: emptyForm,
  debounceMs: 2000
});
```

---

## 12. Acessibilidade (WCAG)

### 12.1 aria-label em Botões de Ícone

Todos os botões com apenas ícone possuem:
- `aria-label` descritivo com nome da entidade
- `title` para tooltip visual

**Exemplo:**
```jsx
<button 
  aria-label="Editar João Silva"
  title="Editar João Silva"
>
  <FiEdit2 />
</button>
```

### 12.2 Contraste de Cores (WCAG AA)

Badges de status com contraste mínimo de 4.5:1:

| Status | Background | Texto | Contraste |
|--------|------------|-------|-----------|
| Aberta | #dbeafe | #1e40af | 7.2:1 ✓ |
| Aprovada | #fef3c7 | #78350f | 6.8:1 ✓ |
| Aguardando | #ede9fe | #5b21b6 | 5.1:1 ✓ |
| Concluída | #d1fae5 | #064e3b | 7.5:1 ✓ |
| Entregue | #e0f2fe | #0c4a6e | 6.3:1 ✓ |
| Cancelada | #fee2e2 | #7f1d1d | 5.8:1 ✓ |

### 12.3 Ícones nos Status (Daltonismo)

Para usuários com daltonismo, cada status tem ícone via CSS `::before`:

```css
.status-aberta::before { content: "○"; }
.status-aprovada::before { content: "✓"; }
.status-aguardando_peca::before { content: "⏳"; }
.status-concluida::before { content: "✓✓"; }
.status-entregue::before { content: "📦"; }
.status-cancelada::before { content: "✕"; }
```

### 12.4 Paleta Diferenciada do Master

Painel Master Admin usa cyan (#0891b2) para diferenciar visualmente do sistema do tenant (azul), evitando confusão para super_admins.

---

## 13. Guia de Uso


### 13.1 Primeiro Acesso

1. Acesse o sistema pelo navegador
2. Faça login com email e senha fornecidos
3. Configure os dados da empresa em "Configurações"
4. Cadastre seus técnicos
5. Comece a cadastrar clientes e criar OS

### 13.2 Fluxo de uma Ordem de Serviço

```
1. RECEBER EQUIPAMENTO
   └─► Cadastrar cliente (se novo)
   └─► Cadastrar equipamento (se novo)
   └─► Criar OS → Status: ABERTA

2. DIAGNÓSTICO
   └─► Editar OS
   └─► Preencher diagnóstico e itens
   └─► Enviar orçamento via WhatsApp

3. APROVAÇÃO
   └─► Cliente aprova
   └─► Mudar status: APROVADA

4. EXECUÇÃO
   └─► Se precisa peça → Status: AGUARDANDO PEÇA
   └─► Realizar serviço
   └─► Mudar status: CONCLUÍDA

5. ENTREGA
   └─► Gerar PDF
   └─► Receber pagamento
   └─► Mudar status: ENTREGUE
```

### 13.3 Criando um Lote

Quando cliente traz múltiplos equipamentos:

1. Crie a primeira OS normalmente
2. Na tela de detalhes, clique em **"+ Adicionar ao Lote"**
3. Cadastre o próximo equipamento
4. Repita para cada equipamento
5. Use **"PDF do Lote"** para imprimir todos ou selecionar por status

### 13.4 Imprimindo PDF Resumo

Para entregar documento consolidado:

1. Abra qualquer OS do lote
2. Clique em **"PDF do Lote"**
3. No modal:
   - Selecione formato **"Resumo"**
   - Filtre por status (ex: só Concluídas)
   - Selecione os equipamentos desejados
4. Clique em **"Gerar PDF"**
5. Documento terá tabela com todas as OS e valor total

### 13.5 Instalando como App (PWA)

**Android (Chrome):**
1. Acesse o sistema
2. Menu (⋮) → "Adicionar à tela inicial"
3. Confirme

**iOS (Safari):**
1. Acesse o sistema
2. Compartilhar → "Adicionar à Tela de Início"
3. Confirme

**Desktop (Chrome):**
1. Acesse o sistema
2. Ícone de instalação na barra de endereço
3. Clique em "Instalar"

### 13.6 Backup e Recuperação

Backups são automáticos (2x/dia) e armazenados no GitHub.

**Para restaurar (requer acesso ao servidor):**
```bash
gunzip < backup_YYYY-MM-DD.sql.gz | psql $DATABASE_URL
```

### 13.7 Dicas de Uso

**Atalhos:**
- `Ctrl+K` - Busca global
- Clique nos cards do dashboard para filtrar OS

**Dicas:**
- Use "Duplicar OS" para serviços recorrentes
- O histórico do equipamento mostra todos os serviços anteriores
- Envie o PDF pelo WhatsApp usando o botão de compartilhar no celular
- Configure o aviso legal no rodapé do PDF em Configurações

---

## Anexos

### A. Glossário

| Termo | Significado |
|-------|-------------|
| **Tenant** | Empresa/cliente do SaaS (ambiente isolado) |
| **OS** | Ordem de Serviço |
| **Lote** | Grupo de OS do mesmo cliente |
| **PWA** | Progressive Web App |
| **JWT** | JSON Web Token |
| **Soft Delete** | Exclusão lógica (marca deleted_at) |

### B. Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Erro de validação |
| 401 | Não autenticado |
| 403 | Não autorizado (PIN incorreto) |
| 404 | Não encontrado |
| 500 | Erro interno |

### C. Contato e Suporte

**Repositório:** https://github.com/daflon/laboris

**Demo:** https://os-laboris.onrender.com

---

*Documento gerado em Julho de 2026*
*OS Laboris v1.0*
