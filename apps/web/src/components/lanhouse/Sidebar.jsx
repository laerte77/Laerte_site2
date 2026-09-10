import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    MonitorPlay, 
    Settings, 
    List, 
    PlusCircle, 
    PieChart, 
    ChevronDown, 
    DollarSign, 
    ArrowLeftRight, 
    LogOut, 
    Building2,
    Calculator,
    ShoppingCart,
    PackageSearch,
    CheckSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function Sidebar({ isOpen, setOpen, isMobile }) {
    const [openMenus, setOpenMenus] = useState({ 
        cadastros: true, 
        lancamentos: false, 
        custos: false, 
        pedidos: false, 
        estoques: false,
        relatorios: false 
    });
    const { signOut } = useAuth();

    const toggleMenu = (menu) => {
        setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)] ${
            isActive
                ? 'bg-[hsl(var(--neon-cyan)/0.15)] text-[hsl(var(--neon-cyan))] font-medium border border-[hsl(var(--neon-cyan)/0.5)]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
        }`;

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-40 bg-card/95 backdrop-blur-md border-r border-border transition-all duration-300 flex flex-col shadow-2xl ${
                isOpen ? 'w-64 translate-x-0' : (isMobile ? '-translate-x-full' : 'w-20 translate-x-0')
            }`}
        >
            {/* Header / Logo */}
            <div className="h-16 border-b border-border flex items-center px-4 justify-between bg-[hsl(var(--neon-cyan)/0.05)]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-cyan))] to-teal-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.5)]">
                        <MonitorPlay size={24} className="text-white" />
                    </div>
                    <span className={`font-bold text-lg text-foreground tracking-wide transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        LM IMPRESSÕES
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
                <div className="mb-6 space-y-1">
                    <NavLink to="/lm-impressoes/dashboard" end className={navLinkClass}>
                        <PieChart size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`transition-opacity duration-300 whitespace-nowrap ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Dashboard
                        </span>
                    </NavLink>
                    <NavLink to="/lm-impressoes/dashboard/despesas-previstas-mes" className={navLinkClass}>
                        <CheckSquare size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`transition-opacity duration-300 whitespace-nowrap ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Contas do Mês
                        </span>
                    </NavLink>
                </div>

                {/* Cadastros */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('cadastros')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <PlusCircle size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Cadastros
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.cadastros ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.cadastros && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/cadastros/clientes" className={navLinkClass}><List size={16} /><span>Clientes</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/cadastros/servicos" className={navLinkClass}><List size={16} /><span>Serviços</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/cadastros/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/cadastros/tipos-folha" className={navLinkClass}><List size={16} /><span>Tipos de Folha</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Lançamentos */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('lancamentos')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <ArrowLeftRight size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Lançamentos
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.lancamentos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.lancamentos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/servicos" className={navLinkClass}><List size={16} /><span>Serviços</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/folhas" className={navLinkClass}><List size={16} /><span>Folhas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/despesas-previstas" className={navLinkClass}><CheckSquare size={16} /><span>Desp. Previstas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/clientes-debito" className={navLinkClass}><List size={16} /><span>Clientes Débito</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/dizimos-ofertas" className={navLinkClass}><DollarSign size={16} /><span>Dízimos/Ofertas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/lancamentos/metas" className={navLinkClass}><CheckSquare size={16} /><span>Metas</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Custos e Lucros */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('custos')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <Calculator size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Custos & Lucros
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.custos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.custos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/custos/lancamentos" className={navLinkClass}><List size={16} /><span>Lançar Custos</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/custos/controle" className={navLinkClass}><PieChart size={16} /><span>Controle de Custos</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/custos/relatorio-custos" className={navLinkClass}><PieChart size={16} /><span>Relatório Categorias</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/custos/relatorio-lucro" className={navLinkClass}><DollarSign size={16} /><span>Lucro Mensal</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Pedidos */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('pedidos')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingCart size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Pedidos
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.pedidos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.pedidos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/pedidos/cadastro" className={navLinkClass}><PlusCircle size={16} /><span>Realizar Pedido</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/pedidos/consulta" className={navLinkClass}><List size={16} /><span>Consultar Pedidos</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Estoques */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('estoques')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <PackageSearch size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Estoques
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.estoques ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.estoques && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/estoques/inicial" className={navLinkClass}><List size={16} /><span>Estoque Inicial</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/estoques" className={navLinkClass}><List size={16} /><span>Estoque Consolidado</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Relatórios */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('relatorios')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <PieChart size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-cyan))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Relatórios
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.relatorios ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.relatorios && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/lm-impressoes/dashboard/relatorios/servicos" className={navLinkClass}><List size={16} /><span>Serviços</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/relatorios/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/relatorios/despesas-previstas" className={navLinkClass}><CheckSquare size={16} /><span>Despesas Previstas</span></NavLink>
                            <NavLink to="/lm-impressoes/dashboard/relatorios/clientes-debito" className={navLinkClass}><List size={16} /><span>Clientes Débito</span></NavLink>
                        </div>
                    )}
                </div>
            </nav>

            <div className="p-4 border-t border-border bg-card">
                 <NavLink to="/modules" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-2 ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}>
                    <Building2 size={20} />
                    <span className={`font-medium ${!isOpen && !isMobile ? 'hidden' : 'block'}`}>Módulos</span>
                </NavLink>
                <button 
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors ${!isOpen && !isMobile ? 'justify-center px-0' : ''}`}
                >
                    <LogOut size={20} />
                    <span className={`font-medium ${!isOpen && !isMobile ? 'hidden' : 'block'}`}>Sair</span>
                </button>
            </div>
        </aside>
    );
}