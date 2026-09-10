import React from 'react';
import { User, Printer, Church, Gamepad2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import ModuleCard from '@/components/ModuleCard';
import { motion } from 'framer-motion';

export default function HomePage() {
  const modules = [
    {
      title: 'Pessoal',
      description: 'Gestão de finanças pessoais, orçamentos e metas.',
      icon: User,
      link: '/pessoal/dashboard',
      neonClass: 'border-[hsl(var(--neon-blue))]',
      iconColorClass: 'text-[hsl(var(--neon-blue))]',
    },
    {
      title: 'LM Impressões',
      description: 'Controle de serviços, estoque e clientes.',
      icon: Printer,
      link: '/lm-impressoes/dashboard',
      neonClass: 'border-[hsl(var(--neon-cyan))]',
      iconColorClass: 'text-[hsl(var(--neon-cyan))]',
    },
    {
      title: 'Igreja',
      description: 'Tesouraria, secretaria e gestão de membros.',
      icon: Church,
      link: '/igreja',
      neonClass: 'border-[hsl(var(--neon-gold))]',
      iconColorClass: 'text-[hsl(var(--neon-gold))]',
    },
    {
      title: 'Entretenimento',
      description: 'Gestão de partidas, jogadores e campeonatos.',
      icon: Gamepad2,
      link: '/entretenimento/dashboard',
      neonClass: 'border-[hsl(var(--neon-orange))]',
      iconColorClass: 'text-[hsl(var(--neon-orange))]',
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <>
      <Helmet>
        <title>SistemaPro - Painel Principal</title>
        <meta name="description" content="Acesse seus módulos de gestão." />
      </Helmet>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="min-h-screen bg-gradient-professional flex flex-col"
      >
        <Header />
        
        <main className="flex-1 container mx-auto px-6 py-16 md:py-20">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Selecione o <span className="text-[hsl(var(--neon-cyan))] animate-pulse-custom">Módulo</span>
            </h1>
            <p className="text-lg md:text-xl text-[hsl(var(--text-secondary))] max-w-3xl mx-auto drop-shadow-md">
              Escolha qual área do sistema você deseja acessar. Cada módulo oferece ferramentas específicas para suas necessidades.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10"
          >
            {modules.map((mod, index) => (
              <motion.div key={index} variants={itemVariants} className="h-full" style={{ '--neon-shadow-color': mod.iconColorClass.replace('text-[', '').replace(']', '') }}>
                <ModuleCard {...mod} />
              </motion.div>
            ))}
          </motion.div>
        </main>
      </motion.div>
    </>
  );
}