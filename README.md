# WanderMate Invoice Studio

A single-file, offline-first invoice builder for WanderMate Enterprises' Dev Deepawali 2026 packages, built around WanderMate's real navy brand identity and real quotation content pulled from their Canva account.

## Use it

Open `index.html` in any browser — no build step, no server, no dependencies to install. Everything (business details, custom packages, and the last invoice you were editing) is saved to that browser's local storage, so it's ready again next time you open the file.

## What it does

- **WYSIWYG invoice** — every field (business info, customer, trip details, line items) is edited directly on the invoice itself.
- **Real WanderMate branding** — navy/white identity, wordmark, address, GSTIN and contact details taken from WanderMate's actual quotation template and Dev Deepawali 2026 brochure in Canva, not generic placeholders.
- **Real packages** — seeded with WanderMate's actual Dev Deepawali Premium (₹39,999/person, 2N3D, 3★ stay) and Luxury (₹59,999/person, 2N3D, 5★ Radisson) packages. "Manage packages" lets you rename, reprice, or add more; they're remembered for future invoices.
- **GST-inclusive pricing** — matches WanderMate's actual pricing model (per-person price is GST-inclusive); the invoice back-calculates the GST component for the GSTIN-compliant breakdown and auto-splits CGST+SGST vs. IGST based on whether the customer's state is Uttar Pradesh. A toggle switches to tax-on-top if you ever need it.
- **Advance-to-confirm logic** — mirrors WanderMate's real booking policy (50% advance to confirm, balance due before travel), auto-generating the "kindly pay X% (₹Y)" line, plus a separate "advance received" field to track balance due.
- **Indian numbering** — amounts are formatted with lakh/crore grouping and spelled out in words.
- **Booking policy text** — pre-filled with a condensed version of WanderMate's real Dev Deepawali booking policy (advance/balance timing, strict no-refund after advance, no rescheduling since the festival date is fixed, force majeure).
- **Print / Save as PDF** — the toolbar and edit affordances are hidden automatically when printing, leaving a clean invoice.

## Where the content came from

Built by connecting to the user's Canva account and reading their actual designs: "Wandermate Quotation 2321" (real quotation layout, contact info, GSTIN) and "Dev Deepawali 2026" (the 22-page package brochure with real pricing and inclusions), plus a few saved invoice templates for structural/visual reference. Bank/UPI payment fields were intentionally left blank (not fabricated) since real account details weren't part of the extracted content — fill those in via "Manage packages" is not needed, just type directly into the Pay by UPI / Bank transfer fields on the invoice.
