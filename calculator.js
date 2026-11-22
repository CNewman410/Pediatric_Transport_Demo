/*
 * Pediatric Transport Calculator · Option 2 concept prototype
 * General arithmetic demonstration only. Not validated, not medical advice,
 * not for patient care or pump programming. No clinical dosing rules.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PumpMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONCENTRATION = Object.freeze({
    'g/mL':   { amount: 'g', factorToMg: 1000 },
    'mg/mL':  { amount: 'mg', factorToMg: 1 },
    'mcg/mL': { amount: 'mcg', factorToMg: 0.001 },
    'ng/mL':  { amount: 'ng', factorToMg: 0.000001 }
  });

  const RATE = Object.freeze({
    'mg/kg/min':  { factorToMg: 1,     perMinute: true,  weightBased: true,  amount: 'mg' },
    'mcg/kg/min': { factorToMg: 0.001, perMinute: true,  weightBased: true,  amount: 'mcg' },
    'mg/kg/hr':   { factorToMg: 1,     perMinute: false, weightBased: true,  amount: 'mg' },
    'mcg/kg/hr':  { factorToMg: 0.001, perMinute: false, weightBased: true,  amount: 'mcg' },
    'mg/min':     { factorToMg: 1,     perMinute: true,  weightBased: false, amount: 'mg' },
    'mcg/min':    { factorToMg: 0.001, perMinute: true,  weightBased: false, amount: 'mcg' },
    'mg/hr':      { factorToMg: 1,     perMinute: false, weightBased: false, amount: 'mg' },
    'mcg/hr':     { factorToMg: 0.001, perMinute: false, weightBased: false, amount: 'mcg' }
  });

  function number(value, name) {
    const s = String(value == null ? '' : value).trim();
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(s)) throw new Error('Enter a valid positive number for ' + name + '.');
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0 || n > 1e9) throw new Error(name + ' must be greater than zero and within the demo range.');
    return n;
  }

  function validResult(n) {
    if (!Number.isFinite(n) || n <= 0 || n > 1e12 || n < 1e-12) {
      throw new Error('The result is outside the supported demonstration range.');
    }
    return n;
  }

  function format(n) {
    if (!Number.isFinite(n)) return '—';
    if (n !== 0 && Math.abs(n) < 0.000001) return n.toExponential(3);
    return n.toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: true });
  }

  function duration(hours) {
    validResult(hours);
    const seconds = Math.round(hours * 3600);
    if (!Number.isSafeInteger(seconds)) throw new Error('Time is outside the supported demonstration range.');
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return h + ' hr ' + String(m).padStart(2, '0') + ' min' + (s ? ' ' + String(s).padStart(2, '0') + ' sec' : '');
    return m + ' min ' + String(s).padStart(2, '0') + ' sec';
  }

  function calculate(v) {
    if (!v || (v.method !== 'dose' && v.method !== 'ml')) throw new Error('Choose a dosing method.');
    const vtbi = number(v.vtbi, 'VTBI');
    if (v.method === 'ml') {
      const flow = number(v.mlRate, 'flow rate');
      const hours = validResult(vtbi / flow);
      return {
        method: 'ml', flow, vtbi, hours, duration: duration(hours),
        details: [{ label: 'Flow rate', value: format(flow) + ' mL/hr' }, { label: 'Volume to be infused', value: format(vtbi) + ' mL' }],
        math: [
          { label: 'Set volumetric rate', value: format(flow) + ' mL/hr (entered by user)' },
          { label: 'Estimate duration', value: format(vtbi) + ' mL ÷ ' + format(flow) + ' mL/hr = ' + duration(hours) }
        ]
      };
    }

    const conUnit = CONCENTRATION[v.concentrationUnit];
    const rateUnit = RATE[v.rateUnit];
    if (!conUnit) throw new Error('Choose concentration units.');
    if (!rateUnit) throw new Error('Choose dose-rate units.');
    if (rateUnit.weightBased !== Boolean(v.weightBased)) throw new Error('Dose rate units do not match the weight-based choice.');

    const concentration = number(v.concentration, 'concentration');
    const dose = number(v.doseRate, 'dose rate');
    const weight = v.weightBased ? number(v.weight, 'patient weight') : null;
    const concentrationMgMl = validResult(concentration * conUnit.factorToMg);
    const mgHr = validResult(dose * (weight || 1) * rateUnit.factorToMg * (rateUnit.perMinute ? 60 : 1));
    const flow = validResult(mgHr / concentrationMgMl);
    const hours = validResult(vtbi / flow);
    const amountHr = dose * (weight || 1) * (rateUnit.perMinute ? 60 : 1);

    return {
      method: 'dose', flow, vtbi, hours, duration: duration(hours), weight,
      dose, doseUnit: v.rateUnit, concentration, concentrationUnit: v.concentrationUnit,
      concentrationMgMl, mgHr,
      details: [
        { label: 'Concentration', value: format(concentration) + ' ' + v.concentrationUnit },
        { label: 'Dose rate', value: format(dose) + ' ' + v.rateUnit },
        { label: 'Patient weight', value: weight == null ? 'Not weight-based' : format(weight) + ' kg' }
      ],
      math: [
        { label: 'Convert concentration', value: format(concentration) + ' ' + v.concentrationUnit + ' × ' + format(conUnit.factorToMg) + ' mg/' + conUnit.amount + ' = ' + format(concentrationMgMl) + ' mg/mL' },
        { label: 'Convert ordered rate to hourly amount', value: format(dose) + ' ' + v.rateUnit + (weight == null ? '' : ' × ' + format(weight) + ' kg') + (rateUnit.perMinute ? ' × 60 min/hr' : '') + ' = ' + format(amountHr) + ' ' + rateUnit.amount + '/hr = ' + format(mgHr) + ' mg/hr' },
        { label: 'Calculate volumetric rate', value: format(mgHr) + ' mg/hr ÷ ' + format(concentrationMgMl) + ' mg/mL = ' + format(flow) + ' mL/hr' },
        { label: 'Estimate infusion duration', value: format(vtbi) + ' mL ÷ ' + format(flow) + ' mL/hr = ' + duration(hours) }
      ]
    };
  }
  return { calculate, number, format, duration, CONCENTRATION, RATE };
});
