const { test } = require('node:test');
const assert = require('node:assert');
const { buildRecapView } = require('../modules/admin/adminPanel');

test('buildRecapView should return a valid view object', async () => {
  // Test de base pour vérifier que la fonction existe et retourne quelque chose
  const view = await buildRecapView();
  
  assert.ok(view, 'La fonction doit retourner un objet');
  assert.ok(Array.isArray(view.embeds), 'Le résultat doit contenir des embeds');
  assert.ok(Array.isArray(view.components), 'Le résultat doit contenir des composants');
});

test('buildRecapView should contain expected fields in embed', async () => {
  const view = await buildRecapView();
  
  assert.ok(view.embeds && view.embeds.length > 0, 'Doit contenir au moins un embed');
  
  const embed = view.embeds[0];
  assert.ok(embed.title, 'L\'embed doit avoir un titre');
  assert.ok(embed.fields, 'L\'embed doit avoir des champs');
  assert.ok(embed.fields.length >= 3, 'L\'embed doit avoir au moins 3 champs');
});
