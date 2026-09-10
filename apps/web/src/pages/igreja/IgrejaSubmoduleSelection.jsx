import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, BookUser, ArrowLeft, AlertCircle, LogOut } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SubmoduleCard = ({ icon: Icon, title, description, path }) => {
    const navigate = useNavigate();
    const hex = '#FFD700'; // Gold Neon for Igreja
    
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`h-full bg-[hsl(var(--card-bg))]/60 backdrop-blur-xl rounded-2xl p-8 lg:p-10 border-2 transition-all duration-300 flex flex-col items-start text-left group shadow-[0_0_15px_${hex}] hover:shadow-[0_0_30px_${hex}] hover:bg-card/80 cursor-pointer`}
            style={{ borderColor: hex }}
            onClick={() => navigate(path)}
        >
            <motion.div 
                className={`p-5 rounded-2xl bg-background/60 mb-8 shadow-[0_0_15px_${hex}] transition-transform`}
                style={{ color: hex }}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <Icon className="h-[64px] w-[64px] sm:h-[80px] sm:w-[80px]" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 text-[hsl(var(--text-primary))]">{title}</h2>
            <p className="text-[hsl(var(--text-secondary))] text-lg mb-10 flex-1">{description}</p>
            <div className="font-semibold flex items-center gap-3 text-xl group-hover:underline underline-offset-4 decoration-2 transition-all" style={{ color: hex }}>
                Acessar <span>&rarr;</span>
            </div>
        </motion.div>
    );
};

const IgrejaSubmoduleSelection = () => {
    const navigate = useNavigate();
    const { canAccessModule, signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const allSubmodules = [
        { id: 'igreja:tesouraria', icon: DollarSign, title: 'Tesouraria', description: 'Gestão financeira, controle de entradas, saídas e dízimos.', path: '/igreja/tesouraria' },
        { id: 'igreja:secretaria', icon: BookUser, title: 'Secretaria', description: 'Administração de membros, funções, conjuntos e relatórios.', path: '/igreja/secretaria' },
    ];

    // Filter submodules based on user permissions
    const allowedSubmodules = allSubmodules.filter(mod => canAccessModule(mod.id));

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <>
            <Helmet>
                <title>Módulo Igreja - Seleção</title>
                <meta name="description" content="Escolha entre Tesouraria e Secretaria." />
            </Helmet>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#0F172A] py-20 px-6 md:px-10 relative overflow-hidden flex flex-col justify-center"
            >
                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#00D9FF]/5 to-[#FFD700]/5 pointer-events-none" />
                
                {/* Ambient Blur */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-white/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="container mx-auto relative z-10 flex flex-col items-center">
                    {/* Top Buttons */}
                    <div className="absolute top-0 left-0 z-50">
                        <Button 
                            variant="ghost" 
                            onClick={() => navigate('/modules')} 
                            className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar aos Módulos
                        </Button>
                    </div>

                    <div className="absolute top-0 right-0 z-50">
                        <Button 
                            variant="outline"
                            onClick={handleLogout}
                            className="border-[#FFD700]/50 text-[#FFD700] bg-[#0F172A]/50 backdrop-blur hover:bg-[#FFD700]/10 hover:text-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.8)] transition-all duration-300"
                        >
                            <LogOut className="mr-2 h-4 w-4" /> LOG-OFF
                        </Button>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-center mb-16 pt-10 flex flex-col items-center"
                    >
                        {/* Ministério Plantar Logo with Pulsing Glow Animation */}
                        <motion.div
                            animate={{ 
                                filter: [
                                    'drop-shadow(0 0 10px rgba(255,215,0,0.5))', 
                                    'drop-shadow(0 0 25px rgba(255,215,0,1))', 
                                    'drop-shadow(0 0 10px rgba(255,215,0,0.5))'
                                ],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 2, 
                                ease: "easeInOut" 
                            }}
                            className="inline-flex justify-center items-center mb-6"
                        >
                            <img 
                                src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/3b5702f81875d539ff0ae6db77553b0a.png" 
                                alt="Ministério Plantar Logo" 
                                className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] object-contain"
                            />
                        </motion.div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[hsl(var(--text-primary))] drop-shadow-lg">
                            Módulo Igreja
                        </h1>
                        <p className="text-xl md:text-2xl text-[hsl(var(--text-secondary))] drop-shadow-md">
                            Selecione a área que deseja gerenciar
                        </p>
                    </motion.div>

                    {allowedSubmodules.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-lg text-center flex flex-col items-center shadow-lg"
                        >
                            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-3">Acesso Restrito</h2>
                            <p className="text-red-200 mb-6">
                                Você não possui permissão para acessar os sub-módulos desta área (Tesouraria ou Secretaria). Solicite a liberação ao administrador.
                            </p>
                            <Button onClick={() => navigate('/modules')} variant="outline" className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white">
                                Voltar
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 w-full max-w-5xl"
                        >
                            {allowedSubmodules.map((mod) => (
                                <motion.div key={mod.path} variants={itemVariants} className="h-full">
                                    <SubmoduleCard {...mod} />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </>
    );
};

export default IgrejaSubmoduleSelection;