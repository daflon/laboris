# Spec — Etapa 2: Módulo de Ordens de Serviço

## 1. Visão Geral

Módulo central do sistema. Permite criar, gerenciar e acompanhar ordens de serviço (OS/Orçamento) vinculando cliente, equipamento e técnico.

Baseado no formulário físico atual (Eletrotécnica São Miguel):
- Número sequencial do orçamento
- Cliente + telefone
- Máquina (equipamento)
- Situação (defeito relatado)
- Tabela de itens: quantidade, parecer técnico (descrição), valor
- Valor total
- Aviso de 180 dias para retirada (PL 2545/22)

---

## 2. Requisitos Funcionais

| ID | Requisito |
|----|-----------|
| OS-01 | Criar OS vinculando cliente, equipamento e técnico responsável |
| OS-02 | Número da OS sequencial automático (ex: 0001, 0002...) |
| OS-03 | Status da OS: aberta, aprovada, aguardando peça, concluída, entregue, cancelada |
| OS-04 | Qualquer usuário pode alterar para qualquer status (sem sequência obrigatória) |
| OS-05 | Campos: defeito relatado (situação), diagnóstico, observações |
| OS-06 | Itens da OS: lista de serviços/peças com quantidade, descrição e valor unitário |
| OS-07 | Cálculo automático: valor total = soma(quantidade × valor unitário) de todos os itens |
| OS-08 | Forma de pagamento: lista fixa (Dinheiro, PIX, Cartão Crédito, Cartão Débito, Transferência, A combinar) |
| OS-09 | Garantia: número de dias |
| OS-10 | Data de entrada e data de conclusão |
| OS-11 | Listar OS com busca por número, nome do cliente ou status |
| OS-12 | Visualizar detalhes completos da OS |
| OS-13 | Editar OS (todos os campos) |
| OS-14 | Excluir OS (soft delete) |
| OS-15 | Histórico de OS por equipamento (todas as OS daquele equipamento, ordenadas por data) |

---

## 3. Modelo de Dados

### 3.1 Tabela `service_orders`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | STRING(36) PK | UUID gerado |
| order_number | INTEGER | Sequencial automático, unique |
| client_id | FK → clients | Obrigatório |
| equipment_id | FK → equipment | Obrigatório |
| technician_id | FK → technicians | Obrigatório |
| status | ENUM | aberta, aprovada, aguardando_peca, concluida, entregue, cancelada |
| reported_defect | TEXT | Defeito relatado pelo cliente (situação) |
| diagnosis | TEXT | Diagnóstico do técnico |
| notes | TEXT | Observações gerais |
| payment_method | STRING | Dinheiro, PIX, Cartão Crédito, Cartão Débito, Transferência, A combinar |
| warranty_days | INTEGER | Dias de garantia (default 90) |
| entry_date | DATE | Data de entrada (default hoje) |
| completion_date | DATE | Data de conclusão (nullable) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | Soft delete |

### 3.2 Tabela `service_order_items`

| Campo | Tipo | Regra |
|-------|------|-------|
| id | STRING(36) PK | UUID gerado |
| service_order_id | FK → service_orders | Obrigatório |
| quantity | DECIMAL(10,2) | Obrigatório, > 0 |
| description | TEXT | Descrição do serviço ou peça |
| unit_price | DECIMAL(10,2) | Valor unitário |

---

## 4. Endpoints da API

### 4.1 Ordens de Serviço — `/service-orders`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/service-orders` | Criar OS com itens |
| GET | `/service-orders` | Listar (query: search, status, page, limit) |
| GET | `/service-orders/:id` | Detalhes completos (inclui itens, cliente, equipamento, técnico) |
| PUT | `/service-orders/:id` | Atualizar OS + itens |
| PATCH | `/service-orders/:id/status` | Alterar status |
| DELETE | `/service-orders/:id` | Soft delete |
| GET | `/equipment/:id/history` | Histórico de OS do equipamento |

---

## 5. Forma de Pagamento (lista fixa)

- Dinheiro
- PIX
- Cartão Crédito
- Cartão Débito
- Transferência
- A combinar

---

## 6. Critérios de Aceite

- [x] CRUD completo de OS funcionando
- [x] Número sequencial gerado automaticamente
- [x] Itens da OS (múltiplos) com cálculo de total
- [x] Mudança de status funcional
- [x] Histórico por equipamento
- [x] Frontend com telas de listagem, criação, edição e detalhes
- [x] Filtro por status na listagem

---

## 7. Fora do Escopo (Etapa 2)

- Geração de PDF
- Link de WhatsApp
- Autenticação

---

## 8. Extras Implementados

- [x] Cadastro rápido de cliente direto na tela de abertura de OS (modal)
- [x] Cadastro rápido de equipamento direto na tela de abertura de OS (modal)
- [x] Módulo de Configurações da Empresa (white-label para impressões futuras)
- [x] Status "Em Andamento" renomeado para "Aprovada" (fluxo mais adequado para eletrotécnica)
