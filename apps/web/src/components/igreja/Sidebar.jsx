import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Building2,List,PlusCircle,PieChart,Users,ChevronDown,Banknote,ArrowLeftRight,LogOut,FileText,CheckSquare,Search,FileSpreadsheet,CalendarClock,UserCheck,Target}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,consultas:false,relatorios:false}),{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,border-color,color,transform] duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${isActive?'border border-[hsl(var(--neon-gold))] bg-[hsl(var(--neon-gold)/0.10)] font-medium text-[hsl(var(--neon-gold))]':'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-gold)/0.25)] hover:bg-muted hover:text-foreground'}`;
 const menu=(key,Icon,label,children)=><div className="mb-0"><button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><span className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&label}</span>{(isOpen||isMobile)&&<ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}</button>{openMenus[key]&&(isOpen||isMobile)&&<div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}</div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none ${isMobile?(isOpen?'w-60 translate-x-0':'w-60 -translate-x-full'):(isOpen?'w-60':'w-20')}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4"><div className="flex items-center gap-2 overflow-hidden"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 shadow-[0_0_12px_hsl(var(--neon-gold)/0.4)]"><Building2 className="h-4 w-4 text-white"/></div>{(isOpen||isMobile)&&<div className="leading-tight"><div className="text-sm font-bold uppercase text-white">IGREJA</div><div className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--neon-gold))]">TESOURARIA</div></div>}</div></div>

  <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
   <ul className="space-y-1">
    <li><NavLink to="/igreja/tesouraria" end className={nav}><PieChart className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Dashboard'}</NavLink></li>

    <li>{menu('cadastros',PlusCircle,'Cadastros',<>
     <NavLink to="/igreja/tesouraria/cadastros/tipos-entrada" className={nav}><List className="h-4 w-4 shrink-0"/><span>Tipos de Entrada</span></NavLink>
     <NavLink to="/igreja/tesouraria/cadastros/tipos-despesa" className={nav}><List className="h-4 w-4 shrink-0"/><span>Tipos de Despesa</span></NavLink>
     <NavLink to="/igreja/tesouraria/cadastros/dizimistas" className={nav}><Users className="h-4 w-4 shrink-0"/><span>Dizimistas</span></NavLink>
    </>)}</li>

    <li>{menu('lancamentos',ArrowLeftRight,'Lançamentos',<>
     <NavLink to="/igreja/tesouraria/lancamentos/entradas" className={nav}><Banknote className="h-4 w-4 shrink-0"/><span>Entradas/Dízimos</span></NavLink>
     <NavLink to="/igreja/tesouraria/lancamentos/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas/Saídas</span></NavLink>
     <NavLink to="/igreja/tesouraria/lancamentos/despesas-previstas" className={nav}><CalendarClock className="h-4 w-4 shrink-0"/><span>Despesas Previstas</span></NavLink>
    </>)}</li>

    <li>{menu('consultas',Search,'Consultas & Gestão',<>
     <NavLink to="/igreja/tesouraria/consultas/contas-mes" className={nav}><CheckSquare className="h-4 w-4 shrink-0"/><span>Contas do Mês</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/dizimistas-ativos" className={nav}><UserCheck className="h-4 w-4 shrink-0"/><span>Dizimistas Ativos</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/todos-dizimistas" className={nav}><Users className="h-4 w-4 shrink-0"/><span>Todos Dizimistas</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/entradas-mes-a-mes" className={nav}><FileSpreadsheet className="h-4 w-4 shrink-0"/><span>Entradas Mês a Mês</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/despesas-previstas-mes-a-mes" className={nav}><Target className="h-4 w-4 shrink-0"/><span>Desp. Previstas Mês a Mês</span></NavLink>
    </>)}</li>

    <li>{menu('relatorios',FileText,'Relatórios',<>
     <NavLink to="/igreja/tesouraria/relatorios/entradas" className={nav}><Banknote className="h-4 w-4 shrink-0"/><span>Entradas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/despesas-previstas" className={nav}><CalendarClock className="h-4 w-4 shrink-0"/><span>Despesas Previstas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/entradas-despesas" className={nav}><ArrowLeftRight className="h-4 w-4 shrink-0"/><span>Entradas x Saídas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/fluxo-caixa" className={nav}><PieChart className="h-4 w-4 shrink-0"/><span>Fluxo de Caixa</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/gastos-por-tipo" className={nav}><FileSpreadsheet className="h-4 w-4 shrink-0"/><span>Gastos por Tipo</span></NavLink>
    </>)}</li>
   </ul>
  </nav>

  <div className="shrink-0 space-y-1 border-t border-border p-2">
   <NavLink to="/modules" className={nav}><Building2 className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Módulos'}</NavLink>
   <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-[background-color,color,transform] duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"><LogOut className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Sair'}</button>
  </div>
 </aside>;
}
