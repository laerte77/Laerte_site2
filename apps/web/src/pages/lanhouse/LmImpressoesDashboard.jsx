import React,{useState,useEffect,useContext}from'react';
import{Routes,Route,Navigate,useNavigate,useLocation}from'react-router-dom';
import{Loader2}from'lucide-react';
import{Toaster}from'@/components/ui/toaster';
import{useToast}from'@/components/ui/use-toast';
import Sidebar from'@/components/lanhouse/Sidebar';
import Header from'@/components/lanhouse/Header';
import DashboardHome from'@/components/lanhouse/DashboardHome';
import CadastroClientes from'@/components/lanhouse/cadastros/CadastroClientes';
import CadastroServicos from'@/components/lanhouse/cadastros/CadastroServicos';
import CadastroDespesas from'@/components/lanhouse/cadastros/CadastroDespesas';
import CadastroTiposFolhas from'@/components/lanhouse/cadastros/CadastroTiposFolhas';
import CadastroPedidos from'@/components/lanhouse/cadastros/CadastroPedidos';
import LancamentoServicos from'@/components/lanhouse/lancamentos/LancamentoServicos';
import LancamentoDespesas from'@/components/lanhouse/lancamentos/LancamentoDespesas';
import LancamentoFolhas from'@/components/lanhouse/lancamentos/LancamentoFolhas';
import LancamentoDespesaPrevista from'@/components/lanhouse/lancamentos/LancamentoDespesaPrevista';
import ContasMesLM from'@/components/lanhouse/relatorios/ContasMesLM';
import LancamentoClientesDebito from'@/components/lanhouse/lancamentos/LancamentoClientesDebito';
import LancamentoDizimosOfertas from'@/components/lanhouse/lancamentos/LancamentoDizimosOfertas';
import LancamentoMetas from'@/components/lanhouse/lancamentos/LancamentoMetas';
import LancamentoCustos from'@/components/lanhouse/lancamentos/LancamentoCustos';
import ConsultaPedidos from'@/components/lanhouse/consultas/ConsultaPedidos';
import RelatorioServicos from'@/components/lanhouse/relatorios/RelatorioServicos';
import RelatorioDespesas from'@/components/lanhouse/relatorios/RelatorioDespesas';
import RelatorioClientesDebito from'@/components/lanhouse/relatorios/RelatorioClientesDebito';
import RelatorioDespesasPrevistas from'@/components/lanhouse/relatorios/RelatorioDespesasPrevistas';
import ControleFolhas from'@/components/lanhouse/relatorios/ControleFolhas';
import RelatorioCustosPorTipo from'@/components/lanhouse/relatorios/RelatorioCustosPorTipo';
import RelatorioLucroMensal from'@/components/lanhouse/relatorios/RelatorioLucroMensal';
import EstoqueInicial from'@/components/lanhouse/estoques/EstoqueInicial';
import Estoques from'@/components/lanhouse/estoques/Estoques';
import ControleEstoque from'@/components/lanhouse/estoques/ControleEstoque';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{DeviceContext}from'@/App';
import{cn}from'@/lib/utils';

const LmImpressoesDashboard=()=>{
 const navigate=useNavigate(),location=useLocation(),{toast}=useToast();
 const{session,loading,canAccessModule}=useAuth();
 const{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);

 useModuleAccessGuard('lm-impressoes');

 useEffect(()=>{
  if(loading)return;

  if(!session){
   toast({
    title:'Acesso Negado',
    description:'Por favor, faça login.',
    variant:'destructive'
   });
   navigate('/login');
  }else if(!canAccessModule('lm-impressoes')&&!canAccessModule('lm_impressoes')){
   toast({
    title:'Acesso Restrito',
    description:'Você não tem permissão para o módulo LM Impressões.',
    variant:'destructive'
   });
   navigate('/modules');
  }
 },[session,loading,navigate,toast,canAccessModule]);

 useEffect(()=>setSidebarOpen(!isMobile),[isMobile]);
 useEffect(()=>{
  if(isMobile)setSidebarOpen(false);
 },[location.pathname,isMobile]);

 if(loading||!session){
  return(
   <div className="flex h-screen flex-col items-center justify-center text-foreground">
    <Loader2 className="mb-4 h-10 w-10 animate-spin text-[hsl(var(--neon-lanhouse))]"/>
    <p>Carregando Módulo...</p>
   </div>
  );
 }

 return(
  <div
   className="flex min-h-screen w-full bg-gradient-professional"
   style={{
    '--primary':'var(--neon-lanhouse)',
    '--ring':'var(--neon-lanhouse)'
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
    />

    <main className="relative flex-1 overflow-y-auto bg-transparent p-2 md:p-4 lg:p-5">
     <Routes>

      <Route path="/" element={<DashboardHome/>}/>

      <Route path="despesas-previstas-mes" element={<ContasMesLM/>}/>

      <Route path="cadastros/clientes" element={<CadastroClientes/>}/>
      <Route path="cadastros/servicos" element={<CadastroServicos/>}/>
      <Route path="cadastros/despesas" element={<CadastroDespesas/>}/>
      <Route path="cadastros/tipos-folha" element={<CadastroTiposFolhas/>}/>

      <Route path="lancamentos/servicos" element={<LancamentoServicos/>}/>
      <Route path="lancamentos/despesas" element={<LancamentoDespesas/>}/>
      <Route path="lancamentos/folhas" element={<LancamentoFolhas/>}/>
      <Route path="lancamentos/despesas-previstas" element={<LancamentoDespesaPrevista/>}/>
      <Route path="lancamentos/clientes-debito" element={<LancamentoClientesDebito/>}/>
      <Route path="lancamentos/dizimos-ofertas" element={<LancamentoDizimosOfertas/>}/>
      <Route path="lancamentos/metas" element={<LancamentoMetas/>}/>

      <Route path="custos/lancamentos" element={<LancamentoCustos/>}/>
      <Route path="custos/controle" element={<ControleFolhas/>}/>
      <Route path="custos/relatorio-custos" element={<RelatorioCustosPorTipo/>}/>
      <Route path="custos/relatorio-lucro" element={<RelatorioLucroMensal/>}/>

      <Route path="pedidos/cadastro" element={<CadastroPedidos/>}/>
      <Route path="pedidos/consulta" element={<ConsultaPedidos/>}/>

      <Route path="relatorios/servicos" element={<RelatorioServicos/>}/>
      <Route path="relatorios/despesas" element={<RelatorioDespesas/>}/>
      <Route path="relatorios/despesas-previstas" element={<RelatorioDespesasPrevistas/>}/>
      <Route path="relatorios/clientes-debito" element={<RelatorioClientesDebito/>}/>

      <Route path="estoques/inicial" element={<EstoqueInicial/>}/>
      <Route path="estoques/controle" element={<ControleEstoque/>}/>
      <Route path="estoques" element={<Estoques/>}/>

      <Route
       path="*"
       element={<Navigate to="/lm-impressoes/dashboard" replace/>}
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

   <Toaster/>
  </div>
 );
};

export default LmImpressoesDashboard;
