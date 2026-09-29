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
      toast({
        title: 'Sincronização Concluída',
        description: 'Dados offline foram sincronizados com sucesso.'
      });
    }

    if (syncStatus === 'error') {
      toast({
        title: 'Erro de Sincronização',
        description: 'Falha ao sincronizar dados offline.',
        variant: 'destructive'
      });
    }
  }, [syncStatus, toast]);

  if (isOnline && !isPending && syncStatus === 'idle') {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-3
        right-3
        sm:bottom-4
        sm:right-4
        z-50
        flex
        max-w-[calc(100vw-1.5rem)]
        flex-col
        items-end
        gap-2
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {!isOnline && (
        <Badge
          variant="destructive"
          className="
            flex
            max-w-full
            items-center
            gap-2
            rounded-full
            border
            border-destructive/30
            bg-destructive/90
            px-3
            py-2
            text-xs
            font-medium
            shadow-[0_8px_24px_hsl(var(--destructive)/0.22)]
            backdrop-blur-md
            sm:px-4
            sm:text-sm
          "
        >
          <WifiOff
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          />

          <span className="truncate">
            Offline - Salvando localmente
          </span>
        </Badge>
      )}

      {isOnline && isPending && syncStatus !== 'syncing' && (
        <Badge
          variant="secondary"
          className="
            flex
            max-w-full
            items-center
            gap-2
            rounded-full
            border
            border-yellow-400/30
            bg-yellow-500/90
            px-3
            py-2
            text-xs
            font-medium
            text-white
            shadow-[0_8px_24px_rgba(234,179,8,0.20)]
            backdrop-blur-md
            sm:px-4
            sm:text-sm
          "
        >
          <Wifi
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          />

          <span className="truncate">
            Sincronização pendente
          </span>
        </Badge>
      )}

      {syncStatus === 'syncing' && (
        <Badge
          variant="default"
          className="
            flex
            max-w-full
            items-center
            gap-2
            rounded-full
            border
            border-blue-400/30
            bg-blue-500/90
            px-3
            py-2
            text-xs
            font-medium
            text-white
            shadow-[0_8px_24px_rgba(59,130,246,0.22)]
            backdrop-blur-md
            sm:px-4
            sm:text-sm
          "
        >
          <RefreshCw
            className="h-4 w-4 shrink-0 animate-spin"
            aria-hidden="true"
          />

          <span className="truncate">
            Sincronizando...
          </span>
        </Badge>
      )}
    </div>
  );
};

export default OfflineIndicator;
