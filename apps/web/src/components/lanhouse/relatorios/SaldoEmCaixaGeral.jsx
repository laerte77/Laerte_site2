import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Loader2, AlertCircle } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import NeonBorder from '@/components/ui/NeonBorder';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const SaldoEmCaixaGeral = ({ selectedMonth, selectedYear }) => {
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saldo, setSaldo] = useState(0);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                // Fetch ALL records WITHOUT date filtering
                const [servicosRes, despesasRes, dizimosRes] = await Promise.all([
                    getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_servicos', 'valor'),
                    getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_despesas', 'valor'),
                    getAccessibleDataQuery(user.id, isAdmin, 'lm_dizimos_ofertas', 'valor')
                ]);

                if (servicosRes.error) throw new Error(`Serviços: ${servicosRes.error.message}`);
                if (despesasRes.error) throw new Error(`Despesas: ${despesasRes.error.message}`);
                if (dizimosRes.error) throw new Error(`Dízimos/Ofertas: ${dizimosRes.error.message}`);

                const totalEntradas = (servicosRes.data || []).reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
                const totalDespesas = (despesasRes.data || []).reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
                const totalDizimosOfertas = (dizimosRes.data || []).reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

                // Formula: TODAS AS ENTRADAS - TODAS AS SAÍDAS - DÍZIMOS - OFERTAS = SALDO ACUMULADO TOTAL
                const saldoCalculado = totalEntradas - totalDespesas - totalDizimosOfertas;
                setSaldo(saldoCalculado);
            } catch (err) {
                console.error("Error fetching accumulated balance:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Component will only fetch on mount or if user changes, ignoring selectedMonth/Year
        fetchAllData();
    }, [user, isAdmin]);

    const isPositive = saldo >= 0;
    // Cyan/Blue styling as requested to match Lucro Operacional
    const colorClass = isPositive ? "from-blue-500 to-cyan-400" : "from-red-500 to-red-400";
    const valueColorClass = isPositive ? "text-blue-500" : "text-red-500";

    if (loading && saldo === 0) {
        return (
            <NeonBorder neonColor="lanhouse" className="h-full">
                <div className="p-6 flex items-center justify-center h-full min-h-[140px] rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--neon-lanhouse))]" />
                </div>
            </NeonBorder>
        );
    }

    if (error) {
        return (
            <NeonBorder neonColor="lanhouse" className="h-full">
                <div className="p-6 flex items-center gap-3 h-full min-h-[140px] rounded-xl border-red-500/30 bg-red-500/5">
                    <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                    <div className="flex flex-col">
                        <p className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-1">Erro ao carregar saldo</p>
                        <p className="text-xs text-red-500/80">{error}</p>
                    </div>
                </div>
            </NeonBorder>
        );
    }

    return (
        <NeonBorder neonColor="lanhouse" className="h-full">
            <motion.div 
                whileHover={{ y: -4 }}
                className="p-6 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px] transition-all duration-300"
            >
                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br blur-2xl pointer-events-none" style={{ backgroundImage: `var(--${colorClass})` }} />
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${colorClass} shadow-lg shrink-0`}>
                        {/* Kept the icon green as explicitly requested */}
                        <Banknote className="w-8 h-8 text-emerald-300 drop-shadow-sm" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[14px] md:text-[16px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5 leading-tight">Saldo em Caixa Geral</p>
                        <p className={`text-[32px] md:text-[40px] font-bold tracking-tight leading-none ${valueColorClass}`}>
                            <AnimatedCounter 
                                value={saldo} 
                                format={(v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                            />
                        </p>
                        <p className="text-[12px] md:text-[14px] text-muted-foreground mt-1 font-medium">Acumulado (Todos os períodos)</p>
                    </div>
                </div>
            </motion.div>
        </NeonBorder>
    );
};

export default SaldoEmCaixaGeral;