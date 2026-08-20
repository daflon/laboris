# Playbook — Laboris OS

Documento de referência técnica para replicar a arquitetura e padrões do projeto Laboris OS em novos projetos.

---

## 1. Stack Tecnológica

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Node.js | 18+ | Runtime JavaScript |
| Express | 4.21 | Framework HTTP |
| Knex | 3.1 | Query builder + migrations |
| PostgreSQL | - | Banco de dados (Neon em prod) |
| Zod | 3.23 | Validação de schemas |
| JWT | 9.0 | Autenticação stateless |
| bcryptjs | 3.0 | Hash de senhas |
| PDFKit | 0.19 | Geração de PDF |
| Helmet | 7.1 | Headers de segurança |
| express-rate-limit | 8.6 | Rate limiting |

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3 | UI library |
| TypeScript | 5.6 | Tipagem estática |
| Vite | 5.4 | Build tool + dev server |
| React Router DOM | 7.18 | Roteamento SPA |
| Axios | 1.18 | HTTP client |
| react-hot-toast | 2.6 | Notificações |
| react-icons | 5.7 | Ícones |
| vite-plugin-pwa | 1.3 | Progressive Web App |

### Infraestrutura

| Serviço | Propósito |
|---------|-----------|
| Render | Hospedagem (web service) |
| Neon | PostgreSQL serverless |
| GitHub Actions | CI/CD + backups |

---

## 2. Estrutura de Pastas

```
projeto/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Handlers HTTP
│   │   ├── services/         # Regras de negócio
│   │   ├── repositories/     # Acesso a dados
│   │   ├── validators/       # Schemas Zod
│   │   ├── middlewares/      # Auth, error handler, rate limit
│   │   ├── routes/           # Definição de rotas
│   │   ├── database/
│   │   │   └── migrations/   # Knex migrations
│   │   └── utils/            # Helpers
│   ├── knexfile.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   ├── sw.js             # Service worker
│   │   └── icons/            # Ícones PWA
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── pages/            # Páginas (uma pasta por módulo)
│   │   ├── services/         # API client
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # Helpers
│   ├── vite.config.ts
│   └── package.json
├── docs/                     # Documentação
├── .github/workflows/        # CI/CD
└── render.yaml               # Deploy config
```

---

## 3. Padrões de Arquitetura

### 3.1 Backend — Arquitetura em Camadas

```
Request → Route → Controller → Service → Repository → Database
                      ↓
                  Validator (Zod)
```

**Controller**: Recebe request, chama service, retorna response.
```javascript
// controllers/clients.controller.js
const clientsService = require('../services/clients.service');

async function create(req, res, next) {
  try {
    const client = await clientsService.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}
```

**Service**: Regras de negócio, validações de domínio.
```javascript
// services/clients.service.js
const clientsRepository = require('../repositories/clients.repository');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const clientsService = {
  async create(tenantId, data) {
    const existing = await clientsRepository.findByDocument(tenantId, data.document);
    if (existing) throw new AppError('CPF/CNPJ já cadastrado', 400, 'DUPLICATE');
    return clientsRepository.create(tenantId, data);
  },
};
```

**Repository**: Queries ao banco via Knex.
```javascript
// repositories/clients.repository.js
const db = require('../database/connection');

const clientsRepository = {
  async create(tenantId, data) {
    const [client] = await db('clients')
      .insert({ ...data, tenant_id: tenantId })
      .returning('*');
    return client;
  },
};
```

### 3.2 Validação com Zod

```javascript
// validators/clients.validator.js
const { z } = require('zod');

const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

module.exports = { createClientSchema };
```

**Middleware de validação**:
```javascript
// middlewares/validateRequest.js
function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors,
        },
      });
    }
    req.body = result.data;
    next();
  };
}
```

### 3.3 Autenticação JWT

```javascript
// middlewares/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, tenantId, role, email }
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
```

### 3.4 Error Handler Global

```javascript
// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  console.error(`[${code}]`, err.message);
  
  res.status(statusCode).json({
    success: false,
    error: { code, message: err.message },
  });
}
```

### 3.5 Rate Limiting

```javascript
// middlewares/rateLimiter.middleware.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Muitas requisições' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 tentativas de login
});
```

---

## 4. Frontend — Padrões

### 4.1 API Client com Interceptors

```typescript
// services/api.ts
import axios from 'axios';

const isDev = window.location.port === '5173';
const baseURL = isDev
  ? `${window.location.protocol}//${window.location.hostname}:3000/api/v1`
  : '/api/v1';

const api = axios.create({ baseURL });

// Adiciona token em toda request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona pra login se 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.2 Estrutura de Página

```
src/pages/
├── Clients/
│   ├── index.tsx        # Listagem
│   ├── Form.tsx         # Formulário (create/edit)
│   └── Details.tsx      # Detalhes
├── ServiceOrders/
│   └── ...
```

### 4.3 Design System — CSS Variables

```css
:root {
  /* Espaçamento */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Cores */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  --color-bg: #f8fafc;
  --color-bg-card: #ffffff;
  --color-border: #e2e8f0;
  --color-success: #16a34a;
  --color-danger: #dc2626;
  --color-warning: #d97706;

  /* Sombras */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-dropdown: 0 8px 25px rgba(0,0,0,0.12);

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* Transições */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;

  /* Tipografia */
  --font-family: 'Inter', sans-serif;
}
```

### 4.4 Status Badges (Acessibilidade)

