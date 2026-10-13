import React from 'react';
import { Link, NavLink as RouterNavLink } from 'react-router-dom';
import {
  MonitorPlay, Home, List, BarChart3, DollarSign, LogOut,
  LayoutGrid, CheckSquare, PlusCircle, PackageSearch,
  ClipboardList, CalendarDays, Users, Printer, Wallet,
  ShoppingCart, Boxes, Target, Search, FileBarChart, Package
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const C = 'hsl(var(--neon-lanhouse))';

const NavLink = ({ to, icon: Icon, children }) => (
  <RouterNavLink
    to={to}
    end={to === '/lm-impressoes/dashboard'}
    className={({ isActive }) => cn(
      'flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'border-[hsl(var(--neon-lanhouse)/.45)] bg-[hsl(var(--neon-lanhouse)/.10)]'
        : 'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-lanhouse)/.20)] hover:bg-muted hover:text-foreground'
    )}
    style={({ isActive }) => isActive ? { color: C } : undefined}
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    <span className="truncate">{children}</span>
  </RouterNavLink>
);

export default function Sidebar({ isOpen, setOpen, isMobile }) {
  const { signOut } = useAuth();
  const expanded = isOpen || isMobile;
  const trigger = 'flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground';
  const content = 'ml-4 mt-1 space-y-0.5 border-l border-border pl-3';

  const Group = ({ value, icon: Icon, title, children }) => (
    <AccordionItem value={value}>
      <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {expanded && title}
        </span>
      </AccordionTrigger>
      <AccordionContent className={content}>
        {children}
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300',
      isMobile
        ? isOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full'
        : isOpen ? 'w-60' : 'w-20'
    )}>
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-lanhouse)/.35)]"
            style={{ background: `linear-gradient(135deg,${C},#0891b2)` }}
          >
            <MonitorPlay className="h-4 w-4 text-white" />
          </div>
          {expanded && (
            <div className="leading-tight">
              <div className="text-sm font-bold uppercase text-white">LM</div>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C }}>
                IMPRESSÕES
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
            className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-lanhouse)/.08)]"
            style={{ color: C }}
            aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            <span className="text-lg">{isOpen ? '‹' : '›'}</span>
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
        <ul className="space-y-1">
          <li>
            <NavLink to="/lm-impressoes/dashboard" icon={Home}>
              {expanded && 'Dashboard'}
            </NavLink>
          </li>

          <Accordion type="multiple" className="w-full">
            <Group value="cadastros" icon={List} title="Cadastros">
              <NavLink to="/lm-impressoes/dashboard/cadastros/clientes" icon={Users}>Clientes</NavLink>
              <NavLink to="/lm-impressoes/dashboard/cadastros/servicos" icon={Printer}>Serviços</NavLink>
              <NavLink to="/lm-impressoes/dashboard/cadastros/despesas" icon={Wallet}>Despesas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/cadastros/tipos-folha" icon={List}>Tipos de Folha</NavLink>
              <NavLink to="/lm-impressoes/dashboard/cadastros/insumos" icon={Package}>Insumos</NavLink>
            </Group>

            <Group value="lancamentos" icon={FileBarChart} title="Lançamentos">
              <NavLink to="/lm-impressoes/dashboard/lancamentos/servicos" icon={Printer}>Serviços</NavLink>
              <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas" icon={Wallet}>Despesas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/lancamentos/folhas" icon={List}>Folhas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas-previstas" icon={CalendarDays}>Despesas Previstas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/lancamentos/clientes-debito" icon={DollarSign}>Clientes Débito</NavLink>
              <NavLink to="/lm-impressoes/dashboard/lancamentos/dizimos-ofertas" icon={DollarSign}>Dízimos/Ofertas</NavLink>
            </Group>

            <Group value="planejamento" icon={Target} title="Planejamento">
              <NavLink to="/lm-impressoes/dashboard/lancamentos/metas" icon={CheckSquare}>Metas</NavLink>
            </Group>

            <Group value="custos" icon={BarChart3} title="Custos">
              <NavLink to="/lm-impressoes/dashboard/custos/lancamentos" icon={PlusCircle}>Lançar Custos</NavLink>
              <NavLink to="/lm-impressoes/dashboard/custos/controle" icon={Search}>Controle de Custos</NavLink>
              <NavLink to="/lm-impressoes/dashboard/custos/relatorio-custos" icon={BarChart3}>Custos por Tipo</NavLink>
              <NavLink to="/lm-impressoes/dashboard/custos/relatorio-lucro" icon={DollarSign}>Lucro Mensal</NavLink>
            </Group>

            <Group value="pedidos" icon={ShoppingCart} title="Pedidos">
              <NavLink to="/lm-impressoes/dashboard/pedidos/cadastro" icon={PlusCircle}>Realizar Pedido</NavLink>
              <NavLink to="/lm-impressoes/dashboard/pedidos/consulta" icon={ClipboardList}>Consultar Pedidos</NavLink>
            </Group>

            <Group value="estoque" icon={Boxes} title="Estoque">
              <NavLink to="/lm-impressoes/dashboard/estoques/inicial" icon={PackageSearch}>Estoque Inicial</NavLink>
              <NavLink to="/lm-impressoes/dashboard/estoques" icon={Boxes}>Estoque Consolidado</NavLink>
              <NavLink to="/lm-impressoes/dashboard/estoques/controle" icon={PackageSearch}>Controle de Estoque</NavLink>
            </Group>

            <Group value="consultas" icon={Search} title="Consultas">
              <NavLink to="/lm-impressoes/dashboard/despesas-previstas-mes" icon={CalendarDays}>Contas do Mês</NavLink>
            </Group>

            <Group value="relatorios" icon={BarChart3} title="Relatórios">
              <NavLink to="/lm-impressoes/dashboard/relatorios/servicos" icon={Printer}>Serviços</NavLink>
              <NavLink to="/lm-impressoes/dashboard/relatorios/despesas" icon={Wallet}>Despesas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/relatorios/despesas-previstas" icon={CalendarDays}>Despesas Previstas</NavLink>
              <NavLink to="/lm-impressoes/dashboard/relatorios/clientes-debito" icon={DollarSign}>Clientes Débito</NavLink>
            </Group>
          </Accordion>
        </ul>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border p-2">
        <Link
          to="/modules"
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground"
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
}
