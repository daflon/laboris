# OS Laboris — Sistema de Ordem de Serviço

Sistema de gestão de Ordens de Serviço para assistência técnica de ferramentas elétricas.

## Stack

- **Backend:** Node.js + Express + Knex
- **Frontend:** React + TypeScript + Vite
- **Banco de dados:** SQLite (dev) / PostgreSQL (produção)
- **PDF:** PDFKit

## Funcionalidades implementadas

### Dashboard
- Cards com contadores por status (Abertas, Aprovadas, Aguardando Peça, Concluídas, Entregues, Clientes)
- Ranking gamificado de técnicos (🥇🥈🥉 com barra de progresso)
- Últimas OS criadas com acesso rápido
- Resumo de OS em andamento
- Cards clicáveis que filtram a listagem de OS

### Ordens de Serviço
- CRUD completo com número sequencial automático (#0001, #0002...)
- Vinculação: Cliente → Equipamento → Técnico
- Tabela de itens (Qtd / Parecer Técnico / Valor) com cálculo automático do total
- Status: Aberta, Aprovada, Aguardando Peça, Concluída, Entregue, Cancelada
- Mudança rápida de status direto na listagem (select inline)
- Forma de pagamento (lista fixa) e garantia em dias
- Cadastro rápido de cliente e equipamento na abertura da OS (modal)
- Geração de PDF profissional (2 vias em A4 para corte)
- Botão WhatsApp com mensagem pré-formatada (wa.me)
- Filtro por status e busca por nº da OS ou nome do cliente
- Aviso legal dos 180 dias (PL 2545/22)

### Clientes
- CRUD com validação de CPF/CNPJ (dígitos verificadores)
- Busca por nome ou documento
- Visualização de detalhes com equipamentos vinculados
- Soft delete

### Técnicos
- CRUD com toggle ativo/inativo
- Filtro por status
- Especialidade em texto livre
- Soft delete

### Equipamentos
- CRUD vinculado a cliente
- Coluna "Cliente" na listagem geral
- Busca por tipo, marca, modelo, nº série ou nome do cliente
- Histórico de reparos (timeline com todas as OS do equipamento)
- Soft delete

### Configurações da Empresa
- Dados completos (nome, CNPJ, telefones, email, endereço)
- Personalização de impressões (logo URL, texto cabeçalho, texto rodapé)
- Garantia padrão configurável
- White-label: permite replicar para outros clientes

### UX
- Layout com sidebar e navegação
- Badge com contador de OS pendentes na sidebar
- Máscaras de input (CPF/CNPJ, telefone, CEP)
- Paginação em todas as listagens
- Toasts de feedback em ações
- Modal de confirmação para exclusões
- CSS de impressão

## Pré-requisitos

- Node.js 18+

## Configuração

### Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

O servidor estará em `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará em `http://localhost:5173`.

### Popular com dados de teste

```bash
cd backend
node seed.js
```

## Estrutura

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── database/migrations/
│   │   └── utils/
│   ├── seed.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── .kiro/specs/
│   ├── etapa1-cadastros-crud.md
│   ├── etapa2-ordens-de-servico.md
│   └── roadmap.md
└── README.md
```

## API Endpoints

### Dashboard — `/api/v1/dashboard`
- `GET /stats` — Contadores, ranking, últimas OS

### Ordens de Serviço — `/api/v1/service-orders`
- `POST /` — Criar OS com itens
- `GET /` — Listar (query: search, status, page, limit)
- `GET /:id` — Detalhes completos
- `PUT /:id` — Atualizar OS + itens
- `PATCH /:id/status` — Alterar status
- `DELETE /:id` — Soft delete

### PDF — `/api/v1/pdf`
- `GET /service-orders/:id/pdf` — Gerar PDF da OS (2 vias A4)

### Clientes — `/api/v1/clients`
- `POST /` — Criar
- `GET /` — Listar (query: search, page, limit)
- `GET /:id` — Detalhes + equipamentos
- `PUT /:id` — Atualizar
- `DELETE /:id` — Soft delete

### Técnicos — `/api/v1/technicians`
- `POST /` — Criar
- `GET /` — Listar (query: search, status, page, limit)
- `GET /:id` — Detalhes
- `PUT /:id` — Atualizar
- `PATCH /:id/toggle-status` — Alternar ativo/inativo
- `DELETE /:id` — Soft delete

### Equipamentos — `/api/v1/equipment`
- `POST /` — Criar
- `GET /` — Listar (query: search, client_id, page, limit)
- `GET /:id` — Detalhes
- `GET /:id/history` — Histórico de OS
- `PUT /:id` — Atualizar
- `DELETE /:id` — Soft delete

### Configurações — `/api/v1/company`
- `GET /` — Obter dados da empresa
- `PUT /` — Salvar/atualizar dados da empresa
