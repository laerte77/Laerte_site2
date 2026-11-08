import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO, isBefore, isToday, endOfMonth, setDate } from 'date-fns';
import { competenciaFatura } from '@/lib/cartaoCompetencia';
import { getInstallmentValue } from '@/lib/cartaoParcelas';

const normalize = str => {
  if (!str) return '';
  return String(str).toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
};

const toCents = value => Math.round((Number(value) || 0) * 100);
const fromCents = value => (Number(value) || 0) / 100;

const distributeCents = (items, totalCents, getId, getWeight) => {
  const result = new Map();
  const valid = items.map(item => ({
    id: getId(item),
    weight: Math.max(0, Number(getWeight(item)) || 0)
  })).filter(item => item.weight > 0);

  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  const target = Math.max(0, Math.min(Math.round(totalCents), totalWeight));

  if (!valid.length || target <= 0 || totalWeight <= 0) return result;

  let allocated = 0;
  const shares = valid.map(item => {
    const exact = target * item.weight / totalWeight;
    const base = Math.floor(exact);
    allocated += base;
    return { ...item, cents: base, remainder: exact - base };
  });

  let remaining = target - allocated;

  shares.slice().sort((a, b) => b.remainder - a.remainder).forEach(item => {
    if (remaining <= 0) return;
    const share = shares.find(x => x.id === item.id);
    if (share && share.cents < share.weight) {
      share.cents += 1;
      remaining -= 1;
    }
  });

  shares.forEach(item => result.set(item.id, item.cents));
  return result;
};

// Pagamento específico -> compra.
// Pagamento com responsável -> compras daquele responsável.
// Pagamento geral -> rateio proporcional entre os saldos restantes.
const calcularRateioLancamentos = (compras, pagamentos) => {
  const itens = (compras || []).map(compra => ({
    compra,
    id: String(compra.id),
    responsavel: compra.responsavel_id
      ? String(compra.responsavel_id)
      : '__sem_responsavel__',
    total: Math.max(0, toCents(getInstallmentValue(
      compra.valor, compra.parcelas, compra.parcela_atual
    ))),
    pago: 0
  }));

  const porId = new Map(itens.map(item => [item.id, item]));
  const pagamentosResponsavel = new Map();
  let saldoCompartilhado = 0;

  // 1. Pagamentos vinculados a uma compra específica.
  (pagamentos || []).forEach(pagamento => {
    const valor = Math.max(0, toCents(pagamento.valor));
    if (!valor) return;

    if (pagamento.lancamento_id) {
      const item = porId.get(String(pagamento.lancamento_id));
      if (item) item.pago = Math.min(item.total, item.pago + valor);
      return;
    }

    // 2. Pagamentos vinculados somente a um responsável.
    if (pagamento.responsavel_id) {
      const chave = String(pagamento.responsavel_id);
      pagamentosResponsavel.set(
        chave,
        (pagamentosResponsavel.get(chave) || 0) + valor
      );
      return;
    }

    // 3. Pagamentos manuais gerais.
    saldoCompartilhado += valor;
  });

  // Abate primeiro o saldo das compras de cada responsável.
  pagamentosResponsavel.forEach((valor, responsavelId) => {
    const grupo = itens.filter(item => item.responsavel === responsavelId);
    const saldoGrupo = grupo.reduce(
      (total, item) => total + Math.max(0, item.total - item.pago), 0
    );

    const valorAplicado = Math.min(valor, saldoGrupo);
    const rateio = distributeCents(
      grupo,
      valorAplicado,
      item => item.id,
      item => Math.max(0, item.total - item.pago)
    );

    rateio.forEach((centavos, id) => {
      const item = porId.get(id);
      if (item) item.pago += centavos;
    });

    // Excedente passa a integrar o saldo compartilhado.
    saldoCompartilhado += Math.max(0, valor - valorAplicado);
  });

  // Rateio geral proporcional entre todas as compras ainda pendentes.
  const pendentes = itens.filter(item => item.total > item.pago);
  const saldoPendente = pendentes.reduce(
    (total, item) => total + item.total - item.pago, 0
  );

  const valorRatear = Math.min(saldoCompartilhado, saldoPendente);
  const rateioGeral = distributeCents(
    pendentes,
    valorRatear,
    item => item.id,
    item => item.total - item.pago
  );

  rateioGeral.forEach((centavos, id) => {
    const item = porId.get(id);
    if (item) item.pago += centavos;
  });

  return new Map(
    itens.map(item => [item.id, Math.min(item.total, item.pago)])
  );
};

