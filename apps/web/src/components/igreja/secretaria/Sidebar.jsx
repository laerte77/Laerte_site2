import React,{useState}from'react';
import{NavLink,Link}from'react-router-dom';
import{Church,PlusCircle,PieChart,Users,ChevronDown,ArrowLeftRight,Search,ClipboardSignature,UserCheck,Contact,Briefcase,BookUser,Heart,GraduationCap,UserPlus,LogOut,Building2,DollarSign}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,relatorios:false,consultas:false});
 const{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 group hover:shadow-[0_0_15px_hsl(var(--neon-gold)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${isActive?'bg-[hsl(var(--neon-gold)/0.15)] text-[hsl(var(--neon-gold))] font-medium border border-[hsl(var(--neon-gold)/0.5)]':'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'}`;
 const menu=(key,Icon,label,children)=><div className="mb-2">
  <button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}>
   <span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>
   {isOpen&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}
  </button>
  {openMenus[key]&&isOpen&&<div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}
 </div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 shadow-[0_0_15px_hsl(var(--neon-gold)/0.5)]"><Church size={24} className="text-white"/></div>
    {(isOpen||isMobile)&&<span className="font-bold tracking-wide">IGREJA <span className="block text-xs uppercase tracking-widest text-[hsl(var(--neon-gold))]">Secretaria</span></span>}
   </div>
  </div>

  <nav className="flex-1 overflow-y-auto px-3 py-6">
   <div className="mb-6 space-y-1 border-b border-border/50 pb-4">
    <Link to="/igreja/tesouraria" className={nav}><DollarSign size={20}/>{(isOpen||isMobile)&&<span>Tesouraria</span>}</Link>
    <Link to="/igreja/secretaria" className={nav}><ClipboardSignature size={20}/>{(isOpen||isMobile)&&<span>Secretaria</span>}</Link>
   </div>

   <div className="mb-6"><NavLink to="/igreja/secretaria" end className={nav}><PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}</NavLink></div>

   {menu('cadastros',PlusCircle,'Cadastros',
    <>
     <NavLink to="/igreja/secretaria/cadastros/membros" className={nav}><UserPlus size={16}/><span>Membros</span></NavLink>
     <NavLink to="/igreja/secretaria/cadastros/funcoes" className={nav}><BookUser size={16}/><span>Funções</span></NavLink>
     <NavLink to="/igreja/secretaria/cadastros/cargos" className={nav}><Briefcase size={16}/><span>Cargos</span></NavLink>
     <NavLink to="/igreja/secretaria/cadastros/conjuntos" className={nav}><Users size={16}/><span>Conjuntos</span></NavLink>
     <NavLink to="/igreja/secretaria/cadastros/classes" className={nav}><GraduationCap size={16}/><span>Classes</span></NavLink>
    </>
   )}

   {menu('lancamentos',ArrowLeftRight,'Lançamentos',
    <NavLink to="/igreja/secretaria/lancamentos/casamentos" className={nav}><Heart size={16}/><span>Casamentos</span></NavLink>
   )}

   {menu('consultas',Search,'Consultas',
    <>
     <NavLink to="/igreja/secretaria/consultas/membros" className={nav}><UserCheck size={16}/><span>Membros</span></NavLink>
     <NavLink to="/igreja/secretaria/consultas/dirigentes-conjunto" className={nav}><Contact size={16}/><span>Dirigentes/Conj.</span></NavLink>
     <NavLink to="/igreja/secretaria/consultas/membros-conjunto" className={nav}><Users size={16}/><span>Membros/Conj.</span></NavLink>
     <NavLink to="/igreja/secretaria/consultas/membros-cargo" className={nav}><Briefcase size={16}/><span>Membros/Cargo</span></NavLink>
     <NavLink to="/igreja/secretaria/consultas/membros-funcao" className={nav}><BookUser size={16}/><span>Membros/Função</span></NavLink>
    </>
   )}

   {menu('relatorios',PieChart,'Relatórios',
    <NavLink to="/igreja/secretaria/relatorios/estatistico" className={nav}><PieChart size={16}/><span>Estatístico</span></NavLink>
   )}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={nav}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}</button>
  </div>
 </aside>
}
