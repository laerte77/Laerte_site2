import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Store,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Users,
  Truck,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  Receipt,
  Wallet,
  TrendingUp,
  Boxes,
  Search,
  PlusCircle
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

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
        'flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'border-[hsl(var(--neon-comercial)/.40)] bg-[hsl(var(--neon-comercial)/.12)] shadow-[inset_3px_0_0_hsl(var(--neon-comercial))]'
          : 'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-comercial)/.20)] hover:bg-[hsl(var(--neon-comercial)/.07)] hover:text-white'
      )}
      style={active ? { color: GREEN } : undefined}
    >
      {Icon && (
        <Icon
          className="h-4 w-4 shrink-0"
          style={active ? { color: GREEN } : undefined}
        />
      )}

      <span className="truncate">{children}</span>
    </Link>
  );
};

const Sidebar = ({ isOpen, setOpen, isMobile }) => {
  const { signOut } = useAuth();

  const expanded = isOpen || isMobile;

  const trigger = `
    flex min-h-10 w-full items-center rounded-lg px-3 py-2
    text-sm font-medium text-muted-foreground
    transition-all duration-200
    hover:bg-[hsl(var(--neon-comercial)/.08)]
    hover:text-[hsl(var(--neon-comercial))]
    [&[data-state=open]]:bg-[hsl(var(--neon-comercial)/.08)]
    [&[data-state=open]]:text-[hsl(var(--neon-comercial))]
  `;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[hsl(var(--neon-comercial)/.20)] bg-[#10151b] transition-[width,transform] duration-300',
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
      <div className="flex h-16 shrink-0 items-center border-b border-[hsl(var(--neon-comercial)/.15)] px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${GREEN}, #65a30d)`,
              boxShadow: '0 0 14px hsl(var(--neon-comercial)/.35)'
            }}
          >
            <Store className="h-4 w-4 text-black" />
          </div>

          {expanded && (
            <div className="leading-tight">
              <div className="text-sm font-bold uppercase tracking-wide text-white">
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
            className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-comercial)/.10)]"
            style={{ color: GREEN }}
            aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
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
            <NavLink
              to="/comercial/dashboard"
              icon={Home}
            >
              {expanded && 'Dashboard'}
            </NavLink>
          </li>

          {/* MENU ÚNICO: SOMENTE UM GRUPO ABERTO */}
          <Accordion
            type="single"
            collapsible
            className="w-full"
          >

            {/* CADASTROS */}
            <AccordionItem value="cadastros" className="border-b-0">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  {expanded && 'Cadastros'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-[hsl(var(--neon-comercial)/.25)] pl-3">
                <NavLink to="/comercial/dashboard/cadastros/clientes" icon={Users}>
                  Clientes
                </NavLink>

                <NavLink to="/comercial/dashboard/cadastros/fornecedores" icon={Truck}>
                  Fornecedores
                </NavLink>

                <NavLink to="/comercial/dashboard/cadastros/produtos" icon={Package}>
                  Produtos
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* ESTOQUE */}
            <AccordionItem value="estoque" className="border-b-0">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Boxes className="h-4 w-4 shrink-0" />
                  {expanded && 'Estoque'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-[hsl(var(--neon-comercial)/.25)] pl-3">
                <NavLink to="/comercial/dashboard/estoque/movimentacoes" icon={ArrowLeftRight}>
                  Movimentações
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* LANÇAMENTOS */}
            <AccordionItem value="lancamentos" className="border-b-0">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 shrink-0" />
                  {expanded && 'Lançamentos'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-[hsl(var(--neon-comercial)/.25)] pl-3">
                <NavLink to="/comercial/dashboard/lancamentos/vendas" icon={ShoppingCart}>
                  Vendas
                </NavLink>

                <NavLink to="/comercial/dashboard/lancamentos/despesas" icon={Receipt}>
                  Despesas
                </NavLink>

                <NavLink to="/comercial/dashboard/lancamentos/custos" icon={Wallet}>
                  Custos
                </NavLink>

                <NavLink to="/comercial/dashboard/lancamentos/investimentos" icon={TrendingUp}>
                  Investimentos
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* CONSULTAS */}
            <AccordionItem value="consultas" className="border-b-0">
              <AccordionTrigger className={trigger}>
                <span className="flex items-center gap-3">
                  <Search className="h-4 w-4 shrink-0" />
                  {expanded && 'Consultas'}
                </span>
              </AccordionTrigger>

              <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-[hsl(var(--neon-comercial)/.25)] pl-3">
                <NavLink to="/comercial/dashboard/consultas/vendas" icon={ShoppingCart}>
                  Vendas
                </NavLink>

                <NavLink to="/comercial/dashboard/consultas/despesas" icon={Receipt}>
                  Despesas
                </NavLink>

                <NavLink to="/comercial/dashboard/consultas/custos" icon={Wallet}>
                  Custos
                </NavLink>

                <NavLink to="/comercial/dashboard/consultas/investimentos" icon={TrendingUp}>
                  Investimentos
                </NavLink>

                <NavLink to="/comercial/dashboard/consultas/contas-do-mes" icon={Wallet}>
                  Contas do Mês
                </NavLink>

                <NavLink to="/comercial/dashboard/consultas/fluxo-de-caixa" icon={TrendingUp}>
                  Fluxo de Caixa
                </NavLink>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </ul>
      </nav>

      {/* RODAPÉ */}
      <div className="shrink-0 space-y-1 border-t border-[hsl(var(--neon-comercial)/.15)] p-2">

        <Link
          to="/modules"
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-comercial)/.08)] hover:text-[hsl(var(--neon-comercial))]"
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          {expanded && 'Módulos'}
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {expanded && 'Sair'}
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;

