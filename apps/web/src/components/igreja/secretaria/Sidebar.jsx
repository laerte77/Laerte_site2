import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
    Church, 
    Settings, 
    List, 
    PlusCircle, 
    PieChart, 
    Users, 
    ChevronDown, 
    BookOpen, 
    ArrowLeftRight, 
    Search, 
    ClipboardSignature,
    UserCheck,
    Contact,
    Briefcase,
    BookUser,
    Heart,
    GraduationCap,
    UserPlus,
    LogOut,
    Building2,
    DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function Sidebar({ isOpen, setOpen, isMobile, activeModule = "secretaria" }) {
    const [openMenus, setOpenMenus] = useState({ cadastros: true, lancamentos: false, relatorios: false, consultas: false });
    const { signOut } = useAuth();
    const location = useLocation();

    const toggleMenu = (menu) => {
        setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-gold)/0.3)] ${
            isActive
                ? 'bg-[hsl(var(--neon-gold)/0.15)] text-[hsl(var(--neon-gold))] font-medium border border-[hsl(var(--neon-gold)/0.5)]'
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
            <div className="h-16 border-b border-border flex items-center px-4 justify-between bg-[hsl(var(--neon-gold)/0.05)]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-gold))] to-amber-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsl(var(--neon-gold)/0.5)]">
                        <Church size={24} className="text-white" />
                    </div>
                    <span className={`font-bold text-lg text-foreground tracking-wide transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        IGREJA <span className="text-[hsl(var(--neon-gold))] block text-xs tracking-widest uppercase">Secretaria</span>
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
                
                {/* Module Switcher inside nav for mobile/desktop harmony */}
                <div className="mb-6 space-y-1 pb-4 border-b border-border/50">
                    <Link to="/igreja/tesouraria" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-gold)/0.3)] text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent`}>
                        <DollarSign size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`transition-opacity duration-300 whitespace-nowrap ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Tesouraria
                        </span>
                    </Link>
                    <Link to="/igreja/secretaria" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group hover:shadow-[0_0_15px_hsl(var(--neon-gold)/0.3)] bg-[hsl(var(--neon-gold)/0.15)] text-[hsl(var(--neon-gold))] font-medium border border-[hsl(var(--neon-gold)/0.5)]`}>
                        <ClipboardSignature size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`transition-opacity duration-300 whitespace-nowrap ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            Secretaria
                        </span>
                    </Link>
                </div>

                <div className="mb-6">
                    <NavLink to="/igreja/secretaria" end className={navLinkClass}>
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
                            <PlusCircle size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-gold))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Cadastros
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.cadastros ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.cadastros && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/igreja/secretaria/cadastros/membros" className={navLinkClass}><UserPlus size={16} /><span>Membros</span></NavLink>
                            <NavLink to="/igreja/secretaria/cadastros/funcoes" className={navLinkClass}><BookUser size={16} /><span>Funções</span></NavLink>
                            <NavLink to="/igreja/secretaria/cadastros/cargos" className={navLinkClass}><Briefcase size={16} /><span>Cargos</span></NavLink>
                            <NavLink to="/igreja/secretaria/cadastros/conjuntos" className={navLinkClass}><Users size={16} /><span>Conjuntos</span></NavLink>
                            <NavLink to="/igreja/secretaria/cadastros/classes" className={navLinkClass}><GraduationCap size={16} /><span>Classes</span></NavLink>
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
                            <ArrowLeftRight size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-gold))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Lançamentos
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.lancamentos ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.lancamentos && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/igreja/secretaria/lancamentos/casamentos" className={navLinkClass}><Heart size={16} /><span>Casamentos</span></NavLink>
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
                            <Search size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-gold))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Consultas
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.consultas ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.consultas && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/igreja/secretaria/consultas/membros" className={navLinkClass}><UserCheck size={16} /><span>Membros</span></NavLink>
                            <NavLink to="/igreja/secretaria/consultas/dirigentes-conjunto" className={navLinkClass}><Contact size={16} /><span>Dirigentes/Conj.</span></NavLink>
                            <NavLink to="/igreja/secretaria/consultas/membros-conjunto" className={navLinkClass}><Users size={16} /><span>Membros/Conj.</span></NavLink>
                            <NavLink to="/igreja/secretaria/consultas/membros-cargo" className={navLinkClass}><Briefcase size={16} /><span>Membros/Cargo</span></NavLink>
                            <NavLink to="/igreja/secretaria/consultas/membros-funcao" className={navLinkClass}><BookUser size={16} /><span>Membros/Função</span></NavLink>
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
                            <PieChart size={20} className="flex-shrink-0 group-hover:text-[hsl(var(--neon-gold))] transition-colors" />
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                Relatórios
                            </span>
                        </div>
                        {isOpen && <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.relatorios ? 'rotate-180' : ''}`} />}
                    </button>
                    {openMenus.relatorios && isOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-border/50 space-y-1 animate-in slide-in-from-top-2">
                            <NavLink to="/igreja/secretaria/relatorios/estatistico" className={navLinkClass}><PieChart size={16} /><span>Estatístico</span></NavLink>
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