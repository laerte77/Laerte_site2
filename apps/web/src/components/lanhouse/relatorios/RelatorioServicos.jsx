import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useIsMounted, withIsMountedCheck, handleSupabaseError } from '@/lib/errorHandlingUtils';
import { useToast } from '@/components/ui/use-toast';

const RelatorioServicos = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useIsMounted();
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Sorting chronologically or we can sort by service name as requested
            const { data, error } = await supabase
                .from('lm_lanc_servicos')
                .select('*, lm_servicos(servico)')
                .eq('user_id', user.id);
            
            if (error) throw error;
            
            // Sort by Service Name A-Z as requested
            const sortedData = (data || []).sort((a, b) => {
                const nameA = a.lm_servicos?.servico || '';
                const nameB = b.lm_servicos?.servico || '';
                return nameA.localeCompare(nameB);
            });
            
            withIsMountedCheck(() => setLancamentos(sortedData), isMounted);
        } catch (error) {
            withIsMountedCheck(() => toast({ title: 'Erro', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
        } finally {
            withIsMountedCheck(() => setLoading(false), isMounted);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-3xl font-bold">Relatório de Serviços</h2>
            <div className="bg-card border rounded-xl p-4">
                {loading ? 'Carregando...' : lancamentos.map(l => (
                    <div key={l.id} className="p-2 border-b flex justify-between">
                        <span>{l.lm_servicos?.servico} ({new Date(l.data).toLocaleDateString()})</span>
                        <span className="font-bold text-green-400">R$ {l.valor}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
export default RelatorioServicos;