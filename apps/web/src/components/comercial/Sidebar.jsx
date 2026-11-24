
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Store, PlusCircle, PieChart, ChevronDown, Users, Truck,
  Package, ArrowLeftRight, LogOut, Building2, Search,
  ShoppingCart, Receipt, Wallet, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function Sidebar({ isOpen, isMobile }) {
  const [openMenus, setOpenMenus] = useState({
    cadastros: true,
    lancamentos: false,
    consultas: false
  });

  const { signOut } = useAuth();
  const navigate = useNavigate();

  const toggle = menu => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const nav = ({ isActive }) =>
    `flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'border border-[hsl(var(--neon-comercial))] bg-[hsl(var(--neon-comercial)/.10)] font-medium text-[hsl(var(--neon-comercial))]'
        : 'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const expanded = isOpen || isMobile;

  const menu = (key, Icon, label, children) => (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-expanded={openMenus[key]}
        className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground ${
          !expanded ? 'justify-center' : ''
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {expanded && label}
        </span>
        {expanded && (
          <ChevronDown className={`h-4 w-4 transition-transform ${
            openMenus[key] ? 'rotate-180' : ''
          }`} />
        )}
      </button>

      {openMenus[key] && expanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {children}
        </div>
      )}
    </div>
  );

  const item = (path, Icon, label) => (
    <NavLink to={path} className={nav}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ${
      isMobile
        ? (isOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full')
        : (isOpen ? 'w-60' : 'w-20')
    }`}>
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--neon-comercial))]">
            <Store className="h-5 w-5 text-black" />
          </div>

          {expanded && (
            <div className="leading-tight">
              <div className="text-sm font-bold uppercase text-white">MÓDULO</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--neon-comercial))]">
                COMERCIAL
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2 py-4 text-sm font-medium">
        <ul className="space-y-1">
          <li>
            <NavLink to="/comercial/dashboard" end className={nav}>
              <PieChart className="h-4 w-4 shrink-0" />
              {expanded && 'Dashboard'}
            </NavLink>
          </li>

          <li>
            {menu('cadastros', PlusCircle, 'Cadastros', <>
              {item('/comercial/dashboard/cadastros/clientes', Users, 'Clientes')}
              {item('/comercial/dashboard/cadastros/fornecedores', Truck, 'Fornecedores')}
              {item('/comercial/dashboard/cadastros/produtos', Package, 'Produtos')}
            </>)}
          </li>

          <li>
            {menu('lancamentos', ArrowLeftRight, 'Lançamentos', <>
              {item('/comercial/dashboard/lancamentos/vendas', ShoppingCart, 'Vendas')}
              {item('/comercial/dashboard/lancamentos/despesas', Receipt, 'Despesas')}
              {item('/comercial/dashboard/lancamentos/custos', Wallet, 'Custos')}
              {item('/comercial/dashboard/lancamentos/investimentos', TrendingUp, 'Investimentos')}
            </>)}
          </li>

          <li>
            {menu('consultas', Search, 'Consultas', <>
              {item('/comercial/dashboard/consultas/vendas', ShoppingCart, 'Vendas')}
              {item('/comercial/dashboard/consultas/despesas', Receipt, 'Despesas')}
              {item('/comercial/dashboard/consultas/custos', Wallet, 'Custos')}
              {item('/comercial/dashboard/consultas/investimentos', TrendingUp, 'Investimentos')}
              {item('/comercial/dashboard/consultas/contas-do-mes', Wallet, 'Contas do Mês')}
              {item('/comercial/dashboard/consultas/fluxo-de-caixa', TrendingUp, 'Fluxo de Caixa')}
            </>)}
          </li>
        </ul>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border p-2">
        <NavLink to="/modules" className={nav}>
          <Building2 className="h-4 w-4 shrink-0" />
          {expanded && 'Módulos'}
        </NavLink>

        <button
          type="button"
          onClick={signOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {expanded && 'Sair'}
        </button>
      </div>
    </aside>
  );
}
