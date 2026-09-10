import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useSecretariaRealtime = () => {
  const [syncStatus, setSyncStatus] = useState('Desconectado');
  const [activeUsers, setActiveUsers] = useState(1);
  const [lastSync, setLastSync] = useState(null);

  const subscribeToTable = useCallback((tableName, callback) => {
    setSyncStatus('Sincronizando...');
    const channel = supabase.channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        setSyncStatus('Sincronizando...');
        callback(payload);
        setTimeout(() => {
          setSyncStatus('Conectado');
          setLastSync(new Date().toLocaleTimeString());
        }, 1000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('Conectado');
          setLastSync(new Date().toLocaleTimeString());
        }
      });
    return channel;
  }, []);

  const unsubscribeFromTable = useCallback((channel) => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }, []);

  const getCurrentData = useCallback(async (tableName) => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  }, []);

  return {
    syncStatus,
    activeUsers,
    lastSync,
    subscribeToTable,
    unsubscribeFromTable,
    getCurrentData
  };
};