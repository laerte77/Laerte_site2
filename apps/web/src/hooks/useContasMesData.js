import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO, isBefore, isToday, endOfMonth, setDate } from 'date-fns';
import { competenciaFatura } from '@/lib/cartaoCompetencia';
import { getInstallmentValue } from '@/lib/cartaoParcelas';

// Normaliza texto para comparação: lowercase, sem acentos, sem espaços extras.
const normalize = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};

export function useContasMesData(userId, month, year) {
  const [contasMes, setContasMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // `month` chega 1-indexado (Janeiro = 1). Internamente usamos 0-indexado.
      const target0 = month - 1;
      const startDate = format(new Date(year, target0, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, target0, 1)), 'yyyy-MM-dd');

      // 1) Despesas previstas (previsto) — filtradas pelo vencimento no mês/ano
      const { data: previstas, error: previstasError } = await supabase
        .from('despesas_previstas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (previstasError) throw previstasError;

      // 2) Despesas realizadas (dinheiro/débito/crédito) — banco de despesas
      const { data: reais, error: reaisError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (reaisError) throw reaisError;

      // 3) Pagamentos de fatura do cartão de crédito — banco de cartão de crédito.
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pessoal_cartao_pagamentos')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (pagamentosError) throw pagamentosError;

      // 4) Cartões de crédito (todos) — para dia de fechamento/vencimento e nomes.
      const { data: cartoes, error: cartoesError } = await supabase
        .from('pessoal_cartoes')
        .select('id, nome, dia_fechamento, dia_vencimento')
        .eq('user_id', userId);

      if (cartoesError) throw cartoesError;
      const cartoesMap = Object.fromEntries((cartoes || []).map((c) => [c.id, c]));

      // 5) Lançamentos de compra do cartão — janela ampliada (mês anterior ao próximo)
      // para abranger compras cuja competência (pelo dia de fechamento) cai no mês alvo.
      const lancStart = format(new Date(year, target0 - 1, 1), 'yyyy-MM-dd');
      const lancEnd = format(new Date(year, target0 + 2, 0), 'yyyy-MM-dd');
      const { data: lancamentos, error: lancamentosError } = await supabase
        .from('pessoal_cartao_lancamentos')
        .select('*')
        .eq('user_id', userId)
        .gte('data', lancStart)
        .lte('data', lancEnd);

      if (lancamentosError) throw lancamentosError;

      // 6) Pessoas do cartão (responsáveis) — para exibir o titular/responsável na descrição.
      const { data: usuarios, error: usuariosError } = await supabase
        .from('pessoal_cartao_usuarios')
        .select('id, nome')
        .eq('user_id', userId);

      if (usuariosError) throw usuariosError;
      const usuariosMap = Object.fromEntries((usuarios || []).map((u) => [u.id, u]));

      // 7) Faturas da competência alvo (mês 0-indexado) — para status/vencimento.
      const { data: faturasComp, error: faturasCompError } = await supabase
        .from('pessoal_faturas')
        .select('*')
        .eq('user_id', userId)
        .eq('mes', target0)
        .eq('ano', year);

      if (faturasCompError) throw faturasCompError;
      const faturasCompMap = Object.fromEntries((faturasComp || []).map((f) => [f.cartao_id, f]));

      // 8) Pagamentos das faturas da competência alvo — para calcular o realizado.
      const faturaCompIds = (faturasComp || []).map((f) => f.id).filter(Boolean);
      const pagoPorFaturaComp = {};
      if (faturaCompIds.length > 0) {
        const { data: pagsComp } = await supabase
          .from('pessoal_cartao_pagamentos')
          .select('fatura_id, valor')
          .in('fatura_id', faturaCompIds);
        (pagsComp || []).forEach((p) => {
          pagoPorFaturaComp[p.fatura_id] = (pagoPorFaturaComp[p.fatura_id] || 0) + (Number(p.valor) || 0);
        });
      }

      // Estruturas auxiliares para casar pagamentos com cartões/faturas (fluxo anterior)
      let faturasMap = {};
      let cartoesPagamentosMap = {};

      if (pagamentos && pagamentos.length > 0) {
        const faturaIds = [...new Set(pagamentos.map((p) => p.fatura_id).filter(Boolean))];
        if (faturaIds.length > 0) {
          const { data: faturas } = await supabase
            .from('pessoal_faturas')
            .select('id, cartao_id, mes, ano, data_vencimento, status, data_pagamento')
            .in('id', faturaIds);
          faturasMap = Object.fromEntries((faturas || []).map((f) => [f.id, f]));

          const cartaoIds = [...new Set((faturas || []).map((f) => f.cartao_id).filter(Boolean))];
          if (cartaoIds.length > 0) {
            const { data: cartoesPag } = await supabase
              .from('pessoal_cartoes')
              .select('id, nome, bandeira')
              .in('id', cartaoIds);
            cartoesPagamentosMap = Object.fromEntries((cartoesPag || []).map((c) => [c.id, c]));
          }
        }
      }

      // Soma dos pagamentos por fatura (uma fatura pode ter vários pagamentos parciais)
      const pagamentosPorFatura = {};
      pagamentos.forEach((p) => {
        if (!p.fatura_id) return;
        pagamentosPorFatura[p.fatura_id] = (pagamentosPorFatura[p.fatura_id] || 0) + (Number(p.valor) || 0);
      });

      // Constrói lista de "realizados de cartão" (pagamento de fatura) com descrição
      // baseada no nome do cartão, para casar com despesas previstas por descrição.
      const realizadosCartao = Object.entries(pagamentosPorFatura).map(([faturaId, valor]) => {
        const fatura = faturasMap[faturaId] || {};
        const cartao = cartoesPagamentosMap[fatura.cartao_id] || {};
        const nomeCartao = cartao.nome || 'Cartão';
        const refMesAno = fatura.mes && fatura.ano ? `${fatura.mes}/${fatura.ano}` : '';
        return {
          id: `pag-${faturaId}`,
          fatura_id: faturaId,
          cartao_id: fatura.cartao_id,
          nome_cartao: nomeCartao,
          nome_cartao_norm: normalize(nomeCartao),
          ref_mes_ano: refMesAno,
          valor: valor,
          data_vencimento_fatura: fatura.data_vencimento || null,
          fatura_status: fatura.status || null,
        };
      });

      // ---- Compras do cartão como compromisso/previsto (competência pelo fechamento) ----
      // Filtra lançamentos cuja competência (dia de fechamento) cai no mês alvo.
      const compLancamentos = (lancamentos || []).filter((l) => {
        const cartao = cartoesMap[l.cartao_id];
        if (!cartao) return false;
        const comp = competenciaFatura(l.data, cartao.dia_fechamento);
        return !!comp && comp.mes === target0 && comp.ano === year;
      });

      // Conjunto de cartões que possuem compras neste mês — para evitar duplicidade
      // entre a compra (previsto) e o pagamento da fatura (realizado) no fluxo manual.
      const cartoesComCompras = new Set(compLancamentos.map((l) => l.cartao_id));

      // Soma do previsto por cartão na competência (para ratear pagamentos parciais).
      const sumPrevistoPorCartao = {};
      compLancamentos.forEach((l) => {
        const v = getInstallmentValue(l.valor, l.parcelas, l.parcela_atual);
        sumPrevistoPorCartao[l.cartao_id] = (sumPrevistoPorCartao[l.cartao_id] || 0) + v;
      });

      const entradasCartao = compLancamentos.map((l) => {
        const cartao = cartoesMap[l.cartao_id];
        const fatura = faturasCompMap[l.cartao_id];
        const totalPago = fatura ? pagoPorFaturaComp[fatura.id] || 0 : 0;
        const installmentValue = getInstallmentValue(l.valor, l.parcelas, l.parcela_atual);

        // A compra individual não reduz o saldo realizado; somente o pagamento da
        // fatura representa a saída de caixa. O realizado vem do status da fatura.
        let valorReal = 0;
        let status = 'Pendente';

        if (fatura && fatura.status === 'paga') {
          valorReal = installmentValue;
          status = 'Pago';
        } else if (fatura && totalPago > 0) {
          const sumPrev = sumPrevistoPorCartao[l.cartao_id] || installmentValue;
          const ratio = sumPrev > 0 ? Math.min(1, totalPago / sumPrev) : 0;
          valorReal = installmentValue * ratio;
          if (valorReal >= installmentValue) status = 'Pago';
          else if (valorReal > 0) status = 'Pago Parcialmente';
          else status = 'Pendente';
        }

        // Data de vencimento: da fatura fechada, senão do dia de vencimento do cartão
        // na competência, senão a própria data da compra.
        let dataVencimento = fatura?.data_vencimento || null;
        if (!dataVencimento && cartao?.dia_vencimento) {
          try {
            dataVencimento = format(
              setDate(new Date(year, target0, 1), Math.min(Math.max(cartao.dia_vencimento, 1), 28)),
              'yyyy-MM-dd'
            );
          } catch {
            dataVencimento = l.data;
          }
        }
        if (!dataVencimento) dataVencimento = l.data;

        // Atrasado: sem realizado e vencimento no passado.
        if (valorReal === 0 && status === 'Pendente') {
          try {
            const venc = parseISO(dataVencimento);
            if (isBefore(venc, new Date()) && !isToday(venc)) status = 'Atrasado';
          } catch {
            /* ignora data inválida */
          }
        }

        const responsavelNome = l.responsavel_id ? usuariosMap[l.responsavel_id]?.nome || '' : '';
        const desc = `${l.descricao} (${l.parcela_atual}/${l.parcelas})${responsavelNome ? ' — ' + responsavelNome : ''}`;

        return {
          id: `cartao-${l.id}`,
          real_id: l.id,
          data_vencimento: dataVencimento,
          descricao: desc,
          categoria: 'Cartão de Crédito',
          valor_previsto: installmentValue,
          valor_real: valorReal,
          diferenca: installmentValue - valorReal,
          status,
          origem_real: 'cartao',
          origem: 'cartao',
          cartao_id: l.cartao_id,
        };
      });

      const processedData = previstas.map((prevista) => {
        const valorPrevisto = Number(prevista.valor) || 0;
        let valorReal = 0;
        let realDespesaId = null;
        let origemReal = null;

        const descNorm = normalize(prevista.descricao);

        // a) Casamento direto por matched_transaction_id (despesas)
        if (prevista.matched_transaction_id) {
          const matched = reais.find((r) => r.id === prevista.matched_transaction_id);
          if (matched) {
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
          }
        }

        // b) Casamento por descrição no banco de despesas
        if (valorReal === 0) {
          const matched = reais.find(
            (r) => normalize(r.despesa) === descNorm
          );
          if (matched) {
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
          }
        }

        // c) Casamento por nome do cartão no banco de cartão de crédito (pagamento de fatura).
        // Pula cartões que já possuem compras neste mês — essas compras já aparecem como
        // previsto e o realizado delas vem do status da fatura, evitando duplicidade.
        if (valorReal === 0) {
          const matchedCartao = realizadosCartao.find((rc) => {
            if (!rc.nome_cartao_norm) return false;
            if (rc.cartao_id && cartoesComCompras.has(rc.cartao_id)) return false;
            return (
              descNorm.includes(rc.nome_cartao_norm) ||
              rc.nome_cartao_norm.includes(descNorm)
            );
          });
          if (matchedCartao) {
            valorReal = matchedCartao.valor;
            realDespesaId = matchedCartao.id;
            origemReal = 'cartao';
          }
        }

        // d) Fallback: se marcada como Paga sem casamento, considera realizada
        if (valorReal === 0 && prevista.status === 'Pago') {
          valorReal = valorPrevisto;
          origemReal = 'manual';
        }

        const diferenca = valorPrevisto - valorReal;

        let calculatedStatus = 'Pendente';
        const vencimento = parseISO(prevista.data_vencimento);

        if (valorReal >= valorPrevisto && valorPrevisto > 0) {
          calculatedStatus = 'Pago';
        } else if (valorReal > 0 && valorReal < valorPrevisto) {
          calculatedStatus = 'Pago Parcialmente';
        } else if (valorReal === 0 && isBefore(vencimento, new Date()) && !isToday(vencimento)) {
          calculatedStatus = 'Atrasado';
        }

        return {
          id: prevista.id,
          real_id: realDespesaId,
          data_vencimento: prevista.data_vencimento,
          descricao: prevista.descricao,
          categoria: prevista.categoria || (origemReal === 'cartao' ? 'Cartão de Crédito' : 'Outros'),
          valor_previsto: valorPrevisto,
          valor_real: valorReal,
          diferenca: diferenca,
          status: calculatedStatus,
          origem_real: origemReal,
          origem: 'prevista',
        };
      });

      const allData = [...processedData, ...entradasCartao];
      allData.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
      setContasMes(allData);
    } catch (err) {
      console.error('Error fetching contas mes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return { contasMes, loading, error, refetch };
}
