import React,{useState,useEffect,useContext}from'react';
import{Routes,Route}from'react-router-dom';
import Sidebar from'@/components/barbearia/Sidebar.jsx';
import Header from'@/components/barbearia/Header.jsx';
import BarbeariaDashboard from'@/components/barbearia/BarbeariaDashboard.jsx';
import CadastroClientesBarbearia from'@/components/barbearia/cadastros/CadastroClientesBarbearia.jsx';
import CadastroProdutosBarbearia from'@/components/barbearia/cadastros/CadastroProdutosBarbearia.jsx';
import CadastroServicosBarbearia from'@/components/barbearia/cadastros/CadastroServicosBarbearia.jsx';
import CadastroTiposCorte from'@/components/barbearia/cadastros/CadastroTiposCorte.jsx';
import CadastroTiposDespesaBarbearia from'@/components/barbearia/cadastros/CadastroTiposDespesaBarbearia.jsx';
import CadastroBarbeiros from'@/components/barbearia/cadastros/CadastroBarbeiros.jsx';
import CadastroTiposPlanos from'@/components/barbearia/cadastros/CadastroTiposPlanos.jsx';
import LancamentoCortes from'@/components/barbearia/lancamentos/LancamentoCortes.jsx';
import LancamentoServicos from'@/components/barbearia/lancamentos/LancamentoServicos.jsx';
import LancamentoVendas from'@/components/barbearia/lancamentos/LancamentoVendas.jsx';
import LancamentoAssinaturas from'@/components/barbearia/lancamentos/LancamentoAssinaturas.jsx';
import LancamentoDebitos from'@/components/barbearia/lancamentos/LancamentoDebitos.jsx';
import LancamentoDespesas from'@/components/barbearia/lancamentos/LancamentoDespesas.jsx';
import ConsultaAssinaturasAtivas from'@/components/barbearia/consultas/ConsultaAssinaturasAtivas.jsx';
import ConsultaClientesDebito from'@/components/barbearia/consultas/ConsultaClientesDebito.jsx';
import BarbeariaDatabaseTest from'@/components/barbearia/BarbeariaDatabaseTest.jsx';
import{DeviceContext}from'@/App.jsx';
import{Helmet}from'react-helmet';
import{useModuleAccessGuard}from'@/hooks/useModuleAccessGuard';
import{cn}from'@/lib/utils';

const BarbeariaBrothersDashboard=()=>{
 const{isMobile}=useContext(DeviceContext);
 const[isSidebarOpen,setSidebarOpen]=useState(!isMobile);
 useModuleAccessGuard('barbearia');
 useEffect(()=>setSidebarOpen(!isMobile),[isMobile]);

 return <div className="flex h-screen overflow-hidden bg-gradient-professional font-sans text-[#A9A9A9]" style={{'--primary':'var(--neon-gold)','--ring':'var(--neon-gold)'}}>
  <Helmet><title>Barbearia Brothers</title></Helmet>
  <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile}/>

  <div className={cn('flex flex-1 flex-col transition-[margin] duration-300 motion-reduce:transition-none',!isMobile&&(isSidebarOpen?'ml-60':'ml-20'))}>
   <Header toggleSidebar={()=>setSidebarOpen(v=>!v)} isSidebarOpen={isSidebarOpen}/>

   <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent [&_.neon-card]:neon-border-gold [&_.neon-card]:neon-hover-gold">
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 md:px-6 md:py-8 lg:py-10">
     <Routes>
      <Route path="/" element={<BarbeariaDashboard/>}/>
      <Route path="cadastros/clientes" element={<CadastroClientesBarbearia/>}/>
      <Route path="cadastros/produtos" element={<CadastroProdutosBarbearia/>}/>
      <Route path="cadastros/servicos" element={<CadastroServicosBarbearia/>}/>
      <Route path="cadastros/tipos-corte" element={<CadastroTiposCorte/>}/>
      <Route path="cadastros/tipos-despesa" element={<CadastroTiposDespesaBarbearia/>}/>
      <Route path="cadastros/barbeiros" element={<CadastroBarbeiros/>}/>
      <Route path="cadastros/tipos-planos" element={<CadastroTiposPlanos/>}/>
      <Route path="lancamentos/cortes" element={<LancamentoCortes/>}/>
      <Route path="lancamentos/servicos" element={<LancamentoServicos/>}/>
      <Route path="lancamentos/vendas" element={<LancamentoVendas/>}/>
      <Route path="lancamentos/assinaturas" element={<LancamentoAssinaturas/>}/>
      <Route path="lancamentos/debitos" element={<LancamentoDebitos/>}/>
      <Route path="lancamentos/despesas" element={<LancamentoDespesas/>}/>
      <Route path="consultas/assinaturas" element={<ConsultaAssinaturasAtivas/>}/>
      <Route path="consultas/debitos" element={<ConsultaClientesDebito/>}/>
      <Route path="debug/database-test" element={<BarbeariaDatabaseTest/>}/>
     </Routes>
    </div>
   </main>
  </div>

  {isMobile&&isSidebarOpen&&<div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm" onClick={()=>setSidebarOpen(false)} aria-hidden="true"/>}
 </div>;
};

export default BarbeariaBrothersDashboard;
