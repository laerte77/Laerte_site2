import { supabase } from '@/lib/customSupabaseClient';
import { startOfMonth, endOfMonth, format, parseISO, isSameMonth, isSameYear } from 'date-fns';

/**
 * Normalizes a string for comparison. Handles null/undefined gracefully.
 */
export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')     // Remove special chars
    .replace(/\s+/g, ' ')            // Collapse spaces
    .trim();
};

export const calculateGastoReal = async (userId, date, type, description = null) => {
  if (!userId || !date || !type) return 0;

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const start = format(startOfMonth(dateObj), 'yyyy-MM-dd');
    const end = format(endOfMonth(dateObj), 'yyyy-MM-dd');
    
    let query;
    
    if (type === 'lanhouse') {
      query = supabase
        .from('lm_lanc_despesas')
        .select(`valor, lm_despesas!inner(despesa)`)
        .eq('user_id', userId)
        .gte('data', start)
        .lte('data', end);
    } else {
      query = supabase
        .from('despesas')
        .select('valor, despesa, categoria')
        .eq('user_id', userId)
        .gte('data', start)
        .lte('data', end);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    if (!data || data.length === 0) return 0;

    return data.reduce((total, item) => {
      const itemDesc = type === 'lanhouse' ? item?.lm_despesas?.despesa : item?.despesa;
      
      if (!itemDesc) return total;

      const lowerDesc = normalizeString(itemDesc);
      const search = description ? normalizeString(description) : null;

      if (!description && (lowerDesc.includes('dizimo') || lowerDesc.includes('oferta'))) {
        return total;
      }

      if (description) {
        if (!lowerDesc.includes(search) && !search.includes(lowerDesc)) {
          return total;
        }
      }
      
      return total + Number(item.valor || 0);
    }, 0);
  } catch (error) {
    console.error(`Error calculating gasto real for ${type}:`, error);
    return 0;
  }
};

export const findMatchingExpense = (actualExpenses, plannedItem) => {
  if (!actualExpenses || !Array.isArray(actualExpenses) || !plannedItem) return null;

  if (plannedItem.matched_transaction_id) {
    const manualMatch = actualExpenses.find(item => item.id === plannedItem.matched_transaction_id);
    if (manualMatch) return manualMatch;
  }

  if (!plannedItem.data_vencimento || !plannedItem.descricao) return null;

  try {
    const targetDate = typeof plannedItem.data_vencimento === 'string' 
      ? parseISO(plannedItem.data_vencimento) 
      : plannedItem.data_vencimento;

    const plannedDescNorm = normalizeString(plannedItem.descricao);
    const plannedTokens = plannedDescNorm.split(' ').filter(t => t.length > 2);

    const candidates = actualExpenses.filter(actual => {
      if (!actual?.data) return false;
      const actualDate = typeof actual.data === 'string' ? parseISO(actual.data) : actual.data;
      return isSameMonth(actualDate, targetDate) && isSameYear(actualDate, targetDate);
    });

    let match = candidates.find(actual => normalizeString(actual?.despesa) === plannedDescNorm);
    if (match) return match;

    match = candidates.find(actual => {
      const actualDescNorm = normalizeString(actual?.despesa);
      const allTokensPresent = plannedTokens.every(token => actualDescNorm.includes(token));
      return allTokensPresent && plannedTokens.length > 0;
    });
    if (match) return match;

    if (plannedItem.categoria) {
       match = candidates.find(actual => actual?.categoria && normalizeString(actual.categoria) === plannedDescNorm);
       if (match) return match;
    }
  } catch (error) {
    console.error("Error matching expense:", error);
  }

  return null;
};

export const findMatchingExpenseAmount = (actualExpenses, plannedItem) => {
  const match = findMatchingExpense(actualExpenses, plannedItem);
  return match ? parseFloat(match.valor || 0) : 0;
};