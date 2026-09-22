import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Home, Bell, ChevronLeft, Search, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DividerLine from '@/components/ui/DividerLine';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="dark-pessoal flex h-16 items-center justify-between border-b border-[hsl(var(--neon-pessoal))]/20 bg-card/60 backdrop-blur-md px-4 md:px-6 sticky top-0 z-30 transition-all duration-300 animate-fade-in">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden text-muted-foreground hover:text-[hsl(var(--neon-pessoal))] z-50 hover-scale">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="hidden md:flex text-muted-foreground hover:text-[hsl(var(--neon-pessoal))] hover-scale" title="Voltar">
            <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="text-muted-foreground hover:text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal))]/10 hover-scale transition-colors duration-300" title="Home dos Módulos">
            <Home className="h-5 w-5 text-[hsl(var(--neon-pessoal))]" />
        </Button>
        <DividerLine moduleName="pessoal" vertical className="mx-2 h-8 opacity-40 hidden md:block" />
        <Link to="/pessoal/dashboard" className={cn("flex items-center gap-2 group", isSearchOpen ? "hidden md:flex" : "flex")}>
          <div className="flex flex-col">
             <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--neon-pessoal))] to-blue-400 tracking-tight group-hover:opacity-80 transition-opacity">Pessoal</span>
          </div>
        </Link>
      </div>
      
      {isSearchOpen && (
          <div className="flex flex-1 items-center gap-2 md:hidden absolute inset-0 bg-background/95 backdrop-blur-md px-4 z-40 animate-in fade-in slide-in-from-top-2">
            <Search className="h-4 w-4 text-muted-foreground" />
             <Input autoFocus type="search" placeholder="Pesquisar..." className="w-full bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/70 h-14" onBlur={() => setIsSearchOpen(false)} />
            <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(false)}>
                <X className="h-5 w-5" />
            </Button>
          </div>
      )}
      
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full animate-fade-in">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Pesquisar..." className="w-full bg-input/50 border-border pl-9 focus-visible:ring-[hsl(var(--neon-pessoal))] placeholder:text-muted-foreground/70 transition-all glow-pessoal" />
        </div>
      </div>
      
      <div className={cn("flex items-center gap-1 md:gap-2", isSearchOpen ? "hidden md:flex" : "flex")}>
        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="md:hidden text-muted-foreground hover:text-[hsl(var(--neon-pessoal))] hover-scale">
            <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Notificações" className="text-muted-foreground hover:text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal))]/10 relative hover-scale transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[hsl(var(--neon-pessoal))] border-2 border-background animate-pulse"></span>
        </Button>
        <DividerLine moduleName="pessoal" vertical className="mx-2 h-8 opacity-40 hidden md:block" />
        
        <UserMenu moduleColor="neon-pessoal" />

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="ml-2 hidden sm:flex text-[hsl(var(--neon-pessoal))] border-[hsl(var(--neon-pessoal))]/50 hover:bg-[hsl(var(--neon-pessoal))]/10 hover:border-[hsl(var(--neon-pessoal))] hover:shadow-[0_0_15px_hsl(var(--neon-pessoal)/0.4)] transition-all duration-300"
        >
          <LogOut className="h-4 w-4 mr-2" /> LOG-OFF
        </Button>
      </div>
    </header>
  );
};

export default Header;
