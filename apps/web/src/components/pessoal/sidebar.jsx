import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, DollarSign, BookOpen, Landmark, ShieldCheck, ChevronLeft, ChevronRight, LayoutGrid, LogOut, ArrowLeftRight, TrendingUp, PieChart, Zap, CheckSquare, Target, List, CreditCard, Users, Receipt } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = to === '/pessoal/dashboard' ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all hover:text-blue-400 hover:bg-blue-500/5',
        isActive && 'border border-blue-500 bg-blue-500/10 text-blue-400'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
};

const Sidebar = ({ isOpen, setOpen, isMobile }) => {
  const { isAdmin, signOut } = useAuth();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-transform duration-300 ease-in-out",
     isMobile ? (isOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60') : (isOpen ? 'w-60' : 'w-20')
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b shrink-0">
        <Link to="/" className={cn("flex items-center gap-2 font-semibold text-primary transition-opacity", !(isOpen || isMobile) && "opacity-0 pointer-events-none")}>
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-blue-600 text-white">
        <DollarSign className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold uppercase">PESSOAL</span>
        </Link>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpen(!isOpen)}>
            {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        )}
      </div>
      <nav className="flex-1 overflow-auto py-4 px-2 text-sm font-medium">
        <ul className="space-y-1">
          <li><NavLink to="/pessoal/dashboard" icon={Home}>{(isOpen || isMobile) ? 'Dashboard' : ''}</NavLink></li>
          <li><NavLink to="/pessoal/dashboard/alertas" icon={Zap}>Alertas Inteligentes</NavLink></li>
          <li><NavLink to="/pessoal/dashboard/contas-mes" icon={CheckSquare}>Contas do Mês</NavLink></li>
          <li><NavLink to="/pessoal/dashboard/planejamento" icon={Target}>Planejamento Financeiro</NavLink></li>
          <Accordion type="multiple" className="w-full" defaultValue={['cadastros']}>
            <AccordionItem value="cadastros" className="border-b-0">
              <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><BookOpen className="h-4 w-4" /> {(isOpen || isMobile) && 'Cadastros'}</div>
              </AccordionTrigger>
              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink to="/pessoal/dashboard/cadastros/tipos-receita" icon={List}>Tipos de Receita</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/tipos-despesa" icon={List}>Tipos de Despesa</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartoes-credito" icon={CreditCard}>Cartões de Crédito</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartao-usuarios" icon={Users}>Pessoas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/livros" icon={List}>Livros</NavLink>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="lancamentos" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><ArrowLeftRight className="h-4 w-4" /> {(isOpen || isMobile) && 'Lançamentos'}</div>
              </AccordionTrigger>
              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink to="/pessoal/dashboard/lancamentos/receitas" icon={DollarSign}>Receitas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesas" icon={List}>Despesas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesa-prevista" icon={Target}>Despesas Previstas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/faturas" icon={CreditCard}>Faturas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/cartao-lancamentos" icon={Receipt}>Lanç. do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dividas-previstas-mes-a-mes" icon={List}>Dívidas Mês a Mês</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/metas" icon={Target}>Metas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/leitura" icon={BookOpen}>Leitura Bíblica</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/devedores" icon={List}>Devedores</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dizimos-e-ofertas" icon={DollarSign}>Dízimos/Ofertas</NavLink>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="investimentos" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><TrendingUp className="h-4 w-4" /> {(isOpen || isMobile) && 'Investimentos'}</div>
              </AccordionTrigger>
              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                <NavLink to="/pessoal/dashboard/investimentos/aportes" icon={DollarSign}>Aportes</NavLink>
                <NavLink to="/pessoal/dashboard/investimentos/rendimentos" icon={TrendingUp}>Rendimentos</NavLink>
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="relatorios" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><PieChart className="h-4 w-4" /> {(isOpen || isMobile) && 'Relatórios'}</div>
              </AccordionTrigger>
              <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
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
                 <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                  <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4" /> {(isOpen || isMobile) && 'Administração'}</div>
                </AccordionTrigger>
                <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                  <NavLink to="/pessoal/dashboard/admin/gerenciar-usuarios">Gerenciar Usuários</NavLink>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ul>
      </nav>

<div className="border-t border-border p-2 space-y-1 shrink-0">
  <Link
    to="/"
    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent"
  >
    <LayoutGrid className="h-4 w-4" />
    {(isOpen || isMobile) && 'Módulos'}
  </Link>

  <button
    type="button"
    onClick={signOut}
    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-red-500 transition-all hover:bg-red-500/10"
  >
    <LogOut className="h-4 w-4" />
    {(isOpen || isMobile) && 'Sair'}
  </button>
</div>

</aside>
  );
};

export default Sidebar;
