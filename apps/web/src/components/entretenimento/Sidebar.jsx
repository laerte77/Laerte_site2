import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Gamepad2,Settings,List,PlusCircle,PieChart,ChevronDown,Trophy,ArrowLeftRight,LogOut,Building2,Search,Shirt}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,coletes:false,relatorios:false}),{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,border-color,color,transform] duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-entretenimento))] motion-reduce:transition-none ${isActive?'border border-[hsl(var(--neon-entretenimento))] bg-[hsl(var(--neon-entretenimento)/0.10)] font-medium text-[hsl(var(--neon-entretenimento))]':'border-transparent text-muted-foreground hover:border-[hsl(var(--neon-entretenimento)/0.25)] hover:bg-muted hover:text-foreground'}`;
 const menu=(key,Icon,label,children)=><div className="mb-0"><button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-entretenimento))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><span className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&label}</span>{(isOpen||isMobile)&&<ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}</button>{openMenus[key]&&(isOpen||isMobile)&&<div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}</div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none ${isMobile?(isOpen?'w-60 translate-x-0':'w-60 -translate-x-full'):(isOpen?'w-60':'w-20')}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4"><div className="flex items-center gap-2 overflow-hidden"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--neon-entretenimento))] to-red-600 shadow-[0_0_12px_hsl(var(--neon-entretenimento)/0.4)]"><Gamepad2 className="h-4 w-4 text-white"/></div>{(isOpen||isMobile)&&<div className="leading-tight"><div className="text-sm font-bold uppercase text-white">ENTRETENIMENTO</div><div className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--neon-entretenimento))]">GESTÃO</div></div>}</div></div>

  <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
   <ul className="space-y-1">
    <li><NavLink to="/entretenimento/dashboard" end className={nav}><PieChart className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Dashboard'}</NavLink></li>

    <li>{menu('cadastros',Settings,'Cadastros',<>
     <NavLink to="/entretenimento/dashboard/cadastros/players" className={nav}><List className="h-4 w-4 shrink-0"/><span>Players</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/jogadores" className={nav}><List className="h-4 w-4 shrink-0"/><span>Jogadores</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/participantes" className={nav}><List className="h-4 w-4 shrink-0"/><span>Participantes</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas</span></NavLink>
     <NavLink to="/entretenimento/dashboard/cadastros/organizadores" className={nav}><List className="h-4 w-4 shrink-0"/><span>Organizadores</span></NavLink>
    </>)}</li>

    <li>{menu('lancamentos',Trophy,'Lançamentos',<>
     <NavLink to="/entretenimento/dashboard/lancamentos/partidas" className={nav}><ArrowLeftRight className="h-4 w-4 shrink-0"/><span>Partidas</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/artilharia" className={nav}><List className="h-4 w-4 shrink-0"/><span>Artilharia</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/contribuicoes" className={nav}><List className="h-4 w-4 shrink-0"/><span>Contribuições</span></NavLink>
     <NavLink to="/entretenimento/dashboard/lancamentos/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas</span></NavLink>
    </>)}</li>

    <li>{menu('coletes',Shirt,'Coletes',<>
     <NavLink to="/entretenimento/dashboard/coletes/cadastro" className={nav}><PlusCircle className="h-4 w-4 shrink-0"/><span>Cadastro</span></NavLink>
     <NavLink to="/entretenimento/dashboard/coletes/consulta" className={nav}><Search className="h-4 w-4 shrink-0"/><span>Consulta</span></NavLink>
    </>)}</li>

    <li>{menu('relatorios',Search,'Consultas & Relatórios',<>
     <NavLink to="/entretenimento/dashboard/relatorios/confrontos" className={nav}><List className="h-4 w-4 shrink-0"/><span>Confrontos</span></NavLink>
     <NavLink to="/entretenimento/dashboard/relatorios/artilharia" className={nav}><List className="h-4 w-4 shrink-0"/><span>Ranking Artilharia</span></NavLink>
     <NavLink to="/entretenimento/dashboard/consultas/contribuicoes" className={nav}><List className="h-4 w-4 shrink-0"/><span>Contribuições</span></NavLink>
     <NavLink to="/entretenimento/dashboard/consultas/despesas" className={nav}><List className="h-4 w-4 shrink-0"/><span>Despesas</span></NavLink>
    </>)}</li>
   </ul>
  </nav>

  <div className="shrink-0 space-y-1 border-t border-border p-2">
   <NavLink to="/modules" className={nav}><Building2 className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Módulos'}</NavLink>
   <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-[background-color,color,transform] duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"><LogOut className="h-4 w-4 shrink-0"/>{(isOpen||isMobile)&&'Sair'}</button>
  </div>
 </aside>;
}
