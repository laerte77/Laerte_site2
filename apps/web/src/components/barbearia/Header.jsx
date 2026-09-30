import React from'react';
import{useNavigate}from'react-router-dom';
import{Menu,Home,ChevronLeft,X,Scissors}from'lucide-react';
import{Button}from'@/components/ui/button';
import DividerLine from'@/components/ui/DividerLine';
import UserMenu from'@/components/UserMenu';

const Header=({toggleSidebar,isSidebarOpen})=>{
 const navigate=useNavigate();

 return <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--neon-barbearia))]/20 bg-black/80 px-4 backdrop-blur-md md:px-6 animate-fade-in motion-reduce:animate-none">
  <div className="flex min-w-0 items-center gap-1 md:gap-3">
   <Button type="button" variant="ghost" size="icon" onClick={toggleSidebar} className="z-50 text-[hsl(var(--neon-barbearia))] hover:bg-[hsl(var(--neon-barbearia))]/10 transition-[background-color,color,transform] duration-200 hover:-translate-y-px motion-reduce:transition-none motion-reduce:transform-none lg:hidden" aria-label={isSidebarOpen?'Fechar menu lateral':'Abrir menu lateral'} aria-expanded={isSidebarOpen}>
    {isSidebarOpen?<X className="h-6 w-6" aria-hidden="true"/>:<Menu className="h-6 w-6" aria-hidden="true"/>}
   </Button>

   <Button type="button" variant="ghost" size="icon" onClick={()=>navigate('/modules')} className="hidden text-muted-foreground hover:text-[hsl(var(--neon-barbearia))] hover:bg-[hsl(var(--neon-barbearia))]/10 transition-[background-color,color,transform] duration-200 hover:-translate-y-px motion-reduce:transition-none motion-reduce:transform-none md:flex" title="Voltar" aria-label="Voltar para os módulos">
    <ChevronLeft className="h-5 w-5" aria-hidden="true"/>
   </Button>

   <Button type="button" variant="ghost" size="icon" onClick={()=>navigate('/modules')} className="text-muted-foreground hover:text-[hsl(var(--neon-barbearia))] hover:bg-[hsl(var(--neon-barbearia))]/20 transition-[background-color,color,transform] duration-200 hover:-translate-y-px motion-reduce:transition-none motion-reduce:transform-none" title="Home" aria-label="Ir para a seleção de módulos">
    <Home className="h-5 w-5 text-[hsl(var(--neon-barbearia))]" aria-hidden="true"/>
   </Button>

   <DividerLine moduleName="barbearia" vertical className="mx-2 hidden h-8 opacity-40 md:block"/>

   <button type="button" onClick={()=>navigate('/barbearia/dashboard')} className="hidden items-center gap-2 rounded-md sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-barbearia))] focus-visible:ring-offset-2" aria-label="Ir para o painel Barbearia Brothers">
    <Scissors className="h-5 w-5 text-[hsl(var(--neon-barbearia))]" aria-hidden="true"/>
    <span className="text-lg font-bold uppercase tracking-wider text-[hsl(var(--neon-barbearia))]">Brothers</span>
   </button>
  </div>

  <div className="flex items-center gap-2">
   <UserMenu moduleColor="neon-barbearia"/>
  </div>
 </header>
};

export default Header;
