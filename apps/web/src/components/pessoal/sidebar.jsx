import React from'react';
import{Link,useLocation}from'react-router-dom';
import{Home,DollarSign,BookOpen,ChevronLeft,ChevronRight,LayoutGrid,LogOut,TrendingUp,Target,List,CreditCard,Users,Receipt,Zap}from'lucide-react';
import{Accordion,AccordionContent,AccordionItem,AccordionTrigger}from'@/components/ui/accordion';
import{Button}from'@/components/ui/button';
import{cn}from'@/lib/utils';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const BLUE='hsl(var(--neon-pessoal))';

const NavLink=({to,icon:Icon,children})=>{
 const{pathname}=useLocation();
 const active=to==='/pessoal/dashboard'?pathname===to:pathname.startsWith(to);

 return(
  <Link
   to={to}
   className={cn(
    'flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
    active
     ?'border-[hsl(var(--neon-pessoal)/.45)] bg-[hsl(var(--neon-pessoal)/.10)]'
     :'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-pessoal)/.20)] hover:bg-muted hover:text-foreground'
   )}
   style={active?{color:BLUE}:undefined}
  >
   {Icon&&<Icon className="h-4 w-4 shrink-0"/>}
   <span className="truncate">{children}</span>
  </Link>
 );
};

const Sidebar=({isOpen,setOpen,isMobile})=>{
 const{isAdmin,signOut}=useAuth();

 const trigger=
  'flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-pessoal)/.08)] hover:text-foreground';

 return(
  <aside
   className={cn(
    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300',
    isMobile
     ?isOpen?'w-60 translate-x-0':'w-60 -translate-x-full'
     :isOpen?'w-60':'w-20'
   )}
  >

   <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
    <div className="flex items-center gap-2 overflow-hidden">
     <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-pessoal)/.35)]"
      style={{background:`linear-gradient(135deg,${BLUE},#2563eb)`}}
     >
      <DollarSign className="h-4 w-4 text-white"/>
     </div>

     {(isOpen||isMobile)&&(
      <div className="leading-tight">
       <div className="text-sm font-bold uppercase text-white">PESSOAL</div>
       <div
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{color:BLUE}}
       >
        FINANÇAS
       </div>
      </div>
     )}
    </div>

    {!isMobile&&(
     <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={()=>setOpen(!isOpen)}
      className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-pessoal)/.08)]"
      style={{color:BLUE}}
     >
      {isOpen?<ChevronLeft className="h-5 w-5"/>:<ChevronRight className="h-5 w-5"/>}
     </Button>
    )}
   </div>

   <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
    <ul className="space-y-1">

     <li>
      <NavLink to="/pessoal/dashboard" icon={Home}>
       {(isOpen||isMobile)&&'Dashboard'}
      </NavLink>
     </li>

     <li>
      <NavLink to="/pessoal/dashboard/alertas" icon={Zap}>
       {(isOpen||isMobile)&&'Alertas Inteligentes'}
      </NavLink>
     </li>

     <Accordion type="single" collapsible className="w-full">

      <AccordionItem value="cadastros">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📋 {(isOpen||isMobile)&&'Cadastros'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/cadastros/tipos-receita" icon={List}>Tipos de Receita</NavLink>
        <NavLink to="/pessoal/dashboard/cadastros/tipos-despesa" icon={List}>Tipos de Despesa</NavLink>
        <NavLink to="/pessoal/dashboard/cadastros/cartoes-credito" icon={CreditCard}>Cartões de Crédito</NavLink>
        <NavLink to="/pessoal/dashboard/cadastros/cartao-usuarios" icon={Users}>Pessoas do Cartão</NavLink>
        <NavLink to="/pessoal/dashboard/cadastros/livros" icon={List}>Livros</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="lancamentos">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">↔️ {(isOpen||isMobile)&&'Lançamentos'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/lancamentos/receitas" icon={DollarSign}>Receitas</NavLink>
        <NavLink to="/pessoal/dashboard/lancamentos/despesas" icon={List}>Despesas</NavLink>
        <NavLink to="/pessoal/dashboard/lancamentos/despesa-prevista" icon={Target}>Despesas Previstas</NavLink>
        <NavLink to="/pessoal/dashboard/lancamentos/cartao-lancamentos" icon={Receipt}>Lanç. do Cartão</NavLink>
        <NavLink to="/pessoal/dashboard/lancamentos/devedores" icon={List}>Devedores</NavLink>
        <NavLink to="/pessoal/dashboard/lancamentos/dizimos-e-ofertas" icon={DollarSign}>Dízimos/Ofertas</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="investimentos">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📈 {(isOpen||isMobile)&&'Investimento'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/investimentos/aportes" icon={DollarSign}>Aportes</NavLink>
        <NavLink to="/pessoal/dashboard/investimentos/rendimentos" icon={TrendingUp}>Rendimentos</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="leitura">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📖 {(isOpen||isMobile)&&'Leitura Bíblica'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/leitura" icon={BookOpen}>Registrar Leitura</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="planejamento">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">🎯 {(isOpen||isMobile)&&'Planejamento'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/planejamento" icon={Target}>Planejamento Financeiro</NavLink>
        <NavLink to="/pessoal/dashboard/planejamento/metas" icon={Target}>Metas</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="consultas">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">🔎 {(isOpen||isMobile)&&'Consultas'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/pessoal/dashboard/consultas/contas-mes" icon={Receipt}>Contas do Mês</NavLink>
        <NavLink to="/pessoal/dashboard/consultas/faturas" icon={CreditCard}>Faturas do Cartão</NavLink>
        <NavLink to="/pessoal/dashboard/consultas/dividas-previstas-mes-a-mes" icon={List}>Dívidas Previstas Mês a Mês</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="relatorios">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📊 {(isOpen||isMobile)&&'Relatórios'}</span>
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

      {isAdmin&&(
       <AccordionItem value="admin">
        <AccordionTrigger className={trigger}>
         <span className="flex items-center gap-3">🛡️ {(isOpen||isMobile)&&'Administração'}</span>
        </AccordionTrigger>
        <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
         <NavLink to="/pessoal/dashboard/admin/gerenciar-usuarios">
          Gerenciar Usuários
         </NavLink>
        </AccordionContent>
       </AccordionItem>
      )}

     </Accordion>
    </ul>
   </nav>

   <div className="shrink-0 space-y-1 border-t border-border p-2">
    <Link
     to="/"
     className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-pessoal)/.08)] hover:text-foreground"
    >
     <LayoutGrid className="h-4 w-4 shrink-0"/>
     {(isOpen||isMobile)&&'Módulos'}
    </Link>

    <button
     type="button"
     onClick={signOut}
     className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
    >
     <LogOut className="h-4 w-4 shrink-0"/>
     {(isOpen||isMobile)&&'Sair'}
    </button>
   </div>
  </aside>
 );
};

export default Sidebar;
