import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UserMenu({ moduleColor = "primary" }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userDisplayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`flex items-center gap-2 pl-2 pr-4 rounded-full border border-transparent hover:border-${moduleColor}/20 transition-all duration-300 hover:shadow-[0_0_15px_hsl(var(--${moduleColor})/0.4)]`}
        >
          <Avatar className={`h-8 w-8 border border-${moduleColor}/50 shadow-[0_0_10px_hsl(var(--${moduleColor})/0.3)]`}>
            <AvatarImage src={profile?.avatar_url} alt={userDisplayName} />
            <AvatarFallback className={`bg-${moduleColor}/20 text-${moduleColor} font-bold`}>
               {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-sm">
            <span className="font-medium text-foreground">{userDisplayName}</span>
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`min-w-[200px] bg-card border-${moduleColor}/40 shadow-[0_0_15px_hsl(var(--${moduleColor})/0.3)] z-50 animate-fade-in`}>
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator className={`bg-${moduleColor}/20`} />
        <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator className={`bg-${moduleColor}/20`} />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> LOG-OFF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}