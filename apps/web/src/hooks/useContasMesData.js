import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO, isBefore, isToday, endOfMonth, setDate } from 'date-fns';
import { competenciaFatura } from '@/lib/cartaoCompetencia';
import { getInstallmentValue } from '@/lib/cartaoParcelas';

// Normaliza texto para comparação.
const normalize = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};

const toCents = value => Math.round((Number(value) || 0) * 100);
const fromCents = value => (Number(value) || 0) / 100;

// Distribui um valor em centavos proporcionalmente aos pesos, preservando o total.
const distributeCents = (items, totalCents, getId, getWeight) => {
  const result = new Map();
  const valid = items
    .map(item => ({
      id: getId(item),
      weight: Math.max(0, Number(getWeight(item)) || 0)
    }))
    .filter(item => item.weight > 0);

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
  shares
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .forEach(item => {
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

// Regra A: pagamentos com responsável reduzem primeiro o saldo dessa pessoa.
// Pagamentos sem responsável e excedentes são rateados pelo saldo restante.
const calcularRateioLancamentos = (compras, pagamentos) => {
  const grupos = new Map();
  const pagamentosDiretos = new Map();
  let saldoCompartilhado = 0;

  (compras || []).forEach(compra => {
    const chave = compra.responsavel_id ? String(compra.responsavel_id) : '__sem_responsavel__';
    if (!grupos.has(chave)) grupos.set(chave, { compras: [], total: 0, direto: 0, restante: 0, rateio: 0 });

    const grupo = grupos.get(chave);
    const valor = toCents(getInstallmentValue(
      compra.valor,
      compra.parcelas,
      compra.parcela_atual
    ));

    grupo.compras.push({ compra, valor });
    grupo.total += valor;
  });

  (pagamentos || []).forEach(pagamento => {
    const valor = Math.max(0, toCents(pagamento.valor));
    if (!valor) return;

    if (pagamento.responsavel_id) {
      const chave = String(pagamento.responsavel_id);
      pagamentosDiretos.set(chave, (pagamentosDiretos.get(chave) || 0) + valor);
    } else {
      saldoCompartilhado += valor;
    }
  });

  // Pagamento direto de pessoa sem compras nesta competência vira saldo compartilhado.
  pagamentosDiretos.forEach((valor, chave) => {
    if (!grupos.has(chave)) saldoCompartilhado += valor;
  });

  let totalRestante = 0;
  grupos.forEach((grupo, chave) => {
    const diretoInformado = grupos.has(chave) ? (pagamentosDiretos.get(chave) || 0) : 0;
    grupo.direto = Math.min(grupo.total, diretoInformado);
    grupo.restante = Math.max(0, grupo.total - grupo.direto);
    saldoCompartilhado += Math.max(0, diretoInformado - grupo.total);
    totalRestante += grupo.restante;
  });

  const gruposComSaldo = Array.from(grupos.entries())
    .filter(([, grupo]) => grupo.restante > 0)
    .map(([id, grupo]) => ({ id, restante: grupo.restante }));

  const totalRatear = Math.min(saldoCompartilhado, totalRestante);
  const rateioGrupos = distributeCents(
    gruposComSaldo,
    totalRatear,
    item => item.id,
    item => item.restante
  );

  const rateioPorLancamento = new Map();

  grupos.forEach((grupo, chave) => {
    const totalPessoaPago = Math.min(
      grupo.total,
      grupo.direto + (rateioGrupos.get(chave) || 0)
    );

    const rateioItens = distributeCents(
      grupo.compras,
      totalPessoaPago,
      item => item.compra.id,
      item => item.valor
    );

    rateioItens.forEach((valor, id) => rateioPorLancamento.set(id, valor));
  });

  return rateioPorLancamento;
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
      // O mês recebido é 1-indexado.
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

      // 2. Despesas realizadas. Crédito vinculado a cartão é pagamento de fatura,
      // não uma compra individual; será considerado pela tabela de pagamentos.
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

      // 3. Pagamentos do cartão registrados no mês.
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

      // 8. Pagamentos de cada fatura, preservando o responsável de cada origem.
      const faturaCompIds = (faturasComp || [])
        .map(f => f.id)
        .filter(Boolean);

      const pagamentosPorFaturaComp = {};

      if (faturaCompIds.length > 0) {
        const { data: pagsComp, error: pagsCompError } = await supabase
          .from('pessoal_cartao_pagamentos')
          .select('fatura_id, valor, responsavel_id')
          .in('fatura_id', faturaCompIds);

        if (pagsCompError) throw pagsCompError;

        (pagsComp || []).forEach(p => {
          if (!pagamentosPorFaturaComp[p.fatura_id]) {
            pagamentosPorFaturaComp[p.fatura_id] = [];
          }

          pagamentosPorFaturaComp[p.fatura_id].push(p);
        });
      }

      // Estruturas auxiliares para relacionar pagamentos pela data de pagamento.
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

      // Rateio individualizado por fatura e por responsável.
      const rateioPorLancamento = new Map();

      (faturasComp || []).forEach(fatura => {
        const comprasDaFatura = compLancamentos.filter(
          l => l.cartao_id === fatura.cartao_id
        );
        const pagamentosDaFatura = pagamentosPorFaturaComp[fatura.id] || [];
        const rateio = calcularRateioLancamentos(comprasDaFatura, pagamentosDaFatura);
        rateio.forEach((valor, id) => rateioPorLancamento.set(id, valor));
      });

      // Compras individuais do cartão com o valor pago atribuído ao responsável.
      const entradasCartao = compLancamentos.map(l => {
        const cartao = cartoesMap[l.cartao_id];
        const fatura = faturasCompMap[l.cartao_id];

        const installmentValue = getInstallmentValue(
          l.valor,
          l.parcelas,
          l.parcela_atual
        );
        const installmentCents = toCents(installmentValue);

        let valorRealCentavos = rateioPorLancamento.get(l.id) || 0;

        // Mantém compatibilidade com faturas antigas marcadas como pagas manualmente.
        if (fatura && fatura.status === 'paga') {
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
      // Pagamentos de crédito vinculados a cartão ficam fora desta busca para
      // que não sejam confundidos com compras ou despesas comuns.
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

          if (matched) {
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
            responsavelId = matched.responsavel_id || responsavelId;
          }
        }

        // b) Correspondência pela descrição.
        if (valorReal === 0) {
          const matched = reaisParaPrevisoes.find(
            r => normalize(r.despesa) === descNorm
          );

          if (matched) {
            valorReal = Number(matched.valor) || 0;
            realDespesaId = matched.id;
            origemReal = 'despesa';
            responsavelId = matched.responsavel_id || responsavelId;
          }
        }

        // c) Correspondência com pagamentos de cartão (faturas gerais).
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

        // d) Fallback para despesas marcadas como pagas.
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
