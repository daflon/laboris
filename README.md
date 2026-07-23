# OS Laboris — Sistema de Ordem de Serviço

Sistema de gestão de Ordens de Serviço para assistência técnica de ferramentas elétricas.  
PWA instalável — funciona como app no celular.

## Stack

- **Backend:** Node.js + Express + Knex
- **Frontend:** React + TypeScript + Vite
- **Banco de dados:** SQLite (dev) / PostgreSQL (produção)
- **PDF:** PDFKit
- **PWA:** Service Worker + Web App Manifest

## Funcionalidades

### Dashboard
- Cards com contadores por status (clicáveis pra filtrar)
- Ranking gamificado de técnicos (🥇🥈🥉)
- Últimas OS criadas com acesso rápido

### Ordens de Serviço
- CRUD completo com número sequencial automático (#0001, #0002...)
- Vinculação: Cliente → Equipamento → Técnico
- Tabela de itens (Qtd / Parecer Técnico / Valor) com cálculo automático
- Status: Aberta, Aprovada, Aguardando Peça, Concluída, Entregue, Cancelada
- Mudança rápida de status direto na listagem
- Cadastro rápido de cliente e equipamento (modal na abertura da OS)
- Botão "Duplicar OS"
- Geração de PDF profissional (2 vias em A4 para corte)
- Botão WhatsApp com mensagem pré-formatada
- PIN admin para exclusões + log de auditoria

### Clientes
- CRUD com validação de CPF/CNPJ (dígitos verificadores)
- Busca por nome, documento ou telefone
- Detalhes com equipamentos vinculados

### Técnicos
- CRUD com toggle ativo/inativo
- Filtro por status e busca por especialidade

### Equipamentos
- CRUD vinculado a cliente
- Coluna "Cliente" na listagem geral
- Busca por tipo, marca, modelo, nº série ou cliente
- Histórico de reparos (timeline de todas as OS)

### Configurações da Empresa
- Dados completos (nome, CNPJ, telefones, email, endereço)
- Personalização de impressões (logo, cabeçalho, rodapé)
- Garantia padrão e PIN do administrador
- White-label (replicável para outros clientes)

### Busca Global
- Campo no topo de todas as telas
- Busca em tempo real: clientes, OS, equipamentos
- Resultados agrupados por categoria

### Mobile e PWA
- Responsividade completa (tablet e celular)
- Navegação mobile com bottom tab bar fixa
- Instalável como app (ícone na home, tela cheia)
- Service worker com cache de assets

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

Servidor: `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

### Testar no celular (mesma rede Wi-Fi)

Acesse `http://SEU_IP:5173` no navegador do celular.  
O IP aparece no terminal quando roda `npm run dev` (ex: `http://192.168.1.5:5173`).

### Instalar como app no celular

1. Acesse o sistema pelo Chrome no celular
2. Menu (⋮) → "Adicionar à tela inicial" ou "Instalar app"
3. Pronto — ícone na home, abre em tela cheia

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
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── icons/
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

| Grupo | Rota base | Operações |
|-------|-----------|-----------|
| Dashboard | `/api/v1/dashboard` | GET /stats |
| OS | `/api/v1/service-orders` | CRUD + PATCH status + POST duplicate |
| PDF | `/api/v1/pdf` | GET /service-orders/:id/pdf |
| Clientes | `/api/v1/clients` | CRUD |
| Técnicos | `/api/v1/technicians` | CRUD + PATCH toggle-status |
| Equipamentos | `/api/v1/equipment` | CRUD + GET /:id/history |
| Empresa | `/api/v1/company` | GET + PUT |
| Busca | `/api/v1/search` | GET ?q= |
| Admin | `/api/v1/admin` | POST verify-pin, POST audit-log, GET audit-logs |

## Versionamento

- `v1.0` — Sistema completo pré-polish
- Commits incrementais com responsividade e PWA
- UI Polish disponível no histórico git (pode ser reaplicado)
