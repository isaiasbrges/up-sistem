'use strict';
const {z}=require('./schemas');
const durationSchema=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('lifetime')}),
  z.strictObject({kind:z.literal('days'),days:z.number().int().min(1).max(36500)}),
  z.strictObject({kind:z.literal('months'),months:z.number().int().min(1).max(1200)})
]);
function accessExpiresAt(duration,activatedAt){
  const value=durationSchema.parse(duration),start=new Date(activatedAt);
  if(!Number.isFinite(start.getTime()))throw Error('Data de liberação inválida.');
  if(value.kind==='lifetime')return null;
  if(value.kind==='days')return new Date(start.getTime()+value.days*86400000);
  // Âncora UTC preserva o horário. No fim do mês, limita ao último dia existente.
  const end=new Date(start),day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+value.months);
  const lastDay=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();
  end.setUTCDate(Math.min(day,lastDay));return end;
}
module.exports={durationSchema,accessExpiresAt};
