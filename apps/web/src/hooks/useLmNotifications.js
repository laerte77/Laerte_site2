import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const getLocalDate = value => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDaysDifference = (dueDate, today) => {
  const due = getLocalDate(dueDate);
  if (!due) return null;
  return Math.round((due - today) / 86400000);
};

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
        .select('id,descricao,data_vencimento,valor,status,forma_pagamento,parcelas')
        .eq('user_id', user.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alerts = [];

      (data || []).forEach(account => {
        const isInstallment =
          account.forma_pagamento === 'CARTÃO DE CRÉDITO' &&
          Number(account.parcelas) > 1;

        const installments = [];

        if (isInstallment) {
          const statuses =
            account.status && typeof account.status === 'object'
              ? account.status
              : {};

          const installmentValue =
            Number(account.valor || 0) / Number(account.parcelas);

          for (let i = 0; i < Number(account.parcelas); i++) {
            const dueDate = getLocalDate(account.data_vencimento);
            dueDate.setMonth(dueDate.getMonth() + i);

            const year = dueDate.getFullYear();
            const month = String(dueDate.getMonth() + 1).padStart(2, '0');
            const day = String(dueDate.getDate()).padStart(2, '0');

            installments.push({
              id: `${account.id}-${i + 1}`,
              description: `${account.descricao || 'Conta'} (${i + 1}/${account.parcelas})`,
              dueDate: `${year}-${month}-${day}`,
              value: installmentValue,
              status: statuses[i + 1] || 'PENDENTE'
            });
          }
        } else {
          installments.push({
            id: String(account.id),
            description: account.descricao || 'Conta prevista',
            dueDate: account.data_vencimento,
            value: Number(account.valor || 0),
            status: account.status === 'PAGO' ? 'PAGO' : 'PENDENTE'
          });
        }

        installments.forEach(item => {
          // Não gerar alertas para parcelas já pagas.
          if (item.status === 'PAGO') return;

          const days = getDaysDifference(item.dueDate, today);
          if (days === null) return;

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

          if (!title) return;

          alerts.push({
            id: `conta-${item.id}`,
            type: 'conta',
            title,
            description: item.description,
            message,
            value: item.value,
            dueDate: item.dueDate,
            route: '/lm-impressoes/dashboard/relatorios/despesas-previstas'
          });
        });
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

