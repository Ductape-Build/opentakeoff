# Bulk scale — Ductape-Build fork

**Scale → Apply scale to sheets…** reads the printed scales throughout the loaded PDF set. Choose the scale once, use **Select matching sheets**, then **Apply to N sheet(s)**. The current sheet's saved scale or detected suggestion is the initial choice; a standard-scale dropdown is always available. A nonstandard current calibration is available too.

The scan does not open tabs or rasterize pages. It reads page text sequentially through the existing document cache and stops when dismissed. Source PDFs are unchanged. Every applied scale is saved per sheet through the normal project persistence path.

## Guardrails

- Only unscaled sheets can be selected. Existing scales, including custom calibration and unconfirmed agent scales, are never overwritten or silently confirmed.
- **Select matching sheets** chooses only unambiguous printed-scale matches. Unknown, mixed-scale and conflicting pages stay unchecked with warnings. They can be selected individually after verification.
- A sheet with dimensional measurements must be open to recalculate its quantities; otherwise it is blocked. Count-only sheets are allowed because EA is independent of scale.
- Apply rechecks eligibility against current state. Open-sheet metrics are recalculated together through the existing scale math; stale undo history is reset if existing shapes are repriced, just as individual recalibration does. No new payload format or scale units are introduced.
- Stitched composites are not included: verify their scale separately. Scanned PDFs without text cannot supply a printed-scale suggestion here.
- A title-block match does not certify all details on a mixed-scale sheet. Verify against a known dimension. This feature intentionally does not replace established calibrations; use the individual scale controls for that.

## Verification

Run in `web/`:

```bash
node --import tsx --test test/bulkScale.test.ts
npm run check
```

The policy tests cover matching, conflicting, multiple and unknown printed scales; invalid scale values; protection of existing/custom calibrations; open versus closed dimensional work; count-only work; explicit warning-row selection; stale selections; errors; unknown selected keys; and deduplication.

Browser smoke test, using an isolated Chromium profile and the bundled public `demo/sample-finish-plan.pdf` (not private job drawings):

| Action | Expected | Observed |
|---|---|---|
| Open bulk scale | Both AF101 and AF600 listed without changing the active sheet | Both listed; AF101 remained active |
| Choose detected 1/8-inch scale; Select matching sheets | AF101 selected, schedule AF600 not selected | 1 selected; AF600 warned that no printed scale was found |
| Apply | AF101 becomes 1/8-inch; AF600 unchanged | Scale chip showed 1/8-inch, one sheet applied |
| Reload | Saved scale retained | AF101 retained 1/8-inch |
| Reopen dialog | Existing AF101 scale protected | AF101 checkbox disabled; AF600 still unscaled |

The dialog was also visually inspected at 1440×1100. The test used a separate server and browser profile so the running user's plans and measurements were not modified.
