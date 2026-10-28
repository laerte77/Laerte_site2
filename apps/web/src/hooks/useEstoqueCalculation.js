import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const norm = v => String(v || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

export function useEstoqueCalculation() {
  const { user } = useAuth();
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [lastMovement, setLastMovement] = useState(null);
  const mounted = useRef(false);

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setStockData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [d, s, c, i, t] = await Promise.all([
        supabase.from('lm_lanc_despesas')
          .select('data,tipo_lancamento,tipo_folha,quantidade,insumo_id,lm_despesas(despesa)')
          .eq('user_id', user.id)
          .eq('tipo_lancamento', 'Estoque')
          .not('quantidade', 'is', null),

        supabase.from('lm_lanc_servicos')
          .select('data,folhas_gastas')
          .eq('user_id', user.id)
          .not('folhas_gastas', 'is', null),

        supabase.from('lm_lanc_custos')
          .select('data_lancamento,tipo_folha,tipo,quantidade')
          .eq('user_id', user.id),

        supabase.from('lm_insumos')
          .select('id,nome,unidade,estoque_minimo,ativo')
          .eq('user_id', user.id),

        supabase.from('lm_tipos_folha')
          .select('tipo_folha,insumo_id')
          .eq('user_id', user.id)
      ]);

      for (const r of [d, s, c, i, t]) {
        if (r.error) throw r.error;
      }

      const despesas = d.data || [];
      const servicos = s.data || [];
      const custos = c.data || [];
      const insumos = i.data || [];
      const tipos = t.data || [];

      const porId = new Map(insumos.map(x => [String(x.id), x]));
      const porNome = new Map(insumos.map(x => [norm(x.nome), String(x.id)]));
      const folhaId = new Map();
      const folhaNome = new Map();

      tipos.forEach(x => {
        if (x.insumo_id && porId.has(String(x.insumo_id))) {
          folhaId.set(norm(x.tipo_folha), String(x.insumo_id));
          if (!folhaNome.has(String(x.insumo_id))) {
            folhaNome.set(String(x.insumo_id), x.tipo_folha);
          }
        } else if (porNome.has(norm(x.tipo_folha))) {
          folhaId.set(norm(x.tipo_folha), porNome.get(norm(x.tipo_folha)));
        }
      });

      const resolveId = (id, nome) => {
        if (id && porId.has(String(id))) return String(id);
        return folhaId.get(norm(nome)) || porNome.get(norm(nome)) || null;
      };

      const rows = {};

      const ensure = (id, nome, unidade) => {
        const iid = resolveId(id, nome);
        const ins = iid ? porId.get(iid) : null;
        const display = ins?.nome || nome;
        if (!norm(display)) return null;

        const key = iid ? `I:${iid}` : `N:${norm(display)}`;

        if (!rows[key]) {
          rows[key] = {
            insumo_id: iid,
            tipo_folha: folhaNome.get(iid) || display,
            nomeInsumo: display,
            unidade: ins?.unidade || unidade || 'unidade',
            estoque_minimo: ins?.estoque_minimo ?? null,
            baseline: 0,
            reposicoes: 0,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            folhasGastas: 0,
            consumoCustos: 0,
            estoqueAtual: 0,
            variacao: 0,
            auditoria: false
          };
        }

        return rows[key];
      };

      // Todos os materiais cadastrados começam com saldo zero.
      insumos.forEach(x => ensure(x.id, x.nome, x.unidade));

      let latest = null;
      const track = date => {
        if (date && (!latest || String(date) > String(latest))) latest = date;
      };

      // 1. Reposições: despesas classificadas como Estoque.
      despesas.forEach(x => {
        const quantidade = Number(x.quantidade);
        if (!Number.isFinite(quantidade) || quantidade <= 0) return;

        const nome = x.insumo_id
          ? porId.get(String(x.insumo_id))?.nome
          : x.tipo_folha;

        // Não atribuir despesa a material não identificado.
        if (!x.insumo_id && !norm(nome)) return;

        const row = ensure(x.insumo_id, nome);
        if (!row) return;

        row.reposicoes += quantidade;
        track(x.data);
      });

      // 2. Consumo em serviços. Rascunhos não movimentam estoque.
      servicos.forEach(x => {
        if (!Array.isArray(x.folhas_gastas)) return;

        x.folhas_gastas.forEach(f => {
          const quantidade = Number(f.quantidade);
          if (f.e_rascunho || !norm(f.tipo_folha) ||
              !Number.isFinite(quantidade) || quantidade <= 0) return;

          const row = ensure(null, f.tipo_folha);
          if (!row) return;

          row.folhasGastas += quantidade;
          track(x.data);
        });
      });

      // 3. Uso fora de serviço e perdas: lm_lanc_custos.
      custos.forEach(x => {
        const quantidade = Number(x.quantidade);
        const tipo = norm(x.tipo);

        if (!Number.isFinite(quantidade) || quantidade <= 0 ||
            !norm(x.tipo_folha)) return;

        if (tipo !== 'CONSUMO' && tipo !== 'PERDA') return;

        const row = ensure(null, x.tipo_folha);
        if (!row) return;

        if (tipo === 'CONSUMO') row.consumoCustos += quantidade;
        if (tipo === 'PERDA') row.perdas += quantidade;

        track(x.data_lancamento);
      });

      Object.values(rows).forEach(x => {
        x.estoqueAtual = x.reposicoes - x.folhasGastas
          - x.consumoCustos - x.perdas;
        x.variacao = x.estoqueAtual;
        x.auditoria = x.estoqueAtual < 0;
      });

      const output = {};
      Object.values(rows).forEach(x => {
        // ID evita sobrescrever materiais com nomes iguais.
        const key = x.insumo_id || norm(x.nomeInsumo);
        output[key] = x;
      });

      if (!mounted.current) return;
      setStockData(output);
      setLastUpdate(new Date());
      setLastMovement(latest);
    } catch (e) {
      console.error('Erro ao calcular estoque:', e);
      if (mounted.current) setError(e.message || 'Não foi possível calcular o estoque.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mounted.current = true;
    fetchAllData();

    if (!user) return () => { mounted.current = false; };

    const channel = supabase.channel(`stock-updates-${user.id}`);

    [
      'lm_lanc_despesas',
      'lm_lanc_servicos',
      'lm_lanc_custos',
      'lm_tipos_folha',
      'lm_insumos'
    ].forEach(table => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${user.id}`
      }, fetchAllData);
    });

    channel.subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, fetchAllData]);

  return {
    stockData, loading, isLoading: loading, error,
    refresh: fetchAllData, lastUpdate, lastMovement
  };
}

