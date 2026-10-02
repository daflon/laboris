# Infraestrutura e DevOps

> **Status:** Planejado  
> **Data:** Outubro/2026

## 1. Ambiente de Staging/Dev

### Objetivo
Ter ambiente separado para testar mudanças antes de ir para produção.

### Estrutura Proposta

| Ambiente | URL | Branch | Banco |
|----------|-----|--------|-------|
| **Produção** | os-laboris.onrender.com | `main` | Neon (atual) |
| **Staging** | os-laboris-dev.onrender.com | `dev` | Neon (novo database) |
| **Local** | localhost:5173 | qualquer | Neon staging |

### Fluxo de Deploy

```
feature/xxx  →  dev (staging)  →  main (produção)
     │              │                  │
  Develop      Auto-deploy         Auto-deploy
   local       para staging       para produção
```

### Tarefas
- [ ] Criar branch `dev` no GitHub
- [ ] Criar novo database no Neon (laboris-staging)
- [ ] Criar novo serviço no Render (os-laboris-dev)
- [ ] Configurar variáveis de ambiente
- [ ] Documentar fluxo de deploy
- [ ] Seed de dados de teste para staging

### Estimativa
- Setup inicial: ~30 minutos

---

## 2. Integração WhatsApp (Fotos)

### Objetivo
Enviar fotos dos equipamentos diretamente pelo WhatsApp.

### Opções Avaliadas

| Opção | Complexidade | Custo | Envia Foto |
|-------|-------------|-------|------------|
| **Manter como está** (link wa.me) | ✅ Zero | 🆓 Grátis | ❌ Não |
| **Web Share API** | ⭐ Baixa | 🆓 Grátis | ✅ Sim (só mobile) |
| **Link com preview** | ⭐ Baixa | 🆓 Grátis | ⚠️ Preview apenas |
| **wppEnvia (Baileys)** | ⭐⭐⭐ Alta | ~$6/mês VPS | ✅ Sim, completo |
| **Z-API** | ⭐⭐ Média | ~R$70/mês | ✅ Sim, completo |

### Decisão
🔄 Pendente (aguardando avaliação)

### Arquitetura se usar wppEnvia

```
┌─────────────────┐         ┌─────────────────┐
│    LABORIS      │  HTTP   │    wppEnvia     │
│  (Render.com)   │ ──────► │  (VPS próprio)  │
│                 │         │                 │
│  - Botão Enviar │         │  - Baileys      │
│  - Monta msg    │         │  - QR Code      │
│  - Chama API    │         │  - Envia WPP    │
└─────────────────┘         └─────────────────┘
```

### Tarefas (se aprovado)
- [ ] Escolher opção de integração
- [ ] Hospedar wppEnvia em VPS (se aplicável)
- [ ] Criar endpoint no wppEnvia para receber Base64
- [ ] Criar serviço whatsapp.service.js no Laboris
- [ ] Criar rota POST `/service-orders/:id/send-whatsapp`
- [ ] Adicionar config por tenant (número conectado)

---

## 3. Melhorias Futuras

### Monitoramento
- [ ] Logs centralizados (Logtail, Papertrail)
- [ ] Alertas de erro (Sentry)
- [ ] Uptime monitoring (UptimeRobot)

### Performance
- [ ] Cache Redis para consultas frequentes
- [ ] CDN para assets estáticos
- [ ] Lazy loading de imagens

### Segurança
- [ ] Rate limiting mais granular
- [ ] Audit log de ações críticas
- [ ] 2FA para admins

---

*Documento atualizado em: Outubro/2026*
