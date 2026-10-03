import React,{useState,useEffect,useContext}from'react';
import{Routes,Route,Navigate,useNavigate,useLocation}from'react-router-dom';
import{Loader2}from'lucide-react';
import{Toaster}from'@/components/ui/toaster';
import{useToast}from'@/components/ui/use-toast';
import Sidebar from'@/components/pessoal/sidebar';
import Header from'@/components/pessoal/Header';
import PessoalDashboardHome from'@/components/pessoal/PessoalDashboardHome';
import AlertasInteligentes from'@/components/pessoal/AlertasInteligentes';
import PlanejamentoFinanceiro from'@/components/pessoal/planejamento/PlanejamentoFinanceiro';
import Metas from'@/components/pessoal/planejamento/Metas';
import TiposReceita from'@/components/pessoal/cadastros/TiposReceita';
import TiposDespesa from'@/components/pessoal/cadastros/TiposDespesa';
import Livros from'@/components/pessoal/cadastros/Livros';
import CartoesCredito from'@/components/pessoal/cadastros/CartoesCredito';
import CartaoUsuarios from'@/components/pessoal/cadastros/CartaoUsuarios';
import Receitas from'@/components/pessoal/lancamentos/Receitas';
import Despesas from'@/components/pessoal/lancamentos/Despesas';
import DespesaPrevista from'@/components/pessoal/lancamentos/DespesaPrevista';
import CartaoLancamentos from'@/components/pessoal/lancamentos/CartaoLancamentos';
import LancamentoDevedores from'@/components/pessoal/lancamentos/LancamentoDevedores';
import LancamentoDizimosOfertas from'@/components/pessoal/lancamentos/LancamentoDizimosOfertas';
import Leitura from'@/components/pessoal/leitura/Leitura';
import Aportes from'@/components/pessoal/investimentos/Aportes';
import Rendimentos from'@/components/pessoal/investimentos/Rendimentos';
import ContasMes from'@/components/pessoal/consultas/ContasMes';
import Faturas from'@/components/pessoal/consultas/Faturas';
import ConsultaDividasPrevisadasMesAMes from'@/components/pessoal/consultas/ConsultaDividasPrevisadasMesAMes';
import RelatorioReceitas from'@/components/pessoal/relatorios/RelatorioReceitas';
import RelatorioDespesas from'@/components/pessoal/relatorios/RelatorioDespesas';
import RelatorioDespesasPrevistas from'@/components/pessoal/relatorios/RelatorioDespesasPrevistas';
import RelatorioCartoes from'@/components/pessoal/relatorios/RelatorioCartoes';
import RelatorioCartaoPessoas from'@/components/pessoal/relatorios/RelatorioCartaoPessoas';
import RelatorioDevedores from'@/components/pessoal/relatorios/RelatorioDevedores';
import RelatorioLeitura from'@/components/pessoal/relatorios/RelatorioLeitura';
import GerenciarUsuarios from'@/components/pessoal/admin/GerenciarUsuarios';
import CriarNovoUsuario from'@/components/pessoal/admin/CriarNovoUsuario';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{DeviceContext}from'@/App';
import{cn}from'@/lib/utils';

