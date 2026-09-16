import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useProfileEnsure } from '@/hooks/useProfileEnsure';
import { validateStoredTokens, clearAuthTokens } from '@/lib/tokenUtils';
import { usePermissionsRealtime } from '@/hooks/usePermissionsRealtime';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const { ensureProfile } = useProfileEnsure();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use a ref to access current profile state inside callbacks without triggering re-renders
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const fetchProfile = useCallback(async (currentUser, isUpdate = false) => {
    try {
      const validProfile = await ensureProfile(currentUser);
      
      if (isUpdate && profileRef.current) {
          const oldModules = JSON.stringify(profileRef.current.allowed_modules);
          const newModules = JSON.stringify(validProfile?.allowed_modules);
          
          if (oldModules !== newModules) {
              window.dispatchEvent(new CustomEvent('permissionsUpdated', { 
                  detail: { allowed_modules: validProfile?.allowed_modules } 
              }));
          }
      }

      setProfile(validProfile || null);
      
      if (validProfile?.data_sharing_preferences) {
        localStorage.setItem('data_sharing_preferences', JSON.stringify(validProfile.data_sharing_preferences));
      } else {
        localStorage.removeItem('data_sharing_preferences');
      }
    } catch (err) {
      console.error('Unexpected error fetching profile in context:', err);
      setProfile(null);
      localStorage.removeItem('data_sharing_preferences');
    }
  }, [ensureProfile]);

  const handleSession = useCallback(async (currentSession) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    if (currentSession?.user) {
      await fetchProfile(currentSession.user, false);
    } else {
      setProfile(null);
      localStorage.removeItem('data_sharing_preferences');
    }
    
    setLoading(false);
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
      if (user) await fetchProfile(user, true);
  }, [user, fetchProfile]);

  // Hook handles real-time sync of user permissions automatically
  // It uses refs internally now, so it won't infinitely reconnect when profile changes
  usePermissionsRealtime(user?.id, refreshProfile);

  useEffect(() => {
    const getSession = async () => {
      try {
        if (localStorage.length > 0) {
            const isValid = validateStoredTokens();
            if (!isValid) {
                console.warn("[Auth] Invalid or missing tokens on init, clearing state.");
                clearAuthTokens();
                await supabase.auth.signOut();
            }
        }

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session retrieval error:', error);
            if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
                clearAuthTokens();
                await supabase.auth.signOut();
            }
        }
        
        await handleSession(data?.session);
      } catch (err) {
        console.error('Error getting initial session:', err);
        clearAuthTokens();
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'TOKEN_REFRESHED') {
            console.log('[Auth] Token successfully refreshed automatically');
        } else if (event === 'SIGNED_OUT') {
            clearAuthTokens();
        }
        await handleSession(currentSession);
      }
    );

    return () => subscription?.unsubscribe();
  }, [handleSession]);

  const isAdmin = useMemo(() => {
  return profile?.is_admin === true;
}, [profile]);

  const dataSharingPreferences = useMemo(() => {
    return profile?.data_sharing_preferences || {};
  }, [profile]);

  const getAllowedModules = useCallback(() => {
    if (isAdmin) {
      return ['pessoal', 'igreja', 'igreja:tesouraria', 'igreja:secretaria', 'lm-impressoes', 'lm_impressoes', 'barbearia', 'entretenimento'];
    }
    if (!profile || !profile.allowed_modules) return [];
    let modules = profile.allowed_modules;
    if (typeof modules === 'string') {
      try { modules = JSON.parse(modules); } catch (e) { modules = []; }
    }
    return Array.isArray(modules) ? modules : [];
  }, [isAdmin, profile]);

  const userModules = getAllowedModules();

  const canAccessModule = useCallback((moduleName) => {
    if (isAdmin) return true;
    const modules = getAllowedModules();
    const normalizedModule = moduleName.toLowerCase().replace('-', '_');

    if (normalizedModule === 'igreja') {
        return modules.some(m => typeof m === 'string' && (m.toLowerCase() === 'igreja' || m.toLowerCase().startsWith('igreja:')));
    }

    const hasDirect = modules.some(m => typeof m === 'string' && m.toLowerCase().replace('-', '_') === normalizedModule);
    if (hasDirect) return true;

    if (normalizedModule.startsWith('igreja:')) {
        const sub = normalizedModule.split(':')[1];
        for (const m of modules) {
            if (typeof m === 'object' && m !== null && !Array.isArray(m)) {
                for (const [key, subMods] of Object.entries(m)) {
                    if (key.toLowerCase() === 'igreja' && Array.isArray(subMods)) {
                        if (subMods.map(s => s.toLowerCase()).includes(sub)) return true;
                    }
                }
            }
        }
    }

    return false;
  }, [isAdmin, getAllowedModules]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password, options });
      if (error) toast({ variant: "destructive", title: "Erro no Cadastro", description: error.message });
      return { error };
    } catch (err) { return { error: err }; }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Erro no Login", description: "Credenciais inválidas ou erro de rede." });
      }
      return { error, data };
    } catch (err) { return { error: err }; }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      clearAuthTokens();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ variant: "destructive", title: "Erro ao Sair", description: error.message });
      }
      return { error };
    } catch (err) { return { error: err }; }
  }, [toast]);

  const value = useMemo(() => ({
    user, session, profile, loading, isAdmin, userModules, dataSharingPreferences,
    getAllowedModules, canAccessModule, signUp, signIn, signOut, refreshProfile
  }), [user, session, profile, loading, isAdmin, userModules, dataSharingPreferences, getAllowedModules, canAccessModule, signUp, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
