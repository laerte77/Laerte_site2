import React from'react';
import{motion}from'framer-motion';
import{Scissors,Users,DollarSign,TrendingUp}from'lucide-react';

const StatCard=({icon:Icon,title,value})=><div className="rounded-xl border border-[#D4AF37]/30 bg-gray-900/80 p-5 shadow-lg shadow-[#D4AF37]/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-[#D4AF37]/20 motion-reduce:transition-none motion-reduce:transform-none">
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B5952F] shadow-md">
  <Icon className="h-6 w-6 text-black" aria-hidden="true"/>
 </div>
 <div className="mt-4">
  <p className="text-sm font-medium uppercase tracking-wider text-[#A9A9A9]">{title}</p>
  <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
 </div>
</div>;

const DashboardHome=()=>(
 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-8 motion-reduce:transform-none">
  <h1 className="text-2xl font-bold uppercase tracking-widest text-[#D4AF37] sm:text-3xl">Dashboard Brothers</h1>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <StatCard icon={Scissors} title="Cortes no Mês" value="0"/>
   <StatCard icon={Users} title="Clientes" value="0"/>
   <StatCard icon={DollarSign} title="Faturamento" value="R$ 0,00"/>
   <StatCard icon={TrendingUp} title="Planos Ativos" value="0"/>
  </div>

  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-gray-900/80 p-6 text-center backdrop-blur-md sm:min-h-[300px] sm:p-8">
   <Scissors className="mb-4 h-14 w-14 text-[#D4AF37]/50 sm:h-16 sm:w-16" aria-hidden="true"/>
   <h2 className="mb-2 text-lg font-bold text-white sm:text-xl">Bem-vindo à Barbearia Brothers</h2>
   <p className="max-w-md text-sm text-[#A9A9A9] sm:text-base">Utilize o menu lateral para cadastrar seus clientes, serviços e gerenciar sua barbearia.</p>
  </div>
 </motion.div>
);

export default DashboardHome;
