import React from'react';
import{Link,useLocation}from'react-router-dom';
import{Home,Building2,ChevronLeft,ChevronRight,LayoutGrid,LogOut,List,Users,DollarSign,Receipt,Target,FileText,CalendarClock,UserCheck,Search,ArrowLeftRight,PieChart,Banknote,FileSpreadsheet}from'lucide-react';
import{Accordion,AccordionContent,AccordionItem,AccordionTrigger}from'@/components/ui/accordion';
import{Button}from'@/components/ui/button';
import{cn}from'@/lib/utils';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const GOLD='hsl(var(--neon-gold))';

const NavLink=({to,icon:Icon,children})=>{
 const{pathname}=useLocation();
 const active=to==='/igreja/tesouraria'
  ?pathname===to
  :pathname.startsWith(to);

 return(
  <Link
   to={to}
   className={cn(
    'flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
    active
     ?'border-[hsl(var(--neon-gold)/.45)] bg-[hsl(var(--neon-gold)/.10)]'
     :'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-gold)/.20)] hover:bg-muted hover:text-foreground'
   )}
   style={active?{color:GOLD}:undefined}
  >
   {Icon&&<Icon className="h-4 w-4 shrink-0"/>}
   <span className="truncate">{children}</span>
  </Link>
 );
};

export default function Sidebar({isOpen,setOpen,isMobile}){
 const{signOut}=useAuth();

 const trigger='flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-gold)/.08)] hover:text-foreground';

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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_0_12px_hsl(var(--neon-gold)/.35)]"
      style={{background:`linear-gradient(135deg,${GOLD},#d97706)`}}
     >
      <Building2 className="h-4 w-4 text-white"/>
     </div>

     {(isOpen||isMobile)&&(
      <div className="leading-tight">
       <div className="text-sm font-bold uppercase text-white">IGREJA</div>
       <div
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{color:GOLD}}
       >
        TESOURARIA
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
      className="ml-auto shrink-0 hover:bg-[hsl(var(--neon-gold)/.08)]"
      style={{color:GOLD}}
     >
      {isOpen
       ?<ChevronLeft className="h-5 w-5"/>
       :<ChevronRight className="h-5 w-5"/>
      }
     </Button>
    )}

   </div>

   <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">

    <ul className="space-y-1">

     <li>
      <NavLink to="/igreja/tesouraria" icon={Home}>
       {(isOpen||isMobile)&&'Dashboard'}
      </NavLink>
     </li>

     <Accordion type="single" collapsible className="w-full">

      <AccordionItem value="cadastros">

       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">
         📋 {(isOpen||isMobile)&&'Cadastros'}
        </span>
       </AccordionTrigger>

       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">

        <NavLink to="/igreja/tesouraria/cadastros/tipos-entrada" icon={List}>
         Tipos de Entrada
        </NavLink>

        <NavLink to="/igreja/tesouraria/cadastros/tipos-despesa" icon={List}>
         Tipos de Despesa
        </NavLink>

        <NavLink to="/igreja/tesouraria/cadastros/dizimistas" icon={Users}>
         Dizimistas
        </NavLink>

       </AccordionContent>

      </AccordionItem>

      <AccordionItem value="lancamentos">

       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">
         ↔️ {(isOpen||isMobile)&&'Lançamentos'}
        </span>
       </AccordionTrigger>

       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">

        <NavLink to="/igreja/tesouraria/lancamentos/entradas" icon={DollarSign}>
         Entradas/Dízimos
        </NavLink>

        <NavLink to="/igreja/tesouraria/lancamentos/despesas" icon={List}>
         Despesas/Saídas
        </NavLink>

        <NavLink to="/igreja/tesouraria/lancamentos/despesas-previstas" icon={Target}>
         Despesas Previstas
        </NavLink>

       </AccordionContent>

      </AccordionItem>

      <AccordionItem value="consultas">

       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">
         🔎 {(isOpen||isMobile)&&'Consultas'}
        </span>
       </AccordionTrigger>

       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">

        <NavLink to="/igreja/tesouraria/consultas/contas-mes" icon={Receipt}>
         Contas do Mês
        </NavLink>

        <NavLink to="/igreja/tesouraria/consultas/dizimistas-ativos" icon={UserCheck}>
         Dizimistas Ativos
        </NavLink>

        <NavLink to="/igreja/tesouraria/consultas/todos-dizimistas" icon={Users}>
         Todos Dizimistas
        </NavLink>

        <NavLink to="/igreja/tesouraria/consultas/entradas-mes-a-mes" icon={FileSpreadsheet}>
         Entradas Mês a Mês
        </NavLink>

        <NavLink to="/igreja/tesouraria/consultas/despesas-previstas-mes-a-mes" icon={CalendarClock}>
         Despesas Previstas Mês a Mês
        </NavLink>

       </AccordionContent>

      </AccordionItem>

      <AccordionItem value="relatorios">

       <AccordionTrigger className={trigger}>
        <span className="flex items-center gap-3">
         📊 {(isOpen||isMobile)&&'Relatórios'}
        </span>
       </AccordionTrigger>

       <AccordionContent className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">

        <NavLink to="/igreja/tesouraria/relatorios/entradas" icon={DollarSign}>
         Entradas
        </NavLink>

        <NavLink to="/igreja/tesouraria/relatorios/despesas" icon={List}>
         Despesas
        </NavLink>

        <NavLink to="/igreja/tesouraria/relatorios/despesas-previstas" icon={Target}>
         Despesas Previstas
        </NavLink>

        <NavLink to="/igreja/tesouraria/relatorios/entradas-despesas" icon={ArrowLeftRight}>
         Entradas x Saídas
        </NavLink>

        <NavLink to="/igreja/tesouraria/relatorios/fluxo-caixa" icon={PieChart}>
         Fluxo de Caixa
        </NavLink>

        <NavLink to="/igreja/tesouraria/relatorios/gastos-por-tipo" icon={FileSpreadsheet}>
         Gastos por Tipo
        </NavLink>

       </AccordionContent>

      </AccordionItem>

     </Accordion>

    </ul>

   </nav>

   <div className="shrink-0 space-y-1 border-t border-border p-2">

    <Link
     to="/modules"
     className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--neon-gold)/.08)] hover:text-foreground"
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
