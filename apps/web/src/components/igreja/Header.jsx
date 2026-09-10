import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, Search, ChevronLeft, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DividerLine from '@/components/ui/DividerLine';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Header = ({ toggleSidebar, submodule, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="dark-igreja flex h-16 items-center justify-between border-b border-[hsl(var(--neon-igreja))]/20 bg-card/80 backdrop-blur-xl px-4 md:px-6 sticky top-0 z-30 transition-all duration-300 animate-fade-in">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden text-muted-foreground hover:text-[hsl(var(--neon-igreja))] z-50 hover-scale">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="hidden md:flex text-muted-foreground hover:text-[hsl(var(--neon-igreja))] hover-scale">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="text-muted-foreground hover:text-[hsl(var(--neon-igreja))] hover:bg-[hsl(var(--neon-igreja))]/10 hover-scale transition-colors">
          <Home className="h-5 w-5 text-[hsl(var(--neon-igreja))]" />
        </Button>
        <DividerLine moduleName="igreja" vertical className="mx-2 h-8 opacity-40 hidden md:block" />
        <Link to="/igreja" className={cn("flex items-center gap-2 group", isSearchOpen ? "hidden md:flex" : "flex")}>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-[hsl(var(--neon-igreja))] tracking-tight group-hover:opacity-80 transition-opacity">Igreja</span>
            {submodule && <span className="text-xs font-semibold text-[hsl(var(--neon-igreja))] opacity-80 -mt-1">{submodule}</span>}
          </div>
        </Link>
      </div>
      
      {isSearchOpen && (
          <div className="flex flex-1 items-center gap-2 md:hidden absolute inset-0 bg-background px-4 z-40 animate-in fade-in slide-in-from-top-2">
            <Search className="h-4 w-4 text-muted-foreground" />
             <Input autoFocus type="search" placeholder="Pesquisar..." className="w-full bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/70 h-14 text-foreground" onBlur={() => setIsSearchOpen(false)} />
            <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(false)}>
                <X className="h-5 w-5" />
            </Button>
          </div>
      )}

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="md:hidden text-muted-foreground hover:text-[hsl(var(--neon-igreja))] hover-scale">
          <Search className="h-5 w-5" />
        </Button>
        <DividerLine moduleName="igreja" vertical className="mx-2 h-8 opacity-40 hidden md:block" />
        
        <UserMenu moduleColor="neon-igreja" />

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="ml-2 hidden sm:flex text-[hsl(var(--neon-igreja))] border-[hsl(var(--neon-igreja))]/50 hover:bg-[hsl(var(--neon-igreja))]/10 hover:border-[hsl(var(--neon-igreja))] hover:shadow-[0_0_15px_hsl(var(--neon-igreja)/0.4)] transition-all duration-300"
        >
          <LogOut className="h-4 w-4 mr-2" /> LOG-OFF
        </Button>
      </div>
    </header>
  );
};

export default Header;