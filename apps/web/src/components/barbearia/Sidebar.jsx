import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Scissors,PlusCircle,PieChart,ChevronDown,Users,ArrowLeftRight,LogOut,Building2,Search,ShoppingCart,Briefcase,FileText,CreditCard,List}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,consultas:false}),{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,border-color,color,transform] duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-barbearia))] motion-reduce:transition-none ${isActive?'border border-[hsl(var(--neon-barbearia))] bg-[hsl(var(--neon-barbearia)/0.10)] font-medium text-[hsl(var(--neon-barbearia))]':'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-barbearia)/0.25)] hover:bg-muted hover:text-foreground'}`;
 const menu=(key,Icon,label,children)=><div className="mb-0"><button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-barbearia))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><span className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&label}</span>{(isOpen||isMobile)&&<ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}</button>{openMenus[key]&&(isOpen||isMobile)&&<div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}</div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none ${isMobile?(isOpen?'w-60 translate-x-0':'w-60 -translate-x-full'):(isOpen?'w-60':'w-20')}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4"><div className="flex items-center gap-2 overflow-hidden"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--neon-barbearia))] to-amber-600 shadow-[0_0_12px_hsl(var(--neon-barbearia)/0.4)]"><Scissors className="h-4 w-4 text-white"/></div>{(isOpen||isMobile)&&<div className="leading-tight"><div className="text-sm font-bold uppercase text-white">BARBEARIA</div><div className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--neon-barbearia))]">BROTHERS</div></div>}</div></div>

  <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
   <ul className="space-y-1">
    <li><NavLink to="/barbearia/dashboard" end className={nav}><PieChart className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Dashboard'}</NavLink></li>

    <li>{menu('cadastros',PlusCircle,'Cadastros',<>
     <NavLink to="/barbearia/dashboard/cadastros/clientes" className={nav}><Users className="h-4 w-4 shrink-0"/><span>Clientes</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/produtos" className={nav}><ShoppingCart className="h-4 w-4 shrink-0"/><span>Produtos</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/servicos" className={nav}><Briefcase className="h-4 w-4 shrink-0"/><span>Serviços</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/barbeiros" className={nav}><Users className="h-4 w-4 shrink-0"/><span>Barbeiros</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-corte" className={nav}><Scissors className="h-4 w-4 shrink-0"/><span>Tipos de Corte</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-planos" className={nav}><FileText className="h-4 w-4 shrink-0"/><span>Tipos de Planos</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-despesa" className={nav}><List className="h-4 w-4 shrink-0"/><span>Tipos de Despesa</span></NavLink>
    </>)}</li>

    <li>{menu('lancamentos',ArrowLeftRight,'Lançamentos',<>
     <NavLink to="/barbearia/dashboard/lancamentos/cortes" className={nav}><Scissors className="h-4 w-4 shrink-0"/><span>Cortes</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/servicos" className={nav}><Briefcase className="h-4 w-4 shrink-0"/><span>Serviços</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/vendas" className={nav}><ShoppingCart className="h-4 w-4 shrink-0"/><span>Vendas</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/assinaturas" className={nav}><FileText className="h-4 w-4 shrink-0"/><span>Assinaturas</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/debitos" className={nav}><CreditCard className="h-4 w-4 shrink-0"/><span>Débitos (Fiado)</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas</span></NavLink>
    </>)}</li>

    <li>{menu('consultas',Search,'Consultas',<>
     <NavLink to="/barbearia/dashboard/consultas/assinaturas" className={nav}><FileText className="h-4 w-4 shrink-0"/><span>Assinaturas Ativas</span></NavLink>
     <NavLink to="/barbearia/dashboard/consultas/debitos" className={nav}><CreditCard className="h-4 w-4 shrink-0"/><span>Clientes em Débito</span></NavLink>
    </>)}</li>
   </ul>
  </nav>

  <div className="shrink-0 space-y-1 border-t border-border p-2">
   <NavLink to="/modules" className={nav}><Building2 className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Módulos'}</NavLink>
   <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-[background-color,color,transform] duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"><LogOut className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Sair'}</button>
  </div>
 </aside>;
}
