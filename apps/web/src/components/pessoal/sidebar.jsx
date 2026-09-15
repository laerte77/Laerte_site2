import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, BarChart2, DollarSign, BookOpen, Landmark, ShieldCheck, ChevronLeft, ChevronRight, LayoutGrid, LogOut } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-blue-400 hover:bg-blue-500/5',
        isActive && 'border border-blue-500 bg-blue-500/10 text-blue-400'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
};

const Sidebar = ({ isOpen, setOpen, isMobile }) => {
  const { isAdmin, signOut } = useAuth();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-transform duration-300 ease-in-out",
      isMobile ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isOpen ? 'w-64' : 'w-20')
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
          <li><NavLink to="/pessoal/dashboard/alertas">Alertas Inteligentes</NavLink></li>
          <li><NavLink to="/pessoal/dashboard/contas-mes">Contas do Mês</NavLink></li>
          <li><NavLink to="/pessoal/dashboard/planejamento">Planejamento Financeiro</NavLink></li>
          <Accordion type="multiple" className="w-full" defaultValue={['cadastros', 'lancamentos', 'investimentos', 'relatorios', 'admin']}>
            <AccordionItem value="cadastros" className="border-b-0">
              <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><Settings className="h-4 w-4" /> {(isOpen || isMobile) && 'Cadastros'}</div>
              </AccordionTrigger>
              <AccordionContent className="pl-7 space-y-1 mt-1">
                <NavLink to="/pessoal/dashboard/cadastros/tipos-receita">Tipos de Receita</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/tipos-despesa">Tipos de Despesa</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartoes-credito">Cartões de Crédito</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/cartao-usuarios">Pessoas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/cadastros/livros">Livros</NavLink>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="lancamentos" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4" /> {(isOpen || isMobile) && 'Lançamentos'}</div>
              </AccordionTrigger>
              <AccordionContent className="pl-7 space-y-1 mt-1">
                <NavLink to="/pessoal/dashboard/lancamentos/receitas">Receitas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesas">Despesas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/despesa-prevista">Despesa Prevista</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dividas-previstas-mes-a-mes">Dívidas Mês a Mês</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/faturas">Faturas do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/cartao-lancamentos">Lanç. do Cartão</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/devedores">Devedores</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/dizimos-e-ofertas">Dízimos e Ofertas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/metas">Metas</NavLink>
                <NavLink to="/pessoal/dashboard/lancamentos/leitura">Leitura</NavLink>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="investimentos" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><Landmark className="h-4 w-4" /> {(isOpen || isMobile) && 'Investimentos'}</div>
              </AccordionTrigger>
              <AccordionContent className="pl-7 space-y-1 mt-1">
                <NavLink to="/pessoal/dashboard/investimentos/aportes">Aportes</NavLink>
                <NavLink to="/pessoal/dashboard/investimentos/rendimentos">Rendimentos</NavLink>
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="relatorios" className="border-b-0">
               <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center gap-3"><BarChart2 className="h-4 w-4" /> {(isOpen || isMobile) && 'Relatórios'}</div>
              </AccordionTrigger>
              <AccordionContent className="pl-7 space-y-1 mt-1">
                <NavLink to="/pessoal/dashboard/relatorios/receitas">Receitas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/despesas">Despesas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/despesas-previstas">Despesas Previstas</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/cartoes">Cartões de Crédito</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/cartoes-pessoas">Cartões por Pessoa</NavLink> 
                <NavLink to="/pessoal/dashboard/relatorios/devedores">Devedores</NavLink>
                <NavLink to="/pessoal/dashboard/relatorios/leitura">Leitura</NavLink>
              </AccordionContent>
            </AccordionItem>
            {isAdmin && (
              <AccordionItem value="admin" className="border-b-0">
                 <AccordionTrigger className="py-2 px-3 hover:no-underline rounded-lg hover:bg-accent [&[data-state=open]>div>svg]:rotate-180">
                  <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4" /> {(isOpen || isMobile) && 'Admin'}</div>
                </AccordionTrigger>
                <AccordionContent className="pl-7 space-y-1 mt-1">
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
