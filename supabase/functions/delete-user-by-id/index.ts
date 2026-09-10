import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";
import { corsHeaders } from "./cors.ts";

/**
 * DOCUMENTATION: Foreign Key Relationships Referencing Users
 * 
 * The following tables contain a 'user_id' column that implicitly or explicitly 
 * references the auth.users table (or the profiles table which maps 1:1 to auth.users):
 * 
 * Igreja Module:
 * - cargos_igreja, igreja_membros, igreja_tipos_entrada, igreja_tipos_despesa,
 *   igreja_dizimistas, igreja_entradas, igreja_despesas, igreja_funcoes, 
 *   igreja_conjuntos, igreja_classes, igreja_despesas_previstas
 * 
 * Pessoal Module:
 * - despesas, receitas, despesas_previstas, leituras, metas, aportes, 
 *   rendimentos, tipos_receita, tipos_despesa, livros, pessoal_devedores, 
 *   pessoal_dizimos_ofertas
 * 
 * Lanhouse Module:
 * - lm_clientes, lm_despesas, lm_servicos, lm_lanc_servicos, lm_lanc_despesas, 
 *   lm_clientes_debito, lm_despesas_previstas, lm_folhas, lm_dizimos_ofertas, 
 *   lm_metas, lm_tipos_folha
 * 
 * Entretenimento Module:
 * - ent_players, ent_jogadores, ent_partidas, ent_artilharia
 * 
 * System:
 * - profiles, usuarios_sistema
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, force = false } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Ordered list of tables to avoid FK constraint errors during deletion
    const tablesToCheck = [
      // Level 1: Foreign key dependents
      'igreja_entradas', 'igreja_despesas_previstas', 'igreja_membros',
      'lm_lanc_servicos', 'lm_lanc_despesas', 'despesas_previstas',
      'ent_partidas', 'ent_artilharia', 'igreja_despesas',
      
      // Level 2: Entities & Lookups
      'cargos_igreja', 'igreja_conjuntos', 'igreja_funcoes', 'igreja_classes',
      'igreja_dizimistas', 'igreja_tipos_entrada', 'igreja_tipos_despesa',
      'lm_clientes', 'lm_servicos', 'lm_despesas', 'lm_clientes_debito',
      'lm_despesas_previstas', 'lm_folhas', 'lm_dizimos_ofertas', 'lm_metas', 'lm_tipos_folha',
      'ent_players', 'ent_jogadores',
      'despesas', 'receitas', 'leituras', 'metas', 'aportes', 'rendimentos',
      'tipos_receita', 'tipos_despesa', 'livros',
      'pessoal_devedores', 'pessoal_dizimos_ofertas'
    ];

    if (!force) {
      const tablesWithData = [];
      
      // Check all tables concurrently to speed up the process
      const checkPromises = tablesToCheck.map(async (table) => {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .eq('user_id', userId)
          .limit(1);
          
        if (data && data.length > 0) {
          return table;
        }
        return null;
      });

      const results = await Promise.all(checkPromises);
      tablesWithData.push(...results.filter(t => t !== null));

      if (tablesWithData.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'Este usuário possui dados relacionados', 
          tables: tablesWithData 
        }), { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Process deletion: cascade delete all related records first
    for (const table of tablesToCheck) {
       const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
       if (error) {
         console.error(`Error deleting from ${table}:`, error);
         // Continue deletion attempt on other tables even if one fails
       }
    }

    // Delete from system user tables
    await supabaseAdmin.from('usuarios_sistema').delete().eq('id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Finally delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});