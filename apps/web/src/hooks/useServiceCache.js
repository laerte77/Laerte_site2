import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Custom hook for caching services, clients, and folha types data
 * Implements local caching with useMemo to avoid unnecessary refetches
 * @returns {Object} Cached data and refresh functions
 */
export const useServiceCache = () => {
  const { user } = useAuth();
  
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tiposFolha, setTiposFolha] = useState([]);
  
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingTiposFolha, setLoadingTiposFolha] = useState(true);
  
  const [errorServicos, setErrorServicos] = useState(null);
  const [errorClientes, setErrorClientes] = useState(null);
  const [errorTiposFolha, setErrorTiposFolha] = useState(null);

  // Fetch services with specific columns only
  const fetchServicos = useCallback(async () => {
    if (!user) return;
    
    setLoadingServicos(true);
    setErrorServicos(null);
    
    try {
      const { data, error } = await supabase
        .from('lm_servicos')
        .select('id, servico, valor, usa_folha')
        .eq('user_id', user.id)
        .order('servico', { ascending: true });

      if (error) throw error;
      
      setServicos(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setErrorServicos(error.message);
    } finally {
      setLoadingServicos(false);
    }
  }, [user]);

  // Fetch clients with specific columns only
  const fetchClientes = useCallback(async () => {
    if (!user) return;
    
    setLoadingClientes(true);
    setErrorClientes(null);
    
    try {
      const { data, error } = await supabase
        .from('lm_clientes')
        .select('id, nome')
        .eq('user_id', user.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setErrorClientes(error.message);
    } finally {
      setLoadingClientes(false);
    }
  }, [user]);

  // Fetch folha types with specific columns only
  const fetchTiposFolha = useCallback(async () => {
    if (!user) return;
    
    setLoadingTiposFolha(true);
    setErrorTiposFolha(null);
    
    try {
      const { data, error } = await supabase
        .from('lm_tipos_folha')
        .select('id, tipo_folha')
        .eq('user_id', user.id)
        .order('tipo_folha', { ascending: true });

      if (error) throw error;
      
      setTiposFolha(data || []);
    } catch (error) {
      console.error('Error fetching folha types:', error);
      setErrorTiposFolha(error.message);
    } finally {
      setLoadingTiposFolha(false);
    }
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      fetchServicos();
      fetchClientes();
      fetchTiposFolha();
    }
  }, [user, fetchServicos, fetchClientes, fetchTiposFolha]);

  // Memoized cached data
  const cachedServicos = useMemo(() => servicos, [servicos]);
  const cachedClientes = useMemo(() => clientes, [clientes]);
  const cachedTiposFolha = useMemo(() => tiposFolha, [tiposFolha]);

  // Refresh all cache
  const refreshAll = useCallback(() => {
    fetchServicos();
    fetchClientes();
    fetchTiposFolha();
  }, [fetchServicos, fetchClientes, fetchTiposFolha]);

  // Combined loading state
  const isLoading = loadingServicos || loadingClientes || loadingTiposFolha;
  
  // Combined error state
  const hasError = errorServicos || errorClientes || errorTiposFolha;

  return {
    // Cached data
    servicos: cachedServicos,
    clientes: cachedClientes,
    tiposFolha: cachedTiposFolha,
    
    // Loading states
    loadingServicos,
    loadingClientes,
    loadingTiposFolha,
    isLoading,
    
    // Error states
    errorServicos,
    errorClientes,
    errorTiposFolha,
    hasError,
    
    // Refresh functions
    refreshServicos: fetchServicos,
    refreshClientes: fetchClientes,
    refreshTiposFolha: fetchTiposFolha,
    refreshAll,
  };
};