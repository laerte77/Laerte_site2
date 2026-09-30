import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{MonitorPlay,List,PlusCircle,PieChart,ChevronDown,DollarSign,ArrowLeftRight,LogOut,Building2,Calculator,ShoppingCart,PackageSearch,CheckSquare}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';

export default function Sidebar({isOpen,isMobile}){
 const[openMenus,setOpenMenus]=useState({cadastros:true,lancamentos:false,custos:false,pedidos:false,estoques:false,relatorios:false});
 const{signOut}=useAuth();
 const toggle=m=>setOpenMenus(p=>({...p,[m]:!p[m]}));
 const nav=({isActive})=>`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 group hover:shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-cyan))] motion-reduce:transition-none ${isActive?'bg-[hsl(var(--neon-cyan)/0.15)] text-[hsl(var(--neon-cyan))] font-medium border border-[hsl(var(--neon-cyan)/0.5)]':'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'}`;
 const menu=(key,Icon,label,children)=><div className="mb-2">
  <button type="button" onClick={()=>toggle(key)} aria-expanded={openMenus[key]} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-4 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-cyan))] motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}>
   <span className="flex items-center gap-3"><Icon size={20}/>{(isOpen||isMobile)&&<span className="font-medium">{label}</span>}</span>
   {isOpen&&<ChevronDown size={16} className={`transition-transform duration-200 motion-reduce:transition-none ${openMenus[key]?'rotate-180':''}`}/>}
  </button>
  {openMenus[key]&&isOpen&&<div className="mt-1 ml-4 space-y-1 border-l border-border/50 pl-4 animate-in slide-in-from-top-2 motion-reduce:animate-none">{children}</div>}
 </div>;

 return <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-[width,transform] duration-300 motion-reduce:transition-none ${isOpen?'w-64 translate-x-0':isMobile?'-translate-x-full w-64':'w-20 translate-x-0'}`}>
  <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
   <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-cyan))] to-teal-600 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.5)]"><MonitorPlay size={24} className="text-white"/></div>
    {(isOpen||isMobile)&&<span className="font-bold tracking-wide">LM IMPRESSÕES</span>}
   </div>
  </div>

  <nav className="flex-1 overflow-y-auto px-3 py-6">
   <div className="mb-6 space-y-1">
    <NavLink to="/lm-impressoes/dashboard" end className={nav}><PieChart size={20}/>{(isOpen||isMobile)&&<span>Dashboard</span>}</NavLink>
    <NavLink to="/lm-impressoes/dashboard/despesas-previstas-mes" className={nav}><CheckSquare size={20}/>{(isOpen||isMobile)&&<span>Contas do Mês</span>}</NavLink>
   </div>

   {menu('cadastros',PlusCircle,'Cadastros',
    <>
     <NavLink to="/lm-impressoes/dashboard/cadastros/clientes" className={nav}><List size={16}/><span>Clientes</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/cadastros/servicos" className={nav}><List size={16}/><span>Serviços</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/cadastros/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/cadastros/tipos-folha" className={nav}><List size={16}/><span>Tipos de Folha</span></NavLink>
    </>
   )}

   {menu('lancamentos',ArrowLeftRight,'Lançamentos',
    <>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/servicos" className={nav}><List size={16}/><span>Serviços</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/folhas" className={nav}><List size={16}/><span>Folhas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas-previstas" className={nav}><CheckSquare size={16}/><span>Desp. Previstas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/clientes-debito" className={nav}><List size={16}/><span>Clientes Débito</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/dizimos-ofertas" className={nav}><DollarSign size={16}/><span>Dízimos/Ofertas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/lancamentos/metas" className={nav}><CheckSquare size={16}/><span>Metas</span></NavLink>
    </>
   )}

   {menu('custos',Calculator,'Custos & Lucros',
    <>
     <NavLink to="/lm-impressoes/dashboard/custos/lancamentos" className={nav}><List size={16}/><span>Lançar Custos</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/custos/controle" className={nav}><PieChart size={16}/><span>Controle de Custos</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/custos/relatorio-custos" className={nav}><PieChart size={16}/><span>Relatório Categorias</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/custos/relatorio-lucro" className={nav}><DollarSign size={16}/><span>Lucro Mensal</span></NavLink>
    </>
   )}

   {menu('pedidos',ShoppingCart,'Pedidos',
    <>
     <NavLink to="/lm-impressoes/dashboard/pedidos/cadastro" className={nav}><PlusCircle size={16}/><span>Realizar Pedido</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/pedidos/consulta" className={nav}><List size={16}/><span>Consultar Pedidos</span></NavLink>
    </>
   )}

   {menu('estoques',PackageSearch,'Estoques',
    <>
     <NavLink to="/lm-impressoes/dashboard/estoques/inicial" className={nav}><List size={16}/><span>Estoque Inicial</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/estoques" className={nav}><List size={16}/><span>Estoque Consolidado</span></NavLink>
    </>
   )}

   {menu('relatorios',PieChart,'Relatórios',
    <>
     <NavLink to="/lm-impressoes/dashboard/relatorios/servicos" className={nav}><List size={16}/><span>Serviços</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/relatorios/despesas" className={nav}><List size={16}/><span>Despesas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/relatorios/despesas-previstas" className={nav}><CheckSquare size={16}/><span>Despesas Previstas</span></NavLink>
     <NavLink to="/lm-impressoes/dashboard/relatorios/clientes-debito" className={nav}><List size={16}/><span>Clientes Débito</span></NavLink>
    </>
   )}
  </nav>

  <div className="space-y-2 border-t border-border bg-card p-3">
   <NavLink to="/modules" className={nav}><Building2 size={20}/>{(isOpen||isMobile)&&<span>Módulos</span>}</NavLink>
   <button type="button" onClick={signOut} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-destructive transition-[background-color,color] duration-200 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none ${!isOpen&&!isMobile?'justify-center':''}`}><LogOut size={20}/>{(isOpen||isMobile)&&<span>Sair</span>}</button>
  </div>
 </aside>
}
