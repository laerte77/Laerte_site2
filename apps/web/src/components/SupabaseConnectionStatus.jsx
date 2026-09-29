import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SupabaseConnectionStatus = () => {
  const [status, setStatus] = useState('connecting');
  const { toast } = useToast();

  const checkConnection = useCallback(
    async (silent = true) => {
      setStatus('connecting');

      try {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (
          !error ||
          ['PGRST116', '42P01', 'PGRST205'].includes(error.code)
        ) {
          setStatus('connected');

          if (!silent) {
            toast({
              title: 'Conexão Restabelecida',
              description:
                'O sistema está online e conectado ao banco.'
            });
          }
        } else {
          console.error(
            'Supabase Connection Error:',
            error
          );

          setStatus('error');

          if (!silent) {
            toast({
              title: 'Erro de Conexão',
              description:
                'Não foi possível conectar ao banco de dados.',
              variant: 'destructive'
            });
          }
        }
      } catch (err) {
        console.error(
          'Supabase Exception:',
          err
        );

        setStatus('error');

        if (!silent) {
          toast({
            title: 'Erro de Conexão',
            description:
              'Não foi possível conectar ao banco de dados.',
            variant: 'destructive'
          });
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    checkConnection(true);

    const interval = setInterval(() => {
      checkConnection(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  if (status === 'connected') {
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
        items-center
        gap-2
        max-w-[calc(100vw-1.5rem)]
        rounded-full
        border
        border-border/80
        bg-card/95
        backdrop-blur-md
        p-1.5
        shadow-[0_8px_24px_hsl(0_0%_0%/0.25)]
        animate-in
        slide-in-from-bottom-4
        duration-300
        motion-reduce:animate-none
      "
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {status === 'connecting' && (
        <Badge
          variant="outline"
          className="
            flex
            items-center
            gap-1.5
            rounded-full
            border-blue-500/20
            bg-blue-500/10
            px-3
            py-1.5
            text-xs
            font-medium
            text-blue-500
            sm:text-sm
          "
        >
          <RefreshCw
            className="h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />

          <span>Testando conexão...</span>
        </Badge>
      )}

      {status === 'error' && (
        <>
          <Badge
            variant="destructive"
            className="
              flex
              items-center
              gap-1.5
              rounded-full
              px-3
              py-1.5
              text-xs
              font-medium
              sm:text-sm
            "
          >
            <Database
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            <span>Banco offline</span>
          </Badge>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="
              h-8
              w-8
              shrink-0
              rounded-full
              hover:bg-destructive/10
              hover:text-destructive
              focus-visible:ring-destructive
            "
            onClick={() => checkConnection(false)}
            title="Tentar reconectar"
            aria-label="Tentar reconectar ao banco de dados"
          >
            <RefreshCw
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Button>
        </>
      )}
    </div>
  );
};

export default SupabaseConnectionStatus;
