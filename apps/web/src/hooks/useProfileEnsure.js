import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useProfileEnsure = () => {
    const [ensuring, setEnsuring] = useState(false);

    const ensureProfile = useCallback(async (user) => {
        if (!user) return null;
        setEnsuring(true);
        try {
            // Check if profile exists using .maybeSingle() to prevent PGRST116
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao verificar perfil:', error);
                return null;
            }

            // If profile doesn't exist, create it using upsert to avoid duplicate key constraints
            if (!data) {
                console.log('Perfil não encontrado. Criando perfil padrão...');
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .upsert([{ id: user.id, email: user.email }], { onConflict: 'id' })
                    .select()
                    .maybeSingle();
                
                if (insertError) {
                    console.error('Erro ao criar perfil padrão:', insertError);
                    return null;
                }
                return newProfile;
            }

            return data;
        } catch (err) {
            console.error('Erro inesperado ao garantir perfil:', err);
            return null;
        } finally {
            setEnsuring(false);
        }
    }, []);

    return { ensureProfile, ensuring };
};