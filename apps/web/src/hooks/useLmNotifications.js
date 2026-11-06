import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useEstoqueCalculation } from '@/hooks/useEstoqueCalculation';

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
    .toUpperCase();

const daysBetween = (date, today) => {
  const parsed = dateOnly(date);
  return parsed ? Math.round((parsed - today) / 86400000) : null;
};

export function useLmNotifications() {
  const { user } = useAuth();
  const { stockData, loading: stockLoading } = useEstoqueCalculation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);

    try {
      const [
        accountsRes,
        launchesRes,
        manualDebtsRes,
        serviceDebtsRes,
        receiptsRes,
        ordersRes
      ] = await Promise.all([
        supabase
          .from('lm_despesas_previstas')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('lm_lanc_despesas')
          .select('data,valor,lm_despesas(despesa)')
          .eq('user_id', user.id),

        supabase
          .from('lm_clientes_debito')
          .select('id,cliente,servico,data,valor')
          .eq('user_id', user.id),

        supabase
          .from('lm_lanc_servicos')
          .select('id,data,cliente,cliente_id,valor,status_financeiro,lm_clientes(nome),lm_servicos(servico)')
          .eq('user_id', user.id)
          .in('status_financeiro', ['DEVENDO', 'PARCIAL']),

        supabase
          .from('lm_recebimentos')
          .select('id,debito_id,lanc_servico_id,valor,data')
          .eq('user_id', user.id),

        supabase
          .from('lm_pedidos')
          .select('id,status,data_entrega,sem_data_prevista,lm_clientes(nome)')
          .eq('user_id', user.id)
      ]);

      for (const result of [
        accountsRes,
        launchesRes,
        manualDebtsRes,
        serviceDebtsRes,
        receiptsRes,
        ordersRes
      ]) {
        if (result.error) throw result.error;
      }

      const accounts = accountsRes.data || [];
      const launches = launchesRes.data || [];
      const manualDebts = manualDebtsRes.data || [];
      const serviceDebts = serviceDebtsRes.data || [];
      const receipts = receiptsRes.data || [];
      const orders = ordersRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alerts = [];

      // 1. CONTAS PREVISTAS
      accounts.forEach(account => {
        const isInstallment =
          account.forma_pagamento === 'CARTÃO DE CRÉDITO' &&
          Number(account.parcelas) > 1;

        const items = [];

        if (isInstallment) {
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
          if (normalize(item.status) === 'PAGO') return;

          // Reproduz a regra de pagamento real usada em Contas do Mês.
          if (item.checkReal) {
            const description = normalize(account.descricao);

            const real = launches
              .filter(launch =>
                normalize(launch.lm_despesas?.despesa) === description &&
                dateKey(launch.data).slice(0, 7) === item.dueDate?.slice(0, 7)
              )
              .reduce((sum, launch) => sum + (Number(launch.valor) || 0), 0);

            if (item.value > 0 && real >= item.value) return;
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
              priority: days <= 0 ? 'alta' : 'media',
              route: '/lm-impressoes/dashboard/relatorios/despesas-previstas'
            });
          }
        });
      });

      // 2. DÉBITOS DE CLIENTES
      const allDebts = [
        ...manualDebts.map(item => ({
          ...item,
          origin: 'manual',
          clientName: item.cliente,
          serviceName: item.servico,
          originId: item.id
        })),
        ...serviceDebts.map(item => ({
          ...item,
          origin: 'service',
          clientName: item.lm_clientes?.nome || item.cliente || 'Cliente',
          serviceName: item.lm_servicos?.servico || 'Serviço',
          originId: item.id
        }))
      ];

      allDebts.forEach(debt => {
        const received = receipts
          .filter(receipt =>
            debt.origin === 'service'
              ? receipt.lanc_servico_id === debt.originId
              : receipt.debito_id === debt.originId
          )
          .reduce((sum, receipt) => sum + Number(receipt.valor || 0), 0);

        const total = Number(debt.valor || 0);
        const balance = Math.max(0, total - received);

        if (balance <= 0.009) return;

        const days = daysBetween(debt.data, today);

        alerts.push({
          id: `debito-${debt.origin}-${debt.originId}`,
          type: 'debito',
          title: received > 0 ? 'Cliente com pagamento parcial' : 'Cliente com débito',
          description: debt.clientName,
          message: `${debt.serviceName} • Saldo pendente${days !== null && days > 0 ? ` • ${days} dia(s)` : ''}`,
          value: balance,
          priority: 'media',
          route: '/lm-impressoes/dashboard/lancamentos/clientes-debito'
        });
      });

      // 3. PEDIDOS
      orders.forEach(order => {
        const status = normalize(order.status);

        if (status === 'ENTREGUE' || order.sem_data_prevista) return;

        const days = daysBetween(order.data_entrega, today);
        if (days === null) return;

        let title = '';
        let message = '';

        if (status === 'ATRASADO' || days < 0) {
          title = 'Pedido atrasado';
          message = days < 0
            ? `Entrega vencida há ${Math.abs(days)} dia(s).`
            : 'Pedido marcado como atrasado.';
        } else if (days === 0) {
          title = 'Pedido com entrega hoje';
          message = 'A entrega está prevista para hoje.';
        } else if (days <= 3) {
          title = 'Pedido próximo da entrega';
          message = `Entrega prevista em ${days} dia(s).`;
        }

        if (title) {
          alerts.push({
            id: `pedido-${order.id}`,
            type: 'pedido',
            title,
            description: order.lm_clientes?.nome || `Pedido ${String(order.id).slice(0, 8)}`,
            message,
            priority: days <= 0 ? 'alta' : 'media',
            route: '/lm-impressoes/dashboard/pedidos/consulta'
          });
        }
      });

      // 4. ESTOQUE
      Object.values(stockData || {}).forEach(item => {
        const minimum = Number(item.estoque_minimo);
        const current = Number(item.estoqueAtual);

        if (
          item.estoque_minimo === null ||
          item.estoque_minimo === undefined ||
          !Number.isFinite(minimum) ||
          !Number.isFinite(current) ||
          current > minimum
        ) return;

        const zero = current <= 0;

        alerts.push({
          id: `estoque-${item.insumo_id || item.nomeInsumo}`,
          type: 'estoque',
          title: zero ? 'Estoque zerado' : 'Estoque abaixo do mínimo',
          description: item.nomeInsumo,
          message: `Atual: ${current} ${item.unidade || ''} • Mínimo: ${minimum}`,
          value: current,
          priority: zero ? 'alta' : 'media',
          route: '/lm-impressoes/dashboard/estoques/controle'
        });
      });

      const priorityOrder = { alta: 0, media: 1, baixa: 2 };

      alerts.sort((a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );

      setNotifications(alerts);
    } catch (error) {
      console.error('Erro ao carregar notificações LM:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, stockData]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    if (!stockLoading) refresh();
  }, [user?.id, stockLoading, refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`lm-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_despesas_previstas',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_lanc_despesas',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_clientes_debito',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_lanc_servicos',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_recebimentos',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_pedidos',
        filter: `user_id=eq.${user.id}`
      }, refresh)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, refresh]);

  return {
    notifications,
    loading: loading || stockLoading,
    count: notifications.length,
    refresh
  };
}
