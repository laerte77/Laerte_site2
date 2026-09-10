import { supabase } from './customSupabaseClient';

const detectModule = (tableName) => {
  if (!tableName) return null;
  if (tableName.includes('barbearia')) return 'barbearia';
  if (tableName.startsWith('lm_') || tableName.includes('impressoes')) return 'lm-impressoes';
  if (tableName.includes('igreja') || tableName.includes('cargos') || tableName.includes('tipos_entrada') || tableName.includes('dizimistas') || tableName.includes('classes') || tableName.includes('conjuntos') || tableName.includes('funcoes')) return 'igreja';
  if (tableName.startsWith('ent_')) return 'entretenimento';
  if (tableName.includes('pessoal') || tableName === 'metas' || tableName === 'aportes' || tableName === 'rendimentos' || tableName === 'leituras' || tableName === 'livros' || tableName === 'receitas' || tableName === 'despesas' || tableName === 'tipos_despesa' || tableName === 'tipos_receita' || tableName === 'despesas_previstas') return 'pessoal';
  return null;
};

export const getAccessibleDataQuery = (userId, isAdmin, tableName, selectQuery = '*') => {
  if (!tableName) {
    console.error("[DataAccessUtils] Table name is missing.");
    throw new Error("O nome da tabela é obrigatório para realizar a consulta.");
  }

  let query = supabase.from(tableName).select(selectQuery);
  
  if (!isAdmin) {
    if (!userId) {
        console.warn(`[DataAccessUtils] User ID is null for non-admin request on table ${tableName}. Forcing empty result.`);
        query = query.eq('user_id', '00000000-0000-0000-0000-000000000000'); 
    } else {
        let sharingPrefs = {};
        try {
            sharingPrefs = JSON.parse(localStorage.getItem('data_sharing_preferences') || '{}');
        } catch (e) {
            console.error('[DataAccessUtils] Error parsing sharing preferences:', e);
        }

        const moduleName = detectModule(tableName);
        
        let isShared = true;
        
        if (moduleName === 'igreja') {
            // Igreja data sharing is controlled by realtime preference per user or specific sub-module preference
            isShared = sharingPrefs['igreja'] !== false && sharingPrefs['igreja_realtime'] !== false;
        } else {
            isShared = moduleName ? sharingPrefs[moduleName] !== false : true;
        }

        if (!isShared) {
            query = query.eq('user_id', userId);
        }
    }
  }
  
  return query;
};

export const canAccessData = (userId, isAdmin, targetUserId) => {
  if (isAdmin) return true;
  if (!userId || !targetUserId) return false;
  return userId === targetUserId;
};