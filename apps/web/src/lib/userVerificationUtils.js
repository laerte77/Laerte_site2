import { supabase } from '@/lib/customSupabaseClient';
import { normalizeEmail } from '@/lib/normalizeEmail';

/**
 * Utilitário para verificar a integridade de um usuário no sistema.
 * Verifica a existência no Supabase Auth e na tabela usuarios_sistema.
 * Se o usuário não for encontrado e um userId for fornecido, aciona a edge function para criá-lo.
 */
export const verifyUserSystemStatus = async (email, userId = null) => {
  const normEmail = normalizeEmail(email);
  
  try {
    const status = {
      email: normEmail,
      existsInAuth: false,
      existsInSystemTable: false,
      hasAllowedModules: false,
      authData: null,
      systemData: null,
      error: null
    };

    // 1. Tenta buscar o usuário na tabela usuarios_sistema
    const { data: sysUser, error: sysError } = await supabase
      .from('usuarios_sistema')
      .select('*')
      .eq('email', normEmail)
      .maybeSingle();

    if (sysError && sysError.code !== 'PGRST116') {
      console.warn("[verifyUserSystemStatus] Erro ao verificar usuarios_sistema:", sysError);
    }

    if (sysUser) {
      status.existsInSystemTable = true;
      status.systemData = sysUser;
      if (sysUser.modulos_acesso && sysUser.modulos_acesso.length > 0) {
        status.hasAllowedModules = true;
      }
    } else if (userId) {
      // Se não encontrou, mas temos o ID (após login), tentamos auto-criar via Edge Function
      console.log(`[verifyUserSystemStatus] Usuário ${normEmail} não encontrado. Tentando auto-criação...`);
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('ensure-user-exists', {
        body: JSON.stringify({ email: normEmail, userId })
      });

      if (!edgeError && edgeData?.data) {
        console.log(`[verifyUserSystemStatus] Auto-criação bem-sucedida para ${normEmail}`);
        status.existsInSystemTable = true;
        status.systemData = edgeData.data;
        status.hasAllowedModules = edgeData.data.modulos_acesso?.length > 0;
      }
    }

    // 2. Tenta buscar informações de profile como fallback adicional
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', normEmail)
      .maybeSingle();
      
    if (profile) {
       status.existsInSystemTable = true; // Se tem profile, consideramos que existe na base
       if (profile.allowed_modules && profile.allowed_modules.length > 0) {
           status.hasAllowedModules = true;
       }
    }

    return status;
  } catch (error) {
    console.error("[verifyUserSystemStatus] Erro na verificação:", error);
    return { error: error.message };
  }
};