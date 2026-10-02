import React,{createContext,useEffect}from'react';
import{Routes,Route,Navigate}from'react-router-dom';
import{Helmet}from'react-helmet';
import{MotionConfig}from'framer-motion';
import{useToast}from'@/components/ui/use-toast';
import Login from'@/pages/Login.jsx';
import Register from'@/pages/Register.jsx';
import LoadingScreen from'@/pages/LoadingScreen.jsx';
import ModuleSelectionScreen from'@/pages/ModuleSelectionScreen.jsx';
import PessoalDashboard from'@/pages/pessoal/PessoalDashboard.jsx';
import LmImpressoesDashboardHome from'@/components/lanhouse/LmImpressoesDashboardHome.jsx';
import LmImpressoesDashboard from'@/pages/lanhouse/LmImpressoesDashboard.jsx';
import IgrejaDashboardHome from'@/components/igreja/IgrejaDashboardHome.jsx';
import IgrejaDashboard from'@/pages/igreja/IgrejaDashboard.jsx';
import IgrejaSubmoduleSelection from'@/pages/igreja/IgrejaSubmoduleSelection.jsx';
import IgrejaSecretariaDashboard from'@/pages/igreja/secretaria/IgrejaSecretariaDashboard.jsx';
import EntretenimentoDashboardHome from'@/components/entretenimento/EntretenimentoDashboardHome.jsx';
import EntretenimentoDashboard from'@/pages/entretenimento/EntretenimentoDashboard.jsx';
import BarbeariaBrothersDashboard from'@/pages/barbearia/BarbeariaBrothersDashboard.jsx';
import RelatorioEntradasDespesasPDF from'@/components/igreja/relatorios/RelatorioEntradasDespesasPDF.jsx';
import{useAuth}from'@/contexts/SupabaseAuthContext.jsx';
import ErrorBoundary from'@/components/ErrorBoundary.jsx';
import SupabaseErrorBoundary from'@/components/SupabaseErrorBoundary.jsx';
import SupabaseConnectionStatus from'@/components/SupabaseConnectionStatus.jsx';
import PermissionsUpdateNotification from'@/components/PermissionsUpdateNotification.jsx';
import{useDeviceDetection}from'@/hooks/useDeviceDetection';
import{Loader2}from'lucide-react';
import MobileOptimizedLayout from'@/components/MobileOptimizedLayout.jsx';

export const DeviceContext=createContext();

const PrivateRoute=({children,adminOnly=false,requiredModule=null})=>{
 const{user,isAdmin,loading,canAccessModule}=useAuth();
 const{toast}=useToast();

 const adminDenied=!loading&&!!user&&adminOnly&&!isAdmin;
 const moduleDenied=!loading&&!!user&&!!requiredModule&&!isAdmin&&!canAccessModule(requiredModule);
 const denialKey=adminDenied?'admin':moduleDenied?`module:${requiredModule}`:null;

 useEffect(()=>{
  if(!denialKey)return;
  if(denialKey==='admin'){
   toast({title:'Acesso Restrito',description:'Área exclusiva para administradores.',variant:'destructive'});
  }else{
   toast({title:'Acesso Negado',description:`Você não tem permissão para acessar o módulo: ${requiredModule}`,variant:'destructive'});
  }
 },[denialKey,requiredModule,toast]);

 if(loading)return <div className="flex min-h-screen w-full flex-col items-center justify-center bg-transparent px-4 text-foreground" role="status" aria-live="polite" aria-atomic="true">
  <div className="flex flex-col items-center justify-center rounded-2xl border border-[hsl(var(--neon-cyan))]/20 bg-[hsl(var(--card-bg))]/40 px-8 py-8 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.12)] backdrop-blur-md">
   <Loader2 className="mb-4 h-9 w-9 animate-spin text-[hsl(var(--neon-cyan))] motion-reduce:animate-none" aria-hidden="true"/>
   <p className="text-center text-sm font-medium text-[hsl(var(--text-secondary))] sm:text-base">Verificando credenciais...</p>
  </div>
 </div>;

 if(!user)return <Navigate to="/login" replace/>;
 if(denialKey)return <Navigate to="/" replace/>;

 return children;
};

function App(){
 const device=useDeviceDetection();

 return <MotionConfig reducedMotion="user">
  <DeviceContext.Provider value={{isMobile:device.isMobile,isTablet:device.isTablet,isDesktop:device.isDesktop,deviceType:device.deviceType}}>
   <Helmet>
    <title>Sistema Empresarial - Gestão Integrada</title>
    <meta name="description" content="Sistema empresarial completo com múltiplos módulos de gestão."/>
   </Helmet>

   <div className="dark min-h-screen bg-gradient-professional text-foreground transition-[background-color,opacity] duration-300 ease-out motion-reduce:transition-none">
    <SupabaseErrorBoundary>
     <ErrorBoundary>
      <SupabaseConnectionStatus/>
      <PermissionsUpdateNotification/>

      <MobileOptimizedLayout device={device}>
       <Routes>
        <Route path="/loading" element={<LoadingScreen/>}/>
        <Route path="/" element={<PrivateRoute><ModuleSelectionScreen/></PrivateRoute>}/>
        <Route path="/modules" element={<PrivateRoute><ModuleSelectionScreen/></PrivateRoute>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<PrivateRoute adminOnly><Register/></PrivateRoute>}/>

        <Route path="/pessoal/dashboard/home" element={<Navigate to="/pessoal/dashboard" replace/>}/>
        <Route path="/lm-impressoes/dashboard/home" element={<PrivateRoute requiredModule="lm-impressoes"><LmImpressoesDashboardHome/></PrivateRoute>}/>
        <Route path="/igreja/tesouraria/home" element={<PrivateRoute requiredModule="igreja:tesouraria"><IgrejaDashboardHome/></PrivateRoute>}/>
        <Route path="/entretenimento/dashboard/home" element={<PrivateRoute requiredModule="entretenimento"><EntretenimentoDashboardHome/></PrivateRoute>}/>

        <Route path="/pessoal/dashboard/*" element={<PrivateRoute requiredModule="pessoal"><PessoalDashboard/></PrivateRoute>}/>
        <Route path="/lm-impressoes/dashboard/*" element={<PrivateRoute requiredModule="lm-impressoes"><LmImpressoesDashboard/></PrivateRoute>}/>
        <Route path="/barbearia/dashboard/*" element={<PrivateRoute requiredModule="barbearia"><BarbeariaBrothersDashboard/></PrivateRoute>}/>
        <Route path="/igreja" element={<PrivateRoute requiredModule="igreja"><IgrejaSubmoduleSelection/></PrivateRoute>}/>
        <Route path="/igreja/tesouraria/*" element={<PrivateRoute requiredModule="igreja:tesouraria"><IgrejaDashboard/></PrivateRoute>}/>
        <Route path="/igreja/secretaria/*" element={<PrivateRoute requiredModule="igreja:secretaria"><IgrejaSecretariaDashboard/></PrivateRoute>}/>
        <Route path="/igreja/relatorios/entradas-despesas-pdf" element={<PrivateRoute requiredModule="igreja:tesouraria"><RelatorioEntradasDespesasPDF/></PrivateRoute>}/>
        <Route path="/entretenimento/dashboard/*" element={<PrivateRoute requiredModule="entretenimento"><EntretenimentoDashboard/></PrivateRoute>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
       </Routes>
      </MobileOptimizedLayout>
     </ErrorBoundary>
    </SupabaseErrorBoundary>
   </div>
  </DeviceContext.Provider>
 </MotionConfig>;
}

export default App;
