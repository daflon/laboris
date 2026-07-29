---
layout: default
title: Home
---

_Última sincronização: 29/07/2026_

# OS Laboris

**Sistema SaaS multi-tenant de gestão de Ordens de Serviço para assistência técnica de ferramentas elétricas.**

PWA instalável — funciona como app no celular 📱

🌐 **Demo:** [os-laboris.onrender.com](https://os-laboris.onrender.com)

---

## 🏢 Arquitetura Multi-tenant

O OS Laboris é um sistema **SaaS (Software as a Service)** onde cada empresa (tenant) tem seu ambiente completamente isolado:

- Dados separados por `tenant_id` em todas as tabelas
- Autenticação JWT com escopo de tenant
- Configurações personalizadas por empresa (logo, textos, PIN)
- Painel Master para gerenciamento de todas as contas

---

## ✨ Principais Funcionalidades

### 📊 Dashboard Inteligente
- Cards com contadores por status (clicáveis para filtrar)
- Alertas de atenção:
  - ⏰ OS paradas há mais de 30 dias
  - ⚠️ Equipamentos há mais de 180 dias (Lei PL 2545/22)
- Ranking gamificado de técnicos (🥇🥈🥉)
- Últimas OS criadas com acesso rápido

### 📋 Ordens de Serviço Completas
- Numeração sequencial automática (#0001, #0002...)
- Vinculação: Cliente → Equipamento → Técnico
- Tabela de itens com cálculo automático de valores
- 6 status: Aberta, Aprovada, Aguardando Peça, Concluída, Entregue, Cancelada
- Geração de PDF profissional (2 vias em A4)
- Integração WhatsApp com mensagem pré-formatada
- Botão "Duplicar OS"
- Indicador visual ⏰ para OS antigas

### 📦 Sistema de Lotes
- Agrupa múltiplas OS do mesmo cliente (ex: 0025-A, 0025-B, 0025-C)
- PDF Individual: uma página por equipamento
- PDF Resumo: documento consolidado com tabela e valor total
- Modal de seleção com filtro por status

### 👥 Gestão de Clientes
- CRUD com validação de CPF/CNPJ (dígitos verificadores)
- Busca por nome, documento ou telefone
- Visualização de equipamentos vinculados

### 🔧 Controle de Equipamentos
- Cadastro vinculado a cliente
- Histórico completo de reparos (timeline)
- Busca por tipo, marca, modelo ou nº série

### 👨‍🔧 Gestão de Técnicos
- CRUD com toggle ativo/inativo
- Filtro por status e especialidade
- Ranking de produtividade no dashboard

### 💰 Módulo Financeiro
- Lançamentos automáticos quando OS é concluída/entregue
- Resumo mensal de faturamento
- Status: pendente, pago
- Controle por tenant

### ⚙️ Configurações da Empresa
- Dados completos (nome, CNPJ, telefones, email, endereço)
- Upload de logo (Base64, até 200KB)
- Logo exibido na sidebar e no PDF
- Personalização de cabeçalho/rodapé do PDF
- PIN do administrador para exclusões
- White-label (cada tenant personaliza sua identidade)

### 🔍 Busca Global
- Campo no topo de todas as telas (Ctrl+K)
- Busca em tempo real em clientes, OS e equipamentos
- Resultados agrupados por categoria

---

## 👑 Painel Master (Super Admin)

O super administrador tem acesso a um painel exclusivo para gerenciar todo o SaaS:

### Status do Sistema
- **Banco de Dados:** Status de conexão e latência (Neon PostgreSQL)
- **Backup:** Lista de backups recentes (GitHub Actions)
- **Deploy:** Status do serviço (Render)
- **Uptime:** Integração com UptimeRobot (monitoramento externo)

### Gestão de Tenants
- Criar nova conta (tenant + usuário admin)
- Ativar/desativar contas
- Editar módulos habilitados
- Reset de senha de usuários
- **Impersonate:** Acessar o sistema como qualquer tenant (com log de auditoria)

### Monitoramento
- Métricas globais (total de OS, clientes, equipamentos)
- Log de auditoria de todas as ações
- Alertas de falha (backup atrasado, DB offline)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js 20 + Express + Knex.js |
| **Banco de dados** | PostgreSQL (Neon - Serverless) |
| **Autenticação** | JWT (multi-tenant) |
| **PDF** | PDFKit |
| **Tipografia** | Inter (Google Fonts) |
| **PWA** | Service Worker + Web App Manifest |
| **Deploy** | Render (Web Service unificado) |
| **Monitoramento** | UptimeRobot |
| **Backup** | GitHub Actions (2x/dia) |

---

## 🔒 Segurança

- **Rate Limiting:** Proteção contra brute force e DDoS
- **PIN com cooldown:** 5 tentativas em 5 minutos
- **Log de Auditoria:** Todas as exclusões são registradas
- **Impersonate Logs:** Histórico de acesso do admin aos tenants
- **Banner visual:** Indica quando admin está em modo impersonate
- **Soft Delete:** Dados não são removidos permanentemente
- **WCAG:** Contraste AA, aria-labels, ícones nos status

---

## 📱 PWA - App no Celular

O sistema é um **Progressive Web App** completo:

- ✅ Instalável como app nativo
- ✅ Ícone na tela inicial
- ✅ Abre em tela cheia (sem barra do navegador)
- ✅ Responsivo para tablet e celular
- ✅ Bottom tab bar fixa no mobile

**Como instalar:**
1. Acesse o sistema pelo Chrome no celular
2. Menu (⋮) → "Adicionar à tela inicial"
3. Pronto!

---

## 📖 Documentação

- [Guia de Instalação](instalacao)
- [API Reference](api)
- [Arquitetura](arquitetura)
- [Roadmap](roadmap)
- [Manual Completo](manual-completo)

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/daflon/laboris.git
cd OS-Laboris

# Backend
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL e JWT_SECRET
npm run migrate
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

---

## 📄 Licença

Projeto privado — todos os direitos reservados.
