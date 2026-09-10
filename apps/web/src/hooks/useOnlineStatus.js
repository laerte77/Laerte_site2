import { useState, useEffect, useCallback } from 'react';
import { syncPendingData } from '@/lib/syncManager';
import { getAllPendingData } from '@/lib/offlineStorage';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPending, setIsPending] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const { user } = useAuth();

  const checkPending = useCallback(async () => {
    try {
      const data = await getAllPendingData();
      setIsPending(data.length > 0);
    } catch(e) {
      console.error(e);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline || !user) return;
    setSyncStatus('syncing');
    const result = await syncPendingData(user.id);
    if (result.success && result.count > 0) {
      setSyncStatus('success');
      setIsPending(false);
    } else if (!result.success) {
      setSyncStatus('error');
    } else {
      setSyncStatus('idle');
    }
    checkPending();
  }, [isOnline, user, checkPending]);

  useEffect(() => {
    checkPending();
    const handleOnline = () => { setIsOnline(true); triggerSync(); };
    const handleOffline = () => { setIsOnline(false); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, checkPending]);

  return { isOnline, isPending, syncStatus, checkPending, triggerSync };
};