import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Home, ChevronLeft, X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserMenu from '@/components/UserMenu';

export default function Header({ toggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--neon-comercial)/.20)] bg-black/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-1 md:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-[hsl(var(--neon-comercial))] lg:hidden"
          aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        >
          {isSidebarOpen
            ? <X className="h-6 w-6" />
            : <Menu className="h-6 w-6" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className="hidden text-muted-foreground hover:text-[hsl(var(--neon-comercial))] md:flex"
          title="Voltar aos módulos"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          title="Início"
          aria-label="Ir para a seleção de módulos"
        >
          <Home className="h-5 w-5 text-[hsl(var(--neon-comercial))]" />
        </Button>

        <div className="mx-2 hidden h-8 w-px bg-[hsl(var(--neon-comercial)/.30)] md:block" />

        <button
          type="button"
          onClick={() => navigate('/comercial/dashboard')}
          className="hidden items-center gap-2 rounded-md sm:flex"
        >
          <Store className="h-5 w-5 text-[hsl(var(--neon-comercial))]" />

          <span className="text-lg font-bold uppercase tracking-wider text-[hsl(var(--neon-comercial))]">
            Comercial
          </span>
        </button>
      </div>

      <UserMenu moduleColor="neon-comercial" />
    </header>
  );
}
