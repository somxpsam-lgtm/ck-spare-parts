---
name: CK Group units & reports
description: Per-part unit handling, the mixed-unit aggregate rule, and the reports PDF/print XSS sink.
---

# Per-part unit display

Each part carries its own free-text `unit` (Liter/Kg/Box/Pcs…). Single-part stock is shown as `<qty> <unit>` via the `formatQuantity(qty, unit)` helper in `artifacts/ck-group/src/lib/quantity.ts` (with `COMMON_UNITS` for the datalist suggestions). `quantity`, `lowStockThreshold`, `unitPrice` stay numeric.

## Rule: never attach a single unit to mixed-unit aggregates
Totals that sum quantities **across different parts** must NOT get a unit label appended, because the parts have different units (summing Liters + Kg + Pcs is meaningless as one unit).

**Applies to:** `InventoryReport.totalQuantity` (reports inventory card / CSV / PDF), and the stock-movements "Today's In/Out" and "Total In/Out" summary cards. Label them "Total Quantity" — not "Total Units" / "(Units)".

**Per-part values DO get a unit:** parts list qty, part form, stock-movement autocomplete/dropdown/table qty, reports low-stock current stock / threshold / deficit, and the per-item deficit chart tooltip (read the datum's `unit` from the Recharts tooltip `item.payload.unit`).

# Reports PDF/print export is an XSS sink
`reports.tsx` `handleExportPDF` builds an HTML string by interpolation and renders it via `window.open` + `document.write`. Any user-controlled field (part name, category, location, unit) **must** be passed through the local `escapeHtml` helper before interpolation. The CSV path has its own quote-escaping; the HTML path needs `escapeHtml`.

**Why:** these are stored free-text fields; unescaped they execute as HTML/JS in the print window.
