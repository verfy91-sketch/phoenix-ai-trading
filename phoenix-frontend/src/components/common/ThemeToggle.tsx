import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/lib/store/useThemeStore';
import { Button } from '@/components/ui/Button';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  const getIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    // System theme - check actual system preference
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    return <Sun className="h-4 w-4" />;
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {getIcon()}
    </Button>
  );
};

export { ThemeToggle };
