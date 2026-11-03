'use strict';
const {z}=require('zod');
const Decimal=require('decimal.js');
const {fail}=require('./errors');
const RODA=['Comunhão com Deus','Família','Saúde e energia','Propósito e clareza','Finanças pessoais','Negócio','Relacionamentos','Contribuição e serviço'];
const RADAR=['Vendas','Pessoas','Processos','Finanças'];
const CATEGORIES=['vendas','impostos','taxas','comissões','mercadoria','aluguel e contas','equipe','sistemas','marketing','outros','retirada'];
const DAYS=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const text=(max=2000)=>z.string().trim().max(max);
const optionalText=(max=2000)=>text(max).default('');
function decimal({scale=2,max='9999999999999.99',positive=false,blank=false}={}) {
  return z.union([z.string(),z.number()]).transform((value,ctx)=>{
    const raw=String(value).trim();
    try {
      if (!(blank && raw==='') && !/^\d+(\.\d+)?$/.test(raw)) throw Error();
      const n=new Decimal(raw===''?'0':raw);
      if (!n.isFinite() || n.isNegative() || n.dp()>scale || n.gt(max) || (positive && !n.gt(0))) throw Error();
      return n.toFixed(scale);
    } catch {ctx.addIssue({code:'custom',message:positive?'Informe um valor positivo válido.':'Informe um valor não negativo válido, sem vírgula.'});return z.NEVER;}
  });
}
const money=decimal();
const formMoney=decimal({blank:true}).default('0.00');
const rate=decimal({scale:6,max:'999.999999',blank:true}).default('0.000000');
const count=z.union([z.string(),z.number()]).transform((v,ctx)=>{
  if (String(v).trim()==='') return 0;
  const n=Number(v);if (!Number.isSafeInteger(n)||n<0||n>1000000000) {ctx.addIssue({code:'custom',message:'Informe um número inteiro não negativo.'});return z.NEVER;}return n;
});
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;},'Informe uma data válida.');
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const score=z.strictObject({score:z.number().int().min(0).max(10),evidence:optionalText(2000)});
const scores=names=>z.strictObject(Object.fromEntries(names.map(k=>[k,score])));
const profile=z.strictObject({business:optionalText(80),age:optionalText(80),band:optionalText(80),team:count.default(0)});
const diagnostic=z.strictObject({
  roda:scores(RODA),radar:scores(RADAR),gargalo:z.enum(RADAR),
  dificuldade:optionalText(150),dificuldadeTexto:optionalText(3000),perfil:profile.default({business:'',age:'',band:'',team:0})
}).superRefine((value,ctx)=>{
  const low=Math.min(...RADAR.map(k=>value.radar[k].score));
  if (value.radar[value.gargalo].score!==low) ctx.addIssue({code:'custom',path:['gargalo'],message:'Escolha o gargalo entre as áreas com menor nota.'});
});
const debt=z.strictObject({id:text(100).optional(),creditor:text(250).min(1),scope:z.enum(['empresa','pessoal']),balance:formMoney,payment:formMoney,rate,overdue:z.boolean().default(false)});
const variableItem=z.strictObject({value:decimal({scale:6,max:'9999999999999.99',blank:true}).default('0.000000'),unit:z.enum(['percent','currency']).default('currency')});
const finance=z.strictObject({
  revenue:formMoney,sales:count.default(0),
  variable:z.strictObject(Object.fromEntries(['tax','fees','commission','material'].map(k=>[k,variableItem.optional()]))).default({}),
  fixed:z.strictObject(Object.fromEntries(['rent','staff','systems','marketing','other'].map(k=>[k,formMoney.optional()]))).default({}),
  owner:formMoney,house:formMoney,separate:z.enum(['sim','as_vezes','nao']).default('as_vezes'),
  debts:z.array(debt).max(200).default([]),reserveCompany:formMoney,reservePersonal:formMoney,
  estimates:z.record(z.string().max(100),z.boolean()).default({})
}).superRefine((value,ctx)=>{
  for (const [key,item] of Object.entries(value.variable)) {
    if (item.unit==='currency' && new Decimal(item.value).dp()>2) ctx.addIssue({code:'custom',path:['variable',key,'value'],message:'Valores em reais aceitam até duas casas decimais.'});
    if (item.unit==='percent' && new Decimal(item.value).gt(100)) ctx.addIssue({code:'custom',path:['variable',key,'value'],message:'Informe um percentual entre 0 e 100.'});
  }
});
const transaction=z.strictObject({date,desc:text(250).min(1),value:decimal({positive:true}),type:z.enum(['entrada','saida']),category:z.enum(CATEGORIES),scope:z.enum(['empresa','pessoal'])});
const bill=z.strictObject({desc:text(250).min(1),value:decimal({positive:true}),due:date,paid:z.boolean().default(false)});
const offer=z.strictObject({name:text(200).min(1),type:optionalText(80),audience:optionalText(3000),problem:optionalText(3000),promise:optionalText(3000),delivery:optionalText(5000),proof:optionalText(5000),terms:optionalText(5000),cta:optionalText(5000)});
const plan=z.strictObject(Object.fromEntries([...['result','decision1','decision2','decision3','decision4','phase1','phase2','phase3'].map(k=>[k,optionalText(5000)]),['reminder',z.enum(DAYS).default('segunda-feira')]]));
const checkin=z.strictObject({answers:z.array(text(5000)).length(5).refine(v=>v.some(x=>x.length>0),'Preencha ao menos uma resposta.')});
const procedure=z.strictObject({task:text(250).min(1),owner:text(150).min(1),goal:optionalText(5000),deadline:optionalText(250),steps:optionalText(15000),standard:optionalText(5000),fallback:optionalText(5000)});
const scoreDraft=z.strictObject({score:z.number().int().min(0).max(10).optional(),evidence:optionalText(2000)});
const partialScores=names=>z.strictObject(Object.fromEntries(names.map(key=>[key,scoreDraft.optional()]))).default({});
const diagnosticDraft=z.strictObject({roda:partialScores(RODA),radar:partialScores(RADAR),gargalo:z.enum([...RADAR,'']).default(''),dificuldade:optionalText(150),dificuldadeTexto:optionalText(3000),perfil:profile.partial().default({})});
const financeDraft=finance.safeExtend({month:month.optional(),estimated:z.boolean().optional()});
function parse(schema,input) {
  const result=schema.safeParse(input);
  if (!result.success) {
    const fields={};for(const issue of result.error.issues)fields[issue.path.join('.')||'form']=issue.message;
    fail(400,'VALIDATION_ERROR','Confira os campos indicados.',fields);
  }
  return result.data;
}
module.exports={z,parse,decimal,money,rate,date,month,diagnostic,diagnosticDraft,finance,financeDraft,debt,transaction,bill,offer,plan,checkin,procedure,RODA,RADAR,CATEGORIES,DAYS,text};
