import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Sidebar from '@/components/comercial/Sidebar.jsx';
import Header from '@/components/comercial/Header.jsx';

import MovimentacaoEstoque from '@/components/comercial/estoque/MovimentacaoEstoque.jsx';

import CadastroClientesComercial from '@/components/comercial/cadastros/CadastroClientesComercial.jsx';
import CadastroFornecedoresComercial from '@/components/comercial/cadastros/CadastroFornecedoresComercial.jsx';
import CadastroProdutosComercial from '@/components/comercial/cadastros/CadastroProdutosComercial.jsx';
import CadastroTiposDespesasComercial from '@/components/comercial/cadastros/CadastroTiposDespesasComercial.jsx';

import LancamentoVendasComercial from '@/components/comercial/lancamentos/LancamentoVendasComercial.jsx';
import LancamentoDespesasComercial from '@/components/comercial/lancamentos/LancamentoDespesasComercial.jsx';
import LancamentoFinanceiroComercial from '@/components/comercial/lancamentos/LancamentoFinanceiroComercial.jsx';
import LancamentoOutrosLancamentosComercial from '@/components/comercial/lancamentos/LancamentoOutrosLancamentosComercial.jsx';

import ConsultaVendasComercial from '@/components/comercial/consultas/ConsultaVendasComercial.jsx';
import ConsultaDespesasComercial from '@/components/comercial/consultas/ConsultaDespesasComercial.jsx';

import { DeviceContext } from '@/App.jsx';
import { Helmet } from 'react-helmet';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { cn } from '@/lib/utils';

import {
  ShoppingCart,
  Receipt,
  Wallet,
  TrendingUp
} from 'lucide-react';

const consultationPages = [
  {
    path: 'consultas/custos',
    title: 'Custos',
    icon: Wallet
  },
  {
    path: 'consultas/investimentos',
    title: 'Investimentos',
    icon: TrendingUp
  },
  {
    path: 'consultas/contas-do-mes',
    title: 'Contas do Mês',
    icon: Wallet
  },
  {
    path: 'consultas/fluxo-de-caixa',
    title: 'Fluxo de Caixa',
    icon: TrendingUp
  }
];

function ComercialHome() {
  return (
    <div className="w-full min-w-0 space-y-5 md:space-y-6">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[hsl(var(--neon-comercial))] sm:text-sm">
          GESTÃO COMERCIAL
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe os principais indicadores do seu negócio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 md:gap-4">
        {[
          { title: 'Vendas', icon: ShoppingCart },
          { title: 'Despesas', icon: Receipt },
          { title: 'Custos', icon: Wallet },
          { title: 'Investimentos', icon: TrendingUp }
        ].map(item => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="neon-card min-w-0 rounded-xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-4 sm:rounded-2xl sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-400">
                  {item.title}
                </span>

                <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--neon-comercial))]" />
              </div>

              <p className="mt-4 text-sm text-gray-500 sm:mt-5">
                Acesse Lançamentos para registrar.
              </p>
            </div>
          );
        })}
      </div>

      <div className="min-w-0 rounded-xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-4 sm:rounded-2xl sm:p-6">
        <h2 className="text-lg font-semibold text-white">
          Bem-vindo ao Módulo Comercial
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Gerencie vendas, despesas, custos e investimentos.
        </p>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon: Icon }) {
  return (
    <div className="w-full min-w-0 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--neon-comercial))]">
          Módulo Comercial
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white">
          {title}
        </h1>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-5 text-center sm:rounded-2xl sm:p-6">
        <Icon className="mb-4 h-10 w-10 text-[hsl(var(--neon-comercial))]" />

        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>

        <p className="mt-2 max-w-md text-sm text-gray-400">
          Esta tela será desenvolvida em uma próxima etapa.
        </p>
      </div>
    </div>
  );
}

export default function ComercialDashboard() {
  const { isMobile } = useContext(DeviceContext);
  const location = useLocation();

  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

  useModuleAccessGuard('comercial');

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div
      className="flex min-h-[100dvh] w-full overflow-hidden bg-gradient-professional font-sans text-[#A9A9A9]"
      style={{
        '--primary': 'var(--neon-comercial)',
        '--ring': 'var(--neon-comercial)',
        '--neon-comercial': '120 100% 50%'
      }}
    >
      <Helmet>
        <title>Módulo Comercial</title>
      </Helmet>

      <Sidebar
        isOpen={isSidebarOpen}
        setOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col transition-[margin] duration-300 motion-reduce:transition-none',
          !isMobile && (isSidebarOpen ? 'ml-60' : 'ml-20')
        )}
      >
        <Header
          toggleSidebar={() => setSidebarOpen(v => !v)}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-2 sm:p-3 md:p-4 lg:p-5">
          <div className="mx-auto w-full min-w-0">
            <Routes>
              <Route path="/" element={<ComercialHome />} />

              {/* CADASTROS */}
              <Route
                path="cadastros/clientes"
                element={<CadastroClientesComercial />}
              />

              <Route
                path="cadastros/fornecedores"
                element={<CadastroFornecedoresComercial />}
              />

              <Route
                path="cadastros/produtos"
                element={<CadastroProdutosComercial />}
              />

              <Route
                path="cadastros/tipos-despesas"
                element={<CadastroTiposDespesasComercial />}
              />

              {/* ESTOQUE */}
              <Route
                path="estoque/movimentacoes"
                element={<MovimentacaoEstoque />}
              />

              {/* LANÇAMENTOS */}
              <Route
                path="lancamentos/vendas"
                element={<LancamentoVendasComercial />}
              />

              <Route
                path="lancamentos/despesas"
                element={<LancamentoDespesasComercial />}
              />

              <Route
                path="lancamentos/custos"
                element={<LancamentoFinanceiroComercial mode="custo" />}
              />

              <Route
                path="lancamentos/investimentos"
                element={<LancamentoFinanceiroComercial mode="investimento" />}
              />

              <Route
                path="lancamentos/outros"
                element={<LancamentoOutrosLancamentosComercial />}
              />

              {/* CONSULTAS */}
              <Route
                path="consultas/vendas"
                element={<ConsultaVendasComercial />}
              />

              <Route
                path="consultas/despesas"
                element={<ConsultaDespesasComercial />}
              />

              {consultationPages.map(page => (
                <Route
                  key={page.path}
                  path={page.path}
                  element={
                    <PlaceholderPage
                      title={page.title}
                      icon={page.icon}
                    />
                  }
                />
              ))}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/comercial/dashboard"
                    replace
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
