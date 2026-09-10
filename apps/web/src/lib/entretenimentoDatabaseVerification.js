import { supabase } from '@/lib/customSupabaseClient';

/**
 * Verifies connection and CRUD operations for a specific table
 * @param {string} userId - The authenticated user's ID
 * @param {string} tableName - The name of the table to test
 * @param {object} dummyData - Data to use for the insert test
 * @returns {Promise<object>} Status report for the table
 */
async function testTableCrud(userId, tableName, dummyData) {
  const result = {
    table: tableName,
    read: { status: 'pending', message: '' },
    insert: { status: 'pending', message: '' },
    delete: { status: 'pending', message: '' },
    overall: 'pending'
  };

  try {
    // 1. Test Read (Should return data or empty array, but not a 401/403)
    const { error: readError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (readError) {
      result.read = { status: 'error', message: readError.message };
      throw new Error(`Read failed: ${readError.message}`);
    }
    result.read = { status: 'success', message: 'Read successful (RLS allowed)' };

    // 2. Test Insert
    const dataToInsert = { ...dummyData, user_id: userId };
    const { data: insertedData, error: insertError } = await supabase
      .from(tableName)
      .insert([dataToInsert])
      .select('id')
      .single();

    if (insertError) {
      result.insert = { status: 'error', message: insertError.message };
      throw new Error(`Insert failed: ${insertError.message}`);
    }
    
    if (!insertedData || !insertedData.id) {
      result.insert = { status: 'error', message: 'Insert returned no ID' };
      throw new Error('Insert returned no ID');
    }
    result.insert = { status: 'success', message: 'Insert successful' };

    // 3. Test Delete (Clean up the dummy record)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', insertedData.id);

    if (deleteError) {
      result.delete = { status: 'error', message: deleteError.message };
      throw new Error(`Delete failed: ${deleteError.message}`);
    }
    result.delete = { status: 'success', message: 'Delete successful (Cleanup done)' };

    result.overall = 'success';
  } catch (error) {
    result.overall = 'error';
    if (result.read.status === 'pending') result.read = { status: 'error', message: 'Skipped due to prior failure' };
    if (result.insert.status === 'pending') result.insert = { status: 'error', message: 'Skipped due to prior failure' };
    if (result.delete.status === 'pending') result.delete = { status: 'error', message: 'Skipped due to prior failure' };
  }

  return result;
}

/**
 * Runs a full verification suite against all Entretenimento tables
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<Array>} Array of table verification results
 */
export async function verifyEntretenimentoDatabase(userId) {
  if (!userId) {
    throw new Error('User ID is required for database verification');
  }

  console.log('Starting Entretenimento Database Verification...');

  const today = new Date().toISOString().split('T')[0];

  // We need to create a parent record to test foreign key constraints safely
  // First, we'll test independent tables, then dependent tables.
  const results = [];

  // Test ent_participantes
  const participantesTest = await testTableCrud(userId, 'ent_participantes', {
    nome: 'TEST_PARTICIPANT_VERIFICATION',
    apelido: 'TEST'
  });
  results.push(participantesTest);

  // Test ent_organizadores
  const organizadoresTest = await testTableCrud(userId, 'ent_organizadores', {
    nome: 'TEST_ORGANIZADOR_VERIFICATION',
    apelido: 'TEST'
  });
  results.push(organizadoresTest);

  // Test ent_despesas
  const despesasTest = await testTableCrud(userId, 'ent_despesas', {
    nome_despesa: 'TEST_DESPESA_VERIFICATION'
  });
  results.push(despesasTest);

  // To test ent_contribuicoes and ent_despesas_lancamentos, we need valid foreign keys.
  // We will temporarily create a participant, organizer, and despesa, then test the dependent tables, then clean them all up.
  
  try {
    console.log('Setting up foreign keys for dependent tables test...');
    const { data: pData } = await supabase.from('ent_participantes').insert([{ user_id: userId, nome: 'TEST_FK_PART' }]).select('id').single();
    const { data: oData } = await supabase.from('ent_organizadores').insert([{ user_id: userId, nome: 'TEST_FK_ORG' }]).select('id').single();
    const { data: dData } = await supabase.from('ent_despesas').insert([{ user_id: userId, nome_despesa: 'TEST_FK_DESP' }]).select('id').single();

    if (pData && oData) {
      const contribTest = await testTableCrud(userId, 'ent_contribuicoes', {
        data: today,
        valor: 10.00,
        contribuinte_id: pData.id,
        recebedor_id: oData.id
      });
      results.push(contribTest);
    } else {
      results.push({ table: 'ent_contribuicoes', overall: 'error', read: {status: 'error', message: 'FK setup failed'} });
    }

    if (dData && oData) {
      const despLancTest = await testTableCrud(userId, 'ent_despesas_lancamentos', {
        data: today,
        valor: 10.00,
        despesa_id: dData.id,
        comprador_id: oData.id
      });
      results.push(despLancTest);
    } else {
      results.push({ table: 'ent_despesas_lancamentos', overall: 'error', read: {status: 'error', message: 'FK setup failed'} });
    }

    // Cleanup FK records
    if (pData) await supabase.from('ent_participantes').delete().eq('id', pData.id);
    if (oData) await supabase.from('ent_organizadores').delete().eq('id', oData.id);
    if (dData) await supabase.from('ent_despesas').delete().eq('id', dData.id);

  } catch (error) {
    console.error('Failed testing dependent tables:', error);
  }

  console.log('Verification complete.', results);
  return results;
}