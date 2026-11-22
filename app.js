/* Presentation-only, client-side arithmetic wizard — NOT FOR PATIENT CARE. */
(() => {
  'use strict';
  const M = window.DoseMath;
  const $ = (id) => document.getElementById(id);
  const screen = $('screen'), nav = $('navigation'), title = $('title');
  const escape = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MODES = {
    liquid: { title:'Liquid / injection calculation', short:'Liquid / injection', desc:'Convert an entered dose and labeled concentration to mL', icon:'◒' },
    flow: { title:'IV flow / drops per minute', short:'IV flow / drops', desc:'Calculate mL/hr, with optional drops per minute', icon:'◷' },
    infusion: { title:'Pump-style infusion', short:'Infusion', desc:'Sapphire-inspired dose-rate and VTBI workflow', icon:'◈' }
  };
  function fresh() {
    return { mode:null, page:'home', orderedDose:'', orderedUnit:'mg', availableDose:'', availableUnit:'mg', stockVolume:'', volume:'', timeValue:'', timeUnit:'hr', includeDrops:null, dropFactor:'', patientWeight:'', infusionMethod:null, weightBased:null, rateUnit:null, doseRate:'', mlRate:'', vtbi:'', activeField:null, confirmedWeight:false, error:'' };
  }
  let state = fresh();
  const numberFields = {
    ordered:['orderedDose'], strength:['availableDose','stockVolume'], volume:['volume'], time:['timeValue'], drop:['dropFactor'], weight:['patientWeight'], infusionDetails:['doseRate','mlRate','vtbi']
  };
  const stepTitles = {
    ordered:'Enter the dose', strength:'Enter the concentration', volume:'Enter the fluid volume', time:'Enter the infusion time', drop:'Enter the drop factor', weight:'Enter patient weight',
    infusionMethod:'Choose the dosing method', weightBased:'Is this weight-based?', includeDrops:'Include drops per minute?', rateUnits:'Choose dose-rate units', infusionDetails:'Enter infusion settings', review:'Review your entries', result:'Calculation summary'
  };
  function sequence() {
    // Ask weight-based immediately after the mode is selected, even if subsequent steps differ.
    const seq=['weightBased'];
    if (state.weightBased === true) seq.push('weight');
    if (state.mode === 'liquid') return [...seq,'ordered','strength','review','result'];
    if (state.mode === 'flow') {
      seq.push('volume','time','includeDrops');
      if (state.includeDrops === true) seq.push('drop');
      return [...seq,'review','result'];
    }
    if (state.mode === 'infusion') {
      // Weight-based infusions use the dose-calculation path, not direct mL/hr.
      if (state.weightBased === true) return [...seq,'strength','rateUnits','infusionDetails','review','result'];
      if (state.infusionMethod === 'ml') return [...seq,'infusionMethod','infusionDetails','review','result'];
      if (state.infusionMethod === 'dose') return [...seq,'infusionMethod','strength','rateUnits','infusionDetails','review','result'];
      return [...seq,'infusionMethod','strength','rateUnits','infusionDetails','review','result'];
    }
    return [];
  }
  function route(page) {
    state.page = page;
    state.error = '';
    state.activeField = (numberFields[page] || []).find(f => page !== 'infusionDetails' || f === (state.infusionMethod === 'ml' ? 'mlRate' : 'doseRate')) || null;
    render();
    const shell = document.querySelector('.shell');
    if (shell && page !== 'home') shell.scrollIntoView({block:'start', behavior:'instant'});
  }
  function begin(mode, example=false) {
    if (!Object.prototype.hasOwnProperty.call(MODES, mode)) return;
    state=fresh(); state.mode=mode;
    if (example && mode === 'liquid') Object.assign(state,{ orderedDose:'20', orderedUnit:'mg', availableDose:'40', availableUnit:'mg', stockVolume:'5' });
    route('weightBased');
  }
  function goNext() {
    try { validate(state.page); }
    catch(e) { state.error = e.message; displayError(); return; }
    const seq = sequence(); const n = seq.indexOf(state.page);
    if (n >= 0 && n < seq.length-1) route(seq[n+1]);
  }
  function goBack() {
    const seq = sequence(), n = seq.indexOf(state.page);
    if (n <= 0) route('home'); else route(seq[n-1]);
  }
  function validate(page) {
    const required = {
      ordered:[['orderedDose', state.weightBased ? 'dose per kg' : 'ordered dose']],
      strength:[['availableDose','available amount'],['stockVolume','available volume']],
      volume:[['volume',state.weightBased ? 'volume per kg' : 'fluid volume']],
      time:[['timeValue','time']], drop:[['dropFactor','drop factor']],
      weight:[['patientWeight','patient weight']],
      infusionDetails: state.infusionMethod === 'ml' ? [['mlRate','flow rate'],['vtbi','VTBI']] : [['doseRate','dose rate'],['vtbi','VTBI']]
    };
    for (const [field,label] of required[page] || []) M.number(state[field],label);
    if (page === 'weightBased' && state.weightBased === null) throw new Error('Choose Yes or No.');
    if (page === 'infusionMethod' && !state.infusionMethod) throw new Error('Choose an infusion method.');
    if (page === 'rateUnits' && !state.rateUnit) throw new Error('Choose dose-rate units.');
    if (page === 'includeDrops' && state.includeDrops === null) throw new Error('Choose Yes or No.');
    if (page === 'review') {
      if (state.weightBased === true && !state.confirmedWeight) throw new Error('Please review and confirm the weight entered for this demo.');
      M.calculate(state);
    }
  }
  function displayError() {
    const error = document.getElementById('error');
    if (error) { error.textContent = state.error; error.hidden = !state.error; }
  }
  function labelSmall(heading, description='') { return `<div class="step-intro"><p class="kicker">${escape(heading)}</p>${description ? `<p class="helper">${escape(description)}</p>` : ''}</div>`; }
  function choice(label, target, value, detail='', extra='') {
    return `<button class="choice ${extra}" type="button" data-pick="${escape(target)}" data-value="${escape(value)}"><span class="choice-text"><strong>${escape(label)}</strong>${detail ? `<small>${escape(detail)}</small>` : ''}</span><span class="chevron" aria-hidden="true">›</span></button>`;
  }
  function options(values, current) { return values.map(v => `<option value="${escape(v)}" ${current === v ? 'selected' : ''}>${escape(v)}</option>`).join(''); }
  function input(name, label, unit='', hint='') {
    return `<div class="field ${state.activeField === name ? 'selected-field' : ''}" data-field-wrap="${escape(name)}"><label for="field-${escape(name)}">${escape(label)}</label><div class="input-row"><input type="text" id="field-${escape(name)}" data-field="${escape(name)}" value="${escape(state[name])}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="${escape(label)}"><span class="field-unit">${escape(unit)}</span></div>${hint ? `<p class="field-hint">${escape(hint)}</p>` : ''}</div>`;
  }
  function withUnit(name, label, unitKey, values, hint='') {
    return `<div class="field ${state.activeField === name ? 'selected-field' : ''}" data-field-wrap="${escape(name)}"><label for="field-${escape(name)}">${escape(label)}</label><div class="input-row has-select"><input type="text" id="field-${escape(name)}" data-field="${escape(name)}" value="${escape(state[name])}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="${escape(label)}"><select data-select="${escape(unitKey)}" aria-label="${escape(label)} units">${options(values, state[unitKey])}</select></div>${hint ? `<p class="field-hint">${escape(hint)}</p>` : ''}</div>`;
  }
  function keypad() {
    const ks = ['1','2','3','4','5','6','7','8','9','CLR','0','.'];
    return `<div class="keypad" aria-label="Optional onscreen numeric keypad">${ks.map(k=>`<button type="button" class="key ${k==='CLR'?'key-clear':''}" data-key="${escape(k)}" aria-label="${k==='CLR'?'Clear selected field':k}">${escape(k)}</button>`).join('')}</div><p class="keypad-help">Tap a field above, then use the keypad or your keyboard.</p>`;
  }
  function concentrationPreview() {
    try {
      const c = M.concentration(state);
      return `${M.format(c.amount)} ${c.unit} / ${M.format(c.volume)} mL = ${M.format(c.mgMl)} mg/mL`;
    } catch { return 'Enter both numbers to see the equivalent mg/mL'; }
  }
  function currentEstimate() {
    try { return M.calculate(state).details.find(x=>x.label === 'Estimated duration')?.value ?? '—'; }
    catch { return '—'; }
  }
  function inputPage() {
    const p=state.page;
    if (p === 'weightBased') return labelSmall('WEIGHT-BASED CALCULATION','Will you enter an amount or fluid volume per kilogram of patient weight?') + `<div class="two-choices">${choice('No','weightBased','false','Enter the total dose or volume')}${choice('Yes','weightBased','true','Calculate using kg')}</div>`;
    if (p === 'weight') return labelSmall('PATIENT WEIGHT','Enter the weight for this arithmetic example.') + input('patientWeight','Patient weight','kg') + keypad();
    if (p === 'ordered') return labelSmall(state.weightBased ? 'DOSE PER KILOGRAM' : 'ORDERED AMOUNT',state.weightBased ? 'Enter the amount per kg. Total amount will be calculated using the entered weight.' : 'Enter the total prescribed amount for this arithmetic example.') + withUnit('orderedDose', state.weightBased ? 'Amount per kg' : 'Ordered dose','orderedUnit',['mg','mcg','g','ng'],state.weightBased ? 'Units are per kg of entered weight.' : '') + keypad();
    if (p === 'strength') return labelSmall('LABELED CONCENTRATION','Enter the two numbers as written, such as 40 mg per 5 mL.') + `<div class="ratio-input">${withUnit('availableDose','Medication amount','availableUnit',['mg','mcg','g','ng'])}<div class="per">per</div>${input('stockVolume','Solution volume','mL')}</div><div id="ratio-preview" class="conversion-preview"><span class="conversion-label">EQUIVALENT CONCENTRATION</span><strong>${escape(concentrationPreview())}</strong></div>` + keypad();
    if (p === 'volume') return labelSmall('FLUID VOLUME',state.weightBased ? 'Enter the volume per kg. The total fluid volume will be calculated using the entered weight.' : 'Enter the total volume of fluid to infuse.') + input('volume',state.weightBased ? 'Volume per kg' : 'Total fluid volume',state.weightBased ? 'mL/kg' : 'mL') + keypad();
    if (p === 'time') return labelSmall('DURATION','How long will the infusion take?') + withUnit('timeValue','Time','timeUnit',['hr','min']) + keypad();
    if (p === 'includeDrops') return labelSmall('DROPS PER MINUTE','Would you also like a drops/min result? The mL/hr result is always shown.') + `<div class="two-choices">${choice('No','includeDrops','false','Show mL/hr only')}${choice('Yes','includeDrops','true','Enter tubing drop factor')}</div>`;
    if (p === 'drop') return labelSmall('TUBING DROP FACTOR','Enter the gtt/mL value for the tubing. The result will show both mL/hr and drops/min.') + input('dropFactor','Drop factor','gtt/mL') + keypad();
    if (p === 'infusionMethod') return labelSmall('SAPPHIRE-INSPIRED FLOW','How would you like to enter this non-weight-based infusion?') + `<div class="choices">${choice('Dose calculation','infusionMethod','dose','Enter concentration and dose rate')}${choice('mL/hr','infusionMethod','ml','Enter a volumetric rate directly')}</div>`;
    if (p === 'rateUnits') {
      const units=state.weightBased ? ['mg/kg/min','mcg/kg/min','mg/kg/hr','mcg/kg/hr'] : ['mg/min','mcg/min','mg/hr','mcg/hr'];
      return labelSmall('DOSE RATE UNITS','Select the units matching the entered dose rate.') + `<div class="two-choices">${units.map(u=>choice(u,'rateUnit',u)).join('')}</div>`;
    }
    if (p === 'infusionDetails') {
      const direct=state.infusionMethod === 'ml', field=direct?'mlRate':'doseRate';
      return labelSmall('INFUSION SETTINGS','Select a field and enter its value. Estimated time updates automatically.') + input(field,direct?'Flow rate':'Dose rate',direct?'mL/hr':state.rateUnit) + input('vtbi','VTBI','mL','Volume to be infused') + `<div class="estimate"><span>Estimated infusion time</span><strong id="time-preview">${escape(currentEstimate())}</strong></div>` + keypad();
    }
    return '';
  }
  function reviewRows() {
    const s=state, f=x=>escape(x === '' || x === null ? '—' : x), rows=[];
    const row=(label,value,step)=>rows.push(`<div class="review-row"><div><span>${escape(label)}</span><strong>${escape(value)}</strong></div><button type="button" data-edit="${escape(step)}" aria-label="Edit ${escape(label)}">Edit</button></div>`);
    row('Weight-based', s.weightBased ? 'Yes' : 'No', 'weightBased');
    if (s.weightBased) row('Patient weight',`${f(s.patientWeight)} kg`,'weight');
    if (s.mode === 'liquid') {
      row(s.weightBased ? 'Dose per kg' : 'Ordered dose',`${f(s.orderedDose)} ${f(s.orderedUnit)}${s.weightBased ? '/kg' : ''}`,'ordered');
      row('Available concentration',`${f(s.availableDose)} ${f(s.availableUnit)} per ${f(s.stockVolume)} mL`,'strength');
    } else if (s.mode === 'flow') {
      row('Fluid volume',`${f(s.volume)} ${s.weightBased ? 'mL/kg' : 'mL'}`,'volume');
      row('Time',`${f(s.timeValue)} ${f(s.timeUnit)}`,'time');
      row('Drops/min included',s.includeDrops ? 'Yes' : 'No','includeDrops');
      if (s.includeDrops) row('Drop factor',`${f(s.dropFactor)} gtt/mL`,'drop');
    } else if (s.mode === 'infusion') {
      if (!s.weightBased) row('Infusion method',s.infusionMethod === 'ml' ? 'mL/hr' : 'Dose calculation','infusionMethod');
      if (s.infusionMethod === 'dose') {
        row('Concentration',`${f(s.availableDose)} ${f(s.availableUnit)} per ${f(s.stockVolume)} mL`,'strength');
        row('Dose rate',`${f(s.doseRate)} ${f(s.rateUnit)}`,'infusionDetails');
      } else row('Entered flow rate',`${f(s.mlRate)} mL/hr`,'infusionDetails');
      row('VTBI',`${f(s.vtbi)} mL`,'infusionDetails');
    }
    return rows.join('');
  }
  function reviewPage() {
    return `<p class="helper review-intro">Check the entered values before viewing the arithmetic result. Use Edit to change a value.</p><div class="review-list">${reviewRows()}</div>${state.weightBased === true ? `<label class="confirm"><input id="weight-confirm" type="checkbox" ${state.confirmedWeight?'checked':''}><span>I have reviewed the entered weight of <strong>${escape(state.patientWeight)} kg</strong> for this demonstration.</span></label>` : ''}<p class="review-warning">This review is not an independent medication or clinical safety check.</p>`;
  }
  function bagGraphic() {
    return `<svg class="bag-graphic" viewBox="0 0 82 122" role="img" aria-label="Decorative infusion bag"><path d="M13 8h56M18 8l-4 19v43c0 18 13 28 27 34 14-6 27-16 27-34V27L64 8" fill="none" stroke="#a8d4e2" stroke-width="3" stroke-linejoin="round"/><path d="M16 54h50v16c0 16-11 25-25 32-14-7-25-16-25-32Z" fill="#3eacc0" opacity=".25"/><path d="M28 67h26M31 78h20M41 103v10c0 5 11 4 14 10" stroke="#8bcbd5" stroke-width="2.5" fill="none"/></svg>`;
  }
  function resultPage() {
    let calc;
    try { calc = M.calculate(state); } catch(e) { return `<p class="error-box">${escape(e.message)}</p><p>Go back and review the fields.</p>`; }
    const rows = calc.details.map(d => `<div class="summary-row"><span>${escape(d.label)}</span><strong>${escape(d.value)}</strong></div>`).join('');
    const equations = calc.math.map((m, i) => `<div class="math-row"><span>${String(i+1).padStart(2,'0')} ${escape(m.label)}</span><p>${escape(m.value)}</p></div>`).join('');
    return `<div class="result-dark"><div class="result-top"><span><span class="mini-dot"></span> ARITHMETIC RESULT</span><span class="concept">DEMO ONLY</span></div><div class="result-body">${state.mode === 'infusion' ? bagGraphic():`<div class="answer-symbol" aria-hidden="true">ƒx</div>`}<div class="result-main"><p class="result-eyebrow">CALCULATED ${state.mode === 'infusion'?'INFUSION RATE':'QUANTITY'}</p><div class="result-value"><strong>${escape(calc.display)}</strong><span>${escape(calc.primaryUnit)}</span></div><div class="summary-rows">${rows}</div></div></div><p class="result-note">${escape(calc.note)}</p></div><details class="math-detail"><summary><span class="fx-mark">ƒx</span><span><strong>See the math</strong><small>Show each arithmetic step and unit conversion</small></span><span class="summary-caret" aria-hidden="true">⌄</span></summary><div class="math-inner">${equations}</div></details>`;
  }
  function menuPage() {
    const standard=['liquid','flow'];
    return `<p class="menu-intro">Choose a calculation, then answer a weight-based Yes / No question. Only the fields you need will appear.</p><div class="mode-grid">${standard.map(k=>`<button type="button" class="mode-card" data-mode="${k}"><span class="mode-icon" aria-hidden="true">${MODES[k].icon}</span><span><strong>${escape(MODES[k].title)}</strong><small>${escape(MODES[k].desc)}</small></span><span class="mode-arrow" aria-hidden="true">›</span></button>`).join('')}</div><button class="infusion-card" type="button" data-mode="infusion"><span class="infusion-card-icon" aria-hidden="true">◈</span><span><strong>Pump-style infusion calculator</strong><small>Sapphire-inspired dose and mL/hr workflow</small></span><span class="mode-arrow" aria-hidden="true">›</span></button><button class="sample-link" type="button" data-example="liquid">Try a fictional example: 20 mg from 40 mg per 5 mL <span aria-hidden="true">›</span></button>`;
  }
  function render() {
    const p = state.page, home = p === 'home';
    const seq = sequence(), index=seq.indexOf(p);
    const isResult = p === 'result';
    title.textContent = home ? 'What would you like to calculate?' : isResult ? 'Calculation summary' : stepTitles[p];
    $('eyebrow').textContent = home ? 'GENERAL CALCULATIONS' : (MODES[state.mode]?.title.toUpperCase() || 'CALCULATOR');
    $('step-indicator').textContent = home ? 'CHOOSE A TOOL' : isResult ? 'COMPLETE' : `STEP ${index + 1} OF ${seq.length-1}`;
    $('progress-fill').style.width = home ? '0%' : isResult ? '100%' : `${(index+1)/(seq.length-1)*100}%`;
    document.querySelector('.progress').classList.toggle('invisible', home);
    screen.innerHTML = (home ? menuPage() : isResult ? resultPage() : p==='review' ? reviewPage() : inputPage()) + (!home && !isResult ? `<div id="error" class="error-box" role="alert" hidden></div>` : '');
    if (home) nav.innerHTML = '';
    else if (isResult) nav.innerHTML = `<button class="secondary-btn" data-action="edit" type="button">Edit entries</button><button class="primary-btn" data-action="restart" type="button">New calculation</button>`;
    else if (['infusionMethod','weightBased','rateUnits','includeDrops'].includes(p)) nav.innerHTML = `<button class="secondary-btn" data-action="back" type="button">← Back</button><span class="choose-hint">Select an option to continue</span>`;
    else nav.innerHTML = `<button class="secondary-btn" data-action="back" type="button">← Back</button><button class="primary-btn" data-action="next" type="button">${p==='review'?'Calculate':'Continue'} <span aria-hidden="true">→</span></button>`;
    displayError();
  }
  function refreshPreviews() {
    const ratio = $('ratio-preview');
    if (ratio) { const strong = ratio.querySelector('strong'); if (strong) strong.textContent = concentrationPreview(); }
    const time = $('time-preview'); if (time) time.textContent = currentEstimate();
  }
  screen.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-field]')) {
      const field = input.getAttribute('data-field');
      if (!Object.prototype.hasOwnProperty.call(state,field)) return;
      state[field] = input.value;
      if (field === 'patientWeight') state.confirmedWeight = false;
      state.activeField = field;
      document.querySelectorAll('[data-field-wrap]').forEach(x=>x.classList.toggle('selected-field',x.getAttribute('data-field-wrap')===field));
      state.error = ''; displayError(); refreshPreviews();
    }
  });
  screen.addEventListener('focusin', (event) => {
    if (event.target.matches('[data-field]')) {
      state.activeField=event.target.getAttribute('data-field');
      document.querySelectorAll('[data-field-wrap]').forEach(x=>x.classList.toggle('selected-field',x.getAttribute('data-field-wrap')===state.activeField));
    }
  });
  screen.addEventListener('change', (event) => {
    const v = event.target;
    if (v.matches('[data-select]')) {
      const key=v.getAttribute('data-select');
      if (Object.prototype.hasOwnProperty.call(state,key)) state[key] = v.value;
      refreshPreviews(); state.error=''; displayError();
    }
    if (v.id === 'weight-confirm') { state.confirmedWeight = Boolean(v.checked); state.error=''; displayError(); }
  });
  screen.addEventListener('click', (event) => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-mode')) return begin(b.getAttribute('data-mode'));
    if (b.hasAttribute('data-example')) return begin('liquid',true);
    if (b.hasAttribute('data-edit')) return route(b.getAttribute('data-edit'));
    if (b.hasAttribute('data-pick')) {
      const k=b.getAttribute('data-pick'), v=b.getAttribute('data-value');
      if (k==='infusionMethod') { state.infusionMethod=v; state.confirmedWeight=false; }
      else if (k==='weightBased') { state.weightBased=v==='true'; state.confirmedWeight=false; state.rateUnit=null; if (state.mode==='infusion') state.infusionMethod=state.weightBased ? 'dose' : null; }
      else if (k==='includeDrops') state.includeDrops=v==='true';
      else if (k==='rateUnit') state.rateUnit=v;
      else return;
      return goNext();
    }
    if (b.hasAttribute('data-key')) {
      const key=b.getAttribute('data-key');
      const field=state.activeField; if (!field) return;
      const box=screen.querySelector(`[data-field="${field}"]`); if (!box) return;
      const existing=state[field]||'';
      let next = key==='CLR' ? '' : key==='.' ? (existing.includes('.') ? existing : (existing||'0')+'.') : (existing === '0' ? key : existing+key);
      if (next.length>18) return;
      state[field]=next; if (field === 'patientWeight') state.confirmedWeight = false; box.value=next; box.focus();
      state.error=''; displayError(); refreshPreviews();
    }
  });
  nav.addEventListener('click', (event) => {
    const b=event.target.closest('[data-action]'); if (!b) return;
    switch(b.getAttribute('data-action')) {
      case 'next': goNext(); break;
      case 'back': goBack(); break;
      case 'edit': route('review'); break;
      case 'restart': state=fresh(); route('home'); break;
    }
  });
  $('home').addEventListener('click', () => { state=fresh(); route('home'); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && screen.contains(document.activeElement) && document.activeElement.matches('input[data-field]')) { event.preventDefault(); goNext(); }
  });
  render();
})();
