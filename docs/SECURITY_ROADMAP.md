# 🔐 Roadmap de Segurança - OS Laboris

> Documento de planejamento para melhorias de segurança do sistema.
> Última atualização: 05/10/2026

---

## ✅ Fase 1 - Fundamentos (CONCLUÍDA)

| Item | Status | Data |
|------|--------|------|
| CORS restritivo (apenas origens permitidas) | ✅ | Set/2026 |
| Helmet com Content Security Policy | ✅ | Set/2026 |
| Rate Limiting (brute force protection) | ✅ | Set/2026 |
| Validação de inputs com Zod | ✅ | Set/2026 |
| JWT com expiração curta (15 min) | ✅ | Set/2026 |
| Senhas com bcrypt (salt rounds: 10) | ✅ | Inicial |
| Validação MIME com magic bytes | ✅ | Set/2026 |

---

## ✅ Fase 2 - Tokens e Sessões (CONCLUÍDA)

| Item | Status | Data |
|------|--------|------|
| Refresh Tokens (7 dias, hash SHA256) | ✅ | Out/2026 |
| Cookies httpOnly (proteção XSS) | ✅ | Out/2026 |
| Revogação de tokens (logout) | ✅ | Out/2026 |
| Logout de todos os dispositivos | ✅ | Out/2026 |

---

## ✅ Fase 3 - Auditoria (CONCLUÍDA)

| Item | Status | Data |
|------|--------|------|
| Log de LOGIN / LOGIN_FAILED | ✅ | Out/2026 |
| Log de LOGOUT / LOGOUT_ALL | ✅ | Out/2026 |
| Log de CHANGE_PASSWORD | ✅ | Out/2026 |
| Log de operações em Clientes | ✅ | Out/2026 |
| Log de operações em Equipamentos | ✅ | Out/2026 |
| Log de operações em OS | ✅ | Out/2026 |
| Log de operações em Técnicos | ✅ | Out/2026 |
| Tela de consulta de logs (Master) | ✅ | Out/2026 |

---

## 🔴 Fase 4 - Política de Senhas (PENDENTE - Alta Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Mínimo 8 caracteres | ⏳ | Baixa |
| Exigir letra maiúscula | ⏳ | Baixa |
| Exigir número | ⏳ | Baixa |
| Exigir caractere especial | ⏳ | Baixa |
| Validação no frontend (feedback visual) | ⏳ | Baixa |
| Validação no backend (Zod schema) | ⏳ | Baixa |
| Impedir senhas comuns (lista negra) | ⏳ | Média |
| Histórico de senhas (impedir reutilização) | ⏳ | Média |

**Estimativa:** 2-3 horas

---

## 🔴 Fase 5 - Proteção contra Brute Force (PENDENTE - Alta Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Contador de tentativas falhas por usuário | ⏳ | Baixa |
| Bloqueio temporário após 5 tentativas | ⏳ | Baixa |
| Desbloqueio automático após 15 minutos | ⏳ | Baixa |
| Log de tentativas bloqueadas | ⏳ | Baixa |
| Notificação ao admin de contas bloqueadas | ⏳ | Média |
| CAPTCHA após 3 tentativas falhas | ⏳ | Alta |

**Estimativa:** 3-4 horas

---

## 🟡 Fase 6 - Controle de Sessão (PENDENTE - Média Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Timeout de inatividade (30 min) | ⏳ | Média |
| Aviso antes de expirar sessão | ⏳ | Média |
| Renovação automática se ativo | ⏳ | Média |
| Listar sessões ativas do usuário | ⏳ | Média |
| Encerrar sessão específica remotamente | ⏳ | Média |

**Estimativa:** 4-6 horas

---

## 🟡 Fase 7 - Autenticação em 2 Fatores - 2FA (PENDENTE - Média Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Código por email (6 dígitos) | ⏳ | Média |
| Validade do código (5 minutos) | ⏳ | Baixa |
| Lembrar dispositivo (30 dias) | ⏳ | Média |
| App Authenticator (TOTP) | ⏳ | Alta |
| Códigos de backup | ⏳ | Média |
| Configuração obrigatória para admins | ⏳ | Baixa |

**Estimativa:** 8-12 horas

---

## 🟡 Fase 8 - Sanitização Avançada (PENDENTE - Média Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Sanitização HTML em campos de texto | ⏳ | Baixa |
| Escape de caracteres especiais | ⏳ | Baixa |
| Proteção contra SQL Injection (já tem via Knex) | ✅ | - |
| Validação de URLs em links | ⏳ | Baixa |
| Limite de tamanho em todos os campos | ⏳ | Baixa |

**Estimativa:** 2-3 horas

---

## 🟢 Fase 9 - Monitoramento e Alertas (PENDENTE - Baixa Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Registrar IP em audit_logs | ⏳ | Baixa |
| Registrar User-Agent em audit_logs | ⏳ | Baixa |
| Detecção de login de novo dispositivo | ⏳ | Média |
| Email de alerta para login suspeito | ⏳ | Média |
| Dashboard de atividade suspeita | ⏳ | Alta |
| Integração com serviço de monitoramento | ⏳ | Alta |

**Estimativa:** 6-10 horas

---

## 🟢 Fase 10 - Compliance e Documentação (PENDENTE - Baixa Prioridade)

| Item | Status | Complexidade |
|------|--------|--------------|
| Política de Privacidade (LGPD) | ⏳ | Média |
| Termos de Uso | ⏳ | Média |
| Consentimento de cookies | ⏳ | Baixa |
| Exportação de dados do usuário | ⏳ | Média |
| Exclusão de conta (direito ao esquecimento) | ⏳ | Média |
| Documentação de segurança | ⏳ | Baixa |

**Estimativa:** 8-12 horas

---

## 📊 Resumo de Progresso

| Fase | Status | Progresso |
|------|--------|-----------|
| Fase 1 - Fundamentos | ✅ Concluída | 100% |
| Fase 2 - Tokens e Sessões | ✅ Concluída | 100% |
| Fase 3 - Auditoria | ✅ Concluída | 100% |
| Fase 4 - Política de Senhas | ⏳ Pendente | 0% |
| Fase 5 - Proteção Brute Force | ⏳ Pendente | 0% |
| Fase 6 - Controle de Sessão | ⏳ Pendente | 0% |
| Fase 7 - 2FA | ⏳ Pendente | 0% |
| Fase 8 - Sanitização Avançada | ⏳ Pendente | 0% |
| Fase 9 - Monitoramento | ⏳ Pendente | 0% |
| Fase 10 - Compliance | ⏳ Pendente | 0% |

**Progresso Geral: 3/10 fases concluídas (30%)**

---

## 🎯 Próximos Passos Recomendados

1. **Imediato:** Fase 4 (Política de Senhas) - Impacto alto, esforço baixo
2. **Curto Prazo:** Fase 5 (Bloqueio por Tentativas) - Proteção crítica
3. **Médio Prazo:** Fase 6 (Controle de Sessão) - Melhora UX e segurança
4. **Longo Prazo:** Fase 7 (2FA) - Segurança avançada para contas sensíveis

---

## 📝 Notas

- Este roadmap deve ser revisado mensalmente
- Prioridades podem mudar conforme novos requisitos
- Considerar auditorias de segurança externas periodicamente
- Manter dependências atualizadas (`npm audit` regular)
