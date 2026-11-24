import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/comercial/Sidebar.jsx';
import Header from '@/components/comercial/Header.jsx';
import MovimentacaoEstoque from '@/components/comercial/estoque/MovimentacaoEstoque.jsx';
import CadastroClientesComercial from '@/components/comercial/cadastros/CadastroClientesComercial.jsx';
import CadastroFornecedoresComercial from '@/components/comercial/cadastros/CadastroFornecedoresComercial.jsx';
import CadastroProdutosComercial from '@/components/comercial/cadastros/CadastroProdutosComercial.jsx';
import { DeviceContext } from '@/App.jsx';
import { Helmet } from 'react-helmet';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { cn } from '@/lib/utils';
import {
  Users, Truck, Package, ShoppingCart,
  Receipt, Wallet, TrendingUp
} from 'lucide-react';

const pages = [
  { path: 'lancamentos/vendas', title: 'Vendas', icon: ShoppingCart },
  { path: 'lancamentos/despesas', title: 'Despesas', icon: Receipt },
  { path: 'lancamentos/custos', title: 'Custos', icon: Wallet },
  { path: 'lancamentos/investimentos', title: 'Investimentos', icon: TrendingUp },
  { path: 'consultas/vendas', title: 'Vendas', icon: ShoppingCart },
  { path: 'consultas/despesas', title: 'Despesas', icon: Receipt },
  { path: 'consultas/custos', title: 'Custos', icon: Wallet },
  { path: 'consultas/investimentos', title: 'Investimentos', icon: TrendingUp },
  { path: 'consultas/contas-do-mes', title: 'Contas do Mês', icon: Wallet },
  { path: 'consultas/fluxo-de-caixa', title: 'Fluxo de Caixa', icon: TrendingUp }
];

function ComercialHome() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--neon-comercial))]">
          GESTÃO COMERCIAL
        </p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe os principais indicadores do seu negócio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              className="neon-card rounded-2xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{item.title}</span>
                <Icon className="h-5 w-5 text-[hsl(var(--neon-comercial))]" />
              </div>

              <p className="mt-5 text-sm text-gray-500">
                Os indicadores serão configurados nesta etapa.
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">
          Bem-vindo ao Módulo Comercial
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Aqui ficará o resumo financeiro das vendas, despesas, custos e investimentos.
        </p>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon: Icon }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--neon-comercial))]">
          Módulo Comercial
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[hsl(var(--neon-comercial)/.20)] bg-gray-900/80 p-6 text-center">
        <Icon className="mb-4 h-10 w-10 text-[hsl(var(--neon-comercial))]" />

        <h2 className="text-lg font-semibold text-white">{title}</h2>

        <p className="mt-2 max-w-md text-sm text-gray-400">
          Esta tela está preparada. A funcionalidade será desenvolvida na próxima etapa.
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
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-gradient-professional font-sans text-[#A9A9A9]"
      style={{
        '--primary': 'var(--neon-comercial)',
        '--ring': 'var(--neon-comercial)',
        '--neon-comercial': '51 100% 50%'
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

      <div className={cn(
        'flex flex-1 flex-col transition-[margin] duration-300',
        !isMobile && (isSidebarOpen ? 'ml-60' : 'ml-20')
      )}>
        <Header
          toggleSidebar={() => setSidebarOpen(v => !v)}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8">
          <div className="w-full">
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

              {/* ESTOQUE */}
              <Route
                path="estoque/movimentacoes"
                element={<MovimentacaoEstoque />}
              />

              {/* DEMAIS TELAS */}
              {pages.map(page => (
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
                element={<Navigate to="/comercial/dashboard" replace />}
              />
            </Routes>
          </div>
        </main>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

