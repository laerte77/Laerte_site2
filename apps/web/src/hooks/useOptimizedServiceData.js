import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Custom hook for optimized lazy loading of service lancamentos data
 * Implements efficient JOINs and pagination for performance
 * @param {Object} filters - Filter criteria (month, year)
 * @returns {Object} Data, loading state, and load functions
 */
export const useOptimizedServiceData = ({ month, year }) => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const ITEMS_PER_PAGE = 50; // Limit results for performance

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Optimized fetch with specific columns and efficient JOINs
  const fetchLancamentos = useCallback(async (resetData = false) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const firstDay = new Date(parseInt(year), parseInt(month), 1);
      const lastDay = new Date(parseInt(year), parseInt(month) + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const currentPage = resetData ? 0 : page;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Optimized query with specific columns and efficient JOIN
      const { data: lancamentos, error: fetchError, count } = await supabase
        .from('lm_lanc_servicos')
        .select(`
          id,
          data,
          valor,
          forma_pagamento,
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

      // Check if there's more data
      const totalFetched = resetData ? (lancamentos?.length || 0) : data.length + (lancamentos?.length || 0);
      setHasMore(totalFetched < (count || 0));

    } catch (err) {
      console.error('Error fetching lancamentos:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, month, year, page, data.length]);

  // Load initial data
  const loadInitial = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
    fetchLancamentos(true);
  }, [fetchLancamentos]);

  // Load more data (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchLancamentos(false);
    }
  }, [loading, hasMore, fetchLancamentos]);

  // Refresh data
  const refresh = useCallback(() => {
    loadInitial();
  }, [loadInitial]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    loadInitial();
  }, [month, year, user?.id]); // Only reload when filters or user changes

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
