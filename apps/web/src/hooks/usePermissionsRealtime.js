import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const usePermissionsRealtime = (userId, onPermissionChange) => {
  const [isListening, setIsListening] = useState(false);
  const callbackRef = useRef(onPermissionChange);

  // Keep the latest callback in a ref to avoid re-triggering the useEffect
  // This prevents infinite loops of reconnecting to the realtime channel
  useEffect(() => {
    callbackRef.current = onPermissionChange;
  }, [onPermissionChange]);

  useEffect(() => {
    if (!userId) {
      setIsListening(false);
      return;
    }

    const handleUpdate = (payload) => {
      console.log('[Realtime] Permissões atualizadas:', payload);
      if (callbackRef.current) {
        callbackRef.current(payload);
      }
    };

    // Subscribe to changes in both tables using a single channel
    const subscription = supabase
      .channel(`user-permissions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios_sistema',
          filter: `id=eq.${userId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        handleUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsListening(true);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
      setIsListening(false);
    };
  }, [userId]); // Only re-run if the userId changes, never on callback changes

  return { isListening };
};