import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Building2,List,PlusCircle,PieChart,Users,ChevronDown,BookOpen,Banknote,ArrowLeftRight,LogOut,FileText,CheckSquare,Search,FileSpreadsheet,CalendarClock,UserCheck,Target}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,relatorios:false,consultas:false});
 const{signOut}=useAuth();
 const toggleMenu=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 group hover:shadow-[0_0_15px_hsl(var(--neon-gold)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${isActive?'bg-[hsl(var(--neon-gold)/0.15)] text-[hsl(var(--neon-gold))] font-medium border border-[hsl(var(--neon-gold)/0.5)]':'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'}`;
 const menu=(key,Icon,label,children)=><div className="mb-2">
  <button type="button" onClick={()=>toggleMenu(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}>
   <span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>
   {isOpen&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}
  </button>
  {openMenus[key]&&isOpen&&<div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}
 </div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 shadow-[0_0_15px_hsl(var(--neon-gold)/0.5)]"><Building2 size={24} className="text-white"/></div>
    {(isOpen||isMobile)&&<span className="font-bold tracking-wide">IGREJA <span className="block text-xs uppercase tracking-widest text-[hsl(var(--neon-gold))]">Tesouraria</span></span>}
   </div>
  </div>

  <nav className="flex-1 overflow-y-auto px-3 py-6">
   <NavLink to="/igreja/tesouraria" end className={nav}><PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}</NavLink>

   {menu('cadastros',PlusCircle,'Cadastros',
    <>
     <NavLink to="/igreja/tesouraria/cadastros/tipos-entrada" className={nav}><List size={16}/><span>Tipos de Entrada</span></NavLink>
     <NavLink to="/igreja/tesouraria/cadastros/tipos-despesa" className={nav}><List size={16}/><span>Tipos de Despesa</span></NavLink>
     <NavLink to="/igreja/tesouraria/cadastros/dizimistas" className={nav}><Users size={16}/><span>Dizimistas</span></NavLink>
    </>
   )}

   {menu('lancamentos',ArrowLeftRight,'Lançamentos',
    <>
     <NavLink to="/igreja/tesouraria/lancamentos/entradas" className={nav}><Banknote size={16}/><span>Entradas/Dízimos</span></NavLink>
     <NavLink to="/igreja/tesouraria/lancamentos/despesas" className={nav}><List size={16}/><span>Despesas/Saídas</span></NavLink>
     <NavLink to="/igreja/tesouraria/lancamentos/despesas-previstas" className={nav}><CalendarClock size={16}/><span>Despesas Previstas</span></NavLink>
    </>
   )}

   {menu('consultas',Search,'Consultas & Gestão',
    <>
     <NavLink to="/igreja/tesouraria/consultas/contas-mes" className={nav}><CheckSquare size={16}/><span>Contas do Mês</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/dizimistas-ativos" className={nav}><UserCheck size={16}/><span>Dizimistas Ativos</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/todos-dizimistas" className={nav}><Users size={16}/><span>Todos Dizimistas</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/entradas-mes-a-mes" className={nav}><FileSpreadsheet size={16}/><span>Entradas Mês a Mês</span></NavLink>
     <NavLink to="/igreja/tesouraria/consultas/despesas-previstas-mes-a-mes" className={nav}><Target size={16}/><span>Desp. Previstas Mês a Mês</span></NavLink>
    </>
   )}

   {menu('relatorios',FileText,'Relatórios',
    <>
     <NavLink to="/igreja/tesouraria/relatorios/entradas" className={nav}><Banknote size={16}/><span>Entradas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/despesas-previstas" className={nav}><CalendarClock size={16}/><span>Despesas Previstas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/entradas-despesas" className={nav}><ArrowLeftRight size={16}/><span>Entradas x Saídas</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/fluxo-caixa" className={nav}><PieChart size={16}/><span>Fluxo de Caixa</span></NavLink>
     <NavLink to="/igreja/tesouraria/relatorios/gastos-por-tipo" className={nav}><FileSpreadsheet size={16}/><span>Gastos por Tipo</span></NavLink>
    </>
   )}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={nav}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}</button>
  </div>
 </aside>
}