const PessoalDashboard=()=>{
 const navigate=useNavigate(),location=useLocation(),{toast}=useToast();
 const{session,loading,isAdmin,canAccessModule}=useAuth();
 const{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);

 useModuleAccessGuard('pessoal');

 useEffect(()=>{
  if(loading)return;
  if(!session){
   toast({title:'Acesso Negado',description:'Por favor, faça login.',variant:'destructive'});
   navigate('/login');
  }else if(!canAccessModule('pessoal')){
   toast({title:'Acesso Restrito',description:'Você não tem permissão para o módulo Pessoal.',variant:'destructive'});
   navigate('/modules');
  }
 },[session,loading,navigate,toast,canAccessModule]);

 useEffect(()=>setSidebarOpen(!isMobile),[isMobile]);
 useEffect(()=>{if(isMobile)setSidebarOpen(false)},[location.pathname,isMobile]);

 if(loading||!session){
  return(
   <div className="flex h-screen flex-col items-center justify-center text-foreground">
    <Loader2 className="mb-4 h-10 w-10 animate-spin text-[hsl(var(--neon-pessoal))]"/>
    <p>Carregando Módulo...</p>
   </div>
  );
 }

 const AdminRoute=({children})=>
  isAdmin?children:<Navigate to="/pessoal/dashboard" replace/>;

 return(
  <div
   className="flex min-h-screen w-full bg-gradient-professional"
   style={{
    '--primary':'var(--neon-pessoal)',
    '--ring':'var(--neon-pessoal)'
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

    <main className="relative flex-1 overflow-y-auto bg-transparent p-2 md:p-4 lg:p-5 [&_.neon-card]:neon-border-blue [&_.neon-card]:neon-hover-blue">
     <Routes>

      <Route path="/" element={<PessoalDashboardHome/>}/>
      <Route path="alertas" element={<AlertasInteligentes/>}/>

      <Route path="planejamento" element={<PlanejamentoFinanceiro/>}/>
      <Route path="planejamento/metas" element={<Metas/>}/>

      <Route path="cadastros/tipos-receita" element={<TiposReceita/>}/>
      <Route path="cadastros/tipos-despesa" element={<TiposDespesa/>}/>
      <Route path="cadastros/livros" element={<Livros/>}/>
      <Route path="cadastros/cartoes-credito" element={<CartoesCredito/>}/>
      <Route path="cadastros/cartao-usuarios" element={<CartaoUsuarios/>}/>

      <Route path="lancamentos/receitas" element={<Receitas/>}/>
      <Route path="lancamentos/despesas" element={<Despesas/>}/>
      <Route path="lancamentos/despesa-prevista" element={<DespesaPrevista/>}/>
      <Route path="lancamentos/cartao-lancamentos" element={<CartaoLancamentos/>}/>
      <Route path="lancamentos/devedores" element={<LancamentoDevedores/>}/>
      <Route path="lancamentos/dizimos-e-ofertas" element={<LancamentoDizimosOfertas/>}/>
      <Route path="leitura" element={<Leitura/>}/>
      <Route path="investimentos/aportes" element={<Aportes/>}/>
      <Route path="investimentos/rendimentos" element={<Rendimentos/>}/>

      <Route path="consultas/contas-mes" element={<ContasMes/>}/>
      <Route path="consultas/faturas" element={<Faturas/>}/>
      <Route path="consultas/dividas-previstas-mes-a-mes" element={<ConsultaDividasPrevisadasMesAMes/>}/>

      <Route path="relatorios/receitas" element={<RelatorioReceitas/>}/>
      <Route path="relatorios/despesas" element={<RelatorioDespesas/>}/>
      <Route path="relatorios/despesas-previstas" element={<RelatorioDespesasPrevistas/>}/>
      <Route path="relatorios/cartoes" element={<RelatorioCartoes/>}/>
      <Route path="relatorios/cartoes-pessoas" element={<RelatorioCartaoPessoas/>}/>
      <Route path="relatorios/devedores" element={<RelatorioDevedores/>}/>
      <Route path="relatorios/leitura" element={<RelatorioLeitura/>}/>

      <Route path="admin/gerenciar-usuarios" element={<AdminRoute><GerenciarUsuarios/></AdminRoute>}/>
      <Route path="admin/criar-usuario" element={<AdminRoute><CriarNovoUsuario/></AdminRoute>}/>

      <Route path="contas-mes" element={<Navigate to="/pessoal/dashboard/consultas/contas-mes" replace/>}/>
      <Route path="lancamentos/faturas" element={<Navigate to="/pessoal/dashboard/consultas/faturas" replace/>}/>
      <Route path="lancamentos/dividas-previstas-mes-a-mes" element={<Navigate to="/pessoal/dashboard/consultas/dividas-previstas-mes-a-mes" replace/>}/>
      <Route path="lancamentos/metas" element={<Navigate to="/pessoal/dashboard/planejamento/metas" replace/>}/>
      <Route path="*" element={<Navigate to="/pessoal/dashboard" replace/>}/>

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

export default PessoalDashboard;
