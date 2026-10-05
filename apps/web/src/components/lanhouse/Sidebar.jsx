import React from'react';
import{Link,useLocation}from'react-router-dom';
import{MonitorPlay,List,ClipboardList,Home,BarChart3,ChevronLeft,ChevronRight,DollarSign,ArrowLeftRight,LogOut,LayoutGrid,Calculator,ShoppingCart,PackageSearch,CheckSquare,PlusCircle}from'lucide-react';
import{Accordion,AccordionContent,AccordionItem,AccordionTrigger}from'@/components/ui/accordion';
import{Button}from'@/components/ui/button';
import{cn}from'@/lib/utils';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(var(--neon-lanhouse))';

const NavLink=({to,icon:Icon,children})=>{
 const{pathname}=useLocation();
 const active=to==='/lm-impressoes/dashboard'?pathname===to:pathname.startsWith(to);

 return(
  <Link
   to={to}
   className={cn(
    'flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
    active
     ?'border-[hsl(var(--neon-lanhouse)/.45)] bg-[hsl(var(--neon-lanhouse)/.10)]'
     :'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-lanhouse)/.20)] hover:bg-muted hover:text-foreground'
   )}
   style={active?{color:CYAN}:undefined}
  >
   {Icon&&<Icon className="h-4 w-4 shrink-0"/>}
   <span className="truncate">{children}</span>
  </Link>
 );
};

export default function Sidebar({isOpen,setOpen,isMobile}){
 const{signOut}=useAuth();

 const trigger=
  'flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground';

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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-lanhouse)/.35)]"
      style={{background:`linear-gradient(135deg,${CYAN},#0891b2)`}}
     >
      <MonitorPlay className="h-4 w-4 text-white"/>
     </div>

     {(isOpen||isMobile)&&(
      <div className="leading-tight">
       <div className="text-sm font-bold uppercase text-white">LM</div>
       <div
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{color:CYAN}}
       >
        IMPRESSÕES
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
      className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-lanhouse)/.08)]"
      style={{color:CYAN}}
     >
      {isOpen?<ChevronLeft className="h-5 w-5"/>:<ChevronRight className="h-5 w-5"/>}
     </Button>
    )}
   </div>

   <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
    <ul className="space-y-1">

     <li>
      <NavLink to="/lm-impressoes/dashboard" icon={Home}>
       {(isOpen||isMobile)&&'Dashboard'}
      </NavLink>
     </li>

     <Accordion type="single" collapsible className="w-full">

      <AccordionItem value="cadastros">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📋 {(isOpen||isMobile)&&'Cadastros'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/cadastros/clientes" icon={List}>Clientes</NavLink>
        <NavLink to="/lm-impressoes/dashboard/cadastros/servicos" icon={List}>Serviços</NavLink>
        <NavLink to="/lm-impressoes/dashboard/cadastros/despesas" icon={List}>Despesas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/cadastros/tipos-folha" icon={List}>Tipos de Folha</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="lancamentos">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">↔️ {(isOpen||isMobile)&&'Lançamentos'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/lancamentos/servicos" icon={List}>Serviços</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas" icon={List}>Despesas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/folhas" icon={List}>Folhas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas-previstas" icon={CheckSquare}>Despesas Previstas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/clientes-debito" icon={List}>Clientes Débito</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/dizimos-ofertas" icon={DollarSign}>Dízimos/Ofertas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/lancamentos/metas" icon={CheckSquare}>Metas</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="custos">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📉 {(isOpen||isMobile)&&'Custos & Lucros'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/custos/lancamentos" icon={List}>Lançar Custos</NavLink>
        <NavLink to="/lm-impressoes/dashboard/custos/controle" icon={BarChart3}>Controle de Custos</NavLink>
        <NavLink to="/lm-impressoes/dashboard/custos/relatorio-custos" icon={BarChart3}>Relatório Categorias</NavLink>
        <NavLink to="/lm-impressoes/dashboard/custos/relatorio-lucro" icon={DollarSign}>Lucro Mensal</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="pedidos">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">🛒 {(isOpen||isMobile)&&'Pedidos'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/pedidos/cadastro" icon={PlusCircle}>Realizar Pedido</NavLink>
        <NavLink to="/lm-impressoes/dashboard/pedidos/consulta" icon={List}>Consultar Pedidos</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="estoques">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📦 {(isOpen||isMobile)&&'Estoques'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/estoques/inicial" icon={List}>Estoque Inicial</NavLink>
        <NavLink to="/lm-impressoes/dashboard/estoques" icon={List}>Estoque Consolidado</NavLink>
       </AccordionContent>
      </AccordionItem>

      <AccordionItem value="relatorios">
       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">📊 {(isOpen||isMobile)&&'Relatórios'}</span>
       </AccordionTrigger>
       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
        <NavLink to="/lm-impressoes/dashboard/relatorios/servicos" icon={List}>Serviços</NavLink>
        <NavLink to="/lm-impressoes/dashboard/relatorios/despesas" icon={List}>Despesas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/relatorios/despesas-previstas" icon={CheckSquare}>Despesas Previstas</NavLink>
        <NavLink to="/lm-impressoes/dashboard/relatorios/clientes-debito" icon={List}>Clientes Débito</NavLink>
       </AccordionContent>
      </AccordionItem>

     </Accordion>
    </ul>
   </nav>

   <div className="shrink-0 space-y-1 border-t border-border p-2">

    <Link
     to="/modules"
     className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground"
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
}
