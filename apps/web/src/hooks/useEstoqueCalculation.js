import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export function useEstoqueCalculation() {
    const { user } = useAuth();
    const [stockData, setStockData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const isMounted = useRef(true);

    const normalizeKey = (key) => key ? key.toString().toUpperCase().trim() : 'DESCONHECIDO';

    const fetchAllData = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Baseline (lm_estoques_inicial)
            const { data: baselineData, error: baselineError } = await supabase
                .from('lm_estoques_inicial')
                .select('produto, quantidade_inicial')
                .eq('user_id', user.id);

            if (baselineError) throw baselineError;

            // 2. Fetch Replenishments (lm_lanc_despesas where tipo_folha & quantidade exist)
            const { data: repData, error: repError } = await supabase
                .from('lm_lanc_despesas')
                .select('tipo_folha, quantidade')
                .eq('user_id', user.id)
                .not('tipo_folha', 'is', null)
                .not('quantidade', 'is', null);

            if (repError) throw repError;

            // 3. Fetch Used (lm_lanc_servicos -> folhas_gastas)
            const { data: servData, error: servError } = await supabase
                .from('lm_lanc_servicos')
                .select('folhas_gastas')
                .eq('user_id', user.id)
                .not('folhas_gastas', 'is', null);

            if (servError) throw servError;

            // Process Data
            const map = {};

            // Initialize with baseline
            (baselineData || []).forEach(item => {
                const key = normalizeKey(item.produto);
                if (!map[key]) map[key] = { tipo_folha: key, baseline: 0, reposicoes: 0, folhasGastas: 0, estoqueAtual: 0 };
                map[key].baseline += parseInt(item.quantidade_inicial || 0, 10);
            });

            // Add Replenishments
            (repData || []).forEach(item => {
                const key = normalizeKey(item.tipo_folha);
                if (!map[key]) map[key] = { tipo_folha: key, baseline: 0, reposicoes: 0, folhasGastas: 0, estoqueAtual: 0 };
                map[key].reposicoes += parseInt(item.quantidade || 0, 10);
            });

            // Add Used
            (servData || []).forEach(item => {
                const folhas = item.folhas_gastas || [];
                if (Array.isArray(folhas)) {
                    folhas.forEach(f => {
                        if (!f.e_rascunho && f.tipo_folha && f.quantidade) {
                            const key = normalizeKey(f.tipo_folha);
                            if (!map[key]) map[key] = { tipo_folha: key, baseline: 0, reposicoes: 0, folhasGastas: 0, estoqueAtual: 0 };
                            map[key].folhasGastas += parseInt(f.quantidade || 0, 10);
                        }
                    });
                }
            });

            // Calculate final stock
            Object.keys(map).forEach(key => {
                map[key].estoqueAtual = map[key].baseline + map[key].reposicoes - map[key].folhasGastas;
            });

            if (isMounted.current) {
                setStockData(map);
                setLastUpdate(new Date());
            }

        } catch (err) {
            console.error("Error calculating stock:", err);
            if (isMounted.current) setError(err.message);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        isMounted.current = true;
        fetchAllData();

        if (!user) return;

        // Setup Subscriptions for real-time updates
        const channels = supabase.channel('stock-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_estoques_inicial', filter: `user_id=eq.${user.id}` }, () => {
                fetchAllData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_lanc_despesas', filter: `user_id=eq.${user.id}` }, () => {
                fetchAllData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_lanc_servicos', filter: `user_id=eq.${user.id}` }, () => {
                fetchAllData();
            })
            .subscribe();

        return () => {
            isMounted.current = false;
            supabase.removeChannel(channels);
        };
    }, [user, fetchAllData]);

    return { stockData, loading, error, refresh: fetchAllData, lastUpdate };
}