import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Printer, Church, Gamepad2, ArrowRight, LogOut, Loader2, AlertCircle, Scissors, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';

const ModuleCard = ({ icon: Icon, title, description, path, onNavigate, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative p-8 card-base min-h-[200px] cursor-pointer group transition-smooth-300"
            onClick={() => onNavigate(path)}
        >
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--cyan-primary))]/20 group-hover:bg-[hsl(var(--cyan-primary))]/30 transition-smooth-300 group-hover:shadow-cyan-lg">
                        <Icon className="w-16 h-16 text-[hsl(var(--cyan-primary))]" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 font-['Poppins']">{title}</h3>
                <p className="text-[hsl(var(--text-secondary))] mb-4 flex-grow font-['Inter'] leading-relaxed">{description}</p>
                <div className="flex items-center text-[hsl(var(--cyan-primary))] font-semibold group-hover:gap-3 transition-all duration-300 gap-2 font-['Inter']">
                    <span>Acessar</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
            </div>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--cyan-primary))]/0 to-[hsl(var(--cyan-primary))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </motion.div>
    );
};

const MODULE_CONFIG = {
    'pessoal': { 
        id: 'pessoal', 
        name: 'Finanças Pessoais', 
        icon: User, 
        title: 'Finanças Pessoais', 
        description: 'Gerencie suas finanças pessoais, investimentos, metas e acompanhe sua leitura bíblica.', 
        path: '/pessoal/dashboard' 
    },
    'lm-impressoes': { 
        id: 'lm-impressoes', 
        name: 'Lan House', 
        icon: Printer, 
        title: 'LM Impressões', 
        description: 'Controle completo de serviços, despesas, clientes e estoque da sua gráfica.', 
        path: '/lm-impressoes/dashboard' 
    },
    'igreja': { 
        id: 'igreja', 
        name: 'Igreja', 
        icon: Church, 
        title: 'Igreja', 
        description: 'Sistema integrado para gestão financeira (Tesouraria) e administrativa (Secretaria) da igreja.', 
        path: '/igreja' 
    },
    'entretenimento': { 
        id: 'entretenimento', 
        name: 'Entretenimento', 
        icon: Gamepad2, 
        title: 'Entretenimento', 
        description: 'Registre partidas, acompanhe estatísticas e gerencie contribuições de eventos esportivos.', 
        path: '/entretenimento/dashboard' 
    },
    'barbearia': { 
        id: 'barbearia', 
        name: 'Barbearia', 
        icon: Scissors, 
        title: 'Barbearia Brothers', 
        description: 'Gerenciamento completo de clientes, serviços, produtos e agenda da barbearia.', 
        path: '/barbearia/dashboard' 
    }
};

const ModuleSelection = () => {
    const navigate = useNavigate();
    const { isAdmin, canAccessModule, loading, signOut } = useAuth();

    const handleNavigation = (path) => {
        navigate(path);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cyan-primary))] via-[hsl(var(--dark-bg))] to-[hsl(var(--dark-bg))] flex items-center justify-center text-white">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--cyan-primary))] mb-4" />
                    <p className="text-lg text-[hsl(var(--text-secondary))] font-['Inter']">Carregando permissões...</p>
                </div>
            </div>
        );
    }

    const displayModuleKeys = Object.keys(MODULE_CONFIG).filter(modKey => canAccessModule(modKey));

    return (
        <>
            <Helmet>
                <title>Seleção de Módulos</title>
                <meta name="description" content="Escolha o módulo que deseja acessar." />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cyan-primary))] via-[hsl(var(--dark-bg))] to-[hsl(var(--dark-bg))] flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(var(--cyan-primary))]/10 rounded-full blur-3xl animate-pulse-custom"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--cyan-primary))]/10 rounded-full blur-3xl animate-pulse-custom" style={{ animationDelay: '1s' }}></div>
                </div>

                <Button 
                    variant="ghost" 
                    onClick={signOut} 
                    className="absolute top-4 right-4 text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]/80 hover:bg-[hsl(var(--destructive))]/10 focus-ring z-10"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                </Button>
                
                <div className="text-center mb-12 mt-12 z-10 px-4">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.6, type: 'spring' }}
                        className="inline-flex items-center justify-center w-20 h-20 bg-[hsl(var(--cyan-primary))]/20 rounded-2xl mb-6 animate-glow"
                    >
                        <Zap className="w-12 h-12 text-[hsl(var(--cyan-primary))]" />
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-4xl md:text-5xl font-extrabold text-gradient-cyan mb-3 font-['Poppins']"
                    >
                        Selecione um Módulo
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-lg text-[hsl(var(--text-secondary))] font-['Inter'] max-w-2xl mx-auto"
                    >
                        Escolha o sistema que deseja gerenciar
                    </motion.p>
                    {isAdmin && (
                        <motion.span 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                            className="inline-block mt-4 px-4 py-2 bg-[hsl(var(--cyan-primary))]/20 border border-[hsl(var(--cyan-primary))]/50 rounded-full text-xs text-[hsl(var(--cyan-primary))] uppercase tracking-widest font-bold font-['Inter']"
                        >
                            Modo Administrador
                        </motion.span>
                    )}
                </div>

                {displayModuleKeys.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-base p-8 max-w-lg text-center flex flex-col items-center z-10"
                    >
                        <AlertCircle className="w-16 h-16 text-[hsl(var(--destructive))] mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-3 font-['Poppins']">Acesso Restrito</h2>
                        <p className="text-[hsl(var(--text-secondary))] mb-6 font-['Inter']">
                            Nenhum módulo foi liberado para o seu perfil. Por favor, contate o administrador do sistema para configurar seus acessos.
                        </p>
                        <Button onClick={signOut} className="btn-destructive">
                            Voltar ao Login
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full max-w-7xl z-10 px-4">
                        {displayModuleKeys.map((modKey, index) => {
                            const modConfig = MODULE_CONFIG[modKey];
                            if (!modConfig) return null;
                            
                            return (
                                <ModuleCard 
                                    key={modKey} 
                                    {...modConfig} 
                                    onNavigate={handleNavigation}
                                    index={index}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default ModuleSelection;