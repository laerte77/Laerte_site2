import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { startOfMonth, endOfMonth, parseISO, isBefore, isToday, format } from 'date-fns';

export function useMonthlyAccountsData(userId, month, year) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      // month is 1-based (1 = Jan, 12 = Dec)
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      // Fetch despesas_previstas (scheduled)
      const { data: previstas, error: previstasError } = await supabase
        .from('despesas_previstas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (previstasError) throw previstasError;

      // Fetch despesas (actual payments)
      // Since despesas_previstas has matched_transaction_id, we fetch despesas to compare
      // We can fetch all actual despesas for the month just in case, but checking matched ID is more direct
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', userId);

      if (despesasError) throw despesasError;

      const processedData = previstas.map(prevista => {
        const valorPrevisto = Number(prevista.valor) || 0;
        let valorReal = 0;

        // Check if there is a matched transaction
        if (prevista.matched_transaction_id) {
          const matched = despesas.find(d => d.id === prevista.matched_transaction_id);
          if (matched) {
            valorReal = Number(matched.valor) || 0;
          }
        } else if (prevista.status === 'Pago') {
            // Legacy / manual override
            valorReal = valorPrevisto;
        }

        const diferenca = valorPrevisto - valorReal;
        
        let calculatedStatus = 'PENDENTE';
        const vencimento = parseISO(prevista.data_vencimento);

        if (valorReal >= valorPrevisto && valorPrevisto > 0) {
          calculatedStatus = 'PAGO';
        } else if (valorReal > 0 && valorReal < valorPrevisto) {
          calculatedStatus = 'PAGO_PARCIALMENTE';
        } else if (valorReal === 0 && isBefore(vencimento, new Date()) && !isToday(vencimento)) {
          calculatedStatus = 'ATRASADO';
        }

        return {
          id: prevista.id,
          data_vencimento: prevista.data_vencimento,
          descricao: prevista.descricao,
          categoria: prevista.categoria || 'Outros',
          valor_previsto: valorPrevisto,
          valor_real: valorReal,
          diferenca: diferenca,
          status: calculatedStatus,
          original_status: prevista.status,
          matched_transaction_id: prevista.matched_transaction_id
        };
      });

      // Sort by due date
      processedData.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

      setData(processedData);
    } catch (err) {
      console.error('Error in useMonthlyAccountsData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch };
}