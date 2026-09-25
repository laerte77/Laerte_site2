import { corsHeaders } from "./cors.ts";
import { getAdminContext } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = await getAdminContext(req);

    if (!admin.ok) {
      return new Response(JSON.stringify({ error: 'not_admin' }), {
        status: admin.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = admin.supabase;
    const { userId, force = false } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tablesToCheck = [
      'igreja_entradas', 'igreja_despesas_previstas', 'igreja_membros',
      'lm_lanc_servicos', 'lm_lanc_despesas', 'despesas_previstas',
      'ent_partidas', 'ent_artilharia', 'igreja_despesas',
      'cargos_igreja', 'igreja_conjuntos', 'igreja_funcoes', 'igreja_classes',
      'igreja_dizimistas', 'igreja_tipos_entrada', 'igreja_tipos_despesa',
      'lm_clientes', 'lm_servicos', 'lm_despesas', 'lm_clientes_debito',
      'lm_despesas_previstas', 'lm_folhas', 'lm_dizimos_ofertas',
      'lm_metas', 'lm_tipos_folha', 'ent_players', 'ent_jogadores',
      'despesas', 'receitas', 'leituras', 'metas', 'aportes', 'rendimentos',
      'tipos_receita', 'tipos_despesa', 'livros',
      'pessoal_devedores', 'pessoal_dizimos_ofertas'
    ];

    if (!force) {
      const results = await Promise.all(
        tablesToCheck.map(async (table) => {
          const { data } = await supabaseAdmin
            .from(table)
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          return data?.length ? table : null;
        })
      );

      const tablesWithData = results.filter(Boolean);

      if (tablesWithData.length > 0) {
        return new Response(JSON.stringify({
          error: 'Este usuário possui dados relacionados',
          tables: tablesWithData
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    for (const table of tablesToCheck) {
      await supabaseAdmin.from(table).delete().eq('user_id', userId);
    }

    await supabaseAdmin.from('usuarios_sistema').delete().eq('id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete user error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
