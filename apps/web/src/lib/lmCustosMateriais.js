const arredondar = valor => Math.round((Number(valor) || 0) * 100) / 100;

export async function resolverCustoUnitarioMaterial({
  supabase,
  userId,
  tipoFolha,
  dataReferencia,
  tipoCadastro
}) {
  const pendente = {
    ok: false,
    unitario: 0,
    origem: 'pendente',
    estimado: false,
    pendente: true,
    dataCompra: null
  };

  if (!userId || !tipoFolha) return pendente;

  let cadastro = tipoCadastro;

  if (!cadastro) {
    const { data, error } = await supabase
      .from('lm_tipos_folha')
      .select('tipo_folha, preco, is_special')
      .eq('user_id', userId)
      .eq('tipo_folha', tipoFolha)
      .maybeSingle();

    if (error) throw error;
    cadastro = data;
  }

  if (cadastro?.is_special) {
    return {
      ok: true,
      unitario: 0,
      origem: 'especial',
      estimado: false,
      pendente: false,
      dataCompra: null
    };
  }

  let consulta = supabase
    .from('lm_lanc_despesas')
    .select('valor, quantidade, data, created_at')
    .eq('user_id', userId)
    .eq('tipo_lancamento', 'Estoque')
    .eq('tipo_folha', tipoFolha)
    .not('quantidade', 'is', null)
    .gt('quantidade', 0)
    .gt('valor', 0);

  if (dataReferencia) {
    consulta = consulta.lte('data', String(dataReferencia).slice(0, 10));
  }

  const { data: compras, error } = await consulta
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const compra = compras?.[0];

  if (compra) {
    const quantidade = Number(compra.quantidade);
    const valor = Number(compra.valor);
    const unitario = arredondar(valor / quantidade);

    if (
      Number.isFinite(unitario) &&
      unitario > 0 &&
      quantidade > 0
    ) {
      return {
        ok: true,
        unitario,
        origem: 'compra',
        estimado: false,
        pendente: false,
        dataCompra: compra.data || null
      };
    }
  }

  const referencia = Number(cadastro?.preco);

  if (Number.isFinite(referencia) && referencia > 0) {
    return {
      ok: true,
      unitario: arredondar(referencia),
      origem: 'cadastro',
      estimado: true,
      pendente: false,
      dataCompra: null
    };
  }

  return pendente;
}
