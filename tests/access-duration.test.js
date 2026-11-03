'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {accessExpiresAt,durationSchema}=require('../server/shared/access-duration');
test('12 meses atravessam ano bissexto sem virar prazo fixo de 365 dias',()=>{
  const start='2023-03-01T14:35:22.123Z',end=accessExpiresAt({kind:'months',months:12},start);
  assert.equal(end.toISOString(),'2024-03-01T14:35:22.123Z');
  assert.equal((end-new Date(start))/86400000,366);
});
test('prazo de calendário limita o dia ao fim do mês e preserva horário',()=>{
  assert.equal(accessExpiresAt({kind:'months',months:12},'2024-02-29T20:10:00Z').toISOString(),'2025-02-28T20:10:00.000Z');
  assert.equal(accessExpiresAt({kind:'months',months:1},'2026-01-31T00:00:00Z').toISOString(),'2026-02-28T00:00:00.000Z');
  assert.equal(accessExpiresAt({kind:'days',days:30},'2026-01-31T00:00:00Z').toISOString(),'2026-03-02T00:00:00.000Z');
});
test('prazo mensal exige quantidade válida; vitalício continua uma escolha explícita',()=>{
  for(const input of [{kind:'months'},{kind:'months',months:0},{kind:'months',months:12.5},{kind:'months',months:1201}])assert.equal(durationSchema.safeParse(input).success,false);
  assert.equal(accessExpiresAt({kind:'lifetime'},'2026-10-28'),null);
});
