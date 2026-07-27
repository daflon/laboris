---
layout: default
title: Home
---

# OS Laboris

**Sistema de gestão de Ordens de Serviço para assistência técnica de ferramentas elétricas.**

PWA instalável — funciona como app no celular 📱

---

## ✨ Principais Funcionalidades

### 📊 Dashboard Inteligente
- Cards com contadores por status (clicáveis para filtrar)
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

### ⚙️ Configurações da Empresa
- Dados completos (nome, CNPJ, telefones, email, endereço)
- Personalização de impressões (logo, cabeçalho, rodapé)
- PIN do administrador para exclusões
- White-label (replicável para outros clientes)

### 🔍 Busca Global
- Campo no topo de todas as telas
- Busca em tempo real em clientes, OS e equipamentos
- Resultados agrupados por categoria

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js + Express + Knex |
| **Frontend** | React + TypeScript + Vite |
| **Banco de dados** | SQLite (dev) / PostgreSQL (produção) |
| **Tipografia** | Inter (Google Fonts) |
| **PDF** | PDFKit |
| **PWA** | Service Worker + Web App Manifest |
| **Deploy** | Render |

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

---

## 🚀 Quick Start

```bash
# Backend
cd backend
npm install
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
