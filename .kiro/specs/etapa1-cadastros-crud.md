# Spec — Etapa 1: CRUDs de Clientes, Técnicos e Equipamentos

## 1. Visão Geral

Sistema de Ordem de Serviço para assistência técnica.  
Esta etapa cobre os cadastros básicos que servem de base para o módulo de OS:

- **Clientes** — pessoas físicas ou jurídicas que trazem equipamentos para reparo
- **Técnicos** — profissionais que executam os reparos
- **Equipamentos** — aparelhos vinculados a um cliente

**Stack:** Node.js + Express (backend), React (frontend), PostgreSQL (banco)

---

## 2. Requisitos Funcionais

### 2.1 Cadastro de Clientes

| ID | Requisito |
|----|-----------|
| CL-01 | Criar cliente com: nome, documento (CPF ou CNPJ), telefone, email (opcional), endereço completo |
| CL-02 | Listar clientes com busca por nome ou documento |
| CL-03 | Visualizar detalhes de um cliente, incluindo seus equipamentos |
| CL-04 | Editar dados do cliente |
| CL-05 | Excluir cliente (soft delete — marca `deleted_at`) |
| CL-06 | Não permitir exclusão se houver OS aberta/em andamento vinculada (etapa futura) |
| CL-07 | Documento deve ser único (não duplicar CPF/CNPJ) |
| CL-08 | Validar formato e dígitos verificadores de CPF e CNPJ |

### 2.2 Cadastro de Técnicos

| ID | Requisito |
|----|-----------|
| TC-01 | Criar técnico com: nome, telefone, especialidade (texto livre), status ativo/inativo |
| TC-02 | Listar técnicos com filtro por status (ativo/inativo/todos) |
| TC-03 | Editar dados do técnico |
| TC-04 | Inativar/reativar técnico (toggle do campo `active`) |
| TC-05 | Excluir técnico (soft delete) |
| TC-06 | Não permitir exclusão se houver OS aberta/em andamento vinculada (etapa futura) |

### 2.3 Cadastro de Equipamentos

| ID | Requisito |
|----|-----------|
| EQ-01 | Criar equipamento vinculado a um cliente existente, com: tipo, marca, modelo, número de série (opcional), observações (opcional) |
| EQ-02 | Listar equipamentos de um cliente específico |
| EQ-03 | Listar todos os equipamentos com busca por número de série, marca ou modelo |
| EQ-04 | Editar dados do equipamento |
| EQ-05 | Excluir equipamento (soft delete) |
| EQ-06 | Não permitir exclusão se houver OS aberta/em andamento vinculada (etapa futura) |
| EQ-07 | Um equipamento pertence a um único cliente (não transferível) |

---

## 3. Regras de Validação

### 3.1 Cliente

| Campo | Regra |
|-------|-------|
| name | Obrigatório, 3–200 caracteres |
| document | Obrigatório, CPF (11 dígitos) ou CNPJ (14 dígitos), validação de dígitos verificadores, único no sistema |
| phone | Obrigatório, 10–11 dígitos numéricos (aceita formatação na entrada, armazena só números) |
| email | Opcional, formato de email válido se preenchido |
| address_zip | Opcional, 8 dígitos (CEP) |
| address_street | Opcional, até 200 caracteres |
| address_number | Opcional, até 20 caracteres |
| address_complement | Opcional, até 100 caracteres |
| address_neighborhood | Opcional, até 100 caracteres |
| address_city | Opcional, até 100 caracteres |
| address_state | Opcional, 2 caracteres (UF) |

### 3.2 Técnico

| Campo | Regra |
|-------|-------|
| name | Obrigatório, 3–200 caracteres |
| phone | Obrigatório, 10–11 dígitos numéricos |
| specialty | Opcional, até 200 caracteres |
| active | Boolean, default `true` |

### 3.3 Equipamento

| Campo | Regra |
|-------|-------|
| client_id | Obrigatório, deve referenciar cliente existente (não deletado) |
| type | Obrigatório, até 100 caracteres (ex: serra mármore, serra tico-tico, furadeira, parafusadeira, esmerilhadeira) |
| brand | Obrigatório, até 100 caracteres |
| model | Obrigatório, até 100 caracteres |
| serial_number | Opcional, até 100 caracteres |
| notes | Opcional, texto livre |

---

## 4. Endpoints da API

Base URL: `/api/v1`

### 4.1 Clientes — `/clients`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/clients` | Criar cliente |
| GET | `/clients` | Listar clientes (query: `?search=`, `?page=`, `?limit=`) |
| GET | `/clients/:id` | Detalhes do cliente (inclui equipamentos) |
| PUT | `/clients/:id` | Atualizar cliente |
| DELETE | `/clients/:id` | Soft delete do cliente |

