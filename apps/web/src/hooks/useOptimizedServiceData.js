import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useOptimizedServiceData = ({ month, year }) => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchLancamentos = useCallback(async (resetData = false) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const firstDay = new Date(parseInt(year), parseInt(month), 1);
      const lastDay = new Date(parseInt(year), parseInt(month) + 1, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      const currentPage = resetData ? 0 : page;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: lancamentos, error: fetchError, count } = await supabase
        .from('lm_lanc_servicos')
        .select(`
          id,
          data,
          valor,
          forma_pagamento,
          status_financeiro,
          servico_id,
          cliente_id,
          cliente,
          folhas_gastas,
          lm_servicos!inner(id, servico),
          lm_clientes(id, nome)
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      if (resetData) {
        setData(lancamentos || []);
        setPage(1);
      } else {
        setData(prev => [...prev, ...(lancamentos || [])]);
        setPage(prev => prev + 1);
      }

      const totalFetched = resetData
        ? (lancamentos?.length || 0)
        : data.length + (lancamentos?.length || 0);

      setHasMore(totalFetched < (count || 0));
    } catch (err) {
      console.error('Error fetching lancamentos:', err);
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [user, month, year, page, data.length]);

  const loadInitial = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
    fetchLancamentos(true);
  }, [fetchLancamentos]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchLancamentos(false);
  }, [loading, hasMore, fetchLancamentos]);

  const refresh = useCallback(() => loadInitial(), [loadInitial]);

  useEffect(() => {
    loadInitial();
  }, [month, year, user?.id]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isEmpty: !loading && data.length === 0,
  };
};

