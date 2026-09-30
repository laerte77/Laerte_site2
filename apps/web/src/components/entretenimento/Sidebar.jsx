import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Gamepad2,Settings,List,PlusCircle,PieChart,ChevronDown,Trophy,ArrowLeftRight,LogOut,Building2,Search,Shirt}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,coletes:false,relatorios:false});
 const{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 group hover:shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-entretenimento))] motion-reduce:transition-none ${isActive?'bg-[hsl(var(--neon-entretenimento)/0.15)] text-[hsl(var(--neon-entretenimento))] font-medium border border-[hsl(var(--neon-entretenimento)/0.5)]':'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'}`;
 const menu=(key,Icon,label,children)=><div className="mb-2">
  <button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-entretenimento))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}>
   <span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>
   {isOpen&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}
  </button>
  {openMenus[key]&&isOpen&&<div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}
 </div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-entretenimento))] to-red-600 shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.5)]"><Gamepad2 size={24} className="text-white"/></div>
    {(isOpen||isMobile)&&<span className="font-bold tracking-wide">ENTRETENIMENTO</span>}
   </div>
  </div>

  <nav className="flex-1 overflow-y-auto px-3 py-6">
   <div className="mb-6"><NavLink to="/entretenimento/dashboard" end className={nav}><PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}</NavLink></div>

   {menu('cadastros',Settings,'Cadastros',
    <>
     <NavLink to="/entretenimento/dashboard/cadastros/players" className={nav}><List size={16}/><span>Players</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/jogadores" className={nav}><List size={16}/><span>Jogadores</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/participantes" className={nav}><List size={16}/><span>Participantes</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/organizadores" className={nav}><List size={16}/><span>Organizadores</span></NavLink>
    </>
   )}

   {menu('lancamentos',Trophy,'Lançamentos',
    <>
     <NavLink to="/entretenimento/dashboard/lancamentos/partidas" className={nav}><ArrowLeftRight size={16}/><span>Partidas</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/artilharia" className={nav}><List size={16}/><span>Artilharia</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/contribuicoes" className={nav}><List size={16}/><span>Contribuições</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
    </>
   )}

   {menu('coletes',Shirt,'Coletes',
    <>
     <NavLink to="/entretenimento/dashboard/coletes/cadastro" className={nav}><PlusCircle size={16}/><span>Cadastro</span></NavLink>
     <NavLink to="/entretenimento/dashboard/coletes/consulta" className={nav}><Search size={16}/><span>Consulta</span></NavLink>
    </>
   )}

   {menu('relatorios',Search,'Consultas & Relatórios',
    <>
     <NavLink to="/entretenimento/dashboard/relatorios/confrontos" className={nav}><List size={16}/><span>Confrontos</span></NavLink>
     <NavLink to="/entretenimento/dashboard/relatorios/artilharia" className={nav}><List size={16}/><span>Ranking Artilharia</span></NavLink>
     <NavLink to="/entretenimento/dashboard/consultas/contribuicoes" className={nav}><List size={16}/><span>Contribuições</span></NavLink>
     <NavLink to="/entretenimento/dashboard/consultas/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
    </>
   )}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={nav}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}</button>
  </div>
 </aside>
}
