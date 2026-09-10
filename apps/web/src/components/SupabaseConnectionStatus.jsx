import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SupabaseConnectionStatus = () => {
  const [status, setStatus] = useState('connecting'); // connecting, connected, error
  const { toast } = useToast();

  const checkConnection = useCallback(async (silent = true) => {
    setStatus('connecting');

    try {
      // Test the connection directly against the database
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      // Even if the table doesn't exist (PGRST205 / 42P01) or RLS blocks it (PGRST116),
      // it means the connection to the Supabase server is successful.
      if (!error || ['PGRST116', '42P01', 'PGRST205'].includes(error.code)) {
        setStatus('connected');
        if (!silent) toast({ title: "Conexão Restabelecida", description: "O sistema está online e conectado ao banco." });
      } else {
        console.error("Supabase Connection Error:", error);
        setStatus('error');
        if (!silent) {
          toast({
            title: "Erro de Conexão",
            description: "Não foi possível conectar ao banco de dados.",
            variant: "destructive"
          });
        }
      }
    } catch (err) {
      console.error("Supabase Exception:", err);
      setStatus('error');
      if (!silent) {
        toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao banco de dados.",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    checkConnection(true);
    
    // Auto test every 30 seconds
    const interval = setInterval(() => {
      checkConnection(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  if (status === 'connected') {
    return null; // Hide when connected to keep UI clean
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-card border shadow-lg p-2 rounded-full animate-in slide-in-from-bottom-5">
      {status === 'connecting' && (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 py-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testando...
        </Badge>
      )}
      
      {status === 'error' && (
        <Badge variant="destructive" className="gap-1.5 py-1">
          <Database className="w-3.5 h-3.5" /> Offline
        </Badge>
      )}
      
      {status === 'error' && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full" 
          onClick={() => checkConnection(false)}
          title="Tentar reconectar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export default SupabaseConnectionStatus;