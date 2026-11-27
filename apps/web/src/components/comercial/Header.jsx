import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  Menu,
  Home,
  ChevronLeft,
  X,
  Store
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import UserMenu from '@/components/UserMenu';

const GREEN = 'hsl(var(--neon-comercial))';

export default function Header({ toggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate();

  const iconButton =
    'text-muted-foreground hover:text-[hsl(var(--neon-comercial))] hover:bg-[hsl(var(--neon-comercial)/.10)]';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-[hsl(var(--neon-comercial)/.20)] bg-black/80 px-3 backdrop-blur-md md:px-5">
      <div className="flex min-w-0 items-center gap-1 md:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn('lg:hidden', iconButton)}
          aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen
            ? <X className="h-5 w-5" />
            : <Menu className="h-5 w-5" />
          }
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className={cn('hidden md:flex', iconButton)}
          title="Voltar para os módulos"
          aria-label="Voltar para os módulos"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className={iconButton}
          title="Módulos"
          aria-label="Ir para a seleção de módulos"
        >
          <Home
            className="h-5 w-5"
            style={{ color: GREEN }}
          />
        </Button>

        <div className="mx-1 hidden h-8 w-px bg-[hsl(var(--neon-comercial)/.30)] md:block" />

        <Link
          to="/comercial/dashboard"
          className="flex min-w-0 items-center gap-2 rounded-md"
          aria-label="Ir para o painel Comercial"
        >
          <Store
            className="hidden h-5 w-5 shrink-0 sm:block"
            style={{ color: GREEN }}
          />

          <span
            className="truncate text-base font-bold uppercase tracking-wide sm:text-lg"
            style={{
              color: GREEN,
              textShadow: `0 0 12px ${GREEN.replace(')', '/.25)')}`
            }}
          >
            Comercial
          </span>
        </Link>
      </div>

      <div className="ml-2 flex shrink-0 items-center">
        <UserMenu moduleColor="neon-comercial" />
      </div>
    </header>
  );
}
