import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getAdminContext(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) return { ok: false, status: 401 };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const token = auth.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401 };

  const { data: profile } = await supabase.from('profiles')
    .select('is_admin').eq('id', user.id).maybeSingle();

  return profile?.is_admin === true
    ? { ok: true, user, supabase }
    : { ok: false, status: 403 };
}
