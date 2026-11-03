'use strict';
const Decimal=require('decimal.js');
const D=Decimal.clone({precision:40,rounding:Decimal.ROUND_HALF_UP});
const n=v=>new D(v??0);
const sum=values=>values.reduce((total,value)=>total.plus(n(value)),n(0));
const money=value=>value===null?null:value.toDecimalPlaces(2).toFixed(2);
const ratio=value=>value===null?null:value.toDecimalPlaces(12).toFixed();
const RULE_VERSION='pdf-2026-10-26-v1';

function finance(f,limits={}) {
  const threshold={after:'0.1',slack:'0.2',reserveLow:'1',reserveHigh:'3',debtLow:'0.1',debtHigh:'0.2',house:'0.1',...limits};
  const revenue=n(f.revenue),sales=n(f.sales),variable=f.variable||{};
  // Cada parcela em reais é arredondada antes de compor o total; regra versionada.
  const cv=sum(['tax','fees','commission','material'].map(key=>{
    const v=variable[key]||{};return (v.unit==='percent'?revenue.times(n(v.value)).div(100):n(v.value)).toDecimalPlaces(2);
  }));
  const mc=revenue.minus(cv),mcPct=revenue.gt(0)?mc.div(revenue):null;
  const fixed=sum(Object.values(f.fixed||{})),owner=n(f.owner),house=n(f.house),debts=f.debts||[];
  const corpDebt=sum(debts.filter(d=>d.scope==='empresa').map(d=>d.payment));
  const personalDebt=sum(debts.filter(d=>d.scope==='pessoal').map(d=>d.payment));
  const operating=mc.minus(fixed),liquid=operating.minus(owner),afterDebt=liquid.minus(corpDebt);
  const breakEven=mcPct?.gt(0)?fixed.plus(owner).div(mcPct):null;
  const slack=breakEven!==null&&revenue.gt(0)?revenue.minus(breakEven).div(revenue):null;
  const months=fixed.plus(owner).gt(0)?n(f.reserveCompany).div(fixed.plus(owner)):null;
  const debtWeight=revenue.gt(0)?corpDebt.div(revenue):null;
  const houseLeft=owner.minus(house).minus(personalDebt),afterPct=revenue.gt(0)?afterDebt.div(revenue):null;
  const overdue=debts.some(d=>d.overdue),separate=f.separate||'as_vezes';
  const traffic={
    separate:separate==='sim'?'verde':separate==='nao'?'vermelho':'amarelo',
    after:afterPct===null?'indisponivel':afterPct.lt(0)?'vermelho':afterPct.lte(threshold.after)?'amarelo':'verde',
    slack:slack===null?'indisponivel':slack.lt(0)?'vermelho':slack.lte(threshold.slack)?'amarelo':'verde',
    reserve:months===null?'indisponivel':months.lt(threshold.reserveLow)?'vermelho':months.lt(threshold.reserveHigh)?'amarelo':'verde',
    debt:debtWeight===null?'indisponivel':overdue||debtWeight.gt(threshold.debtHigh)?'vermelho':debtWeight.gte(threshold.debtLow)?'amarelo':'verde',
    house:houseLeft.lt(0)?'vermelho':houseLeft.lte(owner.times(threshold.house))?'amarelo':'verde'
  };
  const steps=[];
  if(overdue)steps.push('Comece pelas dívidas em atraso e procure renegociar primeiro as de juros mais altos.');
  if(separate!=='sim')steps.push('Separe as contas: a conta da empresa paga só a empresa, e você define um dia fixo e um valor fixo de retirada.');
  if(afterDebt.lt(0))steps.push('A empresa está gastando mais do que gera. Revise custos fixos e preço antes de buscar mais vendas.');
  if(breakEven!==null&&revenue.lt(breakEven))steps.push('Faltam '+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(money(breakEven.minus(revenue)))+' por mês para empatar.');
  if(houseLeft.lt(0))steps.push('A sua casa custa mais do que você retira. Ajuste o orçamento da casa ou a retirada antes de assumir novos compromissos.');
  if(months!==null&&months.lt(threshold.reserveLow))steps.push('Defina um valor fixo por mês para começar a reserva da empresa.');
  if(!steps.length)steps.push(revenue.gt(0)?'Seus números estão saudáveis. Use o Módulo 3 para crescer com base.':'Confira os registros do mês para avaliar o resultado do negócio.');
  const warnings=[];
  if(mcPct!==null&&!mcPct.gt(0))warnings.push('Cada venda custa mais do que rende; revise preço e custos antes de vender mais.');
  if(!revenue.gt(0))warnings.push('Informe um faturamento positivo para calcular os indicadores proporcionais.');
  const monetary={revenue,cv,mc,fixed,operating,owner,liquid,corpDebt,personalDebt,afterDebt,houseLeft,breakEven,ticket:sales.gt(0)?revenue.div(sales):null};
  return {...Object.fromEntries(Object.entries(monetary).map(([key,value])=>[key,money(value)])),
    sales:Number(f.sales),mcPct:ratio(mcPct),slack:ratio(slack),months:ratio(months),debtWeight:ratio(debtWeight),afterPct:ratio(afterPct),
    traffic,steps:steps.slice(0,3),warnings,ruleVersion:RULE_VERSION,
    orderedDebts:[...debts].sort((a,b)=>Number(!!b.overdue)-Number(!!a.overdue)||n(b.rate).cmp(n(a.rate)))};
}

function simulateDebt(balance,rate,payment,extra='0') {
  let remaining=n(balance);const monthlyRate=n(rate).div(100),paid=n(payment).plus(n(extra));
  if(remaining.lte(0))return {months:0,totalInterest:'0.00',totalPaid:'0.00',unpayable:false};
  if(paid.lte(0)||paid.lte(remaining.times(monthlyRate).toDecimalPlaces(2)))return {months:null,totalInterest:null,totalPaid:null,unpayable:true};
  let months=0,totalInterest=n(0),totalPaid=n(0);
  while(remaining.gt(0)&&months<1200){
    const interest=remaining.times(monthlyRate).toDecimalPlaces(2);totalInterest=totalInterest.plus(interest);
    const installment=D.min(paid,remaining.plus(interest));totalPaid=totalPaid.plus(installment);
    remaining=remaining.plus(interest).minus(installment).toDecimalPlaces(2);months++;
  }
  return {months:remaining.gt(0)?null:months,totalInterest:money(totalInterest),totalPaid:money(totalPaid),unpayable:remaining.gt(0)};
}
module.exports={finance,simulateDebt,RULE_VERSION};
