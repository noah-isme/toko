'use client';

import { Sun, Moon, Contrast, Monitor } from 'lucide-react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';
type ContrastMode = 'normal' | 'high';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [contrastMode, setContrastMode] = useState<ContrastMode>('normal');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const storedContrast = localStorage.getItem('contrastMode') as ContrastMode | null;
    
    if (storedTheme) setTheme(storedTheme);
    if (storedContrast) setContrastMode(storedContrast);
  }, []);

  // Compute resolved theme
  useEffect(() => {
    if (!mounted) return;
    
    let resolved: 'light' | 'dark' = 'light';
    
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }
    
    setResolvedTheme(resolved);
    
    // Apply to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
    
    // Apply contrast mode
    if (contrastMode === 'high') {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [theme, contrastMode, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Listen for system contrast preference changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && contrastMode === 'normal') {
        // Optionally auto-enable high contrast when system prefers it
        // setContrastMode('high');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [contrastMode, mounted]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }, []);

  const handleSetContrastMode = useCallback((newMode: ContrastMode) => {
    setContrastMode(newMode);
    localStorage.setItem('contrastMode', newMode);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
        contrastMode,
        setContrastMode: handleSetContrastMode,
        resolvedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme toggle component
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === 'light' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === 'dark' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === 'system' && ' ✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Contrast toggle component
export function ContrastToggle() {
  const { contrastMode, setContrastMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle high contrast">
          <Contrast className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setContrastMode('normal')}>
          Normal
          {contrastMode === 'normal' && ' ✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setContrastMode('high')}>
          High Contrast
          {contrastMode === 'high' && ' ✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Combined theme and contrast selector
export function ThemeSelector() {
  const { theme, setTheme, contrastMode, setContrastMode, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {resolvedTheme === 'dark' ? (
              <> <Moon className="h-4 w-4" /> Dark </ >
            ) : theme === 'system' ? (
              <> <Monitor className="h-4 w-4" /> System </ >
            ) : (
              <> <Sun className="h-4 w-4" /> Light </ >
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            Light
            {theme === 'light' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
            {theme === 'dark' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {theme === 'system' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={contrastMode === 'high' ? 'default' : 'outline'} 
            size="sm" 
            className="gap-2"
            aria-pressed={contrastMode === 'high'}
          >
            <Contrast className="h-4 w-4" />
            {contrastMode === 'high' ? 'High Contrast' : 'Normal'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setContrastMode('normal')}>
            Normal
            {contrastMode === 'normal' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setContrastMode('high')}>
            High Contrast (WCAG AAA)
            {contrastMode === 'high' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Need to import Monitor from lucide-react
// Adding it to the imports at the top