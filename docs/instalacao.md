---
layout: default
title: Instalação
---

_Última sincronização: 29/07/2026_

# 📦 Guia de Instalação

## Pré-requisitos

- **Node.js 18+** ([download](https://nodejs.org/))
- **npm** (vem com o Node.js)
- **Git** (opcional, para clonar)

---

## 🔧 Instalação Local (Desenvolvimento)

### 1. Clone o repositório

```bash
git clone https://github.com/daflon/laboris.git
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

Edite o `.env` com suas configurações:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=sua_chave_secreta_dev
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

### Opção 1: Render (Recomendado) ✅

O OS Laboris está em produção no **Render** com a seguinte configuração:

#### 1. Banco de Dados (Neon PostgreSQL)

1. Crie conta em [neon.tech](https://neon.tech)
2. Crie um novo projeto/database
3. Copie a connection string (formato: `postgresql://user:pass@host/db?sslmode=require`)

#### 2. Web Service no Render

1. Crie conta em [render.com](https://render.com)
2. Conecte seu repositório GitHub
3. Crie um **Web Service** com as configurações:

| Campo | Valor |
|-------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && cd ../frontend && npm install && npm run build` |
| **Start Command** | `node src/app.js` |
| **Environment** | Node |

4. Configure as **variáveis de ambiente**:

```env
DATABASE_URL=postgresql://... (string do Neon)
JWT_SECRET=sua_chave_super_secreta_producao
NODE_ENV=production
UPTIMEROBOT_API_KEY=sua_api_key (opcional)
```

5. O Render faz deploy automático a cada push no branch `master`

#### 3. UptimeRobot (Anti-Sleep)

O plano gratuito do Render suspende o serviço após 15min de inatividade. Para evitar:

1. Crie conta em [uptimerobot.com](https://uptimerobot.com)
2. Adicione um monitor HTTP para `https://seu-app.onrender.com/api/v1/health`
3. Configure intervalo de 5 minutos
4. (Opcional) Adicione a API key do UptimeRobot nas variáveis do Render para ver o status no painel Master

### Opção 2: VPS (DigitalOcean, Contabo, etc.)

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

Configuração nginx para servir frontend + proxy para API:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend (arquivos estáticos)
    location / {
        root /var/www/os-laboris/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API (proxy para backend)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ⚙️ Variáveis de Ambiente

### Backend (.env)

```env
# Servidor
PORT=3000
NODE_ENV=production

# Banco de dados (PostgreSQL - Neon)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Autenticação JWT
JWT_SECRET=sua_chave_super_secreta_longa_e_aleatoria

# UptimeRobot (opcional - para painel Master)
UPTIMEROBOT_API_KEY=sua_api_key
```

### Frontend

O frontend não precisa de `.env` em produção — a URL da API é detectada automaticamente pelo domínio.

Em desenvolvimento, o Vite proxy está configurado para redirecionar `/api` para `localhost:3000`.

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### Erro de CORS
Verifique se o backend está rodando e a URL da API está correta.

### Banco de dados não encontrado
```bash
cd backend
npm run migrate
```

### Render não faz build do frontend
Verifique se o Build Command inclui `cd ../frontend && npm install && npm run build`

### UptimeRobot mostra "não configurado"
Adicione a variável `UPTIMEROBOT_API_KEY` nas Environment Variables do Render e faça redeploy.

---

[← Voltar](/)
