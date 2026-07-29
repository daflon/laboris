---
layout: default
title: Roadmap
---

# 🗺️ Roadmap — OS Laboris

Acompanhe a evolução do sistema.

---

## ✅ Etapa 1 — Cadastros Básicos

- [x] CRUD de Clientes (validação CPF/CNPJ, soft delete)
- [x] CRUD de Técnicos (ativo/inativo, soft delete)
- [x] CRUD de Equipamentos (vinculado a cliente)
- [x] Paginação e busca em todos os módulos
- [x] Frontend com React + TypeScript

---

## ✅ Etapa 2 — Ordens de Serviço

- [x] CRUD de OS com número sequencial
- [x] Vinculação: cliente → equipamento → técnico
- [x] Tabela de itens (Qtd / Descrição / Valor) com cálculo automático
- [x] Status: Aberta, Aprovada, Aguardando Peça, Concluída, Entregue, Cancelada
- [x] Forma de pagamento (lista fixa)
- [x] Garantia em dias
- [x] Cadastro rápido de cliente/equipamento na abertura da OS
- [x] Configurações da Empresa (white-label)
- [x] Histórico de OS por equipamento

---

## ✅ Etapa 3 — PDF e WhatsApp

- [x] Geração de PDF profissional (2 vias em A4 para corte)
- [x] Layout com dados da empresa, cliente, máquina, itens, valores, assinatura
- [x] Canhoto na segunda via
- [x] Aviso legal dos 180 dias (PL 2545/22)
- [x] Botão WhatsApp com mensagem pré-formatada (wa.me)
- [x] Botão "Gerar PDF" na tela de detalhes da OS

---

## ✅ Etapa 4 — Dashboard e Melhorias de UX

- [x] Dashboard com cards de contadores por status
- [x] Ranking gamificado de técnicos (🥇🥈🥉 com barras de progresso)
- [x] Últimas OS criadas
- [x] Cards clicáveis que filtram a listagem
- [x] Mudança rápida de status direto na listagem (select inline)
- [x] Contador de OS pendentes na sidebar (badge)
- [x] Coluna "Cliente" na lista de equipamentos
- [x] Busca por nome do cliente nos equipamentos
- [x] Busca global (campo único: cliente, telefone, nº OS, equipamento)
- [x] Botão "Duplicar OS"
- [x] PIN do administrador para exclusões
- [x] Log de auditoria (registra todas as exclusões)

---

## ✅ Etapa 5 — Mobile e PWA

- [x] Responsividade completa (tablet e celular)
- [x] Navegação mobile (bottom tab bar fixa)
- [x] Tabelas com scroll horizontal no mobile
- [x] Formulários em coluna única no mobile
- [x] API dinâmica (funciona via IP na rede local)
- [x] PWA instalável (manifest.json, service worker, ícone)
- [x] Tela cheia no celular (sem barra do Chrome)
- [x] Meta tags para iOS e Android

---

## ✅ Etapa 6 — SaaS Multi-tenant + Deploy

- [x] Migrar banco para PostgreSQL (Neon)
- [x] Tabelas `tenants` + `users` + autenticação JWT
- [x] `tenant_id` em todas as tabelas + middleware de isolamento
- [x] Tela de Login
- [x] Painel Master (Super Admin): criar/gerenciar contas, ativar módulos
- [x] Módulo Financeiro (faturamento: receitas, status, resumo mensal)
- [x] OS concluída/entregue gera lançamento financeiro automático
- [x] Sistema de módulos por tenant (ativar/desativar)
- [x] Deploy no Render (backend + frontend unificado)
- [x] HTTPS via Render
- [x] UptimeRobot (anti-sleep)
- [x] Teste de isolamento multi-tenant (9/9 passando)
- [x] Impersonate (master acessa app de qualquer tenant)
- [x] Nome da empresa dinâmico na sidebar + rodapé com suporte

---

## 📋 Etapa 7 — Melhorias Pós-deploy

Em andamento e planejadas:

- [x] UI Polish (design tokens CSS, tipografia Inter, badges pill)
- [x] Upload de logo da empresa (Base64, até 200KB)
- [x] Logo no PDF e sidebar
- [x] Backup automático do banco (GitHub Actions 2x/dia)
- [x] Painel de Status do Sistema (Master): DB, Backup, Deploy, Métricas
- [x] Lote de OS (agrupar múltiplos equipamentos do mesmo cliente)
- [x] PDF do Lote com opção Individual ou Resumo consolidado
- [x] Modal de seleção para PDF do Lote (filtro por status, seleção de OS)
- [x] Alertas visuais de falha no painel Master (backup atrasado, DB offline)
- [x] Indicador visual de OS antigas (> 30 dias sem movimento)
- [x] Alerta de equipamentos com mais de 180 dias sem retirada

---

## ☁️ Etapa 8 — Segurança e Acessibilidade

Melhorias de segurança e conformidade WCAG:

- [x] Backup automático do banco com retenção (GitHub Actions, 30 dias)
- [x] Rate limiting no PIN (5 tentativas, cooldown 5 min, por tenant+IP)
- [x] Log de auditoria do Impersonate (tabela impersonate_logs)
- [x] Banner visual do modo Impersonate (barra laranja fixa)
- [x] aria-label em botões de ícone (acessibilidade para leitores de tela)
- [x] Contraste WCAG AA nos badges de status (mínimo 4.5:1)
- [x] Ícones nos status badges (acessibilidade para daltonismo)
- [x] Paleta Cyan exclusiva para Painel Master (diferencia do tenant)
- [x] localStorage draft em formulários (previne perda de dados)
- [x] Esconder PDF Individual quando OS está em lote (simplifica UX)
- [x] Log de Auditoria completo no painel Master (quem fez o quê)
- [x] Monitoramento de uptime (integração com UptimeRobot API)
- [x] Logs centralizados (UptimeRobot + Audit Log interno)
- [x] Rate limiting global na API (proteção contra DDoS)
- [ ] CDN para assets estáticos

---

## 💡 Ideias Futuras (v2)

- Controle de pagamentos na OS (parcelas, status pago/pendente)
- Relatório de OS por técnico (produtividade)
- Relatório mensal de faturamento por tenant (Master)
- Financeiro expandido: despesas, categorias, fluxo de caixa
- Exportação de relatórios (PDF ou CSV)
- QR Code para consulta de status da OS
- Tema escuro (dark mode total)
- Identidade visual Amber (cor da marca, migração de tema)
- Logo em storage externo (S3/Cloudinary) em vez de Base64
- Planos pagos / cobrança automática (Stripe/Mercado Pago)
- Cadastro self-service (cliente cria conta sozinho)
- Foto do equipamento na entrada
- Notificação por email quando OS muda de status
- Integração com gateway de pagamento
- Controle de estoque de peças
- Agenda de atendimento por técnico
- Backup com restauração pelo painel master
- Refresh token para sessões longas (alternativa ao localStorage draft)
- Compartilhar PDF via celular (Web Share API - já funciona em alguns dispositivos)

---

## Legenda

| Ícone | Significado |
|-------|-------------|
| ✅ | Concluída |
| 📋 | Em andamento / Planejada |
| ☁️ | Infraestrutura futura |
| 💡 | Ideias para o futuro |

---

[← Voltar](/)
