import { parse, setDate, addMonths } from 'date-fns';

// Retorna a competência { mes, ano } (mês 0-indexado) da fatura à qual pertence
// uma parcela, com base no dia de fechamento do cartão.
//
// A fatura do mês M cobre o período [fechamento(M-1), fechamento(M) - 1].
// Logo, uma compra/parcela em D pertence à fatura M+1 quando D >= fechamento
// do próprio mês de D; caso contrário pertence à fatura do próprio mês.
//
// Ex.: fechamento dia 20 -> compra em 25/08 cai na fatura de SETEMBRO.
export const competenciaFatura = (dataStr, diaFechamento) => {
  if (!dataStr) return null;
  let d;
  try {
    d = parse(dataStr, 'yyyy-MM-dd', new Date());
  } catch {
    return null;
  }
  if (Number.isNaN(d.getTime())) return null;
  const dia = Math.min(Math.max(parseInt(diaFechamento, 10) || 1, 1), 28);
  const fechamentoMes = setDate(d, dia); // dia de fechamento do mês de D
  if (d >= fechamentoMes) {
    const proximo = addMonths(d, 1);
    return { mes: proximo.getMonth(), ano: proximo.getFullYear() };
  }
  return { mes: d.getMonth(), ano: d.getFullYear() };
};

// Verifica se uma parcela pertence à competência (mes, ano) informada.
export const pertenceCompetencia = (dataStr, diaFechamento, mes, ano) => {
  const comp = competenciaFatura(dataStr, diaFechamento);
  return !!comp && comp.mes === mes && comp.ano === ano;
};
