/**
 * Migration para corrigir OS concluídas/entregues sem completion_date
 * 
 * Problema: OS marcadas como 'concluida' ou 'entregue' não tinham
 * o campo completion_date preenchido automaticamente, fazendo com que
 * não aparecessem no módulo de Faturamento.
 * 
 * Solução: Preencher completion_date com a data de updated_at para
 * todas as OS que estão concluídas/entregues mas sem completion_date.
 */

exports.up = async function(knex) {
  // Buscar todas as OS concluídas/entregues sem completion_date
  const osToFix = await knex('service_orders')
    .whereIn('status', ['concluida', 'entregue'])
    .whereNull('deleted_at')
    .whereNull('completion_date')
    .select('id', 'updated_at', 'entry_date');
  
  console.log(`\n[Migration] Encontradas ${osToFix.length} OS sem completion_date para corrigir...\n`);
  
  // Atualizar cada uma usando updated_at como data de conclusão
  // Se updated_at não existir, usa entry_date como fallback
  for (const os of osToFix) {
    const completionDate = os.updated_at 
      ? new Date(os.updated_at).toISOString().split('T')[0]
      : (os.entry_date 
          ? new Date(os.entry_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]);
    
    await knex('service_orders')
      .where('id', os.id)
      .update({ completion_date: completionDate });
  }
  
  console.log(`[Migration] ${osToFix.length} OS corrigidas com sucesso!\n`);
};

exports.down = async function(knex) {
  // Rollback: não é seguro reverter pois não sabemos quais estavam NULL originalmente
  // Apenas log informativo
  console.log('\n[Migration Rollback] Não é possível reverter automaticamente - completion_date foi preenchido com base em updated_at\n');
};
