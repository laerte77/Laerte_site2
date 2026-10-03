import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{Church,PlusCircle,PieChart,Users,ChevronDown,ArrowLeftRight,Search,UserCheck,Contact,Briefcase,BookUser,Heart,GraduationCap,UserPlus,LogOut,Building2,History,FileText}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({
  cadastros:true,
  lancamentos:false,
  consultas:false,
  relatorios:false
 }),{signOut}=useAuth();

 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));

 const nav=({isActive})=>`flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,border-color,color,transform] duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${isActive?'border border-[hsl(var(--neon-gold))] bg-[hsl(var(--neon-gold)/0.10)] text-[hsl(var(--neon-gold))]':'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-[hsl(var(--neon-gold)/0.25)]'}`;

 const menu=(key,Icon,label,children)=>
  <div className="mb-0">
   <button
    type="button"
    onClick={()=>toggle(key)}
    aria-expanded={openMenus[key]}
    className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color] duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-gold))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}
   >
    <span className="flex items-center gap-3">
     <Icon className="h-4 w-4 shrink-0"/>
     {(isOpen||isMobile)&&label}
    </span>

    {(isOpen||isMobile)&&
     <ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>
    }
   </button>

   {openMenus[key]&&(isOpen||isMobile)&&
    <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3 animate-in slide-in-from-top-2 motion-reduce:animate-none">
     {children}
    </div>
   }
  </div>;

 return(
  <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none ${isMobile?(isOpen?'translate-x-0 w-60':'-translate-x-full w-60'):(isOpen?'w-60':'w-20')}`}>

   <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
    <div className="flex items-center gap-2 overflow-hidden">
     <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 shadow-[0_0_12px_hsl(var(--neon-gold)/0.4)]">
      <Church className="h-4 w-4 text-white"/>
     </div>

     {(isOpen||isMobile)&&
      <div className="leading-tight">
       <div className="text-sm font-bold uppercase text-white">IGREJA</div>
       <div className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--neon-gold))]">SECRETARIA</div>
      </div>
     }
    </div>
   </div>

   <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
    <ul className="space-y-1">

     <li>
      <NavLink to="/igreja/secretaria" end className={nav}>
       <PieChart className="h-4 w-4 shrink-0"/>
       {(isOpen||isMobile)&&'Dashboard'}
      </NavLink>
     </li>

     <li>
      {menu('cadastros',PlusCircle,'Cadastros',
       <>
        <NavLink to="/igreja/secretaria/cadastros/membros" className={nav}>
         <UserPlus className="h-4 w-4 shrink-0"/><span>Membros</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/cadastros/funcoes" className={nav}>
         <BookUser className="h-4 w-4 shrink-0"/><span>Funções</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/cadastros/cargos" className={nav}>
         <Briefcase className="h-4 w-4 shrink-0"/><span>Cargos</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/cadastros/conjuntos" className={nav}>
         <Users className="h-4 w-4 shrink-0"/><span>Conjuntos</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/cadastros/classes" className={nav}>
         <GraduationCap className="h-4 w-4 shrink-0"/><span>Classes</span>
        </NavLink>
       </>
      )}
     </li>

     <li>
      {menu('lancamentos',ArrowLeftRight,'Lançamentos',
       <NavLink to="/igreja/secretaria/lancamentos/casamentos" className={nav}>
        <Heart className="h-4 w-4 shrink-0"/><span>Casamentos</span>
       </NavLink>
      )}
     </li>

     <li>
      {menu('consultas',Search,'Consultas',
       <>
        <NavLink to="/igreja/secretaria/consultas/membros" className={nav}>
         <UserCheck className="h-4 w-4 shrink-0"/><span>Membros</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/consultas/historico-membro" className={nav}>
         <History className="h-4 w-4 shrink-0"/><span>Histórico de Membro</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/consultas/dirigentes-conjunto" className={nav}>
         <Contact className="h-4 w-4 shrink-0"/><span>Dirigentes/Conj.</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/consultas/membros-conjunto" className={nav}>
         <Users className="h-4 w-4 shrink-0"/><span>Membros/Conj.</span>
        </NavLink>
       </>
      )}
     </li>

     <li>
      {menu('relatorios',FileText,'Relatórios',
       <>
        <NavLink to="/igreja/secretaria/relatorios/membros-cargo" className={nav}>
         <Briefcase className="h-4 w-4 shrink-0"/><span>Membros por Cargo</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/relatorios/membros-funcao" className={nav}>
         <BookUser className="h-4 w-4 shrink-0"/><span>Membros por Função</span>
        </NavLink>

        <NavLink to="/igreja/secretaria/relatorios/estatistico" className={nav}>
         <PieChart className="h-4 w-4 shrink-0"/><span>Estatístico</span>
        </NavLink>
       </>
      )}
     </li>

    </ul>
   </nav>

   <div className="shrink-0 space-y-1 border-t border-border p-2">
    <NavLink to="/modules" className={nav}>
     <Building2 className="h-4 w-4 shrink-0"/>
     {(isOpen||isMobile)&&'Módulos'}
    </NavLink>

    <button
     type="button"
     onClick={signOut}
     className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-[background-color,color,transform] duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"
    >
     <LogOut className="h-4 w-4 shrink-0"/>
     {(isOpen||isMobile)&&'Sair'}
    </button>
   </div>

  </aside>
 );
}
