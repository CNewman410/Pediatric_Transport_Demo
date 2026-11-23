# Pediatric Transport Calculator — Version 7

**Option 2 concept demonstration — NOT FOR PATIENT CARE OR INFUSION PUMP PROGRAMMING.**

Static HTML, CSS, and JavaScript. Open `index.html` in a browser to try it, or upload the site files to GitHub Pages. No frameworks, installation, or build step are required. Values remain in the page's working memory, and the demo does not save or transmit them.

## What changed in Version 7

- The home screen contains **Drug calculation** and **Infusion Calculation**.
- Selecting **Infusion Calculation** opens the pump-style pathway immediately, starting with **Is this weight-based?**. There is no longer an "IV flow / drops" versus "Pump-style infusion" selection screen.
- **Equivalent concentration** is omitted from the final result's summary rows. The entered labeled concentration remains visible and the conversion arithmetic remains available in **See the math**.
- The rest of the Version 6 layout and interactions are retained, including a numeric keypad and mobile support.

## Calculator paths

**Drug calculation**

Select weight-based Yes/No, enter weight if required, then enter the ordered dose and labeled concentration, such as 40 mg per 5 mL. Review the entries and see the calculated volume in mL.

**Infusion Calculation**

Select weight-based Yes/No. If Yes, enter weight, labeled concentration, dose-rate units, dose rate, and VTBI. If No, choose **mL/hr** or **Dose calculation**, then fill in the fields relevant to that method. Review before viewing the calculated rate. Estimated duration is derived from VTBI divided by the flow rate.

The sample arithmetic is not a recommended dose, pump setting, or verified clinical result.

## Replace your GitHub Pages version

1. Extract the Version 7 ZIP file.
2. Go to your existing repository: `CNewman410/Pediatric_Transport_Demo`.
3. Choose **Add file → Upload files** and upload `index.html`, `app.js`, `calculator.js`, and `styles.css` from the extracted folder, replacing the existing files of the same names. You may also upload this `README.md`.
4. Commit your changes. GitHub Pages should redeploy automatically if it is already configured to publish from `main` and `/(root)`.
5. Refresh the deployed website after publishing. If your browser is caching the old JavaScript/CSS, use Ctrl+Shift+R.

**Important:** The files must be at the repository root, not nested in an additional folder. Do not upload the ZIP file itself as the web page.

## Technical checks

From the extracted directory, run:

```bash
node tests/calculator.test.js
python tests/browser_check.py
```

The unit test suite contains **39 passing arithmetic tests**. The browser checks cover desktop, phone, and small-phone screens, the two-option menu, infusion navigation that skips infusion type selection, and suppression of the equivalent-concentration result row. These checks are **not independent clinical validation**.

## Safety limitations

This demonstration does not recommend doses, select drugs, verify orders, check clinical limits or concentrations, validate medication routes, or implement a manufacturer's full infusion-pump programming rules. It must not be used for actual patient care, medication administration, or clinical pump programming. Approval and clinical verification are required before deployment in any care setting.
