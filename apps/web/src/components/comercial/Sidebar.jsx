import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, ChevronLeft, ChevronRight, LayoutGrid, LogOut, Users, Truck, Package, ArrowLeftRight, ShoppingCart, Receipt, Wallet, TrendingUp, Boxes, Search, PlusCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GREEN = 'hsl(var(--neon-comercial))';
const NavLink = ({ to, icon: Icon, children }) => {
  const { pathname } = useLocation();

  const active = to === '/comercial/dashboard'
    ? pathname === to
    : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-[hsl(var(--neon-comercial)/.45)] bg-[hsl(var(--neon-comercial)/.10)]'
          : 'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-comercial)/.20)] hover:bg-muted hover:text-foreground'
      )}
      style={active ? { color: GREEN } : undefined}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </Link>
  );
};

const Sidebar = ({ isOpen, setOpen, isMobile }) => {
  const { signOut } = useAuth();

  const expanded = isOpen || isMobile;

  const trigger =
    'flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-comercial)/.08)] hover:text-foreground';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300',
        isMobile
          ? isOpen
            ? 'w-60 translate-x-0'
            : 'w-60 -translate-x-full'
          : isOpen
            ? 'w-60'
            : 'w-20'
      )}
    >

      {/* CABEÇALHO */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-comercial)/.35)]"
            style={{
              background: `linear-gradient(135deg, ${GREEN}, #65a30d)`
            }}
          >
            <Store className="h-4 w-4 text-black" />
          </div>

          {expanded && (
            <div className="leading-tight">
              <div className="text-sm font-bold uppercase text-white">
                COMERCIAL
              </div>

              <div
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: GREEN }}
              >
                GESTÃO
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!isOpen)}
            className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-comercial)/.08)]"
            style={{ color: GREEN }}
          >
            {isOpen
              ? <ChevronLeft className="h-5 w-5" />
              : <ChevronRight className="h-5 w-5" />
            }
          </Button>
        )}
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
        <ul className="space-y-1">

          {/* DASHBOARD */}
          <li>
            <NavLink to="/comercial/dashboard" icon={Home}>
              {expanded && 'Dashboard'}
            </NavLink>
          </li>

          <Accordion type="single" collapsible className="w-full">

            {/* CADASTROS */}
            <AccordionItem value="cadastros">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  {expanded && 'Cadastros'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink
                  to="/comercial/dashboard/cadastros/clientes"
                  icon={Users}
                >
                  Clientes
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/cadastros/fornecedores"
                  icon={Truck}
                >
                  Fornecedores
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/cadastros/produtos"
                  icon={Package}
                >
                  Produtos
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* ESTOQUE */}
            <AccordionItem value="estoque">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Boxes className="h-4 w-4 shrink-0" />
                  {expanded && 'Estoque'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink
                  to="/comercial/dashboard/estoque/movimentacoes"
                  icon={ArrowLeftRight}
                >
                  Movimentações
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* LANÇAMENTOS */}
            <AccordionItem value="lancamentos">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 shrink-0" />
                  {expanded && 'Lançamentos'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink
                  to="/comercial/dashboard/lancamentos/vendas"
                  icon={ShoppingCart}
                >
                  Vendas
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/lancamentos/despesas"
                  icon={Receipt}
                >
                  Despesas
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/lancamentos/custos"
                  icon={Wallet}
                >
                  Custos
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/lancamentos/investimentos"
                  icon={TrendingUp}
                >
                  Investimentos
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* CONSULTAS */}
            <AccordionItem value="consultas">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Search className="h-4 w-4 shrink-0" />
                  {expanded && 'Consultas'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink
                  to="/comercial/dashboard/consultas/vendas"
                  icon={ShoppingCart}
                >
                  Vendas
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/consultas/despesas"
                  icon={Receipt}
                >
                  Despesas
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/consultas/custos"
                  icon={Wallet}
                >
                  Custos
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/consultas/investimentos"
                  icon={TrendingUp}
                >
                  Investimentos
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/consultas/contas-do-mes"
                  icon={Wallet}
                >
                  Contas do Mês
                </NavLink>

                <NavLink
                  to="/comercial/dashboard/consultas/fluxo-de-caixa"
                  icon={TrendingUp}
                >
                  Fluxo de Caixa
                </NavLink>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </ul>
      </nav>

      {/* RODAPÉ */}
      <div className="shrink-0 space-y-1 border-t border-border p-2">

        <Link
          to="/modules"
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-comercial)/.08)] hover:text-foreground"
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          {expanded && 'Módulos'}
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {expanded && 'Sair'}
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;