```css
/* WCAG AA compliant + ícones para daltonismo */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-aberta { background: #dbeafe; color: #1e40af; }
.status-aberta::before { content: "○"; }

.status-concluida { background: #d1fae5; color: #064e3b; }
.status-concluida::before { content: "✓✓"; }

.status-cancelada { background: #fee2e2; color: #7f1d1d; }
.status-cancelada::before { content: "✕"; }
```

---

## 5. Banco de Dados

### 5.1 Configuração Knex

```javascript
// knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { directory: './src/database/migrations' },
    pool: { min: 1, max: 5 },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { directory: './src/database/migrations' },
    pool: { min: 2, max: 10 },
  },
};
```

### 5.2 Exemplo de Migration

```javascript
// migrations/20240101_001_create_clients.js
exports.up = function(knex) {
  return knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants');
    table.string('name').notNullable();
    table.string('document');
    table.string('phone');
    table.string('email');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.index(['tenant_id', 'deleted_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('clients');
};
```

### 5.3 Multi-tenant

Todas as queries filtram por `tenant_id`:

```javascript
// repository
async findAll(tenantId, params) {
  return db('clients')
    .where({ tenant_id: tenantId, deleted_at: null })
    .orderBy('name');
}
```

---

## 6. CI/CD

### 6.1 Deploy Automático (GitHub Actions → Render)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

### 6.2 Backup Automático do Banco

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 6 * * *'   # 03:00 Brasília
    - cron: '0 18 * * *'  # 15:00 Brasília
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y postgresql-client
      - run: |
          TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
          pg_dump "$DATABASE_URL" --no-owner > ".backups/backup_${TIMESTAMP}.sql"
          gzip ".backups/backup_${TIMESTAMP}.sql"
      - run: |
          cd .backups && ls -t *.sql.gz | tail -n +31 | xargs -r rm -f
      - run: |
          git config user.name "GitHub Actions Bot"
          git add .backups/
          git diff --staged --quiet || git commit -m "backup: automatic"
          git push
```

### 6.3 Render Config

```yaml
# render.yaml
services:
  - type: web
    name: meu-projeto
    runtime: node
    buildCommand: cd frontend && npm install && npm run build && cd ../backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
```

---

## 7. PWA

### 7.1 Manifest

```json
{
  "name": "Nome do App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e293b",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 7.2 Service Worker

```javascript
const CACHE_NAME = 'app-v1';
const ASSETS = ['/', '/index.html', '/assets/index.css', '/assets/index.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
```

---

## 8. Variáveis de Ambiente

```bash
# .env.example
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=gerar_chave_segura_aleatoria
```

---

## 9. Comandos Úteis

### Backend

```bash
npm run dev          # Dev com nodemon
npm run start        # Produção
npm run migrate      # Rodar migrations
npm run migrate:make nome_migration  # Criar migration
```

### Frontend

```bash
npm run dev          # Dev server (porta 5173)
npm run build        # Build produção
npm run preview      # Preview do build
```

### Deploy

```bash
git push origin master   # Trigger deploy automático
```

---

## 10. Checklist para Novo Projeto

- [ ] Criar repositório GitHub
- [ ] Copiar estrutura de pastas
- [ ] Configurar `package.json` (backend + frontend)
- [ ] Criar banco PostgreSQL no Neon
- [ ] Configurar variáveis de ambiente no Render
- [ ] Configurar GitHub Secrets (`DATABASE_URL`, `RENDER_DEPLOY_HOOK`)
- [ ] Criar migrations iniciais
- [ ] Implementar autenticação (auth routes + middleware)
- [ ] Criar CRUD base (Controller → Service → Repository)
- [ ] Configurar PWA (manifest + icons + sw.js)
- [ ] Testar deploy

---

## 11. Dependências — package.json

### Backend

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^8.6.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.3",
    "knex": "^3.1.0",
    "pdfkit": "^0.19.1",
    "pg": "^8.12.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "axios": "^1.18.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.6.0",
    "react-icons": "^5.7.0",
    "react-router-dom": "^7.18.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "~5.6.2",
    "vite": "^5.4.10",
    "vite-plugin-pwa": "^1.3.0"
  }
}
```

---

## 12. Padrões de Código

### Nomenclatura

| Item | Padrão | Exemplo |
|------|--------|---------|
| Arquivos JS | camelCase | `clients.controller.js` |
| Arquivos TSX | PascalCase | `ClientForm.tsx` |
| Funções | camelCase | `findById()` |
| Classes | PascalCase | `AppError` |
| Constantes | UPPER_SNAKE | `VALID_STATUSES` |
| Tabelas DB | snake_case | `service_orders` |
| Colunas DB | snake_case | `created_at` |
| Rotas API | kebab-case | `/service-orders` |

### Resposta API Padrão

```javascript
// Sucesso
{ success: true, data: { ... } }
{ success: true, data: [...], pagination: { page, limit, total } }

// Erro
{ success: false, error: { code: 'NOT_FOUND', message: '...' } }
{ success: false, error: { code: 'VALIDATION_ERROR', details: {...} } }
```

### Soft Delete

Todas as entidades usam `deleted_at` em vez de exclusão física:

```javascript
async softDelete(tenantId, id) {
  return db('clients')
    .where({ id, tenant_id: tenantId })
    .update({ deleted_at: new Date() });
}
```

---

*Documento gerado em: Agosto 2026*
*Versão: 1.0*
