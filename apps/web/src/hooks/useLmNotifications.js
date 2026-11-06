import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const dateOnly = value => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const dayDiff = (date, today) =>
  Math.round((dateOnly(date) - today) / 86400000);

export function useLmNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lm_despesas_previstas')
        .select('id,descricao,data_vencimento,valor,status')
        .eq('user_id', user.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alerts = [];

      (data || []).forEach(account => {
        const status = account.status;
        const dueDate = dateOnly(account.data_vencimento);

        if (!dueDate || status === 'PAGO') return;

        const days = dayDiff(account.data_vencimento, today);

        let title = '';
        let message = '';

        if (days < 0) {
          title = 'Conta atrasada';
          message = `Vencida há ${Math.abs(days)} dia(s).`;
        } else if (days === 0) {
          title = 'Conta vence hoje';
          message = 'O vencimento desta conta é hoje.';
        } else if ([1, 3, 7].includes(days)) {
          title = 'Conta próxima do vencimento';
          message = `Vence em ${days} dia(s).`;
        }

        if (title) {
          alerts.push({
            id: `conta-${account.id}-${account.data_vencimento}`,
            type: 'conta',
            title,
            description: account.descricao || 'Conta prevista',
            message,
            value: Number(account.valor || 0),
            dueDate: account.data_vencimento,
            route: '/lm-impressoes/dashboard/relatorios/despesas-previstas'
          });
        }
      });

      setNotifications(alerts);
    } catch (error) {
      console.error('Erro ao carregar notificações LM:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();

    if (!user?.id) return;

    const channel = supabase
      .channel(`lm-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lm_despesas_previstas',
          filter: `user_id=eq.${user.id}`
        },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return {
    notifications,
    loading,
    count: notifications.length,
    refresh
  };
}
