import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  DollarSign,
  BookOpen,
  Landmark,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  ArrowLeftRight,
  TrendingUp,
  PieChart
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

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-all',
        'hover:bg-blue-500/5 hover:text-blue-400',
        isActive &&
          'border border-blue-500/70 bg-blue-500/10 text-blue-400'
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
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        isMobile
          ? isOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full'
          : isOpen
            ? 'w-64'
            : 'w-20'
      )}
    >
      {/* Cabeçalho */}
      <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2 font-semibold text-primary transition-opacity',
            !(isOpen || isMobile) &&
              'pointer-events-none opacity-0'
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <DollarSign className="h-4 w-4" />
          </div>

          <span className="text-sm font-bold uppercase">
            PESSOAL
          </span>
        </Link>

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
        <ul className="space-y-1">

          {/* Menu principais */}
          <li>
            <NavLink to="/pessoal/dashboard" icon={Home}>
              {(isOpen || isMobile) && 'Dashboard'}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/pessoal/dashboard/alertas"
              icon={DollarSign}
            >
              {(isOpen || isMobile) && 'Alertas Inteligentes'}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/pessoal/dashboard/contas-mes"
              icon={BookOpen}
            >
              {(isOpen || isMobile) && 'Contas do Mês'}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/pessoal/dashboard/planejamento"
              icon={Landmark}
            >
              {(isOpen || isMobile) && 'Planejamento Financeiro'}
            </NavLink>
          </li>

          {/* Grupos */}
          <Accordion
            type="multiple"
            className="w-full"
            defaultValue={['cadastros']}
          >

            {/* CADASTROS */}
            <AccordionItem
              value="cadastros"
              className="border-b-0"
            >
              <AccordionTrigger
                className="
                  rounded-md px-3 py-2
                  hover:bg-accent
                  hover:no-underline
                  [&[data-state=open]>div>svg]:rotate-180
                "
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 shrink-0" />

                  {(isOpen || isMobile) && (
                    <span>Cadastros</span>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="mt-1 space-y-0.5 pl-7">
                <NavLink to="/pessoal/dashboard/cadastros/tipos-receita">
                  Tipos de Receita
                </NavLink>

                <NavLink to="/pessoal/dashboard/cadastros/tipos-despesa">
                  Tipos de Despesa
                </NavLink>

                <NavLink to="/pessoal/dashboard/cadastros/cartoes-credito">
                  Cartões de Crédito
                </NavLink>

                <NavLink to="/pessoal/dashboard/cadastros/cartao-usuarios">
                  Pessoas do Cartão
                </NavLink>

                <NavLink to="/pessoal/dashboard/cadastros/livros">
                  Livros
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* LANÇAMENTOS */}
            <AccordionItem
              value="lancamentos"
              className="border-b-0"
            >
              <AccordionTrigger
                className="
                  rounded-md px-3 py-2
                  hover:bg-accent
                  hover:no-underline
                  [&[data-state=open]>div>svg]:rotate-180
                "
              >
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="h-4 w-4 shrink-0" />

                  {(isOpen || isMobile) && (
                    <span>Lançamentos</span>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="mt-1 space-y-0.5 pl-7">
                <NavLink to="/pessoal/dashboard/lancamentos/receitas">
                  Receitas
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/despesas">
                  Despesas
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/despesa-prevista">
                  Despesa Prevista
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/dividas-previstas-mes-a-mes">
                  Dívidas Mês a Mês
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/faturas">
                  Faturas do Cartão
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/cartao-lancamentos">
                  Lanç. do Cartão
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/devedores">
                  Devedores
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/dizimos-e-ofertas">
                  Dízimos e Ofertas
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/metas">
                  Metas
                </NavLink>

                <NavLink to="/pessoal/dashboard/lancamentos/leitura">
                  Leitura
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* INVESTIMENTOS */}
            <AccordionItem
              value="investimentos"
              className="border-b-0"
            >
              <AccordionTrigger
                className="
                  rounded-md px-3 py-2
                  hover:bg-accent
                  hover:no-underline
                  [&[data-state=open]>div>svg]:rotate-180
                "
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 shrink-0" />

                  {(isOpen || isMobile) && (
                    <span>Investimentos</span>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="mt-1 space-y-0.5 pl-7">
                <NavLink to="/pessoal/dashboard/investimentos/aportes">
                  Aportes
                </NavLink>

                <NavLink to="/pessoal/dashboard/investimentos/rendimentos">
                  Rendimentos
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* RELATÓRIOS */}
            <AccordionItem
              value="relatorios"
              className="border-b-0"
            >
              <AccordionTrigger
                className="
                  rounded-md px-3 py-2
                  hover:bg-accent
                  hover:no-underline
                  [&[data-state=open]>div>svg]:rotate-180
                "
              >
                <div className="flex items-center gap-3">
                  <PieChart className="h-4 w-4 shrink-0" />

                  {(isOpen || isMobile) && (
                    <span>Relatórios</span>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="mt-1 space-y-0.5 pl-7">
                <NavLink to="/pessoal/dashboard/relatorios/receitas">
                  Receitas
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/despesas">
                  Despesas
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/despesas-previstas">
                  Despesas Previstas
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/cartoes">
                  Cartões de Crédito
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/cartoes-pessoas">
                  Cartões por Pessoa
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/devedores">
                  Devedores
                </NavLink>

                <NavLink to="/pessoal/dashboard/relatorios/leitura">
                  Leitura
                </NavLink>
              </AccordionContent>
            </AccordionItem>

            {/* ADMINISTRAÇÃO */}
            {isAdmin && (
              <AccordionItem
                value="admin"
                className="border-b-0"
              >
                <AccordionTrigger
                  className="
                    rounded-md px-3 py-2
                    hover:bg-accent
                    hover:no-underline
                    [&[data-state=open]>div>svg]:rotate-180
                  "
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 shrink-0" />

                    {(isOpen || isMobile) && (
                      <span>Administração</span>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="mt-1 space-y-0.5 pl-7">
                  <NavLink to="/pessoal/dashboard/admin/gerenciar-usuarios">
                    Gerenciar Usuários
                  </NavLink>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="shrink-0 space-y-1 border-t border-border p-2">

        <Link
          to="/"
          className="
            flex items-center gap-3 rounded-lg px-3 py-2
            text-muted-foreground
            transition-all
            hover:bg-accent
            hover:text-primary
          "
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />

          {(isOpen || isMobile) && 'Módulos'}
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="
            flex w-full items-center gap-3 rounded-lg px-3 py-2
            text-red-500
            transition-all
            hover:bg-red-500/10
          "
        >
          <LogOut className="h-4 w-4 shrink-0" />

          {(isOpen || isMobile) && 'Sair'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
