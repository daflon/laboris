# 🚀 OS Laboris - Estratégia de Comercialização

> Documento vivo para transformar o OS Laboris em um produto SaaS comercial.

---

## 1. Visão do Produto

### O que é
Sistema de gestão de ordens de serviço para **assistências técnicas** (celulares, computadores, eletrônicos em geral).

### Proposta de Valor
> "Controle sua assistência técnica do orçamento ao pagamento, sem complicação."

### Diferenciais
- ✅ Interface simples e moderna (dark mode)
- ✅ Multi-tenant (cada cliente isolado)
- ✅ PWA funcional no celular
- ✅ Controle financeiro integrado (contas a pagar/receber)
- ✅ Faturamento por técnico
- ✅ Lotes de OS (atacado)
- ✅ Histórico completo de equipamentos
- ✅ Custo operacional baixo (Render + Neon free tier)

---

## 2. Público-Alvo

### Primário
| Perfil | Características |
|--------|-----------------|
| **Assistências técnicas pequenas** | 1-5 funcionários, dono operacional |
| **Técnicos autônomos** | Trabalha sozinho ou com 1 ajudante |
| **Lojas de informática** | Vendem e fazem manutenção |

### Secundário (futuro)
- Oficinas mecânicas (adaptação)
- Marcenarias e serralherias
- Qualquer negócio com "ordem de serviço"

### Dor principal
- Controle em caderno/planilha → perde informação
- Sistemas caros (R$ 200-500/mês) → não cabe no bolso
- Sistemas complexos → não usa metade das funções

---

## 3. Modelo de Negócio

### Opção A: Freemium + Assinatura
```
┌─────────────────────────────────────────────────────────┐
│  GRÁTIS (forever free)                                  │
├─────────────────────────────────────────────────────────┤
│  • Até 30 OS/mês                                        │
│  • 1 usuário                                            │
│  • Funcionalidades básicas                              │
│  • Marca d'água no PDF                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PRO - R$ 49/mês                                        │
├─────────────────────────────────────────────────────────┤
│  • OS ilimitadas                                        │
│  • 3 usuários                                           │
│  • Financeiro completo                                  │
│  • Faturamento por técnico                              │
│  • PDF personalizado (logo)                             │
│  • Suporte por WhatsApp                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BUSINESS - R$ 99/mês                                   │
├─────────────────────────────────────────────────────────┤
│  • Tudo do PRO                                          │
│  • Usuários ilimitados                                  │
│  • Múltiplas filiais                                    │
│  • Relatórios avançados                                 │
│  • API para integrações                                 │
│  • Suporte prioritário                                  │
└─────────────────────────────────────────────────────────┘
```

### Opção B: Preço único simples
```
R$ 59/mês - Tudo liberado, sem pegadinha
```

### Recomendação
**Começar com Opção B** (simples) e migrar pra Opção A quando tiver volume.

---

## 4. Custos Operacionais (atual)

| Item | Custo | Observação |
|------|-------|------------|
| Render (backend) | $0-7/mês | Free tier aguenta ~100 usuários |
| Neon (banco) | $0/mês | Free tier com 0.5GB |
| Domínio | ~R$ 40/ano | .com.br |
| Vercel/Netlify (frontend) | $0/mês | Opcional, Render serve |
| **Total** | **~R$ 50/mês** | Antes de escalar |

### Projeção de custos com escala
| Clientes | Custo estimado | Receita (R$ 59/cliente) | Lucro |
|----------|----------------|-------------------------|-------|
| 10 | R$ 50 | R$ 590 | R$ 540 |
| 50 | R$ 150 | R$ 2.950 | R$ 2.800 |
| 100 | R$ 300 | R$ 5.900 | R$ 5.600 |
| 500 | R$ 800 | R$ 29.500 | R$ 28.700 |

---

## 5. MVP para Lançamento

### O que já tem ✅
- [x] CRUD completo de OS, clientes, equipamentos, técnicos
- [x] Multi-tenant funcionando
- [x] Autenticação JWT
- [x] PWA instalável
- [x] Financeiro básico (contas a pagar/receber)
- [x] Faturamento por técnico
- [x] PDF de OS
- [x] Painel Master (admin)
- [x] Dark mode

### O que falta para lançar 🔲
- [ ] **Landing page** (vendas)
- [ ] **Onboarding** (cadastro self-service)
- [ ] **Planos e pagamento** (Stripe/PagSeguro)
- [ ] **Termos de uso e privacidade**
- [ ] **Documentação/tutoriais**
- [ ] **Suporte** (chat/WhatsApp)

