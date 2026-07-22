# Roadmap — OS Laboris

Sistema de Ordem de Serviço para assistência técnica (ferramentas elétricas).

---

## ✅ Etapa 1 — Cadastros Básicos (CONCLUÍDA)

- [x] CRUD de Clientes (validação CPF/CNPJ, soft delete)
- [x] CRUD de Técnicos (ativo/inativo, soft delete)
- [x] CRUD de Equipamentos (vinculado a cliente)
- [x] Paginação e busca em todos os módulos
- [x] Frontend com React + TypeScript

---

## ✅ Etapa 2 — Ordens de Serviço (CONCLUÍDA)

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

## ✅ Etapa 3 — PDF e WhatsApp (CONCLUÍDA)

- [x] Geração de PDF profissional (2 vias em A4 para corte)
- [x] Layout com dados da empresa, cliente, máquina, itens, valores, assinatura
- [x] Canhoto na segunda via
- [x] Aviso legal dos 180 dias (PL 2545/22)
- [x] Botão WhatsApp com mensagem pré-formatada (wa.me)
- [x] Botão "Gerar PDF" na tela de detalhes da OS

---

## ✅ Etapa 4 — Dashboard e Melhorias de UX (CONCLUÍDA)

- [x] Dashboard com cards de contadores por status
- [x] Ranking gamificado de técnicos (🥇🥈🥉 com barras de progresso)
- [x] Últimas OS criadas
- [x] Cards clicáveis que filtram a listagem
- [x] Mudança rápida de status direto na listagem (select inline)
- [x] Contador de OS pendentes na sidebar (badge)
- [x] Coluna "Cliente" na lista de equipamentos
- [x] Busca por nome do cliente nos equipamentos

---

## 🔜 Etapa 5 — Autenticação e Controle de Acesso

- [ ] Login com email/senha (JWT)
- [ ] Dois níveis: Administrador e Técnico
- [ ] Admin: acesso total (incluindo exclusões e configurações)
- [ ] Técnico: vê apenas suas OS, não acessa configurações nem exclui registros
- [ ] Exclusões visíveis apenas para admin (botão oculto para técnicos)
- [ ] Ao excluir cliente, exclui equipamentos vinculados (cascade) — bloqueia se houver OS ativa
- [ ] Cadastro de usuários pelo admin
- [ ] Proteção de rotas no frontend e backend

---

## 📋 Etapa 6 — Melhorias Adicionais

- [ ] Busca global (campo único que acha em tudo: cliente, telefone, nº OS, equipamento)
- [ ] Botão "Duplicar OS"
- [ ] Bloquear exclusão de cliente/técnico/equipamento se houver OS ativa
- [ ] Indicador visual de OS antigas (> 30 dias sem movimento)
- [ ] Alerta de equipamentos com mais de 180 dias sem retirada (PL 2545/22)
- [ ] Responsividade básica (mobile)

---

## 📊 Etapa 7 — Relatórios

- [ ] Relatório mensal de faturamento
- [ ] Relatório de OS por técnico (produtividade detalhada)
- [ ] Relatório de peças/serviços mais frequentes
- [ ] Exportação de relatórios (PDF ou CSV)

---

## ☁️ Etapa 8 — Deploy e Produção

- [ ] Migrar banco para PostgreSQL em cloud
- [ ] Deploy do backend (Render / Railway / AWS)
- [ ] Deploy do frontend (Vercel / Netlify)
- [ ] Domínio próprio
- [ ] HTTPS / SSL
- [ ] Backup automático do banco
- [ ] Variáveis de ambiente de produção

---

## 💡 Futuro (ideias)

- Módulo Financeiro (faturamento, relatórios de receita, controle de pagamentos)
- Foto do equipamento na entrada (documentar avarias)
- App mobile (PWA)
- Notificação por email quando OS muda de status
- Integração com gateway de pagamento
- Controle de estoque de peças
- Agenda de atendimento por técnico

---

## Legenda

- ✅ Concluída
- 🔜 Próxima
- 📋 Planejada
- 📊 Planejada
- ☁️ Planejada
- 💡 Ideias futuras
