# Pediatric Transport – General Infusion Calculator (V3)

**Option 2 prototype — NOT FOR PATIENT CARE**

This prototype demonstrates a simplified, mobile-friendly, screen-by-screen workflow inspired by the Sapphire infusion pump. It is independent from any pump vendor and is not an infusion-pump emulator, clinical calculator, medical device, or approved Hopkins tool.

## How to run

Double-click `index.html` to use the website locally. No server, login, account, or package installation is required.

## How to put it on GitHub Pages

1. Create a **public** GitHub repository for the demo (e.g. `pediatric-transport-calculator`).
2. Upload all the files from this folder, with `index.html` at the top level.
3. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Select **main** and **/(root)** and save.
5. The URL should be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

**Important:** GitHub Pages publishes publicly. Do not upload confidential Hopkins information, copyrighted protocol text, patient details, institutional credentials, or unapproved clinical content. Hosting the demo on GitHub Pages does not constitute approval to host the final clinical website on GitHub Pages.

## Pump-inspired steps

1. New Infusion
2. Dosing method: Dose Calculation or mL/hr
3. Select concentration units (g/mL, mg/mL, mcg/mL, ng/mL) — Dose Calculation only
4. Enter concentration with the touch keypad — Dose Calculation only
5. Weight-based infusion? — Dose Calculation only
6. Enter patient weight in kg — only if Yes
7. Choose dose rate units — Dose Calculation only
8. Enter dose rate and VTBI, view automatically calculated time
9. Review and confirm entered values, explicitly confirming weight when relevant
10. View the original-style navy infusion summary; expand **See the math** if desired

The step counter adjusts when paths are skipped. Selecting a method or unit advances immediately.

## Formulas and guardrails

All arithmetic operates on user-entered values. The app **never selects a drug, recommends a dose, or applies a maximum dose**.

For dose-based infusion:

- `concentration in mg/mL = entered concentration × unit conversion factor`
- `mass rate (mg/hr) = dose rate × (patient weight in kg if weight-based) × dose-unit mg conversion × (60 if per minute)`
- `flow rate (mL/hr) = mass rate (mg/hr) ÷ concentration (mg/mL)`
- `estimated duration (hours) = VTBI (mL) ÷ flow rate (mL/hr)`

For mL/hr mode, the entered volumetric flow is used directly. The duration is estimated from VTBI. Time is rounded to the nearest second for display. Other results are displayed with at most six decimals, which does not represent clinical precision or pump capabilities.

### Tests

With Node.js installed, run:

```sh
node tests/calculator.test.js
```

The tests check supported unit conversions, dose-rate time conversions, weight-based and non-weight-based flows, volumetric mode, duration formatting, and common invalid inputs. They do not constitute clinical validation.

## Limitations and next steps

This is intentionally **not suitable for live patient care**. It has no medication library, clinically appropriate dosing ranges, concentration or bag-preparation checks, drug compatibility checks, clinical rounding standards, independent validation, access control, audit trail, or validated device-specific limits. The front-end alone cannot ensure safe clinical use.

Hopkins clinical leadership must specify and independently validate requirements, numerical outputs and edge cases before any possible use in patient care. Hopkins IT and clinical safety teams must authorize deployment. Option 3 would introduce separate, clinically approved medication-specific rules and workflows.

No form values are sent to a server or saved in local storage. The app is pure client-side HTML, CSS, and JavaScript. Refreshing the page clears all entries.
