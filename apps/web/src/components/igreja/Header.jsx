import React,{useState}from'react';
import{Link,useNavigate}from'react-router-dom';
import{Menu,Home,Search,ChevronLeft,X,LogOut,Bell}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{cn}from'@/lib/utils';
import DividerLine from'@/components/ui/DividerLine';
import UserMenu from'@/components/UserMenu';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const GOLD='hsl(var(--neon-gold))';

export default function Header({toggleSidebar,submodule,isSidebarOpen}){

 const navigate=useNavigate();
 const{signOut}=useAuth();
 const[isSearchOpen,setIsSearchOpen]=useState(false);

 const modulePath=
  submodule?.toLowerCase()==='secretaria'
   ?'/igreja/secretaria'
   :submodule?.toLowerCase()==='tesouraria'
    ?'/igreja/tesouraria'
    :'/igreja';

 const handleLogout=async()=>{
  await signOut();
  navigate('/login');
 };

 const iconButton=
  'text-muted-foreground hover:text-[hsl(var(--neon-gold))] hover:bg-[hsl(var(--neon-gold)/.10)]';

 return(
  <header className="dark-igreja sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--neon-gold)/.20)] bg-card/80 px-3 backdrop-blur-md md:px-5">

   <div className="flex min-w-0 items-center gap-1 md:gap-2">

    <Button
     type="button"
     variant="ghost"
     size="icon"
     onClick={toggleSidebar}
     className={`lg:hidden ${iconButton}`}
     aria-label={isSidebarOpen?'Fechar menu lateral':'Abrir menu lateral'}
     aria-expanded={isSidebarOpen}
    >
     {isSidebarOpen
      ?<X className="h-5 w-5"/>
      :<Menu className="h-5 w-5"/>
     }
    </Button>

    <Button
     type="button"
     variant="ghost"
     size="icon"
     onClick={()=>navigate('/modules')}
     className={`hidden md:flex ${iconButton}`}
     title="Voltar para os módulos"
     aria-label="Voltar para os módulos"
    >
     <ChevronLeft className="h-5 w-5"/>
    </Button>

    <Button
     type="button"
     variant="ghost"
     size="icon"
     onClick={()=>navigate('/modules')}
     className={iconButton}
     title="Módulos"
     aria-label="Ir para os módulos"
    >
     <Home
      className="h-5 w-5"
      style={{color:GOLD}}
     />
    </Button>

    <DividerLine
     moduleName="igreja"
     vertical
     className="mx-1 hidden h-8 opacity-40 md:block"
    />

    <Link
     to={modulePath}
     className={cn(
      'min-w-0 rounded-md',
      isSearchOpen?'hidden md:block':'block'
     )}
     aria-label={`Ir para ${submodule||'Igreja'}`}
    >
     <div className="flex min-w-0 flex-col leading-tight">
      <span
       className="truncate text-lg font-bold tracking-tight"
       style={{
        color:GOLD,
        textShadow:`0 0 12px ${GOLD.replace(')','/.25)')}`
       }}
      >
       Igreja
      </span>

      {submodule&&(
       <span
        className="truncate text-[11px] font-bold uppercase tracking-wider"
        style={{color:GOLD}}
       >
        {submodule}
       </span>
      )}
     </div>
    </Link>

   </div>

   {isSearchOpen&&(
    <div className="absolute inset-0 z-40 flex items-center gap-2 bg-background/95 px-4 backdrop-blur-md md:hidden">

     <Search className="h-4 w-4 shrink-0 text-muted-foreground"/>

     <Input
      autoFocus
      type="search"
      placeholder="Pesquisar..."
      className="h-11 w-full border-none bg-transparent focus-visible:ring-0"
      aria-label={`Pesquisar no módulo ${submodule||'Igreja'}`}
      onBlur={()=>setIsSearchOpen(false)}
     />

     <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={()=>setIsSearchOpen(false)}
      className={iconButton}
      aria-label="Fechar pesquisa"
     >
      <X className="h-5 w-5"/>
     </Button>

    </div>
   )}

   <div
    className={cn(
     'flex items-center gap-1 md:gap-2',
     isSearchOpen?'hidden md:flex':'flex'
    )}
   >

    <Button
     type="button"
     variant="ghost"
     size="icon"
     onClick={()=>setIsSearchOpen(true)}
     className={`md:hidden ${iconButton}`}
     aria-label="Abrir pesquisa"
    >
     <Search className="h-5 w-5"/>
    </Button>

    <div className="mx-3 hidden max-w-lg flex-1 md:flex">
     <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       type="search"
       placeholder="Pesquisar..."
       className="h-10 w-full border-border bg-input/50 pl-9 focus-visible:ring-[hsl(var(--neon-gold))]"
       aria-label={`Pesquisar no módulo ${submodule||'Igreja'}`}
      />
     </div>
    </div>

    <Button
     type="button"
     variant="ghost"
     size="icon"
     title="Notificações"
     className={`relative ${iconButton}`}
     aria-label="Notificações"
    >
     <Bell className="h-5 w-5"/>

     <span
      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-background"
      style={{background:GOLD}}
     />
    </Button>

    <DividerLine
     moduleName="igreja"
     vertical
     className="mx-1 hidden h-8 opacity-40 md:block"
    />

    <UserMenu moduleColor="neon-igreja"/>

    <Button
     type="button"
     variant="outline"
     size="sm"
     onClick={handleLogout}
     className="ml-1 hidden min-h-9 gap-2 sm:flex"
     style={{
      borderColor:`${GOLD.replace(')','/.45)')}`,
      color:GOLD
     }}
    >
     <LogOut className="h-4 w-4"/>
     Sair
    </Button>

   </div>

  </header>
 );
}
