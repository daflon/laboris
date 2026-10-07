# 📊 Projeto: Painel Central de Monitoramento

> Documento de planejamento para criação de um painel centralizado de monitoramento de todos os projetos web.

**Data de criação:** 05/10/2026  
**Status:** 📋 Planejamento

---

## 🎯 Objetivo

Criar um painel web centralizado utilizando **Uptime Kuma** para monitorar a disponibilidade, performance e saúde de todos os projetos web publicados.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAINEL DE MONITORAMENTO                       │
│                  monitor.daflon.com.br (exemplo)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌─────────┐  │
│   │ OS Laboris│   │ Projeto 2 │   │ Projeto 3 │   │   ...   │  │
│   │  /health  │   │  /health  │   │  /health  │   │         │  │
│   └───────────┘   └───────────┘   └───────────┘   └─────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     DASHBOARD                            │   │
│   │  • Uptime de cada serviço                               │   │
│   │  • Tempo de resposta (latência)                         │   │
│   │  • Histórico de incidentes                              │   │
│   │  • Gráficos de performance                              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    STATUS PAGE                           │   │
│   │           status.daflon.com.br (público)                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   NOTIFICAÇÕES  │
                    │ • Telegram      │
                    │ • Email         │
                    │ • Discord       │
                    └─────────────────┘
```

---

## ✅ Funcionalidades

### Dashboard Principal
- [ ] Visão geral de todos os projetos
- [ ] Indicadores de status (online/offline/degradado)
- [ ] Tempo de resposta em tempo real
- [ ] Uptime percentual (24h, 7d, 30d)
- [ ] Gráficos de latência

### Monitoramento por Projeto
- [ ] HTTP/HTTPS endpoint check
- [ ] Verificação de keyword no response
- [ ] Monitoramento de certificado SSL
- [ ] Alertas de expiração de SSL
- [ ] Ping/TCP check para databases

### Alertas e Notificações
- [ ] Telegram (principal)
- [ ] Email (backup)
- [ ] Discord (opcional)
- [ ] Webhook personalizado

### Status Page Pública
- [ ] Página pública para clientes
- [ ] Histórico de incidentes
- [ ] Manutenções programadas
- [ ] Domínio customizado

---

## 📋 Projetos a Monitorar

| # | Projeto | URL Produção | Endpoint Health | Prioridade |
|---|---------|--------------|-----------------|------------|
| 1 | OS Laboris | os-laboris.onrender.com | `/health` | 🔴 Alta |
| 2 | (adicionar) | | | |
| 3 | (adicionar) | | | |
| 4 | (adicionar) | | | |
| 5 | (adicionar) | | | |

---

## 🔍 O Que Monitorar em Cada Projeto

### Checklist por Projeto

```markdown
□ API Health Check (GET /health)
  - Esperar: HTTP 200
  - Esperar: {"status": "ok"} ou similar
  - Intervalo: 60 segundos

□ Frontend (GET /)
  - Esperar: HTTP 200
  - Intervalo: 60 segundos

□ Certificado SSL
  - Alertar: 14 dias antes de expirar
  - Alertar: 7 dias antes de expirar
  - Alertar: 1 dia antes de expirar

□ Tempo de Resposta
  - Warning: > 2 segundos
  - Critical: > 5 segundos
```

### Exemplo de Endpoint /health

```javascript
// Exemplo de implementação
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});
```

---

## 🚀 Opções de Hospedagem

### Comparativo

| Plataforma | Custo/mês | Sempre Online | Dificuldade | Recomendado |
|------------|-----------|---------------|-------------|-------------|
| **Render (Paid)** | $7 | ✅ | Fácil | ⭐ |
| **Railway** | ~$5 | ✅ | Fácil | ⭐ |
| **Fly.io** | ~$5 | ✅ | Médio | |
| **VPS Hetzner** | €4 | ✅ | Médio | ⭐ |
| **VPS Contabo** | €5 | ✅ | Médio | |
| **Oracle Free** | $0 | ✅ | Difícil | |
| **Render (Free)** | $0 | ❌* | Fácil | |

*\*Free tier dorme após 15min de inatividade - não ideal para monitoramento*

### Recomendação

**Para monitoramento 24/7:** VPS Hetzner (€4/mês) ou Railway (~$5/mês)

O serviço de monitoramento precisa estar **sempre ativo** para funcionar corretamente.

---

## 🛠️ Stack Técnica

### Uptime Kuma
- **Versão:** Latest (2.x)
- **Repositório:** https://github.com/louislam/uptime-kuma
- **Documentação:** https://github.com/louislam/uptime-kuma/wiki

### Requisitos
- Node.js >= 20.4 (se non-Docker)
- Docker (recomendado)
- ~512MB RAM
- ~1GB disco

---

## 📦 Deploy Rápido

### Opção 1: Docker (Recomendado)

```bash
# Criar diretório
mkdir uptime-kuma && cd uptime-kuma

