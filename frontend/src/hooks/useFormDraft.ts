import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormDraftOptions<T> {
  key: string;
  initialData: T;
  debounceMs?: number;
}

/**
 * Hook para salvar rascunho de formulário no localStorage.
 * Útil para prevenir perda de dados quando o token JWT expira.
 */
export function useFormDraft<T>({ key, initialData, debounceMs = 2000 }: UseFormDraftOptions<T>) {
  const storageKey = `draft_${key}`;
  const [hasDraft, setHasDraft] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar se existe rascunho salvo
  const getSavedDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.data as T;
      }
    } catch (e) {
      console.error('Erro ao ler rascunho:', e);
    }
    return null;
  }, [storageKey]);

  // Salvar rascunho (com debounce)
  const saveDraft = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          savedAt: new Date().toISOString()
        }));
        setHasDraft(true);
      } catch (e) {
        console.error('Erro ao salvar rascunho:', e);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  // Limpar rascunho (após salvar com sucesso)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [storageKey]);

  // Carregar rascunho existente ou dados iniciais
  const loadInitialData = useCallback((): { data: T; fromDraft: boolean } => {
    const draft = getSavedDraft();
    if (draft) {
      return { data: draft, fromDraft: true };
    }
    return { data: initialData, fromDraft: false };
  }, [getSavedDraft, initialData]);

  // Verificar se há rascunho ao montar
  useEffect(() => {
    const draft = getSavedDraft();
    setHasDraft(!!draft);
  }, [getSavedDraft]);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    saveDraft,
    clearDraft,
    loadInitialData,
    getSavedDraft
  };
}
