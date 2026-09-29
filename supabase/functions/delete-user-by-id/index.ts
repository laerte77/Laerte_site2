import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';
import { corsHeaders } from './cors.ts';
import { getAdminContext } from '../_shared/admin.ts';

const tables = [
  'aportes','coletes','despesas','despesas_previstas','leituras','livros',
  'metas','receitas','rendimentos','tipos_despesa','tipos_receita',

  'barbearia_barbeiros','barbearia_clientes',
  'barbearia_lancamentos_assinaturas','barbearia_lancamentos_cortes',
  'barbearia_lancamentos_debitos','barbearia_lancamentos_despesas',
  'barbearia_lancamentos_servicos','barbearia_lancamentos_vendas',
  'barbearia_metas','barbearia_produtos','barbearia_servicos',
  'barbearia_tipos_corte','barbearia_tipos_despesa','barbearia_tipos_planos',

  'cargos_igreja','igreja_casamentos','igreja_classes','igreja_conjuntos',
  'igreja_despesas','igreja_despesas_previstas','igreja_dizimistas',
  'igreja_entradas','igreja_funcoes','igreja_membros',
  'igreja_tipos_despesa','igreja_tipos_entrada',

  'ent_artilharia','ent_contribuicoes','ent_despesas',
  'ent_despesas_lancamentos','ent_jogadores','ent_organizadores',
  'ent_participantes','ent_partidas','ent_players',

  'lm_clientes','lm_clientes_debito','lm_despesas','lm_despesas_previstas',
  'lm_dizimos_ofertas','lm_estoques_entradas','lm_estoques_inicial',
  'lm_estoques_perdas','lm_estoques_saidas','lm_folhas','lm_lanc_custos',
  'lm_lanc_despesas','lm_lanc_servicos','lm_lancamentos_metas','lm_metas',
  'lm_pedidos','lm_servicos','lm_tipos_folha',

  'pessoal_cartao_lancamentos','pessoal_cartao_pagamentos',
  'pessoal_cartao_usuarios','pessoal_cartoes','pessoal_devedores',
  'pessoal_dizimos_ofertas','pessoal_faturas',
  'pessoal_orcamento_distribuicao','pessoal_orcamento_mensal',
  'pessoal_orcamento_quinzenas','pessoal_orcamento_salario_previsto',

  'modulo_cores'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const admin = await getAdminContext(req);

    if (!admin.ok)
      return new Response(JSON.stringify({ error: 'not_admin' }), {
        status: admin.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, force = false } = await req.json();

    if (!userId)
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    if (!force) {
      const results = await Promise.all(
        tables.map(async (table) => {
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (error) throw new Error(`${table}: ${error.message}`);
          return data?.length ? table : null;
        })
      );

      const found = results.filter(Boolean);

      if (found.length)
        return new Response(JSON.stringify({
          error: 'Este usuário possui dados relacionados',
          tables: found
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`${table}: ${error.message}`);
    }

    for (const table of ['usuarios_sistema', 'profiles']) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', userId);

      if (error) throw new Error(`${table}: ${error.message}`);
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete user error:', error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
