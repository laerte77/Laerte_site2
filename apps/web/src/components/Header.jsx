import React, { useState } from 'react';
import { User, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import UserMenu from '@/components/UserMenu';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

export default function Header() {
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((previous) => !previous);
  };

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-white/10
        bg-background/90
        backdrop-blur-md
        animate-fade-in
        motion-reduce:animate-none
        supports-[backdrop-filter]:bg-background/60
      "
    >
      <div
        className="
          container
          mx-auto
          flex
          h-16
          items-center
          justify-between
          px-4
          sm:px-6
        "
      >
        <div className="flex min-w-0 items-center gap-2">
          {isMobile && (
            <button
              type="button"
              className="
                mr-1
                inline-flex
                min-h-11
                min-w-11
                items-center
                justify-center
                rounded-lg
                text-muted-foreground
                transition-[background-color,color,transform]
                duration-200
                ease-out
                hover:bg-accent/10
                hover:text-foreground
                active:scale-[0.97]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                touch-target
                motion-reduce:transition-none
                motion-reduce:transform-none
              "
              onClick={toggleMobileMenu}
              aria-label={
                mobileMenuOpen
                  ? 'Fechar menu'
                  : 'Abrir menu'
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-info"
            >
              {mobileMenuOpen ? (
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
            </button>
          )}

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-primary/20
              text-primary
              glow-neon
            "
            aria-hidden="true"
          >
            <User className="h-6 w-6" />
          </div>

          <span
            className={`
              min-w-0
              truncate
              font-bold
              tracking-wider
              text-white
              ${isMobile ? 'text-lg' : 'text-xl'}
            `}
          >
            SISTEMA
            <span className="text-[hsl(var(--neon-lanhouse))]">
              PRO
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {!isMobile && (
            <div className="hidden max-w-[180px] items-center gap-2 text-muted-foreground md:flex">
              <span className="truncate text-sm font-medium">
                Olá,{' '}
                {user?.email?.split('@')[0] || 'Usuário'}
              </span>
            </div>
          )}

          <UserMenu moduleColor="primary" />
        </div>
      </div>

      {isMobile && mobileMenuOpen && (
        <div
          id="mobile-navigation-info"
          className="
            absolute
            left-0
            top-16
            w-full
            border-b
            border-white/10
            bg-background/95
            p-4
            shadow-xl
            backdrop-blur-md
            animate-in
            slide-in-from-top-2
            duration-200
            motion-reduce:animate-none
          "
          role="region"
          aria-label="Informações do menu mobile"
        >
          <div
            className="
              border-b
              border-border/50
              pb-3
            "
          >
            <span
              className="
                block
                truncate
                text-sm
                font-medium
                text-muted-foreground
              "
              title={user?.email || 'Usuário'}
            >
              Logado como:{' '}
              <span className="text-foreground">
                {user?.email || 'Usuário'}
              </span>
            </span>
          </div>

          <p
            className="
              pt-3
              text-xs
              leading-relaxed
              text-muted-foreground
            "
          >
            Para acessar o menu dos módulos, use a
            barra lateral inferior ou o ícone específico
            do módulo dentro do painel.
          </p>
        </div>
      )}
    </header>
  );
}
