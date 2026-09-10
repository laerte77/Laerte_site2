import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Home, ChevronLeft, X, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DividerLine from '@/components/ui/DividerLine';
import UserMenu from '@/components/UserMenu';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[hsl(var(--neon-barbearia))]/20 bg-black/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-30 transition-all duration-300 animate-fade-in">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden text-[hsl(var(--neon-barbearia))] hover:bg-[hsl(var(--neon-barbearia))]/10 z-50 hover-scale">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="hidden md:flex text-muted-foreground hover:text-[hsl(var(--neon-barbearia))] hover:bg-[hsl(var(--neon-barbearia))]/10 hover-scale" title="Voltar">
            <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="text-muted-foreground hover:text-[hsl(var(--neon-barbearia))] bg-[hsl(var(--neon-barbearia))]/10 hover:bg-[hsl(var(--neon-barbearia))]/20 hover-scale transition-colors duration-300" title="Home">
            <Home className="h-5 w-5 text-[hsl(var(--neon-barbearia))]" />
        </Button>

        <DividerLine moduleName="barbearia" vertical className="mx-2 h-8 opacity-40 hidden md:block" />

        <div className="flex items-center gap-2 group hidden sm:flex cursor-pointer" onClick={() => navigate('/barbearia/dashboard/home')}>
          <Scissors className="h-5 w-5 text-[hsl(var(--neon-barbearia))]" />
          <span className="text-lg font-bold text-[hsl(var(--neon-barbearia))] tracking-wider uppercase group-hover:opacity-80 transition-opacity">Brothers</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu moduleColor="neon-barbearia" />
      </div>
    </header>
  );
};

export default Header;