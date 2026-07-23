# Spec — Transformação SaaS Multi-tenant

## 1. Visão Geral

Transformar o OS Laboris de aplicação local em SaaS multi-tenant hospedado no Railway.
Múltiplas empresas (eletrotécnicas) usam o mesmo sistema, cada uma isolada por `tenant_id`.

**Domínio único:** `app.oslaboris.com.br`  
**Modelo de acesso:**
- Super Admin (você) → Painel Master (`/master`)
- Tenant (empresa) → Acesso único com login, todos veem tudo da empresa

**Criação de contas:** Manualmente pelo Super Admin no painel master.

---

## 2. Níveis de Acesso

| Nível | Role | Acesso |
|-------|------|--------|
| Super Admin | `super_admin` | Painel master: criar/gerenciar tenants, ativar módulos, ver métricas globais |
| Tenant User | `tenant_user` | Sistema completo da empresa: OS, clientes, técnicos, equipamentos, financeiro, config |

> Técnicos não terão login separado — a troca é feita na seleção da OS.

---

## 3. Modelo de Dados

### 3.1 Novas tabelas

```sql
-- Tenants (empresas/contas)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  modules JSONB DEFAULT '["os"]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (autenticação)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),  -- NULL para super_admin
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'tenant_user',  -- super_admin | tenant_user
  active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Alterações em tabelas existentes

Todas as tabelas de dados ganham coluna `tenant_id`:

```sql
ALTER TABLE clients ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE technicians ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE equipment ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE service_orders ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE company_settings ADD COLUMN tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id);
ALTER TABLE audit_logs ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

### 3.3 Módulo Financeiro (novo)

```sql
-- Lançamentos financeiros (faturamento)
CREATE TABLE financial_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type VARCHAR(20) NOT NULL,  -- 'receita' | 'despesa'
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',  -- pendente | pago | atrasado
  service_order_id UUID REFERENCES service_orders(id),  -- vincula a OS (opcional)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Autenticação

- **Lib:** bcrypt (hash de senha) + jsonwebtoken (JWT)
- **Token:** JWT com payload `{ userId, tenantId, role }`
- **Duração:** 7 dias
- **Middleware:** Toda rota da API (exceto login) verifica JWT e injeta `req.tenantId`
- **Isolamento:** Toda query filtra por `tenant_id = req.tenantId`

### 4.1 Endpoints de Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/login` | Login (email + senha) → retorna JWT |
| GET | `/api/v1/auth/me` | Dados do usuário logado |
| PUT | `/api/v1/auth/change-password` | Alterar senha |

---

## 5. Painel Master (Super Admin)

### 5.1 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/master/tenants` | Listar todos os tenants |
| POST | `/api/v1/master/tenants` | Criar novo tenant (+ user admin) |
| GET | `/api/v1/master/tenants/:id` | Detalhes do tenant (métricas) |
| PUT | `/api/v1/master/tenants/:id` | Editar tenant (nome, módulos) |
| PATCH | `/api/v1/master/tenants/:id/toggle` | Ativar/desativar |
| GET | `/api/v1/master/stats` | Métricas globais |

### 5.2 Telas Frontend

- `/master` — Dashboard (total tenants, OS no sistema, crescimento)
- `/master/tenants` — Lista de contas
- `/master/tenants/novo` — Criar conta (nome, slug, email, senha)
- `/master/tenants/:id` — Detalhes (OS, clientes, último acesso, módulos)

### 5.3 Ao criar tenant

1. Cria registro em `tenants`
2. Cria user com role `tenant_user` e senha definida
3. Cria `company_settings` inicial com nome da empresa
4. Passa login/senha manualmente pro cliente

---

## 6. Módulo Financeiro (MVP = Faturamento)

### 6.1 Funcionalidades

- [x] Registrar receita manualmente (ou vinculada à OS concluída)
- [x] Listar lançamentos por mês
- [x] Filtrar por status (pendente, pago)
- [x] Total faturado no mês
- [x] Marcar como pago

### 6.2 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/financeiro` | Criar lançamento |
| GET | `/api/v1/financeiro` | Listar (query: month, year, status) |
| PUT | `/api/v1/financeiro/:id` | Editar |
| PATCH | `/api/v1/financeiro/:id/pay` | Marcar como pago |
| DELETE | `/api/v1/financeiro/:id` | Remover |
| GET | `/api/v1/financeiro/resumo` | Totais do mês (faturado, pendente, pago) |

### 6.3 Telas

- `/financeiro` — Lista de lançamentos com filtros + resumo no topo
- `/financeiro/novo` — Criar lançamento
- Botão na OS concluída: "Gerar cobrança" → cria lançamento vinculado

---

## 7. Módulos por Tenant

Controlados pelo campo `modules` (JSON array) no registro do tenant.

| Módulo | Slug | Default |
|--------|------|---------|
| Ordens de Serviço | `os` | Sempre ativo |
| Financeiro | `financeiro` | Ativável pelo super admin |

No frontend: menu só mostra módulos ativos. Backend valida antes de processar.

---

## 8. Deploy (Railway)

| Serviço | Config |
|---------|--------|
| Backend (Node.js) | Dockerfile ou Nixpack, variáveis de env |
| PostgreSQL | Plugin Railway, backup diário |
| Frontend | Build estático servido pelo backend ou Vercel separado |

### Variáveis de ambiente

```
DATABASE_URL=postgresql://...
JWT_SECRET=chave_secreta_aqui
NODE_ENV=production
PORT=3000
```

---

## 9. Plano de Implementação

| Fase | Tarefa | Status |
|------|--------|--------|
| 1 | Migrar banco pra PostgreSQL | [ ] |
| 2 | Criar tabelas `tenants` + `users` | [ ] |
| 3 | Autenticação JWT (login, middleware, proteção de rotas) | [ ] |
| 4 | Adicionar `tenant_id` em todas as tabelas + middleware de isolamento | [ ] |
| 5 | Painel Master (CRUD de tenants) | [ ] |
| 6 | Tela de Login no frontend | [ ] |
| 7 | Módulo Financeiro (faturamento) | [ ] |
| 8 | Sistema de módulos (ativar/desativar por tenant) | [ ] |
| 9 | Deploy Railway + domínio | [ ] |

---

## 10. Fora do escopo (futuro)

- Planos pagos / cobrança automática
- Cadastro self-service (cliente cria conta sozinho)
- Módulo de estoque
- Módulo de relatórios avançados
- Notificações por email
- Backup automatizado com restauração
