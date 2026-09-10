import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function ModuleCard({ title, description, icon: Icon, link, neonClass, iconColorClass }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full"
    >
      <Card 
        onClick={() => navigate(link)}
        className={`h-full relative cursor-pointer overflow-hidden border-2 bg-card/60 backdrop-blur-md transition-all duration-300 shadow-[0_0_15px_var(--neon-shadow-color)] hover:shadow-[0_0_30px_var(--neon-shadow-color)] hover:bg-card/80 ${neonClass} group p-2`}
      >
        <CardHeader className="pb-4">
          <motion.div 
            className={`mb-6 inline-flex items-center justify-center rounded-xl p-4 bg-background/50 shadow-[0_0_15px_var(--neon-shadow-color)] group-hover:shadow-[0_0_25px_var(--neon-shadow-color)] ${iconColorClass}`}
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Icon className="h-[64px] w-[64px] sm:h-[80px] sm:w-[80px] transition-transform duration-300" />
          </motion.div>
          <CardTitle className="text-2xl font-bold text-white tracking-wide">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-[hsl(var(--text-secondary))] text-lg leading-relaxed flex-1">
            {description}
          </p>
          <div className={`font-semibold flex items-center gap-2 ${iconColorClass} group-hover:underline underline-offset-4 decoration-2 transition-all`}>
            Acessar <span className="text-xl leading-none">&rarr;</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}