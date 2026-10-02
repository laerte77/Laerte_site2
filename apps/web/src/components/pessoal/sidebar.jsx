import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, DollarSign, BookOpen, ShieldCheck, ChevronLeft, ChevronRight,
  LayoutGrid, LogOut, ArrowLeftRight, TrendingUp, PieChart, Zap,
  Target, List, CreditCard, Users, Receipt, Search
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const active = to === '/pessoal/dashboard'
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-blue-500/5 hover:text-blue-400',
        active && 'border border-blue-500 bg-blue-500/10 text-blue-400'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </Link>
  );
};

const Sidebar = ({ isOpen, setOpen, isMobile }) => {
  const { isAdmin, signOut } = useAuth();

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300',
      isMobile
        ? isOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60'
        : isOpen ? 'w-60' : 'w-20'
    )}>

      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link to="/" className={cn(
          'flex items-center gap-2 font-semibold text-primary',
          !(isOpen || isMobile) && 'pointer-events-none opacity-0'
        )}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <DollarSign className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold uppercase">PESSOAL</span>
        </Link>

        {!isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!isOpen)}
          >
            {isOpen ? <ChevronLeft /> : <ChevronRight />}
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-auto px-2 py-4">
        <ul className="space-y-1">

          <li>
            <NavLink to="/pessoal/dashboard" icon={Home}>
              {(isOpen || isMobile) && 'Dashboard'}
            </NavLink>
          </li>

          <li>
            <NavLink to="/pessoal/dashboard/alertas" icon={Zap}>
              Alertas Inteligentes
            </NavLink>
          </li>

          <Accordion type="single" collapsible className="w-full">

            <AccordionItem value="cadastros" className="border-b-0">
              <AccordionTrigger><span>📋 Cadastros</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/cadastros/tipos-receita" icon={List}>Tipos de Receita</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/tipos-despesa" icon={List}>Tipos de Despesa</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartoes-credito" icon={CreditCard}>Cartões de Crédito</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartao-usuarios" icon={Users}>Pessoas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/livros" icon={List}>Livros</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lancamentos" className="border-b-0">
              <AccordionTrigger><span>↔️ Lançamentos</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/lancamentos/receitas" icon={DollarSign}>Receitas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesas" icon={List}>Despesas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesa-prevista" icon={Target}>Despesas Previstas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/faturas" icon={CreditCard}>Faturas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/cartao-lancamentos" icon={Receipt}>Lanç. do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/devedores" icon={List}>Devedores</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dizimos-e-ofertas" icon={DollarSign}>Dízimos/Ofertas</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="investimentos" className="border-b-0">
              <AccordionTrigger><span>📈 Investimento</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/investimentos/aportes" icon={DollarSign}>Aportes</NavLink>
                <NavLink to="/pessoal/dashboard/investimentos/rendimentos" icon={TrendingUp}>Rendimentos</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leitura" className="border-b-0">
              <AccordionTrigger><span>📖 Leitura Bíblica</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/lancamentos/leitura" icon={BookOpen}>Lançamentos</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="planejamento" className="border-b-0">
              <AccordionTrigger><span>🎯 Planejamento</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/planejamento" icon={Target}>Planejamento Financeiro</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/metas" icon={Target}>Metas</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="consultas" className="border-b-0">
              <AccordionTrigger><span>🔎 Consultas</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/contas-mes" icon={Receipt}>Contas do Mês</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dividas-previstas-mes-a-mes" icon={List}>Dívidas Mês a Mês</NavLink>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="relatorios" className="border-b-0">
              <AccordionTrigger><span>📊 Relatórios</span></AccordionTrigger>
              <AccordionContent>
                <NavLink to="/pessoal/dashboard/relatorios/receitas" icon={DollarSign}>Receitas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/despesas" icon={List}>Despesas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/despesas-previstas" icon={Target}>Despesas Previstas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/cartoes" icon={CreditCard}>Cartões de Crédito</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/cartoes-pessoas" icon={Users}>Cartões por Pessoa</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/devedores" icon={List}>Devedores</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/leitura" icon={BookOpen}>Leitura</NavLink>
              </AccordionContent>
            </AccordionItem>

            {isAdmin && (
              <AccordionItem value="admin" className="border-b-0">
                <AccordionTrigger><span>🛡️ Administração</span></AccordionTrigger>
                <AccordionContent>
                  <NavLink to="/pessoal/dashboard/admin/gerenciar-usuarios">
                    Gerenciar Usuários
                  </NavLink>
                </AccordionContent>
              </AccordionItem>
            )}

          </Accordion>
        </ul>
      </nav>

      <div className="space-y-1 border-t p-2">
        <Link to="/" className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent">
          <LayoutGrid className="h-4 w-4" />
          {(isOpen || isMobile) && 'Módulos'}
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-red-500 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          {(isOpen || isMobile) && 'Sair'}
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
