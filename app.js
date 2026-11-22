/* Pump-inspired, non-clinical wizard. Pure client-side; no data persistence. */
(() => {
  'use strict';
  const M = window.PumpMath;
  const screen = document.getElementById('screen');
  const nav = document.getElementById('nav');
  const stepIndicator = document.getElementById('step-indicator');
  const heading = document.getElementById('pump-title');
  const progressFill = document.getElementById('progress-fill');
  const el = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const cleanState = () => ({
    page: 'start', method: null, concentrationUnit: null, concentration: '',
    weightBased: null, weight: '', rateUnit: null, doseRate: '',
    mlRate: '', vtbi: '', activeField: 'doseRate', confirmation: false, message: ''
  });
  let state = cleanState();

  const bag = () => `<svg class="infusion-icon" viewBox="0 0 82 108" fill="none" aria-hidden="true">
      <path d="M14 8h54M19 8l-3 19v42c0 16 13 25 25 30 12-5 25-14 25-30V27L63 8" stroke="#9fd3de" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17 49h49v20c0 14-10 23-25 28-14-5-24-14-24-28V49Z" fill="#3e9eaf" fill-opacity=".28"/>
      <path d="M29 61h25M32 71h19M41 99v7c0 4 8 4 11 8" stroke="#80cad2" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;

  function sequence() {
    if (state.method === 'ml') return ['start','method','details','review','result'];
    if (state.method === 'dose' && state.weightBased === false) return ['start','method','units','concentration','weightChoice','rateUnits','details','review','result'];
    return ['start','method','units','concentration','weightChoice','weight','rateUnits','details','review','result'];
  }
  const title = { start:'New infusion', method:'Dosing method', units:'Concentration units', concentration:'Concentration', weightChoice:'Patient weight', weight:'Patient weight', rateUnits:'Dose rate units', details:'Infusion settings', review:'Confirm settings', result:'Infusion summary' };

  function banner(kicker, question, support='') {
    return `<p class="eyebrow">${el(kicker)}</p><h2 class="question">${el(question)}</h2>${support ? `<p class="support">${el(support)}</p>` : ''}`;
  }
  function choice(label, code, value, subtitle='', extra='') {
    return `<button type="button" class="choice ${extra}" data-choice="${el(code)}" data-value="${el(value)}"><span>${el(label)}${subtitle ? `<span class="choice-sub">${el(subtitle)}</span>` : ''}</span><span class="arrow" aria-hidden="true">›</span></button>`;
  }
  function keypad() {
    const keys = ['1','2','3','4','5','6','7','8','9','CLR','0','.'];
    return `<div class="keypad" aria-label="Numeric keypad">${keys.map(k => `<button type="button" class="key ${k === 'CLR' ? 'command' : ''}" data-key="${el(k)}" aria-label="${k === 'CLR' ? 'Clear field' : k}">${el(k)}</button>`).join('')}</div><p class="tiny-tip">You can also type directly into the field.</p>`;
  }
  function field(fieldName, label, unit, value, placeholder='0') {
    return `<label class="prompt-label" for="number-entry">${el(label)}</label><div class="value-wrap"><input class="num-input" id="number-entry" data-field="${el(fieldName)}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="${el(placeholder)}" value="${el(value)}" aria-label="${el(label)}"><span class="unit">${el(unit)}</span></div>`;
  }
  function err() { return `<div class="error-message" id="error" role="alert">${el(state.message)}</div>`; }
  function reviewRow(label, value) { return `<div class="review-row"><span>${el(label)}</span><strong>${el(value)}</strong></div>`; }

  function calcOrNull() { try { return M.calculate(data()); } catch { return null; } }
  function data() { return {
    method: state.method, concentrationUnit: state.concentrationUnit,
    concentration: state.concentration, weightBased: state.weightBased,
    weight: state.weight, rateUnit: state.rateUnit,
    doseRate: state.doseRate, mlRate: state.mlRate, vtbi: state.vtbi
  }; }
  function niceInput(v) { try { return M.format(M.number(v, 'entry')); } catch { return v || '—'; } }

  function build() {
    const p = state.page;
    if (p === 'start') return `
      <div class="welcome-illustration">${bag()}</div>
      <h2 class="question" style="text-align:center;margin-bottom:8px">General infusion calculator</h2>
      <p class="welcome-copy">Follow a simple, screen-by-screen flow to enter your own values and see the calculated infusion rate.</p>
      <button type="button" class="big-start" data-action="begin">New Infusion <span aria-hidden="true">›</span></button>`;
    if (p === 'method') return banner('SELECT A METHOD', 'How would you like to set the infusion?') + `<div class="choices">${choice('Dose calculation','method','dose','Enter concentration and dose rate')}${choice('mL/hr','method','ml','Enter a volumetric rate directly')}</div>`;
    if (p === 'units') return banner('SELECT UNITS', 'Concentration units') + `<div class="choices">${choice('g/mL','concentrationUnit','g/mL')}${choice('mg/mL','concentrationUnit','mg/mL')}${choice('mcg/mL','concentrationUnit','mcg/mL')}${choice('ng/mL','concentrationUnit','ng/mL')}</div>`;
    if (p === 'concentration') return banner('ENTER CONCENTRATION', 'What is the concentration?') + field('concentration','Concentration',state.concentrationUnit,state.concentration) + err() + keypad();
    if (p === 'weightChoice') return banner('PATIENT WEIGHT', 'Weight-based infusion?') + `<div class="choice-grid">${choice('No','weightBased','false','','choice-center')}${choice('Yes','weightBased','true','','choice-center')}</div>`;
    if (p === 'weight') return banner('ENTER PATIENT WEIGHT', 'What is the patient weight?') + field('weight','Patient weight','kg',state.weight) + err() + keypad();
    if (p === 'rateUnits') {
      const u = state.weightBased ? [
        ['mg/kg/min','mg/kg/min'],['mcg/kg/min','mcg/kg/min'],['mg/kg/hr','mg/kg/hr'],['mcg/kg/hr','mcg/kg/hr']
      ] : [['mg/min','mg/min'],['mcg/min','mcg/min'],['mg/hr','mg/hr'],['mcg/hr','mcg/hr']];
      return banner('SELECT DOSE RATE UNITS','Dose rate units') + `<div class="choice-grid">${u.map(x => choice(x[0],'rateUnit',x[1],'','choice-center')).join('')}</div>`;
    }
    if (p === 'details') {
      const label = state.method === 'ml' ? 'Flow rate' : 'Dose rate';
      const unit = state.method === 'ml' ? 'mL/hr' : state.rateUnit;
      const key = state.method === 'ml' ? 'mlRate' : 'doseRate';
      const calculated = calcOrNull();
      state.activeField = state.activeField === 'vtbi' || state.activeField === key ? state.activeField : key;
      return banner('ENTER SETTINGS', 'Set infusion values', 'Select a field, then enter a value using the keypad.') + `
      <div class="fieldset">
        <div class="input-row ${state.activeField === key ? 'active' : ''}" data-wrap="${key}">
          <label for="rate-entry">${label}<small>Tap to edit</small><input id="rate-entry" type="text" data-field="${key}" inputmode="decimal" autocomplete="off" placeholder="0" value="${el(state[key])}" /></label><span class="unit">${el(unit)}</span>
        </div>
        <div class="input-row ${state.activeField === 'vtbi' ? 'active' : ''}" data-wrap="vtbi">
          <label for="vtbi-entry">VTBI<small>Volume to be infused</small><input id="vtbi-entry" type="text" data-field="vtbi" inputmode="decimal" autocomplete="off" placeholder="0" value="${el(state.vtbi)}" /></label><span class="unit">mL</span>
        </div>
      </div>
      <div class="calculated"><span>Estimated time</span><strong id="estimated-time">${calculated ? el(calculated.duration) : '—'}</strong></div>
      <p id="calculated-flow" class="calculated-sub">${calculated ? 'Calculated flow rate: ' + el(M.format(calculated.flow)) + ' mL/hr' : 'Time calculates automatically after entering both values.'}</p>
      ${err()}${keypad()}`;
    }
    if (p === 'review') {
      const c = calcOrNull();
      if (!c) return banner('Review', 'Entries are incomplete') + `<p class="support">Go back and check your values.</p>`;
      const rows = state.method === 'dose' ? [
        reviewRow('Method','Dose calculation'),
        reviewRow('Concentration',niceInput(state.concentration) + ' ' + state.concentrationUnit),
        reviewRow('Weight based',state.weightBased ? 'Yes' : 'No'),
        ...(state.weightBased ? [reviewRow('Patient weight',niceInput(state.weight) + ' kg')] : []),
        reviewRow('Dose rate',niceInput(state.doseRate) + ' ' + state.rateUnit),
      ] : [ reviewRow('Method','mL/hr'),reviewRow('Flow rate',niceInput(state.mlRate) + ' mL/hr') ];
      return banner('REVIEW ENTERED VALUES', 'Confirm settings', 'Check each entry before viewing the arithmetic result.') + `
        <div class="confirmation">${rows.join('')}${reviewRow('VTBI',niceInput(state.vtbi) + ' mL')}${reviewRow('Estimated time',c.duration)}</div>
        <div class="review-total"><span>Calculated pump rate</span><strong>${el(M.format(c.flow))} <small style="font-size:12px">mL/hr</small></strong></div>
        <label class="checkbox-row"><input id="confirm-checkbox" type="checkbox" ${state.confirmation ? 'checked' : ''}/>
          <span>${state.weightBased ? 'I have checked the entered patient weight and all other values.' : 'I have checked the entered units and values.'}</span></label>
        ${err()}`;
    }
    if (p === 'result') {
      const c = calcOrNull();
      if (!c) return banner('Result', 'Unable to calculate') + `<p class="support">Please review your entries.</p>`;
      const dt = c.details.map(d => `<div class="result-detail"><span>${el(d.label)}</span><strong>${el(d.value)}</strong></div>`).join('');
      return `<p class="eyebrow">ARITHMETIC PREVIEW</p><div class="result-card">
        <div class="result-label">Calculated flow rate</div>
        <div class="result-figure">${bag()}<div class="result-value">${el(M.format(c.flow))} <small>mL/hr</small></div></div>
        <div class="result-details">${dt}</div>
      </div><div class="mini-stats"><div><small>Estimated duration</small><strong>${el(c.duration)}</strong></div><div><small>Volume to be infused</small><strong>${el(M.format(c.vtbi))} mL</strong></div></div>
      <details class="math-panel"><summary>See the math</summary><div class="math-content">${c.math.map((m, i) => `<div class="math-step"><strong>${String(i+1).padStart(2,'0')} ${el(m.label)}</strong><p>${el(m.value)}</p></div>`).join('')}</div></details>
      <p class="result-note">Display values are rounded for readability. The calculator has no medication-specific dosing, safety checks, or independent verification. Not for patient care.</p>`;
    }
    return '';
  }

  function button(label, action, className='', disabled=false) { return `<button type="button" class="nav-button ${className}" data-action="${el(action)}" ${disabled ? 'disabled' : ''}>${el(label)}</button>`; }
  function buildNav() {
    if (state.page === 'start') return `<span></span><div class="nav-right">${button('Demo only','', 'subtle',true)}</div>`;
    if (state.page === 'result') return `<div class="nav-left">${button('Back','back')}</div><div class="nav-right">${button('New infusion','reset','primary')}</div>`;
    if (['method','units','weightChoice','rateUnits'].includes(state.page)) return `<div class="nav-left">${button('Back','back')}</div><div class="nav-right">${button('Exit','reset','subtle')}</div>`;
    return `<div class="nav-left">${button('Back','back')}${button('Exit','reset','subtle')}</div><div class="nav-right">${button(state.page === 'review' ? 'Confirm' : state.page === 'details' ? 'OK' : 'Continue','next','primary',state.page === 'review' && !state.confirmation)}</div>`;
  }
  function render() {
    heading.textContent = title[state.page];
    const steps = sequence();
    const index = steps.indexOf(state.page);
    const total = steps.length - 1;
    stepIndicator.textContent = state.page === 'result' ? 'RESULT' : 'STEP ' + (index + 1) + ' / ' + total;
    progressFill.style.width = ((index < 0 ? 0 : index) / (total || 1) * 100) + '%';
    screen.innerHTML = build();
    nav.innerHTML = buildNav();
  }
  function setPage(page) { state.page=page;state.message='';render(); }
  function reset() { state = cleanState(); render(); }
  function back() {
    const p = state.page;
    if (p === 'start') return;
    if (p === 'method') return setPage('start');
    if (p === 'units') return setPage('method');
    if (p === 'concentration') return setPage('units');
    if (p === 'weightChoice') return setPage('concentration');
    if (p === 'weight') return setPage('weightChoice');
    if (p === 'rateUnits') return setPage(state.weightBased ? 'weight' : 'weightChoice');
    if (p === 'details') return setPage(state.method === 'ml' ? 'method' : 'rateUnits');
    if (p === 'review') return setPage('details');
    if (p === 'result') { state.confirmation=false;return setPage('review'); }
  }
  function showError(message) {
    state.message = message;
    const node = document.getElementById('error');
    if (node) node.textContent=message;
  }
  function next() {
    const p = state.page;
    try {
      if (p === 'concentration') { M.number(state.concentration, 'concentration'); return setPage('weightChoice'); }
      if (p === 'weight') { M.number(state.weight, 'patient weight'); return setPage('rateUnits'); }
      if (p === 'details') { M.calculate(data()); state.confirmation=false; return setPage('review'); }
      if (p === 'review') {
        if (!state.confirmation) return showError('Review the entered values and check the confirmation box.');
        M.calculate(data()); return setPage('result');
      }
    } catch (e) { return showError(e.message); }
  }
  function choose(kind, value) {
    if (kind === 'method') {
      if (value !== 'dose' && value !== 'ml') return;
      state = {...cleanState(),page: value === 'ml' ? 'details' : 'units',method:value,activeField:value==='ml' ? 'mlRate':'doseRate'};
      return render();
    }
    if (kind === 'concentrationUnit' && Object.hasOwn(M.CONCENTRATION, value)) { state.concentrationUnit=value;return setPage('concentration'); }
    if (kind === 'weightBased' && (value === 'true' || value === 'false')) { state.weightBased = value === 'true'; state.rateUnit=null;state.confirmation=false; if(!state.weightBased) state.weight=''; return setPage(state.weightBased ? 'weight' : 'rateUnits'); }
    if (kind === 'rateUnit' && Object.hasOwn(M.RATE, value) && M.RATE[value].weightBased === state.weightBased) { state.rateUnit=value;state.activeField='doseRate';return setPage('details'); }
  }
  function updatePreview() {
    if (state.page === 'details') {
      const c=calcOrNull();
      const time=document.getElementById('estimated-time');
      const flow=document.getElementById('calculated-flow');
      if(time)time.textContent=c ? c.duration : '—';
      if(flow)flow.textContent=c ? 'Calculated flow rate: ' + M.format(c.flow) + ' mL/hr' : 'Time calculates automatically after entering both values.';
    }
  }
  function makeFieldActive(fieldName) {
    if (!['concentration','weight','doseRate','mlRate','vtbi'].includes(fieldName)) return;
    state.activeField=fieldName;
    document.querySelectorAll('[data-wrap]').forEach(n => n.classList.toggle('active',n.dataset.wrap===fieldName));
  }
  function keypadPress(key) {
    const fieldName = state.page === 'concentration' ? 'concentration' : state.page === 'weight' ? 'weight' : state.activeField;
    const input = screen.querySelector(`input[data-field="${fieldName}"]`);
    if (!input) return;
    let v = input.value;
    if (key==='CLR')v='';
    else if (key==='.') { if(!v.includes('.'))v=(v||'0')+'.'; }
    else if (/^\d$/.test(key) && v.length < 14) { v+=key; }
    // Buttons never mutate the units or do arithmetic themselves.
    input.value=v;
    state[fieldName]=v;
    state.confirmation=false;
    showError('');
    updatePreview();
    input.focus({preventScroll:true});
  }
  screen.addEventListener('click', event => {
    const b=event.target.closest('button');
    if(b?.dataset.action==='begin')return setPage('method');
    if(b?.dataset.choice)return choose(b.dataset.choice,b.dataset.value);
    if(b?.hasAttribute('data-key'))return keypadPress(b.dataset.key);
    const input=event.target.closest('input[data-field]');
    if(input)makeFieldActive(input.dataset.field);
  });
  screen.addEventListener('focusin',event => {
    const input=event.target.closest('input[data-field]');
    if(input)makeFieldActive(input.dataset.field);
  });
  screen.addEventListener('input', event => {
    const input=event.target.closest('input[data-field]');
    if(!input)return;
    state[input.dataset.field]=input.value;
    state.confirmation=false;
    showError('');
    updatePreview();
  });
  screen.addEventListener('change',event => {
    if(event.target.id==='confirm-checkbox') {
      state.confirmation=event.target.checked;
      const confirm=nav.querySelector('button[data-action="next"]');
      if(confirm)confirm.disabled=!state.confirmation;
      showError('');
    }
  });
  screen.addEventListener('keydown',event => {
    if(event.key==='Enter' && event.target.matches('input[data-field]')) { event.preventDefault(); next(); }
  });
  nav.addEventListener('click',event => {
    const b=event.target.closest('button[data-action]');if(!b || b.disabled)return;
    if(b.dataset.action==='back')back();
    if(b.dataset.action==='reset')reset();
    if(b.dataset.action==='next')next();
  });
  document.getElementById('home').addEventListener('click',reset);
  render();
})();
