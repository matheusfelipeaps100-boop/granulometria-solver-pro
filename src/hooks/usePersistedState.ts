import { useState } from "react";

/**
 * Como useState, mas mantém o valor em sessionStorage.
 * Sobrevive a navegações (ex: sair para ver detalhe e voltar), mas
 * é limpo ao fechar a aba, evitando filtros "grudados" para sempre.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedState = (value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore quota/serialization errors
      }
      return next;
    });
  };

  return [state, setPersistedState] as const;
}
