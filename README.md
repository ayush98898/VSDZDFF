# Dev Deepawali Invoicer — Wandermate Varanasi

A single-file, offline-first invoice builder for Wandermate Varanasi's Dev Deepawali 2026 tour packages.

## Use it

Open `index.html` in any browser — no build step, no server, no dependencies to install. Everything (your business details, custom packages, and the last invoice you were editing) is saved to that browser's local storage, so it's ready again next time you open the file.

## What it does

- **WYSIWYG invoice** — every field (business info, customer, trip details, line items) is edited directly on the invoice itself.
- **Package presets** — "Manage packages" lets you replace the sample Dev Deepawali packages with your real ones (name + rate); they're remembered for future invoices.
- **India-specific GST handling** — defaults to 5% (the standard rate for tour operator services), and automatically splits CGST+SGST vs. IGST based on whether the customer's state is Uttar Pradesh.
- **Indian numbering** — amounts are formatted with lakh/crore grouping and spelled out in words (e.g. "Rupees Twelve Thousand Four Hundred Only").
- **Discounts, advance payments, and balance due** are computed live.
- **Print / Save as PDF** — the toolbar and edit affordances are hidden automatically when printing, leaving a clean invoice.

## Note on the source packages

This was built without access to the live `dev-deepawali-2026.vercel.app` site (blocked by this session's network policy), so the sample packages, prices, and copy are realistic placeholders for a Varanasi Dev Deepawali tour operator — not pulled from the actual site. Use "Manage packages" to swap in your real package names and prices, or edit `SAMPLE_PACKAGES` in `index.html` directly.