# Docker run
docker run -d \
  --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:2

# Acessar: http://localhost:3001
```

### Opção 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  uptime-kuma:
    image: louislam/uptime-kuma:2
    container_name: uptime-kuma
    restart: always
    ports:
      - "3001:3001"
    volumes:
      - uptime-kuma-data:/app/data

volumes:
  uptime-kuma-data:
```

```bash
docker compose up -d
```

### Opção 3: Render (Web Service)

1. Criar novo Web Service no Render
2. Usar imagem Docker: `louislam/uptime-kuma:2`
3. Configurar porta: `3001`
4. Adicionar disco persistente: `/app/data`

---

## 🔔 Configuração de Notificações

### Telegram (Recomendado)

1. Criar bot no @BotFather
2. Obter token do bot
3. Obter chat_id (usar @userinfobot)
4. Configurar no Uptime Kuma

```
Bot Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
Chat ID: 123456789
```

### Email (SMTP)

```
Host: smtp.gmail.com
Porta: 587
Usuário: seu-email@gmail.com
Senha: app-password (não a senha normal)
```

### Discord

1. Criar webhook no canal desejado
2. Copiar URL do webhook
3. Colar no Uptime Kuma

---

## 📊 Estrutura de Monitores Sugerida

```
📁 Produção
│
├── 📁 OS Laboris
│   ├── 🔗 API Health (/health)
│   ├── 🔗 Frontend (/)
│   └── 🔒 SSL Certificate
│
├── 📁 Projeto 2
│   ├── 🔗 API Health
│   ├── 🔗 Frontend
│   └── 🔒 SSL Certificate
│
└── 📁 Projeto 3
    ├── 🔗 API Health
    └── 🔗 Frontend

📁 Staging (opcional)
│
├── 🔗 OS Laboris Dev
└── 🔗 Projeto 2 Dev
```

---

## 🎨 Status Page

### Configuração

- **Domínio:** status.seudominio.com.br
- **Tema:** Dark ou Light
- **Logo:** Sua logo
- **Descrição:** "Status dos serviços em tempo real"

### Exemplo de Layout

```
┌─────────────────────────────────────────┐
│         STATUS DOS SERVIÇOS             │
│     Todos os sistemas operacionais      │
├─────────────────────────────────────────┤
│                                         │
│  ✅ OS Laboris          Operacional     │
│     Uptime: 99.98%                      │
│                                         │
│  ✅ Projeto X           Operacional     │
│     Uptime: 99.95%                      │
│                                         │
│  ⚠️  Projeto Y          Degradado       │
│     Latência elevada                    │
│                                         │
├─────────────────────────────────────────┤
│  📅 Histórico de Incidentes            │
│                                         │
│  05/10 14:30 - Projeto Y lento (5min)  │
│  01/10 08:00 - Manutenção programada   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📅 Cronograma de Implementação

### Fase 1: Setup Inicial (1-2 horas)
- [ ] Escolher plataforma de hospedagem
- [ ] Deploy do Uptime Kuma
- [ ] Configuração inicial (usuário admin)
- [ ] Configurar notificação Telegram

### Fase 2: Adicionar Monitores (1 hora)
- [ ] Adicionar OS Laboris
- [ ] Adicionar outros projetos
- [ ] Organizar em grupos/pastas
- [ ] Testar alertas

### Fase 3: Status Page (30 min)
- [ ] Criar status page
- [ ] Configurar domínio (opcional)
- [ ] Personalizar aparência
- [ ] Testar página pública

### Fase 4: Refinamentos (ongoing)
- [ ] Ajustar intervalos de verificação
- [ ] Adicionar novos projetos conforme surgem
- [ ] Configurar manutenções programadas
- [ ] Revisar alertas mensalmente

---

## 💰 Custo Estimado

| Item | Custo Mensal |
|------|--------------|
| Hospedagem (VPS/Railway) | $5-7 |
| Domínio (opcional) | ~$1 |
| **Total** | **$5-8/mês** |

*Considerando monitoramento ilimitado de projetos*

---

## 📚 Referências

- [Uptime Kuma - GitHub](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma - Wiki](https://github.com/louislam/uptime-kuma/wiki)
- [Demo Online](https://demo.kuma.pet/start-demo)

---

## 📝 Notas

- Manter Uptime Kuma sempre atualizado
- Revisar monitores mensalmente
- Testar notificações periodicamente
- Backup dos dados do Uptime Kuma

---

*Documento criado para planejamento do painel de monitoramento centralizado.*
