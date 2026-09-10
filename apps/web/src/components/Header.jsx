import React, { useState } from 'react';
import { User, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import UserMenu from '@/components/UserMenu';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

export default function Header() {
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-md animate-fade-in supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        
        <div className="flex items-center gap-2">
          {isMobile && (
            <button 
              className="mr-2 p-2 rounded-md hover:bg-accent/10 touch-target"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary glow-neon">
            <User className="h-6 w-6" />
          </div>
          <span className={`font-bold text-white tracking-wider ${isMobile ? 'text-lg' : 'text-xl'}`}>
            SISTEMA<span className="text-[hsl(var(--neon-lanhouse))]">PRO</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!isMobile && (
            <div className="hidden md:flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium truncate max-w-[150px]">
                Olá, {user?.email?.split('@')[0] || 'Usuário'}
              </span>
            </div>
          )}
          <UserMenu moduleColor="primary" />
        </div>
      </div>

      {/* Mobile Menu Dropdown Wrapper if needed for top level navigation (sidebars handle their own usually) */}
      {isMobile && mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-background border-b border-white/10 shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
          <div className="text-muted-foreground border-b border-border/50 pb-2">
            <span className="text-sm font-medium">Logado como: {user?.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">Para acessar o menu dos módulos, use a barra lateral inferior ou o ícone específico do módulo dentro do painel.</p>
        </div>
      )}
    </header>
  );
}