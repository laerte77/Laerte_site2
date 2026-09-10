import React, { useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const OfflineIndicator = () => {
  const { isOnline, isPending, syncStatus } = useOnlineStatus();
  const { toast } = useToast();

  useEffect(() => {
    if (syncStatus === 'success') {
      toast({ title: 'Sincronização Concluída', description: 'Dados offline foram sincronizados com sucesso.' });
    }
    if (syncStatus === 'error') {
      toast({ title: 'Erro de Sincronização', description: 'Falha ao sincronizar dados offline.', variant: 'destructive' });
    }
  }, [syncStatus, toast]);

  if (isOnline && !isPending && syncStatus === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-2 p-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span>Offline - Salvando localmente</span>
        </Badge>
      )}
      {isOnline && isPending && syncStatus !== 'syncing' && (
        <Badge variant="secondary" className="flex items-center gap-2 p-2 shadow-lg bg-yellow-500 text-white hover:bg-yellow-600">
          <Wifi className="w-4 h-4" />
          <span>Sincronização pendente</span>
        </Badge>
      )}
      {syncStatus === 'syncing' && (
        <Badge variant="default" className="flex items-center gap-2 p-2 shadow-lg bg-blue-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Sincronizando...</span>
        </Badge>
      )}
    </div>
  );
};

export default OfflineIndicator;