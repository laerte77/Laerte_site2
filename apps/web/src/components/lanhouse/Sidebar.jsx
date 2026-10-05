import React from'react';
import{Link,useLocation}from'react-router-dom';
import{Home,ChevronLeft,ChevronRight,LayoutGrid,LogOut,List,PlusCircle,ArrowLeftRight,Calculator,ShoppingCart,PackageSearch,BarChart3,CheckSquare,DollarSign,Users,Receipt,Target,Wallet}from'lucide-react';
import{Accordion,AccordionContent,AccordionItem,AccordionTrigger}from'@/components/ui/accordion';
import{Button}from'@/components/ui/button';
import{cn}from'@/lib/utils';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(var(--neon-lanhouse))';

const Nav=({to,icon:Icon,children,end=false})=>{
 const{pathname}=useLocation();
 const active=end?pathname===to:pathname.startsWith(to);
 return <Link to={to} className={cn('flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',active?'border-[hsl(var(--neon-lanhouse)/.45)] bg-[hsl(var(--neon-lanhouse)/.10)]':'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-lanhouse)/.20)] hover:bg-muted hover:text-foreground')} style={active?{color:CYAN}:undefined}>{Icon&&<Icon className="h-4 w-4 shrink-0"/>}<span className="truncate">{children}</span></Link>
};

const Group=({value,label,icon:Icon,isOpen,isMobile,children})=>{
 const trigger='flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground';
 return <AccordionItem value={value}>
  <AccordionTrigger className={cn(trigger,!isOpen&&!isMobile&&'justify-center')}>
   <span className="flex items-center gap-3">{Icon&&<Icon className="h-4 w-4 shrink-0"/>}{(isOpen||isMobile)&&label}</span>
  </AccordionTrigger>
  <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">{children}</AccordionContent>
 </AccordionItem>
};

export default function Sidebar({isOpen,setOpen,isMobile}){
 const{signOut}=useAuth();
 const show=isOpen||isMobile;

 return <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300',isMobile?(isOpen?'w-60 translate-x-0':'w-60 -translate-x-full'):(isOpen?'w-60':'w-20'))}>

  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex min-w-0 items-center gap-2">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-lanhouse)/.35)]" style={{background:`linear-gradient(135deg,${CYAN},#0e7490)`}}>
     <BarChart3 className="h-4 w-4 text-white"/>
    </div>
    {show&&<div className="leading-tight"><div className="text-sm font-bold uppercase text-white">LM</div><div className="text-[11px] font-bold uppercase tracking-widest" style={{color:CYAN}}>IMPRESSÕES</div></div>}
   </div>

   {!isMobile&&<Button variant="ghost" size="icon" onClick={()=>setOpen(!isOpen)} className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-lanhouse)/.08)]" style={{color:CYAN}}>
    {isOpen?<ChevronLeft className="h-5 w-5"/>:<ChevronRight className="h-5 w-5"/>}
   </Button>}
  </div>

  <nav className="flex-1 overflow-auto px-2 py-4">
   <ul className="space-y-1">
    <li><Nav to="/lm-impressoes/dashboard" icon={Home} end>{show&&'Dashboard'}</Nav></li>

    <Accordion type="single" collapsible className="w-full">

     <Group value="cadastros" label="Cadastros" icon={PlusCircle} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/cadastros/clientes" icon={Users}>Clientes</Nav>
      <Nav to="/lm-impressoes/dashboard/cadastros/servicos" icon={List}>Serviços</Nav>
      <Nav to="/lm-impressoes/dashboard/cadastros/despesas" icon={List}>Despesas</Nav>
      <Nav to="/lm-impressoes/dashboard/cadastros/tipos-folha" icon={List}>Tipos de Folha</Nav>
     </Group>

     <Group value="lancamentos" label="Lançamentos" icon={ArrowLeftRight} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/lancamentos/servicos" icon={List}>Serviços</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/despesas" icon={List}>Despesas</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/folhas" icon={List}>Folhas</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/despesas-previstas" icon={CheckSquare}>Despesas Previstas</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/clientes-debito" icon={Users}>Clientes Débito</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/dizimos-ofertas" icon={DollarSign}>Dízimos/Ofertas</Nav>
      <Nav to="/lm-impressoes/dashboard/lancamentos/metas" icon={Target}>Metas</Nav>
     </Group>

     <Group value="custos" label="Custos & Lucros" icon={Calculator} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/custos/lancamentos" icon={DollarSign}>Lançar Custos</Nav>
      <Nav to="/lm-impressoes/dashboard/custos/controle" icon={CheckSquare}>Controle de Custos</Nav>
      <Nav to="/lm-impressoes/dashboard/custos/relatorio-custos" icon={BarChart3}>Relatório Categorias</Nav>
      <Nav to="/lm-impressoes/dashboard/custos/relatorio-lucro" icon={Wallet}>Lucro Mensal</Nav>
     </Group>

     <Group value="pedidos" label="Pedidos" icon={ShoppingCart} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/pedidos/cadastro" icon={PlusCircle}>Realizar Pedido</Nav>
      <Nav to="/lm-impressoes/dashboard/pedidos/consulta" icon={List}>Consultar Pedidos</Nav>
     </Group>

     <Group value="estoques" label="Estoques" icon={PackageSearch} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/estoques/inicial" icon={List}>Estoque Inicial</Nav>
      <Nav to="/lm-impressoes/dashboard/estoques" icon={PackageSearch}>Estoque Consolidado</Nav>
     </Group>

     <Group value="relatorios" label="Relatórios" icon={BarChart3} isOpen={isOpen} isMobile={isMobile}>
      <Nav to="/lm-impressoes/dashboard/relatorios/servicos" icon={List}>Serviços</Nav>
      <Nav to="/lm-impressoes/dashboard/relatorios/despesas" icon={List}>Despesas</Nav>
      <Nav to="/lm-impressoes/dashboard/relatorios/despesas-previstas" icon={CheckSquare}>Despesas Previstas</Nav>
      <Nav to="/lm-impressoes/dashboard/relatorios/clientes-debito" icon={Users}>Clientes Débito</Nav>
     </Group>

    </Accordion>
   </ul>
  </nav>

  <div className="shrink-0 space-y-1 border-t border-border p-2">
   <Link to="/modules" className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-lanhouse)/.08)] hover:text-foreground">
    <LayoutGrid className="h-4 w-4 shrink-0"/>{show&&'Módulos'}
   </Link>
   <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10">
    <LogOut className="h-4 w-4 shrink-0"/>{show&&'Sair'}
   </button>
  </div>
 </aside>
}