export function useContasMesData(userId, month, year) {
  const [contasMes, setContasMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pessoas, setPessoas] = useState([]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const target0 = month - 1;
      const startDate = format(new Date(year, target0, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, target0, 1)), 'yyyy-MM-dd');

      // 1. Despesas previstas.
      const { data: previstas, error: previstasError } = await supabase
        .from('despesas_previstas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (previstasError) throw previstasError;

      // 2. Despesas realizadas.
      const { data: reais, error: reaisError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (reaisError) throw reaisError;

      const reaisParaPrevisoes = (reais || []).filter(r => !(
        normalize(r.forma_pagamento) === 'credito' && r.cartao_id
      ));

      // 3. Pagamentos registrados no mês.
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pessoal_cartao_pagamentos')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (pagamentosError) throw pagamentosError;

      // 4. Cartões.
      const { data: cartoes, error: cartoesError } = await supabase
        .from('pessoal_cartoes')
        .select('id, nome, dia_fechamento, dia_vencimento')
        .eq('user_id', userId);

      if (cartoesError) throw cartoesError;

      const cartoesMap = Object.fromEntries(
        (cartoes || []).map(c => [c.id, c])
      );

      // 5. Lançamentos de compras de cartão.
      const lancStart = format(new Date(year, target0 - 1, 1), 'yyyy-MM-dd');
      const lancEnd = format(new Date(year, target0 + 2, 0), 'yyyy-MM-dd');

      const { data: lancamentos, error: lancamentosError } = await supabase
        .from('pessoal_cartao_lancamentos')
        .select('*')
        .eq('user_id', userId)
        .gte('data', lancStart)
        .lte('data', lancEnd);

      if (lancamentosError) throw lancamentosError;

      // 6. Pessoas cadastradas.
      const { data: usuarios, error: usuariosError } = await supabase
        .from('pessoal_cartao_usuarios')
        .select('id, nome')
        .eq('user_id', userId)
        .order('nome', { ascending: true });

      if (usuariosError) throw usuariosError;

      const listaPessoas = usuarios || [];
      const usuariosMap = Object.fromEntries(
        listaPessoas.map(u => [u.id, u])
      );

      setPessoas(listaPessoas);

      // 7. Faturas da competência.
      const { data: faturasComp, error: faturasCompError } = await supabase
        .from('pessoal_faturas')
        .select('*')
        .eq('user_id', userId)
        .eq('mes', target0)
        .eq('ano', year);

      if (faturasCompError) throw faturasCompError;

      const faturasCompMap = Object.fromEntries(
        (faturasComp || []).map(f => [f.cartao_id, f])
      );

      // 8. Pagamentos de cada fatura, incluindo o vínculo individual.
      const faturaCompIds = (faturasComp || [])
        .map(f => f.id)
        .filter(Boolean);

      const pagamentosPorFaturaComp = {};

      if (faturaCompIds.length > 0) {
        const { data: pagsComp, error: pagsCompError } = await supabase
          .from('pessoal_cartao_pagamentos')
          .select('fatura_id, valor, responsavel_id, lancamento_id, despesa_id')
          .in('fatura_id', faturaCompIds);

        if (pagsCompError) throw pagsCompError;

        (pagsComp || []).forEach(p => {
          if (!pagamentosPorFaturaComp[p.fatura_id]) {
            pagamentosPorFaturaComp[p.fatura_id] = [];
          }
          pagamentosPorFaturaComp[p.fatura_id].push(p);
        });
      }

      // Estruturas auxiliares para relacionar pagamentos pela data.
      let faturasMap = {};
      let cartoesPagamentosMap = {};

      if (pagamentos && pagamentos.length > 0) {
        const faturaIds = [
          ...new Set(pagamentos.map(p => p.fatura_id).filter(Boolean))
        ];

        if (faturaIds.length > 0) {
          const { data: faturas, error: faturasError } = await supabase
            .from('pessoal_faturas')
            .select('id, cartao_id, mes, ano, data_vencimento, status, data_pagamento')
            .in('id', faturaIds);

          if (faturasError) throw faturasError;

          faturasMap = Object.fromEntries(
            (faturas || []).map(f => [f.id, f])
          );

          const cartaoIds = [
            ...new Set((faturas || []).map(f => f.cartao_id).filter(Boolean))
          ];

          if (cartaoIds.length > 0) {
            const { data: cartoesPag, error: cartoesPagError } = await supabase
              .from('pessoal_cartoes')
              .select('id, nome, bandeira')
              .in('id', cartaoIds);

            if (cartoesPagError) throw cartoesPagError;

            cartoesPagamentosMap = Object.fromEntries(
              (cartoesPag || []).map(c => [c.id, c])
            );
          }
        }
      }

      // Soma dos pagamentos por fatura na data em que foram realizados.
      const pagamentosPorFatura = {};

      (pagamentos || []).forEach(p => {
        if (!p.fatura_id) return;
        pagamentosPorFatura[p.fatura_id] =
          (pagamentosPorFatura[p.fatura_id] || 0) + (Number(p.valor) || 0);
      });

      const realizadosCartao = Object.entries(pagamentosPorFatura).map(
        ([faturaId, valor]) => {
          const fatura = faturasMap[faturaId] || {};
          const cartao = cartoesPagamentosMap[fatura.cartao_id] || {};
          const nomeCartao = cartao.nome || 'Cartão';

          const refMesAno =
            fatura.mes !== null && fatura.mes !== undefined && fatura.ano
              ? `${String(fatura.mes + 1).padStart(2, '0')}/${fatura.ano}`
              : '';

          return {
            id: `pag-${faturaId}`,
            fatura_id: faturaId,
            cartao_id: fatura.cartao_id,
            nome_cartao: nomeCartao,
            nome_cartao_norm: normalize(nomeCartao),
            ref_mes_ano: refMesAno,
            valor,
            data_vencimento_fatura: fatura.data_vencimento || null,
            fatura_status: fatura.status || null
          };
        }
      );

      // Compras do cartão por competência.
      const compLancamentos = (lancamentos || []).filter(l => {
        const cartao = cartoesMap[l.cartao_id];
        if (!cartao) return false;

        const comp = competenciaFatura(l.data, cartao.dia_fechamento);
        return !!comp && comp.mes === target0 && comp.ano === year;
      });

      const cartoesComCompras = new Set(
        compLancamentos.map(l => l.cartao_id)
      );

      // Rateio individualizado por fatura.
      const rateioPorLancamento = new Map();

      (faturasComp || []).forEach(fatura => {
        const comprasDaFatura = compLancamentos.filter(
          l => l.cartao_id === fatura.cartao_id
        );

        const pagamentosDaFatura = pagamentosPorFaturaComp[fatura.id] || [];
        const rateio = calcularRateioLancamentos(
          comprasDaFatura,
          pagamentosDaFatura
        );

        rateio.forEach((valor, id) => rateioPorLancamento.set(id, valor));
      });

      // Compras individuais do cartão.
      const entradasCartao = compLancamentos.map(l => {
        const cartao = cartoesMap[l.cartao_id];
        const fatura = faturasCompMap[l.cartao_id];

        const installmentValue = getInstallmentValue(
          l.valor, l.parcelas, l.parcela_atual
        );

        const installmentCents = toCents(installmentValue);
        let valorRealCentavos = rateioPorLancamento.get(String(l.id))
          ?? rateioPorLancamento.get(l.id)
          ?? 0;

        const pagamentosDaFatura = fatura
          ? (pagamentosPorFaturaComp[fatura.id] || [])
          : [];

        // Compatibilidade com faturas antigas pagas manualmente,
        // mas sem registros de pagamentos individualizados.
        if (
          fatura &&
          fatura.status === 'paga' &&
          pagamentosDaFatura.length === 0
        ) {
          valorRealCentavos = installmentCents;
        }

        valorRealCentavos = Math.min(installmentCents, valorRealCentavos);
        const valorReal = fromCents(valorRealCentavos);

        let status = 'Pendente';

        if (valorRealCentavos >= installmentCents && installmentCents > 0) {
          status = 'Pago';
        } else if (valorRealCentavos > 0) {
          status = 'Pago Parcialmente';
        }

        let dataVencimento = fatura?.data_vencimento || null;

        if (!dataVencimento && cartao?.dia_vencimento) {
          try {
            dataVencimento = format(
              setDate(
                new Date(year, target0, 1),
                Math.min(Math.max(cartao.dia_vencimento, 1), 28)
              ),
              'yyyy-MM-dd'
            );
          } catch {
            dataVencimento = l.data;
          }
        }

        if (!dataVencimento) dataVencimento = l.data;

        if (valorRealCentavos === 0 && status === 'Pendente') {
          try {
            const venc = parseISO(dataVencimento);
            if (isBefore(venc, new Date()) && !isToday(venc)) {
              status = 'Atrasado';
            }
          } catch {
            // Ignora data inválida.
          }
        }

        const responsavelNome = l.responsavel_id
          ? usuariosMap[l.responsavel_id]?.nome || ''
          : '';

        const desc =
          `${l.descricao} (${l.parcela_atual}/${l.parcelas})` +
          `${responsavelNome ? ' — ' + responsavelNome : ''}`;

        return {
          id: `cartao-${l.id}`,
          real_id: l.id,
          responsavel_id: l.responsavel_id || null,
          responsavel_nome: responsavelNome || null,
          data_vencimento: dataVencimento,
          descricao: desc,
          categoria: 'Cartão de Crédito',
          valor_previsto: installmentValue,
          valor_real: valorReal,
          diferenca: fromCents(installmentCents - valorRealCentavos),
          status,
          origem_real: 'cartao',
          origem: 'cartao',
          cartao_id: l.cartao_id
        };
      });

      // Despesas previstas e correspondências com despesas reais.
      const despesasJaVinculadas = new Set();

      const processedData = (previstas || []).map(prevista => {
        const valorPrevisto = Number(prevista.valor) || 0;
        let valorReal = 0;
        let realDespesaId = null;
        let origemReal = null;
        let responsavelId = prevista.responsavel_id || null;

        const descNorm = normalize(prevista.descricao);

        // a) Correspondência direta pelo ID da despesa.
        if (prevista.matched_transaction_id) {
          const matched = reaisParaPrevisoes.find(
            r => r.id === prevista.matched_transaction_id
          );

          if (matched && !despesasJaVinculadas.has(matched.id)) {
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
            responsavelId = matched.responsavel_id || responsavelId;
            despesasJaVinculadas.add(matched.id);
          }
        }

        // b) Correspondência por descrição somente se for única.
        if (valorReal === 0) {
          const candidatas = reaisParaPrevisoes.filter(r =>
            normalize(r.despesa) === descNorm &&
            !despesasJaVinculadas.has(r.id)
          );

          if (candidatas.length === 1) {
            const matched = candidatas[0];
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
            responsavelId = matched.responsavel_id || responsavelId;
            despesasJaVinculadas.add(matched.id);
          }
        }

        // c) Correspondência com pagamentos gerais de cartão.
        if (valorReal === 0) {
          const matchedCartao = realizadosCartao.find(rc => {
            if (!rc.nome_cartao_norm) return false;

            if (rc.cartao_id && cartoesComCompras.has(rc.cartao_id)) {
              return false;
            }

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

        // d) Fallback para despesas marcadas manualmente como pagas.
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
        } else if (
          valorReal === 0 &&
          isBefore(vencimento, new Date()) &&
          !isToday(vencimento)
        ) {
          calculatedStatus = 'Atrasado';
        }

        return {
          id: prevista.id,
          real_id: realDespesaId,
          responsavel_id: responsavelId,
          responsavel_nome: responsavelId
            ? usuariosMap[responsavelId]?.nome || null
            : null,
          data_vencimento: prevista.data_vencimento,
          descricao: prevista.descricao,
          categoria: prevista.categoria ||
            (origemReal === 'cartao' ? 'Cartão de Crédito' : 'Outros'),
          valor_previsto: valorPrevisto,
          valor_real: valorReal,
          diferenca,
          status: calculatedStatus,
          origem_real: origemReal,
          origem: 'prevista'
        };
      });

      const allData = [...processedData, ...entradasCartao];

      allData.sort(
        (a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)
      );

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

  return {
    contasMes,
    loading,
    error,
    refetch,
    pessoas
  };
}
