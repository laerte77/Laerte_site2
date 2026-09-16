import { getAllPendingData, clearOfflineData } from './offlineStorage';
import { supabase } from './customSupabaseClient';

export const syncDataType = async (type, data, userId) => {
  const payload = { ...data, user_id: userId };
  let table = '';
  switch(type) {
    case 'lm_servicos': table = 'lm_lanc_servicos'; break;
    case 'lm_despesas': table = 'lm_lanc_despesas'; break;
    case 'pessoal_receitas': table = 'receitas'; break;
    case 'pessoal_despesas': table = 'despesas'; break;
    default: throw new Error(`Unknown type: ${type}`);
  }
  const { error } = await supabase.from(table).insert([payload]);
  if (error) throw error;
};

export const handleSyncError = (error) => {
  console.error("Sync error: ", error);
};

export const syncPendingData = async (userId) => {
  if (!userId) return { success: false, count: 0 };
  try {
    const pendingData = await getAllPendingData();
    if (pendingData.length === 0) return { success: true, count: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingData) {
      try {
        await syncDataType(item.type, item.data, userId);
        await clearOfflineData(item.id);
        syncedCount++;
      } catch (err) {
        failedCount++;
        handleSyncError(err);
      }
    }

    return {
      success: failedCount === 0,
      count: syncedCount,
      failed: failedCount
    };
  } catch (err) {
    handleSyncError(err);
    return { success: false, count: 0 };
  }
};
