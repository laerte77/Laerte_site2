import React from 'react';
import { motion } from 'framer-motion';
import { User, Printer, Church, Gamepad2, Scissors, LogOut, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';

const modules = [
  {
    title: 'Finanças Pessoais',
    description: 'Gestão completa das suas finanças, metas e investimentos.',
    icon: User,
    path: '/pessoal/dashboard',
    colorClass: 'blue',
    hex: 'hsl(var(--neon-blue))'
  },
  {
    title: 'LM Impressões',
    description: 'Controle de serviços, estoque e clientes da lan house.',
    icon: Printer,
    path: '/lm-impressoes/dashboard',
    colorClass: 'cyan',
    hex: 'hsl(var(--neon-cyan))'
  },
  {
    title: 'Igreja',
    description: 'Tesouraria, secretaria e gestão integrada de membros.',
    icon: Church,
    path: '/igreja',
    colorClass: 'gold',
    hex: 'hsl(var(--neon-gold))'
  },
  {
    title: 'Entretenimento',
    description: 'Gestão de partidas, jogadores e estatísticas esportivas.',
    icon: Gamepad2,
    path: '/entretenimento/dashboard',
    colorClass: 'orange',
    hex: 'hsl(var(--neon-orange))'
  },
  {
    title: 'Barbearia Brothers',
    description: 'Agenda, controle de clientes, serviços e finanças.',
    icon: Scissors,
    path: '/barbearia/dashboard',
    colorClass: 'gold',
    hex: 'hsl(var(--neon-gold))'
  }
];

export default function ModuleSelectionScreen() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

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
        <title>Seleção de Módulos - SistemaPro</title>
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

        <div className="container mx-auto relative z-10">
          {/* LOG-OFF Button */}
          <div className="absolute top-0 right-0 z-50">
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="border-[#00D9FF]/50 text-[#00D9FF] bg-[#0F172A]/50 backdrop-blur hover:bg-[#00D9FF]/10 hover:text-[#00D9FF] hover:shadow-[0_0_15px_rgba(0,217,255,0.8)] transition-all duration-300"
            >
              <LogOut className="mr-2 h-4 w-4" /> LOG-OFF
            </Button>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-20 pt-10"
          >
            {/* Lightning Pulse Icon */}
            <motion.div
              animate={{ 
                filter: [
                  'drop-shadow(0 0 10px rgba(0,217,255,0.5))', 
                  'drop-shadow(0 0 25px rgba(0,217,255,1))', 
                  'drop-shadow(0 0 10px rgba(0,217,255,0.5))'
                ],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2, 
                ease: "easeInOut" 
              }}
              className="inline-flex justify-center items-center mb-6 text-[#00D9FF]"
            >
              <Zap size={64} className="fill-[#00D9FF]/20" strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[hsl(var(--text-primary))] drop-shadow-lg">
              Selecione um Módulo
            </h1>
            <p className="text-xl md:text-2xl text-[hsl(var(--text-secondary))] drop-shadow-md">
              Escolha o sistema que deseja gerenciar
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 max-w-7xl mx-auto"
          >
            {modules.map((mod) => (
              <motion.div
                key={mod.path}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full"
              >
                <Link to={mod.path} className="block h-full">
                  <div 
                    className={`h-full bg-[hsl(var(--card-bg))]/60 backdrop-blur-xl rounded-2xl p-8 lg:p-10 border-2 transition-all duration-300 flex flex-col items-start text-left group shadow-[0_0_15px_${mod.hex}] hover:shadow-[0_0_30px_${mod.hex}] hover:bg-card/80 border-[${mod.hex}]`}
                    style={{ borderColor: mod.hex }}
                  >
                    <motion.div 
                      className={`p-5 rounded-2xl bg-background/60 mb-8 shadow-[0_0_15px_${mod.hex}] transition-transform`}
                      style={{ color: mod.hex }}
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <mod.icon className="h-[64px] w-[64px] sm:h-[80px] sm:w-[80px]" />
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-4 text-[hsl(var(--text-primary))]">{mod.title}</h2>
                    <p className="text-[hsl(var(--text-secondary))] text-lg mb-10 flex-1">{mod.description}</p>
                    <div className="font-semibold flex items-center gap-3 text-xl group-hover:underline underline-offset-4 decoration-2 transition-all" style={{ color: mod.hex }}>
                      Acessar <span>&rarr;</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}