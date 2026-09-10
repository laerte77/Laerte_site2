import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Users, DollarSign, TrendingUp } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value }) => (
    <div className="bg-gray-900/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-xl p-5 shadow-lg shadow-[#D4AF37]/5 hover:shadow-[#D4AF37]/20 transition-all">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#D4AF37] to-[#B5952F] shadow-md">
            <Icon className="w-6 h-6 text-black" />
        </div>
        <div className="mt-4">
            <p className="text-sm text-[#A9A9A9] font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-1">{value}</p>
        </div>
    </div>
);

const DashboardHome = () => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[#D4AF37] uppercase tracking-widest">Dashboard Brothers</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Scissors} title="Cortes no Mês" value="0" />
                <StatCard icon={Users} title="Clientes" value="0" />
                <StatCard icon={DollarSign} title="Faturamento" value="R$ 0,00" />
                <StatCard icon={TrendingUp} title="Planos Ativos" value="0" />
            </div>

            <div className="bg-gray-900/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Scissors className="w-16 h-16 text-[#D4AF37]/50 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Bem-vindo à Barbearia Brothers</h2>
                <p className="text-[#A9A9A9] max-w-md">Utilize o menu lateral para cadastrar seus clientes, serviços e gerenciar sua barbearia.</p>
            </div>
        </motion.div>
    );
};

export default DashboardHome;