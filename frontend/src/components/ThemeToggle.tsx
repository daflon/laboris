import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

const THEME_KEY = 'os-laboris-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verificar localStorage, senão usar dark como padrão
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    return saved || 'dark';
  });

  useEffect(() => {
    // Aplicar tema no documento
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

// Hook para usar o tema em outros componentes se necessário
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    return saved || 'dark';
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      if (saved) setTheme(saved);
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return theme;
}
