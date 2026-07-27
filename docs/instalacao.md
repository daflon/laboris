---
layout: default
title: Instalação
---

# 📦 Guia de Instalação

## Pré-requisitos

- **Node.js 18+** ([download](https://nodejs.org/))
- **npm** (vem com o Node.js)
- **Git** (opcional, para clonar)

---

## 🔧 Instalação Local (Desenvolvimento)

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/OS-Laboris.git
cd OS-Laboris
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` (copie do exemplo):

```bash
cp .env.example .env
```

Execute as migrations:

```bash
npm run migrate
```

(Opcional) Popular com dados de teste:

```bash
node seed.js
```

Inicie o servidor:

```bash
npm run dev
```

✅ Backend rodando em `http://localhost:3000`

### 3. Configure o Frontend

```bash
cd ../frontend
npm install
npm run dev
```

✅ Frontend rodando em `http://localhost:5173`

---

## 📱 Testar no Celular

Para testar no celular (mesma rede Wi-Fi):

1. Descubra seu IP local (aparece no terminal do Vite)
2. Acesse `http://SEU_IP:5173` no navegador do celular
3. Exemplo: `http://192.168.1.5:5173`

---

## 🏭 Deploy em Produção

### Opção 1: Railway (Recomendado)

1. Crie conta em [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente:
   - `DATABASE_URL` (PostgreSQL)
   - `NODE_ENV=production`
   - `JWT_SECRET=sua_chave_secreta`

### Opção 2: Render

1. Crie conta em [render.com](https://render.com)
2. Crie um Web Service para o backend
3. Crie um Static Site para o frontend

### Opção 3: VPS (DigitalOcean, Contabo, etc.)

```bash
# No servidor
git clone [repo]
cd OS-Laboris

# Backend
cd backend
npm install --production
npm run migrate
pm2 start src/app.js --name os-laboris-api

# Frontend (build estático)
cd ../frontend
npm install
npm run build
# Sirva a pasta dist/ com nginx
```

---

## ⚙️ Variáveis de Ambiente

### Backend (.env)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/db

# Autenticação
JWT_SECRET=sua_chave_super_secreta
JWT_EXPIRES_IN=7d

# Admin
ADMIN_PIN=1234
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### Erro de CORS
Verifique se o backend está rodando e a URL da API está correta no frontend.

### Banco de dados não encontrado
```bash
cd backend
npm run migrate
```

---

[← Voltar](/)
