import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Scissors, 
    Settings, 
    List, 
    PlusCircle, 
    PieChart, 
    ChevronDown, 
    Users, 
    ArrowLeftRight, 
    LogOut, 
    Building2,
    Search,
    ShoppingCart,
    Briefcase,
    FileText,
    CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function Sidebar({ isOpen, setOpen, isMobile }) {
    const [openMenus, setOpenMenus] = useState({ 
        cadastros: true, 
        lancamentos: false, 
        consultas: false, 
        relatorios: false 
    });
    const { signOut } = useAuth();

    const toggleMenu = (menu) => {
        setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.3)] ${
            isActive
                ? 'bg-[hsl(var(--neon-barbearia)/0.15)] text-[hsl(var(--neon-barbearia))] font-medium border border-[hsl(var(--neon-barbearia)/0.5)]'
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
            <div className="h-16 border-b border-border flex items-center px-4 justify-between bg-[hsl(var(--neon-barbearia)/0.05)]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-barbearia))] to-amber-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsl(var(--neon-barbearia)/0.5)]">
                        <Scissors size={24} className="text-primary-foreground" />
                    </div>
                    <span className={`font-bold text-lg text-foreground tracking-wide transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        BARBEARIA
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
                <div className="mb-6 space-y-1">
                    <NavLink to="/barbearia/dashboard" end className={navLinkClass}>
                        <PieChart size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`transition-opacity duration-300 whitespace-nowrap ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Dashboard
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
                            <PlusCircle size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-barbearia))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Cadastros
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.cadastros ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.cadastros && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/barbearia/dashboard/cadastros/clientes" className={navLinkClass}><Users size={16} /><span>Clientes</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/produtos" className={navLinkClass}><ShoppingCart size={16} /><span>Produtos</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/servicos" className={navLinkClass}><Briefcase size={16} /><span>Serviços</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/barbeiros" className={navLinkClass}><Users size={16} /><span>Barbeiros</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/tipos-corte" className={navLinkClass}><Scissors size={16} /><span>Tipos de Corte</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/tipos-planos" className={navLinkClass}><FileText size={16} /><span>Tipos de Planos</span></NavLink>
                            <NavLink to="/barbearia/dashboard/cadastros/tipos-despesa" className={navLinkClass}><List size={16} /><span>Tipos de Despesa</span></NavLink>
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
                            <ArrowLeftRight size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-barbearia))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Lançamentos
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.lancamentos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.lancamentos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/barbearia/dashboard/lancamentos/cortes" className={navLinkClass}><Scissors size={16} /><span>Cortes</span></NavLink>
                            <NavLink to="/barbearia/dashboard/lancamentos/servicos" className={navLinkClass}><Briefcase size={16} /><span>Serviços</span></NavLink>
                            <NavLink to="/barbearia/dashboard/lancamentos/vendas" className={navLinkClass}><ShoppingCart size={16} /><span>Vendas</span></NavLink>
                            <NavLink to="/barbearia/dashboard/lancamentos/assinaturas" className={navLinkClass}><FileText size={16} /><span>Assinaturas</span></NavLink>
                            <NavLink to="/barbearia/dashboard/lancamentos/debitos" className={navLinkClass}><CreditCard size={16} /><span>Débitos (Fiado)</span></NavLink>
                            <NavLink to="/barbearia/dashboard/lancamentos/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Consultas */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('consultas')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <Search size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-barbearia))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Consultas
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.consultas ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.consultas && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/barbearia/dashboard/consultas/assinaturas" className={navLinkClass}><FileText size={16} /><span>Assinaturas Ativas</span></NavLink>
                            <NavLink to="/barbearia/dashboard/consultas/debitos" className={navLinkClass}><CreditCard size={16} /><span>Clientes em Débito</span></NavLink>
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