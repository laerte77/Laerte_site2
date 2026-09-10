import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();
    
    if (!email || !userId) {
      throw new Error('Missing required fields: email or userId');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize Supabase client with Service Role to bypass RLS if necessary
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if user exists in usuarios_sistema
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('usuarios_sistema')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user existence:', checkError);
      throw checkError;
    }

    // 2. If user exists, return it
    if (existingUser) {
      return new Response(JSON.stringify({ data: existingUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. If user does not exist, create it with default module 'pessoal'
    const now = new Date().toISOString();
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('usuarios_sistema')
      .insert([
        {
          id: userId,
          email: normalizedEmail,
          modulos_acesso: ['pessoal'],
          criado_em: now,
          atualizado_em: now
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting new user:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ data: newUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});