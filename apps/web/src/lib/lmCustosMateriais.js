const arredondarUnitario = v => Number((Number(v) || 0).toFixed(6));

const consultaCompra = async ({ supabase, userId, dataReferencia, filtro }) => {
  let q = supabase
    .from('lm_lanc_despesas')
    .select('valor,quantidade,data,created_at,insumo_id,tipo_folha')
    .eq('user_id', userId)
    .eq('tipo_lancamento', 'Estoque')
    .not('quantidade', 'is', null)
    .gt('quantidade', 0)
    .gt('valor', 0);

  q = filtro(q);

  if (dataReferencia) {
    q = q.lte('data', String(dataReferencia).slice(0, 10));
  }

  const { data, error } = await q
    .order('data', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
};

const compararCompras = (a, b) => {
  const dataA = String(a.data || '').slice(0, 10);
  const dataB = String(b.data || '').slice(0, 10);

  if (dataA !== dataB) return dataB.localeCompare(dataA);

  return String(b.created_at || '').localeCompare(
    String(a.created_at || '')
  );
};

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
      .select('tipo_folha,preco,is_special,insumo_id')
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

  let compras = [];

  if (cadastro?.insumo_id) {
    // Compara compras vinculadas ao insumo e compras legadas sem vínculo.
    const resultados = await Promise.all([
      consultaCompra({
        supabase,
        userId,
        dataReferencia,
        filtro: q => q.eq('insumo_id', cadastro.insumo_id)
      }),
      consultaCompra({
        supabase,
        userId,
        dataReferencia,
        filtro: q => q
          .eq('tipo_folha', tipoFolha)
          .is('insumo_id', null)
      })
    ]);

    compras = resultados.filter(Boolean);
  } else {
    const compra = await consultaCompra({
      supabase,
      userId,
      dataReferencia,
      filtro: q => q.eq('tipo_folha', tipoFolha)
    });

    if (compra) compras.push(compra);
  }

  // Entre as fontes compatíveis, seleciona a compra válida mais recente.
  compras.sort(compararCompras);
  const compra = compras[0] || null;

  if (compra) {
    const quantidade = Number(compra.quantidade);
    const valor = Number(compra.valor);
    const unitario = arredondarUnitario(valor / quantidade);

    if (Number.isFinite(unitario) && unitario > 0 && quantidade > 0) {
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
      unitario: arredondarUnitario(referencia),
      origem: 'cadastro',
      estimado: true,
      pendente: false,
      dataCompra: null
    };
  }

  return pendente;
}

