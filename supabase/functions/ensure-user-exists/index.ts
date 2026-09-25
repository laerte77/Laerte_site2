import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Exige autenticação
    const auth = req.headers.get('Authorization');

    if (!auth) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    const token = auth.replace(/^Bearer\s+/i, '');

    // 2. Cliente administrativo
    // Só será usado depois de validar o JWT.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Valida o JWT do usuário
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    // 4. Lê o corpo da requisição
    const body = await req.json().catch(() => ({}));

    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    // 5. Impede um usuário de informar o ID de outra pessoa
    if (userId !== authUser.id) {
      return new Response(JSON.stringify({
        error: 'User ID does not match authenticated user'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    // 6. O email verdadeiro vem do JWT.
    // Não confiamos em email enviado pelo frontend.
    if (!authUser.email) {
      return new Response(JSON.stringify({
        error: 'Authenticated user has no email'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    const normalizedEmail = authUser.email.trim().toLowerCase();

    // 7. Procura o usuário na tabela do sistema
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('usuarios_sistema')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(
        'Error checking user existence:',
        checkError
      );

      throw checkError;
    }

    // 8. Se já existe, confirma que pertence ao usuário autenticado
    if (existingUser) {

      if (existingUser.id !== authUser.id) {
        console.error(
          'User identity mismatch:',
          {
            email: normalizedEmail,
            authenticatedUserId: authUser.id,
            existingRecordId: existingUser.id
          }
        );

        return new Response(JSON.stringify({
          error: 'User identity mismatch'
        }), {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      }

      return new Response(JSON.stringify({
        data: existingUser
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

    // 9. Usuário autenticado existe no Auth,
    // mas ainda não possui registro em usuarios_sistema.
    const now = new Date().toISOString();

    const { data: newUser, error: insertError } =
      await supabaseAdmin
        .from('usuarios_sistema')
        .insert([
          {
            id: authUser.id,
            email: normalizedEmail,
            modulos_acesso: ['pessoal'],
            criado_em: now,
            atualizado_em: now
          }
        ])
        .select()
        .single();

    if (insertError) {
      console.error(
        'Error inserting new user:',
        insertError
      );

      throw insertError;
    }

    return new Response(JSON.stringify({
      data: newUser
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {

    console.error(
      'ensure-user-exists error:',
      error
    );

    return new Response(JSON.stringify({
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });
  }
});
