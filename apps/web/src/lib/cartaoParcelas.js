// Cálculo preciso de parcelas de cartão de crédito.
//
// Divide o valor total da compra em N parcelas com precisão de centavos,
// garantindo que a soma das parcelas seja EXATAMENTE igual ao valor total.
// A diferença de arredondamento (centavos restantes) é aplicada integralmente
// na 1ª parcela, seguindo o padrão:
//   - Mesa:   1ª parcela R$ 137,42 e demais R$ 137,41
//   - Fogão:  1ª parcela R$ 253,26 e demais R$ 253,24
//
// `valorTotal` é o valor total da compra (armazenado na coluna `valor`).
// `parcelas` é a quantidade total de parcelas.
// `parcelaAtual` é o número da parcela (1..N) cujo valor se deseja obter.

export const getInstallmentValue = (valorTotal, parcelas, parcelaAtual = 1) => {
  const total = Number(valorTotal) || 0;
  const n = Math.max(1, parseInt(parcelas, 10) || 1);
  if (n === 1) return total;

  // Trabalha em centavos para evitar erro de ponto flutuante.
  const cents = Math.round(total * 100);
  const baseCents = Math.floor(cents / n);
  const remainderCents = cents - baseCents * n; // centavos excedentes (0..n-1)

  const pa = Math.min(Math.max(1, parseInt(parcelaAtual, 10) || 1), n);
  // Toda a diferença de arredondamento vai para a 1ª parcela.
  const valueCents = pa === 1 ? baseCents + remainderCents : baseCents;

  return valueCents / 100;
};

// Soma o valor das parcelas visíveis de um conjunto de lançamentos,
// usando o cálculo preciso por parcela (cada linha representa uma parcela).
export const sumInstallments = (lancamentos) =>
  (lancamentos || []).reduce(
    (acc, l) => acc + getInstallmentValue(l.valor, l.parcelas, l.parcela_atual),
    0,
  );
