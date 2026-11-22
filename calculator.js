/* General arithmetic demonstration. NOT for clinical use or infusion-pump programming. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoseMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MASS = Object.freeze({ g: 1000, mg: 1, mcg: 0.001, ng: 0.000001 });
  const RATES = Object.freeze({
    'mg/kg/min': { mass: 'mg', weight: true, minutes: true },
    'mcg/kg/min': { mass: 'mcg', weight: true, minutes: true },
    'mg/kg/hr': { mass: 'mg', weight: true, minutes: false },
    'mcg/kg/hr': { mass: 'mcg', weight: true, minutes: false },
    'mg/min': { mass: 'mg', weight: false, minutes: true },
    'mcg/min': { mass: 'mcg', weight: false, minutes: true },
    'mg/hr': { mass: 'mg', weight: false, minutes: false },
    'mcg/hr': { mass: 'mcg', weight: false, minutes: false }
  });
  function number(value, label) {
    const raw = String(value ?? '').trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error('Enter a positive number for ' + label + '.');
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 1e9) throw new Error(label + ' must be above zero and within the demo input range.');
    return n;
  }
  function assertResult(n) {
    if (!Number.isFinite(n) || n <= 0 || n > 1e12 || n < 1e-12) throw new Error('The result is outside the supported demonstration range.');
    return n;
  }
  function unit(u) {
    if (!Object.prototype.hasOwnProperty.call(MASS, u)) throw new Error('Select a valid mass unit.');
    return MASS[u];
  }
  function format(n) {
    if (!Number.isFinite(n)) return '—';
    if (n !== 0 && Math.abs(n) < 0.000001) return n.toExponential(3);
    return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  function duration(hours) {
    assertResult(hours);
    const seconds = Math.round(hours * 3600);
    if (!Number.isSafeInteger(seconds)) throw new Error('Duration is outside the demonstration range.');
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = seconds % 60;
    return (h ? h + ' hr ' : '') + (h ? String(m).padStart(2, '0') : m) + ' min' + (s ? ' ' + String(s).padStart(2, '0') + ' sec' : '');
  }
  function timeMinutes(v) {
    if (v.timeUnit !== 'hr' && v.timeUnit !== 'min') throw new Error('Select time units.');
    return assertResult(number(v.timeValue, 'time') * (v.timeUnit === 'hr' ? 60 : 1));
  }
  function concentration(v) {
    const amount = number(v.availableDose, 'available amount');
    const volume = number(v.stockVolume, 'available volume');
    return { amount, volume, unit: v.availableUnit, mgMl: assertResult(amount * unit(v.availableUnit) / volume) };
  }
  const detail = (label, value) => ({ label, value });
  const math = (label, value) => ({ label, value });
  function requiredWeight(v) {
    if (typeof v.weightBased !== 'boolean') throw new Error('Choose whether this calculation is weight-based.');
    return v.weightBased ? number(v.patientWeight, 'patient weight') : null;
  }
  function calculate(v) {
    if (!v || !v.mode) throw new Error('Choose a calculation type.');
    let primaryValue, primaryUnit, details = [], steps = [], note = '';
    const weight = requiredWeight(v);
    if (v.mode === 'liquid') {
      const prescribed = number(v.orderedDose, v.weightBased ? 'dose per kg' : 'ordered dose');
      const orderMg = assertResult(prescribed * unit(v.orderedUnit) * (weight ?? 1));
      const labeled = concentration(v);
      const availableMg = assertResult(labeled.amount * unit(labeled.unit));
      primaryValue = assertResult(orderMg / labeled.mgMl);
      primaryUnit = 'mL';
      details = [
        detail(v.weightBased ? 'Dose per kg' : 'Ordered dose', format(prescribed) + ' ' + v.orderedUnit + (v.weightBased ? '/kg' : '')),
        ...(v.weightBased ? [detail('Patient weight', format(weight) + ' kg'), detail('Calculated total amount', format(orderMg) + ' mg')] : []),
        detail('Labeled concentration', format(labeled.amount) + ' ' + labeled.unit + ' per ' + format(labeled.volume) + ' mL'),
        detail('Equivalent concentration', format(labeled.mgMl) + ' mg/mL')
      ];
      if (v.weightBased) steps.push(math('Convert weight-based dose to total amount', format(prescribed) + ' ' + v.orderedUnit + '/kg × ' + format(weight) + ' kg × ' + format(unit(v.orderedUnit)) + ' mg/' + v.orderedUnit + ' = ' + format(orderMg) + ' mg'));
      else steps.push(math('Convert ordered amount to mg', format(prescribed) + ' ' + v.orderedUnit + ' × ' + format(unit(v.orderedUnit)) + ' mg/' + v.orderedUnit + ' = ' + format(orderMg) + ' mg'));
      steps.push(math('Convert labeled concentration to mg/mL', '(' + format(labeled.amount) + ' ' + labeled.unit + ' × ' + format(unit(labeled.unit)) + ' mg/' + labeled.unit + ') ÷ ' + format(labeled.volume) + ' mL = ' + format(labeled.mgMl) + ' mg/mL'));
      steps.push(math('Calculate liquid volume', format(orderMg) + ' mg ÷ ' + format(labeled.mgMl) + ' mg/mL = ' + format(primaryValue) + ' mL'));
      note = 'Arithmetic only. No route, clinical dose, preparation, or syringe accuracy checks.';
    } else if (v.mode === 'flow') {
      const volumeEntry = number(v.volume, v.weightBased ? 'volume per kg' : 'volume');
      const totalVolume = assertResult(volumeEntry * (weight ?? 1));
      const minutes = timeMinutes(v), hours = assertResult(minutes / 60);
      primaryValue = assertResult(totalVolume / hours);
      primaryUnit = 'mL/hr';
      details = [
        detail(v.weightBased ? 'Entered volume per kg' : 'Entered fluid volume', format(volumeEntry) + (v.weightBased ? ' mL/kg' : ' mL')),
        ...(v.weightBased ? [detail('Patient weight', format(weight) + ' kg'), detail('Calculated total volume', format(totalVolume) + ' mL')] : []),
        detail('Time', format(number(v.timeValue, 'time')) + ' ' + v.timeUnit)
      ];
      if (v.weightBased) steps.push(math('Calculate total volume', format(volumeEntry) + ' mL/kg × ' + format(weight) + ' kg = ' + format(totalVolume) + ' mL'));
      steps.push(math('Convert time to hours', format(minutes) + ' min = ' + format(hours) + ' hr'));
      steps.push(math('Calculate IV flow rate', format(totalVolume) + ' mL ÷ ' + format(hours) + ' hr = ' + format(primaryValue) + ' mL/hr'));
      if (v.includeDrops === true) {
        const factor = number(v.dropFactor, 'drop factor');
        const unrounded = assertResult(totalVolume * factor / minutes);
        const rounded = Math.round(unrounded);
        if (rounded < 1) throw new Error('This example rounds below one drop per minute. Use different demo values.');
        details.push(detail('Drop factor', format(factor) + ' gtt/mL'));
        details.push(detail('Drops per minute', format(rounded) + ' gtt/min'));
        steps.push(math('Calculate and round drops per minute', '(' + format(totalVolume) + ' mL × ' + format(factor) + ' gtt/mL) ÷ ' + format(minutes) + ' min = ' + format(unrounded) + ' gtt/min → ' + format(rounded) + ' gtt/min'));
        note = 'Drops/min rounded to the nearest whole drop for illustration only.';
      } else if (v.includeDrops !== false) throw new Error('Choose whether to include drops per minute.');
      else note = 'General flow arithmetic only. Does not check fluid orders or infusion suitability.';
    } else if (v.mode === 'infusion') {
      const vtbi = number(v.vtbi, 'VTBI');
      let flow;
      if (v.infusionMethod === 'ml') {
        if (v.weightBased) throw new Error('For weight-based infusion, choose dose calculation.');
        flow = number(v.mlRate, 'flow rate');
        steps = [math('Entered volumetric rate', format(flow) + ' mL/hr'), math('Estimate time', format(vtbi) + ' mL ÷ ' + format(flow) + ' mL/hr = ' + duration(assertResult(vtbi / flow)))];
        details = [detail('Entered flow rate', format(flow) + ' mL/hr'), detail('VTBI', format(vtbi) + ' mL')];
      } else if (v.infusionMethod === 'dose') {
        const c = concentration(v);
        const rate = RATES[v.rateUnit];
        if (!rate || rate.weight !== v.weightBased) throw new Error('Select dose-rate units matching the weight-based setting.');
        const doseRate = number(v.doseRate, 'dose rate');
        const massHrMg = assertResult(doseRate * unit(rate.mass) * (weight ?? 1) * (rate.minutes ? 60 : 1));
        flow = assertResult(massHrMg / c.mgMl);
        details = [detail('Concentration', format(c.amount) + ' ' + c.unit + ' per ' + format(c.volume) + ' mL'), detail('Equivalent concentration', format(c.mgMl) + ' mg/mL'), detail('Dose rate', format(doseRate) + ' ' + v.rateUnit), detail('Weight', weight === null ? 'Not weight-based' : format(weight) + ' kg'), detail('VTBI', format(vtbi) + ' mL')];
        steps = [math('Convert concentration', '(' + format(c.amount) + ' ' + c.unit + ' × ' + format(unit(c.unit)) + ' mg/' + c.unit + ') ÷ ' + format(c.volume) + ' mL = ' + format(c.mgMl) + ' mg/mL'), math('Convert rate to mg/hr', format(doseRate) + ' ' + v.rateUnit + (weight === null ? '' : ' × ' + format(weight) + ' kg') + (rate.minutes ? ' × 60 min/hr' : '') + ' × ' + format(unit(rate.mass)) + ' mg/' + rate.mass + ' = ' + format(massHrMg) + ' mg/hr'), math('Calculate pump flow', format(massHrMg) + ' mg/hr ÷ ' + format(c.mgMl) + ' mg/mL = ' + format(flow) + ' mL/hr'), math('Estimate time', format(vtbi) + ' mL ÷ ' + format(flow) + ' mL/hr = ' + duration(assertResult(vtbi / flow)))];
      } else throw new Error('Choose an infusion method.');
      primaryValue = flow; primaryUnit = 'mL/hr';
      details.push(detail('Estimated duration', duration(assertResult(vtbi / flow))));
      note = 'Time is an estimate. Rounding does not represent pump precision or an approved setting.';
    } else throw new Error('Unknown calculation mode.');
    return { mode: v.mode, primaryValue: assertResult(primaryValue), primaryUnit, display: format(primaryValue), details, math: steps, note };
  }
  return { calculate, number, format, duration, MASS, RATES, concentration, timeMinutes };
});