### 4.2 Técnicos — `/technicians`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/technicians` | Criar técnico |
| GET | `/technicians` | Listar técnicos (query: `?status=active|inactive|all`, `?search=`, `?page=`, `?limit=`) |
| GET | `/technicians/:id` | Detalhes do técnico |
| PUT | `/technicians/:id` | Atualizar técnico |
| PATCH | `/technicians/:id/toggle-status` | Alternar ativo/inativo |
| DELETE | `/technicians/:id` | Soft delete do técnico |

### 4.3 Equipamentos — `/equipment`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/equipment` | Criar equipamento |
| GET | `/equipment` | Listar todos (query: `?search=`, `?client_id=`, `?page=`, `?limit=`) |
| GET | `/equipment/:id` | Detalhes do equipamento |
| GET | `/clients/:id/equipment` | Listar equipamentos de um cliente |
| PUT | `/equipment/:id` | Atualizar equipamento |
| DELETE | `/equipment/:id` | Soft delete do equipamento |

---

## 5. Modelo de Dados

### 5.1 Tabela `clients`

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  document VARCHAR(18) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(200),
  address_street VARCHAR(200),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state CHAR(2),
  address_zip VARCHAR(8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### 5.2 Tabela `technicians`

```sql
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  specialty VARCHAR(200),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### 5.3 Tabela `equipment`

```sql
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  type VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_equipment_client_id ON equipment(client_id);
CREATE INDEX idx_equipment_serial_number ON equipment(serial_number);
```

---

## 6. Respostas da API

### 6.1 Formato padrão de sucesso

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 58
  }
}
```

### 6.2 Formato padrão de erro

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Documento inválido",
    "details": [
      { "field": "document", "message": "CPF com dígitos verificadores inválidos" }
    ]
  }
}
```

### 6.3 Códigos HTTP utilizados

| Código | Uso |
|--------|-----|
| 200 | Sucesso (GET, PUT, PATCH) |
| 201 | Criado com sucesso (POST) |
| 400 | Erro de validação |
| 404 | Recurso não encontrado |
| 409 | Conflito (documento duplicado) |
| 500 | Erro interno |

---

## 7. Estrutura do Projeto

```
os-laboris/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── clients.routes.js
│   │   │   ├── technicians.routes.js
│   │   │   └── equipment.routes.js
│   │   ├── controllers/
│   │   │   ├── clients.controller.js
│   │   │   ├── technicians.controller.js
│   │   │   └── equipment.controller.js
│   │   ├── services/
│   │   │   ├── clients.service.js
│   │   │   ├── technicians.service.js
│   │   │   └── equipment.service.js
│   │   ├── repositories/
│   │   │   ├── clients.repository.js
│   │   │   ├── technicians.repository.js
│   │   │   └── equipment.repository.js
│   │   ├── validators/
│   │   │   ├── clients.validator.js
│   │   │   ├── technicians.validator.js
│   │   │   └── equipment.validator.js
│   │   ├── middlewares/
│   │   │   ├── errorHandler.js
│   │   │   └── validateRequest.js
│   │   ├── database/
│   │   │   ├── connection.js
│   │   │   └── migrations/
│   │   └── utils/
│   │       ├── cpfCnpj.js
│   │       └── pagination.js
│   ├── package.json
│   ├── .env.example
│   └── knexfile.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
└── README.md
```

---

## 8. Dependências Previstas (Backend)

| Pacote | Função |
|--------|--------|
| express | Framework HTTP |
| knex | Query builder / migrations |
| pg | Driver PostgreSQL |
| zod | Validação de schemas |
| cors | CORS para frontend |
| dotenv | Variáveis de ambiente |
| helmet | Headers de segurança |
| uuid | Geração de UUIDs (caso necessário) |

---

## 9. Critérios de Aceite (Etapa 1)

- [x] CRUD completo de clientes funcionando via API
- [x] CRUD completo de técnicos funcionando via API
- [x] CRUD completo de equipamentos funcionando via API
- [x] Validação de CPF/CNPJ implementada (formato + dígitos verificadores)
- [x] Soft delete implementado nas três entidades
- [x] Paginação funcionando nos endpoints de listagem
- [x] Busca por texto funcionando (nome/documento em clientes, serial/marca/modelo em equipamentos)
- [x] Respostas da API seguem formato padronizado
- [x] Migrations criadas e rodando corretamente
- [x] Frontend com telas de listagem, criação e edição para as três entidades
- [x] Frontend se comunica corretamente com a API

---

## 10. Fora do Escopo (Etapa 1)

- Autenticação / autorização
- Módulo de Ordem de Serviço
- Geração de PDF
- Link de WhatsApp
- Histórico de reparos
- Deploy em cloud
