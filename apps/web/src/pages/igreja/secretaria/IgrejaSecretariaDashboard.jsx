import React,{useEffect,useState,useContext,useMemo}from'react';
import{Routes,Route,Navigate,useNavigate,useLocation}from'react-router-dom';
import Sidebar from'@/components/igreja/secretaria/Sidebar';
import Header from'@/components/igreja/Header';
import DashboardHome from'@/components/igreja/secretaria/DashboardHome';
import CadastroMembros from'@/components/igreja/secretaria/cadastros/CadastroMembros';
import CadastroFuncoes from'@/components/igreja/secretaria/cadastros/CadastroFuncoes';
import CadastroCargos from'@/components/igreja/secretaria/cadastros/CadastroCargos';
import CadastroConjuntos from'@/components/igreja/secretaria/cadastros/CadastroConjuntos';
import CadastroClasses from'@/components/igreja/secretaria/cadastros/CadastroClasses';
import LancamentoCasamentos from'@/components/igreja/secretaria/lancamentos/LancamentoCasamentos';
import ConsultaMembros from'@/components/igreja/secretaria/consultas/ConsultaMembros';
import ConsultaHistoricoMembro from'@/components/igreja/secretaria/consultas/ConsultaHistoricoMembro';
import ConsultaMembrosConjunto from'@/components/igreja/secretaria/consultas/ConsultaMembrosConjunto';
import ConsultaDirigentesConjunto from'@/components/igreja/secretaria/consultas/ConsultaDirigentesConjunto';
import ConsultaMembrosCargoRelatorio from'@/components/igreja/secretaria/relatorios/ConsultaMembrosCargoRelatorio';
import ConsultaMembrosFuncaoRelatorio from'@/components/igreja/secretaria/relatorios/ConsultaMembrosFuncaoRelatorio';
import RelatorioEstatistico from'@/components/igreja/secretaria/relatorios/RelatorioEstatistico';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{DeviceContext}from'@/App';
import{cn}from'@/lib/utils';
import{SecretariaSharedDataProvider}from'@/contexts/SecretariaSharedDataContext';
import{Loader2,AlertCircle,ArrowLeft}from'lucide-react';
import{Button}from'@/components/ui/button';

const IgrejaSecretariaDashboard=()=>{
 const navigate=useNavigate(),location=useLocation(),{session,loading,canAccessModule}=useAuth(),{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);

 useModuleAccessGuard('igreja:secretaria');
 const hasSecretariaAccess=canAccessModule('igreja:secretaria');

 useEffect(()=>{if(!loading&&!session)navigate('/login')},[session,loading,navigate]);
 useEffect(()=>setSidebarOpen(!isMobile),[isMobile]);
 useEffect(()=>{if(isMobile)setSidebarOpen(false)},[location.pathname,isMobile]);

 const routes=useMemo(()=>(
  <Routes>
   <Route path="/" element={<DashboardHome/>}/>

   <Route path="cadastros/membros" element={<CadastroMembros/>}/>
   <Route path="cadastros/funcoes" element={<CadastroFuncoes/>}/>
   <Route path="cadastros/cargos" element={<CadastroCargos/>}/>
   <Route path="cadastros/conjuntos" element={<CadastroConjuntos/>}/>
   <Route path="cadastros/classes" element={<CadastroClasses/>}/>

   <Route path="lancamentos/casamentos" element={<LancamentoCasamentos/>}/>

   <Route path="consultas/membros" element={<ConsultaMembros/>}/>
   <Route path="consultas/historico-membro" element={<ConsultaHistoricoMembro/>}/>
   <Route path="consultas/dirigentes-conjunto" element={<ConsultaDirigentesConjunto/>}/>
   <Route path="consultas/membros-conjunto" element={<ConsultaMembrosConjunto/>}/>

   <Route path="relatorios/membros-cargo" element={<ConsultaMembrosCargoRelatorio/>}/>
   <Route path="relatorios/membros-funcao" element={<ConsultaMembrosFuncaoRelatorio/>}/>
   <Route path="relatorios/estatistico" element={<RelatorioEstatistico/>}/>

   <Route path="consultas/membros-cargo" element={<Navigate to="/igreja/secretaria/relatorios/membros-cargo" replace/>}/>
   <Route path="consultas/membros-funcao" element={<Navigate to="/igreja/secretaria/relatorios/membros-funcao" replace/>}/>

   <Route path="*" element={<Navigate to="/igreja/secretaria" replace/>}/>
  </Routes>
 ),[]);

 if(loading)return(
  <div className="flex h-screen flex-col items-center justify-center bg-transparent text-foreground" role="status" aria-live="polite">
   <Loader2 className="mb-4 h-10 w-10 animate-spin text-[hsl(var(--neon-gold))] motion-reduce:animate-none" aria-hidden="true"/>
   <p>Carregando Módulo...</p>
  </div>
 );

 if(!hasSecretariaAccess)return(
  <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 text-foreground">
   <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-lg sm:p-8" role="alert">
    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" aria-hidden="true"/>
    <h2 className="mb-2 text-2xl font-bold">Acesso Negado</h2>
    <p className="mb-6 text-muted-foreground">Você não possui permissão para acessar a Secretaria da Igreja.</p>
    <Button type="button" onClick={()=>navigate('/igreja')} className="bg-[hsl(var(--neon-gold))] text-[hsl(var(--background))] hover:bg-[hsl(var(--neon-gold))]/90">
     <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true"/>Voltar
    </Button>
   </div>
  </div>
 );

 return(
  <SecretariaSharedDataProvider>
   <div className="flex min-h-screen w-full overflow-hidden bg-gradient-professional" style={{'--primary':'var(--neon-gold)','--ring':'var(--neon-gold)'}}>
    <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile}/>

    <div className={cn(
     'flex h-screen flex-1 flex-col transition-[margin] duration-300 motion-reduce:transition-none',
     !isMobile&&(isSidebarOpen?'ml-60':'ml-20')
    )}>
     <Header toggleSidebar={()=>setSidebarOpen(v=>!v)} submodule="Secretaria"/>

     <main className="relative w-full flex-1 overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8 [&_.neon-card]:neon-border-gold [&_.neon-card]:neon-hover-gold">
      {location.pathname==='/igreja/secretaria'?<DashboardHome/>:routes}
     </main>
    </div>

    {isMobile&&isSidebarOpen&&(
     <div
      onClick={()=>setSidebarOpen(false)}
      className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
      aria-hidden="true"
     />
    )}
   </div>
  </SecretariaSharedDataProvider>
 );
};

export default IgrejaSecretariaDashboard;
