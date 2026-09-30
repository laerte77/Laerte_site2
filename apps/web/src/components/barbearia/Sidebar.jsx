import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Scissors,PlusCircle,PieChart,ChevronDown,Users,ArrowLeftRight,LogOut,Building2,Search,ShoppingCart,Briefcase,FileText,CreditCard,List}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,consultas:false});
 const{signOut}=useAuth();
 const toggleMenu=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const navLinkClass=({isActive})=>`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow,transform] duration-200 group hover:shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-barbearia))] motion-reduce:transition-none ${isActive?'bg-[hsl(var(--neon-barbearia)/0.15)] text-[hsl(var(--neon-barbearia))] font-medium border border-[hsl(var(--neon-barbearia)/0.5)]':'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'}`;
 const menu=(key,Icon,label,children)=><div className="mb-2">
  <button type="button" onClick={()=>toggleMenu(key)} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-barbearia))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`} aria-expanded={openMenus[key]}>
   <span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>
   {isOpen&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}
  </button>
  {openMenus[key]&&isOpen&&<div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}
 </div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-barbearia))] to-amber-600 shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.5)]"><Scissors size={24}/></div>
    {(isOpen||isMobile)&&<span className="text-lg font-bold tracking-wide">BARBEARIA</span>}
   </div>
  </div>

  <nav className="flex-1 overflow-y-auto px-3 py-6">
   <div className="mb-6">
    <NavLink to="/barbearia/dashboard" end className={navLinkClass}>
     <PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}
    </NavLink>
   </div>

   {menu('cadastros',PlusCircle,'Cadastros',
    <>
     <NavLink to="/barbearia/dashboard/cadastros/clientes" className={navLinkClass}><Users size={16}/><span>Clientes</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/produtos" className={navLinkClass}><ShoppingCart size={16}/><span>Produtos</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/servicos" className={navLinkClass}><Briefcase size={16}/><span>Serviços</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/barbeiros" className={navLinkClass}><Users size={16}/><span>Barbeiros</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-corte" className={navLinkClass}><Scissors size={16}/><span>Tipos de Corte</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-planos" className={navLinkClass}><FileText size={16}/><span>Tipos de Planos</span></NavLink>
     <NavLink to="/barbearia/dashboard/cadastros/tipos-despesa" className={navLinkClass}><List size={16}/><span>Tipos de Despesa</span></NavLink>
    </>
   )}

   {menu('lancamentos',ArrowLeftRight,'Lançamentos',
    <>
     <NavLink to="/barbearia/dashboard/lancamentos/cortes" className={navLinkClass}><Scissors size={16}/><span>Cortes</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/servicos" className={navLinkClass}><Briefcase size={16}/><span>Serviços</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/vendas" className={navLinkClass}><ShoppingCart size={16}/><span>Vendas</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/assinaturas" className={navLinkClass}><FileText size={16}/><span>Assinaturas</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/debitos" className={navLinkClass}><CreditCard size={16}/><span>Débitos (Fiado)</span></NavLink>
     <NavLink to="/barbearia/dashboard/lancamentos/despesas" className={navLinkClass}><List size={16}/><span>Despesas</span></NavLink>
    </>
   )}

   {menu('consultas',Search,'Consultas',
    <>
     <NavLink to="/barbearia/dashboard/consultas/assinaturas" className={navLinkClass}><FileText size={16}/><span>Assinaturas Ativas</span></NavLink>
     <NavLink to="/barbearia/dashboard/consultas/debitos" className={navLinkClass}><CreditCard size={16}/><span>Clientes em Débito</span></NavLink>
    </>
   )}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={navLinkClass}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color,transform] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}>
    <LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}
   </button>
  </div>
 </aside>
}
