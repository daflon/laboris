# Módulo de Controle de Aluguéis

> **Status:** Planejado  
> **Origem:** Demanda ESM (Eletrotécnica São Miguel)  
> **Data:** Agosto/2026

## Contexto

Assistências técnicas frequentemente diversificam receita alugando equipamentos próprios (geradores, ferramentas, compressores). Atualmente controlam isso em planilhas ou cadernos.

## Funcionalidades Propostas

### 1. Cadastro de Patrimônio
- Equipamentos próprios da empresa (separado dos equipamentos de clientes)
- Campos: nome, código patrimônio, valor de compra, valor diário/semanal/mensal
- Status: disponível, alugado, em manutenção, inativo
- Foto do equipamento

### 2. Contratos de Aluguel
- Vincula: cliente + equipamento + período
- Data início e previsão de devolução
- Valor acordado e forma de pagamento
- Observações e condições

### 3. Controle de Devoluções
- Registrar devolução com data real
- Checklist de condição do equipamento
- Se danificado: gerar OS de manutenção automaticamente
- Calcular valor final (dias extras, multas)

### 4. Financeiro Integrado
- Receita de aluguel entra no fluxo de caixa
- Contas a receber vinculadas ao contrato
- Alertas de pagamentos pendentes

### 5. Dashboard de Aluguéis
- Equipamentos alugados agora
- Devoluções previstas na semana
- Atrasos (destaque vermelho)
- Receita do mês com aluguéis

### 6. Relatórios
- Faturamento por equipamento
- Taxa de ocupação
- Histórico por cliente
- Equipamentos mais rentáveis

## Fluxo Principal

```
[Cadastra Patrimônio] → [Novo Aluguel] → [Contrato Ativo] → [Devolução] → [Financeiro]
                                              ↓
                                    [Atrasado? Notifica]
                                              ↓
                                    [Danificado? Gera OS]
```

## Mock Visual

Ver mock criado em sessão de 19/08/2026 - tela principal com:
- 4 cards de resumo (alugados, receita, devoluções, atrasados)
- Tabela de aluguéis ativos
- Abas: Ativos / Histórico / Equipamentos
- Ações rápidas (devolução, renovar, gerar OS, relatório)

## Integrações

- **Clientes:** usa cadastro existente
- **Financeiro:** receitas e contas a receber
- **OS:** gerar OS de manutenção quando equipamento volta danificado
- **WhatsApp:** notificar cliente sobre devolução próxima ou atraso

## Estimativa

- MVP: ~2-3 dias de desenvolvimento
- Inclui: patrimônio, contratos, devoluções, dashboard básico

---

*Documento criado para futura implementação*
