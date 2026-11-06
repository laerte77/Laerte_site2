import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Home, Bell, ChevronLeft, Search, X, LogOut, CalendarClock, Package, Users, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DividerLine from '@/components/ui/DividerLine';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useLmNotifications } from '@/hooks/useLmNotifications';

const CYAN = 'hsl(var(--neon-lanhouse))';
const BASE = '/lm-impressoes/dashboard';

const money = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { notifications, count, loading: loadingNotifications } =
    useLmNotifications();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const iconButton =
    'text-muted-foreground hover:text-[hsl(var(--neon-lanhouse))] hover:bg-[hsl(var(--neon-lanhouse)/.10)]';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    const term = search.trim();

    if (!term || !user?.id) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const pattern = `%${term}%`;

        const [clients, services, supplies, bills, orders] =
          await Promise.all([
            supabase
              .from('lm_clientes')
              .select('id,nome')
              .eq('user_id', user.id)
              .ilike('nome', pattern)
              .limit(6),

            supabase
              .from('lm_servicos')
              .select('id,servico,valor')
              .eq('user_id', user.id)
              .ilike('servico', pattern)
              .limit(6),

            supabase
              .from('lm_insumos')
              .select('id,nome,unidade')
              .eq('user_id', user.id)
              .ilike('nome', pattern)
              .limit(6),

            supabase
              .from('lm_despesas_previstas')
              .select('id,descricao,data_vencimento,valor')
              .eq('user_id', user.id)
              .ilike('descricao', pattern)
              .limit(6),

            supabase
              .from('lm_pedidos')
              .select('id,status,data_pedido,data_entrega')
              .eq('user_id', user.id)
              .ilike('status', pattern)
              .limit(6)
          ]);

        if (!active) return;

        const items = [
          ...(clients.data || []).map(item => ({
            id: `cliente-${item.id}`,
            title: item.nome,
            type: 'Cliente',
            icon: Users,
            route: `${BASE}/cadastros/clientes`
          })),

          ...(services.data || []).map(item => ({
            id: `servico-${item.id}`,
            title: item.servico,
            subtitle: money(item.valor),
            type: 'Serviço',
            icon: ClipboardList,
            route: `${BASE}/cadastros/servicos`
          })),

          ...(supplies.data || []).map(item => ({
            id: `insumo-${item.id}`,
            title: item.nome,
            subtitle: item.unidade || '',
            type: 'Insumo',
            icon: Package,
            route: `${BASE}/cadastros/insumos`
          })),

          ...(bills.data || []).map(item => ({
            id: `despesa-${item.id}`,
            title: item.descricao,
            subtitle: money(item.valor),
            type: 'Conta prevista',
            icon: CalendarClock,
            route: `${BASE}/relatorios/despesas-previstas`
          })),

          ...(orders.data || []).map(item => ({
            id: `pedido-${item.id}`,
            title: `Pedido ${String(item.id).slice(0, 8)}`,
            subtitle: item.status || 'Sem status',
            type: 'Pedido',
            icon: ClipboardList,
            route: `${BASE}/pedidos/consulta`
          }))
        ];

        setResults(items);
      } catch (error) {
        console.error('Erro na pesquisa global:', error);
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, user?.id]);

  const openResult = route => {
    navigate(route);
    setSearch('');
    setResults([]);
    setSearchOpen(false);
    setMobileSearch(false);
  };

  const openNotification = route => {
    navigate(route);
    setNotificationsOpen(false);
  };

  const SearchBox = ({ mobile = false }) => (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        autoFocus={mobile}
        type="search"
        value={search}
        placeholder="Pesquisar clientes, serviços, contas..."
        onChange={event => {
          setSearch(event.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setSearch('');
            setSearchOpen(false);
            setMobileSearch(false);
          }
        }}
        className="h-10 w-full border-border bg-input/50 pl-9 pr-9 focus-visible:ring-[hsl(var(--neon-lanhouse))]"
        aria-label="Pesquisar no módulo LM Impressões"
      />

      {search && (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setResults([]);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-label="Limpar pesquisa"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {searchOpen && search.trim() && (
        <div className="absolute left-0 top-12 z-[60] max-h-[65vh] w-full min-w-[280px] overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl">
          <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">
            RESULTADOS DA PESQUISA
          </div>

          {searching && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Pesquisando...
            </p>
          )}

          {!searching && results.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </p>
          )}

          {!searching && results.map(item => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => openResult(item.route)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.type}
                    {item.subtitle ? ` • ${item.subtitle}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <header className="dark-lm-impressoes sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--neon-lanhouse)/.20)] bg-card/80 px-3 backdrop-blur-md md:px-5">

      <div className={cn(
        'flex min-w-0 items-center gap-1 md:gap-2',
        mobileSearch && 'hidden md:flex'
      )}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={`lg:hidden ${iconButton}`}
          aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        >
          {isSidebarOpen
            ? <X className="h-5 w-5" />
            : <Menu className="h-5 w-5" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modules')}
          className={`hidden md:flex ${iconButton}`}
          title="Voltar para os módulos"
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
        >
          <Home className="h-5 w-5" style={{ color: CYAN }} />
        </Button>

        <DividerLine
          moduleName="lm-impressoes"
          vertical
          className="mx-1 hidden h-8 opacity-40 md:block"
        />

        <Link
          to={`${BASE}`}
          className="min-w-0 rounded-md"
          aria-label="Ir para o painel LM Impressões"
        >
          <span
            className="truncate text-lg font-bold tracking-tight"
            style={{
              color: CYAN,
              textShadow: `0 0 12px ${CYAN.replace(')', '/.25)')}`
            }}
          >
            LM Impressões
          </span>
        </Link>
      </div>

      <div className="mx-3 hidden max-w-lg flex-1 md:block">
        <SearchBox />
      </div>

      {mobileSearch && (
        <div className="absolute inset-0 z-50 flex items-center gap-2 bg-background/95 px-3 backdrop-blur-md md:hidden">
          <div className="min-w-0 flex-1">
            <SearchBox mobile />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setMobileSearch(false);
              setSearch('');
              setSearchOpen(false);
            }}
            className={iconButton}
            aria-label="Fechar pesquisa"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className={cn(
        'flex items-center gap-1 md:gap-2',
        mobileSearch && 'hidden md:flex'
      )}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMobileSearch(true)}
          className={`md:hidden ${iconButton}`}
          aria-label="Abrir pesquisa"
        >
          <Search className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Notificações"
            className={`relative ${iconButton}`}
            aria-label={`Notificações: ${count}`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen(value => !value)}
          >
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-background px-1 text-[10px] font-bold text-white" style={{ background: CYAN }}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-[60] w-[min(90vw,360px)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="font-semibold">Notificações</p>
                  <p className="text-xs text-muted-foreground">
                    {count} alerta(s) pendente(s)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Fechar notificações"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto p-2">
                {loadingNotifications && (
                  <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                    Atualizando notificações...
                  </p>
                )}

                {!loadingNotifications && notifications.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Você não tem alertas no momento.
                  </p>
                )}

                {notifications.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => openNotification(item.route)}
                    className="flex w-full gap-3 rounded-md p-3 text-left hover:bg-accent"
                  >
                    <CalendarClock
                      className="mt-1 h-5 w-5 shrink-0"
                      style={{ color: CYAN }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="block truncate text-sm">
                        {item.description}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.message}
                        {' • '}
                        {money(item.value)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DividerLine
          moduleName="lm-impressoes"
          vertical
          className="mx-1 hidden h-8 opacity-40 md:block"
        />

        <UserMenu moduleColor="neon-lanhouse" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="ml-1 hidden min-h-9 gap-2 sm:flex"
          style={{
            borderColor: `${CYAN.replace(')', '/.45)')}`,
            color: CYAN
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
};

export default Header;

