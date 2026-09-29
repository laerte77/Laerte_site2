import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Settings,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const colorStyles = {
  primary: {
    trigger:
      'hover:border-primary/20 hover:shadow-[0_0_15px_hsl(var(--primary)/0.4)]',
    avatar:
      'border-primary/50 shadow-[0_0_10px_hsl(var(--primary)/0.3)]',
    fallback:
      'bg-primary/20 text-primary',
    menu:
      'border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.3)]',
    separator:
      'bg-primary/20'
  },

  'neon-pessoal': {
    trigger:
      'hover:border-[hsl(var(--neon-pessoal))]/20 hover:shadow-[0_0_15px_hsl(var(--neon-pessoal)/0.4)]',
    avatar:
      'border-[hsl(var(--neon-pessoal))]/50 shadow-[0_0_10px_hsl(var(--neon-pessoal)/0.3)]',
    fallback:
      'bg-[hsl(var(--neon-pessoal))]/20 text-[hsl(var(--neon-pessoal))]',
    menu:
      'border-[hsl(var(--neon-pessoal))]/40 shadow-[0_0_15px_hsl(var(--neon-pessoal)/0.3)]',
    separator:
      'bg-[hsl(var(--neon-pessoal))]/20'
  },

  'neon-lanhouse': {
    trigger:
      'hover:border-[hsl(var(--neon-lanhouse))]/20 hover:shadow-[0_0_15px_hsl(var(--neon-lanhouse)/0.4)]',
    avatar:
      'border-[hsl(var(--neon-lanhouse))]/50 shadow-[0_0_10px_hsl(var(--neon-lanhouse)/0.3)]',
    fallback:
      'bg-[hsl(var(--neon-lanhouse))]/20 text-[hsl(var(--neon-lanhouse))]',
    menu:
      'border-[hsl(var(--neon-lanhouse))]/40 shadow-[0_0_15px_hsl(var(--neon-lanhouse)/0.3)]',
    separator:
      'bg-[hsl(var(--neon-lanhouse))]/20'
  },

  'neon-igreja': {
    trigger:
      'hover:border-[hsl(var(--neon-igreja))]/20 hover:shadow-[0_0_15px_hsl(var(--neon-igreja)/0.4)]',
    avatar:
      'border-[hsl(var(--neon-igreja))]/50 shadow-[0_0_10px_hsl(var(--neon-igreja)/0.3)]',
    fallback:
      'bg-[hsl(var(--neon-igreja))]/20 text-[hsl(var(--neon-igreja))]',
    menu:
      'border-[hsl(var(--neon-igreja))]/40 shadow-[0_0_15px_hsl(var(--neon-igreja)/0.3)]',
    separator:
      'bg-[hsl(var(--neon-igreja))]/20'
  },

  'neon-entretenimento': {
    trigger:
      'hover:border-[hsl(var(--neon-entretenimento))]/20 hover:shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.4)]',
    avatar:
      'border-[hsl(var(--neon-entretenimento))]/50 shadow-[0_0_10px_hsl(var(--neon-entretenimento)/0.3)]',
    fallback:
      'bg-[hsl(var(--neon-entretenimento))]/20 text-[hsl(var(--neon-entretenimento))]',
    menu:
      'border-[hsl(var(--neon-entretenimento))]/40 shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.3)]',
    separator:
      'bg-[hsl(var(--neon-entretenimento))]/20'
  },

  'neon-barbearia': {
    trigger:
      'hover:border-[hsl(var(--neon-barbearia))]/20 hover:shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.4)]',
    avatar:
      'border-[hsl(var(--neon-barbearia))]/50 shadow-[0_0_10px_hsl(var(--neon-barbearia)/0.3)]',
    fallback:
      'bg-[hsl(var(--neon-barbearia))]/20 text-[hsl(var(--neon-barbearia))]',
    menu:
      'border-[hsl(var(--neon-barbearia))]/40 shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.3)]',
    separator:
      'bg-[hsl(var(--neon-barbearia))]/20'
  }
};

export default function UserMenu({
  moduleColor = 'primary'
}) {
  const navigate = useNavigate();
  const {
    user,
    profile,
    signOut
  } = useAuth();

  const styles =
    colorStyles[moduleColor] ||
    colorStyles.primary;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userDisplayName =
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuário';

  const initials = userDisplayName
    .substring(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`
            flex
            items-center
            gap-2
            rounded-full
            border
            border-transparent
            pl-2
            pr-4
            transition-[background-color,border-color,color,box-shadow,opacity,transform]
            duration-200
            ease-out
            hover:-translate-y-px
            motion-reduce:transition-none
            motion-reduce:transform-none
            ${styles.trigger}
          `}
          aria-label={`Abrir menu da conta de ${userDisplayName}`}
        >
          <Avatar
            className={`
              h-8
              w-8
              shrink-0
              ${styles.avatar}
            `}
          >
            <AvatarImage
              src={profile?.avatar_url}
              alt={`Foto de ${userDisplayName}`}
            />

            <AvatarFallback
              className={`
                font-bold
                ${styles.fallback}
              `}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div
            className="
              hidden
              min-w-0
              flex-col
              items-start
              md:flex
            "
          >
            <span
              className="
                max-w-[160px]
                truncate
                text-sm
                font-medium
                text-foreground
              "
            >
              {userDisplayName}
            </span>

            <span
              className="
                text-xs
                text-muted-foreground
              "
            >
              Online
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={`
          z-50
          min-w-[200px]
          bg-card
          animate-fade-in
          motion-reduce:animate-none
          ${styles.menu}
        `}
      >
        <DropdownMenuLabel>
          Minha Conta
        </DropdownMenuLabel>

        <DropdownMenuSeparator
          className={styles.separator}
        />

        <DropdownMenuItem
          onClick={() => navigate('/perfil')}
          className="
            cursor-pointer
            transition-[background-color,color]
            duration-150
            motion-reduce:transition-none
          "
        >
          <User
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          />

          Perfil
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate('/configuracoes')}
          className="
            cursor-pointer
            transition-[background-color,color]
            duration-150
            motion-reduce:transition-none
          "
        >
          <Settings
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          />

          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator
          className={styles.separator}
        />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="
            cursor-pointer
            text-destructive
            transition-[background-color,color]
            duration-150
            focus:text-destructive
            motion-reduce:transition-none
          "
        >
          <LogOut
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          />

          LOG-OFF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
