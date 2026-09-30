import React,{useEffect,useState,useContext}from'react';
import{Routes,Route,Navigate,useNavigate}from'react-router-dom';
import Sidebar from'@/components/igreja/Sidebar';
import Header from'@/components/igreja/Header';
import DashboardHome from'@/components/igreja/IgrejaDashboardHome';
import CadastroTipoEntrada from'@/components/igreja/cadastros/CadastroTipoEntrada';
import CadastroTipoDespesa from'@/components/igreja/cadastros/CadastroTipoDespesa';
import CadastroDizimistas from'@/components/igreja/cadastros/CadastroDizimistas';
import LancamentoEntradas from'@/components/igreja/lancamentos/LancamentoEntradas';
import LancamentoDespesas from'@/components/igreja/lancamentos/LancamentoDespesas';
import LancamentoDespesaPrevista from'@/components/igreja/lancamentos/LancamentoDespesaPrevista';
import ConsultaEntradasMesAMes from'@/components/igreja/tesouraria/consultas/ConsultaEntradasMesAMes';
import ConsultaContasDoMesIgreja from'@/components/igreja/tesouraria/relatorios/ConsultaContasDoMesIgreja';
import ConsultaDizimistasAtivos from'@/components/igreja/tesouraria/consultas/ConsultaDizimistasAtivos';
import ConsultaTodosDizimistas from'@/components/igreja/tesouraria/consultas/ConsultaTodosDizimistas';
import ConsultaDespesasPrevisadasMesAMes from'@/components/igreja/tesouraria/relatorios/ConsultaDespesasPrevisadasMesAMes';
import RelatorioEntradas from'@/components/igreja/relatorios/RelatorioEntradas';
import RelatorioDespesas from'@/components/igreja/relatorios/RelatorioDespesas';
import RelatorioDespesasPrevistas from'@/components/igreja/relatorios/RelatorioDespesasPrevistas';
import RelatorioEntradasDespesas from'@/components/igreja/relatorios/RelatorioEntradasDespesas';
import RelatorioFluxoCaixa from'@/components/igreja/relatorios/RelatorioFluxoCaixa';
import RelatorioGastosPorTipoDespesa from'@/components/igreja/tesouraria/relatorios/RelatorioGastosPorTipoDespesa';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{DeviceContext}from'@/App';
import{cn}from'@/lib/utils';
import{Loader2}from'lucide-react';

const IgrejaDashboard=()=>{
 const navigate=useNavigate(),{session,loading}=useAuth(),{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);

 useModuleAccessGuard('igreja:tesouraria');
 useEffect(()=>{if(!loading&&!session)navigate('/login')},[session,loading,navigate]);
 useEffect(()=>setSidebarOpen(!isMobile),[isMobile]);

 if(loading)return <div className="flex h-screen flex-col items-center justify-center text-foreground" role="status" aria-live="polite"><Loader2 className="mb-4 h-10 w-10 animate-spin text-[hsl(var(--neon-gold))] motion-reduce:animate-none" aria-hidden="true"/><p>Carregando Módulo...</p></div>;

 return <div className="flex min-h-screen w-full overflow-hidden bg-gradient-professional" style={{'--primary':'var(--neon-gold)','--ring':'var(--neon-gold)'}}>
  <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} activeModule="tesouraria"/>

  <div className={cn('flex h-screen flex-1 flex-col transition-[margin] duration-300 motion-reduce:transition-none',!isMobile&&(isSidebarOpen?'ml-60':'ml-20'))}>
   <Header toggleSidebar={()=>setSidebarOpen(prev=>!prev)} submodule="Tesouraria"/>

   <main className="relative w-full flex-1 overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8 [&_.neon-card]:neon-border-gold [&_.neon-card]:neon-hover-gold">
    <Routes>
     <Route path="/" element={<DashboardHome/>}/>
     <Route path="cadastros/tipos-entrada" element={<CadastroTipoEntrada/>}/>
     <Route path="cadastros/tipos-despesa" element={<CadastroTipoDespesa/>}/>
     <Route path="cadastros/dizimistas" element={<CadastroDizimistas/>}/>
     <Route path="lancamentos/entradas" element={<LancamentoEntradas/>}/>
     <Route path="lancamentos/despesas" element={<LancamentoDespesas/>}/>
     <Route path="lancamentos/despesas-previstas" element={<LancamentoDespesaPrevista/>}/>
     <Route path="consultas/contas-mes" element={<ConsultaContasDoMesIgreja/>}/>
     <Route path="consultas/dizimistas-ativos" element={<ConsultaDizimistasAtivos/>}/>
     <Route path="consultas/todos-dizimistas" element={<ConsultaTodosDizimistas/>}/>
     <Route path="consultas/entradas-mes-a-mes" element={<ConsultaEntradasMesAMes/>}/>
     <Route path="consultas/despesas-previstas-mes-a-mes" element={<ConsultaDespesasPrevisadasMesAMes/>}/>
     <Route path="relatorios/entradas" element={<RelatorioEntradas/>}/>
     <Route path="relatorios/despesas" element={<RelatorioDespesas/>}/>
     <Route path="relatorios/despesas-previstas" element={<RelatorioDespesasPrevistas/>}/>
     <Route path="relatorios/entradas-despesas" element={<RelatorioEntradasDespesas/>}/>
     <Route path="relatorios/fluxo-caixa" element={<RelatorioFluxoCaixa/>}/>
     <Route path="relatorios/gastos-por-tipo" element={<RelatorioGastosPorTipoDespesa/>}/>
     <Route path="*" element={<Navigate to="/igreja/tesouraria" replace/>}/>
    </Routes>
   </main>
  </div>

  {isMobile&&isSidebarOpen&&<div onClick={()=>setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" aria-hidden="true"/>}
 </div>;
};

export default IgrejaDashboard;
