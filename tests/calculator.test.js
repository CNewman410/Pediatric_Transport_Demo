'use strict';
const assert = require('node:assert/strict');
const M = require('../calculator.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
function approx(actual, expected, delta=1e-8) { assert.ok(Math.abs(actual-expected) <= delta, `${actual} ≠ ${expected}`); }
function calc(mode, values) { return M.calculate({ mode, ...values }); }
const ordered = { weightBased:false, orderedDose:'20',orderedUnit:'mg',availableDose:'40',availableUnit:'mg',stockVolume:'5' };
test('40 mg per 5 mL equals 8 mg/mL',()=>approx(M.concentration(ordered).mgMl,8));
test('liquid/injection 20mg from 40mg/5mL = 2.5mL',()=>approx(calc('liquid',ordered).primaryValue,2.5));
test('liquid/injection weight-based 1mg/kg x 20kg / 40mg per 5mL = 2.5mL',()=>approx(calc('liquid',{...ordered,weightBased:true,patientWeight:'20',orderedDose:'1'}).primaryValue,2.5));
test('liquid/injection weight-based returns weight and total amount',()=>{ const x=calc('liquid',{...ordered,weightBased:true,patientWeight:'20',orderedDose:'1'});assert.equal(x.details[1].value,'20 kg');assert.equal(x.details[2].value,'20 mg'); });
test('unit conversion 500mg from 1g/10mL = 5mL',()=>approx(calc('liquid',{...ordered,orderedDose:'500',availableDose:'1',availableUnit:'g',stockVolume:'10'}).primaryValue,5));
test('unit conversion 500mcg from 1mg/mL = .5mL',()=>approx(calc('liquid',{...ordered,orderedDose:'500',orderedUnit:'mcg',availableDose:'1',stockVolume:'1'}).primaryValue,.5));
test('unit conversion weight-based mcg/kg',()=>approx(calc('liquid',{...ordered,weightBased:true,patientWeight:'10',orderedDose:'100',orderedUnit:'mcg',availableDose:'1',stockVolume:'1'}).primaryValue,1));
const fluid = {weightBased:false,volume:'1000',timeValue:'8',timeUnit:'hr',includeDrops:false};
test('IV 1000mL / 8hr = 125mL/hr',()=>approx(calc('flow',fluid).primaryValue,125));
test('IV 120mL / 30min = 240mL/hr',()=>approx(calc('flow',{...fluid,volume:'120',timeValue:'30',timeUnit:'min'}).primaryValue,240));
test('combined flow includes drops per minute when requested',()=>{
 const x=calc('flow',{...fluid,volume:'500',timeValue:'4',dropFactor:'20',includeDrops:true});
 approx(x.primaryValue,125); assert.equal(x.details.at(-1).value,'42 gtt/min');
});
test('combined flow without drops does not need drop factor',()=>{ const x=calc('flow',{...fluid,dropFactor:''});assert.equal(x.details.some(d=>d.label==='Drops per minute'),false); });
test('weight-based flow volume 10mL/kg x 20kg / 2hr = 100mL/hr',()=>approx(calc('flow',{...fluid,weightBased:true,patientWeight:'20',volume:'10',timeValue:'2'}).primaryValue,100));
test('weight-based flow includes drops: 200mL over 2hr, 20gtt/mL = 33gtt/min',()=>{
 const x=calc('flow',{...fluid,weightBased:true,patientWeight:'20',volume:'10',timeValue:'2',includeDrops:true,dropFactor:'20'});
 assert.equal(x.details.at(-1).value,'33 gtt/min');
});
const inf={ mode:'infusion',infusionMethod:'dose',availableDose:'100',availableUnit:'mg',stockVolume:'50',weightBased:true,patientWeight:'20',doseRate:'2',rateUnit:'mcg/kg/min',vtbi:'25' };
test('pump 100mg/50mL, 2mcg/kg/min, 20kg = 1.2mL/hr',()=>approx(M.calculate(inf).primaryValue,1.2));
test('pump duration',()=>assert.equal(M.calculate(inf).details.at(-1).value,'20 hr 50 min'));
test('pump non-weight-based 2mg/hr at 40mg/5mL = .25mL/hr',()=>approx(M.calculate({...inf,weightBased:false,rateUnit:'mg/hr',doseRate:'2',availableDose:'40',stockVolume:'5'}).primaryValue,.25));
test('pump non-weight-based 5mcg/min at 1mg/mL = .3mL/hr',()=>approx(M.calculate({...inf,availableDose:'1',stockVolume:'1',weightBased:false,rateUnit:'mcg/min',doseRate:'5'}).primaryValue,.3));
test('pump direct mL/hr',()=>approx(calc('infusion',{weightBased:false,infusionMethod:'ml',mlRate:'20',vtbi:'40'}).primaryValue,20));
test('pump direct duration',()=>assert.equal(calc('infusion',{weightBased:false,infusionMethod:'ml',mlRate:'20',vtbi:'40'}).details.at(-1).value,'2 hr 00 min'));
test('pump refuses weight-based direct mL/hr',()=>assert.throws(()=>M.calculate({...inf,infusionMethod:'ml',mlRate:'20'}),/weight-based infusion/));
test('must answer weight-based question',()=>assert.throws(()=>calc('liquid',{...ordered,weightBased:null}),/weight-based/));
test('must enter weight if weight-based liquid',()=>assert.throws(()=>calc('liquid',{...ordered,weightBased:true,patientWeight:''}),/positive number/));
test('must enter weight if weight-based flow',()=>assert.throws(()=>calc('flow',{...fluid,weightBased:true,patientWeight:''}),/positive number/));
test('must answer include drops',()=>assert.throws(()=>calc('flow',{...fluid,includeDrops:null}),/drops per minute/));
test('must enter drop factor when drops selected',()=>assert.throws(()=>calc('flow',{...fluid,includeDrops:true,dropFactor:''}),/positive number/));
test('must enter ordered dose',()=>assert.throws(()=>calc('liquid',{...ordered,orderedDose:''}),/positive number/));
test('must enter available amount',()=>assert.throws(()=>calc('liquid',{...ordered,availableDose:''}),/positive number/));
test('zero labeled concentration rejected',()=>assert.throws(()=>calc('liquid',{...ordered,availableDose:'0'}),/above zero/));
test('zero volume denominator rejected',()=>assert.throws(()=>calc('liquid',{...ordered,stockVolume:'0'}),/above zero/));
test('negative dose rejected',()=>assert.throws(()=>calc('liquid',{...ordered,orderedDose:'-10'}),/positive number/));
test('scientific notation rejected',()=>assert.throws(()=>calc('liquid',{...ordered,orderedDose:'1e3'}),/positive number/));
test('NaN rejected',()=>assert.throws(()=>calc('liquid',{...ordered,orderedDose:'NaN'}),/positive number/));
test('nonmatching infusion rate unit rejected',()=>assert.throws(()=>M.calculate({...inf,weightBased:false}),/matching/));
test('invalid mass unit rejected',()=>assert.throws(()=>calc('liquid',{...ordered,availableUnit:'IU'}),/mass unit/));
test('invalid time unit rejected',()=>assert.throws(()=>calc('flow',{...fluid,timeUnit:'week'}),/time units/));
test('too small for 1 drop per min rejected',()=>assert.throws(()=>calc('flow',{...fluid,volume:'1',timeValue:'500',timeUnit:'min',includeDrops:true,dropFactor:'1'}),/one drop/));
test('former tablet mode is unsupported',()=>assert.throws(()=>calc('tablet', {weightBased:false}),/Unknown/));
test('unknown mode rejected',()=>assert.throws(()=>calc('other',{weightBased:false}),/Unknown/));
console.log(`\n${passed} tests passed.`);
