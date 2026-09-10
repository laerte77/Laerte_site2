import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSecretariaRealtime } from '@/hooks/useSecretariaRealtime';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SharedDataContext = createContext(null);

export const SecretariaSharedDataProvider = ({ children }) => {
  const { toast } = useToast();
  const { syncStatus, activeUsers, lastSync, subscribeToTable, unsubscribeFromTable } = useSecretariaRealtime();
  
  const [membros, setMembros] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [conjuntos, setConjuntos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes, cRes, conjRes, clsRes] = await Promise.all([
        supabase.from('igreja_membros').select('*, igreja_funcoes(nome_funcao), conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto), dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto), cargo:cargos_igreja(nome_cargo), igreja_classes(nome_classe)').order('nome_completo'),
        supabase.from('igreja_funcoes').select('*').order('nome_funcao'),
        supabase.from('cargos_igreja').select('*').order('nome_cargo'),
        supabase.from('igreja_conjuntos').select('*').order('nome_conjunto'),
        supabase.from('igreja_classes').select('*').order('nome_classe'),
      ]);
      if (mRes.data) setMembros(mRes.data);
      if (fRes.data) setFuncoes(fRes.data);
      if (cRes.data) setCargos(cRes.data);
      if (conjRes.data) setConjuntos(conjRes.data);
      if (clsRes.data) setClasses(clsRes.data);
    } catch (error) {
      toast({ title: 'Erro de Sincronização', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();

    const channels = [
      subscribeToTable('igreja_membros', fetchAllData),
      subscribeToTable('igreja_funcoes', fetchAllData),
      subscribeToTable('cargos_igreja', fetchAllData),
      subscribeToTable('igreja_conjuntos', fetchAllData),
      subscribeToTable('igreja_classes', fetchAllData),
    ];

    return () => {
      channels.forEach(unsubscribeFromTable);
    };
  }, [fetchAllData, subscribeToTable, unsubscribeFromTable]);

  return (
    <SharedDataContext.Provider value={{
      membros, funcoes, cargos, conjuntos, classes, loading,
      syncStatus, activeUsers, lastSync,
      getMembers: () => membros,
      getFuncoes: () => funcoes,
      getCargos: () => cargos,
      getConjuntos: () => conjuntos,
      getClasses: () => classes,
      refreshData: fetchAllData
    }}>
      {children}
    </SharedDataContext.Provider>
  );
};

export const useSharedData = () => useContext(SharedDataContext);