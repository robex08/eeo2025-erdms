// Spusť v browser console pro vyčištění corrupted draft dat
console.log('🗑️ Mazání corrupted draft dat...');
localStorage.removeItem('order25_draft_new_1');
localStorage.removeItem('order25_draft_new_1_metadata');
localStorage.removeItem('order25_draft_new_1_attachments');
console.log('✅ Corrupted drafty smazány - refresh aplikaci');