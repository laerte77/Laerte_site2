import { supabase } from './customSupabaseClient';
import { handleSupabaseError } from './errorHandlingUtils';

const BARBEARIA_TABLES = [
  'barbearia_clientes',
  'barbearia_produtos',
  'barbearia_servicos',
  'barbearia_tipos_corte',
  'barbearia_tipos_despesa',
  'barbearia_barbeiros',
  'barbearia_tipos_planos'
];

export const verifyTableExists = async (tableName) => {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { success: false, table: tableName, error: 'Tabela não existe' };
      }
      return { success: false, table: tableName, error: handleSupabaseError(error) };
    }
    return { success: true, table: tableName };
  } catch (err) {
    return { success: false, table: tableName, error: err.message };
  }
};

export const verifyBarbeariaTables = async () => {
  const results = [];
  for (const table of BARBEARIA_TABLES) {
    results.push(await verifyTableExists(table));
  }
  return results;
};

export const testTableCRUD = async (tableName, userId) => {
  if (!userId) return { success: false, table: tableName, error: 'Usuário não autenticado para teste CRUD' };
  
  const dummyData = {
    nome: `TESTE_CRUD_${Date.now()}`,
    user_id: userId
  };

  try {
    const { data: insertData, error: insertError } = await supabase.from(tableName).insert([dummyData]).select().single();
    if (insertError) throw new Error(`Insert falhou: ${handleSupabaseError(insertError)}`);
    
    const recordId = insertData.id;

    const { error: readError } = await supabase.from(tableName).select('*').eq('id', recordId).single();
    if (readError) throw new Error(`Read falhou: ${handleSupabaseError(readError)}`);

    const { error: updateError } = await supabase.from(tableName).update({ nome: 'TESTE_CRUD_UPDATED' }).eq('id', recordId);
    if (updateError) throw new Error(`Update falhou: ${handleSupabaseError(updateError)}`);

    const { error: deleteError } = await supabase.from(tableName).delete().eq('id', recordId);
    if (deleteError) throw new Error(`Delete falhou: ${handleSupabaseError(deleteError)}`);

    return { success: true, table: tableName, message: 'CRUD completo com sucesso' };
  } catch (error) {
    return { success: false, table: tableName, error: error.message };
  }
};

export const testBarbeariaCRUD = async (userId) => {
  const results = [];
  for (const table of BARBEARIA_TABLES) {
    results.push(await testTableCRUD(table, userId));
  }
  return results;
};

export const logBarbeariaDatabaseStatus = async (userId) => {
  console.log("=== Verificando Tabelas Barbearia ===");
  const existence = await verifyBarbeariaTables();
  console.table(existence);
  
  if (userId) {
      console.log("=== Testando CRUD e RLS ===");
      const crud = await testBarbeariaCRUD(userId);
      console.table(crud);
      return { existence, crud };
  }
  return { existence, crud: [] };
};