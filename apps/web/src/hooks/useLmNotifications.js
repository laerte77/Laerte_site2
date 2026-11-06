import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const dateOnly = value => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const dateKey = value => String(value || '').slice(0, 10);

const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const daysBetween = (due, today) => {
  const date = dateOnly(due);
  return date ? Math.round((date - today) / 86400000) : null;
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
      const [accountsRes, launchesRes] = await Promise.all([
        supabase
          .from('lm_despesas_previstas')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('lm_lanc_despesas')
          .select('data,valor,lm_despesas(despesa)')
          .eq('user_id', user.id)
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (launchesRes.error) throw launchesRes.error;

      const accounts = accountsRes.data || [];
      const launches = launchesRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alerts = [];

      accounts.forEach(account => {
        const installments =
          account.forma_pagamento === 'CARTÃO DE CRÉDITO' &&
          Number(account.parcelas) > 1;

        const items = [];

        if (installments) {
          const statuses =
            account.status && typeof account.status === 'object'
              ? account.status
              : {};

          for (let i = 0; i < Number(account.parcelas); i++) {
            const due = dateOnly(account.data_vencimento);
            if (!due) continue;

            due.setMonth(due.getMonth() + i);

            const y = due.getFullYear();
            const m = String(due.getMonth() + 1).padStart(2, '0');
            const d = String(due.getDate()).padStart(2, '0');

            items.push({
              id: `${account.id}-${i + 1}`,
              description: `${account.descricao} (${i + 1}/${account.parcelas})`,
              dueDate: `${y}-${m}-${d}`,
              value: Number(account.valor || 0) / Number(account.parcelas),
              status: statuses[i + 1] || 'PENDENTE',
              checkReal: false
            });
          }
        } else {
          items.push({
            id: String(account.id),
            description: account.descricao || 'Conta prevista',
            dueDate: account.data_vencimento,
            value: Number(account.valor || 0),
            status: account.status,
            checkReal: true
          });
        }

        items.forEach(item => {
          const savedStatus = normalize(item.status);

          // Status explicitamente pago.
          if (savedStatus === 'pago') return;

          // Para contas comuns, replica a regra de Contas do Mês:
          // lançamento real com valor igual ou superior ao previsto = pago.
          if (item.checkReal) {
            const description = normalize(account.descricao);

            const real = launches
              .filter(launch =>
                normalize(launch.lm_despesas?.despesa) === description &&
                dateKey(launch.data).slice(0, 7) === item.dueDate?.slice(0, 7)
              )
              .reduce((sum, launch) => sum + (Number(launch.valor) || 0), 0);

            if (Number(item.value) > 0 && real >= Number(item.value)) return;
          }

          const days = daysBetween(item.dueDate, today);
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

          if (title) {
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
          }
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lm_lanc_despesas',
          filter: `user_id=eq.${user.id}`
        },
        refresh
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, refresh]);

  return {
    notifications,
    loading,
    count: notifications.length,
    refresh
  };
}

