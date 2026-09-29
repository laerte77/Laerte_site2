import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Home,
  Bell,
  ChevronLeft,
  Search,
  X,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DividerLine from '@/components/ui/DividerLine';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Header = ({
  toggleSidebar,
  isSidebarOpen
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header
      className="
        dark-pessoal
        sticky
        top-0
        z-30
        flex
        h-16
        w-full
        items-center
        justify-between
        border-b
        border-[hsl(var(--neon-pessoal))]/20
        bg-card/60
        px-4
        backdrop-blur-md
        md:px-6
        animate-fade-in
        motion-reduce:animate-none
      "
    >
      <div className="flex min-w-0 items-center gap-1 md:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="
            z-50
            lg:hidden
            text-muted-foreground
            hover:text-[hsl(var(--neon-pessoal))]
            hover:bg-[hsl(var(--neon-pessoal))]/10
            transition-[background-color,color,transform]
            duration-200
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
          "
          aria-label={
            isSidebarOpen
              ? 'Fechar menu lateral'
              : 'Abrir menu lateral'
          }
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? (
            <X
              className="h-6 w-6"
              aria-hidden="true"
            />
          ) : (
            <Menu
              className="h-6 w-6"
              aria-hidden="true"
            />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className="
            hidden
            text-muted-foreground
            transition-[background-color,color,transform]
            duration-200
            hover:text-[hsl(var(--neon-pessoal))]
            hover:bg-[hsl(var(--neon-pessoal))]/10
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
            md:flex
          "
          title="Voltar"
          aria-label="Voltar para os módulos"
        >
          <ChevronLeft
            className="h-5 w-5"
            aria-hidden="true"
          />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className="
            text-muted-foreground
            transition-[background-color,color,transform]
            duration-200
            hover:text-[hsl(var(--neon-pessoal))]
            hover:bg-[hsl(var(--neon-pessoal))]/10
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
          "
          title="Home dos Módulos"
          aria-label="Ir para a seleção de módulos"
        >
          <Home
            className="
              h-5
              w-5
              text-[hsl(var(--neon-pessoal))]
            "
            aria-hidden="true"
          />
        </Button>

        <DividerLine
          moduleName="pessoal"
          vertical
          className="
            mx-2
            hidden
            h-8
            opacity-40
            md:block
          "
        />

        <Link
          to="/pessoal/dashboard"
          className={cn(
            `
              min-w-0
              items-center
              gap-2
              rounded-md
              transition-[opacity,color]
              duration-200
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[hsl(var(--neon-pessoal))]
              focus-visible:ring-offset-2
              motion-reduce:transition-none
            `,
            isSearchOpen
              ? 'hidden md:flex'
              : 'flex'
          )}
          aria-label="Ir para o painel Pessoal"
        >
          <div className="flex min-w-0 flex-col">
            <span
              className="
                truncate
                text-lg
                font-bold
                tracking-tight
                text-transparent
                bg-clip-text
                bg-gradient-to-r
                from-[hsl(var(--neon-pessoal))]
                to-blue-400
                transition-opacity
                duration-200
                group-hover:opacity-80
              "
            >
              Pessoal
            </span>
          </div>
        </Link>
      </div>

      {isSearchOpen && (
        <div
          className="
            absolute
            inset-0
            z-40
            flex
            items-center
            gap-2
            bg-background/95
            px-4
            backdrop-blur-md
            animate-in
            fade-in
            slide-in-from-top-2
            duration-200
            motion-reduce:animate-none
            md:hidden
          "
        >
          <Search
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <Input
            autoFocus
            type="search"
            placeholder="Pesquisar..."
            className="
              h-12
              w-full
              border-none
              bg-transparent
              focus-visible:ring-0
              placeholder:text-muted-foreground/70
            "
            aria-label="Pesquisar no módulo Pessoal"
            onBlur={() => setIsSearchOpen(false)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(false)}
            className="
              shrink-0
              transition-[background-color,color,transform]
              duration-200
              hover:-translate-y-px
              motion-reduce:transition-none
              motion-reduce:transform-none
            "
            aria-label="Fechar pesquisa"
          >
            <X
              className="h-5 w-5"
              aria-hidden="true"
            />
          </Button>
        </div>
      )}

      <div className="hidden flex-1 mx-4 max-w-md md:flex">
        <div className="relative w-full animate-fade-in motion-reduce:animate-none">
          <Search
            className="
              absolute
              left-2.5
              top-2.5
              h-4
              w-4
              text-muted-foreground
            "
            aria-hidden="true"
          />

          <Input
            type="search"
            placeholder="Pesquisar..."
            className="
              w-full
              bg-input/50
              border-border
              pl-9
              focus-visible:ring-[hsl(var(--neon-pessoal))]
              placeholder:text-muted-foreground/70
              glow-pessoal
            "
            aria-label="Pesquisar no módulo Pessoal"
          />
        </div>
      </div>

      <div
        className={cn(
          'flex items-center gap-1 md:gap-2',
          isSearchOpen
            ? 'hidden md:flex'
            : 'flex'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsSearchOpen(true)}
          className="
            text-muted-foreground
            transition-[background-color,color,transform]
            duration-200
            hover:text-[hsl(var(--neon-pessoal))]
            hover:bg-[hsl(var(--neon-pessoal))]/10
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
            md:hidden
          "
          aria-label="Abrir pesquisa"
        >
          <Search
            className="h-5 w-5"
            aria-hidden="true"
          />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Notificações"
          className="
            relative
            text-muted-foreground
            transition-[background-color,color,transform]
            duration-200
            hover:text-[hsl(var(--neon-pessoal))]
            hover:bg-[hsl(var(--neon-pessoal))]/10
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
          "
          aria-label="Notificações"
        >
          <Bell
            className="h-5 w-5"
            aria-hidden="true"
          />

          <span
            className="
              absolute
              right-2
              top-2
              h-2
              w-2
              rounded-full
              border-2
              border-background
              bg-[hsl(var(--neon-pessoal))]
              motion-reduce:animate-none
              animate-pulse
            "
            aria-hidden="true"
          />
        </Button>

        <DividerLine
          moduleName="pessoal"
          vertical
          className="
            mx-2
            hidden
            h-8
            opacity-40
            md:block
          "
        />

        <UserMenu moduleColor="neon-pessoal" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="
            ml-2
            hidden
            min-h-9
            gap-2
            border-[hsl(var(--neon-pessoal))]/50
            text-[hsl(var(--neon-pessoal))]
            transition-[background-color,border-color,color,box-shadow,transform]
            duration-200
            hover:bg-[hsl(var(--neon-pessoal))]/10
            hover:border-[hsl(var(--neon-pessoal))]
            hover:shadow-[0_0_15px_hsl(var(--neon-pessoal)/0.4)]
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
            sm:flex
          "
        >
          <LogOut
            className="h-4 w-4"
            aria-hidden="true"
          />

          LOG-OFF
        </Button>
      </div>
    </header>
  );
};

export default Header;
