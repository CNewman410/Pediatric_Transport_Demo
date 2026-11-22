from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+(ROOT/'styles.css').read_text()+'</style>')
html=html.replace('<script src="calculator.js" defer></script>','').replace('<script src="app.js" defer></script>','')
html=html.replace('</body>','<script>'+(ROOT/'calculator.js').read_text()+'</script><script>'+(ROOT/'app.js').read_text()+'</script></body>')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for device,w,h in [('desktop',1280,850),('mobile',390,844),('smallphone',340,740)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(html,wait_until='load')
        assert page.locator('[data-mode]').count()==3
        assert page.locator('[data-mode="tablet"]').count()==0
        page.screenshot(path=str(ROOT/f'preview-{device}-menu.png'),full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),f'Overflow menu {device}'
        # Follow non-weight-based liquid / injection fictional example.
        page.locator('[data-example="liquid"]').click()
        assert page.locator('#title').inner_text()=='Is this weight-based?'
        page.screenshot(path=str(ROOT/f'preview-{device}-weight-question.png'),full_page=True)
        page.locator('[data-pick="weightBased"][data-value="false"]').click()
        assert page.locator('#title').inner_text()=='Enter the dose'
        page.get_by_role('button',name='Continue').click()
        assert '8 mg/mL' in page.locator('#ratio-preview').inner_text()
        page.screenshot(path=str(ROOT/f'preview-{device}-concentration.png'),full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),f'Overflow concentration {device}'
        page.get_by_role('button',name='Continue').click()
        assert page.locator('#title').inner_text()=='Review your entries'
        page.get_by_role('button',name='Calculate').click()
        assert '2.5' in page.locator('.result-value').inner_text()
        page.locator('details.math-detail summary').click()
        assert '8 mg/mL' in page.locator('.math-inner').inner_text()
        page.screenshot(path=str(ROOT/f'preview-{device}-result.png'),full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),f'Overflow result {device}'
        assert errors==[], f'Javascript errors {device}: {errors}'
        print(f'✓ {device}: 3 choices, first weight question, ratio result, no overflow')
        page.close()
    page=browser.new_page(viewport={'width':1170,'height':820})
    page.set_content(html,wait_until='load')
    def reset(): page.locator('#home').click()
    def fill(key,value): page.locator(f'[data-field="{key}"]').fill(str(value))
    def next(): page.get_by_role('button',name='Continue').click()
    def calculate(): page.get_by_role('button',name='Calculate').click()
    def result(expected): assert expected in page.locator('.result-value').inner_text(),page.locator('.result-value').inner_text()
    def weight(y): page.locator(f'[data-pick="weightBased"][data-value="{str(y).lower()}"]').click()
    def drops(y): page.locator(f'[data-pick="includeDrops"][data-value="{str(y).lower()}"]').click()
    # Liquid weight based: 1mg/kg * 20kg from 40mg/5mL =>2.5mL
    page.locator('[data-mode="liquid"]').click();weight(True)
    assert page.locator('#title').inner_text()=='Enter patient weight'
    fill('patientWeight',20);next();fill('orderedDose',1);next();fill('availableDose',40);fill('stockVolume',5);next()
    calculate();assert 'confirm the weight' in page.locator('#error').inner_text()
    page.locator('#weight-confirm').check();calculate();result('2.5');reset()
    # Liquid non-weight from 1g per 10mL
    page.locator('[data-mode="liquid"]').click();weight(False)
    fill('orderedDose',500);next();fill('availableDose',1)
    page.locator('[data-select="availableUnit"]').select_option('g');fill('stockVolume',10);next();calculate();result('5');reset()
    # IV flow nonweight, without drops
    page.locator('[data-mode="flow"]').click();weight(False)
    fill('volume',1000);next();fill('timeValue',8);next();drops(False);calculate();result('125');reset()
    # IV flow with drops
    page.locator('[data-mode="flow"]').click();weight(False)
    fill('volume',500);next();fill('timeValue',4);next();drops(True)
    fill('dropFactor',20);next();calculate();result('125')
    assert '42 gtt/min' in page.locator('.summary-rows').inner_text();reset()
    # IV flow weight-based; edit weight from review then see it changes result
    page.locator('[data-mode="flow"]').click();weight(True)
    fill('patientWeight',20);next();fill('volume',10);next();fill('timeValue',2);next();drops(False)
    assert page.locator('#title').inner_text()=='Review your entries'
    page.locator('[data-edit="weight"]').click();fill('patientWeight',30);next();next();next();drops(False)
    page.locator('#weight-confirm').check();calculate();result('150');reset()
    # Infusion weighted path (no method question)
    page.locator('[data-mode="infusion"]').click();weight(True)
    assert page.locator('#title').inner_text()=='Enter patient weight'
    fill('patientWeight',20);next();fill('availableDose',100);fill('stockVolume',50);next()
    page.locator('[data-pick="rateUnit"][data-value="mcg/kg/min"]').click()
    fill('doseRate',2);fill('vtbi',25)
    assert '20 hr 50 min' in page.locator('#time-preview').inner_text()
    page.screenshot(path=str(ROOT/'preview-desktop-infusion-entry.png'),full_page=True)
    next();calculate();assert 'confirm the weight' in page.locator('#error').inner_text()
    page.locator('#weight-confirm').check();calculate();result('1.2');reset()
    # Infusion non-weight direct mL/h route
    page.locator('[data-mode="infusion"]').click();weight(False)
    page.locator('[data-pick="infusionMethod"][data-value="ml"]').click()
    fill('mlRate',20);fill('vtbi',40);next();calculate();result('20');reset()
    # Infusion non-weight dose route
    page.locator('[data-mode="infusion"]').click();weight(False)
    page.locator('[data-pick="infusionMethod"][data-value="dose"]').click()
    fill('availableDose',40);fill('stockVolume',5);next()
    page.locator('[data-pick="rateUnit"][data-value="mg/hr"]').click()
    fill('doseRate',2);fill('vtbi',10);next();calculate();result('0.25')
    print('✓ All combined modes, weight yes/no, drop factor, review/edit, pump flows')
    browser.close()
