import React,{useEffect,useState,useContext}from'react';
import{Routes,Route,Navigate,useNavigate,useLocation}from'react-router-dom';
import{Loader2}from'lucide-react';
import Sidebar from'@/components/igreja/tesouraria/Sidebar';
import Header from'@/components/igreja/Header';
import DashboardHome from'@/components/igreja/tesouraria/DashboardHome';
import CadastroTipoEntrada from'@/components/igreja/tesouraria/cadastros/CadastroTipoEntrada';
import CadastroTipoDespesa from'@/components/igreja/tesouraria/cadastros/CadastroTipoDespesa';
import CadastroDizimistas from'@/components/igreja/tesouraria/cadastros/CadastroDizimistas';
import LancamentoEntradas from'@/components/igreja/tesouraria/lancamentos/LancamentoEntradas';
import LancamentoDespesas from'@/components/igreja/tesouraria/lancamentos/LancamentoDespesas';
import LancamentoDespesaPrevista from'@/components/igreja/tesouraria/lancamentos/LancamentoDespesaPrevista';
import ConsultaDizimistasAtivos from'@/components/igreja/tesouraria/consultas/ConsultaDizimistasAtivos';
import ConsultaEntradasMesAMes from'@/components/igreja/tesouraria/consultas/ConsultaEntradasMesAMes';
import ConsultaTodosDizimistas from'@/components/igreja/tesouraria/consultas/ConsultaTodosDizimistas';
import ConsultaContasDoMesIgreja from'@/components/igreja/tesouraria/consultas/ConsultaContasDoMesIgreja';
import ConsultaDespesasPrevisadasMesAMes from'@/components/igreja/tesouraria/consultas/ConsultaDespesasPrevisadasMesAMes';
import RelatorioEntradas from'@/components/igreja/tesouraria/relatorios/RelatorioEntradas';
import RelatorioDespesas from'@/components/igreja/tesouraria/relatorios/RelatorioDespesas';
import RelatorioDespesasPrevistas from'@/components/igreja/tesouraria/relatorios/RelatorioDespesasPrevistas';
import RelatorioEntradasDespesas from'@/components/igreja/tesouraria/relatorios/RelatorioEntradasDespesas';
import RelatorioFluxoCaixa from'@/components/igreja/tesouraria/relatorios/RelatorioFluxoCaixa';
import RelatorioGastosPorTipoDespesa from'@/components/igreja/tesouraria/relatorios/RelatorioGastosPorTipoDespesa';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{DeviceContext}from'@/App';
import{cn}from'@/lib/utils';

export default function IgrejaDashboard(){

 const navigate=useNavigate();
 const location=useLocation();
 const{session,loading}=useAuth();
 const{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);

 useModuleAccessGuard('igreja:tesouraria');

 useEffect(()=>{
  if(!loading&&!session)navigate('/login');
 },[session,loading,navigate]);

 useEffect(()=>{
  setSidebarOpen(!isMobile);
 },[isMobile]);

 useEffect(()=>{
  if(isMobile)setSidebarOpen(false);
 },[location.pathname,isMobile]);

 if(loading)return(
  <div className="flex h-screen flex-col items-center justify-center text-foreground">
   <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--neon-gold))]"/>
  </div>
 );

 return(
  <div
   className="flex min-h-screen w-full overflow-hidden bg-gradient-professional"
   style={{
    '--primary':'var(--neon-gold)',
    '--ring':'var(--neon-gold)'
   }}
  >

   <Sidebar
    isOpen={isSidebarOpen}
    setOpen={setSidebarOpen}
    isMobile={isMobile}
   />

   <div
    className={cn(
     'flex flex-1 flex-col transition-[margin] duration-300',
     !isMobile&&(isSidebarOpen?'ml-60':'ml-20')
    )}
   >

    <Header
     toggleSidebar={()=>setSidebarOpen(v=>!v)}
     isSidebarOpen={isSidebarOpen}
     submodule="Tesouraria"
    />

    <main className="relative flex-1 overflow-y-auto bg-transparent p-2 md:p-4 lg:p-5">

     <Routes>

      <Route path="/" element={<DashboardHome/>}/>

      <Route
       path="cadastros/tipos-entrada"
       element={<CadastroTipoEntrada/>}
      />

      <Route
       path="cadastros/tipos-despesa"
       element={<CadastroTipoDespesa/>}
      />

      <Route
       path="cadastros/dizimistas"
       element={<CadastroDizimistas/>}
      />

      <Route
       path="lancamentos/entradas"
       element={<LancamentoEntradas/>}
      />

      <Route
       path="lancamentos/despesas"
       element={<LancamentoDespesas/>}
      />

      <Route
       path="lancamentos/despesas-previstas"
       element={<LancamentoDespesaPrevista/>}
      />

      <Route
       path="consultas/contas-mes"
       element={<ConsultaContasDoMesIgreja/>}
      />

      <Route
       path="consultas/dizimistas-ativos"
       element={<ConsultaDizimistasAtivos/>}
      />

      <Route
       path="consultas/todos-dizimistas"
       element={<ConsultaTodosDizimistas/>}
      />

      <Route
       path="consultas/entradas-mes-a-mes"
       element={<ConsultaEntradasMesAMes/>}
      />

      <Route
       path="consultas/despesas-previstas-mes-a-mes"
       element={<ConsultaDespesasPrevisadasMesAMes/>}
      />

      <Route
       path="relatorios/entradas"
       element={<RelatorioEntradas/>}
      />

      <Route
       path="relatorios/despesas"
       element={<RelatorioDespesas/>}
      />

      <Route
       path="relatorios/despesas-previstas"
       element={<RelatorioDespesasPrevistas/>}
      />

      <Route
       path="relatorios/entradas-despesas"
       element={<RelatorioEntradasDespesas/>}
      />

      <Route
       path="relatorios/fluxo-caixa"
       element={<RelatorioFluxoCaixa/>}
      />

      <Route
       path="relatorios/gastos-por-tipo"
       element={<RelatorioGastosPorTipoDespesa/>}
      />

      <Route
       path="*"
       element={<Navigate to="/igreja/tesouraria" replace/>}
      />

     </Routes>

    </main>

   </div>

   {isMobile&&isSidebarOpen&&(
    <div
     onClick={()=>setSidebarOpen(false)}
     className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
     aria-hidden="true"
    />
   )}

  </div>
 );
}
