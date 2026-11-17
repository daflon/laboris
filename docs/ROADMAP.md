# 🗺️ Roadmap — OS Laboris

> Sistema de gestão de ordens de serviço para assistências técnicas.  
> Última atualização: 26/10/2026

---

## 📋 Índice

- [Histórico de Versões](#-histórico-de-versões)
- [Features Atuais (v1.4)](#-features-atuais-v14)
- [Backlog](#-backlog)
- [Módulos Futuros](#-módulos-futuros)
- [Segurança](#-segurança)
- [Infraestrutura](#-infraestrutura)

---

## ✅ Histórico de Versões

### Etapa 1-3: Fundação
- CRUD de Clientes, Técnicos, Equipamentos
- Ordens de Serviço com status e fluxo completo
- Geração de PDF profissional (2 vias A4)
- WhatsApp com mensagem pré-formatada

### Etapa 4-5: UX e Mobile
- Dashboard com cards e ranking de técnicos
- Busca global (cliente, telefone, nº OS, equipamento)
- Responsividade completa + PWA instalável
- Navegação mobile (bottom tab bar)

### Etapa 6-7: SaaS Multi-tenant
- PostgreSQL (Neon) + JWT + tenant isolation
- Painel Master (Super Admin)
- Módulo Financeiro integrado
- Deploy no Render + Backup automático (GitHub Actions)
- Lote de OS (múltiplos equipamentos)

### Etapa 8-9: Segurança e Acessibilidade
- Rate limiting, Helmet, CORS restritivo
- Refresh Tokens + Cookies httpOnly
- Audit Log completo
- Contraste WCAG AA + ícones nos badges
- Campo "Sinal" (entrada/depósito)

---

## 🚀 Features Atuais (v1.4)

### Implementado em Out/2026

| Feature | Descrição |
|---------|-----------|
| ✅ Histórico de Status | Mini timeline visual nos detalhes da OS |
| ✅ Duplicar OS (listagem) | Botão de duplicar direto na lista |
| ✅ Relatório Mensal PDF | Com seletor de período (mês/ano) |
| ✅ SearchableSelect | Campo de cliente com busca por digitação |
| ✅ Registro Fotográfico | Upload de fotos na OS (Base64, até 5 fotos) |
| ✅ Refatoração de código | Imports, N+1 query, validações |

### Funcionalidades Completas

- [x] OS em Lote (múltiplos equipamentos por cliente)
- [x] PDF individual e do lote
- [x] WhatsApp manual
- [x] Busca Global (header do sistema)
- [x] Alerta de OS Parada (> 30 dias)
- [x] PIN do administrador para exclusões
- [x] Cadastro rápido de cliente/equipamento
- [x] Upload de logo da empresa
- [x] Impersonate (Master acessa qualquer tenant)

---

## 📋 Backlog

### Alta Prioridade

| Item | Status | Observação |
|------|--------|------------|
| Política de Senhas | ⏳ Pendente | Mínimo 8 chars, maiúscula, número, especial |
| Proteção Brute Force | ⏳ Pendente | Bloqueio após 5 tentativas |
| Controle de Sessão | ⏳ Pendente | Timeout de inatividade |

### Média Prioridade

| Item | Status | Observação |
|------|--------|------------|
| Notificação WhatsApp Automática | ⏳ | Cliente prefere manual por enquanto |
| Template de Diagnóstico | ⏳ | Diagnósticos pré-definidos por tipo |
| 2FA (Autenticação em 2 Fatores) | ⏳ | Código por email ou TOTP |

### Baixa Prioridade

| Item | Status |
|------|--------|
| Dashboard com gráficos (OS por mês, faturamento) | 💡 |
| Relatório por técnico (produtividade) | 💡 |
| Integração com impressora térmica | 💡 |
| App mobile (PWA já funciona) | 💡 |
| Notificações push | 💡 |
| QR Code para consulta de status | 💡 |

---

## 🏗️ Módulos Futuros

### Módulo de Aluguéis de Equipamentos

> **Status:** 📋 Em estudo  
> **Origem:** Demanda ESM (Eletrotécnica São Miguel)  
> **Detalhes:** [ROADMAP-ALUGUEIS.md](../ROADMAP-ALUGUEIS.md)

Assistências técnicas frequentemente diversificam receita alugando equipamentos próprios (geradores, ferramentas, compressores).

**Funcionalidades Planejadas:**

1. **Cadastro de Patrimônio** - Equipamentos próprios da empresa
2. **Contratos de Aluguel** - Cliente + equipamento + período
3. **Controle de Devoluções** - Checklist, gerar OS se danificado
4. **Financeiro Integrado** - Receita no fluxo de caixa
5. **Dashboard de Aluguéis** - Ativos, devoluções, atrasos

**Estimativa:** 2-3 dias para MVP

---

## 🔐 Segurança

### ✅ Concluído (30%)

| Fase | Itens |
|------|-------|
| Fundamentos | CORS, Helmet, Rate Limiting, Zod, JWT 15min, bcrypt |
| Tokens | Refresh Tokens 7d, Cookies httpOnly, Revogação, Logout all |
| Auditoria | Log de LOGIN, LOGOUT, operações em Clientes/Equipamentos/OS/Técnicos |

### ⏳ Pendente

| Fase | Prioridade | Itens |
|------|------------|-------|
| Política de Senhas | 🔴 Alta | Min 8 chars, maiúscula, número, especial, lista negra |
| Brute Force | 🔴 Alta | Contador de falhas, bloqueio 5 tentativas, 15 min cooldown |
| Controle de Sessão | 🟡 Média | Timeout 30 min, aviso antes de expirar, listar sessões |
| 2FA | 🟡 Média | Código por email, TOTP, códigos de backup |
| Sanitização | 🟡 Média | HTML em campos de texto, escape de caracteres |
| Monitoramento | 🟢 Baixa | IP/User-Agent em logs, detecção de novo dispositivo |
| Compliance | 🟢 Baixa | LGPD, Termos de Uso, exportação/exclusão de dados |

---

## ⚙️ Infraestrutura

### Ambiente Atual

| Item | Configuração |
|------|--------------|
| **Produção** | Render (backend + frontend unificado) |
| **Banco** | Neon PostgreSQL (free tier) |
| **Backup** | GitHub Actions 2x/dia, retenção 30 dias |
| **Uptime** | UptimeRobot (anti-sleep) |

### Planejado

| Item | Status | Descrição |
|------|--------|-----------|
| Ambiente Staging | ⏳ | Branch `dev` → `os-laboris-dev.onrender.com` |
| Integração WhatsApp (Fotos) | 📋 | Avaliar wppEnvia vs Z-API |
| Logs Centralizados | 💡 | Logtail ou Papertrail |
| CDN para Assets | 💡 | Performance |
| Cache Redis | 💡 | Consultas frequentes |

---

## 📝 Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Concluído |
| ⏳ | Pendente |
| 💡 | Ideia futura |
| 📋 | Em estudo/planejamento |
| 🔴 | Alta prioridade |
| 🟡 | Média prioridade |
| 🟢 | Baixa prioridade |

---

*Documento consolidado em: 26/10/2026*
