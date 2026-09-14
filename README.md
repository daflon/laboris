# OS Laboris — Sistema de Ordem de Serviço

Sistema SaaS multi-tenant de gestão de Ordens de Serviço para assistência técnica de ferramentas elétricas.  
PWA instalável — funciona como app no celular.

**🌐 Demo:** [os-laboris.onrender.com](https://os-laboris.onrender.com)  
**📖 Docs:** [daflon.github.io/laboris](https://daflon.github.io/laboris/)

## Stack

- **Backend:** Node.js + Express + Knex
- **Frontend:** React + TypeScript + Vite
- **Banco de dados:** PostgreSQL (Neon - Serverless)
- **Tipografia:** Inter (Google Fonts)
- **PDF:** PDFKit
- **PWA:** Service Worker + Web App Manifest
- **Deploy:** Render (backend + frontend unificado)
- **Backup:** GitHub Actions (2x/dia)
- **Monitoramento:** UptimeRobot

## Funcionalidades

### Dashboard
- Cards com contadores por status (clicáveis pra filtrar)
- Alertas de atenção (⏰ OS antigas, ⚠️ equipamentos abandonados)
- Ranking gamificado de técnicos (🥇🥈🥉)
- Últimas OS criadas com acesso rápido

### Ordens de Serviço
- CRUD completo com número sequencial automático (#0001, #0002...)
- Vinculação: Cliente → Equipamento → Técnico
- Tabela de itens (Qtd / Parecer Técnico / Valor) com cálculo automático
- **Campo Sinal:** valor de entrada/depósito separado (exibido nos detalhes e WhatsApp)
- Status: Aberta, Avisada, Aguardando Peça, Concluída, Entregue, Cancelada
- Badges de status em formato pill com ícones (acessibilidade)
- Mudança rápida de status direto na listagem
- Cadastro rápido de cliente e equipamento (modal na abertura da OS)
- Botão "Duplicar OS"
- **Sistema de Lotes:** agrupa múltiplos equipamentos do mesmo cliente (0025-A, 0025-B...)
- Geração de PDF profissional (2 vias em A4 para corte)
- PDF do Lote: Individual ou Resumo consolidado
- Botão WhatsApp com mensagem pré-formatada (inclui sinal quando informado)
- PIN admin para exclusões + log de auditoria

### Clientes
- CRUD com CPF/CNPJ opcional (validação de dígitos quando preenchido)
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

### Módulo Financeiro
- Lançamentos como **pendente** quando OS é concluída (baixa manual)
- Resumo financeiro inteligente:
  - **Saldo Real:** dinheiro efetivamente em caixa
  - **A Receber:** OS concluídas com pagamento pendente
  - **A Pagar:** despesas pendentes
  - **Saldo Previsto:** projeção incluindo pendentes
- Status: pendente → pago

### Configurações da Empresa
- Dados completos (nome, CNPJ, telefones, email, endereço)
- Upload de logo (Base64, até 200KB) - exibido na sidebar e PDF
- Personalização de cabeçalho/rodapé do PDF
- Garantia padrão e PIN do administrador
- White-label (cada tenant personaliza sua identidade)

### Busca Global
- Campo no topo de todas as telas (Ctrl+K)
- Busca em tempo real: clientes, OS, equipamentos
- Resultados agrupados por categoria

### Mobile e PWA
- Responsividade completa (tablet e celular)
- Bottom tab bar fixa com acesso a Financeiro
- Drawer "Mais" com Faturamento, Técnicos e Equipamentos
- Instalável como app (ícone na home, tela cheia)
- Service worker com cache de assets

### Multi-tenant (SaaS)
- Isolamento completo de dados por empresa
- Painel Master para super admin (paleta Cyan)
- Sistema de módulos por tenant
- Impersonate com log de auditoria e banner visual

### Segurança
- Rate limiting global e por endpoint sensível
- PIN com cooldown (5 tentativas em 5 min)
- Log de auditoria de todas as exclusões
- Soft delete (dados não são removidos permanentemente)
- Contraste WCAG AA nos badges de status

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
| OS | `/api/v1/service-orders` | CRUD + PATCH status + POST duplicate + POST add-to-lote |
| PDF | `/api/v1/pdf` | GET /service-orders/:id/pdf (individual ou lote) |
| Clientes | `/api/v1/clients` | CRUD |
| Técnicos | `/api/v1/technicians` | CRUD + PATCH toggle-status |
| Equipamentos | `/api/v1/equipment` | CRUD + GET /:id/history |
| Financeiro | `/api/v1/financeiro` | GET /resumo + GET /lancamentos |
| Empresa | `/api/v1/company` | GET + PUT |
| Busca | `/api/v1/search` | GET ?q= |
| Admin | `/api/v1/admin` | POST verify-pin, POST audit-log, GET audit-logs |
| Master | `/api/v1/master` | Gestão de tenants, impersonate, métricas |

## Versionamento

- `v1.0` — Sistema completo single-tenant
- `v2.0` — Multi-tenant SaaS com autenticação JWT
- `v2.1` — UI Polish (design tokens, tipografia Inter, badges pill)
- `v2.2` — Lotes de OS, PDF resumo, alertas visuais
- `v2.3` — Segurança (rate limiting, WCAG AA, logs de auditoria)
- `v2.4` — Financeiro inteligente (sinal, 4 indicadores, baixa manual), menu mobile PWA

## Design System

O projeto utiliza CSS com variáveis (design tokens) definidas no `:root`:

```css
:root {
  /* Espaçamento */
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;

  /* Cores */
  --color-primary: #3b82f6;
  --color-text: #1e293b;
  --color-border: #e2e8f0;

  /* Sombras */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);

  /* Tipografia */
  --font-family: 'Inter', sans-serif;
}
```

## Licença

Projeto privado — todos os direitos reservados.
