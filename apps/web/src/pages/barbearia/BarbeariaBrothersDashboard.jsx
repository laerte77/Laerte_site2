import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/barbearia/Sidebar.jsx';
import Header from '@/components/barbearia/Header.jsx';
import BarbeariaDashboard from '@/components/barbearia/BarbeariaDashboard.jsx';

// Cadastros
import CadastroClientesBarbearia from '@/components/barbearia/cadastros/CadastroClientesBarbearia.jsx';
import CadastroProdutosBarbearia from '@/components/barbearia/cadastros/CadastroProdutosBarbearia.jsx';
import CadastroServicosBarbearia from '@/components/barbearia/cadastros/CadastroServicosBarbearia.jsx';
import CadastroTiposCorte from '@/components/barbearia/cadastros/CadastroTiposCorte.jsx';
import CadastroTiposDespesaBarbearia from '@/components/barbearia/cadastros/CadastroTiposDespesaBarbearia.jsx';
import CadastroBarbeiros from '@/components/barbearia/cadastros/CadastroBarbeiros.jsx';
import CadastroTiposPlanos from '@/components/barbearia/cadastros/CadastroTiposPlanos.jsx';

// Lançamentos
import LancamentoCortes from '@/components/barbearia/lancamentos/LancamentoCortes.jsx';
import LancamentoServicos from '@/components/barbearia/lancamentos/LancamentoServicos.jsx';
import LancamentoVendas from '@/components/barbearia/lancamentos/LancamentoVendas.jsx';
import LancamentoAssinaturas from '@/components/barbearia/lancamentos/LancamentoAssinaturas.jsx';
import LancamentoDebitos from '@/components/barbearia/lancamentos/LancamentoDebitos.jsx';
import LancamentoDespesas from '@/components/barbearia/lancamentos/LancamentoDespesas.jsx';

// Consultas
import ConsultaAssinaturasAtivas from '@/components/barbearia/consultas/ConsultaAssinaturasAtivas.jsx';
import ConsultaClientesDebito from '@/components/barbearia/consultas/ConsultaClientesDebito.jsx';

import BarbeariaDatabaseTest from '@/components/barbearia/BarbeariaDatabaseTest.jsx';
import { DeviceContext } from '@/App.jsx';
import { Helmet } from 'react-helmet';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';

const BarbeariaBrothersDashboard = () => {
  const { isMobile } = useContext(DeviceContext);
  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Apply real-time permission guarding
  useModuleAccessGuard('barbearia');

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-gradient-professional text-[#A9A9A9] overflow-hidden font-sans" style={{ '--primary': 'var(--neon-gold)', '--ring': 'var(--neon-gold)' }}>
      <Helmet>
        <title>Barbearia Brothers</title>
      </Helmet>
      <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
      
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'ml-64' : (isMobile ? 'ml-0' : 'ml-20')}`}>
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent [&_.neon-card]:neon-border-gold [&_.neon-card]:neon-hover-gold">
          <div className="container mx-auto px-4 py-8 md:px-6 md:py-8 lg:py-10 max-w-7xl">
            <Routes>
              <Route path="/" element={<BarbeariaDashboard />} />
              
              {/* Cadastros */}
              <Route path="cadastros/clientes" element={<CadastroClientesBarbearia />} />
              <Route path="cadastros/produtos" element={<CadastroProdutosBarbearia />} />
              <Route path="cadastros/servicos" element={<CadastroServicosBarbearia />} />
              <Route path="cadastros/tipos-corte" element={<CadastroTiposCorte />} />
              <Route path="cadastros/tipos-despesa" element={<CadastroTiposDespesaBarbearia />} />
              <Route path="cadastros/barbeiros" element={<CadastroBarbeiros />} />
              <Route path="cadastros/tipos-planos" element={<CadastroTiposPlanos />} />
              
              {/* Lancamentos */}
              <Route path="lancamentos/cortes" element={<LancamentoCortes />} />
              <Route path="lancamentos/servicos" element={<LancamentoServicos />} />
              <Route path="lancamentos/vendas" element={<LancamentoVendas />} />
              <Route path="lancamentos/assinaturas" element={<LancamentoAssinaturas />} />
              <Route path="lancamentos/debitos" element={<LancamentoDebitos />} />
              <Route path="lancamentos/despesas" element={<LancamentoDespesas />} />

              {/* Consultas */}
              <Route path="consultas/assinaturas" element={<ConsultaAssinaturasAtivas />} />
              <Route path="consultas/debitos" element={<ConsultaClientesDebito />} />

              <Route path="debug/database-test" element={<BarbeariaDatabaseTest />} />
            </Routes>
          </div>
        </main>
      </div>

      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default BarbeariaBrothersDashboard;