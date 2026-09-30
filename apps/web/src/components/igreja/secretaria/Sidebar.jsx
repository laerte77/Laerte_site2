import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Church,PlusCircle,PieChart,Users,ChevronDown,ArrowLeftRight,Search,UserCheck,Contact,Briefcase,BookUser,Heart,GraduationCap,UserPlus,LogOut,Building2}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,consultas:false,relatorios:false}),{signOut}=useAuth();
 const toggleMenu=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const navClass=({isActive})=>`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${isActive?'border border-[hsl(var(--neon-gold)/0.5)] bg-[hsl(var(--neon-gold)/0.15)] font-medium text-[hsl(var(--neon-gold))] shadow-[0_0_12px_hsl(var(--neon-gold)/0.08)]':'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-[0_0_12px_hsl(var(--neon-gold)/0.18)]'}`;
 const menu=(key,Icon,label,children)=><div className="mb-1"><button type="button" onClick={()=>toggleMenu(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground transition-[background-color,color] duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>{(isOpen||isMobile)&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}</button>{openMenus[key]&&(isOpen||isMobile)&&<div className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}</div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-[70px] shrink-0 items-center border-b border-border px-4"><div className="flex items-center gap-3 overflow-hidden"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 shadow-[0_0_15px_hsl(var(--neon-gold)/0.45)]"><Church size={23} className="text-white"/></div>{(isOpen||isMobile)&&<div className="leading-tight"><div className="text-[17px] font-extrabold tracking-wide text-white">IGREJA</div><div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--neon-gold))]">SECRETARIA</div></div>}</div></div>

  <nav className="flex-1 overflow-y-auto px-3 py-5">
   <div className="mb-2"><NavLink to="/igreja/secretaria" end className={navClass}><PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}</NavLink></div>

   {menu('cadastros',PlusCircle,'Cadastros',<>
    <NavLink to="/igreja/secretaria/cadastros/membros" className={navClass}><UserPlus size={16}/><span>Membros</span></NavLink>
    <NavLink to="/igreja/secretaria/cadastros/funcoes" className={navClass}><BookUser size={16}/><span>Funções</span></NavLink>
    <NavLink to="/igreja/secretaria/cadastros/cargos" className={navClass}><Briefcase size={16}/><span>Cargos</span></NavLink>
    <NavLink to="/igreja/secretaria/cadastros/conjuntos" className={navClass}><Users size={16}/><span>Conjuntos</span></NavLink>
    <NavLink to="/igreja/secretaria/cadastros/classes" className={navClass}><GraduationCap size={16}/><span>Classes</span></NavLink>
   </>)}

   {menu('lancamentos',ArrowLeftRight,'Lançamentos',<NavLink to="/igreja/secretaria/lancamentos/casamentos" className={navClass}><Heart size={16}/><span>Casamentos</span></NavLink>)}

   {menu('consultas',Search,'Consultas',<>
    <NavLink to="/igreja/secretaria/consultas/membros" className={navClass}><UserCheck size={16}/><span>Membros</span></NavLink>
    <NavLink to="/igreja/secretaria/consultas/dirigentes-conjunto" className={navClass}><Contact size={16}/><span>Dirigentes/Conj.</span></NavLink>
    <NavLink to="/igreja/secretaria/consultas/membros-conjunto" className={navClass}><Users size={16}/><span>Membros/Conj.</span></NavLink>
    <NavLink to="/igreja/secretaria/consultas/membros-cargo" className={navClass}><Briefcase size={16}/><span>Membros/Cargo</span></NavLink>
    <NavLink to="/igreja/secretaria/consultas/membros-funcao" className={navClass}><BookUser size={16}/><span>Membros/Função</span></NavLink>
   </>)}

   {menu('relatorios',PieChart,'Relatórios',<NavLink to="/igreja/secretaria/relatorios/estatistico" className={navClass}><PieChart size={16}/><span>Estatístico</span></NavLink>)}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={navClass}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}</button>
  </div>
 </aside>;
}
