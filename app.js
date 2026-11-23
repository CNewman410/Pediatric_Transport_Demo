/* Presentation-only, client-side arithmetic wizard — NOT FOR PATIENT CARE. */
(() => {
  'use strict';
  const M = window.DoseMath;
  const $ = (id) => document.getElementById(id);
  const screen = $('screen');
  const nav = $('navigation');
  const title = $('title');
  const escape = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const MODES = {
    drug: { title: 'Drug calculation', desc: 'Calculate mL from an entered dose and concentration such as 40 mg per 5 mL.', icon: '◒' },
    infusion: { title: 'Infusion', desc: 'IV flow, drops per minute, or pump-style infusion workflow.', icon: '◈' }
  };

  function fresh() {
    return {
      mode: null,
      page: 'home',
      orderedDose: '',
      orderedUnit: 'mg',
      availableDose: '',
      availableUnit: 'mg',
      stockVolume: '',
      volume: '',
      timeValue: '',
      timeUnit: 'hr',
      includeDrops: null,
      dropFactor: '',
      patientWeight: '',
      weightBased: null,
      infusionKind: null,
      infusionMethod: null,
      rateUnit: null,
      doseRate: '',
      mlRate: '',
      vtbi: '',
      activeField: null,
      confirmedWeight: false,
      error: ''
    };
  }

  let state = fresh();
  const numberFields = {
    ordered:['orderedDose'], strength:['availableDose','stockVolume'], volume:['volume'], time:['timeValue'], drop:['dropFactor'],
    weight:['patientWeight'], infusionDetails:['doseRate','mlRate','vtbi']
  };
  const stepTitles = {
    weightBased:'Is this weight-based?', weight:'Enter patient weight', ordered:'Enter the dose', strength:'Enter the concentration',
    infusionKind:'Choose the infusion type', volume:'Enter the fluid volume', time:'Enter the infusion time', includeDrops:'Include drops per minute?', drop:'Enter the drop factor',
    infusionMethod:'Choose the dosing method', rateUnits:'Choose dose-rate units', infusionDetails:'Enter infusion settings', review:'Review your entries', result:'Calculation summary'
  };

  function sequence() {
    if (state.mode === 'drug') {
      const seq = ['weightBased'];
      if (state.weightBased === true) seq.push('weight');
      return [...seq, 'ordered', 'strength', 'review', 'result'];
    }
    if (state.mode === 'infusion') {
      const seq = ['weightBased'];
      if (state.weightBased === true) seq.push('weight');
      seq.push('infusionKind');
      if (state.infusionKind === 'flow') {
        seq.push('volume', 'time', 'includeDrops');
        if (state.includeDrops === true) seq.push('drop');
        seq.push('review', 'result');
      } else if (state.infusionKind === 'pump') {
        if (state.weightBased === true) {
          seq.push('strength', 'rateUnits', 'infusionDetails', 'review', 'result');
        } else {
          if (state.infusionMethod === 'ml') seq.push('infusionMethod', 'infusionDetails', 'review', 'result');
          else if (state.infusionMethod === 'dose') seq.push('infusionMethod', 'strength', 'rateUnits', 'infusionDetails', 'review', 'result');
          else seq.push('infusionMethod');
        }
      }
      return seq;
    }
    return [];
  }

  function route(page) {
    state.page = page;
    state.error = '';
    state.activeField = (numberFields[page] || []).find((f) => page !== 'infusionDetails' || f === (state.infusionMethod === 'ml' ? 'mlRate' : 'doseRate')) || null;
    render();
    const shell = document.querySelector('.shell');
    if (shell && page !== 'home') shell.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function begin(mode, example = false) {
    state = fresh();
    state.mode = mode;
    if (example && mode === 'drug') Object.assign(state, { orderedDose:'20', orderedUnit:'mg', availableDose:'40', availableUnit:'mg', stockVolume:'5' });
    route('weightBased');
  }

  function goNext() {
    try { validate(state.page); }
    catch (e) { state.error = e.message; displayError(); return; }
    const seq = sequence();
    const n = seq.indexOf(state.page);
    if (n >= 0 && n < seq.length - 1) route(seq[n + 1]);
  }

  function goBack() {
    const seq = sequence();
    const n = seq.indexOf(state.page);
    if (n <= 0) route('home'); else route(seq[n - 1]);
  }

  function validate(page) {
    const required = {
      ordered:[['orderedDose', state.weightBased ? 'dose per kg' : 'ordered dose']],
      strength:[['availableDose','available amount'],['stockVolume','available volume']],
      volume:[['volume', state.weightBased ? 'volume per kg' : 'fluid volume']],
      time:[['timeValue','time']], drop:[['dropFactor','drop factor']], weight:[['patientWeight','patient weight']],
      infusionDetails: state.infusionMethod === 'ml' ? [['mlRate','flow rate'],['vtbi','VTBI']] : [['doseRate','dose rate'],['vtbi','VTBI']]
    };
    for (const [field, label] of required[page] || []) M.number(state[field], label);
    if (page === 'weightBased' && state.weightBased === null) throw new Error('Choose Yes or No.');
    if (page === 'infusionKind' && !state.infusionKind) throw new Error('Choose an infusion type.');
    if (page === 'infusionMethod' && !state.infusionMethod) throw new Error('Choose an infusion method.');
    if (page === 'rateUnits' && !state.rateUnit) throw new Error('Choose dose-rate units.');
    if (page === 'includeDrops' && state.includeDrops === null) throw new Error('Choose Yes or No.');
    if (page === 'review') {
      if (state.weightBased === true && !state.confirmedWeight) throw new Error('Please review and confirm the weight entered for this demo.');
      M.calculate(state);
    }
  }

  function displayError() {
    const error = $('error');
    if (error) {
      error.textContent = state.error;
      error.hidden = !state.error;
    }
  }

  function labelSmall(heading, description = '') {
    return `<div class="step-intro"><p class="kicker">${escape(heading)}</p>${description ? `<p class="helper">${escape(description)}</p>` : ''}</div>`;
  }

  function choice(label, target, value, detail = '', extra = '') {
    return `<button class="choice ${extra}" type="button" data-pick="${escape(target)}" data-value="${escape(value)}"><span class="choice-text"><strong>${escape(label)}</strong>${detail ? `<small>${escape(detail)}</small>` : ''}</span><span class="chevron" aria-hidden="true">›</span></button>`;
  }

  function options(values, current) {
    return values.map((v) => `<option value="${escape(v)}" ${current === v ? 'selected' : ''}>${escape(v)}</option>`).join('');
  }

  function input(name, label, unit = '', hint = '') {
    return `<div class="field ${state.activeField === name ? 'selected-field' : ''}" data-field-wrap="${escape(name)}"><label for="field-${escape(name)}">${escape(label)}</label><div class="input-row"><input type="text" id="field-${escape(name)}" data-field="${escape(name)}" value="${escape(state[name])}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="${escape(label)}"><span class="field-unit">${escape(unit)}</span></div>${hint ? `<p class="field-hint">${escape(hint)}</p>` : ''}</div>`;
  }

  function withUnit(name, label, unitKey, values, hint = '') {
    return `<div class="field ${state.activeField === name ? 'selected-field' : ''}" data-field-wrap="${escape(name)}"><label for="field-${escape(name)}">${escape(label)}</label><div class="input-row has-select"><input type="text" id="field-${escape(name)}" data-field="${escape(name)}" value="${escape(state[name])}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="${escape(label)}"><select data-select="${escape(unitKey)}" aria-label="${escape(label)} units">${options(values, state[unitKey])}</select></div>${hint ? `<p class="field-hint">${escape(hint)}</p>` : ''}</div>`;
  }

  function keypad() {
    const ks = ['1','2','3','4','5','6','7','8','9','CLR','0','.'];
    return `<div class="keypad" aria-label="Optional onscreen numeric keypad">${ks.map((k) => `<button type="button" class="key ${k === 'CLR' ? 'key-clear' : ''}" data-key="${escape(k)}" aria-label="${k === 'CLR' ? 'Clear selected field' : k}">${escape(k)}</button>`).join('')}</div><p class="keypad-help">Tap a field above, then use the keypad or your keyboard.</p>`;
  }

  function concentrationPreview() {
    try {
      const c = M.concentration(state);
      return `${M.format(c.amount)} ${c.unit} / ${M.format(c.volume)} mL = ${M.format(c.mgMl)} mg/mL`;
    } catch {
      return 'Enter both numbers to see the equivalent mg/mL';
    }
  }

  function currentEstimate() {
    try {
      return M.calculate(state).details.find((x) => x.label === 'Estimated duration')?.value ?? '—';
    } catch {
      return '—';
    }
  }

  function inputPage() {
    const p = state.page;
    if (p === 'weightBased') {
      return labelSmall('WEIGHT-BASED CALCULATION', 'Will you enter an amount or fluid volume per kilogram of patient weight?') +
        `<div class="two-choices">${choice('No','weightBased','false','Enter the total dose or volume')}${choice('Yes','weightBased','true','Calculate using kg')}</div>`;
    }
    if (p === 'weight') return labelSmall('PATIENT WEIGHT', 'Enter the weight for this arithmetic example.') + input('patientWeight', 'Patient weight', 'kg') + keypad();
    if (p === 'ordered') {
      return labelSmall(state.weightBased ? 'DOSE PER KILOGRAM' : 'ORDERED AMOUNT', state.weightBased ? 'Enter the amount per kg. Total amount will be calculated using the entered weight.' : 'Enter the total prescribed amount for this arithmetic example.') + withUnit('orderedDose', state.weightBased ? 'Amount per kg' : 'Ordered dose', 'orderedUnit', ['mg','mcg','g','ng'], state.weightBased ? 'Units are per kg of entered weight.' : '') + keypad();
    }
    if (p === 'strength') {
      return labelSmall('LABELED CONCENTRATION', 'Enter the two numbers as written, such as 40 mg per 5 mL.') + `<div class="ratio-input">${withUnit('availableDose','Medication amount','availableUnit',['mg','mcg','g','ng'])}<div class="per">per</div>${input('stockVolume','Solution volume','mL')}</div><div id="ratio-preview" class="conversion-preview"><span class="conversion-label">EQUIVALENT CONCENTRATION</span><strong>${escape(concentrationPreview())}</strong></div>` + keypad();
    }
    if (p === 'infusionKind') {
      return labelSmall('INFUSION TYPE', 'Choose the infusion calculator you want to use.') + `<div class="choices">${choice('IV flow / drops', 'infusionKind', 'flow', 'Calculate mL/hr and optional drops/min')}${choice('Pump-style infusion', 'infusionKind', 'pump', 'Dose-rate and VTBI workflow')}</div>`;
    }
    if (p === 'volume') {
      return labelSmall(state.weightBased ? 'FLUID VOLUME PER KILOGRAM' : 'FLUID VOLUME', state.weightBased ? 'Enter the ordered mL/kg.' : 'Enter the total volume to infuse.') + input('volume', state.weightBased ? 'Volume per kg' : 'Fluid volume', state.weightBased ? 'mL/kg' : 'mL') + keypad();
    }
    if (p === 'time') {
      return labelSmall('INFUSION TIME', 'Choose hours or minutes.') + `<div class="field selected-field" data-field-wrap="timeValue"><label for="field-timeValue">Time</label><div class="input-row has-select"><input type="text" id="field-timeValue" data-field="timeValue" value="${escape(state.timeValue)}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="Time"><select data-select="timeUnit" aria-label="Time units">${options(['hr','min'], state.timeUnit)}</select></div></div>` + keypad();
    }
    if (p === 'includeDrops') {
      return labelSmall('DROPS PER MINUTE', 'Would you like to include a gtt/min result?') + `<div class="two-choices">${choice('No','includeDrops','false','Show mL/hr only')}${choice('Yes','includeDrops','true','Add a drops/min calculation')}</div>`;
    }
    if (p === 'drop') return labelSmall('DROP FACTOR', 'Enter the tubing drop factor in gtt/mL.') + input('dropFactor', 'Drop factor', 'gtt/mL') + keypad();
    if (p === 'infusionMethod') {
      return labelSmall('DOSING METHOD', 'Choose how the infusion will be entered.') + `<div class="choices">${choice('mL/hr', 'infusionMethod', 'ml', 'Enter the flow rate directly')}${choice('Dose calculation', 'infusionMethod', 'dose', 'Calculate mL/hr from concentration and dose rate')}</div>`;
    }
    if (p === 'rateUnits') {
      const units = state.weightBased ? ['mg/kg/min','mcg/kg/min','mg/kg/hr','mcg/kg/hr'] : ['mg/min','mcg/min','mg/hr','mcg/hr'];
      return labelSmall('DOSE-RATE UNITS', 'Choose the units for the dose rate.') + `<div class="choices">${units.map((u) => choice(u, 'rateUnit', u)).join('')}</div>`;
    }
    if (p === 'infusionDetails') {
      const usingMl = state.infusionMethod === 'ml';
      const lead = usingMl ? 'Enter the flow rate and the VTBI.' : 'Enter the dose rate and the VTBI. Estimated time is calculated automatically.';
      const left = usingMl ? input('mlRate', 'Flow rate', 'mL/hr') : input('doseRate', 'Dose rate', state.rateUnit || 'Select units');
      return labelSmall('INFUSION SETTINGS', lead) + left + input('vtbi', 'VTBI', 'mL') + `<div class="estimate"><span>Estimated time</span><strong id="time-preview">${escape(currentEstimate())}</strong></div>` + keypad();
    }
    return '';
  }

  function reviewRows() {
    const rows = [];
    const f = (v) => escape(v);
    const row = (label, value, edit) => rows.push(`<div class="review-row"><div><span>${escape(label)}</span><strong>${value}</strong></div><button type="button" data-edit="${escape(edit)}">Edit</button></div>`);
    row('Weight based', state.weightBased ? 'Yes' : 'No', 'weightBased');
    if (state.weightBased) row('Patient weight', `${f(state.patientWeight)} kg`, 'weight');
    if (state.mode === 'drug') {
      row(state.weightBased ? 'Dose per kg' : 'Ordered dose', `${f(state.orderedDose)} ${f(state.orderedUnit)}${state.weightBased ? '/kg' : ''}`, 'ordered');
      row('Concentration', `${f(state.availableDose)} ${f(state.availableUnit)} per ${f(state.stockVolume)} mL`, 'strength');
    } else if (state.mode === 'infusion') {
      row('Infusion type', state.infusionKind === 'flow' ? 'IV flow / drops' : 'Pump-style infusion', 'infusionKind');
      if (state.infusionKind === 'flow') {
        row('Fluid volume', `${f(state.volume)} ${state.weightBased ? 'mL/kg' : 'mL'}`, 'volume');
        row('Time', `${f(state.timeValue)} ${f(state.timeUnit)}`, 'time');
        row('Drops/min included', state.includeDrops ? 'Yes' : 'No', 'includeDrops');
        if (state.includeDrops) row('Drop factor', `${f(state.dropFactor)} gtt/mL`, 'drop');
      } else if (state.infusionKind === 'pump') {
        if (!state.weightBased) row('Infusion method', state.infusionMethod === 'ml' ? 'mL/hr' : 'Dose calculation', 'infusionMethod');
        if (state.infusionMethod === 'dose') {
          row('Concentration', `${f(state.availableDose)} ${f(state.availableUnit)} per ${f(state.stockVolume)} mL`, 'strength');
          row('Dose rate', `${f(state.doseRate)} ${f(state.rateUnit)}`, 'infusionDetails');
        } else {
          row('Entered flow rate', `${f(state.mlRate)} mL/hr`, 'infusionDetails');
        }
        row('VTBI', `${f(state.vtbi)} mL`, 'infusionDetails');
      }
    }
    return rows.join('');
  }

  function reviewPage() {
    return `<p class="helper review-intro">Check the entered values before viewing the arithmetic result. Use Edit to change a value.</p><div class="review-list">${reviewRows()}</div>${state.weightBased === true ? `<label class="confirm"><input id="weight-confirm" type="checkbox" ${state.confirmedWeight ? 'checked' : ''}><span>I have reviewed the entered weight of <strong>${escape(state.patientWeight)} kg</strong> for this demonstration.</span></label>` : ''}<p class="review-warning">This review is not an independent medication or clinical safety check.</p>`;
  }

  function bagGraphic() {
    return `<svg class="bag-graphic" viewBox="0 0 82 122" role="img" aria-label="Decorative infusion bag"><path d="M13 8h56M18 8l-4 19v43c0 18 13 28 27 34 14-6 27-16 27-34V27L64 8" fill="none" stroke="#a8d4e2" stroke-width="3" stroke-linejoin="round"/><path d="M16 54h50v16c0 16-11 25-25 32-14-7-25-16-25-32Z" fill="#3eacc0" opacity=".25"/><path d="M28 67h26M31 78h20M41 103v10c0 5 11 4 14 10" stroke="#8bcbd5" stroke-width="2.5" fill="none"/></svg>`;
  }

  function resultPage() {
    let calc;
    try { calc = M.calculate(state); }
    catch (e) { return `<p class="error-box">${escape(e.message)}</p><p>Go back and review the fields.</p>`; }
    const infusionVisual = state.mode === 'infusion';
    const rows = calc.details.map((d) => `<div class="summary-row"><span>${escape(d.label)}</span><strong>${escape(d.value)}</strong></div>`).join('');
    const equations = calc.math.map((m, i) => `<div class="math-row"><span>${String(i + 1).padStart(2, '0')} ${escape(m.label)}</span><p>${escape(m.value)}</p></div>`).join('');
    return `<div class="result-dark"><div class="result-top"><span><span class="mini-dot"></span> ARITHMETIC RESULT</span><span class="concept">DEMO ONLY</span></div><div class="result-body">${infusionVisual ? bagGraphic() : `<div class="answer-symbol" aria-hidden="true">ƒx</div>`}<div class="result-main"><p class="result-eyebrow">CALCULATED ${infusionVisual ? 'INFUSION RATE' : 'QUANTITY'}</p><div class="result-value"><strong>${escape(calc.display)}</strong><span>${escape(calc.primaryUnit)}</span></div><div class="summary-rows">${rows}</div></div></div><p class="result-note">${escape(calc.note)}</p></div><details class="math-detail"><summary><span class="fx-mark">ƒx</span><span><strong>See the math</strong><small>Show each arithmetic step and unit conversion</small></span><span class="summary-caret" aria-hidden="true">⌄</span></summary><div class="math-inner">${equations}</div></details>`;
  }

  function menuPage() {
    return `<div class="mode-grid mode-grid-two">${Object.entries(MODES).map(([k, v]) => `<button type="button" class="mode-card" data-mode="${k}"><span class="mode-icon" aria-hidden="true">${v.icon}</span><span><strong>${escape(v.title)}</strong><small>${escape(v.desc)}</small></span><span class="mode-arrow" aria-hidden="true">›</span></button>`).join('')}</div><button class="sample-link" type="button" data-example="drug">Try a fictional example: 20 mg from 40 mg per 5 mL <span aria-hidden="true">›</span></button>`;
  }

  function render() {
    const p = state.page;
    const home = p === 'home';
    const seq = sequence();
    const index = seq.indexOf(p);
    const isResult = p === 'result';

    title.textContent = home ? 'Choose a calculator' : isResult ? 'Calculation summary' : stepTitles[p];
    $('eyebrow').textContent = home ? 'PEDIATRIC TRANSPORT CALCULATOR' : (MODES[state.mode]?.title.toUpperCase() || 'CALCULATOR');
    $('step-indicator').textContent = home ? 'SELECT CALCULATOR' : isResult ? 'COMPLETE' : `STEP ${index + 1} OF ${Math.max(1, seq.length - 1)}`;
    $('progress-fill').style.width = home ? '0%' : isResult ? '100%' : `${((index + 1) / Math.max(1, (seq.length - 1))) * 100}%`;
    document.querySelector('.progress').classList.toggle('invisible', home);

    screen.innerHTML = (home ? menuPage() : isResult ? resultPage() : p === 'review' ? reviewPage() : inputPage()) + (!home && !isResult ? `<div id="error" class="error-box" role="alert" hidden></div>` : '');

    if (home) nav.innerHTML = '';
    else if (isResult) nav.innerHTML = `<button class="secondary-btn" data-action="edit" type="button">Edit entries</button><button class="primary-btn" data-action="restart" type="button">New calculation</button>`;
    else if (['weightBased', 'infusionKind', 'infusionMethod', 'rateUnits', 'includeDrops'].includes(p)) nav.innerHTML = `<button class="secondary-btn" data-action="back" type="button">← Back</button><span class="choose-hint">Select an option to continue</span>`;
    else nav.innerHTML = `<button class="secondary-btn" data-action="back" type="button">← Back</button><button class="primary-btn" data-action="next" type="button">${p === 'review' ? 'Calculate' : 'Continue'} <span aria-hidden="true">→</span></button>`;
    displayError();
  }

  function refreshPreviews() {
    const ratio = $('ratio-preview');
    if (ratio) {
      const strong = ratio.querySelector('strong');
      if (strong) strong.textContent = concentrationPreview();
    }
    const time = $('time-preview');
    if (time) time.textContent = currentEstimate();
  }

  screen.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-field]')) {
      const field = input.getAttribute('data-field');
      if (!Object.prototype.hasOwnProperty.call(state, field)) return;
      state[field] = input.value;
      if (field === 'patientWeight') state.confirmedWeight = false;
      state.activeField = field;
      document.querySelectorAll('[data-field-wrap]').forEach((x) => x.classList.toggle('selected-field', x.getAttribute('data-field-wrap') === field));
      state.error = '';
      displayError();
      refreshPreviews();
    }
  });

  screen.addEventListener('focusin', (event) => {
    if (event.target.matches('[data-field]')) {
      state.activeField = event.target.getAttribute('data-field');
      document.querySelectorAll('[data-field-wrap]').forEach((x) => x.classList.toggle('selected-field', x.getAttribute('data-field-wrap') === state.activeField));
    }
  });

  screen.addEventListener('change', (event) => {
    const v = event.target;
    if (v.matches('[data-select]')) {
      const key = v.getAttribute('data-select');
      if (Object.prototype.hasOwnProperty.call(state, key)) state[key] = v.value;
      refreshPreviews();
      state.error = '';
      displayError();
    }
    if (v.id === 'weight-confirm') { state.confirmedWeight = Boolean(v.checked); state.error = ''; displayError(); }
  });

  screen.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-mode')) return begin(b.getAttribute('data-mode'));
    if (b.hasAttribute('data-example')) return begin('drug', true);
    if (b.hasAttribute('data-edit')) return route(b.getAttribute('data-edit'));
    if (b.hasAttribute('data-pick')) {
      const k = b.getAttribute('data-pick');
      const v = b.getAttribute('data-value');
      if (k === 'weightBased') {
        state.weightBased = v === 'true';
        state.confirmedWeight = false;
        state.infusionMethod = null;
        state.rateUnit = null;
      } else if (k === 'infusionKind') {
        state.infusionKind = v;
        state.infusionMethod = null;
        state.includeDrops = null;
        if (v === 'pump' && state.weightBased === true) state.infusionMethod = 'dose';
      } else if (k === 'infusionMethod') {
        state.infusionMethod = v;
      } else if (k === 'includeDrops') {
        state.includeDrops = v === 'true';
      } else if (k === 'rateUnit') {
        state.rateUnit = v;
      } else return;
      return goNext();
    }
    if (b.hasAttribute('data-key')) {
      const key = b.getAttribute('data-key');
      const field = state.activeField;
      if (!field) return;
      const box = screen.querySelector(`[data-field="${field}"]`);
      if (!box) return;
      const existing = state[field] || '';
      const next = key === 'CLR' ? '' : key === '.' ? (existing.includes('.') ? existing : (existing || '0') + '.') : (existing === '0' ? key : existing + key);
      if (next.length > 18) return;
      state[field] = next;
      if (field === 'patientWeight') state.confirmedWeight = false;
      box.value = next;
      box.focus();
      state.error = '';
      displayError();
      refreshPreviews();
    }
  });

  nav.addEventListener('click', (event) => {
    const b = event.target.closest('[data-action]');
    if (!b) return;
    switch (b.getAttribute('data-action')) {
      case 'next': goNext(); break;
      case 'back': goBack(); break;
      case 'edit': route('review'); break;
      case 'restart': state = fresh(); route('home'); break;
    }
  });

  $('home').addEventListener('click', () => { state = fresh(); route('home'); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && screen.contains(document.activeElement) && document.activeElement.matches('input[data-field]')) {
      event.preventDefault();
      goNext();
    }
  });

  route('home');
})();
