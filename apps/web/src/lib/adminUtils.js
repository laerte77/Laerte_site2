import { supabase } from '@/lib/customSupabaseClient';

export const createUserWithModules = async (email, password, modules, sharingPreferences = {}) => {
  try {
    const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
      body: { email, password, allowed_modules: modules }
    });

    if (authError) throw authError;
    if (authData?.error) throw new Error(authData.error);

    const { data: usersData, error: usersError } = await supabase.functions.invoke('list-users');
    if (usersError) throw usersError;
    
    const newUser = usersData?.users?.find(u => u.email === email);
    if (!newUser) throw new Error("Usuário criado, mas não foi possível localizá-lo para vínculo.");

    const { error: dbError } = await supabase
      .from('usuarios_sistema')
      .insert([
        {
          id: newUser.id,
          email: email,
          modulos_acesso: modules,
          data_sharing_preferences: sharingPreferences
        }
      ]);

    if (dbError) {
      console.error("Erro ao inserir em usuarios_sistema, tentando atualizar profiles:", dbError);
      throw dbError;
    }

    await supabase.from('profiles').update({ 
      allowed_modules: modules,
      data_sharing_preferences: sharingPreferences
    }).eq('id', newUser.id);

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Error in createUserWithModules:", error);
    throw error;
  }
};

export const updateUserModules = async (userId, email, password, modules, sharingPreferences = {}) => {
  try {
    console.log(`[AdminUtils] Atualizando módulos para o usuário ${userId}`, modules);

    // 1. Update usuarios_sistema
    const { error: dbError } = await supabase
      .from('usuarios_sistema')
      .update({
        modulos_acesso: modules,
        data_sharing_preferences: sharingPreferences,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', userId);

    if (dbError) {
        console.error("[AdminUtils] Erro ao atualizar usuarios_sistema:", dbError);
        throw dbError;
    }

    // 2. Sync with profiles table to ensure consistency
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        allowed_modules: modules,
        data_sharing_preferences: sharingPreferences
      })
      .eq('id', userId);

    if (profileError) {
        console.error("[AdminUtils] Erro ao sincronizar tabela profiles:", profileError);
        throw profileError;
    }

    console.log(`[AdminUtils] Permissões atualizadas com sucesso para ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserModules:", error);
    throw error;
  }
};

export const deleteUser = async (userId, force = false) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = supabase.supabaseUrl;
    const supabaseKey = supabase.supabaseKey;

    if (!supabaseUrl) {
      throw new Error("Supabase URL is missing");
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/delete-user-by-id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ userId, force })
    });

    if (res.status === 409) {
      const body = await res.json();
      return { success: false, status: 409, tables: body.tables };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Erro desconhecido ao deletar.' }));
      throw new Error(body.error || 'Falha na comunicação com o servidor ao deletar usuário.');
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios_sistema')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return { success: true, users: data };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    
    const { data: edgeData } = await supabase.functions.invoke('list-users');
    if (edgeData?.users) {
        return { success: true, users: edgeData.users.map(u => ({ id: u.id, email: u.email, modulos_acesso: [], data_sharing_preferences: {} })) };
    }

    throw error;
  }
};