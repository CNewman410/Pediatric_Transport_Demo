"""Browser checks for the public demonstration UI, not clinical validation."""
from playwright.sync_api import sync_playwright
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (ROOT / 'styles.css').read_text() + '</style>')
html = html.replace('<script src="calculator.js" defer></script>', '').replace('<script src="app.js" defer></script>', '')
html = html.replace('</body>', '<script>' + (ROOT / 'calculator.js').read_text() + '</script><script>' + (ROOT / 'app.js').read_text() + '</script></body>')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for device, width, height in [('desktop', 1200, 850), ('mobile', 390, 844), ('smallphone', 340, 740)]:
        page = browser.new_page(viewport={'width':width, 'height':height}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(html, wait_until='load')
        assert page.locator('[data-mode]').count() == 2
        assert page.locator('[data-mode="drug"]').count() == 1
        assert page.locator('[data-mode="infusion"]').count() == 1
        assert page.locator('[data-mode="infusion"]').inner_text().startswith('◈Infusion Calculation') or 'Infusion Calculation' in page.locator('[data-mode="infusion"]').inner_text()
        assert page.locator('[data-pick="infusionKind"]').count() == 0
        page.screenshot(path=str(ROOT / f'preview-{device}-menu.png'), full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), f'Overflow on menu ({device})'

        # Drug calculation: fictional 20mg from 40mg/5mL = 2.5mL.
        page.locator('[data-mode="drug"]').click()
        assert page.locator('#title').inner_text() == 'Is this weight-based?'
        page.locator('[data-pick="weightBased"][data-value="false"]').click()
        page.locator('[data-field="orderedDose"]').fill('20')
        page.get_by_role('button', name='Continue').click()
        page.locator('[data-field="availableDose"]').fill('40')
        page.locator('[data-field="stockVolume"]').fill('5')
        page.get_by_role('button', name='Continue').click()
        page.get_by_role('button', name='Calculate').click()
        assert '2.5' in page.locator('.result-value').inner_text()
        assert 'Equivalent concentration' not in page.locator('.summary-rows').inner_text()
        page.screenshot(path=str(ROOT / f'preview-{device}-result.png'), full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), f'Overflow on result ({device})'

        # Infusion: no infusion-type question, only existing pump method when no weight.
        page.locator('#home').click()
        page.locator('[data-mode="infusion"]').click()
        assert page.locator('#title').inner_text() == 'Is this weight-based?'
        page.locator('[data-pick="weightBased"][data-value="false"]').click()
        assert page.locator('#title').inner_text() == 'Choose the dosing method'
        assert page.locator('[data-pick="infusionKind"]').count() == 0
        page.locator('[data-pick="infusionMethod"][data-value="ml"]').click()
        assert page.locator('#title').inner_text() == 'Enter infusion settings'
        page.locator('[data-field="mlRate"]').fill('20')
        page.locator('[data-field="vtbi"]').fill('40')
        page.get_by_role('button', name='Continue').click()
        page.get_by_role('button', name='Calculate').click()
        assert '20' in page.locator('.result-value').inner_text()
        assert errors == [], f'JS errors on {device}: {errors}'
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), f'Overflow on infusion result ({device})'
        print(f'PASS {device}: two-menu layout, drug result, infusion skips selector, no overflow or JS errors')
        page.close()

    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_content(html, wait_until='load')
    page.locator('[data-mode="infusion"]').click()
    page.locator('[data-pick="weightBased"][data-value="true"]').click()
    assert page.locator('#title').inner_text() == 'Enter patient weight'
    page.locator('[data-field="patientWeight"]').fill('20')
    page.get_by_role('button', name='Continue').click()
    assert page.locator('#title').inner_text() == 'Enter the concentration'
    page.locator('[data-field="availableDose"]').fill('100')
    page.locator('[data-field="stockVolume"]').fill('50')
    page.get_by_role('button', name='Continue').click()
    assert page.locator('#title').inner_text() == 'Choose dose-rate units'
    page.locator('[data-pick="rateUnit"][data-value="mcg/kg/min"]').click()
    page.locator('[data-field="doseRate"]').fill('2')
    page.locator('[data-field="vtbi"]').fill('25')
    page.get_by_role('button', name='Continue').click()
    assert page.locator('#title').inner_text() == 'Review your entries'
    assert page.locator('[data-edit="infusionKind"]').count() == 0
    page.locator('#weight-confirm').check()
    page.get_by_role('button', name='Calculate').click()
    assert '1.2' in page.locator('.result-value').inner_text()
    assert 'Equivalent concentration' not in page.locator('.summary-rows').inner_text()
    page.locator('details.math-detail summary').click()
    assert 'mg/mL' in page.locator('.math-inner').inner_text()  # math remains visible when requested
    assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
    print('PASS mobile weight-based infusion: direct pump sequence and conversion math retained')
    browser.close()
