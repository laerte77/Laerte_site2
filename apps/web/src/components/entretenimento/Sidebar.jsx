import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Gamepad2, 
    Settings, 
    List, 
    PlusCircle, 
    PieChart, 
    ChevronDown, 
    Trophy, 
    ArrowLeftRight, 
    LogOut, 
    Building2,
    Search,
    Shirt
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function Sidebar({ isOpen, setOpen, isMobile }) {
    const [openMenus, setOpenMenus] = useState({ 
        cadastros: true, 
        lancamentos: false, 
        coletes: false, 
        consultas: false, 
        relatorios: false 
    });
    const { signOut } = useAuth();

    const toggleMenu = (menu) => {
        setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.3)] ${
            isActive
                ? 'bg-[hsl(var(--neon-entretenimento)/0.15)] text-[hsl(var(--neon-entretenimento))] font-medium border border-[hsl(var(--neon-entretenimento)/0.5)]'
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
            <div className="h-16 border-b border-border flex items-center px-4 justify-between bg-[hsl(var(--neon-entretenimento)/0.05)]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-entretenimento))] to-red-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsl(var(--neon-entretenimento)/0.5)]">
                        <Gamepad2 size={24} className="text-white" />
                    </div>
                    <span className={`font-bold text-lg text-foreground tracking-wide transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        ENTRETENIMENTO
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
                <div className="mb-6 space-y-1">
                    <NavLink to="/entretenimento/dashboard" end className={navLinkClass}>
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
                            <Settings size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-entretenimento))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Cadastros
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.cadastros ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.cadastros && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/entretenimento/dashboard/cadastros/players" className={navLinkClass}><List size={16} /><span>Players</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/cadastros/jogadores" className={navLinkClass}><List size={16} /><span>Jogadores</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/cadastros/participantes" className={navLinkClass}><List size={16} /><span>Participantes</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/cadastros/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/cadastros/organizadores" className={navLinkClass}><List size={16} /><span>Organizadores</span></NavLink>
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
                            <Trophy size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-entretenimento))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Lançamentos
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.lancamentos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.lancamentos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/entretenimento/dashboard/lancamentos/partidas" className={navLinkClass}><ArrowLeftRight size={16} /><span>Partidas</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/lancamentos/artilharia" className={navLinkClass}><List size={16} /><span>Artilharia</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/lancamentos/contribuicoes" className={navLinkClass}><List size={16} /><span>Contribuições</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/lancamentos/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Coletes */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('coletes')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <Shirt size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-entretenimento))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Coletes
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.coletes ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.coletes && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/entretenimento/dashboard/coletes/cadastro" className={navLinkClass}><PlusCircle size={16} /><span>Cadastro</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/coletes/consulta" className={navLinkClass}><Search size={16} /><span>Consulta</span></NavLink>
                        </div>
                    )}
                </div>

                {/* Consultas / Relatórios */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleMenu('relatorios')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <Search size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-entretenimento))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Consultas & Relatórios
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.relatorios ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.relatorios && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/entretenimento/dashboard/relatorios/confrontos" className={navLinkClass}><List size={16} /><span>Confrontos</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/relatorios/artilharia" className={navLinkClass}><List size={16} /><span>Ranking Artilharia</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/consultas/contribuicoes" className={navLinkClass}><List size={16} /><span>Contribuições</span></NavLink>
                            <NavLink to="/entretenimento/dashboard/consultas/despesas" className={navLinkClass}><List size={16} /><span>Despesas</span></NavLink>
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