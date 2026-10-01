# Módulo de Anexos/Fotos na OS

> **Status:** Planejado  
> **Origem:** Demanda ESM (cliente com lava-jato que precisa de prova fotográfica)  
> **Data:** Agosto/2026

## Contexto

Técnicos precisam registrar fotos de peças, defeitos e condições do equipamento para:
- Mostrar pro cliente o que foi encontrado
- Ter histórico visual para consultas futuras
- Evitar discussões ("da última vez estava assim também")

## Funcionalidades

### 1. Upload de Fotos na OS
- Botão "Tirar Foto" na tela de criação/edição da OS
- Abre câmera direto no celular (`capture="environment"`)
- Opção de escolher da galeria também
- Limite: 5 fotos por OS, max 2 MB cada
- Compressão automática no frontend antes do upload

### 2. Visualização
- Galeria de miniaturas na tela de detalhes da OS
- Clique pra ampliar (lightbox)
- Legenda opcional por foto

### 3. Fotos no PDF
- Seção "Registro Fotográfico" no final do PDF
- Grid 2x2 com as fotos
- Legendas abaixo de cada foto

### 4. Histórico do Equipamento
- Ao consultar equipamento, mostra fotos de OS anteriores
- "OS #269 (15/08) - 3 fotos"

## Implementação Técnica

### Fase 1: Base64 no Neon (MVP)
- Armazena foto como texto Base64 no PostgreSQL
- Tabela: `os_attachments` (os_id, image_base64, filename, caption, created_at)
- Prós: Zero config externa, rápido de implementar
- Contras: Infla o banco

### Fase 2: Migração para Storage Externo (se necessário)
- Opção A: Cloudflare R2 (10 GB grátis)
- Opção B: Supabase Storage (1 GB grátis)
- Migrar quando banco chegar em ~300 MB

## Estimativas de Espaço

- Banco atual: ~3 MB
- Limite Neon Free: 512 MB
- Espaço disponível: ~500 MB
- Foto comprimida: ~100-150 KB
- Capacidade: ~3.000 fotos

## Fluxo do Usuário

```
[Edita OS] → [📷 Tirar Foto] → [Câmera abre] → [Foto salva] → [Preview na OS]
                                                        ↓
                                            [PDF mostra fotos]
                                                        ↓
                                            [Histórico do equipamento]
```

## Tarefas de Implementação

### Backend
- [ ] Migration: criar tabela `os_attachments`
- [ ] Endpoint POST `/api/v1/service-orders/:id/attachments` (upload)
- [ ] Endpoint GET `/api/v1/service-orders/:id/attachments` (listar)
- [ ] Endpoint DELETE `/api/v1/service-orders/:id/attachments/:attachmentId`
- [ ] Atualizar geração de PDF para incluir fotos

### Frontend
- [ ] Componente `PhotoCapture` (câmera/galeria)
- [ ] Compressão de imagem antes do upload (canvas resize + quality)
- [ ] Galeria com lightbox na tela de detalhes
- [ ] Integrar na tela de criação/edição de OS

### Estimativa
- MVP funcional: ~2-3 dias

---

*Documento criado para futura implementação*
*Estratégia: começar com Base64 no Neon, migrar se necessário*
