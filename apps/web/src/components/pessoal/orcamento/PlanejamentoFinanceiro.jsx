import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart as PieChartIcon } from 'lucide-react';
import PeriodFilter from './PeriodFilter';
import EntradaCard from './EntradaCard';
import DespesaCard from './DespesaCard';
import SaldoCard from './SaldoCard';
import DistribuicaoCard from './DistribuicaoCard';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Loader2 } from 'lucide-react';

export default function PlanejamentoFinanceiro() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const [periodFilter, setPeriodFilter] = useState({
        periodType: 'mes',
        month: currentMonth,
        year: currentYear,
        quinzena: 1,
        dateRange: { from: null, to: null }
    });

    const { data, loading, error, refetch } = useFinancialData(periodFilter);

    if (error) {
        return <div className="p-6 text-center text-destructive">Erro ao carregar dados: {error}</div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 border-b border-border/50 pb-6">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--neon-pessoal))]/10 flex items-center justify-center glow-pessoal">
                    <PieChartIcon className="w-6 h-6 text-[hsl(var(--neon-pessoal))]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">Planejamento Financeiro</h1>
                    <p className="text-muted-foreground text-sm">Acompanhe e projete suas finanças pessoais</p>
                </div>
            </div>

            <PeriodFilter periodFilter={periodFilter} setPeriodFilter={setPeriodFilter} />

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--neon-pessoal))]" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EntradaCard 
                        realValue={data.entradasReais} 
                        prevValue={data.entradasPrevistas} 
                        periodFilter={periodFilter} 
                        onUpdate={refetch} 
                    />
                    <DespesaCard 
                        realValue={data.despesasReais} 
                        prevValue={data.despesasPrevistas} 
                    />
                    <SaldoCard 
                        entradasPrev={data.entradasPrevistas} 
                        despesasPrev={data.despesasPrevistas} 
                        entradasReais={data.entradasReais} 
                        despesasReais={data.despesasReais} 
                    />
                    <DistribuicaoCard 
                        saldoPrev={data.entradasPrevistas - data.despesasPrevistas} 
                        saldoReal={data.entradasReais - data.despesasReais} 
                        distribuicao={data.distribuicao}
                        onUpdate={refetch}
                    />
                </div>
            )}
        </motion.div>
    );
}