### Nice to have (pós-lançamento)
- [ ] Pesquisa de satisfação (NPS)
- [ ] Mensagem WhatsApp melhorada
- [ ] Integração WhatsApp API (botões)
- [ ] Notificações push
- [ ] App nativo (React Native)
- [ ] Integração com NFe

---

## 6. Go-to-Market

### Fase 1: Validação (0-20 clientes)
**Objetivo:** Provar que pessoas pagam pelo produto

| Ação | Como |
|------|------|
| **Beta fechado** | Convidar 5-10 assistências conhecidas |
| **Preço promocional** | R$ 29/mês para early adopters |
| **Feedback intenso** | Ligação semanal com cada cliente |
| **Ajustes rápidos** | Priorizar o que eles pedem |

### Fase 2: Tração (20-100 clientes)
**Objetivo:** Encontrar canais de aquisição

| Canal | Custo | Potencial |
|-------|-------|-----------|
| **Google Ads** | R$ 500-1000/mês | Alto |
| **Instagram/Facebook** | R$ 300-500/mês | Médio |
| **Grupos de WhatsApp** | Grátis | Alto (técnicos se ajudam) |
| **YouTube** | Grátis (tempo) | Alto (tutoriais) |
| **Parcerias** | Variável | Distribuidores de peças |
| **Indicação** | 1 mês grátis | Muito alto |

### Fase 3: Escala (100+ clientes)
- Contratar suporte
- Investir em marketing
- Desenvolver features premium
- Buscar investimento (se fizer sentido)

---

## 7. Concorrência

### Concorrentes diretos
| Sistema | Preço | Pontos fortes | Pontos fracos |
|---------|-------|---------------|---------------|
| **OS Digital** | R$ 99-299/mês | Completo | Caro, interface antiga |
| **Celero** | R$ 79-149/mês | Foco em celular | Muito nichado |
| **Tiny ERP** | R$ 99-399/mês | Nota fiscal | Complexo demais |
| **Bling** | R$ 49-249/mês | Integrações | Não é focado em OS |
| **Planilhas** | Grátis | Flexível | Não escala, perde dados |

### Posicionamento do OS Laboris
> "Simples como uma planilha, poderoso como um ERP, preço que cabe no bolso."

---

## 8. Métricas para Acompanhar

### Produto
- **MRR** (Monthly Recurring Revenue)
- **Churn** (cancelamentos/mês)
- **NPS** (satisfação)
- **DAU/MAU** (usuários ativos)

### Marketing
- **CAC** (Custo de Aquisição de Cliente)
- **LTV** (Lifetime Value)
- **Conversão** (trial → pago)

### Meta inicial
| Métrica | Mês 1 | Mês 3 | Mês 6 | Mês 12 |
|---------|-------|-------|-------|--------|
| Clientes | 5 | 20 | 50 | 150 |
| MRR | R$ 295 | R$ 1.180 | R$ 2.950 | R$ 8.850 |
| Churn | <10% | <10% | <5% | <5% |

---

## 9. Próximos Passos Imediatos

### Semana 1-2
1. [ ] Criar landing page simples (pode ser Carrd, Framer, ou custom)
2. [ ] Definir preço final
3. [ ] Escrever termos de uso

### Semana 3-4
4. [ ] Integrar pagamento (Stripe ou PagSeguro)
5. [ ] Criar fluxo de cadastro self-service
6. [ ] Gravar 1 vídeo de demonstração

### Mês 2
7. [ ] Lançar beta fechado (5-10 clientes)
8. [ ] Coletar feedback
9. [ ] Ajustar produto

### Mês 3
10. [ ] Lançamento público
11. [ ] Iniciar marketing pago (baixo orçamento)
12. [ ] Programa de indicação

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ninguém paga | Média | Alto | Validar preço com beta |
| Muito suporte | Alta | Médio | FAQ + tutoriais em vídeo |
| Concorrente copia | Baixa | Baixo | Velocidade + relacionamento |
| Custo escala rápido | Média | Médio | Otimizar infra, precificar bem |
| Burnout (fazer tudo sozinho) | Alta | Alto | Automatizar, delegar cedo |

---

## 11. Decisões Pendentes

- [ ] Nome final do produto (OS Laboris ou outro?)
- [ ] Domínio (oslaboris.com.br? laboris.app?)
- [ ] Modelo de preço (Freemium vs. Preço único)
- [ ] Gateway de pagamento (Stripe vs. PagSeguro vs. Asaas)
- [ ] Estrutura jurídica (MEI? ME?)

---

## 12. Anotações e Ideias

_Espaço para anotar insights durante a jornada:_

- ...
- ...
- ...

---

**Última atualização:** Agosto 2026

