# Pediatric Transport General Calculator — Version 5

**Option 2 concept demonstration. NOT FOR PATIENT CARE OR INFUSION PUMP PROGRAMMING.**

Standalone, mobile-friendly HTML/CSS/JavaScript prototype. Open `index.html` in a browser to try it. No build tools or servers are required. All entered values stay in the browser's working memory; the app doesn't submit or store them.

## Calculator menu

The opening screen now has **three** options:

1. **Liquid / Injection Calculation** — one shared calculation, converting an entered total or weight-based dose to mL from a labeled concentration such as **40 mg per 5 mL**.
2. **IV Flow / Drops Per Minute** — one calculation, always showing mL/hr. The user can add a gtt/min result by entering the tubing drop factor.
3. **Pump-style Infusion Calculator** — an infusion workflow inspired by the Sapphire pump's step-by-step entry screens, but not reproducing its software or full feature set.

**The first screen after selecting any calculator is "Is this weight-based?" (Yes / No).** A Yes response leads to weight entry and uses the value in the calculation. The system never silently treats a weight-based input as a non-weight-based input.

- **Liquid / Injection:** If No, enter total dose (mg, mcg, g, ng). If Yes, enter patient weight (kg) and dose per kg, then enter a concentration as amount per volume (for example 40 mg per 5 mL). The calculator shows the computed volume in mL and its arithmetic.
- **IV Flow / Drops:** If No, enter total mL. If Yes, enter patient weight and **total volume to infuse in mL/kg**, which is multiplied by weight to determine total mL. Then enter time (hr or min). Choose whether to include drops/min. If yes, enter gtt/mL. The output always shows mL/hr and, when selected, also shows whole-number gtt/min.
- **Pump-style Infusion:** If Yes, enter weight and use a weight-based dose rate with concentration and VTBI. If No, choose direct mL/hr or dose calculation. The calculated duration is estimated from VTBI / mL/hr. User-entered numbers and units are not checked against drug-specific clinical limits.

The dedicated tablet and weight-based calculation menu items from Version 4 were removed. Weight-based calculation is now available inside each retained mode.

## Fictional demonstration examples

**Liquid / Injection:** Select Liquid / Injection, No, ordered amount 20 mg, concentration 40 mg per 5 mL. Equivalent strength 8 mg/mL. Arithmetic result: **2.5 mL**.

**Weight-based Liquid / Injection:** Select Yes, weight 20 kg, entered amount 1 mg/kg, concentration 40 mg per 5 mL. Computed total amount 20 mg and arithmetic result **2.5 mL**.

**IV Flow / Drops:** Select No, fluid volume 500 mL, time 4 hr, add drops with drop factor 20 gtt/mL. The arithmetic result is **125 mL/hr**, with a rounded auxiliary result of **42 gtt/min**.

These are fictional arithmetic examples, not prescribed doses or treatment instructions.

## Update your existing GitHub Pages demo

1. Download and extract the Version 5 ZIP file.
2. Open your existing GitHub repository (`CNewman410/Pediatric_Transport_Demo`).
3. Select **Add file → Upload files**.
4. Upload the contents of the extracted folder, especially `index.html`, `styles.css`, `app.js`, `calculator.js`, and `README.md`. The `tests` directory is optional.
5. Commit changes, replacing the previous files with the same names.
6. GitHub Pages should redeploy automatically if you already enabled **Settings → Pages → Deploy from a branch → main → /(root)**. Once deployed, refresh the site (use Ctrl+Shift+R if an older version appears).

The files must be at the repository root. Do not upload the ZIP as a webpage or nest the files inside an extra version folder.

## Testing

Node.js arithmetic tests:

```bash
node tests/calculator.test.js
```

The included suite has **38 passing arithmetic tests**. Desktop, mobile, and small-phone browser walkthroughs also passed, including reviewing and editing inputs, conditional fields, dose conversion, drops/min, and the pump-style sequence. This is software testing, **not independent clinical validation**.

## Safety and limitations

- Unvalidated concept only. No medication library, drug selection, clinical dose or maximum-dose checks, administration-route validation, approved pump precision, rounding protocols, or independent safety verification.
- Inputs are fictional for demo purposes. Never enter personal patient information or use the outputs for patient care, medication administration, infusion pump programming, or clinical decisions.
- This public demo includes no Hopkins proprietary protocols or other internal reference materials.
- The final calculator will require approved clinical formulas and requirements, independent clinical verification, Hopkins IT review, clinical safety approval, and authorization before clinical deployment.
